"""Bake the soft night sky textures every world shares.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_sky.py

Writes:
    blender/worlds/sky.blend            editable galaxy world nodes
    src/assets/sky/night_sky.webp       galaxy glow on black
    src/assets/sky/clouds.webp          seamless cloud noise the game scrolls
    src/assets/sky/moon.webp            the moon's face

Both are deliberately soft, so the sky reads as painted instead of as a sharp photo.
Stars, moon, motion, and each world's colours are drawn live by
src/environment/Skybox.ts.
"""

import math
import os

import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_STARS = os.path.join(ROOT, "src", "assets", "sky", "night_sky.webp")
OUT_CLOUDS = os.path.join(ROOT, "src", "assets", "sky", "clouds.webp")
OUT_MOON = os.path.join(ROOT, "src", "assets", "sky", "moon.webp")
OUT_BLEND = os.path.join(ROOT, "blender", "worlds", "sky.blend")

WIDTH, HEIGHT = 1024, 512
SAMPLES = 32
CLOUD_SIZE = 512
MOON_SIZE = 768

GALAXY_NORMAL = (-0.62, -0.46, 0.63)
GALAXY_CORE = (0.30, 0.86, 0.41)


class Nodes:
    """Small helper so the node graph reads like arithmetic."""

    def __init__(self, tree):
        self.tree = tree

    def _feed(self, socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            self.tree.links.new(value, socket)
        else:
            socket.default_value = value

    def math(self, op, a, b=None, clamp=False):
        node = self.tree.nodes.new("ShaderNodeMath")
        node.operation = op
        node.use_clamp = clamp
        self._feed(node.inputs[0], a)
        if b is not None:
            self._feed(node.inputs[1], b)
        return node.outputs[0]

    def vec(self, op, a, b=None):
        node = self.tree.nodes.new("ShaderNodeVectorMath")
        node.operation = op
        self._feed(node.inputs[0], a)
        if b is not None:
            self._feed(node.inputs["Scale"] if op == "SCALE" else node.inputs[1], b)
        return node.outputs["Value"] if op == "DOT_PRODUCT" else node.outputs["Vector"]

    def smooth(self, value, from_min, from_max):
        node = self.tree.nodes.new("ShaderNodeMapRange")
        node.interpolation_type = "SMOOTHSTEP"
        self._feed(node.inputs["Value"], value)
        self._feed(node.inputs["From Min"], from_min)
        self._feed(node.inputs["From Max"], from_max)
        return node.outputs[0]

    def noise(self, vector, scale, detail, roughness, seed):
        node = self.tree.nodes.new("ShaderNodeTexNoise")
        node.noise_dimensions = "3D"
        self.tree.links.new(self.vec("ADD", vector, (seed, seed * 1.7, seed * 0.4)), node.inputs["Vector"])
        node.inputs["Scale"].default_value = scale
        node.inputs["Detail"].default_value = detail
        node.inputs["Roughness"].default_value = roughness
        return node.outputs[0]


def build_world():
    world = bpy.data.worlds.new("NightSky")
    bpy.context.scene.world = world
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    n = Nodes(tree)

    coords = tree.nodes.new("ShaderNodeTexCoord")
    direction = n.vec("NORMALIZE", coords.outputs["Generated"])

    # A broad, low-contrast galaxy. Few noise octaves keep it painterly.
    across = n.vec("DOT_PRODUCT", direction, GALAXY_NORMAL)
    across2 = n.math("POWER", n.math("ABSOLUTE", across), 2.0)
    band_wide = n.math("EXPONENT", n.math("MULTIPLY", across2, -16.0))
    band_mid = n.math("EXPONENT", n.math("MULTIPLY", across2, -70.0))
    clouds = n.smooth(n.noise(direction, 3.2, 3.0, 0.45, 3.1), 0.32, 0.72)
    dust = n.smooth(n.noise(direction, 5.0, 3.0, 0.4, 11.7), 0.44, 0.68)
    dust_cut = n.math("SUBTRACT", 1.0, n.math("MULTIPLY", dust, n.math("MULTIPLY", band_mid, 0.5)), clamp=True)
    core = n.math("POWER", n.smooth(n.vec("DOT_PRODUCT", direction, GALAXY_CORE), 0.45, 1.0), 2.0)
    core = n.math("MULTIPLY", core, band_wide)

    haze_amount = n.math(
        "MULTIPLY",
        n.math("MULTIPLY", band_wide, n.math("ADD", n.math("MULTIPLY", clouds, 0.7), 0.3)),
        dust_cut,
    )
    haze = n.vec("SCALE", (0.022, 0.024, 0.052), haze_amount)
    haze = n.vec("ADD", haze, n.vec("SCALE", (0.050, 0.034, 0.042), n.math("MULTIPLY", core, dust_cut)))

    background = tree.nodes.new("ShaderNodeBackground")
    tree.links.new(haze, background.inputs["Color"])
    output = tree.nodes.new("ShaderNodeOutputWorld")
    tree.links.new(background.outputs[0], output.inputs["Surface"])


def use_gpu_if_available(scene):
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = "GPU"
    except (TypeError, ValueError):
        scene.cycles.device = "CPU"


def bake_stars():
    scene = bpy.context.scene
    build_world()

    camera_data = bpy.data.cameras.new("SkyBake")
    camera_data.type = "PANO"
    camera_data.panorama_type = "EQUIRECTANGULAR"
    camera = bpy.data.objects.new("SkyBake", camera_data)
    camera.rotation_euler = (math.pi / 2, 0, 0)  # Look along +Y with +Z up
    scene.collection.objects.link(camera)
    scene.camera = camera

    scene.render.engine = "CYCLES"
    use_gpu_if_available(scene)
    scene.cycles.samples = SAMPLES
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.use_denoising = False
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 100  # Lossless, because a dark gradient shows every compression block
    scene.render.filepath = OUT_STARS

    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    bpy.ops.render.render(write_still=True)


def tiling_noise(size, beta, seed):
    """Seamless 1/f noise in [0, 1], because the FFT is periodic by construction."""
    rng = np.random.default_rng(seed)
    spectrum = np.fft.rfft2(rng.standard_normal((size, size)))
    ky = np.fft.fftfreq(size)[:, None] * size
    kx = np.fft.rfftfreq(size)[None, :] * size
    k = np.sqrt(kx * kx + ky * ky)
    k[0, 0] = 1.0
    spectrum *= k ** (-beta / 2.0)
    spectrum[np.where(k < 2.0)] *= 0.25  # Avoid one giant blob across the tile
    noise = np.fft.irfft2(spectrum, s=(size, size))
    noise = (noise - noise.mean()) / noise.std()
    return np.clip(noise * 0.2 + 0.5, 0.0, 1.0)


def bake_clouds():
    """Red holds large cloud shapes, green and blue hold smaller detail."""
    pixels = np.ones((CLOUD_SIZE, CLOUD_SIZE, 4), dtype=np.float32)
    pixels[..., 0] = tiling_noise(CLOUD_SIZE, 3.7, 501)
    pixels[..., 1] = tiling_noise(CLOUD_SIZE, 3.1, 502)
    pixels[..., 2] = tiling_noise(CLOUD_SIZE, 2.6, 503)
    image = bpy.data.images.new("clouds", CLOUD_SIZE, CLOUD_SIZE, alpha=False)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = OUT_CLOUDS
    image.file_format = "WEBP"
    image.save(quality=88)


def fade_in(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def bake_moon():
    """A full moon's face: pale highlands, dark seas, craters, and two bright rayed craters."""
    rng = np.random.default_rng(777)
    size = MOON_SIZE
    # Blender images start at the bottom row, so y runs upward like the sky.
    y, x = np.mgrid[-1.0 : 1.0 : size * 1j, -1.0 : 1.0 : size * 1j]

    broad = tiling_noise(size, 2.6, 601)
    fine = tiling_noise(size, 1.5, 602)
    surface = 0.8 + (broad - 0.5) * 0.24 + (fine - 0.5) * 0.14

    # Seas as (x, y, width, height, darkness), laid out like the familiar near side.
    seas = (
        (-0.42, 0.38, 0.36, 0.3, 1.0),
        (0.12, 0.44, 0.2, 0.18, 0.95),
        (0.34, 0.18, 0.25, 0.2, 1.0),
        (0.73, 0.27, 0.12, 0.16, 0.95),
        (-0.64, -0.02, 0.24, 0.48, 0.85),
        (-0.22, -0.38, 0.27, 0.2, 0.85),
        (0.56, -0.2, 0.17, 0.21, 0.8),
        (-0.02, 0.03, 0.17, 0.13, 0.6),
    )
    warp = (tiling_noise(size, 2.8, 603) - 0.5) * 0.42
    sea = np.zeros((size, size))
    for sx, sy, width, height, darkness in seas:
        reach = np.hypot((x - sx) / width, (y - sy) / height) + warp
        sea = np.maximum(sea, darkness * (1.0 - fade_in(0.55, 1.2, reach)))
    surface = surface * (1.0 - 0.4 * sea)

    def stamp_crater(cx, cy, radius, strength):
        """A dark floor with a bright rim, lit from the upper left."""
        reach = int(radius * 1.8 * size / 2) + 2
        ci = int((cy + 1.0) / 2.0 * (size - 1))
        cj = int((cx + 1.0) / 2.0 * (size - 1))
        i0, i1 = max(ci - reach, 0), min(ci + reach, size)
        j0, j1 = max(cj - reach, 0), min(cj + reach, size)
        if i0 >= i1 or j0 >= j1:
            return
        dx = (x[i0:i1, j0:j1] - cx) / radius
        dy = (y[i0:i1, j0:j1] - cy) / radius
        d = np.hypot(dx, dy)
        floor = (1.0 - fade_in(0.62, 0.95, d)) * -0.16
        rim = np.exp(-(((d - 1.0) / 0.22) ** 2)) * 0.13
        lit = (-dx + dy) * 0.7 * np.exp(-(((d - 0.82) / 0.3) ** 2)) * 0.1
        surface[i0:i1, j0:j1] *= 1.0 + (floor + rim + lit) * strength

    for _ in range(300):
        angle = rng.uniform(0.0, math.tau)
        reach = math.sqrt(rng.uniform(0.0, 1.0))
        stamp_crater(math.cos(angle) * reach, math.sin(angle) * reach, 0.009 + 0.06 * rng.random() ** 3.4, rng.uniform(0.55, 1.0))

    # Bright young craters throwing long pale rays.
    for cx, cy, radius, ray_reach in ((-0.09, -0.68, 0.036, 0.85), (-0.34, 0.1, 0.03, 0.34), (-0.74, 0.14, 0.02, 0.24)):
        angle = np.arctan2(y - cy, x - cx)
        distance = np.hypot(x - cx, y - cy)
        streaks = np.zeros_like(angle)
        for count, weight in ((7, 0.6), (13, 0.4), (23, 0.3)):
            streaks += weight * np.maximum(np.sin(angle * count + rng.uniform(0.0, math.tau)), 0.0) ** 3
        fade = np.clip(1.0 - distance / ray_reach, 0.0, 1.0) ** 1.6
        surface = surface + streaks * fade * 0.17
        surface = surface + (1.0 - fade_in(radius, radius * 2.6, distance)) * 0.14
        stamp_crater(cx, cy, radius, 1.0)

    # Faint warm tint. Encoded as sRGB, because the game reads this texture as colour.
    rgba = np.ones((size, size, 4), dtype=np.float32)
    for channel, tint in enumerate((1.0, 0.98, 0.93)):
        value = np.clip(surface * tint, 0.0, 1.0)
        rgba[..., channel] = np.where(value <= 0.0031308, value * 12.92, 1.055 * value ** (1 / 2.4) - 0.055)
    image = bpy.data.images.new("moon", size, size, alpha=False)
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = OUT_MOON
    image.file_format = "WEBP"
    image.save(quality=93)


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.preferences.filepaths.save_version = 0
    os.makedirs(os.path.dirname(OUT_STARS), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bake_clouds()
    bake_moon()
    bake_stars()
    print("SKY_DONE")


main()
