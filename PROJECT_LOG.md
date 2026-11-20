# PROJECT_LOG — AIMANVERSE

## 2026-11-20 — Phase 0 (audit only, no code)
- Extracted `PORTFOLIORESOURCES.zip` and `my avatar deliverables.zip` into `source-materials/`; copied the updated CV there. Originals in Documents/Downloads untouched.
- Read CV (2 pages). No LinkedIn/GitHub link in the PDF; no experience section.
- Parsed MP4 headers (durations/resolutions); grabbed one frame each from portal, sos, VirtualBoardARVR, MenuCard, fypvruavsimapp via headless Blender (scratch only).
- Inspected GLB (Python JSON-chunk parse) and .blend (headless Blender 4.5.3, read-only).
- Checked tools: Node 24, Git, Python 3.10, Blender 4.5.3, gh (signed in), no Vercel CLI, no ffmpeg.
- **After Effects 2026 folder is empty (no AfterFX.exe/aerender.exe); not registered as installed.**
- Output: `PHASE0_REPORT.md`.
- Open: Phase 0 approval, questions Q1–Q10 in the report.

## 2026-11-20 — Phase 0 follow-up (user answers)
- Answers: AE installed (work directly); contact email s.aimanmunawarali@gmail.com; sos.mp4 = Shadows of the Slums; Gemini free tier; compress videos + host on Vercel; ffmpeg install allowed. Project years/team/contribution/links: user will supply; nothing to be assumed.
- Installed ffmpeg (Gyan.FFmpeg via winget, ok'd by user). New shells needed for PATH.
- After Effects found at `C:\Users\saima\After Effects\Adobe After Effects 2021\Support Files\` (AfterFX.exe + aerender.exe, v18.0.1 = AE 2021). Unregistered copy (the 2026 folder in Program Files is empty). Not launched yet; to be tested in Phase 6.
- Desktop-interaction tools (computer use) not verified yet. JSX via `AfterFX.exe -r` / aerender CLI are fallback automation paths.

## 2026-11-20 — Phase 0 approved; Phase 1 research step
- User approved Phase 0.
- bruno-simon.com opened in built-in browser: blank (WebGL not rendering there); live interactions NOT inspected. Used web searches for Bruno Simon, Hot Dogtor, Santamaria, Lusion. Nothing found for paodao.fr or an Active Theory/Cyera case study.
- Wrote documentation/DESIGN_RESEARCH.md and documentation/moodboard.html. Stopped for art-direction approval per creative brief.

## 2026-11-20 — Phase 1 prototype
- User approved "The Archipelago" direction.
- Scaffolded `frontend/` (Vite 8, React, TS, three, @react-three/fiber, drei, gsap). Copied CV to `frontend/public/documents/Syeda_Aiman_Munawar_CV.pdf`; `.blend` to `blender/`; original GLB to `assets/avatar-original/`.
- Avatar web copy `frontend/public/models/aiman-web.glb` via gltf-transform (resize 1024, webp, simplify 0.15, meshopt): 12.5 MB -> 0.69 MB, 210,779 -> 31,615 tris; skin weights + 3 animations preserved.
- Built Gateway scene (arch, avatar w/ idle + click-to-wave, 5 island motifs, particles), camera glide per island, destination panel, Classic view (?classic or button), CV download link, vercel.json PDF header, reduced-motion + low-quality mode, WebGL fallback to classic.
- Tests (local only): `npm run build` passes; dev server renders in built-in browser (~680px wide viewport), no console errors; Enter, island chip selection, panel, classic view (16 project cards, no horizontal scroll) work; CV URL returns 200 application/pdf, 32,427 bytes, starts with %PDF.
- NOT tested: wide desktop layout, real touch devices, wave animation visually, production/Vercel headers, keyboard-only pass, Safari/Firefox.
- Added `.gitignore`. No git repo initialised yet (awaiting GitHub details).

## 2026-11-20 — Phase 1 redesign (user: "too simple, no cool effects, fonts/theme look AI-generated")
- Replaced Inter/Space Grotesk + navy/amber glass-pill UI with: self-hosted Bricolage Grotesque 800/400 + JetBrains Mono (public/fonts), ink/bone/vermilion palette, per-destination accent colours, hard-edged editorial layout (outline numerals, ruled project rows, ticker, ID rail), preloader counter.
- 3D rebuilt as one scroll-driven flight (Lenis -> CatmullRom camera path, dwell at each stop, FOV kick on velocity): custom sky shader with stars, accent-tinted grid shader, post-processing (bloom, film grain, vignette, velocity chromatic aberration; high quality only), Lightformer environment.
- Bespoke destinations, mounted only when within 1 section: Game (animated voxel diorama + glowing pods), Cyber (graph with shader data pulses), VR (ring tunnel + frames with real frames), AI (hand-landmark constellation + scan ring + real frame), Motion (live video screens + kinetic type ring). Gateway: avatar on holo-ring plinth, outline 3D title.
- Media: scripts/compress-media.ps1 -> frontend/public/media (15 MP4 + 15 JPG, 24.6 MB total from ~640 MB). Case sheet (native <dialog>) plays real videos; missing media says so.
- Tests (local): build passes; no console errors; desktop-width (~1024px) gateway, Cyber, Motion sections and case sheet video playback checked; 375px phone layout checked for Game section, no horizontal overflow.
- NOT tested: real GPUs/phones, low-end performance/FPS, keyboard pass, reduced-motion, other browsers, all 15 videos' visual quality, production.

## 2026-11-20 — Phase 1 round 3 (more cinematic, sound, richer project display, project details)
- Merged "DESCRIPTION OF ALL PROJECTS CREATED.txt" into frontend/src/data.ts (years, team/individual, context, features, what-I-built, stack, learned). Unstated facts stay "to be added".
- Conflicts/gaps to confirm with user: MASK GAME year (list says 2026, text says CEGA Game Jam 2025); team status for Shadows of the Slums, Islamic Evaluator (not stated); year for CyberNex, agency recreation, Badshahi animation; txt names it "Virtual Board" vs CV "Virtual Teaching Board" (site uses Virtual Board); "Between Waking" and "Tic-Tac-Toe" have no new details.
- Islamic Evaluator: user asked for generated images -> scripts/make_islamic_art.py writes 3 original SVGs (frontend/public/media/islamic-*.svg), labelled everywhere as illustrative, not screenshots.
- Sound: frontend/src/audio.ts, procedural WebAudio (drone per section, shimmer notes, scroll-speed whoosh, UI blips). No audio files, nothing to license. Starts only after "Enter with sound"; header toggle.
- Entry: avatar close-up with auto greeting wave + welcome copy; Enter pulls camera back (gsap on intro.t); scroll locked until entered; head tracks cursor (bones head/neck).
- Interactions: cursor light + dust that repels + floor glow; click shockwave on the floor; Game voxels rise under cursor; Cyber click = EMP burst; VR press-and-hold surges the ring tunnel; AI hand follows cursor + air-writing trail; Motion type ring speeds with scroll.
- Project pods are clickable 3D objects with spatial labels in every destination; rows keep hover thumbnail preview. New full-screen case file: video/illustration backdrop, chapters (Brief/Features/What I built/Stack/Learned), tilt cards, watch-with-sound mode, prev/next across all 16, keyboard arrows + 1-5.
- Tests (local): tsc + build pass; no console errors; verified entry close-up and pull-back, sound toggle state, Game destination, pod click -> Dungeon Chase case file, Features chapter, Islamic Evaluator illustrations.
- NOT verified: audio by ear, head-tracking pose direction/neck twist visually, interactions in Cyber/VR/AI/Motion visually, FPS, phones, keyboard-only pass, reduced-motion, other browsers.

## 2026-11-20 — Corrections + Between Waking resources
- User answers: MASK GAME = CEGA Game Jam 2026; Shadows of the Slums and Islamic Evaluator = separate projects, both team; CyberNex = 2024; agency recreation + Badshahi animation = 2026; remove Tic-Tac-Toe from the site; "Virtual Board" naming is fine.
- data.ts updated accordingly (15 projects). AI island 3D pods adjusted (Tic-Tac-Toe cube removed). Creative Motion Design: year 2026, team set to "Individual" (inferred from "I created/recreated" wording — to confirm).
- Between Waking resources (zip extracted to source-materials/between-waking): 24-slide pre-production deck by "Team ATE", animatics (848x480, 99.6 s, has audio), mood-board poster. Compressed animatics -> frontend/public/media/bw-animatics.mp4 (2.6 MB), poster -> bw-poster.jpg, deck pages -> public/media/bw/p01..p24.jpg (1.7 MB) rendered with Node pdf-to-img (PyPI blocked by SSL cert error; did not bypass).
- Case file gained a page browser (thumbnail strip) for the deck. Between Waking has no year or individual contribution in the sources -> shown as "to be added". Content limited to what the deck states; no plot beyond it.
- Note: the supplied CV PDF still lists Tic-Tac-Toe and "Virtual Teaching Board"; website CV download serves that PDF unchanged — user to decide on revised CV.
- Tested locally: build passes, no console errors, 15 cards (none Tic-Tac-Toe), Between Waking case file with 3 media tabs and deck browser (page 7 shown).

- Between Waking role confirmed by user: helped with the animatics and drew the concept art of Aaron cooking in the kitchen scene. Added optional `role` field + "My role" chip. Year still not provided.
- Between Waking: year 2026, CEGA Pre-Production course final deliverable (user-confirmed).

## 2026-11-20 — Music + entry rework (user: music should be lively ad-style; entry more creative; no silent option)
- audio.ts rewritten: procedural ~116 BPM launch-ad track (I–V–vi–IV, four-on-the-floor kick with sidechain pump, clap, hats, bass groove, off-beat chord stabs, arpeggio, pad); per-destination key lift and layers; riser + drop FX; music ducks while a case file is open. Still no audio files (nothing to license).
- Entry: "Enter without sound" removed. New hold-to-enter: kinetic title letters, cycling "I build games / VR worlds / 3D web experiences / motion", ring button; holding charges (riser audio, camera pushes in with tremor + FOV squeeze, chromatic aberration, chest glow); at full charge -> beat drop (boom + crash, music starts on the one), flash, floor shockwave, curved camera pull-out, hero title slam. Keyboard Enter/Space and screen-reader click auto-run the charge; reduced motion shortens it.
- Sound toggle (mute/unmute) shown after entry only.
- Tested: tsc/build pass, entry renders, keyboard-triggered charge -> drop -> hub works, no console errors over several seconds of the music scheduler running.
- NOT verified: how the music actually sounds (I can't hear it), mouse/touch press-and-hold on a real device, mobile layout of the new entry, volume balance vs UI blips.

## 2026-11-20 — Phase 1 approved ("perfect"); Phase 2 core sections
- New sections (10 total): 0 Gateway, 1 About / Meet Aiman, 2–6 destinations, 7 Skill Constellation, 8 Journey, 9 Contact. Camera path, sky/accents, music levels and nav rail extended.
- About: CV profile text, Karachi / NED / 2023–Present, project count (derived), buttons that play the avatar's real animations (Greeting Wave, Head Movement) + CV download.
- Skill Constellation: 6 CV categories (hub + category stars + skill stars, no proficiency %). Hover/click highlights and dims the rest; panel lists projects whose own text/stack mentions the skill (projectsFor in data.ts); category chips as keyboard-accessible alternative.
- Journey: year monoliths 2023–2026 with one clickable cube per project (counts derived from data: 0/2/3/10), education, CEGA training, achievement; DOM list of projects by year as accessible alternative.
- Tested locally: tsc/build pass; no console errors; About, wave animation visibly changes pose; constellation category + Three.js selection -> Orb Rush & CYBERVERSE; Journey layout after decluttering.
- Not done/unknown: no Experience section (CV has none — asked user); mobile layout of new sections untested; contact form (Phase 5), RAG (Phase 4), gamification (Phase 3) not started; no git repo / deployment yet.
- Added experience: Intern, KDA — IT Department, 1 month (owner-supplied). KDA not expanded; dates/duties not provided.

## 2026-11-20 — Creative upgrade of Meet Aiman / Skill Constellation / Journey (user: too simple)
- Meet Aiman: 7 fact orbs (from CV/owner text: NED, 98.3%, speech win, 15 projects, CEGA, KDA internship, engines) orbit her with sparkles; click an orb (or its chip) -> 3D info card + she turns her head toward it (fx.gaze); labels on hover; note sound per orb; title "decode" effect.
- Skill Constellation: stars fly in and assemble on arrival, drift away from the cursor, per-category nebula dust; selecting a skill sends animated light beams to clickable project tokens (projects whose own text mentions the skill) that open the case file.
- Journey: glowing ribbon with travelling sparks through year platforms; click a year (3D or tab) -> platform lifts, camera glides to it, poster thumbnails (real frames / flagged illustrations) of that year's projects; "Play the journey" auto-steps 2023→2026 with notes. Camera has a slow breathing drift everywhere.
- Tested locally: tsc/build pass; no console errors; verified orbs + KDA card, constellation assemble/nebula + Three.js beams/tokens, Journey year focus (2025) with posters.
- Not verified: avatar head turn visually (too small to judge), Play button run-through, mobile layout of these sections, performance on real GPUs (many labels/Texts), keyboard-only pass.

## 2026-11-20 — Phase 2 approved; Phase 3 gamification (AIMANVERSE QUEST)
- game.ts: stores only a set of real events in localStorage ('aimanverse:quest:v1'); XP, levels, quests, badges, exploration % are all DERIVED (no double rewards possible). Reset clears it. Header XP bar can be hidden (key 'aimanverse:quest:hud'). No accounts, no network, no leaderboard, no hidden items.
- Levels: New Visitor 0, Digital Explorer 100, Tech Adventurer 250, Innovation Seeker 450, AIMANVERSE Master 700 XP.
- 10 quests (First Contact 50, Say Hello 25, Cyber Explorer 100, Game Developer 100, Reality Bender 75, Creative Vision 75, Skill Explorer 75, Know Aiman 50, Time Traveller 75, Full Tour 100) + small first-time discovery XP (stops 10, projects/skill categories/facts/years 5). Max ≈ 725 + discoveries.
- 7 badges: VR Pioneer, Cyber Explorer, Game Architect, Creative Visionary, Constellation Mapper, Time Traveller, Master Explorer (each with a stated condition). "Ask the assistant 3 questions" quest/AI Enthusiast badge deferred to Phase 4 (feature doesn't exist yet).
- UI: header QuestButton (level + XP bar), live-region toasts, dashboard dialog (level, exploration, quests, badges, hide-HUD, two-step reset).
- Bugs found and fixed during testing: (1) the automatic welcome greeting counted as "hello" — now never tracked; (2) Phase 2 left project sections numbered k+1 (duplicate ids s1..s5, project rows opened wrong project) — now k+2, ids s0..s9.
- Verified (earlier session, before the user stopped the preview): ids s0–s9; events stored in localStorage as expected after opening 3 game + 2 cyber projects; re-opening a project adds no duplicate; welcome greeting stores nothing. tsc + production build pass.
- NOT verified: dashboard/toast/HUD visuals, level-up path, persistence across reload, reset button, mobile layout, accessibility pass. User stopped the dev server during testing; not restarted.

## 2026-11-20 — Phase 3 test results (preview restarted at user's request)
- Clean run from empty storage on a 682x805 (phone-sized) viewport: Enter -> LVL 1, 50 XP; 3 game projects -> LVL 2, 165 XP (50 + 15 discovery + 100 quest); 2 cyber projects -> LVL 3, 275 XP + "Cyber Explorer" badge + level-up toast; re-opening a project added nothing.
- Persistence: after reload, localStorage held the same 7 events and the header showed LVL 3 · 275 XP, no toasts replayed.
- Reset: two-step confirm -> storage "[]", dashboard shows New Visitor / 0 XP, 0 quests, 0 badges. "Show XP bar" checkbox -> header shows plain "Quest", pref stored ('off').
- Bugs fixed: dashboard progress bars used class `.bar`, clashing with the site header (pinned to top of screen) -> renamed `.xbar`; Quest/Sound buttons were hidden on phone widths -> shown.
- Still unverified: desktop-width dashboard look, toast visuals in a screenshot, keyboard-only/screen-reader pass, remaining quests end-to-end (Skill Explorer, Know Aiman, Time Traveller, Full Tour, Reality Bender, Creative Vision, Say Hello), real touch devices.

## 2026-11-20 — Overlap / empty black HUD audit and fixes (user report)
- Audit at 1024x768 across Gateway, About, Cyber, Game, AI, Motion, Skills, Journey, Contact. Findings + fixes:
  1. Empty black box = hover-preview (.peek) stranded after scrolling and shown before its image loaded -> now only shows after the image loads, hides on scroll/wheel/blur/leave/dialog open, repositioned and clamped inside the viewport. (Also removed the semi-transparent black backing plane behind the 3D fact card, which could appear empty.)
  2. Side rail overlapped right-aligned text/arrow icons -> reserved a right gutter, labels show on hover only, rail hidden under 900px.
  3. Neighbouring worlds (VR rings, constellation stars, journey) bleeding through behind text -> new Reveal wrapper scales a world in only while travelling toward it.
  4. Header collided/wrapped -> gradient backdrop, no wrap, 'where' label hidden <1180px, secondary buttons hidden <900px; Quest/Sound kept on phones.
  5. Toasts moved to top-centre; hero ticker hidden on short screens; About chips de-duplicated; compact typography rules for short (<780px) and phone (<760px) viewports in layout-fixes.css.
  6. Scene framing shifted away from the text on destination, skills and journey stops; Islamic Evaluator marker moved off the text side.
- Verified visually at 1024x768 (desktop-ish). NOT visually re-verified: real phone/tablet widths after the new rules (preview resize tool unavailable), 1920px wide screens, other browsers. Skills stop is still tight at ~1000px wide (a star label just touches the category buttons).

## 2026-11-21 — Phase 3 approved; Phase 4 RAG chatbot ("Ask Aiman AI")
- Research: Gemini free tier = per-project RPM/RPD limits that vary by model (exact numbers not confirmed); free-tier content may be used to improve Google products and terms advise against submitting personal info -> disclosed in UI + README.
- rag-system/ingest.ts: extract (CV PDF, project-notes txt, Between Waking deck PDF, data.ts) -> clean + redact email/phone -> chunk -> optional Gemini embeddings -> frontend/api/_rag/index.json (112 chunks, ~62 KB lexical). Bug found: sentence splitter dropped text around dots ("Three.js"->"js", "98.3%"->"3%") — fixed and verified.
- frontend/api/_rag/engine.ts + api/chat.ts: validation, rate limit, privacy guard, BM25 + dense hybrid (RRF), idf-weighted coverage confidence gate (refuse without LLM), grounded Gemini prompt with citations, extractive fallback. Bug found: regex \b written as backspace chars by a script -> repaired.
- UI: Chat.tsx dock (suggestions, loading dots, error+retry, sources that open case files/sections, privacy notice), header "Ask Aiman AI" + Contact CTA. Quest "AI Enthusiast" (3 answered questions, 75 XP) + badge added.
- Dev: Vite plugin serves /api/chat; vercel.json bundles index.json; .env.example created. NO API KEY PROVIDED YET -> live Gemini calls and embeddings untested.
- Evaluation (no key; BM25 + gate; tests/rag-eval.ts): dev set 20/22 answerable, 9/9 refused (tuned on); fresh holdout-2 (written after tuning, run once) 6/6 answerable + 4/4 refused. Fake-Gemini server tests 12/12 (request shape, citations, 429/empty fallback, no model call on refusals). Held-out set #1 was reused after fixes so is not clean.
- Browser test: asked 3 questions -> 3 distinct quest events, refusals/blocked/extractive answers render, source chip closes chat and navigates.
- Not verified: real Gemini generation + embeddings (needs key), hybrid thresholds with real vectors (RAG_MIN_COSINE=0.6 is a guess), mobile chat layout, accessibility pass, Vercel deployment of the function.

## 2026-11-21 — Gemini key added; real RAG verified
- User supplied a Gemini API key; stored ONLY in frontend/.env (git-ignored). (Key was pasted in chat, so it should be regenerated before publishing.)
- Re-ingested with real embeddings: 112 chunks, gemini-embedding-001 @ 768 dims, index 684 KB. Embedding request format accepted.
- Found: gemini-2.5-flash(-lite) return 404 "no longer available to new users" -> default model changed to alias `gemini-flash-lite-latest`; generation verified (grounded, cited answers; "I don't have that information" for irrelevant passages; injection + off-topic refused; phone request blocked).
- Found: inside the Claude preview sandbox the dev server's fetch to Google fails ("fetch failed") so the in-app preview shows quote-only fallback; a normal `npm run dev` on the user's machine (and my own shell dev server on :5199) reaches Gemini fine. Failure note text reworded to not blame quota.
- Rate limiter (10/min/IP) confirmed working under rapid testing.
- Not verified: Vercel deployment of the function; Gemini free-tier quota numbers; behaviour under real traffic; full 31-question live evaluation with vectors (only ~12 live questions run, paced).

## 2026-11-21 — Avatar embedded behind Ask Aiman AI
- New ChatAvatar.tsx: second small R3F canvas inside the chat dialog (lazy-loaded; only when WebGL exists; unmounts when chat closes) showing a SkeletonUtils CLONE of the avatar so the main scene's avatar is untouched. Idle by default; plays her head-movement ("thinking") animation while an answer loads; waves when a new answer arrives; head follows the cursor (disabled for reduced motion). Backdrop glow + lights tuned, controls made translucent so she stays visible and text stays readable.
- Verified in the 546px-wide preview: avatar visible behind suggestions and behind a live conversation; no console errors. Not verified: thinking/wave animations by eye, desktop-width framing, performance of two WebGL contexts on low-end devices.

## 2026-11-21 — Phase 4 approved; Phase 5 contact form + email
- Added frontend/api/_lib/validate.ts (shared client+server rules), frontend/api/contact.ts (Resend delivery, honeypot, fill-time check, rate limit 3/10min & 12/day, same-origin, JSON-only, 10 KB cap, HTML-escaping), src/Contact.tsx (+contact.css) docked form with inline errors, loading, success and error states; opened from the Contact stop and the Classic view. Vite dev server serves /api/contact; vercel.json sets maxDuration; .env.example lists RESEND_API_KEY / CONTACT_TO / CONTACT_FROM. Docs: documentation/CONTACT_SYSTEM.md.
- Tests: tests/contact.test.ts 22/22 against a fake Resend server (valid send format incl. Reply-To + Bearer header, per-field errors, header injection, XSS escaping, honeypot, too-fast, bad timestamp, cross-origin, wrong content-type, bad JSON, GET, rate limit, provider 500 -> friendly 502, no key -> 503).
- Browser: empty submit shows 4 inline errors + focuses first field; valid submit without a key shows friendly "not set up yet" error and keeps the text; via a second dev server + fake provider the success screen appeared and the captured payload had To=owner, Reply-To=visitor, escaped HTML.
- NOT done: real email delivery (needs the user's Resend key; no inbox evidence yet), Vercel deployment, mobile/keyboard accessibility pass of the form.

## 2026-11-21 — Real email test
- User added RESEND_API_KEY to frontend/.env (git-ignored). Sent one real test message via POST /api/contact (dev server from my shell): HTTP 200 {"ok":true} = Resend API accepted it. Inbox arrival at s.aimanmunawarali@gmail.com NOT yet confirmed by the user (awaiting confirmation; check spam). Do not claim delivery as verified until then.
- USER CONFIRMED (2026-11-21): the real test email arrived in the s.aimanmunawarali@gmail.com inbox. Real email delivery verified end to end (dev server -> /api/contact -> Resend -> Gmail). Still untested: the same on the deployed Vercel site, and phone/keyboard use of the form.

## 2026-11-21 — Phase 6: After Effects promo video
- Built with ExtendScript driven through the user's installed After Effects 2021 (AfterFX.exe -r), NOT hand-clicked: after-effects/scripts/build_promo.jsx generates AIMANVERSE_Promo.aep (103 project items: 8 scene comps, tile precomps, MAIN comp, imported project clips / site screenshots / Blender avatar renders / original audio; live expressions, markers per bar, build log stored in the MAIN comp comment = "clean").
- Content is genuine: real project footage and screenshots, Blender renders of her avatar, text taken from the site data. Soundtrack is an original synthesized track (scripts/make_music.py, 116 BPM) - no third-party audio.
- Render: aerender (Lossless AVI, 1920x1080, 30 fps, 1490 frames, 13m54s) -> ffmpeg H.264 CRF 18 + AAC 192k = after-effects/AIMANVERSE_Promo.mp4 (26.7 MB). Verified with ffprobe: 49.67 s (within 30-60 s), 1920x1080, h264 + aac; full decode with zero errors; audio mean -20.3 dB / max -3.0 dB (not silent); contact sheet checked by eye across all 8 scenes. The 10 GB lossless intermediate was deleted (reproducible).
- Site: new src/PromoVideo.tsx (<dialog>, requests the file only when opened) + "Watch the promo" button in the 3D Contact section and the Classic view; file at frontend/public/media/AIMANVERSE_Promo.mp4. tsc passes; in the dev preview the dialog opened and the video loaded and played (49.67 s, 1920 px wide, no media error).
- Environment quirks found: this AE install lacks Warp Stabilizer, 3D Camera Tracker, Mocha CC and several stock effects (Grid, Drop Shadow, Fractal Noise, Fill, Tint) and shows modal warnings on every launch that block scripts; run_ae.ps1 now dismisses them. Substitutes used (shape-layer grid, Glow, Noise).
- NOT verified: playback by ear (audio quality/sync judged only from measurements), other browsers/phones, 26.7 MB load time on slow connections, the Vercel-hosted file. The stray empty folder C:\after-effects (from an early Blender run) still needs deleting by the user.

## 2026-11-21 — Phase 6 approved; Phase 7 testing & optimisation (in progress)
- Ran all suites (contact 22/22, mock-gemini 12/12 after fixing a stale test, RAG dev 20/22 + 9/9, holdouts 6/6+6/6 / 6/6+4/4), production build, 375 px responsive checks, DOM accessibility audit, load measurement, API probes. Full detail and "not verified" list: documentation/PHASE7_TEST_REPORT.md.
- Fixes made: /api/chat now rejects cross-origin requests (403); Classic view skip link; promo web encode 25.4 MB -> 9.3 MB (master kept in after-effects/).
- Not done yet in Phase 7: README, PDF report, screenshots, final submission structure; real-device/Firefox/Safari testing; screen-reader pass; 3D frame-rate measurement.

## 2026-11-21 — Phase 7 approved; documentation delivered
- Added README.md (features, stack, local run, env keys, scripts, Vercel steps, repo layout), documentation/project_report.html -> AIMANVERSE_Project_Report.pdf (5 pages, printed with headless Edge; pages checked visually), documentation/screenshots/ (8 site screenshots copied from the earlier real-site captures + promo contact sheet). .gitignore now also excludes AE scratch output (probe/, render/, Logs, avatar test).
- Caveats: screenshots were captured during development and may differ slightly from the final build; the PDF's claims mirror PHASE7_TEST_REPORT.md. Deployment, key regeneration, README deploy steps (untested on Vercel) remain for Phase 8.

## 2026-11-21 — Phase 8: GitHub
- Created PRIVATE repo https://github.com/SyedaAiman-123/AIMVERSE (name as typed by the owner; rename possible) and pushed branch main (single commit; author uses the GitHub noreply email). Pre-push scan: no API keys, .env excluded, no file > 100 MB.
- Not done: Vercel deployment (needs owner's go-ahead and a regenerated GEMINI_API_KEY), live-site verification.

## 2026-11-21 — Phase 8: Vercel deployment verified (live)
- Owner deployed from the GitHub repo (root dir frontend). Live: https://frontend-opal-six-64.vercel.app/
- Verified on the live URL: HTML 200; CV PDF 200 application/pdf with attachment Content-Disposition; promo MP4 200 (9.7 MB) and plays in the page dialog (49.67 s, 1920 px, no media error); avatar GLB and project videos 200; browser console clean; WebGL scene renders.
- Live /api/chat with the real Gemini model: "What is Orb Rush?" and "Where did Aiman intern?" -> mode=rag with sources and no fallback note (model reached); phone-number question -> blocked; "capital of France" -> refused.
- NOT yet verified live: contact-form email from the deployed site (needs the owner's OK to send one real message), that the Gemini key was regenerated, phone/Firefox/Safari, the 3D world performance on the live site.
- Live contact test (owner approved): POST https://frontend-opal-six-64.vercel.app/api/contact (name "AIMANVERSE deploy test", sender deploy-test@example.com) -> HTTP 200 {"ok":true} = Resend accepted it. Inbox arrival NOT yet confirmed by the owner; do not claim live email delivery as verified until then.
