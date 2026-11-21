# NEDVERSE - Phase 5: Campus expansion, signboards, mini-map

Date: 2026-11-21. Playable in the dev preview (`http://localhost:5173/nedverse.html?play=1`, or add `&intro=0&x=..&z=..` to jump to a spot). Not on the production site yet. Screenshots: `documentation/nedverse/phase5/`.

## Zones now in the world (letters follow the Phase 2 plan)
| Zone | What was built | Position |
|---|---|---|
| A Main Gate & Plaza | (Phases 3-4) | gate x=22, plaza at origin |
| B Academic Block | (Phase 3) + new zone board | (-46, -34) |
| C CS & IT Department | (Phase 3) | (0, -40) |
| **D University Library** | 3-storey block, front porch with sign, faces the avenue | (-48, 42) |
| **E Central Garden** | circular paved courtyard, animated fountain basin, 8 flower beds on the diagonals, 4 benches facing the fountain, 3 concrete-frame monument slabs (from your campus photo), palms, lamps, paths to the plaza and the auditorium | (-30, -4) |
| **F Auditorium & Exhibition Hall** | 2-storey hall with porch and sign, faces the garden | (-62, -6) |
| **G Student Common Area** | paved terrace, shaded pavilion, 5 picnic tables, canteen kiosk, lamps | (-26, 38) |

Also new: **zone signboards** (blue/gold, "ZONE E CENTRAL GARDEN"), an expanded campus signpost (5 destinations), and a **mini-map** (top-left, north up) drawn from the same layout data as the scene and collisions, showing zones A-G, roads, buildings, the tour stops once unlocked, and your position and heading (the car's while driving).

## How it is built
`layout.ts` is still the single source of truth (blocks now support rotation, zones, garden and common-area positions). Collisions are generated from it: the rotated auditorium, porch columns, fountain, monument slabs, kiosk, pavilion posts, tables and zone boards all stop the player and the car. Trees are kept out of every new footprint.

## Verification (real input, headless Edge, software rendering)
- New campus test 6/6: the rotated Auditorium stops the player at its wall (x=-54.32, predicted -54.3), the Library at z=33.32 (predicted 33.3), the fountain at z=-0.32 (predicted -0.32), the library porch is walkable between the columns, the mini-map renders, and there are no page errors.
- Regression: arrival 13/13, driving 20/20, on-foot 20/20.

## Honest limits
- Exterior only: no interiors are modelled. The CS lab, library shelves and exhibition panels are Phase 6 interactions.
- **Stylised, not surveyed.** Positions follow the official map's adjacency and your photos, not exact scale. The exhibition hall is a design approximation of the auditorium foyer (as noted in Phase 2). I have not added real facilities beyond what the official map and NED pages list.
- The library's front faces north and sits in shade in the current sun direction, so it reads darker than other buildings. A lighting tweak can brighten it.
- Real-GPU performance is still unmeasured; low-end tiers exist.
- Still wanted from you: photos of the library front, auditorium front, a garden or common area, and the CS department entrance, to make these zones more faithful.

## Decisions for you
1. Approve Phase 5, or tell me what to change (layout, sizes, looks).
2. Then Phase 6: portfolio interactions inside these places (CS-lab workstations with the real projects, library skill shelves, auditorium achievements, campus guide, kiosk map).
