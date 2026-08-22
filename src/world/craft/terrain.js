let collidersPromise = null

export function loadColliders() {
  if (!collidersPromise) {
    collidersPromise = fetch(`${import.meta.env.BASE_URL}models/world/colliders.json`).then((r) => {
      if (!r.ok) throw new Error(`colliders.json ${r.status}`)
      return r.json()
    })
  }
  return collidersPromise
}

// GLB is Blender Z-up exported to glTF Y-up: three.x = blender.x,
// three.y = up, three.z = -blender.y. Height rows are indexed by blender z.
export function makeHeightField(colliders) {
  const { origin, size, heights } = colliders
  const [ox, oz] = origin
  const [sx, sz] = size
  const pad = 0.31
  return {
    minX: ox + pad,
    maxX: ox + sx - pad,
    minZ: -(oz + sz) + pad,
    maxZ: -(oz) - pad,
    groundAt(px, pz) {
      const xx = Math.min(Math.max(Math.floor(px) - ox, 0), sx - 1)
      const zz = Math.min(Math.max(Math.floor(-pz) - oz, 0), sz - 1)
      return heights[zz][xx] + 1
    },
  }
}
