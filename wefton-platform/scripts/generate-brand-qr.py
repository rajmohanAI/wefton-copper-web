"""
Wefton Copper — Brand QR Code Generator
Generates a styled QR code with gradient colors, rounded modules, and logo overlay.

Requirements: pip install qrcode[pil] Pillow numpy
"""

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer, CircleModuleDrawer
from qrcode.image.styles.colormasks import VerticalGradiantColorMask
from PIL import Image, ImageDraw
import os

# Configuration — list of (url, output filename) pairs
QR_TARGETS = [
    ("https://www.weftoncopper.com/welcome", "brand-qr.png"),
    ("https://www.weftoncopper.com/wash-care", "wash-care-qr.png"),
]
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
LOGO_PATH = os.path.join(PUBLIC_DIR, "Loo_png.png")

# Colors
COLOR_1 = (180, 112, 61)    # #B4703D (copper)
COLOR_2 = (10, 155, 166)    # #0A9BA6 (teal)
BG_COLOR = (255, 255, 255)  # White background

def generate_qr(url, output_filename):
    OUTPUT_PATH = os.path.join(PUBLIC_DIR, output_filename)
    URL = url
    # Create QR code instance
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction for logo
        box_size=20,
        border=4,
    )
    qr.add_data(URL)
    qr.make(fit=True)

    # Generate styled QR with rounded modules and vertical gradient
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=VerticalGradiantColorMask(
            back_color=BG_COLOR,
            top_color=COLOR_1,
            bottom_color=COLOR_2,
        ),
    )

    # Convert to RGBA for logo overlay
    img = img.convert("RGBA")

    # Add logo in center if it exists
    if os.path.exists(LOGO_PATH):
        logo = Image.open(LOGO_PATH).convert("RGBA")

        # Resize logo to fit ~20% of QR code
        qr_width = img.size[0]
        logo_max_size = int(qr_width * 0.22)
        logo.thumbnail((logo_max_size, logo_max_size), Image.LANCZOS)

        # Create white circle background for logo
        logo_bg_size = logo.size[0] + 20
        logo_bg = Image.new("RGBA", (logo_bg_size, logo_bg_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(logo_bg)
        draw.ellipse([0, 0, logo_bg_size - 1, logo_bg_size - 1], fill=(255, 255, 255, 255))

        # Center logo on white circle
        logo_offset = ((logo_bg_size - logo.size[0]) // 2, (logo_bg_size - logo.size[1]) // 2)
        logo_bg.paste(logo, logo_offset, logo)

        # Center logo_bg on QR code
        pos = ((img.size[0] - logo_bg_size) // 2, (img.size[1] - logo_bg_size) // 2)
        img.paste(logo_bg, pos, logo_bg)
    else:
        print(f"⚠️  Logo not found at: {LOGO_PATH}")
        print("   QR code generated without logo.")

    # Save as PNG
    img = img.convert("RGB")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    img.save(OUTPUT_PATH, "PNG", quality=95)
    print(f"✅ Brand QR code saved to: {OUTPUT_PATH}")
    print(f"   URL: {URL}")
    print(f"   Size: {img.size[0]}x{img.size[1]}px")

if __name__ == "__main__":
    for url, filename in QR_TARGETS:
        generate_qr(url, filename)
