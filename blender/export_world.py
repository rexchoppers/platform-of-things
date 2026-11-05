"""Export an edited world .blend into the game's assets.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b blender/worlds/hearth.blend \
        --python blender/export_world.py -- hearth

Reads whatever is in the open file, so hand edits made in Blender carry through.

Writes to src/assets/worlds/<name>/:
    world.glb       Terrain and everything on it, instanced with EXT_mesh_gpu_instancing
    heights.bin     Little-endian Float32 grid sampled from the Terrain object
    manifest.json   Heightfield size, collision shapes, and marker Empties such as Spawn, DogStart,
                    Portal.*, FirePoint, Screen, Aurora, Confetti, Constellation, Link.*, Logo.*, and any Empty with a light_candela property
"""

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Covers everywhere the player can stand. Outside it, Terrain.ts clamps to the edge.
HEIGHT_SIZE = 160.0
HEIGHT_RESOLUTION = 321

# Collision. Only groups listed here block anyone, so grass, ferns, and bushes stay walkable.
SOLID_GROUPS = ("Campsite", "Props", "Deadwood", "Rocks", "TreesHero", "TreesMid")
# Too small to trip over, or not on the ground.
NO_COLLISION = (
    "coffee_cup", "book_stack", "paper_stack", "leash", "dog_toys", "rubber_duck", "stepping_stone",
    "bird_house", "radio", "light_wire", "fire_logs", "tripod", "clapperboard", "picnic_blanket", "aisle_carpet",
    "reading_rug",
)
# Uneven tops that would leave the player hovering in mid air.
NEVER_STAND_ON = ("bicycle", "garden_tools", "bench", "director_chair", "projector", "film_camera", "reading_chair", "anvil")
TALLEST_TO_STAND_ON = 1.1
# Taller than that, but with steps leading up.
ALWAYS_STAND_ON = ("stage_platform", "stage_step")
SMALLEST_FOOTPRINT = 0.2
TRUNK_RADIUS = 0.36  # At ground level, for a tree at scale 1
# Shapes whose outline misleads: tent guy lines, cabin eaves, and so on. Half sizes.
FOOTPRINT_OVERRIDES = {
    "portal_tent": {"half": (2.6, 2.5)},
    "cabin": {"half": (3.35, 2.85)},
    "fire_ring": {"radius": 1.4},
    "lantern_post": {"radius": 0.14},
    "light_post": {"radius": 0.12},
    "screen_frame": {"half": (11.0, 0.4)},
    "speaker": {"radius": 0.55},
    "projector": {"radius": 0.45},
    "film_camera": {"radius": 0.34},
    "stone_plinth": {"radius": 1.4},
    "banner_pole": {"radius": 0.14},
    "floor_lamp": {"radius": 0.3},
    "stone_forge": {"half": (1.35, 0.95)},
}


def to_game(location):
    """Blender (x, y, z) is game (x, z, -y)."""
    return [round(location.x, 3), round(location.z, 3), round(-location.y, 3)]


def ground_height(tree, x, y):
    hit, _normal, _index, _distance = tree.ray_cast(Vector((x, y, 2000.0)), Vector((0.0, 0.0, -1.0)))
    if hit is None:
        raise RuntimeError(f"Terrain does not cover ({x}, {y})")
    return hit.z


def write_heightfield(path, tree):
    data = np.zeros((HEIGHT_RESOLUTION, HEIGHT_RESOLUTION), dtype="<f4")
    step = HEIGHT_SIZE / (HEIGHT_RESOLUTION - 1)
    # Row is game z, column is game x.
    for row in range(HEIGHT_RESOLUTION):
        game_z = -HEIGHT_SIZE / 2 + row * step
        for column in range(HEIGHT_RESOLUTION):
            game_x = -HEIGHT_SIZE / 2 + column * step
            data[row, column] = ground_height(tree, game_x, -game_z)
    data.tofile(path)
    print(f"WORLD heightfield: min {data.min():.2f} max {data.max():.2f}")


def optional_position(name):
    obj = bpy.data.objects.get(name)
    return to_game(obj.location) if obj else None


def read_screen():
    screen = bpy.data.objects.get("Screen")
    if not screen:
        return None
    return {"position": to_game(screen.location), "yaw": round(screen["yaw"], 4), "width": screen["width"], "height": screen["height"]}


def read_markers():
    objects = sorted(bpy.data.objects, key=lambda o: o.name)
    spawn = bpy.data.objects["Spawn"]
    x, _, z = to_game(spawn.location)
    # The player starts facing look_at, or the fire if the world has no look_at.
    if "look_at" in spawn:
        target_x, target_z = spawn["look_at"][0], -spawn["look_at"][1]
    else:
        target_x, _, target_z = to_game(bpy.data.objects["FirePoint"].location)
    # Camera yaw that faces the target. three.js cameras look down -Z at yaw 0.
    facing = math.atan2(-(target_x - x), -(target_z - z))
    return {
        "spawn": {"x": x, "z": z, "facing": round(facing, 4), "walkRadius": spawn["walk_radius"]},
        "dogStart": to_game(bpy.data.objects["DogStart"].location),
        "firePoint": optional_position("FirePoint"),
        "creditsSign": optional_position("CreditsSign"),
        "projector": optional_position("Projector"),
        "screen": read_screen(),
        "aurora": optional_position("Aurora"),
        "confetti": optional_position("Confetti"),
        "constellation": optional_position("Constellation"),
        "links": [
            {"position": to_game(obj.location), "label": obj["label"], "url": obj["url"]}
            for obj in objects
            if obj.name.startswith("Link.")
        ],
        "logos": [
            {
                "position": to_game(obj.location),
                "uv": [round(value, 5) for value in obj["uv"]],
                "width": round(obj["width"], 3),
                "height": round(obj["height"], 3),
                "colour": [round(channel, 3) for channel in obj["colour"]],
            }
            for obj in objects
            if obj.name.startswith("Logo.")
        ],
        "campfires": [
            {"position": to_game(obj.location), "size": obj["size"]} for obj in objects if obj.name.startswith("Campfire.")
        ],
        "portals": [
            dict(zip(("x", "y", "z"), to_game(obj.location)), world=obj["target"], yaw=round(obj["yaw"], 4))
            for obj in objects
            if obj.name.startswith("Portal.")
        ],
        "pointLights": [
            {
                "position": to_game(obj.location),
                "colour": [round(channel, 3) for channel in obj["light_colour"]],
                "candela": obj["light_candela"],
                "range": obj["light_range"],
            }
            for obj in objects
            if "light_candela" in obj
        ],
    }


def group_of(obj):
    return obj.parent.name if obj.parent else ""


def collider_for(obj):
    """A circle [x, z, radius, top] or box [x, z, half_width, half_depth, yaw, top], in game space."""
    name = obj.data.name
    if group_of(obj) not in SOLID_GROUPS or name.startswith(NO_COLLISION):
        return None

    world = obj.matrix_world
    x, _, z = to_game(world.translation)

    if group_of(obj).startswith("Trees"):
        return [x, z, round(TRUNK_RADIUS * obj.scale.x, 3), None]

    for prefix, override in FOOTPRINT_OVERRIDES.items():
        if name.startswith(prefix):
            if "radius" in override:
                return [x, z, round(override["radius"] * obj.scale.x, 3), None]
            return [x, z, *override["half"], round(obj.rotation_euler.z, 4), None]

    corners = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get("co", corners)
    corners = corners.reshape(-1, 3)
    low, high = corners.min(axis=0), corners.max(axis=0)
    half_x = (high[0] - low[0]) / 2 * obj.scale.x
    half_y = (high[1] - low[1]) / 2 * obj.scale.y
    if max(half_x, half_y) < SMALLEST_FOOTPRINT:
        return None

    centre = world @ Vector(((low[0] + high[0]) / 2, (low[1] + high[1]) / 2, 0.0))
    x, _, z = to_game(centre)
    height = high[2] * obj.scale.z
    can_stand = (height <= TALLEST_TO_STAND_ON or name.startswith(ALWAYS_STAND_ON)) and not name.startswith(NEVER_STAND_ON)
    top = round(world.translation.z + height, 3) if can_stand else None

    if abs(half_x - half_y) < 0.15 * max(half_x, half_y):
        return [x, z, round(max(half_x, half_y), 3), top]
    return [x, z, round(half_x, 3), round(half_y, 3), round(obj.rotation_euler.z, 4), top]


def read_colliders(walk_radius):
    bpy.context.view_layer.update()
    colliders = []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        collider = collider_for(obj)
        # Anything beyond where the player can reach never needs checking.
        if collider and math.hypot(collider[0], collider[1]) < walk_radius + 6.0:
            colliders.append(collider)
    return colliders


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_gpu_instances=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_tangents=False,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
        export_vertex_color="MATERIAL",
        export_image_format="AUTO",
        export_extras=False,
    )


def main():
    name = sys.argv[sys.argv.index("--") + 1]
    out_dir = os.path.join(ROOT, "src", "assets", "worlds", name)
    os.makedirs(out_dir, exist_ok=True)

    terrain = bpy.data.objects["Terrain"]
    if not terrain.matrix_world.is_identity:
        raise RuntimeError("Apply the Terrain object's transform before exporting (Ctrl+A)")
    tree = BVHTree.FromObject(terrain, bpy.context.evaluated_depsgraph_get())
    write_heightfield(os.path.join(out_dir, "heights.bin"), tree)

    markers = read_markers()
    colliders = read_colliders(markers["spawn"]["walkRadius"])
    manifest = {"heightfield": {"size": HEIGHT_SIZE, "resolution": HEIGHT_RESOLUTION}, **markers, "colliders": colliders}
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, separators=(",", ":"))
    print("WORLD markers:", json.dumps(markers))
    print("WORLD colliders:", len(colliders))

    glb = os.path.join(out_dir, "world.glb")
    export_glb(glb)
    print(f"WORLD_DONE {os.path.getsize(glb) / 1048576:.2f} MB")


main()
