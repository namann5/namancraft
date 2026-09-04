# Per-dimension cinematic stills. Renders a recognizable, heroically-composed
# voxel scene for each of the four dimensions so the web landing / dimension
# cards can use rich cinematic imagery instead of the realtime viewport.
#
#   blender --background --factory-startup --python tools/blender/cinematic_dims.py
#
# Controls:
#   DIM        nether | end | skills | projects  (default nether)
#   DIM_RES    "WxH"                              (default 1600x900)
#   DIM_SAMPLES Eevee samples                     (default 96)
#   DIM_OUT    output path                        (default public/dims/<DIM>.png)
#
# Scenes are stylized voxel compositions that mirror the lived-in signature of
# the interactive worlds (colors, structures, lighting) rather than exact
# geometry clones.

import bpy
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_voxel as vx

DIM = os.environ.get("DIM", "nether")
RES = os.environ.get("DIM_RES", "1600x900")
RES_W, RES_H = (int(t) for t in RES.lower().split("x"))
SAMPLES = int(os.environ.get("DIM_SAMPLES", "96"))
DIMS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "dims"))
OUT = os.environ.get("DIM_OUT", os.path.join(DIMS_DIR, f"{DIM}.png"))


# ----------------------------------------------------------------------
# Materials: flat/jittered pixel-textured PBR + pure glow blocks
# ----------------------------------------------------------------------

_MAT_CACHE = {}


def flat(name, hex_color, emissive=0.0, jitter=7, seed=0):
    key = ("flat", name, hex_color, emissive, jitter, seed)
    if key in _MAT_CACHE:
        return _MAT_CACHE[key]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    teximg = vx.make_pixel_texture(f"tex_{name}", hex_color, size=16, jitter=jitter, seed=seed)
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = teximg
    tex.interpolation = "Closest"
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    if emissive > 0:
        bsdf.inputs["Emission Strength"].default_value = emissive
    _MAT_CACHE[key] = mat
    return mat


def glow(name, hex_color, strength=3.0, jitter=0, seed=0):
    key = ("glow", name, hex_color, strength, jitter, seed)
    if key in _MAT_CACHE:
        return _MAT_CACHE[key]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    r, g, b = [(int(hex_color.strip("#")[i:i + 2], 16) / 255.0) for i in (0, 2, 4)]
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
    bsdf.inputs["Emission Color"].default_value = (r, g, b, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    bsdf.inputs["Roughness"].default_value = 0.9
    _MAT_CACHE[key] = mat
    return mat


def all_faces(name):
    return {f: name for f in ("top", "bottom", "north", "south", "east", "west")}


# ----------------------------------------------------------------------
# Generic voxel mesher for an arbitrary named grid
# ----------------------------------------------------------------------

def mesh_grid(grid, face_materials):
    objects = vx.mesh_grid(grid, face_materials)
    return objects


def put(grid, x, y, z, name):
    grid[(int(x), int(y), int(z))] = name


def fill(grid, x0, y0, z0, x1, y1, z1, name):
    for x in range(int(x0), int(x1) + 1):
        for y in range(int(y0), int(y1) + 1):
            for z in range(int(z0), int(z1) + 1):
                put(grid, x, y, z, name)


# ----------------------------------------------------------------------
# Cinematic helpers
# ----------------------------------------------------------------------

def set_world_bg(rgb, strength=0.6):
    world = bpy.data.worlds.new("dim_world")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
        bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = world


def look_at(cam, target):
    from mathutils import Vector
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def add_camera(loc, target, lens=38):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    cam.data.lens = lens
    cam.data.sensor_width = 36
    look_at(cam, target)
    bpy.context.scene.camera = cam
    return cam


def add_sun(color, energy, rot):
    s = bpy.data.lights.new("dim_sun", "SUN")
    s.energy = energy
    s.color = color
    s.angle = math.radians(1.5)
    so = bpy.data.objects.new("dim_sun", s)
    bpy.context.collection.objects.link(so)
    so.rotation_euler = rot
    return so


def add_point(name, color, energy, loc, distance=40, decay=2):
    p = bpy.data.lights.new(name, "POINT")
    p.energy = energy
    p.color = color
    po = bpy.data.objects.new(name, p)
    bpy.context.collection.objects.link(po)
    po.location = loc
    return po


def add_ambient(name, color, energy, x0=-60, x1=60, z0=-60, z1=60, y=45):
    """Wide overhead AREA fill so flat floors/plazas read bright, not murky."""
    p = bpy.data.lights.new(name, "AREA")
    p.energy = energy
    p.color = color
    po = bpy.data.objects.new(name, p)
    bpy.context.collection.objects.link(po)
    po.location = ((x0 + x1) / 2, y, (z0 + z1) / 2)
    po.rotation_euler = (math.radians(90), 0, 0)
    po.scale = ((x1 - x0) / 2, (z1 - z0) / 2, 1)
    return po


def add_stars(count=260, radius=110, seed=99, hex_color="#fff6d8", strength=3.0):
    import bmesh
    rnd = random.Random(seed)
    mat = glow("p_star_dims", hex_color, strength=strength, jitter=2, seed=seed)
    pmesh = bpy.data.meshes.new("dims_stars")
    bm = bmesh.new()
    for _i in range(count):
        theta = rnd.uniform(0, math.pi * 0.92)
        phi = rnd.uniform(-math.pi, math.pi)
        x = radius * math.sin(theta) * math.cos(phi)
        y = radius * math.sin(theta) * math.sin(phi)
        z = radius * math.cos(theta)
        if z < 8:
            z = 8.0
        bm.verts.new((x, y, z))
    bm.to_mesh(pmesh)
    bm.free()
    obj = bpy.data.objects.new("dims_stars", pmesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)


def add_embers(count=120, x0=-30, x1=30, z0=-30, z1=30, ybase=3, hex_color="#ff9a3d",
               seed=77, strength=2.5, size=0.12):
    import bmesh
    rnd = random.Random(seed)
    mat = glow("p_ember_dims", hex_color, strength=strength, seed=seed)
    pmesh = bpy.data.meshes.new("dims_embers")
    bm = bmesh.new()
    for _i in range(count):
        x = rnd.uniform(x0, x1)
        y = rnd.uniform(ybase, ybase + 16)
        z = rnd.uniform(z0, z1)
        bm.verts.new((x, y, z))
    bm.to_mesh(pmesh)
    bm.free()
    obj = bpy.data.objects.new("dims_embers", pmesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.scale = (size, size, size)


def setup_render(out=OUT):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = RES_W
    scene.render.resolution_y = RES_H
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.eevee.taa_render_samples = SAMPLES
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.4
    scene.view_settings.gamma = 1.15
    if hasattr(scene.eevee, "use_bloom"):
        scene.eevee.use_bloom = True
        scene.eevee.bloom_threshold = 0.9
        scene.eevee.bloom_radius = 1.2
        scene.eevee.bloom_intensity = 0.7
    if hasattr(scene.eevee, "use_gtao"):
        scene.eevee.use_gtao = True
        scene.eevee.gtao_distance = 1.5
    os.makedirs(os.path.dirname(out), exist_ok=True)
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("DIM_OK", DIM, out, RES_W, "x", RES_H, "engine=Eevee")


# ----------------------------------------------------------------------
# Scene builders
# ----------------------------------------------------------------------

def build_nether():
    """Blaze Bazaar: netherrack wasteland, lava pools, basalt spires,
    glowing achievement cubes lining a raised path, basalt keep back-right."""
    grid = {}
    fmap = {}
    fm = vx.fbm
    rnd = random.Random(1337)

    mats = {
        "ntr": flat("m_netherrack", "#6d2b1e", jitter=16, seed=1),
        "ntd": flat("m_netherdark", "#4a1a10", jitter=16, seed=2),
        "bas": flat("m_basalt", "#2b2233", jitter=8, seed=3),
        "bsd": flat("m_basaltdark", "#1c1626", jitter=8, seed=4),
        "lava": glow("m_lava", "#ff6a1f", strength=4.5, jitter=6, seed=5),
        "magma": glow("m_magma", "#b3481a", strength=1.4, jitter=10, seed=6),
        "cube_c": glow("m_cube_common", "#cdcdcd", strength=2.6, seed=7),
        "cube_r": glow("m_cube_rare", "#5ec8f0", strength=3.0, seed=8),
        "cube_e": glow("m_cube_epic", "#c78aff", strength=3.2, seed=9),
        "fire": glow("m_fire", "#ffb347", strength=3.5, jitter=12, seed=10),
        "path": flat("m_baspath", "#46333f", jitter=10, seed=11),
    }
    for k in mats:
        fmap[k] = all_faces(k)

    # wasteland floor
    for x in range(-40, 41):
        for z in range(-40, 41):
            n = fm(x * 0.08, z * 0.08, 3, 91)
            ridge = fm(x * 0.16, z * 0.16, 2, 57)
            top = "ntr"
            if ridge > 0.7:
                top = "bas"
            if z > 26 and abs(x) < 6:
                top = "path"
            if n < 0.3 and z < -18 and (x % 7 == 0 or z % 7 == 0):
                top = "magma"
            put(grid, x, 0, z, top)
            # lava pools in the low south-west pocket
            if n < 0.28 and x < -14 and z < -14 and (x + z) % 5 == 0:
                put(grid, x, 1, z, "lava")

    # basalt spires ringing the far edge
    for i in range(7):
        ang = math.radians(-100 + i * 30)
        rad = 34
        cx = int(math.cos(ang) * rad)
        cz = int(math.sin(ang) * rad)
        h = 14 + rnd.randint(0, 10)
        fill(grid, cx - 1, 1, cz - 1, cx + 1, h, cz + 1, "bas")
        fill(grid, cx, h + 1, cz, cx, h + 2, cz, "bas")

    # basalt keep (back)
    fill(grid, -12, 1, 26, -6, 10, 32, "bsd")
    fill(grid, -11, 11, 27, -7, 15, 31, "bsd")
    put(grid, -9, 16, 29, "fire")
    put(grid, -9, 17, 29, "fire")

    # raised path of cubes (achievements) climbing toward the keep
    node_colors = ["cube_c", "cube_r", "cube_e", "cube_r", "cube_c", "cube_e"]
    for i, (px, pz) in enumerate([(-30, 10), (-22, 8), (-14, 6)]):
        fill(grid, px - 1, 1, pz - 1, px + 1, 2, pz + 1, "bas")
        y = 3
        put(grid, px, y, pz, node_colors[i % 3])
        put(grid, px, y + 1, pz, node_colors[i % 3])
    # a few floating achievement cubes mid-air along the mote
    for i, (px, pz, y) in enumerate([(8, -4, 4), (16, -12, 6), (-4, 18, 5)]):
        put(grid, px, y, pz, node_colors[i % 3])
        put(grid, px, y + 1, pz, node_colors[i % 3])

    # scattered fire on netherrack
    for x in range(-38, 39, 3):
        for z in range(-38, 39, 4):
            if rnd.random() < 0.10 and grid.get((x, 0, z)) == "ntr":
                put(grid, x, 1, z, "fire")
                if rnd.random() < 0.5:
                    put(grid, x, 2, z, "fire")

    mesh_grid(grid, fmap)

    set_world_bg((0.10, 0.03, 0.02), strength=1.1)
    add_sun((0.9, 0.55, 0.4), 2.0, (math.radians(58), 0, math.radians(-30)))
    add_point("nl1", (1.0, 0.42, 0.16), 1300, (-9, 16, 29), distance=44)
    add_point("nl2", (1.0, 0.6, 0.35), 800, (-24, 6, 8), distance=44)
    add_point("nl_cube", (0.78, 0.54, 1.0), 420, (0, 6, -10), distance=34)
    add_embers(count=150, x0=-36, x1=36, z0=-36, z1=32, hex_color="#ff9a3d", seed=77)
    add_camera((0, -30, 12), (0, 14, 6), lens=36)


def build_end():
    """The End Archive: floating endstone island with a giant purple RESUME
    book, obsidian pillars, glowing section crystals, in a starlit void."""
    grid = {}
    fmap = {}
    rnd = random.Random(2024)

    mats = {
        "es": flat("m_endstone", "#ded8a2", jitter=10, seed=1),
        "esd": flat("m_endstone_deep", "#b5ad78", jitter=10, seed=2),
        "pp": flat("m_purpur", "#9d6bad", jitter=8, seed=3),
        "ppd": flat("m_purpur_dark", "#6d4380", jitter=8, seed=4),
        "ob": flat("m_obsidian", "#1a1530", jitter=6, seed=5),
        "glow": glow("m_endglow", "#c9a0ff", strength=3.2, seed=6),
        "book": glow("m_book", "#5a3a86", strength=1.2, seed=7),
        "book_page": flat("m_book_page", "#efe9dc", jitter=4, seed=8),
        "crystal": glow("m_crystal", "#c9a0ff", strength=3.5, seed=9),
        "bridge": flat("m_end_bridge", "#b5ad78", jitter=8, seed=10),
    }
    for k in mats:
        fmap[k] = all_faces(k)

    TOP = 10
    # central island: flat endstone top, jagged underside
    for x in range(-16, 17):
        for z in range(-16, 17):
            d = math.hypot(x, z)
            if d > 15.5:
                continue
            edge = d / 15.5
            depth = max(2, int((1 - edge * edge) * 9) + rnd.randint(0, 2))
            for y in range(TOP - depth, TOP + 1):
                idname = "esd"
                if y == TOP:
                    idname = "es"
                elif y == TOP - 1:
                    idname = "esd"
                elif y < TOP - depth + 2:
                    idname = "pp"
                put(grid, x, y, z, idname)

    # ring section islands
    for i, (sx, sz) in enumerate([(22, 0), (15, 15), (0, 22), (-15, 15),
                                  (-22, 0), (-15, -15)]):
        r = 5
        for x in range(sx - r, sx + r + 1):
            for z in range(sz - r, sz + r + 1):
                dd = math.hypot(x - sx, z - sz)
                if dd > r:
                    continue
                depth = max(1, int((1 - (dd / r) ** 2) * 6) + rnd.randint(0, 1))
                for y in range(TOP + 1 - depth, TOP + 2):
                    put(grid, x, y, z, "esd" if y < TOP + 1 else "es")
        put(grid, sx, TOP + 3, sz, "crystal")
        put(grid, sx, TOP + 4, sz, "crystal")

    # bridges connecting ring islands
    for (sx, sz) in [(22, 0), (15, 15), (0, 22), (-15, 15), (-22, 0), (-15, -15)]:
        steps = 24
        for ii in range(0, steps + 1):
            t = ii / steps
            bx = int(round(sx * t)); bz = int(round(sz * t))
            bh = TOP + int(round((1 - t) * 1))
            y = TOP + 1 if abs(sx) > abs(sz) else TOP + 1
            put(grid, bx, y, bz, "bridge")

    # obsidian pillars on the central island
    for px, pz, ph in [(-8, -6, 7), (9, -4, 9), (-6, 8, 6), (7, 9, 8)]:
        fill(grid, px - 1, TOP + 1, pz - 1, px + 1, TOP + ph, pz + 1, "ob")
        put(grid, px, TOP + ph + 1, pz, "glow")

    # giant RESUME book on a purpur pedestal
    fill(grid, -2, TOP + 1, -1, 2, TOP + 2, 1, "ppd")
    # open book: two page slabs + covers
    fill(grid, -4, TOP + 3, -2, -1, TOP + 3, 2, "book_page")
    fill(grid, 1, TOP + 3, -2, 4, TOP + 3, 2, "book_page")
    fill(grid, -5, TOP + 3, -3, -4, TOP + 3, 3, "book")
    fill(grid, 4, TOP + 3, -3, 5, TOP + 3, 3, "book")
    put(grid, 0, TOP + 4, 0, "crystal")

    mesh_grid(grid, fmap)

    set_world_bg((0.04, 0.015, 0.07), strength=0.85)
    add_stars(count=320, radius=120, seed=99, hex_color="#e6d8ff", strength=3.0)
    add_sun((0.85, 0.78, 1.0), 1.6, (math.radians(50), 0, math.radians(-40)))
    add_point("el_book", (0.79, 0.62, 1.0), 1300, (0, TOP + 6, 0), distance=44)
    add_point("el_orb", (0.6, 0.5, 0.9), 800, (-20, 6, -20), distance=55)
    add_camera((-34, -34, 16), (0, 13, 0), lens=40)


def build_skills():
    """The Skill Court: bright teal plateau, neon checker grid, central
    dais + obelisk, rotation-symmetry of glowing tech stations."""
    grid = {}
    fmap = {}
    rnd = random.Random(333)
    GY = 10

    mats = {
        "flr": flat("m_s_floor", "#dff3ee", jitter=4, seed=1),
        "flrA": flat("m_s_floor_alt", "#cde9e0", jitter=4, seed=2),
        "grid": glow("m_s_gridline", "#37e2c4", strength=1.2, seed=3),
        "dark": flat("m_s_dark", "#243335", jitter=6, seed=4),
        "steel": flat("m_s_steel", "#c3ccd0", jitter=6, seed=5),
        "steelD": flat("m_s_steel_dark", "#7c858a", jitter=6, seed=6),
        "white": flat("m_s_white", "#eef1f5", jitter=4, seed=7),
        "cyan": glow("m_s_cyan", "#5decf5", strength=2.6, seed=8),
        "lime": glow("m_s_lime", "#7dff8a", strength=2.6, seed=9),
        "violet": glow("m_s_violet", "#b28aff", strength=2.6, seed=10),
        "magenta": glow("m_s_magenta", "#ff4fd8", strength=2.8, seed=11),
        "amber": glow("m_s_amber", "#ffc857", strength=2.6, seed=12),
    }
    for k in mats:
        fmap[k] = all_faces(k)

    # plateau floor with neon grid lines
    for x in range(-40, 41):
        for z in range(-40, 41):
            top = "flr" if (x + z) % 2 == 0 else "flrA"
            if x % 8 == 0 or z % 8 == 0:
                top = "grid"
            if abs(x) > 39 or abs(z) > 39:
                top = "dark"
            put(grid, x, GY, z, top)

    # central plaza dais + obelisk
    for x in range(-5, 6):
        for z in range(-5, 6):
            d = math.hypot(x, z)
            if d > 5.2:
                continue
            put(grid, x, GY + 1, z, "cyan" if d > 4.2 else "steel")
    fill(grid, -1, GY + 2, -1, 1, GY + 6, 1, "white")
    put(grid, 0, GY + 7, 0, "cyan")

    # tech stations ringing the plaza (16 directions)
    for i in range(16):
        ang = i / 16 * (2 * math.pi)
        rad = 26
        cx = int(round(math.cos(ang) * rad))
        cz = int(round(math.sin(ang) * rad))
        color = ["cyan", "lime", "violet", "magenta", "amber"][i % 5]
        # base pad
        fill(grid, cx - 1, GY + 1, cz - 1, cx + 1, GY + 1, cz + 1, "steelD")
        # vertical glowing pillar + floating emblem
        fill(grid, cx, GY + 2, cz, cx, GY + 5, cz, "steel")
        put(grid, cx, GY + 6, cz, color)
        put(grid, cx, GY + 7, cz, color)

    mesh_grid(grid, fmap)

    set_world_bg((0.68, 0.93, 0.88), strength=0.8)
    add_sun((1.0, 0.97, 0.88), 1.8, (math.radians(50), 0, math.radians(-25)))
    add_point("skl1", (0.5, 0.9, 1.0), 1000, (0, GY + 10, 0), distance=45)
    add_point("skl2", (0.4, 0.6, 0.9), 700, (-22, 6, 20), distance=45)
    add_camera((0, -34, 14), (0, 14, 4), lens=34)


def build_projects():
    """Build District: night city, asphalt avenue, glowing-window towers,
    street lamps, neon project signs."""
    grid = {}
    fmap = {}
    rnd = random.Random(808)
    GY = 10

    mats = {
        "asphalt": flat("m_p_asphalt", "#23262e", jitter=8, seed=1),
        "sidewalk": flat("m_p_sidewalk", "#565c68", jitter=8, seed=2),
        "curb": flat("m_p_curb", "#8a909c", jitter=6, seed=3),
        "glass": flat("m_p_glass", "#35607c", jitter=6, seed=4),
        "brick": flat("m_p_brick", "#7a4a42", jitter=8, seed=5),
        "concrete": flat("m_p_concrete", "#585e6b", jitter=8, seed=6),
        "concreteD": flat("m_p_concrete_dark", "#3c424d", jitter=8, seed=7),
        "sandstone": flat("m_p_sandstone", "#b08f60", jitter=8, seed=8),
        "winW": glow("m_p_win_warm", "#ffcf8a", strength=2.6, seed=9),
        "winC": glow("m_p_win_cool", "#9fd8ff", strength=2.6, seed=10),
        "lamp": glow("m_p_lamp", "#ffe7ad", strength=4.0, seed=11),
        "sign": glow("m_p_sign", "#5ec8f0", strength=3.2, seed=12),
        "signP": glow("m_p_sign_p", "#c78aff", strength=3.2, seed=13),
    }
    for k in mats:
        fmap[k] = all_faces(k)

    # ground
    for x in range(-46, 47):
        for z in range(-34, 35):
            top = "asphalt"
            if abs(x) <= 8:
                top = "curb" if abs(x) == 8 else "sidewalk"
            elif x % 22 == 0:
                top = "sidewalk"
            put(grid, x, GY, z, top)

    buildings = [
        ("glass", "winC", 6, -24, -12, 14, 12),
        ("brick", "winW", 4, -24, 4, 14, 12),
        ("concrete", "winW", 7, -24, 18, 14, 12),
        ("sandstone", "winW", 3, -24, -26, 14, 12),
        ("concreteD", "winC", 5, 10, -12, 14, 12),
        ("glass", "winW", 5, 10, 4, 14, 12),
        ("sandstone", "winW", 3, 10, 18, 14, 12),
        ("brick", "winW", 4, 10, -26, 14, 12),
    ]
    for i, (wall, win, floors, x0, z0, w, d) in enumerate(buildings):
        h = GY + floors
        for x in range(x0, x0 + w):
            for z in range(z0, z0 + d):
                onEdge = x == x0 or x == x0 + w - 1 or z == z0 or z == z0 + d - 1
                if not onEdge:
                    continue
                for y in range(GY + 1, h + 1):
                    idname = wall
                    relY = y - GY
                    if relY >= 2 and relY % 2 == 0:
                        idname = win if rnd.random() < 0.5 else wall
                    put(grid, x, y, z, idname)
        # roof slab + sign
        fill(grid, x0, h, z0, x0 + w - 1, h, z0 + d - 1, wall)
        sx = x0 + w // 2
        sz = z0 + d
        fill(grid, sx - 2, GY + 1, sz, sx + 2, GY + 4, sz, "concreteD")
        put(grid, sx, GY + 5, sz, "signP" if i % 2 else "sign")

    # street lamps along the avenue
    for z in range(-30, 33, 14):
        for lx in (-7, 7):
            fill(grid, lx, GY + 1, z, lx, GY + 4, z, "concrete")
            put(grid, lx, GY + 5, z, "lamp")

    mesh_grid(grid, fmap)

    set_world_bg((0.04, 0.06, 0.12), strength=0.75)
    add_stars(count=300, radius=120, seed=202, hex_color="#dfeeff", strength=2.6)
    add_sun((0.72, 0.8, 0.94), 1.3, (math.radians(55), 0, math.radians(-40)))
    add_point("pl_warm", (1.0, 0.7, 0.48), 1800, (0, 16, 0), distance=60)
    add_point("pl_cool", (0.5, 0.65, 0.95), 1100, (-30, 18, -10), distance=62)
    add_camera((0, -34, 12), (0, 14, 4), lens=36)


# ----------------------------------------------------------------------
# entry
# ----------------------------------------------------------------------

def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img, do_unlink=True)
    _MAT_CACHE.clear()

    builders = {
        "nether": build_nether,
        "end": build_end,
        "skills": build_skills,
        "projects": build_projects,
    }
    if DIM not in builders:
        raise SystemExit(f"unknown DIM: {DIM}")
    builders[DIM]()
    setup_render(OUT)


if __name__ == "__main__":
    main()
