"""Soundtrack for template/reel.html. Every cue sits on a visual event's time.

Run:  python3 -I audio.py   (writes audio.wav next to this file)
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "engine"))
from synth import Mix  # noqa: E402

m = Mix(10)

# Scene 1: headline words rise (0.3 s, 0.5 s), exit swoosh at 2.15 s
m.tone(0.3, 440, .25, .08, 9)
m.tone(0.5, 660, .25, .08, 9)
m.whoosh(2.05, .5, .22)

# Scene 2: line sweeps out, ten squares land, one impact
m.tone(2.5, 220, .5, .12, 4, "sin", 3.0)
for i in range(10):
    m.tone(3.0 + i * .06 + .3, 440 * 2 ** (i / 12), .08, .06, 35)
    m.noise(3.0 + i * .06 + .3, .02, .08)
m.kick(4.0, 1.2)
m.noise(4.0, .6, .22, .3)

# Scenes 2-3: groove underneath, card pop and check
m.groove(4.0, 8.0, bpm=120, progression=((110, (220, 261.6, 329.6)), (87.3, (174.6, 220, 261.6))))
m.whoosh(5.6, .5, .25)
m.tone(6.6, 1318, .3, .07, 8)
m.whoosh(7.6, .45, .28)

# Scene 4: end card impact and sustained chord
m.kick(8.0, 1.3)
m.noise(8.0, .7, .25, .3)
m.pad(8.0, 2.0, (110, 220, 277.2, 329.6, 440), .08, .2, 1.2)

m.write(str(HERE / "audio.wav"))
print("audio.wav")
