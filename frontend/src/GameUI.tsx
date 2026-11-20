import { useEffect, useRef, useState } from 'react'
import { BADGES, LEVELS, resetProgress, setHud, useGame, useHud, useToasts } from './game'
import { audio } from './audio'

/** Header button: level + XP bar. Opens the dashboard. */
export function QuestButton({ onOpen }: { onOpen: () => void }) {
  const g = useGame()
  const hud = useHud()
  const span = g.nextXp ? g.nextXp - g.levelFrom : 1
  const pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  return (
    <button className="qbtn" onClick={onOpen} aria-label={`Open Quest dashboard. Level ${g.level + 1}, ${g.xp} XP`}>
      {hud ? (
        <>
          <span className="qlvl">LVL {g.level + 1}</span>
          <span className="qbar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
          <span>{g.xp} XP</span>
        </>
      ) : (
        <span>Quest</span>
      )}
    </button>
  )
}

/** Live-region toasts for XP, quests, badges and level-ups. */
export function Toasts() {
  const t = useToasts()
  const last = useRef(0)
  useEffect(() => {
    const n = t[t.length - 1]
    if (n && n.id !== last.current) {
      last.current = n.id
      if (n.kind === 'level') audio.chime()
      else if (n.kind === 'quest' || n.kind === 'badge') audio.select()
      else audio.tick()
    }
  }, [t])
  return (
    <div className="toasts" role="status" aria-live="polite">
      {t.map((x) => (
        <div key={x.id} className={`toast ${x.kind}`}>
          <b>{x.text}</b>
          {x.sub && <span className="mono">{x.sub}</span>}
        </div>
      ))}
    </div>
  )
}

function Hex({ glyph, color, on }: { glyph: string; color: string; on: boolean }) {
  return (
    <svg viewBox="0 0 64 72" className={'hex' + (on ? ' on' : '')} aria-hidden="true">
      <polygon points="32,3 61,19 61,53 32,69 3,53 3,19" fill={on ? color : 'none'} fillOpacity={on ? 0.16 : 0} stroke={on ? color : '#5a5c66'} strokeWidth="2.5" />
      <text x="32" y="43" textAnchor="middle" fontFamily="Bricolage,sans-serif" fontWeight="800" fontSize="20" fill={on ? color : '#5a5c66'}>{on ? glyph : '?'}</text>
    </svg>
  )
}

/** Exploration dashboard: level, quests, badges, progress, reset. */
export function Dashboard({ onClose }: { onClose: () => void }) {
  const g = useGame()
  const hud = useHud()
  const dlg = useRef<HTMLDialogElement>(null)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    const d = dlg.current!
    d.showModal()
    const cancel = (e: Event) => { e.preventDefault(); onClose() }
    d.addEventListener('cancel', cancel)
    return () => { d.removeEventListener('cancel', cancel); d.close() }
  }, [onClose])
  const span = g.nextXp ? g.nextXp - g.levelFrom : 1
  const pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  const doneQ = g.quests.filter((q) => q.done).length
  const earned = g.badges.filter((b) => b.earned).length

  return (
    <dialog ref={dlg} className="quest" aria-labelledby="quest-title" onClick={(e) => e.target === dlg.current && onClose()}>
      <div className="quest-in" data-lenis-prevent>
        <header>
          <p className="mono">AIMANVERSE QUEST — Explore. Discover. Unlock.</p>
          <button className="mono" onClick={onClose} autoFocus>Close ✕</button>
        </header>
        <h2 id="quest-title">{g.levelName}</h2>
        <p className="mono sub">Level {g.level + 1} of {LEVELS.length} · {g.xp} XP{g.nextXp ? ` · ${g.nextXp - g.xp} XP to ${LEVELS[g.level + 1].name}` : ' · maximum level reached'}</p>
        <div className="xbar" role="progressbar" aria-label="Progress to next level" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <p className="note mono">Optional. Everything on this site is open to you whether or not you play. Progress is saved only in this browser — no account, nothing is sent anywhere.</p>

        <h3>Exploration — {g.exploration}%</h3>
        <ul className="parts">
          {g.parts.map((p) => (
            <li key={p.label}><span className="mono">{p.label}</span><b className="mono">{p.have}/{p.of}</b><div className="xbar sm"><i style={{ width: `${(p.have / p.of) * 100}%` }} /></div></li>
          ))}
        </ul>

        <h3>Quests — {doneQ}/{g.quests.length}</h3>
        <ul className="qlist">
          {g.quests.map((q) => (
            <li key={q.id} className={q.done ? 'done' : ''}>
              <div className="qh"><b>{q.title}</b><span className="mono">{q.done ? '✓ done' : `${q.value}/${q.goal}`} · {q.xp} XP</span></div>
              <p>{q.desc}</p>
              <div className="xbar sm"><i style={{ width: `${(q.value / q.goal) * 100}%` }} /></div>
            </li>
          ))}
        </ul>

        <h3>Badges — {earned}/{g.badges.length}</h3>
        <ul className="badges">
          {g.badges.map((b) => (
            <li key={b.id} className={b.earned ? 'on' : ''}>
              <Hex glyph={b.glyph} color={b.color} on={b.earned} />
              <b>{b.title}</b>
              <span className="mono">{b.earned ? 'Unlocked' : b.how}</span>
            </li>
          ))}
        </ul>

        <footer>
          <label className="mono"><input type="checkbox" checked={hud} onChange={(e) => setHud(e.target.checked)} /> Show XP bar in the header</label>
          {confirm ? (
            <span className="confirm">
              <span className="mono">Erase all progress?</span>
              <button className="mono danger" onClick={() => { resetProgress(); setConfirm(false) }}>Yes, reset</button>
              <button className="mono" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
          ) : (
            <button className="mono" onClick={() => setConfirm(true)}>Reset progress</button>
          )}
        </footer>
      </div>
    </dialog>
  )
}
