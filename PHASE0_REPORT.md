# AIMANVERSE — Phase 0 Report (Resource Audit and Planning)

Status: **awaiting your approval. No code has been written.** Originals are untouched; ZIPs were extracted to `source-materials/` and the CV copied there.

## 1. Key findings (read these first)

1. **After Effects is NOT usable.** `C:\Program Files\Adobe\Adobe After Effects 2026\` exists but contains only an empty `Support Files` folder. There is no `AfterFX.exe` or `aerender.exe`, it is not in the installed-programs list, and no process is running. Only Photoshop 2022 and Illustrator 2022 are registered. I cannot create a real `.aep` or render from After Effects until it is (re)installed. I have not operated After Effects and will not claim to.
2. **The "updated CV" contains no LinkedIn URL.** Neither page of `Syeda_Aiman_Munawar_Updated_CV.pdf` has any link to LinkedIn or GitHub. It also has no Experience section and no project dates. The website will use your LinkedIn URL (`.../syeda-aiman-munawar-46108a2ba/`) as instructed, but the downloadable PDF will not show it until you send a revised CV.
3. **The ZIP holds only videos.** There are 15 MP4s and no screenshots, README files, project documents or source code. The chatbot's knowledge base and the project panels will therefore rest on the CV plus short descriptions from you.
4. **Avatar is healthy**: a rigged GLB with 3 animations (see section 3).
5. **Large videos**: 640 MB of raw video cannot be committed to Git or served from Vercel as-is. They need compressing (see section 7).

## 2. Asset inventory: videos matched to CV projects

I checked durations/resolutions from the file headers and looked at a frame of the ambiguous ones.

| File | Length | Resolution | Size | Matched project | Confidence |
|---|---|---|---|---|---|
| orbrushdemo.mp4 | 114 s | 1916×918 | 109 MB | Orb Rush | by name |
| portal.mp4 | 42 s | 1916×932 | 40 MB | CYBERVERSE (frame shows "CYBERVERSE // 01", EMP override) | verified |
| cybernex simulator.mp4 | 170 s | 1914×1024 | 179 MB | CyberNex Simulator | by name |
| fypvruavsimapp.mp4 | 112 s | 560×1280 | 28 MB | VR-UAV SIM (phone portrait) | by name |
| vrescaperoom.mp4 | 99 s | 1354×548 | 35 MB | VR Escape | by name |
| DungeonChaseEndlessRunnerFinalDemo.mp4 | 48 s | 1592×846 | 35 MB | Dungeon Chase | by name |
| dungeonCrawler.mp4 | 25 s | 560×1280 | 2.8 MB | Dungeon 2D Crawler | by name |
| AliceInTheWonderland.mp4 | 58 s | 930×462 | 15 MB | Alice in Wonderland VR Tea Party | by name |
| VirtualBoardARVR.mp4 | 78 s | 1726×952 | 70 MB | Virtual Teaching Board (frame shows hand tracking on canvas) | verified |
| scratch game.mp4 | 37 s | 560×1280 | 2.6 MB | Scratch Maze Game | by name |
| maskGame.mp4 | 23 s | 3816×2160 (4K) | 82 MB | MASK GAME | by name |
| sos.mp4 | 116 s | 472×852 | 15 MB | **Unclear.** Frame shows a person in an orange vest in a graffiti tunnel. Possibly Shadows of the Slums, but the CV calls that a concept only. **Question Q3.** | unverified |
| RecreationVideo.mp4 | 10 s | 1920×1080 | 2 MB | Creative Motion Design (agency video recreation) | by name |
| DocumentaryStyleFinal5second.mp4 | 5 s | 1920×1080 | 0.2 MB | Creative Motion Design (Badshahi Mosque) | by name |
| Adobe After Effects Project(MenuCard).mp4 | 33 s | 280×288 | 2.3 MB | Creative Motion Design (menu card), very low resolution | by name |

**Projects with no media:** Islamic Evaluator and Trainer, Tic-Tac-Toe Minimax, Between Waking. Shadows of the Slums may be covered by sos.mp4 (Q3).
**No screenshots exist anywhere.** I can extract still frames from the videos as genuine thumbnails, which I suggest instead of inventing images.
**Project years, GitHub links and team sizes are not in the CV**, apart from the Orb Rush live link `orb-rush-omega.vercel.app`. The panel requirements (year, contribution, individual or team) need your input (Q4–Q5).

## 3. Avatar audit (`source-materials/avatar/FINAL DELIVERABLES/`)

- `Aiman_Avatar.glb`, 12.5 MB: 1 skinned mesh, **210,779 triangles** (105k vertices), 1 material, 3 JPEG textures of 2048², one armature (**38 bones**), no morph targets (so no facial expressions).
- **3 animations built in:** `Aiman_Idle`, `Aiman_Greeting_Wave`, `Aiman_Head_Movement` (120 frames, 24 fps = 5 s each). These cover Idle, Greeting, and a head movement I can use for Thinking/Listening. Walking or pointing gestures do not exist and I would not invent them.
- `Aiman_Avatar_Rigged.blend`, 29 MB, Blender 4.5.3 LTS format, textures packed, the same 3 actions, plus camera and 4 studio lights.
- **Concern:** 210k triangles is heavy for mobile. Plan: make a web copy with a decimated mesh (~30–50k) and 1024–2048 textures compressed (Meshopt/KTX2), targeting roughly 2–4 MB. Appearance and rig are kept. The original is never modified. Blender 4.5.3 is installed and scriptable, so this is done headlessly on a copy.

## 4. CV facts I will treat as source of truth

Syeda Aiman Munawar, Karachi. Title: "Game Developer | 3D & Interactive Applications | Computer Science". BS Computer Science & IT, NED University, 2023–present. Matriculation 98.3% (position holder). CEGA training in three tracks (Pre-Production, Unreal Production, Post-Production AE & Motion). Achievement: All-Pakistan Speech Competition winner. 16 projects (7 selected plus 9 additional) and the skills table as in the CV. **Missing and so not displayed:** Experience entries, GitHub link, years, certificates, GPA beyond matriculation.
CV contact email is `s.aimanmunawarali@gmail.com` and phone 0334 2239919. I have not decided whether those are shown publicly or used as the contact-form destination (Q2).

## 5. Tooling on this machine

| Tool | Status |
|---|---|
| Node 24.21, npm 11.19, Git 2.51, Python 3.10 | Installed |
| Blender 4.5.3 LTS | Installed; headless works (used for this audit) |
| GitHub CLI | Installed, signed in as `SyedaAiman-123` (scopes: repo, workflow) |
| Vercel CLI | Not installed; will run via `npx vercel` or install after your OK |
| ffmpeg | Not installed; needed for video compression and AE-style transcoding. I will ask before installing. |
| After Effects 2026 | **Broken or absent (see finding 1)** |
| Unity 2022, Unreal | Not needed for the website |
| GPU | NVIDIA RTX 4050 plus AMD 780M, 15 GB RAM: fine for development |

## 6. Technical architecture proposal

**Frontend:** Vite + React + TypeScript, Three.js via React Three Fiber + Drei, GSAP for camera/UI choreography, plain CSS with design tokens (no Tailwind needed). Why: R3F keeps the single connected world declarative and lets me lazy-load destinations; GSAP handles cinematic camera paths. WebGPU is skipped for now; WebGL2 is the target with automatic quality tiers.
**Single connected world, not six scenes:** one persistent scene (a floating "hub" with six destination islands). Each destination's props load on demand and unload when leaving. A conventional 2D portfolio (full content, normal scrolling navigation) is always available and is the automatic fallback for no-WebGL, low-end mobile and reduced-motion users.
**Backend on Vercel Functions** (Node serverless, `/api/*`), not a long-running Express server (which cannot run unchanged on Vercel):
- `/api/contact`: validation (zod), honeypot + timing check + rate limit, email via **Resend** (free tier, simple API; needs a verified sender or uses `onboarding@resend.dev` to your own address only during testing).
- `/api/chat`: RAG endpoint.
**RAG:** documents (CV text, a project-facts JSON I will write from the CV and your answers) are chunked and embedded **offline at build time** into a small JSON vector index shipped with the function. With ~50–150 chunks, in-memory cosine search is exact, instant and free, and avoids a hosted vector DB on serverless. I would still document Chroma/Qdrant as evaluated alternatives and explain the choice. Embeddings and the LLM need an API key: options are Google Gemini (free tier, embeddings + chat) or Anthropic/OpenAI (paid). **Decision needed (Q6).** The answer prompt forces "answer only from context, say you don't know otherwise", returns source citations, and has input-length and rate limits.
**Gamification:** client-side only, `localStorage`, no accounts, reset button, optional panel.
**Media:** videos compressed to 720p H.264 (and posters), hosted as static files if total stays small, otherwise on Vercel Blob or YouTube unlisted (Q7). Vercel's free tier limits file/bandwidth, so I will not ship the raw 640 MB.
**Folder plan:** `frontend/`, `api/` (Vercel functions), `rag-system/` (ingest scripts + index), `public/documents/Syeda_Aiman_Munawar_CV.pdf`, `blender/`, `after-effects/`, `documentation/`, `screenshots/`, `tests/`, `README.md`, `PROJECT_LOG.md`.
**External services to document:** Vercel, GitHub, Resend, one LLM/embedding provider.

## 7. CV integration and Download CV plan

- Copy the approved PDF to `public/documents/Syeda_Aiman_Munawar_CV.pdf`; Vite/Vercel serve it at `/documents/Syeda_Aiman_Munawar_CV.pdf`.
- Button is an `<a href="/documents/Syeda_Aiman_Munawar_CV.pdf" download="Syeda_Aiman_Munawar_CV.pdf">` (a real link, so it works without JavaScript, by keyboard and on mobile). It appears in the header navigation, on the Gateway/home screen, and in About and the Communication Hub, so it is reachable without exploring the 3D world.
- A `vercel.json` header sets `Content-Disposition: attachment` and `application/pdf` for that path as a safety net.
- Replacing the CV later = overwrite that one file. The same PDF is also fed to the RAG ingest script so the chatbot stays consistent.
- I will test the download on the deployed URL (desktop, and tablet/mobile viewport emulation) and open the file before claiming it works. Real-phone testing is something only you can do.
- LinkedIn link `https://www.linkedin.com/in/syeda-aiman-munawar-46108a2ba/` appears in Communication Hub, About and the footer.

## 8. Vercel feasibility

Vercel hosts the static Vite site plus serverless functions, so the whole public site stays on Vercel. Limits that matter: function size (50 MB bundled; the vector index is tiny), execution time (10 s on the free Hobby plan, fine for one embedding + one LLM call if streaming or a fast model is used), no persistent disk (so no runtime DB writes, which my design avoids), and static file size guidance (so videos are compressed). No separate backend is needed, so there is nothing extra to approve beyond Q6–Q7.

## 9. Design proposal (summary; the full research document and moodboard are the start of Phase 1, as your creative brief asks)

I was not able to view the live reference sites in this phase, so **I am not claiming to have studied their interactions**; the research doc will mark which references I could actually open and use official write-ups/screenshots for the rest.
Direction: **"The Archipelago"**: one dark, calm, premium space (deep indigo to teal, warm accent), a floating gateway structure that opens into six islands, each with its own palette and motif but one shared type, material and panel system:
Gateway (architectural arch + avatar), Game Dev (miniature diorama pods), Cyber (network lattice, data flows; from your real CYBERVERSE look), Immersive/VR (spatial grid/headset-frame), AI & CV Lab (node graph; hand-tracking motif), Motion Studio (kinetic typography, video screens). Project "pods" open via a smooth camera move and a detail panel with real video/frames. Quests/XP use only visible interactions, no hidden content. Reduced-motion, keyboard path and full 2D mode are built in from day one.

## 10. Roadmap

Phases 1–8 as in your master prompt. Added dependency: Phase 6 (After Effects) is **blocked until After Effects is reinstalled**; alternatives in Q1.

## 11. Questions I need answered

1. **After Effects:** can you reinstall/repair it via Creative Cloud? If not, options: (a) you build the `.aep` and I supply an ExtendScript/JSX file you run, plus assets and storyboard; (b) I render the MP4 using another tool, but then there is **no genuine .aep** and the assignment requires one. Which?
2. **Contact form destination email:** `s.aimanmunawarali@gmail.com` (from the CV)? Should the email/phone be shown publicly?
3. What is **sos.mp4**?
4. For each project: **year**, **individual or team** (and teammates' names if you want them credited), your **specific contribution**, and any **GitHub/live links** (besides Orb Rush).
5. Any **Experience** entries, other achievements, or certificates to list? Is there a GitHub profile URL for the site?
6. **LLM/embedding provider** for the chatbot: Gemini free tier (my recommendation, no cost) or a paid key you hold? I will never put the key in code.
7. **Video hosting:** OK to compress videos to ~720p and host on Vercel (some may be trimmed), or prefer unlisted YouTube embeds for the largest ones?
8. May I **install ffmpeg** (for video compression and thumbnails)?
9. Please send the **revised CV with the LinkedIn link**, or confirm the current PDF can ship for now.
10. GitHub: you're signed in as `SyedaAiman-123`. Confirm repository name, public/private, and collaborators.
