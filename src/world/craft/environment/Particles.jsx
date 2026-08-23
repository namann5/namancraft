import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Floating fireflies/dust motes along the path corridor. Cheap: static
// positions, whole field bobs and drifts; additive so they glow at dusk.
export default function Particles({ count = 220 }) {
  const ref = useRef(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      // corridor around the path & plaza (three.js z is negative toward zones)
      positions[i * 3] = (Math.random() - 0.5) * 70
      positions[i * 3 + 1] = 7.5 + Math.random() * 9
      positions[i * 3 + 2] = -95 + Math.random() * 110
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = Math.sin(t * 0.35) * 0.6
    ref.current.position.x = Math.sin(t * 0.12) * 1.4
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffd9a0"
        size={0.16}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
