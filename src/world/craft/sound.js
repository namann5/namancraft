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

// ---- Ambient generative music (synth pads + sparse plucks) ----
// Off by default; preference persists in localStorage. Built entirely from
// oscillators — no audio files.

const MUSIC_KEY = 'namancraft-music-on'
let musicOn = null
let music = null // { ctx, master, timer }

function musicPref() {
  if (musicOn === null) {
    try {
      musicOn = localStorage.getItem(MUSIC_KEY) === '1'
    } catch {
      musicOn = false
    }
  }
  return musicOn
}

export function isMusicOn() {
  return musicPref()
}

// Resume from a user gesture (e.g. PLAY click) for returning visitors.
export function primeMusic() {
  if (musicPref() && !music) startMusic()
}

export function toggleMusic() {
  const next = !musicPref()
  try {
    localStorage.setItem(MUSIC_KEY, next ? '1' : '0')
  } catch {
    /* private mode */
  }
  musicOn = next
  if (next) startMusic()
  else stopMusic()
  return next
}

// C major-ish pad chords, low and warm: Cmaj7 Am7 Fmaj7 G6
const CHORDS = [
  [130.81, 196.0, 246.94, 329.63],
  [110.0, 164.81, 220.0, 261.63],
  [87.31, 174.61, 220.0, 261.63],
  [98.0, 196.0, 246.94, 293.66],
]
const PLUCKS = [523.25, 587.33, 659.25, 783.99, 880.0]
const BAR_SECONDS = 4.2

function scheduleBar(ac, master, filter, barIndex) {
  const t0 = ac.currentTime + 0.05
  const chord = CHORDS[barIndex % CHORDS.length]

  chord.forEach((freq, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = freq
    osc.detune.value = (i % 2 === 0 ? -5 : 5)
    const level = i === 0 ? 0.055 : 0.028 / Math.sqrt(i)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.linearRampToValueAtTime(level, t0 + 1.5)
    gain.gain.setValueAtTime(level, t0 + BAR_SECONDS - 1.2)
    gain.gain.linearRampToValueAtTime(0.0001, t0 + BAR_SECONDS + 0.6)
    osc.connect(gain).connect(filter)
    osc.start(t0)
    osc.stop(t0 + BAR_SECONDS + 0.8)
    master.oscillators.push(osc)
  })

  // sparse melody pluck with echo
  if (barIndex % 2 === 1 || Math.random() < 0.35) {
    const when = t0 + 1.4 + Math.random() * 1.8
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = PLUCKS[Math.floor(Math.random() * PLUCKS.length)]
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(0.05, when + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 1.1)
    osc.connect(gain).connect(master.echoIn)
    osc.start(when)
    osc.stop(when + 1.2)
    master.oscillators.push(osc)
  }
}

function startMusic() {
  if (music) return
  let ac
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    return
  }
  const master = ac.createGain()
  master.gain.value = 0.0001
  // gentle lowpass so the pads sit behind everything
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1100
  filter.Q.value = 0.4
  // feedback delay for the plucks
  const echoIn = ac.createGain()
  const echo = ac.createDelay(2.0)
  echo.delayTime.value = 0.42
  const echoFb = ac.createGain()
  echoFb.gain.value = 0.32
  echo.connect(echoFb).connect(echo)
  echoIn.connect(echo)
  echoIn.connect(filter)

  filter.connect(master)
  master.connect(ac.destination)

  music = { ctx: ac, master, timer: null }
  master.echoIn = echoIn
  master.oscillators = []

  master.gain.exponentialRampToValueAtTime(0.55, ac.currentTime + 2.5)

  let bar = 0
  scheduleBar(ac, master, filter, bar++)
  music.timer = setInterval(() => {
    if (!music) return
    scheduleBar(ac, master, filter, bar++)
  }, BAR_SECONDS * 1000)
}

function stopMusic() {
  if (!music) return
  const { ctx, master, timer } = music
  clearInterval(timer)
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime)
  master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1)
  music = null
  setTimeout(() => {
    ctx.close().catch(() => {})
  }, 1400)
}
