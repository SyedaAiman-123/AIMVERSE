# NEDVERSE - Phase 6: Portfolio interactions

Date: 2026-11-22. Dev preview only: `http://localhost:5173/nedverse.html?play=1` (QA shortcuts: `&intro=0&place=cs|lib|hall`). Screenshots: `documentation/nedverse/phase6/`.

## What was built
- **Walk-in rooms** (lazy-loaded, only mounted while you are inside; placed 900 m away so the campus is not drawn): doors on the CS building, the Library and the Auditorium. At the door, E fades the screen and moves her inside; the room's back door ("EXIT", E) returns her to the porch. Rooms have their own walls, colliders, lights and world bounds.
- **CS & IT Lab - 15 workstations**, one per project in the portfolio, colour-coded by area. Each monitor shows the project name, area, year and team. E opens a panel from `data.ts`: poster or demo video, tech chips, description, contribution (where supplied), solo/team, context, highlight, features, how it was built, what was learned, media list and the verified link (e.g. Orb Rush "Play live").
- **Library - 6 skill shelves**, one per real skill category (no "CS Fundamentals"). The panel lists each skill and the projects whose own descriptions mention it.
- **Auditorium & Exhibition Hall - 7 panels** of verified CV facts (education, matriculation, speech competition, project count, CEGA training, KDA internship, engines). Nothing is added beyond what you supplied; the internship panel states that duties and dates were not provided.
- **Welcome kiosk** now opens a real campus map panel (zones A-G, what each holds, the tour stops).
- Floor rings mark each exhibit and dim once opened; the panel remembers viewed items in the browser (`aimverse:nedverse:viewed`) for Phase 7. The objective panel shows "INSIDE - CS LAB - n/15 viewed". Closing a panel returns to exactly the same spot.

## Verification (real keyboard events, headless Edge, software rendering)
- Rooms test **15/15**: door prompt, entering, room objective, mini-map hidden indoors, workstation prompt, real project panel (chips, hero image/video, 1,200+ characters), closing returns to the same spot, viewed counter, desks/walls block her, exit prompt and return to the porch, library skill panel, hall fact panel, no page errors.
- Regression: driving 20/20, on-foot 20/20, arrival 13/13, campus 6/6.
- During development the test exposed flakiness caused by the test itself (starting inside a collider, pressing E while still coasting out of range); these were fixed in the test, not by weakening a check.

## Honest limits
- **Campus guide (optional in the brief) is not built.** The kiosk map covers navigation.
- Rooms are simple stylised spaces, not scans of real NED rooms; the lab, library and hall interiors are design approximations (as noted in Phase 2). Wall textures look slightly dirty in the lit rooms.
- Project videos load on demand from `/media/*.mp4` (already in the site); I did not play them end-to-end in the automated test.
- Real-GPU performance is unmeasured; the rooms are small (a few hundred draw calls at most).

## Decisions for you
1. Approve Phase 6, or request changes (room look, panel layout, anything).
2. Then Phase 7: exploration quests, XP/levels/badges saved in the browser (with reset), the "QUEST MODE - LEVEL 3 - CAMPUS EXPLORER" entry in the real site, and replacing the old Quest World with NEDVERSE.
