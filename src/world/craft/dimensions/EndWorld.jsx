import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { TerrainGrid, mulberry32, endPalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign, { makeTextTexture } from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'

// ------------------------------------------------------------------
// THE END — Resume dimension.
//
// Floating endstone islands in a starlit void. The central island
// carries a giant open book labeled RESUME; six section islands ring
// it (Education / Experience / Open Source / Projects /
// Certifications / Achievements), connected by narrow bridges.
// ------------------------------------------------------------------

const SIZE = 110
const X0 = -55
const TOP = 12

export const RESUME_SECTIONS = [
  { id: 'education', title: 'EDUCATION', angle: -90 },
  { id: 'experience', title: 'EXPERIENCE', angle: -30 },
  { id: 'oss', title: 'OPEN SOURCE', angle: 30 },
  { id: 'projects', title: 'PROJECTS', angle: 90 },
  { id: 'certs', title: 'CERTIFICATIONS', angle: 150 },
  { id: 'achievements', title: 'ACHIEVEMENTS', angle: 210 },
]

function sectionSpot(sec) {
  const r = 30
  const rad = (sec.angle * Math.PI) / 180
  return {
    x: Math.round(Math.cos(rad) * r),
    z: Math.round(Math.sin(rad) * r),
    top: TOP + ((sec.angle / 60) % 2 === 0 ? 0 : 1),
  }
}

function Crystal({ position, color = '#c9a0ff' }) {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = t * 0.8
      ref.current.rotation.x = Math.sin(t * 0.5) * 0.3
      ref.current.position.y = position[1] + Math.sin(t * 1.3) * 0.18
    }
  })
  return (
    <>
      <mesh ref={ref} position={position}>
        <octahedronGeometry args={[0.55]} />
        <meshLambertMaterial color="#2a1740" emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[position[0], position[1] + 0.5, position[2]]} color={color} intensity={4.5} distance={8} decay={2} />
    </>
  )
}

function SectionIsland({ sec, spot }) {
  useEffect(() => {
    registerInteractable({
      key: `resume:${sec.id}`,
      x: spot.x,
      z: spot.z,
      radius: 3.6,
      verb: 'View',
      label: sec.title,
      accent: '#d9baff',
      panel: { type: 'resumeSection', data: { topic: sec.id, title: sec.title } },
    })
    return () => unregisterInteractable(`resume:${sec.id}`)
  }, [sec, spot])

  return (
    <group>
      <Crystal position={[spot.x, spot.top + 2.6, spot.z]} />
      <VoxelSign
        position={[spot.x, spot.top, spot.z]}
        rotationY={Math.atan2(-spot.x, -spot.z)}
        lines={[sec.title]}
        colors={['#e8ccff']}
        width={Math.max(2.8, sec.title.length * 0.4)}
        height={1.15}
      />
    </group>
  )
}

function GiantBook({ position }) {
  const groupRef = useRef(null)
  useEffect(() => {
    registerInteractable({
      key: 'resume:book',
      x: position[0],
      z: position[2] + 2.6,
      radius: 4.4,
      verb: 'Open',
      label: 'The Great Resume',
      accent: '#c78aff',
      panel: { type: 'resumeBook' },
    })
    return () => unregisterInteractable('resume:book')
  }, [position])
  const coverTex = useMemo(
    () =>
      makeTextTexture({
        lines: ['RESUME', '', 'NAMAN SINGH'],
        colors: ['#f0e6ff', '#ffffff', '#b06ae8'],
        sizes: [72, 20, 34],
        bg: '#3a2158',
        border: '#170b24',
      }),
    [],
  )
  const pageTex = useMemo(
    () =>
      makeTextTexture({
        lines: ['THE STORY', 'OF A', 'BUILDER'],
        colors: ['#b9a7cc', '#8f7fa5', '#b9a7cc'],
        sizes: [40, 40, 40],
        bg: '#efe9dc',
        border: '#cfc4ae',
      }),
    [],
  )
  useEffect(
    () => () => {
      coverTex.dispose()
      pageTex.dispose()
    },
    [coverTex, pageTex],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.9) * 0.22
      groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.14
    }
  })

  return (
    <group>
      {/* purpur pedestal */}
      <mesh position={[position[0], TOP + 0.75, position[2]]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.5, 2.4]} />
        <meshLambertMaterial color="#6d4380" />
      </mesh>
      <mesh position={[position[0], TOP + 1.62, position[2]]}>
        <boxGeometry args={[3.7, 0.26, 2.9]} />
        <meshLambertMaterial color="#9d6bad" />
      </mesh>

      <group ref={groupRef} position={[position[0], TOP + 1.75, position[2]]}>
        {/* back cover */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[4.6, 0.22, 3.2]} />
          <meshLambertMaterial color="#3a2158" />
        </mesh>
        {/* left page block */}
        <mesh position={[-1.06, 0.52, 0]} rotation={[0, 0, 0.05]} castShadow>
          <boxGeometry args={[2.05, 0.55, 3.0]} />
          <meshLambertMaterial color="#efe9dc" />
        </mesh>
        {/* right page block */}
        <mesh position={[1.06, 0.52, 0]} rotation={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[2.05, 0.55, 3.0]} />
          <meshLambertMaterial color="#efe9dc" />
        </mesh>
        {/* covers standing open */}
        <mesh position={[-2.28, 1.02, 0]} rotation={[0, 0, 0.98]} castShadow>
          <boxGeometry args={[0.2, 2.3, 3.2]} />
          <meshStandardMaterial color="#4a2a6e" emissive="#2a1544" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[2.28, 1.02, 0]} rotation={[0, 0, -0.98]} castShadow>
          <boxGeometry args={[0.2, 2.3, 3.2]} />
          <meshStandardMaterial color="#4a2a6e" emissive="#2a1544" emissiveIntensity={0.4} />
        </mesh>
        {/* RESUME label plate facing south (spawn side) */}
        <mesh position={[0, 0.95, 1.66]} rotation={[-0.42, 0, 0]}>
          <planeGeometry args={[3.4, 2.0]} />
          <meshBasicMaterial map={coverTex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.32, -1.58]} rotation={[0.5, Math.PI, 0]}>
          <planeGeometry args={[3.0, 1.7]} />
          <meshBasicMaterial map={pageTex} toneMapped={false} />
        </mesh>
      </group>

      <pointLight position={[position[0], TOP + 4.4, position[2]]} color="#c9a0ff" intensity={16} distance={16} decay={2} />
    </group>
  )
}

export default function EndWorld() {
  const B = useMemo(endPalette, [])

  const { geo, field, bookSpot } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE, sizeZ: SIZE, x0: X0, z0: X0 })
    const rng = mulberry32(2024)

    // island builder: flat endstone top with jagged tapered underside
    const island = (cx, cz, radius, top) => {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        for (let z = cz - radius; z <= cz + radius; z += 1) {
          const d = Math.hypot(x - cx, z - cz)
          if (d > radius + (rng() - 0.5)) continue
          const edge = d / radius
          const depth = Math.max(2, Math.round((1 - edge * edge) * 11 + rng() * 2))
          for (let y = top - depth; y <= top; y += 1) {
            let id = B.endstone
            if (y === top) id = edge > 0.82 ? B.endstoneDeep : B.endstone
            else if (y < top - depth + 2) id = rng() < 0.5 ? B.purpurDark : B.obsidian
            else if (y === top - 1) id = B.endstoneDeep
            grid.set(x, y, z, id)
          }
          if (edge <= 0.95) grid.setHeight(x, z, top)
        }
      }
    }

    // central island
    island(0, 0, 15, TOP)

    // ring islands + bridges
    const spots = RESUME_SECTIONS.map(sectionSpot)
    spots.forEach((s) => island(s.x, s.z, 6, s.top))
    spots.forEach((s) => {
      const steps = 26
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps
        const bx = Math.round(s.x * t)
        const bz = Math.round(s.z * t)
        const bh = Math.round(TOP + (s.top - TOP) * t)
        for (let w = 0; w < 2; w += 1) {
          const wx = bx + (Math.abs(s.z) > Math.abs(s.x) ? w : 0)
          const wz = bz + (Math.abs(s.z) > Math.abs(s.x) ? 0 : w)
          if (grid.heightAt(wx, wz) === -999 || Math.abs(grid.heightAt(wx, wz) - bh) > 2) {
            grid.column(wx, wz, bh, B.endBrick, B.purpurDark, bh - 2)
          }
        }
      }
    })

    // obsidian pillars on the main island for drama
    ;[
      [-9, -8, 7], [10, -6, 9], [-7, 9, 6], [8, 10, 8],
    ].forEach(([px, pz, ph]) => {
      grid.boxFill(px - 1, px + 1, TOP + 1, TOP + ph, pz - 1, pz + 1, B.obsidian)
      grid.set(px, TOP + ph + 1, pz, B.endGlow)
    })

    const geo = buildVoxelGeometry({
      get: (x, y, z) => grid.get(x, y, z),
      x0: X0,
      x1: X0 + SIZE - 1,
      y0: -2,
      y1: 30,
      z0: X0,
      z1: X0 + SIZE - 1,
    })

    return { geo, field: grid.field({ killY: -30 }), bookSpot: { x: 0, z: 0 } }
  }, [B])

  useEffect(() => {
    setField('end', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#070310']} />
      <fogExp2 attach="fog" args={['#0d0618', 0.0055]} />
      <Stars radius={220} depth={60} count={2800} factor={5} saturation={0.4} fade speed={0.6} />

      <hemisphereLight args={['#8f7bd8', '#120a24', 0.65]} />
      <directionalLight position={[-24, 50, -14]} color="#cdb8ff" intensity={0.55} />

      <VoxelRenderer geo={geo} />

      <GiantBook position={[bookSpot.x, 0, bookSpot.z]} />

      {RESUME_SECTIONS.map((sec) => {
        const spot = sectionSpot(sec)
        return <SectionIsland key={sec.id} sec={sec} spot={spot} />
      })}

      <Portal
        id="overworld"
        position={[11, field.groundAt(11, 8), 8]}
        rotationY={-Math.PI / 2}
          title="Return to the Realms"
        subtitle="Home"
        verb="Return"
        signLines={['RETURN TO', 'THE REALMS']}
        signWidth={5}
      />
    </>
  )
}

