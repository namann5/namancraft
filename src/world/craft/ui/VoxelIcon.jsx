// Original voxel-style item icons — hand-drawn SVG, no external/copyrighted assets.
// All icons live on a 16×16 grid with crisp edges for the pixel look.

const ICONS = {
  sword: (
    <g>
      <polygon points="7,2 8,0 9,2" fill="#f5f5f5" />
      <rect x="7" y="2" width="2" height="7" fill="#e0e0e0" />
      <rect x="7" y="2" width="1" height="7" fill="#fafafa" />
      <rect x="5" y="9" width="6" height="2" fill="#4d4d4d" />
      <rect x="7" y="11" width="2" height="4" fill="#7a4a2b" />
      <rect x="6" y="14" width="4" height="1" fill="#5a3620" />
    </g>
  ),
  redstone: (
    <g>
      <rect x="5" y="10" width="6" height="3" fill="#c22b20" />
      <rect x="4" y="12" width="8" height="2" fill="#8f1d15" />
      <rect x="6" y="9" width="3" height="1" fill="#ff4a3d" />
      <rect x="10" y="8" width="2" height="2" fill="#ff4a3d" />
      <rect x="3" y="8" width="2" height="2" fill="#e03328" />
      <rect x="7" y="6" width="2" height="2" fill="#e03328" />
      <rect x="11" y="5" width="1" height="2" fill="#ff4a3d" />
      <rect x="4" y="5" width="1" height="1" fill="#ff6a5e" />
    </g>
  ),
  diamond: (
    <g>
      <polygon points="8,1 13,6 8,15 3,6" fill="#3ecfe0" />
      <polygon points="8,1 13,6 8,6" fill="#aef3fa" />
      <polygon points="8,6 13,6 8,15" fill="#25a8bb" />
      <rect x="7" y="4" width="2" height="1" fill="#e8fdff" />
    </g>
  ),
  emerald: (
    <g>
      <polygon points="8,1 12,4 12,11 8,15 4,11 4,4" fill="#17c95c" />
      <rect x="5" y="5" width="2" height="6" fill="#4ee98a" />
      <polygon points="8,2 11,4 11,5 8,3" fill="#8ff7b4" />
      <polygon points="8,14 11,11 11,10 8,13" fill="#0f9443" />
    </g>
  ),
  book: (
    <g>
      <rect x="3" y="2" width="9" height="12" fill="#7b3fd4" />
      <rect x="3" y="2" width="2" height="12" fill="#9a63ea" />
      <rect x="12" y="3" width="2" height="10" fill="#efe6cf" />
      <rect x="11" y="4" width="1" height="8" fill="#d9cdb0" />
      <rect x="13" y="7" width="2" height="2" fill="#ffd166" />
      <rect x="6" y="5" width="4" height="1" fill="#b58af1" />
      <rect x="6" y="8" width="4" height="1" fill="#b58af1" />
    </g>
  ),
  chest: (
    <g>
      <rect x="2" y="6" width="12" height="8" fill="#8a5a2b" />
      <rect x="2" y="3" width="12" height="3" fill="#a06a33" />
      <rect x="2" y="6" width="12" height="1" fill="#59371a" />
      <rect x="2" y="13" width="12" height="1" fill="#59371a" />
      <rect x="7" y="5" width="2" height="3" fill="#f2c14e" />
      <rect x="7" y="6" width="2" height="1" fill="#8a6a1f" />
    </g>
  ),
  compass: (
    <g>
      <rect x="3" y="3" width="10" height="10" fill="#5d6570" />
      <rect x="4" y="4" width="8" height="8" fill="#d8cfc0" />
      <polygon points="8,5 9,8 8,11 7,8" fill="#d43b3b" />
      <polygon points="5,8 8,7 11,8 8,9" fill="#f4f1ea" opacity="0.85" />
      <rect x="7" y="7" width="2" height="2" fill="#2b2b2b" />
    </g>
  ),
  obsidian: (
    <g>
      <polygon points="2,5 6,2 14,2 10,5" fill="#241a33" />
      <polygon points="10,5 14,2 14,10 10,13" fill="#1a1126" />
      <rect x="2" y="5" width="8" height="8" fill="#120c1c" />
      <rect x="3" y="7" width="2" height="1" fill="#3a2b52" />
      <rect x="7" y="10" width="2" height="1" fill="#3a2b52" />
      <rect x="11" y="6" width="1" height="3" fill="#2c2140" />
    </g>
  ),
  command: (
    <g>
      <polygon points="2,5 6,2 14,2 10,5" fill="#c97a3a" />
      <polygon points="10,5 14,2 14,10 10,13" fill="#8a4f24" />
      <rect x="2" y="5" width="8" height="8" fill="#a4622d" />
      <rect x="3" y="6" width="2" height="2" fill="#5c3416" />
      <rect x="6" y="6" width="2" height="2" fill="#5c3416" />
      <rect x="4" y="9" width="2" height="2" fill="#5c3416" />
      <rect x="7" y="9" width="2" height="2" fill="#5c3416" />
    </g>
  ),
  bucket: (
    <g>
      <rect x="3" y="4" width="10" height="2" fill="#c6ccd4" />
      <polygon points="4,6 12,6 11,14 5,14" fill="#9aa0a8" />
      <rect x="5" y="6" width="6" height="2" fill="#3a86c8" />
      <polygon points="5,3 8,1 11,3" fill="none" stroke="#c6ccd4" strokeWidth="1" />
    </g>
  ),
  anvil: (
    <g>
      <rect x="3" y="4" width="10" height="3" fill="#4a5058" />
      <rect x="3" y="4" width="10" height="1" fill="#6b737d" />
      <rect x="7" y="7" width="2" height="2" fill="#3a4048" />
      <rect x="5" y="9" width="6" height="2" fill="#4a5058" />
      <rect x="4" y="11" width="8" height="2" fill="#31363c" />
    </g>
  ),
  star: (
    <g>
      <rect x="7" y="1" width="2" height="14" fill="#ffe98a" />
      <rect x="1" y="7" width="14" height="2" fill="#ffe98a" />
      <rect x="4" y="4" width="2" height="2" fill="#fff3c4" />
      <rect x="10" y="4" width="2" height="2" fill="#fff3c4" />
      <rect x="4" y="10" width="2" height="2" fill="#fff3c4" />
      <rect x="10" y="10" width="2" height="2" fill="#fff3c4" />
      <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
    </g>
  ),
  note: (
    <g>
      <rect x="9" y="1" width="2" height="10" fill="#efe6cf" />
      <polygon points="11,1 15,3 15,5 11,4" fill="#efe6cf" />
      <rect x="4" y="9" width="6" height="3" fill="#ffd166" />
      <rect x="3" y="10" width="8" height="2" fill="#ffd166" />
      <rect x="4" y="12" width="5" height="2" fill="#e0a93f" />
    </g>
  ),
  camera: (
    <g>
      <rect x="3" y="3" width="10" height="10" rx="0" fill="#3b3540" />
      <rect x="3" y="3" width="10" height="2" fill="#544d5c" />
      <rect x="5" y="1" width="6" height="3" fill="#544d5c" />
      <rect x="5" y="5" width="6" height="6" fill="#e88ab0" />
      <rect x="6" y="6" width="2" height="2" fill="#f7c1d8" />
      <rect x="11" y="4" width="1" height="1" fill="#ffd166" />
    </g>
  ),
  grass: (
    <g>
      <polygon points="2,4 8,1 14,4 8,7" fill="#7ec850" />
      <polygon points="8,1 14,4 14,11 8,14" fill="#6bb043" />
      <polygon points="2,4 8,7 8,14 2,11" fill="#5c9a38" />
      <polygon points="2,11 8,14 14,11 14,13 8,16 2,13" fill="#7a4a2b" />
      <polygon points="2,4 8,7 8,9 2,6" fill="#95d86a" />
      <rect x="5" y="3" width="1" height="1" fill="#a8e58a" />
      <rect x="10" y="3" width="1" height="1" fill="#a8e58a" />
    </g>
  ),
  map: (
    <g>
      <rect x="2" y="3" width="12" height="10" fill="#e8dcbe" />
      <rect x="2" y="3" width="12" height="1" fill="#cfc0a0" />
      <rect x="2" y="12" width="12" height="1" fill="#cfc0a0" />
      <polyline
        points="3,11 6,8 8,10 11,5"
        fill="none"
        stroke="#c0392b"
        strokeWidth="1"
        strokeDasharray="2 1"
      />
      <rect x="10" y="4" width="2" height="2" fill="#3ddc84" />
      <rect x="3" y="10" width="2" height="2" fill="#5ec8f0" />
    </g>
  ),
  trophy: (
    <g>
      <rect x="5" y="2" width="6" height="6" fill="#f2c14e" />
      <rect x="5" y="2" width="2" height="6" fill="#ffe066" />
      <rect x="4" y="3" width="1" height="3" fill="#d9a52f" />
      <rect x="11" y="3" width="1" height="3" fill="#d9a52f" />
      <rect x="6" y="8" width="4" height="2" fill="#d9a52f" />
      <rect x="5" y="10" width="6" height="2" fill="#8a5a2b" />
      <rect x="4" y="12" width="8" height="2" fill="#a06a33" />
      <rect x="6" y="4" width="4" height="1" fill="#fff3c4" opacity="0.7" />
    </g>
  ),
  enderchest: (
    <g>
      <rect x="2" y="6" width="12" height="8" fill="#2c2140" />
      <rect x="2" y="3" width="12" height="3" fill="#38294f" />
      <rect x="2" y="6" width="12" height="1" fill="#191226" />
      <rect x="2" y="13" width="12" height="1" fill="#191226" />
      <rect x="6" y="7" width="4" height="4" fill="#12c2a0" />
      <rect x="7" y="8" width="2" height="2" fill="#5cf5d4" />
      <rect x="3" y="4" width="2" height="1" fill="#12c2a0" opacity="0.65" />
      <rect x="11" y="4" width="2" height="1" fill="#12c2a0" opacity="0.65" />
    </g>
  ),
}

export default function VoxelIcon({ type, size = 32 }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[type] ?? ICONS.star}
    </svg>
  )
}
