import { create } from 'zustand'
import { makeHeightField } from '../terrain'

// ------------------------------------------------------------------
// Multi-world state.
//
// Two layers:
// - zustand store: React-visible state (which dimension is active,
//   travel overlay state). Components subscribe to this.
// - mutable singletons below: read every frame inside useFrame
//   without triggering renders (active field, travel freeze flag).
// ------------------------------------------------------------------

export const useWorldStore = create((set) => ({
  // 'overworld' | 'nether' | 'end' | 'skills' | 'projects'
  world: 'overworld',
  // null | { to, color, title, phase: 'out' | 'hold' | 'in' }
  travel: null,

  setWorld: (world) => set({ world }),
  // accepts a value or an updater fn like React setState
  setTravel: (input) =>
    set((s) => ({
      travel: typeof input === 'function' ? input(s.travel) : input,
    })),
}))

// imperative helpers for use outside React hooks
export const setWorld = (world) => useWorldStore.getState().setWorld(world)
export const setTravel = (input) => useWorldStore.getState().setTravel(input)

// ---- collision fields ------------------------------------------------
// Each dimension registers a heightfield with the same shape as
// terrain.js makeHeightField(): { minX, maxX, minZ, maxZ, groundAt }.

const fields = new Map()
const fieldListeners = new Set()

export function setField(id, field) {
  fields.set(id, field)
  fieldListeners.forEach((fn) => fn(id, field))
}

export function getField(id) {
  return fields.get(id) || null
}

export function subscribeFields(fn) {
  fieldListeners.add(fn)
  return () => fieldListeners.delete(fn)
}

// The overworld GLB colliders are fetched once and shared by the hub
// portals (they need ground heights to place themselves).
let overworldFieldPromise = null
export function loadOverworldField() {
  if (!overworldFieldPromise) {
    overworldFieldPromise = fetch(`${import.meta.env.BASE_URL}models/world/colliders.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`colliders.json ${r.status}`)
        return r.json()
      })
      .then((colliders) => {
        const field = makeHeightField(colliders)
        setField('overworld', field)
        return field
      })
  }
  return overworldFieldPromise
}

// ---- arrival hint (spawn at an overworld hub portal on return) ------
// beginTravel sets this before swapping worlds; Player consumes it on
// the next placeAtSpawn call so the avatar appears at the correct hub.
let arrival = null
export function getArrival() { return arrival }
export function setArrival(next) { arrival = next }

// ---- per-frame travel flag -------------------------------------------
// Player reads this every frame; kept outside React on purpose.
export const travelFx = {
  active: false,
  color: '#ffffff',
  fovPunch: 0, // 0..1, driven down by Player each frame
}
