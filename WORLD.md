# THE WORLD — Naman Singh Portfolio

A scroll-driven 3D mountain world, inspired by sebastien-lempens.com (Awwwards SOTD).
Reference pillars: React Three Fiber world, scroll-synced camera, cinematic atmosphere,
sound, smooth scroll, obsessive performance.

> This file is the single source of truth across sessions. Read it at the start of every
> loop, update status as you go, and append decisions. Keep it honest.

---

## Vision

Visitors arrive in a misty valley at dawn. As they scroll, the camera climbs a
procedurally generated mountain range — fog, sun, stars — stopping at viewpoints that
tell Naman's story: live GitHub numbers, selected work, the summit (about), base camp
(contact). Sub-pages keep the world alive behind their content.

**Theme:** mountains / peaks / nature. **Feel:** calm, vast, cinematic, not flashy.

## World rules (design contract)

- Dark green-black base `#0c120e`; misty teal-gold atmosphere; warm sun, cold stars.
- Mono (Geist Mono) for labels/eyebrows; Fraunces serif for display (hero, page titles).
- Camera never jerks — always damped/lerped. Fog does most of the depth work.
- Respect `prefers-reduced-motion`: camera slows to a gentle drift, no parallax.
- Mobile: world renders, camera path simplified, no DOM chapter drift.
- Performance budget: `< 300k triangles`, `< 8 draw calls overhead over baseline`,
  target 60fps on mid phones (frameloop throttling + dpr clamp).

## Brand identity (refined)

- **Name:** Naman Singh
- **Line:** "Creative Developer"
- **Tagline:** I build AI that catches deepfakes, software that drives cars, and
  interfaces people actually use.
- **Palette:** see `src/world/config.js`.
- **Fonts:** Geist Mono (labels) + Fraunces (display). Self-host both (Loop 6).

## Current stack

React 19 + Vite 8 + Tailwind 4 + oxlint. World: three, @react-three/fiber,
@react-three/drei, lenis. Live data: GitHub + LeetCode fallback libs (no backend).

## Loop log (append each session)

| Loop | Date | Work done | Status |
| --- | --- | --- | --- |
| 1 | session start | World foundation: procedural terrain, sky/sun/stars, scroll camera, hub + sub-page backdrops, nature palette | done |
| 2 | — | Postprocessing (bloom/vignette), wind/dust particles, day→dusk light tied to scroll | next |
| 3 | — | Projects as 3D peak markers; hover/click to open sub-pages | next |
| 4 | — | Sound: ambient wind + birds + pad, toggle (Lempens-style) | next |
| 5 | — | Cinematic preloader/intro, custom cursor, chapter transitions polish | next |
| 6 | — | Performance pass: instancing, LOD, dpr clamp, self-hosted fonts, a11y + reduced-motion audit | next |
| 7 | — | Blender hero asset (bird/rider/glider) GLB + animation | next |
| 8 | — | Award-grade polish, OG/meta, case-study pages, launch | next |

## Open decisions

- 3D: primitives now, Blender later (chosen).
- Structure: world hub + sub-pages (chosen).
- Sound toggle default: on (only after user gesture, browser policy).
