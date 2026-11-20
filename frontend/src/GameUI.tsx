import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useGame, useHud } from './game'
import { STATIONS, StationGame, type StationId } from './QuestGames'
import { ProgressPanel } from './ProgressPanel'
import { BRAND } from './brand'

// The 3D world is a separate chunk: it is only downloaded when a visitor opens Quest.
const QuestWorld = lazy(() => import('./QuestWorld'))

/** Header button: level + XP bar. Opens the Quest World. */
export function QuestButton({ onOpen }: { onOpen: () => void }) {
  const g = useGame()
  const hud = useHud()
  const span = g.nextXp ? g.nextXp - g.levelFrom : 1
  const pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  return (
    <button className="qbtn" onClick={onOpen} aria-label={`Open the Quest World. Level ${g.level + 1}, ${g.xp} XP`}>
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

/** Fallback when WebGL is unavailable: the same four games and the same progress, as a plain page. */
function QuestMenu({ onClose }: { onClose: () => void }) {
  const g = useGame()
  const [game, setGame] = useState<StationId | null>(null)
  useEffect(() => {
    const esc = () => { if (game) setGame(null); else onClose() }
    window.addEventListener('quest:escape', esc)
    return () => window.removeEventListener('quest:escape', esc)
  }, [game, onClose])
  const s = STATIONS.find((x) => x.id === game)
  return (
    <div className="qm" data-lenis-prevent>
      <header><p className="mono">{BRAND.name} QUEST</p><button className="mono" onClick={onClose} autoFocus>Close ✕</button></header>
      <p className="note mono">Your browser can’t show the 3D Quest World, so here are the four games as a simple list.</p>
      {s ? (
        <section className="qm-game" style={{ ['--c' as string]: s.color }}>
          <button className="mono qm-back" onClick={() => setGame(null)}>← All games</button>
          <h3>{s.title}</h3><p>{s.blurb}</p><p className="mono">{s.goal}</p>
          <StationGame key={s.id} id={s.id} onExit={() => setGame(null)} />
        </section>
      ) : (
        <ul className="qw-stations">
          {STATIONS.map((x) => (
            <li key={x.id} style={{ ['--c' as string]: x.color }}>
              <p className="mono">{x.tag}</p><h3>{x.title}</h3><p>{x.blurb}</p><p className="mono g">{x.goal}</p>
              <p className="mono st">{g.events.has(`game:${x.id}:perfect`) ? '★ Flawless' : g.events.has(`game:${x.id}:clear`) ? '✓ Cleared' : 'Not cleared yet'}</p>
              <button className="qg-btn" onClick={() => setGame(x.id)}>Play</button>
            </li>
          ))}
        </ul>
      )}
      {!s && <ProgressPanel />}
    </div>
  )
}

const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }

/** The Quest interface: a separate full-screen 3D world. Nothing from it ever overlays the portfolio. */
export function Dashboard({ onClose }: { onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const gl = useMemo(hasWebGL, [])
  useEffect(() => {
    const d = dlg.current!
    d.showModal()
    // Escape is handled by the content (it first closes a game / panel, and only then the whole Quest)
    const cancel = (e: Event) => { e.preventDefault(); window.dispatchEvent(new Event('quest:escape')) }
    d.addEventListener('cancel', cancel)
    return () => { d.removeEventListener('cancel', cancel); d.close() }
  }, [])
  return (
    <dialog ref={dlg} className="questworld" aria-label={`${BRAND.name} Quest World`}>
      {gl ? (
        <Suspense fallback={<div className="qw-loading mono">Loading the Quest World…</div>}>
          <QuestWorld onClose={onClose} />
        </Suspense>
      ) : <QuestMenu onClose={onClose} />}
    </dialog>
  )
}
