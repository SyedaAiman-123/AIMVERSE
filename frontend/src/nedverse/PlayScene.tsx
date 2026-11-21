import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { World, type Quality } from './PrototypeScene'
import { Player } from './Player'
import { PlayHud } from './PlayHud'
import { buildColliders } from './collision'
import { attachInput, input, resetInput, setInputEnabled } from './input'

/** Playable NEDVERSE prototype: the Phase 3 environment + the third-person player + minimal HUD. */
class Boundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() { return this.state.err ? <div style={{ color: '#fff', padding: 24, font: '14px monospace' }}>NEDVERSE could not start: {this.state.err}</div> : this.props.children }
}

export default function PlayScene({ touch }: { touch: boolean }) {
  const colliders = useMemo(buildColliders, [])
  const wrap = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState<string | null>(null)
  const [card, setCard] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const modal = !!card || paused
  // Low tier (phones, ?q=low): smaller shadow map, no bloom/SMAA, dpr 1. High tier otherwise (?q=high forces it).
  const qp = new URLSearchParams(location.search).get('q')
  const quality: Quality = qp === 'low' || (qp !== 'high' && (touch || (navigator.hardwareConcurrency || 8) <= 4)) ? 'low' : 'high'

  useEffect(() => { const off = attachInput(wrap.current!); return () => { off(); resetInput() } }, [])
  useEffect(() => { setInputEnabled(!modal) }, [modal])
  // Esc: close the card, else toggle pause. Polled via the input store so it works with every focus state.
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (!input.escape) return
      input.escape = false
      if (card) setCard(null); else setPaused((p) => !p)
    }, 50)
    return () => window.clearInterval(iv)
  }, [card])
  const onInteract = useCallback((id: string) => setCard(id), [])

  return (
    <Boundary>
      <div ref={wrap} style={{ position: 'fixed', inset: 0, touchAction: 'none', cursor: modal ? 'default' : 'grab' }}>
        <Canvas shadows dpr={quality === 'low' ? 1 : [1, 1.5]} camera={{ fov: 55, near: 0.1, far: 700, position: [26, 4, 8] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
          <World withAvatar={false} quality={quality} />
          <Suspense fallback={null}><Player colliders={colliders} onNear={setNear} onInteract={onInteract} /></Suspense>
        </Canvas>
      </div>
      <PlayHud near={near} card={card} paused={paused} onCloseCard={() => setCard(null)} onResume={() => setPaused(false)} touch={touch} />
    </Boundary>
  )
}
