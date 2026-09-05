import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainGrid, mulberry32, commonsPalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'

// ------------------------------------------------------------------
// THE LANTERN COMMONS — Social dimension.
//
// A cozy night-village square under the stars. A crackling campfire
// sits at the center; signposts lead to the well (contact), the
// census (stats) and Naman's story (about). Warm lanterns and two
// log cabins frame the plaza.
// ------------------------------------------------------------------

const SIZE = 72
const X0 = -36
const GY = 8

const STATION_SPECS = [
  { zone: 'mine', pos: [12, 0], rotationY: -Math.PI / 2, title: 'THE WELL', accent: '#9ecbff', verb: 'Visit', label: 'Email & GitHub' },
  { zone: 'stats', pos: [-12, 0], rotationY: Math.PI / 2, title: 'THE CENSUS', accent: '#ffe066', verb: 'View', label: 'Live Counts' },
  { zone: 'about', pos: [0, 12], rotationY: 0, title: 'WHO IS NAMAN', accent: '#ffd9a0', verb: 'Read', label: 'The Short Story' },
]

function GlowOrb({ position, color }) {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = t * 0.8
      ref.current.rotation.x = Math.sin(t * 0.6) * 0.3
      ref.current.position.y = position[1] + Math.sin(t * 1.4) * 0.14
    }
  })
  return (
    <>
      <mesh ref={ref} position={position}>
        <octahedronGeometry args={[0.42]} />
        <meshLambertMaterial color="#2a1740" emissive={color} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <pointLight position={[position[0], position[1] + 0.4, position[2]]} color={color} intensity={5} distance={8} decay={2} />
    </>
  )
}

function Signpost({ spec, field }) {
  useEffect(() => {
    registerInteractable({
      key: `zone:${spec.zone}`,
      x: spec.pos[0],
      z: spec.pos[1],
      radius: 3.6,
      verb: spec.verb,
      label: spec.label,
      accent: spec.accent,
      panel: { type: 'zone' },
    })
    return () => unregisterInteractable(`zone:${spec.zone}`)
  }, [spec])

  const h = field.groundAt(spec.pos[0], spec.pos[1])

  return (
    <group>
      <GlowOrb position={[spec.pos[0], h + 2.5, spec.pos[1]]} color={spec.accent} />
      <VoxelSign
        position={[spec.pos[0], h + 0.45, spec.pos[1]]}
        rotationY={spec.rotationY}
        lines={[spec.title]}
        colors={[spec.accent]}
        width={Math.max(3.2, spec.title.length * 0.42)}
        height={1.25}
      />
    </group>
  )
}

// warm fireflies drifting over the commons
function Fireflies() {
  const COUNT = 70
  const geometry = useMemo(() => {
    const rng = mulberry32(516)
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i += 1) {
      const ang = rng() * Math.PI * 2
      const rad = 2 + rng() * 22
      positions[i * 3] = Math.round(Math.cos(ang) * rad)
      positions[i * 3 + 1] = GY + 0.6 + rng() * 5
      positions[i * 3 + 2] = Math.round(Math.sin(ang) * rad)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  const base = useMemo(() => geometry.getAttribute('position').array.slice(), [geometry])

  useFrame(({ clock }, dt) => {
    const attr = geometry.getAttribute('position')
    const t = clock.elapsedTime
    for (let i = 0; i < COUNT; i += 1) {
      const k = i % 9
      attr.array[i * 3 + 1] += dt * (0.12 + k * 0.02)
      attr.array[i * 3] = base[i * 3] + Math.sin(t * 0.9 + i * 1.3) * 0.6
      attr.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.8 + i * 2.1) * 0.6
      if (attr.array[i * 3 + 1] > GY + 6) attr.array[i * 3 + 1] = GY + 0.6
    }
    attr.needsUpdate = true
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffd9a0"
        size={0.13}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function SocialWorld() {
  const B = useMemo(commonsPalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE, sizeZ: SIZE, x0: X0, z0: X0 })
    const rng = mulberry32(2718)

    // ---- circular grass commons ----
    for (let x = X0; x < X0 + SIZE; x += 1) {
      for (let z = X0; z < X0 + SIZE; z += 1) {
        const d = Math.hypot(x, z)
        if (d > 32) continue
        if (rng() < 0.06) {
          grid.set(x, GY + 1, z, B.nightGrassDark)
          continue
        }
        const top = (x + z) & 1 ? B.nightGrassDark : B.nightGrass
        grid.column(x, z, GY, top, B.dirt, GY - 3)
      }
    }

    // ---- stone paths: south approach + east/west cross ----
    grid.bridge(0, 16, 0, 0, GY, B.path, 2)
    grid.bridge(-12, 0, 12, 0, GY, B.path, 2)
    grid.column(0, 0, GY, B.pathEdge)

    // ---- central campfire ----
    for (let x = -2; x <= 2; x += 1) {
      for (let z = -2; z <= 2; z += 1) {
        const d = Math.hypot(x, z)
        if (d <= 2) grid.set(x, GY + 1, z, d > 1.2 ? B.pathEdge : B.dirt)
      }
    }
    grid.set(0, GY + 1, 0, B.embers)
    grid.set(0, GY + 2, 0, B.flame)
    grid.set(1, GY + 1, 1, B.flame)
    grid.set(1, GY + 1, -1, B.flame)
    grid.set(-1, GY + 1, 1, B.flame)
    grid.set(-1, GY + 1, -1, B.flame)
    grid.set(0, GY + 3, 0, B.flame)

    // ---- two log cabins framing the east/west edge ----
    const cabin = (cx, cz) => {
      grid.boxShell(cx - 3, cx + 3, GY + 1, GY + 4, cz - 2, cz + 2, B.log)
      grid.boxFill(cx - 3, cx + 3, GY + 5, GY + 5, cz - 2, cz + 2, B.roof)
      grid.set(cx, GY + 2, cz + 2, B.lantern)
    }
    cabin(24, -14)
    cabin(-24, -14)

    // ---- entranceside lantern posts along the south path ----
    grid.boxFill(2, 2, GY + 1, GY + 3, 10, 10, B.plank)
    grid.set(2, GY + 4, 10, B.lantern)
    grid.boxFill(-2, -2, GY + 1, GY + 3, 10, 10, B.plank)
    grid.set(-2, GY + 4, 10, B.lantern)

    const geo = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE - 1,
      y0: GY - 6,
      y1: 31,
      z0: X0,
      z1: X0 + SIZE - 1,
    })

    return { geo, field: grid.field({ killY: -20 }) }
  }, [B])

  useEffect(() => {
    setField('social-world', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  // the campfire itself is the hub of the commons
  useEffect(() => {
    registerInteractable({
      key: 'zone:campfire',
      x: 0,
      z: 0,
      radius: 4.2,
      verb: 'Gather',
      label: 'Round the Fire',
      accent: '#ffb03a',
      panel: { type: 'zone' },
    })
    return () => unregisterInteractable('zone:campfire')
  }, [])

  return (
    <>
      <color attach="background" args={['#070d14']} />
      <fogExp2 attach="fog" args={['#0c1520', 0.012]} />
      <Stars radius={200} depth={50} count={2000} factor={4.5} saturation={0.3} fade speed={0.5} />

      <hemisphereLight args={['#35506b', '#0a0e14', 0.8]} />
      <directionalLight position={[30, 52, -20]} color="#b8cce0" intensity={0.5} />
      <pointLight position={[0, GY + 3.2, 0]} color="#ffb03a" intensity={40} distance={22} decay={2} />

      <VoxelRenderer geo={geo} />

      <VoxelSign
        position={[0, GY + 0.4, -5]}
        rotationY={0}
        lines={['THE LANTERN', 'COMMONS']}
        colors={['#ffd9a0', '#9ecbff']}
        width={5}
        height={1.6}
      />

      {STATION_SPECS.map((spec) => (
        <Signpost key={spec.zone} spec={spec} field={field} />
      ))}

      <Portal
        id="overworld"
        position={[9, field.groundAt(9, 16), 16]}
        rotationY={-Math.PI / 2}
        title="Return Home"
        subtitle="The Portal Plaza"
        verb="Return"
        signLines={['RETURN', 'HOME']}
        signWidth={4}
      />

      <Fireflies />
    </>
  )
}