import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { registerInteractable, unregisterInteractable } from './interactables'
import { useWorldStore } from './worldStore'
import { playerEye } from '../controls'
import { portalBus } from './portalBus'
import VoxelSign from './signs'
import VoxelIcon from './icons'

// ------------------------------------------------------------------
// Portal — the dimension-travel structure.
//
// A Minecraft-inspired NETHER portal: a blocky obsidian frame around
// an animated deep-purple surface with violet highlights, drifting
// purple particles and purple light bleeding onto nearby terrain.
// Every portal in the game shares this look so "purple portal =
// travel" becomes the navigation language of NamanCraft.
//
// Low-end devices skip the custom shader for a cheap pulsing pair of
// translucent quads and get fewer particles.
// ------------------------------------------------------------------

const PURPLE_DARK = new THREE.Color('#3b0f66') // deep violet inner tones
const PURPLE_HI = new THREE.Color('#a855f7') // bright violet highlights
const PURPLE_PULSE = new THREE.Color('#d8b4fe')
const OBSIDIAN_A = '#130a1f' // near-black purple frame blocks
const OBSIDIAN_B = '#1e1233'
const LIGHT_PURPLE = '#9333ea'

// one shared request channel; WorldExperience wires the handler
// (Portal itself stays dumb: it only asks "please travel to id")
export function useLowEnd() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const cores = navigator.hardwareConcurrency || 8
    const mem = navigator.deviceMemory || 8
    return cores <= 4 || mem <= 4
  }, [])
}

// ------------------------------------------------------------------
// Surface shader — cheap single-octave noise swirl with vertical
// rippling, slow drift and occasional brighter purple pulses.
// ------------------------------------------------------------------
const surfaceVert = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(p.x * 2.4 + uTime * 1.6) * 0.09 + cos(p.y * 2.1 - uTime * 1.3) * 0.09;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const surfaceFrag = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uBoost;
uniform vec3 uC1;
uniform vec3 uC2;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  // drifting coordinates: slow vertical ripple + lateral crawl
  vec2 uv = vUv - 0.5;
  float ripple = sin(vUv.y * 14.0 - uTime * 1.7) * 0.03
               + sin((vUv.x + vUv.y) * 9.0 + uTime * 0.8) * 0.02;
  vec2 flow = vec2(uTime * 0.045, -uTime * 0.06 + ripple);

  float r = length(uv) * 2.0;
  float ang = atan(uv.y, uv.x);

  // two counter-rotating swirl layers over wobbling noise
  float n = noise(vUv * 5.0 + flow * 3.0 + ripple * 2.0);
  float s1 = sin(ang * 3.0 + uTime * 1.7 + r * 10.0 + n * 4.0) * 0.5 + 0.5;
  float s2 = sin(ang * 5.0 - uTime * 1.05 + r * 16.0 + n * 6.0) * 0.5 + 0.5;
  float swirl = s1 * 0.62 + s2 * 0.38;

  // occasional brighter purple pulses travelling down the surface
  float pulseWave = pow(0.5 + 0.5 * sin(vUv.y * 6.0 - uTime * 1.35), 7.0);
  float breathe = pow(0.5 + 0.5 * sin(uTime * 0.85), 5.0);
  float pulse = pulseWave * 0.55 + breathe * 0.45;

  // darker rim, bright violet heart
  float core = smoothstep(0.95, 0.25, r);
  vec3 col = mix(uC1 * 0.52, uC2, swirl * core + 0.10);
  col += uC2 * pulse * core * 0.42;
  col *= (0.88 + uBoost * 0.85);

  // soft edge so the surface melts into the obsidian frame
  float alpha = smoothstep(1.02, 0.88, r) * (0.86 + swirl * 0.14);
  gl_FragColor = vec4(col, alpha);
}
`

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Blocky obsidian frame with slightly irregular hand-placed blocks.
function PortalFrame({ halfW, height }) {
  const blocks = useMemo(() => {
    const rng = mulberry32(0x0b51a7)
    const list = []
    const push = (x, y) => {
      list.push({
        x,
        y,
        jx: (rng() - 0.5) * 0.09,
        jy: (rng() - 0.5) * 0.09,
        sx: 1 + (rng() - 0.5) * 0.12,
        sy: 1 + (rng() - 0.5) * 0.12,
        rot: (rng() - 0.5) * 0.05,
        tone: rng(),
      })
    }
    for (let x = -halfW; x <= halfW; x += 1) {
      push(x, 0)
      push(x, height + 1)
    }
    for (let y = 1; y <= height; y += 1) {
      push(-halfW, y)
      push(halfW, y)
    }
    return list
  }, [halfW, height])

  return (
    <group>
      {blocks.map((b, i) => (
        <mesh
          key={i}
          position={[b.x + b.jx, b.y + 0.5 + b.jy, b.jx * 0.4]}
          rotation={[0, 0, b.rot]}
          scale={[b.sx, b.sy, 1 + b.tone * 0.15]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={b.tone > 0.62 ? OBSIDIAN_B : OBSIDIAN_A} />
        </mesh>
      ))}
    </group>
  )
}

function PortalParticles({ spreadX, height, count }) {
  const ref = useRef(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 2 * (spreadX + 0.6)
      positions[i * 3 + 1] = 0.4 + Math.random() * height
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [spreadX, height, count])

  const base = useMemo(() => geometry.getAttribute('position').array.slice(), [geometry])

  useEffect(
    () => () => geometry.dispose(),
    [geometry],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const attr = geometry.getAttribute('position')
    for (let i = 0; i < count; i += 1) {
      attr.array[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i * 1.7) * 0.28
      attr.array[i * 3 + 1] = base[i * 3 + 1] + ((t * 0.32 + i / count) % 1) * 1.1 - 0.55 + Math.sin(t + i) * 0.06
      attr.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.55 + i * 0.9) * 0.22
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#c084fc"
        size={0.15}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function Portal({
  id,
  position = [0, 0, 0],
  rotationY = 0,
  title,
  subtitle,
  verb = 'Enter',
  halfW = 2,
  height = 4,
  sign = true,
  signLines,
  signWidth,
  icon,
}) {
  const lowEnd = useLowEnd()
  const matRef = useRef(null)
  const lightRef = useRef(null)
  const hoverRef = useRef(false)
  const glowARef = useRef(null)
  const glowBRef = useRef(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uC1: { value: PURPLE_DARK.clone() },
      uC2: { value: PURPLE_HI.clone() },
    }),
    [],
  )

  const px = position[0]
  const pz = position[2]
  const gy = position[1]

  // the sign must be wide enough for the LONGER of title/subtitle/sub-lines
  const longestSign = Math.max(
    title.length,
    subtitle ? subtitle.length : 0,
    ...(signLines || []).map((l) => (l || '').length),
  )

  // register "[E] ENTER / click" trigger just in front of the frame
  useEffect(() => {
    registerInteractable({
      key: `portal:${id}`,
      x: px,
      z: pz,
      radius: 3.6,
      verb,
      label: title,
      accent: '#c084fc',
      rotY: rotationY,
      travel: id,
    })
    return () => unregisterInteractable(`portal:${id}`)
  }, [id, px, pz, title, verb, rotationY])

  useEffect(
    () => () => {
      uniforms.uC1.value.dispose?.()
      uniforms.uC2.value.dispose?.()
    },
    [uniforms],
  )

  // proximity-gated direct click → travel (no WASD required)
  const handleClick = (e) => {
    e.stopPropagation()
    const dx = px - playerEye.x
    const dz = pz - playerEye.z
    if (Math.hypot(dx, dz) > 5.2) return
    portalBus.request?.(id)
  }

  const setHover = (on) => {
    hoverRef.current = on
    document.body.style.cursor = on ? 'pointer' : 'auto'
  }

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // glow up while hovered or while this portal is the active target
    const st = useWorldStore.getState()
    const active = st.travel && st.travel.to === id
    const boostTarget = hoverRef.current || active ? 1 : 0
    uniforms.uBoost.value += (boostTarget - uniforms.uBoost.value) * Math.min(1, 0.12)
    if (!lowEnd) uniforms.uTime.value = t
    if (lightRef.current) {
      lightRef.current.intensity = 16 + Math.sin(t * 2.6) * 2.5 + uniforms.uBoost.value * 22
    }
    // cheap fallback animation: pulsing translucent quads
    if (lowEnd && glowARef.current) {
      const p = 0.55 + 0.45 * Math.sin(t * 1.9)
      glowARef.current.material.opacity = 0.68 + p * 0.24
      glowBRef.current.material.opacity = 0.18 + p * 0.22
    }
  })

  return (
    <group position={[px, gy, pz]} rotation={[0, rotationY, 0]}>
      <group
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
        onPointerOut={() => setHover(false)}
      >
        <PortalFrame halfW={halfW} height={height} />

        {/* swirling purple surface — full shader, or cheap pulsing quads */}
        {lowEnd ? (
          <mesh position={[0, height / 2 + 0.5, 0]}>
            <planeGeometry args={[halfW * 2 - 0.04, height - 0.04]} />
            <meshBasicMaterial
              ref={glowARef}
              color="#5b21b6"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ) : null}
        <mesh position={[0, height / 2 + 0.5, lowEnd ? 0.02 : 0]}>
          {lowEnd ? (
            <planeGeometry args={[halfW * 2 - 0.5, height - 0.5]} />
          ) : (
            <planeGeometry args={[halfW * 2 - 0.02, height - 0.02, 20, 20]} />
          )}
          {lowEnd ? (
            <meshBasicMaterial
              ref={glowBRef}
              color="#c084fc"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          ) : (
            <shaderMaterial
              ref={matRef}
              vertexShader={surfaceVert}
              fragmentShader={surfaceFrag}
              uniforms={uniforms}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          )}
        </mesh>

        <PortalParticles spreadX={halfW} height={height} count={lowEnd ? 18 : 46} />
      </group>

      {/* purple ambient glow bleeding onto terrain / character */}
      <pointLight
        ref={lightRef}
        position={[0, height / 2 + 0.6, 0]}
        color={LIGHT_PURPLE}
        intensity={16}
        distance={17}
        decay={2}
      />

      {/* base slab so the frame never floats on rough terrain */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[halfW * 2 + 2.6, 0.16, 2.6]} />
        <meshLambertMaterial color="#17111f" />
      </mesh>

      {sign && (
        <VoxelSign
          position={[0, height + 1.6, 0]}
          lines={
            signLines || [
              title.toUpperCase(),
              subtitle ? subtitle.toUpperCase() : '',
            ]
          }
          colors={['#e9d5ff', '#c084fc']}
          bg="#150d20"
          width={signWidth || Math.max(3.2, longestSign * 0.44)}
          height={1.4}
        />
      )}

      {icon && (
        <VoxelIcon
          blocks={icon}
          position={[-(halfW + 1.1), 0.24, 1.18]}
        />
      )}
    </group>
  )
}
