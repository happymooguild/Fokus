"""Render the Fokus brand assets from the 1A "Target" direction.

Geometry and colour come from the Claude Design doc `Fokus Brand.dc.html`,
direction 1A, drawn on a 128 grid with a 16px safe margin so the store icon,
the toolbar sizes and the promo tile all derive from one mark.

Outputs:
  icons/icon{16,32,48,128}.png   RGBA, artwork inset 16/128 of the canvas
  icons/promo-tile-440x280.png   RGB, no alpha (Chrome Web Store small tile)

Run:  python3 tools/build-brand-assets.py
"""

import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
FONTS = pathlib.Path(
    "/tmp/claude-1001/-home-shubham-Code-Personal-phocus"
    "/e3e0c511-8670-4bd2-89a9-ed961af5cb67/scratchpad/fonts"
)

# Modernist design-system tokens.
RED = (236, 48, 19)
INK = (32, 30, 29)
BONE = (243, 242, 242)
WHITE = (255, 255, 255)
RULE = (215, 211, 211)
DEEP_RED = (138, 20, 0)

SS = 8  # supersample factor, for clean circle edges


def draw_mark(size, bg=None):
    """The 1A mark on a `size` canvas, artwork occupying the middle 96/128."""
    s = size * SS
    unit = s / 128.0
    img = Image.new("RGBA", (s, s), (bg + (255,)) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Red field: rect 16,16 96x96
    d.rectangle([16 * unit, 16 * unit, 112 * unit, 112 * unit], fill=RED)

    # White ring: circle r=30 with a 12-wide stroke, so 24 inner to 36 outer.
    c, outer, inner = 64 * unit, 36 * unit, 24 * unit
    d.ellipse([c - outer, c - outer, c + outer, c + outer], fill=WHITE)
    d.ellipse([c - inner, c - inner, c + inner, c + inner], fill=RED)

    # White centre dot: r=9
    dot = 9 * unit
    d.ellipse([c - dot, c - dot, c + dot, c + dot], fill=WHITE)

    # BOX is the exact area average of the supersampled render. LANCZOS rings
    # on hard geometric edges and smears faint alpha outside the 16px margin.
    return img.resize((size, size), Image.BOX)


def font(weight, px):
    name = "Archivo-800.ttf" if weight >= 700 else "Archivo-400.ttf"
    return ImageFont.truetype(str(FONTS / name), px * SS)


def tracked(draw, xy, text, fnt, fill, tracking_em, px):
    """Draw text with letter-spacing, which PIL has no native support for."""
    x, y = xy
    step = tracking_em * px * SS
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + step
    return x


def tracked_width(draw, text, fnt, tracking_em, px):
    step = tracking_em * px * SS
    return sum(draw.textlength(c, font=fnt) for c in text) + step * (len(text) - 1)


def build_promo_tile():
    """440x280 small promotional tile, flat RGB with no alpha channel."""
    W, H, PAD = 440, 280, 32
    img = Image.new("RGB", (W * SS, H * SS), BONE)
    d = ImageDraw.Draw(img)

    # Hairline frame, so the near-white tile still reads on a white store page.
    d.rectangle([0, 0, W * SS - 1, H * SS - 1], outline=RULE, width=SS)

    # Lockup: 72px mark, 20px gap, wordmark at 52px/800, tracking -0.03em.
    mark_px = 72
    mark = draw_mark(mark_px * SS)
    img.paste(mark, (PAD * SS, PAD * SS), mark)

    word_px = 52
    word_font = font(800, word_px)
    word_x = (PAD + mark_px + 20) * SS
    # Optically centre the wordmark against the mark using its cap height.
    top, bottom = word_font.getbbox("Fokus")[1], word_font.getbbox("Fokus")[3]
    word_y = (PAD + mark_px / 2) * SS - (top + bottom) / 2
    tracked(d, (word_x, word_y), "Fokus", word_font, INK, -0.03, word_px)

    # Bottom block, anchored so its baseline sits PAD from the tile's foot.
    sub_px, line_px = 14, 24
    sub_font, line_font = font(400, sub_px), font(800, line_px)
    sub_h = sub_font.getbbox("Hg")[3]
    line_h = line_px * 1.15 * SS

    sub_y = (H - PAD) * SS - sub_h
    line2_y = sub_y - 10 * SS - line_h
    line1_y = line2_y - line_h
    rule_y = line1_y - 16 * SS

    d.rectangle(
        [PAD * SS, rule_y, (W - PAD) * SS, rule_y + 2 * SS], fill=INK
    )
    tracked(d, (PAD * SS, line1_y), "Remove distractions", line_font, INK, -0.01, line_px)
    tracked(d, (PAD * SS, line2_y), "from YouTube.", line_font, INK, -0.01, line_px)
    tracked(d, (PAD * SS, sub_y), "23 switches · nothing permanent",
            sub_font, DEEP_RED, 0.04, sub_px)

    out = img.resize((W, H), Image.BOX).convert("RGB")
    out.save(ICONS / "promo-tile-440x280.png")
    return out


def main():
    for size in (16, 32, 48, 128):
        draw_mark(size).save(ICONS / f"icon{size}.png")
    build_promo_tile()
    print("wrote icons/icon{16,32,48,128}.png and icons/promo-tile-440x280.png")


if __name__ == "__main__":
    main()
