import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  stepDay,
  sampleRamp,
  makeRamp,
  dayState,
  skyReg,
  cloudsReg,
  ZENITH,
  HORIZON,
  FOG,
  SUNLIGHT,
  HEMI_SKY,
  HEMI_GROUND,
  SUN_DISC,
} from './dayCycle'
import { LANDMARKS } from './landmarks'

const MOON_DIR = new THREE.Vector3(-40, 55, 30).normalize()
const tmpB = new THREE.Color()
const sunV = new THREE.Vector3()
const rgb = [0, 0, 0]

function setTmp(ramp, x) {
  sampleRamp(ramp, x, rgb)
  return tmpB.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
}

// local ramp for cloud tinting
const CLOUD_TINT = makeRamp([
  [-1.0, '#39456e'],
  [-0.2, '#45507c'],
  [0.0, '#ffc9a0'],
  [0.4, '#fff2dd'],
  [1.0, '#ffffff'],
])

// Advances the day/night simulation and applies it to lights, sky shader,
// fog and cloud tint. Also renders the two scene lights.
export default function DayNightCycle() {
  const dirRef = useRef(null)
  const hemiRef = useRef(null)

  useFrame(({ scene }, dt) => {
    const { sy, sx } = stepDay(Math.min(dt, 0.1))
    const e = sy // sun elevation -1..1
    const daylight = dayState.daylight

    // sun direction along an east-west arc with a slight tilt
    const sunDir = sunV.set(sx, Math.max(e, -0.35), -0.35).normalize()

    // directional light: sun by day, moon by night
    const dir = dirRef.current
    if (dir) {
      if (e > -0.08) {
        dir.position.copy(sunDir).multiplyScalar(110)
        dir.color.copy(setTmp(SUNLIGHT, Math.max(e, 0)))
        dir.intensity = 0.5 + daylight * 1.9
      } else {
        dir.position.copy(MOON_DIR).multiplyScalar(110)
        dir.color.set('#a8bcf0')
        dir.intensity = 0.62
      }
    }

    const hemi = hemiRef.current
    if (hemi) {
      hemi.intensity = 0.48 + daylight * 0.42
      hemi.color.copy(setTmp(HEMI_SKY, e))
      hemi.groundColor.copy(setTmp(HEMI_GROUND, e))
    }

    // sky dome uniforms
    const u = skyReg.uniforms
    if (u) {
      u.uZenith.value.copy(setTmp(ZENITH, e))
      u.uHorizon.value.copy(setTmp(HORIZON, e))
      if (e > -0.08) {
        u.uSunDir.value.copy(sunDir)
        u.uSunColor.value.copy(setTmp(SUN_DISC, Math.max(e, 0)))
        u.uHaze.value = dayState.dusk
        u.uNight.value = 0
      } else {
        u.uSunDir.value.copy(MOON_DIR)
        u.uSunColor.value.set('#dfe8ff')
        u.uHaze.value = 0
        u.uNight.value = 1
      }
      u.uStar.value = smoothstep01((0.06 - e) / 0.14)
    }

    // fog tracks the horizon; only slightly thicker at night so terrain reads
    const fog = scene.fog
    if (fog?.isFogExp2) {
      fog.color.copy(setTmp(FOG, e))
      fog.density = 0.0038 * (1 + (1 - daylight) * 0.15)
    }

    // clouds: white at noon, peach at dusk, slate at night
    const clouds = cloudsReg.group
    if (clouds) {
      const tint = setTmp(CLOUD_TINT, e)
      clouds.traverse((obj) => {
        if (obj.isMesh && obj.material?.color) obj.material.color.copy(tint)
      })
    }
  })

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#ffd9a0', '#4a3b2f', 0.7]} />
      {/* warm lantern glow spilling from the house front door */}
      <pointLight
        position={[LANDMARKS.houseLight.x, LANDMARKS.houseLight.y, LANDMARKS.houseLight.z]}
        color="#ffb37a"
        intensity={34}
        distance={32}
        decay={2}
      />
      {/* warm glow washing the clock face */}
      <pointLight
        position={[LANDMARKS.clockLight.x, LANDMARKS.clockLight.y, LANDMARKS.clockLight.z]}
        color="#ffd9a0"
        intensity={26}
        distance={28}
        decay={2}
      />
      <directionalLight
        ref={dirRef}
        color="#ffb36b"
        intensity={2.4}
        position={[70, 45, -40]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
      />
    </>
  )
}

function smoothstep01(x) {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
