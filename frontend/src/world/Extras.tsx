import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import { audio } from '../audio'
import { BY_YEAR, FACTS, ISLANDS, SKILL_GROUPS, YEARS, projectsFor } from '../data'
import { ActiveCtx, Pod } from './Islands'
import { JOURNEY_Z, SKILLS_Z, fx } from './state'

const FONT = '/fonts/bricolage-grotesque-latin-800-normal.woff'
const ORB_COLORS = ['#FF4A1C', '#FFC53D', '#4DF3C8', '#A58BFF', '#B8FF3D', '#FF3D8B', '#6BB8FF']
const short = (n: string) => n.replace(/ — .*/, '').replace('Alice in Wonderland ', 'Alice ')

/* ================= MEET AIMAN: fact orbs that orbit her — click one and she looks at it ================= */
export function FactOrbs({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const { camera } = useThree()
  const refs = useRef<(THREE.Group | null)[]>([])
  const ang = useRef(0)
  const appear = useRef(0)
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    appear.current = THREE.MathUtils.damp(appear.current, 1, 2.4, dt)
    ang.current += dt * (selected ? 0.03 : 0.2)
    FACTS.forEach((f, i) => {
      const g = refs.current[i]
      if (!g) return
      const a = ang.current + (i / FACTS.length) * Math.PI * 2
      const r = 1.35 + (i % 3) * 0.22
      g.position.set(0.5 + Math.cos(a) * r, 0.7 + (i % 4) * 0.4 + Math.sin(a) * 0.25, Math.sin(a) * 0.9)
      const target = appear.current * (selected === f.id ? 1.5 : 1)
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x || 0.001, target, 7, dt))
      if (selected === f.id) {
        g.getWorldPosition(v)
        v.project(camera)
        fx.gaze = { x: THREE.MathUtils.clamp(v.x, -1, 1), y: THREE.MathUtils.clamp(v.y, -1, 1) }
      }
    })
    if (!selected) fx.gaze = null
  })
  useEffect(() => () => { fx.gaze = null }, [])
  return (
    <group onPointerMissed={() => selected && onSelect(null)}>
      <Sparkles count={70} scale={[6, 3.4, 6]} position={[0, 1.4, 0]} size={3.2} speed={0.35} color="#ff7a4a" opacity={0.9} />
      {FACTS.map((f, i) => {
        const c = ORB_COLORS[i % ORB_COLORS.length]
        const on = selected === f.id
        const lines = Math.ceil(f.body.length / 34)
        return (
          <group key={f.id} ref={(el) => { refs.current[i] = el }}>
            <Pod position={[0, 0, 0]} label={on ? '' : f.title} color={c} labelY={0.3} labelScale={0.7} labelOnHover onClick={() => { audio.note(i); onSelect(on ? null : f.id) }}>
              {(hov) => (
                <group>
                  <mesh>
                    <sphereGeometry args={[0.085, 24, 24]} />
                    <meshStandardMaterial color={c} emissive={c} emissiveIntensity={hov || on ? 3 : 1.4} toneMapped={false} />
                  </mesh>
                  <mesh>
                    <sphereGeometry args={[0.16, 20, 20]} />
                    <meshBasicMaterial color={c} transparent opacity={hov || on ? 0.32 : 0.14} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                  </mesh>
                </group>
              )}
            </Pod>
            {on && (
              <Billboard position={[-0.95, 0.4, 0]} scale={0.8}>
                <Text font={FONT} fontSize={0.2} color={c} position={[0, 0.12 + lines * 0.07, 0]} anchorY="middle" maxWidth={2.3} outlineWidth={0.022} outlineColor="#05060a" material-fog={false} material-toneMapped={false}>
                  {f.title}
                </Text>
                <Text font={FONT} fontSize={0.105} color="#ece7db" position={[0, -0.12, 0]} anchorY="top" maxWidth={2.25} textAlign="center" lineHeight={1.3} outlineWidth={0.012} outlineColor="#05060a" material-fog={false} material-toneMapped={false}>
                  {f.body}
                </Text>
              </Billboard>
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ================= SKILL CONSTELLATION ================= */
type P = { id: string; skill: string | null; group: number; target: THREE.Vector3; scatter: THREE.Vector3; delay: number }

function useLayout(quality: 'low' | 'high') {
  return useMemo(() => {
    const groups = SKILL_GROUPS
    const pts: P[] = []
    groups.forEach((g, gi) => {
      const a = (gi / groups.length) * Math.PI * 2 + 0.35
      pts.push({ id: '#' + g.name, skill: null, group: gi, target: new THREE.Vector3(Math.cos(a) * 3.7, Math.sin(a) * 2.5, (gi % 2 ? 1 : -1) * 0.9), scatter: new THREE.Vector3().randomDirection().multiplyScalar(9), delay: gi * 0.05 })
    })
    groups.forEach((g, gi) => {
      const n = g.skills.length
      g.skills.forEach((skill, k) => {
        const phi = Math.acos(1 - (2 * (k + 0.5)) / n)
        const th = Math.PI * (1 + Math.sqrt(5)) * (k + 0.5)
        const r = 1.15 + (k % 2) * 0.35
        const t = pts[gi].target.clone().add(new THREE.Vector3(Math.cos(th) * Math.sin(phi), Math.sin(th) * Math.sin(phi), Math.cos(phi)).multiplyScalar(r))
        pts.push({ id: skill, skill, group: gi, target: t, scatter: new THREE.Vector3().randomDirection().multiplyScalar(9 + Math.random() * 3), delay: 0.25 + Math.random() * 0.4 })
      })
    })
    // edges: hub(-1) -> category, category -> skill
    const edges: [number, number, number, string | null][] = []
    for (let gi = 0; gi < groups.length; gi++) edges.push([-1, gi, gi, null])
    pts.forEach((p, i) => { if (p.skill) edges.push([p.group, i, p.group, p.skill]) })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3))
    return { pts, edges, geo, groups, quality }
  }, [quality])
}

function Beam({ from, to, color, delay }: { from: THREE.Vector3; to: THREE.Vector3; color: string; delay: number }) {
  const dot = useRef<THREE.Mesh>(null!)
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([from, to])
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6, toneMapped: false }))
  }, [from, to, color])
  useFrame(({ clock }) => {
    const k = (clock.elapsedTime * 0.7 + delay) % 1
    dot.current.position.lerpVectors(from, to, k)
    dot.current.scale.setScalar(0.6 + Math.sin(k * Math.PI) * 0.9)
  })
  return (
    <>
      <primitive object={line} />
      <mesh ref={dot}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </>
  )
}

/** Selecting a skill sends light beams to floating project tokens — click one to open that project. */
function Tokens({ skill, anchor, onOpen }: { skill: string; anchor: THREE.Vector3; onOpen: (gi: number, pi: number) => void }) {
  const used = useMemo(() => projectsFor(skill), [skill])
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => { g.current.scale.setScalar(THREE.MathUtils.damp(g.current.scale.x, 1, 5, dt)) })
  useEffect(() => { g.current.scale.setScalar(0.01) }, [skill])
  return (
    <group ref={g}>
      {used.map((u, k) => {
        const spread = used.length === 1 ? 0 : (k / (used.length - 1) - 0.5) * 2.4
        const pos = new THREE.Vector3(anchor.x + spread * 1.1, anchor.y - 0.9 - Math.abs(spread) * 0.25, anchor.z + 2.2)
        const col = ISLANDS[u.gi].accent
        return (
          <group key={u.name}>
            <Beam from={anchor} to={pos} color={col} delay={k * 0.3} />
            <Pod position={[pos.x, pos.y, pos.z]} label={short(u.name)} color="#ffffff" labelY={0.5} onClick={() => onOpen(u.gi, u.pi)}>
              {(hov) => (
                <mesh rotation={[0.5, 0.7, 0]}>
                  <octahedronGeometry args={[0.2, 0]} />
                  <meshStandardMaterial color={col} emissive={col} emissiveIntensity={hov ? 3.2 : 1.6} toneMapped={false} />
                </mesh>
              )}
            </Pod>
          </group>
        )
      })}
    </group>
  )
}

export function Constellation({ quality, selected, onSelect, onOpen }: { quality: 'low' | 'high'; selected: string | null; onSelect: (s: string | null) => void; onOpen: (gi: number, pi: number) => void }) {
  const { pts, edges, geo, groups } = useLayout(quality)
  const grp = useRef<THREE.Group>(null!)
  const meshes = useRef<(THREE.Object3D | null)[]>([])
  const clouds = useRef<(THREE.Object3D | null)[]>([])
  const cur = useMemo(() => pts.map((p) => p.scatter.clone()), [pts])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const prog = useRef(0)
  const [hover, setHover] = useState<string | null>(null)
  const active = useContext(ActiveCtx)
  const colors = useMemo(() => groups.map((g) => new THREE.Color(g.color)), [groups])
  const selGroup = selected?.startsWith('#') ? groups.findIndex((g) => '#' + g.name === selected) : selected ? pts.find((p) => p.skill === selected)?.group ?? -1 : -1
  const selPoint = selected && !selected.startsWith('#') ? pts.find((p) => p.skill === selected) ?? null : null

  // nebula: soft additive dust around every category
  const nebula = useMemo(() => groups.map(() => {
    const n = quality === 'low' ? 40 : 110
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.5 + Math.random() * 1.7)
      a.set([v.x, v.y, v.z], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }), [groups, quality])

  // dim edges that are not part of the selection
  useEffect(() => {
    const c = geo.attributes.color as THREE.BufferAttribute
    edges.forEach(([, , gi, skill], i) => {
      let k = 0.28
      if (selected) {
        if (selected.startsWith('#')) k = gi === selGroup ? 0.95 : 0.08
        else k = skill === selected ? 1 : skill === null && gi === selGroup ? 0.7 : 0.07
      }
      const col = colors[gi]
      c.setXYZ(i * 2, col.r * k, col.g * k, col.b * k)
      c.setXYZ(i * 2 + 1, col.r * k, col.g * k, col.b * k)
    })
    c.needsUpdate = true
  }, [selected, selGroup, edges, geo, colors])

  useFrame(({ clock, pointer }, dt) => {
    prog.current = THREE.MathUtils.damp(prog.current, active ? 1 : 0, 1.5, dt)
    grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, Math.sin(clock.elapsedTime * 0.2) * 0.25 + pointer.x * 0.35, 3, dt)
    grp.current.rotation.x = THREE.MathUtils.damp(grp.current.rotation.x, -pointer.y * 0.2, 3, dt)
    const px = pointer.x * 4.6
    const py = pointer.y * 3.2
    pts.forEach((p, i) => {
      let k = THREE.MathUtils.clamp((prog.current * 1.7 - p.delay) / 0.7, 0, 1)
      k = k * k * (3 - 2 * k)
      const c = cur[i].copy(p.scatter).lerp(p.target, k)
      if (k > 0.99) { // cursor gravity: stars drift away from the pointer
        const dx = c.x - px, dy = c.y - py
        const d = Math.hypot(dx, dy)
        if (d < 1.8) { const f = ((1.8 - d) * 0.24) / (d + 0.001); c.x += dx * f; c.y += dy * f }
      }
      meshes.current[i]?.position.copy(c)
    })
    const arr = geo.attributes.position.array as Float32Array
    edges.forEach(([a, b], i) => {
      const A = a < 0 ? tmp.set(0, 0, 0) : cur[a]
      arr[i * 6] = A.x; arr[i * 6 + 1] = A.y; arr[i * 6 + 2] = A.z
      const B = cur[b]
      arr[i * 6 + 3] = B.x; arr[i * 6 + 4] = B.y; arr[i * 6 + 5] = B.z
    })
    geo.attributes.position.needsUpdate = true
    clouds.current.forEach((cl, gi) => {
      if (!cl) return
      cl.position.copy(cur[gi])
      cl.rotation.y += dt * 0.12
    })
  })

  const label = hover ?? (selPoint ? selPoint.skill : null)
  const labelPt = label ? pts.find((p) => p.skill === label) : null

  return (
    <group ref={grp} position={[0.5, 2.8, 0]} scale={0.7} onPointerMissed={() => selected && onSelect(null)}>
      <lineSegments geometry={geo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} />
      </lineSegments>
      <mesh>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshBasicMaterial color="#ECE7DB" wireframe toneMapped={false} />
      </mesh>
      {nebula.map((g, gi) => (
        <points key={gi} ref={(el) => { clouds.current[gi] = el }} geometry={g} frustumCulled={false}>
          <pointsMaterial size={0.07} color={colors[gi]} transparent opacity={selGroup < 0 || selGroup === gi ? 0.55 : 0.1} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation toneMapped={false} />
        </points>
      ))}
      {pts.map((p, i) => {
        const isCat = p.skill === null
        const on = selected === p.id
        const dim = selGroup >= 0 && selGroup !== p.group
        const h = hover === p.id
        return (
          <group key={p.id} ref={(el) => { meshes.current[i] = el }} position={p.scatter}>
            <mesh
              scale={isCat ? 1 : on ? 2.2 : h ? 1.8 : 1}
              onPointerOver={(e) => { e.stopPropagation(); setHover(p.id); document.body.style.cursor = 'pointer'; audio.tick() }}
              onPointerOut={() => { setHover(null); document.body.style.cursor = '' }}
              onClick={(e) => { e.stopPropagation(); audio.select(); onSelect(on ? null : p.id) }}
            >
              <sphereGeometry args={[isCat ? 0.24 : 0.09, isCat ? 20 : 14, isCat ? 20 : 14]} />
              {isCat ? (
                <meshStandardMaterial color={colors[p.group]} emissive={colors[p.group]} emissiveIntensity={dim ? 0.2 : 1.6} toneMapped={false} />
              ) : (
                <meshBasicMaterial color={dim && !on ? '#3b3d46' : on || h ? '#ffffff' : colors[p.group]} toneMapped={false} />
              )}
            </mesh>
            {isCat && active && (
              <Billboard position={[0, 0.5, 0]}>
                <Text font={FONT} fontSize={0.26} color={dim ? '#6b6a64' : '#ffffff'} outlineWidth={0.012} outlineColor="#05060a" anchorY="middle" material-fog={false} material-toneMapped={false}>
                  {groups[p.group].name}
                </Text>
              </Billboard>
            )}
          </group>
        )
      })}
      {labelPt && active && (
        <Billboard position={labelPt.target.clone().add(new THREE.Vector3(0, 0.34, 0))}>
          <Text font={FONT} fontSize={0.3} color="#ffffff" outlineWidth={0.016} outlineColor="#05060a" anchorY="middle" material-fog={false} material-toneMapped={false}>
            {labelPt.skill}
          </Text>
        </Billboard>
      )}
      {selPoint && <Tokens key={selPoint.id} skill={selPoint.skill!} anchor={selPoint.target} onOpen={onOpen} />}
    </group>
  )
}

/* ================= JOURNEY: a glowing ribbon through the years ================= */
export function Journey({ year, onYear, onOpen }: { year: string | null; onYear: (y: string | null) => void; onOpen: (gi: number, pi: number) => void }) {
  const grp = useRef<THREE.Group>(null!)
  const sparks = useRef<(THREE.Mesh | null)[]>([])
  const cols = useRef<(THREE.Group | null)[]>([])
  const active = useContext(ActiveCtx)
  const X = (i: number) => (i - 1.5) * 2.7
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = []
    YEARS.forEach((_, i) => {
      pts.push(new THREE.Vector3(X(i), 0.45, i * -0.6))
      if (i < YEARS.length - 1) pts.push(new THREE.Vector3((X(i) + X(i + 1)) / 2, 1.5 + (i % 2) * 0.5, (i + 0.5) * -0.6))
    })
    return new THREE.CatmullRomCurve3(pts)
  }, [])
  const ribbon = useMemo(() => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(180)), new THREE.LineBasicMaterial({ color: '#FF8A3D', transparent: true, opacity: 0.75, toneMapped: false }))
    l.frustumCulled = false
    return l
  }, [curve])

  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime
    grp.current.rotation.y = THREE.MathUtils.damp(grp.current.rotation.y, -0.18 + pointer.x * 0.2, 3, dt)
    sparks.current.forEach((m, k) => {
      if (!m) return
      const u = (t * 0.06 + k / sparks.current.length) % 1
      m.position.copy(curve.getPoint(u))
      m.scale.setScalar(0.7 + Math.sin(u * Math.PI) * 0.8)
    })
    const sel = year ? YEARS.indexOf(year) : -1
    cols.current.forEach((g, i) => g && g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, sel === i ? 1.16 : 1, 6, dt)))
    fx.journeyShift = THREE.MathUtils.damp(fx.journeyShift, sel >= 0 ? X(sel) * 0.72 * 0.7 : 0, 3, dt)
  })
  useEffect(() => () => { fx.journeyShift = 0 }, [])

  return (
    <group ref={grp} scale={0.72}>
      <primitive object={ribbon} />
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={k} ref={(el) => { sparks.current[k] = el }}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshBasicMaterial color="#ffe2c4" toneMapped={false} />
        </mesh>
      ))}
      {YEARS.map((y, i) => {
        const items = BY_YEAR[y]
        const rows = Math.ceil(items.length / 2)
        const top = 0.45 + rows * 0.78
        const on = year === y
        const dim = year !== null && !on
        return (
          <group key={y} position={[X(i), 0, i * -0.6]}>
            <group ref={(el) => { cols.current[i] = el }}>
              <mesh position={[0, 0.06, 0]} onClick={(e) => { e.stopPropagation(); audio.select(); onYear(on ? null : y) }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
                <boxGeometry args={[2.1, 0.12, 2.1]} />
                <meshStandardMaterial color={on ? '#2a2018' : '#14161e'} metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.98, 1.02, 4]} />
                <meshBasicMaterial color={on ? '#ffffff' : '#FF8A3D'} toneMapped={false} />
              </mesh>
              <mesh position={[0, 3.2, 0]}>
                <boxGeometry args={[0.02, 6.4, 0.02]} />
                <meshBasicMaterial color="#FF8A3D" transparent opacity={on ? 0.8 : 0.3} toneMapped={false} />
              </mesh>
              {items.map((it, k) => {
                const isl = ISLANDS[it.gi]
                return (
                  <Pod key={it.name} position={[k % 2 === 0 ? -0.42 : 0.42, 0.55 + Math.floor(k / 2) * 0.78, 0]} label={short(it.name)} color={isl.accent} labelY={0.75} labelOnHover onClick={() => onOpen(it.gi, it.pi)}>
                    {(hov) => (
                      <mesh>
                        <boxGeometry args={[0.7, 0.66, 0.7]} />
                        <meshStandardMaterial color={isl.accent} emissive={isl.accent} emissiveIntensity={hov ? 2.4 : dim ? 0.25 : on ? 1.3 : 0.8} toneMapped={false} />
                      </mesh>
                    )}
                  </Pod>
                )
              })}
              {active && (
                <Billboard position={[0, top + 0.9, 0]}>
                  <Text font={FONT} fontSize={0.8} fillOpacity={on ? 1 : 0} color="#ffffff" strokeWidth={0.014} strokeColor="#ECE7DB" anchorY="middle" material-fog={false}>
                    {y}
                  </Text>
                  <Text font={FONT} fontSize={0.2} color="#FF8A3D" position={[0, -0.7, 0]} anchorY="middle" material-fog={false} material-toneMapped={false}>
                    {y === '2023' ? 'UNIVERSITY BEGINS' : `${items.length} PROJECT${items.length === 1 ? '' : 'S'}`}
                  </Text>
                </Billboard>
              )}
            </group>
          </group>
        )
      })}
    </group>
  )
}

export const EXTRA_POS = { skills: [0, 0, SKILLS_Z] as [number, number, number], journey: [0, 0, JOURNEY_Z] as [number, number, number] }
