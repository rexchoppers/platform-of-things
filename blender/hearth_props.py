"""Hearth's everyday items, modelled for Blender.

Each item is one mesh of lit surfaces, plus one mesh of self-lit parts such as screens.
Fronts face local -Y. Colours are the ones these items have always had.
"""

import math

import numpy as np

import kit
from kit import linear

WOOD = linear(0x5c4033)
DARK_WOOD = linear(0x3d2817)
PALE_WOOD = linear(0x8b7355)
BLACK = linear(0x1a1a1a)
CHARCOAL = linear(0x2a2a2a)
GREY = linear(0x333333)
METAL = linear(0x555555)
WHITE = linear(0xeeeeee)
PAPER = linear(0xf5f5dc)
BOOKS = [linear(c) for c in (0x8b0000, 0x006400, 0x00008b, 0x4b0082, 0x8b4513, 0x2f4f4f, 0x800000, 0x191970)]


class Model:
    def __init__(self, seed=1):
        self.solid = kit.MeshBuilder()
        self.glow = kit.MeshBuilder()
        self.rng = np.random.default_rng(seed)

    def box(self, centre, size, colour, tilt=None, glow=False):
        if glow:
            kit.add_box(self.glow, centre, size, colour, 1.0, 1.0, tilt)
        else:
            kit.add_box(self.solid, centre, size, colour, 1.12, 0.68, tilt)

    def tube(self, start, end, r0, r1, sides, colour, cap=None, glow=False):
        kit.add_tube(self.glow if glow else self.solid, start, end, r0, r1, sides, colour * 0.82, colour, caps=cap)

    def disc(self, centre, axis, radius, thickness, sides, colour, rim=None):
        """A short cylinder, such as a knob or frisbee, capped on the side the axis points to."""
        centre, axis = np.array(centre, dtype=float), np.array(axis, dtype=float)
        rim = rim if rim is not None else colour * 0.8
        kit.add_tube(self.solid, centre - axis * thickness / 2, centre + axis * thickness / 2, radius, radius, sides, rim, rim, caps=colour)

    def ball(self, centre, radius, colour, squash=1.0, shape=None, jitter=0.0, glow=False):
        kit.add_blob(self.glow if glow else self.solid, self.rng, shape or kit.ICO1, centre, radius, squash, jitter, colour * 0.62, colour * 1.08)

    def torus(self, centre, major, minor, segments, colour, axis="z", stretch=1.0, arc=math.tau, sides=5):
        kit.add_torus(self.solid, centre, major, minor, segments, sides, colour, axis, stretch, arc)

    def finish(self, name, materials):
        parts = []
        if self.solid.verts:
            parts.append(("solid", self.solid.build(f"{name}_solid", materials["solid"], smooth=False)))
        if self.glow.verts:
            parts.append(("glow", self.glow.build(f"{name}_glow", materials["glow"], smooth=False)))
        return parts


def desk(m):
    m.box((0, 0, 0.75), (2.4, 1.2, 0.08), WOOD)
    for x in (-1.1, 1.1):
        for y in (-0.5, 0.5):
            m.box((x, y, 0.375), (0.09, 0.09, 0.75), DARK_WOOD)

    # Monitor faces the chair, away from the back of the desk.
    m.box((0, 0.3, 0.82), (0.32, 0.22, 0.05), CHARCOAL)
    m.box((0, 0.3, 1.0), (0.08, 0.08, 0.34), CHARCOAL)
    m.box((0, 0.35, 1.45), (1.2, 0.05, 0.72), CHARCOAL)
    m.box((0, 0.32, 1.45), (1.1, 0.02, 0.62), linear(0x1a1a2e) + linear(0x4444ff) * 0.55, glow=True)

    m.box((0, -0.1, 0.81), (0.52, 0.18, 0.03), BLACK)
    m.box((0.42, -0.15, 0.795), (0.25, 0.2, 0.006), linear(0x2d2d2d))
    m.box((0.42, -0.15, 0.812), (0.08, 0.12, 0.028), BLACK)

    # Office chair, turned to face the desk.
    cy = -1.1
    for i in range(5):
        angle = math.tau * i / 5
        x, y = math.sin(angle), math.cos(angle)
        m.box((x * 0.16, cy + y * 0.16, 0.07), (0.05, 0.34, 0.03), BLACK, tilt=(0, 0, -angle))
        m.ball((x * 0.31, cy + y * 0.31, 0.045), 0.045, BLACK)
    m.tube((0, cy, 0.07), (0, cy, 0.48), 0.04, 0.04, 7, METAL)
    m.box((0, cy, 0.5), (0.52, 0.52, 0.09), CHARCOAL)
    m.box((0, cy - 0.24, 0.87), (0.5, 0.09, 0.62), CHARCOAL, tilt=(-0.1, 0, 0))

    # Lamp, with a small warm bulb under its shade.
    lamp = GREY
    m.tube((-0.9, 0.3, 0.79), (-0.9, 0.3, 0.83), 0.12, 0.1, 8, lamp, cap=lamp)
    m.tube((-0.9, 0.3, 0.82), (-0.8, 0.3, 1.2), 0.016, 0.016, 5, lamp)
    m.tube((-0.72, 0.3, 1.1), (-0.82, 0.3, 1.24), 0.11, 0.015, 8, lamp)
    m.ball((-0.72, 0.3, 1.1), 0.04, linear(0xfff5e6), glow=True)

    coffee_cup_on(m, (0.9, -0.2, 0.79), 1.1)


def coffee_cup_on(m, base, size):
    x, y, z = base
    m.tube((x, y, z), (x, y, z + 0.1 * size), 0.042 * size, 0.05 * size, 8, WHITE, cap=linear(0x3d2314))
    m.torus((x + 0.05 * size, y, z + 0.05 * size), 0.028 * size, 0.008 * size, 6, WHITE, axis="y", arc=math.pi, sides=4)


def coffee_cup(m):
    coffee_cup_on(m, (0, 0, 0), 1.4)


def coffee_cup_fallen(m):
    size = 1.4
    r = 0.05 * size
    m.tube((-0.05 * size, 0, r), (0.05 * size, 0, r), 0.042 * size, r, 8, WHITE, cap=linear(0x3d2314))
    m.torus((0, r + 0.005, r), 0.028 * size, 0.008 * size, 6, WHITE, axis="x", arc=math.pi, sides=4)


def pet_bed(m):
    kit.add_oval(m.solid, (0, 0, 0.0), 0.75, 0.6, 0.16, 18, linear(0x8b4513))
    kit.add_oval(m.solid, (0, 0, 0.12), 0.56, 0.44, 0.08, 16, linear(0xdeb887))
    m.torus((0, 0, 0.19), 0.64, 0.11, 22, linear(0x6b4423), stretch=0.8)
    bone = linear(0xf5f5dc)
    m.tube((0.2, -0.1, 0.23), (0.4, -0.1, 0.23), 0.03, 0.03, 6, bone)
    for x in (0.2, 0.4):
        m.ball((x, -0.1, 0.23), 0.05, bone)


def server_rack(m):
    m.box((0, 0, 1.0), (0.8, 0.6, 2.0), BLACK)
    m.box((0, -0.305, 1.0), (0.75, 0.02, 1.9), linear(0x0a0a0a))
    green, blue = linear(0x00ff00), linear(0x0088ff)
    for i in range(5):
        z = 0.3 + i * 0.35
        m.box((0, -0.32, z), (0.7, 0.012, 0.26), linear(0x1c1c1c))
        for j in range(3):
            m.box((-0.25 + j * 0.08, -0.33, z), (0.035, 0.006, 0.035), green if j == 0 else blue, glow=True)
    for side in (-1, 1):
        m.box((side * 0.41, 0, 1.0), (0.02, 0.4, 1.5), GREY)
    m.box((0, 0, 2.01), (0.6, 0.4, 0.02), GREY)
    m.box((0.2, -0.325, 1.85), (0.15, 0.006, 0.08), linear(0x00aa44) * 0.6, glow=True)


def radio(m):
    m.box((0, 0, 0.125), (0.4, 0.15, 0.25), CHARCOAL)
    for x in (-0.1, 0.1):
        m.disc((x, -0.078, 0.12), (0, -1, 0), 0.08, 0.008, 12, BLACK)
    m.box((0, -0.08, 0.2), (0.12, 0.008, 0.04), linear(0x0066aa) * 0.7, glow=True)
    for i in range(3):
        m.disc((-0.12 + i * 0.06, -0.08, 0.05), (0, -1, 0), 0.015, 0.02, 7, linear(0x444444))
    m.tube((0.1, 0, 0.25), (0.2, 0, 0.56), 0.006, 0.004, 4, linear(0x666666))


def trash_bin(m):
    m.tube((0, 0, 0), (0, 0, 0.4), 0.18, 0.2, 12, GREY, cap=BLACK)
    m.torus((0, 0, 0.4), 0.19, 0.02, 12, GREY, sides=4)
    paper = linear(0xf5f5f0)
    for x, y, z in ((0, 0, 0.41), (0.06, -0.04, 0.42), (-0.06, 0.03, 0.42), (0.03, 0.06, 0.44), (-0.03, -0.06, 0.45), (0, 0, 0.47)):
        m.ball((x, y, z), m.rng.uniform(0.04, 0.06), paper, jitter=0.2)
    m.ball((0.28, -0.1, 0.04), 0.045, paper, jitter=0.2)


def bicycle(m):
    frame = linear(0x2255aa)
    tyre = BLACK
    radius = 0.32
    back_x, front_x = -0.5, 0.5
    bracket = (0, 0, 0.28)
    seat_top = (-0.15, 0, 0.75)
    head_top = (0.4, 0, 0.72)
    head_up = (0.4, 0, 0.82)
    for x in (back_x, front_x):
        m.torus((x, 0, radius), radius, 0.02, 18, tyre, axis="y", sides=4)
        m.disc((x, 0, radius), (0, 1, 0), 0.03, 0.04, 7, METAL)
        for i in range(6):
            angle = math.tau * i / 6
            m.tube((x, 0, radius), (x + math.cos(angle) * radius, 0, radius + math.sin(angle) * radius), 0.003, 0.003, 3, METAL)
    rear, front = (back_x, 0, radius), (front_x, 0, radius)
    m.tube(seat_top, head_top, 0.018, 0.018, 5, frame)
    m.tube(head_top, bracket, 0.021, 0.021, 5, frame)
    m.tube(seat_top, bracket, 0.021, 0.021, 5, frame)
    m.tube(bracket, rear, 0.012, 0.012, 4, frame)
    m.tube((seat_top[0], 0, seat_top[2] - 0.1), rear, 0.01, 0.01, 4, frame)
    m.tube(head_top, front, 0.016, 0.016, 5, frame)
    m.tube(head_top, head_up, 0.021, 0.021, 5, frame)
    stem = (0.45, 0, 0.9)
    m.tube(head_up, stem, 0.012, 0.012, 4, METAL)
    m.tube((stem[0], -0.2, stem[2]), (stem[0], 0.2, stem[2]), 0.01, 0.01, 5, METAL)
    for y in (-0.2, 0.2):
        m.tube((stem[0], y - 0.04, stem[2]), (stem[0], y + 0.04, stem[2]), 0.016, 0.016, 5, linear(0x222222))
    post = (-0.17, 0, 0.87)
    m.tube(seat_top, post, 0.015, 0.015, 4, METAL)
    m.box((post[0], 0, post[2] + 0.02), (0.25, 0.14, 0.05), CHARCOAL)
    m.tube((0, -0.09, 0.28), (0, 0.09, 0.28), 0.012, 0.012, 4, METAL)
    m.box((0, -0.11, 0.2), (0.1, 0.06, 0.016), METAL)
    m.box((0, 0.11, 0.36), (0.1, 0.06, 0.016), METAL)
    m.tube((-0.1, 0.0, 0.3), (-0.2, 0.1, 0.0), 0.008, 0.008, 4, METAL)


def book_stack(m):
    height = 0.0
    for _ in range(int(m.rng.integers(4, 7))):
        thick = m.rng.uniform(0.04, 0.066)
        size = (m.rng.uniform(0.24, 0.34), m.rng.uniform(0.32, 0.4), thick)
        centre = (m.rng.uniform(-0.02, 0.02), m.rng.uniform(-0.02, 0.02), height + thick / 2)
        m.box(centre, size, BOOKS[int(m.rng.integers(len(BOOKS)))], tilt=(0, 0, m.rng.uniform(-0.1, 0.1)))
        height += thick


def paper_stack(m):
    thick = m.rng.uniform(0.04, 0.07)
    m.box((0, 0, thick / 2), (0.3, 0.41, thick), PAPER)
    for _ in range(2):
        m.box((m.rng.uniform(-0.04, 0.04), m.rng.uniform(-0.04, 0.04), thick + 0.006), (0.3, 0.41, 0.006), PAPER, tilt=(0, 0, m.rng.uniform(-0.4, 0.4)))


def mini_fridge(m):
    m.box((0, 0, 0.37), (0.5, 0.45, 0.7), WHITE)
    m.box((0, -0.235, 0.37), (0.48, 0.02, 0.68), linear(0xdddddd))
    m.box((0.18, -0.255, 0.47), (0.03, 0.03, 0.16), linear(0x888888))
    m.box((0, -0.25, 0.62), (0.12, 0.01, 0.04), linear(0x3366cc))
    for x in (-0.2, 0.2):
        for y in (-0.18, 0.18):
            m.tube((x, y, 0), (x, y, 0.02), 0.03, 0.03, 6, GREY)


def workbench(m):
    m.box((0, 0, 0.85), (1.6, 0.8, 0.1), PALE_WOOD)
    for x in (-0.7, 0.7):
        for y in (-0.3, 0.3):
            m.box((x, y, 0.425), (0.1, 0.1, 0.85), PALE_WOOD)
    for y in (-0.3, 0.3):
        m.box((0, y, 0.25), (1.4, 0.06, 0.06), PALE_WOOD)
    m.box((0, 0, 0.4), (1.4, 0.6, 0.05), PALE_WOOD)

    # Drill lying on the top.
    m.box((0.4, -0.15, 0.97), (0.2, 0.08, 0.12), linear(0xdd4422))
    m.tube((0.31, -0.15, 0.97), (0.22, -0.15, 0.97), 0.05, 0.06, 8, linear(0xcc3311), cap=linear(0xcc3311))
    m.box((0.35, -0.15, 0.91), (0.05, 0.06, 0.12), GREY)
    m.tube((0.5, -0.15, 0.97), (0.54, -0.15, 0.97), 0.03, 0.025, 8, METAL)
    m.tube((0.54, -0.15, 0.97), (0.64, -0.15, 0.97), 0.008, 0.003, 5, METAL)
    m.box((0.42, -0.15, 0.91), (0.02, 0.03, 0.04), GREY)

    m.box((-0.5, -0.2, 0.96), (0.26, 0.16, 0.12), linear(0x224488))
    m.box((-0.5, -0.2, 1.04), (0.12, 0.02, 0.03), GREY)
    m.tube((-0.26, 0.2, 0.92), (-0.15, 0.2, 0.92), 0.016, 0.018, 6, linear(0xffcc00))
    m.tube((-0.15, 0.2, 0.92), (-0.03, 0.2, 0.915), 0.006, 0.006, 4, METAL)
    m.box((0.6, 0.25, 0.94), (0.08, 0.03, 0.08), linear(0xffff00), tilt=(0, 0, 0.5))
    for _ in range(4):
        m.box((m.rng.uniform(-0.05, 0.25), m.rng.uniform(0.0, 0.2), 0.906), (0.03, 0.006, 0.006), METAL, tilt=(0, 0, m.rng.uniform(0, 3)))


def bbq(m):
    body = BLACK
    m.box((0, 0, 0.75), (0.8, 0.5, 0.3), body)
    m.box((0, 0, 0.905), (0.72, 0.42, 0.012), linear(0xff4500) * 0.85, glow=True)
    for i in range(7):
        m.box((0, -0.18 + i * 0.06, 0.925), (0.76, 0.016, 0.014), GREY)
    # Lid hinged open at the back edge.
    m.box((0, 0.335, 1.155), (0.8, 0.5, 0.05), body, tilt=(1.22, 0, 0))
    for x in (-0.3, 0.3):
        for y in (-0.18, 0.18):
            m.box((x, y, 0.3), (0.05, 0.05, 0.6), body)


def garden_tools(m):
    handle = PALE_WOOD
    steel = linear(0x666666)
    m.tube((0.1, 0, 0.04), (-0.14, 0, 1.54), 0.024, 0.02, 6, handle)
    m.box((0.1, 0, 0.06), (0.32, 0.05, 0.025), steel)
    for i in range(-4, 5):
        m.tube((0.1 + i * 0.033, 0, 0.06), (0.1 + i * 0.033, -0.07, 0.0), 0.005, 0.004, 3, steel)
    m.tube((0.3, -0.1, 0.2), (0.05, -0.1, 1.5), 0.024, 0.02, 6, handle)
    m.box((0.33, -0.12, 0.13), (0.2, 0.025, 0.26), steel, tilt=(0.25, 0.19, 0))
    can = linear(0x2e8b57)
    m.tube((-0.45, -0.3, 0), (-0.45, -0.3, 0.22), 0.11, 0.13, 9, can, cap=can * 0.6)
    m.tube((-0.34, -0.3, 0.1), (-0.17, -0.3, 0.28), 0.035, 0.02, 6, can)
    m.torus((-0.45, -0.3, 0.22), 0.08, 0.012, 8, can, axis="y", arc=math.pi, sides=4)


def dog_toys(m):
    m.ball((0, 0, 0.08), 0.08, linear(0xccff00), shape=kit.ICO2)
    m.torus((0, 0, 0.08), 0.08, 0.01, 12, linear(0xffffff), sides=3)
    rope, knot = linear(0xcc8844), linear(0x4488cc)
    m.tube((0.1, -0.1, 0.05), (0.5, -0.32, 0.05), 0.04, 0.04, 7, rope)
    m.ball((0.1, -0.1, 0.06), 0.07, knot, shape=kit.ICO1)
    m.ball((0.5, -0.32, 0.06), 0.07, knot, shape=kit.ICO1)
    red = linear(0xff4444)
    m.disc((-0.35, -0.3, 0.025), (0, 0, 1), 0.19, 0.03, 16, red)
    m.torus((-0.35, -0.3, 0.035), 0.18, 0.018, 16, red, sides=4)


def leash(m):
    blue = linear(0x2244aa)
    previous = None
    for i in range(25):
        t = i / 24
        angle = t * math.tau * 3
        radius = 0.22 * (1 - t * 0.3)
        point = (math.cos(angle) * radius, math.sin(angle) * radius, 0.022 + t * 0.09)
        if previous is not None:
            m.tube(previous, point, 0.02, 0.02, 4, blue)
        previous = point
    m.torus((0, 0, 0.15), 0.08, 0.016, 10, blue, axis="y", sides=4)
    m.box((0.17, -0.11, 0.025), (0.035, 0.05, 0.016), linear(0xcccccc))


def rubber_duck(m):
    yellow = linear(0xffd700)
    size = 1.5
    m.ball((0, 0, 0.055 * size), 0.065 * size, yellow, squash=0.85, shape=kit.ICO2)
    m.ball((0, -0.045 * size, 0.125 * size), 0.044 * size, yellow, shape=kit.ICO2)
    m.tube((0, -0.08 * size, 0.115 * size), (0, -0.112 * size, 0.112 * size), 0.016 * size, 0.004 * size, 6, linear(0xff8c00))
    for x in (-0.02, 0.02):
        m.ball((x * size, -0.078 * size, 0.138 * size), 0.009 * size, linear(0x111111))
    m.ball((0, 0.075 * size, 0.08 * size), 0.024 * size, yellow)


def stepping_stone(m):
    size = m.rng.uniform(0.42, 0.66)
    rim = linear(0x666666)
    b = m.solid
    sides = 9
    lower, upper = [], []
    for i in range(sides):
        angle = math.tau * i / sides
        reach = size * m.rng.uniform(0.84, 1.12)
        lower.append(b.vert((math.cos(angle) * reach, math.sin(angle) * reach, -0.04), rim * 0.55))
        upper.append(b.vert((math.cos(angle) * reach * 0.9, math.sin(angle) * reach * 0.9, 0.07), rim * m.rng.uniform(0.85, 1.1)))
    middle = b.vert((0, 0, 0.085), rim * 1.1)
    for i in range(sides):
        j = (i + 1) % sides
        b.face(lower[i], lower[j], upper[j], upper[i])
        b.face(upper[i], upper[j], middle)


def bench(m):
    for i in range(3):
        m.box((0, 0.27 - i * 0.28, 0.5), (2.0, 0.25, 0.08), WOOD * m.rng.uniform(0.88, 1.1))
    for x in (-0.8, 0.8):
        for y in (-0.22, 0.22):
            m.box((x, y, 0.25), (0.1, 0.1, 0.5), WOOD * 0.8)
    for i in range(2):
        m.box((0, 0.36, 0.72 + i * 0.22), (2.0, 0.08, 0.15), WOOD * m.rng.uniform(0.88, 1.1), tilt=(0.1, 0, 0))
    for x in (-0.8, 0.0, 0.8):
        m.box((x, 0.38, 0.78), (0.08, 0.08, 0.6), WOOD * 0.8, tilt=(0.1, 0, 0))


def bird_house(m):
    body = PALE_WOOD
    m.box((0, 0, 0.3), (0.5, 0.4, 0.6), body)
    kit.add_pyramid(m.solid, (0, 0, 0.6), 0.34, 0.3, 0.3, WOOD)
    m.disc((0, -0.205, 0.36), (0, -1, 0), 0.1, 0.01, 10, BLACK)
    m.tube((0, -0.2, 0.2), (0, -0.34, 0.2), 0.03, 0.03, 6, linear(0x4a3728))


def cabin(m):
    width, depth, wall = 6.0, 5.0, 3.0
    rows = 9
    radius = wall / rows / 2 * 1.08
    log_end = WOOD * 1.7
    m.box((0, 0, wall / 2), (width - 0.1, depth - 0.1, wall), WOOD * 0.45)

    def log(start, end, shade):
        start, end = np.array(start), np.array(end)
        middle = (start + end) / 2
        m.tube(middle, start, radius, radius, 5, WOOD * shade, cap=log_end)
        m.tube(middle, end, radius, radius, 5, WOOD * shade, cap=log_end)

    for row in range(rows):
        z = radius + row * wall / rows
        shade = m.rng.uniform(0.82, 1.12)
        for y in (-depth / 2, depth / 2):
            log((-width / 2 - 0.3, y, z), (width / 2 + 0.3, y, z), shade)
        z += wall / rows / 2
        for x in (-width / 2, width / 2):
            log((x, -depth / 2 - 0.3, z), (x, depth / 2 + 0.3, z), shade * 0.95)

    # Gable roof with deep eaves.
    run = depth / 2 + 0.6
    rise = 1.95
    slope = math.hypot(run, rise)
    angle = math.atan2(rise, run)
    roof = linear(0x8b4513)
    centre_z = wall - 0.05 + rise / 2
    m.box((0, -run / 2, centre_z), (width + 1.1, slope, 0.14), roof, tilt=(angle, 0, 0))
    m.box((0, run / 2, centre_z), (width + 1.1, slope, 0.14), roof, tilt=(-angle, 0, 0))
    b = m.solid
    for side in (1.0, -1.0):
        x = side * width / 2
        low_a = b.vert((x, -side * depth / 2, wall), WOOD * 0.9)
        low_b = b.vert((x, side * depth / 2, wall), WOOD * 0.9)
        top = b.vert((x, 0.0, wall + 1.72), WOOD * 1.05)
        b.face(low_a, low_b, top)

    # Door, step, and warmly lit windows.
    front = -depth / 2 - radius
    door = DARK_WOOD
    m.box((0, front, 1.08), (1.3, 0.1, 2.16), door)
    for x in (-0.3, 0.0, 0.3):
        m.box((x, front - 0.055, 1.08), (0.02, 0.012, 2.1), door * 0.55)
    m.ball((0.45, front - 0.08, 1.05), 0.05, linear(0xcccccc))
    m.box((0, front - 0.5, 0.1), (2.0, 0.9, 0.2), PALE_WOOD * 0.75)
    glass = linear(0xffaa44) * 0.72
    for x in (-1.85, 1.85):
        m.box((x, front - 0.02, 1.65), (0.92, 0.05, 0.92), glass, glow=True)
        m.box((x, front - 0.06, 1.65), (1.08, 0.03, 0.09), door)
        m.box((x, front - 0.06, 1.65), (0.09, 0.03, 1.08), door)
        for dz in (-0.5, 0.5):
            m.box((x, front - 0.05, 1.65 + dz), (1.08, 0.05, 0.09), door)
        for dx in (-0.5, 0.5):
            m.box((x + dx, front - 0.05, 1.65), (0.09, 0.05, 1.08), door)

    # Stone chimney.
    stone = kit.STONE
    m.box((1.9, 1.0, wall + 1.2), (0.75, 0.75, 2.6), stone)
    m.box((1.9, 1.0, wall + 2.55), (0.88, 0.88, 0.14), stone * 0.75)


def credits_sign(m):
    for x in (-0.6, 0.6):
        m.tube((x, 0, -0.05), (x, 0, 1.45), 0.08, 0.06, 6, DARK_WOOD)
    m.box((0, 0, 1.2), (1.4, 0.08, 0.8), WOOD)


def build_all(materials):
    """Returns {item name: [(\"solid\" or \"glow\", mesh)]}."""
    recipes = {
        "cabin": cabin,
        "workbench": workbench,
        "garden_tools": garden_tools,
        "desk": desk,
        "server_rack": server_rack,
        "radio": radio,
        "trash_bin": trash_bin,
        "coffee_cup": coffee_cup,
        "coffee_cup_fallen": coffee_cup_fallen,
        "paper_stack_0": paper_stack,
        "paper_stack_1": paper_stack,
        "book_stack_0": book_stack,
        "book_stack_1": book_stack,
        "book_stack_2": book_stack,
        "bicycle": bicycle,
        "pet_bed": pet_bed,
        "dog_toys": dog_toys,
        "leash": leash,
        "bbq": bbq,
        "mini_fridge": mini_fridge,
        "bench": bench,
        "credits_sign": credits_sign,
        "stepping_stone_0": stepping_stone,
        "stepping_stone_1": stepping_stone,
        "stepping_stone_2": stepping_stone,
        "stepping_stone_3": stepping_stone,
        "bird_house": bird_house,
        "rubber_duck": rubber_duck,
    }
    items = {}
    for seed, (name, recipe) in enumerate(recipes.items()):
        model = Model(seed + 900)
        recipe(model)
        items[name] = model.finish(name, materials)
    return items
