// Zone triggers match the sign structures built by tools/blender/build_world.py
// Sign x = plot edge nearest path, three.js z = -(blender z center).
export const ZONE_TRIGGER_RADIUS = 7

export const ZONES = {
  about: {
    key: 'about',
    title: 'About',
    tagline: 'Who is Naman?',
    accent: '#ffd9a0',
    pos: [-14, -20],
  },
  stats: {
    key: 'stats',
    title: 'Stat Farm',
    tagline: 'Numbers go brrr',
    accent: '#ffe066',
    pos: [14, -34],
  },
  skills: {
    key: 'skills',
    title: 'Skill Forge',
    tagline: 'Tools of the trade',
    accent: '#b28aff',
    pos: [-14, -48],
  },
  projects: {
    key: 'projects',
    title: 'Project Hall',
    tagline: 'Things I built & shipped',
    accent: '#6cc4f5',
    pos: [18, -64],
  },
  mine: {
    key: 'mine',
    title: 'The Mine',
    tagline: 'Dig into my inbox',
    accent: '#ff9d5c',
    pos: [-14, -82],
  },
}

export function nearestZone(x, z) {
  let best = null
  let bestDist = Infinity
  for (const zone of Object.values(ZONES)) {
    const dx = x - zone.pos[0]
    const dz = z - zone.pos[1]
    const d = Math.hypot(dx, dz)
    if (d < ZONE_TRIGGER_RADIUS && d < bestDist) {
      best = zone.key
      bestDist = d
    }
  }
  return best
}
