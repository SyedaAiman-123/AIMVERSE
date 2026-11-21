import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Sparkles, Stars, useAnimations, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { LEVELS, useGame } from './game'
import { audio } from './audio'
import { STATIONS, StationGame, type StationId } from './QuestGames'
import { ProgressPanel } from './ProgressPanel'
import { AVATAR_HEIGHT, measureGrounding } from './grounding'
import './questworld.css'
import { BRAND } from './brand'

/* QUEST WORLD — a separate 3D environment. You steer a small drone around a glowing observatory floating in space.
   Aiman stands at the centre as your host; four objects around her are the game stations. Walk up to one and press
   E (or click / tap it, or pick it from the Stations list) to play. Everything is optional and stays in the browser. */

const POS: Record<StationId, [number, number, number]> = {
  portal: [-8, 0, 1.5], keyframe: [8, 0, 1.5], light: [-5.6, 0, -8.2], radar: [5.6, 0, -8.2],
}
const R_PLATFORM = 13.4
const HOST: [number, number, number] = [0, 0, -2.2]
const input = { x: 0, z: 0 }

/* ------------------------------------------------------------------ station props */
function Portal({ color }: { color: string }) {
  const a = useRef<THREE.Mesh>(null!), b = useRef<THREE.Mesh>(null!)
  const uniforms = useMemo(() => ({ t: { value: 0 } }), [])
  useFrame((s, dt) => { a.current.rotation.z += dt * 0.6; b.current.rotation.z -= dt * 0.9; uniforms.t.value = s.clock.elapsedTime })
  return (
    <group position={[0, 2.35, 0]}>
      <mesh ref={a}><torusGeometry args={[1.6, 0.09, 16, 72]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh ref={b}><torusGeometry args={[1.35, 0.035, 12, 72]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh>
        <circleGeometry args={[1.3, 64]} />
        <shaderMaterial uniforms={uniforms} transparent side={THREE.DoubleSide}
          vertexShader="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
          fragmentShader="varying vec2 vUv; uniform float t; void main(){ vec2 p=vUv-.5; float r=length(p)*2.; float a=atan(p.y,p.x); float v=.5+.5*sin(r*16.-t*3.+a*3.+sin(t*.7)*2.); v=pow(v,2.2); vec3 c=mix(vec3(.04,.09,.2),vec3(.3,1.,.82),v); gl_FragColor=vec4(c*(1.-r*.35)*1.6,1.-smoothstep(.88,1.,r)); }" />
      </mesh>
    </group>
  )
}

function Clapper({ color }: { color: string }) {
  const arm = useRef<THREE.Group>(null!), kf = useRef<THREE.Group>(null!)
  useFrame((s) => {
    const t = s.clock.elapsedTime, c = (t % 3) / 3
    arm.current.rotation.z = c < 0.12 ? -0.55 * Math.sin((c / 0.12) * Math.PI) : 0 // periodic clap
    kf.current.children.forEach((m, i) => { const k = 0.9 + 0.25 * Math.max(0, Math.sin(t * 3 - i * 0.9)); m.scale.setScalar(k * 0.15) })
  })
  const dark = <meshStandardMaterial color="#15141c" metalness={0.45} roughness={0.5} />
  return (
    <group>
      <mesh position={[0, 1.55, 0]}><boxGeometry args={[1.8, 1.25, 0.12]} />{dark}</mesh>
      {[0.1, -0.2, -0.5].map((y, i) => <mesh key={i} position={[0, 1.55 + y, 0.07]}><boxGeometry args={[1.5, 0.03, 0.01]} /><meshBasicMaterial color="#ece7db" toneMapped={false} /></mesh>)}
      <group ref={arm} position={[-0.9, 2.2, 0.08]}>
        <mesh position={[0.9, 0.11, 0]}><boxGeometry args={[1.8, 0.22, 0.12]} />{dark}</mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0.2 + i * 0.28, 0.11, 0.07]} rotation={[0, 0, -0.6]}><boxGeometry args={[0.12, 0.3, 0.01]} /><meshBasicMaterial color={i % 2 ? '#ece7db' : color} toneMapped={false} /></mesh>)}
      </group>
      <mesh position={[-0.55, 0.45, 0]} rotation={[0, 0, 0.15]}><cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />{dark}</mesh>
      <mesh position={[0.55, 0.45, 0]} rotation={[0, 0, -0.15]}><cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />{dark}</mesh>
      <group ref={kf} position={[0, 3.35, 0]}>
        {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[(i - 3) * 0.42, 0, 0]}><octahedronGeometry args={[1]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>)}
      </group>
    </group>
  )
}

function LightRig() {
  const lamps = [{ a: -45, c: '#ffb15c' }, { a: 55, c: '#7ab8ff' }, { a: 180, c: '#ffffff' }]
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => { g.current.rotation.y += dt * 0.15 })
  return (
    <group>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.4, 0.5, 1.1, 24]} /><meshStandardMaterial color="#1b1a24" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, 1.65, 0]}><sphereGeometry args={[0.55, 32, 24]} /><meshStandardMaterial color="#d9cfc2" roughness={0.55} /></mesh>
      <group ref={g}>
        {lamps.map((l) => {
          const t = (l.a * Math.PI) / 180, x = Math.sin(t) * 2.4, z = Math.cos(t) * 2.4
          return (
            <group key={l.a} position={[x, 0, z]} rotation={[0, t + Math.PI, 0]}>
              <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.04, 0.05, 2, 8]} /><meshStandardMaterial color="#222" /></mesh>
              <group position={[0, 2.05, 0]} rotation={[0.28, 0, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.32, 0.5, 20, 1, true]} /><meshBasicMaterial color={l.c} toneMapped={false} side={THREE.DoubleSide} /></mesh>
                <mesh position={[0, 0, 1.25]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.7, 2.5, 24, 1, true]} /><meshBasicMaterial color={l.c} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} /></mesh>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

function Radar({ color }: { color: string }) {
  const dish = useRef<THREE.Group>(null!), orbit = useRef<THREE.Group>(null!), ring = useRef<THREE.Mesh>(null!)
  useFrame((s, dt) => {
    dish.current.rotation.y += dt * 0.5
    orbit.current.rotation.y += dt * 0.8
    const k = (s.clock.elapsedTime % 2.4) / 2.4
    ring.current.scale.setScalar(0.6 + k * 2.6); (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k)
  })
  return (
    <group>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.09, 0.14, 1.8, 10]} /><meshStandardMaterial color="#1e1d28" metalness={0.5} roughness={0.4} /></mesh>
      <group ref={dish} position={[0, 1.95, 0]} rotation={[0, 0, 0]}>
        <group rotation={[-0.75, 0, 0]}>
          <mesh><sphereGeometry args={[1.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.6]} /><meshStandardMaterial color="#d8d3e6" metalness={0.7} roughness={0.25} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.12, 12, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
        </group>
      </group>
      <group ref={orbit} position={[0, 3.2, 0]}>
        {[0, 1, 2, 3, 4].map((i) => { const t = (i / 5) * Math.PI * 2, r = 1 + (i % 3) * 0.35; return <mesh key={i} position={[Math.cos(t) * r, Math.sin(i * 1.7) * 0.4, Math.sin(t) * r]}><octahedronGeometry args={[0.13]} /><meshBasicMaterial color={i === 1 || i === 3 ? '#ffffff' : color} toneMapped={false} /></mesh> })}
      </group>
      <mesh ref={ring} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[1, 0.02, 8, 64]} /><meshBasicMaterial color={color} transparent toneMapped={false} /></mesh>
    </group>
  )
}

function Station({ id, near, state, onPick }: { id: StationId; near: boolean; state: 0 | 1 | 2; onPick: (id: StationId) => void }) {
  const s = STATIONS.find((x) => x.id === id)!
  const p = POS[id]
  const yaw = Math.atan2(-p[0], -p[2])
  const ring = useRef<THREE.MeshBasicMaterial>(null!)
  const beam = useRef<THREE.Mesh>(null!)
  const col = state === 2 ? '#FFD84D' : state === 1 ? '#4DF3C8' : s.color
  useFrame((st) => {
    const k = near ? 0.65 + 0.35 * Math.sin(st.clock.elapsedTime * 5) : 0.5
    ring.current.color.set(col).multiplyScalar(0.6 + k)
    const m = beam.current.material as THREE.MeshBasicMaterial
    m.opacity = THREE.MathUtils.damp(m.opacity, near ? 0.12 : 0.03, 6, 0.016)
  })
  return (
    <group position={p} rotation={[0, yaw, 0]}
      onClick={(e) => { e.stopPropagation(); onPick(id) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[2, 2.15, 0.2, 40]} /><meshStandardMaterial color="#14131c" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[1.95, 0.045, 8, 72]} /><meshBasicMaterial ref={ring} color={col} toneMapped={false} /></mesh>
      <mesh ref={beam} position={[0, 2.6, 0]}><cylinderGeometry args={[1.9, 1.9, 5.2, 32, 1, true]} /><meshBasicMaterial color={col} transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <pointLight position={[0, 2.6, 1.2]} color={s.color} intensity={near ? 26 : 12} distance={9} decay={2} />
      {id === 'portal' && <Portal color={col} />}
      {id === 'keyframe' && <Clapper color={col} />}
      {id === 'light' && <LightRig />}
      {id === 'radar' && <Radar color={col} />}
      <Html position={[0, id === 'keyframe' ? 4.2 : 4.4, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={'qw-label' + (near ? ' near' : '')} style={{ ['--c' as string]: col }}>
          <b>{s.title}</b><span>{s.tag}</span>{state > 0 && <i>{state === 2 ? '★ Flawless' : '✓ Cleared'}</i>}
        </div>
      </Html>
    </group>
  )
}

/* ---------------------------------------------------------------- host (Aiman) */
function Host({ greet }: { greet: number }) {
  const { scene, animations } = useGLTF('/models/aiman-web.glb')
  const { model, lift, height } = useMemo(() => { const m = clone(scene); return { model: m, ...measureGrounding(m) } }, [scene])
  const S = (AVATAR_HEIGHT * 1.35) / height // a little larger than life so she reads from the camera; feet are placed exactly on the pedestal
  const group = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(animations, group)
  const to = (name: string, once = false) => {
    const next = actions[name]; if (!next) return
    Object.values(actions).forEach((a) => a && a !== next && a.fadeOut(0.35))
    next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity).fadeIn(0.35).play()
    next.clampWhenFinished = once
  }
  useEffect(() => { to('Aiman_Idle') }, [actions]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!greet) return
    to('Aiman_Greeting_Wave', true)
    const t = window.setTimeout(() => to('Aiman_Idle'), 4600)
    return () => window.clearTimeout(t)
  }, [greet]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={HOST}>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[1.5, 1.65, 0.24, 48]} /><meshStandardMaterial color="#17161f" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[1.45, 0.04, 8, 72]} /><meshBasicMaterial color="#ff4a1c" toneMapped={false} /></mesh>
      <group ref={group} position={[0, 0.22 + lift * S, 0]} scale={S}><primitive object={model} /></group>
      <pointLight position={[0.8, 3.2, 3.4]} color="#fff0e2" intensity={85} distance={11} decay={2} />
      <pointLight position={[2.6, 2.4, -1.4]} color="#ff6a3a" intensity={60} distance={9} decay={2} />
      <pointLight position={[-2.6, 2.2, -1.4]} color="#7ab8ff" intensity={50} distance={9} decay={2} />
    </group>
  )
}

/* ------------------------------------------------------------ environment */
function Sky() {
  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[160, 32, 16]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false}
        vertexShader="varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
        fragmentShader="varying vec3 vP; void main(){ float h=vP.y; vec3 top=vec3(.03,.02,.09); vec3 mid=vec3(.14,.05,.17); vec3 hor=vec3(.45,.14,.08); vec3 c=mix(hor,mid,smoothstep(-.05,.35,h)); c=mix(c,top,smoothstep(.3,.9,h)); c=mix(vec3(.02,.01,.04),c,smoothstep(-.6,-.02,h)); gl_FragColor=vec4(c,1.); }" />
    </mesh>
  )
}

function Platform() {
  const spokes = (Object.keys(POS) as StationId[]).map((id) => {
    const p = POS[id], len = Math.hypot(p[0] - HOST[0], p[2] - HOST[2]) - 3.2
    return { id, mx: (p[0] + HOST[0]) / 2, mz: (p[2] + HOST[2]) / 2, len, yaw: Math.atan2(p[0] - HOST[0], p[2] - HOST[2]) }
  })
  return (
    <group>
      <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[14.2, 15.2, 0.5, 96]} /><meshStandardMaterial color="#1a1626" metalness={0.6} roughness={0.42} /></mesh>
      <mesh position={[0, -1.4, 0]}><cylinderGeometry args={[15, 7, 2.4, 64]} /><meshStandardMaterial color="#09080f" metalness={0.5} roughness={0.5} /></mesh>
      {[14.1, 9.4, 4.8].map((r, i) => (
        <mesh key={r} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[r, i === 0 ? 0.07 : 0.035, 8, 128]} /><meshBasicMaterial color={i === 0 ? '#ff4a1c' : '#7a4cff'} toneMapped={false} /></mesh>
      ))}
      {spokes.map((s) => (
        <mesh key={s.id} position={[s.mx, 0.02, s.mz]} rotation={[-Math.PI / 2, 0, s.yaw]}><planeGeometry args={[0.35, s.len]} /><meshBasicMaterial color="#ff7a4a" transparent opacity={0.35} toneMapped={false} /></mesh>
      ))}
    </group>
  )
}

function Rocks() {
  const rocks = useMemo(() => Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.4, r = 30 + (i * 7) % 20
    return { x: Math.cos(a) * r, y: -6 + ((i * 5) % 12), z: Math.sin(a) * r - 10, s: 0.7 + ((i * 3) % 7) * 0.3, h: i }
  }), [])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((st) => refs.current.forEach((m, i) => { if (m) { m.position.y = rocks[i].y + Math.sin(st.clock.elapsedTime * 0.5 + i) * 0.5; m.rotation.y += 0.002 } }))
  return <>{rocks.map((r, i) => (
    <mesh key={i} ref={(m) => { refs.current[i] = m }} position={[r.x, r.y, r.z]} scale={r.s}><icosahedronGeometry args={[1.3, 0]} /><meshStandardMaterial color={i % 2 ? '#1c1626' : '#231218'} roughness={0.85} flatShading emissive={i % 4 === 0 ? '#ff4a1c' : '#000000'} emissiveIntensity={0.08} /></mesh>
  ))}</>
}

function Planet() {
  const ring = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => { ring.current.rotation.z += dt * 0.02 })
  return (
    <group position={[-46, 20, -86]}>
      <mesh><sphereGeometry args={[12, 48, 32]} /><meshStandardMaterial color="#7d2e3e" emissive="#3b0f1a" emissiveIntensity={0.7} roughness={0.8} /></mesh>
      <mesh ref={ring} rotation={[1.2, 0.2, 0]}><torusGeometry args={[19, 0.7, 2, 128]} /><meshBasicMaterial color="#c58a7a" transparent opacity={0.55} toneMapped={false} /></mesh>
    </group>
  )
}

/* -------------------------------------------------------------- the drone */
type PlayerApi = { near: StationId | null; greet: boolean }
function Drone({ api, onNear, onGreet, frozen }: { api: PlayerApi; onNear: (id: StationId | null) => void; onGreet: () => void; frozen: boolean }) {
  const g = useRef<THREE.Group>(null!), ring = useRef<THREE.Mesh>(null!)
  const vel = useRef(new THREE.Vector3())
  const camTarget = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { g.current.position.set(0, 0.9, 8) }, [])
  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), p = g.current.position
    const ix = frozen ? 0 : input.x, iz = frozen ? 0 : input.z
    const len = Math.hypot(ix, iz) || 1, sp = 7.2
    vel.current.x = THREE.MathUtils.damp(vel.current.x, (ix / Math.max(1, len)) * sp, 7, dt)
    vel.current.z = THREE.MathUtils.damp(vel.current.z, (iz / Math.max(1, len)) * sp, 7, dt)
    p.x += vel.current.x * dt; p.z += vel.current.z * dt
    const rr = Math.hypot(p.x, p.z); if (rr > R_PLATFORM) { p.x *= R_PLATFORM / rr; p.z *= R_PLATFORM / rr }
    const hx = p.x - HOST[0], hz = p.z - HOST[2], hr = Math.hypot(hx, hz); if (hr < 2.1) { p.x = HOST[0] + (hx / (hr || 1)) * 2.1; p.z = HOST[2] + (hz / (hr || 1)) * 2.1 }
    p.y = 0.9 + Math.sin(st.clock.elapsedTime * 2.2) * 0.1
    ring.current.rotation.x += dt * 2; ring.current.rotation.y += dt * 1.3
    // nearest station
    let best: StationId | null = null, bd = 3.6
    ;(Object.keys(POS) as StationId[]).forEach((id) => { const d = Math.hypot(p.x - POS[id][0], p.z - POS[id][2]); if (d < bd) { bd = d; best = id } })
    if (best !== api.near) { api.near = best; onNear(best) }
    if (!api.greet && Math.hypot(hx, hz) < 6.5) { api.greet = true; onGreet() }
    // third-person follow camera
    const asp = st.size.width / st.size.height, extra = asp < 1 ? (1 / asp - 1) * 6 : 0 // pull back on tall/narrow screens so the side stations stay in view
    camTarget.set(p.x * 0.85, 5.8 + extra * 0.55, p.z + 9.4 + extra)
    st.camera.position.lerp(camTarget, 1 - Math.exp(-3.2 * dt))
    st.camera.lookAt(p.x * 0.85, 1.4, p.z - 3.2)
  })
  return (
    <group ref={g}>
      <mesh><sphereGeometry args={[0.26, 24, 24]} /><meshBasicMaterial color="#e8fff8" toneMapped={false} /></mesh>
      <mesh ref={ring}><torusGeometry args={[0.42, 0.025, 8, 40]} /><meshBasicMaterial color="#4DF3C8" toneMapped={false} /></mesh>
      <pointLight color="#7dfbe0" intensity={9} distance={7} decay={2} />
      <mesh position={[0, -0.88, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.5, 24]} /><meshBasicMaterial color="#000" transparent opacity={0.45} /></mesh>
    </group>
  )
}

function World({ near, states, onNear, onPick, greet, onGreet, frozen, reduced }: { near: StationId | null; states: Record<StationId, 0 | 1 | 2>; onNear: (id: StationId | null) => void; onPick: (id: StationId) => void; greet: number; onGreet: () => void; frozen: boolean; reduced: boolean }) {
  const api = useRef<PlayerApi>({ near: null, greet: false }).current
  return (
    <>
      <color attach="background" args={['#06040c']} />
      <fog attach="fog" args={['#1a0a12', 26, 110]} />
      <hemisphereLight args={['#9aa6ff', '#2a1420', 0.9]} />
      <directionalLight position={[8, 14, 10]} intensity={1.1} color="#ffd9c0" />
      <Sky />
      <Stars radius={120} depth={60} count={reduced ? 1200 : 3200} factor={5} saturation={0.4} fade speed={reduced ? 0 : 0.6} />
      <Planet />
      <Rocks />
      <Platform />
      {!reduced && <Sparkles count={110} scale={[30, 9, 30]} position={[0, 3, -2]} size={3} speed={0.35} color="#ffb98a" opacity={0.7} />}
      {(Object.keys(POS) as StationId[]).map((id) => <Station key={id} id={id} near={near === id} state={states[id]} onPick={onPick} />)}
      <Suspense fallback={null}>
        <Host greet={greet} />
      </Suspense>
      <Html position={[HOST[0], 3.6, HOST[2]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="qw-bubble">Welcome to the Quest World! Fly to a glowing object and press <kbd>E</kbd> — or tap it.</div>
      </Html>
      <Drone api={api} onNear={onNear} onGreet={onGreet} frozen={frozen} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0.55} luminanceSmoothing={0.3} />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

/* ---------------------------------------------------------------------- HUD */
export default function QuestWorld({ onClose }: { onClose: () => void }) {
  const g = useGame()
  const [near, setNear] = useState<StationId | null>(null)
  const [game, setGame] = useState<StationId | null>(null)
  const [panel, setPanel] = useState<'progress' | 'stations' | null>(null)
  const [greet, setGreet] = useState(0)
  const [ready, setReady] = useState(false)
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const st = useRef({ near, game, panel })
  st.current = { near, game, panel }

  const states = useMemo(() => {
    const o = {} as Record<StationId, 0 | 1 | 2>
    ;(Object.keys(POS) as StationId[]).forEach((id) => { o[id] = g.events.has(`game:${id}:perfect`) ? 2 : g.events.has(`game:${id}:clear`) ? 1 : 0 })
    return o
  }, [g.events])

  const play = useCallback((id: StationId) => { audio.select(); input.x = 0; input.z = 0; setPanel(null); setGame(id) }, [])
  const wave = useCallback(() => setGreet((n) => n + 1), [])

  // keyboard: WASD / arrows to fly, E / Enter to play, Escape to back out
  useEffect(() => {
    const down = new Set<string>()
    const sync = () => { input.x = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0); input.z = (down.has('down') ? 1 : 0) - (down.has('up') ? 1 : 0) }
    const map: Record<string, string> = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' }
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    const kd = (e: KeyboardEvent) => {
      if (st.current.game || st.current.panel || typing(e.target)) return
      const k = map[e.key.toLowerCase()]
      if (k) { down.add(k); sync(); e.preventDefault(); return }
      if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && st.current.near && !(e.key === 'Enter' && e.target instanceof HTMLButtonElement)) { e.preventDefault(); play(st.current.near) }
    }
    const ku = (e: KeyboardEvent) => { const k = map[e.key.toLowerCase()]; if (k) { down.delete(k); sync() } }
    const blur = () => { down.clear(); sync() }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur)
    const esc = () => { if (st.current.game) setGame(null); else if (st.current.panel) setPanel(null); else onClose() }
    window.addEventListener('quest:escape', esc)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); window.removeEventListener('quest:escape', esc); input.x = 0; input.z = 0 }
  }, [play, onClose])

  // touch joystick
  const stick = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLSpanElement>(null)
  const dragging = useRef(false)
  const moveStick = (e: React.PointerEvent) => {
    if (!dragging.current || !stick.current || !knob.current) return
    const r = stick.current.getBoundingClientRect(), R = r.width / 2
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const d = Math.hypot(dx, dy)
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
    input.x = dx / R; input.z = dy / R; knob.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const endStick = () => { dragging.current = false; input.x = 0; input.z = 0; if (knob.current) knob.current.style.transform = '' }

  const span = g.nextXp ? g.nextXp - g.levelFrom : 1
  const pct = g.nextXp ? Math.min(100, ((g.xp - g.levelFrom) / span) * 100) : 100
  const nearS = STATIONS.find((s) => s.id === near)
  const gameS = STATIONS.find((s) => s.id === game)

  return (
    <div className="qw" data-lenis-prevent>
      <Canvas dpr={[1, 1.6]} camera={{ fov: 52, position: [0, 6, 17.4], near: 0.1, far: 400 }} gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={() => setReady(true)} aria-label="Quest World: a 3D environment. Fly the drone to a glowing object to play its game. A Stations list is also available.">
        <World near={near} states={states} onNear={setNear} onPick={play} greet={greet} onGreet={wave} frozen={!!game || !!panel} reduced={reduced} />
      </Canvas>
      {!ready && <div className="qw-loading mono">Entering the Quest World…</div>}

      <header className="qw-top">
        <div className="qw-title">
          <p className="mono">{BRAND.name} QUEST</p>
          <div className="qw-lvl"><b>{g.levelName}</b><span className="mono">LVL {g.level + 1}/{LEVELS.length} · {g.xp} XP</span></div>
          <div className="xbar" role="progressbar" aria-label="Progress to next level" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <nav className="qw-actions" aria-label="Quest menu">
          <button className="mono" onClick={() => setPanel(panel === 'stations' ? null : 'stations')} aria-expanded={panel === 'stations'}>Stations</button>
          <button className="mono" onClick={() => setPanel(panel === 'progress' ? null : 'progress')} aria-expanded={panel === 'progress'}>Progress</button>
          <button className="mono exit" onClick={onClose}>Exit ✕</button>
        </nav>
      </header>

      {!game && !panel && (
        <div className="qw-bottom">
          {nearS
            ? <button className="qw-prompt" onClick={() => play(nearS.id)} style={{ ['--c' as string]: nearS.color }}><kbd>E</kbd><span><b>{nearS.title}</b><small className="mono">{nearS.tag} — press E or tap to play</small></span></button>
            : <p className="qw-hint mono">{coarse ? 'Drag the stick to fly · tap an object to play' : 'W A S D / arrow keys to fly · E to play · Esc to exit'}</p>}
        </div>
      )}

      {coarse && !game && !panel && (
        <div className="qw-stick" ref={stick} onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); moveStick(e) }} onPointerMove={moveStick} onPointerUp={endStick} onPointerCancel={endStick} aria-hidden="true"><span ref={knob} /></div>
      )}

      {panel && (
        <aside className="qw-panel" aria-label={panel === 'progress' ? 'Progress' : 'Stations'}>
          <div className="qw-panel-h"><span className="mono">{panel === 'progress' ? 'Your progress' : 'Stations'}</span><button className="mono" onClick={() => setPanel(null)}>Close ✕</button></div>
          {panel === 'progress' ? <ProgressPanel /> : (
            <ul className="qw-stations">
              {STATIONS.map((s) => (
                <li key={s.id} style={{ ['--c' as string]: s.color }}>
                  <p className="mono">{s.tag}</p><h3>{s.title}</h3><p>{s.blurb}</p><p className="mono g">{s.goal}</p>
                  <p className="mono st">{states[s.id] === 2 ? '★ Flawless' : states[s.id] === 1 ? '✓ Cleared' : 'Not cleared yet'}</p>
                  <button className="qg-btn" onClick={() => play(s.id)}>Play</button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {game && gameS && (
        <div className="qw-game" role="dialog" aria-modal="false" aria-label={gameS.title} style={{ ['--c' as string]: gameS.color }}>
          <div className="qw-game-in" data-lenis-prevent>
            <div className="qw-game-h">
              <div><p className="mono">{gameS.tag}</p><h3>{gameS.title}</h3></div>
              <button className="mono" onClick={() => setGame(null)}>Back to the world ✕</button>
            </div>
            <p className="qw-game-b">{gameS.blurb}</p>
            <p className="mono qw-game-g">{gameS.goal}</p>
            <StationGame key={game} id={game} onExit={() => setGame(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
