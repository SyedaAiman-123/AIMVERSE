# NEDVERSE — Phase 3: Environment prototype (Main Gate & Welcome Plaza)

Date: 2026-11-21. Scope: **one representative section only**, to judge visual quality before the campus is expanded. Unofficial, NED-inspired; not a replica.

## What was built
Dev-only preview page `frontend/nedverse.html` (not part of the production build — verified: `dist/` contains no `nedverse.html`; only the owner-supplied logo file ships). Code in `frontend/src/nedverse/`:
| File | Contents |
|---|---|
| `textures.ts` | All surfaces drawn in-engine (no downloads): cream plaster, window-bay facade with lintel/sill/glass reflection/weathering streaks, asphalt, paving, grass + large-scale dry/dark patches, **yellow-black striped kerb**, metal gate bars, sign/plaque text textures, the owner-supplied emblem |
| `Architecture.tsx` | `Block` (multi-storey building: facade bays on all sides, plinth, deep parapet/fascia, roof units, optional entrance porch with columns and dept sign), **Main Gate** (portal-frame arch, lettering band, piers, guard rooms, open barred gate leaves, "MAIN GATE — IN" sign, round plaque with the emblem), welcome **kiosk** (glowing screen with emblem), in-world **"About NEDVERSE" disclaimer board**, signpost, parked cars, kerb lines |
| `Landscape.tsx` | Ground, roads (University Road with dashes, entrance road, main avenue), paved plaza and paths, boundary wall, **instanced** trees (smooth lobed canopies, height-gradient colour, per-tree tint, subtle GPU wind sway), coconut palms, flowering shrub beds, lamps, benches, plaza planter, far tree-line + clouds |
| `PrototypeScene.tsx` | Physically-based sky, south-west morning sun with 4096² soft shadows, sky fill, haze, ACES tone-mapping, subtle bloom/SMAA/vignette, your avatar (existing GLB, idle clip) standing in the plaza, 6 camera presets |
Counts in the scene: 1 gate, 7 buildings (CS & IT block with porch, a second academic block, 2 pavilions, 5 distant context blocks), ~80 trees, 6 palms, ~90 shrubs, 16 lamps, 8 benches, 3 cars, kiosk, signpost, disclaimer board.

## Screenshots (rendered by headless Edge with software GL, 1600×900)
1. `nedverse/phase3_1_gate_from_plaza.jpg` — approaching the gate from the plaza
2. `nedverse/phase3_2_plaza_overview.jpg` — aerial overview: gate, plaza, kiosk, signpost, CS & IT building
3. `nedverse/phase3_3_cs_building.jpg` — CS & IT building from the paved path
4. `nedverse/phase3_4_gate_from_road.jpg` — the gate seen from University Road
5. `nedverse/phase3_5_avatar_street_level.jpg` — street level with your avatar (earlier lighting pass)

## How the owner's references were used
- Photo 1 (main gate): portal-frame arch with lettering band, flanking guard blocks, "MAIN GATE IN" sign, yellow-black kerbs, parked car.
- Photos 2–3: cream plaster, flat roofs with parapets, vertical window bays, mature broadleaf trees, flowering shrub beds, benches, lamp posts.
- Official map: plaza/entrance by the Admissions & Food Centre side, CS & IT building to the north along the same side as University Road (compressed distances).
- **NED emblem** (supplied by you, 119×118 px): on the gate pier plaque and the kiosk screen; the unofficial/not-affiliated board stands next to the kiosk.

## Honest limitations of this prototype
- Not photoreal: stylised geometry, procedural textures; building proportions are estimates (no measured drawings).
- The emblem file is small (119 px); it is crisp on the plaque but would blur if enlarged. NED's logo page offers higher-resolution files (not downloaded; needs your OK).
- **Performance is not measured.** Screenshots were rendered with software GL; frame rate on a real GPU/phone is unknown. Planned mitigations (Phase 8): lower shadow resolution on Low tier, fewer trees, billboard LOD, lazy interiors.
- No collision, controls, interaction or walking yet (Phase 4+). The avatar only idles; walk/run clips come in Phase 4.
- Tree canopies, palms and the avatar's lighting are still the weakest parts visually; the sky is a pale morning haze.
- Not yet verified on mobile, other browsers, or with the real hold-to-enter flow.

## Decisions for you
1. Approve this visual direction, or tell me what to change (tree style, colours, building proportions, sky mood).
2. OK to download a higher-resolution NED emblem from NED's logo page for the plaque/kiosk?
3. Send the extra photos (CS department entrance, library, auditorium, garden) so Phase 5 buildings match better.
4. Push the AIMVERSE rebrand + new promo (+ AIM AI rename) to GitHub/Vercel now? (The dev-only prototype page does not ship.)
