import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { loadColliders, makeHeightField } from './terrain'

const WALK_SPEED = 4.5
const SPRINT_SPEED = 7.0
const GRAVITY = 28
const JUMP_VELOCITY = 9.2
const MAX_STEP_UP = 1.05
const EYE_HEIGHT = 1.62
const BASE_FOV = 75
const SPRINT_FOV = 82

export default function Player({ onReady, onLockChange }) {
  const controlsRef = useRef(null)
  const { camera } = useThree()
  const fieldPromise = useMemo(() => loadColliders(), [])
  const p = useRef({
    x: 0,
    z: 0,
    feetY: null,
    vy: 0,
    grounded: true,
    field: null,
    keys: {},
    dir: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    bobPhase: 0,
    bobAmp: 0,
    fov: BASE_FOV,
  }).current

  useEffect(() => {
    let cancelled = false
    fieldPromise.then((colliders) => {
      if (cancelled) return
      p.field = makeHeightField(colliders)
      p.x = (p.field.minX + p.field.maxX) / 2
      p.z = (p.field.minZ + p.field.maxZ) / 2
      p.feetY = p.field.groundAt(p.x, p.z)
      camera.position.set(p.x, p.feetY + EYE_HEIGHT, p.z)
      onReady?.()
    })
    return () => {
      cancelled = true
    }
  }, [fieldPromise, camera, onReady, p])

  useEffect(() => {
    const down = (e) => {
      p.keys[e.code] = true
    }
    const up = (e) => {
      p.keys[e.code] = false
    }
    const blur = () => {
      p.keys = {}
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [p])

  const tryMoveAxis = (axis, delta) => {
    if (!delta || !p.field) return false
    const nx = axis === 'x' ? p.x + delta : p.x
    const nz = axis === 'z' ? p.z + delta : p.z
    const clampedX = Math.min(Math.max(nx, p.field.minX), p.field.maxX)
    const clampedZ = Math.min(Math.max(nz, p.field.minZ), p.field.maxZ)
    const nextGround = p.field.groundAt(clampedX, clampedZ)
    if (nextGround - p.feetY > MAX_STEP_UP && p.vy <= 0) return false
    p.x = clampedX
    p.z = clampedZ
    return true
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const f = p.field
    if (!f || !controlsRef.current?.isLocked) return

    const fwd = (p.keys.KeyW ? 1 : 0) - (p.keys.KeyS ? 1 : 0)
    const strafe = (p.keys.KeyD ? 1 : 0) - (p.keys.KeyA ? 1 : 0)
    const sprinting = Boolean(p.keys.ShiftLeft || p.keys.ShiftRight) && fwd > 0
    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED
    const moving = fwd !== 0 || strafe !== 0

    camera.getWorldDirection(p.dir)
    p.dir.y = 0
    if (p.dir.lengthSq() < 1e-6) p.dir.set(0, 0, -1)
    p.dir.normalize()
    p.right.crossVectors(p.dir, THREE.Object3D.DEFAULT_UP).normalize()

    p.move.set(0, 0, 0).addScaledVector(p.dir, fwd).addScaledVector(p.right, strafe)
    if (p.move.lengthSq() > 0) p.move.normalize()

    tryMoveAxis('x', p.move.x * speed * dt)
    tryMoveAxis('z', p.move.z * speed * dt)

    if (p.grounded && p.keys.Space) {
      p.vy = JUMP_VELOCITY
      p.grounded = false
    }
    p.vy -= GRAVITY * dt
    p.feetY += p.vy * dt

    const ground = f.groundAt(p.x, p.z)
    if (p.feetY <= ground && p.vy <= 0) {
      p.feetY = ground
      p.vy = 0
      p.grounded = true
    } else if (p.feetY > ground + 0.01) {
      p.grounded = false
    }

    // head-bob: phase advances with ground speed, amplitude eases in/out
    const targetAmp = p.grounded && moving ? (sprinting ? 0.075 : 0.05) : 0
    p.bobAmp += (targetAmp - p.bobAmp) * Math.min(1, dt * 10)
    if (p.grounded && moving) p.bobPhase += dt * speed * 1.9
    const bobY = -Math.abs(Math.sin(p.bobPhase)) * p.bobAmp
    const bobSide = Math.cos(p.bobPhase) * p.bobAmp * 0.6

    camera.position.set(
      p.x + p.right.x * bobSide,
      p.feetY + EYE_HEIGHT + bobY,
      p.z + p.right.z * bobSide,
    )

    const targetFov = sprinting ? SPRINT_FOV : BASE_FOV
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8)
      camera.updateProjectionMatrix()
    }
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      selector="#enter-world-btn"
      onLock={() => onLockChange?.(true)}
      onUnlock={() => onLockChange?.(false)}
      makeDefault
    />
  )
}
