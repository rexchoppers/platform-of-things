"""Generate Workshop: a forge yard in a forest clearing, with benches waiting for my projects.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_workshop.py [-- --preview output/folder]

Writes blender/worlds/workshop.blend. This overwrites hand edits, so after the first
build, edit the .blend directly and run export_world.py.
"""

import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

import kit  # noqa: E402
import landscape  # noqa: E402
import workshop_props  # noqa: E402
from kit import GRASS, smoothstep  # noqa: E402
from landscape import LANTERN_CANDELA, LANTERN_COLOUR, LANTERN_RANGE, yaw_toward  # noqa: E402
from workshop_props import BENCH_VARIANTS, MAST_TOP, SIGN_HEIGHT, SIGN_REACH  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "workshop.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "workshop_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite_projects.exr")

SEED = 20261601

# Workshop's colours. Sky, ambient, and moon match src/config/planets.ts.
GROUND = kit.linear(0x3a2020)
SKY = kit.linear(0x1a0a0a)
AMBIENT = kit.linear(0x6a4030)
MOON_COLOUR = kit.linear(0xffaa66)
FOG_DENSITY = 0.009
MOONLIGHT = 0.95

# ---------------------------------------------------------------------------
# Layout, in Blender coordinates. Game (x, z) is Blender (x, -z).
# You arrive at the north end, looking south at the forge, with the benches
# in an arc around it. They all face you, and the moon is behind you.
# ---------------------------------------------------------------------------
WALK_RADIUS = 48.0
TREE_LINE = 27.0
FLAT_RADIUS = 27.0

FORGE = (0.0, -2.0)
BENCH_RING = 14.0
BENCHES_FACE = (0.0, 14.0)
TENT = (0.0, 20.0)
SPAWN = (0.0, 13.0)  # Just outside the tent door
DOG_START = (2.6, 11.5)

FIRE_SIZE = 0.5
BENCH_COUNT = 13
EMPTY_BENCH_SIGN = "Coming Soon"

# Add projects here, and they fill the benches from your left as you look from the tent.
# Each is (what its sign says, what the prompt calls it, the page E opens). Use \n to split a long sign.
# Benches with no project keep the sign above and open nothing.
PROJECTS = ()
BENCH_FIRST_ANGLE = 15.0  # Degrees around the forge. 0 is east and -90 is south
BENCH_STEP = 17.5


def bench_spot(index):
    angle = math.radians(BENCH_FIRST_ANGLE - index * BENCH_STEP)
    return FORGE[0] + math.cos(angle) * BENCH_RING, FORGE[1] + math.sin(angle) * BENCH_RING


BENCH_SPOTS = [bench_spot(i) for i in range(BENCH_COUNT)]

ANVILS = ((3.4, -0.6, 2.7), (-3.4, -0.6, 0.45))
BELLOWS = (2.0, -2.8)
QUENCH_BARREL = (-2.35, -3.0)
TOOL_RACK = (-5.0, -4.2)
WOODPILE = (5.2, -4.2)
CRATES = ((-9.4, -9.0, 0.3, 0), (-8.5, -10.0, 1.1, 1), (9.2, -9.2, 2.0, 1), (9.2, 2.4, 0.7, 0))
# Set in the gaps between the signs as you see them from the tent, so none hides a name.
LANTERNS = ((-7.2, -5.7), (7.2, -5.7), (-4.8, -8.5), (4.8, -8.5), (-5.0, 13.0), (5.0, 13.0))
LIT_LANTERNS = (0, 1, 2, 3)  # They reach the benches. The two by the tent only glow, which is cheaper

ZONES = [
    (*TENT, 4.6),
    (*FORGE, 2.6),
    *[(*spot, 2.2) for spot in BENCH_SPOTS],
    *[(x, y, 0.8) for x, y, _ in ANVILS],
    (*BELLOWS, 1.0),
    (*QUENCH_BARREL, 0.7),
    (*TOOL_RACK, 1.5),
    (*WOODPILE, 1.5),
    *[(x, y, 0.8) for x, y, _, _ in CRATES],
    *[(*spot, 0.6) for spot in LANTERNS],
]

ROLLING = kit.make_fbm(SEED + 1, 0.016, 5)
RIDGES = kit.make_fbm(SEED + 2, 0.0065, 6)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)


def height(x, y):
    """Exactly flat under the yard, a gentle bowl around it, then hills and far ridges."""
    r = np.hypot(x, y)
    swell = 0.3 * smoothstep(FLAT_RADIUS, 44.0, r) * SWELL(x, y)
    bowl = 8.0 * smoothstep(FLAT_RADIUS, 92.0, r) ** 1.15
    hills = 7.0 * smoothstep(60.0, 140.0, r) * (ROLLING(x, y) + 0.3)
    ridge_reach = smoothstep(150.0, 430.0, r)
    ridge = 90.0 * ridge_reach * (1.0 - np.abs(RIDGES(x, y))) ** 2
    return swell + bowl + hills + ridge + 28.0 * ridge_reach


def forge_distance(x, y):
    return np.hypot(x - FORGE[0], y - FORGE[1])


def path_distance(x, y):
    """Distance from the walk from the tent down to the forge."""
    return np.hypot(x, np.maximum(np.maximum(FORGE[1] + 2.0 - y, y - 18.0), 0.0))


def blocked(x, y, path_width=0.0):
    for zx, zy, zr in ZONES:
        if math.hypot(x - zx, y - zy) < zr:
            return True
    if path_width <= 0.0:
        return False
    # The yard around the forge is trodden bare, so grass and flowers keep out of it.
    return float(forge_distance(x, y)) < 7.0 + path_width or float(path_distance(x, y)) < path_width + 0.3


def paint_wear(wear, wx, wy, edge):
    wear(0.8 * smoothstep(9.5, 6.5, forge_distance(wx, wy) + edge * 3.0))
    wear(0.55 * smoothstep(2.2, 0.7, path_distance(wx, wy) + edge * 1.2))
    wear(0.4 * smoothstep(3.6, 1.8, np.hypot(wx, wy - SPAWN[1] - 1.0) + edge * 2.5))
    for x, y in BENCH_SPOTS:
        wear(0.5 * smoothstep(3.2, 1.6, np.hypot(wx - x, wy - y) + edge * 1.8))


SITE = landscape.Site(
    "WORKSHOP", SEED, height, blocked, paint_wear, TREE_LINE, OUT_GROUND, SKY_PREVIEW, SKY, FOG_DENSITY, MOONLIGHT,
    ground=GROUND * 1.8,  # Painted lighter than the world's colour, because it's almost black
    ambient=AMBIENT,
    moon_colour=tuple(MOON_COLOUR),
    grass_base=GROUND * 1.2,
    grass_tip=GRASS * np.array((1.2, 0.95, 0.6)),
    grass_count=13000,
    undergrowth_start=23.0,
    flower_ring=(20.0, 27.0),
)


def build_yard(world, materials):
    solid, cloth, unlit = materials["solid"], materials["cloth"], materials["unlit"]
    items = workshop_props.build_all({"solid": solid, "glow": unlit})
    camp = world.group("Campsite")
    lit_group = world.group("Props")
    glow_group = world.group("PropGlow")
    camp_glow = world.group("CampGlow")
    lantern_glow = kit.glow_material("LanternGlass", LANTERN_COLOUR, 1.5)
    bulb_glow = kit.glow_material("Bulbs", (1.0, 0.72, 0.38), 1.6)

    def put(item, x, y, yaw=0.0):
        for bucket, mesh in items[item]:
            group = glow_group if bucket == "glow" else lit_group
            world.place(group, mesh, x, y, yaw=yaw, name=f"{group.name}_{mesh.name}")

    # The forge, with a real fire on its coals.
    put("stone_forge", *FORGE, yaw_toward(*FORGE, *SPAWN))
    world.marker("Campfire.forge", FORGE[0], FORGE[1], 0.98, size=FIRE_SIZE)
    for x, y, yaw in ANVILS:
        put("anvil", x, y, yaw)
    put("bellows", *BELLOWS, math.pi)
    put("quench_barrel", *QUENCH_BARREL)
    put("tool_rack", *TOOL_RACK, yaw_toward(*TOOL_RACK, *SPAWN))
    put("woodpile", *WOODPILE, yaw_toward(*WOODPILE, *SPAWN))
    for x, y, yaw, kind in CRATES:
        put(f"crate_{kind}", x, y, yaw)

    # A bench for each project, where E opens its page. The rest are waiting for one.
    cream = kit.linear(0xf0e8d6) * 0.82
    signs = []
    anchors = []
    for index, (x, y) in enumerate(BENCH_SPOTS):
        yaw = yaw_toward(x, y, *BENCHES_FACE)
        put(f"project_bench_{index % BENCH_VARIANTS}", x, y, yaw)
        project = PROJECTS[index] if index < len(PROJECTS) else None
        sign_text = project[0] if project else EMPTY_BENCH_SIGN
        lettering = landscape.text_mesh(sign_text, 0.22, unlit, (0.0, SIGN_REACH, SIGN_HEIGHT), cream)
        lettering.transform(Matrix.Translation((x, y, 0.0)) @ Matrix.Rotation(yaw, 4, "Z"))
        signs.append(lettering)
        if project:
            front_x, front_y = x + math.sin(yaw) * 1.5, y - math.cos(yaw) * 1.5
            world.marker(f"Link.{index:02d}", front_x, front_y, 1.5, label=f"Read about {project[1]}", url=project[2])
        # Where the string lights tie on: the mast at the bench's back.
        anchors.append(np.array([x - math.sin(yaw) * 0.5, y + math.cos(yaw) * 0.5, MAST_TOP]))
    world.place(glow_group, landscape.join_meshes("bench_signs", signs, unlit), 0.0, 0.0, name="PropGlow_bench_signs")

    wire, bulbs = landscape.string_lights(anchors, SEED + 220, solid, bulb_glow, sag=0.35, steps=8)
    wire_object = bpy.data.objects.new("Campsite_wire", wire)
    wire_object.parent = camp
    world.collection.objects.link(wire_object)
    bulb_object = bpy.data.objects.new("CampGlow_bulbs", bulbs)
    bulb_object.parent = camp_glow
    world.collection.objects.link(bulb_object)

    post = landscape.lantern_post(solid)
    glass = landscape.lantern_glass(lantern_glow)
    for index, (x, y) in enumerate(LANTERNS):
        yaw = math.atan2(-y, -x) if y > 0 else math.atan2(y - FORGE[1], x - FORGE[0])  # Arms out toward the benches
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

    # The tent home, with its door facing the forge.
    landscape.place_portal_tent(world, camp, cloth, SEED, "home", *TENT, FORGE, 0xffffff)

    # Points the game reads. Move these in Blender to change them.
    world.marker("Spawn", *SPAWN, 0.0, walk_radius=WALK_RADIUS, look_at=FORGE)
    world.marker("DogStart", *DOG_START, 0.0)


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
    build_yard(world, materials)
    landscape.scatter_ground_cover(world, rng, SITE, materials["cover"], materials["solid"], materials["shrub"])
    landscape.build_terrain(SITE, world.collection, landscape.paint_ground(SITE, trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("WORKSHOP_SAVED objects:", len(bpy.data.objects))

    if preview:
        landscape.add_preview_fire(scene, (FORGE[0], FORGE[1], 0.98), FIRE_SIZE)
        shots = {
            "spawn": ((0.0, SPAWN[1], 2.0), (0.0, -8.0, 3.0)),
            "forge": ((-3.2, 3.0, 2.0), (0.5, -2.5, 1.8)),
            "bench": ((6.5, -6.0, 2.0), (11.8, -9.0, 1.7)),
            "signs": ((0.0, 2.5, 2.0), (0.0, -16.0, 2.4)),
            "tent": ((-4.0, 1.5, 2.0), (0.0, 22.0, 3.0)),
        }
        landscape.render_previews(SITE, scene, os.path.abspath(preview), shots)


main()
