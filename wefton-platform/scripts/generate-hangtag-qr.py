"""
Wefton Copper — Compact STANDARD QR codes for garment hangtags.

Generates tiny, print-ready QR codes for the brand-owned short links:
    /ig -> Instagram profile
    /wc -> wash-care instructions

Tiny-QR optimization: ALL-UPPERCASE including the HTTPS:// scheme and the
"WWW." host keeps each QR in alphanumeric mode -> smallest standard QR that
still works, so it stays scannable when printed under 1 cm^2.
  - The scheme is REQUIRED: without https:// phones open http:// and hit an
    insecure-connection warning.
  - The "www." host is REQUIRED: the bare domain weftoncopper.com has no DNS
    record; only www.weftoncopper.com resolves.
URL scheme/host are case-insensitive, and next.config.ts matches the short
paths (/IG, /WC) case-insensitively, so uppercase payloads resolve correctly.

Standard (not Micro) QR: phone cameras don't read Micro QR, so a standard QR
is what actually scans.

Output per target: two exact-size SVGs (10mm, 15mm) + a high-res PNG fallback.

Requirements: pip install segno
"""

import os
import re
import segno

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(PUBLIC_DIR, exist_ok=True)

# (encoded payload, canonical resolved URL, output basename)
TARGETS = [
    (
        "HTTPS://WWW.WEFTONCOPPER.COM/IG",
        "https://www.weftoncopper.com/ig",
        "instagram-qr",
    ),
    (
        "HTTPS://WWW.WEFTONCOPPER.COM/WC",
        "https://www.weftoncopper.com/wc",
        "wash-care-qr",
    ),
]


def set_physical_size(path, mm):
    """Force the SVG root to an exact physical size in mm and inject a viewBox
    so the module grid scales correctly regardless of the width/height units.

    segno emits the grid as module coords (0..N) under a transform="scale(S)",
    so the internal coordinate space is N*S. We read N and S from the markup
    and set viewBox accordingly."""
    with open(path, "r", encoding="utf-8") as f:
        svg = f.read()

    scale_m = re.search(r'transform="scale\((\d+)\)"', svg)
    grid_m = re.search(r'<path fill="#fff" d="M0 0h(\d+)v', svg)
    scale = int(scale_m.group(1)) if scale_m else 10
    grid = int(grid_m.group(1)) if grid_m else 37
    box = grid * scale

    svg = re.sub(r'width="[^"]*"', f'width="{mm}mm"', svg, count=1)
    svg = re.sub(r'height="[^"]*"', f'height="{mm}mm"', svg, count=1)
    if "viewBox" not in svg:
        svg = svg.replace(
            'class="segno"', f'viewBox="0 0 {box} {box}" class="segno"', 1
        )
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


def build_one(payload, canonical, basename):
    png_path = os.path.join(PUBLIC_DIR, f"{basename}.png")
    svg_10 = os.path.join(PUBLIC_DIR, f"{basename}-10mm.svg")
    svg_15 = os.path.join(PUBLIC_DIR, f"{basename}-15mm.svg")

    # micro=False forces a standard QR. error='m' (~15% recovery) keeps the
    # version low = larger modules at tiny print size = easier to scan.
    qr = segno.make(payload, micro=False, error="m")
    w, h = qr.symbol_size()
    print(f"✅ {basename}")
    print(f"   data    : {payload}")
    print(f"   resolves: {canonical}")
    print(f"   version : {qr.version}  error: {qr.error}  modules: {w}x{h}")

    qr.save(svg_10, scale=10, border=4, dark="#000000", light="#ffffff")
    qr.save(svg_15, scale=10, border=4, dark="#000000", light="#ffffff")
    set_physical_size(svg_10, 10)
    set_physical_size(svg_15, 15)
    qr.save(png_path, scale=24, border=4, dark="#000000", light="#ffffff")
    print(f"   saved   : {svg_10}")
    print(f"   saved   : {svg_15}")
    print(f"   saved   : {png_path}")


if __name__ == "__main__":
    for payload, canonical, basename in TARGETS:
        build_one(payload, canonical, basename)
