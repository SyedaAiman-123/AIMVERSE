# NEDVERSE — Phase 4: Player system (avatar, movement, camera, collisions, controls)

Date: 2026-11-21. Playable in the dev preview only: **http://localhost:5173/nedverse.html?play=1** (add `&touch=1` to force touch controls, `&q=low|high` to force a quality tier). Not part of the production site yet.

## What was built
| Piece | Details |
|---|---|
| **Walk + run animation (option C)** | Authored in **Blender 4.5** on your existing rig (`blender/make_locomotion.py`, reads `Aiman_Avatar_Rigged.blend`; mesh, materials, rest pose untouched). In-place loops: **Aiman_Walk** (24 frames, 1.0 s/cycle) and **Aiman_Run** (16 frames, 0.67 s/cycle) with leg swing, knee flex, counter-rotating arms/pelvis/chest, forward lean for the run. Exported as an **animation-only GLB (75 KB)** `public/models/aiman-locomotion.glb`; the site applies the clips to the existing optimised avatar (`aiman-web.glb` unchanged). Contact sheets: `documentation/nedverse/phase4_walk_cycle.png`, `phase4_run_cycle.png`. |
| **Code-driven movement** | Fixed 60 Hz physics with smooth acceleration/deceleration (walk 1.4 m/s, run 3.4 m/s), camera-relative direction, **natural turning** (damped yaw toward travel direction), ground height (paved plaza sits above the lawn), clip speed matched to ground speed, Idle ⇄ Walk ⇄ Run **0.28 s cross-fades**. |
| **Third-person camera** | Damped orbit follow, mouse-drag look, wheel zoom, pulls in quickly when a wall is behind her and eases back out (never clips into buildings). |
| **Collisions** | Circle-vs-box/circle system generated from the same `layout.ts` the scene is drawn from (buildings, gate piers/guard rooms/gate leaves, boundary wall, planter, kiosk, board, signpost, trees, palms, shrubs, lamps, benches, cars; porch is walkable between its columns). Slides along walls; bounded world; ground-snapped (no falling). |
| **Interaction detection** | Nearest interactable in range and in front of her → **"PRESS E TO INTERACT"** + label (kiosk, About-NEDVERSE board, signpost). E (or tap) opens a card; Esc closes it and she is exactly where she was. Cards are placeholders for Phase 6 content (the About board shows the real disclaimer). |
| **Controls** | Desktop: WASD / arrows, Shift run, mouse drag look, wheel zoom, E interact, Esc close/pause. Touch: virtual joystick (left), drag-to-look (right), Run and E buttons. Movement is locked while a card or the pause menu is open. |
| **Pause menu** | Esc: Resume or "Exit to AIMVERSE portfolio"; shows the unofficial disclaimer. |
| **Quality tiers** | High (4096² shadows, SMAA + bloom) and **Low** (1536² shadows, no bloom/SMAA, dpr 1; auto on touch devices or ≤ 4 CPU cores). |
| **Robustness** | A failed asset load cannot blank the world (error boundary); a QA-only `?x=&z=&yaw=` spawn override exists for tests. |

## Verification — automated, real input (scripts/test_play.mjs)
The test drives the real page in headless Edge through the DevTools protocol with **real keyboard, mouse and touch events** and reads the live player state. **20 / 20 passed:**
spawn + clips load · idle at rest · W → Walk at ~1.25 m/s (accelerating to 1.4) · moves forward camera-relative · Shift → Run at ~3.2 m/s (→ 3.4) · releasing decelerates to Idle · mouse drag orbits the camera · walks into the Academic Block wall and **stops at z = −25.32 (predicted −25.32)** · does not clip when pushing · **slides along the wall** · E prompt appears next to the kiosk · E opens the card · movement ignored while the card is open · Esc closes it with **0.000 m** position change · Esc pauses with Resume + exit link · no movement while paused · Resume works · touch controls appear · joystick drag walks the avatar · no uncaught page errors.
Bugs the tests exposed and I fixed: a push-out-of-overlap counted as speed (could fling her sideways); the kiosk-screen text overflowed.
Screenshots from the run: `reference/play_test5/` (walk, run, wall, prompt, card, touch).

## Honest limitations
- **Real-hardware performance is unknown.** The tests ran with software rendering at ~0.5 fps in a 640×360 window; the physics is time-step based so the results are valid, but smoothness on a real GPU/phone must be checked by you.
- **Animation quality.** The walk reads well from behind and at normal viewing distance because the abaya hides the legs. In the Blender preview the long skirt shows some blocky flapping near the hem at large leg angles (layered cloth geometry weighted to the legs); I reduced the swing to limit it. The run is the weakest clip. I have not studied it close-up on the optimised web avatar.
- **No dedicated turn-in-place animation**: turning while standing is a smooth rotation of the idle pose (running/walking turns are natural).
- **No auto-follow camera** (the camera stays where you drag it).
- The placeholder cards, the missing campus map and the remaining campus areas belong to Phases 5–6.
- Untested: Firefox/Safari, real touch devices, gamepads, screen readers.

## Decisions for you
1. Approve Phase 4, or tell me what to change (speeds, camera distance, animation feel).
2. Try it yourself: `http://localhost:5173/nedverse.html?play=1` while the dev server runs.
3. Then Phase 5: build the remaining campus areas (Library, Auditorium, Central Garden, Student Common Area, Academic Block interior-free) and the mini-map/navigation. Extra photos of those places would help.
