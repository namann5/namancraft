// ------------------------------------------------------------------
// Quality presets — LOW / MEDIUM / HIGH with automatic device detect.
//
// Controls things that scale rendering cost: shadow map size,
// particle counts, antialiasing / pixel ratio, render distance and
// water refresh. The LOW preset must still look Minecraft.
// ------------------------------------------------------------------

export const QUALITY = {
  low: {
    key: 'low',
    shadows: 1024,
    dpr: [1, 1],
    particles: 0.4, // multiplier
    antialias: false,
    fogDensityScale: 1.25, // shorter draw distance
    waterAnimate: false,
  },
  medium: {
    key: 'medium',
    shadows: 2048,
    dpr: [1, 1.5],
    particles: 0.75,
    antialias: true,
    fogDensityScale: 1.0,
    waterAnimate: true,
  },
  high: {
    key: 'high',
    shadows: 4096,
    dpr: [1, 1.75],
    particles: 1,
    antialias: true,
    fogDensityScale: 0.82,
    waterAnimate: true,
  },
}

let current = null

export function detectQuality() {
  if (current) return current
  if (typeof navigator === 'undefined') {
    current = QUALITY.medium
    return current
  }
  const cores = navigator.hardwareConcurrency || 8
  const mem = navigator.deviceMemory || 8
  if (cores <= 2 || mem <= 2) current = QUALITY.low
  else if (cores <= 4 || mem <= 4) current = QUALITY.medium
  else current = QUALITY.high
  return current
}

export function getQuality() {
  return detectQuality()
}

// allow the player profile to be overridden (defaults to auto-detect)
let override = null
export function setQualityLevel(key) {
  override = QUALITY[key] || null
  current = override
  return current
}
