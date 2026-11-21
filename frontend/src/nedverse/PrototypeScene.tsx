import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, useAnimations, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Garden, CommonArea, ZoneSigns } from './Campus'
import { Block, Cars, DisclaimerBoard, Gate, Kiosk, SignPost } from './Architecture'
import { Benches, BoundaryWall, FarField, Ground, Lamps, Palms, PlazaPlanter, Roads, Shrubs, Trees } from './Landscape'
import { BLOCKS, BOARD, CONTEXT_BLOCKS, GATE_X, KIOSK, SIGNPOST, buildScatter } from './layout'
import { AVATAR_HEIGHT, measureGrounding } from '../grounding'

/* PHASE 3 PROTOTYPE — "Main Gate & Welcome Plaza" of NEDVERSE (unofficial, NED-inspired). Local metres: plaza centre = origin,
   the gate stands at x = +22 on University Road side, the CS & IT building is to the north (-z). Morning light preset. */

const SUN = new THREE.Vector3(-70, 50, 78).normalize() // morning-ish sun from the south-west: lights the gate's plaza face and the building fronts
export type Cam = { p: [number, number, number]; t: [number, number, number]; fov?: number }
export const CAMS: Record<string, Cam> = {
  '1': { p: [-13, 2.3, 5], t: [24, 3.6, 0], fov: 52 },          // from the plaza towards the main gate
  '2': { p: [-30, 11, 30], t: [4, 2, -6], fov: 50 },            // wide plaza + building
  '3': { p: [7, 2.6, -6], t: [0, 6.5, -40], fov: 48 },          // CS & IT building from the path
  '4': { p: [0.5, 1.55, 10.5], t: [8.8, 1.25, 4.2], fov: 36 },    // street level with the avatar
  '5': { p: [58, 38, 54], t: [-4, 2, -14], fov: 42 },           // aerial
  '6': { p: [40, 4.2, 14], t: [22, 5, -2], fov: 50 },           // outside the gate on University Road
}

/** A failed asset (e.g. the avatar GLB) must never blank the whole world. */
class Safe extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  render() { return this.state.bad ? null : this.props.children }
}

function Avatar() {
  const { scene, animations } = useGLTF('/models/aiman-web.glb')
  const { model, lift, height } = useMemo(() => {
    const m = clone(scene); m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
    return { model: m, ...measureGrounding(m) }
  }, [scene])
  const g = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(animations, g)
  useEffect(() => { actions['Aiman_Idle']?.reset().fadeIn(0.3).play() }, [actions])
  const S = AVATAR_HEIGHT / height // uniform scale: proportions unchanged
  return <group ref={g} position={[8.8, lift * S, 4.2]} rotation={[0, -Math.PI / 2 + 0.5, 0]} scale={S}><primitive object={model} /></group>
}

function CameraRig({ cam, still, free }: { cam: Cam; still: boolean; free: boolean }) {
  const { camera } = useThree()
  const base = useMemo(() => new THREE.Vector3(...cam.p), [cam])
  const tgt = useMemo(() => new THREE.Vector3(...cam.t), [cam])
  useEffect(() => { camera.position.copy(base); (camera as THREE.PerspectiveCamera).fov = cam.fov ?? 50; (camera as THREE.PerspectiveCamera).updateProjectionMatrix(); camera.lookAt(tgt) }, [camera, base, tgt, cam.fov])
  useFrame((s) => {
    if (free) return
    const t = s.clock.elapsedTime, k = still ? 0 : 1
    camera.position.set(base.x + Math.sin(t * 0.15) * 0.6 * k, base.y + Math.sin(t * 0.21) * 0.12 * k, base.z + Math.cos(t * 0.13) * 0.5 * k); camera.lookAt(tgt)
  })
  return null
}

export type Quality = 'low' | 'high'
export type Mood = 'day' | 'evening'
const MOODS = {
  day: { bg: '#9fc4e8', fog: '#b9d2ec', sun: new THREE.Vector3(-70, 50, 78).normalize(), sunColor: '#fff0d8', sunI: 3.0, hemi: ['#b4cdf2', '#7a8a58', 0.95] as [string, string, number], fill: '#a9c0ea', fillI: 0.55, turb: 1.6, ray: 3.2, glow: 0.15 },
  evening: { bg: '#e2a27c', fog: '#d9a07f', sun: new THREE.Vector3(-80, 20, 60).normalize(), sunColor: '#ffb070', sunI: 3.0, hemi: ['#b3a4d0', '#6b6850', 1.25] as [string, string, number], fill: '#9a8cc8', fillI: 0.9, turb: 8, ray: 2.2, glow: 3.2 },
}
/** keeps the sun's shadow box centred on the player: shadows stay sharp and only nearby objects are drawn into the shadow map */
function SunRig({ mood, low, shadows }: { mood: Mood; low: boolean; shadows: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null!)
  const m = MOODS[mood], R = low ? 40 : 46
  useFrame(() => {
    const n = window.__ned, px = n ? (n.mode === 'driving' ? n.carX : n.x) : 22, pz = n ? (n.mode === 'driving' ? n.carZ : n.z) : 0
    const snap = (2 * R) / (low ? 1536 : 3072), x = Math.round(px / snap) * snap, z = Math.round(pz / snap) * snap   // snap to texels: no shimmering
    light.current.position.set(x + m.sun.x * 110, m.sun.y * 110, z + m.sun.z * 110); light.current.target.position.set(x, 0, z); light.current.target.updateMatrixWorld()
  })
  return (
    <>
      <directionalLight ref={light} intensity={m.sunI} color={m.sunColor} castShadow={shadows} shadow-mapSize={low ? [1536, 1536] : [3072, 3072]} shadow-camera-left={-R} shadow-camera-right={R} shadow-camera-top={R} shadow-camera-bottom={-R} shadow-camera-near={1} shadow-camera-far={260} shadow-bias={-0.0004} shadow-normalBias={0.04} />
    </>
  )
}

export function World({ withAvatar = true, quality = 'high', mood = 'day', shadows = true }: { withAvatar?: boolean; quality?: Quality; mood?: Mood; shadows?: boolean }) {
  const low = quality === 'low'
  const M = MOODS[mood]
  const sc = useMemo(buildScatter, [])
  return (
    <>
      <color attach="background" args={[M.bg]} />
      <fog attach="fog" args={[M.fog, 140, 440]} />
      <Sky distance={4500} sunPosition={M.sun.clone().multiplyScalar(100).toArray()} turbidity={M.turb} rayleigh={M.ray} mieCoefficient={0.0025} mieDirectionalG={0.75} />
      <hemisphereLight args={M.hemi} />
      <directionalLight position={[70, 35, -50]} intensity={M.fillI} color={M.fill} />
      <SunRig mood={mood} low={low} shadows={shadows} />
      <Ground />
      <Roads />
      <BoundaryWall />
      <Gate x={GATE_X} />
      <PlazaPlanter />
      {BLOCKS.map((b) => <Block key={b.id} pos={b.pos} w={b.w} d={b.d} floors={b.floors} floorH={b.floorH} porch={b.porch} roofKit={b.roofKit} rot={b.rot} porchText={b.porchText} />)}
      <Garden /><CommonArea /><ZoneSigns />
      <Kiosk pos={KIOSK.pos} rot={KIOSK.rot} />
      <DisclaimerBoard pos={BOARD.pos} rot={BOARD.rot} />
      <SignPost pos={SIGNPOST.pos} rot={SIGNPOST.rot} items={SIGNPOST.items} />
      <Cars />
      <FarField />
      {CONTEXT_BLOCKS.map(([x, z, f], i) => <Block key={i} pos={[x, 0, z]} w={20 + (i % 3) * 4} d={12} floors={f} wall={['#d9c8a4', '#cdbd9a', '#dccfae'][i % 3]} rot={Math.PI / 2} roofKit />)}
      <Trees spots={sc.trees} low={low} />
      <Palms spots={sc.palms} />
      <Shrubs spots={sc.shrubs} />
      <Lamps spots={sc.lamps} glow={M.glow} />
      <Benches spots={sc.benches} />
      {withAvatar && <Safe><Suspense fallback={null}><Avatar /></Suspense></Safe>}
      <EffectComposer multisampling={0}>
        {low ? <ToneMapping mode={ToneMappingMode.ACES_FILMIC} /> : <SMAA />}
        {low ? <Vignette offset={0.3} darkness={0.4} /> : <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.95} luminanceSmoothing={0.2} />}
        {low ? <></> : <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />}
        {low ? <></> : <Vignette offset={0.3} darkness={0.45} />}
      </EffectComposer>
    </>
  )
}

export default function PrototypeScene({ camId, still, free }: { camId: string; still: boolean; free: boolean }) {
  const cam = CAMS[camId] ?? CAMS['1']
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: cam.fov ?? 50, near: 0.1, far: 700, position: cam.p }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <World />
      <CameraRig cam={cam} still={still} free={free} />
      {free && <OrbitControls target={cam.t} />}
    </Canvas>
  )
}
