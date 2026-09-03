"""
Wefton Copper — Compact STANDARD QR for the Instagram hangtag.

Points at the brand-owned redirect https://www.weftoncopper.com/ig (a 301 to
the Instagram profile, configured in firebase.json). Brand-owned = no bit.ly
dependency and the destination can be changed later without reprinting tags.

Standard (not Micro) QR: phone cameras don't read Micro QR, so a standard QR
is what actually scans. The short URL keeps it a low version = small print.

Output: two exact-size SVGs (10mm, 15mm) + a high-res PNG fallback.

Requirements: pip install segno
"""

import os
import re
import segno

# Tiny-QR optimization: ALL-UPPERCASE including the HTTPS:// scheme keeps the
# QR in alphanumeric mode -> version 2 (33x33), the smallest standard QR that
# still carries an explicit https scheme. The scheme is REQUIRED: without it,
# phones open http:// and hit an insecure-connection warning. URL scheme/host
# are case-insensitive, and next.config.ts matches the /IG path case-
# insensitively, so this resolves securely to https://weftoncopper.com/ig.
URL = "HTTPS://WEFTONCOPPER.COM/IG"
CANONICAL_URL = "https://weftoncopper.com/ig"  # where it actually resolves
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(PUBLIC_DIR, exist_ok=True)

PNG_PATH = os.path.join(PUBLIC_DIR, "instagram-qr.png")
SVG_10MM = os.path.join(PUBLIC_DIR, "instagram-qr-10mm.svg")
SVG_15MM = os.path.join(PUBLIC_DIR, "instagram-qr-15mm.svg")


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


def build():
    # micro=False forces a standard QR. error='m' (~15% recovery) keeps the
    # version low = larger modules at tiny print size = easier to scan.
    qr = segno.make(URL, micro=False, error="m")
    w, h = qr.symbol_size()
    print("✅ Tiny standard QR generated (scannable by all phones)")
    print(f"   data    : {URL}")
    print(f"   resolves: {CANONICAL_URL}")
    print(f"   version : {qr.version}")
    print(f"   error   : {qr.error}")
    print(f"   modules : {w}x{h}")

    qr.save(SVG_10MM, scale=10, border=4, dark="#000000", light="#ffffff")
    qr.save(SVG_15MM, scale=10, border=4, dark="#000000", light="#ffffff")
    set_physical_size(SVG_10MM, 10)
    set_physical_size(SVG_15MM, 15)

    qr.save(PNG_PATH, scale=24, border=4, dark="#000000", light="#ffffff")
    print(f"   saved   : {SVG_10MM}")
    print(f"   saved   : {SVG_15MM}")
    print(f"   saved   : {PNG_PATH}")


if __name__ == "__main__":
    build()
