import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { STOPS, type Stop } from './tour'
import { textTex } from './textures'

/* Visible roadside portfolio stops: a signboard on two posts, a glowing floor ring and a tall light beam you can see from the road.
   Visited stops dim and show a tick. Nothing here is hidden — every stop is lit, signed and listed in the objective panel. */

function StopBoard({ stop, visited, next }: { stop: Stop; visited: boolean; next: boolean }) {
  const tex = useMemo(() => textTex(`stop-${stop.id}-${visited}`, [stop.sign[0], visited ? '✓ VISITED' : stop.sign[1]], 1024, 384, { bg: visited ? '#16231f' : '#0c1220', fg: '#ffffff', border: stop.color, size: 92, lineGap: 1.35 }), [stop, visited])
  const col = visited ? '#5f7a72' : stop.color
  const ring = useRef<THREE.Mesh>(null!), beam = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ring.current) { const k = 1 + Math.sin(t * 2.2) * 0.06; ring.current.scale.set(k, k, 1) }
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = (visited ? 0.07 : next ? 0.3 : 0.17) + Math.sin(t * 1.6) * 0.03
  })
  return (
    <group position={[stop.x, 0, stop.z]} rotation={[0, stop.rot, 0]}>
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

export function TourStops({ visited, nextId }: { visited: ReadonlySet<string>; nextId: string | null }) {
  return <>{STOPS.map((s) => <StopBoard key={s.id} stop={s} visited={visited.has(s.id)} next={s.id === nextId} />)}</>
}
