import { useState } from 'react'
import { LEVELS, resetProgress, setHud, useGame, useHud } from './game'

function Hex({ glyph, color, on }: { glyph: string; color: string; on: boolean }) {
  return (
    <svg viewBox="0 0 64 72" className={'hex' + (on ? ' on' : '')} aria-hidden="true">
      <polygon points="32,3 61,19 61,53 32,69 3,53 3,19" fill={on ? color : 'none'} fillOpacity={on ? 0.16 : 0} stroke={on ? color : '#5a5c66'} strokeWidth="2.5" />
      <text x="32" y="43" textAnchor="middle" fontFamily="Bricolage,sans-serif" fontWeight="800" fontSize="20" fill={on ? color : '#5a5c66'}>{on ? glyph : '?'}</text>
    </svg>
  )
}

/** Level, exploration, quests, badges and reset — shown in a side panel inside the Quest World. */
export function ProgressPanel() {
  const g = useGame()
  const hud = useHud()
  const [confirm, setConfirm] = useState(false)
  const span = g.nextXp ? g.nextXp - g.levelFrom : 1
  const pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  const doneQ = g.quests.filter((q) => q.done).length
  const earned = g.badges.filter((b) => b.earned).length
  return (
    <div className="pp">
      <h2 id="pp-title">{g.levelName}</h2>
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
  )
}
