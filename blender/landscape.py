"""Parts every world shares: forest, ground cover, painted ground, terrain, portal tents, previews.

A world script describes itself with a Site, then calls these. kit.py holds the smaller pieces.
"""

import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector

import kit
from kit import AMBIENT, CANVAS, DARK_METAL, GRASS, GROUND, LEAVES, LIGHT, MOSS, TRUNK, WOOD, smoothstep

PORTAL_TENT_SIZE = (5.2, 5.0, 3.8)
LANTERN_COLOUR = (1.0, 0.62, 0.27)
LANTERN_CANDELA = 4.0  # A point light marker's strength in the game. Short range keeps them cheap.
LANTERN_RANGE = 10.0
MOONLIGHT_TINT = (0.72, 0.8, 1.0)  # Must match MOONLIGHT_TINT in WorldManager.ts
AMBIENT_INTENSITY = 0.9  # Must match AMBIENT_INTENSITY in WorldManager.ts
MOON_DIRECTION = (-0.4, 0.79, 0.47)  # Blender axes. Must match MOON_DIRECTION in Skybox.ts


class Site:
    """What makes one world different from another."""

    def __init__(self, name, seed, height, blocked, paint_wear, tree_line, out_ground, sky_preview, sky, fog_density, moonlight, **options):
        self.name = name
        self.seed = seed
        self.height = height
        self.blocked = blocked
        self.paint_wear = paint_wear
        self.tree_line = tree_line
        self.out_ground = out_ground
        self.sky_preview = sky_preview
        self.sky = sky
        self.fog_density = fog_density
        self.moonlight = moonlight
        self.edge = options.get("edge") or kit.make_fbm(seed + 3, 0.05, 3)
        self.groves = options.get("groves") or kit.make_fbm(seed + 5, 0.035, 3)
        self.ground = options.get("ground", GROUND)
        self.ambient = options.get("ambient", AMBIENT)
        self.moon_colour = options.get("moon_colour", LIGHT)
        self.grass_base = options.get("grass_base", GROUND * 0.7)
        self.grass_tip = options.get("grass_tip", GRASS)
        self.grass_count = options.get("grass_count", 17000)
        self.undergrowth_start = options.get("undergrowth_start", 0.0)  # Keeps bushes and rocks out of a big clearing
        self.flower_ring = options.get("flower_ring", (8.0, 24.0))


def standard_materials():
    return {
        "foliage": kit.vertex_material("Foliage", True),
        "broadleaf": kit.vertex_material("Broadleaf", True),
        "shrub": kit.vertex_material("Shrub", True),
        "cover": kit.vertex_material("GroundCover", True, 1.0),
        "solid": kit.vertex_material("Solid", False, 0.95),
        "cloth": kit.vertex_material("Cloth", True, 0.95),
        "unlit": kit.vertex_material("PropGlow", False),
    }


def yaw_toward(x, y, target_x, target_y):
    """The yaw that turns a prop's front (Blender -y) toward a point."""
    return math.atan2(target_x - x, -(target_y - y))


def text_mesh(body, size, material, location, colour=(0.9, 0.9, 0.85)):
    """Lettering as real geometry, so it stays sharp up close. Faces local -Y."""
    curve = bpy.data.curves.new(f"{body.lower().replace(' ', '_')}_text", "FONT")
    curve.body = body
    curve.size = size
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    temporary = bpy.data.objects.new(curve.name, curve)
    bpy.context.scene.collection.objects.link(temporary)
    evaluated = temporary.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    bpy.data.objects.remove(temporary, do_unlink=True)
    bpy.data.curves.remove(curve)

    mesh.transform(Matrix.Translation(location) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    attribute = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attribute.data.foreach_set("color", np.tile((*colour, 1.0), len(mesh.vertices)).astype(np.float32))
    mesh.color_attributes.active_color = attribute
    mesh.materials.append(material)
    return mesh


def string_lights(anchors, seed, wire_material, bulb_material, sag=0.55, steps=12):
    """Warm bulbs on a wire strung between points. Returns the wire mesh and the bulb mesh."""
    rng = np.random.default_rng(seed)
    wire = kit.MeshBuilder()
    bulbs = kit.MeshBuilder()
    colour = DARK_METAL * 0.5
    for start, end in zip(anchors, anchors[1:]):
        previous = start
        for i in range(1, steps + 1):
            t = i / steps
            point = start + (end - start) * t
            point = point + np.array([0.0, 0.0, -sag * math.sin(t * math.pi)])
            kit.add_tube(wire, previous, point, 0.008, 0.008, 3, colour, colour)
            if i % 2 == 1:
                centre = (point[0], point[1], point[2] - 0.05)
                kit.add_blob(bulbs, rng, kit.ICO1, centre, 0.055, 1.1, 0.0, LIGHT, LIGHT)
            previous = point
    return wire.build("light_wire", wire_material), bulbs.build("light_bulbs", bulb_material)


def place_portal_tent(world, group, cloth, seed, world_id, x, y, facing, colour):
    """A tent facing a point, with the door marker the game reads, on the ground at the door."""
    yaw = yaw_toward(x, y, *facing)
    world.place(group, portal_tent(cloth, world_id, CANVAS, kit.linear(colour), seed), x, y, yaw=yaw)
    half_depth = PORTAL_TENT_SIZE[1] / 2
    door_x, door_y = x + math.sin(yaw) * half_depth, y - math.cos(yaw) * half_depth
    world.marker(f"Portal.{world_id}", door_x, door_y, float(world.height(door_x, door_y)), target=world_id, yaw=yaw)


def portal_tent(material, world_id, canvas, accent, seed):
    """A tent with a rug and a flag in the colour of the world it leads to."""
    rng = np.random.default_rng(seed + 260 + len(world_id))
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


def fire_ring(material, seed):
    rng = np.random.default_rng(seed + 200)
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


def fire_logs(material, seed):
    rng = np.random.default_rng(seed + 201)
    b = kit.MeshBuilder()
    charred = np.array([0.012, 0.009, 0.007])
    for i in range(5):
        angle = math.tau * i / 5 + rng.uniform(-0.1, 0.1)
        foot = (math.cos(angle) * 0.72, math.sin(angle) * 0.72, 0.06)
        tip = (math.cos(angle + 2.4) * 0.14, math.sin(angle + 2.4) * 0.14, rng.uniform(0.42, 0.62))
        kit.add_tube(b, foot, tip, 0.085, 0.06, 6, WOOD * 0.5, charred)
    return b.build("fire_logs", material)


def embers(material, seed):
    rng = np.random.default_rng(seed + 202)
    b = kit.MeshBuilder()
    for _ in range(16):
        angle = rng.uniform(0, math.tau)
        reach = rng.uniform(0.05, 0.62)
        size = rng.uniform(0.04, 0.09)
        centre = (math.cos(angle) * reach, math.sin(angle) * reach, rng.uniform(0.04, 0.12))
        kit.add_blob(b, rng, kit.ICO1, centre, size, 0.7, 0.15, LIGHT, LIGHT)
    return b.build("embers", material)


def log_seat(material, seed):
    rng = np.random.default_rng(seed)
    b = kit.MeshBuilder()
    half = rng.uniform(1.05, 1.3)
    radius = rng.uniform(0.23, 0.27)
    kit.add_tube(b, (-half, 0, radius - 0.02), (half, 0, radius - 0.02), radius, radius * 0.92, 8, WOOD * 0.72, WOOD, caps=WOOD * 1.7)
    kit.add_tube(b, (half, 0, radius - 0.02), (-half, 0, radius - 0.02), radius * 0.92, radius, 8, WOOD, WOOD * 0.72, caps=WOOD * 1.7)
    return b.build(f"log_seat_{seed % 10}", material)


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


def scatter_forest(world, rng, site, foliage, broadleaf_material):
    tints = [LEAVES, LEAVES * np.array([1.18, 1.0, 0.95]), LEAVES * np.array([0.84, 0.98, 1.02])]
    # Five body shapes: classic, slim, wide and low, tall and sparse, young and full.
    hero_shapes = [
        dict(layers=9, lobes=11, radius=3.1, low=2.3, high=10.2),
        dict(layers=8, lobes=9, radius=2.2, low=2.6, high=11.4),
        dict(layers=7, lobes=11, radius=3.7, low=1.8, high=8.6),
        dict(layers=7, lobes=9, radius=2.6, low=3.7, high=12.4),
        dict(layers=8, lobes=10, radius=2.7, low=1.2, high=8.8),
    ]
    hero = [kit.pine_hero(f"pine_hero_{i}", foliage, site.seed + 10 + i, tints[i % 3], **shape) for i, shape in enumerate(hero_shapes)]
    trunk_clear = (0, 1, 3)  # These shapes leave room under their boughs for a bird house
    round_tree = [kit.broadleaf(f"broadleaf_{i}", broadleaf_material, site.seed + 20 + i, tints[i] * 1.12) for i in range(3)]
    dead = kit.dead_tree("dead_tree", foliage, site.seed + 25)
    mid_shapes = [
        dict(layers=5, lobes=7, radius=3.1, low=2.4, high=9.8),
        dict(layers=5, lobes=6, radius=2.2, low=2.8, high=11.2),
        dict(layers=4, lobes=7, radius=3.6, low=1.8, high=8.4),
    ]
    mid = [kit.pine_mid(f"pine_mid_{i}", foliage, site.seed + 30 + i, tints[i], **shape) for i, shape in enumerate(mid_shapes)]
    far = [kit.pine_far(f"pine_far_{i}", foliage, site.seed + 40 + i, tints[i]) for i in range(2)]

    spacing = kit.SpacingGrid(8.0)
    trees = []
    anchors = []

    # Trees gather in groves with open glades between them, and the front edge wanders.
    group = world.group("TreesHero")
    placed, attempts = 0, 0
    while placed < 120 and attempts < 40000:
        attempts += 1
        x, y = kit.annulus_point(rng, site.tree_line - 1.2, 72.0)
        r = math.hypot(x, y)
        if r < site.tree_line + 5.0 * (float(site.edge(x, y)) + 0.5):
            continue
        grove = float(site.groves(x, y))
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
    print(f"{site.name} hero trees: {placed}")

    group = world.group("TreesMid")
    placed, attempts = 0, 0
    while placed < 330 and attempts < 40000:
        attempts += 1
        x, y = kit.annulus_point(rng, 72.0, 185.0)
        grove = float(site.groves(x, y))
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
    print(f"{site.name} mid trees: {placed}")

    group = world.group("TreesFar")
    far_spacing = kit.SpacingGrid(20.0)
    placed, attempts = 0, 0
    while placed < 900 and attempts < 40000:
        attempts += 1
        x, y = kit.annulus_point(rng, 185.0, 660.0)
        if float(site.height(x, y)) > 90.0 or float(site.groves(x, y)) < -0.3:
            continue
        if not far_spacing.free(x, y, rng.uniform(13.0, 30.0)):
            continue
        far_spacing.add(x, y)
        world.place(group, far[rng.integers(2)], x, y, rng.uniform(1.2, 3.1), rng.uniform(0, math.tau), 0.3, rng.uniform(0.85, 1.35))
        placed += 1
    print(f"{site.name} far trees: {placed}")
    return trees, anchors


def scatter_ground_cover(world, rng, site, cover, solid, shrub):
    tufts = [kit.grass_tuft("grass_short", cover, site.seed + 50, 9, 0.9, site.grass_base, site.grass_tip), kit.grass_tuft("grass_tall", cover, site.seed + 51, 9, 1.5, site.grass_base, site.grass_tip)]
    ferns = [kit.fern(f"fern_{i}", cover, site.seed + 60 + i) for i in range(2)]
    bushes = [kit.bush(f"bush_{i}", shrub, site.seed + 70 + i) for i in range(2)]
    rocks = [kit.rock(f"rock_{i}", solid, site.seed + 80 + i) for i in range(3)]
    flowers = {key: kit.flower(f"flower_{key}", cover, site.seed + 90, colour) for key, colour in kit.FLOWERS.items()}
    mushrooms = [kit.mushroom(f"mushroom_{i}", cover, site.seed + 100 + i) for i in range(2)]
    logs = [kit.fallen_log(f"log_{i}", solid, site.seed + 110 + i) for i in range(2)]
    stumps = [kit.stump("stump_0", solid, site.seed + 120)]

    # Lush grass through the clearing, thinning out under the trees.
    group = world.group("Grass")
    placed = 0
    for _ in range(40000):
        if placed >= site.grass_count:
            break
        angle = rng.uniform(0, math.tau)
        r = 3.0 + 67.0 * rng.random() ** 1.3
        x, y = math.cos(angle) * r, math.sin(angle) * r
        if r > site.tree_line and rng.random() > 0.35:
            continue
        if site.blocked(x, y, 0.75):
            continue
        tuft = tufts[1] if (r > 15.0 and rng.random() < 0.6) else tufts[0]
        world.place(group, tuft, x, y, rng.uniform(0.75, 1.2), rng.uniform(0, math.tau))
        placed += 1
    print(f"{site.name} grass: {placed}")

    # Undergrowth makes the edge of the walkable area read as thick forest.
    group = world.group("Ferns")
    for _ in range(340):
        x, y = kit.annulus_point(rng, max(19.0, site.undergrowth_start), 70.0)
        if not site.blocked(x, y):
            world.place(group, ferns[rng.integers(2)], x, y, rng.uniform(0.85, 1.6), rng.uniform(0, math.tau))

    group = world.group("Bushes")
    for _ in range(190):
        x, y = kit.annulus_point(rng, max(22.5, site.undergrowth_start), 80.0)
        world.place(group, bushes[rng.integers(2)], x, y, rng.uniform(0.8, 1.7), rng.uniform(0, math.tau), 0.1, rng.uniform(0.85, 1.2))

    group = world.group("Rocks")
    for _ in range(120):
        x, y = kit.annulus_point(rng, max(15.0, site.undergrowth_start), 110.0)
        if not site.blocked(x, y, 1.5):
            size = 0.22 + 1.1 * rng.random() ** 2.4
            world.place(group, rocks[rng.integers(3)], x, y, size, rng.uniform(0, math.tau), size * 0.18, 1.0, 0.3, rng)
    for _ in range(30):
        x, y = kit.annulus_point(rng, 45.0, 200.0)
        size = rng.uniform(1.6, 3.8)
        world.place(group, rocks[rng.integers(3)], x, y, size, rng.uniform(0, math.tau), size * 0.2, 1.0, 0.3, rng)

    group = world.group("Flowers")
    keys = list(flowers)
    for _ in range(46):
        cx, cy = kit.annulus_point(rng, *site.flower_ring)
        if site.blocked(cx, cy, 1.5):
            continue
        patch = flowers[keys[rng.integers(len(keys))]]
        for _ in range(int(rng.integers(5, 12))):
            x, y = cx + rng.uniform(-1.6, 1.6), cy + rng.uniform(-1.6, 1.6)
            if not site.blocked(x, y, 0.7):
                world.place(group, patch, x, y, rng.uniform(0.7, 1.25), rng.uniform(0, math.tau))

    group = world.group("Mushrooms")
    for _ in range(26):
        cx, cy = kit.annulus_point(rng, max(19.0, site.undergrowth_start), 60.0)
        for _ in range(int(rng.integers(2, 6))):
            x, y = cx + rng.uniform(-0.8, 0.8), cy + rng.uniform(-0.8, 0.8)
            world.place(group, mushrooms[rng.integers(2)], x, y, rng.uniform(0.75, 1.5), rng.uniform(0, math.tau))

    group = world.group("Deadwood")
    for _ in range(14):
        x, y = kit.annulus_point(rng, max(18.0, site.undergrowth_start), 80.0)
        if not site.blocked(x, y, 2.0):
            world.place(group, logs[rng.integers(2)], x, y, rng.uniform(0.8, 1.3), rng.uniform(0, math.tau), -0.2)
    for _ in range(18):
        x, y = kit.annulus_point(rng, max(15.0, site.undergrowth_start), 60.0)
        if not site.blocked(x, y, 2.0):
            world.place(group, stumps[0], x, y, rng.uniform(0.7, 1.25), rng.uniform(0, math.tau))


# ---------------------------------------------------------------------------
# Terrain and painted ground
# ---------------------------------------------------------------------------
TERRAIN_HALF = 700.0
TERRAIN_GRID = 180
WARP = 0.09  # Lower packs more grid and ground texture around the centre


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


def paint_ground(site, trees, size=2048):
    u = np.linspace(-1.0, 1.0, size)
    wx, wy = np.meshgrid(warp(u), warp(u))
    r = np.hypot(wx, wy)

    broad = kit.fractal_noise(size, 2.3, site.seed + 301)
    fine = kit.fractal_noise(size, 1.15, site.seed + 302)
    mottle = np.clip(0.62 * broad + 0.38 * fine, 0.0, 1.0)[..., None]

    colour = (site.ground * 0.6) + (site.ground * 1.3 - site.ground * 0.6) * mottle
    moss = smoothstep(0.54, 0.68, kit.fractal_noise(size, 2.6, site.seed + 303))[..., None]
    colour = colour + (MOSS * (0.8 + 0.4 * fine[..., None]) - colour) * moss * 0.5

    dirt = (TRUNK * 0.7 + site.ground * 0.2) * (0.68 + 0.5 * fine[..., None])
    edge = kit.fractal_noise(size, 2.0, site.seed + 304) - 0.5

    def wear(mask):
        nonlocal colour
        colour = colour + (dirt - colour) * np.clip(mask, 0.0, 1.0)[..., None]

    site.paint_wear(wear, wx, wy, edge)

    half = 215.0
    floor = forest_floor_map(trees, half, 1024)
    ix = np.clip(((wx + half) / (2.0 * half) * 1024).astype(int), 0, 1023)
    iy = np.clip(((wy + half) / (2.0 * half) * 1024).astype(int), 0, 1023)
    litter = (site.ground * 0.34 + TRUNK * 0.3) * (0.7 + 0.6 * fine[..., None])
    canopy = np.clip(floor[iy, ix] * (0.8 + 0.5 * fine), 0.0, 0.92)[..., None]
    colour = colour + (litter - colour) * canopy
    colour = colour + (litter - colour) * (smoothstep(205.0, 300.0, r)[..., None] * 0.85)

    image = bpy.data.images.new(f"{site.name.lower()}_ground", size, size, alpha=False)
    rgba = np.ones((size, size, 4), dtype=np.float32)
    rgba[..., :3] = kit.to_srgb(colour)
    image.pixels.foreach_set(rgba.ravel())
    os.makedirs(os.path.dirname(site.out_ground), exist_ok=True)
    image.filepath_raw = site.out_ground
    image.file_format = "JPEG"
    image.save(quality=88)
    loaded = bpy.data.images.load(site.out_ground)
    bpy.data.images.remove(image)
    loaded.name = f"{site.name.lower()}_ground"
    loaded.pack()
    return loaded


def build_terrain(site, collection, image):
    u = np.linspace(-1.0, 1.0, TERRAIN_GRID)
    wx, wy = np.meshgrid(warp(u), warp(u))
    wz = site.height(wx, wy)
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
# Previews approximate the game: its fog, moonlight, ambient, point lights, and sky.
# ---------------------------------------------------------------------------
def add_preview_point_light(scene, name, location, candela, colour):
    """Point light watts = candela * 4 * pi."""
    light = bpy.data.lights.new(name, "POINT")
    light.energy = candela * 4.0 * math.pi
    light.color = colour
    light.shadow_soft_size = 0.2
    obj = bpy.data.objects.new(name, light)
    obj.location = location
    scene.collection.objects.link(obj)


def add_preview_fire(scene, location, size=1.0):
    """Stand-ins for a fire the game draws live."""
    x, y, z = location
    landscape_name = f"Fire_{x:.0f}_{y:.0f}"
    add_preview_point_light(scene, landscape_name, (x, y, z + 1.0 * size), 70.0 * size, (1.0, 0.46, 0.16))
    flame = kit.MeshBuilder()
    for radius, tip, offset in ((0.42, 1.25, 0.0), (0.26, 0.9, 0.3), (0.26, 0.85, -0.28)):
        apex = flame.vert((x + offset * size, y, z + tip * size), LIGHT)
        angles = np.linspace(0, math.tau, 8, endpoint=False)
        ring = [flame.vert((x + (offset + math.cos(a) * radius) * size, y + math.sin(a) * radius * size, z + 0.1 * size), LIGHT) for a in angles]
        for i in range(8):
            flame.face(apex, ring[i], ring[(i + 1) % 8])
    material = kit.glow_material(f"Flame_{landscape_name}", (1.0, 0.5, 0.14), 9.0)
    scene.collection.objects.link(bpy.data.objects.new(landscape_name, flame.build(landscape_name, material)))


def render_previews(site, scene, folder, shots):
    for name in ("GroundCover", "Broadleaf", "Shrub"):
        kit.light_back_faces_like_game(name)
    kit.show_unlit_in_preview("PropGlow")
    kit.remove_sheen()
    kit.add_game_fog(site.sky, site.fog_density)
    kit.add_preview_world(scene, site.sky_preview, site.sky, site.ambient * AMBIENT_INTENSITY)

    moon = bpy.data.lights.new("Moon", "SUN")
    moon.energy = site.moonlight
    moon.color = tuple(a * b for a, b in zip(MOONLIGHT_TINT, site.moon_colour))
    moon.angle = math.radians(2.0)
    moon_object = bpy.data.objects.new("Moon", moon)
    moon_object.rotation_euler = Vector(MOON_DIRECTION).to_track_quat("Z", "Y").to_euler()
    scene.collection.objects.link(moon_object)

    for marker in list(bpy.data.objects):
        if "light_candela" in marker:
            add_preview_point_light(scene, f"{marker.name}_light", marker.location, marker["light_candela"], tuple(marker["light_colour"]))

    for name, (position, target) in shots.items():
        camera = kit.add_preview_camera(scene, position, target)
        kit.render_preview(scene, camera, os.path.join(folder, f"{site.name.lower()}_{name}.png"))
        print(f"{site.name}_PREVIEW", name)
