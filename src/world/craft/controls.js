// Shared pointer-lock handle so UI outside the Canvas can grab input.
export const worldControls = { current: null }

// Live player eye position, updated by Player each frame. Read by the menu
// camera rig for the cinematic fly-in handoff.
export const playerEye = { x: 0, y: 20, z: 0 }
