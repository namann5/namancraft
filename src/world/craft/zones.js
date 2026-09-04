// Zone triggers match the sign structures built by tools/blender/build_world.py
// Sign x = plot edge nearest path, three.js z = -(blender z center).
export const ZONE_TRIGGER_RADIUS = 7

export const ZONES = {
  about: {
    key: 'about',
    title: 'Hello',
    tagline: 'Who is Naman?',
    accent: '#ffd9a0',
    pos: [-14, -20],
  },
  stats: {
    key: 'stats',
    title: 'Census Ground',
    tagline: 'Live counts of the realm',
    accent: '#ffe066',
    pos: [14, -34],
  },
  skills: {
    key: 'skills',
    title: 'Skill Court',
    tagline: 'Colors & craft of the trade',
    accent: '#b28aff',
    pos: [-14, -48],
  },
  projects: {
    key: 'projects',
    title: 'The Projects Hall',
    tagline: 'Works built & shipped',
    accent: '#6cc4f5',
    pos: [18, -64],
  },
  mine: {
    key: 'mine',
    title: 'The Village Well',
    tagline: 'Reach me at the village well',
    accent: '#ff9d5c',
    pos: [-14, -82],
  },
  home: {
    key: 'home',
    title: 'The Home',
    tagline: "Naman's home base",
    accent: '#ffc97e',
    pos: [16, -49],
    verb: 'Enter',
  },
  journey: {
    key: 'journey',
    title: 'World Clock',
    tagline: 'Building dreams, one commit at a time',
    accent: '#ffd9a0',
    pos: [-19, -10],
    verb: 'View Journey',
  },
  campfire: {
    key: 'campfire',
    title: 'The Campfire',
    tagline: 'Warm end of the journey',
    accent: '#ff9d5c',
    pos: [0.5, -12],
    verb: 'Gather',
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
