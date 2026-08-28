import * as THREE from 'three'
import { textureRect } from './textures'

// ------------------------------------------------------------------
// Runtime voxel chunk mesher.
//
// Turns a get(x,y,z) -> blockDef index over a bounded region into
// three merged BufferGeometries:
//   solid — lit, vertex-colored + UVs for optional pixel textures
//   glow  — unlit (MeshBasicMaterial) for lava / neon / windows
//   water — translucent animated surface
//
// Each block can carry a textureKey (see textures.js). Faces get:
//   - directional shading (top bright, sides darker)
//   - a deterministic value-noise so big flat surfaces stay matte
//   - baked ambient occlusion: corners where neighbours block sky
//     are darkened, giving the voxel depth Minecraft-style.
//
// One draw call per material per dimension; hidden faces are culled.
// ------------------------------------------------------------------

const FACES = [
  { // +X
    dir: [1, 0, 0],
    shade: 0.78,
    u: [1, 0],
    v: [1, 0],
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    uv: [[1, 1], [1, 0], [0, 0], [0, 1]],
  },
  { // -X
    dir: [-1, 0, 0],
    shade: 0.78,
    u: [1, 0],
    v: [1, 0],
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    uv: [[0, 1], [0, 0], [1, 0], [1, 1]],
  },
  { // +Y (top)
    dir: [0, 1, 0],
    shade: 1.0,
    u: [1, 0],
    v: [0, 1],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  },
  { // -Y (bottom)
    dir: [0, -1, 0],
    shade: 0.5,
    u: [1, 0],
    v: [0, 1],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]],
  },
  { // +Z
    dir: [0, 0, 1],
    shade: 0.9,
    u: [1, 0],
    v: [1, 0],
    corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    uv: [[1, 1], [1, 0], [0, 0], [0, 1]],
  },
  { // -Z
    dir: [0, 0, -1],
    shade: 0.9,
    u: [1, 0],
    v: [1, 0],
    corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
    uv: [[0, 1], [0, 0], [1, 0], [1, 1]],
  },
]

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0
  h = h ^ (h >> 13)
  h = Math.imul(h, 1274126177)
  h = h ^ (h >> 16)
  return ((h >>> 0) % 1000) / 1000
}

// per-block value noise across the tile using a 1D-coord hash
function tileNoise(x, y, z) {
  let h = (Math.imul(x, 227) ^ Math.imul(y, 331) ^ Math.imul(z, 331)) >>> 0
  h = (h ^ 61) ^ (h >>> 16)
  h = (h + (h << 3)) >>> 0
  h ^= h >>> 4
  h = Math.imul(h, 0x27d4eb2d)
  h ^= h >>> 15
  return (h % 1000) / 1000
}

export const BLOCKS = {
  list: [{ color: '#000000', glow: false, water: false }], // index 0 = air
  byName: {},
}

export function defineBlocks(defs) {
  for (const d of defs) {
    BLOCKS.list.push({
      color: d.color,
      glow: Boolean(d.glow),
      water: Boolean(d.water),
      tex: d.tex || null, // texture key from textures.js
      opacity: d.opacity,
    })
    BLOCKS.byName[d.name] = BLOCKS.list.length - 1
  }
  return BLOCKS.byName
}

const tmpColor = new THREE.Color()

export function buildVoxelGeometry({ get, x0, x1, y0, y1, z0, z1 }) {
  const out = {
    solid: { pos: [], norm: [], col: [], uv: [], idx: [] },
    glow: { pos: [], norm: [], col: [], uv: [], idx: [] },
    water: { pos: [], norm: [], col: [], uv: [], idx: [] },
  }

  const occludes = (id) => {
    if (!id) return false
    const d = BLOCKS.list[id]
    return !d.water
  }

  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        const id = get(x, y, z)
        if (!id) continue
        const def = BLOCKS.list[id] || BLOCKS.list[1]

        // pick bucket: water blocks are translucently rendered separately
        const bucket = def.water ? out.water : def.glow ? out.glow : out.solid

        // atlas rect for this block's texture (identity-ish UV for glow)
        let urect = null
        if (def.tex && !def.glow) urect = textureRect(def.tex)

        for (const face of FACES) {
          const nx = x + face.dir[0]
          const ny = y + face.dir[1]
          const nz = z + face.dir[2]
          if (get(nx, ny, nz)) continue // any neighbour hides this face

          // directionally shaded value noise (matte, not plastic)
          const jitter = 0.9 + hash3(x ^ nz, y, z) * 0.16
          const bright = face.shade * jitter
          const base = bucket.pos.length / 3

          for (let ci = 0; ci < 4; ci += 1) {
            const corner = face.corners[ci]

            // 3D position of the corner block (for AO sampling)
            const ax = x + corner[0]
            const ay = y + corner[1]
            const az = z + corner[2]

            // off-axis neighbours for ambient occlusion
            const sideA = occludes(get(x + corner[0], ay, az))
            const sideB = occludes(get(ax, ay, z + corner[2]))

            // AO factor: corners trapped between two solid sides darken
            let ao = 1.0
            if (sideA && sideB) ao = 0.62
            else if (sideA || sideB) ao = 0.86

            bucket.pos.push(ax, ay, az)
            bucket.norm.push(face.dir[0], face.dir[1], face.dir[2])

            // per-block texture offset + per-pixel noise + AO.
            // For textured (solid/water) blocks the atlas supplies the
            // albedo colour, so the vertex colour is lighting-only: a
            // neutral grey built from directional shade + AO + noise.
            // Glow blocks have no texture and keep their full colour.
            let tnoise = 0.97 + tileNoise(ax, ay, az) * 0.06
            if (def.glow || def.water) tnoise = 1.0
            const f = bright * ao * tnoise
            if (def.glow) {
              tmpColor.set(def.color)
              bucket.col.push(tmpColor.r, tmpColor.g, tmpColor.b)
            } else {
              bucket.col.push(f, f, f)
            }

            // UV: map into the block's atlas rect (0..1 per block face)
            let u = face.uv[ci][0]
            let v = face.uv[ci][1]
            if (urect) {
              u = urect.u + u * urect.du
              v = urect.v + v * urect.dv
            }
            bucket.uv.push(u, v)
          }
          bucket.idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
        }
      }
    }
  }

  const make = ({ pos, norm, col, uv, idx }) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    return g
  }

  return {
    solid: make(out.solid),
    glow: make(out.glow),
    water: make(out.water),
  }
}
