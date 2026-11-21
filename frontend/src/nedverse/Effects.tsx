import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { isReduced, useSettings } from './settings'

/* Atmosphere + guidance: drifting sunlit dust motes around the camera, and a floating guide arrow above the player that always points at the
   current objective (the main gate first, then the next tour stop). */

export function Motes({ count = 220 }: { count?: number }) {
  const reduced = isReduced(useSettings())
  if (reduced) return null
  return <MotesInner count={count} />
}
function MotesInner({ count }: { count: number }) {
  const { camera } = useThree()
  const ref = useRef<THREE.Points>(null!)
  const data = useMemo(() => {
    const p = new Float32Array(count * 3), v = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 50; p[i * 3 + 1] = Math.random() * 9 + 0.3; p[i * 3 + 2] = (Math.random() - 0.5) * 50; v[i * 3] = (Math.random() - 0.5) * 0.25; v[i * 3 + 1] = 0.05 + Math.random() * 0.12; v[i * 3 + 2] = (Math.random() - 0.5) * 0.25 }
    return { p, v, init: false }
  }, [count])
  useFrame((_, dt) => {
    const a = ref.current.geometry.attributes.position as THREE.BufferAttribute, c = camera.position
    if (!data.init) { for (let i = 0; i < count; i++) { data.p[i * 3] += c.x; data.p[i * 3 + 2] += c.z } data.init = true }
    for (let i = 0; i < count; i++) {
      const k = i * 3; data.p[k] += data.v[k] * dt; data.p[k + 1] += data.v[k + 1] * dt; data.p[k + 2] += data.v[k + 2] * dt
      if (data.p[k + 1] > 9.5) data.p[k + 1] = 0.3
      if (data.p[k] - c.x > 25) data.p[k] -= 50; else if (data.p[k] - c.x < -25) data.p[k] += 50
      if (data.p[k + 2] - c.z > 25) data.p[k + 2] -= 50; else if (data.p[k + 2] - c.z < -25) data.p[k + 2] += 50
    }
    a.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.p, 3]} /></bufferGeometry>
      <pointsMaterial color="#fff2c8" size={0.09} sizeAttenuation transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}
