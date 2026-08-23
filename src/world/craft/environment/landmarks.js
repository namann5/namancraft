// Runtime landmark anchors printed by tools/blender/build_world.py
// Coordinates are three.js space (x, up, -z).
export const LANDMARKS = {
  clockScreen: { x: -22.92, y: 13, z: -10 },
  clockTagline: { x: -22.9, y: 9.4, z: -10 },
  clockGround: 6,
  chimneyTop: { x: 30.5, y: 25.4, z: -52.5 },
  houseCenter: { x: 27.5, y: 9, z: -49.5 },
  houseLight: { x: 18.5, y: 14.5, z: -49.5 },
  clockLight: { x: -21.5, y: 13, z: -10 },
}

// Dedicated title-screen tripod pose. Framing math (hFOV ≈ 100°):
//   clock dial bearing ≈ -33° -> left third
//   house       bearing ≈ +27° -> right third
//   path/pond bottom center, forest + night sky above
export const MENU_CAM_POS = [-6, 15, 16]
