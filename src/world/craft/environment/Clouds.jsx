import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Blocky sunset clouds: clusters of flattened boxes drifting east, wrapping.
function makeCluster(seed) {
  const parts = []
  let x = 0
  while (x < 4 + (seed % 3)) {
    const w = 8 + ((seed * 7 + x * 13) % 10)
    const d = 5 + ((seed * 5 + x * 7) % 6)
    parts.push({
      pos: [x * 9 - 14, (seed % 3) * 1.2 - 1, ((seed * 11 + x * 17) % 12) - 6],
      scale: [w, 2.2, d],
    })
    x += 1
  }
  return parts
}

export default function Clouds({ count = 7 }) {
  const group = useRef(null)
  const clusters = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        base: [
          ((i * 53) % 220) - 110,
          62 + ((i * 17) % 10),
          -100 + ((i * 71) % 180),
        ],
        speed: 0.55 + ((i * 29) % 40) / 100,
        parts: makeCluster(i),
      })),
    [count],
  )

  useFrame((_, dt) => {
    if (!group.current) return
    for (const child of group.current.children) {
      child.position.x += child.userData.speed * dt
      if (child.position.x > 130) child.position.x = -130
    }
  })

  return (
    <group ref={group}>
      {clusters.map((c) => (
        <group key={c.id} position={c.base} userData={{ speed: c.speed }}>
          {c.parts.map((p, j) => (
            <mesh key={j} position={p.pos} scale={p.scale}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#fff2dd" transparent opacity={0.32} depthWrite={false} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
