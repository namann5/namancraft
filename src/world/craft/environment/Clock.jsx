import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { LANDMARKS } from './landmarks'

// Blocky 3x5 pixel digits — drawn by hand, no font files.
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
}

const CELL = 8
const CANVAS_W = 29 * CELL // 6 digits(3+1 gap) + 2 colons(1+1 gap) - 1
const CANVAS_H = 9 * CELL

function paint(ctx, timeStr) {
  ctx.fillStyle = '#120e1a'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  // subtle frame
  ctx.fillStyle = '#241b30'
  ctx.fillRect(0, 0, CANVAS_W, CELL / 2)
  ctx.fillRect(0, CANVAS_H - CELL / 2, CANVAS_W, CELL / 2)

  let x = CELL
  for (const ch of timeStr) {
    const glyph = GLYPHS[ch]
    const w = ch === ':' ? 1 : 3
    for (let r = 0; r < 5; r += 1) {
      for (let cc = 0; cc < w; cc += 1) {
        if (glyph[r][cc] === '1') {
          const px = x + cc * CELL
          const py = (2 + r) * CELL
          ctx.fillStyle = 'rgba(255, 150, 60, 0.28)'
          ctx.fillRect(px - 2, py - 2, CELL + 4, CELL + 4)
          ctx.fillStyle = 'rgb(255, 158, 56)'
          ctx.fillRect(px, py, CELL, CELL)
        }
      }
    }
    x += (w + 1) * CELL
  }
}

// In-world digital clock: emissive canvas screen showing the visitor's local
// time. Mounted on the lakeside stone tower built by build_world.py.
export default function Clock() {
  const rig = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    const geo = new THREE.PlaneGeometry(4.3, (CANVAS_H / CANVAS_W) * 4.3)
    return { canvas, tex, mat, geo }
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
        paint(rig.canvas.getContext('2d'), str)
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
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rig])

  const { x, y, z } = LANDMARKS.clockScreen
  return (
    <mesh geometry={rig.geo} material={rig.mat} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]} />
  )
}
