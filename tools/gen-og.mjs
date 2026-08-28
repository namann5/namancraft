// Generates a NamanCraft social-preview image (public/og.png) from an
// inline SVG, rasterized with sharp. Run: node tools/gen-og.mjs
import fs from 'node:fs'
import sharp from 'sharp'

const W = 1200
const H = 630

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070b18"/>
      <stop offset="0.55" stop-color="#10182e"/>
      <stop offset="1" stop-color="#2b1f3d"/>
    </linearGradient>
    <radialGradient id="portal" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7b2fbf"/>
      <stop offset="0.55" stop-color="#4c1d7a"/>
      <stop offset="1" stop-color="#1a0a2e"/>
    </radialGradient>
    <radialGradient id="lantern" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffcf7a"/>
      <stop offset="0.4" stop-color="#ffb37a" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffb37a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- night sky -->
  <rect width="${W}" height="${H}" fill="url(#sky)"/>

  <!-- stars -->
  <g fill="#dfe8ff" opacity="0.8">
    <rect x="90"  y="60"  width="4" height="4"/>
    <rect x="240" y="130" width="3" height="3"/>
    <rect x="420" y="70"  width="5" height="5"/>
    <rect x="620" y="110" width="3" height="3"/>
    <rect x="760" y="50"  width="4" height="4"/>
    <rect x="940" y="140" width="4" height="4"/>
    <rect x="1080" y="80" width="3" height="3"/>
    <rect x="150" y="200" width="3" height="3"/>
    <rect x="560" y="180" width="4" height="4"/>
    <rect x="880" y="210" width="3" height="3"/>
  </g>

  <!-- purple portal glow (right) -->
  <ellipse cx="920" cy="330" rx="180" ry="190" fill="url(#portal)"/>
  <ellipse cx="920" cy="330" rx="95" ry="175" fill="#9a4ad1" opacity="0.55"/>
  <ellipse cx="920" cy="330" rx="70" ry="150" fill="#c084fc" opacity="0.4"/>
  <ellipse cx="920" cy="330" rx="42" ry="122" fill="#e0c3ff" opacity="0.5"/>

  <!-- ground / horizon line with a few block silhouettes -->
  <rect x="0" y="420" width="${W}" height="${H-420}" fill="#0d1420"/>
  <rect x="120" y="360" width="70" height="60" fill="#1c2436"/>
  <rect x="160" y="330" width="34" height="30" fill="#232c40"/>
  <rect x="300" y="380" width="50" height="40" fill="#18202f"/>
  <rect x="330" y="350" width="22" height="30" fill="#202a3d"/>

  <!-- clock tower silhouette (left) -->
  <rect x="56" y="300" width="96" height="120" fill="#1a2233"/>
  <rect x="48" y="280" width="112" height="24" fill="#223047"/>
  <rect x="62" y="250" width="84" height="30" fill="#1d2638"/>
  <!-- clock face -->
  <rect x="82" y="258" width="44" height="14" fill="#241d34"/>
  <rect x="86" y="261" width="8" height="8" fill="#ffb050"/>
  <rect x="98" y="261" width="4" height="4" fill="#ffb050"/>
  <rect x="108" y="261" width="6" height="6" fill="#ffb050"/>

  <!-- warm lanterns -->
  <ellipse cx="220" cy="470" rx="120" ry="60" fill="url(#lantern)"/>
  <rect x="214" y="430" width="12" height="22" fill="#ffcf7a"/>
  <rect x="720" y="450" width="10" height="18" fill="#ffcf7a" opacity="0.9"/>

  <!-- title -->
  <text x="80" y="170" font-family="monospace" font-size="84" font-weight="bold"
        fill="#f4f1ea">NAMAN</text>
  <text x="80" y="238" font-family="monospace" font-size="84" font-weight="bold"
        fill="#f4f1ea">CRAFT</text>
  <text x="80" y="290" font-family="monospace" font-size="30" fill="#c084fc" letter-spacing="6">
    EXPLORE · BUILD · CREATE
  </text>
  <text x="80" y="332" font-family="monospace" font-size="22" fill="#9aa39a" letter-spacing="2">
    Naman Singh — Creative Full Stack Developer
  </text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile('public/og.png')
console.log('wrote public/og.png')
