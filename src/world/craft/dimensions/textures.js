import * as THREE from 'three'

// ------------------------------------------------------------------
// PixelTexture library + a packed atlas.
//
// Every texture is drawn on a 16x16 canvas with nearest-neighbour
// filtering so blocks keep crisp pixel boundaries, then packed into a
// single atlas texture. The mesher maps each block face's UV into its
// tile's atlas rect, so EVERY block can wear its own texture in a
// single draw call.
//
// No external assets and no copyrighted Minecraft textures — just a
// hand-authored voxel/pixel language that reads as Minecraft.
// ------------------------------------------------------------------

export const TILE = 16

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function noiseFill(ctx, base, amount, seedFn) {
  ctx.imageSmoothingEnabled = false
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const f = 1 + (amount * (seedFn(x, y) - 0.5) * 2)
      ctx.fillStyle = shade(base, f)
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

function shade(rgb, factor) {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * factor)))
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * factor)))
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * factor)))
  return `rgb(${r},${g},${b})`
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function tileEdges(ctx, base) {
  ctx.fillStyle = shade(base, 0.8)
  ctx.fillRect(0, 0, TILE, 1)
  ctx.fillRect(0, TILE - 1, TILE, 1)
  ctx.fillRect(0, 0, 1, TILE)
  ctx.fillRect(TILE - 1, 0, 1, TILE)
}

// ---- texture generators -------------------------------------------

function grassTop() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#5f9e3d')
  noiseFill(ctx, base, 0.18, () => rng(11)())
  for (let i = 0; i < 30; i += 1) {
    const x = Math.floor(rng(21 + i)() * TILE)
    const y = Math.floor(rng(31 + i)() * (TILE - 4))
    const len = 2 + Math.floor(rng(41 + i)() * 4)
    const f = rng(51 + i)() > 0.5 ? 1.25 : 0.76
    ctx.fillStyle = shade(hexToRgb('#6fae44'), f)
    ctx.fillRect(x, y, 1, len)
  }
  tileEdges(ctx, base)
  return c
}

function grassSide() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const dirt = hexToRgb('#8a5f3c')
  noiseFill(ctx, dirt, 0.16, () => rng(61)())
  for (let x = 0; x < TILE; x += 1) {
    ctx.fillStyle = shade(hexToRgb('#69a840'), 0.8 + rng(70 + x)() * 0.4)
    ctx.fillRect(x, 0, 1, 2 + Math.floor(rng(80 + x)() * 3))
  }
  for (let y = 6; y < TILE; y += 4) {
    ctx.fillStyle = shade(dirt, 0.9 + rng(90 + y)() * 0.2)
    ctx.fillRect(0, y, TILE, 1)
  }
  return c
}

function dirt() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#8a5f3c')
  noiseFill(ctx, base, 0.2, () => rng(100)())
  for (let i = 0; i < 16; i += 1) {
    ctx.fillStyle = rng(110 + i)() > 0.5 ? '#a37a4c' : '#6b4326'
    ctx.fillRect(Math.floor(rng(120 + i)() * TILE), Math.floor(rng(130 + i)() * TILE), 1, 1)
  }
  return c
}

function stone() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#8d8d8d')
  noiseFill(ctx, base, 0.13, () => rng(140)())
  ctx.fillStyle = '#9b9991'
  ctx.fillRect(2, 2, 5, 4)
  ctx.fillRect(9, 8, 6, 5)
  ctx.fillStyle = '#7a7a74'
  ctx.fillRect(8, 1, 4, 3)
  ctx.fillRect(12, 12, 3, 3)
  tileEdges(ctx, base)
  return c
}

function stoneBrick() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#8a8a86')
  noiseFill(ctx, base, 0.1, () => rng(150)())
  ctx.strokeStyle = '#6d6d68'
  ctx.lineWidth = 1
  ctx.strokeRect(1, 1, 6, 6)
  ctx.strokeRect(8, 1, 6, 6)
  ctx.strokeRect(1, 8, 6, 6)
  ctx.strokeRect(8, 8, 6, 6)
  ctx.strokeRect(1, 1, 13, 13)
  return c
}

function planks() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#a07a45')
  noiseFill(ctx, base, 0.14, () => rng(160)())
  ctx.fillStyle = '#7e5d33'
  for (let x = 3; x < TILE; x += 4) ctx.fillRect(x, 0, 1, TILE)
  for (let y = 0; y < TILE; y += 8) {
    ctx.strokeStyle = shade(base, 0.85)
    ctx.beginPath(); ctx.moveTo(0, y + 3); ctx.quadraticCurveTo(8, y + 2, 16, y + 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, y + 6); ctx.quadraticCurveTo(8, y + 7, 16, y + 5); ctx.stroke()
  }
  return c
}

function logSide() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#6b4a2b')
  noiseFill(ctx, base, 0.13, () => rng(170)())
  ctx.strokeStyle = '#54371f'
  for (let x = 1; x < TILE; x += 2) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 1, 16); ctx.stroke()
  }
  tileEdges(ctx, base)
  return c
}

function logTop() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#9c7c4e')
  noiseFill(ctx, base, 0.1, () => rng(180)())
  ctx.fillStyle = '#8a6338'; ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#b08a54'; ctx.fillRect(2, 2, 12, 12)
  ctx.strokeStyle = '#6b4a2b'
  ctx.strokeRect(3, 3, 10, 10); ctx.strokeRect(5, 5, 6, 6); ctx.strokeRect(7, 7, 2, 2)
  return c
}

function leaves() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#4e8f3a')
  noiseFill(ctx, base, 0.24, () => rng(190)())
  for (let i = 0; i < 34; i += 1) {
    const f = 0.7 + rng(200 + i)() * 0.6
    ctx.fillStyle = shade(hexToRgb('#5da53f'), f)
    ctx.fillRect(Math.floor(rng(210 + i)() * 15), Math.floor(rng(220 + i)() * 15), 2, 2)
  }
  return c
}

function blossom() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#f0a3c0')
  noiseFill(ctx, base, 0.2, () => rng(230)())
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = rng(240 + i)() > 0.5 ? '#f6bcd2' : '#e888ab'
    ctx.fillRect(Math.floor(rng(250 + i)() * 15), Math.floor(rng(260 + i)() * 15), 2, 2)
  }
  return c
}

function water() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#3a6fd8')
  noiseFill(ctx, base, 0.12, () => rng(270)())
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = 'rgba(210,230,255,0.35)'
    ctx.fillRect(0, Math.floor(rng(280 + i)() * TILE), TILE, 1)
  }
  return c
}

function sand() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#dcd29b')
  noiseFill(ctx, base, 0.13, () => rng(290)())
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = rng(300 + i)() > 0.5 ? '#c9bd85' : '#efe4ac'
    ctx.fillRect(Math.floor(rng(310 + i)() * TILE), Math.floor(rng(320 + i)() * TILE), 1, 1)
  }
  return c
}

function netherrack() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#6d2b1e')
  noiseFill(ctx, base, 0.3, () => rng(330)())
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = rng(340 + i)() > 0.5 ? '#8a3b24' : '#4a1a10'
    ctx.fillRect(Math.floor(rng(350 + i)() * 15), Math.floor(rng(360 + i)() * 15), 2, 2)
  }
  return c
}

function blackstone() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#2a2a33')
  noiseFill(ctx, base, 0.18, () => rng(370)())
  for (let i = 0; i < 14; i += 1) {
    ctx.fillStyle = rng(380 + i)() > 0.5 ? '#3a3a44' : '#191922'
    ctx.fillRect(Math.floor(rng(390 + i)() * 15), Math.floor(rng(400 + i)() * 15), 2, 2)
  }
  tileEdges(ctx, base)
  return c
}

function endstone() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#ded8a2')
  noiseFill(ctx, base, 0.18, () => rng(410)())
  for (let i = 0; i < 22; i += 1) {
    ctx.fillStyle = rng(420 + i)() > 0.5 ? '#efe9bd' : '#c8c18a'
    ctx.fillRect(Math.floor(rng(430 + i)() * 15), Math.floor(rng(440 + i)() * 15), 2, 2)
  }
  return c
}

// purple endstone: same speckled blister texture as plain endstone but
// tinted toward lavender so the End reads purple-dark against its void.
function endPurple() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#a78fd2')
  noiseFill(ctx, base, 0.18, () => rng(600)())
  for (let i = 0; i < 22; i += 1) {
    ctx.fillStyle = rng(610 + i)() > 0.5 ? '#c3b0e8' : '#8a6fb8'
    ctx.fillRect(Math.floor(rng(620 + i)() * 15), Math.floor(rng(630 + i)() * 15), 2, 2)
  }
  return c
}

function obsidian() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#171018')
  noiseFill(ctx, base, 0.2, () => rng(450)())
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = rng(460 + i)() > 0.5 ? '#241830' : '#0d0a12'
    ctx.fillRect(Math.floor(rng(470 + i)() * TILE), Math.floor(rng(480 + i)() * TILE), 1, 1)
  }
  return c
}

function brickRed() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#93433a')
  noiseFill(ctx, base, 0.12, () => rng(490)())
  ctx.strokeStyle = '#6b2f28'
  ctx.lineWidth = 1
  ctx.strokeRect(1, 1, 6, 5); ctx.strokeRect(8, 1, 7, 5)
  ctx.strokeRect(1, 8, 6, 7); ctx.strokeRect(8, 8, 7, 7)
  ctx.fillStyle = '#a24d43'; ctx.fillRect(5, 5, 2, 2)
  return c
}

function concrete() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#7d7f87')
  noiseFill(ctx, base, 0.1, () => rng(500)())
  ctx.fillStyle = '#6a6c73'
  ctx.fillRect(0, 0, TILE, 1); ctx.fillRect(0, 8, TILE, 1); ctx.fillRect(0, 15, TILE, 1)
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(Math.floor(rng(501 + i)() * 15), Math.floor(rng(502 + i)() * 15), 2, 1)
  }
  return c
}

function floorTile() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const base = hexToRgb('#cfd5df')
  noiseFill(ctx, base, 0.07, () => rng(510)())
  ctx.strokeStyle = '#aab1bf'
  ctx.lineWidth = 1
  ctx.strokeRect(1, 1, 13, 13)
  ctx.fillStyle = '#dde2ea'
  ctx.fillRect(3, 3, 10, 10)
  return c
}

function glass() {
  const c = canvas(TILE, TILE)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 16)
  g.addColorStop(0, '#e6f6ff'); g.addColorStop(1, '#9cc8e0')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(1, 13); ctx.lineTo(6, 2); ctx.moveTo(7, 13); ctx.lineTo(10, 5); ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.strokeRect(1, 1, 13, 13)
  return c
}

export const GENERATORS = {
  grassTop, grassSide, dirt, stone, stoneBrick,
  planks, logSide, logTop, leaves, blossom,
  water, sand, netherrack, blackstone, endstone, endPurple,
  obsidian, brickRed, concrete, floorTile, glass,
}

const KEYS = Object.keys(GENERATORS)
export const ATLAS_COLS = 5
export const ATLAS_ROWS = Math.ceil(KEYS.length / ATLAS_COLS)
export const ATLAS_W = ATLAS_COLS * TILE
export const ATLAS_H = ATLAS_ROWS * TILE

// per-key atlas UV rects (normalized)
const rects = {}
KEYS.forEach((key, i) => {
  const col = i % ATLAS_COLS
  const row = Math.floor(i / ATLAS_COLS)
  rects[key] = {
    u: (col * TILE) / ATLAS_W,
    v: 1 - (row * TILE + TILE) / ATLAS_H,
    du: TILE / ATLAS_W,
    dv: TILE / ATLAS_H,
  }
})

let atlasTex = null
export function textureRect(key) {
  return rects[key] || rects.stone
}

export function getAtlasTexture() {
  if (atlasTex) return atlasTex
  const c = canvas(ATLAS_W, ATLAS_H)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  KEYS.forEach((key, i) => {
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    ctx.drawImage(GENERATORS[key](), col * TILE, row * TILE)
  })
  atlasTex = new THREE.CanvasTexture(c)
  atlasTex.magFilter = THREE.NearestFilter
  atlasTex.minFilter = THREE.NearestFilter
  atlasTex.generateMipmaps = false
  atlasTex.colorSpace = THREE.SRGBColorSpace
  return atlasTex
}
