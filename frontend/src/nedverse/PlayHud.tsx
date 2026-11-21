import { useEffect, useRef, useState } from 'react'
import { INTERACTABLES, SIGNPOST } from './layout'
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

export function PlayHud({ near, card, paused, onCloseCard, onResume, touch }: { near: string | null; card: string | null; paused: boolean; onCloseCard: () => void; onResume: () => void; touch: boolean }) {
  const nearItem = INTERACTABLES.find((i) => i.id === near)
  const [help, setHelp] = useState(true)
  useEffect(() => { const t = setTimeout(() => setHelp(false), 14000); return () => clearTimeout(t) }, [])
  const c = card ? CARDS[card] : null
  return (
    <div className="nv-hud" data-ui>
      <div className="nv-tag"><b>{BRAND.quest}</b><span>{BRAND.questTagline}</span><small>{BRAND.name} · unofficial NED-inspired campus</small></div>
      {!c && !paused && nearItem && (
        <button className="nv-prompt" data-ui onClick={() => { input.interact = true }}><kbd>E</kbd><span><b>PRESS E TO INTERACT</b><small>{nearItem.label}</small></span></button>
      )}
      {!touch && help && !c && !paused && (
        <div className="nv-help" role="note"><b>Controls</b><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><span><kbd>Shift</kbd> run</span><span>drag mouse · look</span><span>wheel · zoom</span><span><kbd>E</kbd> interact</span><span><kbd>Esc</kbd> pause</span></div>
      )}
      {c && (
        <div className="nv-card" role="dialog" aria-modal="true" aria-label={c.title}>
          <h3>{c.title}</h3>{c.body.map((p, i) => <p key={i}>{p}</p>)}
          <button className="nv-btn" onClick={onCloseCard} autoFocus>Close (Esc)</button>
        </div>
      )}
      {paused && !c && (
        <div className="nv-pause" role="dialog" aria-modal="true" aria-label="Paused">
          <h3>Paused</h3><p>{BRAND.questDisclaimer}</p>
          <div className="nv-row"><button className="nv-btn" onClick={onResume} autoFocus>Resume</button><a className="nv-btn ghost" href="/">Exit to {BRAND.name} portfolio</a></div>
        </div>
      )}
      {touch && !c && !paused && <TouchControls canInteract={!!nearItem} />}
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
