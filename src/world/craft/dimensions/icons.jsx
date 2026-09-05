// ------------------------------------------------------------------
// VoxelIcon — tiny blocky emblem glyph built from unit cubes. Used by
// the hub portals so each gateway reads as PROJECTS / ACHIEVEMENTS /
// INFO / SOCIAL even before walking close enough to read its sign.
// `blocks` is a list of [x, y, z, color] cells on a 1-unit grid; each
// cell renders as a chunky 0.42-unit block.
// ------------------------------------------------------------------

export default function VoxelIcon({ blocks, position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b[0] * 0.42, b[1] * 0.42, b[2] * 0.42]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshLambertMaterial color={b[3]} />
        </mesh>
      ))}
    </group>
  )
}