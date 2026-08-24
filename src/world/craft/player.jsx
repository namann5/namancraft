import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { loadColliders, makeHeightField } from './terrain'
import { nearestZone } from './zones'
import { worldControls, playerEye } from './controls'
import { INTRO_CAM_START } from './controls'
import { touchInput } from './input'
import {
  avatarState as A,
  createAvatar,
  updateAvatar,
  INTRO_START,
  INTRO_STOP,
  consumeSkip,
} from './avatar'

const WALK_SPEED = 4.5
const SPRINT_SPEED = 7.0
const GRAVITY = 28
const JUMP_VELOCITY = 9.2
const MAX_STEP_UP = 1.05
const EYE_HEIGHT = 1.62
const HEAD_HEIGHT = 1.72

// camera framing
const REST_LOOK = new THREE.Vector3(-6.5, 9.4, -26)
const MENU_FOV = 74
const GAME_FOV = 71
const SPRINT_FOV = 77
const BOOM_DIST = 3.9
const MOUSE_SENS = 0.0023

const tmpV = new THREE.Vector3()
const desired = new THREE.Vector3()
const lookPt = new THREE.Vector3()

// Shared pointer-lock handle so UI outside the Canvas can grab input.
function createLockHandle(domRef) {
  const api = {
    isLocked: false,
    lock() {
      domRef.current?.requestPointerLock?.()
    },
    unlock() {
      if (document.pointerLockElement) document.exitPointerLock()
    },
  }
  return api
}

export default function Player({
  camMode = 'game', // 'intro' | 'menu' | 'entering' | 'game'
  paused = false,
  touch = false,
  active = false,
  onReady,
  onLockChange,
  onNearby,
  onInteract,
  onIntroDone,
  onEnterDone,
}) {
  const { camera, gl } = useThree()
  const fieldPromise = useMemo(() => loadColliders(), [])
  const rig = useMemo(createAvatar, [])
  const domRef = useRef(null)
  const lockApi = useRef(null)
  const p = useRef({
    field: null,
    keys: {},
    vy: 0,
    grounded: true,
    feetY: null,
    yaw: 0,
    pitch: 0.32,
    nearby: null,
    fov: MENU_FOV,
    introT: 0,
    introDone: false,
    enterT: 0,
    enterDone: false,
    enterFrom: new THREE.Vector3(),
    restPos: new THREE.Vector3(),
    startPos: new THREE.Vector3(),
    startCam: new THREE.Vector3().fromArray(INTRO_CAM_START),
    move: new THREE.Vector3(),
  }).current

  // pointer lock shim + events
  useEffect(() => {
    domRef.current = gl.domElement
    lockApi.current = createLockHandle(domRef)
    worldControls.current = lockApi.current
    const onLockChangeDoc = () => {
      const locked = Boolean(document.pointerLockElement)
      if (lockApi.current) lockApi.current.isLocked = locked
      onLockChange?.(locked)
    }
    const onMouseMove = (e) => {
      if (!lockApi.current?.isLocked) return
      if (camMode !== 'entering' && camMode !== 'game') return
      p.yaw -= e.movementX * MOUSE_SENS
      p.pitch = Math.max(-0.35, Math.min(1.15, p.pitch + e.movementY * MOUSE_SENS))
    }
    document.addEventListener('pointerlockchange', onLockChangeDoc)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChangeDoc)
      document.removeEventListener('mousemove', onMouseMove)
      if (worldControls.current === lockApi.current) worldControls.current = null
    }
  }, [gl, camMode, onLockChange, p])

  // entering dolly captures the title pose it starts from
  useEffect(() => {
    if (camMode === 'entering') {
      p.enterT = 0
      p.enterDone = false
      p.enterFrom.copy(camera.position)
    }
    if (camMode === 'intro') {
      p.introT = 0
      p.introDone = false
    }
  }, [camMode, camera, p])

  // world load: place Naman at the intro start and snap the camera behind him
  useEffect(() => {
    let cancelled = false
    fieldPromise.then((colliders) => {
      if (cancelled) return
      p.field = makeHeightField(colliders)
      A.pos.set(INTRO_START.x, 0, INTRO_START.z)
      A.pos.y = p.field.groundAt(A.pos.x, A.pos.z)
      A.yaw = 0
      A.visYaw = 0
      p.feetY = A.pos.y
      p.restPos.set(
        INTRO_STOP.x + 0.8,
        p.field.groundAt(INTRO_STOP.x, INTRO_STOP.z) + 2.55,
        INTRO_STOP.z + 3.6,
      )
      p.startPos.set(A.pos.x, A.pos.y, A.pos.z)
      p.startCam.set(p.restPos.x, A.pos.y + 3.3, A.pos.z + 4.8)
      camera.position.copy(p.startCam)
      camera.lookAt(A.pos.x, A.pos.y + HEAD_HEIGHT, A.pos.z)
      playerEye.x = A.pos.x
      playerEye.y = A.pos.y + EYE_HEIGHT
      playerEye.z = A.pos.z
      onReady?.()
    })
    return () => {
      cancelled = true
    }
  }, [fieldPromise, camera, onReady, p])

  useEffect(() => {
    const down = (e) => {
      p.keys[e.code] = true
      if (
        e.code === 'KeyE' &&
        !e.repeat &&
        lockApi.current?.isLocked &&
        p.nearby &&
        (camMode === 'game')
      ) {
        onInteract?.(p.nearby)
      }
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
  }, [p, onInteract, camMode])

  const tryMoveAxis = (axis, delta) => {
    if (!delta || !p.field) return false
    const nx = axis === 'x' ? A.pos.x + delta : A.pos.x
    const nz = axis === 'z' ? A.pos.z + delta : A.pos.z
    const clampedX = Math.min(Math.max(nx, p.field.minX), p.field.maxX)
    const clampedZ = Math.min(Math.max(nz, p.field.minZ), p.field.maxZ)
    const nextGround = p.field.groundAt(clampedX, clampedZ)
    if (nextGround - p.feetY > MAX_STEP_UP && p.vy <= 0) return false
    A.pos.x = clampedX
    A.pos.z = clampedZ
    return true
  }

  // gameplay boom camera with terrain-aware shortening
  const updateBoomCamera = (dt, instant = false) => {
    const headY = A.pos.y + HEAD_HEIGHT
    const cp = Math.cos(p.pitch)
    const sp = Math.sin(p.pitch)
    desired.set(
      A.pos.x + Math.sin(p.yaw) * cp * BOOM_DIST,
      headY + 0.35 + sp * BOOM_DIST,
      A.pos.z + Math.cos(p.yaw) * cp * BOOM_DIST,
    )
    if (p.field) {
      const floor = p.field.groundAt(desired.x, desired.z) + 0.45
      if (desired.y < floor) desired.y = floor
      // shorten the boom if terrain blocks the line of sight
      for (let i = 1; i <= 5; i += 1) {
        tmpV.lerpVectors(lookPt.set(A.pos.x, headY, A.pos.z), desired, i / 5)
        const g = p.field.groundAt(tmpV.x, tmpV.z) + 0.4
        if (tmpV.y < g) {
          desired.lerpVectors(lookPt, desired, Math.max(0.25, (i - 1) / 5))
          break
        }
      }
    }
    if (instant) camera.position.copy(desired)
    else camera.position.lerp(desired, 1 - Math.exp(-12 * dt))
    camera.lookAt(A.pos.x, headY + 0.25, A.pos.z)
  }

  const applyFov = (target, dt) => {
    if (Math.abs(camera.fov - target) > 0.05) {
      camera.fov += (target - camera.fov) * Math.min(1, dt * 6)
      camera.updateProjectionMatrix()
    }
  }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const t = state.clock.elapsedTime

    if (paused) return

    updateAvatar(rig, dt, t)

    // ---- intro: Naman walks to the spawn point while the camera settles ----
    if (camMode === 'intro') {
      if (consumeSkip()) {
        p.introT = 99
      }
      p.introT += dt
      const walkK = Math.min(p.introT / 2.5, 1)
      const e = walkK * walkK * (3 - 2 * walkK)
      if (walkK < 1) {
        A.pos.x = THREE.MathUtils.lerp(p.startPos.x, INTRO_STOP.x, e)
        A.pos.z = THREE.MathUtils.lerp(p.startPos.z, INTRO_STOP.z, e)
        A.pos.y = p.field ? p.field.groundAt(A.pos.x, A.pos.z) : A.pos.y
        A.moveAmt = 1
        p.feetY = A.pos.y
      } else if (!p.introDone) {
        A.pos.set(INTRO_STOP.x, p.field ? p.field.groundAt(INTRO_STOP.x, INTRO_STOP.z) : A.pos.y, INTRO_STOP.z)
        A.moveAmt = 0
      }

      const camK = Math.min(p.introT / 3.0, 1)
      const ce = camK * camK * (3 - 2 * camK)
      camera.position.lerpVectors(p.startCam, p.restPos, ce)
      // early on watch the character, then ease into the composed frame
      const watch = Math.min(p.introT / 1.4, 1)
      lookPt.set(
        THREE.MathUtils.lerp(A.pos.x, REST_LOOK.x, watch),
        THREE.MathUtils.lerp(A.pos.y + HEAD_HEIGHT, REST_LOOK.y, watch),
        THREE.MathUtils.lerp(A.pos.z, REST_LOOK.z, watch),
      )
      camera.lookAt(lookPt)
      applyFov(MENU_FOV, dt)

      if (camK >= 1 && !p.introDone) {
        p.introDone = true
        A.mode = 'idle'
        onIntroDone?.()
      }
      return
    }

    // ---- menu idle: composed tripod breathing behind Naman ----
    if (camMode === 'menu') {
      camera.position.set(
        p.restPos.x + Math.sin(t * 0.09) * 0.35,
        p.restPos.y + Math.sin(t * 0.065 + 1.4) * 0.22,
        p.restPos.z + Math.cos(t * 0.05) * 0.18,
      )
      camera.lookAt(
        REST_LOOK.x + Math.sin(t * 0.04) * 0.6,
        REST_LOOK.y,
        REST_LOOK.z,
      )
      applyFov(MENU_FOV, dt)
      return
    }

    const running = touch ? active : Boolean(active && lockApi.current?.isLocked)

    // gather look input from touch even when not "running" is false-safe
    if (touch && running) {
      p.yaw -= touchInput.lookDx
      p.pitch = Math.max(-0.35, Math.min(1.15, p.pitch + touchInput.lookDy))
      touchInput.lookDx = 0
      touchInput.lookDy = 0
    }

    // ---- entering: dolly from title pose into gameplay follow ----
    if (camMode === 'entering') {
      p.enterT += dt
      const k = Math.min(p.enterT / 1.15, 1)
      const e = k * k * (3 - 2 * k)
      updateBoomCamera(dt, true)
      camera.position.lerpVectors(p.enterFrom, desired, e)
      applyFov(GAME_FOV, dt)
      if (k >= 1 && !p.enterDone) {
        p.enterDone = true
        onEnterDone?.()
      }
      return
    }

    // ---- game: third-person play ----
    if (!running || !p.field) {
      if (active) updateBoomCamera(dt)
      return
    }

    let fwd = (p.keys.KeyW ? 1 : 0) - (p.keys.KeyS ? 1 : 0)
    let strafe = (p.keys.KeyD ? 1 : 0) - (p.keys.KeyA ? 1 : 0)
    if (touch) {
      fwd += -touchInput.moveY
      strafe += touchInput.moveX
    }
    fwd = Math.max(-1, Math.min(1, fwd))
    strafe = Math.max(-1, Math.min(1, strafe))

    const sprinting = Boolean(p.keys.ShiftLeft || p.keys.ShiftRight) && fwd > 0
    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED
    const moving = Math.abs(fwd) > 0.05 || Math.abs(strafe) > 0.05

    // movement is relative to where the camera looks
    const sy = Math.sin(p.yaw)
    const cy = Math.cos(p.yaw)
    p.move.set(-sy * fwd + cy * strafe, 0, -cy * fwd - sy * strafe)
    if (p.move.lengthSq() > 0) p.move.normalize()

    tryMoveAxis('x', p.move.x * speed * dt)
    tryMoveAxis('z', p.move.z * speed * dt)

    if ((p.grounded && p.keys.Space) || (p.grounded && touchInput.jump)) {
      p.vy = JUMP_VELOCITY
      p.grounded = false
    }
    p.vy -= GRAVITY * dt
    p.feetY += p.vy * dt

    const ground = p.field.groundAt(A.pos.x, A.pos.z)
    if (p.feetY <= ground && p.vy <= 0) {
      p.feetY = ground
      p.vy = 0
      p.grounded = true
    } else if (p.feetY > ground + 0.01) {
      p.grounded = false
    }
    A.pos.y = p.feetY

    // character turns toward travel direction; anim follows ground speed
    A.sprinting = sprinting
    A.moveAmt += ((moving ? 1 : 0) - A.moveAmt) * Math.min(1, dt * 10)
    if (moving) A.yaw = Math.atan2(-p.move.x, -p.move.z)

    updateBoomCamera(dt)
    applyFov(sprinting ? SPRINT_FOV : GAME_FOV, dt)

    playerEye.x = A.pos.x
    playerEye.y = A.pos.y + EYE_HEIGHT
    playerEye.z = A.pos.z

    const zone = nearestZone(A.pos.x, A.pos.z)
    if (zone !== p.nearby) {
      p.nearby = zone
      onNearby?.(zone)
    }
  })

  return <primitive object={rig.group} />
}
