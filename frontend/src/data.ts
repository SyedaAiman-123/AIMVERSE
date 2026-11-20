// Facts come only from the CV and the project-description file supplied by the owner. Anything not stated is left undefined
// and shown as "To be added" — never invented.
export const LINKEDIN = 'https://www.linkedin.com/in/syeda-aiman-munawar-46108a2ba/'
export const CV_URL = '/documents/Syeda_Aiman_Munawar_CV.pdf'

export type Media = { slug: string; label: string; desc?: string; img?: string; illustrative?: boolean; gallery?: { src: string; label: string }[] }
export type Project = {
  name: string
  tag: string
  blurb: string
  year?: string
  team?: string
  role?: string
  context?: string
  highlight?: string
  features?: string[]
  built?: string[]
  stack?: string[]
  learned?: string
  note?: string
  media?: Media[]
  link?: { href: string; label: string }
}
export type Island = { id: string; title: [string, string]; short: string; accent: string; projects: Project[] }

export const ISLANDS: Island[] = [
  { id: 'game', title: ['GAME', 'DEVELOPMENT'], short: 'Game Dev', accent: '#FFC53D', projects: [
    { name: 'Orb Rush', tag: '3D Web Game · Three.js', year: '2026', team: 'Individual',
      blurb: 'A responsive browser-based 3D arcade game with full-stack accounts: authenticated players pop animated orbs in timed rounds, then track results on a personal dashboard and public leaderboard.',
      features: ['Animated orbs in a Three.js arena with lighting, camera controls and raycast pointer interaction', 'Scoring with normal and bonus orbs, penalties, limited lives, combo multipliers and rising difficulty', '60-second rounds with pause/resume, accuracy tracking and game-over summaries', 'Personal stats, recent history and a public leaderboard'],
      built: ['Frontend in vanilla JavaScript + Vite; backend APIs with Node.js and Express', 'MongoDB Atlas + Mongoose for accounts and results', 'Password hashing, JWT in HTTP-only cookies, input validation, CSRF protection, rate limiting', 'Server-issued game sessions with server-side result validation', 'Vercel deployment with GitHub integration and environment variables'],
      stack: ['Three.js', 'Vite', 'Node.js', 'Express', 'MongoDB Atlas', 'Mongoose', 'JWT', 'Vercel'],
      learned: 'Combining real-time 3D interaction with a secure full-stack architecture. The latest shared local run reported 21 passing tests and a successful production build; live deployment acceptance is a separate check.',
      media: [{ slug: 'orb-rush', label: 'Gameplay demo' }], link: { href: 'https://orb-rush-omega.vercel.app/', label: 'Play live' } },
    { name: 'Dungeon Chase', tag: '3D Endless Runner · Unreal Engine 5.3', year: '2026', team: 'Team',
      blurb: 'An endless runner where survival meets destruction — and the player can fight back through a signature Power Mode.',
      highlight: 'Power Mode: collect 50 daggers to trigger 15 seconds where you stop dodging and start smashing blocker obstacles.',
      features: ['Procedural world generation through a modular tile-spawning system — a unique dungeon path every run', 'Custom Viking character brought to life with IK retargeting', 'Frame-independent HUD bar tracking Power Mode duration in real time', 'Dark dungeon atmosphere with event-driven gameplay logic'],
      stack: ['Unreal Engine 5.3'],
      learned: 'Bridging technical logic and immersive art, problem-solving under teamwork, and a stronger grasp of the Unreal ecosystem.',
      media: [{ slug: 'dungeon-chase', label: 'Final demo' }] },
    { name: 'Dungeon 2D Crawler', tag: '2D Game · Unity / C#', year: '2025', team: 'Individual', context: 'Gamecon, Techfest 2025 · NED University',
      blurb: 'My first game made in Unity, built for Gamecon at Techfest 2025.',
      features: ['Attacking enemies and being attacked by them', 'Traps', 'Running', 'Claiming keys and coins from chests', 'Level unlocking by winning the previous level'],
      stack: ['Unity', 'C#'], learned: 'First end-to-end game: combat, collectibles and level progression.',
      media: [{ slug: 'dungeon-crawler', label: 'Gameplay' }] },
    { name: 'MASK GAME', tag: '3D Game · Unity', year: '2026', team: 'Individual', context: 'CEGA Game Jam 2026 · theme: Mask',
      blurb: 'A 3D game set in a futuristic, dystopian Tokyo in the year 3030, where toxic smog covers the city and a mysterious creature emerges. A masked hero wearing the Aurelian Mask stands against it.',
      built: ['Game concept built around the Mask theme', 'Dystopian Tokyo environment with fog, atmospheric streets and neon lighting', 'Masked protagonist and a central creature presented through cinematic scenes'],
      stack: ['Unity'], media: [{ slug: 'mask-game', label: 'Gameplay' }] },
    { name: 'Scratch Maze Game', tag: 'Game Jam · Scratch', year: '2024', team: 'Team — with Aasia Asadullah, Rafia Gull and Iffat Adnan', context: "Game Jam, TechFest '24 · Gameverse-CSIT society, NED University",
      blurb: 'Our first Scratch game, a maze-navigation game built during the Game Jam at TechFest 2024, with mentorship from Meta Frolic Labs (Pvt.) Ltd.',
      stack: ['Scratch'], media: [{ slug: 'scratch-maze', label: 'Gameplay' }] },
    { name: 'Shadows of the Slums', tag: 'Game Concept · Unity', year: '2025', team: 'Team',
      blurb: 'A story-driven stealth game concept in a crime-ridden, noir-inspired city. Elias, an ordinary man, witnesses a mafia execution, becomes a target, and must survive, gather evidence and expose a criminal empire.',
      note: 'Concept / pre-production project — not a finished game.',
      built: ['Central storyline, characters, conflicts and narrative direction', 'Stealth mechanics: hiding, evasion, exploration, environmental interaction, evidence collection', 'A trust system where choices shape relationships with allies and can lead to different endings', 'Three settings — the slums, harbor and rooftops — each with its own atmosphere', 'Cast: Elias, Clara, Samir, Noah and antagonist Don Vescari with mafia bodyguards', 'Enemy patrol/chase behaviours and spotlight-scanning surveillance drones', 'Cinematic noir direction: darkness, fog, high-contrast light, neon accents'],
      stack: ['Unity 3D', 'Game design', 'Storyboarding'], media: [{ slug: 'shadows-slums', label: 'Concept footage' }] },
  ] },
  { id: 'cyber', title: ['CYBER', 'SECURITY'], short: 'Cybersecurity', accent: '#4DF3C8', projects: [
    { name: 'CYBERVERSE — Beyond the Firewall', tag: '3D Web · Three.js / WebGL / GLSL', year: '2026', team: 'Individual',
      blurb: 'A first-person browser experience across two connected worlds: a futuristic Cybersecurity Command Center and an encrypted Cyber Network. Disable the robot guardian with an EMP override to unlock the portal.',
      features: ['Two worlds built entirely in code — server racks, holographic panels, data towers, network nodes, particles', 'First-person movement with Pointer Lock, WASD/arrows, sprint and boundaries', 'Raycast targeting of an 18-mesh procedural robot guardian with an animated, staged EMP shutdown', 'Live portal: the second world is rendered to a WebGLRenderTarget and shown inside the gateway', 'Custom GLSL portal shader — energy bands, scan lines, ripples, soft edges', 'Futuristic HUD with crosshair, prompts, status and transition overlays'],
      stack: ['JavaScript', 'Three.js', 'WebGL', 'GLSL', 'Vite'],
      learned: 'Real-time browser 3D, scene management, procedural modelling, shader programming, raycasting and first-person interaction.',
      media: [{ slug: 'cyberverse', label: 'Walkthrough' }] },
    { name: 'CyberNex Simulator', tag: 'Cybersecurity Game · C++', year: '2024', team: 'Team', context: 'Data Structures & Algorithms semester project · NED University',
      blurb: 'A game that blends cybersecurity challenges with a graph-based world. Each node is a task — decoding encrypted messages, cracking passwords, bypassing firewalls and number guessing.',
      highlight: 'Selected as one of the top projects in the department and showcased at the project exhibition.',
      features: ['Dynamic graph structure enabling strategic navigation, backtracking and progression', 'Challenges inspired by real-world cybersecurity scenarios', 'Educational value through data structures and algorithms'],
      stack: ['C++', 'Graphs', 'Data structures & algorithms'], media: [{ slug: 'cybernex', label: 'Simulator demo' }] },
  ] },
  { id: 'vr', title: ['IMMERSIVE', 'REALITY'], short: 'Immersive / VR', accent: '#A58BFF', projects: [
    { name: 'VR Escape', tag: 'VR Horror Escape · Unity / C#', year: '2026', team: 'Team',
      blurb: 'An immersive VR horror escape game set in an abandoned multi-room house: find four hidden keys and unlock the exit before the countdown ends.',
      features: ['Object grabbing and a four-key collectible system with pickup animation and audio', 'Randomized key spawning using the Fisher-Yates shuffle', 'Teleportation movement chosen for VR comfort', 'Countdown timer with complete win/lose conditions and scene restart', 'World Space UI showing the timer and key count'],
      built: ['Modular C# scripts: GameManager, ItemCollect, SpawnManager, HUDFollow', 'Exit-unlocking logic'],
      stack: ['Unity', 'C#', 'XR Interaction Toolkit'],
      learned: 'VR gameplay systems, randomized algorithms, XR interaction design and comfortable immersive experiences.',
      media: [{ slug: 'vr-escape', label: 'Gameplay' }] },
    { name: 'Alice in Wonderland VR Tea Party', tag: 'VR · Unity / XR', year: '2026', team: 'Individual',
      blurb: 'A VR-inspired recreation of the Wonderland tea-party scene where you explore the fantasy setting and handle objects naturally.',
      features: ['Teapot pickup using XR Grab Interactable', 'Tilt-based tea pouring: custom C# detects teapot orientation and toggles the particle stream and pouring sound', 'Customized Particle System for a flowing tea stream', 'Synchronized audio feedback and background ambience'],
      built: ['Interactive environment and XR player interaction setup', 'Main menu with Unity Canvas and TextMeshPro; multi-scene navigation via SceneManager', 'Object physics, colliders, XR interactions and input systems'],
      stack: ['Unity', 'C#', 'XR Interaction Toolkit', 'Particle System'],
      learned: 'XR interaction design, physics-based interactions, particle effects and immersive environments.',
      media: [{ slug: 'alice-vr', label: 'Demo' }] },
    { name: 'VR-UAV SIM', tag: 'Mobile App · React Native / Expo', year: '2026', team: 'Team — Final Year Design Project',
      blurb: 'A cross-platform mobile app for our Final Year Design Project on VR-based UAV (drone) flight training. It introduces the concept through Home, Explore, Fly, Demo and Team sections.',
      features: ['Interactive 2D drone exploration with tappable component hotspots', '"Take Control" mini-game — touch joystick with climb/descend (PanResponder + Animated API)', 'Waypoint flight-path visualization and simulated telemetry: altitude, speed, heading', 'Offline demo video via Expo Video and haptic feedback'],
      built: ['Five-screen app with Expo Router tab and file-based navigation', 'Reusable components and centralized content configuration', 'Prepared for Android, iOS and web via EAS'],
      stack: ['React Native', 'JavaScript', 'Expo', 'Expo Router'],
      learned: 'Cross-platform mobile development, gesture handling, animation systems and responsive UI.',
      media: [{ slug: 'vr-uav-sim', label: 'App walkthrough' }] },
  ] },
  { id: 'ai', title: ['AI & COMPUTER', 'VISION'], short: 'AI & Vision', accent: '#B8FF3D', projects: [
    { name: 'Virtual Board', tag: 'Computer Vision · Python / OpenCV', year: '2026', team: 'Individual',
      blurb: 'A hand-gesture drawing board: a camera tracks your hand and turns gestures into drawing on a virtual canvas — no mouse or touchscreen.',
      features: ['Real-time hand detection with OpenCV', 'Gesture recognition for interaction', 'Gesture-controlled drawing on a virtual canvas', 'Touch-free input through camera-based hand tracking'],
      stack: ['Python', 'OpenCV', 'VS Code'], learned: 'Computer vision, hand-gesture recognition and real-time image processing.',
      media: [{ slug: 'virtual-board', label: 'Hand-tracking demo' }] },
    { name: 'Islamic Evaluator and Trainer', tag: 'Desktop App · Python / MySQL', year: '2025', team: 'Team',
      blurb: 'A desktop educational application that helps users assess and strengthen their knowledge of Islamic studies through evaluations and game-based training.',
      features: ['Registration and login with password hashing and database-backed accounts', 'Evaluation module with Easy, Medium and Hard levels', 'Training activities: anagram solving, Seerah event sequencing, Islamic-themed word search', 'Three word-search levels with timers, hints, scoring and visual feedback', 'Leaderboard based on accumulated scores', 'Animated Tkinter interface with custom backgrounds and transitions'],
      built: ['Python-based application functionality', 'Integration of the graphical interface with the MySQL database', 'Interactive learning activities, visuals, animations and game mechanics'],
      stack: ['Python', 'Tkinter', 'MySQL', 'Pillow (PIL)'],
      learned: 'OOP, GUI development, database integration, authentication and game logic.',
      note: 'No video exists for this project. The images are original illustrations made for this portfolio — not screenshots of the app.',
      media: [
        { slug: 'islamic-1', label: 'Geometric pattern', img: '/media/islamic-1.svg', illustrative: true, desc: 'Illustrative artwork inspired by Islamic geometric design — not an app screenshot.' },
        { slug: 'islamic-2', label: 'Word search', img: '/media/islamic-2.svg', illustrative: true, desc: 'Illustrative artwork representing the Islamic-themed word-search activity — not an app screenshot.' },
        { slug: 'islamic-3', label: 'Seerah sequence', img: '/media/islamic-3.svg', illustrative: true, desc: 'Illustrative artwork representing the Seerah event-sequencing activity — not an app screenshot.' },
      ] },
  ] },
  { id: 'motion', title: ['CREATIVE', 'MOTION'], short: 'Motion Studio', accent: '#FF3D8B', projects: [
    { name: 'Creative Motion Design', tag: 'Animation · After Effects', year: '2026', team: 'Individual', context: 'CEGA Post-Production course',
      blurb: 'Three After Effects pieces: a creative-agency marketing video recreation, a documentary-style Badshahi Mosque animation and an animated restaurant menu card.',
      features: ['Animated typography — text reveals for headings, names and calls-to-action', 'Shape transformations, motion graphics and visual transitions', 'Layered composition combining imagery, shapes and type'],
      stack: ['Adobe After Effects'], learned: 'Motion graphics, typography animation, composition and visual storytelling for brand communication.',
      media: [
        { slug: 'motion-recreation', label: 'Agency video recreation', desc: "Recreated as part of CEGA's Post-Production course, focusing on the original's visual flow with smooth movement and synchronization between elements." },
        { slug: 'motion-documentary', label: 'Badshahi Mosque', desc: "A documentary-style animation about the historic Badshahi Mosque in Lahore (CEGA Post-Production course), mixing architectural imagery, animated shapes, typography and layered visuals." },
        { slug: 'motion-menu', label: "Chef's Special menu card", desc: "An animated restaurant menu card: animated title sequence, individual cards for special pasta, cheeseburgers, grilled sandwiches and chicken tacos, transitions between cards and a final ordering screen. (2026)" },
      ] },
    { name: 'Between Waking', tag: 'Animation Pre-Production · Game Concept', year: '2026', team: 'Team ATE', role: 'Animatics · concept art of Aaron cooking in the kitchen scene', context: 'CEGA Pre-Production course — final deliverable',
      blurb: 'A story of tragedy, discovery and truth: a man’s emotional journey through guilt and redemption, unravelling memories in an alternate dimension. Subtitle: "The Truth in the Shadows — A Journey Through Guilt, Betrayal, and the Path to Forgiveness".',
      note: 'Pre-production work only — not a finished animation or game.',
      features: ['Themes: loss (the emotional aftermath of tragedy), guilt (unresolved feelings and memories) and redemption (the road to healing and acceptance)', 'Characters: Aaron (protagonist, FBI agent — humble, brave, built from rectangles), Mark (antagonist, FBI agent — clever, jealous, built from pointed triangles) and Lily Aaron (his nine-year-old daughter, built from circles)', 'Colour palette tied to story states: Deep Charcoal (FBI / coma state), Crimson Red (conflict, betrayal, nightmare walls), Warm Gold (awakening), Pure White (peace and forgiveness)', 'Worlds: a hospital (the central area where animation and game take place), a home, and surreal alternate-dimension corridors of memory doors', 'Game concept: the player fills the voids of his memory by solving the NPC’s nightmares — object interaction, search, sequence-based cooking, audio cues, limited visibility and driving control', 'Level 1 top-down design: a fractured hospital-corridor hub leading to the Promotion, Cooking and Accident nightmares'],
      built: ['Early character sketches defining each character visually through shape language', 'Hand-drawn storyboard frames across ten sequences: The Promotion, The Gift, The Tragedy, The Accident, Another Dimension, The Vision, The Poison, The Journey Towards Truth, The Truth and Awakening', 'Environment concept art and a top-down level design', 'Animatics (about 1 minute 40 seconds)', 'A 24-slide pre-production document and a mood-board poster'],
      stack: ['Storyboarding', 'Animatics', 'Game-design documentation', 'World-building', 'Concept art'],
      media: [
        { slug: 'bw-animatics', label: 'Animatics', desc: 'Animatics for Between Waking — about 1 minute 40 seconds, with sound.' },
        { slug: 'bw-poster', label: 'Poster', img: '/media/bw-poster.jpg', desc: 'Mood-board poster covering visual style, character, nightmares, colour and elements.' },
        { slug: 'bw-deck', label: 'Pre-production deck', img: '/media/bw/p01.jpg', desc: 'The 24-slide pre-production document presented by Team ATE — use the page strip below to browse.',
          gallery: [['Title','p01'],['Journey from tragedy to truth','p02'],['Themes','p03'],['Environment: the hospital','p04'],['Environment: home','p05'],['Colour palette','p06'],['The protagonist','p07'],['The antagonist','p08'],['The kid','p09'],['Alternate dimension','p10'],['Memory doors','p11'],['Gameplay','p12'],['Top-down design: Level 1','p13'],['Storyboard: The Promotion','p14'],['Storyboard: The Gift','p15'],['Storyboard: The Tragedy','p16'],['Storyboard: The Accident','p17'],['Storyboard: Another Dimension','p18'],['Storyboard: The Vision / Nightmare 1','p19'],['Storyboard: The Poison / Nightmare 2','p20'],['Storyboard: The Journey Towards Truth','p21'],['Storyboard: The Truth','p22'],['Storyboard: Awakening','p23'],['Thank you','p24']].map(([label, p]) => ({ src: `/media/bw/${p}.jpg`, label })) },
      ] },
  ] },
]

export const SKILLS: [string, string][] = [
  ['Game & Immersive', 'Unity (2D/3D), Unreal Engine 5, XR Interaction Toolkit, VR/XR interaction, gameplay programming'],
  ['Programming', 'C#, C++, Python, JavaScript, React Native / JSX'],
  ['3D & Web', 'Three.js, WebGL, GLSL, Vite, Blender, GLB/glTF integration'],
  ['AI & Computer Vision', 'OpenCV, gesture recognition, Minimax, graph-based logic, algorithms'],
  ['Backend & Databases', 'Node.js, Express, MongoDB, MySQL, REST APIs, JWT authentication'],
  ['Creative & Tools', 'Adobe After Effects, Git, GitHub, VS Code, Visual Studio'],
]

export const TICKER = ['Unity', 'Unreal Engine 5', 'Three.js', 'WebGL', 'GLSL', 'React Native', 'OpenCV', 'C#', 'C++', 'Python', 'Blender', 'After Effects', 'XR Interaction Toolkit', 'Node.js']

/** Every project in display order, for prev/next navigation. */
export const FLAT = ISLANDS.flatMap((isl, gi) => isl.projects.map((_, pi) => ({ gi, pi })))

/* ---------- skills (from the CV skills table) ---------- */
export const SKILL_COLORS = ['#FFC53D', '#4DF3C8', '#A58BFF', '#B8FF3D', '#FF3D8B', '#6BB8FF']
export type SkillGroup = { name: string; color: string; skills: string[] }
export const SKILL_GROUPS: SkillGroup[] = SKILLS.map(([name, list], i) => ({ name, color: SKILL_COLORS[i % SKILL_COLORS.length], skills: list.split(',').map((s) => s.trim()) }))

const ALIAS: Record<string, string[]> = {
  'unity (2d/3d)': ['unity'],
  'unreal engine 5': ['unreal'],
  'xr interaction toolkit': ['xr interaction toolkit'],
  'vr/xr interaction': ['xr interaction', ' vr '],
  'gameplay programming': ['gameplay'],
  'react native / jsx': ['react native'],
  'glb/gltf integration': ['glb', 'gltf'],
  'gesture recognition': ['gesture'],
  'graph-based logic': ['graph'],
  algorithms: ['algorithm'],
  'rest apis': ['apis'],
  'jwt authentication': ['jwt'],
  'adobe after effects': ['after effects'],
  'vs code': ['vs code'],
}
/** Projects whose own text (stack, tag, features, build notes) mentions the skill. Never inferred beyond that text. */
export function projectsFor(skill: string): { gi: number; pi: number; name: string }[] {
  const key = skill.toLowerCase()
  const needles = ALIAS[key] ?? [key.replace(/\s*\(.*\)/, '')]
  const out: { gi: number; pi: number; name: string }[] = []
  ISLANDS.forEach((isl, gi) =>
    isl.projects.forEach((p, pi) => {
      const hay = ` ${[p.name, p.tag, ...(p.stack ?? []), ...(p.features ?? []), ...(p.built ?? []), p.blurb].join(' ').toLowerCase()} `
      if (needles.some((n) => hay.includes(n))) out.push({ gi, pi, name: p.name })
    }),
  )
  return out
}

/* ---------- journey: projects grouped by year ---------- */
export const YEARS = ['2023', '2024', '2025', '2026']
export const BY_YEAR: Record<string, { gi: number; pi: number; name: string }[]> = Object.fromEntries(YEARS.map((y) => [y, [] as { gi: number; pi: number; name: string }[]]))
ISLANDS.forEach((isl, gi) => isl.projects.forEach((p, pi) => { const y = p.year?.match(/\d{4}/)?.[0]; if (y && BY_YEAR[y]) BY_YEAR[y].push({ gi, pi, name: p.name }) }))

export const EDUCATION = {
  degree: 'BS Computer Science & IT',
  school: 'NED University of Engineering and Technology',
  span: '2023 – Present',
  matric: 'Matriculation — 98.3%, Position Holder',
  cega: ['Pre-Production Track', 'Unreal Engine Production Track', 'Post-Production — After Effects & Motion'],
  achievement: 'All-Pakistan Speech Competition — Winner',
}
export const ABOUT =
  'Computer Science student at NED University of Engineering and Technology with hands-on experience building interactive applications across game development, immersive VR/XR, 3D web technologies, computer vision, and creative motion design. Interested in creating engaging digital experiences that combine programming, interaction, and visual design.'

/* ---------- experience (owner-supplied; dates and duties not provided yet) ---------- */
export const EXPERIENCE = [{ role: 'Intern', org: 'KDA — IT Department', duration: '1 month' }]

/* ---------- facts shown as orbs around the avatar (all from the CV / owner-supplied text) ---------- */
export const FACTS: { id: string; title: string; body: string }[] = [
  { id: 'edu', title: 'NED University', body: 'BS Computer Science & IT · 2023 – Present' },
  { id: 'matric', title: '98.3%', body: 'Matriculation — Position Holder' },
  { id: 'speech', title: 'Speech winner', body: 'All-Pakistan Speech Competition — Winner' },
  { id: 'projects', title: `${FLAT.length} projects`, body: 'Games, VR, 3D web, computer vision and motion design' },
  { id: 'cega', title: 'CEGA trained', body: 'Pre-Production · Unreal Engine Production · Post-Production (After Effects & Motion)' },
  { id: 'kda', title: 'KDA IT intern', body: 'IT Department · 1 month' },
  { id: 'engines', title: 'Unity · Unreal · Three.js', body: 'Engines and tools from my CV' },
]

/** poster image for a project, if any media was supplied */
export const thumbOf = (p: Project): string | null => {
  const m = p.media?.[0]
  return m ? (m.img ?? `/media/${m.slug}.jpg`) : null
}
export const YEAR_NOTE: Record<string, string> = { '2023': 'University begins — BS Computer Science & IT at NED' }
