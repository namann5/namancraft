import Lenis from 'lenis'

let lenis = null
let rafId = null

export const scrollState = {
  progress: 0,
  velocity: 0,
  scroll: 0,
  limit: 0,
}

function raf(time) {
  lenis.raf(time)
  rafId = requestAnimationFrame(raf)
}

export function initLenis() {
  if (lenis) return lenis
  lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    lerp: 0.09,
    wheelMultiplier: 1,
  })

  lenis.on('scroll', (e) => {
    scrollState.progress = e.progress
    scrollState.velocity = e.velocity
    scrollState.scroll = e.scroll
    scrollState.limit = e.limit
  })

  rafId = requestAnimationFrame(raf)
  return lenis
}

export function destroyLenis() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
  if (lenis) {
    lenis.destroy()
    lenis = null
  }
}

export function getLenis() {
  return lenis
}

export function scrollTo(target, options) {
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - (1 - t) ** 3, ...options })
  } else {
    window.scrollTo({ top: typeof target === 'number' ? target : 0, behavior: 'smooth' })
  }
}
