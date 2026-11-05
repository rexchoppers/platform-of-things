"""Generate Inkwell: an open-air library in a misty forest clearing, where each bookshelf opens my articles.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_inkwell.py [-- --preview output/folder]

Writes blender/worlds/inkwell.blend. This overwrites hand edits, so after the first
build, edit the .blend directly and run export_world.py.
"""

import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

import inkwell_props  # noqa: E402
import kit  # noqa: E402
import landscape  # noqa: E402
from inkwell_props import LABEL_HEIGHT, LABEL_REACH  # noqa: E402
from kit import GRASS, smoothstep  # noqa: E402
from landscape import LANTERN_CANDELA, LANTERN_COLOUR, LANTERN_RANGE, yaw_toward  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "inkwell.blend")
OUT_GROUND = os.path.join(ROOT, "blender", "worlds", "textures", "inkwell_ground.jpg")
SKY_PREVIEW = os.path.join(ROOT, "blender", ".preview", "sky_composite_articles.exr")

SEED = 20261501

# Inkwell's colours from src/config/planets.ts.
GROUND = kit.linear(0x2a2a3a)
SKY = kit.linear(0x0f0f1a)
AMBIENT = kit.linear(0x50507e)
MOON_COLOUR = kit.linear(0xaaaaff)
FOG_DENSITY = 0.012
MOONLIGHT = 1.0

# ---------------------------------------------------------------------------
# Layout, in Blender coordinates. Game (x, z) is Blender (x, -z).
# You arrive at the north end, looking south at the desk with the shelves in an arc behind it.
# All four face you and the moon, so their books can be seen from the tent.
# ---------------------------------------------------------------------------
WALK_RADIUS = 46.0
TREE_LINE = 24.0
FLAT_RADIUS = 24.0

DESK = (0.0, -4.0)
SHELF_RING = 10.0
TENT = (0.0, 16.5)
SPAWN = (0.0, 9.5)  # Just outside the tent door
DOG_START = (2.6, 8.0)

ARTICLES_PAGE = "https://pot.rexchoppers.com/articles.html"
BOOKS_PER_ARTICLE = 4  # Fuller shelves mean more articles, without any shelf looking bare

# Name, angle around the desk in degrees (0 is east, -90 is south), articles, colour, link.
# In this order from your left to your right as you look at them from the tent.
SHELVES = (
    ("Projects", -15.0, 16, 0x50c878, "projects"),
    ("Code/Tech", -65.0, 13, 0x4a90d9, "codetech"),
    ("Tutorials/Reviews", -115.0, 4, 0xcd853f, "tutorialsreviews"),
    ("Personal", -165.0, 5, 0x9966cc, "personal"),
)
SHELVES_FACE = (0.0, 6.0)
CHAIRS = ((-2.5, -6.0), (2.5, -6.0))
LAMPS = ((-4.4, -5.2), (4.4, -5.2))
LAMP_LIGHT = (1.0, 0.62, 0.3)
LANTERNS = ((-14.0, -4.0), (14.0, -4.0), (-11.0, 7.5), (11.0, 7.5), (-12.0, -12.0), (12.0, -12.0))
LIT_LANTERNS = (2, 3)  # Either side of the tent, where you arrive. The others only glow, which is cheaper
BOOKS = ((-3.0, -2.0), (3.0, -2.0), (-1.5, -7.0), (1.5, -7.0), (-6.2, -3.8), (6.2, -3.8))
CONSTELLATION = (0.0, 0.0, 75.0)  # The letters hang in a wide band around this height


def shelf_spot(angle):
    return (DESK[0] + math.cos(math.radians(angle)) * SHELF_RING, DESK[1] + math.sin(math.radians(angle)) * SHELF_RING)


ZONES = [
    (*TENT, 4.6),
    (*DESK, 3.2),
    *[(*shelf_spot(shelf[1]), 2.5) for shelf in SHELVES],
    *[(*spot, 0.8) for spot in CHAIRS],
    *[(*spot, 0.5) for spot in LAMPS],
    *[(*spot, 0.6) for spot in LANTERNS],
    *[(*spot, 0.5) for spot in BOOKS],
]

ROLLING = kit.make_fbm(SEED + 1, 0.016, 5)
RIDGES = kit.make_fbm(SEED + 2, 0.0065, 6)
SWELL = kit.make_fbm(SEED + 4, 0.09, 3)


def height(x, y):
    """Exactly flat under the library, a gentle bowl around it, then hills and far ridges."""
    r = np.hypot(x, y)
    swell = 0.3 * smoothstep(FLAT_RADIUS, 40.0, r) * SWELL(x, y)
    bowl = 8.0 * smoothstep(FLAT_RADIUS, 88.0, r) ** 1.15
    hills = 7.0 * smoothstep(58.0, 140.0, r) * (ROLLING(x, y) + 0.3)
    ridge_reach = smoothstep(150.0, 430.0, r)
    ridge = 90.0 * ridge_reach * (1.0 - np.abs(RIDGES(x, y))) ** 2
    return swell + bowl + hills + ridge + 28.0 * ridge_reach


def path_distance(x, y):
    """Distance from the walk from the tent to the rug."""
    return np.hypot(x, np.maximum(np.maximum(-2.0 - y, y - 14.0), 0.0))


def blocked(x, y, path_width=0.0):
    for zx, zy, zr in ZONES:
        if math.hypot(x - zx, y - zy) < zr:
            return True
    return path_width > 0.0 and float(path_distance(x, y)) < path_width + 0.3


def paint_wear(wear, wx, wy, edge):
    wear(0.4 * smoothstep(2.0, 0.5, path_distance(wx, wy) + edge * 1.2))
    wear(0.7 * smoothstep(5.0, 3.2, np.hypot(wx - DESK[0], wy - DESK[1]) + edge * 2.5))
    wear(0.45 * smoothstep(3.6, 1.8, np.hypot(wx, wy - SPAWN[1] - 1.0) + edge * 2.5))
    for shelf in SHELVES:
        x, y = shelf_spot(shelf[1])
        wear(0.5 * smoothstep(3.6, 1.8, np.hypot(wx - x, wy - y) + edge * 2.0))


SITE = landscape.Site(
    "INKWELL", SEED, height, blocked, paint_wear, TREE_LINE, OUT_GROUND, SKY_PREVIEW, SKY, FOG_DENSITY, MOONLIGHT,
    ground=GROUND * 2.0,  # Painted lighter than the world's colour, because it's almost black
    ambient=AMBIENT,
    moon_colour=tuple(MOON_COLOUR),
    grass_base=GROUND * 1.3,
    grass_tip=GRASS * np.array((0.8, 1.0, 1.15)),
    grass_count=13000,
    undergrowth_start=20.0,
    flower_ring=(7.0, 23.0),
)


def shelf_key(name):
    return name.split("/")[0].lower()


def build_library(world, materials):
    solid, cloth, unlit = materials["solid"], materials["cloth"], materials["unlit"]
    shelves = {shelf_key(name): (count * BOOKS_PER_ARTICLE, kit.linear(colour)) for name, _, count, colour, _ in SHELVES}
    items = inkwell_props.build_all({"solid": solid, "glow": unlit}, shelves)
    camp = world.group("Campsite")
    lit_group = world.group("Props")
    glow_group = world.group("PropGlow")
    camp_glow = world.group("CampGlow")
    lantern_glow = kit.glow_material("LanternGlass", LANTERN_COLOUR, 1.5)

    def put(item, x, y, yaw=0.0):
        for bucket, mesh in items[item]:
            group = glow_group if bucket == "glow" else lit_group
            world.place(group, mesh, x, y, yaw=yaw, name=f"{group.name}_{mesh.name}")

    # E beside a shelf opens that part of the articles page.
    gold = kit.linear(0xd4af37) * 0.85
    labels = []
    for name, angle, _, _, anchor in SHELVES:
        x, y = shelf_spot(angle)
        yaw = yaw_toward(x, y, *SHELVES_FACE)
        put(f"bookshelf_{shelf_key(name)}", x, y, yaw)
        label = landscape.text_mesh(name, 0.34, unlit, (0.0, LABEL_REACH, LABEL_HEIGHT), gold)
        label.transform(Matrix.Translation((x, y, 0.0)) @ Matrix.Rotation(yaw, 4, "Z"))
        labels.append(label)
        front_x, front_y = x + math.sin(yaw) * 1.4, y - math.cos(yaw) * 1.4
        world.marker(f"Link.{shelf_key(name)}", front_x, front_y, 1.5, label=f"Browse {name}", url=f"{ARTICLES_PAGE}#{anchor}")

    world.place(glow_group, landscape.join_meshes("shelf_labels", labels, unlit), 0.0, 0.0, name="PropGlow_shelf_labels")

    put("reading_rug", *DESK)
    put("writing_desk", *DESK)
    for x, y in CHAIRS:
        put("reading_chair", x, y, yaw_toward(x, y, *DESK))
    for x, y in LAMPS:
        put("floor_lamp", x, y)
        world.marker(f"LampLight.{x:.0f}", x, y, 1.95, light_candela=10.0, light_range=16.0, light_colour=LAMP_LIGHT)
    for index, (x, y) in enumerate(BOOKS):
        put(f"book_stack_{index % 2}", x, y, 0.4 + index * 1.7)

    post = landscape.lantern_post(solid)
    glass = landscape.lantern_glass(lantern_glow)
    for index, (x, y) in enumerate(LANTERNS):
        yaw = math.atan2(DESK[1] - y, DESK[0] - x)
        world.place(camp, post, x, y, yaw=yaw)
        world.place(camp_glow, glass, x, y, yaw=yaw)
        if index in LIT_LANTERNS:
            world.marker(
                f"LanternLight.{index}",
                x + math.cos(yaw) * 0.52,
                y + math.sin(yaw) * 0.52,
                2.1,
                light_candela=LANTERN_CANDELA,
                light_range=LANTERN_RANGE,
                light_colour=LANTERN_COLOUR,
            )

    # The tent home, with its door facing the desk.
    landscape.place_portal_tent(world, camp, cloth, SEED, "home", *TENT, DESK, 0xffffff)

    # Points the game reads. Move these in Blender to change them.
    world.marker("Spawn", *SPAWN, 0.0, walk_radius=WALK_RADIUS, look_at=DESK)
    world.marker("DogStart", *DOG_START, 0.0)
    world.marker("Constellation", *CONSTELLATION)


def add_preview_constellation(scene):
    """A stand-in for the glowing letters the game draws live. See Constellation.ts."""
    rng = np.random.default_rng(SEED)
    material = kit.vertex_material("PreviewLetters", True)
    material["no_fog"] = True
    kit.show_unlit_in_preview("PreviewLetters")
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ&"
    hues = [kit.linear(c) for c in (0x8fa8e8, 0x8f96e8, 0xa58fe8, 0xc08fe8, 0xe8d08f)]
    meshes = []
    for _ in range(170):
        angle, reach = rng.uniform(0, math.tau), rng.uniform(20.0, 140.0)
        place = Vector((math.cos(angle) * reach, math.sin(angle) * reach, rng.uniform(50.0, 100.0)))
        size = rng.uniform(2.0, 6.0) * 0.8
        strength = rng.uniform(0.25, 0.55)
        mesh = landscape.text_mesh(letters[rng.integers(len(letters))], size, material, (0, 0, 0), hues[rng.integers(5)] * strength)
        toward = (Vector((0.0, 0.0, 2.0)) - place).normalized()
        turn = (-toward).to_track_quat("Y", "Z").to_matrix().to_4x4()
        mesh.transform(Matrix.Translation(place) @ turn)
        meshes.append(mesh)
    joined = landscape.join_meshes("preview_letters", meshes, material)
    scene.collection.objects.link(bpy.data.objects.new("PreviewLetters", joined))


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

    trees, _ = landscape.scatter_forest(world, rng, SITE, materials["foliage"], materials["broadleaf"])
    build_library(world, materials)
    landscape.scatter_ground_cover(world, rng, SITE, materials["cover"], materials["solid"], materials["shrub"])
    landscape.build_terrain(SITE, world.collection, landscape.paint_ground(SITE, trees))

    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print("INKWELL_SAVED objects:", len(bpy.data.objects))

    if preview:
        add_preview_constellation(scene)
        shots = {
            "spawn": ((0.0, SPAWN[1], 2.0), (0.0, -8.0, 3.0)),
            "up": ((0.0, 2.0, 2.0), (0.0, -30.0, 40.0)),
            "desk": ((1.6, -0.9, 2.0), (0.0, -4.2, 1.0)),
            "shelf": ((6.4, -2.6, 2.0), (9.66, -6.59, 2.6)),
            "arc": ((0.0, 3.0, 2.0), (0.0, -13.0, 3.2)),
            "tent": ((-3.5, 1.5, 2.0), (0.0, 18.0, 3.0)),
        }
        landscape.render_previews(SITE, scene, os.path.abspath(preview), shots)


main()
