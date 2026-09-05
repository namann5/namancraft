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
// THE SKYLINE DISTRICT — Projects dimension.
//
// A brand-new night city: a wide boulevard lined with two rows of
// hand-built towers, each reading as a project (distinct materials,
// glowing windows, rooftop beacons). A raised plaza with a beacon
// obelisk crowns the middle of the avenue. Walk up to any tower and
// inspect the story behind it.
// ------------------------------------------------------------------

const SIZE_X = 96
const SIZE_Z = 80
const X0 = -48
const Z0 = -40
const GY = 10

const EAST_X = 20
const WEST_X = -30
const W_PLOT = 10
const D_PLOT = 10

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

// fresh plot layout: two rows set back from a wider avenue
function plotFor(i) {
  const side = i < 4 ? 0 : 1 // 0 = east row, 1 = west row
  const col = i % 4
  const x0 = side === 0 ? EAST_X : WEST_X
  const z0 = [-33, -12, 9, 30][col]
  return { x0, z0, w: W_PLOT, d: D_PLOT, side }
}

const STYLE_WALLS = {
  glass: ['glassBlue', 'windowCool'],
  brick: ['brickRed', 'windowWarm'],
  concrete: ['concrete', 'windowWarm'],
  concreteDark: ['concreteDark', 'windowCool'],
  sandstone: ['sandstone', 'windowWarm'],
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

export default function ProjectsWorld() {
  const B = useMemo(cityPalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE_X, sizeZ: SIZE_Z, x0: X0, z0: Z0 })
    const rng = mulberry32(909)

    // ---- ground: asphalt with a wide sidewalk boulevard ----
    for (let x = X0; x < X0 + SIZE_X; x += 1) {
      for (let z = Z0; z < Z0 + SIZE_Z; z += 1) {
        let top = B.asphalt
        if (Math.abs(x) <= 9) top = Math.abs(x) === 9 ? B.curb : B.sidewalk
        else if ((x - X0) % 24 === 0 || (z - Z0) % 26 === 0) top = B.concrete
        else if (rng() < 0.035) top = B.concreteDark
        grid.column(x, z, GY, top, B.asphalt, GY - 2)
      }
    }

    // zebra crosswalk dais at the middle of the avenue
    for (let x = -6; x <= 6; x += 1) {
      for (let z = -5; z <= 5; z += 1) {
        grid.column(x, z, GY + 1, Math.abs(x) % 2 ? B.curb : B.sidewalk, B.concrete, GY + 1)
      }
    }

    // ---- beacon obelisk at the plaza ----
    grid.boxFill(-1, 1, GY + 4, GY + 10, -1, 1, B.metal)
    grid.boxFill(0, 0, GY + 11, GY + 11, 0, 0, B.lamp)

    // ---- towers ----
    PROJECTS.forEach((proj, i) => {
      const plot = plotFor(i)
      const [wallId, winId] = STYLE_WALLS[proj.style]
      const wall = B[wallId] || B.concrete
      const h = GY + proj.floors * 2

      // shell
      for (let x = plot.x0; x < plot.x0 + plot.w; x += 1) {
        for (let z = plot.z0; z < plot.z0 + plot.d; z += 1) {
          const onEdge =
            x === plot.x0 || x === plot.x0 + plot.w - 1 ||
            z === plot.z0 || z === plot.z0 + plot.d - 1
          if (!onEdge) continue
          for (let y = GY + 1; y <= h; y += 1) {
            const relY = y - GY
            let id = wall
            if (relY >= 2 && relY % 2 === 0 && (x + z) % 3 !== 0) {
              id = rng() < 0.55 ? winId : wall
            }
            grid.set(x, y, z, id)
          }
        }
      }
      grid.boxFill(plot.x0 + 1, plot.x0 + plot.w - 2, h - 1, h - 1, plot.z0 + 1, plot.z0 + plot.d - 2, B.concreteDark)
      grid.boxFill(plot.x0, plot.x0 + plot.w - 1, h, h, plot.z0, plot.z0 + plot.d - 1, i % 2 ? B.roofGreen : B.concreteDark)

      // rooftop beacon (radio mast) on the tallest towers
      if (proj.floors >= 6) {
        const mx = Math.round(plot.x0 + plot.w / 2)
        const mz = Math.round(plot.z0 + plot.d / 2)
        grid.boxFill(mx, mx, h + 1, h + 3, mz, mz, B.metal)
        grid.set(mx, h + 4, mz, B.lamp)
      }
      // rooftop glass atrium box on glass towers
      if (proj.style === 'glass') {
        grid.boxShell(plot.x0 + 2, plot.x0 + 5, h + 1, h + 2, plot.z0 + 2, plot.z0 + 5, B.glassBlue)
        grid.set(plot.x0 + 2, h + 2, plot.z0 + 2, B.windowCool)
      }

      // illuminated door marker on the avenue face
      const dz = Math.round(plot.z0 + plot.d / 2)
      if (plot.side === 0) {
        grid.set(plot.x0, GY + 1, dz, B.lamp)
        grid.set(plot.x0, GY + 2, dz, B.windowWarm)
      } else {
        grid.set(plot.x0 + plot.w - 1, GY + 1, dz, B.lamp)
        grid.set(plot.x0 + plot.w - 1, GY + 2, dz, B.windowWarm)
      }
    })

    // ---- boulevard lamps ----
    for (let z = Z0 + 6; z < Z0 + SIZE_Z - 4; z += 14) {
      ;[-4, 4].forEach((lx) => {
        grid.boxFill(lx, lx, GY + 1, GY + 4, z, z, B.metal)
        grid.set(lx, GY + 5, z, B.lamp)
      })
    }

    const geoOut = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE_X - 1,
      y0: GY - 2,
      y1: GY + 18,
      z0: Z0,
      z1: Z0 + SIZE_Z - 1,
    })
    return { geo: geoOut, field: grid.field() }
  }, [B])

  useEffect(() => {
    setField('projects-world', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#0a1020']} />
      <fogExp2 attach="fog" args={['#111a30', 0.0065]} />
      <Stars radius={200} depth={50} count={2200} factor={4} fade speed={0.5} />

      <hemisphereLight args={['#4d6398', '#1a1d26', 1.0]} />
      <directionalLight position={[-40, 60, -20]} color="#b8ccf0" intensity={0.7} />
      <pointLight position={[0, 16, 0]} color="#ffb37a" intensity={45} distance={58} decay={2} />
      <pointLight position={[0, GY + 12, 0]} color="#ffe9b0" intensity={30} distance={26} decay={2} />

      <VoxelRenderer geo={geo} />

      <VoxelSign
        position={[0, GY + 2.2, 8]}
        rotationY={0}
        lines={['THE SKYLINE', 'DISTRICT']}
        colors={['#9fd8ff', '#ffe9b0']}
        width={5}
        height={1.6}
      />

      {PROJECTS.map((proj, i) => {
        const plot = plotFor(i)
        const midZ = Math.round(plot.z0 + plot.d / 2)
        const signPos = plot.side === 0
          ? [plot.x0 - 2.2, GY, midZ]
          : [plot.x0 + plot.w + 2.2, GY, midZ]
        return (
          <ProjectBuilding
            key={proj.name}
            proj={proj}
            index={i}
            signPos={signPos}
            rotationY={plot.side === 0 ? -Math.PI / 2 : Math.PI / 2}
          />
        )
      })}

      <Portal
        id="overworld"
        position={[9, field.groundAt(9, 30), 30]}
        rotationY={-Math.PI / 2}
        title="Return Home"
        subtitle="The Portal Plaza"
        verb="Return"
        signLines={['RETURN', 'HOME']}
        signWidth={4}
      />
    </>
  )
}