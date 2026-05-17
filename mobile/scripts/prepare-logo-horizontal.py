#!/usr/bin/env python3
"""Prepare Spin Vault horizontal logo: transparent PNG, tight crop, 1024w master."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

SOURCE = Path(
    "/Users/lucnelnordelus/.cursor/projects/Users-lucnelnordelus-Desktop-Projects-SpinVault2"
    "/assets/logo-horizontal-78367fb0-a003-4c07-94bc-2795ac891f55.png"
)
OUT_ROOT = Path(__file__).resolve().parents[1] / "assets"
OUT_MAIN = OUT_ROOT / "logo-horizontal.png"
OUT_ICON = OUT_ROOT / "icons" / "logo-horizontal.png"
PREVIEW_DARK = Path("/tmp/spinvault-logo-preview-dark.png")
PREVIEW_LIGHT = Path("/tmp/spinvault-logo-preview-light.png")

# Tan/gold JPEG backdrop samples (not logo metal)
_BACKDROP_REFS = (
    (38, 30, 18),
    (62, 48, 28),
    (88, 68, 38),
    (112, 88, 48),
    (138, 108, 62),
    (168, 132, 78),
)


def _dist(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) ** 0.5


def _min_backdrop_dist(r: int, g: int, b: int) -> float:
    return min(_dist((r, g, b), ref) for ref in _BACKDROP_REFS)
TARGET_WIDTH = 1024
PAD_RATIO = 0.028  # ~2.8% safe padding after trim


def luma(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def backdrop_alpha(r: int, g: int, b: int) -> int:
    """Return 0–255 alpha; 0 = fully transparent."""
    mx = max(r, g, b)
    mn = min(r, g, b)
    lum = luma(r, g, b)
    sat = (mx - mn) / mx if mx > 0 else 0.0

    # Black field (JPEG crush)
    if lum < 34:
        return 0
    if lum < 48 and sat < 0.22:
        return 0

    # Keep bright metal, gold highlights, silver vault
    if lum >= 145 or (lum >= 95 and sat >= 0.38):
        return 255
    if lum >= 78 and sat >= 0.55:
        return 255

    # Tan/gold JPEG backdrop (distance-based + warm haze)
    bd = _min_backdrop_dist(r, g, b)
    warm = r >= g and g >= b - 10
    if bd < 58 and warm and lum < 168 and sat < 0.78:
        if lum > 130 and sat > 0.42:
            pass  # bright gold — keep
        else:
            fade = min(1.0, bd / 58)
            return int(max(0, min(255, 255 * fade * fade)))

    if warm and 40 < lum < 125 and sat < 0.68 and b < 130:
        haze = (1.0 - min(1.0, sat / 0.68)) * (1.0 - min(1.0, (lum - 40) / 85))
        return int(max(0, min(255, 255 * (1.0 - haze * 0.95))))

    # Dark text panel inside gold frame
    if lum < 78 and sat < 0.42:
        return int(max(0, min(255, (lum - 28) * 4.2)))

    return 255


def remove_backdrop(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    w, h = rgb.size
    out = Image.new("RGBA", (w, h))
    px_in = rgb.load()
    px_out = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px_in[x, y]
            a = backdrop_alpha(r, g, b)
            px_out[x, y] = (r, g, b, a)
    return out


def trim_with_padding(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    pad = max(8, int(img.width * PAD_RATIO))
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(img.width, bbox[2] + pad)
    bottom = min(img.height, bbox[3] + pad)
    return img.crop((left, top, right, bottom))


def resize_to_width(img: Image.Image, width: int) -> Image.Image:
    if img.width == width:
        return img
    height = max(1, round(img.height * width / img.width))
    return img.resize((width, height), Image.Resampling.LANCZOS)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True, compress_level=9)


def preview_on_bg(logo: Image.Image, hex_bg: str, path: Path) -> None:
    bg_rgb = tuple(int(hex_bg[i : i + 2], 16) for i in (1, 3, 5))
    canvas = Image.new("RGBA", logo.size, bg_rgb + (255,))
    canvas.alpha_composite(logo)
    save_png(canvas.convert("RGB"), path)


def main() -> int:
    if not SOURCE.is_file():
        print(f"Missing source: {SOURCE}", file=sys.stderr)
        return 1

    raw = Image.open(SOURCE)
    cut = remove_backdrop(raw)
    trimmed = trim_with_padding(cut)
    master = resize_to_width(trimmed, TARGET_WIDTH)

    save_png(master, OUT_MAIN)
    save_png(master, OUT_ICON)

  # QA composites (not bundled in app)
    preview_on_bg(master, "#07111E", PREVIEW_DARK)
    preview_on_bg(master, "#FFF8EA", PREVIEW_LIGHT)

    alpha = master.getchannel("A")
    has_alpha = alpha.getextrema()[0] < 255
    print(f"dimensions: {master.width}x{master.height}")
    print(f"aspect: {master.height / master.width:.6f}")
    print(f"alpha_transparency: {has_alpha}")
    print(f"written: {OUT_MAIN}")
    print(f"written: {OUT_ICON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
