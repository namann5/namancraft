import { useEffect, useMemo } from 'react'
import { Stars } from '@react-three/drei'
import { TerrainGrid, mulberry32, cityPalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'

// ------------------------------------------------------------------
// BUILD DISTRICT — Projects dimension.
//
// A night city. Two avenues of unique buildings, each one a project:
// distinct architecture, glowing windows, a neon sign carrying the
// project name. Walk up to any building and inspect it.
// ------------------------------------------------------------------

const SIZE_X = 96
const SIZE_Z = 72
const X0 = -48
const Z0 = -36
const GY = 10

const PROJECTS = [
  { name: 'Ai_deepfake', accent: '#5ec8f0', style: 'glass', floors: 6, tag: 'AI / CV' },
  { name: 'Ai_Customer_Service', accent: '#3ddc84', style: 'brick', floors: 4, tag: 'FULL-STACK' },
  { name: 'autonomous-driving-system-clean', accent: '#ffd23e', style: 'concrete', floors: 7, tag: 'ROBOTICS' },
  { name: 'MergeShip', accent: '#c78aff', style: 'sandstone', floors: 3, tag: 'DEV TOOLS' },
  { name: 'SecuScan', accent: '#ff5b4d', style: 'concreteDark', floors: 5, tag: 'SECURITY' },
  { name: 'UltimateHealth', accent: '#67d08b', style: 'brick', floors: 4, tag: 'HEALTH' },
  { name: 'Rocket.Chat', accent: '#ff8a5c', style: 'glass', floors: 5, tag: 'OPEN SOURCE' },
  { name: 'story-spark-ai', accent: '#9fd8ff', style: 'sandstone', floors: 3, tag: 'GENERATIVE AI' },
]

// building plots: two rows flanking the central avenue (x ∈ [-8..8])
function plotFor(i) {
  const side = i < 4 ? 0 : 1 // 0 = east side, 1 = west side
  const col = i % 4
  return {
    x0: side === 0 ? 10 : -38,
    z0: -28 + col * 16,
    w: 14,
    d: 12,
    flip: side === 1,
  }
}

const STYLE_WALLS = {
  glass: ['glassBlue', 'windowCool'],
  brick: ['brickRed', 'windowWarm'],
  concrete: ['concrete', 'windowWarm'],
  concreteDark: ['concreteDark', 'windowCool'],
  sandstone: ['sandstone', 'windowWarm'],
}

export default function ProjectsWorld() {
  const B = useMemo(cityPalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE_X, sizeZ: SIZE_Z, x0: X0, z0: Z0 })
    const rng = mulberry32(808)

    // ---- ground: asphalt with sidewalks ----
    for (let x = X0; x < X0 + SIZE_X; x += 1) {
      for (let z = Z0; z < Z0 + SIZE_Z; z += 1) {
        let top = B.asphalt
        if (Math.abs(x) <= 8) top = Math.abs(x) === 8 ? B.curb : B.sidewalk
        else if (x % 24 === 0 || z === Z0 + 2 || z === Z0 + SIZE_Z - 3) top = B.sidewalk
        if ((x % 24 !== 0 && Math.abs(x) > 8) && rng() < 0.04) top = B.concreteDark
        grid.column(x, z, GY, top, B.asphalt)
      }
    }

    // ---- buildings ----
    PROJECTS.forEach((proj, i) => {
      const plot = plotFor(i)
      const [wallId, winId] = STYLE_WALLS[proj.style]
      const wall = B[wallId] || B.concrete
      const h = GY + proj.floors

      // shell
      for (let x = plot.x0; x < plot.x0 + plot.w; x += 1) {
        for (let z = plot.z0; z < plot.z0 + plot.d; z += 1) {
          const onEdge =
            x === plot.x0 || x === plot.x0 + plot.w - 1 ||
            z === plot.z0 || z === plot.z0 + plot.d - 1
          if (!onEdge) continue
          for (let y = GY + 1; y <= h; y += 1) {
            let id = wall
            // window bands every floor
            const relY = y - GY
            if (relY >= 2 && relY % 2 === 0 && (x + z) % 3 !== 0) {
              id = rng() < 0.55 ? winId : wall
            }
            grid.set(x, y, z, id)
          }
        }
      }
      // interior fill so roofs read solid from above
      grid.boxFill(plot.x0 + 1, plot.x0 + plot.w - 2, h - 1, h - 1, plot.z0 + 1, plot.z0 + plot.d - 2, B.concreteDark)
      // roof slab + props
      grid.boxFill(plot.x0, plot.x0 + plot.w - 1, h, h, plot.z0, plot.z0 + plot.d - 1, i % 2 ? B.roofGreen : B.concreteDark)
      grid.boxFill(plot.x0 + 2, plot.x0 + 3, h + 1, h + 2, plot.z0 + 2, plot.z0 + 3, B.metal)
      grid.boxFill(plot.x0 + plot.w - 3, plot.x0 + plot.w - 2, h + 1, h + 1, plot.z0 + plot.d - 3, plot.z0 + plot.d - 2, B.metal)

      // door marker on the avenue side
      const fz = plot.flip ? plot.z0 : plot.z0 + plot.d - 1
      const dx = plot.flip ? plot.x0 + plot.w - 1 : plot.x0
      grid.set(dx, GY + 1, fz, B.lamp)
      grid.set(dx, GY + 2, fz, B.windowWarm)
    })

    // ---- street lamps along the avenue ----
    for (let z = Z0 + 6; z < Z0 + SIZE_Z - 4; z += 14) {
      ;[-7, 7].forEach((lx) => {
        grid.boxFill(lx, lx, GY + 1, GY + 4, z, z, B.metal)
        grid.set(lx, GY + 5, z, B.lamp)
      })
    }
    // avenue center line
    for (let z = Z0 + 3; z < Z0 + SIZE_Z - 3; z += 2) grid.set(0, GY, z, B.curb)

    const geoOut = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE_X - 1,
      y0: -2,
      y1: GY + 16,
      z0: Z0,
      z1: Z0 + SIZE_Z - 1,
    })
    return { geo: geoOut, field: grid.field() }
  }, [B])

  useEffect(() => {
    setField('projects', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#0a1020']} />
      <fogExp2 attach="fog" args={['#111a30', 0.0075]} />
      <Stars radius={200} depth={50} count={2200} factor={4} fade speed={0.5} />

      <hemisphereLight args={['#4d6398', '#1a1d26', 1.0]} />
      {/* cool moonlight */}
      <directionalLight position={[-40, 60, -20]} color="#b8ccf0" intensity={0.7} />
      {/* warm city glow */}
      <pointLight position={[0, 16, 0]} color="#ffb37a" intensity={45} distance={58} decay={2} />

      <VoxelRenderer geo={geo} />

      {/* project signs + interactables */}
      {PROJECTS.map((proj, i) => {
        const plot = plotFor(i)
        const signX = plot.flip ? plot.x0 + plot.w / 2 : plot.x0 + plot.w / 2
        const signZ = plot.flip ? plot.z0 - 2.2 : plot.z0 + plot.d + 2.2
        return (
          <ProjectBuilding
            key={proj.name}
            proj={proj}
            index={i}
            signPos={[signX, GY, signZ]}
            rotationY={plot.flip ? 0 : Math.PI}
          />
        )
      })}

      <Portal
        id="overworld"
        position={[0, field.groundAt(0, 28), 28]}
        rotationY={Math.PI}
          title="Return to the Realms"
        subtitle="Home"
        verb="Return"
        signLines={['RETURN TO', 'THE REALMS']}
        signWidth={5}
      />
    </>
  )
}

function ProjectBuilding({ proj, index, signPos, rotationY }) {
  useEffect(() => {
    registerInteractable({
      key: `project:${index}`,
      x: signPos[0],
      z: signPos[2],
      radius: 5.5,
      verb: 'Inspect',
      label: proj.name.replace(/-/g, ' '),
      accent: proj.accent,
      panel: { type: 'project', data: proj },
    })
    return () => unregisterInteractable(`project:${index}`)
  }, [index, signPos, proj])

  return (
    <VoxelSign
      position={signPos}
      rotationY={rotationY}
      lines={[proj.tag, proj.name.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase()]}
      colors={[proj.accent, '#eef1f5']}
      width={4.6}
      height={1.6}
    />
  )
}

