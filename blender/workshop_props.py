"""Workshop's forge yard items, modelled for Blender.

Fronts face local -Y. The old Workshop only had anvils, so those keep their dark iron,
and the rest of the yard is built around them.
"""

import math

import kit
from hearth_props import DARK_WOOD, METAL, PALE_WOOD, WOOD, Model
from kit import STONE, linear

SIGN_HEIGHT = 2.06
SIGN_REACH = 0.42  # Where a bench's sign lettering sits, measured from the bench's middle toward its back
MAST_TOP = 2.72  # The string lights hang from here
BENCH_VARIANTS = 3

IRON = linear(0x333333)
SOOT = linear(0x1c1a18)
COALS = linear(0xff4500) * 0.85
EMBER = linear(0xffa030)
HOOP = linear(0x4a4a4a)
LEATHER = linear(0x6b3f22)
WATER = linear(0x14222e)
BLUEPRINT = linear(0x3f6aa6)
BLUEPRINT_LINE = linear(0xc8d8ee)
RED_TOOLBOX = linear(0xa83226)
COPPER = linear(0xb0683a)
CRATE = linear(0x8b6a44)


def anvil(m):
    """On its stump, with the horn pointing along +x."""
    stump = DARK_WOOD * 1.3
    m.tube((0, 0, -0.05), (0, 0, 0.62), 0.36, 0.31, 9, stump, cap=PALE_WOOD * 0.7)
    m.box((0, 0, 0.67), (0.52, 0.34, 0.1), IRON * 0.85)
    m.box((0, 0, 0.8), (0.28, 0.2, 0.18), IRON * 0.8)
    m.box((-0.03, 0, 0.95), (0.62, 0.25, 0.13), IRON * 1.15)
    m.tube((0.28, 0, 0.95), (0.64, 0, 0.97), 0.11, 0.015, 8, IRON * 1.1)
    m.box((-0.4, 0, 0.97), (0.16, 0.18, 0.08), IRON)


def stone_forge(m):
    """A stone hearth with its opening at the front, under an iron hood and chimney."""
    width, depth, tall = 2.6, 1.8, 0.92
    rows, per_row = 4, 6
    for row in range(rows):
        z = (row + 0.5) * tall / rows
        offset = 0.5 if row % 2 else 0.0
        for i in range(per_row + 1):
            x0 = max(-width / 2, -width / 2 + (i - offset) * width / per_row)
            x1 = min(width / 2, -width / 2 + (i + 1 - offset) * width / per_row)
            if x1 - x0 < 0.05:
                continue
            for y in (-depth / 2 + 0.06, depth / 2 - 0.06):
                m.box(((x0 + x1) / 2, y, z), (x1 - x0 - 0.02, 0.12, tall / rows - 0.02), STONE * float(m.rng.uniform(0.62, 1.05)))
    for side in (-1, 1):
        m.box((side * (width / 2 - 0.06), 0, tall / 2), (0.12, depth - 0.2, tall), STONE * 0.8)
    m.box((0, 0, tall - 0.1), (width - 0.2, depth - 0.2, 0.2), SOOT)

    # A bed of separate coals, hottest in the middle, drawn self-lit.
    m.box((0, 0, tall + 0.01), (width - 0.4, depth - 0.4, 0.02), SOOT * 0.7)
    for _ in range(52):
        x, y = float(m.rng.uniform(-1.05, 1.05)), float(m.rng.uniform(-0.65, 0.65))
        heat = max(1.0 - math.hypot(x / 1.0, y / 0.62), 0.0)
        colour = COALS * (0.22 + 0.5 * heat) + EMBER * (0.5 * heat)
        m.ball((x, y, tall + 0.05), float(m.rng.uniform(0.05, 0.1)), colour, squash=0.65, jitter=0.2, glow=True)

    # The back wall keeps the wind off. It's sooty, so the fire doesn't wash it out.
    back = depth / 2 - 0.14
    m.box((0, back, tall + 0.65), (width, 0.28, 1.3), STONE * 0.26)
    for side in (-1, 1):
        m.tube((side * (width / 2 - 0.12), -depth / 2 + 0.14, tall - 0.05), (side * (width / 2 - 0.12), -depth / 2 + 0.3, 2.3), 0.05, 0.05, 6, IRON)
    add_hood(m.solid, (1.42, 1.02), (0.4, 0.4), 2.28, 3.15, 0.08, 0.42)
    m.box((0, 0.42, 4.6), (0.74, 0.74, 2.9), IRON * 0.85)
    m.box((0, 0.42, 6.08), (0.84, 0.84, 0.12), IRON * 0.7)


def add_hood(b, low_half, high_half, low_z, high_z, low_y, high_y):
    """A rectangular iron hood narrowing to the chimney, with a sooty inside you can see from below."""
    signs = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    low = [(sx * low_half[0], low_y + sy * low_half[1], low_z) for sx, sy in signs]
    high = [(sx * high_half[0], high_y + sy * high_half[1], high_z) for sx, sy in signs]
    for i in range(4):
        j = (i + 1) % 4
        b.face(b.vert(low[i], IRON * 0.78), b.vert(low[j], IRON * 0.78), b.vert(high[j], IRON * 0.95), b.vert(high[i], IRON * 0.95))
        b.face(b.vert(high[i], SOOT), b.vert(high[j], SOOT), b.vert(low[j], SOOT * 0.8), b.vert(low[i], SOOT * 0.8))


def bellows(m):
    m.box((0, 0, 0.18), (0.12, 0.12, 0.36), DARK_WOOD)
    m.box((0.5, 0, 0.18), (0.12, 0.12, 0.36), DARK_WOOD)
    m.box((0.2, 0, 0.42), (0.9, 0.5, 0.04), WOOD)
    m.box((0.14, 0, 0.62), (0.82, 0.46, 0.04), WOOD * 1.1, tilt=(0, 0.2, 0))
    m.tube((0.58, 0, 0.47), (-0.1, 0, 0.56), 0.22, 0.2, 8, LEATHER)
    m.tube((-0.1, 0, 0.5), (-0.52, 0, 0.52), 0.05, 0.03, 6, IRON)
    m.tube((0.55, 0, 0.66), (1.0, 0, 0.74), 0.018, 0.018, 5, PALE_WOOD)


def quench_barrel(m):
    """A barrel of dark water for cooling hot iron."""
    wood = WOOD * 1.1
    m.tube((0, 0, 0), (0, 0, 0.44), 0.33, 0.38, 12, wood)
    m.tube((0, 0, 0.44), (0, 0, 0.86), 0.38, 0.33, 12, wood)
    for z, radius in ((0.14, 0.351), (0.72, 0.351)):
        m.tube((0, 0, z - 0.025), (0, 0, z + 0.025), radius, radius, 12, HOOP)
    m.disc((0, 0, 0.8), (0, 0, 1), 0.3, 0.01, 12, WATER, rim=wood)


def tool_rack(m):
    """A rack of tongs and hammers, hanging ready by the forge."""
    wood = DARK_WOOD * 1.25
    for side in (-1, 1):
        m.box((side * 1.0, 0, 0.9), (0.1, 0.1, 1.8), wood)
    m.box((0, 0, 1.72), (2.2, 0.08, 0.12), wood)
    m.box((0, 0.02, 0.5), (2.1, 0.05, 0.1), wood * 0.85)
    for i, x in enumerate((-0.75, -0.42, -0.1, 0.22, 0.54, 0.84)):
        if i % 2 == 0:
            for spread in (-0.03, 0.03):
                m.tube((x + spread, -0.06, 1.68), (x + spread * 2.4, -0.06, 0.9), 0.012, 0.012, 4, IRON * 1.2)
            m.box((x, -0.06, 0.86), (0.18, 0.025, 0.09), IRON)
        else:
            m.tube((x, -0.06, 1.68), (x, -0.06, 1.05), 0.018, 0.02, 5, PALE_WOOD)
            m.box((x, -0.06, 1.02), (0.2, 0.06, 0.08), IRON * 1.2)


def woodpile(m):
    """Split logs stacked between two stakes."""
    for side in (-1, 1):
        m.box((side * 1.05, 0, 0.55), (0.08, 0.08, 1.1), DARK_WOOD)
    for row, count in enumerate((7, 6, 5)):
        for i in range(count):
            x = (i - (count - 1) / 2) * 0.3
            z = 0.15 + row * 0.26
            colour = WOOD * float(m.rng.uniform(0.75, 1.15))
            m.tube((x, -0.42, z), (x, 0.42, z), 0.14, 0.14, 7, colour, cap=PALE_WOOD * float(m.rng.uniform(0.85, 1.15)))


def crate(m):
    wood = CRATE * float(m.rng.uniform(0.85, 1.1))
    size = 0.8
    m.box((0, 0, size / 2), (size, size, size), wood * 0.75)
    for z in (0.08, size - 0.08):
        for y in (-size / 2, size / 2):
            m.box((0, y, z), (size + 0.02, 0.03, 0.14), wood)
        for x in (-size / 2, size / 2):
            m.box((x, 0, z), (0.03, size + 0.02, 0.14), wood)
    for x in (-size / 2, size / 2):
        for y in (-size / 2, size / 2):
            m.box((x, y, size / 2), (0.05, 0.05, size), wood * 1.1)


def add_blueprint(m, x, y, z):
    m.box((x, y, z), (0.82, 0.58, 0.006), BLUEPRINT, tilt=(0, 0, 0.08))
    for i in range(4):
        m.box((x, y - 0.18 + i * 0.12, z + 0.005), (0.6 - i * 0.08, 0.012, 0.002), BLUEPRINT_LINE, tilt=(0, 0, 0.08))


def add_hammer(m, x, y, z, turn):
    reach = 0.2
    dx, dy = math.cos(turn) * reach, math.sin(turn) * reach
    m.tube((x - dx, y - dy, z), (x + dx, y + dy, z), 0.014, 0.016, 5, PALE_WOOD)
    m.box((x + dx, y + dy, z + 0.01), (0.08, 0.17, 0.06), METAL, tilt=(0, 0, turn))


def add_gear(m, x, y, z, radius):
    m.disc((x, y, z), (0, 0, 1), radius, 0.03, 8, COPPER, rim=COPPER * 0.7)
    for i in range(8):
        angle = math.tau * i / 8
        m.box((x + math.cos(angle) * radius, y + math.sin(angle) * radius, z), (0.03, 0.03, 0.028), COPPER * 0.85, tilt=(0, 0, angle))


def add_toolbox(m, x, y, z):
    m.box((x, y, z + 0.08), (0.46, 0.22, 0.16), RED_TOOLBOX)
    m.box((x, y, z + 0.17), (0.48, 0.24, 0.02), RED_TOOLBOX * 0.8)
    m.box((x, y, z + 0.2), (0.16, 0.025, 0.02), IRON)


def project_bench(m, variant):
    """A heavy bench with a sign above it. Each variant has different work laid out on top."""
    top = PALE_WOOD
    m.box((0, 0, 0.92), (2.6, 0.92, 0.1), top)
    for x in (-1.15, 1.15):
        for y in (-0.36, 0.36):
            m.box((x, y, 0.44), (0.13, 0.13, 0.88), top * 0.72)
    m.box((0, 0, 0.3), (2.3, 0.7, 0.05), top * 0.62)
    m.box((0, 0.36, 0.72), (2.3, 0.05, 0.1), top * 0.72)

    # The sign stands on two posts at the back, with a mast in the middle for the string lights.
    back = 0.5
    for x in (-1.1, 1.1):
        m.tube((x, back, -0.05), (x, back, SIGN_HEIGHT + 0.4), 0.06, 0.05, 6, DARK_WOOD * 1.2)
    m.tube((0, back, SIGN_HEIGHT + 0.3), (0, back, MAST_TOP), 0.03, 0.025, 5, DARK_WOOD * 1.2)
    m.box((0, back, SIGN_HEIGHT), (2.72, 0.08, 0.76), DARK_WOOD * 1.1)

    table = 0.97
    if variant == 0:
        add_blueprint(m, -0.55, -0.05, table + 0.004)
        add_hammer(m, 0.55, -0.15, table + 0.02, 0.5)
        m.tube((0.95, 0.22, table), (0.95, 0.22, table + 0.18), 0.07, 0.07, 8, linear(0x5a6f6a))
        m.disc((0.95, 0.22, table + 0.19), (0, 0, 1), 0.075, 0.02, 8, METAL)
        add_gear(m, 0.1, 0.22, table + 0.02, 0.09)
    elif variant == 1:
        add_toolbox(m, -0.7, 0.15, table)
        add_gear(m, 0.05, -0.12, table + 0.02, 0.12)
        add_gear(m, 0.25, -0.2, table + 0.02, 0.07)
        add_hammer(m, 0.75, 0.05, table + 0.02, -0.7)
    else:
        m.box((0.75, 0.12, table + 0.13), (0.44, 0.34, 0.26), CRATE)
        m.torus((-0.7, 0.05, table + 0.03), 0.16, 0.025, 12, COPPER)
        m.torus((-0.7, 0.05, table + 0.08), 0.15, 0.025, 12, COPPER * 0.85)
        add_blueprint(m, 0.05, -0.12, table + 0.004)


def bench_recipe(variant):
    return lambda m: project_bench(m, variant)


def build_all(materials):
    """Returns {item name: [(\"solid\" or \"glow\", mesh)]}."""
    recipes = {
        "stone_forge": stone_forge,
        "anvil": anvil,
        "bellows": bellows,
        "quench_barrel": quench_barrel,
        "tool_rack": tool_rack,
        "woodpile": woodpile,
        "crate_0": crate,
        "crate_1": crate,
    }
    for variant in range(BENCH_VARIANTS):
        recipes[f"project_bench_{variant}"] = bench_recipe(variant)
    items = {}
    for seed, (name, recipe) in enumerate(recipes.items()):
        model = Model(seed + 2100)
        recipe(model)
        items[name] = model.finish(name, materials)
    return items
