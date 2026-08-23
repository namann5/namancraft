import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ORBIT_CENTER = new THREE.Vector3(0, 10, -18)
const ORBIT_SPEED = 0.042
// slow dolly drift: radius/height breathe instead of a fixed orbit
const BASE_RADIUS = 26
const RADIUS_AMP = 4.5
const BASE_HEIGHT = 14
const HEIGHT_AMP = 2

// Cinematic menu camera: slow orbit with a gentle dolly drift, looking down
// the path. On 'entering' it flies to the player's eye position, then hands off.
export default function MenuCameraRig({ mode, playerEye, onComplete }) {
  const start = useRef(null)
  const done = useRef(false)
  const fromPos = useRef(new THREE.Vector3())
  const fromQuat = useRef(new THREE.Quaternion())

  useEffect(() => {
    if (mode === 'entering') {
      start.current = null
      done.current = false
    }
  }, [mode])

  useFrame(({ camera, clock }) => {
    if (mode === 'idle' || mode === 'playing') return

    if (mode === 'menu') {
      const wt = clock.elapsedTime
      const t = wt * ORBIT_SPEED
      const r = BASE_RADIUS + Math.sin(wt * 0.021) * RADIUS_AMP
      const h = BASE_HEIGHT + Math.sin(wt * 0.013 + 1.3) * HEIGHT_AMP
      camera.position.set(
        Math.sin(t) * r,
        h + Math.sin(t * 0.7) * 1.4,
        ORBIT_CENTER.z + Math.cos(t) * r * 0.72,
      )
      // look target drifts slowly along the path for a subtle parallax feel
      camera.lookAt(
        ORBIT_CENTER.x + Math.sin(wt * 0.017) * 2,
        ORBIT_CENTER.y - 2,
        ORBIT_CENTER.z - 14,
      )
      return
    }

    if (mode === 'entering') {
      if (start.current === null) {
        start.current = clock.elapsedTime
        fromPos.current.copy(camera.position)
        fromQuat.current.copy(camera.quaternion)
      }
      const raw = Math.min((clock.elapsedTime - start.current) / 1.8, 1)
      // smoothstep ease
      const e = raw * raw * (3 - 2 * raw)

      const targetPos = new THREE.Vector3(playerEye.x, playerEye.y, playerEye.z)
      // face down the path toward the zones (-Z)
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'))
      camera.position.lerpVectors(fromPos.current, targetPos, e)
      camera.quaternion.slerpQuaternions(fromQuat.current, targetQuat, e)

      if (raw >= 1 && !done.current) {
        done.current = true
        onComplete?.()
      }
    }
  })

  return null
}
