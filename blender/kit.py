"""Shared parts for building worlds in Blender: colours, meshes, placement, previews.

World scripts such as build_hearth.py import this. One Blender unit is one game unit,
and Blender (x, y, z) maps to game (x, z, -y).
"""

import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Euler


# ---------------------------------------------------------------------------
# Palette. Hex values are the colours the game has always used.
# ---------------------------------------------------------------------------
def linear(hex_value):
    channels = np.array(
        [(hex_value >> 16) & 255, (hex_value >> 8) & 255, hex_value & 255], dtype=np.float64
    ) / 255.0
    return np.where(channels <= 0.04045, channels / 12.92, ((channels + 0.055) / 1.055) ** 2.4)


def to_srgb(values):
    values = np.clip(values, 0.0, 1.0)
    return np.where(values <= 0.0031308, values * 12.92, 1.055 * values ** (1 / 2.4) - 0.055)


GROUND = linear(0x3d5c3d)
LEAVES = linear(0x2d5a27)
TRUNK = linear(0x4a3728)
BUSH = linear(0x2a4a2a)
STONE = linear(0x6b6b6b)
FERN = linear(0x2e5a1c)
GRASS = linear(0x3d6b2a)
MOSS = linear(0x3a5f3a)
STEM = linear(0x228b22)
WOOD = linear(0x5c4033)
CAP = linear(0xcc4444)
CREAM = linear(0xf5f5dc)
FLOWERS = {
    "pink": linear(0xff69b4),
    "yellow": linear(0xffff00),
    "tomato": linear(0xff6347),
    "purple": linear(0x9370db),
    "white": linear(0xffffff),
}
FLOWER_CENTRE = linear(0xffd700)
LIGHT = linear(0xffffff)
AMBIENT = linear(0x404060)
CANVAS = linear(0xd4c4a8)
DARK_METAL = linear(0x3d3d3d)


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def make_fbm(seed, base, octaves, gain=0.5, lacunarity=2.03, directions=4):
    rng = np.random.default_rng(seed)
    terms = []
    amplitude = 1.0
    total = 0.0
    for octave in range(octaves):
        for _ in range(directions):
            angle = rng.uniform(0.0, math.tau)
            frequency = base * lacunarity ** octave * rng.uniform(0.8, 1.2)
            terms.append(
                (frequency * math.cos(angle), frequency * math.sin(angle), rng.uniform(0.0, math.tau), amplitude)
            )
            total += amplitude
        amplitude *= gain
    scale = 0.5 * total

    def sample(x, y):
        result = 0.0
        for kx, ky, phase, weight in terms:
            result = result + weight * np.sin(kx * x + ky * y + phase)
        return result / scale

    return sample


# ---------------------------------------------------------------------------
# Mesh building
# ---------------------------------------------------------------------------
class MeshBuilder:
    def __init__(self):
        self.verts = []
        self.colours = []
        self.normals = []
        self.faces = []

    def vert(self, position, colour, normal=(0.0, 0.0, 1.0)):
        self.verts.append(tuple(float(v) for v in position))
        self.colours.append(tuple(float(v) for v in colour))
        self.normals.append(tuple(float(v) for v in normal))
        return len(self.verts) - 1

    def face(self, *indices):
        self.faces.append(indices)

    def build(self, name, material, smooth=True, custom_normals=False):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.update()
        attribute = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        rgba = np.ones((len(self.verts), 4), dtype=np.float32)
        rgba[:, :3] = np.array(self.colours, dtype=np.float32)
        attribute.data.foreach_set("color", rgba.ravel())
        mesh.color_attributes.active_color = attribute
        mesh.materials.append(material)
        if smooth:
            mesh.shade_smooth()
        else:
            mesh.shade_flat()
        if custom_normals:
            mesh.normals_split_custom_set_from_vertices(self.normals)
        return mesh


def icosphere(subdivisions):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=1.0)
    verts = [v.co.copy() for v in bm.verts]
    bm.verts.index_update()
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    return verts, faces


ICO1 = icosphere(1)
ICO2 = icosphere(2)


def add_tube(builder, start, end, radius_start, radius_end, sides, colour_start, colour_end, caps=None):
    start, end = np.array(start, dtype=float), np.array(end, dtype=float)
    axis = end - start
    axis /= np.linalg.norm(axis)
    side = np.cross(axis, (0.0, 0.0, 1.0) if abs(axis[2]) < 0.9 else (1.0, 0.0, 0.0))
    side /= np.linalg.norm(side)
    other = np.cross(axis, side)
    lower, upper = [], []
    for i in range(sides):
        angle = math.tau * i / sides
        direction = math.cos(angle) * side + math.sin(angle) * other
        lower.append(builder.vert(start + direction * radius_start, colour_start, direction))
        upper.append(builder.vert(end + direction * radius_end, colour_end, direction))
    for i in range(sides):
        j = (i + 1) % sides
        builder.face(lower[i], lower[j], upper[j], upper[i])
    if caps is not None:
        centre = builder.vert(end, caps)
        ring = [builder.vert(end + (builder_pos - end) * 0.95, caps) for builder_pos in [np.array(builder.verts[i]) for i in upper]]
        for i in range(sides):
            builder.face(ring[i], ring[(i + 1) % sides], centre)


def add_blob(builder, rng, shape, centre, radius, squash, jitter, colour_low, colour_high):
    verts, faces = shape
    offset = len(builder.verts)
    for v in verts:
        length = radius * (1.0 + rng.uniform(-jitter, jitter))
        position = (centre[0] + v.x * length, centre[1] + v.y * length, centre[2] + v.z * length * squash)
        t = 0.5 + 0.5 * v.z
        builder.vert(position, colour_low + (colour_high - colour_low) * t)
    for f in faces:
        builder.face(*[offset + i for i in f])


def add_skirts(builder, rng, layers, lobes, base_radius, z_low, z_high, foliage):
    """Stacked drooping fans. Dark at the trunk and bright at the tips reads as depth."""
    for layer in range(layers):
        t = layer / max(layers - 1, 1)
        radius = base_radius * (1.0 - t) ** 0.9 + 0.32
        tip_z = z_low + (z_high - z_low) * t
        rise = (z_high - z_low) / layers * 1.95
        droop = radius * 0.2
        shade = 0.82 + 0.28 * t
        apex = builder.vert((0.0, 0.0, tip_z + rise), foliage * 0.42 * shade)
        phase = rng.uniform(0.0, math.tau)
        ring = []
        for j in range(lobes * 2):
            angle = phase + math.pi * j / lobes
            if j % 2 == 0:
                reach = radius * rng.uniform(0.86, 1.14)
                z = tip_z - droop * rng.uniform(0.8, 1.2)
                colour = foliage * 1.3 * shade * rng.uniform(0.9, 1.1)
            else:
                reach = radius * rng.uniform(0.6, 0.72)
                z = tip_z - droop * 0.2
                colour = foliage * 0.8 * shade
            ring.append(builder.vert((math.cos(angle) * reach, math.sin(angle) * reach, z), colour))
        for j in range(lobes * 2):
            builder.face(apex, ring[j], ring[(j + 1) % (lobes * 2)])


def pine_hero(name, material, seed, foliage, layers=9, lobes=11, radius=3.1, low=2.3, high=10.2):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    add_tube(b, (0, 0, -0.4), (0, 0, 2.6), 0.38, 0.27, 7, TRUNK * 0.55, TRUNK)
    add_tube(b, (0, 0, 2.6), (0, 0, high - 0.7), 0.27, 0.05, 5, TRUNK, TRUNK * 0.7)
    add_skirts(b, rng, layers, lobes, radius, low, high, foliage)
    return b.build(name, material)


def pine_mid(name, material, seed, foliage, layers=5, lobes=7, radius=3.1, low=2.4, high=9.8):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    add_tube(b, (0, 0, -0.4), (0, 0, 3.2), 0.38, 0.2, 5, TRUNK * 0.55, TRUNK)
    add_skirts(b, rng, layers, lobes, radius, low, high, foliage)
    return b.build(name, material)


def dead_tree(name, material, seed):
    """A bare standing trunk. A few of these stop a forest looking planted."""
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    grey = TRUNK * 0.75
    add_tube(b, (0, 0, -0.4), (0, 0, 7.4), 0.34, 0.06, 7, grey * 0.55, grey)
    for _ in range(7):
        z = rng.uniform(2.6, 6.6)
        angle = rng.uniform(0.0, math.tau)
        reach = rng.uniform(0.7, 1.9) * (1.2 - z / 9.0)
        tip = (math.cos(angle) * reach, math.sin(angle) * reach, z + rng.uniform(0.2, 0.9))
        add_tube(b, (0, 0, z), tip, 0.07, 0.015, 4, grey * 0.8, grey)
    return b.build(name, material)


def pine_far(name, material, seed, foliage):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    for z, radius, cone in ((0.8, 3.2, 5.2), (4.2, 2.3, 4.2), (7.2, 1.3, 3.6)):
        apex = b.vert((0, 0, z + cone), foliage * 0.9)
        ring = []
        for i in range(5):
            angle = math.tau * i / 5 + rng.uniform(-0.15, 0.15)
            ring.append(b.vert((math.cos(angle) * radius, math.sin(angle) * radius, z), foliage * 0.72))
        for i in range(5):
            b.face(apex, ring[i], ring[(i + 1) % 5])
    return b.build(name, material)


def add_leaf_clump(builder, rng, centre, radius, squash, leaves, leaf_size, colour):
    """A rounded mass of overlapping leaves around a dark core.

    Leaves lie flat against the dome like shingles, with points that break the outline.
    Normals radiate from the clump's centre, so the whole clump shades as one soft shape.
    Build with custom_normals=True and a material that keeps normals on back faces.
    """
    centre = np.array(centre, dtype=float)
    stretch = np.array([1.0, 1.0, squash])
    add_blob(builder, rng, ICO1, centre, radius * 0.74, squash, 0.08, colour * 0.14, colour * 0.34)

    golden_angle = math.pi * (3.0 - math.sqrt(5.0))
    for i in range(leaves):
        z = 1.0 - (i + 0.5) / leaves * 1.4  # Stops short of the underside, which nobody sees
        ring = math.sqrt(max(0.0, 1.0 - z * z))
        angle = golden_angle * i + rng.uniform(-0.3, 0.3)
        outward = np.array([math.cos(angle) * ring, math.sin(angle) * ring, z])

        downhill = np.array([0.0, 0.0, -1.0]) - outward * -z
        if np.linalg.norm(downhill) < 0.15:
            downhill = np.array([math.cos(angle), math.sin(angle), 0.0])
        downhill /= np.linalg.norm(downhill)
        point = downhill * 0.8 + outward * 0.42 + rng.uniform(-0.28, 0.28, 3)
        point /= np.linalg.norm(point)
        side = np.cross(outward, point)
        side /= np.linalg.norm(side)

        base = centre + outward * stretch * radius * rng.uniform(0.74, 1.0)
        length = leaf_size * rng.uniform(0.8, 1.25)
        width = length * rng.uniform(0.36, 0.48)

        # Lighter toward the top of the clump and toward each leaf's point.
        light = 0.62 + 0.42 * (0.5 + 0.5 * z)
        tone = colour * light * rng.uniform(0.86, 1.14)
        normal = outward + np.array([0.0, 0.0, 0.35])
        normal /= np.linalg.norm(normal)
        back = builder.vert(base - point * length * 0.35, tone * 0.5, normal)
        left = builder.vert(base + side * width, tone * 0.9, normal)
        tip = builder.vert(base + point * length, tone * 1.25, normal)
        right = builder.vert(base - side * width, tone * 0.9, normal)
        builder.face(back, right, tip, left)


def broadleaf(name, material, seed, foliage):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    add_tube(b, (0, 0, -0.4), (0, 0, 3.6), 0.42, 0.24, 6, TRUNK * 0.55, TRUNK)
    add_tube(b, (0, 0, 3.2), (1.3, 0.3, 5.0), 0.2, 0.07, 4, TRUNK, TRUNK * 0.8)
    add_tube(b, (0, 0, 3.5), (-1.0, -0.8, 5.3), 0.2, 0.07, 4, TRUNK, TRUNK * 0.8)
    crowns = [
        (0.0, 0.0, 6.5, 2.3, 42),
        (1.7, 0.4, 5.5, 1.6, 26),
        (-1.5, -1.0, 5.7, 1.7, 26),
        (-0.3, 1.6, 5.6, 1.5, 24),
        (0.6, -1.6, 5.4, 1.4, 22),
        (0.1, 0.2, 7.9, 1.3, 20),
    ]
    for x, y, z, radius, leaves in crowns:
        add_leaf_clump(b, rng, (x, y, z), radius, 0.82, leaves, 0.72, foliage)
    return b.build(name, material, custom_normals=True)


def bush(name, material, seed):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    colour = BUSH * 1.7
    clumps = [
        (0.0, 0.0, 0.46, 0.6, 28),
        (0.48, 0.18, 0.32, 0.42, 16),
        (-0.42, -0.26, 0.3, 0.44, 16),
        (-0.08, 0.46, 0.28, 0.36, 12),
    ]
    for x, y, z, radius, leaves in clumps:
        add_leaf_clump(b, rng, (x, y, z), radius, 0.84, leaves, 0.2, colour)
    return b.build(name, material, custom_normals=True)


def rock(name, material, seed):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    verts, faces = ICO2
    for v in verts:
        length = 1.0 + rng.uniform(-0.18, 0.18)
        position = (v.x * length, v.y * length * rng.uniform(0.8, 1.0), v.z * length * 0.72)
        colour = STONE * rng.uniform(0.72, 1.05)
        if v.z > 0.45:
            colour = colour + (MOSS - colour) * min(1.0, (v.z - 0.45) * 2.0) * rng.uniform(0.25, 0.7)
        if v.z < -0.1:
            colour = colour * 0.55
        b.vert(position, colour)
    for f in faces:
        b.face(*f)
    return b.build(name, material, smooth=False)


def grass_tuft(name, material, seed, blades, tall):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    for _ in range(blades):
        angle = rng.uniform(0.0, math.tau)
        base = (rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2))
        side = (math.cos(angle) * 0.02, math.sin(angle) * 0.02)
        lean_angle = rng.uniform(0.0, math.tau)
        lean = rng.uniform(0.04, 0.16) * tall
        blade_height = rng.uniform(0.22, 0.42) * tall
        tip_colour = GRASS * rng.uniform(1.25, 1.7)
        a = b.vert((base[0] - side[0], base[1] - side[1], -0.02), GROUND * 0.7)
        c = b.vert((base[0] + side[0], base[1] + side[1], -0.02), GROUND * 0.7)
        t = b.vert(
            (base[0] + math.cos(lean_angle) * lean, base[1] + math.sin(lean_angle) * lean, blade_height),
            tip_colour,
        )
        b.face(a, c, t)
    return b.build(name, material, custom_normals=True)


def fern(name, material, seed):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    for i in range(6):
        angle = math.tau * i / 6 + rng.uniform(-0.2, 0.2)
        length = rng.uniform(0.62, 0.95)
        rise = rng.uniform(0.3, 0.5)
        dx, dy = math.cos(angle), math.sin(angle)
        sx, sy = -dy, dx
        left, right = [], []
        for s in range(4):
            t = s / 3.0
            along = length * t
            z = rise * math.sin(t * math.pi * 0.62) * (1.0 - 0.25 * t) + 0.02
            width = 0.09 * (1.0 - t) ** 0.7 + 0.004
            colour = FERN * (0.55 + 0.85 * t)
            left.append(b.vert((dx * along + sx * width, dy * along + sy * width, z), colour))
            right.append(b.vert((dx * along - sx * width, dy * along - sy * width, z), colour))
        for s in range(3):
            b.face(left[s], right[s], right[s + 1], left[s + 1])
    return b.build(name, material, custom_normals=True)


def flower(name, material, seed, petal):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    stem_a = b.vert((-0.012, 0, -0.02), STEM * 0.7)
    stem_b = b.vert((0.012, 0, -0.02), STEM * 0.7)
    stem_c = b.vert((0.0, 0.0, 0.42), STEM)
    b.face(stem_a, stem_b, stem_c)
    centre = b.vert((0.0, 0.0, 0.45), FLOWER_CENTRE)
    ring = []
    for i in range(10):
        angle = math.pi * i / 5 + rng.uniform(-0.05, 0.05)
        reach = 0.13 if i % 2 == 0 else 0.05
        ring.append(b.vert((math.cos(angle) * reach, math.sin(angle) * reach, 0.42), petal))
    for i in range(10):
        b.face(centre, ring[i], ring[(i + 1) % 10])
    return b.build(name, material, custom_normals=True)


def mushroom(name, material, seed):
    rng = np.random.default_rng(seed)
    b = MeshBuilder()
    add_tube(b, (0, 0, -0.03), (0, 0, 0.26), 0.07, 0.055, 5, CREAM * 0.55, CREAM)
    apex = b.vert((0, 0, 0.42), CAP * 1.15)
    upper, lower = [], []
    for i in range(7):
        angle = math.tau * i / 7 + rng.uniform(-0.08, 0.08)
        upper.append(b.vert((math.cos(angle) * 0.14, math.sin(angle) * 0.14, 0.36), CAP))
        lower.append(b.vert((math.cos(angle) * 0.21, math.sin(angle) * 0.21, 0.25), CAP * 0.7))
    for i in range(7):
        j = (i + 1) % 7
        b.face(apex, upper[i], upper[j])
        b.face(upper[i], lower[i], lower[j], upper[j])
    return b.build(name, material)


def fallen_log(name, material, seed):
    b = MeshBuilder()
    rng = np.random.default_rng(seed)
    length = rng.uniform(1.7, 2.2)
    add_tube(b, (-length, 0, 0), (length, 0, 0), 0.32, 0.26, 7, WOOD * 0.75, WOOD * 0.9, caps=WOOD * 1.5)
    add_tube(b, (length, 0, 0), (-length, 0, 0), 0.26, 0.32, 7, WOOD * 0.9, WOOD * 0.75, caps=WOOD * 1.5)
    return b.build(name, material)


def stump(name, material, seed):
    b = MeshBuilder()
    rng = np.random.default_rng(seed)
    height_top = rng.uniform(0.45, 0.7)
    add_tube(b, (0, 0, -0.2), (0, 0, height_top), 0.58, 0.42, 8, WOOD * 0.55, WOOD * 0.85, caps=WOOD * 1.6)
    return b.build(name, material)


# ---------------------------------------------------------------------------
# Placement and painting helpers
# ---------------------------------------------------------------------------
class SpacingGrid:
    """Rejects points too close to one already placed."""

    def __init__(self, cell):
        self.cell = cell
        self.cells = {}

    def free(self, x, y, spacing):
        cx, cy = int(x // self.cell), int(y // self.cell)
        reach = int(spacing // self.cell) + 1
        for i in range(cx - reach, cx + reach + 1):
            for j in range(cy - reach, cy + reach + 1):
                for px, py in self.cells.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < spacing * spacing:
                        return False
        return True

    def add(self, x, y):
        self.cells.setdefault((int(x // self.cell), int(y // self.cell)), []).append((x, y))


def annulus_point(rng, r_min, r_max):
    angle = rng.uniform(0.0, math.tau)
    r = math.sqrt(rng.uniform(r_min * r_min, r_max * r_max))
    return math.cos(angle) * r, math.sin(angle) * r


def fractal_noise(size, beta, seed):
    """Tileable 1/f noise in [0, 1]. Lower beta gives finer grain."""
    rng = np.random.default_rng(seed)
    spectrum = np.fft.rfft2(rng.standard_normal((size, size)))
    ky = np.fft.fftfreq(size)[:, None]
    kx = np.fft.rfftfreq(size)[None, :]
    k = np.sqrt(kx * kx + ky * ky)
    k[0, 0] = 1.0
    spectrum *= k ** (-beta / 2.0)
    noise = np.fft.irfft2(spectrum, s=(size, size))
    noise = (noise - noise.mean()) / noise.std()
    return np.clip(noise * 0.24 + 0.5, 0.0, 1.0)


def vertex_material(name, double_sided, roughness=0.9):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    tree = material.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    attribute = tree.nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = "Col"
    tree.links.new(attribute.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    material.use_backface_culling = not double_sided
    return material


def glow_material(name, colour, strength):
    """Self-lit surfaces such as embers and lantern glass. Exports as an emissive material."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.02, 0.02, 0.02, 1.0)
    bsdf.inputs["Emission Color"].default_value = (*colour, 1.0)
    bsdf.inputs["Emission Strength"].default_value = strength
    return material


def add_box(builder, centre, size, colour, shade_top=1.15, shade_bottom=0.6, tilt=None):
    """tilt is an optional (x, y, z) rotation in radians around the box's centre."""
    centre = np.array(centre, dtype=float)
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    rotation = np.array(Euler(tilt).to_matrix()) if tilt is not None else np.identity(3)
    corners = []
    for z, shade in ((-sz, shade_bottom), (sz, shade_top)):
        for x, y in ((-sx, -sy), (sx, -sy), (sx, sy), (-sx, sy)):
            corners.append(builder.vert(centre + rotation @ np.array((x, y, z)), colour * shade))
    a = corners
    builder.face(a[3], a[2], a[1], a[0])
    builder.face(a[4], a[5], a[6], a[7])
    for i in range(4):
        j = (i + 1) % 4
        builder.face(a[i], a[j], a[j + 4], a[i + 4])


def add_torus(builder, centre, major, minor, segments, sides, colour, axis="z", stretch=1.0, arc=math.tau):
    """A ring around the given axis. stretch squashes it into an oval, and arc makes part of a ring."""
    centre = np.array(centre, dtype=float)
    frames = {
        "z": ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
        "y": ((1, 0, 0), (0, 0, 1), (0, -1, 0)),
        "x": ((0, 1, 0), (0, 0, 1), (1, 0, 0)),
    }
    u, v, w = (np.array(d, dtype=float) for d in frames[axis])
    closed = abs(arc - math.tau) < 1e-6
    rows = segments if closed else segments + 1
    grid = []
    for i in range(rows):
        angle = arc * i / segments
        outward = math.cos(angle) * u + math.sin(angle) * v
        middle = centre + major * (math.cos(angle) * u + math.sin(angle) * stretch * v)
        ring = []
        for j in range(sides):
            around = math.tau * j / sides
            shade = 0.85 + 0.25 * math.sin(around)
            ring.append(builder.vert(middle + minor * (math.cos(around) * outward + math.sin(around) * w), colour * shade))
        grid.append(ring)
    for i in range(segments):
        next_row = grid[(i + 1) % rows]
        for j in range(sides):
            k = (j + 1) % sides
            builder.face(grid[i][j], next_row[j], next_row[k], grid[i][k])


def add_oval(builder, base, radius_x, radius_y, thickness, sides, colour):
    """A flat oval cushion resting on base."""
    x, y, z = base
    lower, upper = [], []
    for i in range(sides):
        angle = math.tau * i / sides
        cx, cy = math.cos(angle), math.sin(angle)
        lower.append(builder.vert((x + cx * radius_x, y + cy * radius_y, z), colour * 0.65))
        upper.append(builder.vert((x + cx * radius_x * 0.95, y + cy * radius_y * 0.95, z + thickness), colour))
    middle = builder.vert((x, y, z + thickness * 1.15), colour * 1.1)
    for i in range(sides):
        j = (i + 1) % sides
        builder.face(lower[i], lower[j], upper[j], upper[i])
        builder.face(upper[i], upper[j], middle)


def add_pyramid(builder, base, half_x, half_y, height, colour):
    x, y, z = base
    corners = [
        builder.vert((x + cx * half_x, y + cy * half_y, z), colour * 0.8)
        for cx, cy in ((-1, -1), (1, -1), (1, 1), (-1, 1))
    ]
    top = builder.vert((x, y, z + height), colour * 1.15)
    for i in range(4):
        builder.face(corners[i], corners[(i + 1) % 4], top)


class WorldScene:
    """Holds the Landscape collection and places objects on the ground."""

    def __init__(self, height):
        self.height = height
        self.collection = bpy.data.collections.new("Landscape")
        bpy.context.scene.collection.children.link(self.collection)

    def group(self, name):
        empty = bpy.data.objects.new(name, None)
        self.collection.objects.link(empty)
        return empty

    def place(self, group, mesh, x, y, scale=1.0, yaw=0.0, sink=0.0, stretch=1.0, tilt=0.0, rng=None, name=None):
        """Object names start with their group name. The game reads that to set shadows."""
        obj = bpy.data.objects.new(name or f"{group.name}_{mesh.name}", mesh)
        obj.parent = group
        obj.location = (x, y, float(self.height(x, y)) - sink)
        tilt_x = rng.uniform(-tilt, tilt) if rng is not None and tilt else 0.0
        tilt_y = rng.uniform(-tilt, tilt) if rng is not None and tilt else 0.0
        obj.rotation_euler = (tilt_x, tilt_y, yaw)
        obj.scale = (scale, scale, scale * stretch)
        self.collection.objects.link(obj)
        return obj

    def marker(self, name, x, y, z, **properties):
        """An Empty the export reads, such as the spawn point. Move it in Blender to change it."""
        empty = bpy.data.objects.new(name, None)
        empty.location = (x, y, z)
        empty.empty_display_size = 1.0
        for key, value in properties.items():
            empty[key] = value
        self.collection.objects.link(empty)
        return empty


# ---------------------------------------------------------------------------
# Previews. These approximate the game so a world can be judged without running it.
# Call them after saving the .blend, because they change materials and lights.
# ---------------------------------------------------------------------------
def light_back_faces_like_game(material_name):
    """Cycles flips normals on back faces, and the game doesn't for this material.

    Adding a translucent shader lights back faces from the same side as front faces.
    """
    tree = bpy.data.materials[material_name].node_tree
    output = next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL")
    surface = output.inputs["Surface"].links[0].from_socket
    attribute = next(n for n in tree.nodes if n.type == "VERTEX_COLOR")
    translucent = tree.nodes.new("ShaderNodeBsdfTranslucent")
    tree.links.new(attribute.outputs["Color"], translucent.inputs["Color"])
    add = tree.nodes.new("ShaderNodeAddShader")
    tree.links.new(surface, add.inputs[0])
    tree.links.new(translucent.outputs[0], add.inputs[1])
    tree.links.new(add.outputs[0], output.inputs["Surface"])


def remove_sheen():
    """The game draws the world fully matte."""
    for material in bpy.data.materials:
        if material.use_nodes and "Principled BSDF" in material.node_tree.nodes:
            material.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.0


def show_unlit_in_preview(material_name):
    """The game draws this material with no lighting, showing its vertex colours as they are."""
    tree = bpy.data.materials[material_name].node_tree
    bsdf = tree.nodes["Principled BSDF"]
    attribute = next(n for n in tree.nodes if n.type == "VERTEX_COLOR")
    for link in list(bsdf.inputs["Base Color"].links):
        tree.links.remove(link)
    bsdf.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    tree.links.new(attribute.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 1.0


def add_game_fog(colour, density):
    """Mix every material toward the fog colour exactly as three.js FogExp2 does."""
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        tree = material.node_tree
        output = next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL")
        surface = output.inputs["Surface"].links[0].from_socket

        camera = tree.nodes.new("ShaderNodeCameraData")
        scaled = tree.nodes.new("ShaderNodeMath")
        scaled.operation = "MULTIPLY"
        tree.links.new(camera.outputs["View Distance"], scaled.inputs[0])
        scaled.inputs[1].default_value = density
        squared = tree.nodes.new("ShaderNodeMath")
        squared.operation = "POWER"
        tree.links.new(scaled.outputs[0], squared.inputs[0])
        squared.inputs[1].default_value = 2.0
        negated = tree.nodes.new("ShaderNodeMath")
        negated.operation = "MULTIPLY"
        tree.links.new(squared.outputs[0], negated.inputs[0])
        negated.inputs[1].default_value = -1.0
        exponent = tree.nodes.new("ShaderNodeMath")
        exponent.operation = "EXPONENT"
        tree.links.new(negated.outputs[0], exponent.inputs[0])
        amount = tree.nodes.new("ShaderNodeMath")
        amount.operation = "SUBTRACT"
        amount.inputs[0].default_value = 1.0
        tree.links.new(exponent.outputs[0], amount.inputs[1])

        fog = tree.nodes.new("ShaderNodeEmission")
        fog.inputs["Color"].default_value = (*colour, 1.0)
        mix = tree.nodes.new("ShaderNodeMixShader")
        tree.links.new(amount.outputs[0], mix.inputs[0])
        tree.links.new(surface, mix.inputs[1])
        tree.links.new(fog.outputs[0], mix.inputs[2])
        tree.links.new(mix.outputs[0], output.inputs["Surface"])


def add_preview_world(scene, sky_image_path, sky_colour, ambient_irradiance):
    """The camera sees the sky image. Everything else is lit by flat ambient, as in the game."""
    world = bpy.data.worlds.new("Preview")
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    ambient = tree.nodes.new("ShaderNodeBackground")
    ambient.inputs["Color"].default_value = (*(ambient_irradiance / math.pi), 1.0)
    sky = tree.nodes.new("ShaderNodeBackground")
    if os.path.exists(sky_image_path):
        texture = tree.nodes.new("ShaderNodeTexEnvironment")
        texture.image = bpy.data.images.load(sky_image_path)
        tree.links.new(texture.outputs["Color"], sky.inputs["Color"])
    else:
        sky.inputs["Color"].default_value = (*sky_colour, 1.0)
    path = tree.nodes.new("ShaderNodeLightPath")
    mix = tree.nodes.new("ShaderNodeMixShader")
    tree.links.new(path.outputs["Is Camera Ray"], mix.inputs[0])
    tree.links.new(ambient.outputs[0], mix.inputs[1])
    tree.links.new(sky.outputs[0], mix.inputs[2])
    output = tree.nodes.new("ShaderNodeOutputWorld")
    tree.links.new(mix.outputs[0], output.inputs["Surface"])
    scene.world = world


def add_preview_camera(scene, position, target, fov_y=75.0):
    from mathutils import Vector

    data = bpy.data.cameras.new("Preview")
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(fov_y)
    data.clip_end = 3000.0
    camera = bpy.data.objects.new("Preview", data)
    camera.location = position
    camera.rotation_euler = (Vector(target) - Vector(position)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(camera)
    return camera


def render_preview(scene, camera, path, samples=64):
    scene.camera = camera
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = "GPU"
    except (TypeError, ValueError):
        scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 0  # The game has no bounced light
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = path
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    bpy.ops.render.render(write_still=True)
