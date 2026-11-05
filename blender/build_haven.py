"""Generate Haven: a graduation stage in a forest clearing, with my qualifications on the big board.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_haven.py [-- --preview output/folder]

Writes blender/worlds/haven.blend. This overwrites hand edits, so after the first
build, edit the .blend directly and run export_world.py.
"""

import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

import haven_props  # noqa: E402
import kit  # noqa: E402
import landscape  # noqa: E402
from haven_props import BLUE, FLAG_HANGS_FROM, ORANGE, PURPLE, STAGE_DEPTH, STAGE_HEIGHT, STEP_COUNT, STEP_DEPTH, STEP_WIDTH  # noqa: E402
from kit import GRASS, smoothstep  # noqa: E402
from landscape import LANTERN_CANDELA, LANTERN_COLOUR, LANTERN_RANGE, yaw_toward  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "haven.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "haven_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite_education.exr")

SEED = 20261401

# Haven's colours. Sky, ambient, and moon match src/config/planets.ts.
GROUND = kit.linear(0x4a4a3a)
SKY = kit.linear(0x1e1e28)
AMBIENT = kit.linear(0x50506a)
MOON_COLOUR = kit.linear(0xffffee)
FOG_DENSITY = 0.007
MOONLIGHT = 0.7  # Higher than Hearth, because there's no fire here to help it

# ---------------------------------------------------------------------------
# Layout, in Blender coordinates. Game (x, z) is Blender (x, -z).
# You arrive at the north end, looking south up the aisle at the stage.
# The moon is behind you, so it lights the stage and everything in front of it.
# ---------------------------------------------------------------------------
WALK_RADIUS = 50.0
TREE_LINE = 27.0
FLAT_RADIUS = 27.0

STAGE = (0.0, -13.0)
STAGE_FRONT = STAGE[1] + STAGE_DEPTH / 2
STAGE_BACK = STAGE[1] - STAGE_DEPTH / 2
LECTERN = (0.0, STAGE[1] + 2.0)
BOARD = (0.0, STAGE_BACK + 0.4)
TENT = (0.0, 17.5)
SPAWN = (0.0, 10.5)  # Just outside the tent door
DOG_START = (2.6, 9.0)

STEPS_START = STAGE_FRONT + STEP_COUNT * STEP_DEPTH
AISLE_START, AISLE_END = STEPS_START, 13.0
AISLE_MIDDLE = (AISLE_START + AISLE_END) / 2

BENCH_COLUMNS = (-6.4, -3.4, 3.4, 6.4)
BENCH_ROWS = (-1.0, 2.0, 5.0)
BANNERS = ((-12.0, -6.0, BLUE), (12.0, -6.0, ORANGE), (-12.0, -16.0, PURPLE), (12.0, -16.0, PURPLE))
LANTERNS = ((-10.0, -1.0), (10.0, -1.0), (-12.0, -10.0), (12.0, -10.0), (-13.0, -19.0), (13.0, -19.0))
LIT_LANTERNS = (0, 1, 2, 3)  # The others only glow, which is cheaper
BOOKS = ((-10.0, 1.0), (-11.0, -2.0), (-10.0, -5.0), (11.0, 2.0), (10.0, -4.0))
GUEST_BOOK = (9.0, -2.0)
CONFETTI = (0.0, -11.0, 3.0)  # The bottom middle of the area it falls through

ZONES = [
    (*TENT, 4.6),
    *[(*spot, 0.6) for spot in LANTERNS],
    *[(x, y, 0.5) for x, y, _ in BANNERS],
    *[(*spot, 0.5) for spot in BOOKS],
    (*GUEST_BOOK, 0.8),
]

ROLLING = kit.make_fbm(SEED + 1, 0.016, 5)
RIDGES = kit.make_fbm(SEED + 2, 0.0065, 6)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)


def height(x, y):
    """Exactly flat under the stage and seats, a gentle bowl around them, then hills and far ridges."""
    r = np.hypot(x, y)
    swell = 0.3 * smoothstep(FLAT_RADIUS, 44.0, r) * SWELL(x, y)
    bowl = 8.0 * smoothstep(FLAT_RADIUS, 92.0, r) ** 1.15
    hills = 7.0 * smoothstep(60.0, 140.0, r) * (ROLLING(x, y) + 0.3)
    ridge_reach = smoothstep(150.0, 430.0, r)
    ridge = 90.0 * ridge_reach * (1.0 - np.abs(RIDGES(x, y))) ** 2
    return swell + bowl + hills + ridge + 28.0 * ridge_reach


def rectangle_distance(x, y, centre_x, centre_y, half_x, half_y):
    return np.hypot(np.maximum(np.abs(x - centre_x) - half_x, 0.0), np.maximum(np.abs(y - centre_y) - half_y, 0.0))


def stage_distance(x, y):
    return rectangle_distance(x, y, *STAGE, haven_props.STAGE_WIDTH / 2, STAGE_DEPTH / 2)


def steps_distance(x, y):
    return rectangle_distance(x, y, 0.0, STAGE_FRONT + STEP_COUNT * STEP_DEPTH / 2, STEP_WIDTH / 2, STEP_COUNT * STEP_DEPTH / 2)


def seating_distance(x, y):
    """Distance from the block of benches, which gets a floor of bare earth."""
    return rectangle_distance(x, y, 0.0, 2.0, 7.6, 3.8)


def aisle_distance(x, y):
    """Distance from the walk from the tent to the steps."""
    return rectangle_distance(x, y, 0.0, AISLE_MIDDLE, 0.0, (AISLE_END - AISLE_START) / 2)


def blocked(x, y, path_width=0.0):
    if float(stage_distance(x, y)) < 0.5 or float(steps_distance(x, y)) < 0.4:
        return True
    if float(seating_distance(x, y)) < 0.5:
        return True
    for zx, zy, zr in ZONES:
        if math.hypot(x - zx, y - zy) < zr:
            return True
    return path_width > 0.0 and float(aisle_distance(x, y)) < path_width + 1.2


def paint_wear(wear, wx, wy, edge):
    wear(0.7 * smoothstep(2.4, 0.6, seating_distance(wx, wy) + edge * 2.2))
    wear(0.6 * smoothstep(2.6, 1.0, aisle_distance(wx, wy) + edge * 1.2))
    wear(0.55 * smoothstep(2.2, 0.4, stage_distance(wx, wy) + edge * 1.8))
    wear(0.45 * smoothstep(3.6, 1.8, np.hypot(wx, wy - SPAWN[1] - 1.0) + edge * 2.5))


SITE = landscape.Site(
    "HAVEN", SEED, height, blocked, paint_wear, TREE_LINE, OUT_GROUND, SKY_PREVIEW, SKY, FOG_DENSITY, MOONLIGHT,
    ground=GROUND * 1.25,
    ambient=AMBIENT,
    moon_colour=tuple(MOON_COLOUR),
    grass_base=GROUND * 0.7,
    grass_tip=GRASS * 0.9,
    grass_count=14000,
    undergrowth_start=24.0,
    flower_ring=(10.0, 26.0),
)


def build_ceremony(world, materials):
    solid, cloth, unlit = materials["solid"], materials["cloth"], materials["unlit"]
    items = haven_props.build_all({"solid": solid, "glow": unlit}, AISLE_END - AISLE_START)
    camp = world.group("Campsite")
    lit_group = world.group("Props")
    glow_group = world.group("PropGlow")
    camp_glow = world.group("CampGlow")
    lantern_glow = kit.glow_material("LanternGlass", LANTERN_COLOUR, 1.5)

    def put(item, x, y, yaw=0.0, raised=0.0):
        for bucket, mesh in items[item]:
            group = glow_group if bucket == "glow" else lit_group
            world.place(group, mesh, x, y, yaw=yaw, sink=-raised, name=f"{group.name}_{mesh.name}")

    # The stage faces you, with its carpet running on from the aisle, up the steps, and across it.
    audience = math.pi
    put("stage_platform", *STAGE, audience)
    for index in range(STEP_COUNT):
        put(f"stage_step_{index}", 0.0, STAGE_FRONT + (STEP_COUNT - 1 - index + 0.5) * STEP_DEPTH, audience)
    put("aisle_carpet", 0.0, AISLE_MIDDLE)
    put("lectern", *LECTERN, audience, STAGE_HEIGHT)
    put("qualifications_board", *BOARD, audience, STAGE_HEIGHT)
    world.place(glow_group, haven_props.board_text(unlit), *BOARD, yaw=audience, sink=-STAGE_HEIGHT, name="PropGlow_board_text")

    for x in BENCH_COLUMNS:
        for y in BENCH_ROWS:
            put("bench", x, y, yaw_toward(x, y, x, STAGE[1]))
    for index, (x, y) in enumerate(BOOKS):
        put(f"book_stack_{index % 2}", x, y, 0.6 + index * 1.9)
    put("guest_book", *GUEST_BOOK, 0.3)

    # Banners turned toward the seats. The flags move in the wind, so they're kept apart from the poles.
    flag_group = world.group("Banners")
    flag_material = kit.vertex_material("Banner", True)
    flags = {}
    for x, y, colour in BANNERS:
        if colour not in flags:
            flags[colour] = haven_props.banner_flag(f"banner_flag_{colour:06x}", flag_material, kit.linear(colour), SEED + 300 + len(flags))
        yaw = yaw_toward(x, y, 0.0, SPAWN[1])
        put("banner_pole", x, y, yaw)
        flag_x = x + math.sin(yaw) * haven_props.ARM_REACH
        flag_y = y - math.cos(yaw) * haven_props.ARM_REACH
        world.place(flag_group, flags[colour], flag_x, flag_y, yaw=yaw, sink=-FLAG_HANGS_FROM)

    # Lanterns, with real light only from the ones that reach the seats and the front of the stage.
    post = landscape.lantern_post(solid)
    glass = landscape.lantern_glass(lantern_glow)
    for index, (x, y) in enumerate(LANTERNS):
        yaw = math.atan2(-6.0 - y, -x)
        world.place(camp, post, x, y, yaw=yaw)
        world.place(camp_glow, glass, x, y, yaw=yaw)
        if index in LIT_LANTERNS:
            world.marker(
                f"LanternLight.{index}",
                x + math.cos(yaw) * 0.52,
                y + math.sin(yaw) * 0.52,
                2.1,
                light_candela=LANTERN_CANDELA,
                light_range=LANTERN_RANGE,
                light_colour=LANTERN_COLOUR,
            )

    # The tent home, with its door facing the stage.
    landscape.place_portal_tent(world, camp, cloth, SEED, "home", *TENT, STAGE, 0xffffff)

    # Points the game reads. Move these in Blender to change them.
    world.marker("Spawn", *SPAWN, 0.0, walk_radius=WALK_RADIUS, look_at=STAGE)
    world.marker("DogStart", *DOG_START, 0.0)
    world.marker("Confetti", *CONFETTI)
    # Light spilling off the board, so the stage isn't lost in shadow.
    world.marker("BoardGlow", 0.0, STAGE_BACK + 6.0, STAGE_HEIGHT + 4.0, light_candela=16.0, light_range=22.0, light_colour=(0.55, 0.66, 1.0))


def add_preview_confetti(scene):
    """A stand-in for the falling confetti the game draws live. See Confetti.ts."""
    rng = np.random.default_rng(SEED)
    builder = kit.MeshBuilder()
    colours = [kit.linear(c) for c in (0xb89433, 0xb8ad99, 0x6b4c9e, 0xbf7320, 0x406bb3, 0x992929)]
    for _ in range(110):
        x = CONFETTI[0] + rng.uniform(-12.5, 12.5)
        y = CONFETTI[1] + rng.uniform(-5.0, 5.0)
        z = CONFETTI[2] + rng.uniform(0.0, 11.0)
        colour = colours[rng.integers(len(colours))]
        half = 0.055
        builder.face(*[builder.vert((x + a * half, y, z + b * half), colour) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    mesh = builder.build("preview_confetti", bpy.data.materials["PropGlow"])
    scene.collection.objects.link(bpy.data.objects.new("PreviewConfetti", mesh))


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    preview = argv[argv.index("--preview") + 1] if "--preview" in argv else None

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.preferences.filepaths.save_version = 0

    scene = bpy.context.scene
    rng = np.random.default_rng(SEED)
    world = kit.WorldScene(height)
    materials = landscape.standard_materials()

    trees, _ = landscape.scatter_forest(world, rng, SITE, materials["foliage"], materials["broadleaf"])
    build_ceremony(world, materials)
    landscape.scatter_ground_cover(world, rng, SITE, materials["cover"], materials["solid"], materials["shrub"])
    landscape.build_terrain(SITE, world.collection, landscape.paint_ground(SITE, trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("HAVEN_SAVED objects:", len(bpy.data.objects))

    if preview:
        kit.light_back_faces_like_game("Banner")
        add_preview_confetti(scene)
        shots = {
            "spawn": ((0.0, SPAWN[1], 2.0), (0.0, -13.0, 5.0)),
            "seats": ((-9.0, 7.0, 2.0), (2.0, -13.0, 4.0)),
            "board": ((-1.0, -6.0, STAGE_HEIGHT + 2.0), (0.0, -19.0, STAGE_HEIGHT + 5.2)),
            "banner": ((-7.0, -3.0, 2.0), (-12.0, -8.0, 5.0)),
            "book": ((11.0, 1.0, 1.8), (9.0, -2.0, 1.0)),
            "tent": ((-4.0, 3.0, 2.0), (0.0, 19.0, 3.0)),
        }
        landscape.render_previews(SITE, scene, os.path.abspath(preview), shots)


main()
