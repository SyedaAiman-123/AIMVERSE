# NEDVERSE - Phase 8: Testing, optimisation, accessibility, settings

Date: 2026-11-22. Local only. Screenshots and raw numbers: `documentation/nedverse/phase8/`.

## Performance (measured by the renderer, headless browser; the fps there is software GL and meaningless)
| View | Triangles before | after | Draw calls before | after |
|---|---|---|---|---|
| Gate approach (Full tier) | 2.09 M | **0.45 M** | 632 | 601 |
| Plaza | 2.09 M | **0.52 M** | 645 | 648 |
| Avenue | 1.68 M | **0.37 M** | 470 | 477 |
| Garden | 2.08 M | **0.58 M** | 530 | 529 |
| CS lab / Library / Hall | 0.90 M | **0.03 M** | 380 / 361 / 346 | 129 / 68 / 53 |
Light tier is lower still (e.g. gate 0.39 M, avenue 0.31 M).
What changed: tree canopies were 19,000 triangles each, now ~4,000 (9 blobs on the Light tier); trees are drawn in 50 m cells so cells off-screen are skipped; shrubs are 6x lighter; the sun's shadow box now follows the player (±46 m, ±40 on Light) instead of covering the whole campus; shadows are switched off inside rooms (the campus is not drawn there at all). Rooms and the quest chunk are lazy-loaded; the campus page ships as a 97 KB (32 KB gzip) chunk beside the shared three.js chunk. The assets: avatar 670 KB, locomotion 75 KB, car 366 KB, logo 28 KB.
**Not measured: real frame rate on a real GPU or phone.** Draw calls are still ~450-650 on the campus (many separate building meshes); merging them is the next step if your device needs it. The new **FPS counter** (pause menu > Settings) shows fps, draw calls and triangles live so you can send me real numbers.

## New settings (pause menu, saved in the browser)
Graphics (Auto / Light / Full; Auto still drops to Light by itself if the frame rate stays under 24 fps), Time of day (Day / **Evening**: warm low sun, purple fill, glowing street lamps), Volume slider, Reduced motion (follows the system setting or forced On/Off), FPS counter.

## Accessibility
- **Reduced motion** (system or manual): the intro uses a still establishing shot and static title cards, no drifting dust, speed lines, confetti, field-of-view kick, tree sway or slide animations.
- **Keyboard:** the whole experience works from the keyboard (WASD/arrows, Shift, E, J, M, Esc, Enter to skip the intro, Tab inside dialogs). Dialogs now **trap Tab focus** (tested: 20 Tab presses never left the pause dialog) and have visible focus outlines. Dialogs, toasts and the mini-map have ARIA roles/labels.
- **Phone layout:** the HUD was re-laid-out for narrow screens (compact brand tag, smaller objective panel, buttons above the joystick, toasts lower) and HUD items hide when a dialog is open so they never cover it. Looked at in a 390x844 touch emulation: campus, room, journal and pause.
- Not done: screen-reader narration of the 3D world, gamepad support, colour-blind alternatives for the coloured rings (labels are always shown).

## Tests (all real input, headless Edge; software rendering)
Driving 20/20, on-foot 20/20, arrival 13/13, campus 6/6, rooms 15/15, quests 11/11, **settings 9/9 (new)**; production build passes.
Bugs found and fixed during this phase: (1) exhibit prompts sat on the floor ring in front of each desk, so walking up to a desk could pass the trigger and lose the prompt; the trigger is now the exhibit itself; (2) the exit door prompt required facing the door, so backing into it never showed; (3) Tab focus could leave an open dialog.

## Browsers
Tested: Microsoft Edge (Chromium). Chrome is installed on this machine but is the same engine. **Firefox and Safari are not installed here and are untested**; they should be checked on your devices before launch (WebGL2, audio unlock, video playback and localStorage are the usual differences).

## Known limits
Real-device performance unmeasured; draw calls still high; no gamepad; sound/music mix untested by ear; the campus guide character was not built; promo video and PDF report still show the old Quest World.

## Decisions for you
1. Approve Phase 8, or tell me what to change.
2. Then Phase 9 (deployment): production build, push to GitHub, deploy to Vercel, live check. I will ask you before pushing and deploying. Please also tell me the FPS numbers from your own device (pause > FPS counter) if you can.
