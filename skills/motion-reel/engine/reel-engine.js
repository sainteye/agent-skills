/*
 * reel-engine.js — a deterministic motion-graphics renderer for one <canvas>.
 *
 * The whole film is a pure function of time: Reel.setup({ stage(t) { ... } })
 * draws the frame at t seconds. The renderer (render.mjs) asks for frame N,
 * the engine renders several sub-frames inside a 180-degree shutter and
 * averages them (real motion blur), then adds HUD, vignette and grain.
 *
 * Everything here is a global on purpose: scene code reads like a sketch.
 * MIT License.
 */

/* ---------- canvas ---------- */
let W = 1920, H = 1080;
let ctx = null;                 // the context scene code draws into
const out = { canvas: null, ctx: null, sub: null };

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
/** progress of t through [a, b], clamped to 0..1 */
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  linear: x => x,
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuint: x => 1 - Math.pow(1 - x, 5),
  /** overshoots, then settles: use for pops */
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
/** damped spring 0 -> 1 with a visible wobble */
const spring = x => (x <= 0 ? 0 : 1 - Math.exp(-6.5 * x) * Math.cos(12 * x));
/** deterministic hash noise in [0, 1): never use Math.random() in a scene */
const hh = (a, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
/** 0 -> 1 -> 0 triangle across [a, b] (blinks, flashes) */
const tri = (t, a, b) => { const m = (a + b) / 2; return t < a || t > b ? 0 : t < m ? (t - a) / (m - a) : (b - t) / (b - m); };

/* ---------- fonts & drawing ---------- */
const MONO = 'Menlo, "SF Mono", "DejaVu Sans Mono", monospace';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
let INK = '#f3ede4';

function font(o) { return `${o.w || 600} ${o.s || 40}px ${o.f || SANS}`; }
/** text width with the same options txt() takes */
function tw(s, o = {}) { ctx.save(); ctx.font = font(o); ctx.letterSpacing = (o.ls || 0) + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
/** text: {s size, w weight, f family, c color, a alpha, al align, bl baseline, ls tracking} */
function txt(s, x, y, o = {}) {
  ctx.save(); ctx.font = font(o); ctx.fillStyle = o.c || INK; ctx.globalAlpha *= (o.a ?? 1);
  ctx.textAlign = o.al || 'left'; ctx.textBaseline = o.bl || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.fillText(s, x, y); ctx.restore();
}
function rr(x, y, w, h, r, fill, stroke, lw = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function circ(x, y, r, fill, stroke, lw = 2) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
/** run fn with extra opacity */
function alpha(a, fn) { ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }

/**
 * Words slide up out of a mask, staggered. Starts at t0.
 * o.st stagger, o.d duration, o.t1 exit time, o.colors per-word colours.
 */
function words(s, x, y, t, t0, o = {}) {
  const ws = s.split(' '), st = o.st ?? 0.07, d = o.d ?? 0.75, sp = tw(' ', o); let cx = x;
  if (o.al === 'center') cx = x - tw(s, o) / 2; if (o.al === 'right') cx = x - tw(s, o);
  ws.forEach((w, i) => {
    const p = E.outExpo(P(t, t0 + i * st, t0 + i * st + d)); const ww = tw(w, o);
    let dy = (1 - p) * o.s * 1.15;
    if (o.t1 != null) { const q = E.inExpo(P(t, o.t1 + i * st * 0.5, o.t1 + i * st * 0.5 + 0.4)); dy -= q * o.s * 1.15; }
    if (p > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 20, y - o.s * 1.02, ww + 40, o.s * 1.32); ctx.clip();
      txt(w, cx, y + dy, { ...o, al: 'left', c: (o.colors && o.colors[i]) || o.c }); ctx.restore();
    }
    cx += ww + sp;
  });
}
/** Characters rise with a slight rotation, staggered. */
function chars(s, x, y, t, t0, o = {}) {
  const st = o.st ?? 0.035, d = o.d ?? 0.6; let cx = x - (o.al === 'center' ? tw(s, o) / 2 : 0);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], cw = tw(ch, o) + (o.ls || 0); const p = P(t, t0 + i * st, t0 + i * st + d);
    if (p > 0) {
      const e = E.outExpo(p); ctx.save(); ctx.beginPath(); ctx.rect(cx - 10, y - o.s * 1.05, cw + 20, o.s * 1.35); ctx.clip();
      ctx.translate(cx, y + (1 - e) * o.s * 1.1); ctx.rotate((1 - e) * 0.25); txt(ch, 0, 0, { ...o, al: 'left', ls: 0 }); ctx.restore();
    }
    cx += cw;
  }
}
/** animated check mark, p = draw progress */
function check(x, y, s, col, p = 1, lw) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw || s * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = [[-0.45, 0], [-0.12, 0.32], [0.48, -0.34]]; ctx.beginPath(); ctx.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
  const L1 = 0.47, L2 = 0.89, d = p * (L1 + L2);
  if (d <= L1) { const k = d / L1; ctx.lineTo(x + lerp(pts[0][0], pts[1][0], k) * s, y + lerp(pts[0][1], pts[1][1], k) * s); }
  else { ctx.lineTo(x + pts[1][0] * s, y + pts[1][1] * s); const k = (d - L1) / L2; ctx.lineTo(x + lerp(pts[1][0], pts[2][0], k) * s, y + lerp(pts[1][1], pts[2][1], k) * s); }
  ctx.stroke(); ctx.restore();
}
/** a glowing bar with light flowing left -> right */
function glowLine(cx, y, w, h, t, color, glow = 1) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 24 * glow; ctx.fillStyle = color; ctx.fillRect(cx - w / 2, y - h / 2, w, h); ctx.shadowBlur = 0;
  const ph = (t * 0.85) % 1.3 - 0.15, gx = cx - w / 2 + ph * w; const g = ctx.createLinearGradient(gx - w * 0.18, 0, gx + w * 0.18, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2, y - h / 2, w, h); ctx.restore();
}
/** short pseudo-random camera shake, stable per frame */
function shake(t, amp, fps = 60) { const f = Math.floor(t * fps); return [(hh(f, 1) - 0.5) * amp, (hh(f, 2) - 0.5) * amp]; }

/* ---------- renderer ---------- */
const Reel = {
  cfg: null,
  /**
   * cfg: { fps=60, duration, width=1920, height=1080, background='#0b0a09', ink,
   *        stage(t), hud(t)?, subframes=4, shutter=0.5, grain=0.07, vignette=0.55,
   *        fadeIn=0.25, fadeOut=0.45 }
   */
  setup(cfg) {
    this.cfg = Object.assign({ fps: 60, width: 1920, height: 1080, background: '#0b0a09', subframes: 4, shutter: 0.5, grain: 0.07, vignette: 0.55, fadeIn: 0.25, fadeOut: 0.45 }, cfg);
    if (!(this.cfg.duration > 0) || typeof this.cfg.stage !== 'function') throw new Error('Reel.setup needs duration and stage(t)');
    if (cfg.ink) INK = cfg.ink;
    W = this.cfg.width; H = this.cfg.height;
    let cv = document.querySelector('canvas');
    if (!cv) { cv = document.createElement('canvas'); document.body.appendChild(cv); }
    cv.width = W; cv.height = H; out.canvas = cv; out.ctx = cv.getContext('2d');
    out.sub = document.createElement('canvas'); out.sub.width = W; out.sub.height = H;
    this.grains = [];
    for (let g = 0; g < 6; g++) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const id = x.createImageData(256, 256);
      let s = g * 9301 + 49297; for (let i = 0; i < id.data.length; i += 4) { s = (s * 9301 + 49297) % 233280; const v = s / 233280 * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      x.putImageData(id, 0, 0); this.grains.push(c);
    }
    window.REEL = { fps: this.cfg.fps, duration: this.cfg.duration, width: W, height: H };
    window.frameData = (f, type = 'image/png') => { this.render(f); return out.canvas.toDataURL(type); };
    const q = new URLSearchParams(location.search); if (q.has('t')) this.render(Math.round(+q.get('t') * this.cfg.fps));
  },
  render(frame) {
    const c = this.cfg, t = frame / c.fps, K = Math.max(1, c.subframes), o = out.ctx;
    o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
    for (let k = 0; k < K; k++) {
      const ts = K === 1 ? t : t + (k / (K - 1) - 0.5) * (c.shutter / c.fps);
      ctx = out.sub.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.fillStyle = c.background; ctx.fillRect(0, 0, W, H);
      c.stage(clamp(ts, 0, c.duration));
      o.globalAlpha = 1 / (k + 1); o.drawImage(out.sub, 0, 0);   // running average = motion blur
    }
    o.globalAlpha = 1; ctx = o;
    if (c.hud) c.hud(t);
    if (c.vignette > 0) { const v = o.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${c.vignette})`); o.fillStyle = v; o.fillRect(0, 0, W, H); }
    if (c.grain > 0) {
      o.save(); o.globalCompositeOperation = 'overlay'; o.globalAlpha = c.grain; const g = this.grains[frame % 6]; const ox = (frame * 37) % 256, oy = (frame * 91) % 256;
      for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) o.drawImage(g, x, y); o.restore();
    }
    const fo = c.fadeOut > 0 ? P(t, c.duration - c.fadeOut, c.duration) : 0; if (fo > 0) { o.fillStyle = `rgba(0,0,0,${fo})`; o.fillRect(0, 0, W, H); }
    const fi = c.fadeIn > 0 ? 1 - P(t, 0, c.fadeIn) : 0; if (fi > 0) { o.fillStyle = `rgba(0,0,0,${fi})`; o.fillRect(0, 0, W, H); }
  },
};
