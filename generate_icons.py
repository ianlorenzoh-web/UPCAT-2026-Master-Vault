#!/usr/bin/env python3
"""
UPCAT 2027 Master Vault — Icon Generator
=========================================
Generates all required PWA icons (PNG) from a base SVG design.

REQUIREMENTS:
  pip install Pillow cairosvg

RUN:
  python3 generate_icons.py

OUTPUT:
  icons/ folder with all required PNG sizes
"""

import os
import sys

# Try to import required libraries
try:
    from PIL import Image, ImageDraw, ImageFont
    import cairosvg
    USE_CAIRO = True
except ImportError:
    try:
        from PIL import Image, ImageDraw
        USE_CAIRO = False
        print("⚠️  cairosvg not found. Using PIL fallback (basic icon).")
        print("   For best results: pip install cairosvg")
    except ImportError:
        print("❌ Pillow not installed. Run: pip install Pillow cairosvg")
        sys.exit(1)

# Icon sizes required
ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Brand colors
BG_COLOR    = (5, 7, 17)       # #050711 (dark navy)
ACCENT      = (99, 102, 241)   # #6366f1 (indigo)
ACCENT_2    = (139, 92, 246)   # #8b5cf6 (purple)
WHITE       = (240, 242, 255)  # #f0f2ff

# SVG source for the icon
SVG_TEMPLATE = """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="{size}" height="{size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#050711"/>
      <stop offset="100%" style="stop-color:#0e1226"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <rect width="512" height="512" rx="100" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.08"/>

  <!-- Glow orb -->
  <circle cx="256" cy="220" r="130" fill="#6366f1" opacity="0.07"/>

  <!-- Lightning bolt (⚡) — centered -->
  <path d="M290 80 L180 270 L245 270 L222 432 L332 242 L267 242 Z"
        fill="url(#bolt)"
        filter="url(#glow)"
        opacity="0.95"/>

  <!-- "UP" text hint at bottom -->
  <text x="256" y="480" text-anchor="middle"
        font-family="'Inter', 'Arial', sans-serif"
        font-size="38" font-weight="800"
        fill="#f0f2ff" opacity="0.55"
        letter-spacing="8">VAULT</text>
</svg>
"""

def generate_icons_with_cairo():
    os.makedirs('icons', exist_ok=True)
    for size in ICON_SIZES:
        svg_content = SVG_TEMPLATE.format(size=size).encode('utf-8')
        output_path = f'icons/icon-{size}x{size}.png'
        cairosvg.svg2png(bytestring=svg_content, write_to=output_path, output_width=size, output_height=size)
        print(f'  ✅ Generated: {output_path}')

def generate_icons_fallback():
    """Simple PIL-based icon generation without cairosvg"""
    os.makedirs('icons', exist_ok=True)
    for size in ICON_SIZES:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Rounded background
        draw.rounded_rectangle([0, 0, size-1, size-1], radius=size//5, fill=BG_COLOR)

        # Gradient simulation — inner circle
        cx, cy = size // 2, size // 2
        for r in range(int(size * 0.4), 0, -1):
            alpha = int(20 * (r / (size * 0.4)))
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(*ACCENT, alpha))

        # Lightning bolt path (scaled)
        scale = size / 512
        bolt = [
            (int(290*scale), int(80*scale)),
            (int(180*scale), int(270*scale)),
            (int(245*scale), int(270*scale)),
            (int(222*scale), int(432*scale)),
            (int(332*scale), int(242*scale)),
            (int(267*scale), int(242*scale)),
        ]
        draw.polygon(bolt, fill=ACCENT)

        output_path = f'icons/icon-{size}x{size}.png'
        img.save(output_path, 'PNG', optimize=True)
        print(f'  ✅ Generated: {output_path}')

def main():
    print("\n🚀 UPCAT Vault — Icon Generator")
    print("=" * 40)
    print(f"Generating {len(ICON_SIZES)} icon sizes: {ICON_SIZES}")
    print()

    if USE_CAIRO:
        generate_icons_with_cairo()
    else:
        generate_icons_fallback()

    print()
    print("✅ All icons generated in ./icons/")
    print()
    print("📋 Next steps:")
    print("  1. Copy the icons/ folder into your project root")
    print("  2. Reference them in manifest.json (already done)")
    print("  3. Add apple-touch-icon links to index.html (see instructions)")

if __name__ == '__main__':
    main()
