"""Chronicle's cinema items, modelled for Blender.

Fronts face local -Y. Colours are the ones these items have always had.
"""

import math

import kit
from hearth_props import BLACK, CHARCOAL, DARK_WOOD, GREY, WOOD, Model, bench, book_stack
from kit import linear

SCREEN_WIDTH = 20.0
SCREEN_HEIGHT = 12.0
SCREEN_BOTTOM = 1.5
SCREEN_MIDDLE = SCREEN_BOTTOM + SCREEN_HEIGHT / 2
LENS_HEIGHT = 1.6
LENS_REACH = 0.62  # How far the lens sits in front of the projector's stand

LIGHT_WOOD = linear(0x654321)
DARK_METAL = linear(0x3d3d3d)
LENS_BLUE = linear(0x4488aa)
CANVAS_GREEN = linear(0x1a3d1a)


def screen_frame(m):
    frame = DARK_WOOD
    bar = 0.4
    m.box((0, 0, SCREEN_MIDDLE + SCREEN_HEIGHT / 2 + bar / 2), (SCREEN_WIDTH + 0.8, bar, bar), frame)
    m.box((0, 0, SCREEN_MIDDLE - SCREEN_HEIGHT / 2 - bar / 2), (SCREEN_WIDTH + 0.8, bar, bar), frame)
    for side in (-1, 1):
        m.box((side * (SCREEN_WIDTH / 2 + bar / 2), 0, SCREEN_MIDDLE), (bar, bar, SCREEN_HEIGHT + 0.8), frame)
        m.tube((side * (SCREEN_WIDTH / 2 + 0.6), 0.1, 0), (side * (SCREEN_WIDTH / 2 + 0.6), 0.1, SCREEN_MIDDLE + SCREEN_HEIGHT / 2 + 0.6), 0.25, 0.2, 8, CHARCOAL)
        m.tube((side * (SCREEN_WIDTH / 2 + 0.6), 0.1, 9.0), (side * (SCREEN_WIDTH / 2 + 0.6), 3.4, 0.0), 0.1, 0.1, 6, CHARCOAL)
    m.box((0, 0.1, SCREEN_MIDDLE), (SCREEN_WIDTH, 0.1, SCREEN_HEIGHT), BLACK * 0.6)


def projector(m):
    stand = CHARCOAL
    m.tube((0, 0, 0), (0, 0, 0.1), 0.4, 0.35, 8, stand, cap=stand)
    m.tube((0, 0, 0.1), (0, 0, LENS_HEIGHT - 0.2), 0.12, 0.1, 6, stand)
    m.box((0, 0, LENS_HEIGHT), (0.6, 0.8, 0.4), BLACK)
    m.box((0, 0.15, LENS_HEIGHT + 0.205), (0.34, 0.3, 0.012), GREY)
    # Film reels stood on top.
    for y in (-0.2, 0.22):
        m.disc((0, y, LENS_HEIGHT + 0.42), (1, 0, 0), 0.2, 0.04, 14, GREY, rim=BLACK)
    m.tube((0, -0.4, LENS_HEIGHT), (0, -LENS_REACH + 0.02, LENS_HEIGHT), 0.12, 0.08, 10, LENS_BLUE)
    m.disc((0, -LENS_REACH, LENS_HEIGHT), (0, -1, 0), 0.07, 0.012, 10, linear(0xffffaa), rim=linear(0xffffaa))
    m.ball((0, -LENS_REACH, LENS_HEIGHT), 0.07, linear(0xffffaa), glow=True)


def film_camera(m):
    metal = DARK_METAL
    m.tube((0, 0, 0), (0, 0, 0.1), 0.3, 0.25, 10, metal, cap=metal)
    m.tube((0, 0, 0.1), (0, 0, 1.4), 0.08, 0.06, 7, metal)
    m.tube((0, 0, 1.39), (0, 0, 1.5), 0.08, 0.1, 7, metal)
    m.box((0, 0, 1.65), (0.4, 0.5, 0.3), BLACK)
    reel = GREY
    for x in (-0.12, 0.12):
        m.disc((x, 0, 1.95), (0, -1, 0), 0.15, 0.04, 16, reel, rim=BLACK)
    m.tube((0, -0.25, 1.6), (0, -0.46, 1.6), 0.1, 0.08, 10, BLACK)
    m.disc((0, -0.465, 1.6), (0, -1, 0), 0.06, 0.008, 10, LENS_BLUE)
    m.box((0.28, 0, 1.65), (0.15, 0.02, 0.02), metal)
    m.tube((0.35, -0.03, 1.65), (0.35, 0.03, 1.65), 0.015, 0.015, 5, WOOD)


def director_chair(m):
    wood = DARK_WOOD
    for side in (-1, 1):
        x = side * 0.25
        m.box((x, -0.2, 0.5), (0.06, 0.06, 1.0), wood, tilt=(-0.15, 0, 0))
        m.box((x, 0.2, 0.5), (0.06, 0.06, 1.0), wood, tilt=(0.15, 0, 0))
        m.box((side * 0.28, 0, 1.0), (0.06, 0.5, 0.06), wood)
        m.box((x, 0.2, 1.2), (0.05, 0.05, 0.48), wood)
    m.box((0, 0, 0.9), (0.5, 0.4, 0.05), CANVAS_GREEN)
    m.box((0, 0.2, 1.25), (0.5, 0.05, 0.36), CANVAS_GREEN)


def clapperboard(m):
    size = 1.3
    white = linear(0xeeeeee)
    lean = (-0.28, 0, 0)
    m.box((0, 0.05, 0.25 * size), (0.5 * size, 0.03, 0.4 * size), BLACK, tilt=lean)
    m.box((0, 0.03, 0.22 * size), (0.44 * size, 0.008, 0.3 * size), white, tilt=lean)
    for i in range(3):
        m.box((0, 0.015, (0.32 - i * 0.07) * size), (0.4 * size, 0.006, 0.01), GREY, tilt=lean)
    m.box((0, 0.2, 0.55 * size), (0.5 * size, 0.03, 0.1 * size), BLACK, tilt=(-0.5, 0, 0))
    for i in range(3):
        m.box(((-0.15 + i * 0.15) * size, 0.185, 0.55 * size), (0.08 * size, 0.012, 0.102 * size), white, tilt=(-0.5, 0, 0))


def snack_stand(m):
    m.box((0, 0, 0.5), (1.2, 0.8, 0.9), LIGHT_WOOD)
    m.box((0, 0, 1.0), (1.3, 0.9, 0.1), WOOD)
    m.box((0, -0.41, 0.55), (1.0, 0.02, 0.5), WOOD * 0.8)
    for x in (-0.5, 0.5):
        for y in (-0.35, 0.35):
            m.disc((x * 1.2, y, 0.15), (1 if x > 0 else -1, 0, 0), 0.15, 0.08, 10, GREY, rim=BLACK)
    for x in (-0.55, 0.55):
        for y in (-0.35, 0.35):
            m.tube((x, y, 1.05), (x, y, 2.08), 0.03, 0.03, 5, DARK_METAL)
    # Striped canopy.
    red, white = linear(0xcc3333), linear(0xeeeeee)
    for i in range(6):
        m.box((-0.625 + i * 0.25, 0, 2.11), (0.25, 1.0, 0.08), red if i % 2 == 0 else white)
    # Popcorn tubs, heaped.
    tub = linear(0xcc3333) * 0.9
    corn = linear(0xffeecc)
    for x in (-0.3, 0.3):
        m.tube((x, 0, 1.05), (x, 0, 1.3), 0.1, 0.12, 8, tub, cap=corn)
        for _ in range(7):
            angle = m.rng.uniform(0, math.tau)
            reach = m.rng.uniform(0, 0.08)
            m.ball((x + math.cos(angle) * reach, math.sin(angle) * reach, 1.32 + m.rng.uniform(0, 0.05)), 0.035, corn, jitter=0.2)


def speaker(m):
    metal = DARK_METAL
    m.tube((0, 0, 0), (0, 0, 0.15), 0.55, 0.5, 8, metal, cap=metal)
    m.tube((0, 0, 0.15), (0, 0, 2.3), 0.15, 0.12, 8, metal)
    m.box((0, 0, 2.8), (1.0, 0.6, 1.2), BLACK)
    for z in (3.1, 2.5):
        m.disc((0, -0.305, z), (0, -1, 0), 0.3, 0.01, 16, GREY)
        m.disc((0, -0.312, z), (0, -1, 0), 0.1, 0.008, 10, BLACK)


def now_showing_sign(m):
    for x in (-0.7, 0.7):
        m.tube((x, 0, -0.05), (x, 0, 1.85), 0.08, 0.06, 6, DARK_WOOD)
    m.box((0, 0, 1.6), (1.7, 0.08, 0.6), WOOD)


def light_post(m):
    m.tube((0, 0, -0.1), (0, 0, 3.55), 0.08, 0.06, 6, DARK_WOOD)


def picnic_blanket(m):
    m.box((0, 0, 0.012), (2.5, 2.0, 0.024), linear(0x994444), tilt=(0, 0, 0.1))
    for i, colour in enumerate((0x446688, 0x668844, 0x886644)):
        m.box(((i - 1) * 0.65, 0.42, 0.1), (0.42, 0.42, 0.16), linear(colour), tilt=(0, 0, m.rng.uniform(-0.2, 0.2)))


def cooler(m):
    blue = linear(0x2244aa)
    m.box((0, 0, 0.2), (0.6, 0.4, 0.4), blue)
    m.box((0, 0, 0.42), (0.62, 0.42, 0.05), linear(0xeeeeee))
    m.tube((-0.15, -0.21, 0.32), (0.15, -0.21, 0.32), 0.012, 0.012, 4, GREY)


def build_all(materials):
    """Returns {item name: [(\"solid\" or \"glow\", mesh)]}."""
    recipes = {
        "screen_frame": screen_frame,
        "projector": projector,
        "film_camera": film_camera,
        "director_chair": director_chair,
        "clapperboard": clapperboard,
        "snack_stand": snack_stand,
        "speaker": speaker,
        "now_showing": now_showing_sign,
        "light_post": light_post,
        "picnic_blanket": picnic_blanket,
        "cooler": cooler,
        "bench": bench,
        "book_stack_0": book_stack,
        "book_stack_1": book_stack,
    }
    items = {}
    for seed, (name, recipe) in enumerate(recipes.items()):
        model = Model(seed + 1200)
        recipe(model)
        items[name] = model.finish(name, materials)
    return items
