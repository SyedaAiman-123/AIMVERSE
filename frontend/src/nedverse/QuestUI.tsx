import { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from './focus'
import { LEVELS, useQuests, type Derived } from './quests'

/* In-world quest UI: level chip, reward toasts (quest complete / level up / badge) and the quest journal (J). Exploration only. */

export function LevelChip() {
  const g = useQuests()
  const span = g.nextXp ? g.nextXp - g.levelFrom : 1, pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  return (
    <div className="nv-level" aria-label={`${g.label}, ${g.xp} XP`}>
      <b>{g.label}</b><span className="nv-xpbar" aria-hidden><i style={{ width: `${pct}%` }} /></span><small>{g.xp} XP{g.nextXp ? ` / ${g.nextXp}` : ' · max'}</small>
    </div>
  )
}

type Toast = { key: number; title: string; sub: string; color: string }
/** Shows a toast for every NEW quest completion, badge and level (never for progress that was already saved when the page opened). */
export function QuestToasts() {
  const g = useQuests()
  const prev = useRef<Derived>(g)
  const [list, setList] = useState<Toast[]>([])
  useEffect(() => {
    const p = prev.current; prev.current = g; if (p === g) return
    const add: Toast[] = []
    for (const q of g.quests) if (q.done && !p.quests.find((x) => x.id === q.id)?.done) add.push({ key: Math.random(), title: `Quest complete: ${q.title}`, sub: `+${q.xp} XP`, color: '#4DF3C8' })
    for (const b of g.badges) if (b.earned && !p.badges.find((x) => x.id === b.id)?.earned) add.push({ key: Math.random(), title: `Badge earned: ${b.title}`, sub: b.how, color: b.color })
    if (g.level > p.level) add.push({ key: Math.random(), title: g.label, sub: 'You levelled up!', color: '#FFC53D' })
    if (!add.length) return
    setList((l) => [...l, ...add].slice(-4))
    const t = window.setTimeout(() => setList((l) => l.filter((x) => !add.includes(x))), 5200)
    return () => window.clearTimeout(t)
  }, [g])
  return <div className="nv-toasts" role="status" aria-live="polite">{list.map((t) => <div key={t.key} className="nv-qtoast" style={{ borderColor: t.color }}><b style={{ color: t.color }}>{t.title}</b><span>{t.sub}</span></div>)}</div>
}

export function Journal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const g = useQuests()
  const [sure, setSure] = useState(false), box = useRef<HTMLDivElement>(null)
  useFocusTrap(box)
  const span = g.nextXp ? g.nextXp - g.levelFrom : 1, pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  return (
    <div ref={box} className="nv-card nv-stop nv-journal" role="dialog" aria-modal="true" aria-label="Quest journal">
      <small style={{ color: '#4DF3C8' }}>QUEST MODE · JOURNAL</small>
      <h3>{g.label}</h3>
      <div className="nv-xprow"><span className="nv-xpbar big" aria-hidden><i style={{ width: `${pct}%` }} /></span><span>{g.xp} XP{g.nextXp ? ` · next level at ${g.nextXp}` : ' · highest level'}</span></div>
      <div className="nv-scroll">
        <p className="nv-note">Exploration only: no timers, no enemies, nothing to lose. Every objective is listed here. Exploration progress: <b>{g.exploration}%</b></p>
        <section>
          <h4>Quests</h4>
          <ul className="nv-quests">{g.quests.map((q) => (
            <li key={q.id} className={q.done ? 'done' : ''}>
              <span className="tick" aria-hidden>{q.done ? '✓' : '○'}</span>
              <span className="qt"><b>{q.title}</b><em>{q.desc}</em><span className="nv-xpbar" aria-hidden><i style={{ width: `${(q.value / q.goal) * 100}%` }} /></span></span>
              <span className="qx">{q.value}/{q.goal}<small>{q.xp} XP</small></span>
            </li>))}
          </ul>
        </section>
        <section>
          <h4>Badges</h4>
          <div className="nv-badges">{g.badges.map((b) => <div key={b.id} className={b.earned ? 'earned' : ''} style={{ ['--c' as string]: b.color }} title={b.how}><i>{b.glyph}</i><b>{b.title}</b><small>{b.earned ? 'Earned' : b.how}</small></div>)}</div>
        </section>
        <section>
          <h4>Levels</h4>
          <ul className="nv-levels">{LEVELS.map((l, i) => <li key={l.name} className={i <= g.level ? 'on' : ''}>LEVEL {i + 1} · {l.name.toUpperCase()} <small>{l.xp} XP</small></li>)}</ul>
        </section>
      </div>
      <div className="nv-row">
        <button className="nv-btn" onClick={onClose} autoFocus>Close (J / Esc)</button>
        {sure ? <><button className="nv-btn ghost" onClick={() => { onReset(); setSure(false) }}>Yes, erase my progress</button><button className="nv-btn ghost" onClick={() => setSure(false)}>Cancel</button></> : <button className="nv-btn ghost" onClick={() => setSure(true)}>Reset progress…</button>}
      </div>
    </div>
  )
}
