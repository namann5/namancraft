import { lazy } from 'react'

// ------------------------------------------------------------------
// Dimension registry.
//
// The four hub portals (PROJECTS / ACHIEVEMENTS / INFO / SOCIAL) each
// travel to a dedicated destination world. Components are lazy-loaded
// so a visitor only ever downloads and builds the world they travel to
// (performance requirement).
// spawn: where Naman appears + which way he faces (yaw, 0 = -Z).
// ------------------------------------------------------------------

export const WORLDS = {
  overworld: {
    id: 'overworld',
    name: 'NamanCraft',
    travelTitle: 'RETURNING TO NAMANCRAFT...',
    color: '#7b2fbf',
    color2: '#d8b4fe',
    Component: null, // rendered directly by WorldExperience (GLB world)
    spawn: { x: 2.2, z: 7.5, yaw: Math.PI }, // just south of the portal hub path
    sky: 'day',
  },
  'projects-world': {
    id: 'projects-world',
    name: 'The Skyline District',
    travelTitle: 'TRAVELING TO THE SKYLINE DISTRICT...',
    color: '#0a1020',
    color2: '#d8b4fe',
    Component: lazy(() => import('./ProjectsWorld')),
    spawn: { x: 0, z: 24, yaw: 0 },
    sky: 'city',
  },
  'achievements-world': {
    id: 'achievements-world',
    name: 'The Trophy Rotunda',
    travelTitle: 'TRAVELING TO THE TROPHY ROTUNDA...',
    color: '#3a2c4c',
    color2: '#d8b4fe',
    Component: lazy(() => import('./AchievementsWorld')),
    spawn: { x: 0, z: 26, yaw: 0 },
    sky: 'end',
  },
  'info-world': {
    id: 'info-world',
    name: 'The Moonlit Archive',
    travelTitle: 'TRAVELING TO THE MOONLIT ARCHIVE...',
    color: '#0d0618',
    color2: '#d8b4fe',
    Component: lazy(() => import('./InfoWorld')),
    spawn: { x: 0, z: 34, yaw: 0 },
    sky: 'end',
  },
  'social-world': {
    id: 'social-world',
    name: 'The Lantern Commons',
    travelTitle: 'TRAVELING TO THE LANTERN COMMONS...',
    color: '#2f4a36',
    color2: '#ffb03a',
    Component: lazy(() => import('./SocialWorld')),
    spawn: { x: 0, z: 16, yaw: 0 },
    sky: 'day',
  },
}

export function worldMeta(id) {
  return WORLDS[id] || WORLDS.overworld
}