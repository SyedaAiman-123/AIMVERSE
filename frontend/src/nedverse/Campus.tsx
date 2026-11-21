import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Block } from './Architecture'
import { COMMON, GARDEN, ZONES } from './layout'
import { paving, textTex } from './textures'

/* Phase 5 campus: Central Garden (fountain courtyard), Student Common Area (shaded terrace + canteen kiosk) and the zone signboards.
   The Library, Auditorium & Exhibition Hall and Academic Block are ordinary BLOCKS from layout.ts. Everything is an unofficial,
   stylised interpretation (see the Phase 2 design note): no real-world facility is claimed beyond what the official map lists. */

const std = (color: string, rough = 0.85, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra })
function Pave({ x, z, w, d, round = false, y = 0.055, scale = 4, color = '#ffffff' }: { x: number; z: number; w: number; d: number; round?: boolean; y?: number; scale?: number; color?: string }) {
  const m = useMemo(() => { const t = paving().clone(); t.needsUpdate = true; t.repeat.set(w / scale, d / scale); t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.95 }) }, [w, d, scale, color])
  return <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow>{round ? <circleGeometry args={[w / 2, 64]} /> : <planeGeometry args={[w, d]} />}</mesh>
}

function Fountain() {
  const jets = useRef<THREE.Mesh[]>([]), water = useRef<THREE.Mesh>(null!)
  const stone = useMemo(() => std('#cfc7b2', 0.9), [])
  const wmat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3d93b8', roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.88, emissive: '#1d5e7a', emissiveIntensity: 0.35 }), [])
  const jmat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d8f2ff', transparent: true, opacity: 0.5, depthWrite: false }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    jets.current.forEach((j, i) => { if (!j) return; const k = 0.75 + 0.25 * Math.sin(t * 2.4 + i * 1.3); j.scale.y = k; j.position.y = 1.9 + (i === 0 ? 0.9 : 0.35) * k })
    if (water.current) water.current.position.y = 0.66 + Math.sin(t * 1.4) * 0.012
  })
  return (
    <group position={[GARDEN.x, 0, GARDEN.z]}>
      <mesh position={[0, 0.35, 0]} material={stone} castShadow receiveShadow><cylinderGeometry args={[3.0, 3.15, 0.7, 48]} /></mesh>
      <mesh ref={water} position={[0, 0.66, 0]} material={wmat}><cylinderGeometry args={[2.65, 2.65, 0.06, 48]} /></mesh>
      <mesh position={[0, 1.0, 0]} material={stone} castShadow><cylinderGeometry args={[0.38, 0.5, 1.3, 20]} /></mesh>
      <mesh position={[0, 1.7, 0]} material={stone} castShadow><cylinderGeometry args={[1.25, 0.45, 0.28, 28]} /></mesh>
      <mesh ref={(m) => { if (m) jets.current[0] = m }} position={[0, 2.8, 0]} material={jmat}><cylinderGeometry args={[0.07, 0.16, 1.8, 10]} /></mesh>
      {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} ref={(m) => { if (m) jets.current[i + 1] = m }} position={[Math.cos(a) * 1.7, 1.2, Math.sin(a) * 1.7]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]} material={jmat}><cylinderGeometry args={[0.04, 0.09, 1.1, 8]} /></mesh> })}
    </group>
  )
}

/** concrete-frame monument slabs (a feature visible in the owner's campus photo) */
function Monument() {
  const c = useMemo(() => std('#b9b4a8', 0.95), [])
  return (
    <group position={[GARDEN.x - 9.6, 0, GARDEN.z]}>
      {[[-4.5, 3.6], [0, 2.8], [4.5, 3.2]].map(([z, h], i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[0, h / 2, 0]} material={c} castShadow receiveShadow><boxGeometry args={[0.55, h, 2.0]} /></mesh>
          <mesh position={[0.3, h * 0.55, 0]}><planeGeometry args={[1.0, h * 0.4]} /><meshStandardMaterial color="#5c7a6a" roughness={0.4} side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
    </group>
  )
}

export function Garden() {
  const rim = useMemo(() => std('#c9c0a6', 0.9), [])
  return (
    <group>
      <Pave x={GARDEN.x} z={GARDEN.z} w={GARDEN.r * 2} d={GARDEN.r * 2} round />
      <mesh position={[GARDEN.x, 0.07, GARDEN.z]} rotation={[-Math.PI / 2, 0, 0]} material={rim}><ringGeometry args={[GARDEN.r - 0.15, GARDEN.r + 0.15, 64]} /></mesh>
      {/* connecting paths: plaza <-> garden <-> auditorium */}
      <Pave x={-17.5} z={GARDEN.z} w={5.5} d={3.4} />
      <Pave x={-46} z={GARDEN.z - 2} w={12} d={5} />
      <Fountain />
      <Monument />
    </group>
  )
}

function Table({ x, z }: { x: number; z: number }) {
  const wood = useMemo(() => std('#8a5a34', 0.8), []), iron = useMemo(() => std('#2d2f33', 0.5, { metalness: 0.6 }), [])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.78, 0]} material={wood} castShadow receiveShadow><boxGeometry args={[2.0, 0.07, 0.9]} /></mesh>
      {[-0.85, 0.85].map((dx) => <mesh key={dx} position={[dx, 0.38, 0]} material={iron}><boxGeometry args={[0.08, 0.76, 0.8]} /></mesh>)}
      {[-0.75, 0.75].map((dz) => <mesh key={dz} position={[0, 0.45, dz]} material={wood} castShadow><boxGeometry args={[2.0, 0.06, 0.34]} /></mesh>)}
    </group>
  )
}

export function CommonArea() {
  const col = useMemo(() => std('#e3d6b4', 0.9), []), roof = useMemo(() => std('#4a6a58', 0.7), [])
  return (
    <group>
      <Pave x={COMMON.x} z={COMMON.z} w={12} d={12} />
      <Pave x={COMMON.x} z={28.8} w={3.2} d={6.4} />
      {/* shaded pavilion */}
      <group position={[COMMON.x, 0, COMMON.z - 1]}>
        {[[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].map(([x, z], i) => <mesh key={i} position={[x, 1.7, z]} material={col} castShadow><boxGeometry args={[0.3, 3.4, 0.3]} /></mesh>)}
        <mesh position={[0, 3.55, 0]} material={roof} castShadow><boxGeometry args={[6.2, 0.22, 6.2]} /></mesh>
        <mesh position={[0, 3.75, 0]} material={col}><boxGeometry args={[6.4, 0.12, 6.4]} /></mesh>
      </group>
      <Table x={COMMON.x - 1.6} z={COMMON.z - 2.4} /><Table x={COMMON.x + 1.6} z={COMMON.z - 2.4} />
      <Table x={COMMON.x - 1.6} z={COMMON.z + 0.4} /><Table x={COMMON.x + 1.6} z={COMMON.z + 0.4} />
      <Table x={COMMON.x - 3.6} z={COMMON.z + 4} />
      {/* canteen kiosk */}
      <Block pos={[COMMON.x, 0, COMMON.z + 8.6]} w={8} d={4} floors={1} floorH={3.6} roofKit={false} wall="#dccfae" rot={Math.PI} />
    </group>
  )
}

/** Zone signboards: "<letter> · <name>" on two posts, readable from the road. */
export function ZoneSigns() {
  return <>{ZONES.filter((z) => z.sign).map((z) => <ZoneSign key={z.id} zone={z} />)}</>
}
function ZoneSign({ zone }: { zone: (typeof ZONES)[number] }) {
  const s = zone.sign!
  const tex = useMemo(() => {
    const nm = zone.name.toUpperCase(), long = nm.length > 18, i = nm.indexOf(' & '), lines = long && i > 0 ? [nm.slice(0, i + 2), nm.slice(i + 3)] : long ? [nm.slice(0, nm.lastIndexOf(' ')), nm.slice(nm.lastIndexOf(' ') + 1)] : [nm]
    return textTex('zone2-' + zone.id, [`ZONE ${zone.id}`, ...lines], 1024, 320, { bg: '#16324a', fg: '#ffffff', border: '#e9b800', size: lines.length > 1 ? 66 : 84, lineGap: 1.25 })
  }, [zone])
  return (
    <group position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
      {[-1.4, 1.4].map((x) => <mesh key={x} position={[x, 1.1, 0]} castShadow><boxGeometry args={[0.12, 2.2, 0.12]} /><meshStandardMaterial color="#3a3d44" roughness={0.6} /></mesh>)}
      <mesh position={[0, 2.0, 0]} castShadow><boxGeometry args={[3.2, 1.0, 0.1]} /><meshStandardMaterial color="#10151c" roughness={0.5} /></mesh>
      <mesh position={[0, 2.0, 0.06]}><planeGeometry args={[3.04, 0.92]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <mesh position={[0, 2.0, -0.06]} rotation={[0, Math.PI, 0]}><planeGeometry args={[3.04, 0.92]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  )
}
