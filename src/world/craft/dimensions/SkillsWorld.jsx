import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TerrainGrid, techPalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'
import { SKILL_STATIONS } from '../data/portfolio'

// ------------------------------------------------------------------
// TECH REALM — Skills dimension.
//
// A bright, clean, futuristic plateau. Twelve stations ring a central
// plaza; each station is an original voxel structure representing one
// technology (forge for Java, rotating atom for React, container
// stacks for Docker...). Animated emblems float above some of them.
// ------------------------------------------------------------------

const SIZE = 92
const X0 = -46
const GY = 10 // ground level
const RING_R = 26

function stationPos(i) {
  const ang = ((i * 30 - 90) * Math.PI) / 180
  return {
    x: Math.round(Math.cos(ang) * RING_R),
    z: Math.round(Math.sin(ang) * RING_R),
    faceCenter: Math.atan2(-Math.cos(ang), -Math.sin(ang)),
  }
}

// ---- animated emblems --------------------------------------------------

function ReactAtom({ position }) {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = t * 1.1
      ref.current.rotation.x = t * 0.45
    }
  })
  return (
    <group ref={ref} position={[position[0], position[1], position[2]]}>
      <mesh>
        <torusGeometry args={[1.15, 0.075, 8, 28]} />
        <meshBasicMaterial color="#5decf5" toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.6, 0]}>
        <torusGeometry args={[1.15, 0.075, 8, 28]} />
        <meshBasicMaterial color="#2ee6ff" toneMapped={false} />
      </mesh>
      <mesh rotation={[0.9, 0, Math.PI / 2]}>
        <torusGeometry args={[1.15, 0.075, 8, 28]} />
        <meshBasicMaterial color="#9ff3ff" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.34, 12, 12]} />
        <meshBasicMaterial color="#d8fbff" toneMapped={false} />
      </mesh>
    </group>
  )
}

function WireCube({ position, color = '#e79b5a', size = 1.15, speed = 0.7 }) {
  const ref = useRef(null)
  const geom = useMemo(() => new THREE.BoxGeometry(size, size, size), [size])
  useEffect(() => () => geom.dispose(), [geom])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.x = t * speed
      ref.current.rotation.y = t * speed * 1.35
      ref.current.position.y = position[1] + Math.sin(t * 1.4) * 0.16
    }
  })
  return (
    <lineSegments ref={ref} geometry={new THREE.EdgesGeometry(geom)} position={position}>
      <lineBasicMaterial color={color} toneMapped={false} />
    </lineSegments>
  )
}

function DataCubes() {
  const COUNT = 22
  const ref = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        r: 8 + (i % 5) * 1.4,
        h: 4 + (i % 7) * 1.1,
        sp: 0.14 + (i % 4) * 0.05,
        ph: i * 1.7,
      })),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      const a = t * s.sp + s.ph
      dummy.position.set(Math.cos(a) * s.r, GY + 3 + s.h + Math.sin(t + i) * 0.3, Math.sin(a) * s.r)
      dummy.rotation.set(t * 0.6 + i, t * 0.4, 0)
      dummy.updateMatrix()
      ref.current?.setMatrixAt(i, dummy.matrix)
    })
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.42, 0.42, 0.42]} />
      <meshBasicMaterial color="#37e2c4" transparent opacity={0.65} toneMapped={false} />
    </instancedMesh>
  )
}

export default function SkillsWorld() {
  const B = useMemo(techPalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE, sizeZ: SIZE, x0: X0, z0: X0 })

    // ---- floor: pale tiles, checker + neon grid lines every 8 ----
    for (let x = X0; x < X0 + SIZE; x += 1) {
      for (let z = X0; z < X0 + SIZE; z += 1) {
        let top = B.floorTile
        if ((x + z) % 2 === 0) top = B.floorTileAlt
        if (x % 8 === 0 || z % 8 === 0) top = B.gridLine
        const edge =
          x <= X0 + 1 || x >= X0 + SIZE - 2 || z <= X0 + 1 || z >= X0 + SIZE - 2
        if (edge) top = B.floorDark
        grid.column(x, z, GY, top, B.floorDark)
      }
    }

    // ---- central plaza dais ----
    for (let x = -6; x <= 6; x += 1) {
      for (let z = -6; z <= 6; z += 1) {
        const d = Math.hypot(x, z)
        if (d > 5.4) continue
        grid.set(x, GY, z, d > 4.2 ? B.neonCyan : B.steel)
      }
    }
    // plaza obelisk
    grid.boxFill(-1, 1, GY + 1, GY + 5, -1, 1, B.white)
    grid.boxFill(-1, 1, GY + 6, GY + 6, -1, 1, B.neonCyan)

    // ---- station builders ----
    const put = (x, y, z, id) => grid.set(x, y, z, id)

    const buildForge = (cx, cz) => { // Java
      grid.boxShell(cx - 2, cx + 2, GY + 1, GY + 4, cz - 2, cz + 2, B.steelDark)
      grid.boxFill(cx - 2, cx + 2, GY + 5, GY + 5, cz - 2, cz + 2, B.steel)
      put(cx, GY + 2, cz + 2, B.neonAmber) // forge window
      put(cx, GY + 3, cz + 2, B.neonAmber)
      grid.boxFill(cx + 1, cx + 1, GY + 6, GY + 7, cz - 1, cz - 1, B.steelDark) // chimney
      put(cx + 1, GY + 8, cz - 1, B.ember)
      put(cx - 1, GY + 1, cz + 3, B.coal) // anvil
      put(cx - 1, GY + 2, cz + 3, B.ironBlock)
    }

    const buildBolt = (cx, cz) => { // JavaScript
      grid.boxFill(cx - 1, cx + 1, GY + 1, GY + 1, cz - 1, cz + 1, B.steelDark)
      const bolt = [[-1, 4], [-1, 3], [0, 2], [0, 1], [1, 0], [0, -1], [-1, -2], [-1, -3]]
      bolt.forEach(([dx, dz]) => {
        put(cx + dx, GY + 2, cz + dz, B.neonAmber)
        put(cx + dx, GY + 3, cz + dz, B.neonAmber)
      })
      put(cx, GY + 4, cz + 4, B.neonAmber)
    }

    const buildPylon = (cx, cz) => { // Node.js
      ;[[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([dx, dz]) => {
        grid.boxFill(cx + dx, cx + dx, GY + 1, GY + 4, cz + dz, cz + dz, B.steel)
      })
      grid.boxFill(cx, cx, GY + 1, GY + 6, cz, cz, B.neonLime)
      ;[[2, 0], [1, 2], [-1, 2], [-2, 0], [-1, -2], [1, -2]].forEach(([dx, dz]) => {
        put(cx + dx, GY + 4, cz + dz, B.neonLime)
      })
      put(cx, GY + 7, cz, B.neonLime)
    }

    const buildSnake = (cx, cz) => { // Python
      const path = [[-3, 0], [-2, 1], [-1, 0], [0, -1], [1, 0], [2, 1], [3, 0]]
      path.forEach(([dx, dz], i) => {
        put(cx + dx, GY + 1, cz + dz, B.neonViolet)
        if (i % 2 === 0) put(cx + dx, GY + 2, cz + dz, B.neonViolet)
      })
      grid.boxFill(cx + 3, cx + 4, GY + 1, GY + 1, cz + 2, cz + 2, B.white) // the "head"/book
    }

    const buildVault = (cx, cz) => { // MongoDB
      const r = 3
      for (let dx = -r; dx <= r; dx += 1) {
        for (let dz = -r; dz <= r; dz += 1) {
          const d = Math.hypot(dx, dz)
          if (d > r) continue
          const h = Math.round(Math.sqrt(Math.max(0, r * r - d * d)) * 0.85)
          for (let y = 1; y <= h; y += 1) put(cx + dx, GY + y, cz + dz, y === h ? B.grassTech : B.glass)
          if (h >= 1 && d > r - 1.2) put(cx + dx, GY + h, cz + dz, B.neonLime)
        }
      }
      put(cx, GY + 1, cz, B.neonLime)
    }

    const buildGitGraph = (cx, cz) => { // Git / GitHub
      grid.boxFill(cx - 3, cx + 3, GY + 1, GY + 1, cz - 2, cz + 2, B.floorDark)
      const nodes = [[-3, 0, 2], [0, 1, 3], [3, -1, 4], [0, -1, 2]]
      nodes.forEach(([dx, dz, h]) => {
        grid.boxFill(cx + dx, cx + dx, GY + 2, GY + 1 + h, cz + dz, cz + dz, B.steelDark)
        put(cx + dx, GY + h + 2, cz + dz, B.neonCyan)
      })
      // branch lines
      put(cx - 1, GY + 2, cz, B.neonCyan)
      put(cx + 1, GY + 2, cz, B.neonCyan)
      put(cx + 2, GY + 3, cz - 1, B.neonCyan)
    }

    const buildContainers = (cx, cz) => { // Docker
      const colors = [B.glassBlue, B.steel, B.neonCyan]
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3 - row; col += 1) {
          grid.boxFill(
            cx - 2 + col * 2, cx - 1 + col * 2,
            GY + 1 + row, GY + 1 + row,
            cz - 1, cz - 1,
            colors[(row + col) % colors.length],
          )
        }
      }
      grid.boxFill(cx - 3, cx + 3, GY, GY, cz - 2, cz + 2, B.floorDark)
    }

    const buildDb = (cx, cz) => { // SQL
      const discs = [[0, 3], [1, 2], [2, 1]]
      discs.forEach(([dy, r]) => {
        for (let dx = -r; dx <= r; dx += 1) {
          for (let dz = -r; dz <= r; dz += 1) {
            if (Math.hypot(dx, dz) <= r + 0.3) put(cx + dx, GY + 1 + dy, cz + dz, B.glassBlue)
          }
        }
        for (let dx = -r; dx <= r; dx += 1) {
          for (let dz = -r; dz <= r; dz += 1) {
            if (Math.abs(Math.hypot(dx, dz) - r) < 0.5) put(cx + dx, GY + 1 + dy, cz + dz, B.neonCyan)
          }
        }
      })
    }

    const buildGear = (cx, cz) => { // C / C++
      const r = 3
      for (let dx = -r; dx <= r; dx += 1) {
        for (let dz = -r; dz <= r; dz += 1) {
          const d = Math.hypot(dx, dz)
          if (d <= r && d >= r - 1.4) {
            const tooth = Math.round((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 4)) % 2 === 0
            put(cx + dx, GY + 1, cz + dz, tooth ? B.metal : B.steelDark)
            if (tooth) put(cx + dx, GY + 2, cz + dz, B.metal)
          } else if (d < r - 1.4) {
            put(cx + dx, GY + 1, cz + dz, B.floorDark)
          }
        }
      }
      grid.boxFill(cx, cx, GY + 2, GY + 4, cz, cz, B.steelDark)
      put(cx, GY + 5, cz, B.metal)
    }

    const buildNeural = (cx, cz) => { // AI / ML
      const layers = [[-3, 1, 2], [0, 2, 3], [3, 1, 4]]
      const heads = []
      layers.forEach(([dx, count, h]) => {
        for (let k = 0; k < count; k += 1) {
          const dz = (k - (count - 1) / 2) * 2
          grid.boxFill(cx + dx, cx + dx, GY + 1, GY + h, cz + dz, cz + dz, B.steelDark)
          put(cx + dx, GY + h + 1, cz + dz, B.neonMagenta)
          heads.push([cx + dx, GY + h + 2, cz + dz])
        }
      })
      // synapse lines (floating glow blocks between layer heads)
      for (let i = 0; i < 2; i += 1) {
        const [x1, y1, z1] = heads[i]
        const [x2, , z2] = heads[i + 2]
        put(Math.round((x1 + x2) / 2), y1, Math.round((z1 + z2) / 2), B.neonMagenta)
      }
      put(heads[heads.length - 1][0] + 0, GY + 7, heads[heads.length - 1][2], B.neonAmber)
    }

    const builders = [
      buildForge, buildBolt, null, buildPylon, buildSnake, buildVault,
      buildGitGraph, buildContainers, null, buildDb, buildGear, buildNeural,
    ]
    builders.forEach((build, i) => {
      const { x, z } = stationPos(i)
      if (build) build(x, z)
    })

    const geo = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE - 1,
      y0: -2,
      y1: 24,
      z0: X0,
      z1: X0 + SIZE - 1,
    })
    return { geo, field: grid.field() }
  }, [B])

  useEffect(() => {
    setField('skills', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#a8e8dc']} />
      <fogExp2 attach="fog" args={['#c2efe6', 0.008]} />

      <hemisphereLight args={['#eafcff', '#7fa08f', 0.95]} />
      <directionalLight position={[40, 60, 20]} color="#fff4de" intensity={1.15} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

      <VoxelRenderer geo={geo} />

      {/* animated emblems above their stations */}
      <ReactAtom position={[stationPos(2).x, GY + 4.4, stationPos(2).z]} />
      <WireCube position={[stationPos(8).x, GY + 4.6, stationPos(8).z]} />
      <WireCube position={[stationPos(11).x, GY + 8.6, stationPos(11).z]} color="#ff4fd8" size={0.8} speed={1.1} />
      <DataCubes />

      {/* stations */}
      {SKILL_STATIONS.map((skill, i) => {
        const p = stationPos(i)
        return (
          <SkillStation key={skill.name} skill={skill} index={i} pos={p} gy={GY} />
        )
      })}

      <Portal
        id="overworld"
        position={[5, field.groundAt(5, 36), 36]}
        rotationY={-Math.PI / 2}
        title="Return to Overworld"
        subtitle="Home"
        verb="Return"
        signLines={['RETURN TO', 'OVERWORLD']}
        signWidth={5}
      />
    </>
  )
}

function SkillStation({ skill, index, pos, gy }) {
  useEffect(() => {
    registerInteractable({
      key: `skill:${index}`,
      x: pos.x,
      z: pos.z,
      radius: 4,
      verb: 'Inspect',
      label: skill.name,
      accent: skill.color,
      panel: { type: 'skill', data: skill },
    })
    return () => unregisterInteractable(`skill:${index}`)
  }, [index, pos, skill])

  return (
    <VoxelSign
      position={[pos.x, gy, pos.z]}
      rotationY={pos.faceCenter}
      lines={[skill.name.toUpperCase(), skill.category]}
      colors={[skill.color, '#eef1f5']}
      width={Math.max(2.8, skill.name.length * 0.46)}
      height={1.3}
    />
  )
}

