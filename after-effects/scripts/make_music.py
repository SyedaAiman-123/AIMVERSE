"""Original soundtrack for the AIMVERSE promo — synthesised from scratch (no samples, no licensing).
116 BPM, 24 bars (~49.7 s), I–V–vi–IV in C. Structure (bars):
  1-2  riser + hats + teaser arp      3-10  drop: full groove       11-14 lift: pad + wide arp
  15-22 full groove, extra stabs     23-24 outro: kick stops, chord rings out
Run:  python after-effects/scripts/make_music.py <out.wav>
"""
import math, random, struct, sys, wave
from array import array

SR = 44100
BPM = 116
BEAT = 60 / BPM
STEP = BEAT / 4
BARS = 24
N = int(SR * BEAT * 4 * BARS) + SR * 2  # + 2 s tail
random.seed(7)

drums = array('d', [0.0]) * N
music = array('d', [0.0]) * N
kick_env = array('d', [0.0]) * N  # for sidechain pump

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
PROG = [(0, False), (7, False), (9, True), (5, False)]


def add(buf, start, samples, gain=1.0):
    i0 = int(start * SR)
    for i, s in enumerate(samples):
        j = i0 + i
        if j >= N:
            break
        buf[j] += s * gain


def lp(samples, cutoff):
    a = 1 - math.exp(-2 * math.pi * cutoff / SR)
    y = 0.0
    out = []
    for s in samples:
        y += a * (s - y)
        out.append(y)
    return out


def hp(samples, cutoff):
    low = lp(samples, cutoff)
    return [s - l for s, l in zip(samples, low)]


def env_exp(n, decay):
    return [math.exp(-i / (SR * decay)) for i in range(n)]


def kick(t):
    n = int(SR * 0.38)
    out, ph = [], 0.0
    for i in range(n):
        f = 45 + 110 * math.exp(-i / (SR * 0.035))
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-i / (SR * 0.14)) * 1.0)
    add(drums, t, out, 0.95)
    i0 = int(t * SR)
    for i in range(int(SR * 0.22)):
        if i0 + i < N:
            kick_env[i0 + i] = max(kick_env[i0 + i], 1 - i / (SR * 0.22))


def clap(t):
    for k, d in enumerate([0, 0.012, 0.024]):
        n = int(SR * (0.16 if k == 2 else 0.03))
        noise = hp([random.uniform(-1, 1) for _ in range(n)], 900)
        e = env_exp(n, 0.05 if k == 2 else 0.012)
        add(drums, t + d, [a * b for a, b in zip(noise, e)], 0.28)


def hat(t, open_=False, g=0.12):
    n = int(SR * (0.16 if open_ else 0.05))
    noise = hp([random.uniform(-1, 1) for _ in range(n)], 7000)
    e = env_exp(n, 0.05 if open_ else 0.012)
    add(drums, t, [a * b for a, b in zip(noise, e)], g)


def saw(f, n, ph0=0.0):
    out, ph = [], ph0
    for _ in range(n):
        out.append(2 * (ph % 1.0) - 1)
        ph += f / SR
    return out


def tone(t, f, dur, kind, gain, cutoff):
    n = int(SR * dur)
    if kind == 'saw':
        s = saw(f, n)
    elif kind == 'square':
        s = [1.0 if v > 0 else -1.0 for v in saw(f, n)]
    elif kind == 'tri':
        s = [2 * abs(v) - 1 for v in saw(f, n)]
    else:
        s = [math.sin(2 * math.pi * f * i / SR) for i in range(n)]
    s = lp(s, cutoff)
    a = 0.004 * SR
    e = [min(1, i / a) * math.exp(-i / (SR * dur * 0.45)) for i in range(n)]
    add(music, t, [x * y for x, y in zip(s, e)], gain)


def bass(t, m, dur):
    tone(t, mtof(m), dur, 'saw', 0.20, 650)
    tone(t, mtof(m - 12), dur, 'sine', 0.24, 200)


def stab(t, notes):
    for m in notes:
        tone(t, mtof(m), STEP * 2.6, 'saw', 0.045, 2400)


def arp(t, m, wide=False):
    tone(t, mtof(m), STEP * 1.7, 'square' if not wide else 'saw', 0.030, 3200 if not wide else 4200)


def pad(t, notes, dur):
    for m in notes:
        for det in (-0.006, 0.006):
            n = int(SR * dur)
            s = lp([2 * abs(v) - 1 for v in saw(mtof(m) * (1 + det), n)], 1800)
            e = [min(1, i / (SR * 0.5)) * min(1, (n - i) / (SR * 0.6)) for i in range(n)]
            add(music, t, [x * y for x, y in zip(s, e)], 0.03)


def riser(t, dur):
    n = int(SR * dur)
    noise = [random.uniform(-1, 1) for _ in range(n)]
    out, y = [], 0.0
    for i, x in enumerate(noise):
        p = i / n
        a = 1 - math.exp(-2 * math.pi * (300 + 7000 * p * p) / SR)
        y += a * (x - y)
        out.append((x - y) * (0.02 + 0.28 * p * p))
    add(music, t, out, 1.0)
    # rising sine
    ph, so = 0.0, []
    for i in range(n):
        p = i / n
        ph += 2 * math.pi * (110 + 900 * p * p) / SR
        so.append(math.sin(ph) * (0.02 + 0.10 * p))
    add(music, t, so, 1.0)


def crash(t):
    n = int(SR * 1.8)
    noise = hp([random.uniform(-1, 1) for _ in range(n)], 3500)
    e = env_exp(n, 0.7)
    add(drums, t, [a * b for a, b in zip(noise, e)], 0.32)
    boom = [math.sin(2 * math.pi * (28 + 60 * math.exp(-i / (SR * 0.3))) * i / SR) * math.exp(-i / (SR * 0.7)) for i in range(int(SR * 1.2))]
    add(drums, t, boom, 0.8)


BAR = BEAT * 4
riser(0.0, BAR * 2)
for s in range(BARS * 16):
    t = s * STEP
    bar = s // 16
    st = s % 16
    ch = PROG[bar % 4]
    root = 48 + ch[0]
    third = 3 if ch[1] else 4
    triad = [root, root + third, root + 7]
    intro = bar < 2
    outro = bar >= 22
    lift = 10 <= bar < 14

    # hats
    if st % 4 == 2:
        hat(t, True, 0.08 if intro else 0.10)
    if (not intro) and st % 2 == 1 and not outro:
        hat(t, False, 0.045)
    if intro and st % 4 == 0:
        hat(t, False, 0.05)
    # snare-ish roll at the end of bar 2
    if bar == 1 and st >= 8:
        clap(t) if st % 2 == 0 else None
    # drop
    if bar == 2 and st == 0:
        crash(t)
    if 2 <= bar < 22:
        if st % 4 == 0:
            kick(t)
        if st in (4, 12):
            clap(t)
        pat = {0: 0, 3: 0, 6: 12, 8: 0, 11: 0, 14: 7}
        if st in pat and not lift:
            bass(t, root - 12 + pat[st], STEP * 2.2)
        if st in pat and lift and st in (0, 8):
            bass(t, root - 12, STEP * 3.5)
        if st in (2, 6, 10) and not lift:
            stab(t, [n + 12 for n in triad] + [root + 24])
        if bar >= 14 and st == 15:
            stab(t, [n + 12 for n in triad])
        tones = [triad[0] + 24, triad[1] + 24, triad[2] + 24, triad[0] + 36]
        pattern = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2] if (lift or bar >= 6) else [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1]
        k = pattern[st]
        if k >= 0:
            arp(t, tones[k], wide=lift or bar >= 14)
        if lift and st == 0:
            pad(t, [root + 12, root + 12 + third, root + 19], BAR)
    # teaser arp in the intro (last bar only, sparse)
    if bar == 1 and st % 4 == 2:
        arp(t, 72 + [0, 4, 7, 12][(st // 4) % 4])
    # outro: ring out on the tonic chord
    if bar == 22 and st == 0:
        pad(t, [60, 64, 67, 72], BAR * 2 + 1.5)
        stab(t, [72, 76, 79, 84])
        crash(t)
        kick(t)

# sidechain pump on melodic bus, then mix
mix = array('d', [0.0]) * N
for i in range(N):
    mix[i] = drums[i] + music[i] * (1 - 0.45 * kick_env[i])

# simple dotted-eighth echo on the music bus for width
delay = int(SR * STEP * 3)
for i in range(delay, N):
    mix[i] += 0.18 * music[i - delay]

peak = max(abs(x) for x in mix) or 1.0
scale = 0.708 / peak  # -3 dBFS
fade_in = int(SR * 0.02)
end = int(SR * (BAR * BARS + 1.2))
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for i in range(min(N, end + int(SR * 1.0))):
        v = mix[i] * scale
        if i < fade_in:
            v *= i / fade_in
        tail = (BAR * BARS + 1.2) * SR
        if i > tail:
            v *= max(0.0, 1 - (i - tail) / SR)
        iv = max(-32767, min(32767, int(v * 32767)))
        frames += struct.pack('<hh', iv, iv)
    w.writeframes(bytes(frames))
print('wrote', sys.argv[1], round((BAR * BARS + 2.2), 1), 's')
