// Tiny WebAudio blips — no audio files needed.
// Hover: soft high tick. Click: chunky two-note thunk.

let ctx = null

function ensureCtx() {
  if (ctx) return ctx
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    ctx = null
  }
  return ctx
}

function tone(freq, duration, type = 'square', gainValue = 0.035, when = 0) {
  const ac = ensureCtx()
  if (!ac) return
  if (ac.state === 'suspended') {
    ac.resume()
  }
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ac.currentTime + when
  gain.gain.setValueAtTime(gainValue, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function muted() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const sfx = {
  hover() {
    if (muted()) return
    tone(520, 0.05, 'square', 0.02)
  },
  click() {
    if (muted()) return
    tone(196, 0.07, 'square', 0.04)
    tone(147, 0.09, 'square', 0.04, 0.055)
  },
  open() {
    if (muted()) return
    tone(262, 0.06, 'triangle', 0.03)
    tone(392, 0.08, 'triangle', 0.03, 0.06)
    tone(523, 0.1, 'triangle', 0.03, 0.12)
  },
}
