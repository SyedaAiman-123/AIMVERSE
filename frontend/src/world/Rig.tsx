import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ACCENTS, ISLAND_POS, JOURNEY_Z, SECTION_COUNT, SKILLS_Z, SKY, fx, intro, scroll, tint } from './state'
import { audio } from '../audio'

const dwell = (u: number) => {
  const a = 0.18
  if (u < a) return 0
  if (u > 1 - a) return 1
  const x = (u - a) / (1 - 2 * a)
  return x * x * (3 - 2 * x)
}

/** Scroll-driven camera flight, cinematic entry blend, sky/accent tinting and the follow + cursor lights. */
export function Rig({ reduced, narrow, onSection }: { reduced: boolean; narrow: boolean; onSection: (i: number) => void }) {
  const { camera, scene } = useThree()
  const light = useRef<THREE.PointLight>(null!)
  const cursor = useRef<THREE.PointLight>(null!)
  const last = useRef(-1)
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), a: new THREE.Color(), b: new THREE.Color(), cp: new THREE.Vector3(), cl: new THREE.Vector3() }), [])

  const { camCurve, lookCurve, closeP, closeL } = useMemo(() => {
    const zBack = narrow ? 3.5 : 0
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
    const cam: THREE.Vector3[] = [V(0, narrow ? 1.8 : 1.6, 5.6 + zBack)]
    const look: THREE.Vector3[] = [V(narrow ? 0 : -1.6, narrow ? 0.4 : 1.15, 0)]
    // 1 — About / Meet Aiman: a three-quarter view of the avatar, she sits right of the text
    cam.push(narrow ? V(0, 1.6, 5.6) : V(1.9, 1.55, 4.3))
    look.push(narrow ? V(0, 0.55, 0) : V(-1.1, 1.1, 0))
    // 2–6 — project destinations
    ISLAND_POS.forEach(([x, z]) => {
      cam.push(V(narrow ? 0 : x * 0.2, 3.1, z + 11.5 + zBack))
      look.push(V(narrow ? 0 : x - Math.sign(x) * 3.4, narrow ? 0.4 : 1.2, z))
    })
    // 7 — skill constellation (floats right of the text)
    cam.push(V(0, 2.8, SKILLS_Z + 10.5 + zBack))
    look.push(V(narrow ? 0 : -4.3, narrow ? 2.0 : 2.7, SKILLS_Z))
    // 8 — journey: year monoliths
    cam.push(V(0, 2.6, JOURNEY_Z + 12 + zBack))
    look.push(V(narrow ? 0 : -1.9, narrow ? 1.2 : 2.2, JOURNEY_Z))
    // 9 — contact: look out over the horizon
    cam.push(V(0, 2.2, JOURNEY_Z - 14))
    look.push(V(0, 2.8, JOURNEY_Z - 50))
    return {
      camCurve: new THREE.CatmullRomCurve3(cam, false, 'centripetal'),
      lookCurve: new THREE.CatmullRomCurve3(look, false, 'centripetal'),
      closeP: narrow ? new THREE.Vector3(0, 1.55, 3.3) : new THREE.Vector3(0.3, 1.6, 3.1),
      closeL: narrow ? new THREE.Vector3(0, 1.45, 0) : new THREE.Vector3(-0.4, 1.35, 0),
    }
  }, [narrow])

  useFrame((state, dt) => {
    fx.time = state.clock.elapsedTime
    scroll.smooth = THREE.MathUtils.damp(scroll.smooth, scroll.progress, reduced ? 40 : 3.4, dt)
    scroll.velocity = THREE.MathUtils.damp(scroll.velocity, (scroll.progress - scroll.smooth) * 60, 6, dt)
    audio.travel(scroll.velocity * 0.4)
    const f = scroll.smooth * (SECTION_COUNT - 1)
    const i = Math.min(Math.floor(f), SECTION_COUNT - 2)
    const e = dwell(f - i)
    const t = Math.min(1, (i + e) / (SECTION_COUNT - 1))
    camCurve.getPoint(t, tmp.p)
    lookCurve.getPoint(t, tmp.l)

    // cinematic entry: blend from the avatar close-up to the path
    const k = intro.t
    const ke = k * k * (3 - 2 * k)
    const pxs = reduced ? 0 : state.pointer.x * THREE.MathUtils.lerp(0.18, 0.35, ke)
    const pys = reduced ? 0 : state.pointer.y * THREE.MathUtils.lerp(0.08, 0.18, ke)
    tmp.cp.copy(closeP)
    // holding the entry button pushes the camera toward her and adds a faint tremor
    tmp.cp.z -= fx.charge * 0.9
    tmp.cp.y += fx.charge * 0.05
    tmp.p.lerpVectors(tmp.cp, tmp.p, ke)
    // the pull-out swings in a gentle arc instead of a straight line
    tmp.p.x += Math.sin(Math.PI * k) * (narrow ? 0 : -1.6)
    tmp.p.y += Math.sin(Math.PI * k) * 0.5
    if (fx.charge > 0 && !reduced) { tmp.p.x += (Math.random() - 0.5) * fx.charge * 0.025; tmp.p.y += (Math.random() - 0.5) * fx.charge * 0.025 }
    tmp.cl.copy(closeL)
    tmp.l.lerpVectors(tmp.cl, tmp.l, ke)
    tmp.p.x += pxs
    tmp.p.y += pys
    // journey: glide toward the selected year; everywhere: a slow breathing drift
    const jw = Math.max(0, 1 - Math.abs(f - 8) * 2.2)
    tmp.l.x += fx.journeyShift * jw
    tmp.p.x += fx.journeyShift * jw * 0.6
    if (!reduced) tmp.p.x += Math.sin(state.clock.elapsedTime * 0.35) * 0.1
    camera.position.copy(tmp.p)
    camera.lookAt(tmp.l)

    const cam = camera as THREE.PerspectiveCamera
    const baseFov = narrow ? 58 : 46
    const closeFov = narrow ? 36 : 30
    const targetFov = THREE.MathUtils.lerp(closeFov - fx.charge * 7, baseFov + Math.min(14, Math.abs(scroll.velocity) * 9) + Math.sin(Math.PI * k) * 10, ke)
    cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 6, dt)
    cam.updateProjectionMatrix()

    // fog: hazy and intimate in the close-up, open once you enter
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog
      fog.near = THREE.MathUtils.lerp(2.5, 14, ke)
      fog.far = THREE.MathUtils.lerp(15, 60, ke)
    }

    tint.top.set(SKY[i][0]).lerp(tmp.a.set(SKY[i + 1][0]), e)
    tint.bot.set(SKY[i][1]).lerp(tmp.b.set(SKY[i + 1][1]), e)
    tint.accent.set(ACCENTS[i]).lerp(tmp.a.set(ACCENTS[i + 1]), e)
    light.current.color.copy(tint.accent)
    light.current.position.set(tmp.p.x, tmp.p.y + 1.2, tmp.p.z - 4)

    // a light that follows the cursor across the floor
    cursor.current.color.copy(tint.accent)
    cursor.current.position.lerp(tmp.cp.set(fx.ground.x, 1.4, fx.ground.z), 0.18)
    cursor.current.intensity = fx.ground.z < -9000 ? 0 : 14

    const near = Math.round(i + e)
    if (near !== last.current) {
      last.current = near
      onSection(near)
    }
  })

  return (
    <>
      <pointLight ref={light} intensity={26} distance={18} decay={2} />
      <pointLight ref={cursor} intensity={0} distance={7} decay={2} />
    </>
  )
}
