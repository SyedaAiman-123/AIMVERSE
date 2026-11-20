import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ARCADE, track } from './game'
import { audio } from './audio'

/* The four station games of the Quest World. Each belongs to one object in the 3D environment and is built around
   something Aiman really does: GLSL shaders (CYBERVERSE), After Effects keyframing, Blender lighting, and the RAG
   retrieval behind "Ask Aiman AI". Clearing a game pays XP once, a flawless run pays a bonus once (see game.ts).
   Every game is playable with keyboard or pointer. All facts used are from her CV / project notes. */

export type StationId = (typeof ARCADE)[number]
export const STATIONS: { id: StationId; title: string; tag: string; object: string; blurb: string; goal: string; color: string }[] = [
  { id: 'portal', title: 'Portal Tuner', tag: 'CYBERVERSE · GLSL', object: 'the glowing portal', blurb: 'Tune the portal shader — rings, arms and spin — until your portal matches the target pattern.', goal: 'Match 2 of 3 portals · flawless: all 3, no wrong lock-ins', color: '#4DF3C8' },
  { id: 'keyframe', title: 'Keyframe Rhythm', tag: 'After Effects', object: 'the clapperboard', blurb: 'The playhead sweeps the timeline. Drop a keyframe exactly as it crosses each diamond and watch your layer animate.', goal: 'Hit 5 of 8 keyframes · flawless: all 8', color: '#FF3D8B' },
  { id: 'light', title: 'Three-Point Light', tag: 'Blender · lighting', object: 'the light rig', blurb: 'Read the director’s brief and place the key, fill and rim lights around the head to light the shot.', goal: 'Light 2 of 3 briefs · flawless: all 3, first try, tight angles', color: '#FFC53D' },
  { id: 'radar', title: 'Retrieval Radar', tag: 'Ask Aiman AI · RAG', object: 'the radar dish', blurb: 'A question lands on the radar. Pick the document chunks the AI should retrieve — and leave the lookalikes behind.', goal: 'Retrieve well on 2 of 3 questions · flawless: all 3 perfect', color: '#A58BFF' },
]

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

function Result({ title, line, cleared, perfect, onAgain, onExit }: { title: string; line: string; cleared: boolean; perfect: boolean; onAgain: () => void; onExit: () => void }) {
  return (
    <div className="qg-result" role="status">
      <h4>{title}</h4>
      <p className="mono">{line}</p>
      <p className="qg-badge">{perfect ? '★ Flawless — bonus XP earned' : cleared ? '✓ Cleared — XP earned' : 'Not cleared yet — try again'}</p>
      <div className="qg-actions">
        <button className="qg-btn" onClick={onAgain} autoFocus>Play again</button>
        <button className="qg-btn ghost" onClick={onExit}>Back to the world</button>
      </div>
    </div>
  )
}

/* ============================================================ 1. Portal Tuner */
const PW = 120 // pixel-canvas resolution (CSS scales it up)
type Portal = { rings: number; arms: number; spin: number }
const TARGETS = (): Portal[] => {
  const out: Portal[] = []
  while (out.length < 3) {
    const t = { rings: rnd(2, 9), arms: rnd(1, 6), spin: rnd(-2, 2) }
    if (!out.some((o) => o.rings === t.rings && o.arms === t.arms && o.spin === t.spin)) out.push(t)
  }
  return out
}
const POLAR = (() => {
  const r = new Float32Array(PW * PW), th = new Float32Array(PW * PW)
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    const dx = (x + 0.5 - PW / 2) / (PW / 2), dy = (y + 0.5 - PW / 2) / (PW / 2)
    r[y * PW + x] = Math.hypot(dx, dy); th[y * PW + x] = Math.atan2(dy, dx)
  }
  return { r, th }
})()

/** The same maths as a GLSL fragment shader: rings * sin(2πfr) + arms * θ, scrolling with time. */
function PortalCanvas({ p, label }: { p: Portal; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pr = useRef(p); pr.current = p
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!
    const img = ctx.createImageData(PW, PW)
    let raf = 0
    const draw = (ms: number) => {
      const { rings, arms, spin } = pr.current, t = ms / 1000, d = img.data
      for (let i = 0; i < PW * PW; i++) {
        const r = POLAR.r[i], th = POLAR.th[i], o = i * 4
        if (r > 1) { d[o + 3] = 0; continue }
        const v = 0.5 + 0.5 * Math.sin(rings * Math.PI * 2 * r * 0.9 - t * 2.2 + arms * th + spin * t * 1.3)
        const g = Math.pow(v, 2.2) * (1 - r * r * 0.55), edge = clamp((1 - r) * 12, 0, 1)
        d[o] = 20 + 230 * g * g; d[o + 1] = 30 + 240 * g; d[o + 2] = 70 + 185 * Math.sqrt(g); d[o + 3] = 255 * edge
      }
      ctx.putImageData(img, 0, 0)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} width={PW} height={PW} className="qg-portal" role="img" aria-label={label} />
}

function PortalTuner({ onExit }: { onExit: () => void }) {
  const [targets, setTargets] = useState(TARGETS)
  const [round, setRound] = useState(0)
  const [mine, setMine] = useState<Portal>({ rings: 5, arms: 3, spin: 0 })
  const [left, setLeft] = useState(30)
  const [solved, setSolved] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [msg, setMsg] = useState('')
  const [over, setOver] = useState(false)
  const t = targets[round]
  const advance = useCallback((won: boolean, wrongNow: number, solvedNow: number) => {
    if (round + 1 < targets.length) { setRound(round + 1); setLeft(30); setMsg(won ? 'Locked! Next portal…' : 'Out of time — next portal…'); return }
    setOver(true)
    if (solvedNow >= 2) { track('game:portal:clear'); audio.chime() }
    if (solvedNow === 3 && wrongNow === 0) track('game:portal:perfect')
  }, [round, targets.length])

  useEffect(() => {
    if (over) return
    const iv = window.setInterval(() => setLeft((l) => l - 1), 1000)
    return () => window.clearInterval(iv)
  }, [over, round])
  useEffect(() => { if (left <= 0 && !over) advance(false, wrong, solved) }, [left]) // eslint-disable-line react-hooks/exhaustive-deps

  const lock = () => {
    if (mine.rings === t.rings && mine.arms === t.arms && mine.spin === t.spin) {
      audio.select(); setSolved(solved + 1); advance(true, wrong, solved + 1)
    } else { audio.tick(); setWrong(wrong + 1); setMsg('The portal destabilises — not quite. Compare rings, arms and spin.') }
  }
  const again = () => { setTargets(TARGETS()); setRound(0); setLeft(30); setSolved(0); setWrong(0); setMsg(''); setOver(false) }
  const dial = (key: keyof Portal, label: string, min: number, max: number) => (
    <label className="qg-dial"><span className="mono">{label} <b>{mine[key]}</b></span>
      <input type="range" min={min} max={max} step={1} value={mine[key]} onChange={(e) => setMine({ ...mine, [key]: +e.target.value })} /></label>
  )

  if (over) return <Result title="Portal sequence ended" line={`${solved} of 3 portals matched · ${wrong} wrong lock-in${wrong === 1 ? '' : 's'}.`} cleared={solved >= 2} perfect={solved === 3 && wrong === 0} onAgain={again} onExit={onExit} />
  return (
    <div>
      <div className="qg-hud mono"><span>Portal <b>{round + 1}</b> / 3</span><span>Matched {solved}</span><span>{left}s</span></div>
      <div className="qg-pair">
        <figure><PortalCanvas p={t} label="Target portal" /><figcaption className="mono">Target</figcaption></figure>
        <figure><PortalCanvas p={mine} label="Your portal" /><figcaption className="mono">Yours</figcaption></figure>
      </div>
      <div className="qg-dials">{dial('rings', 'Rings', 2, 9)}{dial('arms', 'Arms', 1, 6)}{dial('spin', 'Spin', -2, 2)}</div>
      <div className="qg-actions"><button className="qg-btn" onClick={lock}>Lock in portal</button></div>
      <p className="qg-fb mono" role="status">{msg}</p>
    </div>
  )
}

/* ========================================================== 2. Keyframe Rhythm */
const BEAT = 600 // ms (100 BPM)
const LEAD = 2 // countdown beats
const KEYS = [0, 1, 2, 3, 3.5, 4.5, 5, 6.5] // keyframe positions in beats after the countdown
const SPAN = 8 // timeline length in beats
const PERFECT = 95, GOOD = 190 // ms windows
const POS: [number, number, number][] = [[12, 70, 0.8], [30, 25, 1.1], [50, 70, 0.7], [70, 28, 1.2], [84, 62, 0.9], [60, 45, 1.3], [35, 60, 0.8], [50, 38, 1.4]]

function KeyframeRhythm({ onExit }: { onExit: () => void }) {
  const [run, setRun] = useState<'ready' | 'play' | 'over'>('ready')
  const [now, setNow] = useState(0) // ms since start
  const [res, setRes] = useState<('perfect' | 'good' | 'miss' | null)[]>(() => KEYS.map(() => null))
  const resRef = useRef(res); resRef.current = res
  const t0 = useRef(0)
  const lastBeat = useRef(-1)

  const settle = useCallback((r: ('perfect' | 'good' | 'miss' | null)[]) => {
    setRun('over')
    const hits = r.filter((x) => x === 'perfect' || x === 'good').length
    if (hits >= 5) { track('game:keyframe:clear'); audio.chime() }
    if (hits === KEYS.length) track('game:keyframe:perfect')
  }, [])

  useEffect(() => {
    if (run !== 'play') return
    let raf = 0
    const loop = () => {
      const ms = performance.now() - t0.current
      setNow(ms)
      const beat = Math.floor(ms / BEAT)
      if (beat !== lastBeat.current && beat >= 0) { lastBeat.current = beat; audio.tick() }
      // anything the playhead has passed by more than the GOOD window is a miss
      const upd = resRef.current.map((x, i) => (x === null && ms - (LEAD + KEYS[i]) * BEAT > GOOD ? 'miss' as const : x))
      if (upd.some((x, i) => x !== resRef.current[i])) setRes(upd)
      if (ms > (LEAD + SPAN) * BEAT + 400) { settle(upd); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [run, settle])

  const start = () => { setRes(KEYS.map(() => null)); lastBeat.current = -1; t0.current = performance.now(); setNow(0); setRun('play') }
  const hit = useCallback(() => {
    if (run !== 'play') return
    const ms = performance.now() - t0.current
    let best = -1, bd = 1e9
    resRef.current.forEach((x, i) => { const d = Math.abs(ms - (LEAD + KEYS[i]) * BEAT); if (x === null && d < bd) { bd = d; best = i } })
    if (best < 0 || bd > GOOD + 60) return
    const next = resRef.current.slice(); next[best] = bd <= PERFECT ? 'perfect' : bd <= GOOD ? 'good' : 'miss'
    setRes(next); audio.select()
  }, [run])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Space' && run === 'play') { e.preventDefault(); e.stopPropagation(); hit() } }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [hit, run])

  const head = clamp(((now / BEAT) - LEAD) / SPAN, -0.25, 1.05)
  const countdown = run === 'play' && now < LEAD * BEAT ? Math.ceil(LEAD - now / BEAT) : 0
  // the layer follows the keyframes you actually landed (misses leave it stuck — just like missing keys in AE)
  const layer = useMemo(() => {
    const beats = (now / BEAT) - LEAD
    let from = POS[0], to = POS[0], f = 0
    const landed = KEYS.map((k, i) => ({ k, i })).filter(({ i }) => res[i] === 'perfect' || res[i] === 'good')
    const prev = landed.filter(({ k }) => k <= beats).pop(), nxt = landed.find(({ k }) => k > beats)
    if (prev) from = POS[prev.i]
    if (nxt) { to = POS[nxt.i]; f = prev ? (beats - prev.k) / (nxt.k - prev.k) : 0 } else to = from
    const e = f * f * (3 - 2 * f)
    return [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e]
  }, [now, res])

  if (run === 'over') {
    const hits = res.filter((x) => x === 'perfect' || x === 'good').length, perf = res.filter((x) => x === 'perfect').length
    return <Result title="That’s a wrap" line={`${hits} of ${KEYS.length} keyframes landed (${perf} perfect).`} cleared={hits >= 5} perfect={hits === KEYS.length} onAgain={start} onExit={onExit} />
  }
  return (
    <div>
      <div className="qg-hud mono"><span>Keyframes <b>{res.filter((x) => x === 'perfect' || x === 'good').length}</b> / {KEYS.length}</span><span>{run === 'play' ? 'Space = set keyframe' : ''}</span></div>
      <div className="qg-comp" aria-hidden="true">
        <div className="qg-layer" style={{ left: `${layer[0]}%`, top: `${layer[1]}%`, transform: `translate(-50%,-50%) scale(${layer[2]}) rotate(${(layer[0] - 50) * 0.5}deg)` }} />
        <span className="mono qg-comp-l">Composition viewer</span>
        {countdown > 0 && <span className="qg-count">{countdown}</span>}
      </div>
      <div className="qg-timeline" role="img" aria-label="Timeline with eight keyframe diamonds and a moving playhead">
        {KEYS.map((k, i) => (
          <i key={i} className={'qg-kf ' + (res[i] ?? '')} style={{ left: `${(k / SPAN) * 100}%` }} />
        ))}
        <b className="qg-playhead" style={{ left: `${clamp(head, 0, 1) * 100}%` }} />
      </div>
      <div className="qg-actions">
        {run === 'ready'
          ? <button className="qg-btn" onClick={start} autoFocus>Start (2-beat countdown)</button>
          : <button className="qg-btn" onPointerDown={(e) => { e.preventDefault(); hit() }}>Set keyframe</button>}
      </div>
      {run === 'ready' && <p className="qg-fb mono">Press <kbd>Space</kbd> or the button exactly when the playhead is on a diamond. A metronome ticks every beat.</p>}
    </div>
  )
}

/* ======================================================= 3. Three-Point Light */
type Brief = { name: string; text: string; key: number; fill: number; rim: number }
const BRIEFS: Brief[] = [
  { name: 'Heroic portrait', text: 'A warm key from the front-left, a soft cool fill on the opposite side, and a rim light from directly behind to separate her from the dark.', key: -45, fill: 55, rim: 180 },
  { name: 'Mystery noir', text: 'One hard key from the extreme right. Almost no fill — push it round behind the head — and a rim from behind-left.', key: 90, fill: 180, rim: -135 },
  { name: 'Soft beauty', text: 'Key almost frontal, just left of the camera. Fill almost frontal on the other side. A gentle rim from behind-right.', key: -20, fill: 25, rim: 150 },
]
const adiff = (a: number, b: number) => { const d = Math.abs((((a - b) % 360) + 540) % 360 - 180); return d }
const LIGHT_PX = 110

function Face({ key_, fill, rim }: { key_: number; fill: number; rim: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!, img = ctx.createImageData(LIGHT_PX, LIGHT_PX)
    const L = (a: number) => { const r = (a * Math.PI) / 180; const v = [Math.sin(r), 0.3, Math.cos(r)]; const m = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / m) }
    const lk = L(key_), lf = L(fill), lr = L(rim)
    for (let y = 0; y < LIGHT_PX; y++) for (let x = 0; x < LIGHT_PX; x++) {
      const nx = (x + 0.5 - LIGHT_PX / 2) / (LIGHT_PX / 2), ny = -(y + 0.5 - LIGHT_PX / 2) / (LIGHT_PX / 2), o = (y * LIGHT_PX + x) * 4
      const rr = nx * nx + ny * ny
      if (rr > 1) { img.data[o + 3] = 0; continue }
      const nz = Math.sqrt(1 - rr), d = (l: number[]) => Math.max(0, nx * l[0] + ny * l[1] + nz * l[2])
      const fres = Math.pow(1 - nz, 2.4)
      const k = d(lk) * 1.05, f = d(lf) * 0.4, rm = d(lr) * 0.5 + fres * Math.max(0, lr[2] * -1) * 1.6 * Math.max(0, nx * lr[0] + 0.2)
      img.data[o] = clamp(24 + 255 * (k * 1.0 + f * 0.7 + rm * 0.95), 0, 255)
      img.data[o + 1] = clamp(20 + 255 * (k * 0.78 + f * 0.85 + rm * 0.95), 0, 255)
      img.data[o + 2] = clamp(30 + 255 * (k * 0.55 + f * 1.0 + rm * 1.0), 0, 255)
      img.data[o + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, [key_, fill, rim])
  return <canvas ref={ref} width={LIGHT_PX} height={LIGHT_PX} className="qg-face" role="img" aria-label="Preview of the head lit by your three lights" />
}

function ThreePointLight({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState(0)
  const [a, setA] = useState({ key: 0, fill: 0, rim: 0 })
  const [tries, setTries] = useState(0)
  const [passed, setPassed] = useState(0)
  const [tight, setTight] = useState(0) // briefs nailed within ±15° on the first render
  const [msg, setMsg] = useState('')
  const [over, setOver] = useState(false)
  const b = BRIEFS[round]
  const finish = (p: number, t: number) => {
    setOver(true)
    if (p >= 2) { track('game:light:clear'); audio.chime() }
    if (p === 3 && t === 3) track('game:light:perfect')
  }
  const next = (p: number, t: number) => {
    if (round + 1 < BRIEFS.length) { setRound(round + 1); setTries(0); setA({ key: 0, fill: 0, rim: 0 }); setMsg(''); return }
    finish(p, t)
  }
  const render = () => {
    const dk = adiff(a.key, b.key), df = adiff(a.fill, b.fill), dr = adiff(a.rim, b.rim)
    const ok = dk <= 30 && df <= 30 && dr <= 30
    const tightOk = dk <= 15 && df <= 15 && dr <= 15
    const used = tries + 1
    if (ok) { audio.select(); const p = passed + 1, t = tight + (tightOk && used === 1 ? 1 : 0); setPassed(p); setTight(t); setMsg('Print it! That’s the shot.'); window.setTimeout(() => next(p, t), 700); return }
    audio.tick(); setTries(used)
    const worst = dk >= df && dk >= dr ? 'key' : df >= dr ? 'fill' : 'rim'
    if (used >= 3) { setMsg('Out of takes for this brief.'); window.setTimeout(() => next(passed, tight), 800); return }
    setMsg(`Not yet — the ${worst} light is furthest from what the brief asks. Take ${used + 1} of 3.`)
  }
  const again = () => { setRound(0); setTries(0); setPassed(0); setTight(0); setA({ key: 0, fill: 0, rim: 0 }); setMsg(''); setOver(false) }
  const lamp = (id: 'key' | 'fill' | 'rim', label: string, color: string) => (
    <label className="qg-dial"><span className="mono" style={{ color }}>{label} <b>{a[id]}°</b></span>
      <input type="range" min={-180} max={180} step={5} value={a[id]} onChange={(e) => setA({ ...a, [id]: +e.target.value })} aria-label={`${label} light angle`} /></label>
  )
  const pos = (deg: number, r: number) => { const t = (deg * Math.PI) / 180; return [60 + Math.sin(t) * r, 60 + Math.cos(t) * r] }

  if (over) return <Result title="Lights down" line={`${passed} of 3 briefs lit · ${tight} nailed first-take within 15°.`} cleared={passed >= 2} perfect={passed === 3 && tight === 3} onAgain={again} onExit={onExit} />
  return (
    <div>
      <div className="qg-hud mono"><span>Brief <b>{round + 1}</b> / 3 — {b.name}</span><span>Take {tries + 1} / 3</span></div>
      <p className="qg-brief">{b.text}</p>
      <p className="mono qg-hint">Angles: 0° is straight at the camera, −90° viewer’s left, +90° viewer’s right, ±180° directly behind her.</p>
      <div className="qg-pair">
        <svg viewBox="0 0 120 120" className="qg-rig" role="img" aria-label="Top-down lighting diagram">
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(236,231,219,.18)" strokeDasharray="2 3" />
          <circle cx="60" cy="60" r="9" fill="#2a2630" stroke="#ece7db" strokeWidth="1" />
          <path d="M55 112 L60 104 L65 112 Z" fill="#ece7db" /><text x="60" y="119" textAnchor="middle" fontSize="6" fill="#9a968c">CAMERA</text>
          {([['key', '#ffb15c', 'K'], ['fill', '#7ab8ff', 'F'], ['rim', '#ffffff', 'R']] as const).map(([id, c, l]) => { const [x, y] = pos(a[id], 44); return (
            <g key={id}><line x1="60" y1="60" x2={x} y2={y} stroke={c} strokeOpacity=".35" /><circle cx={x} cy={y} r="6.5" fill={c} /><text x={x} y={y + 2.4} textAnchor="middle" fontSize="7" fontWeight="800" fill="#0a0a0f">{l}</text></g>
          ) })}
        </svg>
        <figure><Face key_={a.key} fill={a.fill} rim={a.rim} /><figcaption className="mono">Preview</figcaption></figure>
      </div>
      <div className="qg-dials">{lamp('key', 'Key (warm)', '#ffb15c')}{lamp('fill', 'Fill (cool)', '#7ab8ff')}{lamp('rim', 'Rim (white)', '#ffffff')}</div>
      <div className="qg-actions"><button className="qg-btn" onClick={render}>Render this take</button></div>
      <p className="qg-fb mono" role="status">{msg}</p>
    </div>
  )
}

/* ========================================================== 4. Retrieval Radar */
type Chunk = { id: string; text: string; sim: number; good: boolean }
type Query = { q: string; chunks: Chunk[] }
// Every chunk is a TRUE statement from her CV / project notes — the game is about relevance, not about spotting falsehoods.
const QUERIES: Query[] = [
  { q: 'Which technologies power Orb Rush?', chunks: [
    { id: 'A', text: 'Orb Rush — built with Three.js, Vite, Node.js, Express and MongoDB Atlas.', sim: 0.91, good: true },
    { id: 'B', text: 'Orb Rush is a responsive, browser-based 3D arcade game and full-stack web application (2026).', sim: 0.84, good: true },
    { id: 'C', text: 'CYBERVERSE — a first-person 3D cybersecurity world with a custom GLSL portal shader.', sim: 0.66, good: false },
    { id: 'D', text: 'Experience — Intern, KDA IT Department (1 month).', sim: 0.31, good: false },
    { id: 'E', text: 'Achievement — All-Pakistan Speech Competition, Winner.', sim: 0.22, good: false },
  ] },
  { q: 'Where did Aiman do her internship?', chunks: [
    { id: 'A', text: 'Experience — Intern, KDA IT Department (1 month).', sim: 0.93, good: true },
    { id: 'B', text: 'CEGA training — Pre-Production, Unreal Engine Production, and Post-Production (After Effects & Motion).', sim: 0.71, good: false },
    { id: 'C', text: 'Education — BS Computer Science & IT, NED University of Engineering and Technology, 2023–Present.', sim: 0.58, good: false },
    { id: 'D', text: 'Orb Rush — built with Three.js, Vite, Node.js, Express and MongoDB Atlas.', sim: 0.27, good: false },
    { id: 'E', text: 'Achievement — All-Pakistan Speech Competition, Winner.', sim: 0.2, good: false },
  ] },
  { q: 'What did she score in matriculation?', chunks: [
    { id: 'A', text: 'Matriculation — 98.3%, Position Holder.', sim: 0.94, good: true },
    { id: 'B', text: 'Education — BS Computer Science & IT, NED University of Engineering and Technology, 2023–Present.', sim: 0.73, good: false },
    { id: 'C', text: 'Achievement — All-Pakistan Speech Competition, Winner.', sim: 0.52, good: false },
    { id: 'D', text: 'Experience — Intern, KDA IT Department (1 month).', sim: 0.34, good: false },
    { id: 'E', text: 'CYBERVERSE — a first-person 3D cybersecurity world with a custom GLSL portal shader.', sim: 0.18, good: false },
  ] },
]
// fixed bearings so the radar looks the same each time but not in list order
const BEARING = [38, 150, 262, 318, 205]

function RetrievalRadar({ onExit }: { onExit: () => void }) {
  const [qi, setQi] = useState(0)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [shown, setShown] = useState<{ f1: number; exact: boolean; picked: number } | null>(null)
  const [scores, setScores] = useState<{ f1: number; exact: boolean }[]>([])
  const [over, setOver] = useState(false)
  const q = QUERIES[qi]
  const toggle = (id: string) => { if (shown) return; audio.tick(); setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  const send = () => {
    const picked = q.chunks.filter((c) => sel.has(c.id)), good = q.chunks.filter((c) => c.good)
    const tp = picked.filter((c) => c.good).length
    const prec = picked.length ? tp / picked.length : 0, rec = tp / good.length
    const f1 = prec + rec ? (2 * prec * rec) / (prec + rec) : 0
    const r = { f1, exact: tp === good.length && picked.length === good.length }
    setShown({ ...r, picked: picked.length }); setScores([...scores, r]); r.exact ? audio.select() : audio.tick()
  }
  const next = () => {
    if (qi + 1 < QUERIES.length) { setQi(qi + 1); setSel(new Set()); setShown(null); return }
    setOver(true)
    const pass = scores.filter((s) => s.f1 >= 0.66).length
    if (pass >= 2) { track('game:radar:clear'); audio.chime() }
    if (scores.every((s) => s.exact)) track('game:radar:perfect')
  }
  const again = () => { setQi(0); setSel(new Set()); setShown(null); setScores([]); setOver(false) }

  if (over) {
    const pass = scores.filter((s) => s.f1 >= 0.66).length
    return <Result title="Radar report" line={`${pass} of 3 retrievals were good · ${scores.filter((s) => s.exact).length} perfect.`} cleared={pass >= 2} perfect={scores.every((s) => s.exact)} onAgain={again} onExit={onExit} />
  }
  return (
    <div>
      <div className="qg-hud mono"><span>Question <b>{qi + 1}</b> / 3</span><span>Selected {sel.size}</span></div>
      <h4 className="qg-q">“{q.q}”</h4>
      <p className="mono qg-hint">The closer a chunk sits to the centre, the more similar it looks to the question — but similar isn’t always relevant. Select the chunks the AI should retrieve.</p>
      <div className="qg-radar-wrap">
        <div className="qg-radar" aria-hidden={false}>
          <svg viewBox="-100 -100 200 200" className="qg-rings" aria-hidden="true">
            {[0.9, 0.7, 0.5, 0.3].map((s) => <circle key={s} r={(1 - s) * 125 + 8} fill="none" stroke="rgba(165,139,255,.25)" strokeDasharray="1 3" />)}
            {[0.9, 0.7, 0.5].map((s) => <text key={s} x={(1 - s) * 125 + 10} y="-2" fontSize="6" fill="#8d89a3">{s.toFixed(1)}</text>)}
            <line x1="0" y1="0" x2="0" y2="-100" stroke="rgba(165,139,255,.5)" className="qg-sweep" />
          </svg>
          <span className="qg-star" aria-hidden="true">★</span>
          {q.chunks.map((c, i) => {
            const r = (1 - c.sim) * 125 + 8, t = (BEARING[i] * Math.PI) / 180
            const on = sel.has(c.id), done = !!shown
            return (
              <button key={c.id} className={'qg-node' + (on ? ' on' : '') + (done ? (c.good ? ' good' : on ? ' bad' : '') : '')}
                style={{ left: `${50 + (Math.cos(t) * r) / 2.7}%`, top: `${50 + (Math.sin(t) * r) / 2.7}%` }}
                onClick={() => toggle(c.id)} aria-pressed={on} aria-label={`Chunk ${c.id}, similarity ${c.sim.toFixed(2)}: ${c.text}`}>{c.id}</button>
            )
          })}
        </div>
        <ul className="qg-chunks">
          {q.chunks.map((c) => {
            const on = sel.has(c.id)
            return (
              <li key={c.id}>
                <button className={'qg-chunk' + (on ? ' on' : '') + (shown ? (c.good ? ' good' : on ? ' bad' : '') : '')} onClick={() => toggle(c.id)} aria-pressed={on}>
                  <b>{c.id}</b><span>{c.text}</span><i className="mono">sim {c.sim.toFixed(2)}</i>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {shown ? (
        <div role="status">
          <p className="qg-fb mono">{shown.exact ? 'Perfect retrieval — the model has exactly the evidence it needs.' : shown.f1 >= 0.66 ? 'Good retrieval, but not perfect.' : 'Weak retrieval — the model would be guessing.'} (F1 {Math.round(shown.f1 * 100)}%) The correct chunks are highlighted green.</p>
          <div className="qg-actions"><button className="qg-btn" onClick={next} autoFocus>{qi + 1 < QUERIES.length ? 'Next question' : 'See report'}</button></div>
        </div>
      ) : (
        <div className="qg-actions"><button className="qg-btn" onClick={send} disabled={sel.size === 0}>Send to the model</button></div>
      )}
    </div>
  )
}

/* ============================================================ host panel */
export function StationGame({ id, onExit }: { id: StationId; onExit: () => void }): ReactNode {
  return id === 'portal' ? <PortalTuner onExit={onExit} /> : id === 'keyframe' ? <KeyframeRhythm onExit={onExit} /> : id === 'light' ? <ThreePointLight onExit={onExit} /> : <RetrievalRadar onExit={onExit} />
}
