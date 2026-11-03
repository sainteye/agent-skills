---
name: showreel
description: |
  Make an original, freely designed motion-graphics video from one open creative prompt, with no
  template and no house style. Use when the person wants the agent's own creative direction —
  "make a showreel", "go all out", "surprise me", "make it look nothing like the last one",
  「讓 AI 自由發揮做一支影片」「不要套模板」「做一支 showreel」. For a repeatable, consistent look built on a
  ready engine and template, use the motion-reel skill instead.
---

# showreel

One prompt, full creative freedom. This skill exists because applying a template makes every film
look nearly the same. Here the agent chooses the concept, look, structure, technique and sound.

## The prompt

Use it verbatim. Replace only `XXX` with the subject (a product, a repository, a feature, an idea):

> make a dynamic 30-second motion graphics video that shows what an incredible motion designer you
> are, like it's your showreel for a résumé. go all out.
>
> the topic is introducing XXX

If the person asks for a different length, change only the duration.

## How to follow it

- **Do not open a template or a previous film for reference.** In particular, do not reuse the
  motion-reel template, its example scenes, palette, layout or transitions. Start from a blank
  page and decide the visual idea yourself.
- **Learn the subject for real.** Read its README, docs and brand assets. Claims in the film must
  be true; do not invent features, numbers or customers.
- **Pick your own technique.** Anything that runs locally is fine: Canvas, SVG, WebGL, CSS, a
  creative-coding library, Python, ffmpeg filters. Do not call paid APIs or AI video generators
  unless the person explicitly allows it.
- **Commit to one bold concept.** A visual metaphor, a typographic system, a camera language or
  a rhythm, carried through the whole film, is what makes a showreel memorable.
- **Make sound part of the design** unless the person asks for silence.

The only things this skill fixes are the checks and the delivery, not the look:

1. Before rendering the whole film, export a sheet of key frames and actually look at it. Fix
   overlaps, unreadable text and empty frames.
2. Verify the final file: duration, resolution and codecs with `ffprobe`, and a full decode with
   `ffmpeg -v error -i film.mp4 -f null -`.
3. Deliver the original render; do not re-encode or shrink it to fit a channel.
4. To let the person watch it, upload the original to [Litterbox](https://litterbox.catbox.moe/)
   (`curl -F reqtype=fileupload -F time=24h -F fileToUpload=@film.mp4 https://litterbox.catbox.moe/resources/internals/api.php`),
   download the returned URL back, compare size and SHA-256, then give the
   `https://litter.catbox.moe/…` link. If the person uses Clawdline, `clawdline guide send` also
   describes publishing it under the project's `artifacts/`.
5. Report what was verified and what was not.

## Rendering plumbing (optional)

If you build the film as a web page that draws frame N on request, the motion-reel skill's
`engine/render.mjs` can drive it in headless Chrome and pipe frames to ffmpeg. Use it only as
plumbing; its design guidance and examples are deliberately not part of this skill.
