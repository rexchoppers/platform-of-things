"""Generate Grove: a night garden in a forest clearing, where each skill floats above its flower bed.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_grove.py [-- --preview output/folder]

Writes blender/worlds/grove.blend. This overwrites hand edits, so after the first
build, edit the .blend directly and run export_world.py.

Needs blender/logos/atlas.json from build_logos.py.
"""

import json
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

import grove_props  # noqa: E402
import kit  # noqa: E402
import landscape  # noqa: E402
from grove_props import BED_DEPTH, BOARD_HEIGHT, SOIL_HEIGHT  # noqa: E402
from kit import GRASS, smoothstep  # noqa: E402
from landscape import LANTERN_CANDELA, LANTERN_COLOUR, LANTERN_RANGE, yaw_toward  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "grove.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "grove_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite_skills.exr")
LOGO_LAYOUT = os.path.join(ROOT, "blender", "logos", "atlas.json")
LOGO_ATLAS = os.path.join(ROOT, "src", "assets", "worlds", "grove", "logos.webp")

SEED = 20261301

# Grove's colours. Sky, ambient, and moon match src/config/planets.ts.
GROUND = kit.linear(0x1a3a4a)
SKY = kit.linear(0x0a1628)
AMBIENT = kit.linear(0x16637c)
MOON_COLOUR = kit.linear(0x80dfff)
FOG_DENSITY = 0.006
MOONLIGHT = 0.8  # Higher than Hearth, because the ground here is dark and blue

# ---------------------------------------------------------------------------
# Layout, in Blender coordinates. Game (x, z) is Blender (x, -z).
# You arrive on a low rise to the north, looking south over the beds at the aurora.
# The moon is behind you, so it lights everything you're looking at.
# ---------------------------------------------------------------------------
WALK_RADIUS = 48.0
TREE_LINE = 36.0
FLAT_RADIUS = 36.0
RISE = 2.2  # Lifts your view at the tent, so all four rows of logos can be seen at once

CROSSING = (0.0, -5.0)
TENT = (0.0, 28.5)
SPAWN = (0.0, 21.5)  # Just outside the tent door
DOG_START = (2.4, 20.0)
AURORA = (0.0, -300.0, 70.0)

SHORT_BED, LONG_BED = 20.0, 30.0
LEFT, RIGHT = 13.0, -13.0  # As you look south from the tent

# Name, centre, width, colour, how brightly its flowers glow, and its logos from your left to your right.
BEDS = (
    ("Languages", LEFT, 10.0, SHORT_BED, 0x68a063, 0.62, ("php", "nodejs", "python", "java", "go", "csharp", "typescript", "dart")),
    ("Frontend", RIGHT, 10.0, SHORT_BED, 0x61dafb, 0.62, ("react", "angular", "nextjs")),
    ("Backend", LEFT, 0.0, SHORT_BED, 0x61dafb, 0.62, ("laravel", "nestjs", "flask", "dotnet")),
    ("Mobile", RIGHT, 0.0, SHORT_BED, 0x8b5cf6, 0.8, ("flutter", "ionic", "react-native")),
    ("Cloud", LEFT, -10.0, SHORT_BED, 0x2496ed, 0.72, ("aws", "gcp", "digitalocean")),
    ("Data", RIGHT, -10.0, SHORT_BED, 0x336791, 0.48, ("postgres", "mysql", "mongodb", "redis")),
    ("Infrastructure", 0.0, -20.0, LONG_BED, 0xf97316, 0.62, ("docker", "k8s", "github", "gitlab", "nginx", "terraform")),
)
FLOWERS_PER_SQUARE_METRE = 5.0
LEAVES_PER_SQUARE_METRE = 1.3
DAISY_SHARE = 0.65

LOGO_FLOATS = (2.4, 2.9, 3.7, 4.6)  # Rows further from the tent float higher, so they show over the nearer ones
TALLEST_LOGO = 1.5
WIDEST_LOGO = 3.0

LANTERNS = (
    (-2.3, 15.2), (2.3, 15.2),
    (-2.4, -1.3), (2.4, -1.3),
    (-2.4, -14.6), (2.4, -14.6),
    (25.0, 5.0), (-25.0, 5.0),
    (25.0, -12.5), (-25.0, -12.5),
)
LIT_LANTERNS = (0, 1, 4, 5)  # The others only glow, which is cheaper
BENCHES = ((26.6, -5.0), (-26.6, -5.0))
GARDEN_TOOLS = ((24.8, 11.2, 0.5), (-24.8, 8.8, -0.8), (24.8, -8.6, 1.2), (-24.8, -11.2, 2.5))

ZONES = [
    (*TENT, 4.6),
    (*CROSSING, 2.2),
    *[(*spot, 0.6) for spot in LANTERNS],
    *[(*spot, 1.4) for spot in BENCHES],
    *[(x, y, 0.9) for x, y, _ in GARDEN_TOOLS],
    *[(bed[1], bed[2] + BED_DEPTH / 2 + 0.75, 1.4) for bed in BEDS],
]

ROLLING = kit.make_fbm(SEED + 1, 0.016, 5)
RIDGES = kit.make_fbm(SEED + 2, 0.0065, 6)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)


def height(x, y):
    """Flat under the beds, a low rise at the tent, a gentle bowl around it, then hills and far ridges."""
    r = np.hypot(x, y)
    rise = RISE * smoothstep(13.4, 21.0, y) * (1.0 - smoothstep(14.0, 30.0, np.abs(x)))
    swell = 0.3 * smoothstep(FLAT_RADIUS, 48.0, r) * SWELL(x, y)
    bowl = 8.0 * smoothstep(FLAT_RADIUS, 96.0, r) ** 1.15
    hills = 7.0 * smoothstep(64.0, 140.0, r) * (ROLLING(x, y) + 0.3)
    ridge_reach = smoothstep(150.0, 430.0, r)
    ridge = 90.0 * ridge_reach * (1.0 - np.abs(RIDGES(x, y))) ** 2
    return rise + swell + bowl + hills + ridge + 28.0 * ridge_reach


def path_distance(x, y):
    """Distance from the walk down from the tent, and the path across the middle."""
    down = np.hypot(x, np.maximum(np.maximum(-16.0 - y, y - 20.0), 0.0))
    across = np.hypot(np.maximum(np.abs(x) - 25.0, 0.0), y - CROSSING[1])
    return np.minimum(down, across)


def bed_distance(x, y, bed):
    """Distance from one bed's edge, zero inside it."""
    _, bx, by, width, *_ = bed
    return np.hypot(np.maximum(np.abs(x - bx) - width / 2, 0.0), np.maximum(np.abs(y - by) - BED_DEPTH / 2, 0.0))


def blocked(x, y, path_width=0.0):
    for bed in BEDS:
        if float(bed_distance(x, y, bed)) < 0.45:
            return True
    for zx, zy, zr in ZONES:
        if math.hypot(x - zx, y - zy) < zr:
            return True
    return path_width > 0.0 and float(path_distance(x, y)) < path_width + 0.4


def paint_wear(wear, wx, wy, edge):
    wear(0.7 * smoothstep(1.9, 0.5, path_distance(wx, wy) + edge * 1.2))
    wear(0.75 * smoothstep(4.0, 2.2, np.hypot(wx - CROSSING[0], wy - CROSSING[1]) + edge * 2.5))
    wear(0.5 * smoothstep(4.0, 2.2, np.hypot(wx, wy - SPAWN[1] - 2.0) + edge * 2.5))
    for bed in BEDS:
        wear(0.55 * smoothstep(1.4, 0.2, bed_distance(wx, wy, bed) + edge * 1.2))


SITE = landscape.Site(
    "GROVE", SEED, height, blocked, paint_wear, TREE_LINE, OUT_GROUND, SKY_PREVIEW, SKY, FOG_DENSITY, MOONLIGHT,
    ground=GROUND * np.array((2.4, 2.4, 1.5)),  # Lighter and less blue than the world's colour, since the moonlight is blue
    ambient=AMBIENT,
    moon_colour=tuple(MOON_COLOUR),
    grass_base=GROUND * 1.5,
    grass_tip=GRASS * np.array((1.0, 1.25, 1.3)),
    grass_count=20000,
    undergrowth_start=33.0,
    flower_ring=(25.0, 36.0),
)


def bed_colour(hex_colour, strength):
    """The category's colour, at a set brightness, because flowers glow on their own."""
    colour = kit.linear(hex_colour)
    return colour / colour.max() * strength


def plant_beds(world, rng, flower_material, cover):
    flowers = world.group("BedFlowers")
    leaves = world.group("BedLeaves")
    fern = kit.fern("bed_fern", cover, SEED + 400)
    tuft = kit.grass_tuft("bed_tuft", cover, SEED + 401, 7, 0.5, GROUND * 0.6, GRASS * 0.7)
    kinds = {}

    def scatter(bed, per_square_metre):
        """Even coverage with no visible rows: one random spot in each cell of a grid."""
        _, bx, by, width, *_ = bed
        cell = 1.0 / math.sqrt(per_square_metre)
        margin = 0.1
        columns, rows = int((width - margin * 2) / cell), int((BED_DEPTH - margin * 2) / cell)
        for c in range(columns):
            for r in range(rows):
                x = bx - width / 2 + margin + (c + rng.random()) * cell
                y = by - BED_DEPTH / 2 + margin + (r + rng.random()) * cell
                yield x, y

    for bed in BEDS:
        _, _, _, _, hex_colour, strength, _ = bed
        if hex_colour not in kinds:
            colour = bed_colour(hex_colour, strength)
            key = f"{hex_colour:06x}"
            kinds[hex_colour] = (
                grove_props.daisy(f"bed_daisy_{key}", flower_material, SEED + 410, colour),
                grove_props.tulip(f"bed_tulip_{key}", flower_material, SEED + 411, colour),
            )
        daisy, tulip = kinds[hex_colour]
        for x, y in scatter(bed, FLOWERS_PER_SQUARE_METRE):
            mesh = daisy if rng.random() < DAISY_SHARE else tulip
            world.place(flowers, mesh, x, y, rng.uniform(0.85, 1.35), rng.uniform(0, math.tau), -SOIL_HEIGHT)
        for x, y in scatter(bed, LEAVES_PER_SQUARE_METRE):
            mesh = fern if rng.random() < 0.6 else tuft
            size = rng.uniform(0.32, 0.5) if mesh is fern else rng.uniform(0.55, 0.85)
            world.place(leaves, mesh, x, y, size, rng.uniform(0, math.tau), -SOIL_HEIGHT)


def place_logos(world, layout):
    """Markers the game draws the floating logos from. Move them in Blender to change them."""
    rows = sorted({bed[2] for bed in BEDS}, reverse=True)
    placed = []
    for name, bx, by, width, hex_colour, strength, logos in BEDS:
        spacing = width / (len(logos) + 1)
        tallest = min(TALLEST_LOGO, spacing * 0.62)
        widest = min(WIDEST_LOGO, spacing * 0.92)
        float_height = LOGO_FLOATS[rows.index(by)]
        for index, logo in enumerate(logos):
            aspect = layout[logo]["aspect"]
            logo_height = min(tallest, widest / aspect)
            x = bx + width / 2 - spacing * (index + 1)  # Your left is +x when you look south
            z = float(world.height(x, by)) + float_height
            world.marker(
                f"Logo.{logo}",
                x,
                by,
                z,
                uv=layout[logo]["uv"],
                width=logo_height * aspect,
                height=logo_height,
                colour=tuple(float(channel) for channel in bed_colour(hex_colour, strength)),
            )
            placed.append((x, by, z, logo_height * aspect, logo_height, layout[logo]["uv"]))
    return placed


def build_garden(world, rng, materials, layout):
    solid, cloth, unlit, cover = materials["solid"], materials["cloth"], materials["unlit"], materials["cover"]
    items = grove_props.build_all({"solid": solid, "glow": unlit})
    camp = world.group("Campsite")
    lit_group = world.group("Props")
    glow_group = world.group("PropGlow")
    camp_glow = world.group("CampGlow")
    lantern_glow = kit.glow_material("LanternGlass", LANTERN_COLOUR, 1.5)

    def put(item, x, y, yaw):
        for bucket, mesh in items[item]:
            group = glow_group if bucket == "glow" else lit_group
            world.place(group, mesh, x, y, yaw=yaw, name=f"{group.name}_{mesh.name}")

    for name, x, y, width, *_ in BEDS:
        put("flower_bed_long" if width == LONG_BED else "flower_bed_short", x, y, 0.0)
        sign_y = y + BED_DEPTH / 2 + 0.75
        put("bed_sign", x, sign_y, math.pi)
        lettering = landscape.text_mesh(name, 0.3, unlit, (0.0, -0.05, BOARD_HEIGHT), kit.linear(0xf0e8d6) * 0.8)
        world.place(glow_group, lettering, x, sign_y, yaw=math.pi, name=f"PropGlow_sign_{name.lower()}")
    plant_beds(world, rng, kit.vertex_material("BedFlower", True), cover)
    logos = place_logos(world, layout)

    put("stone_plinth", *CROSSING, 0.0)
    world.marker("PlinthLight", CROSSING[0], CROSSING[1], 2.9, light_candela=5.0, light_range=11.0, light_colour=(1.0, 0.76, 0.36))

    for x, y in BENCHES:
        put("bench", x, y, yaw_toward(x, y, *CROSSING))
    for x, y, yaw in GARDEN_TOOLS:
        put("garden_tools", x, y, yaw)

    # Stepping stones down from the tent, past the plinth, and across the middle.
    stones = ("stepping_stone_0", "stepping_stone_1")
    walk = [(rng.uniform(-0.2, 0.2), y) for y in np.arange(19.4, -16.0, -1.3) if abs(y - CROSSING[1]) > 2.0]
    walk += [(x, CROSSING[1] + rng.uniform(-0.2, 0.2)) for x in np.arange(-24.4, 25.0, 1.3) if abs(x) > 2.0]
    for index, (x, y) in enumerate(walk):
        put(stones[index % 2], x, y, rng.uniform(0, math.tau))

    # Lanterns, with their arms held out over the path.
    post = landscape.lantern_post(solid)
    glass = landscape.lantern_glass(lantern_glow)
    for index, (x, y) in enumerate(LANTERNS):
        yaw = math.atan2(CROSSING[1] - y, -x) if abs(x) > 3.0 else (0.0 if x < 0 else math.pi)
        world.place(camp, post, x, y, yaw=yaw)
        world.place(camp_glow, glass, x, y, yaw=yaw)
        if index in LIT_LANTERNS:
            world.marker(
                f"LanternLight.{index}",
                x + math.cos(yaw) * 0.52,
                y + math.sin(yaw) * 0.52,
                float(world.height(x, y)) + 2.1,
                light_candela=LANTERN_CANDELA,
                light_range=LANTERN_RANGE,
                light_colour=LANTERN_COLOUR,
            )

    # The tent home, with its door facing the garden.
    landscape.place_portal_tent(world, camp, cloth, SEED, "home", *TENT, CROSSING, 0xffffff)

    # Points the game reads. Move these in Blender to change them.
    world.marker("Spawn", *SPAWN, 0.0, walk_radius=WALK_RADIUS, look_at=CROSSING)
    world.marker("DogStart", *DOG_START, 0.0)
    world.marker("Aurora", *AURORA)
    return logos


# ---------------------------------------------------------------------------
# Stand-ins for what the game draws live. These follow FloatingLogos.ts and Aurora.ts.
# ---------------------------------------------------------------------------
def add_preview_logos(scene, logos):
    image = bpy.data.images.load(LOGO_ATLAS)
    image.alpha_mode = "PREMUL"
    material = bpy.data.materials.new("PreviewLogos")
    material.use_nodes = True
    material["no_fog"] = True
    tree = material.node_tree
    tree.nodes.clear()
    texture = tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    emission = tree.nodes.new("ShaderNodeEmission")
    tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    emission.inputs["Strength"].default_value = 0.85
    clear = tree.nodes.new("ShaderNodeBsdfTransparent")
    mix = tree.nodes.new("ShaderNodeMixShader")
    tree.links.new(texture.outputs["Alpha"], mix.inputs[0])
    tree.links.new(clear.outputs[0], mix.inputs[1])
    tree.links.new(emission.outputs[0], mix.inputs[2])
    output = tree.nodes.new("ShaderNodeOutputMaterial")
    tree.links.new(mix.outputs[0], output.inputs["Surface"])

    corners, faces, uvs = [], [], []
    for x, y, z, width, tall, (u0, v0, u1, v1) in logos:
        toward = np.array((SPAWN[0] - x, SPAWN[1] - y))
        toward /= np.linalg.norm(toward)
        across = np.array((-toward[1], toward[0]))
        start = len(corners)
        for side, up, u, v in ((-1, -1, u0, v0), (1, -1, u1, v0), (1, 1, u1, v1), (-1, 1, u0, v1)):
            corners.append((x + across[0] * side * width / 2, y + across[1] * side * width / 2, z + up * tall / 2))
            uvs.append((u, v))
        faces.append((start, start + 1, start + 2, start + 3))
    mesh = bpy.data.meshes.new("preview_logos")
    mesh.from_pydata(corners, [], faces)
    layer = mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        layer.uv[loop.index].vector = uvs[loop.vertex_index]
    mesh.materials.append(material)
    scene.collection.objects.link(bpy.data.objects.new("PreviewLogos", mesh))


AURORA_ARC = 2.2
AURORA_HEIGHT = 175.0
AURORA_CURTAINS = ((1.0, 1.0, 0.0), (1.16, 1.2, 2.1), (0.86, 0.8, 4.3))
AURORA_BRIGHTNESS = 0.3


def aurora_light(along, up, phase, time):
    """The same sums as the fragment shader in Aurora.ts."""
    wander = np.sin(along * 9.0 + time * 0.11 + phase) * 2.2
    rays = 0.5 + 0.5 * np.sin(along * 70.0 + wander + time * 0.17)
    rays = rays * (0.62 + 0.38 * np.sin(along * 173.0 - wander * 1.7 - time * 0.29 + phase * 3.0))
    bands = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(along * 11.0 + time * 0.07 + phase * 2.0)) ** 2
    fade = smoothstep(0.0, 0.09, up) * (1.0 - up) ** 1.8
    ends = smoothstep(0.0, 0.14, along) * (1.0 - smoothstep(0.86, 1.0, along))
    low, high = np.array((0.1, 1.0, 0.55)), np.array((0.15, 0.7, 0.95))
    colour = low + (high - low) * smoothstep(0.1, 0.8, up)[..., None]
    return colour * (rays * bands * fade * ends * AURORA_BRIGHTNESS)[..., None]


def add_preview_aurora(scene):
    width, tall = 1536, 256
    along, up = np.meshgrid(np.linspace(0, 1, width), np.linspace(0, 1, tall))
    radius = math.hypot(AURORA[0], AURORA[1])
    bearing = math.atan2(AURORA[0], AURORA[1])
    for index, (reach, height_scale, phase) in enumerate(AURORA_CURTAINS):
        light = aurora_light(along, up, phase, 40.0)
        rgba = np.ones((tall, width, 4), dtype=np.float32)
        # The game adds these straight to the screen's colours, while the preview adds before converting.
        rgba[..., :3] = np.where(light <= 0.04045, light / 12.92, ((light + 0.055) / 1.055) ** 2.4)
        image = bpy.data.images.new(f"aurora_{index}", width, tall, float_buffer=True)
        image.pixels.foreach_set(rgba.ravel())
        image.pack()

        material = bpy.data.materials.new(f"PreviewAurora{index}")
        material.use_nodes = True
        material["no_fog"] = True
        tree = material.node_tree
        tree.nodes.clear()
        texture = tree.nodes.new("ShaderNodeTexImage")
        texture.image = image
        image.colorspace_settings.name = "Linear Rec.709"
        emission = tree.nodes.new("ShaderNodeEmission")
        tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
        clear = tree.nodes.new("ShaderNodeBsdfTransparent")
        add = tree.nodes.new("ShaderNodeAddShader")
        tree.links.new(emission.outputs[0], add.inputs[0])
        tree.links.new(clear.outputs[0], add.inputs[1])
        output = tree.nodes.new("ShaderNodeOutputMaterial")
        tree.links.new(add.outputs[0], output.inputs["Surface"])

        segments = 72
        verts, faces, uvs = [], [], []
        for s in range(segments + 1):
            t = s / segments
            angle = bearing + (t - 0.5) * AURORA_ARC
            r = radius * reach * (1.0 + 0.05 * math.sin(t * 7.0 + phase))
            x, y = math.sin(angle) * r, math.cos(angle) * r
            verts += [(x, y, AURORA[2]), (x, y, AURORA[2] + AURORA_HEIGHT * height_scale)]
            uvs += [(t, 0.0), (t, 1.0)]
            if s < segments:
                faces.append((s * 2, s * 2 + 2, s * 2 + 3, s * 2 + 1))
        mesh = bpy.data.meshes.new(f"preview_aurora_{index}")
        mesh.from_pydata(verts, [], faces)
        layer = mesh.uv_layers.new(name="UVMap")
        for loop in mesh.loops:
            layer.uv[loop.index].vector = uvs[loop.vertex_index]
        mesh.materials.append(material)
        scene.collection.objects.link(bpy.data.objects.new(f"PreviewAurora{index}", mesh))


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    preview = argv[argv.index("--preview") + 1] if "--preview" in argv else None

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.preferences.filepaths.save_version = 0

    with open(LOGO_LAYOUT, encoding="utf-8") as handle:
        layout = json.load(handle)

    scene = bpy.context.scene
    rng = np.random.default_rng(SEED)
    world = kit.WorldScene(height)
    materials = landscape.standard_materials()

    trees, _ = landscape.scatter_forest(world, rng, SITE, materials["foliage"], materials["broadleaf"])
    logos = build_garden(world, rng, materials, layout)
    landscape.scatter_ground_cover(world, rng, SITE, materials["cover"], materials["solid"], materials["shrub"])
    landscape.build_terrain(SITE, world.collection, landscape.paint_ground(SITE, trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("GROVE_SAVED objects:", len(bpy.data.objects))

    if preview:
        kit.show_unlit_in_preview("BedFlower")
        add_preview_logos(scene, logos)
        add_preview_aurora(scene)
        shots = {
            "spawn": ((0.0, SPAWN[1], RISE + 2.0), (0.0, -30.0, 3.5)),
            "bed": ((5.0, 15.0, 2.2), (16.0, 10.0, 2.4)),
            "crossing": ((-7.0, -3.5, 2.0), (2.5, -6.0, 2.2)),
            "south": ((0.0, -3.5, 2.0), (0.0, -60.0, 24.0)),
            "tent": ((-5.0, 13.5, 2.0), (0.0, 30.0, 3.0)),
        }
        landscape.render_previews(SITE, scene, os.path.abspath(preview), shots)


main()
