import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AVATAR_HEIGHT, measureGrounding } from '../grounding'
import { INTERACTABLES, SPAWN, groundY } from './layout'
import { clampCameraDistance, resolve, type Collider } from './collision'
import { input, readMove } from './input'

/* Third-person player: your avatar (existing GLB + the Blender-authored Walk/Run clips) with smooth acceleration, natural turning,
   Idle <-> Walk <-> Run cross-fades, wall-sliding collisions, interaction detection and a damped orbit camera that stays out of walls. */

export const WALK_SPEED = 1.4, RUN_SPEED = 3.4, NAT_WALK = 1.05, NAT_RUN = 2.8   // m/s; NAT_* = speed the authored cycles cover at 1x
const RADIUS = 0.38, STEP = 1 / 60

export type PlayerDebug = { x: number; y: number; z: number; yaw: number; speed: number; state: string; camYaw: number; camDist: number; near: string | null; fps: number; animTime: number }
declare global { interface Window { __ned?: PlayerDebug } }

const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a }

export function Player({ colliders, onNear, onInteract }: { colliders: Collider[]; onNear: (id: string | null) => void; onInteract: (id: string) => void }) {
  const { camera } = useThree()
  const { scene, animations } = useGLTF('/models/aiman-web.glb')
  const loco = useGLTF('/models/aiman-locomotion.glb')
  const { model, lift, height } = useMemo(() => { const m = clone(scene); m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } }); return { model: m, ...measureGrounding(m) } }, [scene])
  const S = AVATAR_HEIGHT / height
  const group = useRef<THREE.Group>(null!)
  const clips = useMemo(() => [...animations, ...loco.animations], [animations, loco.animations])
  const { actions } = useAnimations(clips, group)

  // QA hook: ?x=&z=&yaw= overrides the spawn point (used by the automated tests; harmless otherwise)
  const q = new URLSearchParams(location.search), sx = q.has('x') ? +q.get('x')! : SPAWN.x, sz = q.has('z') ? +q.get('z')! : SPAWN.z, syaw = q.has('yaw') ? +q.get('yaw')! : SPAWN.yaw
  const st = useRef({
    x: sx, z: sz, y: groundY(sx, sz), vx: 0, vz: 0, yaw: syaw,
    camYaw: q.has('cam') ? +q.get('cam')! : Math.PI / 2, camPitch: 0.28, camDist: 4.4, wantDist: 4.4, state: 'Idle', near: null as string | null, acc: 0, frames: 0, fpsT: 0, fps: 0,
  })
  const cam = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false }), [])

  const play = (name: string, ts: number) => {
    const s = st.current, next = actions[name]; if (!next) return
    if (s.state !== name) {
      const prev = actions[s.state]
      next.reset().setEffectiveWeight(1).fadeIn(0.28).play()
      prev?.fadeOut(0.28)
      s.state = name
    }
    next.setEffectiveTimeScale(ts)
  }
  useEffect(() => { actions['Aiman_Idle']?.reset().play(); st.current.state = 'Aiman_Idle' }, [actions])

  useFrame((state, dtRaw) => {
    const s = st.current
    // ---- camera look / zoom (pixels -> radians) ----
    if (input.lookDX || input.lookDY) { s.camYaw -= input.lookDX * 0.0055; s.camPitch = Math.max(-0.2, Math.min(1.1, s.camPitch + input.lookDY * 0.0045)); input.lookDX = input.lookDY = 0 }
    if (input.zoom) { s.wantDist = Math.max(2.4, Math.min(8, s.wantDist + input.zoom * 0.004)); input.zoom = 0 }
    // ---- fixed-timestep movement (frame-rate independent, also on slow machines) ----
    s.acc = Math.min(s.acc + dtRaw, 0.25)
    let speed = Math.hypot(s.vx, s.vz)
    while (s.acc >= STEP) {
      s.acc -= STEP
      const m = readMove()
      const sinY = Math.sin(s.camYaw), cosY = Math.cos(s.camYaw)
      const dx = -sinY * m.z + cosY * m.x, dz = -cosY * m.z - sinY * m.x            // camera-relative direction
      const mag = Math.min(1, Math.hypot(m.x, m.z)), top = (m.run ? RUN_SPEED : WALK_SPEED) * mag
      const dl = Math.hypot(dx, dz) || 1, tx = (dx / dl) * top, tz = (dz / dl) * top
      const k = 1 - Math.exp(-(top > 0 ? 9 : 12) * STEP)                           // quick to start, a touch quicker to stop
      s.vx += (tx - s.vx) * k; s.vz += (tz - s.vz) * k
      const p = { x: s.x + s.vx * STEP, z: s.z + s.vz * STEP }
      resolve(p, RADIUS, colliders)
      const ax = p.x - s.x, az = p.z - s.z; s.x = p.x; s.z = p.z
      // velocity follows the REAL displacement: a wall removes only the component that pushes into it, so she slides along it
      // at full tangential speed and the walk animation never plays against a wall
      // (capped at her previous speed: being pushed out of an overlap must never ADD speed)
      const cap = Math.hypot(s.vx, s.vz); let nvx = ax / STEP, nvz = az / STEP; const nm = Math.hypot(nvx, nvz)
      if (nm > cap && nm > 1e-6) { nvx *= cap / nm; nvz *= cap / nm }
      s.vx = nvx; s.vz = nvz
      speed = Math.hypot(s.vx, s.vz)
      if (speed > 0.25) s.yaw += wrap(Math.atan2(s.vx, s.vz) - s.yaw) * (1 - Math.exp(-11 * STEP))   // natural turning toward travel direction
      s.y += (groundY(s.x, s.z) - s.y) * (1 - Math.exp(-14 * STEP))
    }
    // ---- animation state ----
    if (speed < 0.18) play('Aiman_Idle', 1)
    else if (speed < (WALK_SPEED + RUN_SPEED) / 2) play('Aiman_Walk', Math.max(0.6, Math.min(1.6, speed / NAT_WALK)))
    else play('Aiman_Run', Math.max(0.8, Math.min(1.4, speed / NAT_RUN)))
    // ---- avatar transform ----
    group.current.position.set(s.x, s.y + lift * S, s.z); group.current.rotation.y = s.yaw
    // ---- interaction detection ----
    let best: string | null = null, bd = 1e9
    for (const it of INTERACTABLES) {
      const d = Math.hypot(it.x - s.x, it.z - s.z); if (d > it.radius) continue
      const facing = ((it.x - s.x) * Math.sin(s.yaw) + (it.z - s.z) * Math.cos(s.yaw)) / (d || 1)   // 1 = looking straight at it
      if (facing > -0.2 && d < bd) { bd = d; best = it.id }
    }
    if (best !== s.near) { s.near = best; onNear(best) }
    if (input.interact) { input.interact = false; if (s.near) onInteract(s.near) }
    // ---- camera: damped orbit, kept out of walls ----
    const px = s.x, py = s.y + 1.45, pz = s.z
    const cp = Math.cos(s.camPitch), dir = new THREE.Vector3(Math.sin(s.camYaw) * cp, Math.sin(s.camPitch), Math.cos(s.camYaw) * cp)
    const safe = clampCameraDistance(px, pz, dir.x, dir.z, s.wantDist, colliders)
    s.camDist += (safe - s.camDist) * (1 - Math.exp(-(safe < s.camDist ? 18 : 4) * dtRaw))        // pulls in fast, eases back out slowly
    const want = new THREE.Vector3(px + dir.x * s.camDist, Math.max(0.45, py + dir.y * s.camDist), pz + dir.z * s.camDist)
    if (!cam.init) { cam.pos.copy(want); cam.look.set(px, py, pz); cam.init = true }
    const kk = 1 - Math.exp(-10 * dtRaw); cam.pos.lerp(want, kk); cam.look.lerp(new THREE.Vector3(px, py + 0.05, pz), 1 - Math.exp(-14 * dtRaw))
    camera.position.copy(cam.pos); camera.lookAt(cam.look)
    // ---- debug / test hook ----
    s.frames++; s.fpsT += dtRaw; if (s.fpsT >= 1) { s.fps = s.frames / s.fpsT; s.frames = 0; s.fpsT = 0 }
    window.__ned = { x: s.x, y: s.y, z: s.z, yaw: s.yaw, speed, state: s.state, camYaw: s.camYaw, camDist: s.camDist, near: s.near, fps: s.fps, animTime: state.clock.elapsedTime }
  })

  return <group ref={group} scale={S}><primitive object={model} /></group>
}
