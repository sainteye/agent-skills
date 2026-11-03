#!/usr/bin/env node
// Render a reel page frame by frame into PNG stills, a contact sheet, or an MP4.
//
//   node render.mjs <page.html> stills <t1> <t2> ... [--out dir]
//   node render.mjs <page.html> sheet  <t1> <t2> ... [--out sheet.png] [--cols 3]
//   node render.mjs <page.html> video [--out film.mp4] [--audio sound.wav] [--crf 15]
//
// The page must call Reel.setup() (reel-engine.js) or expose window.REEL
// ({fps, duration}) and window.frameData(frame) -> PNG data URL.
// Browser: $CHROME_PATH, else installed Google Chrome, else Playwright's Chromium.
import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const outArg = opt('out'), audio = opt('audio'), crf = opt('crf', '15'), cols = +opt('cols', '3');
const [page, mode = 'video', ...times] = args;
if (!page || !['stills', 'sheet', 'video'].includes(mode)) {
  console.error('usage: render.mjs <page.html> stills|sheet|video [times…] [--out p] [--audio wav]');
  process.exit(2);
}

async function launch() {
  const tries = [];
  if (process.env.CHROME_PATH) tries.push({ executablePath: process.env.CHROME_PATH });
  tries.push({ channel: 'chrome' }, {});
  for (const o of tries) { try { return await chromium.launch(o); } catch (e) { /* next */ } }
  throw new Error('No Chromium found: set CHROME_PATH, install Google Chrome, or run `npx playwright install chromium`.');
}

const browser = await launch();
const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = []; tab.on('pageerror', e => errors.push(String(e)));
await tab.goto(pathToFileURL(path.resolve(page)).href);
await tab.waitForFunction(() => window.REEL && window.frameData, null, { timeout: 15000 });
await tab.waitForTimeout(300); // let web fonts settle
const meta = await tab.evaluate(() => window.REEL);
const frameAt = async f => Buffer.from((await tab.evaluate(f => window.frameData(f), f)).split(',')[1], 'base64');

if (mode === 'stills' || mode === 'sheet') {
  const dir = mode === 'stills' ? (outArg || 'stills') : fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || '/tmp'), 'reel-sheet-'));
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [i, t] of times.entries()) {
    const f = path.join(dir, `${String(i).padStart(3, '0')}-t${t}.png`);
    fs.writeFileSync(f, await frameAt(Math.round(+t * meta.fps))); files.push(f);
  }
  if (mode === 'sheet') {
    const sheet = outArg || 'sheet.png', rows = Math.ceil(files.length / cols);
    const inputs = files.flatMap(f => ['-i', f]);
    const pads = Array.from({ length: cols * rows - files.length }, () => ['-f', 'lavfi', '-i', `color=black:s=${meta.width}x${meta.height}`]).flat();
    const n = cols * rows, labels = Array.from({ length: n }, (_, i) => `[${i}]scale=640:-1[s${i}];`).join('');
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, ...pads, '-filter_complex',
      `${labels}${Array.from({ length: n }, (_, i) => `[s${i}]`).join('')}xstack=inputs=${n}:layout=${Array.from({ length: n }, (_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|')}`,
      '-frames:v', '1', sheet], { stdio: 'inherit' });
    fs.rmSync(dir, { recursive: true, force: true });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log('sheet', sheet);
  } else console.log('stills', dir);
} else {
  const film = outArg || 'film.mp4', total = Math.round(meta.duration * meta.fps);
  const silent = audio ? film.replace(/\.mp4$/, '') + '.video-only.mp4' : film;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(meta.fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    if (!ff.stdin.write(await frameAt(f))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % meta.fps === 0) process.stdout.write(`\rframe ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) process.exit(code || 1);
  if (audio) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
      '-shortest', '-movflags', '+faststart', film], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
    fs.rmSync(silent);
  }
  console.log(`\nvideo ${film}`);
}
if (errors.length) { console.error('page errors:', errors); process.exitCode = 1; }
await browser.close();
