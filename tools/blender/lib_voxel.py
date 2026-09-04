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

# Per-face UVs aligned to _FACES corner order. Convention: V increases with
# block height (+cy) so a side texture's "grass lip" (drawn at image top, v=1)
# always sits at the top of the block on EVERY vertical face.
_FACE_UV = {
    "top":    [(0, 0), (0, 1), (1, 1), (1, 0)],
    "bottom": [(0, 0), (1, 0), (1, 1), (0, 1)],
    "north":  [(0, 0), (0, 1), (1, 1), (1, 0)],
    "south":  [(0, 0), (0, 1), (1, 1), (1, 0)],
    "east":   [(0, 0), (0, 1), (1, 1), (1, 0)],
    "west":   [(0, 0), (0, 1), (1, 1), (1, 0)],
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
            uvs = _FACE_UV[face]
            # Author Blender-correct Z-up coords (height on Z). Swapping two
            # axes mirrors geometry, so reverse winding to keep faces outward.
            # After export: three.x=x, three.y=height, three.z=-z.
            quad = [(x + cx, z + cz, y + cy) for (cx, cy, cz) in corners]
            quad.reverse()
            buckets.setdefault(mat, []).append((quad, list(reversed(uvs))))

    if out_collection is None:
        out_collection = bpy.context.scene.collection

    objects = {}
    for mat_name, quads in buckets.items():
        bm = bmesh.new()
        uv_layer = bm.loops.layers.uv.new(f"{mat_name}_uv")
        for quad, uvs in quads:
            verts = [bm.verts.new(p) for p in quad]
            try:
                face = bm.faces.new(verts)
            except ValueError:
                continue
            for loop, (u, v) in zip(face.loops, uvs):
                loop[uv_layer].uv = (u, v)
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


# ---------------------------------------------------------------- authentic block textures
# Hand-authored 16x16 procedural textures that read as recognizable Minecraft
# materials (grass lip, plank grain, bark grooves, cobble grout, clumpy
# foliage) instead of flat colored noise. Deterministic per seed.

TEX_SIZE = 16


class Pix:
    """16x16 RGBA pixel buffer (channels 0..255)."""

    __slots__ = ("px",)

    def __init__(self):
        self.px = [[255, 255, 255, 255] for _ in range(TEX_SIZE * TEX_SIZE)]

    def _i(self, x, y):
        return (y & 15) * TEX_SIZE + (x & 15)

    def set(self, x, y, rgb, a=255):
        self.px[self._i(x, y)] = [rgb[0], rgb[1], rgb[2], a]

    def rect(self, x0, y0, x1, y1, rgb, a=255):
        for y in range(y0, y1):
            for x in range(x0, x1):
                self.set(x, y, rgb, a)

    def noise(self, rgb, amount, rnd):
        for y in range(TEX_SIZE):
            for x in range(TEX_SIZE):
                f = 1.0 + amount * (rnd.random() - 0.5) * 2
                self.set(x, y, [
                    max(0, min(255, int(rgb[0] * f))),
                    max(0, min(255, int(rgb[1] * f))),
                    max(0, min(255, int(rgb[2] * f))),
                ])

    def vline(self, x, y0, y1, rgb, a=255):
        for y in range(y0, y1):
            self.set(x, y, rgb, a)

    def hline(self, y, x0, x1, rgb, a=255):
        for x in range(x0, x1):
            self.set(x, y, rgb, a)

    def to_pixels(self, emissive=0.0):
        out = []
        for i, (r, g, b, a) in enumerate(self.px):
            out.extend((r / 255.0, g / 255.0, b / 255.0, 1.0))
        return out


def _hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def make_block_texture(name, kind, seed=0):
    """Return a Blender Image with an authentic 16x16 block texture."""
    rnd = random.Random(seed if seed else abs(hash(name)) & 0xFFFF)
    p = Pix()

    if kind == "grass_top":
        p.noise(_hx("#5f9e3d"), 0.16, rnd)
        for _ in range(34):
            x = rnd.randrange(16); y = rnd.randrange(11)
            ln = 2 + rnd.randrange(4)
            c = _hx("#6fae44") if rnd.random() < 0.6 else _hx("#4a8331")
            k = 1.0 if rnd.random() < 0.5 else 0.82
            p.vline(x, y, min(16, y + ln), tuple(int(v * k) for v in c))
        for _ in range(3):
            x = rnd.randrange(13); y = rnd.randrange(13)
            p.rect(x, y, x + 3, y + 3, _hx("#4a8331"))

    elif kind == "grass_side":
        p.noise(_hx("#8a5f3c"), 0.16, rnd)
        for y in range(4):
            p.hline(y, 0, 16, tuple(int(v * (0.95 + rnd.random() * 0.15)) for v in _hx("#69a840")))
        for _ in range(8):
            x = rnd.randrange(16); d = 1 + rnd.randrange(2)
            p.vline(x, 3, 3 + d, tuple(int(v * 0.85) for v in _hx("#5da53f")))
        for _ in range(6):
            p.set(rnd.randrange(16), 7 + rnd.randrange(9), _hx("#a37a4c"))
            p.set(rnd.randrange(16), 7 + rnd.randrange(9), _hx("#6b4326"))

    elif kind == "dirt":
        p.noise(_hx("#8a5f3c"), 0.2, rnd)
        for _ in range(10):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#a37a4c"))
        for _ in range(10):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#6b4326"))
        for _ in range(3):
            x = rnd.randrange(12); y = rnd.randrange(12)
            p.rect(x, y, x + rnd.randrange(2, 4), y + 2, _hx("#7c5233"))

    elif kind == "stone":
        p.noise(_hx("#8d8d8d"), 0.13, rnd)
        p.rect(2, 2, 7, 6, _hx("#9b9991"))
        p.rect(9, 8, 15, 13, _hx("#9b9991"))
        p.rect(8, 1, 12, 4, _hx("#7a7a74"))
        p.rect(12, 12, 15, 15, _hx("#7a7a74"))
        for _ in range(3):
            x0 = rnd.randrange(16); y0 = rnd.randrange(16)
            p.set(x0, y0, _hx("#6f6f69"))

    elif kind == "cobble":
        p.noise(_hx("#8c8c84"), 0.06, rnd)
        cells = [(0, 0), (6, 0), (0, 6), (7, 7), (0, 12), (6, 13)]
        for cx, cz in cells:
            w = 5 + rnd.randrange(3); h = 4 + rnd.randrange(2)
            c = tuple(int(v * (0.96 + rnd.random() * 0.1)) for v in _hx("#9a9a92"))
            for yy in range(h - 1):
                for xx in range(w - 1):
                    if (xx == 0 or yy == 0 or xx == w - 2 or yy == h - 2) and rnd.random() < 0.5:
                        p.set(cx + xx, cz + yy, tuple(int(v * 0.78) for v in _hx("#8c8c84")))
                    else:
                        p.set(cx + xx, cz + yy, c)
        for y in range(0, 16):
            for x in range(0, 16, 2):
                if rnd.random() < 0.5:
                    p.set(x, y, tuple(int(v * 0.8) for v in _hx("#8c8c84")))

    elif kind == "plank":
        p.noise(_hx("#a07a45"), 0.1, rnd)
        for y in range(4, 16, 4):
            p.hline(y, 0, 16, tuple(int(v * 0.72) for v in _hx("#a07a45")))
        for _ in range(48):
            y = rnd.randrange(16); x = rnd.randrange(15)
            p.set(x, y, tuple(int(v * 0.82) for v in _hx("#8a6538")))
            p.set(x + 1, y, tuple(int(v * 0.82) for v in _hx("#8a6538")))
        for _ in range(4):
            kx = rnd.randrange(3, 13); ky = rnd.randrange(1, 4)
            p.rect(kx, ky, kx + 1, ky + 1, _hx("#6b4a2b"))
            p.set(kx, ky + 1, _hx("#6b4a2b"))

    elif kind == "log":
        p.noise(_hx("#6b4a2b"), 0.13, rnd)
        for x in range(1, 16, 2):
            p.vline(x, 0, 16, tuple(int(v * 0.72) for v in _hx("#6b4a2b")))
        for x in range(0, 16, 4):
            p.vline(x, 0, 16, tuple(int(v * 1.12) for v in _hx("#7d5731")))

    elif kind == "logtop":
        p.noise(_hx("#9c7c4e"), 0.1, rnd)
        p.rect(2, 2, 14, 14, _hx("#b08a54"))
        p.rect(3, 3, 13, 13, _hx("#8a6338"))
        p.rect(5, 5, 11, 11, _hx("#b08a54"))
        p.rect(7, 7, 9, 9, _hx("#6b4a2b"))

    elif kind == "leaves":
        p.noise(_hx("#4e8f3a"), 0.22, rnd)
        for _ in range(6):
            x = rnd.randrange(10); y = rnd.randrange(10)
            s = 3 + rnd.randrange(2)
            c = _hx("#5da53f") if rnd.random() < 0.55 else _hx("#386f2a")
            p.rect(x, y, x + s, y + s, c)
        for _ in range(40):
            x = rnd.randrange(16); y = rnd.randrange(16)
            p.set(x, y, _hx("#5da53f"))
        for _ in range(6):
            p.rect(rnd.randrange(13), rnd.randrange(13), 16, 16, _hx("#386f2a"))

    elif kind == "blossom":
        p.noise(_hx("#f2a7c3"), 0.16, rnd)
        for _ in range(8):
            x = rnd.randrange(10); y = rnd.randrange(10)
            s = 3 + rnd.randrange(2)
            c = _hx("#ffd9e8") if rnd.random() < 0.5 else _hx("#e888ab")
            p.rect(x, y, x + s, y + s, c)
        for _ in range(50):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#ffd9e8"))
        for _ in range(5):
            p.rect(rnd.randrange(13), rnd.randrange(13), 16, 16, _hx("#e888ab"))

    elif kind == "sand":
        p.noise(_hx("#dcd29b"), 0.13, rnd)
        for _ in range(14):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#c9bd85"))
        for _ in range(10):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#efe4ac"))
        for y in range(4, 16, 6):
            p.hline(y, 0, 16, tuple(int(v * 0.94) for v in _hx("#dcd29b")))

    elif kind == "sandstone":
        p.noise(_hx("#e0bd80"), 0.12, rnd)
        for y in range(3, 16, 4):
            p.hline(y, 0, 16, tuple(int(v * 0.8) for v in _hx("#b98f55")))
        for _ in range(16):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#c9a15e"))

    elif kind == "path":
        p.noise(_hx("#9a9a92"), 0.1, rnd)
        for _ in range(9):
            x = rnd.randrange(11); y = rnd.randrange(11)
            s = 3 + rnd.randrange(3)
            c = _hx("#a8a89f") if rnd.random() < 0.6 else _hx("#878780")
            p.rect(x, y, x + s, y + s, c)
        for _ in range(20):
            p.set(rnd.randrange(16), rnd.randrange(16), _hx("#7c7c74"))

    elif kind == "roof":
        p.noise(_hx("#5a3a28"), 0.12, rnd)
        for y in range(4, 16, 4):
            p.hline(y, 0, 16, tuple(int(v * 0.72) for v in _hx("#5a3a28")))
            p.hline(y - 1, 0, 16, tuple(int(v * 1.1) for v in _hx("#6f4a33")))

    elif kind == "roofterra":
        p.noise(_hx("#c2542f"), 0.14, rnd)
        for y in range(4, 16, 4):
            p.hline(y, 0, 16, tuple(int(v * 0.7) for v in _hx("#c2542f")))
            p.hline(y - 1, 0, 16, tuple(int(v * 1.1) for v in _hx("#d96a42")))

    elif kind == "crop":
        p.noise(_hx("#5b3a22"), 0.16, rnd)
        for x in range(1, 16, 3):
            p.vline(x, 3, 16, _hx("#5da53f"))
            p.vline(x + 1, 4, 16, tuple(int(v * 0.8) for v in _hx("#5da53f")))

    else:
        raise ValueError(f"unknown texture kind: {kind}")

    img = bpy.data.images.new(name, TEX_SIZE, TEX_SIZE)
    img.pixels.foreach_set(p.to_pixels())
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
