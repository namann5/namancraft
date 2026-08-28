import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { dayState } from './dayCycle'

// Festival diya lamps — soft warm glows (point sprites + a faint point
// light) ringing the arrival ghat and lining the path edge. They read as
// little oil lamps for the festival/heritage theme: warm, additive,
// brightest at night. No geometry rebuild — just glowing accents.

const LAMP_POSITIONS = [
  // ring around the arrival ghat (spawn plaza)
  [0.0, 0.35, 6.0], [3.4, 0.35, 3.0], [3.4, 0.35, -1.0],
  [-3.4, 0.35, 3.0], [-3.4, 0.35, -1.0], [0.0, 0.35, -3.5],
  [-1.8, 0.35, 7.2], [1.8, 0.35, 7.2], [0.0, 0.35, 9.2],
  // along the path toward the journey clock
  [-2.2, 0.35, -6.5], [-8.0, 0.35, -8.0], [-14.0, 0.35, -9.5],
]

export default function DiyaLights() {
  const groupRef = useRef(null)
  const lightRef = useRef(null)
  const outerRef = useRef(null)
  const innerRef = useRef(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(LAMP_POSITIONS.length * 3)
    LAMP_POSITIONS.forEach(([x, y, z], i) => {
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    })
    return arr
  }, [])

  // lamps fade in at night (like lit diyas) and dim under daylight
  useFrame(({ clock }) => {
    const night = 1 - dayState.daylight
    const glow = dayState.glowBoost * night
    if (outerRef.current && innerRef.current) {
      outerRef.current.material.opacity = 0.5 + glow * 0.25
      innerRef.current.material.opacity = 0.55 + glow * 0.35
    }
    if (lightRef.current) lightRef.current.intensity = glow * 3.0
    if (groupRef.current) groupRef.current.rotation.y = clock.elapsedTime * 0.02
  })

  return (
    <group ref={groupRef}>
      <pointLight
        ref={lightRef}
        position={[0.4, 1.2, 4.2]}
        color="#ff9a45"
        intensity={0}
        distance={9}
        decay={2}
      />
      <points ref={outerRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffb057"
          size={0.55}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={innerRef} frustumCulled={false} position={[0, 0.12, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffe08a"
          size={0.26}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
