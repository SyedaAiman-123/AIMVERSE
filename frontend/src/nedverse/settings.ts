import { useSyncExternalStore } from 'react'
import { audio } from './audio'
import { voice } from '../voice'

/* Player settings, saved in the browser only. quality: auto = pick from the device and the live frame rate; mood: time of day;
   reducedMotion: null = follow the operating-system setting. */
export type Settings = { quality: 'auto' | 'low' | 'high'; mood: 'day' | 'evening'; volume: number; reducedMotion: boolean | null; showFps: boolean }
const KEY = 'aimverse:nedverse:settings'
const DEFAULTS: Settings = { quality: 'auto', mood: 'day', volume: 0.8, reducedMotion: null, showFps: false }

let cur: Settings = { ...DEFAULTS }
try { const raw = localStorage.getItem(KEY); if (raw) { const j = JSON.parse(raw) as Partial<Settings>; cur = { ...DEFAULTS, ...j, volume: Math.min(1, Math.max(0, Number(j.volume ?? DEFAULTS.volume))) } } } catch { /* defaults */ }
const subs = new Set<() => void>()
const osReduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }
export const isReduced = (s: Settings = cur) => (s.reducedMotion === null ? osReduce() : s.reducedMotion)
const apply = () => { audio.setVolume(cur.volume); voice.setVolume(cur.volume); try { document.documentElement.dataset.nvReduce = isReduced() ? '1' : '0' } catch { /* ignore */ } }
apply()

export const getSettings = () => cur
export function setSettings(p: Partial<Settings>) {
  cur = { ...cur, ...p }; try { localStorage.setItem(KEY, JSON.stringify(cur)) } catch { /* private mode */ }
  apply(); subs.forEach((f) => f())
}
export const useSettings = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => cur)
