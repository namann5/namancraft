import * as THREE from 'three'

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

function makeLogoTexture() {
  // pixel "N" drawn by hand — original mark, no external assets
  const c = document.createElement('canvas')
  c.width = c.height = 24
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4f6f8'
  const px = (x, y, w = 3, h = 3) => ctx.fillRect(x * 3, y * 3, w * 3, h * 3)
  for (let y = 2; y <= 13; y += 1) px(2, y)          // left stem
  for (let y = 2; y <= 13; y += 1) px(13, y)         // right stem
  for (let i = 0; i <= 8; i += 1) px(5 + i, 12 - i)  // diagonal
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const MAT = {
  skin: () => new THREE.MeshLambertMaterial({ color: '#d9a077' }),
  hair: () => new THREE.MeshLambertMaterial({ color: '#171310' }),
  hoodie: () => new THREE.MeshLambertMaterial({ color: '#23262c' }),
  hoodieDark: () => new THREE.MeshLambertMaterial({ color: '#1a1d22' }),
  pants: () => new THREE.MeshLambertMaterial({ color: '#1b1e24' }),
  shoe: () => new THREE.MeshLambertMaterial({ color: '#e9ecf2' }),
  sole: () => new THREE.MeshLambertMaterial({ color: '#2a2d33' }),
  eye: () => new THREE.MeshLambertMaterial({ color: '#221e1a' }),
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

// Builds the voxel rig: charcoal hoodie w/ white "N" on the back, dark
// pants, sneakers, custom hair, natural skin tone. Pivots are grouped so
// limbs swing from shoulders/hips like a proper little game character.
export function createAvatar() {
  const group = new THREE.Group()

  const legL = new THREE.Group()
  const legR = new THREE.Group()
  legL.position.set(-0.135, 0.82, 0)
  legR.position.set(0.135, 0.82, 0)
  for (const leg of [legL, legR]) {
    leg.add(box(0.23, 0.60, 0.25, MAT.pants(), 0, -0.31, 0))
    leg.add(box(0.25, 0.15, 0.36, MAT.shoe(), 0, -0.685, -0.045))
    leg.add(box(0.26, 0.06, 0.37, MAT.sole(), 0, -0.79, -0.045))
    group.add(leg)
  }

  const torso = box(0.54, 0.68, 0.30, MAT.hoodie(), 0, 1.16, 0)
  torso.add(box(0.40, 0.13, 0.12, MAT.hoodieDark(), 0, 0.29, 0.17))   // hood roll
  torso.add(box(0.30, 0.10, 0.02, MAT.hoodieDark(), 0, -0.18, -0.165)) // pocket
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.30),
    new THREE.MeshBasicMaterial({ map: makeLogoTexture(), transparent: true }),
  )
  logo.position.set(0, 0.03, 0.153)
  torso.add(logo)
  group.add(torso)

  const armL = new THREE.Group()
  const armR = new THREE.Group()
  armL.position.set(-0.385, 1.42, 0)
  armR.position.set(0.385, 1.42, 0)
  for (const arm of [armL, armR]) {
    arm.add(box(0.20, 0.44, 0.24, MAT.hoodie(), 0, -0.20, 0))
    arm.add(box(0.185, 0.22, 0.215, MAT.skin(), 0, -0.51, 0))
    group.add(arm)
  }

  const head = new THREE.Group()
  head.position.set(0, 1.50, 0)
  head.add(box(0.16, 0.10, 0.16, MAT.skin(), 0, 0.03, 0)) // neck
  head.add(box(0.46, 0.44, 0.44, MAT.skin(), 0, 0.26, 0))
  head.add(box(0.07, 0.07, 0.02, MAT.eye(), -0.10, 0.28, -0.222))
  head.add(box(0.07, 0.07, 0.02, MAT.eye(), 0.10, 0.28, -0.222))
  // custom haircut: cap, back panel, side tufts, fringe
  head.add(box(0.50, 0.14, 0.48, MAT.hair(), 0, 0.505, 0))
  head.add(box(0.50, 0.32, 0.10, MAT.hair(), 0, 0.32, 0.205))
  head.add(box(0.04, 0.22, 0.30, MAT.hair(), -0.245, 0.34, 0.03))
  head.add(box(0.04, 0.22, 0.30, MAT.hair(), 0.245, 0.34, 0.03))
  head.add(box(0.46, 0.09, 0.07, MAT.hair(), 0, 0.44, -0.215))
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
