import { useEffect, useMemo, useRef, useState } from 'react'
import { INTERACTABLES, SIGNPOST } from './layout'
import { STOPS, stopById } from './tour'
import type { Mode } from './Player'
import { GATE_TARGET } from './layout'
import { BY_YEAR, YEARS, YEAR_NOTE } from '../data'
import { audio } from './audio'
import { input, resetInput } from './input'
import { BRAND } from '../brand'
import './nedverse.css'

/* Minimal in-world UI for Phase 4: brand tag + disclaimer, controls help, "PRESS E TO INTERACT", an interaction card (real project /
   skill / achievement panels arrive in Phase 6), pause menu and touch controls. Closing a card or the menu returns to the exact spot. */

const CARDS: Record<string, { title: string; body: string[] }> = {
  kiosk: { title: 'Welcome kiosk', body: ['Campus map and destinations will open here in Phase 6.', 'Planned destinations: Computer Science Lab · University Library · Central Garden · Auditorium & Exhibition Hall · Academic Block · Student Common Area.', 'Current objective: explore the campus.'] },
  board: { title: 'About NEDVERSE', body: [BRAND.questDisclaimer, 'Part of the AIMVERSE portfolio by Syeda Aiman Munawar. Exit at any time to browse the regular portfolio.'] },
  signpost: { title: 'Campus signpost', body: SIGNPOST.items.map((s) => s.replace(/\s+/g, ' '))},
}

const SPECIAL: Record<string, { title: string; label: string }> = {
  car: { title: 'PRESS E TO GET IN THE CAR', label: 'Tour the campus by car' },
  exit: { title: 'PRESS E TO GET OUT', label: 'Slow down to step out' },
}

/** Tour objective: next unvisited stop, its distance and a compass arrow (polls the player's live position a few times a second). */
function Objective({ visited, mode, entered }: { visited: ReadonlySet<string>; mode: Mode; entered: boolean }) {
  const [v, setV] = useState({ d: 0, a: 0, kmh: 0 })
  const nextStop = STOPS.find((s) => !visited.has(s.id))
  const next = entered ? nextStop : { ...GATE_TARGET, color: '#ffffff', name: 'Main Gate' }
  useEffect(() => {
    const iv = window.setInterval(() => {
      const n = window.__ned; if (!n || !next) return
      const px = mode === 'driving' ? n.carX : n.x, pz = mode === 'driving' ? n.carZ : n.z
      const dx = next.x - px, dz = next.z - pz, fx = -Math.sin(n.camYaw), fz = -Math.cos(n.camYaw)
      setV({ d: Math.hypot(dx, dz), a: Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz), kmh: Math.abs(n.carV) * 3.6 })
    }, 200)
    return () => window.clearInterval(iv)
  }, [next, mode, entered])
  return (
    <div className="nv-obj" aria-live="polite">
      <small>{entered ? 'CAMPUS TOUR' : 'ARRIVAL'} · {visited.size}/{STOPS.length} stops{mode === 'driving' ? ` · ${Math.round(v.kmh)} km/h` : ''}</small>
      {next ? (
        <div className="nv-obj-row">
          <span className="nv-arrow" style={{ transform: `rotate(${v.a}rad)`, color: next.color }} aria-hidden>▲</span>
          <span><b>{mode === 'foot' ? 'Walk to the car, press E to get in' : entered ? `Next: ${next.name}` : 'Drive through the main gate'}</b><em>{mode === 'foot' ? 'It is parked beside you on University Road' : `${Math.round(v.d)} m`}</em></span>
        </div>
      ) : <b>Tour complete — thank you for visiting!</b>}
    </div>
  )
}

/** Cinematic opening: letterbox bars, the journey from 2023, then the objective. Skippable (Enter / Space / Esc / click). */
function Story({ onDone }: { onDone: () => void }) {
  const slides = useMemo(() => [
    { big: BRAND.quest, small: BRAND.questTagline, note: BRAND.name + ' · unofficial NED-inspired campus' },
    { big: '2023', small: YEAR_NOTE['2023'] ?? 'University begins', note: 'The journey began.' },
    ...YEARS.filter((y) => y !== '2023' && BY_YEAR[y].length).map((y) => { const n = BY_YEAR[y].map((p) => p.name); return { big: y, small: `${n.length} project${n.length > 1 ? 's' : ''}`, note: n.slice(0, 3).join(' · ') + (n.length > 3 ? ' · and more' : '') } }),
    { big: 'Explore the campus.', small: 'Get to know the milestones.', note: 'Drive in through the main gate.' },
  ], [])
  const [i, setI] = useState(0)
  const done = useRef(onDone); done.current = onDone   // the parent re-renders often: keep the timers independent of it
  useEffect(() => { const t = setTimeout(() => (i >= slides.length - 1 ? done.current() : setI(i + 1)), i === slides.length - 1 ? 3600 : 2900); return () => clearTimeout(t) }, [i, slides.length])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); done.current() } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  const sl = slides[i]
  return (
    <div className="nv-story" data-ui>
      <div className="nv-bar top" /><div className="nv-bar bot" />
      <div className="nv-slide" key={i}><b>{sl.big}</b><span>{sl.small}</span><em>{sl.note}</em></div>
      <button className="nv-skip" onClick={onDone}>Skip ▸ <kbd>Enter</kbd></button>
    </div>
  )
}

function StopCardView({ id, onClose }: { id: string; onClose: () => void }) {
  const stop = stopById(id.replace('stop:', '')); if (!stop) return null
  const c = stop.card
  return (
    <div className="nv-card nv-stop" role="dialog" aria-modal="true" aria-label={c.title} style={{ borderColor: stop.color, boxShadow: `0 0 60px ${stop.color}33` }}>
      <div className="nv-confetti" aria-hidden>{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: [stop.color, "#ffffff", "#FFC53D", "#4DF3C8"][i % 4], animationDelay: `${(i % 9) * 0.07}s`, animationDuration: `${1.4 + (i % 5) * 0.25}s` }} />)}</div>
      <small style={{ color: stop.color }}>{c.kicker}</small>
      <h3>{c.title}</h3>
      <div className="nv-scroll">
        {c.sections.map((sec, i) => (
          <section key={i}>
            {sec.h && <h4>{sec.h}</h4>}{sec.sub && <em>{sec.sub}</em>}{sec.p && <p>{sec.p}</p>}
            {sec.items && <ul>{sec.items.map((t, k) => <li key={k}>{t}</li>)}</ul>}
            {sec.link && <a href={sec.link.href} target="_blank" rel="noopener noreferrer">{sec.link.label} ↗</a>}
          </section>
        ))}
        {c.links && <div className="nv-row">{c.links.map((l) => <a key={l.href} className="nv-btn ghost" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</div>}
      </div>
      <button className="nv-btn" onClick={onClose} autoFocus>Close (Esc) — back to the road</button>
    </div>
  )
}

export function PlayHud({ near, card, paused, mode, visited, entered, intro, onIntroDone, onResetTour, onCloseCard, onResume, touch }: { near: string | null; card: string | null; paused: boolean; mode: Mode; visited: ReadonlySet<string>; entered: boolean; intro: boolean; onIntroDone: () => void; onResetTour: () => void; onCloseCard: () => void; onResume: () => void; touch: boolean }) {
  const nearItem = near ? (SPECIAL[near] ? { label: SPECIAL[near].label, title: SPECIAL[near].title } : { label: INTERACTABLES.find((i) => i.id === near)?.label ?? '', title: 'PRESS E TO INTERACT' }) : undefined
  const [help, setHelp] = useState(true)
  const [muted, setMuted] = useState(audio.muted)
  useEffect(() => audio.subscribe(() => setMuted(audio.muted)), [])
  const [welcome, setWelcome] = useState(false)
  useEffect(() => { if (!entered) return; setWelcome(true); const t = setTimeout(() => setWelcome(false), 5000); return () => clearTimeout(t) }, [entered])
  useEffect(() => { const t = setTimeout(() => setHelp(false), 14000); return () => clearTimeout(t) }, [])
  const c = card && !card.startsWith('stop:') ? CARDS[card] : null, stopCard = card?.startsWith('stop:') ? card : null
  const modal = !!c || !!stopCard
  return (
    <div className="nv-hud" data-ui>
      <div className="nv-fade" aria-hidden />
      <div className="nv-speed" aria-hidden />
      {intro && <Story onDone={onIntroDone} />}
      {welcome && <div className="nv-toast" role="status"><b>Welcome to the campus</b><span>{STOPS.length} tour stops are now open — follow the arrow and the light beams.</span></div>}
      <button className="nv-mute" data-ui onClick={() => audio.toggle()} aria-pressed={muted} aria-label={muted ? 'Unmute sound (M)' : 'Mute sound (M)'}>{muted ? '🔇' : '🔊'}<small>M</small></button>
      <div className="nv-tag"><b>{BRAND.quest}</b><span>{BRAND.questTagline}</span><small>{BRAND.name} · unofficial NED-inspired campus</small></div>
      {!modal && !paused && !intro && nearItem && mode !== 'entering' && (
        <button className="nv-prompt" data-ui onClick={() => { input.interact = true }}><kbd>E</kbd><span><b>{nearItem.title}</b><small>{nearItem.label}</small></span></button>
      )}
      {!modal && !paused && !intro && <Objective visited={visited} mode={mode} entered={entered} />}
      {stopCard && <StopCardView id={stopCard} onClose={onCloseCard} />}
      {!touch && help && !modal && !paused && !intro && (
        <div className="nv-help" role="note"><b>Controls</b>{mode === 'driving' ? <><span><kbd>W</kbd><kbd>S</kbd> throttle / reverse</span><span><kbd>A</kbd><kbd>D</kbd> steer</span><span><kbd>Shift</kbd> boost</span><span><kbd>Space</kbd> brake</span><span><kbd>H</kbd> horn</span></> : <><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><span><kbd>Shift</kbd> run</span></>}<span>drag mouse · look</span><span>wheel · zoom</span><span><kbd>E</kbd> interact</span><span><kbd>M</kbd> sound</span><span><kbd>Esc</kbd> pause</span></div>
      )}
      {c && (
        <div className="nv-card" role="dialog" aria-modal="true" aria-label={c.title}>
          <h3>{c.title}</h3>{c.body.map((p, i) => <p key={i}>{p}</p>)}
          <button className="nv-btn" onClick={onCloseCard} autoFocus>Close (Esc)</button>
        </div>
      )}
      {paused && !modal && (
        <div className="nv-pause" role="dialog" aria-modal="true" aria-label="Paused">
          <h3>Paused</h3><p>{BRAND.questDisclaimer}</p>
          <div className="nv-row"><button className="nv-btn" onClick={onResume} autoFocus>Resume</button><button className="nv-btn ghost" onClick={onResetTour}>Reset tour progress</button><a className="nv-btn ghost" href="/">Exit to {BRAND.name} portfolio</a></div>
        </div>
      )}
      {touch && !modal && !paused && !intro && <TouchControls canInteract={!!nearItem} />}
    </div>
  )
}

function TouchControls({ canInteract }: { canInteract: boolean }) {
  const base = useRef<HTMLDivElement>(null), knob = useRef<HTMLSpanElement>(null), id = useRef<number | null>(null)
  const [run, setRun] = useState(false)
  useEffect(() => () => resetInput(), [])
  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId || !base.current || !knob.current) return
    const r = base.current.getBoundingClientRect(), R = r.width / 2
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const d = Math.hypot(dx, dy)
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
    input.stick.x = dx / R; input.stick.y = -dy / R; knob.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const end = () => { id.current = null; input.stick.x = input.stick.y = 0; if (knob.current) knob.current.style.transform = '' }
  return (
    <>
      <div className="nv-stick" ref={base} data-ui onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Move joystick"><span ref={knob} /></div>
      <div className="nv-actions" data-ui>
        <button className={'nv-round' + (run ? ' on' : '')} onClick={() => { input.runToggle = !run; setRun(!run) }} aria-pressed={run}>Run</button>
        <button className={'nv-round act' + (canInteract ? ' ready' : '')} disabled={!canInteract} onClick={() => { input.interact = true }}>E</button>
      </div>
    </>
  )
}
