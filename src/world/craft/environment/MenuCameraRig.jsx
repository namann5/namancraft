import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ORBIT_CENTER = new THREE.Vector3(0, 10, -18)
const ORBIT_RADIUS = 30
const ORBIT_HEIGHT = 16
const ORBIT_SPEED = 0.045

// Cinematic menu camera: slow orbit around the spawn plaza looking down the
// path. On 'entering' it flies to the player's eye position, then hands off.
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
      const t = clock.elapsedTime * ORBIT_SPEED
      camera.position.set(
        Math.sin(t) * ORBIT_RADIUS,
        ORBIT_HEIGHT + Math.sin(t * 0.7) * 1.6,
        ORBIT_CENTER.z + Math.cos(t) * ORBIT_RADIUS * 0.72,
      )
      camera.lookAt(ORBIT_CENTER.x, ORBIT_CENTER.y - 2, ORBIT_CENTER.z - 14)
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
