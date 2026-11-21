import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STOPS, type Stop } from './tour'
import { textTex } from './textures'

/* Visible roadside portfolio stops: a signboard on two posts, a glowing floor ring and a tall light beam you can see from the road.
   Visited stops dim and show a tick. Nothing here is hidden — every stop is lit, signed and listed in the objective panel. */

function Icon({ id, color }: { id: string; color: string }) {
  const m = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} roughness={0.3} metalness={0.2} toneMapped={false} />
  switch (id) {
    case 'game': return <mesh><octahedronGeometry args={[0.55]} />{m}</mesh>
    case 'cyber': return <mesh><torusKnotGeometry args={[0.38, 0.12, 80, 10]} />{m}</mesh>
    case 'vr': return <mesh><torusGeometry args={[0.45, 0.16, 12, 28]} />{m}</mesh>
    case 'ai': return <mesh><dodecahedronGeometry args={[0.5]} />{m}</mesh>
    case 'motion': return <mesh><coneGeometry args={[0.45, 0.9, 4]} />{m}</mesh>
    case 'skills': return <mesh><boxGeometry args={[0.7, 0.7, 0.7]} />{m}</mesh>
    case 'contact': return <mesh><sphereGeometry args={[0.5, 20, 16]} />{m}</mesh>
    default: return <mesh><icosahedronGeometry args={[0.55]} />{m}</mesh>
  }
}

function StopBoard({ stop, visited, next, index }: { stop: Stop; visited: boolean; next: boolean; index: number }) {
  const tex = useMemo(() => textTex(`stop-${stop.id}-${visited}`, [stop.sign[0], visited ? '✓ VISITED' : stop.sign[1]], 1024, 384, { bg: visited ? '#16231f' : '#0c1220', fg: '#ffffff', border: stop.color, size: 92, lineGap: 1.35 }), [stop, visited])
  const col = visited ? '#5f7a72' : stop.color
  const ring = useRef<THREE.Mesh>(null!), beam = useRef<THREE.Mesh>(null!), root = useRef<THREE.Group>(null!), icon = useRef<THREE.Group>(null!), t0 = useRef<number | null>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (t0.current === null) t0.current = t
    const u = Math.min(1, Math.max(0, (t - t0.current - index * 0.14) / 0.9)), e = 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2)   // pop-in with a little overshoot
    if (root.current) root.current.scale.setScalar(Math.max(0.001, e))
    if (icon.current) { icon.current.rotation.y = t * 0.9; icon.current.position.y = 4.1 + Math.sin(t * 1.8 + index) * 0.18; icon.current.visible = !visited }
    if (ring.current) { const k = 1 + Math.sin(t * 2.2) * 0.06; ring.current.scale.set(k, k, 1) }
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = (visited ? 0.07 : next ? 0.3 : 0.17) + Math.sin(t * 1.6) * 0.03
  })
  return (
    <group ref={root} position={[stop.x, 0, stop.z]} rotation={[0, stop.rot, 0]}>
      <group ref={icon} position={[0, 4.1, 0]}><Icon id={stop.id} color={stop.color} /></group>
      {[-1.35, 1.35].map((x) => <mesh key={x} position={[x, 1.2, 0]} castShadow><boxGeometry args={[0.14, 2.4, 0.14]} /><meshStandardMaterial color="#2c2f36" roughness={0.6} /></mesh>)}
      <mesh position={[0, 2.35, 0.02]} castShadow><boxGeometry args={[3.0, 1.15, 0.1]} /><meshStandardMaterial color="#14161c" roughness={0.5} /></mesh>
      <mesh position={[0, 2.35, 0.08]}><planeGeometry args={[2.84, 1.0]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <mesh position={[0, 2.35, -0.04]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.84, 1.0]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <mesh position={[0, 3.1, 0]}><boxGeometry args={[3.1, 0.07, 0.2]} /><meshBasicMaterial color={col} toneMapped={false} /></mesh>
      <mesh ref={ring} position={[0, 0.07, 1.5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.5, 1.85, 40]} /><meshBasicMaterial color={col} transparent opacity={visited ? 0.35 : 0.85} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh ref={beam} position={[0, 9, 1.5]}><cylinderGeometry args={[0.35, 0.35, 18, 16, 1, true]} /><meshBasicMaterial color={col} transparent opacity={0.17} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

export function TourStops({ visited, nextId, entered }: { visited: ReadonlySet<string>; nextId: string | null; entered: boolean }) {
  if (!entered) return null
  return <>{STOPS.map((s, i) => <StopBoard key={s.id} stop={s} index={i} visited={visited.has(s.id)} next={s.id === nextId} />)}</>
}
