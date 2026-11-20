import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Text, useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { audio } from '../audio'
import { track } from '../game'
import { avatarBus, fx, tint } from './state'

// she only tracks you while you're near the gateway
const camera_near = (z: number) => THREE.MathUtils.clamp((14 - z) / 10, 0, 1) * THREE.MathUtils.clamp((z + 4) / 3, 0, 1)

const ringVert = /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
const ringFrag = /* glsl */ `
varying vec2 vP; uniform vec3 uColor; uniform float uT;
void main(){
  float a = atan(vP.y, vP.x) / 6.2831853 + .5;
  float dash = step(.45, fract(a * 36. + uT * .6));
  float sweep = smoothstep(.0, .35, fract(a - uT * .12));
  gl_FragColor = vec4(uColor, dash * (.25 + sweep * .75));
}`

function Avatar() {
  const { scene, animations } = useGLTF('/models/aiman-web.glb')
  const group = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(animations, group)
  const busy = useRef(false)
  const bones = useMemo(() => ({ head: scene.getObjectByName('head'), neck: scene.getObjectByName('neck') }), [scene])
  const look = useRef({ x: 0, y: 0 })
  useEffect(() => {
    actions['Aiman_Idle']?.reset().fadeIn(0.3).play()
  }, [actions])
  /** auto = the welcome greeting; it never counts toward a quest */
  const wave = (auto = false) => {
    const w = actions['Aiman_Greeting_Wave']
    const idle = actions['Aiman_Idle']
    if (!w || !idle || busy.current) return
    busy.current = true
    if (!auto) track('hello')
    audio.chime()
    w.reset().setLoop(THREE.LoopOnce, 1)
    w.clampWhenFinished = true
    idle.crossFadeTo(w, 0.3, false)
    w.play()
    setTimeout(() => {
      w.crossFadeTo(idle.reset().play(), 0.4, false)
      busy.current = false
    }, 4800)
  }
  const play = (name: string) => {
    const clip = actions[name]
    const idle = actions['Aiman_Idle']
    if (!clip || !idle || busy.current) return
    busy.current = true
    track('hello')
    clip.reset().setLoop(THREE.LoopOnce, 1)
    clip.clampWhenFinished = true
    idle.crossFadeTo(clip, 0.3, false)
    clip.play()
    setTimeout(() => {
      clip.crossFadeTo(idle.reset().play(), 0.4, false)
      busy.current = false
    }, 4800)
  }
  useEffect(() => {
    avatarBus.wave = () => wave(true)
    avatarBus.play = play
    return () => { avatarBus.wave = () => {}; avatarBus.play = () => {} }
  })
  // she follows the cursor with her head (applied after the animation mixer has written the pose)
  useFrame((state, dt) => {
    const near = camera_near(state.camera.position.z)
    const gx = fx.gaze ? fx.gaze.x : state.pointer.x
    const gy = fx.gaze ? fx.gaze.y : state.pointer.y
    const tx = gx * 0.55 * near
    const ty = -gy * 0.3 * near
    look.current.x = THREE.MathUtils.damp(look.current.x, tx, 4, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, ty, 4, dt)
    if (bones.neck) bones.neck.rotateY(look.current.x * 0.4), bones.neck.rotateX(look.current.y * 0.4)
    if (bones.head) bones.head.rotateY(look.current.x * 0.6), bones.head.rotateX(look.current.y * 0.6)
  })
  return (
    <group ref={group} position={[0, 1, 0]} onClick={() => wave(false)} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
      <primitive object={scene} />
    </group>
  )
}

export function Gateway({ reduced }: { reduced: boolean }) {
  const ring = useRef<THREE.ShaderMaterial>(null!)
  const frames = useRef<THREE.Group>(null!)
  const u = useMemo(() => ({ uColor: { value: new THREE.Color('#FF4A1C') }, uT: { value: 0 } }), [])
  const core = useRef<THREE.PointLight>(null!)
  useFrame(({ clock, pointer }) => {
    core.current.intensity = fx.charge * fx.charge * 60
    core.current.color.copy(tint.accent)
    u.uT.value = clock.elapsedTime
    u.uColor.value.copy(tint.accent)
    if (!reduced) {
      frames.current.rotation.y = pointer.x * 0.12
      frames.current.position.x = pointer.x * -0.25
    }
  })
  return (
    <group>
      <Avatar />
      <pointLight ref={core} position={[0, 1.7, 1.1]} intensity={0} distance={7} decay={2} />
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[1.15, 1.25, 0.12, 64]} />
        <meshStandardMaterial color="#14161e" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.5, 96]} />
        <shaderMaterial ref={ring} vertexShader={ringVert} fragmentShader={ringFrag} uniforms={u} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={frames}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 2.6, -2.2 - i * 1.6]} scale={1 + i * 0.28}>
            <boxGeometry args={[3, 5.4, 0.04]} />
            <meshBasicMaterial color="#000" transparent opacity={0.0} />
            <Edges color={i === 0 ? '#FF4A1C' : '#6b3a2c'} threshold={5} />
          </mesh>
        ))}
        <Text font="/fonts/bricolage-grotesque-latin-800-normal.woff" fontSize={2.1} position={[0, 4.9, -9]} fillOpacity={0} strokeWidth={0.012} strokeColor="#ECE7DB" anchorY="middle" letterSpacing={-0.03}>
          AIMANVERSE
        </Text>
      </group>
    </group>
  )
}
useGLTF.preload('/models/aiman-web.glb')
