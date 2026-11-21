# NEDVERSE — Phase 4b: Campus tour by car

Date: 2026-11-21. Dev preview: http://localhost:5173/nedverse.html?play=1

## What was added
- **Car (GLB).** Your supplied `corolla.glb` (red sedan variant; the zip also holds a wagon that is not used) in `frontend/public/models/corolla.glb` (366 KB). My first Blender-made car was removed at your request. The four wheels are separate nodes, so they spin and the front pair steers. The zip has no licence file: please confirm you may use it in the public site.
- **Approach and enter.** Your avatar spawns on foot, facing the parked car. Walk up and a "PRESS E TO GET IN THE CAR" prompt appears. Pressing E switches to a first-person view: she walks up to the driver's door, the screen dips to black as she gets in, then control passes to you with a third-person chase camera.
- **Driving.** W/S throttle and reverse (up to 18 m/s = 65 km/h, 25 m/s with boost). A/D steer, Shift boosts (15 m/s), Space brakes. The car leans in corners, the field of view widens with speed, and a chase camera auto-follows (drag to look around freely). The car collides with buildings, walls, trees and signs and stops dead on a head-on hit.
- **Get out.** When slow, "PRESS E TO GET OUT" appears and she steps out beside the car.
- **Campus tour: 8 roadside portfolio stops** (lit signboard, glowing ring and a tall light beam, all visible from the road; no hidden items). Order: About and Education, Game Development, Cyber and 3D Web, VR and Immersive, AI and Computer Vision, Motion and Animation, Skills and Tools, Contact and CV. Each card is built from `data.ts` (the same genuine CV and project facts as the main portfolio), including verified project links. Closing a card returns you to exactly where you were. An objective panel shows progress (n/8), the next stop, its distance and a compass arrow. Visited stops dim and show a tick, and progress is saved in localStorage. There is no timer and nothing is missable.

## Speed and smoothness changes (round 2)
- Walking 1.4 -> 2.5 m/s, running 3.4 -> 5.6 m/s, car 11 -> 18 m/s (boost 25). A speed readout (km/h) shows in the tour panel.
- Motion is now extrapolated between physics steps, so it stays smooth on 120/144 Hz screens (before, it could stutter).
- Adaptive quality: if the frame rate stays below 24 fps, the scene switches itself to the light tier (smaller shadows, no bloom).
- Real-GPU smoothness is still unmeasured by me.

## Verification (real keyboard events, headless Edge, software rendering)
- Driving: 20/20 (includes the first-person switch and 18 m/s top speed). On-foot: 20/20 at the new speeds.
- Checks cover the prompt, entering, acceleration, 11 m/s top speed, steering, braking, a Academic Block wall collision (car stopped at z=-23.45, as predicted), stop prompt, card content and links, car position unchanged after closing a card, tour counter, and exiting.

## Limits (honest)
- Real-GPU smoothness and phone performance have not been measured (software rendering only).
- She is not shown seated inside the car (no seated pose is authored).
- The car has no engine sound yet. Touch has no steering wheel UI: the left joystick steers and accelerates.
- The stops use placeholder boards, not final campus buildings, until Phase 5.
- Phase 4 and 4b are committed locally and not pushed.

## Round 3: arrival story, sound, spark
- **Start outside the university.** She stands on University Road beside the parked car. Walk to it, press E, she gets in (first-person), and you drive west through the main gate. **The 8 portfolio stops only appear once you are through the gate** (they pop in one after another with a welcome message). Before that the objective panel says "ARRIVAL - drive through the main gate" and a guide arrow points at the gate.
- **Sound (all synthesised in the browser, no audio files):** engine hum that rises with speed, wind, footsteps, car door and ignition, horn (H), impact thud, chime on opening a stop, unlock jingle on entering, UI click, distant birds on campus. **M** or the speaker button mutes, and the choice is remembered.
- **Visual spark (inspired by the Bruno Simon-style vehicle exploration in your references):** a floating guide arrow above the car or avatar that always points at the next objective; a different glowing 3D icon above each stop; stops pop in with a little overshoot; light beams and rings; drifting sunlit dust; speed lines at high speed; confetti when a stop opens; an intro title card.
- **Tests:** new arrival test 10/10 (starts outside, no stops yet, walks to car, drives through the gate without hitting the piers, stops unlock, toast shown), driving 20/20, on-foot 20/20.
- **Not verified:** I cannot hear the sound in this environment, so the mix and volume levels are untested by ear. Real-GPU performance is still unmeasured.
