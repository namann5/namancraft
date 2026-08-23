import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { dayState } from './dayCycle'
import { LANDMARKS } from './landmarks'

// Soft round puff texture shared by smoke sprites.
function makePuffTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 15)
  g.addColorStop(0, 'rgba(235,235,240,0.85)')
  g.addColorStop(1, 'rgba(235,235,240,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

const SMOKE_COUNT = 9

// Chimney smoke: a few sprites rising and fading from the house chimney.
function ChimneySmoke() {
  const anchor = LANDMARKS.chimneyTop
  const tex = useMemo(makePuffTexture, [])
  const sprites = useMemo(
    () =>
      Array.from({ length: SMOKE_COUNT }, (_, i) => ({
        phase: i / SMOKE_COUNT,
        swaySeed: i * 2.399,
        sprite: null,
      })),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (const s of sprites) {
      if (!s.sprite) continue
      const life = (t * 0.24 + s.phase) % 1
      const mat = s.sprite.material
      s.sprite.position.set(
        anchor.x + Math.sin(t * 0.7 + s.swaySeed) * 0.5 * life,
        anchor.y + life * 5.5,
        anchor.z + Math.cos(t * 0.55 + s.swaySeed) * 0.4 * life,
      )
      const scale = 0.7 + life * 2.1
      s.sprite.scale.set(scale, scale, 1)
      mat.opacity = Math.sin(Math.PI * life) * 0.30
    }
  })

  return (
    <group>
      {sprites.map((s, i) => (
        <sprite key={i} ref={(r) => { s.sprite = r }}>
          <spriteMaterial map={tex} transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

const LEAF_COUNT = 72
// two drift fields: around the house + along the menu-view corridor
const LEAF_FIELDS = [
  { cx: 27, cz: -48, r: 15, top: 21, ground: 9 },
  { cx: -2, cz: -26, r: 20, top: 19, ground: 8 },
]

// Falling blossom petals drifting through the scene.
function FallingLeaves() {
  const meshRef = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const state = useMemo(
    () =>
      Array.from({ length: LEAF_COUNT }, (_, i) => {
        const f = LEAF_FIELDS[i % LEAF_FIELDS.length]
        return {
          field: f,
          x: f.cx + (Math.random() - 0.5) * f.r * 2,
          z: f.cz + (Math.random() - 0.5) * f.r * 2,
          y: f.ground + Math.random() * (f.top - f.ground),
          fall: 0.55 + Math.random() * 0.7,
          swayAmp: 0.6 + Math.random() * 1.2,
          swayFreq: 0.5 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2,
          spin: Math.random() * Math.PI,
        }
      }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const inst = meshRef.current
    if (!inst) return
    const t = clock.elapsedTime
    for (let i = 0; i < LEAF_COUNT; i += 1) {
      const p = state[i]
      const f = p.field
      p.y -= p.fall * dt
      if (p.y < f.ground) {
        p.y = f.top
        p.x = f.cx + (Math.random() - 0.5) * f.r * 2
        p.z = f.cz + (Math.random() - 0.5) * f.r * 2
      }
      dummy.position.set(
        p.x + Math.sin(t * p.swayFreq + p.phase) * p.swayAmp,
        p.y,
        p.z + Math.cos(t * p.swayFreq * 0.8 + p.phase) * p.swayAmp * 0.6,
      )
      dummy.rotation.set(p.spin + t * 0.8, p.phase + t * 0.5, 0)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    }
    inst.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, LEAF_COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.22, 0.22]} />
      <meshBasicMaterial color="#f2b9cf" side={THREE.DoubleSide} transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  )
}

const FLY_COUNT = 64

// Fireflies that wake up after dusk near the house and gardens.
function Fireflies() {
  const ref = useRef(null)
  const matRef = useRef(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(FLY_COUNT * 3)
    for (let i = 0; i < FLY_COUNT; i += 1) {
      // corridor along the path branch + garden + around the clock knoll
      if (i % 4 === 0) {
        positions[i * 3] = -26 + Math.random() * 10
        positions[i * 3 + 1] = 7.5 + Math.random() * 4
        positions[i * 3 + 2] = -14 + Math.random() * 10
      } else {
        positions[i * 3] = 12 + Math.random() * 34
        positions[i * 3 + 1] = 9.5 + Math.random() * 5
        positions[i * 3 + 2] = -60 + Math.random() * 22
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  const basePositions = useMemo(() => geometry.getAttribute('position').array.slice(), [geometry])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const night = 1 - dayState.daylight
    if (matRef.current) {
      matRef.current.opacity = night > 0.25 ? Math.min(1, night * 1.4) * (0.72 + Math.sin(t * 2.2) * 0.18) : 0
    }
    const attr = geometry.getAttribute('position')
    if (!attr || night <= 0.05) return
    for (let i = 0; i < FLY_COUNT; i += 1) {
      attr.array[i * 3] = basePositions[i * 3] + Math.sin(t * 0.6 + i * 1.31) * 1.1
      attr.array[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(t * 0.83 + i * 2.17) * 0.7
      attr.array[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * 0.5 + i * 0.77) * 1.1
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={matRef}
        color="#d8ffa0"
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function Ambience() {
  return (
    <>
      <ChimneySmoke />
      <FallingLeaves />
      <Fireflies />
    </>
  )
}
