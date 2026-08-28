import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { dayState } from './dayCycle'
import { loadOverworldField, subscribeFields, getField } from '../dimensions/worldStore'

// Festival decorations for the heritage re-theme — purely additive accents:
//   * a rangoli disc on the arrival plaza floor
//   * warm diya lamps (oil-lamp glows) ringing the ghat + lining the path
//   * marigold bunting garlands + hanging lanterns
// All are placed from the overworld heightfield so they sit exactly on the
// ground. No GLB geometry rebuild required.

// diya positions [x, z]; y is derived from the heightfield at runtime
const DIYA_LAMPS = [
  [0, 6], [3.4, 3], [3.4, -1], [-3.4, 3], [-3.4, -1], [0, -3.5],
  [-1.8, 7.2], [1.8, 7.2], [0, 9.2], [0, 4],
  [-2.2, -6.5], [-8, -8], [-14, -9.5],
]

const RANGOLI = { x: 0, z: 4, r: 2.6 }

// marigold garland between two posts flanking the entry path
const GARLAND = {
  posts: [
    { x: -5.6, z: 0.5 },
    { x: 5.6, z: 0.5 },
  ],
  sag: 1.5,
}

const LANTERNS = [
  { x: -5.6, z: 0.5, h: 3.4 },
  { x: 5.6, z: 0.5, h: 3.4 },
  { x: 0, z: 6.2, h: 2.2 },
]

const C0 = [1.0, 0.55, 0.18]
const C1 = [0.98, 0.32, 0.08]
const C2 = [0.55, 0.85, 0.2]
const CC = [1.0, 0.45, 0.12]

// Flat concentric "petal" rangoli disc, lying flat on the XZ plane.
function buildRangoli(r, petals) {
  const verts = []
  const cols = []
  const mid = r * 0.9
  for (let i = 0; i < petals; i += 1) {
    const a0 = (i / petals) * Math.PI * 2
    const a1 = ((i + 1) / petals) * Math.PI * 2
    const am = (a0 + a1) / 2
    const colA = i % 2 ? C1 : C0
    const colB = i % 2 ? C0 : C1
    const colTip = i % 2 ? C2 : C1
    // centre + petal base fan
    verts.push(0, 0, 0, Math.cos(a0) * mid, 0, Math.sin(a0) * mid, Math.cos(a1) * mid, 0, Math.sin(a1) * mid)
    cols.push(...CC, ...colB, ...colA)
    // petal tip fan
    verts.push(
      Math.cos(a0) * mid, 0, Math.sin(a0) * mid,
      Math.cos(a1) * mid, 0, Math.sin(a1) * mid,
      Math.cos(am) * r, 0, Math.sin(am) * r,
    )
    cols.push(...colB, ...colA, ...colTip)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3))
  geo.computeVertexNormals()
  return geo
}

export default function FestivalDecor() {
  const [placed, setPlaced] = useState(false)
  const [decor, setDecor] = useState(null)

  useEffect(() => {
    let alive = true
    const build = () => {
      const field = getField('overworld')
      if (!field) return
      const g = (x, z) => field.groundAt(x, z)
      const lamps = DIYA_LAMPS.map(([x, z]) => [x, g(x, z), z])
      const rangY = g(RANGOLI.x, RANGOLI.z)
      const garlandY = Math.max(...GARLAND.posts.map((p) => g(p.x, p.z)))
      const lanternY = Math.max(...LANTERNS.map((l) => g(l.x, l.z)))
      if (!alive) return
      setDecor({ lamps, rangY, garlandY, lanternY })
      setPlaced(true)
    }
    loadOverworldField()
    const unsub = subscribeFields(() => build())
    build()
    return () => {
      alive = false
      unsub()
    }
  }, [])

  if (!placed || !decor) return null
  return <DecorScene decor={decor} />
}

function DecorScene({ decor }) {
  const { lamps, rangY, garlandY, lanternY } = decor

  const rangoli = useMemo(() => buildRangoli(RANGOLI.r, 16), [])
  const diyaPositions = useMemo(() => {
    const arr = new Float32Array(lamps.length * 3)
    lamps.forEach(([x, y, z], i) => {
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    })
    return arr
  }, [lamps])

  const garlandPositions = useMemo(() => {
    const [a, b] = GARLAND.posts
    const count = 16
    const arr = []
    for (let i = 0; i <= count; i += 1) {
      const t = i / count
      const x = a.x + (b.x - a.x) * t
      const z = a.z + (b.z - a.z) * t
      const y = garlandY + GARLAND.sag * 4 * t * (1 - t)
      arr.push(x, y, z)
    }
    return new Float32Array(arr)
  }, [garlandY])

  const diyaOuter = useRef(null)
  const diyaInner = useRef(null)
  const plazaLight = useRef(null)
  const lanternMats = useRef([])

  useFrame(({ clock }) => {
    const night = 1 - dayState.daylight
    const glow = dayState.glowBoost * night
    if (diyaOuter.current) diyaOuter.current.material.opacity = 0.5 + glow * 0.25
    if (diyaInner.current) diyaInner.current.material.opacity = 0.55 + glow * 0.35
    if (plazaLight.current) plazaLight.current.intensity = glow * 2.6
    const t = clock.elapsedTime
    lanternMats.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = (0.6 + Math.sin(t * 1.6 + i * 2.1) * 0.18) * (0.4 + glow * 0.6)
    })
  })

  return (
    <group>
      {/* rangoli disc on the floor */}
      <mesh geometry={rangoli} position={[RANGOLI.x, rangY + 0.05, RANGOLI.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>

      {/* diya lamplight glows, lifted just above the floor */}
      <points ref={diyaOuter} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[diyaPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffb057" size={0.5} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={diyaInner} frustumCulled={false} position={[0, 0.16, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[diyaPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffe08a" size={0.22} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* soft pool of light over the rangoli */}
      <pointLight ref={plazaLight} position={[RANGOLI.x, rangY + 1.3, RANGOLI.z]} color="#ffb057" intensity={0} distance={11} decay={2} />

      {/* marigold garland */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[garlandPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ff9d2e" size={0.24} sizeAttenuation transparent opacity={1} depthWrite={false} />
      </points>

      {/* hanging lanterns */}
      {LANTERNS.map((l, i) => (
        <group key={i} position={[l.x, Math.max(lanternY, 3) + l.h, l.z]}>
          <mesh>
            <boxGeometry args={[0.42, 0.42, 0.42]} />
            <meshStandardMaterial
              ref={(m) => {
                if (m) lanternMats.current[i] = m
              }}
              color="#c2361d"
              emissive="#ffb057"
              emissiveIntensity={0}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
            <meshStandardMaterial color="#5a3a1a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
