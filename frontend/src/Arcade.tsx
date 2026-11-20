import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ARCADE, track, useGame } from './game'
import { audio } from './audio'
import './arcade.css'

/* The Quest Arcade: three small games that live INSIDE the Quest interface (never over the portfolio).
   Each game pays XP once for clearing it and once more for a flawless run (see game.ts). Everything is
   keyboard-playable and uses only facts from Aiman's own CV / projects for its content. */

type GameId = (typeof ARCADE)[number]
export const GAMES: { id: GameId; title: string; tag: string; blurb: string; goal: string }[] = [
  { id: 'orb', title: 'Orb Pop', tag: 'Reflex', blurb: 'A nod to her game Orb Rush: pop the glowing orbs before they fade.', goal: 'Pop 12 orbs in 20 s · flawless: 18' },
  { id: 'memory', title: 'Memory Match', tag: 'Memory', blurb: 'Match the pairs of tools and technologies from her skill set.', goal: 'Match all 6 pairs · flawless: 9 moves or fewer' },
  { id: 'quiz', title: 'Know Aiman', tag: 'Trivia', blurb: 'Five questions, every answer taken from her CV and projects.', goal: 'Get 3 of 5 · flawless: 5 of 5' },
]

/** Shown after a round: what was earned and how to continue. */
function Result({ title, line, cleared, perfect, onAgain, onExit }: { title: string; line: string; cleared: boolean; perfect: boolean; onAgain: () => void; onExit: () => void }) {
  return (
    <div className="arc-result" role="status">
      <h4>{title}</h4>
      <p className="mono">{line}</p>
      <p className="arc-badge">{perfect ? '★ Flawless run' : cleared ? '✓ Cleared' : 'Not cleared yet — give it another go'}</p>
      <div className="arc-actions">
        <button className="arc-btn" onClick={onAgain} autoFocus>Play again</button>
        <button className="arc-btn ghost" onClick={onExit}>All games</button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Orb Pop */
type Orb = { id: number; x: number; y: number; born: number; c: number }
const ORB_COLORS = ['#ff4a1c', '#ffc53d', '#4df3c8', '#a58bff', '#ff3d8b']
const ROUND_MS = 20000, ORB_LIFE = 1600, ORB_TARGET = 12, ORB_PERFECT = 18

function OrbPop({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [orbs, setOrbs] = useState<Orb[]>([])
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(ROUND_MS)
  const scoreRef = useRef(0)
  const idRef = useRef(0)

  const start = () => { scoreRef.current = 0; setScore(0); setOrbs([]); setLeft(ROUND_MS); setPhase('play') }

  useEffect(() => {
    if (phase !== 'play') return
    const t0 = performance.now()
    let lastSpawn = 0
    const iv = window.setInterval(() => {
      const now = performance.now(), el = now - t0
      if (el >= ROUND_MS) {
        window.clearInterval(iv)
        setOrbs([]); setLeft(0); setPhase('over')
        if (scoreRef.current >= ORB_TARGET) { track('game:orb:clear'); audio.chime() }
        if (scoreRef.current >= ORB_PERFECT) track('game:orb:perfect')
        return
      }
      setLeft(ROUND_MS - el)
      setOrbs((cur) => {
        let next = cur.filter((o) => now - o.born < ORB_LIFE)
        const gap = Math.max(420, 760 - el / 40) // speeds up through the round
        if (now - lastSpawn > gap && next.length < 5) {
          lastSpawn = now
          next = [...next, { id: ++idRef.current, x: 6 + Math.random() * 82, y: 8 + Math.random() * 76, born: now, c: Math.floor(Math.random() * ORB_COLORS.length) }]
        }
        return next
      })
    }, 80)
    return () => window.clearInterval(iv)
  }, [phase])

  const pop = useCallback((id: number) => {
    setOrbs((cur) => cur.filter((o) => o.id !== id))
    scoreRef.current += 1
    setScore(scoreRef.current)
    audio.tick()
  }, [])
  const popOldest = () => setOrbs((cur) => {
    if (!cur.length) return cur
    const o = [...cur].sort((a, b) => a.born - b.born)[0]
    scoreRef.current += 1; setScore(scoreRef.current); audio.tick()
    return cur.filter((x) => x.id !== o.id)
  })

  if (phase === 'over') {
    return <Result title="Time!" line={`You popped ${score} orbs (goal ${ORB_TARGET}).`} cleared={score >= ORB_TARGET} perfect={score >= ORB_PERFECT} onAgain={start} onExit={onExit} />
  }
  return (
    <div>
      <div className="arc-hud mono"><span>Score <b>{score}</b> / {ORB_TARGET}</span><span>{(left / 1000).toFixed(1)} s</span></div>
      <div className="arc-bar" aria-hidden="true"><i style={{ width: `${(left / ROUND_MS) * 100}%` }} /></div>
      <div className="arc-arena" tabIndex={0} aria-label="Orb Pop arena. Click an orb, or press Space to pop the oldest orb."
        onKeyDown={(e) => { if (phase === 'play' && (e.key === ' ' || e.key === 'Enter') && e.target === e.currentTarget) { e.preventDefault(); popOldest() } }}>
        {phase === 'ready' && (
          <div className="arc-ready">
            <p>Orbs flash up and fade fast. Click them — or press <kbd>Space</kbd> to pop the oldest one.</p>
            <button className="arc-btn" onClick={start} autoFocus>Start</button>
          </div>
        )}
        {orbs.map((o) => (
          <button key={o.id} className="arc-orb" aria-label="Pop orb" style={{ left: `${o.x}%`, top: `${o.y}%`, ['--c' as string]: ORB_COLORS[o.c] }} onClick={() => pop(o.id)} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- Memory Match */
const TECH = ['Unity', 'Unreal Engine 5', 'Three.js', 'Blender', 'After Effects', 'OpenCV']
type Card = { key: number; label: string; open: boolean; done: boolean }
const shuffled = () => {
  const a = [...TECH, ...TECH].map((label, key) => ({ key, label, open: false, done: false }))
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a as Card[]
}
const MEM_PERFECT = 9

function MemoryMatch({ onExit }: { onExit: () => void }) {
  const [cards, setCards] = useState<Card[]>(shuffled)
  const [moves, setMoves] = useState(0)
  const [first, setFirst] = useState<number | null>(null)
  const [lock, setLock] = useState(false)
  const timer = useRef<number>(0)
  const finished = cards.every((c) => c.done)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!finished) return
    track('game:memory:clear'); audio.chime()
    if (moves <= MEM_PERFECT) track('game:memory:perfect')
  }, [finished, moves])

  const flip = (i: number) => {
    if (lock || cards[i].open || cards[i].done) return
    audio.tick()
    const c = cards.map((x, k) => (k === i ? { ...x, open: true } : x))
    if (first === null) { setCards(c); setFirst(i); return }
    setMoves((m) => m + 1)
    if (c[first].label === c[i].label) {
      setCards(c.map((x, k) => (k === i || k === first ? { ...x, done: true } : x)))
      setFirst(null); audio.select()
    } else {
      setCards(c); setLock(true)
      timer.current = window.setTimeout(() => { setCards((cur) => cur.map((x, k) => (k === i || k === first ? { ...x, open: false } : x))); setFirst(null); setLock(false) }, 750)
    }
  }
  const again = () => { setCards(shuffled()); setMoves(0); setFirst(null); setLock(false) }

  if (finished) {
    return <Result title="All pairs found!" line={`Finished in ${moves} moves (flawless is ${MEM_PERFECT} or fewer).`} cleared perfect={moves <= MEM_PERFECT} onAgain={again} onExit={onExit} />
  }
  return (
    <div>
      <div className="arc-hud mono"><span>Moves <b>{moves}</b></span><span>Pairs {cards.filter((c) => c.done).length / 2} / {TECH.length}</span></div>
      <div className="arc-cards">
        {cards.map((c, i) => (
          <button key={c.key} className={'arc-card' + (c.open || c.done ? ' up' : '') + (c.done ? ' done' : '')} onClick={() => flip(i)}
            aria-label={c.open || c.done ? c.label : 'Hidden card'} aria-pressed={c.open || c.done}>
            <span>{c.open || c.done ? c.label : '?'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Know Aiman */
// Every correct answer below is stated in her CV / project notes. Wrong options are plausible distractors only.
const QUIZ: { q: string; a: string[]; ok: number }[] = [
  { q: 'Where did Aiman complete her 1-month internship?', a: ['KDA IT Department', 'A game studio in Lahore', 'NED University library'], ok: 0 },
  { q: 'Which university does she study at?', a: ['NED University of Engineering & Technology', 'LUMS', 'FAST-NUCES'], ok: 0 },
  { q: 'What did she score in matriculation?', a: ['91.5%', '98.3%', '95.0%'], ok: 1 },
  { q: 'Which stack powers her 3D arcade game Orb Rush?', a: ['Three.js, Express and MongoDB Atlas', 'Unity and Firebase', 'Unreal Engine 5 and SQL'], ok: 0 },
  { q: 'Which competition did she win?', a: ['A national hackathon', 'All-Pakistan Speech Competition', 'A robotics league'], ok: 1 },
]

function Quiz({ onExit }: { onExit: () => void }) {
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const q = QUIZ[i]

  const answer = (k: number) => {
    if (pick !== null) return
    setPick(k)
    if (k === q.ok) { setScore((s) => s + 1); audio.select() } else audio.tick()
  }
  const next = () => {
    if (i + 1 < QUIZ.length) { setI(i + 1); setPick(null); return }
    setOver(true)
    if (score >= 3) { track('game:quiz:clear'); audio.chime() }
    if (score >= QUIZ.length) track('game:quiz:perfect')
  }
  const again = () => { setI(0); setScore(0); setPick(null); setOver(false) }

  if (over) return <Result title="Quiz complete" line={`You answered ${score} of ${QUIZ.length} correctly.`} cleared={score >= 3} perfect={score === QUIZ.length} onAgain={again} onExit={onExit} />
  return (
    <div>
      <div className="arc-hud mono"><span>Question <b>{i + 1}</b> / {QUIZ.length}</span><span>Correct {score}</span></div>
      <h4 className="arc-q">{q.q}</h4>
      <div className="arc-opts" role="group" aria-label="Answers">
        {q.a.map((t, k) => (
          <button key={t} className={'arc-opt' + (pick !== null ? (k === q.ok ? ' ok' : k === pick ? ' bad' : '') : '')} onClick={() => answer(k)} disabled={pick !== null && k !== pick && k !== q.ok}>{t}</button>
        ))}
      </div>
      {pick !== null && (
        <p className="arc-fb mono" role="status">{pick === q.ok ? 'Correct!' : `Not quite — it's “${q.a[q.ok]}”.`}</p>
      )}
      {pick !== null && <button className="arc-btn" onClick={next} autoFocus>{i + 1 < QUIZ.length ? 'Next question' : 'See result'}</button>}
    </div>
  )
}

/* --------------------------------------------------------------------- Hub */
export function Arcade() {
  const g = useGame()
  const [active, setActive] = useState<GameId | null>(null)
  const game = useMemo(() => GAMES.find((x) => x.id === active), [active])
  const exit = useCallback(() => setActive(null), [])

  if (game) {
    return (
      <section className="arc-play" aria-label={game.title}>
        <button className="arc-back mono" onClick={exit}>← All games</button>
        <h3>{game.title} <span className="mono">{game.tag}</span></h3>
        <p className="mono arc-goal">{game.goal}</p>
        {game.id === 'orb' && <OrbPop onExit={exit} />}
        {game.id === 'memory' && <MemoryMatch onExit={exit} />}
        {game.id === 'quiz' && <Quiz onExit={exit} />}
      </section>
    )
  }
  return (
    <section aria-label="Mini-games">
      <p className="mono arc-intro">Three quick games. Clear one for 20 XP, play it flawlessly for 15 more. Optional, fun, and nothing leaves your browser.</p>
      <ul className="arc-grid">
        {GAMES.map((x) => {
          const cleared = g.events.has(`game:${x.id}:clear`), perfect = g.events.has(`game:${x.id}:perfect`)
          return (
            <li key={x.id} className={cleared ? 'cleared' : ''}>
              <p className="mono arc-tag">{x.tag}</p>
              <h3>{x.title}</h3>
              <p>{x.blurb}</p>
              <p className="mono arc-goal">{x.goal}</p>
              <p className="mono arc-status">{perfect ? '★ Flawless' : cleared ? '✓ Cleared' : 'Not cleared yet'}</p>
              <button className="arc-btn" onClick={() => setActive(x.id)}>{cleared ? 'Play again' : 'Play'}</button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
