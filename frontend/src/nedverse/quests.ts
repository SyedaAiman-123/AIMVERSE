// NEDVERSE QUEST SYSTEM — exploration only. No timers, no enemies, no lives, no punishment, nothing hidden: every objective is listed in the journal.
// Same design as the main site: the only stored data is a set of "events" the visitor has genuinely triggered. XP, level, quests and badges
// are all DERIVED from that set, so nothing can be double-counted. Stored in localStorage only (no accounts, no network). Reset is always possible.
import { useSyncExternalStore } from 'react'
import { FACTS, FLAT, SKILL_GROUPS } from '../data'
import { STOPS } from './tour'
import { ZONES } from './layout'

export const STORE_KEYS = { quest: 'aimverse:nedverse:quest:v1', tour: 'aimverse:nedverse:tour', viewed: 'aimverse:nedverse:viewed' }

export type Counter = { has: (e: string) => boolean; count: (prefix: string) => number }
export type Quest = { id: string; title: string; desc: string; xp: number; goal: number; progress: (c: Counter) => number }
export type Badge = { id: string; title: string; how: string; glyph: string; color: string; test: (c: Counter, done: Set<string>) => boolean }

const Z = ZONES.length, P = FLAT.length, S = SKILL_GROUPS.length, F = FACTS.length, T = STOPS.length

export const QUESTS: Quest[] = [
  { id: 'arrival', title: 'Arrival', desc: 'Enter the campus through the main gate.', xp: 50, goal: 1, progress: (c) => (c.has('gate') ? 1 : 0) },
  { id: 'take-the-wheel', title: 'Take the Wheel', desc: 'Get in the car and drive.', xp: 25, goal: 1, progress: (c) => (c.has('car') ? 1 : 0) },
  { id: 'read-the-map', title: 'Read the Map', desc: 'Open the welcome kiosk and read the campus map.', xp: 25, goal: 1, progress: (c) => (c.has('kiosk') ? 1 : 0) },
  { id: 'campus-explorer', title: 'Campus Explorer', desc: `Visit all ${Z} zones, A to G (follow the zone signboards and the mini-map).`, xp: 100, goal: Z, progress: (c) => c.count('zone:') },
  { id: 'follow-the-tour', title: 'Follow the Tour', desc: `Open all ${T} roadside tour stops, from About to Contact.`, xp: 100, goal: T, progress: (c) => c.count('stop:') },
  { id: 'open-the-lab', title: 'Open the Lab', desc: 'Walk into the Computer Science & IT Lab.', xp: 50, goal: 1, progress: (c) => (c.has('room:cs') ? 1 : 0) },
  { id: 'project-hunter', title: 'Project Hunter', desc: 'Open five project workstations in the lab.', xp: 75, goal: 5, progress: (c) => Math.min(5, c.count('proj:')) },
  { id: 'full-portfolio', title: 'Full Portfolio', desc: `Open all ${P} project workstations.`, xp: 150, goal: P, progress: (c) => c.count('proj:') },
  { id: 'library-card', title: 'Library Card', desc: 'Walk into the University Library.', xp: 50, goal: 1, progress: (c) => (c.has('room:lib') ? 1 : 0) },
  { id: 'skills-scholar', title: 'Skills Scholar', desc: `Open all ${S} skill shelves.`, xp: 100, goal: S, progress: (c) => c.count('skill:') },
  { id: 'milestone-hall', title: 'Milestone Hall', desc: 'Walk into the Auditorium & Exhibition Hall.', xp: 50, goal: 1, progress: (c) => (c.has('room:hall') ? 1 : 0) },
  { id: 'know-the-story', title: 'Know the Story', desc: `Open all ${F} milestone panels.`, xp: 100, goal: F, progress: (c) => c.count('fact:') },
]

export const BADGES: Badge[] = [
  { id: 'wayfinder', title: 'Wayfinder', how: 'Complete Arrival and Take the Wheel.', glyph: 'WF', color: '#4DF3C8', test: (_, d) => d.has('arrival') && d.has('take-the-wheel') },
  { id: 'campus-explorer', title: 'Campus Explorer', how: 'Visit all seven zones.', glyph: 'CE', color: '#6BB8FF', test: (_, d) => d.has('campus-explorer') },
  { id: 'tour-guide', title: 'Tour Guide', how: 'Open every roadside tour stop.', glyph: 'TG', color: '#FFC53D', test: (_, d) => d.has('follow-the-tour') },
  { id: 'project-pro', title: 'Project Pro', how: 'Open every project workstation.', glyph: 'PP', color: '#FF3D8B', test: (_, d) => d.has('full-portfolio') },
  { id: 'skills-scholar', title: 'Skills Scholar', how: 'Open every skill shelf.', glyph: 'SS', color: '#A58BFF', test: (_, d) => d.has('skills-scholar') },
  { id: 'storyteller', title: 'Storyteller', how: 'Open every milestone panel.', glyph: 'ST', color: '#FF8A3D', test: (_, d) => d.has('know-the-story') },
  { id: 'nedverse-master', title: 'NEDVERSE Master', how: 'Complete every quest.', glyph: 'NM', color: '#B8FF3D', test: (_, d) => QUESTS.every((q) => d.has(q.id)) },
]

/** Level 3 is "Campus Explorer" (the label shown on the Quest Mode entry). */
export const LEVELS = [
  { name: 'New Arrival', xp: 0 }, { name: 'Wayfinder', xp: 100 }, { name: 'Campus Explorer', xp: 250 }, { name: 'Milestone Seeker', xp: 500 }, { name: 'NEDVERSE Master', xp: 800 },
]

/** small XP for first-time discoveries (each event pays once) */
const eventXp = (e: string) => (/^(stop|proj|skill|fact):/.test(e) ? 5 : e.startsWith('zone:') ? 5 : 0)

export type Derived = {
  events: Set<string>; xp: number; level: number; levelName: string; levelFrom: number; nextXp: number | null; label: string
  quests: (Quest & { value: number; done: boolean })[]; badges: (Omit<Badge, 'test'> & { earned: boolean })[]
  parts: { label: string; have: number; of: number }[]; exploration: number
}

function derive(events: Set<string>): Derived {
  const c: Counter = { has: (e) => events.has(e), count: (p) => [...events].filter((e) => e.startsWith(p)).length }
  const quests = QUESTS.map((q) => { const value = Math.min(q.goal, q.progress(c)); return { ...q, value, done: value >= q.goal } })
  const done = new Set(quests.filter((q) => q.done).map((q) => q.id))
  const badges = BADGES.map(({ test, ...b }) => ({ ...b, earned: test(c, done) }))
  const xp = [...events].reduce((n, e) => n + eventXp(e), 0) + quests.filter((q) => q.done).reduce((n, q) => n + q.xp, 0)
  let level = 0; LEVELS.forEach((l, i) => { if (xp >= l.xp) level = i })
  const parts = [{ label: 'Zones visited', have: c.count('zone:'), of: Z }, { label: 'Tour stops', have: c.count('stop:'), of: T }, { label: 'Projects', have: c.count('proj:'), of: P }, { label: 'Skill shelves', have: c.count('skill:'), of: S }, { label: 'Milestones', have: c.count('fact:'), of: F }]
  const have = parts.reduce((n, p) => n + p.have, 0), of = parts.reduce((n, p) => n + p.of, 0)
  return { events, xp, level, levelName: LEVELS[level].name, levelFrom: LEVELS[level].xp, nextXp: LEVELS[level + 1]?.xp ?? null, label: `LEVEL ${level + 1} · ${LEVELS[level].name.toUpperCase()}`, quests, badges, parts, exploration: Math.round((have / of) * 100) }
}

/* ---------- store (localStorage; progress from the earlier tour/viewed keys is imported once so nothing is lost) ---------- */
let events = new Set<string>()
try {
  const raw = localStorage.getItem(STORE_KEYS.quest); if (raw) events = new Set((JSON.parse(raw) as string[]).filter((e) => typeof e === 'string'))
  for (const id of JSON.parse(localStorage.getItem(STORE_KEYS.tour) || '[]') as string[]) events.add('stop:' + id)
  for (const id of JSON.parse(localStorage.getItem(STORE_KEYS.viewed) || '[]') as string[]) events.add(id)
} catch { /* storage unavailable: progress simply will not persist */ }

let snap = derive(events)
const subs = new Set<() => void>(), emit = () => subs.forEach((f) => f())
const save = () => { try { localStorage.setItem(STORE_KEYS.quest, JSON.stringify([...events])) } catch { /* ignore */ } }

/** Record something the visitor really did. Duplicates are ignored, so rewards cannot be farmed. */
export function track(e: string) { if (events.has(e)) return; events = new Set(events).add(e); snap = derive(events); save(); emit() }
/** Wipe all NEDVERSE progress (quests, viewed exhibits and visited stops). */
export function resetQuests() {
  events = new Set(); snap = derive(events)
  try { localStorage.removeItem(STORE_KEYS.quest); localStorage.removeItem(STORE_KEYS.tour); localStorage.removeItem(STORE_KEYS.viewed) } catch { /* ignore */ }
  emit()
}
export const getQuests = () => snap
export const subscribeQuests = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const useQuests = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => snap)
