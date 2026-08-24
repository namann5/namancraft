// ------------------------------------------------------------------
// terrainKit — helpers for building runtime voxel dimensions.
//
// A dimension paints blocks into a TerrainGrid, which also tracks a
// walkable surface height per column. field() then produces exactly
// the same heightfield shape terrain.js gives the overworld GLB, so
// Player's movement/gravity code works unchanged in every dimension.
// ------------------------------------------------------------------

import { defineBlocks, buildVoxelGeometry } from './voxelMesh'

// ---- deterministic noise ---------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashValue(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function smooth(t) {
  return t * t * (3 - 2 * t)
}

// value noise, 0..1
export function valueNoise(x, z, seed) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = smooth(x - ix)
  const fz = smooth(z - iz)
  const a = hashValue(ix, iz, seed)
  const b = hashValue(ix + 1, iz, seed)
  const c = hashValue(ix, iz + 1, seed)
  const d = hashValue(ix + 1, iz + 1, seed)
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz
}

export function fbm(x, z, seed, octaves = 3) {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o += 1) {
    sum += valueNoise(x * freq, z * freq, seed + o * 101) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.13
  }
  return sum / norm
}

// ---- shared palettes ---------------------------------------------------

let netherBlocks = null
export function netherPalette() {
  if (!netherBlocks) {
    netherBlocks = defineBlocks([
      { name: 'netherrack', color: '#4a1512' },
      { name: 'netherrackDark', color: '#380f0d' },
      { name: 'basalt', color: '#33333c' },
      { name: 'basaltLight', color: '#454550' },
      { name: 'blackstone', color: '#17171d' },
      { name: 'soul', color: '#24302e' },
      { name: 'magma', color: '#8a3312' },
      { name: 'lava', color: '#ff7b1f', glow: true },
      { name: 'lavaCore', color: '#ffd23e', glow: true },
      { name: 'fire', color: '#ffb03a', glow: true },
    ])
  }
  return netherBlocks
}

let endBlocks = null
export function endPalette() {
  if (!endBlocks) {
    endBlocks = defineBlocks([
      { name: 'endstone', color: '#ded8a2' },
      { name: 'endstoneDeep', color: '#b5ad78' },
      { name: 'purpur', color: '#9d6bad' },
      { name: 'purpurDark', color: '#6d4380' },
      { name: 'endBrick', color: '#c9c39a' },
      { name: 'obsidian', color: '#17101f' },
      { name: 'endGlow', color: '#c9a0ff', glow: true },
    ])
  }
  return endBlocks
}

let techBlocks = null
export function techPalette() {
  if (!techBlocks) {
    techBlocks = defineBlocks([
      { name: 'floorTile', color: '#cdd3dd' },
      { name: 'floorTileAlt', color: '#b7bfcc' },
      { name: 'floorDark', color: '#3c4452' },
      { name: 'gridLine', color: '#37e2c4', glow: true },
      { name: 'white', color: '#eef1f5' },
      { name: 'steel', color: '#8d99ab' },
      { name: 'steelDark', color: '#59626f' },
      { name: 'glass', color: '#9fdcf0' },
      { name: 'neonCyan', color: '#2ee6ff', glow: true },
      { name: 'neonMagenta', color: '#ff4fd8', glow: true },
      { name: 'neonLime', color: '#8dff3e', glow: true },
      { name: 'neonAmber', color: '#ffc23e', glow: true },
      { name: 'neonViolet', color: '#a06bff', glow: true },
      { name: 'grassTech', color: '#67d08b' },
      { name: 'ember', color: '#ffb03a', glow: true },
      { name: 'coal', color: '#17171d' },
      { name: 'ironBlock', color: '#7a8494' },
    ])
  }
  return techBlocks
}

let cityBlocks = null
export function cityPalette() {
  if (!cityBlocks) {
    cityBlocks = defineBlocks([
      { name: 'asphalt', color: '#23252b' },
      { name: 'sidewalk', color: '#4a4d55' },
      { name: 'curb', color: '#6a6e78' },
      { name: 'concrete', color: '#7d7f87' },
      { name: 'concreteDark', color: '#55575e' },
      { name: 'brickRed', color: '#7a3b32' },
      { name: 'sandstone', color: '#cbb98a' },
      { name: 'glassBlue', color: '#274a66' },
      { name: 'windowWarm', color: '#ffd98a', glow: true },
      { name: 'windowCool', color: '#9fd8ff', glow: true },
      { name: 'lamp', color: '#ffe9b0', glow: true },
      { name: 'metal', color: '#3a3d44' },
      { name: 'roofGreen', color: '#3d6b4f' },
    ])
  }
  return cityBlocks
}

// ---- TerrainGrid -------------------------------------------------------

const VOID = -999

export class TerrainGrid {
  constructor({ sizeX, sizeZ, x0 = 0, z0 = 0 }) {
    this.sizeX = sizeX
    this.sizeZ = sizeZ
    this.x0 = x0
    this.z0 = z0
    this.blocks = new Uint8Array(sizeX * 40 * sizeZ) // y up to 40
    this.heights = new Int16Array(sizeX * sizeZ).fill(VOID)
  }

  idx(x, z) {
    return (z - this.z0) * this.sizeX + (x - this.x0)
  }

  bidx(x, y, z) {
    const yy = y + 8 // allow a little underground
    return ((yy * this.sizeZ) + (z - this.z0)) * this.sizeX + (x - this.x0)
  }

  inside(x, z) {
    return x >= this.x0 && x < this.x0 + this.sizeX && z >= this.z0 && z < this.z0 + this.sizeZ
  }

  set(x, y, z, id) {
    if (!this.inside(x, z) || y < -8 || y > 31) return
    this.blocks[this.bidx(x, y, z)] = id
  }

  get(x, y, z) {
    if (!this.inside(x, z) || y < -8 || y > 31) return 0
    return this.blocks[this.bidx(x, y, z)]
  }

  setHeight(x, z, h) {
    if (!this.inside(x, z)) return
    this.heights[this.idx(x, z)] = h
  }

  heightAt(x, z) {
    if (!this.inside(x, z)) return VOID
    return this.heights[this.idx(x, z)]
  }

  // solid column from bottom to h (inclusive top at h)
  column(x, z, h, id, subId = id, floor = -4) {
    for (let y = floor; y <= h; y += 1) {
      this.set(x, y, z, y === h ? id : y > h - 3 ? subId : id)
    }
    if (this.heightAt(x, z) === VOID || h >= this.heightAt(x, z)) this.setHeight(x, z, h)
  }

  boxFill(x0, x1, y0, y1, z0, z1, id) {
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        for (let z = z0; z <= z1; z += 1) this.set(x, y, z, id)
      }
    }
  }

  boxShell(x0, x1, y0, y1, z0, z1, id) {
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        for (let z = z0; z <= z1; z += 1) {
          const onEdge =
            x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1
          if (onEdge) this.set(x, y, z, id)
        }
      }
    }
  }

  // flatten a rect to a walkable platform at height h (fills down to terrain)
  platform(x0, x1, z0, z1, h, topId, subId = topId, baseId = subId) {
    for (let x = x0; x <= x1; x += 1) {
      for (let z = z0; z <= z1; z += 1) {
        this.column(x, z, h, topId, subId)
        void baseId
      }
    }
  }

  // walkable bridge strip along x or z between two points at height h
  bridge(x0, z0, x1, z1, h, id, width = 1) {
    const dx = Math.sign(x1 - x0)
    const dz = Math.sign(z1 - z0)
    let x = x0
    let z = z0
    const half = Math.floor((width - 1) / 2)
    for (;;) {
      for (let w = -half; w <= width - 1 - half; w += 1) {
        if (dx !== 0) this.column(x, z + w, h, id)
        else this.column(x + w, z, h, id)
      }
      if (x === x1 && z === z1) break
      if (x !== x1) x += dx
      else if (z !== z1) z += dz
    }
  }

  field({ killY = -60 } = {}) {
    const { x0, z0, sizeX, sizeZ, heights } = this
    return {
      minX: x0 + 1.31,
      maxX: x0 + sizeX - 1.31,
      minZ: z0 + 1.31,
      maxZ: z0 + sizeZ - 1.31,
      killY,
      groundAt(px, pz) {
        const xx = Math.min(Math.max(Math.round(px) - x0, 0), sizeX - 1)
        const zz = Math.min(Math.max(Math.round(pz) - z0, 0), sizeZ - 1)
        return heights[zz * sizeX + xx]
      },
    }
  }

  voxelGeometry(bounds) {
    return buildVoxelGeometry({
      get: (x, y, z) => this.get(x, y, z),
      ...bounds,
    })
  }
}
