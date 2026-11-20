"""Generates the NEDVERSE top-down campus plan (SVG) and the layout data (JSON) used later by the 3D world and mini-map.
This is an ORIGINAL schematic. Zone adjacencies follow the official NED campus map (north up, University Road on the east),
but distances are compressed for walking and no building is claimed to be an exact replica.
Run: python scripts/make_campus_plan.py  ->  documentation/nedverse/campus_plan.svg + layout.json
Units: metres; x = east, z = south; origin = centre of the campus."""
import json, math, os, html

OUT = os.path.join(os.path.dirname(__file__), '..', 'documentation', 'nedverse')
os.makedirs(OUT, exist_ok=True)
X0, X1, Z0, Z1, S = -135, 140, -90, 95, 4.2   # world bounds and px/m
PX = lambda x: 60 + (x - X0) * S
PZ = lambda z: 70 + (z - Z0) * S
W, H = int(PX(X1) + 340), int(PZ(Z1) + 60)

roads = [  # (name, x1,z1,x2,z2,width)
    ('Main Avenue', -105, 58, 125, 58, 9), ('East Spine', 84, -58, 84, 58, 7), ('Central Spine', 10, -46, 10, 58, 6),
    ('North Loop', -80, -46, 84, -46, 6), ('West Spine', -62, -52, -62, 58, 6),
]
# zone buildings: id, label, kind, cx, cz, w, d, color, enterable-or-scenery
B = [
    ('A', 'Main Gate & Welcome Plaza', 'plaza', 102, 52, 30, 30, '#f2c200'),
    ('A1', 'Admissions Centre', 'bld', 112, 70, 12, 8, '#c9bd9d'), ('A2', 'Food Centre', 'bld', 92, 70, 14, 9, '#c9bd9d'),
    ('ADM', 'Administration Block', 'bld', 58, 71, 36, 14, '#d9c34a'),
    ('C', 'CS & IT Department + Labs', 'bld', 102, 8, 42, 18, '#e3d6b4'), ('C2', 'CS Labs wing', 'bld', 102, -16, 36, 12, '#e3d6b4'),
    ('F', 'Auditorium & Exhibition', 'bld', 34, 6, 30, 24, '#e3d6b4'),
    ('E', 'Central Garden & Fountain Courtyard', 'garden', 63, 4, 34, 34, '#7fa56a'),
    ('B', 'Academic Block', 'bld', 10, -24, 42, 16, '#e3d6b4'), ('B2', '', 'bld', -14, -10, 18, 14, '#e3d6b4'),
    ('D', 'University Library', 'bld', -40, 22, 36, 22, '#e3d6b4'), ('MQ', 'Mosque (scenery)', 'dome', -66, 6, 14, 14, '#c9bd9d'),
    ('G', 'Student Common Area & Cafeteria', 'bld', -42, -36, 24, 14, '#e8d2a8'),
    ('HST', 'Hostels (scenery)', 'bld', -108, -34, 30, 18, '#a9c8d8'),
    ('SP', 'Cricket ground (scenery)', 'oval', 70, -68, 40, 30, '#8bb36f'),
]
signs = [  # sign posts at junctions: (x,z,text)
    (84, 52, 'CS & IT Dept ↑   Auditorium ←'), (36, 52, 'Auditorium ↑  Library ←'), (10, 52, 'Academic Block ↑'), (-62, 52, 'Library ↑  Cafeteria ↑'),
    (84, -40, '← Academic Block'), (10, -40, '↓ Garden & Auditorium'),
]
route = [(102, 52), (84, 52), (84, 4), (63, 4), (36, 6), (10, 6), (10, -24), (10, -46), (-62, -46), (-62, -36), (-42, -36), (-62, -36), (-62, 22), (-40, 22)]  # A > C > E > F > B > G > D, along roads
points = {  # interaction anchors (x,z)
    'welcome kiosk': (104, 45), 'campus guide': (96, 57), 'CS lab workstations (5-6 desks)': (102, 3),
    'library skill shelves (6)': (-40, 14), 'auditorium exhibition panels': (36, 14),
}

def r(x, z, w, d, fill, stroke='#2a2a33', op=1.0, rx=1.5):
    return f'<rect x="{PX(x-w/2):.1f}" y="{PZ(z-d/2):.1f}" width="{w*S:.1f}" height="{d*S:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.2" opacity="{op}"/>'

o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Segoe UI,Arial,sans-serif">',
     f'<rect width="{W}" height="{H}" fill="#f4f1e8"/>',
     f'<rect x="{PX(-118):.0f}" y="{PZ(-80):.0f}" width="{(125+118)*S:.0f}" height="{(92+80)*S:.0f}" fill="#dfe9d0" stroke="#8aa077" stroke-width="2" stroke-dasharray="8 5"/>',
     f'<text x="60" y="38" font-size="22" font-weight="800" fill="#16161c">NEDVERSE — campus plan (schematic, Phase 2 draft)</text>',
     f'<text x="60" y="58" font-size="12" fill="#555">Original schematic · north up · University Road on the east · zone adjacencies follow the official NED campus map · not an exact replica · metres</text>']
# University Road
o.append(f'<rect x="{PX(125):.0f}" y="{PZ(-85):.0f}" width="{14*S:.0f}" height="{(95+85)*S:.0f}" fill="#8c8c94"/><text transform="translate({PX(132):.0f},{PZ(-20):.0f}) rotate(90)" font-size="13" fill="#fff" font-weight="700">UNIVERSITY ROAD</text>')
for n, x1, z1, x2, z2, w in roads:
    if x1 == x2: o.append(r((x1), (z1+z2)/2, w, abs(z2-z1), '#a9a9b1', '#8c8c94', 1, 0))
    else: o.append(r((x1+x2)/2, z1, abs(x2-x1), w, '#a9a9b1', '#8c8c94', 1, 0))
# plaza circle
o.append(f'<circle cx="{PX(102):.0f}" cy="{PZ(52):.0f}" r="{15*S:.0f}" fill="#efe3a0" stroke="#c9a800" stroke-width="2"/>')
for id_, lab, kind, cx, cz, w, d, col in B:
    if kind == 'plaza': continue
    if kind == 'garden':
        o.append(f'<circle cx="{PX(cx):.0f}" cy="{PZ(cz):.0f}" r="{w/2*S:.0f}" fill="{col}" opacity=".55" stroke="#4f7a3d" stroke-width="1.5"/><circle cx="{PX(cx):.0f}" cy="{PZ(cz):.0f}" r="{6*S:.0f}" fill="#7fb3e0" stroke="#3b6f9c"/>')
    elif kind == 'oval':
        o.append(f'<ellipse cx="{PX(cx):.0f}" cy="{PZ(cz):.0f}" rx="{w/2*S:.0f}" ry="{d/2*S:.0f}" fill="{col}" stroke="#4f7a3d" stroke-width="2"/>')
    elif kind == 'oct':
        pts = ' '.join(f'{PX(cx+math.cos(math.pi/8+k*math.pi/4)*w/2):.1f},{PZ(cz+math.sin(math.pi/8+k*math.pi/4)*w/2):.1f}' for k in range(8))
        o.append(f'<polygon points="{pts}" fill="{col}" stroke="#2a2a33" stroke-width="1.5"/>')
    elif kind == 'dome':
        o.append(f'<circle cx="{PX(cx):.0f}" cy="{PZ(cz):.0f}" r="{w/2*S:.0f}" fill="{col}" stroke="#2a2a33"/>')
    else:
        o.append(r(cx, cz, w, d, col))
# trees (deterministic scatter in green zones + along roads)
import random
random.seed(7)
def tree(x, z, rad=2.4): return f'<circle cx="{PX(x):.1f}" cy="{PZ(z):.1f}" r="{rad*S:.1f}" fill="#4f7a3d" opacity=".7"/>'
def blocked(x, z):
    for n, x1, z1, x2, z2, w in roads:
        if x1 == x2 and abs(x - x1) < w / 2 + 2.5 and min(z1, z2) - 2 < z < max(z1, z2) + 2: return True
        if z1 == z2 and abs(z - z1) < w / 2 + 2.5 and min(x1, x2) - 2 < x < max(x1, x2) + 2: return True
    for id_, lab, kind, cx, cz, w, d, col in B:
        if abs(x - cx) < w / 2 + 3 and abs(z - cz) < d / 2 + 3: return True
    return x > 118
n_ = 0
while n_ < 80:
    x, z = random.uniform(-114, 118), random.uniform(-78, 88)
    if not blocked(x, z): o.append(tree(x, z, random.uniform(1.6, 3))); n_ += 1
# route
pts = ' '.join(f'{PX(x):.0f},{PZ(z):.0f}' for x, z in route)
o.append(f'<polyline points="{pts}" fill="none" stroke="#ff4a1c" stroke-width="3.5" stroke-dasharray="10 7" stroke-linejoin="round"/>')
# labels
for id_, lab, kind, cx, cz, w, d, col in B:
    if not lab: continue
    if len(id_) == 1:
        o.append(f'<circle cx="{PX(cx):.0f}" cy="{PZ(cz):.0f}" r="13" fill="#ff4a1c" stroke="#fff" stroke-width="2"/><text x="{PX(cx):.0f}" y="{PZ(cz)+5:.0f}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">{id_}</text>')
        ly = PZ(cz) - (w * 0.5 if kind == 'garden' else 15 if id_ == 'A' else d * 0.5) * S - 8 if id_ in ('A', 'E') else PZ(cz) + d * 0.5 * S + 16
        o.append(f'<text x="{PX(cx):.0f}" y="{ly:.0f}" text-anchor="middle" font-size="12" font-weight="700" fill="#16161c" stroke="#f4f1e8" stroke-width="3" paint-order="stroke">{html.escape(lab)}</text>')
    else:
        o.append(f'<text x="{PX(cx):.0f}" y="{PZ(cz)+4:.0f}" text-anchor="middle" font-size="10" fill="#333">{html.escape(lab)}</text>')
for x, z, t in signs:
    left = x > 60
    o.append(f'<rect x="{PX(x)-5:.0f}" y="{PZ(z)-5:.0f}" width="10" height="10" fill="#1a5fb4" stroke="#fff"/><text x="{PX(x)+(-9 if left else 9):.0f}" y="{PZ(z)+4:.0f}" text-anchor="{"end" if left else "start"}" font-size="9" fill="#1a5fb4" stroke="#f4f1e8" stroke-width="2.5" paint-order="stroke">{html.escape(t)}</text>')
for k, (x, z) in points.items():
    o.append(f'<path d="M{PX(x):.0f},{PZ(z)-9:.0f} l7,12 h-14 z" fill="#0a8f6a" stroke="#fff"/>')
# compass, scale, legend
cx, cz = W - 60, 110
o.append(f'<g><circle cx="{cx}" cy="{cz}" r="26" fill="#fff" stroke="#16161c"/><path d="M{cx},{cz-22} l7,28 l-7,-6 l-7,6 z" fill="#16161c"/><text x="{cx}" y="{cz-30}" text-anchor="middle" font-size="13" font-weight="800">N</text></g>')
o.append(f'<g><rect x="{PX(-120)}" y="{PZ(88)}" width="{50*S}" height="6" fill="#16161c"/><text x="{PX(-120)}" y="{PZ(88)-6}" font-size="11">50 m</text></g>')
leg = ['A  Main Gate & Welcome Plaza  (spawn, kiosk, guide)', 'B  Academic Block', 'C  Computer Science Lab  (project workstations)', 'D  University Library  (skill shelves)',
       'E  Central Garden & Fountain Courtyard', 'F  Auditorium & Exhibition Hall', 'G  Student Common Area & Cafeteria']
y = 190
o.append(f'<text x="{W-312}" y="{y}" font-size="14" font-weight="800">Primary destinations</text>')
for t in leg: y += 22; o.append(f'<text x="{W-312}" y="{y}" font-size="12" fill="#16161c">{html.escape(t)}</text>')
y += 34; o.append(f'<line x1="{W-312}" y1="{y}" x2="{W-274}" y2="{y}" stroke="#ff4a1c" stroke-width="3.5" stroke-dasharray="10 7"/><text x="{W-266}" y="{y+4}" font-size="12">suggested first walk</text>')
y += 22; o.append(f'<rect x="{W-312}" y="{y-8}" width="10" height="10" fill="#1a5fb4"/><text x="{W-294}" y="{y+1}" font-size="12">signboard</text>')
y += 22; o.append(f'<path d="M{W-307},{y-9} l7,12 h-14 z" fill="#0a8f6a"/><text x="{W-294}" y="{y+1}" font-size="12">interaction anchor (press E)</text>')
y += 22; o.append(f'<circle cx="{W-307}" cy="{y-3}" r="5" fill="#4f7a3d" opacity=".7"/><text x="{W-294}" y="{y+1}" font-size="12">tree (instanced in 3D)</text>')
o.append('</svg>')
open(os.path.join(OUT, 'campus_plan.svg'), 'w', encoding='utf-8').write('\n'.join(o))
json.dump({'units': 'metres; x east, z south; north up', 'roads': roads, 'buildings': B, 'signs': signs, 'route': route, 'anchors': points}, open(os.path.join(OUT, 'layout.json'), 'w'), indent=1)
print('ok', W, H)
