# agent-skills

Skills for coding agents such as Claude Code and Codex. Each skill is a folder under `skills/`
with a `SKILL.md` entry point, plus whatever scripts, templates and examples it needs.

| Skill | What it does |
|---|---|
| [motion-reel](skills/motion-reel/SKILL.md) | Polished motion-graphics videos made entirely in code: Canvas timeline, sub-frame motion blur, ffmpeg export and a synthesized soundtrack. |

## motion-reel

![Clawdline intro reel preview](skills/motion-reel/examples/clawdline-intro/preview.gif)

The preview above is a reduced GIF. The original 30-second film with sound is
[`clawdline-intro.mp4`](skills/motion-reel/examples/clawdline-intro/clawdline-intro.mp4)
(1920×1080, 60 fps, H.264/AAC), rendered from
[`reel.html`](skills/motion-reel/examples/clawdline-intro/reel.html) and
[`audio.py`](skills/motion-reel/examples/clawdline-intro/audio.py).

```sh
cd skills/motion-reel
npm install            # playwright-core only; uses your installed Chrome
npm run sheet          # contact sheet of the 10-second template
npm run film           # template/film.mp4 with its soundtrack
```

Requirements: Node 18+, Python 3, ffmpeg and Chrome or Chromium. No network services or paid
APIs.

## Using a skill

- **Claude Code:** copy or symlink a skill folder into `~/.claude/skills/` (all projects) or a
  project's `.claude/skills/`.
- **Codex and other agents:** point the agent at the skill's `SKILL.md`, or add it to the
  project's instructions.
- **Clawdline:** add `https://github.com/sainteye/agent-skills` in the Tool library and choose
  the skill's `SKILL.md` entry, then use *Prepare and use* in a Session.

## 中文說明

給 Claude Code、Codex 等 coding agent 使用的 Skill 集合。每個 Skill 是 `skills/` 底下的一個資料夾，
入口是 `SKILL.md`。

- **motion-reel**：完全用程式製作動態圖像影片。以 Canvas 時間軸逐格渲染，每格多次取樣做出動態模糊，
  用 ffmpeg 輸出，配樂也在同一條時間軸上用程式合成。示範影片是 30 秒的 Clawdline 介紹片。

## License

MIT, see [LICENSE](LICENSE). Example films may show third-party product names for illustration.
