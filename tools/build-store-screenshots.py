"""Compose the Chrome Web Store screenshots from raw browser captures.

Outputs 1280x800 24-bit PNGs with no alpha channel, styled with the Modernist
tokens so the listing, the promo tile and the icon read as one thing.

The raw captures in store/raw are browser screenshots of the extension running
on YouTube, kept so the composition can be retuned without recapturing. The
profile photo was blanked at capture time; nothing personal is in them.
"""

import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "store"
SHOTS = ROOT / "store" / "raw"
FONTS = pathlib.Path(
    "/tmp/claude-1001/-home-shubham-Code-Personal-phocus"
    "/e3e0c511-8670-4bd2-89a9-ed961af5cb67/scratchpad/fonts"
)

CAPTURES = {
    "home_before": SHOTS / "home-before.jpg",
    "home_after": SHOTS / "home-after.jpg",
    "watch_before": SHOTS / "watch-before.jpg",
    "watch_after": SHOTS / "watch-after.jpg",
    "popup": SHOTS / "popup.jpg",
}

W, H = 1280, 800
RED = (236, 48, 19)
INK = (32, 30, 29)
BONE = (243, 242, 242)
WHITE = (255, 255, 255)
MUTED_ON_INK = (150, 146, 145)
MUTED_ON_BONE = (96, 93, 93)


def font(weight, px):
    name = "Archivo-800.ttf" if weight >= 700 else "Archivo-400.ttf"
    return ImageFont.truetype(str(FONTS / name), px)


def tracked(d, xy, text, fnt, fill, em=0.0):
    """Draw text with letter-spacing, which PIL does not support natively."""
    x, y = xy
    step = em * fnt.size
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill)
        x += d.textlength(ch, font=fnt) + step
    return x


def mark(size):
    """The 1A Target mark, artwork filling the given box (no safe margin)."""
    ss = size * 8
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = ss / 96.0  # artwork is the 96-unit field
    d.rectangle([0, 0, ss, ss], fill=RED)
    c, outer, inner, dot = 48 * u, 36 * u, 24 * u, 9 * u
    d.ellipse([c - outer, c - outer, c + outer, c + outer], fill=WHITE)
    d.ellipse([c - inner, c - inner, c + inner, c + inner], fill=RED)
    d.ellipse([c - dot, c - dot, c + dot, c + dot], fill=WHITE)
    return img.resize((size, size), Image.BOX)


def panel(img, box_w, box_h, crop=None):
    """Scale a capture to fill box_w x box_h, cropping the overflow centrally."""
    if crop:
        img = img.crop(crop)
    scale = max(box_w / img.width, box_h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (img.width - box_w) // 2
    return img.crop((left, 0, left + box_w, box_h))


def canvas(bg):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)


def brand_footer(d, bg):
    """Small lockup, bottom left, so every screenshot is attributable."""
    fill = BONE if bg == INK else INK
    d_y = H - 62
    return d_y, fill


def add_lockup(img, d, bg):
    y, fill = brand_footer(d, bg)
    m = mark(26)
    img.paste(m, (56, y), m)
    tracked(d, (56 + 26 + 12, y + 1), "Fokus", font(800, 22), fill, -0.03)


def shot_hero_popup():
    img, d = canvas(BONE)
    tracked(d, (72, 150), "23 switches.", font(800, 62), INK, -0.03)
    tracked(d, (72, 224), "Nothing permanent.", font(800, 62), RED, -0.03)
    body = font(400, 21)
    d.text((72, 330), "Hide what distracts you on YouTube,", font=body, fill=MUTED_ON_BONE)
    d.text((72, 362), "and put any of it back in a single click.", font=body, fill=MUTED_ON_BONE)
    d.rectangle([72, 424, 172, 428], fill=RED)

    pop = Image.open(CAPTURES["popup"]).convert("RGB").crop((0, 0, 358, 592))
    scale = 700 / pop.height
    pop = pop.resize((round(pop.width * scale), 700), Image.LANCZOS)
    img.paste(pop, (760, 50))
    add_lockup(img, d, BONE)
    return img


def shot_before_after(title, accent_word, sub, before, after, band=302):
    """
    Stacked bands rather than side-by-side panels. The captures are 1534x784,
    so two panels sharing the width would each land under 300px tall and the
    detail that makes the comparison legible would be lost. Full-width bands
    cropped to the top of the page keep the part that actually changes big.
    """
    img, d = canvas(INK)
    x = tracked(d, (56, 52), title, font(800, 46), BONE, -0.02)
    if accent_word:
        tracked(d, (x + 14, 52), accent_word, font(800, 46), RED, -0.02)
    d.text((56, 118), sub, font=font(400, 19), fill=MUTED_ON_INK)

    pw, ph = 1168, 230
    for i, (label, path) in enumerate((("BEFORE", before), ("AFTER", after))):
        y = 190 + i * 282
        colour = MUTED_ON_INK if i == 0 else RED
        tracked(d, (56, y), label, font(800, 13), colour, 0.14)
        src = Image.open(CAPTURES[path]).convert("RGB")
        p = panel(src, pw, ph, crop=(0, 0, src.width, band))
        img.paste(p, (56, y + 24))
        d.rectangle([56, y + 24, 56 + pw - 1, y + 24 + ph - 1], outline=(60, 57, 56))

    add_lockup(img, d, INK)
    return img


def shot_quiet_home():
    img, d = canvas(INK)
    tracked(d, (56, 58), "Open YouTube.", font(800, 46), BONE, -0.02)
    tracked(d, (56, 112), "Nothing pulls at you.", font(800, 46), RED, -0.02)
    d.text((56, 186), "The homepage feed and Shorts, switched off.",
           font=font(400, 19), fill=MUTED_ON_INK)
    p = panel(Image.open(CAPTURES["home_after"]).convert("RGB"), 1168, 470)
    img.paste(p, (56, 244))
    d.rectangle([56, 244, 56 + 1167, 244 + 469], outline=(60, 57, 56))
    add_lockup(img, d, INK)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    shots = [
        ("01-switches.png", shot_hero_popup()),
        ("02-homepage.png", shot_before_after(
            "Your homepage,", "without the feed",
            "One switch removes the endless grid of recommendations.",
            "home_before", "home_after")),
        ("03-watch.png", shot_before_after(
            "Watch the video.", "Nothing else.",
            "The sidebar, the comments and the merch shelf, gone.",
            "watch_before", "watch_after")),
        ("04-quiet.png", shot_quiet_home()),
    ]
    for name, im in shots:
        assert im.size == (W, H) and im.mode == "RGB"
        im.save(OUT / name)
        print(f"wrote store/{name} {im.size} {im.mode}")


if __name__ == "__main__":
    main()
