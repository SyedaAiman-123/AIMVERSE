import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { World, type Quality } from './PrototypeScene'
import { Player, type Mode } from './Player'
import { TourStops } from './TourStops'
import { Motes } from './Effects'
import { audio } from './audio'
import { STOPS } from './tour'
import { PlayHud } from './PlayHud'
import { buildColliders } from './collision'
import { buildInteriorColliders, type Place, type RoomId } from './interiors'
const Interior = lazy(() => import('./InteriorScene'))   // interiors are only downloaded/mounted when you walk in
import { attachInput, input, resetInput, setInputEnabled } from './input'

/** Playable NEDVERSE prototype: the Phase 3 environment + the third-person player + minimal HUD. */
class Boundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() { return this.state.err ? <div style={{ color: '#fff', padding: 24, font: '14px monospace' }}>NEDVERSE could not start: {this.state.err}</div> : this.props.children }
}

export default function PlayScene({ touch }: { touch: boolean }) {
  const campusCols = useMemo(buildColliders, [])
  const [place, setPlace] = useState<Place>(() => { const p = new URLSearchParams(location.search).get('place'); return p === 'cs' || p === 'lib' || p === 'hall' ? p : 'campus' })
  const colliders = useMemo(() => (place === 'campus' ? campusCols : buildInteriorColliders(place as RoomId)), [place, campusCols])
  const [viewed, setViewed] = useState<ReadonlySet<string>>(() => { try { return new Set<string>(JSON.parse(localStorage.getItem('aimverse:nedverse:viewed') || '[]')) } catch { return new Set<string>() } })
  const wrap = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState<string | null>(null)
  const [card, setCard] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [mode, setMode] = useState<Mode>('foot')
  const [entered, setEntered] = useState(false)
  const [intro, setIntro] = useState(() => { const q = new URLSearchParams(location.search); return !(q.get('intro') === '0' || q.has('x') || q.has('z') || q.has('drive') || q.has('car') || q.has('place')) })
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => { try { return new Set<string>(JSON.parse(localStorage.getItem('aimverse:nedverse:tour') || '[]')) } catch { return new Set<string>() } })
  const nextStop = STOPS.find((s) => !visited.has(s.id)) ?? null, nextId = nextStop?.id ?? null
  const onEnter = useCallback(() => { setEntered(true); audio.unlock() }, [])
  // browsers only allow sound after a gesture: start the audio engine on the first key press / click / tap
  useEffect(() => { const go = () => audio.start(); window.addEventListener('keydown', go); window.addEventListener('pointerdown', go); return () => { window.removeEventListener('keydown', go); window.removeEventListener('pointerdown', go) } }, [])
  const modal = !!card || paused || intro
  // Low tier (phones, ?q=low): smaller shadow map, no bloom/SMAA, dpr 1. High tier otherwise (?q=high forces it).
  const qp = new URLSearchParams(location.search).get('q')
  const [forceLow, setForceLow] = useState(false)
  const quality: Quality = forceLow || qp === 'low' || (qp !== 'high' && (touch || (navigator.hardwareConcurrency || 8) <= 4)) ? 'low' : 'high'

  useEffect(() => { const off = attachInput(wrap.current!); return () => { off(); resetInput() } }, [])
  useEffect(() => { setInputEnabled(!modal) }, [modal])
  // adaptive quality: if the machine cannot hold ~24 fps after warm-up, drop to the light tier once (smaller shadows, no bloom/SMAA)
  useEffect(() => {
    if (qp) return
    let bad = 0; const iv = window.setInterval(() => { const f = window.__ned?.fps; if (!f) return; bad = f < 24 ? bad + 1 : 0; if (bad >= 3) { setForceLow(true); window.clearInterval(iv) } }, 2000)
    return () => window.clearInterval(iv)
  }, [qp])
  // Esc: close the card, else toggle pause. Polled via the input store so it works with every focus state.
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (!input.escape) return
      input.escape = false
      if (intro) setIntro(false); else if (card) setCard(null); else setPaused((p) => !p)
    }, 50)
    return () => window.clearInterval(iv)
  }, [card, intro])
  const onInteract = useCallback((id: string) => {
    setCard(id)
    if (/^(stop|proj|skill|fact):/.test(id)) audio.chime(); else audio.click()
    if (/^(proj|skill|fact):/.test(id)) setViewed((v) => { const n = new Set(v); n.add(id); try { localStorage.setItem('aimverse:nedverse:viewed', JSON.stringify([...n])) } catch { /* private mode */ } return n })
    if (id.startsWith('stop:')) setVisited((v) => { const n = new Set(v); n.add(id.slice(5)); try { localStorage.setItem('aimverse:nedverse:tour', JSON.stringify([...n])) } catch { /* private mode */ } return n })
  }, [])

  return (
    <Boundary>
      <div ref={wrap} style={{ position: 'fixed', inset: 0, touchAction: 'none', cursor: modal ? 'default' : 'grab' }}>
        <Canvas shadows dpr={quality === 'low' ? 1 : [1, 1.5]} camera={{ fov: 55, near: 0.1, far: 700, position: [26, 4, 8] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
          <World withAvatar={false} quality={quality} />
          {place === 'campus' && <TourStops visited={visited} nextId={nextId} entered={entered} />}
          {place !== 'campus' && <Suspense fallback={null}><Interior room={place as RoomId} viewed={viewed} /></Suspense>}
          <Motes />
          <Suspense fallback={null}><Player colliders={colliders} onNear={setNear} onInteract={onInteract} onMode={setMode} entered={entered} onEnter={onEnter} intro={intro} onPlace={setPlace} /></Suspense>
        </Canvas>
      </div>
      <PlayHud near={near} card={card} paused={paused} mode={mode} visited={visited} entered={entered} intro={intro} place={place} viewed={viewed} onIntroDone={() => setIntro(false)} onResetTour={() => { setVisited(new Set()); try { localStorage.removeItem('aimverse:nedverse:tour') } catch { /* ignore */ } }} onCloseCard={() => setCard(null)} onResume={() => setPaused(false)} touch={touch} />
    </Boundary>
  )
}
