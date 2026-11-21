import { useMemo } from 'react'
import * as THREE from 'three'
import { facadeBay, plaster, textTex, logoTexture, kerb, gateBars } from './textures'

/* Realistic-stylised campus architecture, built from proportioned boxes + procedural textures.
   An unofficial interpretation inspired by NED Main Campus (cream plaster, flat roofs with parapets, vertical window bays). */

const CREAM = '#e3d6b4', SAND = '#c9bd9d', CONCRETE = '#b8b2a2'
const std = (color: string, rough = 0.9, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra })
const tiled = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c }

function Slab({ p, s, color = CREAM, tex }: { p: [number, number, number]; s: [number, number, number]; color?: string; tex?: THREE.Texture }) {
  const m = useMemo(() => (tex ? std('#ffffff', 0.9, { map: tex }) : std(color)), [color, tex])
  return <mesh position={p} material={m} castShadow receiveShadow><boxGeometry args={s} /></mesh>
}

/** A multi-storey block: window-bay facade on all sides, plinth, parapet band, roof kit, optional entrance porch on the +z face. */
export function Block({ pos, w, d, floors, rot = 0, floorH = 3.9, bay = 3.2, wall = CREAM, porch = false, roofKit = true }: { pos: [number, number, number]; w: number; d: number; floors: number; rot?: number; floorH?: number; bay?: number; wall?: string; porch?: boolean; roofKit?: boolean }) {
  const h = floors * floorH
  const mats = useMemo(() => {
    const bayT = facadeBay(wall), nW = Math.max(1, Math.round(w / bay)), nD = Math.max(1, Math.round(d / bay))
    const front = std('#ffffff', 0.88, { map: tiled(bayT, nW, floors) }), side = std('#ffffff', 0.88, { map: tiled(bayT, nD, floors) })
    const roof = std('#55565c', 0.95), none = std(wall)
    return [side, side, roof, none, front, front] // +x -x +y -y +z -z
  }, [w, d, floors, bay, wall])
  const ptex = useMemo(() => plaster(wall), [wall])
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]} material={mats} castShadow receiveShadow><boxGeometry args={[w, h, d]} /></mesh>
      {/* plinth + deep fascia/parapet (the horizontal bands visible in the reference photos) */}
      <Slab p={[0, 0.35, 0]} s={[w + 0.5, 0.7, d + 0.5]} color="#c4b898" />
      <Slab p={[0, h + 0.45, 0]} s={[w + 0.6, 0.9, d + 0.6]} tex={tiled(ptex, w / 6, 0.4)} />
      <Slab p={[0, h + 0.95, 0]} s={[w + 0.9, 0.16, d + 0.9]} color="#d3c8aa" />
      {roofKit && <>
        <Slab p={[w * 0.28, h + 1.5, d * 0.1]} s={[2.4, 1.1, 1.6]} color="#8d9096" />
        <Slab p={[-w * 0.2, h + 1.4, -d * 0.15]} s={[1.8, 0.9, 1.2]} color="#9a9ca1" />
        <Slab p={[-w * 0.38, h + 1.7, d * 0.2]} s={[1.2, 1.5, 1.2]} color={wall} />
      </>}
      {porch && <Porch z={d / 2} />}
    </group>
  )
}

function Porch({ z }: { z: number }) {
  const deptSign = useMemo(() => textTex('dept-sign', 'DEPARTMENT OF COMPUTER SCIENCE & INFORMATION TECHNOLOGY', 1536, 160, { bg: '#2a3a34', fg: '#f3eee0', size: 70 }), [])
  const door = useMemo(() => std('#22302c', 0.25, { metalness: 0.2 }), [])
  return (
    <group position={[0, 0, z]}>
      <Slab p={[0, 0.15, 2.6]} s={[9.4, 0.3, 5.6]} color={CONCRETE} />
      <Slab p={[0, 0.06, 5.7]} s={[8.4, 0.12, 0.9]} color="#a8a294" />
      {[-4.2, -1.4, 1.4, 4.2].map((x) => <Slab key={x} p={[x, 2.2, 4.6]} s={[0.55, 4.1, 0.55]} color={CREAM} />)}
      <Slab p={[0, 4.55, 2.9]} s={[10, 0.55, 6.4]} color="#d9ceb0" />
      <mesh position={[0, 1.7, 0.08]} material={door}><boxGeometry args={[5.2, 3.2, 0.16]} /></mesh>
      {[-3.6, 3.6].map((x) => <Slab key={x} p={[x, 5.0, 5.5]} s={[0.16, 0.7, 0.16]} color="#444" />)}
      <mesh position={[0, 5.7, 5.5]}><boxGeometry args={[9.6, 1.0, 0.14]} /><meshStandardMaterial map={deptSign} roughness={0.6} /></mesh>
    </group>
  )
}

/** The main gate: portal-frame arch with lettering band, side guard rooms, open metal gate leaves. The round plaque carries the owner-supplied emblem. */
export function Gate({ x = 22 }: { x?: number }) {
  const letters = useMemo(() => textTex('gate-letters', 'NED UNIVERSITY OF ENGINEERING & TECHNOLOGY', 2400, 140, { bg: '#b4a583', fg: '#ffffff', font: '700', size: 74 }), [])
  const sign = useMemo(() => textTex('gate-in', ['MAIN GATE', 'IN  ↑'], 512, 320, { bg: '#1a4fa0', fg: '#ffffff', border: '#ffffff', size: 92, lineGap: 1.05 }), [])
  const lMat = useMemo(() => new THREE.MeshStandardMaterial({ map: letters, roughness: 0.8 }), [letters])
  const sMat = useMemo(() => new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), [sign])
  const logo = useMemo(() => logoTexture(), [])
  const bars = useMemo(() => gateBars(), [])
  const sand = SAND
  return (
    <group position={[x, 0, 0]}>
      {[-1, 1].map((k) => (
        <group key={k} position={[0, 0, k * 12]}>
          <Slab p={[0, 3.7, 0]} s={[3.2, 7.4, 3.2]} color={sand} />
          <Slab p={[0, 0.45, 0]} s={[3.8, 0.9, 3.8]} color="#b3a784" />
          <Slab p={[0, 7.55, 0]} s={[3.6, 0.3, 3.6]} color="#d4c9ab" />
          {/* guard room beside the pier */}
          <Block pos={[0, 0, k * 4.4]} w={4.4} d={5.4} floors={1} floorH={4.2} roofKit={false} wall={CREAM} />
        </group>
      ))}
      {/* top beam + lettering (both faces) */}
      <Slab p={[0, 7.1, 0]} s={[2.6, 2.1, 27.2]} color={sand} />
      <Slab p={[0, 8.28, 0]} s={[3.0, 0.3, 27.8]} color="#d4c9ab" />
      {[-1.33, 1.33].map((dx) => (
        <mesh key={dx} position={[dx, 7.1, 0]} rotation={[0, dx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={lMat}><planeGeometry args={[20.2, 1.35]} /></mesh>
      ))}
      {/* round plaque on the plaza-facing pier */}
      <mesh position={[-1.63, 3.6, 12]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[0.62, 40]} /><meshStandardMaterial map={logo} transparent roughness={0.7} /></mesh>
      <mesh position={[-1.61, 3.6, 12]} rotation={[0, -Math.PI / 2, 0]}><ringGeometry args={[0.62, 0.7, 40]} /><meshStandardMaterial color="#8a7f60" /></mesh>
      {/* open sliding gate leaves parked against the piers */}
      {[-1, 1].map((k) => <mesh key={k} position={[1.0, 1.6, k * 9.0]} rotation={[0, Math.PI / 2, 0]} castShadow><planeGeometry args={[3.6, 3.2]} /><meshStandardMaterial map={bars} transparent alphaTest={0.5} side={THREE.DoubleSide} roughness={0.6} metalness={0.3} /></mesh>)}
      {/* "MAIN GATE IN" sign on a post, left of the entry lane */}
      <group position={[-3.2, 0, -8.6]} rotation={[0, -Math.PI / 2 + 0.25, 0]}>
        <Slab p={[0, 1.0, 0]} s={[0.1, 2.0, 0.1]} color="#444" />
        <mesh position={[0, 2.2, 0]} material={sMat}><boxGeometry args={[1.6, 1.0, 0.08]} /></mesh>
      </group>
    </group>
  )
}

/** Welcome kiosk totem with a glowing screen (static in the prototype; interactive in Phase 6). */
export function Kiosk({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  const screen = useMemo(() => textTex('kiosk-screen', ['WELCOME', 'NEDVERSE', 'Campus map', 'PRESS E'], 512, 900, { bg: '#0b1f33', fg: '#e8f3ff', size: 64, lineGap: 1.55 }), [])
  const logo = useMemo(() => logoTexture(), [])
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Slab p={[0, 0.2, 0]} s={[1.8, 0.4, 0.9]} color="#8d8b86" />
      <Slab p={[0, 1.35, 0]} s={[1.3, 2.3, 0.35]} color="#23262d" />
      <mesh position={[0, 1.4, 0.19]}><planeGeometry args={[1.1, 1.95]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
      <mesh position={[0, 2.3, 0.2]}><circleGeometry args={[0.2, 32]} /><meshBasicMaterial map={logo} transparent toneMapped={false} /></mesh>
      <Slab p={[0, 2.62, 0]} s={[1.5, 0.12, 0.5]} color="#e9b800" />
    </group>
  )
}

/** Plaque stating that NEDVERSE is unofficial (shown in-world as required). */
export function DisclaimerBoard({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  const t = useMemo(() => textTex('disclaimer', ['ABOUT NEDVERSE', 'An unofficial, student-created digital', 'exploration experience. Not affiliated with', 'or endorsed by NED University of', 'Engineering & Technology.'], 1024, 512, { bg: '#e7e0cf', fg: '#222', size: 46, lineGap: 1.25 }), [])
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Slab p={[0, 0.5, 0]} s={[2.4, 1.0, 0.7]} color="#8f8b80" />
      <mesh position={[0, 1.5, 0.02]} rotation={[-0.32, 0, 0]}><boxGeometry args={[2.2, 1.1, 0.08]} /><meshStandardMaterial map={t} roughness={0.7} /></mesh>
    </group>
  )
}

/** Signpost with directional boards (destinations in the campus plan). */
export function SignPost({ pos, rot = 0, items }: { pos: [number, number, number]; rot?: number; items: string[] }) {
  const tex = useMemo(() => items.map((t, i) => textTex('sign-' + t, t, 768, 160, { bg: '#1a4fa0', fg: '#ffffff', border: '#ffffff', size: 70 })), [items])
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Slab p={[0, 1.9, 0]} s={[0.14, 3.8, 0.14]} color="#3c3c40" />
      {tex.map((t, i) => <mesh key={i} position={[0.0, 3.35 - i * 0.62, 0.1]}><boxGeometry args={[1.9, 0.5, 0.06]} /><meshStandardMaterial map={t} roughness={0.6} /></mesh>)}
    </group>
  )
}

export function Cars() {
  const spec: { p: [number, number, number]; r: number; c: string }[] = [{ p: [44, 0, -16], r: 0.04, c: '#8a9a8f' }, { p: [47, 0, 22], r: Math.PI + 0.02, c: '#d9d9d4' }, { p: [8, 0, 29], r: 1.2, c: '#3f5f8a' }]
  const tyre = useMemo(() => std('#141414', 0.95), [])
  return <>{spec.map((s, i) => (
    <group key={i} position={s.p} rotation={[0, s.r, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow><boxGeometry args={[1.7, 0.7, 3.7]} /><meshStandardMaterial color={s.c} roughness={0.35} metalness={0.4} /></mesh>
      <mesh position={[0, 1.2, -0.1]} castShadow><boxGeometry args={[1.5, 0.55, 2.0]} /><meshStandardMaterial color="#25323a" roughness={0.15} metalness={0.6} /></mesh>
      {[[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]].map(([x, z], k) => <mesh key={k} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} material={tyre}><cylinderGeometry args={[0.3, 0.3, 0.22, 16]} /></mesh>)}
    </group>
  ))}</>
}

export function KerbLine({ from, to, y = 0 }: { from: [number, number]; to: [number, number]; y?: number }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]), ang = Math.atan2(to[1] - from[1], to[0] - from[0])
  const tex = useMemo(() => { const t = kerb().clone(); t.needsUpdate = true; t.repeat.set(len / 1.6, 1); return t }, [len])
  return <mesh position={[(from[0] + to[0]) / 2, y + 0.11, (from[1] + to[1]) / 2]} rotation={[0, -ang, 0]} receiveShadow castShadow><boxGeometry args={[len, 0.22, 0.34]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
}
