// Dump per-mesh POSITION accessor bounds from a GLB (JSON chunk only).
import fs from 'node:fs'

const buf = fs.readFileSync(process.argv[2])
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString())

let globalMin = [Infinity, Infinity, Infinity]
let globalMax = [-Infinity, -Infinity, -Infinity]
for (const mesh of json.meshes ?? []) {
  for (const prim of mesh.primitives) {
    const acc = json.accessors[prim.attributes.POSITION]
    const { min, max } = acc
    for (let i = 0; i < 3; i++) {
      globalMin[i] = Math.min(globalMin[i], min[i])
      globalMax[i] = Math.max(globalMax[i], max[i])
    }
  }
}
console.log('meshes:', json.meshes?.length)
console.log('global bounds min:', globalMin.map((v) => v.toFixed(1)).join(', '))
console.log('global bounds max:', globalMax.map((v) => v.toFixed(1)).join(', '))
console.log(
  'extent X:',
  (globalMax[0] - globalMin[0]).toFixed(1),
  ' Y:',
  (globalMax[1] - globalMin[1]).toFixed(1),
  ' Z:',
  (globalMax[2] - globalMin[2]).toFixed(1),
)
