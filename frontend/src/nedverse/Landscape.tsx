import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** welded, smooth-shaded copy of a (non-indexed) primitive */
function smooth(g: THREE.BufferGeometry) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m }
import { asphalt, grass, grassPatch, paving, rng } from './textures'
import { KerbLine } from './Architecture'

const windU = { time: { value: 0 } }

function tiledTex(t: THREE.Texture, rx: number, ry: number) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c }

/** Flat ground piece (road, path, plaza...) with a tiled texture; world-size aware so texel density is constant. */
function Flat({ x, z, w, d, tex, scale = 6, y = 0.02, color = '#ffffff', round = false }: { x: number; z: number; w: number; d: number; tex: THREE.Texture; scale?: number; y?: number; color?: string; round?: boolean }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: tiledTex(tex, w / scale, d / scale), color, roughness: 0.95 }), [tex, w, d, scale, color])
  return <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow>{round ? <circleGeometry args={[w / 2, 64]} /> : <planeGeometry args={[w, d]} />}</mesh>
}

function Dashes({ from, to, y = 0.035 }: { from: [number, number]; to: [number, number]; y?: number }) {
  const n = Math.floor(Math.hypot(to[0] - from[0], to[1] - from[1]) / 6)
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0])
  return <>{Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n; return <mesh key={i} position={[from[0] + (to[0] - from[0]) * t, y, from[1] + (to[1] - from[1]) * t]} rotation={[-Math.PI / 2, 0, -ang]}><planeGeometry args={[3, 0.16]} /><meshBasicMaterial color="#ece8dc" /></mesh> })}</>
}

export function Ground() {
  const g = useMemo(() => tiledTex(grass(), 200, 200), [])
  const patch = useMemo(() => { const t = grassPatch().clone(); t.needsUpdate = true; t.repeat.set(7, 7); return t }, [])
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[800, 800]} /><meshStandardMaterial map={g} roughness={1} /></mesh>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial map={patch} transparent roughness={1} depthWrite={false} /></mesh>
  </>
}

/** Roads, plaza, paths and kerbs for the gate-and-plaza prototype (local metres; gate at x=22, plaza centre at the origin). */
export function Roads() {
  const asph = asphalt(), pave = paving()
  return (
    <group>
      <Flat x={46} z={0} w={20} d={260} tex={asph} y={0.03} />                          {/* University Road (N-S) */}
      <Dashes from={[46, -125]} to={[46, 125]} />
      <Flat x={26} z={0} w={24} d={13} tex={asph} y={0.03} />                            {/* entrance road through the gate */}
      <Flat x={-20} z={21} w={110} d={9} tex={asph} y={0.03} />                          {/* main avenue (west) */}
      <Dashes from={[-74, 21]} to={[34, 21]} />
      <Flat x={0} z={0} w={30} d={30} tex={pave} scale={4} y={0.05} round color="#f2eee4" />   {/* welcome plaza */}
      <Flat x={0} z={-24} w={6.4} d={19} tex={pave} scale={4} y={0.05} />               {/* path to the CS & IT building */}
      <Flat x={14} z={-30} w={22} d={4} tex={pave} scale={4} y={0.05} />                {/* cross path */}
      {/* striped kerbs along the entrance road + avenue (reference-photo detail) */}
      <KerbLine from={[14, -6.6]} to={[36, -6.6]} /><KerbLine from={[14, 6.6]} to={[36, 6.6]} />
      <KerbLine from={[-74, 16.4]} to={[34, 16.4]} /><KerbLine from={[-74, 25.6]} to={[34, 25.6]} />
      <KerbLine from={[35.5, -125]} to={[35.5, -7.2]} /><KerbLine from={[35.5, 7.2]} to={[35.5, 125]} />
    </group>
  )
}

/** Boundary wall along University Road with a wide opening at the gate. */
export function BoundaryWall() {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4c8a8', roughness: 0.9 }), [])
  const seg = (z0: number, z1: number) => <mesh key={z0} position={[37, 1.1, (z0 + z1) / 2]} material={m} castShadow receiveShadow><boxGeometry args={[0.5, 2.2, Math.abs(z1 - z0)]} /></mesh>
  return <>{seg(-125, -14)}{seg(14, 125)}</>
}

/* ------------------------------------------------------------------ vegetation (instanced) */
function useCanopy() {
  return useMemo(() => {
    const r = rng(77), parts: THREE.BufferGeometry[] = [], dark = new THREE.Color('#1b3416'), light = new THREE.Color('#648f32')
    for (let i = 0; i < 15; i++) {
      const g = smooth(new THREE.IcosahedronGeometry(1, 3)), sc = 0.55 + r() * 0.55, ang = r() * 6.28, rad = Math.sqrt(r()) * 1.7, y = 0.3 + r() * 2.0 - rad * 0.22
      g.scale(sc * 1.2, sc * 0.85, sc * 1.2); g.translate(Math.cos(ang) * rad, y, Math.sin(ang) * rad)
      const pos = g.attributes.position, arr = new Float32Array(pos.count * 3), c = new THREE.Color()
      for (let k = 0; k < pos.count; k++) {
        const n = Math.sin(pos.getX(k) * 5 + i) * Math.cos(pos.getZ(k) * 4 + i * 2) * 0.09
        pos.setXYZ(k, pos.getX(k) * (1 + n), pos.getY(k) * (1 + n * 0.6), pos.getZ(k) * (1 + n))
        const t = Math.min(1, Math.max(0, (pos.getY(k) + 0.4) / 3.1)); c.copy(dark).lerp(light, t * t * 0.9 + 0.08 * Math.sin(i * 3 + k))
        arr[k * 3] = c.r; arr[k * 3 + 1] = c.g; arr[k * 3 + 2] = c.b
      }
      g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); parts.push(g)
    }
    return mergeGeometries(parts)!
  }, [])
}

function windPatch(mat: THREE.MeshStandardMaterial, amp: number) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windU.time
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
      #else
        float ph = 0.0;
      #endif
      float sway = sin(uTime * 1.3 + ph) * ${amp.toFixed(3)} + sin(uTime * 2.7 + ph * 1.7) * ${(amp * 0.4).toFixed(3)};
      transformed.x += sway * max(position.y, 0.0) * 0.35;
      transformed.z += sway * 0.6 * max(position.y, 0.0) * 0.35;`)
  }
}

export type TreeSpot = { x: number; z: number; s: number; rot: number }
export function Trees({ spots }: { spots: TreeSpot[] }) {
  const canopy = useCanopy()
  const canopyRef = useRef<THREE.InstancedMesh>(null!), trunkRef = useRef<THREE.InstancedMesh>(null!)
  const cMat = useMemo(() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: false }); windPatch(m, 0.03); return m }, [])
  const tMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 }), [])
  const trunkG = useMemo(() => { const g = new THREE.CylinderGeometry(0.22, 0.42, 4.2, 8); g.translate(0, 2.1, 0); return g }, [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3()
    spots.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(0, t.rot, 0)); p.set(t.x, 0, t.z); sc.setScalar(t.s); m.compose(p, q, sc); trunkRef.current.setMatrixAt(i, m)
      p.set(t.x, 3.4 * t.s, t.z); sc.setScalar(t.s * 1.5); m.compose(p, q, sc); canopyRef.current.setMatrixAt(i, m)
    })
    const tint = ['#ffffff', '#e8f0c4', '#d2e2b0', '#f6ecd0', '#c9dcae'].map((c) => new THREE.Color(c))
    spots.forEach((t, i) => canopyRef.current.setColorAt(i, tint[Math.floor(Math.abs(Math.sin(t.x * 12.9 + t.z * 78.2)) * 5) % 5]))
    if (canopyRef.current.instanceColor) canopyRef.current.instanceColor.needsUpdate = true
    trunkRef.current.instanceMatrix.needsUpdate = canopyRef.current.instanceMatrix.needsUpdate = true
  }, [spots])
  useFrame((s) => { windU.time.value = s.clock.elapsedTime })
  return <>
    <instancedMesh ref={trunkRef} args={[trunkG, tMat, spots.length]} castShadow receiveShadow />
    <instancedMesh ref={canopyRef} args={[canopy, cMat, spots.length]} castShadow receiveShadow />
  </>
}

/** Coconut palms (the sustainability report mentions coconut planting at the campus). */
export function Palms({ spots }: { spots: { x: number; z: number; s: number }[] }) {
  const g = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, 7, 8); trunk.translate(0, 3.5, 0)
    const fr: THREE.BufferGeometry[] = [trunk]
    for (let i = 0; i < 14; i++) { const f = new THREE.PlaneGeometry(1.25, 4.4, 1, 7); f.translate(0, 2.1, 0); const pos = f.attributes.position; for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); pos.setZ(k, -(y * y) * 0.11) }; f.rotateX(-0.55); f.rotateY((i / 14) * Math.PI * 2 + (i % 2) * 0.2); f.translate(0, 7, 0); fr.push(f) }
    return mergeGeometries(fr)!
  }, [])
  const mat = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color: '#3f6a26', roughness: 0.85, side: THREE.DoubleSide }); windPatch(m, 0.05); return m }, [])
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => { const m = new THREE.Matrix4(); spots.forEach((t, i) => { m.compose(new THREE.Vector3(t.x, 0, t.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, t.x * 3.1, 0)), new THREE.Vector3(t.s, t.s, t.s)); ref.current.setMatrixAt(i, m) }); ref.current.instanceMatrix.needsUpdate = true }, [spots])
  return <instancedMesh ref={ref} args={[g, mat, spots.length]} castShadow />
}

/** Flowering shrub beds: leafy clumps with small pink/magenta blossoms (as in the reference photos). */
export function Shrubs({ spots }: { spots: { x: number; z: number; s: number; c: number }[] }) {
  const leaf = useRef<THREE.InstancedMesh>(null!), bloom = useRef<THREE.InstancedMesh>(null!)
  const { leafG, bloomG } = useMemo(() => {
    const r = rng(5), L: THREE.BufferGeometry[] = [], B: THREE.BufferGeometry[] = []
    for (let i = 0; i < 9; i++) { const g = smooth(new THREE.IcosahedronGeometry(0.34, 2)), a = r() * 6.28, d = Math.sqrt(r()) * 0.55; g.translate(Math.cos(a) * d, 0.28 + r() * 0.35, Math.sin(a) * d); L.push(g) }
    for (let i = 0; i < 22; i++) { const g = smooth(new THREE.IcosahedronGeometry(0.085, 2)), a = r() * 6.28, d = Math.sqrt(r()) * 0.62; g.translate(Math.cos(a) * d, 0.5 + r() * 0.3 - d * 0.25, Math.sin(a) * d); B.push(g) }
    return { leafG: mergeGeometries(L)!, bloomG: mergeGeometries(B)! }
  }, [])
  const lm = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), []), bm = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.6 }), [])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color(); const greens = ['#2f5a24', '#3a6b2a', '#285020', '#44762f'], pinks = ['#d94f8a', '#e8749e', '#c63a78', '#f3a6c4', '#f1e7e2', '#e8c52e']
    spots.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, 0, t.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i * 1.7, 0)), new THREE.Vector3(t.s, t.s * 0.9, t.s)); leaf.current.setMatrixAt(i, m); bloom.current.setMatrixAt(i, m)
      leaf.current.setColorAt(i, c.set(greens[(i + t.c) % greens.length])); bloom.current.setColorAt(i, c.set(t.c < 3 ? pinks[(i + t.c) % pinks.length] : '#4d8a3a'))
    })
    for (const o of [leaf.current, bloom.current]) { o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true }
  }, [spots])
  return <>
    <instancedMesh ref={leaf} args={[leafG, lm, spots.length]} castShadow receiveShadow />
    <instancedMesh ref={bloom} args={[bloomG, bm, spots.length]} />
  </>
}

/** Distant context so the horizon is never empty: a dark tree line and soft clouds. */
export function FarField() {
  const trees = useMemo(() => { const r = rng(404), a: TreeSpot[] = []; for (let i = 0; i < 70; i++) { const t = (i / 70) * Math.PI * 2, d = 150 + r() * 40; a.push({ x: Math.cos(t) * d, z: Math.sin(t) * d - 20, s: 2.4 + r() * 1.4, rot: r() * 6.28 }) } return a }, [])
  const cloud = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [])
  const clouds = useMemo(() => { const r = rng(9); return Array.from({ length: 22 }, () => ({ x: (r() - 0.5) * 520, y: 90 + r() * 60, z: -80 - r() * 230, s: 60 + r() * 90 })) }, [])
  return <>
    <Trees spots={trees} />
    {clouds.map((c, i) => <sprite key={i} position={[c.x, c.y, c.z]} scale={[c.s * 1.8, c.s * 0.6, 1]}><spriteMaterial map={cloud} transparent opacity={0.8} depthWrite={false} fog={false} /></sprite>)}
  </>
}

export function Lamps({ spots }: { spots: [number, number][] }) {
  const pole = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e3036', roughness: 0.5, metalness: 0.5 }), [])
  return <>{spots.map(([x, z], i) => (
    <group key={i} position={[x, 0, z]}>
      <mesh position={[0, 3.4, 0]} material={pole} castShadow><cylinderGeometry args={[0.07, 0.1, 6.8, 8]} /></mesh>
      <mesh position={[0.5, 6.7, 0]} material={pole}><boxGeometry args={[1.2, 0.1, 0.14]} /></mesh>
      <mesh position={[0.95, 6.58, 0]}><boxGeometry args={[0.5, 0.14, 0.3]} /><meshStandardMaterial color="#f5f1e0" emissive="#fff4d0" emissiveIntensity={0.15} /></mesh>
    </group>
  ))}</>
}

export function Benches({ spots }: { spots: { x: number; z: number; r: number }[] }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.8 }), [])
  const iron = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2d2f33', roughness: 0.5, metalness: 0.6 }), [])
  return <>{spots.map((b, i) => (
    <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.r, 0]}>
      <mesh position={[0, 0.46, 0]} material={wood} castShadow receiveShadow><boxGeometry args={[1.7, 0.07, 0.5]} /></mesh>
      <mesh position={[0, 0.82, -0.22]} rotation={[-0.15, 0, 0]} material={wood} castShadow><boxGeometry args={[1.7, 0.4, 0.06]} /></mesh>
      {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.22, 0]} material={iron}><boxGeometry args={[0.08, 0.44, 0.46]} /></mesh>)}
    </group>
  ))}</>
}

/** Round planter in the middle of the plaza with a young tree. */
export function PlazaPlanter() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow><cylinderGeometry args={[3.4, 3.5, 0.6, 40]} /><meshStandardMaterial color="#c9c0a6" roughness={0.9} /></mesh>
      <mesh position={[0, 0.62, 0]} receiveShadow><cylinderGeometry args={[3.0, 3.0, 0.06, 40]} /><meshStandardMaterial color="#4a3b2c" roughness={1} /></mesh>
    </group>
  )
}
