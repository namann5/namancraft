# Loop 0 gray-box world: terrain, lake, spawn plaza, stone path, 5 zone plots.
# Exports world.glb + colliders.json. Run headless:
#   blender --background --factory-startup --python build_world.py

import bpy
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_voxel as vx

OUT_DIR = os.environ.get(
    "WORLD_OUT_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "models", "world")),
)

SIZE_X = 128
SIZE_Z = 128
ORIGIN_X = -64
ORIGIN_Z = -64
BASE_Y = 6
WATER_LEVEL = 5

PLAZA = (-6, -6, 6, 8)          # x0,z0,x1,z1 (top y forced to PLAZA_Y)
PLAZA_Y = 7
PATH_RECTS = [(-1, 8, 1, 88)]
PATH_Y = 7

ZONES = {
    "about":    {"rect": (-14, 16, -5, 24)},
    "stats":    {"rect": (5, 30, 14, 38)},
    "skills":   {"rect": (-14, 44, -5, 52)},
    "projects": {"rect": (5, 58, 18, 70)},
    "mine":     {"rect": (-14, 78, -5, 86)},
}
ZONE_Y = 7

LAKE = (-44, 8, -22, 40)        # ellipse-ish basin rect
LAKE_BOTTOM = 2

# Loop 9/10 landmarks
HOUSE_PAD = (15, 43, 38, 62)    # flatten rect (blender x,z)
HOUSE_Y = 9                     # plateau height of the house plot
CLOCK_PAD = (-29, 3, -19, 19)   # lakeside knoll for the clock wall
POND_CENTER = (11, 46)          # foreground pond (script coords)
POND_RX, POND_RZ = 3.4, 2.4


def in_rect(x, z, r):
    return r[0] <= x <= r[2] and r[1] <= z <= r[3]


def in_any_rect(x, z, rects, margin=0):
    return any(in_rect(x, z, (r[0] - margin, r[1] - margin, r[2] + margin, r[3] + margin)) for r in rects)


def in_lake(x, z):
    cx, cz = (LAKE[0] + LAKE[2]) / 2.0, (LAKE[1] + LAKE[3]) / 2.0
    rx, rz = (LAKE[2] - LAKE[0]) / 2.0, (LAKE[3] - LAKE[1]) / 2.0
    dx, dz = (x - cx) / rx, (z - cz) / rz
    return dx * dx + dz * dz <= 1.0


def build_heights():
    heights = [[BASE_Y for _ in range(SIZE_X)] for _ in range(SIZE_Z)]
    cx = SIZE_X / 2.0
    cz = SIZE_Z / 2.0
    for zz in range(SIZE_Z):
        for xx in range(SIZE_X):
            wx = ORIGIN_X + xx
            wz = ORIGIN_Z + zz
            n = vx.fbm(wx * 0.045, wz * 0.045, octaves=4, seed=7)
            h = BASE_Y + int((n - 0.5) * 6)
            # distant mountain ring
            d = max(abs(xx - cx) / cx, abs(zz - cz) / cz)
            if d > 0.72:
                ring = vx.fbm(wx * 0.09 + 40, wz * 0.09 + 40, octaves=3, seed=21)
                h += int((d - 0.72) / 0.28 * (10 + ring * 16))
            heights[zz][xx] = h

    # flatten built areas
    def flat(r, y):
        for zz in range(SIZE_Z):
            for xx in range(SIZE_X):
                if in_rect(ORIGIN_X + xx, ORIGIN_Z + zz, r):
                    heights[zz][xx] = y

    flat(PLAZA, PLAZA_Y)
    for r in PATH_RECTS:
        flat(r, PATH_Y)
    for zone in ZONES.values():
        flat(zone["rect"], ZONE_Y)
    flat(HOUSE_PAD, HOUSE_Y)
    # clock knoll: flatten to the local natural height (sampled at center)
    clock_y = heights[ORIGIN_Z + 11][ORIGIN_X + -24]
    flat(CLOCK_PAD, clock_y)

    # carve lake basin + sand shore
    for zz in range(SIZE_Z):
        for xx in range(SIZE_X):
            wx = ORIGIN_X + xx
            wz = ORIGIN_Z + zz
            if in_lake(wx, wz):
                cx2, cz2 = (LAKE[0] + LAKE[2]) / 2.0, (LAKE[1] + LAKE[3]) / 2.0
                d = math.hypot((wx - cx2) / ((LAKE[2] - LAKE[0]) / 2.0),
                               (wz - cz2) / ((LAKE[3] - LAKE[1]) / 2.0))
                depth = int((1.0 - d) ** 1.2 * (BASE_Y - LAKE_BOTTOM)) + 1
                heights[zz][xx] = min(heights[zz][xx], BASE_Y - depth)
    return heights


def fill_world(heights):
    grid = vx.new_grid()
    bands = [(1, "grass"), (3, "dirt"), (2, "stone")]
    vx.fill_heightmap(grid, heights, ORIGIN_X, ORIGIN_Z, BASE_Y, bands)

    # water fill above submerged ground
    for zz in range(SIZE_Z):
        for xx in range(SIZE_X):
            top = heights[zz][xx]
            if top < WATER_LEVEL:
                for y in range(top + 1, WATER_LEVEL + 1):
                    vx.set_block(grid, ORIGIN_X + xx, y, ORIGIN_Z + zz, "water")
            # sand shores around water edge
            elif top == WATER_LEVEL + 1:
                wx, wz = ORIGIN_X + xx, ORIGIN_Z + zz
                near_water = any(
                    heights[zz + dz][xx + dx] < WATER_LEVEL
                    for dx in (-1, 0, 1)
                    for dz in (-1, 0, 1)
                    if 0 <= xx + dx < SIZE_X and 0 <= zz + dz < SIZE_Z
                )
                if near_water:
                    vx.set_block(grid, wx, top, wz, "sand")

    # plaza: stone slab surface
    for x in range(PLAZA[0], PLAZA[2] + 1):
        for z in range(PLAZA[1], PLAZA[3] + 1):
            vx.set_block(grid, x, PLAZA_Y, z, "stone")

    # path
    for r in PATH_RECTS:
        for x in range(r[0], r[2] + 1):
            for z in range(r[1], r[3] + 1):
                vx.set_block(grid, x, PATH_Y, z, "path")

    # zone plot surfaces (placeholder colors) + landmark structures
    for name, zone in ZONES.items():
        r = zone["rect"]
        for x in range(r[0], r[2] + 1):
            for z in range(r[1], r[3] + 1):
                vx.set_block(grid, x, ZONE_Y, z, f"zone_{name}")
        add_sign(grid, r, name)
        add_beacon(grid, r, name)

    add_torches(grid, heights)
    add_fire_pit(grid)
    add_haveli(grid, heights)
    add_garden(grid)
    add_terraces(grid, heights)
    add_pond(grid, heights)
    add_path_branch(grid, heights)
    add_clock_tower(grid, heights)
    add_gateway(grid, heights)
    plant_forest(grid, heights)
    return grid


def ground_top(heights, x, z):
    ix = x - ORIGIN_X
    iz = z - ORIGIN_Z
    if 0 <= ix < SIZE_X and 0 <= iz < SIZE_Z:
        return heights[iz][ix]
    return BASE_Y


def add_torches(grid, heights):
    """Lantern posts flanking the path every ~10 blocks, alternating sides."""
    for i, bz in enumerate(range(12, 89, 10)):
        bx = -3 if i % 2 == 0 else 3
        top = max(ground_top(heights, bx, bz), PATH_Y)
        vx.set_block(grid, bx, top + 1, bz, "plank")
        vx.set_block(grid, bx, top + 2, bz, "plank")
        vx.set_block(grid, bx, top + 3, bz, "flame")


def add_fire_pit(grid):
    """Stone-ringed campfire just east of the spawn point."""
    cx, cz, y = 4, 1, PLAZA_Y + 1
    ring = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    for dx, dz in ring:
        vx.set_block(grid, cx + dx, y, cz + dz, "stone")
    vx.set_block(grid, cx, y, cz, "flame")


# ---------------------------------------------------------------- house

HX0, HX1 = 20, 34              # wall footprint (blender x) — 15 wide
HZ0, HZ1 = 42, 56              # wall footprint (blender z) — 15 deep
WALL_H = 7                     # two storeys
DOOR_Z = (49, 50)              # door gap on the west face
CHIMNEY = (30, 52)             # chimney column (x, z)
ROOF_LEVELS = 6

LANTERN_SPOTS = []


def add_haveli(grid, heights):
    """Indian heritage 'Haveli' (ancestral home): warm sandstone courtyard
    mansion with arched jharokha window bands, terracotta stepped roof and a
    small chhatri (domed pavilion) turret w/ a kalash finial. Replaces the
    earlier wooden cabin while keeping the same footprint + glow anchors."""
    y = HOUSE_Y

    # stone foundation ring under the walls
    for x in range(HX0 - 1, HX1 + 2):
        for z in range(HZ0 - 1, HZ1 + 2):
            edge = x in (HX0 - 1, HX1 + 1) or z in (HZ0 - 1, HZ1 + 1)
            if edge:
                vx.set_block(grid, x, y, z, "stone")
    # sandstone floor
    for x in range(HX0, HX1 + 1):
        for z in range(HZ0, HZ1 + 1):
            vx.set_block(grid, x, y, z, "sandstone")

    # walls: sandstone plaster, jharokha corner posts, arched wooden windows
    for h in range(1, WALL_H + 1):
        wy = y + h
        for x in range(HX0, HX1 + 1):
            for z in range(HZ0, HZ1 + 1):
                on_x_edge = x in (HX0, HX1)
                on_z_edge = z in (HZ0, HZ1)
                if not (on_x_edge or on_z_edge):
                    continue
                corner = on_x_edge and on_z_edge
                # decorative inset band rows at storey lines
                trim = h in (3, 6)
                block = "jharokha" if corner else ("sandstone_dark" if trim else "sandstone")
                if x == HX0 and not corner:
                    if z in DOOR_Z and h <= 2:
                        continue                      # front door gap
                    if z in DOOR_Z and h in (4, 5):
                        continue                      # balcony door gap
                    if z in (44, 45, 46, 53, 54, 55) and h in (3, 6):
                        block = "window"
                if x == HX1 and not corner:
                    if z in (45, 46, 47, 51, 52, 53) and h in (3, 6):
                        block = "window"
                if z == HZ1 and not corner:
                    if x in (23, 24, 26, 27, 29, 30, 31, 32) and h in (3, 6):
                        block = "window"
                if z == HZ0 and not corner:
                    if x in (23, 24, 30, 31) and h in (3, 6):
                        block = "window"
                vx.set_block(grid, x, wy, z, block)

    # shallow terracotta stepped roof
    ridge_y = None
    for k in range(ROOF_LEVELS):
        ry = y + WALL_H + 1 + k
        z_lo = HZ0 - 1 + k
        z_hi = HZ1 + 1 - k
        for x in range(HX0 - 2, HX1 + 3):
            for z in range(z_lo, z_hi + 1):
                vx.set_block(grid, x, ry, z, "roofterra")
        ridge_y = ry
    # parapet lips on the long sides (gabled ridge hidden under chhatri)
    for x in range(HX0 - 2, HX1 + 3):
        vx.set_block(grid, x, ridge_y + 1, (HZ0 + HZ1) // 2, "roofterra")

    # gable ends filled under the roofline (sandstone)
    for gx in (HX0, HX1):
        for z in range(HZ0, HZ1 + 1):
            rise = min(z - HZ0, HZ1 - z)
            for h in range(WALL_H + 1, WALL_H + 1 + rise + 2):
                if h <= WALL_H + ROOF_LEVELS:
                    vx.set_block(grid, gx, y + h, z, "sandstone")

    # chhatri turret: small domed pavilion over the old chimney spot
    cx, cz = CHIMNEY
    base = y + WALL_H + 2
    for dx in (-2, -1, 0, 1, 2):
        for dz in (-2, -1, 0, 1, 2):
            if abs(dx) == 2 and abs(dz) == 2 and abs(dx) + abs(dz) == 4:
                continue
            vx.set_block(grid, cx + dx, base, cz + dz, "taj")
    vx.set_block(grid, cx, base, cz, "taj")
    vx.set_block(grid, cx, base + 1, cz, "taj")
    vx.set_block(grid, cx, base + 2, cz, "taj")
    # kalash finial on top
    vx.set_block(grid, cx, base + 3, cz, "kalash")
    LANTERN_SPOTS.append((cx, base + 2.5, cz))

    def balcony(axis, fixed, lo, hi, outward=1):
        """Sandstone platform (2 deep) + jharokha posts w/ lantern flames + rail."""
        plat = y + 4

        def put(t, off, h, block):
            fx = fixed - outward * off if axis == 'x' else t
            fz = t if axis == 'x' else fixed - outward * off
            vx.set_block(grid, fx, plat + h, fz, block)

        for t in range(lo, hi + 1):
            put(t, 0, 0, "sandstone")
            put(t, 1, 0, "sandstone")
        for t in (lo, hi):
            put(t, 2, 0, "jharokha")
            put(t, 2, 1, "flame")
            fx = fixed - outward * 2 if axis == 'x' else t
            fz = t if axis == 'x' else fixed - outward * 2
            LANTERN_SPOTS.append((fx, plat + 1.5, fz))
        for t in range(lo, hi + 1):
            if t not in (lo, hi):
                put(t, 2, 1, "sandstone")

    balcony('x', HX0, DOOR_Z[0] - 2, DOOR_Z[1] + 2, 1)     # west face
    balcony('z', HZ1, HX0 + 3, HX0 + 8, -1)                # south face

    # rangoli kolam at the front step + flower boxes under the jharokha windows
    for bz in (DOOR_Z[0] - 1, DOOR_Z[0], DOOR_Z[1], DOOR_Z[1] + 1):
        vx.set_block(grid, HX0 - 1, y + 1, bz, "rangoli")
    for bz in (44, 45, 46, 53, 54, 55):
        vx.set_block(grid, HX0 - 1, y + 1, bz, "plank")
        vx.set_block(grid, HX0 - 1, y + 2, bz,
                     ("flower_pink", "flower_red", "flower_yellow")[bz % 3])
    for bx in (23, 24, 30, 31):
        vx.set_block(grid, bx, y + 1, HZ1 + 1, "plank")
        vx.set_block(grid, bx, y + 2, HZ1 + 1,
                     ("flower_pink", "flower_yellow")[bx % 2])

    # vines trailing from the eaves
    spots = [(21, HZ0 - 1), (25, HZ0 - 1), (28, HZ0 - 1), (33, HZ0 - 1),
             (22, HZ1 + 1), (26, HZ1 + 1), (31, HZ1 + 1), (HX0 - 1, 43),
             (HX0 - 1, 47), (HX0 - 1, 52), (HX0 - 1, 56)]
    for i, (vx_, vz) in enumerate(spots):
        hang = 2 if i % 2 == 0 else 1
        for hh in range(hang):
            vx.set_block(grid, vx_, y + WALL_H - hh, vz, "vine")

    # lantern posts flanking the front door
    for dz in (DOOR_Z[0] - 1, DOOR_Z[1] + 1):
        vx.set_block(grid, HX0 - 1, y + 1, dz, "jharokha")
        vx.set_block(grid, HX0 - 1, y + 2, dz, "flame")
        LANTERN_SPOTS.append((HX0 - 1, y + 2.5, dz))


def add_terraces(grid, heights):
    """Turn the house plateau's raw cliff edges into an intentional stone
    retaining wall: blossom parapet, vines, lanterns, and a stepped stair
    where the branch path climbs up to the front door."""
    gy = HOUSE_Y

    def ground(x, z):
        return ground_top(heights, x, z)

    # north retaining wall (faces the menu camera)
    for x in range(HOUSE_PAD[0], HOUSE_PAD[1] + 1):
        g = ground(x, 37)
        for yy in range(g + 1, gy + 1):
            vx.set_block(grid, x, yy, 37, "stone")
        # blossom parapet alternating with gaps
        if x % 2 == 0:
            vx.set_block(grid, x, gy + 1, 37,
                         ("flower_pink", "flower_yellow", "flower_red")[(x // 2) % 3])
    # west cheek wall
    for z in range(HOUSE_PAD[2], HOUSE_PAD[3] + 1):
        g = ground(14, z)
        for yy in range(g + 1, gy + 1):
            vx.set_block(grid, 14, yy, z, "stone")
    # vines trailing down the north face
    for x in range(18, 42, 5):
        vx.set_block(grid, x, gy - 1, 36, "vine")
        if x % 10 == 8:
            vx.set_block(grid, x, gy - 2, 36, "vine")
    # lantern posts framing the terrace
    for lx in (17, 33):
        vx.set_block(grid, lx, gy + 1, 35, "log")
        vx.set_block(grid, lx, gy + 2, 35, "flame")
        LANTERN_SPOTS.append((lx, gy + 2.5, 35))

    # stone stair climbing the west edge where the branch path meets the pad
    for sx in range(12, 16):
        step_top = gy - (15 - sx)          # x15 -> 9 (pad), x12 -> 6 (ground)
        for zz in (48, 49, 50):
            g = ground(sx, zz)
            for yy in range(g, step_top + 1):
                vx.set_block(grid, sx, yy, zz, "path" if yy == step_top else "stone")
            heights[zz - ORIGIN_Z][sx - ORIGIN_X] = max(step_top, g)


def add_pond(grid, heights):
    """Foreground pond between the path and the menu view; player-wadeable."""
    cx, cz = POND_CENTER
    for zz in range(cz - 4, cz + 5):
        for xx in range(cx - 5, cx + 6):
            d = ((xx - cx) / POND_RX) ** 2 + ((zz - cz) / POND_RZ) ** 2
            ix, iz = xx - ORIGIN_X, zz - ORIGIN_Z
            if not (0 <= ix < SIZE_X and 0 <= iz < SIZE_Z):
                continue
            top = heights[iz][ix]
            if d <= 1.0:
                for yy in range(3, top + 1):
                    vx.set_block(grid, xx, yy, zz, "water")
                heights[iz][ix] = min(top, 3)
            elif d <= 1.45 and top >= WATER_LEVEL:
                vx.set_block(grid, xx, top, zz, "sand")


def add_garden(grid):
    """Tilled crop rows + flowers east of the house."""
    gy = HOUSE_Y
    x0, x1, z0, z1 = 36, 42, 45, 55
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            edge = x in (x0, x1) or z in (z0, z1)
            if edge:
                vx.set_block(grid, x, gy, z, "log")
            elif (z - z0) % 2 == 0:
                vx.set_block(grid, x, gy, z, "farm")
                if (x + z) % 3 != 0:
                    vx.set_block(grid, x, gy + 1, z, "crop")
            else:
                vx.set_block(grid, x, gy, z, "farm")
    # flower border along the south edge
    for x in range(x0, x1 + 1, 2):
        vx.set_block(grid, x, gy + 1, z1 + 1, ("flower_pink", "flower_yellow", "flower_red")[(x // 2) % 3])
    # corner lantern
    vx.set_block(grid, x1, gy + 1, z0, "log")
    vx.set_block(grid, x1, gy + 2, z0, "flame")
    LANTERN_SPOTS.append((x1, gy + 2.5, z0))


def add_path_branch(grid, heights):
    """Stepping-stone trail from the main road to the front door."""
    z_line = 49
    for x in range(2, HX0):
        top = max(ground_top(heights, x, z_line), PATH_Y if x < 4 else 0)
        if in_rect(x, z_line, HOUSE_PAD):
            top = HOUSE_Y
        elif abs(x - 12) > 8:
            top = ground_top(heights, x, z_line)
        vx.set_block(grid, x, top, z_line, "path" if x % 2 == 0 else "stone")
        if x % 7 == 3:
            vx.set_block(grid, x, top + 1, z_line + 2, "log")
            vx.set_block(grid, x, top + 2, z_line + 2, "flame")
            LANTERN_SPOTS.append((x, top + 2.5, z_line + 2))
        if x % 5 == 1:
            fx = x + 1
            ft = ground_top(heights, fx, z_line + 3)
            vx.set_block(grid, fx, ft + 1, z_line + 3,
                         ("flower_pink", "flower_yellow")[x % 4 == 1])


def add_clock_tower(grid, heights):
    """Giant weathered clock wall by the lake: stone slab, glowing frame,
    dark dial backing, wooden cap, corner posts. The screen plane is runtime."""
    ty = heights[ORIGIN_Z + 10][ORIGIN_X + -25]

    def box(x0, x1, y0, y1, z0, z1, block):
        for xx in range(x0, x1 + 1):
            for yy in range(y0, y1 + 1):
                for zz in range(z0, z1 + 1):
                    vx.set_block(grid, xx, yy, zz, block)

    # main wall slab (long axis along z, face looking east toward the plaza)
    box(-26, -24, ty, ty + 11, 4, 16, "stone")
    # weathering: mossy stone speckle rows
    for zz in range(5, 16, 3):
        for yy in (ty + 1, ty + 2):
            if (yy + zz) % 4 == 0:
                vx.set_block(grid, -24, yy, zz, "vine")
    # chhatri cap: a low terracotta cornice under a domed white pavilion
    box(-27, -23, ty + 12, ty + 12, 3, 17, "roofterra")
    box(-26, -24, ty + 13, ty + 13, 4, 16, "roofterra")
    # dome (onion-ish stepped white pavilion) over the corniche
    dome_cx, dome_cz = -25, 10
    dome = [
        (3, ty + 14, 6, 15),   # wide layer
        (2, ty + 15, 8, 13),
        (1, ty + 16, 9, 12),
    ]
    for w, dy, lo, hi in dome:
        for xx in range(dome_cx - w, dome_cx + w + 1):
            for zz in range(lo, hi + 1):
                vx.set_block(grid, xx, ty + dy, zz, "taj")
    vx.set_block(grid, dome_cx, ty + 17, dome_cz, "taj")
    vx.set_block(grid, dome_cx, ty + 18, dome_cz, "kalash")
    # fluted heritage pillars framing the wall
    for px in (-28, -22):
        for pz in (3, 17):
            box(px - 1, px, ty, ty + 11, pz, pz + 1, "sandstone")
            for yy in range(ty + 1, ty + 11, 3):       # trim bands
                vx.set_block(grid, px - 1, yy, pz, "sandstone_dark")
                vx.set_block(grid, px, yy, pz + 1, "sandstone_dark")
            vx.set_block(grid, px - 1, ty + 12, pz, "flame")
            vx.set_block(grid, px, ty + 12, pz + 1, "flame")
            LANTERN_SPOTS.append((px - 0.5, ty + 12.5, pz + 0.5))
    # stepped ghat plinth flanking the base of the wall
    for gz in range(2, 18):
        for gx in (-29, -21):
            vx.set_block(grid, gx, ty - 1, gz, "sandstone_dark")
    # flames on the cap corners
    for cx_, cz_ in [(-27, 5), (-27, 15), (-23, 5), (-23, 15)]:
        vx.set_block(grid, cx_, ty + 13, cz_, "flame")

    # glowing frame on the east face (outermost layer x = -24)
    for yy in range(ty + 4, ty + 10):                 # verticals z=5 / z=15
        for zz in (5, 15):
            vx.set_block(grid, -24, yy, zz, "clockglow")
    for zz in range(6, 15):                           # horizontals top/bottom
        for yy in (ty + 4, ty + 9):
            vx.set_block(grid, -24, yy, zz, "clockglow")
    # dark dial backing between the glow frame
    for yy in range(ty + 5, ty + 9):
        for zz in range(6, 15):
            vx.set_block(grid, -24, yy, zz, "clockdark")


def add_gateway(grid, heights):
    """Torana-style entry gateway over the path just past the plaza: a
    sandstone lintel on two pillars with a small chhatri pavilion on top,
    marking the entry to the Peacock Realms (walkable beneath)."""
    z0, z1 = 11, 12

    def base(x, z):
        return max(ground_top(heights, x, z), PATH_Y)

    # brace pillars on each side of the path
    for side in (-3, 3):
        for z in (z0, z1):
            g0 = base(side, z)
            for y in range(g0 + 1, g0 + 7):
                vx.set_block(grid, side, y, z, "sandstone")
            vx.set_block(grid, side, g0 + 7, z, "sandstone_dark")
            vx.set_block(grid, side, g0 + 6, z, "sandstone_dark")

    # lintel spanning the path
    top_y = base(0, z0) + 8
    for x in range(-3, 4):
        for z in range(z0 - 1, z1 + 1):
            vx.set_block(grid, x, top_y, z, "sandstone")
    for x in range(-3, 4):
        vx.set_block(grid, x, top_y - 1, z0 - 1, "sandstone_dark")
        vx.set_block(grid, x, top_y - 1, z1 + 1, "sandstone_dark")

    # small chhatri pavilion on the lintel
    cx, cz = 0, (z0 + z1) // 2
    for x in range(-2, 3):
        for z in range(z0 - 2, z1 + 3):
            vx.set_block(grid, x, top_y + 1, z, "taj")
    for x in range(-1, 2):
        for z in range(z0 - 1, z1 + 2):
            vx.set_block(grid, x, top_y + 2, z, "taj")
    vx.set_block(grid, cx, top_y + 3, cz, "taj")
    vx.set_block(grid, cx, top_y + 4, cz, "kalash")
    LANTERN_SPOTS.append((cx, top_y + 2.5, cz))


def tree(grid, x, z, ground, leaf, trunk_h=None):
    import random as _r
    th = trunk_h or (4 + _r.randint(0, 2))
    for h in range(th):
        vx.set_block(grid, x, ground + 1 + h, z, "log")
    top = ground + th
    for dx in (-2, -1, 0, 1, 2):
        for dz in (-2, -1, 0, 1, 2):
            for dy in (0, 1):
                if abs(dx) == 2 and abs(dz) == 2 and dy == 0:
                    continue
                if abs(dx) + abs(dz) + dy * 2 <= 4 or (abs(dx) <= 1 and abs(dz) <= 1):
                    if dx == 0 and dz == 0 and dy == 0:
                        continue
                    vx.set_block(grid, x + dx, top + dy, z + dz, leaf)
    vx.set_block(grid, x, top + 2, z, leaf)


def plant_forest(grid, heights):
    """Scatter oak + cherry trees across open terrain (kept clear of builds)."""
    import random as _r
    _r.seed(4242)
    keepout = [
        PLAZA, (HOUSE_PAD[0], HOUSE_PAD[1], HOUSE_PAD[2], HOUSE_PAD[3]),
        CLOCK_PAD, LAKE,
        (-14, 16, -5, 24), (5, 30, 14, 38), (-14, 44, -5, 52),
        (5, 58, 18, 70), (-14, 78, -5, 86),   # zone plots
        (-4, 6, 4, 90),                        # path corridor
    ]
    hc_x, hc_z = (HOUSE_PAD[0] + HOUSE_PAD[2]) / 2, (HOUSE_PAD[1] + HOUSE_PAD[3]) / 2
    count = 0
    for gz in range(-58, 62, 6):
        for gx in range(-56, 60, 6):
            jx = gx + _r.randint(-2, 2)
            jz = gz + _r.randint(-2, 2)
            if in_any_rect(jx, jz, keepout, margin=2):
                continue
            if in_lake(jx, jz):
                continue
            top = ground_top(heights, jx, jz)
            if top <= WATER_LEVEL + 1 or top > BASE_Y + 14:
                continue
            near_house = (jx - hc_x) ** 2 + (jz - hc_z) ** 2 < 26 ** 2
            blossom = near_house if _r.random() < 0.75 else _r.random() < 0.22
            tree(grid, jx, jz, top, "blossom" if blossom else "leaves")
            count += 1
            if _r.random() < 0.35:
                ft = ground_top(heights, jx + 2, jz)
                if ft > WATER_LEVEL:
                    vx.set_block(grid, jx + 2, ft + 1, jz,
                                 ("flower_pink", "flower_yellow", "flower_red")[count % 3])

    # hand-placed framing cherries flanking the menu view corridor
    for fx, fz in [(-11, 30), (16, 31), (-12, 52), (-9, 62)]:
        if in_any_rect(fx, fz, keepout, margin=1):
            continue
        ft = ground_top(heights, fx, fz)
        if ft > WATER_LEVEL + 1:
            tree(grid, fx, fz, ft, "blossom", trunk_h=5)
            count += 1


def add_sign(grid, rect, zone):
    """MC-style sign on the plot edge nearest the path, facing it."""
    x0, z0, x1, z1 = rect
    cz = (z0 + z1) // 2
    base_y = ZONE_Y + 1
    side = 1 if x0 >= 0 else -1          # +1 = east zone (faces west)
    px = x0 if side == -1 else x1        # edge column nearest path
    for dz in (-2, 2):                   # posts
        for h in range(3):
            vx.set_block(grid, px, base_y + h, cz + dz, "plank")
    for dz in range(-2, 3):              # panel between posts
        for h in range(2, 4):
            vx.set_block(grid, px, base_y + h, cz + dz, f"zone_{zone}")


def add_beacon(grid, rect, zone):
    """Emissive pillar at the spawn-side corner so zones are visible from afar."""
    x0, z0, x1, _ = rect
    bx = x0 if x0 < 0 else x1            # corner nearer path
    base_y = ZONE_Y + 1
    for h in range(6):
        vx.set_block(grid, bx, base_y + h, z0, f"beacon_{zone}")


FACE_MATERIALS = {}


def register_block(block, tex_name, hex_color, jitter=12, speckle=0.0,
                   speckle_hex=None, faces=("top", "bottom", "north", "south", "east", "west"),
                   emissive=0.0, seed=0):
    img = vx.make_pixel_texture(f"tex_{tex_name}", hex_color, jitter=jitter,
                                speckle=speckle, speckle_hex=speckle_hex, seed=seed)
    mat = vx.make_material(f"mat_{tex_name}", img, emissive=emissive)
    FACE_MATERIALS[block] = {}
    for f in faces:
        FACE_MATERIALS[block][f] = f"mat_{tex_name}"
    return {f"mat_{tex_name}": mat}


def main():
    vx.set_seed(1337)

    # wipe factory scene
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    heights = build_heights()
    grid = fill_world(heights)

    materials = {}
    materials.update(register_block("grass", "grass_top", "#6faa3f", jitter=16, seed=1))
    materials.update(register_block("grass_side", "grass_side", "#8a5f3c",
                                    speckle=0.10, speckle_hex="#6faa3f", seed=2))
    FACE_MATERIALS["grass"] = {
        "top": "mat_grass_top",
        "north": "mat_grass_side", "south": "mat_grass_side",
        "east": "mat_grass_side", "west": "mat_grass_side",
        "bottom": "mat_dirt",
    }
    materials.update(register_block("dirt", "dirt", "#8a5f3c", jitter=14, seed=3))
    materials.update(register_block("stone", "stone", "#8d8d8d", jitter=10, seed=4))
    materials.update(register_block("path", "path_stone", "#9a9a92", jitter=12, seed=5))
    materials.update(register_block("sand", "sand", "#dcd29b", jitter=10, seed=6))
    materials.update(register_block("water", "water", "#3f76e4", jitter=8, seed=7))
    materials.update(register_block("zone_about", "zone_about", "#b0563a", jitter=10, seed=11))
    materials.update(register_block("zone_stats", "zone_stats", "#d8b638", jitter=10, seed=12))
    materials.update(register_block("zone_skills", "zone_skills", "#7a4fd0", jitter=10, seed=13))
    materials.update(register_block("zone_projects", "zone_projects", "#3a9ad0", jitter=10, seed=14))
    materials.update(register_block("zone_mine", "zone_mine", "#555555", jitter=8, seed=15))
    materials.update(register_block("plank", "plank", "#a07a45", jitter=10, seed=8))
    materials.update(register_block("flame", "flame", "#ffb347", jitter=18,
                                    speckle=0.15, speckle_hex="#ffe066",
                                    emissive=1.0, seed=9))
    # Loop 9: house + nature palette
    materials.update(register_block("log", "log", "#6b4a2b", jitter=12, seed=30))
    materials.update(register_block("leaves", "leaves", "#4e8f3a", jitter=20,
                                    speckle=0.10, speckle_hex="#3a6f2b",
                                    emissive=0.10, seed=31))
    materials.update(register_block("blossom", "blossom", "#f2a7c3", jitter=14,
                                    speckle=0.08, speckle_hex="#ffd9e8",
                                    emissive=0.32, seed=32))
    materials.update(register_block("roof", "roof", "#5a3a28", jitter=12, seed=33))
    materials.update(register_block("window", "window", "#ffc97e", jitter=6,
                                    emissive=1.0, seed=34))
    materials.update(register_block("vine", "vine", "#3f7d3c", jitter=16,
                                    speckle=0.08, speckle_hex="#2c5c2a", seed=35))
    materials.update(register_block("farm", "farm", "#5b3a22", jitter=14, seed=36))
    materials.update(register_block("crop", "crop", "#5da53f", jitter=16,
                                    emissive=0.08, seed=37))
    materials.update(register_block("flower_pink", "flower_pink", "#ff8fb3",
                                    jitter=10, speckle=0.12, speckle_hex="#fff0f5",
                                    emissive=0.30, seed=38))
    materials.update(register_block("flower_yellow", "flower_yellow", "#ffd166",
                                    jitter=10, speckle=0.12, speckle_hex="#fff3c4",
                                    emissive=0.30, seed=39))
    materials.update(register_block("flower_red", "flower_red", "#e04848",
                                    jitter=10, speckle=0.12, speckle_hex="#ffb3a0",
                                    emissive=0.26, seed=40))
    # Loop 10: giant clock wall
    materials.update(register_block("clockglow", "clockglow", "#ffcf8a",
                                    jitter=5, emissive=1.0, seed=41))
    materials.update(register_block("clockdark", "clockdark", "#141420",
                                    jitter=6, seed=42))
    # Loop 26: Indian heritage materials
    materials.update(register_block("sandstone", "sandstone", "#e0bd80", jitter=14,
                                    speckle=0.10, speckle_hex="#b98f55", seed=50))
    materials.update(register_block("sandstone_dark", "sandstone_dark", "#b98f55",
                                    jitter=12, speckle=0.08, speckle_hex="#8a6438", seed=51))
    materials.update(register_block("roofterra", "roofterra", "#c2542f", jitter=16,
                                    speckle=0.12, speckle_hex="#8f3a1c", seed=52))
    materials.update(register_block("taj", "taj", "#f4efe2", jitter=6, seed=53))
    materials.update(register_block("kalash", "kalash", "#ffcf5e", jitter=10,
                                    speckle=0.10, speckle_hex="#e8a52e", emissive=0.85, seed=54))
    materials.update(register_block("jharokha", "jharokha", "#7a3c1d", jitter=12, seed=55))
    materials.update(register_block("rangoli", "rangoli", "#e0a92e", jitter=14,
                                    speckle=0.16, speckle_hex="#c2361d", emissive=0.35, seed=56))
    for name in ZONES:
        materials.update(register_block(
            f"beacon_{name}", f"beacon_{name}",
            "#ffd9a0" if name == "about" else {
                "stats": "#ffe066", "skills": "#b28aff",
                "projects": "#6cc4f5", "mine": "#ff9d5c",
            }[name],
            jitter=4, emissive=0.9, seed=20,
        ))

    objects = vx.mesh_grid(grid, FACE_MATERIALS)
    vx.assign_materials(objects, materials)

    os.makedirs(OUT_DIR, exist_ok=True)
    glb_path = os.path.join(OUT_DIR, "world.glb")
    vx.export_glb(glb_path)

    colliders = {
        "cell": 1,
        "origin": [ORIGIN_X, ORIGIN_Z],
        "size": [SIZE_X, SIZE_Z],
        "heights": heights,
    }
    with open(os.path.join(OUT_DIR, "colliders.json"), "w") as f:
        json.dump(colliders, f, separators=(",", ":"))

    tris = sum(len(o.data.polygons) for o in objects.values())
    print(f"WORLD_OK blocks={len(grid)} objects={len(objects)} quads={tris} out={glb_path}")

    # Landmark positions for runtime effects. Grid (x, up, z) -> three (x, up, -z).
    clock_y = heights[ORIGIN_Z + 10][ORIGIN_X + -25]
    landmarks = {
        # screen plane sits just off the clock wall's east face (opening
        # spans script z 6..14, dial rows ty+5..ty+8)
        "clockScreen": [-22.92, clock_y + 7, -10],
        "clockTagline": [-22.90, clock_y + 2.9, -10],
        "clockGround": clock_y,
        "chimneyTop": [CHIMNEY[0] + 0.5, HOUSE_Y + WALL_H + ROOF_LEVELS + 3.4, -(CHIMNEY[1] + 0.5)],
        "houseCenter": [(HX0 + HX1) / 2 + 0.5, HOUSE_Y, -(HZ0 + HZ1) / 2 - 0.5],
        # warm light anchors: front door glow + clock face glow
        "houseLight": [HX0 - 1.5, HOUSE_Y + 5.5, -(DOOR_Z[0] + DOOR_Z[1]) / 2],
        "clockLight": [-21.5, clock_y + 7, -10],
        "lanterns": [[x, y, -z] for (x, y, z) in LANTERN_SPOTS],
    }
    print("LANDMARKS " + json.dumps(landmarks))


main()
