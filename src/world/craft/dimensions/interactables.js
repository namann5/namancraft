// ------------------------------------------------------------------
// Interactable registry — the unified "[E] do thing" system.
//
// Static overworld zones (ZONES) are merged with dynamic entries that
// dimensions register on mount (portals, achievement nodes, tech
// stations, project buildings, resume islands). Player polls
// nearestInteractable() every frame; WorldExperience reacts to the
// picked entry: travel entries start dimension travel, panel entries
// open an overlay.
// ------------------------------------------------------------------

import { ZONES, ZONE_TRIGGER_RADIUS } from '../zones'

const dynamic = new Map()

export function registerInteractable(entry) {
  dynamic.set(entry.key, entry)
}

export function unregisterInteractable(key) {
  dynamic.delete(key)
}

function staticEntries() {
  return Object.values(ZONES).map((z) => ({
    key: `zone:${z.key}`,
    x: z.pos[0],
    z: z.pos[1],
    radius: ZONE_TRIGGER_RADIUS,
    verb: z.verb || 'View',
    label: z.title,
    accent: z.accent,
    panel: { type: 'zone', data: z.key },
  }))
}

export function nearestInteractable(x, z) {
  let best = null
  let bestDist = Infinity
  const consider = (e) => {
    if (!e) return
    const d = Math.hypot(x - e.x, z - e.z)
    if (d < e.radius && d < bestDist) {
      best = e
      bestDist = d
    }
  }
  for (const entry of staticEntries()) consider(entry)
  for (const entry of dynamic.values()) consider(entry)
  return best
}

export function getInteractable(key) {
  if (key?.startsWith('zone:')) {
    const id = key.slice(5)
    const z = ZONES[id]
    return z ? staticEntries().find((e) => e.key === key) : null
  }
  return dynamic.get(key) || null
}
