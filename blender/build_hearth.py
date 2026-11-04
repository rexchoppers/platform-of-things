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
from kit import AMBIENT, CANVAS, DARK_METAL, GROUND, LEAVES, LIGHT, MOSS, TRUNK, WOOD, smoothstep  # noqa: E402
from mathutils import Matrix  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "hearth.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "hearth_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite.exr")

SEED = 20261104

# Hearth's colours from src/config/planets.ts, used only for the preview.
SKY = kit.linear(0x12131f)
FOG_DENSITY = 0.008
AMBIENT_INTENSITY = 0.9  # Must match AMBIENT_INTENSITY in WorldManager.ts
MOONLIGHT = 0.42  # Must match Hearth's lightIntensity in planets.ts
MOON_DIRECTION = (-0.4, 0.79, 0.47)  # Blender axes. Must match MOON_DIRECTION in Skybox.ts.

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
PORTAL_TENT_SIZE = (5.2, 5.0, 3.8)
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
EDGE = kit.make_fbm(SEED + 3, 0.05, 3)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)
GROVES = kit.make_fbm(SEED + 5, 0.035, 3)


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
def fire_ring(material):
    rng = np.random.default_rng(SEED + 200)
    b = kit.MeshBuilder()
    stones = 12
    for i in range(stones):
        angle = math.tau * i / stones + rng.uniform(-0.05, 0.05)
        size = rng.uniform(0.2, 0.3)
        centre = (math.cos(angle) * 1.05, math.sin(angle) * 1.05, size * 0.45)
        shade = rng.uniform(0.6, 0.95)
        kit.add_blob(b, rng, kit.ICO1, centre, size, 0.72, 0.14, kit.STONE * shade * 0.35, kit.STONE * shade)
    # Ash bed inside the ring.
    middle = b.vert((0, 0, 0.03), np.array([0.012, 0.011, 0.01]))
    ring = [b.vert((math.cos(a) * 1.0, math.sin(a) * 1.0, 0.015), np.array([0.03, 0.028, 0.025])) for a in np.linspace(0, math.tau, 14, endpoint=False)]
    for i in range(14):
        b.face(middle, ring[i], ring[(i + 1) % 14])
    return b.build("fire_ring", material, smooth=False)


def fire_logs(material):
    rng = np.random.default_rng(SEED + 201)
    b = kit.MeshBuilder()
    charred = np.array([0.012, 0.009, 0.007])
    for i in range(5):
        angle = math.tau * i / 5 + rng.uniform(-0.1, 0.1)
        foot = (math.cos(angle) * 0.72, math.sin(angle) * 0.72, 0.06)
        tip = (math.cos(angle + 2.4) * 0.14, math.sin(angle + 2.4) * 0.14, rng.uniform(0.42, 0.62))
        kit.add_tube(b, foot, tip, 0.085, 0.06, 6, WOOD * 0.5, charred)
    return b.build("fire_logs", material)


def embers(material):
    rng = np.random.default_rng(SEED + 202)
    b = kit.MeshBuilder()
    for _ in range(16):
        angle = rng.uniform(0, math.tau)
        reach = rng.uniform(0.05, 0.62)
        size = rng.uniform(0.04, 0.09)
        centre = (math.cos(angle) * reach, math.sin(angle) * reach, rng.uniform(0.04, 0.12))
        kit.add_blob(b, rng, kit.ICO1, centre, size, 0.7, 0.15, LIGHT, LIGHT)
    return b.build("embers", material)


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


def log_seat(material, seed):
    rng = np.random.default_rng(seed)
    b = kit.MeshBuilder()
    half = rng.uniform(1.05, 1.3)
    radius = rng.uniform(0.23, 0.27)
    kit.add_tube(b, (-half, 0, radius - 0.02), (half, 0, radius - 0.02), radius, radius * 0.92, 8, WOOD * 0.72, WOOD, caps=WOOD * 1.7)
    kit.add_tube(b, (half, 0, radius - 0.02), (-half, 0, radius - 0.02), radius * 0.92, radius, 8, WOOD, WOOD * 0.72, caps=WOOD * 1.7)
    return b.build(f"log_seat_{seed % 10}", material)


def portal_tent(material, world_id, canvas, accent):
    """A tent with a rug and a flag in the colour of the world it leads to."""
    rng = np.random.default_rng(SEED + 260 + len(world_id))
    b = kit.MeshBuilder()
    width, depth, peak = PORTAL_TENT_SIZE
    add_tent_body(b, rng, canvas, width, depth, peak)
    front = -depth / 2

    rug = [
        b.vert((-1.5, front + 0.1, 0.035), accent * 0.3),
        b.vert((1.5, front + 0.1, 0.035), accent * 0.3),
        b.vert((1.5, front - 2.3, 0.035), accent * 0.42),
        b.vert((-1.5, front - 2.3, 0.035), accent * 0.42),
    ]
    b.face(*rug)

    pole = WOOD * 0.9
    kit.add_tube(b, (0, front, peak), (0, front, peak + 1.2), 0.03, 0.022, 5, pole, pole)
    a = b.vert((0, front, peak + 1.18), accent)
    c = b.vert((0, front, peak + 0.72), accent * 0.8)
    t = b.vert((0.82, front - 0.12, peak + 0.98), accent * 1.05)
    b.face(a, c, t)
    return b.build(f"portal_tent_{world_id}", material)


def add_tent_body(b, rng, canvas, width, depth, peak):
    """An A-frame with its door toward local -Y and the flaps pinned open. The doorway stays clear to walk into."""
    front, back = -depth / 2, depth / 2

    # Roof panels with a slight sag between the ridge and the eaves.
    columns, rows = 5, 3
    for side in (-1.0, 1.0):
        grid = []
        for j in range(rows + 1):
            t = j / rows
            row = []
            for i in range(columns + 1):
                y = front + depth * i / columns
                x = side * width / 2 * t
                z = peak * (1.0 - t) - 0.09 * math.sin(t * math.pi)
                z -= 0.06 * math.sin(i / columns * math.pi) * (1.0 - t)
                colour = canvas * (1.0 - 0.32 * t) * rng.uniform(0.96, 1.03)
                row.append(b.vert((x, y, z), colour))
            grid.append(row)
        for j in range(rows):
            for i in range(columns):
                b.face(grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])

    # Closed back wall.
    a = b.vert((-width / 2, back, 0.0), canvas * 0.62)
    c = b.vert((width / 2, back, 0.0), canvas * 0.62)
    t = b.vert((0.0, back, peak), canvas * 0.9)
    b.face(a, c, t)

    # Dark interior, set back from the door.
    inner = np.array([0.012, 0.01, 0.009])
    a = b.vert((-width / 2 + 0.2, front + 0.9, 0.02), inner)
    c = b.vert((width / 2 - 0.2, front + 0.9, 0.02), inner)
    t = b.vert((0.0, front + 0.9, peak - 0.25), inner * 2.0)
    b.face(a, c, t)

    # Groundsheet.
    sheet = canvas * 0.3
    corners = [
        b.vert((-width / 2 + 0.1, front, 0.03), sheet),
        b.vert((width / 2 - 0.1, front, 0.03), sheet),
        b.vert((width / 2 - 0.1, back, 0.03), sheet),
        b.vert((-width / 2 + 0.1, back, 0.03), sheet),
    ]
    b.face(*corners)

    # Door flaps tied back on both sides.
    for side in (-1.0, 1.0):
        ridge = b.vert((0.0, front, peak), canvas * 0.95)
        eave = b.vert((side * width / 2, front, 0.0), canvas * 0.62)
        pulled = b.vert((side * width * 0.3, front - 0.62, 0.0), canvas * 0.72)
        b.face(ridge, eave, pulled)

    # Poles and guy lines.
    pole = WOOD * 0.9
    kit.add_tube(b, (0, back, 0), (0, back, peak + 0.12), 0.035, 0.03, 5, pole * 0.7, pole)
    kit.add_tube(b, (0, front, peak), (0, back, peak), 0.025, 0.025, 4, pole, pole)
    line = CANVAS * 0.5
    for side in (-1.0, 1.0):
        kit.add_tube(b, (0, back, peak), (side * 1.0, back + 1.5, 0.0), 0.009, 0.009, 3, line, line)


def lantern_post(material):
    b = kit.MeshBuilder()
    kit.add_tube(b, (0, 0, -0.1), (0, 0, 2.5), 0.07, 0.05, 6, WOOD * 0.55, WOOD * 0.9)
    kit.add_tube(b, (0, 0, 2.42), (0.52, 0, 2.42), 0.03, 0.025, 4, WOOD * 0.8, WOOD * 0.8)
    metal = DARK_METAL * 0.7
    for sx in (-0.11, 0.11):
        for sy in (-0.11, 0.11):
            kit.add_tube(b, (0.52 + sx, sy, 1.95), (0.52 + sx, sy, 2.28), 0.012, 0.012, 3, metal, metal)
    kit.add_box(b, (0.52, 0, 1.94), (0.28, 0.28, 0.04), metal)
    apex = b.vert((0.52, 0, 2.42), metal)
    ring = [b.vert((0.52 + x, y, 2.27), metal * 0.7) for x, y in ((-0.17, -0.17), (0.17, -0.17), (0.17, 0.17), (-0.17, 0.17))]
    for i in range(4):
        b.face(apex, ring[i], ring[(i + 1) % 4])
    return b.build("lantern_post", material)


def lantern_glass(material):
    b = kit.MeshBuilder()
    kit.add_box(b, (0.52, 0, 2.11), (0.17, 0.17, 0.3), LIGHT, 1.0, 1.0)
    return b.build("lantern_glass", material)


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


def string_lights(wire_material, bulb_material):
    """Warm bulbs on a wire strung between the tent ridges."""
    rng = np.random.default_rng(SEED + 220)
    wire = kit.MeshBuilder()
    bulbs = kit.MeshBuilder()

    def ridge_front(degrees, distance):
        # Doors face the fire, so the front of the ridge is half a tent toward the middle.
        reach = distance - PORTAL_TENT_SIZE[1] / 2
        x, y = portal_spot(degrees, reach)
        return np.array([x, y, PORTAL_TENT_SIZE[2] + 0.06])

    anchors = [ridge_front(degrees, distance) for _, degrees, distance, _ in PORTAL_TENTS[:3]]
    colour = DARK_METAL * 0.5
    for start, end in zip(anchors, anchors[1:]):
        steps = 12
        previous = start
        for i in range(1, steps + 1):
            t = i / steps
            point = start + (end - start) * t
            point = point + np.array([0.0, 0.0, -0.55 * math.sin(t * math.pi)])
            kit.add_tube(wire, previous, point, 0.008, 0.008, 3, colour, colour)
            if i % 2 == 1:
                centre = (point[0], point[1], point[2] - 0.05)
                kit.add_blob(bulbs, rng, kit.ICO1, centre, 0.055, 1.1, 0.0, LIGHT, LIGHT)
            previous = point
    return wire.build("light_wire", wire_material), bulbs.build("light_bulbs", bulb_material)


def build_camp(world, solid, cloth):
    camp = world.group("Campsite")
    ember_glow = kit.glow_material("Embers", (1.0, 0.27, 0.05), 2.4)
    lantern_glow = kit.glow_material("LanternGlass", (1.0, 0.62, 0.27), 1.5)
    bulb_glow = kit.glow_material("Bulbs", (1.0, 0.72, 0.38), 1.6)

    world.place(camp, fire_ring(solid), *FIRE)
    world.place(camp, fire_logs(solid), *FIRE)
    world.place(camp, cooking_tripod(solid), *FIRE, yaw=0.4)
    glow = world.group("CampGlow")
    world.place(glow, embers(ember_glow), *FIRE)

    logs = [log_seat(solid, SEED + 230 + i) for i in range(2)]
    seat_stump = kit.stump("seat_stump", solid, SEED + 235)
    for index, (degrees, kind) in enumerate(SEATS):
        angle = math.radians(degrees)
        x, y = math.cos(angle) * SEAT_RADIUS, math.sin(angle) * SEAT_RADIUS
        if kind == "log":
            world.place(camp, logs[index % 2], x, y, yaw=angle + math.pi / 2)
        else:
            world.place(camp, seat_stump, x, y, scale=0.85)

    post = lantern_post(solid)
    glass = lantern_glass(lantern_glow)
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
    )

    world.place(camp, woodpile(solid), *WOODPILE, yaw=0.5)
    world.place(camp, chopping_block(solid), *CHOPPING_BLOCK)
    world.place(camp, crates(solid), *CRATES, yaw=-0.5)

    # Portal tents face the fire. The marker sits at each door, on the ground.
    for world_id, degrees, distance, colour in PORTAL_TENTS:
        x, y = portal_spot(degrees, distance)
        yaw = math.atan2(-x, y)
        world.place(camp, portal_tent(cloth, world_id, CANVAS, kit.linear(colour)), x, y, yaw=yaw)
        door_x, door_y = portal_spot(degrees, distance - PORTAL_TENT_SIZE[1] / 2)
        world.marker(f"Portal.{world_id}", door_x, door_y, float(height(door_x, door_y)), target=world_id, yaw=yaw)

    wire, bulbs = string_lights(solid, bulb_glow)
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
        world.marker(f"LanternLight.{index}", x + math.cos(yaw) * 0.52, y + math.sin(yaw) * 0.52, 2.1)


def yaw_toward(x, y, target_x, target_y):
    """The yaw that turns a prop's front (Blender -y) toward a point."""
    return math.atan2(target_x - x, -(target_y - y))


def credits_text(material):
    """The sign's lettering, as real geometry so it stays sharp up close."""
    curve = bpy.data.curves.new("credits_text", "FONT")
    curve.body = "Credits"
    curve.size = 0.34
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    temporary = bpy.data.objects.new("credits_text", curve)
    bpy.context.scene.collection.objects.link(temporary)
    evaluated = temporary.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    bpy.data.objects.remove(temporary, do_unlink=True)
    bpy.data.curves.remove(curve)

    # Stand the text up on the front of the board, which faces local -Y.
    mesh.transform(Matrix.Translation((0.0, -0.05, 1.2)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    attribute = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attribute.data.foreach_set("color", np.tile((0.9, 0.9, 0.85, 1.0), len(mesh.vertices)).astype(np.float32))
    mesh.color_attributes.active_color = attribute
    mesh.materials.append(material)
    return mesh


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
    world.place(glow_group, credits_text(unlit), *CREDITS_SIGN, yaw=sign_yaw, name="PropGlow_credits_text")
    world.marker("CreditsSign", *CREDITS_SIGN, 0.0)
    world.marker("DogStart", *PET_BED, 0.0)

    # Just under the bulb of the lamp on the desk.
    desk_yaw = yaw_toward(*DESK, *FIRE)
    lamp_x = DESK[0] - 0.72 * math.cos(desk_yaw) - 0.3 * math.sin(desk_yaw)
    lamp_y = DESK[1] - 0.72 * math.sin(desk_yaw) + 0.3 * math.cos(desk_yaw)
    world.marker("DeskLamp", lamp_x, lamp_y, 1.05)

    # Bird houses hang under the lowest boughs of a few sturdy pines near the clearing.
    picks = rng.permutation(len(tree_anchors))[:5]
    for index in picks:
        x, y, scale = tree_anchors[index]
        angle = rng.uniform(0.0, math.tau)
        offset = scale * 0.3 + 0.15
        hx, hy = x + math.cos(angle) * offset, y + math.sin(angle) * offset
        put("bird_house", hx, hy, yaw_toward(0.0, 0.0, math.cos(angle), math.sin(angle)), scale * rng.uniform(2.2, 2.9))


# ---------------------------------------------------------------------------
# Forest and ground cover
# ---------------------------------------------------------------------------
def tree_scale(rng):
    """Mostly mature trees, with saplings and a few giants, so sizes don't look planted."""
    roll = rng.random()
    if roll < 0.1:
        return rng.uniform(0.42, 0.7)
    if roll < 0.38:
        return rng.uniform(0.7, 1.1)
    if roll < 0.88:
        return rng.uniform(1.1, 1.8)
    return rng.uniform(1.9, 2.6)


def scatter_forest(world, rng, foliage, broadleaf_material):
    tints = [LEAVES, LEAVES * np.array([1.18, 1.0, 0.95]), LEAVES * np.array([0.84, 0.98, 1.02])]
    # Five body shapes: classic, slim, wide and low, tall and sparse, young and full.
    hero_shapes = [
        dict(layers=9, lobes=11, radius=3.1, low=2.3, high=10.2),
        dict(layers=8, lobes=9, radius=2.2, low=2.6, high=11.4),
        dict(layers=7, lobes=11, radius=3.7, low=1.8, high=8.6),
        dict(layers=7, lobes=9, radius=2.6, low=3.7, high=12.4),
        dict(layers=8, lobes=10, radius=2.7, low=1.2, high=8.8),
    ]
    hero = [kit.pine_hero(f"pine_hero_{i}", foliage, SEED + 10 + i, tints[i % 3], **shape) for i, shape in enumerate(hero_shapes)]
    trunk_clear = (0, 1, 3)  # These shapes leave room under their boughs for a bird house
    round_tree = [kit.broadleaf(f"broadleaf_{i}", broadleaf_material, SEED + 20 + i, tints[i] * 1.12) for i in range(3)]
    dead = kit.dead_tree("dead_tree", foliage, SEED + 25)
    mid_shapes = [
        dict(layers=5, lobes=7, radius=3.1, low=2.4, high=9.8),
        dict(layers=5, lobes=6, radius=2.2, low=2.8, high=11.2),
        dict(layers=4, lobes=7, radius=3.6, low=1.8, high=8.4),
    ]
    mid = [kit.pine_mid(f"pine_mid_{i}", foliage, SEED + 30 + i, tints[i], **shape) for i, shape in enumerate(mid_shapes)]
    far = [kit.pine_far(f"pine_far_{i}", foliage, SEED + 40 + i, tints[i]) for i in range(2)]

    spacing = kit.SpacingGrid(8.0)
    trees = []
    anchors = []

    # Trees gather in groves with open glades between them, and the front edge wanders.
    group = world.group("TreesHero")
    placed, attempts = 0, 0
    while placed < 120 and attempts < 40000:
        attempts += 1
        x, y = kit.annulus_point(rng, TREE_LINE - 1.2, 72.0)
        r = math.hypot(x, y)
        if r < TREE_LINE + 5.0 * (float(EDGE(x, y)) + 0.5):
            continue
        grove = float(GROVES(x, y))
        if grove < -0.2 and rng.random() < 0.85:
            continue
        gap = 3.6 + 9.0 * (1.0 - float(smoothstep(-0.2, 0.6, grove))) * rng.uniform(0.7, 1.3)
        if not spacing.free(x, y, gap):
            continue
        spacing.add(x, y)
        scale = tree_scale(rng)
        roll = rng.random()
        if roll < 0.04:
            mesh = dead
        elif roll < 0.2:
            mesh = round_tree[rng.integers(3)]
        else:
            shape = int(rng.integers(5))
            mesh = hero[shape]
            if shape in trunk_clear and scale >= 1.0 and r < 45.0:
                anchors.append((x, y, scale))
        world.place(group, mesh, x, y, scale, rng.uniform(0, math.tau), 0.05, rng.uniform(0.85, 1.4), 0.07, rng)
        trees.append((x, y, scale))
        placed += 1
    print(f"HEARTH hero trees: {placed}")

    group = world.group("TreesMid")
    placed, attempts = 0, 0
    while placed < 330 and attempts < 40000:
        attempts += 1
        x, y = kit.annulus_point(rng, 72.0, 185.0)
        grove = float(GROVES(x, y))
        if grove < -0.25 and rng.random() < 0.8:
            continue
        gap = 7.0 + 12.0 * (1.0 - float(smoothstep(-0.25, 0.6, grove))) * rng.uniform(0.7, 1.3)
        if not spacing.free(x, y, gap):
            continue
        spacing.add(x, y)
        scale = max(tree_scale(rng), 0.8)
        world.place(group, mid[rng.integers(3)], x, y, scale, rng.uniform(0, math.tau), 0.1, rng.uniform(0.85, 1.4), 0.05, rng)
        trees.append((x, y, scale))
        placed += 1
    print(f"HEARTH mid trees: {placed}")

    group = world.group("TreesFar")
    far_spacing = kit.SpacingGrid(20.0)
    placed, attempts = 0, 0
    while placed < 900 and attempts < 40000:
        attempts += 1
        x, y = kit.annulus_point(rng, 185.0, 660.0)
        if float(height(x, y)) > 90.0 or float(GROVES(x, y)) < -0.3:
            continue
        if not far_spacing.free(x, y, rng.uniform(13.0, 30.0)):
            continue
        far_spacing.add(x, y)
        world.place(group, far[rng.integers(2)], x, y, rng.uniform(1.2, 3.1), rng.uniform(0, math.tau), 0.3, rng.uniform(0.85, 1.35))
        placed += 1
    print(f"HEARTH far trees: {placed}")
    return trees, anchors


def scatter_ground_cover(world, rng, cover, solid, shrub):
    tufts = [kit.grass_tuft("grass_short", cover, SEED + 50, 9, 0.9), kit.grass_tuft("grass_tall", cover, SEED + 51, 9, 1.5)]
    ferns = [kit.fern(f"fern_{i}", cover, SEED + 60 + i) for i in range(2)]
    bushes = [kit.bush(f"bush_{i}", shrub, SEED + 70 + i) for i in range(2)]
    rocks = [kit.rock(f"rock_{i}", solid, SEED + 80 + i) for i in range(3)]
    flowers = {key: kit.flower(f"flower_{key}", cover, SEED + 90, colour) for key, colour in kit.FLOWERS.items()}
    mushrooms = [kit.mushroom(f"mushroom_{i}", cover, SEED + 100 + i) for i in range(2)]
    logs = [kit.fallen_log(f"log_{i}", solid, SEED + 110 + i) for i in range(2)]
    stumps = [kit.stump("stump_0", solid, SEED + 120)]

    # Lush grass through the clearing, thinning out under the trees.
    group = world.group("Grass")
    placed = 0
    for _ in range(40000):
        if placed >= 17000:
            break
        angle = rng.uniform(0, math.tau)
        r = 3.0 + 67.0 * rng.random() ** 1.3
        x, y = math.cos(angle) * r, math.sin(angle) * r
        if r > TREE_LINE and rng.random() > 0.35:
            continue
        if blocked(x, y, 0.75):
            continue
        tuft = tufts[1] if (r > 15.0 and rng.random() < 0.6) else tufts[0]
        world.place(group, tuft, x, y, rng.uniform(0.75, 1.2), rng.uniform(0, math.tau))
        placed += 1
    print(f"HEARTH grass: {placed}")

    # Undergrowth makes the edge of the walkable area read as thick forest.
    group = world.group("Ferns")
    for _ in range(340):
        x, y = kit.annulus_point(rng, 19.0, 70.0)
        if not blocked(x, y):
            world.place(group, ferns[rng.integers(2)], x, y, rng.uniform(0.85, 1.6), rng.uniform(0, math.tau))

    group = world.group("Bushes")
    for _ in range(190):
        x, y = kit.annulus_point(rng, 22.5, 80.0)
        world.place(group, bushes[rng.integers(2)], x, y, rng.uniform(0.8, 1.7), rng.uniform(0, math.tau), 0.1, rng.uniform(0.85, 1.2))

    group = world.group("Rocks")
    for _ in range(120):
        x, y = kit.annulus_point(rng, 15.0, 110.0)
        if not blocked(x, y, 1.5):
            size = 0.22 + 1.1 * rng.random() ** 2.4
            world.place(group, rocks[rng.integers(3)], x, y, size, rng.uniform(0, math.tau), size * 0.18, 1.0, 0.3, rng)
    for _ in range(30):
        x, y = kit.annulus_point(rng, 45.0, 200.0)
        size = rng.uniform(1.6, 3.8)
        world.place(group, rocks[rng.integers(3)], x, y, size, rng.uniform(0, math.tau), size * 0.2, 1.0, 0.3, rng)

    group = world.group("Flowers")
    keys = list(flowers)
    for _ in range(46):
        cx, cy = kit.annulus_point(rng, 8.0, 24.0)
        if blocked(cx, cy, 1.5):
            continue
        patch = flowers[keys[rng.integers(len(keys))]]
        for _ in range(int(rng.integers(5, 12))):
            x, y = cx + rng.uniform(-1.6, 1.6), cy + rng.uniform(-1.6, 1.6)
            if not blocked(x, y, 0.7):
                world.place(group, patch, x, y, rng.uniform(0.7, 1.25), rng.uniform(0, math.tau))

    group = world.group("Mushrooms")
    for _ in range(26):
        cx, cy = kit.annulus_point(rng, 19.0, 60.0)
        for _ in range(int(rng.integers(2, 6))):
            x, y = cx + rng.uniform(-0.8, 0.8), cy + rng.uniform(-0.8, 0.8)
            world.place(group, mushrooms[rng.integers(2)], x, y, rng.uniform(0.75, 1.5), rng.uniform(0, math.tau))

    group = world.group("Deadwood")
    for _ in range(14):
        x, y = kit.annulus_point(rng, 18.0, 80.0)
        if not blocked(x, y, 2.0):
            world.place(group, logs[rng.integers(2)], x, y, rng.uniform(0.8, 1.3), rng.uniform(0, math.tau), -0.2)
    for _ in range(18):
        x, y = kit.annulus_point(rng, 15.0, 60.0)
        if not blocked(x, y, 2.0):
            world.place(group, stumps[0], x, y, rng.uniform(0.7, 1.25), rng.uniform(0, math.tau))


# ---------------------------------------------------------------------------
# Terrain and painted ground
# ---------------------------------------------------------------------------
TERRAIN_HALF = 700.0
TERRAIN_GRID = 180
WARP = 0.09  # Lower packs more grid and ground texture around the camp


def warp(u):
    return TERRAIN_HALF * (WARP * u + (1.0 - WARP) * u ** 3)


def forest_floor_map(trees, half, size):
    """Soft shade under the canopy, so trees feel rooted in the ground."""
    stamps = np.zeros((size, size), dtype=np.float64)
    step = 2.0 * half / size
    for x, y, scale in trees:
        ix, iy = int((x + half) / step), int((y + half) / step)
        if 0 <= ix < size and 0 <= iy < size:
            stamps[iy, ix] += scale
    ky = np.fft.fftfreq(size, d=step)[:, None]
    kx = np.fft.rfftfreq(size, d=step)[None, :]
    sigma = 3.4
    blur = np.exp(-2.0 * (math.pi * sigma) ** 2 * (kx * kx + ky * ky))
    blurred = np.fft.irfft2(np.fft.rfft2(stamps) * blur, s=(size, size))
    peak_gain = 2.0 * math.pi * sigma * sigma / (step * step)
    return np.clip(blurred * peak_gain * 0.45, 0.0, 1.0)


def paint_ground(trees, size=2048):
    u = np.linspace(-1.0, 1.0, size)
    wx, wy = np.meshgrid(warp(u), warp(u))
    r = np.hypot(wx, wy)

    broad = kit.fractal_noise(size, 2.3, SEED + 301)
    fine = kit.fractal_noise(size, 1.15, SEED + 302)
    mottle = np.clip(0.62 * broad + 0.38 * fine, 0.0, 1.0)[..., None]

    colour = (GROUND * 0.6) + (GROUND * 1.3 - GROUND * 0.6) * mottle
    moss = smoothstep(0.54, 0.68, kit.fractal_noise(size, 2.6, SEED + 303))[..., None]
    colour = colour + (MOSS * (0.8 + 0.4 * fine[..., None]) - colour) * moss * 0.5

    dirt = (TRUNK * 0.7 + GROUND * 0.2) * (0.68 + 0.5 * fine[..., None])
    edge = kit.fractal_noise(size, 2.0, SEED + 304) - 0.5

    def wear(mask):
        nonlocal colour
        colour = colour + (dirt - colour) * np.clip(mask, 0.0, 1.0)[..., None]

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

    half = 215.0
    floor = forest_floor_map(trees, half, 1024)
    ix = np.clip(((wx + half) / (2.0 * half) * 1024).astype(int), 0, 1023)
    iy = np.clip(((wy + half) / (2.0 * half) * 1024).astype(int), 0, 1023)
    litter = (GROUND * 0.34 + TRUNK * 0.3) * (0.7 + 0.6 * fine[..., None])
    canopy = np.clip(floor[iy, ix] * (0.8 + 0.5 * fine), 0.0, 0.92)[..., None]
    colour = colour + (litter - colour) * canopy
    colour = colour + (litter - colour) * (smoothstep(205.0, 300.0, r)[..., None] * 0.85)

    image = bpy.data.images.new("hearth_ground", size, size, alpha=False)
    rgba = np.ones((size, size, 4), dtype=np.float32)
    rgba[..., :3] = kit.to_srgb(colour)
    image.pixels.foreach_set(rgba.ravel())
    os.makedirs(os.path.dirname(OUT_GROUND), exist_ok=True)
    image.filepath_raw = OUT_GROUND
    image.file_format = "JPEG"
    image.save(quality=88)
    loaded = bpy.data.images.load(OUT_GROUND)
    bpy.data.images.remove(image)
    loaded.name = "hearth_ground"
    loaded.pack()
    return loaded


def build_terrain(collection, image):
    u = np.linspace(-1.0, 1.0, TERRAIN_GRID)
    wx, wy = np.meshgrid(warp(u), warp(u))
    wz = height(wx, wy)
    n = TERRAIN_GRID
    faces = [(j * n + i, j * n + i + 1, (j + 1) * n + i + 1, (j + 1) * n + i) for j in range(n - 1) for i in range(n - 1)]
    mesh = bpy.data.meshes.new("Terrain")
    mesh.from_pydata(np.stack([wx, wy, wz], axis=-1).reshape(-1, 3).tolist(), [], faces)
    mesh.update()
    mesh.shade_smooth()

    uv_layer = mesh.uv_layers.new(name="UVMap")
    grid_u, grid_v = np.meshgrid(np.linspace(0.0, 1.0, n), np.linspace(0.0, 1.0, n))
    per_vertex = np.stack([grid_u, grid_v], axis=-1).reshape(-1, 2)
    loops = np.empty(len(mesh.loops), dtype=np.int32)
    mesh.loops.foreach_get("vertex_index", loops)
    uv_layer.uv.foreach_set("vector", per_vertex[loops].ravel())

    material = bpy.data.materials.new("Ground")
    material.use_nodes = True
    tree = material.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    texture = tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    bsdf.inputs["Metallic"].default_value = 0.0
    mesh.materials.append(material)

    terrain = bpy.data.objects.new("Terrain", mesh)
    collection.objects.link(terrain)


# ---------------------------------------------------------------------------
# Previews approximate the game: its fog, moonlight, ambient, firelight, and sky.
# ---------------------------------------------------------------------------
def render_previews(scene, folder):
    from mathutils import Vector

    for name in ("GroundCover", "Broadleaf", "Shrub"):
        kit.light_back_faces_like_game(name)
    kit.show_unlit_in_preview("PropGlow")
    kit.remove_sheen()
    kit.add_game_fog(SKY, FOG_DENSITY)
    kit.add_preview_world(scene, SKY_PREVIEW, SKY, AMBIENT * AMBIENT_INTENSITY)

    moon = bpy.data.lights.new("Moon", "SUN")
    moon.energy = MOONLIGHT
    moon.color = (0.72, 0.8, 1.0)  # Must match MOONLIGHT_TINT in WorldManager.ts
    moon.angle = math.radians(2.0)
    moon_object = bpy.data.objects.new("Moon", moon)
    moon_object.rotation_euler = Vector(MOON_DIRECTION).to_track_quat("Z", "Y").to_euler()
    scene.collection.objects.link(moon_object)

    # Stand-ins for what the game draws live. Point light watts = candela * 4 * pi.
    def point(name, location, candela, colour):
        light = bpy.data.lights.new(name, "POINT")
        light.energy = candela * 4.0 * math.pi
        light.color = colour
        light.shadow_soft_size = 0.2
        obj = bpy.data.objects.new(name, light)
        obj.location = location
        scene.collection.objects.link(obj)

    point("Fire", (0, 0, 1.0), 70.0, (1.0, 0.46, 0.16))
    point("DeskLamp", bpy.data.objects["DeskLamp"].location, 1.6, (1.0, 0.91, 0.79))
    for index in range(3):
        marker = bpy.data.objects[f"LanternLight.{index}"]
        point(f"Lantern{index}", marker.location, 4.0, (1.0, 0.62, 0.27))

    flame = kit.MeshBuilder()
    for radius, tip, x in ((0.42, 1.25, 0.0), (0.26, 0.9, 0.3), (0.26, 0.85, -0.28)):
        apex = flame.vert((x, 0, tip), LIGHT)
        ring = [flame.vert((x + math.cos(a) * radius, math.sin(a) * radius, 0.1), LIGHT) for a in np.linspace(0, math.tau, 8, endpoint=False)]
        for i in range(8):
            flame.face(apex, ring[i], ring[(i + 1) % 8])
    flame_object = bpy.data.objects.new("Flame", flame.build("flame", kit.glow_material("Flame", (1.0, 0.5, 0.14), 9.0)))
    scene.collection.objects.link(flame_object)

    shots = {
        "spawn": ((0.0, -17.0, 2.0), (0.0, 0.0, 2.0)),
        "cabin": ((-8.5, 6.0, 2.0), (-14.5, 12.5, 1.8)),
    }
    for name, (position, target) in shots.items():
        camera = kit.add_preview_camera(scene, position, target)
        kit.render_preview(scene, camera, os.path.join(folder, f"hearth_{name}.png"))
        print("HEARTH_PREVIEW", name)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    preview = argv[argv.index("--preview") + 1] if "--preview" in argv else None

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.preferences.filepaths.save_version = 0

    scene = bpy.context.scene
    rng = np.random.default_rng(SEED)
    world = kit.WorldScene(height)

    foliage = kit.vertex_material("Foliage", True)
    broadleaf_material = kit.vertex_material("Broadleaf", True)
    shrub = kit.vertex_material("Shrub", True)
    cover = kit.vertex_material("GroundCover", True, 1.0)
    solid = kit.vertex_material("Solid", False, 0.95)
    cloth = kit.vertex_material("Cloth", True, 0.95)
    unlit = kit.vertex_material("PropGlow", False)

    build_camp(world, solid, cloth)
    trees, anchors = scatter_forest(world, rng, foliage, broadleaf_material)
    build_props(world, solid, unlit, anchors, rng)
    scatter_ground_cover(world, rng, cover, solid, shrub)
    build_terrain(world.collection, paint_ground(trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("HEARTH_SAVED objects:", len(bpy.data.objects))

    if preview:
        render_previews(scene, os.path.abspath(preview))


main()
