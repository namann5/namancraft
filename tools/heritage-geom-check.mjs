// Heritage-geometry sanity check: verify the rebuilt overworld GLB actually
// contains the Indian structures. The GLB is meshed one-object-per-material,
// so we can bound each heritage material and confirm it exists + reaches the
// expected height (up-axis is +Y after export).
//
// Usage: node tools/heritage-geom-check.mjs [path-to-world.glb]
import fs from 'node:fs'

const path = process.argv[2] || 'public/models/world/world.glb'
const buf = fs.readFileSync(path)
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString())

// material index -> name
const matName = (json.materials || []).map((m) => m.name)

// Iterate every node, resolve its mesh directly, and record the named
// material's accessor bounds. Each object in this pipeline is one raw voxel
// mesh, so mesh-local POSITION bounds == world bounds (no node transforms).
const bounds = new Map() // matName -> { min:[x,y,z], max:[x,y,z] }
for (const node of json.nodes || []) {
  if (node.mesh === undefined) continue
  const meshes = json.meshes || []
  const prim = meshes[node.mesh].primitives[0]
  if (prim.material === undefined) continue
  const acc = json.accessors[prim.attributes.POSITION]
  const name = matName[prim.material]
  if (!bounds.has(name)) {
    bounds.set(name, {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    })
  }
  const b = bounds.get(name)
  for (let i = 0; i < 3; i++) {
    if (acc.min[i] < b.min[i]) b.min[i] = acc.min[i]
    if (acc.max[i] > b.max[i]) b.max[i] = acc.max[i]
  }
}

const HERITAGE = [
  ['mat_sandstone', 'haveli walls + gateway', 8, 22],
  ['mat_sandstone_dark', 'trim / plinths / pilasters', 5, 15],
  ['mat_roofterra', 'terracotta haveli roof + mandap cornice', 14, 22],
  ['mat_taj', 'chhatri domes (haveli turret, mandap dome, gateway)', 14, 25],
  ['mat_kalash', 'gold finials', 20, 26],
  ['mat_jharokha', 'corner posts + balcony rails', 8, 14],
  ['mat_rangoli', 'kolam / colonial step', 7, 11],
]

let pass = 0
let fail = 0
for (const [mat, label, yLo, yHi] of HERITAGE) {
  const b = bounds.get(mat)
  if (!b) {
    console.log(`FAIL  ${mat.padEnd(22)} ${label} (material missing)`)
    fail++
    continue
  }
  const yMax = b.max[1]
  const ok = yMax >= yLo
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${mat.padEnd(22)} ${label}  yMax=${yMax.toFixed(1)} (want >= ${yLo})`,
  )
  ok ? pass++ : fail++
}

console.log(`\nheritage structure check: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
