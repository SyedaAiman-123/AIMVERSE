# NEDVERSE — Phase 4b: Campus tour by car

Date: 2026-11-21. Dev preview: http://localhost:5173/nedverse.html?play=1

## What was added
- **Car (GLB).** An original stylised hatchback authored in Blender (`blender/make_car.py` -> `frontend/public/models/car.glb`, 122 KB). It is not a downloaded asset, so there are no licensing questions. The four wheels are separate nodes, so they spin and the front pair steers. A real downloaded GLB can be swapped in later if you prefer.
- **Approach and enter.** Your avatar spawns on foot, facing the parked car. Walk up and a "PRESS E TO GET IN THE CAR" prompt appears. Pressing E sends her to the driver's door by herself. She turns to the car and steps in, and the camera swings behind the car.
- **Driving.** W/S throttle and reverse (about 11 m/s, roughly 8x walking speed). A/D steer, Shift boosts (15 m/s), Space brakes. The car leans in corners, the field of view widens with speed, and a chase camera auto-follows (drag to look around freely). The car collides with buildings, walls, trees and signs and stops dead on a head-on hit.
- **Get out.** When slow, "PRESS E TO GET OUT" appears and she steps out beside the car.
- **Campus tour: 8 roadside portfolio stops** (lit signboard, glowing ring and a tall light beam, all visible from the road; no hidden items). Order: About and Education, Game Development, Cyber and 3D Web, VR and Immersive, AI and Computer Vision, Motion and Animation, Skills and Tools, Contact and CV. Each card is built from `data.ts` (the same genuine CV and project facts as the main portfolio), including verified project links. Closing a card returns you to exactly where you were. An objective panel shows progress (n/8), the next stop, its distance and a compass arrow. Visited stops dim and show a tick, and progress is saved in localStorage. There is no timer and nothing is missable.

## Verification (real keyboard events, headless Edge, software rendering)
- Driving: 19/19 checks pass. One test run had shown a failure, which turned out to be the test steering the car into a stop board. The same check, re-run in open space, passes.
- On-foot (Phase 4): still 20/20.
- Checks cover the prompt, entering, acceleration, 11 m/s top speed, steering, braking, a Academic Block wall collision (car stopped at z=-23.45, as predicted), stop prompt, card content and links, car position unchanged after closing a card, tour counter, and exiting.

## Limits (honest)
- Real-GPU smoothness and phone performance have not been measured (software rendering only).
- She is hidden inside the car (no seated pose is authored), so you see the car, not her driving.
- The car has no engine sound yet. Touch has no steering wheel UI: the left joystick steers and accelerates.
- The stops use placeholder boards, not final campus buildings, until Phase 5.
- Phase 4 and 4b are committed locally and not pushed.
