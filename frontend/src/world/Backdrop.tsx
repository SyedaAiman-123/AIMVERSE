import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { audio } from '../audio'
import { fx, tint } from './state'

const skyVert = /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
const skyFrag = /* glsl */ `
varying vec3 vP; uniform vec3 uTop; uniform vec3 uBot; uniform float uT;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main(){
  vec3 d = normalize(vP); float y = d.y * .5 + .5;
  vec3 c = mix(uBot, uTop, pow(clamp(y,0.,1.), .75));
  vec2 g = vec2(atan(d.z, d.x) * 90., d.y * 160.);
  vec2 q = floor(g);
  float s = step(.9972, h(q)) * smoothstep(.32, .0, length(fract(g) - .5));
  c += s * (.45 + .55 * sin(uT * 1.5 + h(q + 1.) * 30.)) * smoothstep(.15, .6, y);
  gl_FragColor = vec4(c, 1.);
}`

// floor grid that reacts to the cursor (soft glow) and to clicks (expanding shockwave)
const gridVert = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const gridFrag = /* glsl */ `
varying vec3 vW; uniform vec3 uColor; uniform vec3 uCam; uniform vec3 uPtr; uniform vec3 uClick; uniform float uT; uniform float uClickT;
float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - .5) - .5) / fwidth(p / s); return 1. - min(min(g.x, g.y), 1.); }
void main(){
  float g = grid(vW.xz, 2.) * .55 + grid(vW.xz, 12.) * .6;
  float d = length(vW.xz - uCam.xz);
  float fade = smoothstep(46., 6., d);
  float dp = length(vW.xz - uPtr.xz);
  float glow = exp(-dp * dp / 9.);
  float age = uT - uClickT;
  float dc = length(vW.xz - uClick.xz);
  float ring = exp(-pow((dc - age * 11.) * .9, 2.)) * exp(-age * .55);
  float a = (g * (1. + glow * 2.2 + ring * 5.) + ring * .35 + glow * .06) * fade * .75;
  gl_FragColor = vec4(uColor * (.6 + g + ring * 2.), a);
}`

// dust that drifts around the camera and is pushed away by the cursor
const dustVert = /* glsl */ `
uniform vec3 uCam; uniform vec3 uPtr; uniform float uT; uniform float uSize;
varying float vA;
void main(){
  vec3 box = vec3(44., 12., 44.);
  vec3 p = mod(position - uCam + box * .5, box) - box * .5 + uCam;
  p.y += sin(uT * .3 + position.x) * .4;
  vec2 dv = p.xz - uPtr.xz;
  float dist = length(dv);
  float push = smoothstep(3.5, 0., dist);
  p.xz += normalize(dv + .0001) * push * 1.6;
  p.y += push * 1.1;
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (1. + push * 1.5) * (14. / -mv.z);
  vA = (1. - smoothstep(14., 22., -mv.z)) * (.35 + push * .65);
}`
const dustFrag = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; gl_FragColor = vec4(uColor, vA * smoothstep(.5, .1, r)); }`

export function Backdrop({ quality }: { quality: 'low' | 'high' }) {
  const gridMesh = useRef<THREE.Mesh>(null!)
  const skyMesh = useRef<THREE.Mesh>(null!)
  const { camera, scene, gl, raycaster, pointer } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const u = useMemo(
    () => ({
      sky: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uT: { value: 0 } },
      grid: { uColor: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uPtr: { value: new THREE.Vector3(0, 0, -9999) }, uClick: { value: new THREE.Vector3(0, 0, -9999) }, uT: { value: 0 }, uClickT: { value: -100 } },
      dust: { uCam: { value: new THREE.Vector3() }, uPtr: { value: new THREE.Vector3(0, 0, -9999) }, uT: { value: 0 }, uSize: { value: quality === 'low' ? 2.2 : 3 }, uColor: { value: new THREE.Color() } },
    }),
    [quality],
  )
  const dustGeo = useMemo(() => {
    const n = quality === 'low' ? 260 : 700
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      a[i * 3] = (Math.random() - 0.5) * 44
      a[i * 3 + 1] = Math.random() * 10
      a[i * 3 + 2] = (Math.random() - 0.5) * 44
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(a, 3))
    return g
  }, [quality])

  // click / press tracking on the canvas
  useEffect(() => {
    const el = gl.domElement
    const down = () => {
      fx.pressed = true
      fx.clickT = fx.time
      fx.click.copy(fx.ground)
    }
    const up = () => { fx.pressed = false }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up) }
  }, [gl])

  useFrame(({ clock }) => {
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.ray.intersectPlane(plane, hit) && hit.distanceTo(camera.position) < 60) fx.ground.copy(hit)
    const t = clock.elapsedTime
    u.sky.uTop.value.copy(tint.top)
    u.sky.uBot.value.copy(tint.bot)
    u.sky.uT.value = t
    u.grid.uColor.value.copy(tint.accent)
    u.grid.uCam.value.copy(camera.position)
    u.grid.uPtr.value.copy(fx.ground)
    u.grid.uClick.value.copy(fx.click)
    u.grid.uClickT.value = fx.clickT
    u.grid.uT.value = t
    u.dust.uCam.value.copy(camera.position)
    u.dust.uPtr.value.copy(fx.ground)
    u.dust.uT.value = t
    u.dust.uColor.value.copy(tint.accent).lerp(new THREE.Color('#ffffff'), 0.4)
    gridMesh.current.position.set(camera.position.x, -0.02, camera.position.z)
    skyMesh.current.position.copy(camera.position)
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(tint.bot).multiplyScalar(0.8)
  })

  // click sound for floor shockwaves (only when the click lands on empty space)
  useEffect(() => {
    const el = gl.domElement
    const h = () => audio.pulse()
    el.addEventListener('pointerdown', h)
    return () => el.removeEventListener('pointerdown', h)
  }, [gl])

  return (
    <>
      <mesh ref={skyMesh} renderOrder={-10}>
        <sphereGeometry args={[250, 48, 24]} />
        <shaderMaterial vertexShader={skyVert} fragmentShader={skyFrag} uniforms={u.sky} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <mesh ref={gridMesh} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <shaderMaterial vertexShader={gridVert} fragmentShader={gridFrag} uniforms={u.grid} transparent depthWrite={false} />
      </mesh>
      <points geometry={dustGeo} frustumCulled={false}>
        <shaderMaterial vertexShader={dustVert} fragmentShader={dustFrag} uniforms={u.dust} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  )
}
