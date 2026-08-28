import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

// ------------------------------------------------------------------
// VoxelSign — painted canvas-texture sign boards used across the
// dimensions. Uses the pixel font once it's loaded (fontsource loads
// it globally), falls back to monospace for the first frames.
// ------------------------------------------------------------------

export function makeTextTexture({ lines = [], width = 512, height = 256, bg = '#141419', border = '#000000', colors = ['#ffe066'], sizes = [64], shadow = true }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2

  const paint = () => {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)
    // chunky border
    const b = Math.max(6, Math.floor(width / 64))
    ctx.fillStyle = border
    ctx.fillRect(0, 0, width, b)
    ctx.fillRect(0, height - b, width, b)
    ctx.fillRect(0, 0, b, height)
    ctx.fillRect(width - b, 0, b, height)

    const total = lines.length
    lines.forEach((line, i) => {
      if (!line) return
      const size = sizes[Math.min(i, sizes.length - 1)]
      ctx.font = `${size}px "Press Start 2P", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const y = (height / (total + 1)) * (i + 1)
      const color = colors[Math.min(i, colors.length - 1)]
      if (shadow) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'
        ctx.fillText(line, width / 2 + size * 0.12, y + size * 0.12)
      }
      ctx.fillStyle = color
      ctx.fillText(line, width / 2, y)
    })
    texture.needsUpdate = true
  }

  paint()
  if (document.fonts?.load) {
    Promise.all([
      document.fonts.load('16px "Press Start 2P"'),
      document.fonts.ready,
    ]).then(paint).catch(() => {})
  }

  return texture
}

// Sign board on two posts. `position` = ground point, faces +Z then yaw.
export default function VoxelSign({
  position = [0, 0, 0],
  rotationY = 0,
  lines,
  colors = ['#ffe066'],
  bg = '#171720',
  width = 3.4,
  height = 1.5,
  postColor = '#3a3327',
}) {
  const tex = useMemo(
    () => makeTextTexture({ lines, colors, bg }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(lines), colors.join(), bg],
  )
  useEffect(() => () => tex.dispose(), [tex])

  const matRef = useRef(null)
  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, rotationY, 0]}>
      {/* posts */}
      <mesh position={[-width / 2 + 0.28, height / 2 - 0.55, 0]} castShadow>
        <boxGeometry args={[0.22, 1.1, 0.22]} />
        <meshLambertMaterial color={postColor} />
      </mesh>
      <mesh position={[width / 2 - 0.28, height / 2 - 0.55, 0]} castShadow>
        <boxGeometry args={[0.22, 1.1, 0.22]} />
        <meshLambertMaterial color={postColor} />
      </mesh>
      {/* board */}
      <mesh position={[0, height / 2 + 0.35, 0.08]} castShadow>
        <boxGeometry args={[width + 0.24, height + 0.24, 0.18]} />
        <meshLambertMaterial color="#20202a" />
      </mesh>
      <mesh position={[0, height / 2 + 0.35, 0.18]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={matRef} map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}
