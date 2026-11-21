// AIMVERSE QUEST — optional, anonymous, local-only gamification.
// Design: the only stored data is a set of "events" the visitor has triggered by genuinely using the site.
// XP, levels, quests and badges are all DERIVED from that set, so nothing can be double-counted.
// No accounts, no network calls, no leaderboard, no hidden items. Rewards are shown only inside the Quest interface
// (never as pop-ups over the portfolio), so nothing can cover the content.
import { useSyncExternalStore } from 'react'
import { ISLANDS } from './data'
import { BRAND } from './brand'

const KEY = BRAND.storage.quest
const HUD_KEY = BRAND.storage.hud

/* ---------- definitions ---------- */
export type Quest = { id: string; title: string; desc: string; xp: number; goal: number; progress: (c: Counter) => number }
export type Badge = { id: string; title: string; how: string; glyph: string; color: string; test: (c: Counter, done: Set<string>) => boolean }
export type Counter = { has: (e: string) => boolean; count: (prefix: string) => number }

/** ids of the Quest World station games (Portal Tuner, Keyframe Rhythm, Three-Point Light, Retrieval Radar) */
export const ARCADE = ['portal', 'keyframe', 'light', 'radar'] as const

const gi = (id: string) => ISLANDS.findIndex((i) => i.id === id)

export const QUESTS: Quest[] = [
  { id: 'first-contact', title: 'First Contact', desc: `Enter ${BRAND.name}.`, xp: 50, goal: 1, progress: (c) => (c.has('enter') ? 1 : 0) },
  { id: 'say-hello', title: 'Say Hello', desc: 'Greet Aiman — press Say hello or click her.', xp: 25, goal: 1, progress: (c) => (c.has('hello') ? 1 : 0) },
  { id: 'cyber-explorer', title: 'Cyber Explorer', desc: 'Open both Cybersecurity projects: CYBERVERSE and CyberNex.', xp: 100, goal: ISLANDS[gi('cyber')].projects.length, progress: (c) => c.count(`project:${gi('cyber')}:`) },
  { id: 'game-developer', title: 'Game Developer', desc: 'Open any three Game Development projects.', xp: 100, goal: 3, progress: (c) => Math.min(3, c.count(`project:${gi('game')}:`)) },
  { id: 'reality-bender', title: 'Reality Bender', desc: 'Open all three Immersive / VR projects.', xp: 75, goal: ISLANDS[gi('vr')].projects.length, progress: (c) => c.count(`project:${gi('vr')}:`) },
  { id: 'creative-vision', title: 'Creative Vision', desc: 'Open both Creative Motion projects.', xp: 75, goal: ISLANDS[gi('motion')].projects.length, progress: (c) => c.count(`project:${gi('motion')}:`) },
  { id: 'skill-explorer', title: 'Skill Explorer', desc: 'Explore four skill categories in the constellation.', xp: 75, goal: 4, progress: (c) => Math.min(4, c.count('skillcat:')) },
  { id: 'know-aiman', title: 'Know Aiman', desc: 'Open four of the fact orbs around her.', xp: 50, goal: 4, progress: (c) => Math.min(4, c.count('fact:')) },
  { id: 'time-traveller', title: 'Time Traveller', desc: 'Visit every year in the Journey: 2023, 2024, 2025 and 2026.', xp: 75, goal: 4, progress: (c) => c.count('year:') },
  { id: 'ai-enthusiast', title: 'AI Enthusiast', desc: `Ask ${BRAND.assistant} three questions.`, xp: 75, goal: 3, progress: (c) => Math.min(3, c.count('ask:')) },
  { id: 'arcade-rookie', title: 'Station Rookie', desc: 'Clear any station game in the Quest World.', xp: 50, goal: 1, progress: (c) => (ARCADE.some((g) => c.has(`game:${g}:clear`)) ? 1 : 0) },
  { id: 'arcade-champion', title: 'Station Master', desc: 'Clear all four station games: Portal Tuner, Keyframe Rhythm, Three-Point Light and Retrieval Radar.', xp: 100, goal: ARCADE.length, progress: (c) => ARCADE.filter((g) => c.has(`game:${g}:clear`)).length },
  { id: 'full-tour', title: 'Full Tour', desc: 'Visit all ten stops, from the Gateway to Contact.', xp: 100, goal: 10, progress: (c) => c.count('section:') },
]

export const BADGES: Badge[] = [
  { id: 'vr-pioneer', title: 'VR Pioneer', how: 'Complete the Reality Bender quest.', glyph: 'VR', color: '#A58BFF', test: (_, d) => d.has('reality-bender') },
  { id: 'cyber-explorer', title: 'Cyber Explorer', how: 'Complete the Cyber Explorer quest.', glyph: 'CX', color: '#4DF3C8', test: (_, d) => d.has('cyber-explorer') },
  { id: 'game-architect', title: 'Game Architect', how: 'Open all six Game Development projects.', glyph: 'GA', color: '#FFC53D', test: (c) => c.count(`project:${gi('game')}:`) >= ISLANDS[gi('game')].projects.length },
  { id: 'creative-visionary', title: 'Creative Visionary', how: 'Complete the Creative Vision quest.', glyph: 'CV', color: '#FF3D8B', test: (_, d) => d.has('creative-vision') },
  { id: 'constellation-mapper', title: 'Constellation Mapper', how: 'Explore all six skill categories.', glyph: 'SK', color: '#6BB8FF', test: (c) => c.count('skillcat:') >= 6 },
  { id: 'time-traveller', title: 'Time Traveller', how: 'Complete the Time Traveller quest.', glyph: 'TT', color: '#FF8A3D', test: (_, d) => d.has('time-traveller') },
  { id: 'ai-enthusiast', title: 'AI Enthusiast', how: 'Complete the AI Enthusiast quest.', glyph: 'AI', color: '#C6FF3D', test: (_, d) => d.has('ai-enthusiast') },
  { id: 'arcade-champion', title: 'Station Master', how: 'Clear all four Quest World station games.', glyph: 'AC', color: '#7DF9FF', test: (_, d) => d.has('arcade-champion') },
  { id: 'master-explorer', title: 'Master Explorer', how: 'Complete every quest.', glyph: 'ME', color: '#B8FF3D', test: (_, d) => QUESTS.every((q) => d.has(q.id)) },
]

export const LEVELS = [
  { name: 'New Visitor', xp: 0 },
  { name: 'Digital Explorer', xp: 100 },
  { name: 'Tech Adventurer', xp: 250 },
  { name: 'Innovation Seeker', xp: 450 },
  { name: `${BRAND.name} Master`, xp: 700 },
]

/** small XP for first-time discoveries (each event type pays out once) */
const eventXp = (e: string) => {
  if (e === 'hello') return 0 // paid by its quest
  if (e.startsWith('section:')) return e === 'section:0' ? 0 : 10
  if (/^(project|skillcat|fact|year):/.test(e)) return 5
  if (ARCADE.some((g) => e.startsWith(`game:${g}:`))) return e.endsWith(':perfect') ? 15 : 20 // station games: clear = 20, flawless = +15 (each once)
  return 0
}

/** Milestones that make up the "exploration progress" figure */
const MILESTONES: [string, number][] = [
  ['section:', 10],
  ['project:', ISLANDS.reduce((n, i) => n + i.projects.length, 0)],
  ['skillcat:', 6],
  ['fact:', 7],
  ['year:', 4],
]

/* ---------- derived state ---------- */
export type Derived = {
  events: Set<string>
  xp: number
  level: number
  levelName: string
  nextXp: number | null
  levelFrom: number
  quests: (Quest & { value: number; done: boolean })[]
  badges: (Omit<Badge, 'test'> & { earned: boolean })[]
  exploration: number
  parts: { label: string; have: number; of: number }[]
}

function derive(events: Set<string>): Derived {
  const c: Counter = { has: (e) => events.has(e), count: (p) => [...events].filter((e) => e.startsWith(p)).length }
  const quests = QUESTS.map((q) => { const value = Math.min(q.goal, q.progress(c)); return { ...q, value, done: value >= q.goal } })
  const done = new Set(quests.filter((q) => q.done).map((q) => q.id))
  const badges = BADGES.map((b) => ({ ...b, earned: b.test(c, done) }))
  const xp = [...events].reduce((n, e) => n + eventXp(e), 0) + quests.filter((q) => q.done).reduce((n, q) => n + q.xp, 0)
  let level = 0
  LEVELS.forEach((l, i) => { if (xp >= l.xp) level = i })
  const parts = [
    { label: 'Stops visited', have: c.count('section:'), of: 10 },
    { label: 'Projects opened', have: c.count('project:'), of: MILESTONES[1][1] },
    { label: 'Skill categories', have: c.count('skillcat:'), of: 6 },
    { label: 'Fact orbs', have: c.count('fact:'), of: 7 },
    { label: 'Journey years', have: c.count('year:'), of: 4 },
  ]
  const have = parts.reduce((n, p) => n + p.have, 0)
  const of = parts.reduce((n, p) => n + p.of, 0)
  return { events, xp, level, levelName: LEVELS[level].name, levelFrom: LEVELS[level].xp, nextXp: LEVELS[level + 1]?.xp ?? null, quests, badges, exploration: Math.round((have / of) * 100), parts }
}

/* ---------- store ---------- */
let events = new Set<string>()
let hud = true
try {
  // read the pre-rename (AIMANVERSE) key once so existing visitors keep their progress
  const raw = localStorage.getItem(KEY) ?? localStorage.getItem(BRAND.storage.questLegacy)
  if (raw) events = new Set((JSON.parse(raw) as string[]).filter((e) => typeof e === 'string'))
  hud = (localStorage.getItem(HUD_KEY) ?? localStorage.getItem(BRAND.storage.hudLegacy)) !== 'off'
} catch { /* storage unavailable: progress simply won't persist */ }

let snap = derive(events)
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...events])) } catch { /* ignore */ } }

/** Record that the visitor did something real. Duplicates are ignored, so rewards can never be farmed. */
export function track(e: string) {
  if (events.has(e)) return
  events = new Set(events).add(e)
  snap = derive(events)
  save()
  emit()
}

export function resetProgress() {
  events = new Set()
  snap = derive(events)
  save()
  emit()
}
export function setHud(v: boolean) {
  hud = v
  try { localStorage.setItem(HUD_KEY, v ? 'on' : 'off') } catch { /* ignore */ }
  emit()
}

export const useGame = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => snap)
export const useHud = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => hud)
