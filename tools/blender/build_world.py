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


def in_rect(x, z, r):
    return r[0] <= x <= r[2] and r[1] <= z <= r[3]


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

    # zone plot surfaces (placeholder colors)
    for name, zone in ZONES.items():
        r = zone["rect"]
        for x in range(r[0], r[2] + 1):
            for z in range(r[1], r[3] + 1):
                vx.set_block(grid, x, ZONE_Y, z, f"zone_{name}")
    return grid


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


main()
