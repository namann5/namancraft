import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getAtlasTexture } from './textures'

// ------------------------------------------------------------------
// VoxelMesh — renders the geometries produced by buildVoxelGeometry
// (solid + glow [+ water]) with Minecraft-like materials:
//   - solid: a single nearest-filtered pixel atlas, tinted by the
//     per-block vertex colour (directional shading + baked AO)
//   - glow:  unlit vertex colours (lava / neon / windows / lamps)
//   - water: translucent animated surface (if any)
// One draw call per bucket.
// ------------------------------------------------------------------

function makeSolidMaterial() {
  const tex = getAtlasTexture()
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: tex,
    toneMapped: true,
  })
  return mat
}

function makeGlowMaterial() {
  return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
}

function makeWaterMaterial() {
  const tex = getAtlasTexture()
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    map: tex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  return mat
}

export default function VoxelMesh({ geo, water = false }) {
  const solidMat = useMemo(makeSolidMaterial, [])
  const glowMat = useMemo(makeGlowMaterial, [])
  const waterMat = useMemo(makeWaterMaterial, [])

  useEffect(
    () => () => {
      solidMat.dispose()
      glowMat.dispose()
      waterMat.dispose()
    },
    [solidMat, glowMat, waterMat],
  )

  return (
    <>
      {geo.solid && (
        <mesh geometry={geo.solid} material={solidMat} receiveShadow castShadow />
      )}
      {geo.glow && <mesh geometry={geo.glow} material={glowMat} />}
      {water && geo.water && (
        <mesh geometry={geo.water} material={waterMat} />
      )}
    </>
  )
}
