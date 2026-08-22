import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import Player from './player'

function WorldModel() {
  const gltf = useGLTF('/models/world/world.glb')
  return <primitive object={gltf.scene} />
}

function Overlay({ phase, ready }) {
  const title = phase === 'title' ? 'NamanCraft' : 'Paused'
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 bg-[#0c120e]/85 backdrop-blur-sm max-sm:gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[#c9d4cb]/70 sm:text-sm">
          Naman Singh · Creative Developer
        </p>
        <h1 className="font-display text-7xl font-medium tracking-[-0.02em] text-[#f4f1ea] max-sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-[420px] text-sm leading-relaxed text-[#c9d4cb]/80">
          A walkable Minecraft-style portfolio world. Gray-box build.
        </p>
      </div>

      <button
        id="enter-world-btn"
        type="button"
        disabled={!ready}
        className="cursor-pointer border-2 border-[#f4f1ea]/80 bg-[#f4f1ea]/10 px-10 py-4 font-display text-xl tracking-[0.08em] text-[#f4f1ea] uppercase transition-colors hover:bg-[#f4f1ea]/25 disabled:cursor-wait disabled:opacity-40"
      >
        {!ready ? 'Loading world…' : phase === 'title' ? 'Enter World' : 'Resume'}
      </button>

      <p className="text-[11px] uppercase tracking-[0.3em] text-[#c9d4cb]/60">
        WASD move · Space jump · Mouse look · Esc pause
      </p>
    </div>
  )
}

export default function WorldExperience() {
  const [phase, setPhase] = useState('title')
  const [ready, setReady] = useState(false)

  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 75, near: 0.1, far: 600, position: [0, 20, 30] }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
      >
        <color attach="background" args={['#f2b26b']} />
        <fogExp2 attach="fog" args={['#e8a06a', 0.0035]} />
        <hemisphereLight args={['#ffd9a0', '#4a3b2f', 0.7]} />
        <directionalLight color="#ffb36b" intensity={2.4} position={[70, 45, -40]} />

        <Suspense fallback={null}>
          <WorldModel />
        </Suspense>

        <Player onReady={() => setReady(true)} onLockChange={(locked) => setPhase(locked ? 'playing' : 'paused')} />
      </Canvas>

      {phase !== 'playing' && <Overlay phase={phase} ready={ready} />}
    </div>
  )
}
