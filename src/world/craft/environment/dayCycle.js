// Shared day/night state + color ramps. One writer (DayNightCycle), many
// readers (sky shader, clouds, torch flicker). t: 0=midnight 0.25=sunrise
// 0.5=noon 0.75=sunset. Starts at golden hour to match the classic look.

export const DAY_LENGTH = 420 // seconds per full cycle

export const dayState = {
  t: 0.72,
  daylight: 0.55, // 0 night .. 1 full day
  dusk: 1, // 1 at golden hour, 0 otherwise
  glowBoost: 1.9, // emissive multiplier for beacons/torches
}

// Registries populated by the owning components on mount.
export const skyReg = { uniforms: null }
export const cloudsReg = { group: null }

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function makeRamp(stops) {
  return stops.map(([stop, hex]) => ({ stop, rgb: hexToRgb(hex) }))
}
export { makeRamp }
export function sampleRamp(ramp, x, out = [0, 0, 0]) {
  if (x <= ramp[0].stop) {
    out[0] = ramp[0].rgb[0]; out[1] = ramp[0].rgb[1]; out[2] = ramp[0].rgb[2]
    return out
  }
  for (let i = 1; i < ramp.length; i += 1) {
    if (x <= ramp[i].stop) {
      const a = ramp[i - 1]
      const b = ramp[i]
      const f = (x - a.stop) / (b.stop - a.stop || 1)
      out[0] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f
      out[1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f
      out[2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f
      return out
    }
  }
  const last = ramp[ramp.length - 1]
  out[0] = last.rgb[0]; out[1] = last.rgb[1]; out[2] = last.rgb[2]
  return out
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// Keyframes over sun elevation e (-1..1)
export const ZENITH = makeRamp([
  [-1.0, '#060a18'],
  [-0.25, '#0b1026'],
  [0.0, '#2c3a66'],
  [0.35, '#4d7ec9'],
  [1.0, '#3f74c9'],
])
export const HORIZON = makeRamp([
  [-1.0, '#0e1530'],
  [-0.25, '#131b38'],
  [0.0, '#ffb36b'],
  [0.35, '#bfd9ef'],
  [1.0, '#cfe6f5'],
])
export const FOG = makeRamp([
  [-1.0, '#0d1226'],
  [-0.25, '#151b33'],
  [0.0, '#e8a06a'],
  [0.35, '#c7d8e8'],
  [1.0, '#d4e4f2'],
])
export const SUNLIGHT = makeRamp([
  [0.0, '#ff9d54'],
  [0.15, '#ffb36b'],
  [0.5, '#ffe8c4'],
  [1.0, '#fff6e6'],
])
export const HEMI_SKY = makeRamp([
  [-0.25, '#24304f'],
  [0.0, '#8f7ba0'],
  [0.4, '#ffd9a0'],
  [1.0, '#cfe0f0'],
])
export const HEMI_GROUND = makeRamp([
  [-0.25, '#141220'],
  [0.0, '#4a3b2f'],
  [1.0, '#5a4a38'],
])
export const SUN_DISC = makeRamp([
  [0.0, '#ffce8f'],
  [0.3, '#fff3d6'],
  [1.0, '#ffffff'],
])

// Advance simulation by dt seconds and refresh derived values.
export function stepDay(dt) {
  dayState.t = (dayState.t + dt / DAY_LENGTH) % 1
  const theta = (dayState.t - 0.25) * Math.PI * 2
  const sy = Math.sin(theta)
  dayState.daylight = smoothstep(-0.06, 0.22, sy)
  const above = Math.max(sy, 0)
  dayState.dusk = Math.exp(-(((above - 0.06) / 0.14) ** 2))
  dayState.glowBoost = 1 + (1 - dayState.daylight) * 1.1
  return { sy, sx: Math.cos(theta) }
}
