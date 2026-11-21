# NEDVERSE - Phase 7: Quest system and Quest Mode entry

Date: 2026-11-22. Local only (not pushed or deployed). Try: `http://localhost:5173/` (enter, then the header button "QUEST MODE") or directly `http://localhost:5173/nedverse.html`.

## What was built
- **Exploration-only quest system** (`src/nedverse/quests.ts`). 12 quests, all listed in a journal: Arrival (cross the gate), Take the Wheel, Read the Map (kiosk), Campus Explorer (visit zones A-G), Follow the Tour (all 8 stops), Open the Lab, Project Hunter (5 workstations), Full Portfolio (all 15), Library Card, Skills Scholar (6 shelves), Milestone Hall, Know the Story (7 panels). **No timers, enemies, lives, punishment, mini-games, hidden objects or secret areas.** Every objective is visible and described.
- **XP, levels, badges.** XP comes from quests (25-150 each) plus 5 XP per first-time discovery. Levels: 1 New Arrival (0), 2 Wayfinder (100), **3 Campus Explorer (250)**, 4 Milestone Seeker (500), 5 NEDVERSE Master (800). 7 badges (Wayfinder, Campus Explorer, Tour Guide, Project Pro, Skills Scholar, Storyteller, NEDVERSE Master).
- **Saved in the browser only** (`localStorage`, no accounts or network). Progress is derived from a set of events so nothing can be double-counted. Earlier tour/viewed progress is imported once. **Reset** is a two-step button in the journal and the pause menu.
- **In-world UI:** level chip ("LEVEL 3 - CAMPUS EXPLORER", XP bar) under the brand tag, reward toasts (quest complete, badge, level up; none replay after a reload), a quest journal (J or the "Quests" button) with progress bars, badges and levels.
- **Quest Mode entry on the real site.** The header button now reads **QUEST MODE** with your saved level (e.g. "LEVEL 1 - NEW ARRIVAL"), and opens NEDVERSE at `/nedverse.html`, now a production page (code-split: the 3D campus is only downloaded when opened, the rooms only when you walk in). WebGL-less browsers get a plain page with a link back. `vercel.json` also maps `/nedverse`.
- **The old fantasy Quest World and its four station games are removed** (files deleted), along with the old event tracking that fed it. The site's header, portfolio and AIM AI are otherwise unchanged. Dev camera presets moved to `nedverse-dev.html` (not in the build).

## Verification (real input, headless Edge, software rendering; real browser for the site)
- Quest test **11/11**: fresh start at LEVEL 1 with 0 XP; crossing the gate completes Arrival with a +50 XP toast; XP appears on the chip; J opens a journal with 12 quests and 7 badges and says exploration-only; Esc closes it; opening a workstation saves room and project events; reload keeps progress without replaying toasts; 250 XP shows LEVEL 3 - CAMPUS EXPLORER; reset asks for confirmation then erases everything; no page errors.
- Real browser: the main site shows "QUEST MODE - LEVEL 1 - NEW ARRIVAL" linking to `/nedverse.html`.
- Production build succeeds (`vite build`): `dist/nedverse.html` plus separate chunks (campus, interior scene, quests 17 KB).
- Regression: driving 20/20, on-foot 20/20, arrival 13/13, campus 6/6, rooms 15/15.
- Honest note: the automated tests share a slow software-GL browser and were occasionally flaky for timing reasons (a few reruns were needed, and some failures were a wrong port number in my test scripts and a dev server that had stopped, not product bugs). Each reported pass is a real pass on rerun; I did not loosen any check.

## Interpretation to confirm
The brief shows a "QUEST MODE" label and a separate "LEVEL 3 - CAMPUS EXPLORER" label. I made Level 3 the "Campus Explorer" rank (250 XP) and show your current level next to QUEST MODE. If you meant a fixed "LEVEL 3" tag on the entry screen, tell me.

## Not done / limits
- The optional campus guide character; the main-site "AIMVERSE Quest" XP that previously rewarded portfolio browsing no longer exists (replaced entirely by NEDVERSE).
- Real-GPU/phone performance, Firefox/Safari and accessibility passes are Phase 8.
- The promo video and the PDF report still show the old Quest World (optional refresh).

## Addendum (pre-deployment): finale and livelier music
- **Finale.** When every one of the 12 quests is complete (shortly after the last reward toast), a cinematic ending plays once: letterbox bars, the camera slowly orbits the player, three title cards ("You have explored NEDVERSE." with the real counts of projects, skill shelves and milestones, then "2023 -> today", then **MUCH MORE TO COME in the career ahead.**), and a closing screen with **Return to the AIMVERSE portfolio** (link to `/`) and **Keep exploring**. Skippable; Esc = keep exploring; not repeated after a reload; the journal offers "Watch the finale" once everything is done. Reduced motion removes the camera orbit and animations.
- **Music.** The generative score is now ~100 bpm with a pulsing bass, a soft kick and off-beat hats, brighter plucks and a rising "energy" while you drive (it relaxes when you stand still). Still synthesised, still quiet, same mute and volume controls. I cannot hear audio here; the test confirms the engine starts and schedules bars without errors.
- Tests: finale 8/8 (new), quests 11/11, settings 9/9, driving 20/20, on-foot 20/20, arrival 13/13, rooms 15/15; production build OK.
