import * as THREE from 'three'

// ------------------------------------------------------------------
// Runtime voxel chunk mesher.
//
// Turns a get(x,y,z) -> paletteIndex (0 = air) function over a bounded
// region into two merged BufferGeometries:
//   solid — lambert-lit, vertex colors carry baked directional shading
//   glow  — unlit (MeshBasicMaterial), for lava / neon / windows
//
// One draw call per material per dimension. Hidden faces are culled.
// A deterministic per-block brightness jitter keeps large flat walls
// from looking like plastic.
// ------------------------------------------------------------------

const FACES = [
  { // +X
    dir: [1, 0, 0],
    shade: 0.74,
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  },
  { // -X
    dir: [-1, 0, 0],
    shade: 0.74,
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
  },
  { // +Y (top)
    dir: [0, 1, 0],
    shade: 1.0,
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
  },
  { // -Y (bottom)
    dir: [0, -1, 0],
    shade: 0.5,
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  },
  { // +Z
    dir: [0, 0, 1],
    shade: 0.86,
    corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
  },
  { // -Z
    dir: [0, 0, -1],
    shade: 0.86,
    corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
  },
]

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0
  h = h ^ (h >> 13)
  h = Math.imul(h, 1274126177)
  h = h ^ (h >> 16)
  return ((h >>> 0) % 1000) / 1000
}

export const BLOCKS = {
  list: [{ color: '#000000', glow: false }], // index 0 = air sentinel
  byName: {},
}

export function defineBlocks(defs) {
  for (const d of defs) {
    BLOCKS.list.push({ color: d.color, glow: Boolean(d.glow) })
    BLOCKS.byName[d.name] = BLOCKS.list.length - 1
  }
  return BLOCKS.byName
}

const tmpColor = new THREE.Color()

export function buildVoxelGeometry({ get, x0, x1, y0, y1, z0, z1 }) {
  const out = {
    solid: { pos: [], norm: [], col: [], idx: [] },
    glow: { pos: [], norm: [], col: [], idx: [] },
  }

  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        const id = get(x, y, z)
        if (!id) continue
        const def = BLOCKS.list[id] || BLOCKS.list[1]
        const bucket = def.glow ? out.glow : out.solid

        for (const face of FACES) {
          const nx = x + face.dir[0]
          const ny = y + face.dir[1]
          const nz = z + face.dir[2]
          if (get(nx, ny, nz)) continue // neighbor solid -> culled

          const jitter = 0.9 + hash3(x ^ nz, y, z) * 0.14
          const bright = face.shade * jitter
          const base = bucket.pos.length / 3

          for (const corner of face.corners) {
            bucket.pos.push(x + corner[0], y + corner[1], z + corner[2])
            bucket.norm.push(face.dir[0], face.dir[1], face.dir[2])
          }
          tmpColor.set(def.color)
          const r = tmpColor.r * bright
          const g = tmpColor.g * bright
          const b = tmpColor.b * bright
          for (let i = 0; i < 4; i += 1) bucket.col.push(r, g, b)
          bucket.idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
        }
      }
    }
  }

  const make = ({ pos, norm, col, idx }) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    return g
  }

  return { solid: make(out.solid), glow: make(out.glow) }
}
