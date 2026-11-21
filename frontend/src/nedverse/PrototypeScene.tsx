import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, useAnimations, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Block, Cars, DisclaimerBoard, Gate, Kiosk, SignPost } from './Architecture'
import { Benches, BoundaryWall, FarField, Ground, Lamps, Palms, PlazaPlanter, Roads, Shrubs, Trees, type TreeSpot } from './Landscape'
import { rng } from './textures'
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

function useScatter() {
  return useMemo(() => {
    const r = rng(2024)
    const inRect = (x: number, z: number, cx: number, cz: number, w: number, d: number, pad: number) => Math.abs(x - cx) < w / 2 + pad && Math.abs(z - cz) < d / 2 + pad
    const blocked = (x: number, z: number) =>
      Math.hypot(x, z) < 18 || inRect(x, z, 0, -40, 42, 18, 6) || inRect(x, z, 0, -24, 6.4, 19, 3) || inRect(x, z, 26, 0, 26, 14, 2) || inRect(x, z, -20, 21, 110, 9, 2.5) ||
      inRect(x, z, 46, 0, 22, 260, 1) || inRect(x, z, 14, 32, 12, 8, 3) || inRect(x, z, -12, 32, 12, 8, 3) || inRect(x, z, -46, -34, 30, 16, 5) || inRect(x, z, 14, -30, 22, 4, 2) || inRect(x, z, 22, 0, 4, 28, 6)
    const trees: TreeSpot[] = []; let guard = 0
    const zones: [number, number, number, number, number][] = [[-76, 33, -96, 13, 46], [-76, 33, 28, 62, 22], [58, 74, -110, 110, 16]]
    for (const [x0, x1, z0, z1, n] of zones) { let c = 0; while (c < n && guard++ < 4000) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (blocked(x, z) && x < 56) continue; trees.push({ x, z, s: 0.8 + r() * 0.55, rot: r() * 6.28 }); c++ } }
    const palms = [[26, -15, 1], [26, 15, 1.05], [14, -13, 0.95], [14, 13.5, 1], [-14, -14, 1.1], [-9, 13.5, 0.9]].map(([x, z, s]) => ({ x, z, s }))
    const shrubs: { x: number; z: number; s: number; c: number }[] = []
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; shrubs.push({ x: Math.cos(a) * 4.6, z: Math.sin(a) * 4.6, s: 0.9 + r() * 0.5, c: Math.floor(r() * 6) }) }
    for (let i = 0; i < 16; i++) shrubs.push({ x: -18 + i * 2.4 + r() * 0.6, z: -30.2 + r() * 0.5, s: 0.8 + r() * 0.5, c: i % 3 === 0 ? 0 : 3 + (i % 3) })
    for (let i = 0; i < 9; i++) { shrubs.push({ x: -4.2, z: -17 - i * 2, s: 0.7, c: 3 }); shrubs.push({ x: 4.2, z: -17 - i * 2, s: 0.7, c: 4 }) }
    const lamps: [number, number][] = [[18, -7.6], [30, -7.6], [18, 7.6], [30, 7.6], ...[-60, -42, -24, -6, 12].map((x) => [x, 15.2] as [number, number]), [-4.2, -20], [4.2, -26], [-4.2, -32], [-15, -9], [15, 9]]
    const benches = [...Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + 0.3; return { x: Math.cos(a) * 12.6, z: Math.sin(a) * 12.6, r: -a - Math.PI / 2 + Math.PI } }), { x: -5.5, z: -22, r: Math.PI / 2 }, { x: 5.5, z: -28, r: -Math.PI / 2 }]
    return { trees, palms, shrubs, lamps, benches }
  }, [])
}

export function World() {
  const sc = useScatter()
  return (
    <>
      <color attach="background" args={['#9fc4e8']} />
      <fog attach="fog" args={['#b9d2ec', 140, 440]} />
      <Sky distance={4500} sunPosition={SUN.clone().multiplyScalar(100).toArray()} turbidity={1.6} rayleigh={3.2} mieCoefficient={0.0025} mieDirectionalG={0.75} />
      <hemisphereLight args={['#b4cdf2', '#7a8a58', 0.95]} />
      <directionalLight position={[70, 35, -50]} intensity={0.55} color="#a9c0ea" />
      <directionalLight position={SUN.clone().multiplyScalar(110).toArray()} intensity={3.0} color="#fff0d8" castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} shadow-camera-near={1} shadow-camera-far={300} shadow-bias={-0.0004} shadow-normalBias={0.04} />
      <Ground />
      <Roads />
      <BoundaryWall />
      <Gate x={22} />
      <PlazaPlanter />
      <Block pos={[0, 0, -40]} w={42} d={18} floors={3} porch />
      <Block pos={[-46, 0, -34]} w={30} d={16} floors={3} />
      <Block pos={[14, 0, 32]} w={12} d={8} floors={1} floorH={4.4} roofKit={false} />
      <Block pos={[-12, 0, 32]} w={12} d={8} floors={1} floorH={4.4} roofKit={false} />
      <Kiosk pos={[-5, 0, -5]} rot={Math.PI / 2 + 0.2} />
      <DisclaimerBoard pos={[-8.5, 0, 7]} rot={Math.PI / 2 + 0.5} />
      <SignPost pos={[-12, 0, 12]} rot={Math.PI / 2 - 0.35} items={['CS & IT Dept  ↑', 'Library  ←', 'Auditorium  ←']} />
      <Cars />
      <FarField />
      {[[104, -70, 3], [108, -30, 4], [104, 14, 3], [110, 52, 4], [106, 92, 3]].map(([x, z, f], i) => <Block key={i} pos={[x, 0, z]} w={20 + (i % 3) * 4} d={12} floors={f} wall={['#d9c8a4', '#cdbd9a', '#dccfae'][i % 3]} rot={Math.PI / 2} roofKit />)}
      <Trees spots={sc.trees} />
      <Palms spots={sc.palms} />
      <Shrubs spots={sc.shrubs} />
      <Lamps spots={sc.lamps} />
      <Benches spots={sc.benches} />
      <Safe><Suspense fallback={null}><Avatar /></Suspense></Safe>
      <EffectComposer multisampling={0}>
        <SMAA />
        <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.45} />
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
