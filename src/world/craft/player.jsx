import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  getField,
  subscribeFields,
  loadOverworldField,
  travelFx,
  useWorldStore,
  getArrival,
  setArrival,
} from './dimensions/worldStore'
import { nearestInteractable, findTravelEntry } from './dimensions/interactables'
import { worldMeta } from './dimensions/worlds'
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

// ------------------------------------------------------------------
// Overworld cinematic journey — the composed "sights" a visitor scrolls
// through (spec §9/§53: one intentional scroll moves ~one cinematic beat).
// Naman auto-walks between these; the TPP camera follows and frames him
// against each landmark. Portals still link to the other dimensions.
// ------------------------------------------------------------------
const OVERWORLD_JOURNEY = [
  { name: 'spawn', label: "The Ghat · Arrival", x: 2.2, z: 7.5 },
  { name: 'clock', label: 'Heritage Clock · My Journey', x: -20.5, z: -10 },
  { name: 'home', label: 'The Haveli · Home', x: 27.5, z: -49.5 },
  { name: 'hub', label: 'Festival Gate · Portal Junction', x: 0.5, z: -13.5 },
]
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
  inputBlocked = false,
  onReady,
  onLockChange,
  onNearby,
  onInteract,
  onIntroDone,
  onEnterDone,
  onAutoReturn,
  onAutoChange,
}) {
  const { camera, gl } = useThree()
  const world = useWorldStore((s) => s.world)
  const rig = useMemo(createAvatar, [])
  const domRef = useRef(null)
  const lockApi = useRef(null)
  const worldRef = useRef(world)
  const introPlacedRef = useRef(false)
  // latest-prop bridge so the lock listeners can be installed ONCE
  const liveProps = useRef({ onLockChange, camMode })
  liveProps.current.onLockChange = onLockChange
  liveProps.current.camMode = camMode
  liveProps.current.inputBlocked = inputBlocked
  // auto-walk state (driven by scroll wheel in dimensions)
  const autoWalk = useRef({ target: null, startedAt: 0 })
  // overworld cinematic journey index + debounce so one scroll = one beat
  const journeyRef = useRef({ idx: 0, lastStep: 0 })
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
    punch: 0, // dimension-travel FOV kick
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

  // pointer lock shim + events — installed ONCE per mount.
  // (These handlers must NOT depend on camMode/onLockChange: those change
  // identity every parent render, and re-running this effect would reset
  // isLocked to false mid-game, permanently freezing mouse + WASD.)
  useEffect(() => {
    domRef.current = gl.domElement
    const api = createLockHandle(domRef)
    lockApi.current = api
    worldControls.current = api
    // heal any drift: adopt the real current lock state at install time
    api.isLocked = Boolean(document.pointerLockElement)
    const onLockChangeDoc = () => {
      const locked = Boolean(document.pointerLockElement)
      api.isLocked = locked
      liveProps.current.onLockChange?.(locked)
    }
    const onMouseMove = (e) => {
      if (!api.isLocked) return
      const m = liveProps.current.camMode
      if (m !== 'entering' && m !== 'game') return
      p.yaw -= e.movementX * MOUSE_SENS
      p.pitch = Math.max(-0.35, Math.min(1.15, p.pitch + e.movementY * MOUSE_SENS))
    }
    document.addEventListener('pointerlockchange', onLockChangeDoc)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChangeDoc)
      document.removeEventListener('mousemove', onMouseMove)
      if (worldControls.current === api) worldControls.current = null
    }
  }, [gl, p])

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

  // ---- multi-world placement ------------------------------------------
  // Kicks off the overworld GLB fetch once, then re-places Naman at the
  // destination spawn every time the active dimension changes. The SAME
  // avatar rig is kept across all worlds.
  useEffect(() => {
    loadOverworldField()
  }, [])

  const placeAtSpawn = (worldId, { intro = false } = {}) => {
    const field = getField(worldId)
    if (!field) return false
    const sp = worldMeta(worldId).spawn
    p.field = field
    p.vy = 0
    p.grounded = true

    // reset the cinematic journey when we re-enter the overworld
    if (worldId === 'overworld') {
      journeyRef.current.idx = 0
      journeyRef.current.lastStep = 0
      autoWalk.current.target = null
    }

    // If returning to overworld, spawn at the portal hub we left from
    let spawnX = sp.x
    let spawnZ = sp.z
    let spawnYaw = sp.yaw
    if (worldId === 'overworld' && !intro) {
      const arr = getArrival()
      if (arr) {
        // place the player 2.4 blocks in front of the hub portal (toward the path)
        const n = Math.sin(arr.rotY)
        const cz = Math.cos(arr.rotY)
        spawnX = arr.x + n * 2.4
        spawnZ = arr.z + cz * 2.4
        // face the portal
        spawnYaw = Math.atan2(n, cz)
        setArrival(null)
      }
    }

    A.pos.set(spawnX, field.groundAt(spawnX, spawnZ), spawnZ)
    p.feetY = A.pos.y
    A.yaw = spawnYaw
    A.visYaw = spawnYaw
    A.moveAmt = 0
    // camera yaw: 0 puts the boom behind the player looking -Z
    p.yaw = spawnYaw
    p.pitch = 0.32

    if (worldId === 'overworld' && intro) {
      // cinematic title framing (only for the very first spawn)
      A.pos.set(INTRO_START.x, field.groundAt(INTRO_START.x, INTRO_START.z), INTRO_START.z)
      p.feetY = A.pos.y
      A.yaw = 0
      A.visYaw = 0
      p.yaw = 0
      p.restPos.set(
        INTRO_STOP.x + 0.8,
        field.groundAt(INTRO_STOP.x, INTRO_STOP.z) + 2.55,
        INTRO_STOP.z + 3.6,
      )
      p.startPos.set(A.pos.x, A.pos.y, A.pos.z)
      p.startCam.set(p.restPos.x, A.pos.y + 3.3, A.pos.z + 4.8)
      camera.position.copy(p.startCam)
      camera.lookAt(A.pos.x, A.pos.y + HEAD_HEIGHT, A.pos.z)
    } else {
      updateBoomCamera(1 / 60, true)
      // keep menu tripod framed around wherever we actually are
      p.restPos.copy(camera.position)
    }
    playerEye.x = A.pos.x
    playerEye.y = A.pos.y + EYE_HEIGHT
    playerEye.z = A.pos.z
    if (p.nearby) {
      p.nearby = null
      onNearby?.(null)
    }
    return true
  }

  useEffect(() => {
    worldRef.current = world
    const firstOverworld = !introPlacedRef.current && world === 'overworld'
    if (firstOverworld) {
      const ok = placeAtSpawn(world, { intro: true })
      if (ok) {
        introPlacedRef.current = true
        onReady?.()
      }
    } else {
      placeAtSpawn(world)
    }
    // fields may arrive after the world switch (async overworld fetch);
    // retry placement whenever a new field registers
    const unsub = subscribeFields((id) => {
      if (id !== worldRef.current) return
      if (!introPlacedRef.current && id === 'overworld') {
        if (placeAtSpawn(id, { intro: true })) {
          introPlacedRef.current = true
          onReady?.()
        }
      } else {
        placeAtSpawn(id)
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world])

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
    // scroll = cinematic journey: overworld steps between composed sights,
    // dimensions auto-walk Naman toward the return portal.
    const acc = { y: 0 }
    const onWheel = (e) => {
      if (liveProps.current.inputBlocked) return
      if (travelFx.active) return

      if (worldRef.current === 'overworld') {
        // step one cinematic beat per intentional scroll (gameplay only)
        if (liveProps.current.camMode !== 'game') return
        const now = Date.now()
        if (now - journeyRef.current.lastStep < 450) return
        const dir = e.deltaY > 0 ? 1 : -1
        const next =
          Math.min(OVERWORLD_JOURNEY.length - 1, Math.max(0, journeyRef.current.idx + dir))
        // a scroll that would wrap is ignored (stay on current beat)
        if (next === journeyRef.current.idx) return
        journeyRef.current.idx = next
        journeyRef.current.lastStep = now
        const waypoint = OVERWORLD_JOURNEY[next]
        autoWalk.current.target = { x: waypoint.x, z: waypoint.z }
        autoWalk.current.startedAt = Date.now()
        onAutoChange?.(true)
        return
      }

      if (autoWalk.current.target) return
      acc.y += Math.abs(e.deltaY)
      if (acc.y > 200) {
        acc.y = 0
        const entry = findTravelEntry('overworld')
        if (entry) {
          autoWalk.current.target = { x: entry.x, z: entry.z }
          autoWalk.current.startedAt = Date.now()
          onAutoChange?.(true)
        }
      }
    }
    const resetAcc = () => { acc.y = 0 }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', resetAcc, { passive: true })
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', resetAcc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // ---- dimension travel: freeze control, keep the world alive ----
    if (travelFx.active) {
      const st = useWorldStore.getState()
      const target = st.travel && st.travel.phase !== 'in' ? 1 : 0
      p.punch += (target - p.punch) * Math.min(1, dt * 5)
      applyFov(GAME_FOV + p.punch * 16, dt)
      return
    }
    p.punch += (0 - p.punch) * Math.min(1, dt * 4)

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

    // ---- menu idle ----
    if (camMode === 'menu') {
      if (worldRef.current === 'overworld') {
        // composed tripod breathing behind Naman — look at the character
        camera.position.set(
          p.restPos.x + Math.sin(t * 0.09) * 0.35,
          p.restPos.y + Math.sin(t * 0.065 + 1.4) * 0.22,
          p.restPos.z + Math.cos(t * 0.05) * 0.18,
        )
        camera.lookAt(
          A.pos.x + Math.sin(t * 0.04) * 0.6,
          A.pos.y + HEAD_HEIGHT,
          A.pos.z,
        )
      } else {
        // other dimensions: gentle orbit around the character instead
        const a = t * 0.12
        camera.position.set(
          A.pos.x + Math.sin(a) * (BOOM_DIST + 1.1),
          A.pos.y + 2.4 + Math.sin(t * 0.4) * 0.15,
          A.pos.z + Math.cos(a) * (BOOM_DIST + 1.1),
        )
        camera.lookAt(A.pos.x, A.pos.y + HEAD_HEIGHT - 0.2, A.pos.z)
      }
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

    // auto-walk: override WASD while scrolling toward return portal
    const aw = autoWalk.current
    let autoArrived = false
    if (aw.target) {
      const dx = aw.target.x - A.pos.x
      const dz = aw.target.z - A.pos.z
      const dist = Math.hypot(dx, dz)
      const elapsed = Date.now() - aw.startedAt
      const userOverride = Math.abs(fwd) > 0.05 || Math.abs(strafe) > 0.05
      const stuck = elapsed > 8000
      if (dist < 2.6 || stuck) {
        autoArrived = dist < 2.6 && !stuck
        aw.target = null
        onAutoChange?.(false)
      } else if (userOverride) {
        aw.target = null
        onAutoChange?.(false)
      } else {
        fwd = dx / dist
        strafe = dz / dist
        // yaw to face the portal
        p.yaw = Math.atan2(-dx, -dz)
      }
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

    // void safety (The End): falling off an island respawns at the spawn
    const killY = p.field.killY ?? -80
    if (p.feetY < killY) {
      placeAtSpawn(worldRef.current)
      return
    }

    // character turns toward travel direction; anim follows ground speed
    A.sprinting = sprinting
    A.moveAmt += ((moving ? 1 : 0) - A.moveAmt) * Math.min(1, dt * 10)
    if (moving) A.yaw = Math.atan2(-p.move.x, -p.move.z)

    updateBoomCamera(dt)
    applyFov((sprinting ? SPRINT_FOV : GAME_FOV) + p.punch * 16, dt)

    playerEye.x = A.pos.x
    playerEye.y = A.pos.y + EYE_HEIGHT
    playerEye.z = A.pos.z

    // auto-walk arrival: reached the return portal → trigger travel
    if (autoArrived && onAutoReturn) {
      onAutoReturn()
    }

    const entry = nearestInteractable(A.pos.x, A.pos.z)
    if (entry?.key !== p.nearby?.key) {
      p.nearby = entry
      onNearby?.(entry)
    }
  })

  return <primitive object={rig.group} />
}
