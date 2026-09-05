import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainGrid, mulberry32, rotundaPalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'
import { ACHIEVEMENTS } from '../data/portfolio'

// ------------------------------------------------------------------
// THE TROPHY ROTUNDA — Achievements dimension.
//
// A moonlit amphitheater carved in concentric rings of purple stone.
// Six golden pedestals ring the sunken pit, each cradling a floating
// trophy cube for one of Naman's advancements, under a star-filled
// sky with a gold-mint obelisk beaming at the center.
// ------------------------------------------------------------------

const RARITY_COLORS = {
  common: '#cdcdcd',
  rare: '#5ec8f0',
  epic: '#c78aff',
}

const CATEGORY_OF = ['Open Source', 'Practice', 'Open Source', 'AI / ML', 'AI / ML', 'Community']

const SIZE = 88
const X0 = -44
const GY = 10

function trophySpot(i) {
  const rad = ((-90 + i * 60) * Math.PI) / 180
  return {
    x: Math.round(Math.cos(rad) * 18),
    z: Math.round(Math.sin(rad) * 18),
  }
}

function TrophyPedestal({ position, achievement, category }) {
  const cubeRef = useRef(null)
  const rarityColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common

  useEffect(() => {
    registerInteractable({
      key: `rotunda:${achievement.title}`,
      x: position[0],
      z: position[2],
      radius: 3.4,
      verb: 'View',
      label: achievement.title,
      accent: rarityColor,
      panel: {
        type: 'advancement',
        data: { ...achievement, category },
      },
    })
    return () => unregisterInteractable(`rotunda:${achievement.title}`)
  }, [achievement, category, position, rarityColor])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (cubeRef.current) {
      cubeRef.current.rotation.y = t * 0.8
      cubeRef.current.rotation.x = Math.sin(t * 0.5) * 0.22
      cubeRef.current.position.y = position[1] + 2.05 + Math.sin(t * 1.5) * 0.16
    }
  })

  return (
    <group>
      {/* tiered gold pedestal */}
      <mesh position={[position[0], position[1] + 0.28, position[2]]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.56, 1.4]} />
        <meshLambertMaterial color="#c99a2e" />
      </mesh>
      <mesh position={[position[0], position[1] + 0.72, position[2]]} castShadow>
        <boxGeometry args={[1.0, 0.32, 1.0]} />
        <meshLambertMaterial color="#ffcf4d" />
      </mesh>
      <mesh position={[position[0], position[1] + 0.96, position[2]]}>
        <boxGeometry args={[0.8, 0.15, 0.8]} />
        <meshBasicMaterial color="#3a2c4c" />
      </mesh>
      {/* floating trophy cube */}
      <mesh ref={cubeRef} position={[position[0], position[1] + 2.05, position[2]]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshBasicMaterial color={rarityColor} toneMapped={false} />
      </mesh>
      <pointLight position={[position[0], position[1] + 2.2, position[2]]} color={rarityColor} intensity={6} distance={8} decay={2} />
      <VoxelSign
        position={[position[0], position[1], position[2] + 1.8]}
        rotationY={0}
        lines={[achievement.title]}
        colors={[rarityColor]}
        width={Math.max(2.6, achievement.title.length * 0.42)}
        height={1.1}
      />
    </group>
  )
}

// drifting gold dust above the arena
function GoldDust() {
  const COUNT = 120
  const geometry = useMemo(() => {
    const rng = mulberry32(4242)
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i += 1) {
      const ang = rng() * Math.PI * 2
      const rad = 2 + rng() * 34
      positions[i * 3] = Math.round(Math.cos(ang) * rad)
      positions[i * 3 + 1] = 8 + rng() * 10
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
      attr.array[i * 3 + 1] += dt * (0.3 + (i % 5) * 0.1)
      attr.array[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i * 2.4) * 0.4
      if (attr.array[i * 3 + 1] > 18) attr.array[i * 3 + 1] = 8
    }
    attr.needsUpdate = true
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffcf4d"
        size={0.14}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function AchievementsWorld() {
  const B = useMemo(rotundaPalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE, sizeZ: SIZE, x0: X0, z0: X0 })
    const rng = mulberry32(31415)

    // ---- concentric tiered arena ----
    for (let x = X0; x < X0 + SIZE; x += 1) {
      for (let z = X0; z < X0 + SIZE; z += 1) {
        const d = Math.hypot(x, z)
        if (d > 40) continue
        let h = GY
        if (d <= 10) h = 7
        else if (d <= 16) h = 8
        else if (d <= 24) h = 9
        let top = (x + z) & 1 ? B.arenaDark : B.arena
        const onRim =
          d > 39 ||
          (d >= 9.8 && d <= 10.2) ||
          (d >= 15.8 && d <= 16.2) ||
          (d >= 23.8 && d <= 24.2)
        if (onRim) top = B.goldPlate
        grid.column(x, z, h, top, B.arenaDark, -2)
        if (rng() < 0.012 && top !== B.goldPlate) grid.set(x, h + 1, z, B.gold)
      }
    }

    // ---- rim pillars with gold crowns ----
    for (let k = 0; k < 8; k += 1) {
      const ang = (k * 45 * Math.PI) / 180
      const cx = Math.round(Math.cos(ang) * 34)
      const cz = Math.round(Math.sin(ang) * 34)
      grid.boxFill(cx - 1, cx + 1, GY + 1, GY + 11, cz - 1, cz + 1, B.pillar)
      grid.boxFill(cx - 1, cx + 1, GY + 12, GY + 12, cz - 1, cz + 1, B.goldPlate)
      grid.set(cx, GY + 13, cz, B.gold)
    }

    // ---- center gold obelisk in the pit ----
    grid.boxFill(-2, 2, 8, 14, -2, 2, B.obsidian)
    grid.boxFill(-1, 1, 15, 15, -1, 1, B.gold)
    grid.set(0, 16, 0, B.endGlow)

    const geo = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE - 1,
      y0: -2,
      y1: 32,
      z0: X0,
      z1: X0 + SIZE - 1,
    })

    return { geo, field: grid.field() }
  }, [B])

  useEffect(() => {
    setField('achievements-world', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#0d0716']} />
      <fogExp2 attach="fog" args={['#1a0f2b', 0.011]} />
      <Stars radius={210} depth={60} count={2400} factor={5} saturation={0.4} fade speed={0.6} />

      <hemisphereLight args={['#8f7ad9', '#12081f', 0.9]} />
      <directionalLight position={[30, 50, -24]} color="#c0b0ff" intensity={0.5} />
      <pointLight position={[0, 15, 0]} color="#ffcf4d" intensity={60} distance={34} decay={2} />

      <VoxelRenderer geo={geo} />

      {ACHIEVEMENTS.map((a, i) => (
        <TrophyPedestal
          key={a.title}
          achievement={a}
          category={CATEGORY_OF[i] || 'Milestone'}
          position={[trophySpot(i).x, field.groundAt(trophySpot(i).x, trophySpot(i).z), trophySpot(i).z]}
        />
      ))}

      <Portal
        id="overworld"
        position={[9, field.groundAt(9, 26), 26]}
        rotationY={-Math.PI / 2}
        title="Return Home"
        subtitle="The Portal Plaza"
        verb="Return"
        signLines={['RETURN', 'HOME']}
        signWidth={4}
      />

      <GoldDust />
    </>
  )
}