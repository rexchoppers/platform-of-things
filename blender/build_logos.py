"""Pack the skill logos into one image, so Grove can draw all of them in a single draw call.

Run from the repo root (needs rsvg-convert, from Homebrew's librsvg):
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python blender/build_logos.py [-- --preview output/folder]

Reads     blender/logos/*.svg
Writes    src/assets/worlds/grove/logos.webp    the atlas the game draws from
          blender/logos/atlas.json              where each logo sits, read by build_grove.py
"""

import json
import os
import subprocess
import sys
import tempfile

import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE = os.path.join(ROOT, "blender", "logos")
OUT_ATLAS = os.path.join(ROOT, "src", "assets", "worlds", "grove", "logos.webp")
OUT_LAYOUT = os.path.join(SOURCE, "atlas.json")

COLUMNS, ROWS = 4, 8
CELL_WIDTH, CELL_HEIGHT = 512, 256
MARGIN = 8  # Empty pixels around each logo, so mipmaps don't bleed into the next one
SOURCE_SCALE = 2  # Drawn this much larger than needed, then shrunk, for clean edges

# Black parts of a logo would vanish against the night, so they turn cream.
CREAM = np.array((0.94, 0.91, 0.84), dtype=np.float32)
DARK_BELOW = 0.1  # Linear luminance where the change starts
FULLY_DARK = 0.025  # Linear luminance where the change is complete
GREY_BELOW = 0.32  # Greys are lifted from further up, so grey lettering reads too


def linear(srgb):
    return np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def read_pixels(image):
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    return pixels.reshape(height, width, 4)


def rasterise(svg, folder):
    """Returns the logo's pixels, bottom row first, cropped to what it actually draws."""
    png = os.path.join(folder, os.path.basename(svg) + ".png")
    width = (CELL_WIDTH - 2 * MARGIN) * SOURCE_SCALE
    height = (CELL_HEIGHT - 2 * MARGIN) * SOURCE_SCALE
    subprocess.run(["rsvg-convert", "--keep-aspect-ratio", "-w", str(width), "-h", str(height), "-o", png, svg], check=True)
    image = bpy.data.images.load(png)
    pixels = read_pixels(image)
    bpy.data.images.remove(image)
    drawn = pixels[..., 3] > 0.02
    rows, columns = np.where(drawn.any(axis=1))[0], np.where(drawn.any(axis=0))[0]
    return pixels[rows[0] : rows[-1] + 1, columns[0] : columns[-1] + 1]


def shrink_to_fit(pixels):
    """Fits the logo inside one cell, averaging in premultiplied colour so edges stay clean."""
    height, width = pixels.shape[:2]
    scale = min((CELL_WIDTH - 2 * MARGIN) / width, (CELL_HEIGHT - 2 * MARGIN) / height, 1.0)
    new_width, new_height = max(int(round(width * scale)), 1), max(int(round(height * scale)), 1)

    premultiplied = pixels.copy()
    premultiplied[..., :3] *= premultiplied[..., 3:4]
    image = bpy.data.images.new("logo_shrink", width, height, alpha=True, float_buffer=True)
    image.pixels.foreach_set(premultiplied.ravel())
    image.scale(new_width, new_height)
    shrunk = read_pixels(image).copy()
    bpy.data.images.remove(image)

    alpha = shrunk[..., 3:4]
    shrunk[..., :3] = np.divide(shrunk[..., :3], alpha, out=np.zeros_like(shrunk[..., :3]), where=alpha > 0.001)
    return np.clip(shrunk, 0.0, 1.0)


def brighten_dark_parts(pixels):
    rgb = linear(pixels[..., :3])
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    change = smoothstep(DARK_BELOW, FULLY_DARK, luminance)
    brightest = rgb.max(axis=-1)
    saturation = np.divide(brightest - rgb.min(axis=-1), brightest, out=np.zeros_like(brightest), where=brightest > 0.0)
    greyness = 1.0 - smoothstep(0.08, 0.3, saturation)
    change = np.maximum(change, greyness * smoothstep(GREY_BELOW, FULLY_DARK, luminance))[..., None]
    pixels[..., :3] = pixels[..., :3] + (CREAM - pixels[..., :3]) * change
    return pixels


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    preview = argv[argv.index("--preview") + 1] if "--preview" in argv else None

    names = sorted(name[:-4] for name in os.listdir(SOURCE) if name.endswith(".svg"))
    if len(names) > COLUMNS * ROWS:
        raise RuntimeError(f"{len(names)} logos don't fit in {COLUMNS * ROWS} cells")

    atlas_width, atlas_height = COLUMNS * CELL_WIDTH, ROWS * CELL_HEIGHT
    atlas = np.zeros((atlas_height, atlas_width, 4), dtype=np.float32)
    layout = {}

    with tempfile.TemporaryDirectory() as folder:
        for index, name in enumerate(names):
            pixels = brighten_dark_parts(shrink_to_fit(rasterise(os.path.join(SOURCE, f"{name}.svg"), folder)))
            height, width = pixels.shape[:2]
            left = (index % COLUMNS) * CELL_WIDTH + (CELL_WIDTH - width) // 2
            bottom = (index // COLUMNS) * CELL_HEIGHT + (CELL_HEIGHT - height) // 2
            atlas[bottom : bottom + height, left : left + width] = pixels
            layout[name] = {
                "uv": [
                    round(left / atlas_width, 5),
                    round(bottom / atlas_height, 5),
                    round((left + width) / atlas_width, 5),
                    round((bottom + height) / atlas_height, 5),
                ],
                "aspect": round(width / height, 4),
            }
            print(f"LOGO {name} {width}x{height}")

    # Stored premultiplied, so edges stay clean when the game filters and mipmaps the image.
    atlas[..., :3] *= atlas[..., 3:4]
    # WebP may fill fully clear pixels with any colour it likes, which filtering would pull into
    # the edges. Barely-there black is left alone, and the game discards it anyway.
    atlas[..., 3] = np.maximum(atlas[..., 3], 1.5 / 255.0)

    image = bpy.data.images.new("logos", atlas_width, atlas_height, alpha=True)
    image.pixels.foreach_set(atlas.ravel())
    os.makedirs(os.path.dirname(OUT_ATLAS), exist_ok=True)
    image.filepath_raw = OUT_ATLAS
    image.file_format = "WEBP"
    image.save(quality=100)  # Lossless, because lossy colour would bleed past the alpha
    with open(OUT_LAYOUT, "w", encoding="utf-8") as handle:
        json.dump(layout, handle, indent=2)
    print(f"LOGOS_DONE {len(names)} logos, {os.path.getsize(OUT_ATLAS) / 1024:.0f} KB")

    if preview:
        # The atlas read back and laid over the night sky colour, to judge how each logo reads.
        written = bpy.data.images.load(OUT_ATLAS)
        back = read_pixels(written)
        print("LOGOS_READBACK alpha range", float(back[..., 3].min()), float(back[..., 3].max()))
        night = np.array((0.04, 0.09, 0.16), dtype=np.float32)
        sheet = np.ones_like(back)
        sheet[..., :3] = back[..., :3] + night * (1.0 - back[..., 3:4])
        out = bpy.data.images.new("logo_sheet", atlas_width, atlas_height)
        out.pixels.foreach_set(sheet.ravel())
        out.scale(1024, 1024)
        out.filepath_raw = os.path.join(os.path.abspath(preview), "logos_sheet.png")
        out.file_format = "PNG"
        out.save()


main()
