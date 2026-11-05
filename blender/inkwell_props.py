"""Inkwell's library items, modelled for Blender.

Fronts face local -Y. Colours are the ones these items have always had.
"""

import math

import kit
from hearth_props import PALE_WOOD, WOOD, Model, book_stack
from kit import linear

FRAME = linear(0x3d2817)
SHELF_BACK = linear(0x2a1a0a)
BOOK_COLOURS = [linear(c) for c in (0x8b0000, 0x00008b, 0x006400, 0x4b0082, 0x8b4513, 0x2f4f4f)]
BOOK_BAND = linear(0xd4af37) * 0.7
PAPER = linear(0xf5f5dc)
LOOSE_PAPER = linear(0xfffaf0)
INK = linear(0x000033)
INKWELL_GLASS = linear(0x1a1a2e)
BURGUNDY = linear(0x800020)
LEATHER = linear(0x8b4513)
RUG_GOLD = linear(0xb08d3c) * 0.6
LAMP_METAL = PALE_WOOD
SHADE_LOW = linear(0xffc26e)
SHADE_HIGH = linear(0xfff0c8)

SHELF_LEVELS = (0.5, 1.7, 2.9, 4.1)
SHELF_INSIDE = 3.7
LABEL_HEIGHT = 5.45
LABEL_REACH = -0.42  # How far the label's lettering sits in front of the shelf
RUG_RADIUS = 3.0


def add_books(m, level, count, accent):
    """A row of books along one shelf, in small groups with gaps, some leaning on their neighbours."""
    tallest = 0.72 if level == SHELF_LEVELS[-1] else 1.0
    widths = [float(m.rng.uniform(0.13, 0.26)) for _ in range(count)]
    spare = SHELF_INSIDE - sum(widths)
    if spare < 0.0:
        widths = [width * SHELF_INSIDE / sum(widths) for width in widths]
        spare = 0.0
    # Gaps between groups share out whatever room the books leave.
    gaps = sorted(m.rng.uniform(0.0, spare, 3))
    breaks = sorted(int(i) for i in m.rng.integers(0, count + 1, 3))

    x = -SHELF_INSIDE / 2
    used = 0.0
    for index, width in enumerate(widths):
        for gap, at in zip(gaps, breaks):
            if at == index and gap > used:
                x += gap - used
                used = gap
        tall = float(m.rng.uniform(0.62, tallest))
        deep = float(m.rng.uniform(0.34, 0.46))
        colour = accent * 0.75 if m.rng.random() < 0.14 else BOOK_COLOURS[m.rng.integers(len(BOOK_COLOURS))]
        colour = colour * float(m.rng.uniform(0.7, 1.15))
        lean = float(m.rng.uniform(-0.13, 0.13)) if m.rng.random() < 0.18 else 0.0
        centre_x = x + width / 2
        centre_z = level + 0.05 + tall / 2
        front = -0.28 + deep / 2
        m.box((centre_x, front, centre_z), (width, deep, tall), colour, tilt=(0, lean, 0))
        if lean == 0.0 and m.rng.random() < 0.6:
            m.box((centre_x, front - deep / 2 - 0.002, centre_z + tall * 0.28), (width * 0.86, 0.004, 0.035), BOOK_BAND)
        x += width


def bookshelf(m, book_count, accent):
    m.box((0, 0.3, 2.5), (4.0, 0.1, 5.0), SHELF_BACK)
    # Boards across the back, for anyone walking around behind.
    for i in range(8):
        width = 4.0 / 8
        m.box((-2.0 + width * (i + 0.5), 0.36, 2.5), (width - 0.015, 0.03, 5.0), PALE_WOOD * float(m.rng.uniform(0.72, 1.0)))
    for z in (0.5, 2.5, 4.5):
        m.box((0, 0.39, z), (4.0, 0.03, 0.16), FRAME)
    for side in (-1, 1):
        m.box((side * 2.0, 0, 2.5), (0.15, 0.7, 5.0), FRAME)
    m.box((0, -0.01, 0.2), (4.15, 0.72, 0.4), FRAME * 0.8)
    m.box((0, -0.02, 5.0), (4.4, 0.78, 0.15), FRAME * 1.1)
    # The label board stands on top, close to the shelf's front.
    m.box((0, -0.32, LABEL_HEIGHT), (3.7, 0.08, 0.66), SHELF_BACK)
    m.box((0, -0.32, LABEL_HEIGHT - 0.36), (3.82, 0.1, 0.07), accent * 0.8)
    m.box((0, -0.32, LABEL_HEIGHT + 0.36), (3.82, 0.1, 0.07), FRAME * 1.1)
    for level in SHELF_LEVELS:
        m.box((0, 0, level), (3.85, 0.62, 0.1), FRAME)

    # Shared out from eye level, so a thin shelf still looks in use.
    order = (1, 2, 0, 3)
    per_level = [book_count // 4 + (1 if order.index(i) < book_count % 4 else 0) for i in range(4)]
    for level, count in zip(SHELF_LEVELS, per_level):
        if count:
            add_books(m, level, count, accent)


def writing_desk(m):
    top = WOOD
    m.box((0, 0, 1.0), (3.0, 1.8, 0.15), top)
    m.box((0, 0, 0.9), (2.86, 1.66, 0.05), top * 0.72)
    for x in (-1.3, 1.3):
        for y in (-0.7, 0.7):
            m.box((x, y, 0.45), (0.15, 0.15, 0.9), top * 0.85)
    # Drawers on the writer's side.
    for x in (-0.75, 0.75):
        m.box((x, -0.56, 0.74), (1.2, 0.5, 0.26), top * 0.78)
        m.box((x, -0.815, 0.74), (1.12, 0.012, 0.2), top * 0.98)
        m.disc((x, -0.83, 0.74), (0, -1, 0), 0.03, 0.03, 6, linear(0xb08d3c))

    desk_top = 1.075
    # The inkwell, with the quill resting in it.
    m.tube((-0.8, 0.1, desk_top), (-0.8, 0.1, desk_top + 0.13), 0.12, 0.095, 8, INKWELL_GLASS * 1.6)
    m.disc((-0.8, 0.1, desk_top + 0.13), (0, 0, 1), 0.085, 0.008, 8, INK)
    tip = (-0.8, 0.1, desk_top + 0.1)
    end = (-1.0, 0.03, desk_top + 0.62)
    m.tube(tip, end, 0.006, 0.012, 5, PAPER)
    add_quill_feather(m.solid, tip, end)

    # An open book, with lines of writing on both pages.
    for side in (-1, 1):
        m.box((0.45 + side * 0.21, -0.1, desk_top + 0.025), (0.4, 0.52, 0.02), PAPER, tilt=(0, side * 0.05, 0))
        for line in range(6):
            m.box((0.45 + side * 0.21, -0.29 + line * 0.075, desk_top + 0.038), (0.3, 0.018, 0.002), linear(0x77736a), tilt=(0, side * 0.05, 0))
    m.box((0.45, -0.1, desk_top + 0.01), (0.86, 0.56, 0.02), LEATHER * 0.8)

    # Sheets of paper, each squared up a little differently.
    for sheet in range(9):
        twist = float(m.rng.uniform(-0.12, 0.12))
        m.box((1.1, 0.35, desk_top + 0.006 + sheet * 0.009), (0.35, 0.45, 0.007), LOOSE_PAPER * float(m.rng.uniform(0.86, 1.0)), tilt=(0, 0, 0.15 + twist))


def add_quill_feather(builder, tip, end):
    """Soft vanes along the top half of the shaft, narrowing to a point."""
    steps = 5
    white, shaded = PAPER * 0.95, PAPER * 0.66
    previous = None
    for i in range(steps + 1):
        t = 0.4 + 0.6 * i / steps
        centre = [tip[a] + (end[a] - tip[a]) * t for a in range(3)]
        width = 0.055 * math.sin(math.pi * (i + 0.6) / (steps + 1.2))
        near = builder.vert((centre[0] + width, centre[1] + width * 0.3, centre[2] + width * 0.25), white)
        far = builder.vert((centre[0] - width, centre[1] - width * 0.3, centre[2] - width * 0.25), shaded)
        if previous:
            builder.face(previous[0], near, far, previous[1])
            builder.face(previous[1], far, near, previous[0])
        previous = (near, far)


def reading_chair(m):
    frame, cushion = LEATHER, BURGUNDY
    for x in (-0.3, 0.3):
        for y in (-0.25, 0.25):
            m.tube((x, y, 0.0), (x, y, 0.46), 0.045, 0.035, 6, frame * 0.8)
    m.box((0, 0, 0.47), (0.82, 0.72, 0.08), frame)
    m.box((0, -0.02, 0.56), (0.74, 0.66, 0.12), cushion)
    m.box((0, 0.33, 0.96), (0.82, 0.12, 0.9), frame)
    m.box((0, 0.26, 0.98), (0.7, 0.08, 0.74), cushion * 0.9)
    for side in (-1, 1):
        m.box((side * 0.43, 0.0, 0.76), (0.09, 0.62, 0.08), frame)
        m.box((side * 0.43, -0.26, 0.62), (0.07, 0.07, 0.24), frame * 0.85)


def floor_lamp(m):
    m.tube((0, 0, 0), (0, 0, 0.1), 0.3, 0.25, 8, LAMP_METAL, cap=LAMP_METAL)
    m.tube((0, 0, 0.1), (0, 0, 1.86), 0.055, 0.045, 8, LAMP_METAL)
    # The shade and bulb draw self-lit. Light comes from a marker beside it.
    kit.add_tube(m.glow, (0, 0, 1.76), (0, 0, 2.14), 0.34, 0.18, 10, SHADE_LOW, SHADE_HIGH)
    m.ball((0, 0, 1.84), 0.1, linear(0xfff4c8), glow=True)
    m.tube((0, 0, 2.14), (0, 0, 2.2), 0.05, 0.03, 6, LAMP_METAL)


def reading_rug(m):
    """A round rug, flat on the ground, in crisp rings of burgundy and gold."""
    b = m.solid
    deep, gold = BURGUNDY * 0.68, RUG_GOLD * 0.75
    bands = ((0.0, 0.95, deep * 0.85), (0.95, 1.02, gold), (1.02, 2.55, deep), (2.55, 2.63, gold), (2.63, RUG_RADIUS, deep * 0.8))
    sides = 40
    height = 0.02
    for inner, outer, colour in bands:
        low = [b.vert((math.cos(math.tau * i / sides) * inner, math.sin(math.tau * i / sides) * inner, height), colour) for i in range(sides)]
        high = [b.vert((math.cos(math.tau * i / sides) * outer, math.sin(math.tau * i / sides) * outer, height), colour) for i in range(sides)]
        for i in range(sides):
            j = (i + 1) % sides
            b.face(low[i], high[i], high[j], low[j])


def bookshelf_recipe(book_count, accent):
    return lambda m: bookshelf(m, book_count, accent)


def build_all(materials, shelves):
    """Returns {item name: [(\"solid\" or \"glow\", mesh)]}. `shelves` is {name: (books, accent colour)}."""
    recipes = {
        "writing_desk": writing_desk,
        "reading_chair": reading_chair,
        "floor_lamp": floor_lamp,
        "reading_rug": reading_rug,
        "book_stack_0": book_stack,
        "book_stack_1": book_stack,
    }
    for name, (books, accent) in shelves.items():
        recipes[f"bookshelf_{name}"] = bookshelf_recipe(books, accent)
    items = {}
    for seed, (name, recipe) in enumerate(recipes.items()):
        model = Model(seed + 1900)
        recipe(model)
        items[name] = model.finish(name, materials)
    return items

