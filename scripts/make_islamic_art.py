"""Generates original illustrative SVG artwork for the Islamic Evaluator and Trainer project (no screenshots exist)."""
import math, os, random, sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
W, H = 1280, 720
GREEN, DEEP, GOLD, CREAM = '#0f3d36', '#08221f', '#e3b95b', '#f3ead3'
TAG = f'<text x="{W-24}" y="{H-22}" text-anchor="end" font-family="monospace" font-size="15" fill="{CREAM}" opacity=".7">ILLUSTRATIVE ARTWORK — NOT AN APP SCREENSHOT</text>'


def star(cx, cy, r, rot=0):
    pts = []
    for i in range(16):
        a = rot + i * math.pi / 8
        rr = r if i % 2 == 0 else r * 0.62
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return ' '.join(pts)


def svg(body, bg=DEEP):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="{bg}"/>{body}{TAG}</svg>'


# 1 — geometric pattern
b = [f'<defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="{GREEN}"/><stop offset="1" stop-color="{DEEP}"/></radialGradient></defs><rect width="{W}" height="{H}" fill="url(#g)"/>']
s = 120
for gx in range(-1, W // s + 2):
    for gy in range(-1, H // s + 2):
        cx, cy = gx * s, gy * s
        b.append(f'<polygon points="{star(cx, cy, s * 0.5)}" fill="none" stroke="{GOLD}" stroke-width="1.4" opacity=".75"/>')
        b.append(f'<polygon points="{star(cx + s / 2, cy + s / 2, s * 0.28, math.pi / 16)}" fill="{GOLD}" opacity=".12" stroke="{GOLD}" stroke-width=".8"/>')
b.append(f'<circle cx="{W/2}" cy="{H/2}" r="210" fill="{DEEP}" stroke="{GOLD}" stroke-width="3"/>')
for k, (r, rot) in enumerate([(190, 0), (150, math.pi / 16), (105, 0)]):
    b.append(f'<polygon points="{star(W/2, H/2, r, rot)}" fill="none" stroke="{GOLD}" stroke-width="{2.4 - k*.5}"/>')
b.append(f'<circle cx="{W/2}" cy="{H/2}" r="22" fill="{GOLD}"/>')
open(f'{out}/islamic-1.svg', 'w', encoding='utf-8').write(svg(''.join(b)))

# 2 — word search grid
random.seed(7)
cols, rows, cell = 14, 8, 62
ox, oy = (W - cols * cell) / 2, 60
grid = [[random.choice('ABDEHIKLMNORSTUWYZ') for _ in range(cols)] for _ in range(rows)]
words = [('SALAH', 0, 1, 'h'), ('QURAN', 2, 5, 'h'), ('SEERAH', 5, 2, 'h'), ('ZAKAT', 1, 8, 'v'), ('SABR', 4, 12, 'v')]
hl = []
for w, r, c, d in words:
    for i, ch in enumerate(w):
        rr, cc = (r, c + i) if d == 'h' else (r + i, c)
        if rr < rows and cc < cols:
            grid[rr][cc] = ch
    if d == 'h':
        hl.append((ox + c * cell + 4, oy + r * cell + 6, len(w) * cell - 8, cell - 12))
    else:
        hl.append((ox + c * cell + 6, oy + r * cell + 4, cell - 12, min(len(w), rows - r) * cell - 8))
b = [f'<rect x="{ox-20}" y="{oy-20}" width="{cols*cell+40}" height="{rows*cell+40}" rx="22" fill="{GREEN}" stroke="{GOLD}" stroke-width="2"/>']
for x, y, w_, h_ in hl:
    b.append(f'<rect x="{x}" y="{y}" width="{w_}" height="{h_}" rx="{(h_ if h_ < w_ else w_)/2:.0f}" fill="{GOLD}" opacity=".28" stroke="{GOLD}" stroke-width="2"/>')
for r in range(rows):
    for c in range(cols):
        b.append(f'<text x="{ox + c*cell + cell/2}" y="{oy + r*cell + cell/2 + 9}" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="{CREAM}">{grid[r][c]}</text>')
b.append(f'<text x="{ox}" y="{oy + rows*cell + 70}" font-family="monospace" font-size="20" fill="{GOLD}">TIME 01:42   ·   HINTS 2   ·   SCORE 340</text>')
open(f'{out}/islamic-2.svg', 'w', encoding='utf-8').write(svg(''.join(b)))

# 3 — sequencing cards
b = []
cw, ch, gap = 250, 340, 40
x0 = (W - (4 * cw + 3 * gap)) / 2
order = [2, 4, 1, 3]
for i, n in enumerate(order):
    x = x0 + i * (cw + gap)
    y = 170 + (-18 if i % 2 else 0)
    b.append(f'<g transform="rotate({(-3, 2, -2, 3)[i]} {x+cw/2} {y+ch/2})"><rect x="{x}" y="{y}" width="{cw}" height="{ch}" rx="20" fill="{GREEN}" stroke="{GOLD}" stroke-width="2.5"/>')
    b.append(f'<polygon points="{star(x+cw/2, y+110, 62, 0)}" fill="none" stroke="{GOLD}" stroke-width="2"/>')
    b.append(f'<text x="{x+cw/2}" y="{y+128}" text-anchor="middle" font-family="Georgia,serif" font-size="54" fill="{GOLD}">{n}</text>')
    b.append(f'<rect x="{x+34}" y="{y+215}" width="{cw-68}" height="12" rx="6" fill="{CREAM}" opacity=".6"/><rect x="{x+34}" y="{y+245}" width="{(cw-68)*.7}" height="12" rx="6" fill="{CREAM}" opacity=".35"/><rect x="{x+34}" y="{y+275}" width="{(cw-68)*.5}" height="12" rx="6" fill="{CREAM}" opacity=".25"/></g>')
    if i < 3:
        ax = x + cw + gap / 2
        b.append(f'<path d="M{ax-12} 330 L{ax+12} 340 L{ax-12} 350" fill="none" stroke="{GOLD}" stroke-width="4" stroke-linecap="round"/>')
b.append(f'<text x="{W/2}" y="110" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="{CREAM}">Arrange the events in order</text>')
open(f'{out}/islamic-3.svg', 'w', encoding='utf-8').write(svg(''.join(b), DEEP))
print('ok')
