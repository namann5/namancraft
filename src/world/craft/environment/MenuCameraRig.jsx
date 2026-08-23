import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MENU_CAM_POS } from './landmarks'

const LOOK_TARGET = new THREE.Vector3(-6, 9.5, -34)

const lookTmp = new THREE.Vector3()

// Fixed cinematic tripod for the main menu with a subtle breathing drift so
// the frame feels alive without ever breaking the composition. On 'entering'
// it flies to the player's eye position, then hands off.
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
      // breathing: ±0.45 horizontal sway, ±0.3 vertical bob, slow
      camera.position.set(
        MENU_CAM_POS[0] + Math.sin(wt * 0.085) * 0.45,
        MENU_CAM_POS[1] + Math.sin(wt * 0.062 + 1.7) * 0.3,
        MENU_CAM_POS[2] + Math.cos(wt * 0.051) * 0.25,
      )
      lookTmp.copy(LOOK_TARGET)
      camera.lookAt(lookTmp)
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
