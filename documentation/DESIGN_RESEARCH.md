# AIMANVERSE — Design Research & Proposed Art Direction

**Status: awaiting your approval. Nothing has been built beyond a static mood board (`documentation/moodboard.html`).**

## 0. What I could and could not inspect (honesty note)

- I opened bruno-simon.com in the built-in browser. It stayed blank (the WebGL scene did not render there), so **I did not experience its live interaction**. I did not try the other live sites, since the same limit would apply.
- Everything below comes from search results, showcase and case-study text, **not from playing the sites**. Where a search found nothing, I say so.
- Please open the live sites yourself where you can; I will not claim more than the sources support.

| Reference | Evidence I actually have |
|---|---|
| Bruno Simon | His own [case study](https://medium.com/@bruno_simon/bruno-simon-portfolio-case-study-960402cc259b?rel=muzli), a [Creative Bloq write-up](https://www.creativebloq.com/news/3d-car-portfolio) and a [dev.to article](https://dev.to/jaagrav/drive-a-tesla-cybertruck-or-literally-any-car-on-your-browser-with-threejs-4ila). Site itself did not render. |
| Hot Dogtor | A [Three.js forum post](https://discourse.threejs.org/t/hot-dogtor-portfolio-website/91899) only: WebGPU rendering, Draco-compressed models, a scroll/POV mode, and the author admits triangle counts are too high. Nothing found confirming rooms or awards. |
| Joseph Santamaria | [GSAP showcase](https://gsap.com/showcase/) and his [Codrops article](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/): Three.js + GSAP (ScrollTrigger, Observer, SplitText) + shaders + Blender, scroll-driven snap sections. Site not opened. |
| paodao.fr (Jérôme Reynet) | **Nothing found.** No source mentions this domain. I cannot describe it. Please send a link or screenshots if it matters. |
| Cyera AI Guardian (Active Theory) | **No Active Theory case study found**; only Cyera product pages. I cannot describe the visuals. |
| Lusion | [Codrops interview](https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/) and [Awwwards case study](https://awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html). Philosophy: every project gets its own system and flavour. Site not opened. |
| mesh3d.gallery, threejsresources, awwwards 3D, three.js examples | Not yet reviewed. I will use official three.js examples as technical references during Phase 1 implementation. |

## 1. Per-reference analysis

### Bruno Simon (playable world)
- **Impressive:** the portfolio *is* a game; physics-driven vehicle makes exploration itself the delight. Per his case study, simple primitive shapes drive physics while detailed models are only visual (Cannon.js).
- **Patterns to study:** exploration with immediate feedback, physical objects reacting to you, zones that reveal content.
- **Adapt:** a light "free-look" exploration rather than a vehicle: smooth camera glide between islands, objects that react to cursor/touch.
- **Do not copy:** the car, his world layout, branding, or any assets. A full physics vehicle is also too heavy for mobile and for our schedule.

### Hot Dogtor (building / rooms)
- **Takeaway (limited evidence):** WebGPU option, compressed models, and a simplified scroll mode alongside the 3D view.
- **Adapt:** a mandatory simplified mode and an honest quality setting; the forum author's own warning on triangle counts supports our budget discipline.
- **Do not copy:** the building concept or room layout.

### Joseph Santamaria (cinematic scroll)
- **Impressive (per sources):** camera choreography tied to scroll, spatial typography, snap sections.
- **Adapt:** GSAP-driven camera paths between destinations; large type that sits *in* the scene.
- **Do not copy:** his scroll structure or scene design.

### Lusion (material quality)
- **Takeaway:** each project has its own visual system; premium feel from lighting, reflections and motion polish rather than quantity of effects.
- **Adapt:** a restrained material palette (glass, matte, emissive accents) with one consistent lighting rig.

### paodao.fr, Cyera/Active Theory
No usable evidence, so no ideas are taken from them. Cyber-themed visuals come from your own CYBERVERSE project instead.

## 2. Recommended art direction: "The Archipelago"

One dark, calm space (deep ink-navy, soft teal, warm amber accent) containing a **floating gateway** and **five islands**. Shared type, materials, lighting and panel design hold it together; each island has its own motif and accent tint.

| Destination | Motif | Accent | Content |
|---|---|---|---|
| A. Gateway | Floating arch, avatar, big name type | warm amber | Intro, Enter, Download CV, Quest |
| B. Game Dev | Miniature dioramas on pedestals ("pods") | coral | Orb Rush, Dungeon Chase, Dungeon 2D Crawler, MASK GAME, Scratch Maze, Shadows of the Slums (concept) |
| C. Cybersecurity | Node lattice with animated data pulses | cyan | CYBERVERSE, CyberNex Simulator |
| D. Immersive/VR | Spatial grid and floating frames | violet | VR Escape, Alice VR Tea Party, VR-UAV SIM |
| E. AI & CV Lab | Node graph, hand-landmark motif | green | Virtual Teaching Board, Tic-Tac-Toe Minimax (AI), Islamic Evaluator (desktop app) |
| F. Motion Studio | Floating video screens, kinetic type | rose | Creative Motion Design videos, Between Waking (pre-production) |

Skill constellation, timeline, quest dashboard and Ask Aiman AI sit as overlay panels reachable from any island, so they do not need heavy extra scenes.
Placeholder: where I would not be sure which island a project fits (e.g. Islamic Evaluator is a Python/MySQL desktop app, not AI), I will place it per your CV category and you can move it.

## 3. Technical approach per effect

| Effect | Implementation | R3F | GSAP | Custom shader | Reuse GLB | Perf cost | Mobile | Accessible alternative |
|---|---|---|---|---|---|---|---|---|
| Camera glide between islands | Camera path tween | yes | yes | no | no | low | yes | Instant jump, or 2D section nav |
| Gateway arch + particles | Instanced points, simple geometry | yes | optional | small (point glow) | no | low–med | fewer particles | Static image |
| Avatar idle/wave | GLB + AnimationMixer | yes | no | no | **yes (your GLB, slimmed)** | med (reduced mesh) | lighter LOD | Static poster |
| Project pods | Low-poly procedural models + emissive | yes | yes | no | no | low | yes | Card grid |
| Cyber data flow | Lines + moving instanced dots | yes | no | optional | no | low | yes | Static diagram |
| Skill constellation | Force-layout nodes (2D positions → 3D) | yes | yes | no | no | low | 2D graph on mobile | List by category |
| Video screens | VideoTexture only for the focused screen | yes | no | no | no | med | poster only on mobile | Normal `<video>` in panel |
| Parallax/spatial type | Drei `Text` or HTML overlay | yes | yes | no | no | low | yes | Plain headings |

Rules: one scene, lazy-loaded islands, max one video decoding at a time, `prefers-reduced-motion` disables camera sweeps and particles, quality tiers (High/Medium/Low) auto-picked by device, WebGL2 target (WebGPU deferred), full 2D portfolio as fallback and as a first-class "Classic view" toggle.

## 4. Project pods (interaction)
Select → camera eases to pod → panel slides in with verified facts, real video (compressed) and a frame still. Keyboard: Tab through pods, Enter opens, Esc closes. Fields not yet provided (year, team, contribution, links) display "To be added" instead of invented data.

## 5. Features deliberately not used
No vehicle, no Easter eggs/hidden items/secret areas, no public leaderboard, no autoplay audio, no long loading screens, no copying of any reference's layout, assets or code.

## 6. Design system (draft, shown in the mood board)
- Colours: ink `#0B1020`, surface `#121A33`, text `#E8ECF8`, muted `#9AA6C7`, amber `#F5B461`, teal `#4FD1C5`; island accents as above. Contrast checked at AA for text on ink.
- Type: display "Space Grotesk"; body "Inter" (both open-source, loaded from Google Fonts with fallbacks; self-hosting in production).
- Panels: soft glass surface, 1 px low-opacity border, no neon outlines.

## 7. Next steps if approved
Phase 1 proper: scaffold Vite + React + R3F, build the Gateway scene with the slimmed avatar, floating nav, island teasers, Classic-view toggle, and responsive/reduced-motion behavior, then stop again for review.
