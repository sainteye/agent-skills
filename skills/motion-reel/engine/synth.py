"""synth.py — a dependency-free soundtrack synthesiser for motion reels.

Place sounds on the same timeline as the picture, then write a WAV:

    from synth import Mix
    m = Mix(30)                 # seconds
    m.kick(4.0); m.whoosh(5.8, .5); m.tone(6.2, 880, .1)
    m.write("audio.wav")

Pure Python standard library: no numpy, no network, deterministic (seeded).
MIT License.
"""
import math
import random
import struct
import wave

SR = 48000


class Mix:
    def __init__(self, seconds, seed=7):
        self.n = int(seconds * SR)
        self.buf = [0.0] * self.n
        self.rng = random.Random(seed)

    def add(self, t0, dur, fn, gain=1.0):
        i0, count = int(t0 * SR), int(dur * SR)
        b, n = self.buf, self.n
        for k in range(count):
            i = i0 + k
            if 0 <= i < n:
                b[i] += gain * fn(k / SR)

    # --- drums -----------------------------------------------------------
    def kick(self, t, gain=1.0, top=150, bottom=45):
        """Sine whose pitch drops fast: the body of a kick drum or an impact."""
        def f(x):
            ph = 2 * math.pi * (bottom * x + (top - bottom) * (1 - math.exp(-x * 30)) / 30)
            return math.sin(ph) * math.exp(-x * 9)
        self.add(t, 0.45, f, gain)

    def noise(self, t, dur=0.08, gain=0.3, bright=0.9):
        """Noise burst. bright≈0.95: hi-hat/click; ≈0.5: snare; ≈0.3: crash/impact tail."""
        st = {"p": 0.0}
        rnd = self.rng

        def f(x):
            v = rnd.uniform(-1, 1)
            y = v - bright * st["p"]
            st["p"] = v
            return y * math.exp(-x / dur * 4)
        self.add(t, dur * 1.2, f, gain)

    # --- tones -----------------------------------------------------------
    def tone(self, t, freq, dur, gain=0.2, decay=8, shape="sin", sweep=0.0):
        """Plucked tone. shape 'saw' is brighter (bass, stabs). sweep bends pitch up per second."""
        def f(x):
            ph = 2 * math.pi * freq * (1 + sweep * x) * x
            if shape == "sin":
                v = math.sin(ph)
            else:
                v = (math.sin(ph) + .5 * math.sin(2 * ph) + .33 * math.sin(3 * ph) + .25 * math.sin(4 * ph)) * .55
            return v * min(1, x / .004) * math.exp(-x * decay)
        self.add(t, dur, f, gain)

    def pad(self, t, dur, freqs, gain=0.05, attack=0.4, release=1.0):
        """Detuned saw chord that swells in and out."""
        def f(x):
            a = min(1, x / attack) * min(1, max(0, (dur - x) / release))
            v = 0.0
            for fr in freqs:
                for d in (-.6, .6):
                    ph = (fr + d) * x % 1.0
                    v += 2 * ph - 1
            return v * a / len(freqs) / 2
        self.add(t, dur, f, gain)

    def whoosh(self, t, dur, gain=0.25, up=True):
        """Filtered noise swell for transitions (whip pans, zooms)."""
        st = {"lp": 0.0}
        rnd = self.rng

        def f(x):
            u = x / dur
            c = (.02 + .25 * u) if up else (.27 - .25 * u)
            st["lp"] += c * (rnd.uniform(-1, 1) - st["lp"])
            return st["lp"] * math.sin(math.pi * min(1, u)) ** 2 * 3
        self.add(t, dur, f, gain)

    # --- patterns --------------------------------------------------------
    def groove(self, start, end, bpm=120, progression=((110, (220, 261.6, 329.6)),), bars_per_chord=1):
        """Kick on beats, hats on off-beats, snare on 2 and 4, bass + pad following a progression."""
        beat = 60 / bpm
        beats = int((end - start) / beat)
        for b in range(beats):
            t = start + b * beat
            self.kick(t, .85)
            self.noise(t + beat / 2, .03, .12, .95)
            if b % 2 == 1:
                self.noise(t, .09, .18, .5)
            root, _ = progression[(b // (4 * bars_per_chord)) % len(progression)]
            self.tone(t, root, beat * .9, .16, 5, "saw")
            self.tone(t + beat / 2, root * 2, beat * .4, .05, 10, "saw")
        chord_len = beat * 4 * bars_per_chord
        k = 0
        while start + k * chord_len < end - 1e-6:
            _, chord = progression[k % len(progression)]
            self.pad(start + k * chord_len, min(chord_len, end - start - k * chord_len), chord, .035, .15, .3)
            k += 1

    # --- output ----------------------------------------------------------
    def write(self, path, echoes=((.113, .25), (.197, .18), (.291, .12)), fade_out=0.45, drive=1.2):
        """Add a short multi-tap echo, normalise, soft-clip, fade, write 16-bit mono WAV."""
        src, out = self.buf, self.buf[:]
        for delay, g in echoes:
            d = int(delay * SR)
            for i in range(d, self.n):
                out[i] += src[i - d] * g
        peak = max(1e-9, max(abs(v) for v in out))
        g = .89 / peak
        total = self.n / SR
        frames = bytearray()
        for i, v in enumerate(out):
            fo = min(1.0, (total - i / SR) / fade_out) if fade_out > 0 else 1.0
            s = math.tanh(v * g * drive) * fo
            frames += struct.pack('<h', int(max(-1, min(1, s)) * 32000))
        with wave.open(path, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(bytes(frames))
