"""Grove's garden items, modelled for Blender.

Fronts face local -Y. Colours are the ones these items have always had.
"""

import math

import numpy as np

import kit
from hearth_props import DARK_WOOD, WOOD, Model, bench, garden_tools, stepping_stone
from kit import STEM, STONE, linear

BED_DEPTH = 4.5
SOIL_HEIGHT = 0.2  # Plants stand on this
BOARD_WIDTH = 2.5
BOARD_HEIGHT = 1.22
BORDER_HEIGHT = 0.3
BORDER_THICKNESS = 0.16

SOIL = linear(0x3d2817)
PLINTH_STONE = linear(0x666666)
GOLD = linear(0xffd700)
PETAL_CENTRE = linear(0xffe9a8)


def flower_bed(m, width):
    half_width, half_depth = width / 2, BED_DEPTH / 2
    thickness = BORDER_THICKNESS
    middle = BORDER_HEIGHT / 2 - 0.04
    for side in (-1, 1):
        m.box((0, side * (half_depth + thickness / 2), middle), (width + thickness * 2, thickness, BORDER_HEIGHT + 0.08), DARK_WOOD * m.rng.uniform(0.9, 1.15))
        m.box((side * (half_width + thickness / 2), 0, middle), (thickness, BED_DEPTH, BORDER_HEIGHT + 0.08), DARK_WOOD * m.rng.uniform(0.9, 1.15))

    # Stakes holding the long boards in, at uneven gaps.
    x = -half_width + 0.6
    while x < half_width:
        for side in (-1, 1):
            m.box((x, side * (half_depth + thickness + 0.03), 0.14), (0.1, 0.06, 0.4), DARK_WOOD * m.rng.uniform(0.7, 0.95))
        x += m.rng.uniform(2.6, 3.8)

    # Uneven soil, so it isn't a flat brown slab between the plants.
    columns, rows = int(width * 1.5), 7
    grid = [
        [
            m.solid.vert(
                (-half_width + width * c / columns, -half_depth + BED_DEPTH * r / rows, SOIL_HEIGHT + m.rng.uniform(-0.035, 0.035)),
                SOIL * m.rng.uniform(0.55, 1.05),
            )
            for c in range(columns + 1)
        ]
        for r in range(rows + 1)
    ]
    for r in range(rows):
        for c in range(columns):
            m.solid.face(grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c])


def flower_bed_short(m):
    flower_bed(m, 20.0)


def flower_bed_long(m):
    flower_bed(m, 30.0)


def bed_sign(m):
    for side in (-1, 1):
        m.tube((side * 0.98, 0, -0.08), (side * 0.98, 0, 1.68), 0.075, 0.06, 6, DARK_WOOD)
    m.box((0, 0, BOARD_HEIGHT), (BOARD_WIDTH, 0.08, 0.72), WOOD)
    m.box((0, 0.055, BOARD_HEIGHT + 0.2), (BOARD_WIDTH - 0.3, 0.03, 0.09), DARK_WOOD)
    m.box((0, 0.055, BOARD_HEIGHT - 0.2), (BOARD_WIDTH - 0.3, 0.03, 0.09), DARK_WOOD)


def add_gem(builder, centre, radius, tall, colour):
    """A pointed gem. Each face has its own shade, because the game draws it self-lit."""
    x, y, z = centre
    sides = 6
    rim = [(x + math.cos(math.tau * i / sides) * radius, y + math.sin(math.tau * i / sides) * radius, z) for i in range(sides)]
    for i in range(sides):
        j = (i + 1) % sides
        upper = colour * (0.95 if i % 2 == 0 else 0.72)
        builder.face(builder.vert((x, y, z + tall), upper * 1.05), builder.vert(rim[i], upper * 0.9), builder.vert(rim[j], upper * 0.9))
        lower = colour * (0.42 if i % 2 == 0 else 0.56)
        builder.face(builder.vert((x, y, z - tall), lower * 0.8), builder.vert(rim[j], lower), builder.vert(rim[i], lower))


def stone_plinth(m):
    m.disc((0, 0, 0.05), (0, 0, 1), 1.4, 0.16, 12, PLINTH_STONE * 0.85, rim=PLINTH_STONE * 0.6)
    m.disc((0, 0, 0.17), (0, 0, 1), 1.12, 0.1, 12, PLINTH_STONE, rim=PLINTH_STONE * 0.7)
    m.disc((0, 0, 0.26), (0, 0, 1), 0.58, 0.1, 10, STONE * 1.05, rim=STONE * 0.7)
    m.tube((0, 0, 0.3), (0, 0, 1.86), 0.21, 0.15, 8, STONE)
    m.disc((0, 0, 1.9), (0, 0, 1), 0.28, 0.1, 8, STONE * 1.05, rim=STONE * 0.72)
    add_gem(m.glow, (0, 0, 2.48), 0.24, 0.32, GOLD * 0.7)


def daisy(name, material, seed, petal):
    """Flat, open petals on a thin stem. The game draws these self-lit, like the beds in the old garden."""
    rng = np.random.default_rng(seed)
    b = kit.MeshBuilder()
    stem = STEM * 0.2
    root_a, root_b = b.vert((-0.016, 0, -0.03), stem * 0.6), b.vert((0.016, 0, -0.03), stem * 0.6)
    b.face(root_a, root_b, b.vert((0, 0, 0.4), stem))
    b.face(b.vert((0, 0, 0.1), stem * 0.8), b.vert((0.15, 0.03, 0.22), stem), b.vert((0.02, 0, 0.2), stem * 0.8))

    # Separate petals around a small pale eye, so the head keeps its category's colour.
    petals = 6
    for i in range(petals):
        angle = math.tau * i / petals + rng.uniform(-0.05, 0.05)
        inner = b.vert((math.cos(angle) * 0.025, math.sin(angle) * 0.025, 0.415), petal * 0.6)
        tip = b.vert((math.cos(angle) * 0.14, math.sin(angle) * 0.14, 0.44), petal)
        left = b.vert((math.cos(angle - 0.42) * 0.08, math.sin(angle - 0.42) * 0.08, 0.425), petal * 0.86)
        right = b.vert((math.cos(angle + 0.42) * 0.08, math.sin(angle + 0.42) * 0.08, 0.425), petal * 0.86)
        b.face(inner, right, tip, left)
    eye = b.vert((0, 0, 0.44), PETAL_CENTRE * 0.75)
    ring = [b.vert((math.cos(math.tau * i / 6) * 0.03, math.sin(math.tau * i / 6) * 0.03, 0.425), PETAL_CENTRE * 0.5) for i in range(6)]
    for i in range(6):
        b.face(eye, ring[i], ring[(i + 1) % 6])
    return b.build(name, material)


def tulip(name, material, seed, petal):
    """A taller closed cup, so the beds aren't one flat layer of heads."""
    rng = np.random.default_rng(seed)
    b = kit.MeshBuilder()
    stem = STEM * 0.2
    root_a, root_b = b.vert((-0.016, 0, -0.03), stem * 0.6), b.vert((0.016, 0, -0.03), stem * 0.6)
    b.face(root_a, root_b, b.vert((0, 0, 0.5), stem))
    b.face(b.vert((0, 0, 0.08), stem * 0.8), b.vert((0.05, 0.1, 0.38), stem), b.vert((0.02, 0, 0.2), stem * 0.8))

    base = b.vert((0, 0, 0.47), petal * 0.45)
    belly, tips = [], []
    for i in range(6):
        angle = math.tau * i / 6 + rng.uniform(-0.06, 0.06)
        belly.append(b.vert((math.cos(angle) * 0.085, math.sin(angle) * 0.085, 0.55), petal * 0.72))
        lift = 0.7 if i % 2 == 0 else 0.65
        tips.append(b.vert((math.cos(angle) * 0.06, math.sin(angle) * 0.06, lift), petal))
    for i in range(6):
        j = (i + 1) % 6
        b.face(base, belly[i], belly[j])
        b.face(belly[i], tips[i], tips[j], belly[j])
    return b.build(name, material)


def build_all(materials):
    """Returns {item name: [(\"solid\" or \"glow\", mesh)]}."""
    recipes = {
        "flower_bed_short": flower_bed_short,
        "flower_bed_long": flower_bed_long,
        "bed_sign": bed_sign,
        "stone_plinth": stone_plinth,
        "bench": bench,
        "garden_tools": garden_tools,
        "stepping_stone_0": stepping_stone,
        "stepping_stone_1": stepping_stone,
    }
    items = {}
    for seed, (name, recipe) in enumerate(recipes.items()):
        model = Model(seed + 1500)
        recipe(model)
        items[name] = model.finish(name, materials)
    return items
