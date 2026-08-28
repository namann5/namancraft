// ------------------------------------------------------------------
// Character skin textures — a "custom Minecraft player skin" baked as
// pixel-canvas textures. Self-contained (no external assets). Each raw
// mesh part (head, torso, arms, legs) is tinted with a 16x16 fabric /
// skin tile; the torso's back face additionally shows a pixel "N".
// ------------------------------------------------------------------
import * as THREE from 'three'

function canvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}

// deterministic PRNG so textures are stable between reloads
function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function noise(base, spread, seed, px) {
  const rng = mulberry(seed)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const n = (rng() - 0.5) * spread
      const r = Math.max(0, Math.min(255, Math.round(base[0] + n)))
      const g = Math.max(0, Math.min(255, Math.round(base[1] + n)))
      const b = Math.max(0, Math.min(255, Math.round(base[2] + n)))
      px(x, y, r, g, b)
    }
  }
}

function makeTexture(fn, seed) {
  const c = canvas(16)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(16, 16)
  const px = (x, y, r, g, b) => {
    const i = (y * 16 + x) * 4
    img.data[i] = r
    img.data[i + 1] = g
    img.data[i + 2] = b
    img.data[i + 3] = 255
  }
  fn(px, seed)
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const HOODIE_BASE = [38, 42, 50]      // dark charcoal
const HOODIE_DARK = [26, 29, 36]
const HOODIE_LIGHT = [58, 64, 76]
const JEANS = [30, 34, 44]
const SKIN = [214, 176, 138]
const SKIN_SHADE = [196, 156, 120]
const HAIR = [24, 16, 12]
const SHOE = [238, 241, 246]

// dark charcoal hoodie with subtle weave + speckle
function hoodie(px, seed) {
  noise(HOODIE_BASE, 16, seed, px)
  const rng = mulberry(seed + 101)
  for (let i = 0; i < 40; i += 1) {
    const x = Math.floor(rng() * 16)
    const y = Math.floor(rng() * 16)
    const c = rng() > 0.5 ? HOODIE_LIGHT : HOODIE_DARK
    px(x, y, c[0], c[1], c[2])
  }
  // horizontal knit rows
  for (let y = 0; y < 16; y += 2) {
    for (let x = 0; x < 16; x += 1) {
      const f = HOODIE_BASE[0] * 0.9
      px(x, y, Math.min(255, f + 2), Math.min(255, HOODIE_BASE[1] * 0.9 + 2), Math.min(255, HOODIE_BASE[2] * 0.9 + 2))
    }
  }
}

// white "N" mark on a charcoal back-panel tile (stitched look)
function backPanel(seed) {
  const c = canvas(16)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(16, 16)
  const rng = mulberry(seed + 55)
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const n = (rng() - 0.5) * 16
      const r = Math.max(0, Math.min(255, Math.round(HOODIE_BASE[0] + n * 0.5)))
      const g = Math.max(0, Math.min(255, Math.round(HOODIE_BASE[1] + n * 0.5)))
      const b = Math.max(0, Math.min(255, Math.round(HOODIE_BASE[2] + n * 0.5)))
      const i = (y * 16 + x) * 4
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255
    }
  }
  // pixel N centered ~ (2..13, 2..13)
  const ink = [238, 242, 247]
  const draw = (x, y) => {
    const i = (y * 16 + x) * 4
    img.data[i] = ink[0]; img.data[i + 1] = ink[1]; img.data[i + 2] = ink[2]; img.data[i + 3] = 255
  }
  for (let y = 3; y <= 12; y += 1) { draw(3, y); draw(12, y) }
  for (let i = 0; i <= 9; i += 1) draw(4 + i, 12 - i)
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// dark denim pants
function jeans(px, seed) {
  noise(JEANS, 12, seed, px)
  const rng = mulberry(seed + 9)
  for (let i = 0; i < 22; i += 1) {
    const x = Math.floor(rng() * 16)
    const y = Math.floor(rng() * 16)
    px(x, y, JEANS[0] + 6, JEANS[1] + 6, JEANS[2] + 8)
  }
}

// natural skin with soft mottling
function skin(px, seed) {
  noise(SKIN, 14, seed, px)
  const rng = mulberry(seed + 21)
  for (let i = 0; i < 16; i += 1) {
    const x = Math.floor(rng() * 16)
    const y = Math.floor(rng() * 16)
    px(x, y, SKIN_SHADE[0], SKIN_SHADE[1], SKIN_SHADE[2])
  }
}

// dark hair with strand highlights
function hair(px, seed) {
  noise(HAIR, 12, seed, px)
  const rng = mulberry(seed + 33)
  for (let i = 0; i < 26; i += 1) {
    const x = Math.floor(rng() * 16)
    const y = Math.floor(rng() * 16)
    px(x, y, 44, 32, 26)
  }
}

// modern white sneaker + dark sole
function shoe(px, seed) {
  noise(SHOE, 8, seed, px)
  const rng = mulberry(seed + 77)
  for (let i = 0; i < 10; i += 1) {
    const x = Math.floor(rng() * 16)
    const y = Math.floor(rng() * 16)
    px(x, y, 226, 230, 236)
  }
}
function sole(px, seed) {
  noise([42, 46, 54], 10, seed, px)
}

// eyelid / highlight tiles stay plain
function eye() {
  const c = canvas(4)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1d1a16'
  ctx.fillRect(0, 0, 4, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeSkinTextures() {
  return {
    hoodie: makeTexture(hoodie, 7),
    back: backPanel(3),
    jeans: makeTexture(jeans, 5),
    skin: makeTexture(skin, 2),
    hair: makeTexture(hair, 4),
    shoe: makeTexture(shoe, 6),
    sole: makeTexture(sole, 8),
    eye: eye(),
  }
}
