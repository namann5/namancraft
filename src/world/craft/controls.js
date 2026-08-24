// Shared pointer-lock handle so UI outside the Canvas can grab input.
export const worldControls = { current: null }

// Live player eye position, updated by Player each frame.
export const playerEye = { x: 0, y: 20, z: 0 }

// Camera position when the walking intro begins (behind Naman, high).
export const INTRO_CAM_START = [1.7, 11.2, 17.6]
