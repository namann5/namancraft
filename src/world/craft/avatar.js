import * as THREE from 'three'
import { makeSkinTextures } from './characterTextures'

// Shared avatar state written by Player (movement/intro) and read here.
// The SAME rig is rendered in every mode, so the homepage character is
// literally the gameplay character.
export const avatarState = {
  pos: new THREE.Vector3(0.9, 20, 12.8),
  yaw: 0, // 0 = facing -Z (down the path toward the world)
  visYaw: 0,
  moveAmt: 0, // 0..1 walk animation weight
  sprinting: false,
  walkPhase: 0,
  headYaw: 0,
  headYawTarget: 0,
  nextHeadTurn: 4,
}

export const INTRO_START = { x: 0.9, z: 12.8 }
export const INTRO_STOP = { x: 0.9, z: 4.5 }

let skipRequested = false
export function skipIntro() {
  skipRequested = true
}
export function consumeSkip() {
  const s = skipRequested
  skipRequested = false
  return s
}

// Pixel flag-texture for the front pocket accent (subtle, not the N).
function makePocketTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 8
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#262a31'
  ctx.fillRect(0, 0, 8, 8)
  ctx.fillStyle = '#31363f'
  ctx.fillRect(0, 6, 8, 2)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

let TEX = null
function textures() {
  if (!TEX) TEX = makeSkinTextures()
  return TEX
}

// Physical-ish materials that pick up the world lighting (Minecraft
// "skins are just textures" look) instead of flat Lambert colours. The
// white "N" is stitched onto the torso's back face via face materials.
function mat(map) {
  return new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, envMapIntensity: 0.4 })
}

let torsoMats = null
function torsoFaceMats() {
  if (!torsoMats) {
    const m = textures()
    // BoxGeometry face order: +x,-x,+y,-y,+z,-z  (back = +z = index 4)
    torsoMats = [mat(m.hoodie), mat(m.hoodie), mat(m.hoodie), mat(m.hoodie), mat(m.back), mat(m.hoodie)]
  }
  return torsoMats
}

function box(w, h, d, mats, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// Builds the voxel rig — a custom Minecraft-style player skin rendered
// with the world's shader lighting: textured hoodie w/ white "N" on the
// back, dark denim pants, sneakers, layered voxel hair, natural skin.
// Pivots are grouped so limbs swing from shoulders/hips.
export function createAvatar() {
  const m = textures()
  const group = new THREE.Group()

  const legL = new THREE.Group()
  const legR = new THREE.Group()
  legL.position.set(-0.135, 0.82, 0)
  legR.position.set(0.135, 0.82, 0)
  for (const leg of [legL, legR]) {
    leg.add(box(0.23, 0.60, 0.25, mat(m.jeans), 0, -0.31, 0))
    leg.add(box(0.25, 0.15, 0.36, mat(m.shoe), 0, -0.685, -0.045))
    leg.add(box(0.26, 0.06, 0.37, mat(m.sole), 0, -0.79, -0.045))
    group.add(leg)
  }

  // torso: hoodie everywhere, white N on the back face (+Z)
  const torso = box(0.54, 0.68, 0.30, torsoFaceMats(), 0, 1.16, 0)
  torso.add(box(0.40, 0.13, 0.12, mat(m.hoodie), 0, 0.29, 0.17))        // hood roll
  torso.add(box(0.34, 0.12, 0.02, mat(makePocketTexture()), 0, -0.16, -0.166)) // front pocket
  group.add(torso)

  const armL = new THREE.Group()
  const armR = new THREE.Group()
  armL.position.set(-0.385, 1.42, 0)
  armR.position.set(0.385, 1.42, 0)
  for (const arm of [armL, armR]) {
    arm.add(box(0.20, 0.44, 0.24, mat(m.hoodie), 0, -0.20, 0))
    arm.add(box(0.185, 0.22, 0.215, mat(m.skin), 0, -0.51, 0))
    group.add(arm)
  }

  const head = new THREE.Group()
  head.position.set(0, 1.50, 0)
  head.add(box(0.16, 0.10, 0.16, mat(m.skin), 0, 0.03, 0)) // neck
  head.add(box(0.46, 0.44, 0.44, mat(m.skin), 0, 0.26, 0))
  // eyes: two small dark pixel tiles on the front face
  const eyeL = box(0.07, 0.07, 0.02, mat(m.eye), -0.10, 0.28, -0.222)
  const eyeR = box(0.07, 0.07, 0.02, mat(m.eye), 0.10, 0.28, -0.222)
  head.add(eyeL, eyeR)

  // layered voxel hair — cap, back panel, side tufts, fringe, crown bump
  head.add(box(0.50, 0.14, 0.48, mat(m.hair), 0, 0.505, 0))
  head.add(box(0.50, 0.34, 0.12, mat(m.hair), 0, 0.33, 0.205))   // back panel
  head.add(box(0.06, 0.26, 0.32, mat(m.hair), -0.245, 0.36, 0.04)) // left tuft
  head.add(box(0.06, 0.26, 0.32, mat(m.hair), 0.245, 0.36, 0.04))  // right tuft
  head.add(box(0.46, 0.10, 0.08, mat(m.hair), 0, 0.47, -0.21))     // fringe
  head.add(box(0.40, 0.10, 0.40, mat(m.hair), 0, 0.62, 0))         // crown bump
  group.add(head)

  // warm rim light so Naman reads clearly against the night world
  const rim = new THREE.PointLight('#ffc890', 4.5, 7, 2)
  rim.position.set(0.6, 2.4, 1.5)
  group.add(rim)

  return { group, head, torso, armL, armR, legL, legR }
}

const lerpAngle = (a, b, t) => {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

// Animation only (called every rendered frame). Movement/position is owned
// by Player; this just makes the rig feel alive.
export function updateAvatar(rig, dt, t) {
  const A = avatarState
  const speedBlend = A.sprinting ? 11.5 : 8.2
  A.walkPhase += dt * speedBlend * A.moveAmt

  A.visYaw = lerpAngle(A.visYaw, A.yaw, Math.min(1, dt * 12))
  rig.group.position.copy(A.pos)
  rig.group.rotation.y = A.visYaw

  const s = Math.sin(A.walkPhase)
  const c = Math.cos(A.walkPhase)
  const swing = 0.62 * A.moveAmt
  rig.legL.rotation.x = s * swing
  rig.legR.rotation.x = -s * swing
  rig.armL.rotation.x = -s * swing * 0.75 + Math.sin(t * 1.3) * 0.045
  rig.armR.rotation.x = s * swing * 0.75 + Math.sin(t * 1.3 + 1) * 0.045
  rig.armL.rotation.z = 0.045 + c * 0.02
  rig.armR.rotation.z = -0.045 - c * 0.02

  // breathing + tiny weight shift while idle
  const breath = Math.sin(t * 1.7)
  rig.torso.scale.y = 1 + breath * 0.012
  rig.torso.rotation.z = Math.sin(t * 0.6) * 0.008

  // occasional head glance when standing still
  if (t > A.nextHeadTurn && A.moveAmt < 0.2) {
    A.headYawTarget = (Math.random() - 0.5) * 1.1
    A.nextHeadTurn = t + 2.5 + Math.random() * 3.5
  }
  if (A.moveAmt > 0.5) A.headYawTarget = 0
  A.headYaw += (A.headYawTarget - A.headYaw) * Math.min(1, dt * 3)
  rig.head.rotation.y = A.headYaw * (1 - A.moveAmt)

  // gentle step bounce
  rig.group.position.y += Math.abs(s) * 0.05 * A.moveAmt
}
