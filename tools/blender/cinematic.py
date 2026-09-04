# Cinematic hero build: Naman dead-center/right-third, clock left, path
# center, house right, mountains + stars + portal + warm lights. Renders an
# Eevee still to public/hero/hero.png. Reuses the canonical voxel world so
# the cinematic matches the interactive world's landmarks.
#
#   blender --background --factory-startup --python tools/blender/cinematic.py
#
# Controls:
#   CINE_RES   output resolution, e.g. "1920x1080" (default hero-ish 1600x900)
#   CINE_SAMPLES  Eevee samples (default 128)
#   CINE_OUT   output file path (default public/hero/hero.png)
#   CINE_SCENE  "hero" (default) | "portal" (look down the path at portal)
#               | "hero_loop" (anim: orbiting dolly, renders video to hero.mp4)
#   CINE_FRAMES  animation frame count (default 90)
#   CINE_FPS     animation frames-per-second (default 30)

import bpy
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_voxel as vx
import build_world as bw

OUT_DEFAULT = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "public", "hero", "hero.png"))
VIDEO_DEFAULT = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "public", "hero", "hero.mp4"))

RES = os.environ.get("CINE_RES", "1600x900")
RES_W, RES_H = (int(t) for t in RES.lower().split("x"))
SAMPLES = int(os.environ.get("CINE_SAMPLES", "128"))
OUT = os.environ.get("CINE_OUT", OUT_DEFAULT)
SCENE = os.environ.get("CINE_SCENE", "hero")
FRAMES = int(os.environ.get("CINE_FRAMES", "90"))
FPS = int(os.environ.get("CINE_FPS", "30"))

vx.set_seed(1337)
bw.register_block  # ensure the in-file banner/table globals are defined


# ----------------------------------------------------------------------
# Materials: reuse build_world's voxel materials + cinematic extras
# ----------------------------------------------------------------------

def light_energy(color, energy):
    p = bpy.data.lights.new("lx", "POINT")
    p.energy = energy
    p.color = color
    return p


def build_world_materials():
    materials = {}
    materials.update(bw.register_block("grass", "grass_top", "#6faa3f", jitter=16, seed=1, kind="grass_top"))
    materials.update(bw.register_block("grass_side", "grass_side", "#8a5f3c",
                                       speckle=0.10, speckle_hex="#6faa3f", seed=2, kind="grass_side"))
    bw.FACE_MATERIALS["grass"] = {
        "top": "mat_grass_top",
        "north": "mat_grass_side", "south": "mat_grass_side",
        "east": "mat_grass_side", "west": "mat_grass_side",
        "bottom": "mat_dirt",
    }
    materials.update(bw.register_block("dirt", "dirt", "#8a5f3c", jitter=14, seed=3, kind="dirt"))
    materials.update(bw.register_block("stone", "stone", "#8d8d8d", jitter=10, seed=4, kind="cobble"))
    materials.update(bw.register_block("path", "path_stone", "#9a9a92", jitter=12, seed=5, kind="path"))
    materials.update(bw.register_block("sand", "sand", "#dcd29b", jitter=10, seed=6, kind="sand"))
    materials.update(bw.register_block("water", "water", "#3f76e4", jitter=8, seed=7))
    materials.update(bw.register_block("plank", "plank", "#a07a45", jitter=10, seed=8, kind="plank"))
    materials.update(bw.register_block("flame", "flame", "#ffb347", jitter=18,
                                       speckle=0.15, speckle_hex="#ffe066", emissive=1.2, seed=9))
    materials.update(bw.register_block("log", "log", "#6b4a2b", jitter=12, seed=30, kind="log"))
    materials.update(bw.register_block("logtop", "logtop", "#9c7c4e", jitter=10, seed=33, kind="logtop"))
    bw.FACE_MATERIALS["log"] = {
        "top": "mat_logtop", "bottom": "mat_logtop",
        "north": "mat_log", "south": "mat_log",
        "east": "mat_log", "west": "mat_log",
    }
    materials.update(bw.register_block("leaves", "leaves", "#4e8f3a", jitter=20,
                                       speckle=0.10, speckle_hex="#3a6f2b",
                                       emissive=0.10, seed=31, kind="leaves"))
    materials.update(bw.register_block("blossom", "blossom", "#f2a7c3", jitter=14,
                                       speckle=0.08, speckle_hex="#ffd9e8",
                                       emissive=0.45, seed=32, kind="blossom"))
    materials.update(bw.register_block("roof", "roof", "#5a3a28", jitter=12, seed=33, kind="roof"))
    materials.update(bw.register_block("window", "window", "#ffc97e", jitter=6, emissive=2.0, seed=34))
    materials.update(bw.register_block("vine", "vine", "#3f7d3c", jitter=16,
                                       speckle=0.08, speckle_hex="#2c5c2a", seed=35))
    materials.update(bw.register_block("farm", "farm", "#5b3a22", jitter=14, seed=36))
    materials.update(bw.register_block("crop", "crop", "#5da53f", jitter=16,
                                       emissive=0.08, seed=37, kind="crop"))
    materials.update(bw.register_block("flower_pink", "flower_pink", "#ff8fb3",
                                       jitter=10, speckle=0.12, speckle_hex="#fff0f5",
                                       emissive=0.45, seed=38))
    materials.update(bw.register_block("flower_yellow", "flower_yellow", "#ffd166",
                                       jitter=10, speckle=0.12, speckle_hex="#fff3c4",
                                       emissive=0.45, seed=39))
    materials.update(bw.register_block("flower_red", "flower_red", "#e04848",
                                       jitter=10, speckle=0.12, speckle_hex="#ffb3a0",
                                       emissive=0.40, seed=40))
    materials.update(bw.register_block("clockglow", "clockglow", "#ffcf8a", jitter=5, emissive=2.4, seed=41))
    materials.update(bw.register_block("clockdark", "clockdark", "#141420", jitter=6, seed=42))
    for name in bw.ZONES:
        materials.update(bw.register_block(
            f"beacon_{name}", f"beacon_{name}",
            "#ffd9a0" if name == "about" else {
                "stats": "#ffe066", "skills": "#b28aff",
                "projects": "#6cc4f5", "mine": "#ff9d5c",
            }[name],
            jitter=4, emissive=1.6, seed=20))
    return materials


# ----------------------------------------------------------------------
# Player: Naman, Minecraft-proportioned from voxels, dedicated pixel skin
# ----------------------------------------------------------------------

def make_skin():
    """16x32 (skirted) or 16x16 pixel skin tile set. We author a compact
    16x16 'front view' skin (head+hoodie+arms+legs mapped onto box faces)."""
    p = vx.Pix()
    rnd = random.Random(88)
    # --- head (x 2..13, y 10..15): skin + hair + face
    skin = vx._hx("#d9a06b")
    hair = vx._hx("#2a2018")
    hood = vx._hx("#22445f")
    face_d = vx._hx("#d9a06b")
    # hair top + crown
    p.rect(2, 14, 14, 16, hair)
    p.rect(2, 13, 14, 14, hair)
    # face skin
    p.rect(3, 10, 13, 14, face_d)
    # eyes (dark), aligned left/right of center
    for ex in (5, 10):
        p.rect(ex, 12, ex + 2, 13, vx._hx("#241b16"))
        p.rect(ex, 11, ex + 2, 12, vx._hx("#3a2a1c"))
    # mouth
    p.rect(6, 10, 10, 11, vx._hx("#8a4a35"))
    # hair side locks wrapped to left/right edges
    p.rect(2, 11, 3, 15, hair)
    p.rect(13, 11, 14, 15, hair)

    # --- body rows y 6..9: hoodie with center zip
    body = hood
    p.rect(3, 6, 13, 10, body)
    # hoodie shading
    for y in range(6, 10):
        p.hline(y, 3, 13, tuple(int(v * (0.88 + (y % 2) * 0.1)) for v in hood))
    # center zip (dark)
    p.vline(8, 6, 10, vx._hx("#16293a"))
    # pocket line
    p.hline(7, 4, 12, vx._hx("#1d3447"))

    # --- arms y 6..9 on outer columns (darker hoodie)
    arm = vx._hx("#1c3a52")
    p.rect(1, 6, 3, 10, arm)
    p.rect(13, 6, 15, 10, arm)

    # --- legs y 1..5: dark pants + shoes
    pants = vx._hx("#24313f")
    p.rect(5, 0, 8, 6, pants)
    p.rect(8, 0, 11, 6, pants)
    # shoes (dark grey)
    shoe = vx._hx("#1b222b")
    p.rect(5, 0, 8, 2, shoe)
    p.rect(8, 0, 11, 2, shoe)

    img = bpy.data.images.new("tex_player", 16, 16)
    img.pixels.foreach_set(p.to_pixels())
    img.pack()
    return img


def box_material(mat_name, image, emissive=0.0):
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(mat_name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Closest"
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.9
        if emissive > 0:
            bsdf.inputs["Emission Color"].default_value = (1, 1, 1, 1)
            bsdf.inputs["Emission Strength"].default_value = emissive
    return mat


def add_box(name, cx, cy, cz, sx, sy, sz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cz, cy))
    o = bpy.context.object
    o.name = name
    o.scale = (sx, sz, sy)
    o.data.materials.clear()
    o.data.materials.append(mat)
    # single-material cube -> one node for all faces; UV unwrap once
    return o


def build_player(px, pz, py):
    """Voxel-proportioned Naman facing +Z (looking into the world, +z)."""
    skin = make_skin()
    m_head = box_material("p_head", skin)
    m_body = box_material("p_body", skin)
    m_arm = box_material("p_arm", skin)
    m_leg = box_material("p_leg", skin)
    m_shoe = box_material("p_shoe", skin)

    h = 0.5   # half-size of a unit block for the head/limbs
    # head: 8px cube at top
    add_box("p_head", px, py + 1.5, pz, h, h, h, m_head)
    # body: hoodie torso (slightly inset)
    add_box("p_body", px, py + 0.875, pz, 0.42, 0.52, 0.25, m_body)
    # arms at the torso sides
    add_box("p_armL", px - 0.36, py + 0.85, pz, 0.14, 0.50, 0.18, m_arm)
    add_box("p_armR", px + 0.36, py + 0.85, pz, 0.14, 0.50, 0.18, m_arm)
    # legs
    add_box("p_legL", px - 0.15, py + 0.33, pz, 0.16, 0.50, 0.20, m_leg)
    add_box("p_legR", px + 0.15, py + 0.33, pz, 0.16, 0.50, 0.20, m_leg)
    # shoes
    add_box("p_shoeL", px - 0.15, py + 0.07, pz + 0.02, 0.17, 0.12, 0.22, m_shoe)
    add_box("p_shoeR", px + 0.15, py + 0.07, pz + 0.02, 0.17, 0.12, 0.22, m_shoe)
    return px, py, pz


# ----------------------------------------------------------------------
# Cinematic overlay: portal, stars, mountains, mist, lights
# ----------------------------------------------------------------------

def add_portal(cx, cy, cz, facing="z"):
    """Obsidian frame + purple emissive eye (planar, facing camera)."""
    half_w, half_h = 2.0, 3.0
    thickness = 0.35
    obsidian = box_material("p_obsidian", vx.make_block_texture("tex_obsidian", "stone" if False else "cobble", seed=77), 0)
    obsidian.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.10, 0.08, 0.16, 1)
    purple = box_material("p_portal", vx.make_block_texture("tex_portal", "stone", seed=78), 0)
    purple.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.35, 0.10, 0.55, 1)
    purple.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 4.0

    # frame: vertical columns + top/bottom beams (cubes)
    for dx in (-half_w, half_w):
        for seg, y0, y1 in [(-1, -half_h, half_h), (1, -half_h, half_h)]:
            add_box("frame", cx + dx, cy + (y0 + y1) / 2, cz, thickness, (y1 - y0), thickness, obsidian)
    for sz in (-half_h, half_h):
        add_box("frameTop" if sz > 0 else "frameBot",
                cx, cy + half_h * (1 if sz > 0 else 1), cz + 0.001 * sz, (half_w * 2 + thickness), thickness, thickness, obsidian) if sz > 0 else add_box(
                "frameBot", cx, cy - half_h, cz, (half_w * 2 + thickness), thickness, thickness, obsidian)
    # emissive eye plane
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, cz, cy))
    eye = bpy.context.object
    eye.name = "portal_eye"
    eye.scale = (half_w * 2, half_h * 2, 1)
    eye.rotation_euler = (math.pi / 2, 0, 0)
    eye.data.materials.clear()
    eye.data.materials.append(purple)
    return (cx, cy, cz)


def add_stars(sky_top_y, radius=120, count=320, seed=99):
    import bmesh
    rnd = random.Random(seed)
    m = box_material("p_star",
                     vx.make_pixel_texture("tex_star", "#fff6d8", size=4, jitter=2, seed=seed), 3.0)
    pmesh = bpy.data.meshes.new("stars")
    bm = bmesh.new()
    for _i in range(count):
        theta = rnd.uniform(0, math.pi * 0.9)
        phi = rnd.uniform(-math.pi, math.pi)
        x = radius * math.sin(theta) * math.cos(phi)
        y = radius * math.sin(theta) * math.sin(phi)
        z = radius * math.cos(theta)
        if z < 6:
            z = 6.0
        bm.verts.new((x, y, z))
    bm.verts.ensure_lookup_table()
    isl = bm.verts.layers.int.new("star_seed")
    for i, v in enumerate(bm.verts):
        v[isl] = i
    bm.to_mesh(pmesh)
    bm.free()
    obj = bpy.data.objects.new("stars", pmesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(m)


def add_mountains(heights, horizon_y, seed=555):
    """Distant voxel-ish mountain silhouettes ringing the skyline (one mesh)."""
    import bmesh
    rnd = random.Random(seed)
    m = box_material("p_mtn", vx.make_block_texture("tex_mtn", "stone", seed=700), 0)
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05, 0.07, 0.13, 1)

    cells = set()
    for i in range(16):
        mz = -58 - i * 8
        mh = horizon_y + 6 + rnd.randint(6, 26)
        mw = 16 + rnd.randint(4, 22)
        mcx = -112 + i * 15
        for x in range(int(mcx - mw / 2), int(mcx + mw / 2)):
            top = mh - abs(x - mcx) / (mw / 2) * (mh - horizon_y - 2)
            for y in range(int(horizon_y - 2), int(top) + 1):
                if vx.value_noise(x * 0.3, mz * 0.3, seed=i * 7) > 0.5:
                    continue
                cells.add((x, y, mz))

    mm = bpy.data.meshes.new("mountains")
    bm = bmesh.new()
    cube_offs = [(0,0,0),(0,0,1),(0,1,0),(0,1,1),(1,0,0),(1,0,1),(1,1,0),(1,1,1)]
    for (cx, cy, cz) in cells:
        v = [bm.verts.new((cx+dx, cz+dz, cy+dy)) for (dx, dy, dz) in cube_offs]
        a,b,c,d,e,f,g,h = v
        bm.faces.new((a,b,c)); bm.faces.new((a,c,d))
        bm.faces.new((e,g,f)); bm.faces.new((e,h,g))
        bm.faces.new((a,e,f)); bm.faces.new((a,f,b))
        bm.faces.new((c,g,h)); bm.faces.new((c,h,d))
        bm.faces.new((b,f,g)); bm.faces.new((b,g,c))
        bm.faces.new((d,h,e)); bm.faces.new((d,e,a))
    bm.to_mesh(mm)
    bm.free()
    obj = bpy.data.objects.new("mountains", mm)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(m)
    print("mountains cubes:", len(cells))


def setup_lights():
    # cool blue moonlight (directional)
    moon = bpy.data.lights.new("moon", "SUN")
    moon.energy = 2.2
    moon.angle = math.radians(1.5)
    moon.color = (0.55, 0.65, 0.95)
    mo = bpy.data.objects.new("moon", moon)
    bpy.context.collection.objects.link(mo)
    mo.rotation_euler = (math.radians(58), 0, math.radians(-35))
    # faint cool fill from behind camera
    fill = bpy.data.lights.new("fill", "AREA")
    fill.energy = 60
    fill.color = (0.5, 0.6, 0.9)
    fo = bpy.data.objects.new("fill", fill)
    bpy.context.collection.objects.link(fo)
    fo.location = (0, 60, 40)
    fo.rotation_euler = (math.radians(90), 0, 0)
    fo.scale = (30, 30, 1)

    # warm lantern / house / clock / portal lights
    warm = (1.0, 0.62, 0.30)
    for (lx_, _, lz_) in bw.LANTERN_SPOTS:
        p = light_energy(warm, 45)
        po = bpy.data.objects.new(f"lantern_{lx_}_{lz_}", p)
        bpy.context.collection.objects.link(po)
        po.location = (lx_, lz_, 6.0)
    # house interior warm glow
    hx = (bw.HX0 + bw.HX1) / 2
    hz = (bw.HZ0 + bw.HZ1) / 2
    p = light_energy(warm, 320)
    po = bpy.data.objects.new("house_light", p)
    bpy.context.collection.objects.link(po)
    po.location = (hx, hz, bw.HOUSE_Y + 4)
    # clock glow warm
    p = light_energy((1.0, 0.72, 0.4), 160)
    po = bpy.data.objects.new("clock_light", p)
    bpy.context.collection.objects.link(po)
    po.location = (-24, 10, bw.clock_y + 7) if hasattr(bw, "clock_y") else (-24, 10, 16)
    # portal purple
    p = light_energy((0.7, 0.35, 1.0), 500)
    po = bpy.data.objects.new("portal_light", p)
    bpy.context.collection.objects.link(po)
    po.location = (0, 12, 8)


def set_world_night():
    world = bpy.data.worlds.new("night")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.02, 0.03, 0.06, 1)
        bg.inputs["Strength"].default_value = 0.6
    bpy.context.scene.world = world


def look_at(cam, target):
    from mathutils import Vector
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def set_camera_hero():
    bpy.ops.object.camera_add(location=(0, -42, 13))
    cam = bpy.context.object
    cam.data.lens = 38
    cam.data.sensor_width = 36
    look_at(cam, (2, 30, 8))
    bpy.context.scene.camera = cam
    return cam


def set_camera_portal():
    bpy.ops.object.camera_add(location=(0, -30, 9))
    cam = bpy.context.object
    cam.data.lens = 38
    cam.data.sensor_width = 36
    look_at(cam, (0, 14, 9))
    bpy.context.scene.camera = cam
    return cam


def set_camera_loop(frames, target=(4, 22, 10), radius=58, height=13, base_angle=-20,
                    sway_deg=9, turns=1, height_amp=1.6):
    """Slow cinematic sway that returns to its start pose -> seamless loop.
    The camera pans a few degrees left/right around `target`, pushes in/out
    very slightly, and bobs vertically. `turns` integer keeps the endpoints
    identical so the loop wraps cleanly. Sweeps are subtle so the modeled
    front of the scene (player/portal/house/clock) stays in frame."""
    bpy.ops.object.camera_add(location=(target[0] + radius, target[2], height))
    cam = bpy.context.object
    cam.data.lens = 34
    cam.data.sensor_width = 36

    sc = bpy.context.scene
    sc.frame_start = 1
    sc.frame_end = frames
    for f in range(1, frames + 1):
        t = (f - 1) / frames
        theta = math.radians(base_angle) + math.radians(sway_deg) * math.sin(2 * math.pi * turns * t)
        rr = radius + 2.0 * math.sin(2 * math.pi * turns * t)
        px = target[0] + rr * math.sin(theta)
        pz = target[2] + rr * math.cos(theta)
        py = height + height_amp * math.sin(2 * math.pi * turns * t)
        cam.location = (px, pz, py)
        look_at(cam, target)
        cam.keyframe_insert(data_path="location", frame=f)
        cam.keyframe_insert(data_path="rotation_euler", frame=f)
    bpy.context.scene.camera = cam
    return cam


def setup_render(anim=False, out=None, frames=None, fps=FPS):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = RES_W
    scene.render.resolution_y = RES_H
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.eevee.taa_render_samples = SAMPLES
    if anim:
        # Blender 5.x: video output is enabled via media_type='VIDEO'
        # (file_format='FFMPEG' was removed). Container/codec below.
        scene.render.image_settings.media_type = "VIDEO"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "HIGH"
        scene.render.ffmpeg.ffmpeg_preset = "GOOD"
        scene.render.ffmpeg.audio_codec = "NONE"
        scene.render.fps = fps
        scene.frame_start = 1
        scene.frame_end = frames or FRAMES
        if out:
            scene.render.filepath = out
    # cinematic color management: SDR-ish cinematic look
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.4
    scene.view_settings.gamma = 1.15
    # disable the horizon grid/route world background artifacts
    setattr(scene.eevee, "use_bloom", True) if hasattr(scene.eevee, "use_bloom") else None
    if hasattr(scene.eevee, "bloom_threshold"):
        scene.eevee.bloom_threshold = 0.9
        scene.eevee.bloom_radius = 1.2
        scene.eevee.bloom_intensity = 0.7
    if hasattr(scene.eevee, "use_volumetric"):
        scene.eevee.use_volumetric = True
        scene.eevee.volumetric_tile_size = "16"
    if hasattr(scene.eevee, "use_gtao"):
        scene.eevee.use_gtao = True
        scene.eevee.gtao_distance = 2.0


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img, do_unlink=True)

    heights = bw.build_heights()
    grid = bw.fill_world(heights)
    materials = bw.build_materials()
    objects = vx.mesh_grid(grid, bw.FACE_MATERIALS)
    vx.assign_materials(objects, materials)

    # Naman stands just south of the plaza, facing north (into the world)
    build_player(px=4.0, pz=6.0, py=bw.PLAZA_Y)

    # cinematic overlay
    set_world_night()
    add_portal(0, 8.0, 13, facing="z")
    add_stars(sky_top_y=44, radius=120, count=280)
    add_mountains(heights, horizon_y=16, seed=555)
    setup_lights()

    if SCENE == "hero_loop":
        cam = set_camera_loop(FRAMES)
        setup_render(anim=True, out=VIDEO_DEFAULT, frames=FRAMES)
        os.makedirs(os.path.dirname(VIDEO_DEFAULT), exist_ok=True)
        bpy.ops.render.render(animation=True)
        print("CINE_OK", VIDEO_DEFAULT, RES_W, "x", RES_H, "frames", FRAMES, "@", FPS, "fps engine=Eevee")
        return

    cam = set_camera_portal() if SCENE == "portal" else set_camera_hero()
    setup_render()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    scene = bpy.context.scene
    scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    print("CINE_OK", OUT, RES_W, "x", RES_H, "engine=Eevee")


if __name__ == "__main__":
    main()
