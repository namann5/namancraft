import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { TerrainGrid, mulberry32, archivePalette } from './terrainKit'
import { buildVoxelGeometry } from './voxelMesh'
import VoxelRenderer from './VoxelRenderer'
import { setField } from './worldStore'
import Portal from './Portal'
import VoxelSign, { makeTextTexture } from './signs'
import { registerInteractable, unregisterInteractable } from './interactables'

// ------------------------------------------------------------------
// THE MOONLIT ARCHIVE — Info dimension.
//
// A dark library keep built on a star-scattered plaza. At its heart
// floats a great open book (the full resume); six lecterns around it
// hold glowing tomes for each section of the story, and tall stacks
// of bookcases ring the floor with softly lit spines.
// ------------------------------------------------------------------

const SIZE = 96
const X0 = -48
const TOP = 12

const RESUME_SECTIONS = [
  { id: 'education', title: 'EDUCATION', angle: -90 },
  { id: 'experience', title: 'EXPERIENCE', angle: -30 },
  { id: 'oss', title: 'OPEN SOURCE', angle: 30 },
  { id: 'projects', title: 'PROJECTS', angle: 90 },
  { id: 'certs', title: 'CERTIFICATIONS', angle: 150 },
  { id: 'achievements', title: 'ACHIEVEMENTS', angle: 210 },
]

const SPINE_COLORS = ['#c78aff', '#5ec8f0', '#ffcf4d', '#ff9a3d', '#7dffb0', '#ff6a9a']

function lecternSpot(sec) {
  const rad = (sec.angle * Math.PI) / 180
  return { x: Math.round(Math.cos(rad) * 24), z: Math.round(Math.sin(rad) * 24) }
}

function GlowOrb({ position, color = '#c9a0ff' }) {
  const ref = useRef(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      ref.current.rotation.y = t * 0.9
      ref.current.rotation.x = Math.sin(t * 0.6) * 0.3
      ref.current.position.y = position[1] + Math.sin(t * 1.4) * 0.16
    }
  })
  return (
    <>
      <mesh ref={ref} position={position}>
        <octahedronGeometry args={[0.5]} />
        <meshLambertMaterial color="#2a1740" emissive={color} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <pointLight position={[position[0], position[1] + 0.5, position[2]]} color={color} intensity={5} distance={8} decay={2} />
    </>
  )
}

function Lectern({ sec, spot, color }) {
  useEffect(() => {
    registerInteractable({
      key: `archive:${sec.id}`,
      x: spot.x,
      z: spot.z,
      radius: 3.6,
      verb: 'Read',
      label: sec.title,
      accent: color,
      panel: { type: 'resumeSection', data: { topic: sec.id, title: sec.title } },
    })
    return () => unregisterInteractable(`archive:${sec.id}`)
  }, [sec, spot, color])

  return (
    <group>
      <GlowOrb position={[spot.x, TOP + 2.9, spot.z]} color={color} />
      <VoxelSign
        position={[spot.x, TOP + 0.6, spot.z]}
        rotationY={Math.atan2(-spot.x, -spot.z)}
        lines={[sec.title]}
        colors={['#efe9dc']}
        width={Math.max(2.6, sec.title.length * 0.4)}
        height={1.1}
      />
    </group>
  )
}

function ArchiveBook({ position }) {
  const groupRef = useRef(null)
  useEffect(() => {
    registerInteractable({
      key: 'archive:book',
      x: position[0],
      z: position[2] + 3.2,
      radius: 4.6,
      verb: 'Open',
      label: 'The Story of Naman',
      accent: '#c78aff',
      panel: { type: 'resumeBook' },
    })
    return () => unregisterInteractable('archive:book')
  }, [position])
  const coverTex = useMemo(
    () =>
      makeTextTexture({
        lines: ['INFO', 'ARCHIVE', '', 'THE FULL STORY'],
        colors: ['#f0e6ff', '#b06ae8', '#ffffff', '#8f7fa5'],
        sizes: [72, 56, 12, 34],
        bg: '#3a2158',
        border: '#170b24',
      }),
    [],
  )
  const pageTex = useMemo(
    () =>
      makeTextTexture({
        lines: ['BUILDER', 'BY', 'CRAFT'],
        colors: ['#4a3a2c', '#8f7fa5', '#4a3a2c'],
        sizes: [40, 22, 34],
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
      groupRef.current.position.y = TOP + 1.85 + Math.sin(t * 0.8) * 0.2
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.12
    }
  })

  return (
    <group>
      {/* open-book pedestal */}
      <mesh position={[position[0], TOP + 0.75, position[2]]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.5, 2.4]} />
        <meshLambertMaterial color="#6d4380" />
      </mesh>
      <mesh position={[position[0], TOP + 1.62, position[2]]}>
        <boxGeometry args={[3.9, 0.26, 2.9]} />
        <meshLambertMaterial color="#9d6bad" />
      </mesh>

      <group ref={groupRef} position={[position[0], TOP + 1.75, position[2]]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[4.6, 0.22, 3.2]} />
          <meshLambertMaterial color="#3a2158" />
        </mesh>
        <mesh position={[-1.06, 0.52, 0]} rotation={[0, 0, 0.05]} castShadow>
          <boxGeometry args={[2.05, 0.55, 3.0]} />
          <meshLambertMaterial color="#efe9dc" />
        </mesh>
        <mesh position={[1.06, 0.52, 0]} rotation={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[2.05, 0.55, 3.0]} />
          <meshLambertMaterial color="#efe9dc" />
        </mesh>
        <mesh position={[-2.28, 1.02, 0]} rotation={[0, 0, 0.98]} castShadow>
          <boxGeometry args={[0.2, 2.3, 3.2]} />
          <meshStandardMaterial color="#4a2a6e" emissive="#2a1544" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[2.28, 1.02, 0]} rotation={[0, 0, -0.98]} castShadow>
          <boxGeometry args={[0.2, 2.3, 3.2]} />
          <meshStandardMaterial color="#4a2a6e" emissive="#2a1544" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.95, 1.62]} rotation={[-0.42, 0, 0]}>
          <planeGeometry args={[3.4, 2.0]} />
          <meshBasicMaterial map={coverTex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.32, -1.58]} rotation={[0.5, Math.PI, 0]}>
          <planeGeometry args={[3.0, 1.7]} />
          <meshBasicMaterial map={pageTex} toneMapped={false} />
        </mesh>
      </group>

      <pointLight position={[position[0], TOP + 4.6, position[2]]} color="#c9a0ff" intensity={18} distance={18} decay={2} />
    </group>
  )
}

export default function InfoWorld() {
  const B = useMemo(archivePalette, [])

  const { geo, field } = useMemo(() => {
    const grid = new TerrainGrid({ sizeX: SIZE, sizeZ: SIZE, x0: X0, z0: X0 })
    const rng = mulberry32(808)

    // ---- plaza floor with obsidian edging ----
    for (let x = X0; x < X0 + SIZE; x += 1) {
      for (let z = X0; z < X0 + SIZE; z += 1) {
        const edge = x === X0 || x === X0 + SIZE - 1 || z === X0 || z === X0 + SIZE - 1
        const top = edge ? B.obsidian : (x + z) & 1 ? B.floorDark : B.floor
        grid.column(x, z, TOP, top, B.floorDark, -4)
        if (!edge && rng() < 0.004) grid.set(x, TOP + 1, z, B.bookCool)
      }
    }

    // ---- central keep dais ----
    grid.boxFill(-6, 6, TOP + 1, TOP + 2, -6, 6, B.stone)
    grid.boxFill(-5, 5, TOP + 1, TOP + 2, -5, 5, B.stoneDark)
    grid.set(0, TOP + 3, 0, B.bookGold)

    // ---- four keep corner pillars ----
    ;[
      [-10, -10], [10, -10], [-10, 10], [10, 10],
    ].forEach(([cx, cz]) => {
      grid.boxFill(cx - 1, cx + 1, TOP + 1, TOP + 9, cz - 1, cz + 1, B.shelfDark)
      grid.set(cx, TOP + 10, cz, B.lanternGold)
    })

    // ---- lecterns (stone plinth + glowing tome) ----
    RESUME_SECTIONS.forEach((sec, i) => {
      const s = lecternSpot(sec)
      grid.boxFill(s.x - 1, s.x + 1, TOP + 1, TOP + 5, s.z - 1, s.z + 1, B.stone)
      const tome = i % 3 === 0 ? B.bookGold : i % 2 ? B.bookCool : B.bookHot
      grid.set(s.x, TOP + 6, s.z, tome)
    })

    // ---- bookcase towers ringing the floor ----
    for (let k = 0; k < 8; k += 1) {
      const ang = (k * 45 * Math.PI) / 180
      const cx = Math.round(Math.cos(ang) * 38)
      const cz = Math.round(Math.sin(ang) * 38)
      grid.boxFill(cx - 1, cx + 1, TOP + 1, TOP + 7, cz - 1, cz + 1, B.shelf)
      grid.boxFill(cx - 1, cx + 1, TOP + 8, TOP + 8, cz - 1, cz + 1, B.shelfDark)
      grid.set(cx, TOP + 9, cz, B.lanternGold)
      const spine = (x, z) => {
        const b = [B.bookHot, B.bookCool, B.bookGold][(x + z + k) % 3]
        grid.set(x, TOP + 2, z, b)
        grid.set(x, TOP + 4, z, b)
        grid.set(x, TOP + 6, z, b)
      }
      spine(cx + 1, cz)
      spine(cx - 1, cz)
      spine(cx, cz + 1)
      spine(cx, cz - 1)
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

    return { geo, field: grid.field({ killY: -40 }) }
  }, [B])

  useEffect(() => {
    setField('info-world', field)
    return () => {
      geo.solid.dispose()
      geo.glow.dispose()
    }
  }, [geo, field])

  return (
    <>
      <color attach="background" args={['#070310']} />
      <fogExp2 attach="fog" args={['#0d0618', 0.0045]} />
      <Stars radius={220} depth={60} count={2600} factor={5} saturation={0.4} fade speed={0.6} />

      <hemisphereLight args={['#8f7bd8', '#120a24', 0.6]} />
      <directionalLight position={[-20, 46, -10]} color="#cdb8ff" intensity={0.6} />
      <pointLight position={[0, TOP + 4, 0]} color="#ffe9b0" intensity={26} distance={26} decay={2} />

      <VoxelRenderer geo={geo} />

      <ArchiveBook position={[0, 0, 0]} />

      {RESUME_SECTIONS.map((sec, i) => (
        <Lectern
          key={sec.id}
          sec={sec}
          spot={lecternSpot(sec)}
          color={SPINE_COLORS[i % SPINE_COLORS.length]}
        />
      ))}

      <Portal
        id="overworld"
        position={[9, field.groundAt(9, 34), 34]}
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