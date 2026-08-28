import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TerrainGrid, fbm, mulberry32, netherPalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'
import { ACHIEVEMENTS } from '../data/portfolio'

// ------------------------------------------------------------------
// THE NETHER — Achievements dimension.
//
// A basalt wasteland where Naman's advancements form a literal
// branching tree: platforms connected by bridges, each holding a
// glowing achievement node. The tree climbs toward a basalt keep.
// ------------------------------------------------------------------

const RARITY_COLORS = {
  common: '#cdcdcd',
  rare: '#5ec8f0',
  epic: '#c78aff',
}

// node layout: index aligns with ACHIEVEMENTS order
const NODE_SPOTS = [
  { x: -3, z: 34 },   // Getting Wood (spawn pad)
  { x: -7, z: 19 },   // Dungeon Grinder (west branch)
  { x: 3, z: 6 },     // Team Player (main path)
  { x: -13, z: -10 }, // Deepfake Hunter (left fork)
  { x: 13, z: -10 },  // Auto-Pilot Engineer (right fork)
  { x: 0, z: -21 },   // Star Collector (apex, before the keep)
]

const CATEGORY_OF = ['Open Source', 'Practice', 'Open Source', 'AI / ML', 'AI / ML', 'Community']

const SIZE = 104
const X0 = -52

function AchievementNode({ position, achievement, category }) {
  const cubeRef = useRef(null)
  const rarityColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common

  useEffect(() => {
    registerInteractable({
      key: `adv:${achievement.title}`,
      x: position[0],
      z: position[2],
      radius: 3.2,
      verb: 'View',
      label: achievement.title,
      accent: rarityColor,
      panel: {
        type: 'advancement',
        data: { ...achievement, category },
      },
    })
    return () => unregisterInteractable(`adv:${achievement.title}`)
  }, [achievement, category, position, rarityColor])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (cubeRef.current) {
      cubeRef.current.rotation.y = t * 0.9
      cubeRef.current.rotation.x = Math.sin(t * 0.6) * 0.25
      cubeRef.current.position.y = position[1] + 1.75 + Math.sin(t * 1.6) * 0.14
    }
  })

  return (
    <group>
      {/* pedestal */}
      <mesh position={[position[0], position[1] + 0.5, position[2]]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 1, 1.1]} />
        <meshLambertMaterial color="#26262e" />
      </mesh>
      <mesh position={[position[0], position[1] + 1.06, position[2]]} castShadow>
        <boxGeometry args={[0.85, 0.16, 0.85]} />
        <meshLambertMaterial color="#333340" />
      </mesh>
      {/* floating advancement cube */}
      <mesh ref={cubeRef} position={[position[0], position[1] + 1.75, position[2]]}>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshBasicMaterial color={rarityColor} toneMapped={false} />
      </mesh>
      <pointLight position={[position[0], position[1] + 2, position[2]]} color={rarityColor} intensity={6} distance={7} decay={2} />
      <VoxelSign
        position={[position[0], position[1], position[2] + 1.9]}
        rotationY={0}
        lines={[achievement.title]}
        colors={[rarityColor]}
        width={Math.max(2.6, achievement.title.length * 0.42)}
        height={1.1}
      />
    </group>
  )
}

// rising embers
function Embers() {
  const COUNT = 110
  const ref = useRef(null)

  const geometry = useMemo(() => {
    const rng = mulberry32(77)
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = X0 + 4 + rng() * (SIZE - 8)
      positions[i * 3 + 1] = 8 + rng() * 14
      positions[i * 3 + 2] = X0 + 4 + rng() * (SIZE - 8)
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
      attr.array[i * 3 + 1] += dt * (0.5 + (i % 5) * 0.14)
      attr.array[i * 3] = base[i * 3] + Math.sin(t * 0.8 + i * 2.1) * 0.5
      if (attr.array[i * 3 + 1] > 24) attr.array[i * 3 + 1] = 8
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ff9a3d"
        size={0.16}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function NetherWorld() {
  const B = useMemo(netherPalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE, sizeZ: SIZE, x0: X0, z0: X0 })
    const rng = mulberry32(1337)

    // ---- wild terrain: netherrack noise + basalt ridges ----
    for (let x = X0; x < X0 + SIZE; x += 1) {
      for (let z = X0; z < X0 + SIZE; z += 1) {
        const n = fbm(x * 0.055, z * 0.055, 91, 3)
        const ridge = fbm(x * 0.14, z * 0.14, 57, 2)
        let h = 8 + Math.round(n * 7 + ridge * 2)
        let top = n > 0.62 ? B.basalt : B.netherrack
        let sub = B.netherrackDark
        if (ridge > 0.74) { top = B.basalt; sub = B.blackstone }
        if (n < 0.3) { top = B.soul; sub = B.soul }

        // lava pools fill the low pockets
        if (h <= 8 && n < 0.34) {
          grid.column(x, z, 7, B.magma, B.netherrackDark)
          grid.set(x, 8, z, rng() < 0.25 ? B.lavaCore : B.lava)
          continue
        }
        grid.column(x, z, h, top, sub)

        // scattered fire
        if (rng() < 0.004 && top === B.netherrack) grid.set(x, h + 1, z, B.fire)
        // occasional magma crust
        if (rng() < 0.01) grid.set(x, h, z, B.magma)
      }
    }

    // ---- advancement tree: platforms + bridges (all steps <= 1) ----
    const plat = (...a) => grid.platform(...a)
    // spawn pad
    plat(-4, 4, 32, 40, 10, B.basaltLight, B.basalt)
    // west branch + main path
    plat(-11, -3, 16, 22, 10, B.basaltLight, B.basalt)
    plat(-4, 4, 2, 10, 10, B.basaltLight, B.basalt)
    // forks
    plat(-17, -9, -14, -6, 11, B.basaltLight, B.basalt)
    plat(9, 17, -14, -6, 11, B.basaltLight, B.basalt)
    // apex before the keep
    plat(-5, 5, -24, -16, 12, B.blackstone, B.basalt)

    const br = (...a) => grid.bridge(...a)
    br(-3, 31, -7, 23, 10, B.basaltLight, 3)
    br(-7, 15, -1, 11, 10, B.basaltLight, 3)
    br(-4, 1, -13, -5, 11, B.basaltLight, 3)
    br(4, 1, 13, -5, 11, B.basaltLight, 3)
    br(-13, -15, -2, -17, 12, B.basalt, 3)
    br(13, -15, 2, -17, 12, B.basalt, 3)

    // ---- the keep: tapered basalt tower with a lava crown ----
    const KC = { x: 0, z: -30 }
    for (let tier = 0; tier < 3; tier += 1) {
      const half = 3 - tier
      const y0 = 12 + tier * 6
      const y1 = y0 + 5
      grid.boxShell(
        KC.x - half, KC.x + half,
        y0, y1,
        KC.z - half, KC.z + half,
        tier % 2 ? B.basalt : B.blackstone,
      )
      grid.boxFill(
        KC.x - half + 1, KC.x + half - 1,
        y1, y1,
        KC.z - half + 1, KC.z + half - 1,
        B.blackstone,
      )
    }
    grid.boxFill(KC.x - 3, KC.x + 3, 30, 30, KC.z - 3, KC.z + 3, B.magma)
    grid.boxFill(KC.x - 2, KC.x + 2, 31, 31, KC.z - 2, KC.z + 2, B.lava)

    // ---- distant basalt spires for silhouette ----
    for (let i = 0; i < 10; i += 1) {
      const ang = rng() * Math.PI * 2
      const rad = 34 + rng() * 14
      const cx = Math.round(Math.cos(ang) * rad)
      const cz = Math.round(Math.sin(ang) * rad)
      const h = 18 + Math.floor(rng() * 9)
      grid.boxFill(cx - 1, cx + 1, 8, h, cz - 1, cz + 1, B.blackstone)
      grid.boxFill(cx, cx, 8, h + 3, cz, cz, B.basalt)
      if (rng() < 0.6) grid.set(cx, h + 4, cz, B.fire)
    }

    const geo = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE - 1,
      y0: -4,
      y1: 32,
      z0: X0,
      z1: X0 + SIZE - 1,
    })

    return { geo, field: grid.field() }
  }, [B])

  useEffect(() => {
    setField('nether', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#2a0b07']} />
      <fogExp2 attach="fog" args={['#3a100a', 0.016]} />

      <hemisphereLight args={['#ff6a45', '#33110b', 0.9]} />
      <directionalLight position={[30, 46, 18]} color="#ff8a5c" intensity={0.65} />
      <pointLight position={[0, 34, -30]} color="#ff7b1f" intensity={55} distance={30} decay={2} />
      <pointLight position={[-20, 12, 8]} color="#ff5a26" intensity={16} distance={18} decay={2} />

      <VoxelRenderer geo={geo} />

      {/* advancement tree */}
      {ACHIEVEMENTS.map((a, i) => (
        <AchievementNode
          key={a.title}
          achievement={a}
          category={CATEGORY_OF[i] || 'Milestone'}
          position={[NODE_SPOTS[i].x, field.groundAt(NODE_SPOTS[i].x, NODE_SPOTS[i].z), NODE_SPOTS[i].z]}
        />
      ))}

      <Portal
        id="overworld"
        position={[6, field.groundAt(6, 38) , 38]}
        rotationY={-Math.PI / 2}
        title="Return to Overworld"
        subtitle="Home"
        verb="Return"
        signLines={['RETURN TO', 'OVERWORLD']}
        signWidth={5}
      />

      <Embers />
    </>
  )
}

