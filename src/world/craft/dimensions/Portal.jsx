import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { registerInteractable, unregisterInteractable } from './interactables'
import { useWorldStore } from './worldStore'
import VoxelSign from './signs'

// ------------------------------------------------------------------
// Portal — the dimension-travel structure.
//
// An obsidian-style voxel frame with an animated swirling surface,
// orbiting particles, colored light and a name sign. Registers an
// interactable so approaching it shows "[E] ENTER <TITLE>".
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
  vec2 uv = vUv - 0.5;
  float r = length(uv) * 2.0;
  float ang = atan(uv.y, uv.x);

  // two counter-rotating swirl layers
  float s1 = sin(ang * 3.0 + uTime * 1.9 + r * 10.0) * 0.5 + 0.5;
  float s2 = sin(ang * 5.0 - uTime * 1.15 + r * 16.0 + noise(vUv * 5.0) * 5.0) * 0.5 + 0.5;
  float swirl = s1 * 0.65 + s2 * 0.35;

  // darker rim, bright heart
  float core = smoothstep(0.95, 0.25, r);
  vec3 col = mix(uC1 * 0.55, uC2, swirl * core + 0.12);
  col *= (0.85 + uBoost * 0.9);

  // soft edge so the surface melts into the frame
  float alpha = smoothstep(1.02, 0.88, r) * (0.82 + swirl * 0.18);
  gl_FragColor = vec4(col, alpha);
}
`

const FRAME_COLOR_A = '#181022'
const FRAME_COLOR_B = '#241631'

function PortalFrame({ halfW, height }) {
  const blocks = useMemo(() => {
    const list = []
    for (let x = -halfW; x <= halfW; x += 1) {
      list.push([x, 0, 0])
      list.push([x, height + 1, 0])
    }
    for (let y = 1; y <= height; y += 1) {
      list.push([-halfW, y, 0])
      list.push([halfW, y, 0])
    }
    return list
  }, [halfW, height])

  return (
    <group>
      {blocks.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.5, z]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={(x + y) % 2 === 0 ? FRAME_COLOR_A : FRAME_COLOR_B} />
        </mesh>
      ))}
    </group>
  )
}

function PortalParticles({ color, spreadX, height }) {
  const ref = useRef(null)
  const COUNT = 46

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 2 * (spreadX + 0.6)
      positions[i * 3 + 1] = 0.4 + Math.random() * height
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [spreadX, height])

  const base = useMemo(() => geometry.getAttribute('position').array.slice(), [geometry])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const attr = geometry.getAttribute('position')
    for (let i = 0; i < COUNT; i += 1) {
      attr.array[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i * 1.7) * 0.28
      attr.array[i * 3 + 1] = base[i * 3 + 1] + ((t * 0.32 + i / COUNT) % 1) * 1.1 - 0.55 + Math.sin(t + i) * 0.06
      attr.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.55 + i * 0.9) * 0.22
    }
    attr.needsUpdate = true
    if (ref.current) ref.current.visible = true
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={color}
        size={0.14}
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
  color = '#a05aff',
  color2 = '#e0c3ff',
  halfW = 2,
  height = 4,
  sign = true,
}) {
  const matRef = useRef(null)
  const lightRef = useRef(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uC1: { value: new THREE.Color(color) },
      uC2: { value: new THREE.Color(color2) },
    }),
    [color, color2],
  )

  const px = position[0]
  const pz = position[2]

  // register "[E] ENTER" trigger just in front of the frame
  useEffect(() => {
    registerInteractable({
      key: `portal:${id}`,
      x: px,
      z: pz,
      radius: 3.6,
      verb,
      label: title,
      accent: color2,
      travel: id,
    })
    return () => unregisterInteractable(`portal:${id}`)
  }, [id, px, pz, title, verb, color2])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    uniforms.uTime.value = t
    // glow up while this portal is the active travel target
    const st = useWorldStore.getState()
    const active = st.travel && st.travel.to === id
    if (lightRef.current) lightRef.current.intensity = 14 + Math.sin(t * 3) * 2 + (active ? 26 : 0)
  })

  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, rotationY, 0]}>
      <PortalFrame halfW={halfW} height={height} />

      {/* swirling surface */}
      <mesh position={[0, height / 2 + 0.5, 0]}>
        <planeGeometry args={[halfW * 2 - 0.02, height - 0.02, 24, 24]} />
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
      </mesh>

      <PortalParticles color={color2} spreadX={halfW} height={height} />

      <pointLight
        ref={lightRef}
        position={[0, height / 2 + 0.6, 0]}
        color={color}
        intensity={14}
        distance={13}
        decay={2}
      />

      {/* base slab so the frame never floats on rough terrain */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[halfW * 2 + 2.6, 0.16, 2.6]} />
        <meshLambertMaterial color="#20202a" />
      </mesh>

      {sign && (
        <VoxelSign
          position={[0, height + 1.6, 0]}
          lines={[title.toUpperCase(), subtitle ? subtitle.toUpperCase() : '']}
          colors={['#f4f1ea', color2]}
          bg="#14141c"
        />
      )}
    </group>
  )
}
