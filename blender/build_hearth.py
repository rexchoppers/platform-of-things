"""Generate Hearth: a campsite in the middle of a clearing, with forest on every side.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_hearth.py [-- --preview output/folder]

Writes blender/worlds/hearth.blend. This overwrites hand edits, so after the first
build, edit the .blend directly and run export_world.py.
"""

import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

import hearth_props  # noqa: E402
import kit  # noqa: E402
import landscape  # noqa: E402
from kit import CANVAS, DARK_METAL, GROUND, LIGHT, TRUNK, WOOD, smoothstep  # noqa: E402
from landscape import LANTERN_CANDELA, LANTERN_COLOUR, LANTERN_RANGE, PORTAL_TENT_SIZE, yaw_toward  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "hearth.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "hearth_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite_home.exr")

SEED = 20261104

# Hearth's colours from src/config/planets.ts, used only for the preview.
SKY = kit.linear(0x12131f)
FOG_DENSITY = 0.008
MOONLIGHT = 0.42  # Must match Hearth's lightIntensity in planets.ts

# ---------------------------------------------------------------------------
# Layout, in Blender coordinates. Game (x, z) is Blender (x, -z).
# ---------------------------------------------------------------------------
SPAWN = (0.0, -17.0)  # On the path, looking between the lanterns at the fire and tents
WALK_RADIUS = 62.0  # Trees now block the way, so the player can wander into the forest
TREE_LINE = 26.0

FIRE = (0.0, 0.0)
LANTERNS = ((-3.4, -11.0), (3.4, -11.0), (-13.0, 1.5))
WOODPILE = (11.0, -3.0)
CHOPPING_BLOCK = (9.0, -6.5)
CRATES = (-11.5, -3.0)
SEATS = ((35.0, "log"), (145.0, "log"), (215.0, "log"), (325.0, "log"), (90.0, "stump"))
SEAT_RADIUS = 3.7

# Hearth's everyday items, set out around the camp. Each entry is (item, x, y, facing).
# Facing is a point the prop's front turns toward. None means the fire.
DESK = np.array((-12.0, -10.0))
DESK_FORWARD = -DESK / np.linalg.norm(DESK)
DESK_RIGHT = np.array((DESK_FORWARD[1], -DESK_FORWARD[0]))


def desk_spot(right, forward):
    """A spot near the desk: metres to its right and in front of it."""
    return tuple(DESK + DESK_RIGHT * right + DESK_FORWARD * forward)


CABIN = (-15.5, 13.5)
CABIN_FRONT = -np.array(CABIN) / np.linalg.norm(CABIN)
CABIN_SIDE = np.array((CABIN_FRONT[1], -CABIN_FRONT[0]))
CABIN_LAMP = tuple(np.array(CABIN) + CABIN_FRONT * 3.9 + CABIN_SIDE * 1.5)  # Beside the door step
CABIN_DOOR = tuple(np.array(CABIN) + CABIN_FRONT * 3.0)
PET_BED = (6.5, -9.0)
CREDITS_SIGN = (5.6, -12.4)
PROP_LAYOUT = [
    ("cabin", *CABIN, None),
    ("workbench", -19.5, 7.0, None),
    ("garden_tools", -10.7, 15.7, None),
    ("desk", *DESK, None),
    ("server_rack", *desk_spot(-3.2, -0.6), None),
    ("server_rack", *desk_spot(-4.4, -1.0), None),
    ("radio", *desk_spot(2.6, 0.2), None),
    ("trash_bin", *desk_spot(3.6, -1.2), None),
    ("coffee_cup", *desk_spot(1.3, 1.0), None),
    ("coffee_cup_fallen", *desk_spot(-1.6, 1.1), None),
    ("coffee_cup_fallen", *desk_spot(0.5, 2.0), None),
    ("coffee_cup", *desk_spot(-2.4, 0.7), None),
    ("paper_stack_0", *desk_spot(-1.9, -0.6), None),
    ("paper_stack_1", *desk_spot(2.3, 1.4), None),
    ("book_stack_0", *desk_spot(-0.8, -1.8), None),
    ("book_stack_1", *desk_spot(3.4, 0.8), None),
    ("bicycle", -7.2, -12.5, (-3.0, -6.0)),
    ("pet_bed", *PET_BED, None),
    ("dog_toys", 5.2, -7.9, None),
    ("leash", 7.7, -10.1, None),
    ("bbq", 15.5, -7.5, None),
    ("mini_fridge", 17.0, -5.0, None),
    ("bench", -6.2, -3.2, None),
    ("book_stack_2", -5.3, 0.9, None),
    ("book_stack_0", 5.2, 1.4, None),
    ("paper_stack_0", 2.0, -5.6, None),
    ("book_stack_1", -2.6, -5.0, None),
    ("paper_stack_1", 5.9, 3.4, None),
    ("credits_sign", *CREDITS_SIGN, SPAWN),
    ("stepping_stone_0", -0.3, -13.4, None),
    ("stepping_stone_1", 0.25, -11.4, None),
    ("stepping_stone_2", -0.2, -9.3, None),
    ("stepping_stone_3", 0.3, -7.3, None),
]
RUBBER_DUCK_LIFT = 0.79  # It sits on the desk

# Portal tents, as (world id, angle around the fire in degrees, distance from it, flag and rug colour).
# Colours are each world's lightColor in src/config/planets.ts.
PORTAL_TENTS = [
    ("story", 105.0, 13.5, 0xffccaa),
    ("skills", 65.0, 13.5, 0x80dfff),
    ("education", 20.0, 14.0, 0xffffee),
    ("articles", -45.0, 18.0, 0xaaaaff),
    ("projects", 190.0, 18.0, 0xffaa66),
]


def portal_spot(degrees, distance):
    angle = math.radians(degrees)
    return math.cos(angle) * distance, math.sin(angle) * distance


# Landscape objects stay out of these circles: (x, y, radius).
CAMP_ZONES = [
    (FIRE[0], FIRE[1], 5.2),
    *[(x, y, 0.6) for x, y in LANTERNS],
    (WOODPILE[0], WOODPILE[1], 2.2),
    (CHOPPING_BLOCK[0], CHOPPING_BLOCK[1], 1.2),
    (CRATES[0], CRATES[1], 1.8),
    (*DESK, 2.8),
    (*desk_spot(-3.8, -0.8), 1.8),
    (*desk_spot(2.6, 0.2), 0.8),
    (*desk_spot(3.6, -1.2), 0.8),
    (*CABIN, 5.4),
    (-19.5, 7.0, 1.9),
    (-10.7, 15.7, 1.3),
    (-7.2, -12.5, 1.5),
    (*PET_BED, 1.5),
    (5.2, -7.9, 0.9),
    (7.7, -10.1, 0.7),
    (15.5, -7.5, 1.3),
    (17.0, -5.0, 0.9),
    (-6.2, -3.2, 1.4),
    (*CREDITS_SIGN, 1.0),
    *[(*portal_spot(degrees, distance), 4.4) for _, degrees, distance, _ in PORTAL_TENTS],
]


ROLLING = kit.make_fbm(SEED + 1, 0.016, 5)
RIDGES = kit.make_fbm(SEED + 2, 0.0065, 6)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)


def height(x, y):
    """Exactly flat under the camp, a gentle bowl around it, then hills and far ridges."""
    r = np.hypot(x, y)
    swell = 0.3 * smoothstep(23.0, 40.0, r) * SWELL(x, y)
    bowl = 9.0 * smoothstep(23.0, 90.0, r) ** 1.15
    hills = 7.0 * smoothstep(60.0, 140.0, r) * (ROLLING(x, y) + 0.3)
    rim = smoothstep(150.0, 430.0, r)
    ridge = 90.0 * rim * (1.0 - np.abs(RIDGES(x, y))) ** 2
    return swell + bowl + hills + ridge + 28.0 * rim


def path_distance(x, y):
    dx, dy = FIRE[0] - SPAWN[0], FIRE[1] - SPAWN[1]
    t = np.clip(((x - SPAWN[0]) * dx + (y - SPAWN[1]) * dy) / (dx * dx + dy * dy), 0.0, 1.0)
    return np.hypot(x - (SPAWN[0] + t * dx), y - (SPAWN[1] + t * dy))


def blocked(x, y, path_width=0.0):
    for zx, zy, zr in CAMP_ZONES:
        if math.hypot(x - zx, y - zy) < zr:
            return True
    return path_width > 0.0 and float(path_distance(x, y)) < path_width


# ---------------------------------------------------------------------------
# Camp models
# ---------------------------------------------------------------------------
def cooking_tripod(material):
    rng = np.random.default_rng(SEED + 203)
    b = kit.MeshBuilder()
    apex = (0.0, 0.0, 2.15)
    for i in range(3):
        angle = math.tau * i / 3 + 0.5
        foot = (math.cos(angle) * 1.35, math.sin(angle) * 1.35, 0.0)
        kit.add_tube(b, foot, (apex[0] + foot[0] * -0.04, apex[1] + foot[1] * -0.04, apex[2] + 0.08), 0.045, 0.032, 5, WOOD * 0.7, WOOD)
    kit.add_tube(b, apex, (0, 0, 1.42), 0.012, 0.012, 4, DARK_METAL, DARK_METAL)
    pot = DARK_METAL * 0.6
    kit.add_tube(b, (0, 0, 1.02), (0, 0, 1.4), 0.2, 0.25, 9, pot * 0.5, pot, caps=pot * 0.4)
    kit.add_blob(b, rng, kit.ICO1, (0, 0, 1.04), 0.2, 0.45, 0.0, pot * 0.3, pot * 0.5)
    return b.build("tripod", material)


def woodpile(material):
    rng = np.random.default_rng(SEED + 210)
    b = kit.MeshBuilder()
    radius = 0.13
    length = 0.62
    for row, count in enumerate((6, 5, 4, 2)):
        for i in range(count):
            x = (i - (count - 1) / 2) * radius * 2.05 + rng.uniform(-0.01, 0.01)
            z = radius + row * radius * 1.74
            shade = rng.uniform(0.8, 1.15)
            offset = rng.uniform(-0.05, 0.05)
            kit.add_tube(b, (x, -length + offset, z), (x, length + offset, z), radius, radius, 6, WOOD * shade * 0.7, WOOD * shade, caps=WOOD * shade * 2.0)
    return b.build("woodpile", material)


def chopping_block(material):
    b = kit.MeshBuilder()
    kit.add_tube(b, (0, 0, -0.05), (0, 0, 0.55), 0.36, 0.32, 9, WOOD * 0.55, WOOD * 0.85, caps=WOOD * 2.0)
    kit.add_tube(b, (0.02, -0.02, 0.56), (0.42, -0.32, 1.12), 0.024, 0.02, 5, WOOD * 1.4, WOOD * 1.6)
    kit.add_box(b, (0.0, 0.0, 0.62), (0.2, 0.05, 0.17), DARK_METAL * 1.4)
    return b.build("chopping_block", material)


def crates(material):
    b = kit.MeshBuilder()
    plank = WOOD * 1.25
    kit.add_box(b, (0, 0, 0.3), (0.85, 0.65, 0.6), plank)
    kit.add_box(b, (0.08, 0.02, 0.8), (0.55, 0.5, 0.4), plank * 0.85)
    kit.add_box(b, (0.82, -0.15, 0.22), (0.5, 0.5, 0.44), plank * 0.7)
    kit.add_tube(b, (-0.85, -0.55, 0.13), (-0.85, 0.55, 0.13), 0.14, 0.14, 7, CANVAS * 0.35, CANVAS * 0.4, caps=CANVAS * 0.55)
    return b.build("crates", material)


def build_camp(world, solid, cloth):
    camp = world.group("Campsite")
    ember_glow = kit.glow_material("Embers", (1.0, 0.27, 0.05), 2.4)
    lantern_glow = kit.glow_material("LanternGlass", (1.0, 0.62, 0.27), 1.5)
    bulb_glow = kit.glow_material("Bulbs", (1.0, 0.72, 0.38), 1.6)

    world.place(camp, landscape.fire_ring(solid, SEED), *FIRE)
    world.place(camp, landscape.fire_logs(solid, SEED), *FIRE)
    world.place(camp, cooking_tripod(solid), *FIRE, yaw=0.4)
    glow = world.group("CampGlow")
    world.place(glow, landscape.embers(ember_glow, SEED), *FIRE)

    logs = [landscape.log_seat(solid, SEED + 230 + i) for i in range(2)]
    seat_stump = kit.stump("seat_stump", solid, SEED + 235)
    for index, (degrees, kind) in enumerate(SEATS):
        angle = math.radians(degrees)
        x, y = math.cos(angle) * SEAT_RADIUS, math.sin(angle) * SEAT_RADIUS
        if kind == "log":
            world.place(camp, logs[index % 2], x, y, yaw=angle + math.pi / 2)
        else:
            world.place(camp, seat_stump, x, y, scale=0.85)

    post = landscape.lantern_post(solid)
    glass = landscape.lantern_glass(lantern_glow)
    for x, y in LANTERNS:
        yaw = math.atan2(-y, -x) if x else 0.0
        world.place(camp, post, x, y, yaw=yaw)
        world.place(glow, glass, x, y, yaw=yaw)

    # The cabin's lamp leans its arm over the door step, and lights it.
    lamp_yaw = math.atan2(CABIN_DOOR[1] - CABIN_LAMP[1], CABIN_DOOR[0] - CABIN_LAMP[0])
    world.place(camp, post, *CABIN_LAMP, yaw=lamp_yaw)
    world.place(glow, glass, *CABIN_LAMP, yaw=lamp_yaw)
    world.marker(
        "LanternLight.2",
        CABIN_LAMP[0] + math.cos(lamp_yaw) * 0.52,
        CABIN_LAMP[1] + math.sin(lamp_yaw) * 0.52,
        2.1,
        light_candela=LANTERN_CANDELA,
        light_range=LANTERN_RANGE,
        light_colour=LANTERN_COLOUR,
    )

    world.place(camp, woodpile(solid), *WOODPILE, yaw=0.5)
    world.place(camp, chopping_block(solid), *CHOPPING_BLOCK)
    world.place(camp, crates(solid), *CRATES, yaw=-0.5)

    # Portal tents face the fire. The marker sits at each door, on the ground.
    for world_id, degrees, distance, colour in PORTAL_TENTS:
        landscape.place_portal_tent(world, camp, cloth, SEED, world_id, *portal_spot(degrees, distance), FIRE, colour)

    # String lights hang between the three tents behind the fire.
    anchors = []
    for _, degrees, distance, _ in PORTAL_TENTS[:3]:
        x, y = portal_spot(degrees, distance - PORTAL_TENT_SIZE[1] / 2)
        anchors.append(np.array([x, y, PORTAL_TENT_SIZE[2] + 0.06]))
    wire, bulbs = landscape.string_lights(anchors, SEED + 220, solid, bulb_glow)
    wire_obj = bpy.data.objects.new("Campsite_wire", wire)
    wire_obj.parent = camp
    world.collection.objects.link(wire_obj)
    bulbs_obj = bpy.data.objects.new("CampGlow_bulbs", bulbs)
    bulbs_obj.parent = glow
    world.collection.objects.link(bulbs_obj)

    # Points the game reads. Move these in Blender to change them.
    world.marker("Spawn", *SPAWN, 0.0, walk_radius=WALK_RADIUS)
    world.marker("FirePoint", *FIRE, 0.25)
    for index in range(2):
        x, y = LANTERNS[index]
        yaw = math.atan2(-y, -x)
        world.marker(
            f"LanternLight.{index}",
            x + math.cos(yaw) * 0.52,
            y + math.sin(yaw) * 0.52,
            2.1,
            light_candela=LANTERN_CANDELA,
            light_range=LANTERN_RANGE,
            light_colour=LANTERN_COLOUR,
        )


def build_props(world, solid, unlit, tree_anchors, rng):
    props = hearth_props.build_all({"solid": solid, "glow": unlit})
    lit_group = world.group("Props")
    glow_group = world.group("PropGlow")

    def put(prop, x, y, yaw, lift=0.0):
        for bucket, mesh in props[prop]:
            group = glow_group if bucket == "glow" else lit_group
            world.place(group, mesh, x, y, yaw=yaw, sink=-lift, name=f"{group.name}_{mesh.name}")

    for prop, x, y, facing in PROP_LAYOUT:
        target = facing if facing is not None else FIRE
        put(prop, x, y, yaw_toward(x, y, *target))

    duck_x, duck_y = desk_spot(0.7, 0.1)
    put("rubber_duck", duck_x, duck_y, yaw_toward(duck_x, duck_y, *desk_spot(0.0, -0.35)), RUBBER_DUCK_LIFT)

    sign_yaw = yaw_toward(*CREDITS_SIGN, *SPAWN)
    lettering = landscape.text_mesh("Credits", 0.34, unlit, (0.0, -0.05, 1.2))
    world.place(glow_group, lettering, *CREDITS_SIGN, yaw=sign_yaw, name="PropGlow_credits_text")
    world.marker("CreditsSign", *CREDITS_SIGN, 0.0)
    world.marker("DogStart", *PET_BED, 0.0)

    # Just under the bulb of the lamp on the desk.
    desk_yaw = yaw_toward(*DESK, *FIRE)
    lamp_x = DESK[0] - 0.72 * math.cos(desk_yaw) - 0.3 * math.sin(desk_yaw)
    lamp_y = DESK[1] - 0.72 * math.sin(desk_yaw) + 0.3 * math.cos(desk_yaw)
    world.marker("DeskLamp", lamp_x, lamp_y, 1.05, light_candela=1.6, light_range=5.0, light_colour=(1.0, 0.91, 0.79))

    # Bird houses hang under the lowest boughs of a few sturdy pines near the clearing.
    picks = rng.permutation(len(tree_anchors))[:5]
    for index in picks:
        x, y, scale = tree_anchors[index]
        angle = rng.uniform(0.0, math.tau)
        offset = scale * 0.3 + 0.15
        hx, hy = x + math.cos(angle) * offset, y + math.sin(angle) * offset
        put("bird_house", hx, hy, yaw_toward(0.0, 0.0, math.cos(angle), math.sin(angle)), scale * rng.uniform(2.2, 2.9))


def paint_wear(wear, wx, wy, edge):
    # Trodden earth around the fire and along the path in.
    wear(0.95 * smoothstep(6.4, 3.4, np.hypot(wx - FIRE[0], wy - FIRE[1]) + edge * 3.0))
    wear(0.6 * smoothstep(1.35, 0.45, path_distance(wx, wy) + edge * 1.1))
    wear(0.45 * smoothstep(2.6, 1.2, np.hypot(wx - WOODPILE[0], wy - WOODPILE[1]) + edge * 2.0))
    # Worn ground outside each portal tent, and a faint trail to it from the fire.
    for _, degrees, distance, _ in PORTAL_TENTS:
        mouth_x, mouth_y = portal_spot(degrees, distance - 5.0)
        wear(0.5 * smoothstep(4.0, 2.2, np.hypot(wx - mouth_x, wy - mouth_y) + edge * 2.5))
        along = np.clip((wx * mouth_x + wy * mouth_y) / (mouth_x * mouth_x + mouth_y * mouth_y), 0.0, 1.0)
        wear(0.28 * smoothstep(1.0, 0.3, np.hypot(wx - along * mouth_x, wy - along * mouth_y) + edge * 1.1))


SITE = landscape.Site(
    "HEARTH", SEED, height, blocked, paint_wear, TREE_LINE, OUT_GROUND, SKY_PREVIEW, SKY, FOG_DENSITY, MOONLIGHT,
)


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
    solid, unlit = materials["solid"], materials["unlit"]

    build_camp(world, solid, materials["cloth"])
    trees, anchors = landscape.scatter_forest(world, rng, SITE, materials["foliage"], materials["broadleaf"])
    build_props(world, solid, unlit, anchors, rng)
    landscape.scatter_ground_cover(world, rng, SITE, materials["cover"], solid, materials["shrub"])
    landscape.build_terrain(SITE, world.collection, landscape.paint_ground(SITE, trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("HEARTH_SAVED objects:", len(bpy.data.objects))

    if preview:
        landscape.add_preview_fire(scene, (0.0, 0.0, 0.0))
        shots = {
            "spawn": ((0.0, -17.0, 2.0), (0.0, 0.0, 2.0)),
            "cabin": ((-8.5, 6.0, 2.0), (-14.5, 12.5, 1.8)),
        }
        landscape.render_previews(SITE, scene, os.path.abspath(preview), shots)


main()
