import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'

function WorldModel() {
  const gltf = useGLTF('/models/world/world.glb')
  return <primitive object={gltf.scene} />
}

export default function WorldExperience() {
  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 600, position: [-42, 34, -48] }}
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

        <OrbitControls
          target={[0, 8, 26]}
          enablePan={false}
          minDistance={24}
          maxDistance={170}
          maxPolarAngle={Math.PI * 0.49}
        />
      </Canvas>
    </div>
  )
}
