"""Haven's graduation items, modelled for Blender.

Fronts face local -Y. Colours are the ones these items have always had.
"""

import math

import bpy
import numpy as np

import kit
import landscape
from hearth_props import BLACK, DARK_WOOD, WOOD, Model, bench, book_stack
from kit import linear

STAGE_WIDTH = 20.0
STAGE_DEPTH = 12.0
STAGE_HEIGHT = 1.5
STEP_COUNT = 4
STEP_RISE = 0.3
STEP_DEPTH = 0.5
STEP_WIDTH = 7.0
CARPET_WIDTH = 3.6
CARPET_THICKNESS = 0.016
FLAG_LENGTH = 3.0
FLAG_HANGS_FROM = 6.95
ARM_REACH = 0.16  # How far in front of its pole a flag hangs
BOARD_WIDTH = 19.0
BOARD_HEIGHT = 10.0
BOARD_BOTTOM = 0.5

STAGE_WOOD = linear(0x4a3728)
CARPET = linear(0x8b0000) * 0.72
FRAME = linear(0x2a2a2a)
PAPER = linear(0xf5f5dc)
LEATHER = linear(0x8b4513)
GOLD = linear(0xffd700)

BLUE = 0x1e4d8c
ORANGE = 0xff9900
PURPLE = 0x6b4c9a

# The board's plain type, in the same colours as the slides in Chronicle.
BOARD_BACKGROUND = linear(0x14110c)
CREAM = linear(0xf0e8d6) * 0.9
CREAM_SOFT = linear(0xf0e8d6) * 0.5
BACHELORS_HEADING = linear(0x9966cc)
AWS_HEADING = linear(ORANGE)
BCS_HEADING = linear(0x6f9fe0)  # The banners' blue lightened, because it's too dark to read on the board
PROGRESS_TRACK = linear(0x2e2823)


def stage_platform(m):
    """Boards on a dark frame, with the red runner down the middle."""
    deck = 0.1
    m.box((0, 0, (STAGE_HEIGHT - deck) / 2), (STAGE_WIDTH - 0.3, STAGE_DEPTH - 0.3, STAGE_HEIGHT - deck), STAGE_WOOD * 0.6)
    boards = 20
    for i in range(boards):
        width = STAGE_WIDTH / boards
        x = -STAGE_WIDTH / 2 + width * (i + 0.5)
        m.box((x, 0, STAGE_HEIGHT - deck / 2), (width - 0.02, STAGE_DEPTH, deck), STAGE_WOOD * m.rng.uniform(0.82, 1.12))
    # Posts around the sides, so the walls aren't flat slabs.
    for x in np.linspace(-STAGE_WIDTH / 2 + 0.2, STAGE_WIDTH / 2 - 0.2, 9):
        m.box((x, -STAGE_DEPTH / 2 + 0.1, (STAGE_HEIGHT - deck) / 2), (0.24, 0.24, STAGE_HEIGHT - deck), STAGE_WOOD * 0.9)
    for y in np.linspace(-STAGE_DEPTH / 2 + 0.2, STAGE_DEPTH / 2 - 0.2, 6):
        for side in (-1, 1):
            m.box((side * (STAGE_WIDTH / 2 - 0.1), y, (STAGE_HEIGHT - deck) / 2), (0.24, 0.24, STAGE_HEIGHT - deck), STAGE_WOOD * 0.9)
    length = STAGE_DEPTH - 0.4
    m.box((0, -0.2, STAGE_HEIGHT + CARPET_THICKNESS / 2), (CARPET_WIDTH, length, CARPET_THICKNESS), CARPET)


def stage_step(m, index):
    """One solid step, tallest nearest the stage. The carpet runs over its tread and front."""
    tall = (index + 1) * STEP_RISE
    m.box((0, 0, tall / 2), (STEP_WIDTH, STEP_DEPTH, tall), STAGE_WOOD * 0.7)
    m.box((0, 0, tall + CARPET_THICKNESS / 2), (CARPET_WIDTH, STEP_DEPTH, CARPET_THICKNESS), CARPET)
    m.box((0, -STEP_DEPTH / 2 - CARPET_THICKNESS / 2, tall / 2), (CARPET_WIDTH, CARPET_THICKNESS, tall), CARPET * 0.8)


def lectern(m):
    wood = DARK_WOOD
    m.box((0, 0, 0.08), (1.0, 0.72, 0.16), wood * 0.72)
    m.box((0, 0, 0.7), (0.82, 0.56, 1.1), wood)
    m.box((0, -0.29, 0.7), (0.56, 0.02, 0.82), wood * 1.45)
    m.box((0, 0, 1.31), (1.02, 0.78, 0.1), wood * 1.2, tilt=(0.25, 0, 0))


def qualifications_board(m):
    """The frame and backing. The screen behind the text draws self-lit, like Chronicle's."""
    middle = BOARD_BOTTOM + BOARD_HEIGHT / 2
    m.box((0, 0.12, middle), (BOARD_WIDTH + 1.0, 0.3, BOARD_HEIGHT + 1.0), FRAME)
    for x in (-BOARD_WIDTH / 2 + 2, 0.0, BOARD_WIDTH / 2 - 2):
        m.tube((x, 0.26, 0.0), (x, 0.26, BOARD_HEIGHT + 0.6), 0.1, 0.08, 6, FRAME * 0.7)
        m.tube((x, 0.26, 7.0), (x, 2.3, 0.0), 0.07, 0.07, 5, FRAME * 0.7)
    m.box((0, -0.04, middle), (BOARD_WIDTH, 0.02, BOARD_HEIGHT), BOARD_BACKGROUND, glow=True)
    # Rules between the sections, and the degree's progress bar.
    rule = linear(0xf0e8d6) * 0.22
    for z, half in ((8.86, 9.0), (6.1, 9.0)):
        m.box((0, -0.06, z), (half * 2, 0.01, 0.035), rule, glow=True)
    m.box((6.1, -0.06, 6.72), (5.6, 0.01, 0.24), PROGRESS_TRACK, glow=True)
    m.box((3.3 + 5.6 * 0.3, -0.07, 6.72), (5.6 * 0.6, 0.01, 0.24), BACHELORS_HEADING, glow=True)


def board_lines():
    """(text, size, x, height above the stage, colour, alignment). Left and right are as you face the board."""
    left, right, column = -8.9, 8.9, 0.7
    return (
        ("Qualifications", 0.95, 0.0, 9.5, CREAM, "CENTER"),
        ("Bachelors", 0.46, left, 8.35, BACHELORS_HEADING, "LEFT"),
        ("BSc Computing + IT", 0.62, left, 7.55, CREAM, "LEFT"),
        ("The Open University (Expected 2027)", 0.34, left, 6.8, CREAM_SOFT, "LEFT"),
        ("In progress: 60%", 0.34, right, 7.32, CREAM, "RIGHT"),
        ("AWS Certifications", 0.46, left, 5.5, AWS_HEADING, "LEFT"),
        ("Certified Developer - Associate", 0.4, left, 4.75, CREAM, "LEFT"),
        ("Issued Aug 2025. Expires Aug 2028", 0.28, left, 4.3, CREAM_SOFT, "LEFT"),
        ("Certified AI Practitioner", 0.4, left, 3.55, CREAM, "LEFT"),
        ("Issued Apr 2025. Expires Apr 2028", 0.28, left, 3.1, CREAM_SOFT, "LEFT"),
        ("Certified Cloud Practitioner", 0.4, left, 2.35, CREAM, "LEFT"),
        ("Issued Jun 2024. Expires Aug 2028", 0.28, left, 1.9, CREAM_SOFT, "LEFT"),
        ("BCS Certifications", 0.46, column, 5.5, BCS_HEADING, "LEFT"),
        ("Level 3 Certificate in Software", 0.4, column, 4.75, CREAM, "LEFT"),
        ("Development Context & Methodologies", 0.4, column, 4.25, CREAM, "LEFT"),
        ("Level 3 Certificate in Programming", 0.4, column, 3.3, CREAM, "LEFT"),
    )


def board_text(material):
    """Every line of the board in one mesh, so it's one draw call."""
    verts, faces, colours = [], [], []
    for text, size, x, z, colour, align in board_lines():
        mesh = landscape.text_mesh(text, size, material, (x, -0.09, z), colour, align)
        start = len(verts)
        verts += [tuple(vertex.co) for vertex in mesh.vertices]
        faces += [[index + start for index in polygon.vertices] for polygon in mesh.polygons]
        colours += [(*colour, 1.0)] * len(mesh.vertices)
        bpy.data.meshes.remove(mesh)

    joined = bpy.data.meshes.new("board_text")
    joined.from_pydata(verts, [], faces)
    attribute = joined.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attribute.data.foreach_set("color", np.array(colours, dtype=np.float32).ravel())
    joined.color_attributes.active_color = attribute
    joined.materials.append(material)
    return joined


def banner_pole(m):
    pole = STAGE_WOOD
    m.tube((0, 0, -0.1), (0, 0, 8.0), 0.1, 0.08, 7, pole)
    m.ball((0, 0, 8.1), 0.16, GOLD * 0.65)
    m.tube((0, 0, 7.0), (0, -ARM_REACH, 7.0), 0.04, 0.04, 5, pole)
    m.tube((-0.85, -ARM_REACH, 7.0), (0.85, -ARM_REACH, 7.0), 0.045, 0.045, 6, pole * 1.2)


def banner_flag(name, material, colour, seed):
    """A long swallow-tailed flag, hanging from z = 0, so the game's sway moves its tail and not its top."""
    rng = np.random.default_rng(seed)
    b = kit.MeshBuilder()
    half = 0.75
    columns, rows = 4, 8
    folds = rng.uniform(0, math.tau)
    grid = []
    for r in range(rows + 1):
        down = r / rows
        row = []
        for c in range(columns + 1):
            across = c / columns
            # The bottom edge is cut into a V.
            tail = abs(across - 0.5) * 2.0
            length = FLAG_LENGTH * (0.8 + 0.2 * tail)
            fold = math.sin(across * math.pi * 2.0 + folds)
            shade = 0.82 + 0.18 * fold - 0.22 * down
            row.append(b.vert((-half + across * half * 2.0, 0.05 * fold * (0.4 + down), -down * length), colour * shade))
        grid.append(row)
    for r in range(rows):
        for c in range(columns):
            b.face(grid[r][c], grid[r + 1][c], grid[r + 1][c + 1], grid[r][c + 1])
    return b.build(name, material)


def guest_book(m):
    stand, plate = STAGE_WOOD, WOOD
    m.tube((0, 0, 0.0), (0, 0, 1.0), 0.4, 0.3, 8, stand)
    m.disc((0, 0, 1.02), (0, 0, 1), 0.4, 0.05, 8, plate)
    # An open book, turned a little, with its pages falling away from the spine.
    for side in (-1, 1):
        m.box((side * 0.13, 0, 1.1), (0.25, 0.35, 0.02), PAPER, tilt=(0, side * 0.1, 0))
        for line in range(4):
            m.box((side * 0.13, -0.11 + line * 0.07, 1.112), (0.17, 0.018, 0.002), linear(0x8a8678), tilt=(0, side * 0.1, 0))
    m.box((0, 0, 1.075), (0.05, 0.36, 0.03), LEATHER)
    m.tube((0.14, -0.22, 1.09), (0.32, -0.12, 1.09), 0.01, 0.01, 5, BLACK)


def stage_step_recipe(index):
    return lambda m: stage_step(m, index)


def aisle_carpet(m, length):
    m.box((0, 0, 0.0), (CARPET_WIDTH, length, 0.04), CARPET)
    # Darker edges, so it reads as a runner and not a painted strip.
    for side in (-1, 1):
        m.box((side * (CARPET_WIDTH / 2 - 0.09), 0, 0.002), (0.14, length, 0.04), CARPET * 0.55)


def build_all(materials, aisle_length):
    """Returns {item name: [(\"solid\" or \"glow\", mesh)]}."""
    recipes = {
        "stage_platform": stage_platform,
        "lectern": lectern,
        "qualifications_board": qualifications_board,
        "banner_pole": banner_pole,
        "guest_book": guest_book,
        "bench": bench,
        "book_stack_0": book_stack,
        "book_stack_1": book_stack,
        "aisle_carpet": lambda m: aisle_carpet(m, aisle_length),
    }
    for index in range(STEP_COUNT):
        recipes[f"stage_step_{index}"] = stage_step_recipe(index)
    items = {}
    for seed, (name, recipe) in enumerate(recipes.items()):
        model = Model(seed + 1700)
        recipe(model)
        items[name] = model.finish(name, materials)
    return items
