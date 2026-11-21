import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AVATAR_HEIGHT, measureGrounding } from '../grounding'
import { CAR_START, INTERACTABLES, SPAWN, groundY } from './layout'
import { clampCameraDistance, resolve, type Box, type Collider } from './collision'
import { input, readMove } from './input'

/* Third-person player. On foot: your avatar (existing GLB + the Blender-authored Walk/Run clips) with smooth acceleration, natural
   turning, wall-sliding collisions. By car: walk to the parked car, press E, she gets in and the player tours the campus by car
   (arcade handling, spinning/steering wheels, chase camera) and can stop at any portfolio stop. Press E again (slowly) to get out. */

export const WALK_SPEED = 2.5, RUN_SPEED = 5.6, NAT_WALK = 1.3, NAT_RUN = 3.1   // m/s; NAT_* = speed the authored cycles cover at 1x
export const CAR_SPEED = 18, CAR_BOOST = 25, CAR_REVERSE = 7                    // m/s  (18 m/s = ~65 km/h)
const RADIUS = 0.38, STEP = 1 / 60, WHEELBASE = 2.6, CAR_R = 0.95, CAR_OFFS = [-1.25, 0, 1.25], WHEEL_R = 0.3
const DOOR = { x: -1.9, z: 0.35 }

export type Mode = 'foot' | 'entering' | 'driving' | 'exiting'
export type PlayerDebug = { x: number; y: number; z: number; yaw: number; speed: number; state: string; camYaw: number; camDist: number; near: string | null; fps: number; animTime: number; mode: Mode; carX: number; carZ: number; carYaw: number; carV: number; fov: number }
declare global { interface Window { __ned?: PlayerDebug } }

const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a }
const toWorld = (c: { x: number; z: number; yaw: number }, lx: number, lz: number) => ({ x: c.x + lx * Math.cos(c.yaw) + lz * Math.sin(c.yaw), z: c.z - lx * Math.sin(c.yaw) + lz * Math.cos(c.yaw) })

export function Player({ colliders, onNear, onInteract, onMode }: { colliders: Collider[]; onNear: (id: string | null) => void; onInteract: (id: string) => void; onMode: (m: Mode) => void }) {
  const { camera } = useThree()
  const { scene, animations } = useGLTF('/models/aiman-web.glb')
  const loco = useGLTF('/models/aiman-locomotion.glb')
  const carGltf = useGLTF('/models/corolla.glb')
  const { model, lift, height } = useMemo(() => { const m = clone(scene); m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } }); return { model: m, ...measureGrounding(m) } }, [scene])
  const S = AVATAR_HEIGHT / height
  const carObj = useMemo(() => {
    // the supplied GLB holds two cars (wagon + sedan): keep the sedan, centre it on the origin and sit it on the ground
    const c = clone(carGltf.scene); c.getObjectByName('body_wagon')?.removeFromParent()
    const body = c.getObjectByName('body_sedan')!; body.position.set(0, body.position.y, 0)
    c.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
    c.updateMatrixWorld(true); body.position.y -= new THREE.Box3().setFromObject(body).min.y
    const wheels = { FL: body.getObjectByName('Cylinder004')!, FR: body.getObjectByName('Cylinder006')!, RL: body.getObjectByName('Cylinder005')!, RR: body.getObjectByName('Cylinder007')! }
    Object.values(wheels).forEach((w) => { w.rotation.order = 'YXZ' })
    return { c, wheels }
  }, [carGltf.scene])
  const group = useRef<THREE.Group>(null!), carGroup = useRef<THREE.Group>(null!), carBody = useRef<THREE.Group>(null!)
  const clips = useMemo(() => [...animations, ...loco.animations], [animations, loco.animations])
  const { actions } = useAnimations(clips, group)

  // QA hook: ?x=&z=&yaw= overrides the spawn point; ?car=x,z,yaw moves the parked car; ?drive=1 starts inside the car (used by the automated tests)
  const q = new URLSearchParams(location.search), sx = q.has('x') ? +q.get('x')! : SPAWN.x, sz = q.has('z') ? +q.get('z')! : SPAWN.z, syaw = q.has('yaw') ? +q.get('yaw')! : SPAWN.yaw
  const cs = q.get('car')?.split(',').map(Number)
  const st = useRef({
    x: sx, z: sz, y: groundY(sx, sz), vx: 0, vz: 0, yaw: syaw, vis: 1, mode: 'foot' as Mode, t: 0, door: { x: 0, z: 0 },
    camYaw: q.has('cam') ? +q.get('cam')! : SPAWN.yaw + Math.PI, camPitch: 0.28, camDist: 4.4, wantDist: 4.4, footDist: 4.4, carDist: 7.6, lastLook: -9, camSwitch: -9,
    state: 'Idle', near: null as string | null, acc: 0, frames: 0, fpsT: 0, fps: 0,
    car: { x: cs?.[0] ?? CAR_START.x, z: cs?.[1] ?? CAR_START.z, yaw: cs?.[2] ?? CAR_START.yaw, v: 0, steer: 0, spin: 0, roll: 0, pitch: 0, yawRate: 0, fov: 55 },
  })
  const cam = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false }), [])
  // the parked car is an obstacle for the avatar on foot (a box that follows the car)
  const carBox = useMemo<Box>(() => ({ kind: 'b', x: 0, z: 0, hw: 1.0, hd: 2.2, rot: 0 }), [])
  const footCols = useMemo(() => [...colliders, carBox], [colliders, carBox])

  const setMode = (m: Mode) => { st.current.mode = m; onMode(m) }
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
  useEffect(() => {
    actions['Aiman_Idle']?.reset().play(); st.current.state = 'Aiman_Idle'
    if (q.get('drive') === '1') { const s = st.current; s.vis = 0; s.camYaw = s.car.yaw + Math.PI; s.wantDist = s.carDist; setMode('driving') }
  }, [actions])  // eslint-disable-line react-hooks/exhaustive-deps

  /** one 60 Hz car physics step (arcade bicycle model) */
  const driveStep = () => {
    const s = st.current, c = s.car, m = readMove()
    const space = input.keys.has('Space')
    const vmax = m.run ? CAR_BOOST : CAR_SPEED
    const throttle = m.z
    const target = throttle > 0 ? vmax * throttle : throttle < 0 ? CAR_REVERSE * throttle : 0
    if (space) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 26 * STEP)
    else if (throttle * Math.sign(c.v || throttle) < 0) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 22 * STEP)   // braking
    else if (throttle !== 0) { const a = (target > c.v ? (c.v < 0 ? 6 : 8.5) : 10) * STEP; c.v += Math.max(-a, Math.min(a, target - c.v)) }
    else c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), (2.6 + Math.abs(c.v) * 0.25) * STEP)                     // coast
    const want = -m.x * 0.6 / (1 + Math.abs(c.v) * 0.07)
    c.steer += (want - c.steer) * (1 - Math.exp(-9 * STEP))
    c.yawRate = (c.v / WHEELBASE) * Math.tan(c.steer); c.yaw += c.yawRate * STEP
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ox = c.x, oz = c.z
    c.x += fx * c.v * STEP; c.z += fz * c.v * STEP
    for (let pass = 0; pass < 2; pass++) for (const off of CAR_OFFS) {
      const p = { x: c.x + fx * off, z: c.z + fz * off }, bx = p.x, bz = p.z
      resolve(p, CAR_R, colliders); c.x += p.x - bx; c.z += p.z - bz
    }
    const real = ((c.x - ox) * fx + (c.z - oz) * fz) / STEP
    if (Math.abs(real) < Math.abs(c.v) * 0.35) c.v = real          // head-on: stop dead (arcade); glancing blows keep rolling
    c.spin += (c.v / WHEEL_R) * STEP
  }

  useFrame((state, dtRaw) => {
    const s = st.current, c = s.car
    const dt = Math.min(dtRaw, 0.1)
    // ---- camera look / zoom ----
    if (input.lookDX || input.lookDY) { s.camYaw -= input.lookDX * 0.0055; s.camPitch = Math.max(-0.2, Math.min(1.1, s.camPitch + input.lookDY * 0.0045)); input.lookDX = input.lookDY = 0; s.lastLook = state.clock.elapsedTime }
    if (input.zoom) { s.wantDist = Math.max(2.4, Math.min(s.mode === 'driving' ? 13 : 8, s.wantDist + input.zoom * 0.004)); input.zoom = 0 }
    // ---- fixed-timestep simulation (frame-rate independent, also on slow machines) ----
    s.acc = Math.min(s.acc + dtRaw, 0.5)
    let speed = Math.hypot(s.vx, s.vz)
    while (s.acc >= STEP) {
      s.acc -= STEP
      if (s.mode === 'foot') {
        carBox.x = c.x; carBox.z = c.z; carBox.rot = c.yaw
        c.v = 0
        const m = readMove()
        const sinY = Math.sin(s.camYaw), cosY = Math.cos(s.camYaw)
        const dx = -sinY * m.z + cosY * m.x, dz = -cosY * m.z - sinY * m.x            // camera-relative direction
        const mag = Math.min(1, Math.hypot(m.x, m.z)), top = (m.run ? RUN_SPEED : WALK_SPEED) * mag
        const dl = Math.hypot(dx, dz) || 1, tx = (dx / dl) * top, tz = (dz / dl) * top
        const k = 1 - Math.exp(-(top > 0 ? 9 : 12) * STEP)                           // quick to start, a touch quicker to stop
        s.vx += (tx - s.vx) * k; s.vz += (tz - s.vz) * k
        const p = { x: s.x + s.vx * STEP, z: s.z + s.vz * STEP }
        resolve(p, RADIUS, footCols)
        const ax = p.x - s.x, az = p.z - s.z; s.x = p.x; s.z = p.z
        // velocity follows the REAL displacement (she slides along walls; the walk animation never plays against a wall),
        // capped at her previous speed so being pushed out of an overlap never ADDS speed
        const cap = Math.hypot(s.vx, s.vz); let nvx = ax / STEP, nvz = az / STEP; const nm = Math.hypot(nvx, nvz)
        if (nm > cap && nm > 1e-6) { nvx *= cap / nm; nvz *= cap / nm }
        s.vx = nvx; s.vz = nvz
        speed = Math.hypot(s.vx, s.vz)
        if (speed > 0.25) s.yaw += wrap(Math.atan2(s.vx, s.vz) - s.yaw) * (1 - Math.exp(-11 * STEP))   // natural turning toward travel direction
        s.y += (groundY(s.x, s.z) - s.y) * (1 - Math.exp(-14 * STEP))
      } else if (s.mode === 'entering') {
        // she walks by herself to the driver's door, turns to the car and steps in
        const dx = s.door.x - s.x, dz = s.door.z - s.z, d = Math.hypot(dx, dz)
        if (d > 0.1 && s.t < 0.01) {
          const sp = 2.2; s.x += (dx / d) * Math.min(d, sp * STEP); s.z += (dz / d) * Math.min(d, sp * STEP); speed = sp
          s.yaw += wrap(Math.atan2(dx, dz) - s.yaw) * (1 - Math.exp(-12 * STEP))
        } else {
          speed = 0; s.t += STEP
          s.yaw += wrap(Math.atan2(c.x - s.x, c.z - s.z) - s.yaw) * (1 - Math.exp(-10 * STEP))      // face the car
          s.vis = 0                                                                                 // first-person: no avatar in view
          if (s.t > 0.62) { s.vis = 0; cam.init = false; s.vx = s.vz = 0; s.camYaw = wrap(c.yaw + Math.PI); s.wantDist = s.carDist; s.t = 0; s.camSwitch = state.clock.elapsedTime; setMode('driving') }
        }
      } else if (s.mode === 'driving') {
        driveStep(); speed = 0
      } else if (s.mode === 'exiting') {
        c.v += -Math.sign(c.v) * Math.min(Math.abs(c.v), 10 * STEP); c.spin += (c.v / WHEEL_R) * STEP
        s.t += STEP; s.vis = Math.min(1, s.t / 0.35); speed = 0
        if (s.t > 0.4) { s.t = 0; s.vis = 1; setMode('foot') }
      }
    }
    // ---- animation state ----
    if (s.mode === 'foot' || s.mode === 'entering') {
      if (speed < 0.18) play('Aiman_Idle', 1)
      else if (speed < (WALK_SPEED + RUN_SPEED) / 2) play('Aiman_Walk', Math.max(0.6, Math.min(2.0, speed / NAT_WALK)))
      else play('Aiman_Run', Math.max(0.8, Math.min(2.0, speed / NAT_RUN)))
    } else play('Aiman_Idle', 1)
    // ---- avatar + car transforms ----
    // render position = last physics state + velocity * leftover time (keeps motion smooth on 120/144 Hz displays)
    const lf = Math.min(s.acc, STEP), fwx = Math.sin(c.yaw), fwz = Math.cos(c.yaw)
    const rx = s.x + (s.mode === 'foot' ? s.vx * lf : 0), rz = s.z + (s.mode === 'foot' ? s.vz * lf : 0)
    const crx = c.x + fwx * c.v * lf, crz = c.z + fwz * c.v * lf
    const g = group.current; g.visible = s.vis > 0.02 && s.mode !== 'entering'; g.position.set(rx, s.y + lift * S * s.vis, rz); g.rotation.y = s.yaw; g.scale.setScalar(S * Math.max(0.01, s.vis))
    const cg = carGroup.current; cg.position.set(crx, groundY(c.x, c.z), crz); cg.rotation.y = c.yaw
    const lean = s.mode === 'driving' ? 1 : 0
    c.roll += (-c.yawRate * c.v * 0.012 * lean - c.roll) * (1 - Math.exp(-6 * dt)); c.pitch += (0 - c.pitch) * (1 - Math.exp(-6 * dt))
    carBody.current.rotation.set(0, 0, THREE.MathUtils.clamp(c.roll, -0.07, 0.07))
    const w = carObj.wheels; w.FL.rotation.set(c.spin, c.steer, 0); w.FR.rotation.set(c.spin, c.steer, 0); w.RL.rotation.set(c.spin, 0, 0); w.RR.rotation.set(c.spin, 0, 0)
    // ---- interaction detection ----
    let best: string | null = null
    const carPos = s.mode === 'driving' ? c : s
    if (s.mode === 'foot') {
      let bd = 1e9
      for (const it of INTERACTABLES) {
        const d = Math.hypot(it.x - s.x, it.z - s.z); if (d > it.radius) continue
        const facing = ((it.x - s.x) * Math.sin(s.yaw) + (it.z - s.z) * Math.cos(s.yaw)) / (d || 1)   // 1 = looking straight at it
        if (facing > -0.2 && d < bd) { bd = d; best = it.id }
      }
      if (!best && Math.hypot(c.x - s.x, c.z - s.z) < 4.0) best = 'car'
    } else if (s.mode === 'driving') {
      let bd = 1e9
      for (const it of INTERACTABLES) { const d = Math.hypot(it.x - carPos.x, it.z - carPos.z); if (d < it.carRadius && d < bd) { bd = d; best = it.id } }
      if (!best && Math.abs(c.v) < 1.5) best = 'exit'
    }
    if (best !== s.near) { s.near = best; onNear(best) }
    if (input.interact) {
      input.interact = false
      if (s.mode === 'foot' && s.near === 'car') {
        s.door = toWorld(c, DOOR.x, DOOR.z); s.t = 0; s.vx = s.vz = 0; setMode('entering')
      } else if (s.mode === 'foot' && s.near) onInteract(s.near)
      else if (s.mode === 'driving' && s.near && s.near !== 'exit') onInteract(s.near)
      else if (s.mode === 'driving' && Math.abs(c.v) < 1.5) {
        // step out on a free side of the car
        const cands = [DOOR, { x: -DOOR.x, z: DOOR.z }]; let pick = toWorld(c, cands[0].x, cands[0].z)
        for (const k of cands) { const p = toWorld(c, k.x, k.z), b = { ...p }; resolve(p, RADIUS, footCols); if (Math.hypot(p.x - b.x, p.z - b.z) < 0.05) { pick = p; break } }
        resolve(pick, RADIUS, colliders)
        s.x = pick.x; s.z = pick.z; s.y = groundY(s.x, s.z); s.yaw = c.yaw; s.vx = s.vz = 0; s.t = 0; s.vis = 0.01
        s.wantDist = s.footDist; setMode('exiting')
      }
    }
    // ---- camera: damped orbit (on foot) / first-person while getting in / chase (driving), kept out of walls ----
    const driving = s.mode === 'driving', entering = s.mode === 'entering'
    const pc = camera as THREE.PerspectiveCamera
    if (entering) {
      // first-person: eyes at head height, walking up to the driver's door and looking at the car; then a quick dip to black as she gets in
      const ex = rx + Math.sin(s.yaw) * 0.15, ez = rz + Math.cos(s.yaw) * 0.15, ey = s.y + 1.55
      const lx = s.door.x + (c.x - s.door.x) * 0.7, lz = s.door.z + (c.z - s.door.z) * 0.7
      const want = new THREE.Vector3(ex, ey, ez)
      if (!cam.init) { cam.pos.copy(want); cam.look.set(lx, 0.9, lz); cam.init = true }
      cam.pos.lerp(want, 1 - Math.exp(-10 * dtRaw)); cam.look.lerp(new THREE.Vector3(lx, 1.0, lz), 1 - Math.exp(-8 * dtRaw))
      camera.position.copy(cam.pos); camera.lookAt(cam.look)
      const wf = 72; if (Math.abs(pc.fov - wf) > 0.05) { pc.fov += (wf - pc.fov) * (1 - Math.exp(-5 * dt)); pc.updateProjectionMatrix() }
    } else {
      if (driving && state.clock.elapsedTime - s.lastLook > 1.6) s.camYaw += wrap(c.yaw + Math.PI - s.camYaw) * (1 - Math.exp(-2.6 * dt))
      const tx = driving ? crx : rx, ty = driving ? 1.25 : s.y + 1.45, tz = driving ? crz : rz
      const cp = Math.cos(s.camPitch), dir = new THREE.Vector3(Math.sin(s.camYaw) * cp, Math.sin(s.camPitch), Math.cos(s.camYaw) * cp)
      const safe = clampCameraDistance(tx, tz, dir.x, dir.z, s.wantDist, colliders)
      s.camDist += (safe - s.camDist) * (1 - Math.exp(-(safe < s.camDist ? 18 : 4) * dtRaw))        // pulls in fast, eases back out slowly
      const want = new THREE.Vector3(tx + dir.x * s.camDist, Math.max(0.45, ty + dir.y * s.camDist), tz + dir.z * s.camDist)
      if (!cam.init) { cam.pos.copy(want); cam.look.set(tx, ty, tz); cam.init = true }
      const settle = Math.max(0, 1 - (state.clock.elapsedTime - s.camSwitch) / 1.2)               // gentle glide from cockpit to chase view
      const kk = 1 - Math.exp(-(driving ? 9 - 5 * settle : 12) * dtRaw); cam.pos.lerp(want, kk); cam.look.lerp(new THREE.Vector3(tx, ty + 0.05, tz), 1 - Math.exp(-(14 - 8 * settle) * dtRaw))
      camera.position.copy(cam.pos); camera.lookAt(cam.look)
      const wantFov = 58 + (driving ? Math.min(16, Math.abs(c.v) * 0.6) : 0)
      if (Math.abs(pc.fov - wantFov) > 0.05) { pc.fov += (wantFov - pc.fov) * (1 - Math.exp(-3 * dt)); pc.updateProjectionMatrix() }
    }
    // dip-to-black while stepping into the car, then fade back in on the chase view
    const fadeEl = document.querySelector<HTMLElement>('.nv-fade')
    if (fadeEl) { const f = entering ? Math.min(1, Math.max(0, (s.t - 0.1) / 0.4)) : Math.max(0, 1 - (state.clock.elapsedTime - s.camSwitch) / 0.6); fadeEl.style.opacity = String(f) }
    // ---- debug / test hook ----
    s.frames++; s.fpsT += dtRaw; if (s.fpsT >= 1) { s.fps = s.frames / s.fpsT; s.frames = 0; s.fpsT = 0 }
    window.__ned = { x: s.x, y: s.y, z: s.z, yaw: s.yaw, speed: driving ? Math.abs(c.v) : speed, state: s.state, camYaw: s.camYaw, camDist: s.camDist, near: s.near, fps: s.fps, animTime: state.clock.elapsedTime, mode: s.mode, carX: c.x, carZ: c.z, carYaw: c.yaw, carV: c.v, fov: (camera as THREE.PerspectiveCamera).fov }
  })

  return (
    <>
      <group ref={group} scale={S}><primitive object={model} /></group>
      <group ref={carGroup}><group ref={carBody}><primitive object={carObj.c} /></group></group>
    </>
  )
}
