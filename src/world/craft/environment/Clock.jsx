import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { LANDMARKS } from './landmarks'

// Blocky 3x5 pixel glyphs — drawn by hand, no font files.
const GLYPHS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
  A: ['111', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['111', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  G: ['111', '100', '101', '101', '111'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
}

const CELL = 12
const CANVAS_W = 29 * CELL // 6 digits(3+1 gap) + 2 colons(1+1 gap) - 1
const CANVAS_H = 9 * CELL

// Original cute voxel cat (Hello-Kitty inspired, not a trademark copy):
// a round white head with a pink bow, tiny eyes and a nose. Drawn at a
// small cell size so it sits in the clock face's upper-right corner.
const CAT = [
  '..yyyyy.yyyy..',
  '.yppyyyyyyppp.',
  'ypppPyyyyyPppp',
  '.yypyyyyyypyy.',
  '....yyyyyyyy..',
  '...yryyyyyy...',
  '..yrrrrrrrry..',
  '..yrrepssery..',
  '...yryyyyyr...',
  '....yyyyyy....',
  '....yysyys....',
  '....yyysyy....',
  '...yyyyyyyy...',
  '...yyyyyyyy...',
  '..yy.yyyy.yy..',
  '..yy.yyyy.yy..',
]
const CAT_COLORS = {
  y: '#ffffff', // fur
  p: '#ffb6d9', // bow / ears
  P: '#ff9cc9', // bow shade
  r: '#ff8bb0', // pink muzzle
  e: '#2a2530', // eyes
  s: '#ffcf6b', // nose / whisker dots
  '.': null,
}

const CAT_ROW = 2 * CELL
const CAT_CELL = 4
const CAT_X = CANVAS_W - 19 * CAT_CELL
const CAT_Y = CAT_ROW + 1 * CELL

function paintCat(ctx) {
  CAT.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) {
      const ch = row[c]
      const col = CAT_COLORS[ch]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(CAT_X + c * CAT_CELL, CAT_Y + r * CAT_CELL, CAT_CELL, CAT_CELL)
    }
  })
}

const TAGLINE_LINES = ['BUILDING DREAMS', 'ONE COMMIT AT A TIME']
const TAG_CELL = 8
// longest line drives the canvas width; each glyph advances 4 cells
const TAG_W = Math.max(...TAGLINE_LINES.map((l) => l.length)) * 4 * TAG_CELL
const TAG_H = TAGLINE_LINES.length * 8 * TAG_CELL

function paintDigits(ctx, timeStr) {
  ctx.fillStyle = '#0d0a16'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = '#221a30'
  ctx.fillRect(0, 0, CANVAS_W, CELL / 2)
  ctx.fillRect(0, CANVAS_H - CELL / 2, CANVAS_W, CELL / 2)

  // compress the time toward the left so a corner stays free for the cat
  ctx.save()
  ctx.translate(0, 0)
  ctx.scale(0.76, 1)

  let x = CELL
  for (const ch of timeStr) {
    const glyph = GLYPHS[ch]
    const w = ch === ':' ? 1 : 3
    for (let r = 0; r < 5; r += 1) {
      for (let cc = 0; cc < w; cc += 1) {
        if (glyph[r][cc] === '1') {
          const px = x + cc * CELL
          const py = (2 + r) * CELL
          ctx.fillStyle = 'rgba(255, 160, 66, 0.34)'
          ctx.fillRect(px - 2, py - 2, CELL + 4, CELL + 4)
          ctx.fillStyle = 'rgb(255, 176, 80)'
          ctx.fillRect(px, py, CELL, CELL)
        }
      }
    }
    x += (w + 1) * CELL
  }
  ctx.restore()
}

function paintTagline(ctx) {
  ctx.clearRect(0, 0, TAG_W, TAG_H)
  TAGLINE_LINES.forEach((line, li) => {
    const indent = ((TAG_W / TAG_CELL) - line.length * 4 + 3) / 2
    let x = Math.round(indent) * TAG_CELL
    const rowBase = (li * 8 + 1) * TAG_CELL
    for (const ch of line) {
      if (ch !== ' ') {
        const glyph = GLYPHS[ch]
        if (glyph) {
          for (let r = 0; r < 5; r += 1) {
            for (let cc = 0; cc < 3; cc += 1) {
              if (glyph[r][cc] === '1') {
                ctx.fillStyle = 'rgba(255, 190, 110, 0.20)'
                ctx.fillRect(x + cc * TAG_CELL - 1, rowBase + r * TAG_CELL - 1, TAG_CELL + 2, TAG_CELL + 2)
                ctx.fillStyle = 'rgb(228, 172, 96)'
                ctx.fillRect(x + cc * TAG_CELL, rowBase + r * TAG_CELL, TAG_CELL, TAG_CELL)
              }
            }
          }
        }
      }
      x += 4 * TAG_CELL
    }
  })
}

function makeTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// In-world giant clock: emissive canvas dial showing the visitor's local time,
// plus a small tagline strip. Mounted on the lakeside clock wall.
export default function Clock() {
  const rig = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const mat = new THREE.MeshBasicMaterial({ map: makeTex(canvas), toneMapped: false })

    const tagCanvas = document.createElement('canvas')
    tagCanvas.width = TAG_W
    tagCanvas.height = TAG_H
    paintTagline(tagCanvas.getContext('2d'))
    const tagMat = new THREE.MeshBasicMaterial({
      map: makeTex(tagCanvas),
      transparent: true,
      toneMapped: false,
    })

    const geo = new THREE.PlaneGeometry(8.2, (CANVAS_H / CANVAS_W) * 8.2)
    const tagGeo = new THREE.PlaneGeometry(3.6, (TAG_H / TAG_W) * 3.6)
    return { canvas, tex: mat.map, mat, tagMat, geo, tagGeo }
  }, [])

  // redraw when the second flips
  useEffect(() => {
    let last = ''
    const render = () => {
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      const str = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
      if (str !== last) {
        last = str
        const ctx = rig.canvas.getContext('2d')
        paintDigits(ctx, str)
        paintCat(ctx)
        rig.tex.needsUpdate = true
      }
    }
    render()
    const timer = setInterval(render, 250)
    return () => clearInterval(timer)
  }, [rig])

  // soft pulse so the display feels alive
  useEffect(() => {
    let raf
    const tick = (t) => {
      rig.mat.color.setScalar(0.92 + Math.sin(t * 0.0021) * 0.08)
      rig.tagMat.color.setScalar(rig.mat.color.value)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rig])

  useEffect(() => () => {
    rig.tex.dispose()
    rig.mat.dispose()
    rig.tagMat.map?.dispose()
    rig.tagMat.dispose()
    rig.geo.dispose()
    rig.tagGeo.dispose()
  }, [rig])

  const s = LANDMARKS.clockScreen
  const t = LANDMARKS.clockTagline
  return (
    <group>
      <mesh geometry={rig.geo} material={rig.mat} position={[s.x, s.y, s.z]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={rig.tagGeo} material={rig.tagMat} position={[t.x, t.y, t.z]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  )
}
