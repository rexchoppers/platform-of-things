"""Generate Chronicle: an open-air cinema in a forest clearing, where the story plays on the big screen.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_chronicle.py [-- --preview output/folder]

Writes blender/worlds/chronicle.blend. This overwrites hand edits, so after the first
build, edit the .blend directly and run export_world.py.
"""

import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

import chronicle_props  # noqa: E402
import kit  # noqa: E402
import landscape  # noqa: E402
from chronicle_props import LENS_HEIGHT, LENS_REACH, SCREEN_HEIGHT, SCREEN_MIDDLE, SCREEN_WIDTH  # noqa: E402
from kit import GRASS, smoothstep  # noqa: E402
from landscape import LANTERN_CANDELA, LANTERN_COLOUR, LANTERN_RANGE, yaw_toward  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "chronicle.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "chronicle_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite_story.exr")

SEED = 20261201

# Chronicle's colours from src/config/planets.ts.
GROUND = kit.linear(0x4a3728)
SKY = kit.linear(0x1d1233)
AMBIENT = kit.linear(0x5a4266)
MOON_COLOUR = kit.linear(0xffccaa)
FOG_DENSITY = 0.01
MOONLIGHT = 0.7  # Higher than Hearth, because peach moonlight on brown ground reads much darker

# ---------------------------------------------------------------------------
# Layout, in Blender coordinates. Game (x, z) is Blender (x, -z).
# The screen is to the north, and the moon hangs just left of it from where you arrive.
# ---------------------------------------------------------------------------
WALK_RADIUS = 50.0
TREE_LINE = 27.0
FLAT_RADIUS = 27.0

SCREEN = (0.0, 22.0)
PROJECTOR = (0.0, -2.0)
TENT = (0.0, -19.0)
SPAWN = (0.0, -12.0)  # Just outside the tent door, looking down the aisle at the screen

BENCHES = [
    *[(x, 11.0) for x in (-6.6, -2.2, 2.2, 6.6)],
    *[(x, 8.0) for x in (-8.8, -4.4, 0.0, 4.4, 8.8)],
    *[(x, 5.0) for x in (-6.6, -2.2, 2.2, 6.6)],
    (-13.0, 0.5),
    (13.0, 0.5),
]
LANTERNS = ((-11.0, -3.0), (11.0, -3.0), (-14.0, 9.0), (14.0, 9.0), (-3.6, -6.4), (3.6, -6.4))
LIT_LANTERNS = (0, 1, 4, 5)  # The others sit near a fire and only glow, which is cheaper
CAMPFIRES = ((-12.5, 4.8), (12.5, 4.8))
CAMPFIRE_SIZE = 0.7
SPEAKERS = ((-13.2, 19.0), (13.2, 19.0))
SNACK_STAND = (-12.0, -6.0)
COOLER = (-10.3, -7.8)
BLANKET = (-9.0, 1.0)
DIRECTOR_CHAIR = (3.2, -3.5)
CLAPPERBOARD = (4.1, -3.9)
FILM_CAMERA = (-3.4, -4.0)
SIGN = (4.6, -9.0)
BOOKS = ((-6.0, -5.0), (6.6, -1.2))
DOG_START = (2.6, -10.2)

STRING_LIGHT_RADIUS = 23.0

ZONES = [
    (*PROJECTOR, 1.2),
    (*TENT, 4.6),
    *[(*spot, 0.6) for spot in LANTERNS],
    *[(*spot, 1.0) for spot in SPEAKERS],
    (*SNACK_STAND, 1.5),
    (*COOLER, 0.7),
    (*BLANKET, 1.9),
    (*DIRECTOR_CHAIR, 1.0),
    (*CLAPPERBOARD, 0.5),
    (*FILM_CAMERA, 0.8),
    (*SIGN, 1.0),
    (-13.0, 0.5, 1.4),
    (13.0, 0.5, 1.4),
    *[(*spot, 2.6) for spot in CAMPFIRES],
]

ROLLING = kit.make_fbm(SEED + 1, 0.016, 5)
RIDGES = kit.make_fbm(SEED + 2, 0.0065, 6)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)


def height(x, y):
    """Exactly flat under the cinema, a gentle bowl around it, then hills and far ridges."""
    r = np.hypot(x, y)
    swell = 0.3 * smoothstep(FLAT_RADIUS, 44.0, r) * SWELL(x, y)
    bowl = 8.0 * smoothstep(FLAT_RADIUS, 92.0, r) ** 1.15
    hills = 7.0 * smoothstep(60.0, 140.0, r) * (ROLLING(x, y) + 0.3)
    rim = smoothstep(150.0, 430.0, r)
    ridge = 90.0 * rim * (1.0 - np.abs(RIDGES(x, y))) ** 2
    return swell + bowl + hills + ridge + 28.0 * rim


def seating_distance(x, y):
    """Distance from the block of benches, which gets a floor of bare earth."""
    return np.hypot(np.maximum(np.abs(x) - 9.8, 0.0), np.maximum(np.abs(y - 8.0) - 4.4, 0.0))


def aisle_distance(x, y):
    """Distance from the walk from the tent to the benches."""
    return np.hypot(x, np.maximum(np.maximum(SPAWN[1] - 4.0 - y, y - 4.0), 0.0))


def blocked(x, y, path_width=0.0):
    if abs(x) < 11.6 and 20.5 < y < 25.5:
        return True
    if float(seating_distance(x, y)) < 0.7:
        return True
    for zx, zy, zr in ZONES:
        if math.hypot(x - zx, y - zy) < zr:
            return True
    return path_width > 0.0 and float(aisle_distance(x, y)) < path_width + 0.4


def paint_wear(wear, wx, wy, edge):
    wear(0.75 * smoothstep(2.6, 0.6, seating_distance(wx, wy) + edge * 2.5))
    wear(0.65 * smoothstep(1.9, 0.6, aisle_distance(wx, wy) + edge * 1.2))
    wear(0.55 * smoothstep(3.6, 1.8, np.hypot(wx - PROJECTOR[0], wy - PROJECTOR[1]) + edge * 2.5))
    wear(0.5 * smoothstep(4.2, 2.4, np.hypot(wx - SNACK_STAND[0], wy - SNACK_STAND[1]) + edge * 2.5))
    wear(0.45 * smoothstep(4.0, 2.2, np.hypot(wx, wy - SPAWN[1] + 2.0) + edge * 2.5))
    for x, y in CAMPFIRES:
        wear(0.85 * smoothstep(4.0, 2.0, np.hypot(wx - x, wy - y) + edge * 2.5))


SITE = landscape.Site(
    "CHRONICLE", SEED, height, blocked, paint_wear, TREE_LINE, OUT_GROUND, SKY_PREVIEW, SKY, FOG_DENSITY, MOONLIGHT,
    ground=GROUND,
    ambient=AMBIENT,
    moon_colour=tuple(MOON_COLOUR),
    grass_base=GROUND * 0.7,
    grass_tip=GRASS * 0.85,
    grass_count=12000,
)


def build_cinema(world, materials, tree_anchors):
    solid, cloth, unlit = materials["solid"], materials["cloth"], materials["unlit"]
    items = chronicle_props.build_all({"solid": solid, "glow": unlit})
    camp = world.group("Campsite")
    lit_group = world.group("Props")
    glow_group = world.group("PropGlow")
    camp_glow = world.group("CampGlow")
    lantern_glow = kit.glow_material("LanternGlass", LANTERN_COLOUR, 1.5)
    bulb_glow = kit.glow_material("Bulbs", (1.0, 0.72, 0.38), 1.6)

    def put(item, x, y, yaw):
        for bucket, mesh in items[item]:
            group = glow_group if bucket == "glow" else lit_group
            world.place(group, mesh, x, y, yaw=yaw, name=f"{group.name}_{mesh.name}")

    put("screen_frame", *SCREEN, yaw_toward(*SCREEN, *SPAWN))
    put("projector", *PROJECTOR, yaw_toward(*PROJECTOR, *SCREEN))
    for x, y in BENCHES:
        put("bench", x, y, yaw_toward(x, y, x, SCREEN[1]))
    for x, y in SPEAKERS:
        put("speaker", x, y, yaw_toward(x, y, 0.0, 4.0))
    put("snack_stand", *SNACK_STAND, yaw_toward(*SNACK_STAND, 0.0, -2.0))
    put("cooler", *COOLER, 0.5)
    put("picnic_blanket", *BLANKET, yaw_toward(*BLANKET, *SCREEN))
    put("director_chair", *DIRECTOR_CHAIR, yaw_toward(*DIRECTOR_CHAIR, *SCREEN))
    put("clapperboard", *CLAPPERBOARD, yaw_toward(*CLAPPERBOARD, 0.0, -8.0))
    put("film_camera", *FILM_CAMERA, yaw_toward(*FILM_CAMERA, *SCREEN))
    put("book_stack_0", *BOOKS[0], 0.6)
    put("book_stack_1", *BOOKS[1], 2.1)

    sign_yaw = yaw_toward(*SIGN, *SPAWN)
    put("now_showing", *SIGN, sign_yaw)
    lettering = landscape.text_mesh("Now Showing", 0.22, unlit, (0.0, -0.05, 1.6), kit.linear(0xffeeaa))
    world.place(glow_group, lettering, *SIGN, yaw=sign_yaw, name="PropGlow_now_showing_text")

    # Lanterns, with real light only from the two by the back of the audience.
    post = landscape.lantern_post(solid)
    glass = landscape.lantern_glass(lantern_glow)
    for index, (x, y) in enumerate(LANTERNS):
        yaw = math.atan2(4.0 - y, -x)
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

    # A small fire each side of the audience, with somewhere to sit.
    ember_glow = kit.glow_material("Embers", (1.0, 0.27, 0.05), 2.4)
    ring = landscape.fire_ring(solid, SEED)
    logs = landscape.fire_logs(solid, SEED)
    coals = landscape.embers(ember_glow, SEED)
    seats = [landscape.log_seat(solid, SEED + 230 + i) for i in range(2)]
    for index, (x, y) in enumerate(CAMPFIRES):
        world.place(camp, ring, x, y, scale=CAMPFIRE_SIZE)
        world.place(camp, logs, x, y, scale=CAMPFIRE_SIZE)
        world.place(camp_glow, coals, x, y, scale=CAMPFIRE_SIZE)
        world.marker(f"Campfire.{index}", x, y, 0.2, size=CAMPFIRE_SIZE)
        outward = 1.0 if x > 0 else -1.0
        world.place(camp, seats[index], x + outward * 2.6, y + 0.4, yaw=math.pi / 2 + outward * 0.2)
        world.place(camp, seats[1 - index], x + outward * 0.5, y + 2.7, yaw=outward * 0.25)

    # String lights on posts in a horseshoe around the audience, open toward the screen.
    anchors = []
    for i in range(14):
        angle = math.radians(122.0 + i * (296.0 / 13.0))
        x, y = math.cos(angle) * STRING_LIGHT_RADIUS, math.sin(angle) * STRING_LIGHT_RADIUS
        if math.hypot(x - TENT[0], y - TENT[1]) < 6.0:
            continue
        put("light_post", x, y, 0.0)
        anchors.append(np.array([x, y, 3.5]))
    wire, bulbs = landscape.string_lights(anchors, SEED + 220, solid, bulb_glow, sag=0.4, steps=10)
    wire_object = bpy.data.objects.new("Campsite_wire", wire)
    wire_object.parent = camp
    world.collection.objects.link(wire_object)
    bulb_object = bpy.data.objects.new("CampGlow_bulbs", bulbs)
    bulb_object.parent = camp_glow
    world.collection.objects.link(bulb_object)

    # The tent home, with its door facing the screen.
    landscape.place_portal_tent(world, camp, cloth, SEED, "home", *TENT, SCREEN, 0xffffff)

    # Points the game reads. Move these in Blender to change them.
    world.marker("Spawn", *SPAWN, 0.0, walk_radius=WALK_RADIUS, look_at=SCREEN)
    world.marker("DogStart", *DOG_START, 0.0)
    world.marker("Projector", PROJECTOR[0], PROJECTOR[1] + LENS_REACH, LENS_HEIGHT)
    # Light spilling off the screen, so the audience isn't lost in shadow.
    world.marker("ScreenGlow", 0.0, 15.0, 5.0, light_candela=26.0, light_range=26.0, light_colour=(0.72, 0.7, 0.86))
    world.marker(
        "Screen",
        SCREEN[0],
        SCREEN[1] - 0.22,
        SCREEN_MIDDLE,
        yaw=yaw_toward(*SCREEN, *SPAWN),
        width=SCREEN_WIDTH,
        height=SCREEN_HEIGHT,
    )


def add_preview_screen(scene):
    """A pale stand-in for the slides the game draws on the screen."""
    b = kit.MeshBuilder()
    half = SCREEN_WIDTH / 2
    bottom, top = SCREEN_MIDDLE - SCREEN_HEIGHT / 2, SCREEN_MIDDLE + SCREEN_HEIGHT / 2
    y = SCREEN[1] - 0.22
    b.face(*[b.vert(corner, kit.LIGHT) for corner in ((-half, y, bottom), (half, y, bottom), (half, y, top), (-half, y, top))])
    screen = bpy.data.objects.new("PreviewScreen", b.build("preview_screen", kit.glow_material("PreviewScreen", (0.22, 0.2, 0.26), 1.0)))
    scene.collection.objects.link(screen)


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

    trees, anchors = landscape.scatter_forest(world, rng, SITE, materials["foliage"], materials["broadleaf"])
    build_cinema(world, materials, anchors)
    landscape.scatter_ground_cover(world, rng, SITE, materials["cover"], materials["solid"], materials["shrub"])
    landscape.build_terrain(SITE, world.collection, landscape.paint_ground(SITE, trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("CHRONICLE_SAVED objects:", len(bpy.data.objects))

    if preview:
        add_preview_screen(scene)
        for x, y in CAMPFIRES:
            landscape.add_preview_fire(scene, (x, y, 0.0), CAMPFIRE_SIZE)
        shots = {
            "spawn": ((0.0, -12.0, 2.0), (0.0, 22.0, 6.0)),
            "seats": ((-9.5, 1.5, 2.0), (2.0, 20.0, 6.0)),
            "snack": ((-5.0, -8.5, 2.0), (-13.0, -5.0, 1.2)),
            "projector": ((-3.0, -7.5, 2.0), (2.5, -1.0, 1.2)),
        }
        landscape.render_previews(SITE, scene, os.path.abspath(preview), shots)


main()
