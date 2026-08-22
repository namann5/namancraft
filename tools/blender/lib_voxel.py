# Voxel library for Blender headless world building.
# Grid: dict {(x,y,z): block_name}. Meshing emits only exposed faces,
# bucketed per (block, face-direction) so each bucket gets its own material.

import bpy
import bmesh
import math
import random

# ---------------------------------------------------------------- randomness

_SEED = 1337


def set_seed(seed):
    global _SEED
    _SEED = seed
    random.seed(seed)


def _rand():
    return random.random()


# ---------------------------------------------------------------- grid utils

def new_grid():
    return {}


def set_block(grid, x, y, z, name):
    grid[(int(x), int(y), int(z))] = name


def get_block(grid, x, y, z):
    return grid.get((int(x), int(y), int(z)))


def fill_box(grid, x0, y0, z0, x1, y1, z1, name):
    for x in range(int(x0), int(x1) + 1):
        for y in range(int(y0), int(y1) + 1):
            for z in range(int(z0), int(z1) + 1):
                grid[(x, y, z)] = name


def fill_heightmap(grid, heights, origin_x, origin_z, base_y, blocks_by_band):
    """heights: 2D list [z][x] of surface height (top solid y).
    blocks_by_band: list of (max_depth_below_top, block_name)."""
    size_z = len(heights)
    size_x = len(heights[0])
    for zz in range(size_z):
        for xx in range(size_x):
            top = int(heights[zz][xx])
            depth = 0
            x = origin_x + xx
            z = origin_z + zz
            for band, name in blocks_by_band:
                for d in range(band):
                    if depth > top - base_y + 40:
                        break
                    set_block(grid, x, top - depth, z, name)
                    depth += 1


# ---------------------------------------------------------------- value noise

def _hash2(ix, iz, seed=0):
    n = ix * 374761393 + iz * 668265263 + seed * 1442695040888963407
    n = (n ^ (n >> 13)) * 1274126177
    n = n ^ (n >> 16)
    return (n & 0xFFFFFF) / float(0xFFFFFF)


def _smooth(t):
    return t * t * (3.0 - 2.0 * t)


def value_noise(x, z, seed=0):
    ix, iz = math.floor(x), math.floor(z)
    fx, fz = _smooth(x - ix), _smooth(z - iz)
    a = _hash2(ix, iz, seed)
    b = _hash2(ix + 1, iz, seed)
    c = _hash2(ix, iz + 1, seed)
    d = _hash2(ix + 1, iz + 1, seed)
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz


def fbm(x, z, octaves=3, seed=0):
    amp, freq, total, norm = 1.0, 1.0, 0.0, 0.0
    for o in range(octaves):
        total += value_noise(x * freq, z * freq, seed + o * 101) * amp
        norm += amp
        amp *= 0.5
        freq *= 2.0
    return total / norm


# ---------------------------------------------------------------- meshing

# Face definitions: (dir vector, quad corners relative to voxel min corner).
# Corners wound CCW seen from outside.
_FACES = {
    "top": ((0, 1, 0), [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)]),
    "bottom": ((0, -1, 0), [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)]),
    "north": ((0, 0, -1), [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)]),
    "south": ((0, 0, 1), [(1, 0, 1), (1, 1, 1), (0, 1, 1), (0, 0, 1)]),
    "east": ((1, 0, 0), [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)]),
    "west": ((-1, 0, 0), [(0, 0, 1), (0, 1, 1), (0, 1, 0), (0, 0, 0)]),
}

TRANSPARENT = {"water", "glass", "leaves", "lantern_glass"}


def mesh_grid(grid, face_materials, out_collection=None, name_prefix="vox"):
    """face_materials: {block_name: {face: material_name}}.
    Creates one Blender object per material with exposed faces only.
    Returns {material_name: object}."""
    buckets = {}
    for (x, y, z), block in grid.items():
        fmap = face_materials[block]
        for face, (normal, corners) in _FACES.items():
            nx, ny, nz = x + normal[0], y + normal[1], z + normal[2]
            neighbor = grid.get((nx, ny, nz))
            visible = False
            if neighbor is None:
                visible = True
            elif neighbor in TRANSPARENT and neighbor != block:
                visible = True
            if not visible:
                continue
            mat = fmap[face]
            # Author Blender-correct Z-up coords (height on Z). Swapping two
            # axes mirrors geometry, so reverse winding to keep faces outward.
            # After export: three.x=x, three.y=height, three.z=-z.
            quad = [(x + cx, z + cz, y + cy) for (cx, cy, cz) in corners]
            quad.reverse()
            buckets.setdefault(mat, []).append(quad)

    if out_collection is None:
        out_collection = bpy.context.scene.collection

    objects = {}
    for mat_name, quads in buckets.items():
        bm = bmesh.new()
        for quad in quads:
            verts = [bm.verts.new(p) for p in quad]
            try:
                bm.faces.new(verts)
            except ValueError:
                pass
        mesh = bpy.data.meshes.new(f"{name_prefix}_{mat_name}")
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(mesh.name, mesh)
        out_collection.objects.link(obj)
        objects[mat_name] = obj
    return objects


# ---------------------------------------------------------------- materials

def _hex_rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))


def make_pixel_texture(name, hex_color, size=16, jitter=14, speckle=0.0,
                       speckle_hex=None, seed=0):
    """Flat pixel-noise texture; deterministic given seed."""
    rnd = random.Random(seed if seed else hash(name) & 0xFFFF)
    r, g, b = _hex_rgb(hex_color)
    img = bpy.data.images.new(name, size, size)
    px = []
    for _ in range(size * size):
        jr = max(0.0, min(1.0, r + rnd.uniform(-jitter, jitter) / 255.0))
        jg = max(0.0, min(1.0, g + rnd.uniform(-jitter, jitter) / 255.0))
        jb = max(0.0, min(1.0, b + rnd.uniform(-jitter, jitter) / 255.0))
        if speckle > 0 and rnd.random() < speckle:
            sr, sg, sb = _hex_rgb(speckle_hex or "#000000")
            jr, jg, jb = sr, sg, sb
        px.extend((jr, jg, jb, 1.0))
    img.pixels.foreach_set(px)
    img.pack()
    return img


def make_material(name, tex_image, emissive=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = tex_image
    tex.interpolation = "Closest"
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    if emissive > 0:
        bsdf.inputs["Emission Color"].default_value = (1.0, 1.0, 1.0, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emissive
    return mat


def assign_materials(objects, materials):
    """objects: {mat_key: obj}; materials: {mat_key: bpy material}."""
    for key, obj in objects.items():
        mat = materials[key]
        obj.data.materials.append(mat)


# ---------------------------------------------------------------- export

def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        use_selection=False,
    )
