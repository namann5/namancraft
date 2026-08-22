// Shared mutable touch input state, written by TouchControls (DOM) and
// consumed by Player (inside Canvas) each frame.
export const touchInput = {
  active: false,
  moveX: 0,
  moveY: 0,
  lookDx: 0,
  lookDy: 0,
  jump: false,
}
