import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FACTS, ISLANDS, SKILL_GROUPS, FLAT } from '../data'
import { EXHIBITS, OX, ROOMS, exhibitsIn, type RoomId } from './interiors'
import { paving, plaster, textTex } from './textures'

/* Lazy-loaded interiors (mounted only while you are inside). Everything here is built from boxes + procedural textures; the exhibits are
   the real portfolio items from data.ts. Glowing floor rings mark each exhibit and dim once you have opened it. */

const std = (color: string, rough = 0.8, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra })

function Room({ room, floor, wall }: { room: RoomId; floor: string; wall: string }) {
  const { w, d, h } = ROOMS[room]
  const fMat = useMemo(() => { const t = paving().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 4, d / 4); return new THREE.MeshStandardMaterial({ map: t, color: floor, roughness: 0.6 }) }, [w, d, floor])
  const wMat = useMemo(() => { const t = plaster(wall).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 6, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }) }, [w, wall])
  const cMat = useMemo(() => std('#ecebe6', 0.95), [])
  const light = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff6e0', toneMapped: false }), [])
  const exitTex = useMemo(() => textTex('exit-sign', 'EXIT  ↓', 384, 112, { bg: '#0f6b3d', fg: '#ffffff', border: '#ffffff', size: 64 }), [])
  const nameTex = useMemo(() => textTex('room-' + room, ROOMS[room].name.toUpperCase(), 1536, 190, { bg: '#16324a', fg: '#ffffff', border: '#e9b800', size: 84 }), [room])
  const gap = 3.2, seg = (w - gap) / 2
  return (
    <group position={[OX, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={fMat} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]} material={cMat}><planeGeometry args={[w, d]} /></mesh>
      <mesh position={[0, h / 2, -d / 2]} material={wMat}><boxGeometry args={[w, h, 0.4]} /></mesh>
      <mesh position={[-w / 2, h / 2, 0]} material={wMat}><boxGeometry args={[0.4, h, d]} /></mesh>
      <mesh position={[w / 2, h / 2, 0]} material={wMat}><boxGeometry args={[0.4, h, d]} /></mesh>
      {[-1, 1].map((k) => <mesh key={k} position={[k * (gap / 2 + seg / 2), h / 2, d / 2]} material={wMat}><boxGeometry args={[seg, h, 0.4]} /></mesh>)}
      <mesh position={[0, h - 1.1, d / 2]} material={wMat}><boxGeometry args={[gap, 2.2, 0.4]} /></mesh>
      {/* door opening: bright daylight panel so the way out reads clearly */}
      <mesh position={[0, 1.55, d / 2 + 0.05]}><planeGeometry args={[gap, 3.1]} /><meshBasicMaterial color="#cfe6ff" toneMapped={false} /></mesh>
      <mesh position={[0, 3.6, d / 2 - 0.25]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.5, 0.44]} /><meshBasicMaterial map={exitTex} toneMapped={false} /></mesh>
      <mesh position={[0, h - 1.0, -d / 2 + 0.25]}><planeGeometry args={[Math.min(w - 4, 14), 1.1]} /><meshBasicMaterial map={nameTex} toneMapped={false} /></mesh>
      {/* ceiling light panels + a few soft point lights */}
      {[-1, 0, 1].flatMap((i) => [-0.3, 0.3].map((j) => <mesh key={`${i}${j}`} position={[i * w * 0.28, h - 0.03, j * d * 0.5]} rotation={[Math.PI / 2, 0, 0]} material={light}><planeGeometry args={[3.4, 0.9]} /></mesh>))}
      <pointLight position={[0, h - 1, 0]} intensity={14} distance={w * 1.2} color="#fff1d6" decay={1.6} />
      <pointLight position={[-w * 0.3, h - 1, d * 0.2]} intensity={7} distance={w} color="#e8f0ff" decay={1.6} />
      <pointLight position={[w * 0.3, h - 1, -d * 0.2]} intensity={7} distance={w} color="#e8f0ff" decay={1.6} />
    </group>
  )
}

/** pulsing ring on the floor in front of an exhibit; dim once opened */
function Marker({ x, z, color, done }: { x: number; z: number; color: string; done: boolean }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => { if (ref.current) { const k = 1 + Math.sin(clock.elapsedTime * 2.4 + x) * 0.07; ref.current.scale.set(k, k, 1) } })
  return <mesh ref={ref} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.55, 0.72, 32]} /><meshBasicMaterial color={done ? '#6c7f77' : color} transparent opacity={done ? 0.4 : 0.9} toneMapped={false} /></mesh>
}

function Desks({ viewed }: { viewed: ReadonlySet<string> }) {
  const wood = useMemo(() => std('#8a6a48', 0.7), []), dark = useMemo(() => std('#1c1f26', 0.5, { metalness: 0.3 }), [])
  const items = exhibitsIn('cs')
  const tex = useMemo(() => items.map((e, i) => { const { gi, pi } = FLAT[i], isl = ISLANDS[gi], p = isl.projects[pi]; return textTex('mon-' + i, [p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name, isl.short.toUpperCase(), (p.year ?? '') + ' · ' + (p.team?.split(' ')[0] ?? '')], 1024, 640, { bg: '#0b1220', fg: '#ffffff', border: e.color, size: 84, lineGap: 1.5 }) }), [items])
  return (
    <>{items.map((e, i) => (
      <group key={e.id}>
        <group position={[e.x, 0, e.z]}>
          <mesh position={[0, 0.75, 0]} material={wood} castShadow receiveShadow><boxGeometry args={[2.4, 0.08, 1.0]} /></mesh>
          {[-1.1, 1.1].map((x) => <mesh key={x} position={[x, 0.37, 0]} material={dark}><boxGeometry args={[0.08, 0.74, 0.9]} /></mesh>)}
          <mesh position={[0, 1.2, -0.25]} material={dark} castShadow><boxGeometry args={[1.5, 0.9, 0.06]} /></mesh>
          <mesh position={[0, 1.2, -0.215]}><planeGeometry args={[1.4, 0.8]} /><meshBasicMaterial map={tex[i]} toneMapped={false} /></mesh>
          <mesh position={[0, 0.9, -0.25]} material={dark}><boxGeometry args={[0.14, 0.3, 0.1]} /></mesh>
          <mesh position={[0, 0.8, 0.15]} material={dark}><boxGeometry args={[0.8, 0.03, 0.26]} /></mesh>
        </group>
        <Marker x={e.x} z={e.z + 1.35} color={e.color} done={viewed.has(e.id)} />
      </group>
    ))}</>
  )
}

function booksTexture(seed: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!
  let s = seed * 9301 + 49297; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  g.fillStyle = '#2b1d12'; g.fillRect(0, 0, 512, 128)
  for (let row = 0; row < 4; row++) { let x = 4; while (x < 506) { const w = 8 + r() * 14, h = 22 + r() * 8; g.fillStyle = `hsl(${Math.floor(r() * 360)},${40 + r() * 30}%,${35 + r() * 25}%)`; g.fillRect(x, row * 32 + 31 - h, w, h); x += w + 1.5 } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function Shelves({ viewed }: { viewed: ReadonlySet<string> }) {
  const wood = useMemo(() => std('#5a3d26', 0.8), [])
  const items = exhibitsIn('lib')
  const books = useMemo(() => items.map((_, i) => booksTexture(i + 3)), [items])
  const signs = useMemo(() => items.map((e, i) => textTex('shelf-' + i, SKILL_GROUPS[i].name.toUpperCase(), 1024, 200, { bg: '#10151c', fg: '#ffffff', border: e.color, size: 76 })), [items])
  const table = useMemo(() => std('#9a7a55', 0.7), [])
  return (
    <>
      {items.map((e, i) => (
        <group key={e.id}>
          <group position={[e.x, 0, e.z]}>
            <mesh position={[0, 1.4, -0.1]} material={wood} castShadow><boxGeometry args={[4.8, 2.8, 0.9]} /></mesh>
            <mesh position={[0, 1.4, 0.36]}><planeGeometry args={[4.6, 2.6]} /><meshBasicMaterial map={books[i]} toneMapped={false} /></mesh>
            <mesh position={[0, 3.2, 0.2]}><boxGeometry args={[3.6, 0.55, 0.12]} /><meshBasicMaterial color={e.color} toneMapped={false} /></mesh>
            <mesh position={[0, 3.2, 0.27]}><planeGeometry args={[3.5, 0.45]} /><meshBasicMaterial map={signs[i]} toneMapped={false} /></mesh>
          </group>
          <Marker x={e.x} z={e.z + 1.35} color={e.color} done={viewed.has(e.id)} />
        </group>
      ))}
      {[-9, 9].map((x) => <group key={x} position={[OX + x, 0, 5.2]}><mesh position={[0, 0.75, 0]} material={table} castShadow><boxGeometry args={[2.8, 0.08, 1.8]} /></mesh>{[[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].map(([a, b], k) => <mesh key={k} position={[a, 0.37, b]} material={table}><boxGeometry args={[0.08, 0.74, 0.08]} /></mesh>)}</group>)}
    </>
  )
}

function wrap(text: string, n: number) { const out: string[] = []; let line = ''; for (const w of text.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w } else line = (line + ' ' + w).trim() } if (line) out.push(line); return out }

function Panels({ viewed }: { viewed: ReadonlySet<string> }) {
  const items = exhibitsIn('hall')
  const tex = useMemo(() => items.map((e, i) => textTex('fact-' + i, [FACTS[i].title.toUpperCase(), ...wrap(FACTS[i].body, 26)].slice(0, 5), 640, 420, { bg: '#10151c', fg: '#ffffff', border: e.color, size: 44, lineGap: 1.35 })), [items])
  const carpet = useMemo(() => std('#5b1f2a', 0.95), []), stage = useMemo(() => std('#3a3d44', 0.7), [])
  const banner = useMemo(() => textTex('hall-banner', ['MILESTONES & ACHIEVEMENTS', 'Verified facts from the CV — nothing invented'], 1536, 260, { bg: '#16324a', fg: '#ffffff', border: '#e9b800', size: 64, lineGap: 1.4 }), [])
  return (
    <>
      <mesh position={[OX, 0.04, 4]} rotation={[-Math.PI / 2, 0, 0]} material={carpet}><planeGeometry args={[7, 14]} /></mesh>
      <mesh position={[OX, 0.4, -ROOMS.hall.d / 2 + 1.6]} material={stage} castShadow><boxGeometry args={[12, 0.8, 3.2]} /></mesh>
      <mesh position={[OX, 4.2, -ROOMS.hall.d / 2 + 0.24]}><planeGeometry args={[12, 2]} /><meshBasicMaterial map={banner} toneMapped={false} /></mesh>
      {items.map((e, i) => (
        <group key={e.id}>
          <group position={[e.x, 0, e.z]} rotation={[0, e.face, 0]}>
            {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, 0.9, 0]} castShadow><boxGeometry args={[0.1, 1.8, 0.1]} /><meshStandardMaterial color="#2c2f36" roughness={0.6} /></mesh>)}
            <mesh position={[0, 1.55, 0]} castShadow><boxGeometry args={[2.3, 1.5, 0.1]} /><meshStandardMaterial color="#14161c" roughness={0.5} /></mesh>
            <mesh position={[0, 1.55, 0.06]}><planeGeometry args={[2.2, 1.4]} /><meshBasicMaterial map={tex[i]} toneMapped={false} /></mesh>
          </group>
          <Marker x={e.x} z={e.z + 1.5} color={e.color} done={viewed.has(e.id)} />
        </group>
      ))}
    </>
  )
}

export default function Interior({ room, viewed }: { room: RoomId; viewed: ReadonlySet<string> }) {
  void EXHIBITS
  return (
    <group>
      {room === 'cs' && <><Room room="cs" floor="#b8bcc4" wall="#dfe3e0" /><Desks viewed={viewed} /></>}
      {room === 'lib' && <><Room room="lib" floor="#c2a67f" wall="#e3d6b4" /><Shelves viewed={viewed} /></>}
      {room === 'hall' && <><Room room="hall" floor="#8c8f98" wall="#e3d6b4" /><Panels viewed={viewed} /></>}
    </group>
  )
}
