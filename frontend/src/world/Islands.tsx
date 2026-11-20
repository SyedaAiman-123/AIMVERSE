import { Suspense, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { audio } from '../audio'
import { ISLANDS, type Project } from '../data'
import { ISLAND_POS, SECTION_COUNT, fx, scroll } from './state'

type Open = (project: number, media?: number) => void
type P = { quality: 'low' | 'high'; projects: Project[]; accent: string; origin: [number, number]; onOpen: Open }
export const ActiveCtx = createContext(true)
const FONT = '/fonts/bricolage-grotesque-latin-800-normal.woff'
const short = (n: string) => n.replace(/ — .*/, '').replace('Alice in Wonderland ', 'Alice ')

function Platform({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[4.4, 4.7, 0.3, 64]} />
        <meshStandardMaterial color="#0d0f16" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.25, 4.4, 96]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A clickable, hoverable project marker with a floating spatial label. */
export function Pod({ position, rotation, label, color, onClick, labelY = 1, labelOnHover = false, labelScale = 1, children }: { position: [number, number, number]; rotation?: [number, number, number]; label: string; color: string; onClick: () => void; labelY?: number; labelOnHover?: boolean; labelScale?: number; children: (hover: boolean) => ReactNode }) {
  const [h, setH] = useState(false)
  const g = useRef<THREE.Group>(null!)
  const active = useContext(ActiveCtx)
  useFrame((_, dt) => {
    const s = THREE.MathUtils.damp(g.current.scale.x, h ? 1.16 : 1, 10, dt)
    g.current.scale.setScalar(s)
  })
  useEffect(() => () => { document.body.style.cursor = '' }, [])
  return (
    <group
      ref={g}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setH(true); document.body.style.cursor = 'pointer'; audio.tick() }}
      onPointerOut={() => { setH(false); document.body.style.cursor = '' }}
      onClick={(e) => { e.stopPropagation(); audio.select(); onClick() }}
    >
      {children(h)}
      {active && (!labelOnHover || h) && <Billboard position={[0, labelY, 0]}>
        <Text font={FONT} fontSize={(h ? 0.36 : 0.26) * labelScale} color={h ? '#ffffff' : color} outlineWidth={0.014} outlineColor="#05060a" anchorY="middle" maxWidth={3.6} textAlign="center" material-fog={false} material-toneMapped={false}>
          {label}
        </Text>
      </Billboard>}
    </group>
  )
}

/* ---------- GAME: voxel diorama that rises under your cursor, six project towers ---------- */
function Game({ quality, projects, accent, origin, onOpen }: P) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const N = quality === 'low' ? 11 : 15
  const cells = useMemo(() => {
    const out: { x: number; z: number; h: number }[] = []
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = (i - N / 2 + 0.5) * 0.52
        const z = (j - N / 2 + 0.5) * 0.52
        const r = Math.hypot(x, z)
        if (r > 3.6) continue
        const h = 0.25 + (Math.sin(x * 1.3) + Math.cos(z * 1.1) + 2) * 0.28 + Math.max(0, 1.2 - r) * 0.5
        out.push({ x, z, h })
      }
    return out
  }, [N])
  const lift = useMemo(() => new Float32Array(cells.length), [cells.length])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    const pal = ['#2b2214', '#3a2d17', '#4a3a1c', '#5c4720'].map((c) => new THREE.Color(c))
    cells.forEach((_, i) => ref.current.setColorAt(i, pal[(i * 7) % pal.length]))
    ref.current.instanceColor!.needsUpdate = true
  }, [cells])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const gx = fx.ground.x - origin[0]
    const gz = fx.ground.z - origin[1]
    cells.forEach((c, i) => {
      const d2 = (c.x - gx) ** 2 + (c.z - gz) ** 2
      const target = 1.5 * Math.exp(-d2 / 1.6)
      lift[i] = THREE.MathUtils.damp(lift[i], target, 7, dt)
      const bob = Math.sin(t * 0.9 + c.x * 1.4 + c.z * 1.4) * 0.05
      const h = c.h + lift[i]
      dummy.position.set(c.x, h / 2 + bob, c.z)
      dummy.scale.set(0.48, h, 0.48)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  const pods: [number, number, number][] = [[-2.2, -1.2, 3.2], [-0.8, 1.9, 4], [1.9, 1.4, 3.4], [2.3, -1.5, 4.4], [0.2, -2.4, 3.6], [-2.5, 1.4, 3.0]]
  return (
    <group>
      <Platform color={accent} />
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.75} metalness={0.1} />
      </instancedMesh>
      {pods.map(([x, z, h], i) =>
        projects[i] ? (
          <Pod key={i} position={[x, 0, z]} label={short(projects[i].name)} color={accent} labelY={h + 0.5 + (i % 2) * 0.55} onClick={() => onOpen(i)}>
            {(hov) => (
              <mesh position={[0, h / 2, 0]}>
                <boxGeometry args={[0.42, h, 0.42]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={hov ? 2.2 : 0.9} toneMapped={false} />
              </mesh>
            )}
          </Pod>
        ) : null,
      )}
    </group>
  )
}

/* ---------- CYBER: graph with travelling data pulses; click to fire an EMP burst ---------- */
const lineVert = /* glsl */ `attribute float aT; attribute float aSeed; varying float vT; varying float vSeed; void main(){ vT = aT; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
const lineFrag = /* glsl */ `varying float vT; varying float vSeed; uniform vec3 uColor; uniform float uTime; uniform float uFlash;
void main(){ float p = smoothstep(.16, 0., abs(fract(uTime * .35 + vSeed) - vT)); gl_FragColor = vec4(uColor * (1. + p * 2.5 + uFlash * 3.), .12 + p * .9 + uFlash * .7); }`

function Cyber({ quality, projects, accent, onOpen }: P) {
  const { geo, nodes } = useMemo(() => {
    const n = quality === 'low' ? 26 : 46
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 1.1)
      v.y *= 0.8
      pts.push(v)
    }
    const pos: number[] = []
    const aT: number[] = []
    const aS: number[] = []
    pts.forEach((p, i) => {
      pts
        .map((q, j) => ({ j, d: p.distanceTo(q) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .forEach((o) => {
          const q = pts[o.j]
          const s = Math.random()
          pos.push(p.x, p.y, p.z, q.x, q.y, q.z)
          aT.push(0, 1)
          aS.push(s, s)
        })
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1))
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aS, 1))
    return { geo: g, nodes: pts }
  }, [quality])
  const u = useMemo(() => ({ uColor: { value: new THREE.Color('#4DF3C8') }, uTime: { value: 0 }, uFlash: { value: 0 } }), [])
  const grp = useRef<THREE.Group>(null!)
  const spin = useRef(0.12)
  useFrame(({ clock, pointer }, dt) => {
    u.uTime.value = clock.elapsedTime * (1 + u.uFlash.value * 3)
    u.uFlash.value = Math.max(0, u.uFlash.value - dt * 1.4)
    spin.current = THREE.MathUtils.damp(spin.current, 0.12 + (u.uFlash.value > 0.05 ? 1.2 : 0), 3, dt)
    grp.current.rotation.y += dt * spin.current
    grp.current.rotation.x = THREE.MathUtils.damp(grp.current.rotation.x, pointer.y * 0.25, 3, dt)
  })
  const hubs: [number, number, number][] = [[1.7, 0.6, 0.9], [-1.6, -0.5, -0.8]]
  return (
    <group>
      <Platform color={accent} />
      <group ref={grp} position={[0, 3.1, 0]}>
        <mesh onPointerDown={() => { u.uFlash.value = 1 }}>
          <sphereGeometry args={[3.4, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <lineSegments geometry={geo}>
          <shaderMaterial vertexShader={lineVert} fragmentShader={lineFrag} uniforms={u} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
        {nodes.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        ))}
        <mesh>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshBasicMaterial color={accent} wireframe toneMapped={false} />
        </mesh>
        {hubs.map((p, i) =>
          projects[i] ? (
            <Pod key={i} position={p} label={short(projects[i].name)} color="#ffffff" labelY={0.75} onClick={() => onOpen(i)}>
              {(hov) => (
                <mesh>
                  <octahedronGeometry args={[0.3, 0]} />
                  <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={hov ? 3 : 1.4} toneMapped={false} />
                </mesh>
              )}
            </Pod>
          ) : null,
        )}
      </group>
    </group>
  )
}

/* ---------- shared: video / poster screens ---------- */
function useVideoTexture(src: string, enabled: boolean) {
  const [tex, setTex] = useState<THREE.VideoTexture | null>(null)
  useEffect(() => {
    if (!enabled) return
    const v = document.createElement('video')
    v.src = src
    v.crossOrigin = 'anonymous'
    v.loop = true
    v.muted = true
    v.playsInline = true
    v.play().catch(() => {})
    const t = new THREE.VideoTexture(v)
    t.colorSpace = THREE.SRGBColorSpace
    setTex(t)
    return () => {
      v.pause()
      v.removeAttribute('src')
      v.load()
      t.dispose()
      setTex(null)
    }
  }, [src, enabled])
  return tex
}

function Screen({ slug, w, h, color, video, hover }: { slug: string; w: number; h: number; color: string; video: boolean; hover?: boolean }) {
  const poster = useTexture(`/media/${slug}.jpg`)
  poster.colorSpace = THREE.SRGBColorSpace
  const vt = useVideoTexture(`/media/${slug}.mp4`, video)
  return (
    <group>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[w + 0.12, h + 0.12]} />
        <meshBasicMaterial color={hover ? '#ffffff' : color} toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={vt ?? poster} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- VR: ring tunnel that surges while you press and hold ---------- */
function VR({ quality, projects, accent, onOpen }: P) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const count = quality === 'low' ? 10 : 18
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const off = useRef(0)
  const speed = useRef(1.4)
  useFrame((_, dt) => {
    speed.current = THREE.MathUtils.damp(speed.current, fx.pressed ? 9 : 1.4 + Math.abs(scroll.velocity) * 3, 3, dt)
    off.current += dt * speed.current
    for (let i = 0; i < count; i++) {
      const z = -((i * 1.4 + off.current) % (count * 1.4))
      dummy.position.set(0, 2.6, z - 1)
      const s = 1 + (-z / (count * 1.4)) * 0.2
      dummy.scale.set(s, s, 1)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  const shots: [string, [number, number, number], number, number, number][] = [['vr-escape', [-2.1, 2.4, 1.6], 0.35, 1.9, 1.1], ['alice-vr', [0.1, 3.5, 0.6], 0, 1.9, 1.1], ['vr-uav-sim', [2.3, 2.3, 1.8], -0.35, 0.95, 2.1]]
  return (
    <group>
      <Platform color={accent} />
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <torusGeometry args={[3.1, 0.012, 6, 64]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </instancedMesh>
      <Suspense fallback={null}>
        {shots.map(([slug, p, ry, w, h], i) =>
          projects[i] ? (
            <Pod key={slug} position={p} rotation={[0, ry, 0]} label={short(projects[i].name)} color="#ffffff" labelY={h / 2 + 0.4} onClick={() => onOpen(i)}>
              {(hov) => <Screen slug={slug} w={w} h={h} color={accent} video={false} hover={hov} />}
            </Pod>
          ) : null,
        )}
      </Suspense>
    </group>
  )
}

/* ---------- AI: hand-landmark constellation that follows the cursor and writes in the air ---------- */
const HAND: [number, number][] = [
  [0, -1], [-0.45, -0.75], [-0.8, -0.45], [-1.05, -0.15], [-1.25, 0.1], [-0.35, -0.15], [-0.4, 0.25], [-0.43, 0.55], [-0.45, 0.85],
  [0, -0.1], [0, 0.35], [0, 0.7], [0, 1.0], [0.35, -0.15], [0.4, 0.25], [0.43, 0.55], [0.45, 0.8], [0.65, -0.35], [0.78, -0.05], [0.88, 0.2], [0.97, 0.42],
]
const BONES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]]
const TRAIL = 90

function AI({ quality, projects, accent, onOpen }: P) {
  const grp = useRef<THREE.Group>(null!)
  const scan = useRef<THREE.Mesh>(null!)
  const geo = useMemo(() => {
    const p: number[] = []
    BONES.forEach(([a, b]) => p.push(HAND[a][0], HAND[a][1], 0, HAND[b][0], HAND[b][1], 0))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3).fill(0), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const trailLine = useMemo(() => {
    const l = new THREE.Line(trail, new THREE.LineBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.9 }))
    l.frustumCulled = false
    return l
  }, [trail])
  const trailCount = useRef(0)
  const drift = useMemo(() => Array.from({ length: quality === 'low' ? 14 : 30 }, () => [(Math.random() - 0.5) * 7, 0.6 + Math.random() * 4, (Math.random() - 0.5) * 4 - 1.5] as [number, number, number]), [quality])
  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime
    grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, pointer.x * 0.7, 4, dt)
    grp.current.rotation.x = THREE.MathUtils.damp(grp.current.rotation.x, -pointer.y * 0.4, 4, dt)
    scan.current.position.y = 1.2 + ((t * 0.6) % 1) * 2.8
    // pointer "ink" trail: newest point at the end, history shifts back
    const a = trail.attributes.position as THREE.BufferAttribute
    const arr = a.array as Float32Array
    arr.copyWithin(0, 3)
    arr[(TRAIL - 1) * 3] = pointer.x * 3.6
    arr[(TRAIL - 1) * 3 + 1] = 2.5 + pointer.y * 2.4
    arr[(TRAIL - 1) * 3 + 2] = 1.2
    trailCount.current = Math.min(TRAIL, trailCount.current + 1)
    trail.setDrawRange(TRAIL - trailCount.current, trailCount.current)
    a.needsUpdate = true
  })
  const cubes: [number, [number, number, number]][] = [[1, [-2.3, 0.5, 2.2]]]
  return (
    <group>
      <Platform color={accent} />
      <group ref={grp} position={[0, 2.5, 0]} scale={1.35}>
        <lineSegments geometry={geo}>
          <lineBasicMaterial color={accent} toneMapped={false} />
        </lineSegments>
        {HAND.map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshBasicMaterial color="#e8ffb0" toneMapped={false} />
          </mesh>
        ))}
      </group>
      <primitive object={trailLine} />
      <mesh ref={scan} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.16, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {drift.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        {projects[0] && (
          <Pod position={[-2.9, 1.7, 1.2]} rotation={[0, 0.5, 0]} label={short(projects[0].name)} color="#ffffff" labelY={1} onClick={() => onOpen(0)}>
            {(hov) => <Screen slug="virtual-board" w={1.8} h={1.0} color={accent} video={false} hover={hov} />}
          </Pod>
        )}
      </Suspense>
      {cubes.map(([pi, p]) =>
        projects[pi] ? (
          <Pod key={pi} position={p} label={short(projects[pi].name)} color="#ffffff" labelY={0.75} onClick={() => onOpen(pi)}>
            {(hov) => (
              <mesh rotation={[0.4, 0.6, 0]}>
                <cylinderGeometry args={[0.32, 0.32, 0.5, 8]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={hov ? 2.6 : 1} toneMapped={false} />
              </mesh>
            )}
          </Pod>
        ) : null,
      )}
    </group>
  )
}

/* ---------- MOTION: video screens that lean toward you + kinetic type driven by scroll speed ---------- */
function Motion({ quality, projects, accent, onOpen }: P) {
  const ring = useRef<THREE.Group>(null!)
  const spin = useRef(0.18)
  useFrame((_, dt) => {
    spin.current = THREE.MathUtils.damp(spin.current, 0.18 + Math.abs(scroll.velocity) * 2.2, 3, dt)
    ring.current.rotation.y -= dt * spin.current
  })
  const words = ['AFTER EFFECTS', 'MOTION', 'TYPE', 'TIMING', 'EASE', 'COMPOSE', 'RENDER', 'AFTER EFFECTS', 'MOTION', 'TYPE', 'TIMING', 'EASE']
  const vids: [string, [number, number, number], number, number, number][] = [['motion-recreation', [-1.9, 2.0, 1.2], 0.3, 1.95, 1.1], ['motion-documentary', [0.2, 3.3, 0.2], 0, 1.95, 1.1], ['motion-menu', [2.2, 1.7, 1.6], -0.3, 1.2, 1.2]]
  return (
    <group>
      <Platform color={accent} />
      <group ref={ring} position={[0, 4.9, 0]}>
        {words.map((w, i) => {
          const a = (i / words.length) * Math.PI * 2
          return (
            <Text key={i} font={FONT} fontSize={0.5} position={[Math.sin(a) * 4, 0, Math.cos(a) * 4]} rotation={[0, a, 0]} fillOpacity={0} strokeWidth={0.008} strokeColor={accent} anchorY="middle">
              {w}
            </Text>
          )
        })}
      </group>
      <Suspense fallback={null}>
        {vids.map(([slug, p, ry, w, h], i) => (
          <Pod key={slug} position={p} rotation={[0, ry, 0]} label={['Agency recreation', 'Badshahi Mosque', "Chef's Special"][i]} color="#ffffff" labelY={h / 2 + 0.4} onClick={() => onOpen(0, i)}>
            {(hov) => <Screen slug={slug} w={w} h={h} color={accent} video={quality === 'high'} hover={hov} />}
          </Pod>
        ))}
      </Suspense>
      {projects[1] && (
        <Pod position={[-0.4, 0.9, 3.0]} label={short(projects[1].name)} color="#ffffff" labelY={0.8} onClick={() => onOpen(1)}>
          {(hov) => (
            <mesh>
              <torusKnotGeometry args={[0.32, 0.1, 80, 12]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={hov ? 2.6 : 1} toneMapped={false} />
            </mesh>
          )}
        </Pod>
      )}
    </group>
  )
}

/** Scales a world in only while the camera is travelling toward it, so neighbours never bleed through behind the text. */
export function Reveal({ idx, children }: { idx: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    const f = scroll.smooth * (SECTION_COUNT - 1)
    const d = Math.abs(f - idx)
    let s = THREE.MathUtils.clamp((0.78 - d) / 0.35, 0, 1)
    s = s * s * (3 - 2 * s)
    g.current.visible = s > 0.01
    g.current.scale.setScalar(Math.max(0.001, s))
  })
  return <group ref={g}>{children}</group>
}

const COMPONENTS = [Game, Cyber, VR, AI, Motion]

/** Mounts only the destinations within reach of the current section, so unused worlds cost nothing. */
export function Islands({ near, quality, onOpen }: { near: number; quality: 'low' | 'high'; onOpen: (island: number, project: number, media?: number) => void }) {
  return (
    <>
      {COMPONENTS.map((C, i) => {
        if (Math.abs(near - (i + 2)) > 1) return null
        const [x, z] = ISLAND_POS[i]
        return (
          <group key={i} position={[x, 0, z]}>
            <Reveal idx={i + 2}>
              <ActiveCtx.Provider value={near === i + 2}>
                <C quality={quality} projects={ISLANDS[i].projects} accent={ISLANDS[i].accent} origin={[x, z]} onOpen={(p, m) => onOpen(i, p, m)} />
              </ActiveCtx.Provider>
            </Reveal>
          </group>
        )
      })}
    </>
  )
}
