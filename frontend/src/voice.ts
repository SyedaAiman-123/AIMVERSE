import { useSyncExternalStore } from 'react'

/* The owner's recorded voiceovers (public/audio/voice/*.mp3, already mixed with a soft documentary bed). One line plays at a time; starting a new
   line (or closing the panel) cuts the previous one. While a line plays, the app's music is lowered through the ducker each app registers.
   The visitor can switch the voice off (remembered); it also follows the app's own mute and volume. Playback only ever starts after a user gesture. */

const KEY = 'aimverse:voice'
let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } })()
let muted = false, vol = 0.9
let cur: HTMLAudioElement | null = null
let ducker: (on: boolean) => void = () => {}
const subs = new Set<() => void>()

function release(a: HTMLAudioElement) { if (cur === a) { cur = null; ducker(false) } }

export const voice = {
  get enabled() { return enabled },
  get playing() { return !!cur },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
  setEnabled(on: boolean) { enabled = on; try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode */ } if (!on) voice.stop(); subs.forEach((f) => f()) },
  setMuted(m: boolean) { muted = m; if (m) voice.stop() },
  setVolume(v: number) { vol = Math.min(1, Math.max(0, v)); if (cur) cur.volume = vol },
  setDucker(fn: (on: boolean) => void) { ducker = fn },
  /** play one recorded line, e.g. voice.play('stop-about'); returns a promise that resolves when it ends (or at once if nothing plays) */
  play(name: string, onEnd?: () => void, retryMs = 8000) {
    voice.stop()
    if (!enabled || muted || typeof Audio === 'undefined') return
    try {
      const a = new Audio(`/audio/voice/${name}.mp3`); a.volume = vol; cur = a; ducker(true)
      a.onended = () => { release(a); onEnd?.() }
      a.onerror = () => release(a)
      a.play().catch(() => {
        // the browser blocked it (no click/key yet on this page): retry once on the visitor's first gesture, if this line is still the current one
        release(a)
        const retry = () => { window.removeEventListener('pointerdown', retry); window.removeEventListener('keydown', retry); if (!cur && !stale) voice.play(name, onEnd, 0) }
        let stale = false; window.addEventListener('pointerdown', retry); window.addEventListener('keydown', retry)
        window.setTimeout(() => { stale = true; window.removeEventListener('pointerdown', retry); window.removeEventListener('keydown', retry) }, retryMs)
      })
    } catch { cur = null; ducker(false) }
  },
  stop() { const a = cur; if (!a) return; a.onended = null; a.onerror = null; try { a.pause() } catch { /* ignore */ } release(a) },
}
export const useVoiceEnabled = () => useSyncExternalStore(voice.subscribe, () => enabled)
