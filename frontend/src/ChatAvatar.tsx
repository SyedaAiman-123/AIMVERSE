import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * Live 3D avatar used as the chat's backdrop. It is a CLONE of the portfolio avatar (so the main scene is untouched):
 *  - idles while you read
 *  - plays her "head movement" (thinking) animation while an answer is being fetched
 *  - waves when a new answer arrives
 *  - turns her head toward your cursor
 */
function Model({ busy, waves, reduced }: { busy: boolean; waves: number; reduced: boolean }) {
  const { scene, animations } = useGLTF('/models/aiman-web.glb')
  const model = useMemo(() => clone(scene), [scene])
  const group = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(animations, group)
  const bones = useMemo(() => ({ head: model.getObjectByName('head'), neck: model.getObjectByName('neck') }), [model])
  const look = useRef({ x: 0, y: 0 })
  const ptr = useRef({ x: 0, y: 0 })
  const state = useRef<'idle' | 'think' | 'wave'>('idle')
  const timer = useRef(0)

  const to = (name: string, loop: THREE.AnimationActionLoopStyles = THREE.LoopRepeat) => {
    const next = actions[name]
    if (!next) return
    Object.values(actions).forEach((a) => a && a !== next && a.fadeOut(0.35))
    next.reset().setLoop(loop, Infinity).fadeIn(0.35).play()
    if (loop === THREE.LoopOnce) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true }
  }

  useEffect(() => { to('Aiman_Idle') }, [actions]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (busy) { state.current = 'think'; window.clearTimeout(timer.current); to('Aiman_Head_Movement') }
    else if (state.current === 'think') { state.current = 'idle'; to('Aiman_Idle') }
  }, [busy]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!waves) return
    state.current = 'wave'
    to('Aiman_Greeting_Wave', THREE.LoopOnce)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { state.current = 'idle'; to('Aiman_Idle') }, 4600)
    return () => window.clearTimeout(timer.current)
  }, [waves]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const move = (e: PointerEvent) => { ptr.current.x = (e.clientX / innerWidth) * 2 - 1; ptr.current.y = (e.clientY / innerHeight) * 2 - 1 }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame((_, dt) => {
    if (reduced) return
    look.current.x = THREE.MathUtils.damp(look.current.x, ptr.current.x * 0.5, 4, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, ptr.current.y * 0.3, 4, dt)
    // applied after the animation mixer has written the pose
    if (bones.neck) { bones.neck.rotateY(look.current.x * 0.4); bones.neck.rotateX(look.current.y * 0.4) }
    if (bones.head) { bones.head.rotateY(look.current.x * 0.6); bones.head.rotateX(look.current.y * 0.6) }
  })

  return <group ref={group} position={[0, 1, 0]}><primitive object={model} /></group>
}

function Rig() {
  useFrame(({ camera }) => camera.lookAt(0, 1.32, 0))
  return null
}

export default function ChatAvatar({ busy, waves }: { busy: boolean; waves: number }) {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 30, position: [0.25, 1.5, 3.3] }} gl={{ alpha: true, antialias: true }} style={{ pointerEvents: 'none' }}>
      <hemisphereLight args={['#b8c6ff', '#3a1a14', 1.6]} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={4.2} color="#fff0dc" />
      <pointLight position={[-2, 1.8, 1.5]} intensity={34} color="#ff6a3a" distance={10} decay={2} />
      <pointLight position={[1.8, 2.2, -1.6]} intensity={30} color="#4DF3C8" distance={10} decay={2} />
      <Suspense fallback={null}>
        <Model busy={busy} waves={waves} reduced={reduced} />
      </Suspense>
      <Rig />
    </Canvas>
  )
}
