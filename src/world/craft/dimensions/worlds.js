import { lazy } from 'react'

// ------------------------------------------------------------------
// Dimension registry.
//
// Components are lazy-loaded so a visitor only ever downloads and
// builds the dimension they travel to (performance requirement #13).
// spawn: where Naman appears + which way he faces (yaw, 0 = -Z).
// ------------------------------------------------------------------

export const WORLDS = {
  overworld: {
    id: 'overworld',
    name: 'Overworld',
    travelTitle: 'RETURNING TO OVERWORLD...',
    color: '#8fd0ff',
    color2: '#e6f4ff',
    Component: null, // rendered directly by WorldExperience (GLB world)
    spawn: { x: 2.2, z: 7.5, yaw: Math.PI }, // just south of the portal hub path
    sky: 'day',
  },
  nether: {
    id: 'nether',
    name: 'The Nether',
    travelTitle: 'TRAVELING TO THE NETHER...',
    color: '#ff5a26',
    color2: '#ffd23e',
    Component: lazy(() => import('./NetherWorld')),
    spawn: { x: 0, z: 36, yaw: 0 },
    sky: 'nether',
  },
  end: {
    id: 'end',
    name: 'The End',
    travelTitle: 'TRAVELING TO THE END...',
    color: '#b06ae8',
    color2: '#e8ccff',
    Component: lazy(() => import('./EndWorld')),
    spawn: { x: 0, z: 12, yaw: 0 },
    sky: 'end',
  },
  skills: {
    id: 'skills',
    name: 'Tech Realm',
    travelTitle: 'TRAVELING TO THE TECH REALM...',
    color: '#2ee6c8',
    color2: '#b0ffe9',
    Component: lazy(() => import('./SkillsWorld')),
    spawn: { x: 0, z: 34, yaw: 0 },
    sky: 'tech',
  },
  projects: {
    id: 'projects',
    name: 'Build District',
    travelTitle: 'TRAVELING TO THE BUILD DISTRICT...',
    color: '#ffc857',
    color2: '#ffe9b8',
    Component: lazy(() => import('./ProjectsWorld')),
    spawn: { x: 0, z: 33, yaw: 0 },
    sky: 'city',
  },
}

export function worldMeta(id) {
  return WORLDS[id] || WORLDS.overworld
}
