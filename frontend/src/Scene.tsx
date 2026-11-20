import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Backdrop } from './world/Backdrop'
import { Gateway } from './world/Gateway'
import { ActiveCtx, Islands, Reveal } from './world/Islands'
import { Constellation, EXTRA_POS, FactOrbs, Journey } from './world/Extras'
import { Rig } from './world/Rig'
import { fx, scroll } from './world/state'

export type Quality = 'low' | 'high'

function Effects() {
  const ca = useRef<{ offset: { set: (x: number, y: number) => void } }>(null)
  useFrame(() => {
    const v = Math.min(0.008, Math.abs(scroll.velocity) * 0.0016 + fx.charge * 0.006)
    ca.current?.offset.set(v, v)
  })
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.6} luminanceSmoothing={0.25} />
      <ChromaticAberration ref={ca as never} offset={[0.0003, 0.0003] as never} radialModulation={false} modulationOffset={0} />
      <Noise opacity={0.07} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette offset={0.25} darkness={0.7} />
    </EffectComposer>
  )
}

export default function Scene({ quality, reduced, narrow, near, onSection, onReady, onOpen, skill, onSkill, fact, onFact, year, onYear }: { quality: Quality; reduced: boolean; narrow: boolean; near: number; onSection: (i: number) => void; onReady: () => void; onOpen: (island: number, project: number, media?: number) => void; skill: string | null; onSkill: (s: string | null) => void; fact: string | null; onFact: (s: string | null) => void; year: string | null; onYear: (y: string | null) => void }) {
  return (
    <Canvas
      dpr={quality === 'low' ? [1, 1.25] : [1, 1.75]}
      camera={{ fov: 46, position: [0, 1.7, 7.5], near: 0.1, far: 400 }}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
      onCreated={onReady}
      aria-label="Interactive 3D AIMANVERSE world. Scroll to travel."
    >
      <fog attach="fog" args={['#2a0f08', 14, 60]} />
      <hemisphereLight args={['#9db0ff', '#1a0d10', 0.55]} />
      <directionalLight position={[3, 6, 6]} intensity={2.4} color="#ffe2c4" />
      <pointLight position={[1.6, 2.4, 3.4]} intensity={30} color="#ffd9b8" distance={12} decay={2} />
      <pointLight position={[-2.2, 2.2, -1]} intensity={18} color="#ff6a3a" distance={10} decay={2} />
      <Suspense fallback={null}>
        <Environment resolution={128} environmentIntensity={0.5}>
          <Lightformer form="rect" intensity={4} position={[0, 5, -6]} scale={[10, 2, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={2} position={[-6, 2, 4]} scale={[2, 6, 1]} color="#8fb0ff" />
          <Lightformer form="rect" intensity={2.5} position={[6, 2, -3]} scale={[2, 6, 1]} color="#ff7a4a" />
        </Environment>
        <Gateway reduced={reduced} />
      </Suspense>
      <Backdrop quality={quality} />
      <Islands near={near} quality={quality} onOpen={onOpen} />
      <Suspense fallback={null}>
        {near === 1 && <FactOrbs selected={fact} onSelect={onFact} />}
        {Math.abs(near - 7) <= 1 && (
          <group position={EXTRA_POS.skills}>
            <Reveal idx={7}>
            <ActiveCtx.Provider value={near === 7}>
              <Constellation quality={quality} selected={skill} onSelect={onSkill} onOpen={(gi, pi) => onOpen(gi, pi)} />
            </ActiveCtx.Provider>
            </Reveal>
          </group>
        )}
        {Math.abs(near - 8) <= 1 && (
          <group position={EXTRA_POS.journey}>
            <Reveal idx={8}>
            <ActiveCtx.Provider value={near === 8}>
              <Journey year={year} onYear={onYear} onOpen={(gi, pi) => onOpen(gi, pi)} />
            </ActiveCtx.Provider>
            </Reveal>
          </group>
        )}
      </Suspense>
      <Rig reduced={reduced} narrow={narrow} onSection={onSection} />
      {quality === 'high' && <Effects />}
    </Canvas>
  )
}
