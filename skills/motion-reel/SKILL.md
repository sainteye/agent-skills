---
name: motion-reel
description: |
  Make a polished motion-graphics video entirely in code: a deterministic Canvas timeline rendered
  frame by frame with sub-frame motion blur, exported through ffmpeg, with a soundtrack synthesized
  on the same timeline. Use for product intros, launch teasers, feature explainers, showreels,
  logo reveals, kinetic typography and animated UI demos — "make a motion graphics video",
  "make a 30-second intro video", "make a showreel", "animate our logo", 「做一支動態影片」
  「做產品介紹影片」「做 motion graphics」. Not for live-action footage, photoreal scenes, lip-synced
  characters or AI video generation.
---

# motion-reel

Code is excellent at geometry, type, colour, interface mock-ups and rhythm, and poor at drawing
believable characters. Films made with this skill look professional because they stay inside what
code does well and apply the craft a motion designer would: easing, staggering, overshoot,
match cuts, one focus per beat and picture locked to sound.

The reference film is `examples/clawdline-intro/clawdline-intro.mp4` (30 s, 1920×1080, 60 fps,
H.264/AAC), made from `examples/clawdline-intro/reel.html` and `audio.py`. Watch it, or read its
contact sheet, before designing a new film.

## Requirements

Node 18+, Python 3, ffmpeg, and Chrome or Chromium. In this folder run `npm install` once (it
installs `playwright-core`; no browser download). The renderer uses `$CHROME_PATH`, then an
installed Google Chrome, then a Playwright Chromium. No network service or paid API is used.

## Workflow

1. **Understand the subject.** Read the real product: README, docs, brand assets (logo SVG,
   palette, fonts). Write down three to five true claims the film may make. Never invent
   features, numbers or customers.
2. **Pick a format code is good at.** Kinetic typography, interface mock-ups, diagrams, pixel or
   geometric logo builds, data that animates. Avoid hand-drawn characters, faces and anything
   photoreal. If the brief asks for characters, make them simple geometric marks and keep their
   acting to blinks, squash and stretch.
3. **Storyboard on the beat.** Choose a tempo (120 BPM = a beat every 0.5 s, a bar every 2 s) and
   give each scene a whole number of bars. A typical 30 s arc: problem (chaos, 4 s) → rapid
   cuts (2 s) → reveal (4 s) → three or four feature beats (4 s each) → end card (4 s). Every
   scene states one idea in one short line.
4. **Copy `template/` next to your project** and replace its scenes. Keep `engine/` as is.
   Each scene is `function Sx(t)` guarded by its own time window and drawn in absolute time.
5. **Check stills before the film.** Render a contact sheet of 12–21 key moments and actually
   look at it. Fix overlaps, off-centre focus, unreadable text and empty frames.

   ```sh
   node engine/render.mjs my-film/reel.html sheet 0.5 2 3.5 5 6.8 8.9 12 16 20 24 28 --out sheet.png
   ```

6. **Score it.** Put a sound on every visual event in `audio.py` using `engine/synth.py`
   (`kick`, `noise`, `tone`, `pad`, `whoosh`, `groove`). Use the same times as the picture.
7. **Render the film** (measured 10–20 output frames per second at 1080p with 4 sub-frames on an Apple-silicon laptop):

   ```sh
   python3 -I my-film/audio.py
   node engine/render.mjs my-film/reel.html video --audio my-film/audio.wav --out my-film/film.mp4
   ```

8. **Verify the file, not the intention.** `ffprobe` the duration, size and codecs; decode the
   whole file with `ffmpeg -v error -i film.mp4 -f null -`; extract frames from the encoded MP4
   and look at them.
9. **Deliver the original.** See Delivery below.

## Craft rules

- **Animate values, not frames.** Position, scale, opacity and rotation come from easing curves:
  `E.outExpo` for confident arrivals, `E.outBack` or `spring` for pops, `E.inExpo` for exits,
  `E.inOutExpo` for camera moves. Linear motion looks cheap.
- **Stagger everything.** Words, characters, list rows and grid cells enter 30–80 ms apart.
- **Overshoot and settle.** Pops overshoot; landings squash; impacts shake the camera briefly
  (`shake(t, amp)` decaying over about 0.2 s) and throw a few debris squares.
- **Cut with the picture, not with fades.** A dot stretches into a line; a zoom into a dark shape
  becomes the black of the next scene; a whip pan moves both scenes through a shared background.
  Fades are for the last half-second only.
- **One reading focus per beat.** Headline, then the supporting detail; never two blocks of text
  competing. Keep secondary UI text small and muted.
- **Contrast in pace.** Chaos before order, fast cuts before a held reveal, a long hold on the end
  card.
- **Brand discipline.** Two or three colours from the real brand, one display face, one mono
  face. Background near black or near white with subtle texture (grain, dot grid, vignette).
- **Determinism.** Never call `Math.random()` or read the clock in a scene; use `hh(i, j)` for
  stable randomness so stills match the film.
- **Legibility.** Body text at least 22 px at 1080p, headlines 80–160 px, high contrast.

## Engine reference

`engine/reel-engine.js` defines globals for scene code: `W`, `H`, `ctx`, `clamp`, `lerp`,
`P(t, a, b)` (progress), `E.*` easings, `spring`, `hh` (hash noise), `tri` (0→1→0), `txt`, `tw`,
`rr`, `circ`, `alpha`, `words`, `chars`, `check`, `glowLine`, `shake`, `MONO`, `SANS`.
`Reel.setup({ duration, fps, stage(t), hud(t), background, ink, subframes, shutter, grain,
vignette, fadeIn, fadeOut })` installs the renderer. Each output frame averages `subframes`
renders across a `shutter` of a frame (0.5 = 180°), which produces real motion blur.

`engine/render.mjs <page> stills|sheet|video` drives the page in headless Chrome and pipes PNG
frames to ffmpeg (H.264, `yuv420p`, `+faststart`). Open the page with `?t=7.5` in a browser to
inspect one moment interactively.

## Delivery

- Deliver the **original render**. Do not re-encode, downscale or convert it to a GIF to make it
  fit a channel; that loses sound and quality. A lossless remux is allowed:
  `ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`.
- If the person uses Clawdline, read `clawdline guide send` and follow "Show the person a video":
  publish the MP4 under the Session project's `artifacts/` and give the `app.clawdline.com` link,
  register it with `clawdline output add`, and open the link yourself before saying it was sent.
- When the person asks for a shareable link, a free host such as
  [Litterbox](https://litterbox.catbox.moe/) works without an account (expires after the chosen
  time, for example 24 h). Upload only what the person has agreed to make public, then download it
  back and compare its size and SHA-256 with the original before handing over the URL.
- Report what was verified (contact sheet viewed, full decode, duration) and what was not
  (for example, nobody has watched it on a phone yet).

## The original prompt

This skill was distilled from one session. The prompt that produced the reference film was:

> make a dynamic 30-second motion graphics video that shows what an incredible motion designer you
> are, like it's your showreel for a résumé. go all out.
>
> the topic is introducing clawdline

It is kept here verbatim on purpose. Its open framing (a showreel that must impress, "go all out")
pushed toward ambitious craft rather than a safe explainer. When a repository or subject responds
better to that framing, reuse the prompt and replace only the topic, then follow the workflow
above for the checks and the delivery.

For a film that should not share this skill's look at all, use the `showreel` skill, which
gives the agent only this prompt and no template.
