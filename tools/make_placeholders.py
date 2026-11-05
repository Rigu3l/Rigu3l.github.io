"""Generate every placeholder asset for the Rj Verceles portfolio.

The site is a 1:1 structural rebuild of helloworlddsgn.com, but all imagery is
new: no original case images, portrait, logo or social tiles are reused.

Run:  python tools/make_placeholders.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "site"
ASSETS = ROOT / "assets"

INK = (5, 23, 39)
NAVY = (10, 39, 71)
BLUE = (31, 82, 246)
ACCENT = (10, 140, 255)
VIOLET = (59, 13, 231)
ICE = (208, 232, 255)
PAPER = (255, 255, 255)

FONT_BOLD = "C:/Windows/Fonts/seguisb.ttf"
FONT_HEAVY = "C:/Windows/Fonts/arialbd.ttf"
FONT_MONO = "C:/Windows/Fonts/consolab.ttf"
# The baked-in taskbar labels use the OS's own UI fonts. Matching those exactly
# keeps the repaint from looking like a pasted-on label.
FONT_TASK95 = "C:/Windows/Fonts/tahoma.ttf"
FONT_TASK7 = "C:/Windows/Fonts/seguisb.ttf"

PALETTES = {
    "systems": ((5, 23, 39), (31, 82, 246)),
    "publishing": ((26, 22, 64), (59, 13, 231)),
    "portfolios": ((5, 23, 39), (10, 140, 255)),
    "neutral": ((10, 39, 71), (10, 140, 255)),
}

CASES = [
    ("celcheck", "CELCHECK", "SYSTEMS / 2025-2026"),
    ("online-clearance", "ONLINE CLEARANCE", "SYSTEMS / 2026"),
    ("management-department", "MANAGEMENT MODULE", "SYSTEMS / 2026"),
    ("manuazine", "MANUAZINE", "PUBLISHING / 2026"),
    ("arjuwey", "ARJUWEY", "PORTFOLIOS / 2026"),
    ("rigu3l-portfolio", "RIGU3L.GITHUB.IO", "PORTFOLIOS / 2026"),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def gradient(w: int, h: int, top, bottom, angle: float = 35) -> Image.Image:
    """Smooth two-stop linear gradient plus a soft radial highlight.

    Computed on a small canvas then upscaled: the gradient is smooth by nature,
    so this is visually identical to a per-pixel loop and much faster.
    """
    sw, sh = 160, max(1, round(160 * h / w))
    small = Image.new("RGB", (sw, sh))
    px = small.load()
    rad = math.radians(angle)
    dx, dy = math.cos(rad), math.sin(rad)
    denom = max(1.0, abs(dx) * sw + abs(dy) * sh)
    for y in range(sh):
        for x in range(sw):
            t = min(1.0, max(0.0, (x * dx + y * dy) / denom))
            glow = 0.16 * max(0.0, 1.0 - math.hypot(x / sw - 0.72, y / sh - 0.24) * 1.9)
            px[x, y] = tuple(
                min(255, int(lerp(top[c], bottom[c], t) + glow * (ICE[c] - top[c])))
                for c in range(3)
            )
    return small.resize((w, h), Image.BICUBIC)


def blueprint(d: ImageDraw.ImageDraw, w: int, h: int, alpha: int = 30) -> None:
    """Faint technical grid, like a wireframe / system sketch."""
    step = max(28, w // 18)
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=(255, 255, 255, alpha), width=1)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=(255, 255, 255, alpha), width=1)


def deco(img: Image.Image, seed: int) -> None:
    """Abstract rings + circuit strokes so every placeholder is not identical."""
    d = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    cx, cy = int(w * (0.18 + 0.06 * (seed % 4))), int(h * (0.78 - 0.05 * (seed % 3)))
    r = int(min(w, h) * 0.38)
    for k in range(5):
        d.arc((cx - r, cy - r, cx + r, cy + r), 200 + k * 8, 300 + k * 8,
              fill=(255, 255, 255, 30 + k * 8), width=max(2, r // 90))
        r = int(r * 0.82)
    for k in range(3):
        x = int(w * (0.62 + k * 0.1))
        d.line([(x, int(h * 0.08)), (x + int(w * 0.06), int(h * 0.42)),
                (x - int(w * 0.02), int(h * 0.62))], fill=(208, 232, 255, 90), width=2)


def label(img: Image.Image, title: str, sub: str, small: bool = False) -> None:
    d = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    pad = int(min(w, h) * 0.07)
    scale = 1 if not small else 0.8
    t1 = font(FONT_HEAVY, max(16, int(min(w, h) * 0.115 * scale)))
    t2 = font(FONT_MONO, max(11, int(min(w, h) * 0.036 * scale)))
    d.rounded_rectangle((pad, pad, pad + int(min(w, h) * 0.09), pad + int(min(w, h) * 0.09)),
                        radius=8, fill=(10, 140, 255, 235))
    d.text((pad + int(min(w, h) * 0.028), pad + int(min(w, h) * 0.012)), "R",
           font=font(FONT_HEAVY, max(12, int(min(w, h) * 0.065 * scale))), fill=(255, 255, 255, 255))
    d.text((pad, h - pad - int(min(w, h) * 0.20)), title, font=t1, fill=(255, 255, 255, 245))
    d.text((pad, h - pad - int(min(w, h) * 0.055)), sub, font=t2, fill=(208, 232, 255, 230))
    d.rounded_rectangle((w - pad - int(w * 0.19), pad, w - pad, pad + int(min(w, h) * 0.055)),
                        radius=int(min(w, h) * 0.028), outline=(255, 255, 255, 120), width=2)
    d.text((w - pad - int(w * 0.175), pad + int(min(w, h) * 0.012)), "PLACEHOLDER",
           font=font(FONT_MONO, max(9, int(min(w, h) * 0.025 * scale))), fill=(255, 255, 255, 190))


def make_card(path: Path, w: int, h: int, title: str, sub: str, key: str, seed: int) -> None:
    top, bottom = PALETTES[key]
    img = gradient(w, h, top, bottom, 20 + (seed % 5) * 14)
    d = ImageDraw.Draw(img, "RGBA")
    blueprint(d, w, h)
    deco(img, seed)
    label(img, title, sub)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=88, optimize=True)


def build_works() -> None:
    """24 gradient cards for the 3D work tunnel, 8 per chapter."""
    out = ASSETS / "works"
    out.mkdir(parents=True, exist_ok=True)
    chapters = {
        "systems": ("SYSTEMS", ["QR LOGGING", "DASHBOARDS", "RECORDS", "REPORTS"]),
        "publishing": ("PUBLISHING", ["FLIPBOOKS", "PDF RENDER", "SUPABASE", "LAYOUTS"]),
        "portfolios": ("PORTFOLIOS", ["3D STORY", "LANDING", "REACT", "VITE"]),
    }
    ratios = [(900, 1200), (1100, 1100), (900, 1200), (1100, 900),
              (900, 1200), (1100, 1100), (900, 1200), (1100, 900)]
    manifest = {}
    for ci, (key, (name, words)) in enumerate(chapters.items()):
        items = []
        for i, (w, h) in enumerate(ratios):
            f = f"{key}-{i + 1:02d}.jpg"
            make_card(out / f, w, h, name, f"{words[i % 4]}  /  {i + 1:02d}",
                      key, ci * 8 + i)
            items.append({"f": f, "w": w, "h": h})
        manifest[key] = items
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")


def build_cases() -> None:
    for i, (slug, title, sub) in enumerate(CASES):
        key = "systems" if i < 3 else ("publishing" if i == 3 else "portfolios")
        folder = ASSETS / "cases" / slug
        folder.mkdir(parents=True, exist_ok=True)
        make_card(folder / "cover.webp", 1400, 1000, title, sub, key, i)
        for n in range(1, 4):
            make_card(folder / f"{n:02d}.webp", 1400, 900, title,
                      f"{sub}  /  VIEW {n:02d}", key, i * 3 + n + 20)


def build_ig() -> None:
    out = ASSETS / "ig"
    out.mkdir(parents=True, exist_ok=True)
    make_card(out / "avatar.jpg", 400, 400, "RJ", "RIGU3L", "neutral", 99)
    for i in range(1, 16):
        make_card(out / f"ig-{i:02d}.jpg", 600, 800, "WORK", f"TILE {i:02d}",
                  ["systems", "publishing", "portfolios"][i % 3], i + 40)


def _fit_line(text: str, path: str, box_w: int, box_h: int) -> Image.Image:
    """Render a word, crop to its ink, then scale it to fill a box (keeps aspect)."""
    f = font(path, 240)
    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    x0, y0, x1, y1 = probe.textbbox((0, 0), text, font=f)
    tile = Image.new("RGBA", (x1 - x0 + 12, y1 - y0 + 12), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((6 - x0, 6 - y0), text, font=f, fill=(255, 255, 255, 255))
    k = min(box_w / tile.width, box_h / tile.height)
    return tile.resize((max(1, round(tile.width * k)), max(1, round(tile.height * k))), Image.LANCZOS)


def build_logo() -> None:
    """Transparent white two-line wordmark filling the 720x477 reference canvas.

    The same PNG is the header mark, the CRT-screen overlay and the 3D neon
    texture, so it must be white-on-transparent and fill the whole frame (the
    reference 'hello / world' mark does exactly that).
    """
    w, h = 720, 477
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rj = _fit_line("RJ", FONT_HEAVY, w, 288)
    ve = _fit_line("VERCELES", FONT_HEAVY, w, h - 302)
    rj_x, rj_y = (w - rj.width) // 2, (288 - rj.height) // 2
    rj_ink = rj.getchannel("A").getbbox()          # real glyph edges, not font bearings
    img.alpha_composite(rj, (rj_x, rj_y))
    img.alpha_composite(ve, ((w - ve.width) // 2, 302 + ((h - 302) - ve.height) // 2))
    # The reference has a bold rule between the two words. "RJ" is narrower than
    # "hello" was, so the rule follows the *rendered* RJ ink: pinning it to x=0
    # left it jutting out to the left of the centred letters in the header.
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle((rj_x + rj_ink[0], 280, rj_x + rj_ink[2], 300), fill=(255, 255, 255, 255))
    img.save(ASSETS / "rj-logo.png")


def build_portrait() -> None:
    img = gradient(900, 900, INK, BLUE, 28)
    d = ImageDraw.Draw(img, "RGBA")
    blueprint(d, 900, 900)
    deco(img, 3)
    r = 250
    d.ellipse((450 - r, 400 - r, 450 + r, 400 + r), fill=(10, 140, 255, 55),
              outline=(208, 232, 255, 170), width=4)
    d.text((450, 400), "RJ", font=font(FONT_HEAVY, 230), fill=(255, 255, 255, 245), anchor="mm")
    d.text((450, 700), "PORTRAIT", font=font(FONT_MONO, 40), fill=(208, 232, 255, 235), anchor="mm")
    d.text((450, 752), "PLACEHOLDER", font=font(FONT_MONO, 26), fill=(208, 232, 255, 170), anchor="mm")
    img.save(ASSETS / "portrait.jpg", quality=90, optimize=True)


def build_meta() -> None:
    out = ASSETS / "meta"
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*"):
        f.unlink()

    og = gradient(1200, 630, INK, BLUE, 18)
    d = ImageDraw.Draw(og, "RGBA")
    blueprint(d, 1200, 630)
    deco(og, 7)
    d.text((70, 150), "RJ VERCELES", font=font(FONT_HEAVY, 112), fill=(255, 255, 255, 250))
    d.text((74, 290), "FULL STACK DEVELOPER & WEB DESIGNER",
           font=font(FONT_MONO, 30), fill=(208, 232, 255, 240))
    d.text((74, 350), "I don't decorate. I solve the task.",
           font=font(FONT_BOLD, 44), fill=(255, 255, 255, 235))
    d.text((74, 560), "OLONGAPO CITY, PHILIPPINES   /   OG IMAGE PLACEHOLDER",
           font=font(FONT_MONO, 22), fill=(208, 232, 255, 190))
    og.save(out / "og-placeholder.jpg", quality=90, optimize=True)

    icon = Image.new("RGB", (512, 512), INK)
    di = ImageDraw.Draw(icon, "RGBA")
    di.rounded_rectangle((0, 0, 512, 512), radius=96, fill=(31, 82, 246, 255))
    di.text((256, 250), "RJ", font=font(FONT_HEAVY, 250), fill=(255, 255, 255, 255), anchor="mm")
    di.rounded_rectangle((60, 420, 452, 434), radius=6, fill=(10, 140, 255, 255))
    icon.save(out / "icon-512.png")
    icon.resize((192, 192), Image.LANCZOS).save(out / "icon-192.png")
    icon.resize((180, 180), Image.LANCZOS).save(out / "apple-touch-icon.png")
    icon.resize((64, 64), Image.LANCZOS).save(out / "favicon-64.png")
    icon.resize((48, 48), Image.LANCZOS).save(ROOT / "favicon.ico", sizes=[(48, 48)])


def build_os_wallpapers() -> None:
    """Repaint the baked-in OS95/OS7 taskbar label 'hello_world' → 'rj_verceles'.

    The reference wallpapers carry the whole taskbar (and desktop icons) as
    pixels, so changing the HTML alone is not enough. Pristine originals live in
    tools/os-wallpaper-src/ so this patch is repeatable and never compounds.
    """
    src = Path(__file__).resolve().parent / "os-wallpaper-src"
    out = ASSETS / "os"
    out.mkdir(parents=True, exist_ok=True)
    for name in ("bg95.jpg", "bg95-en.jpg", "bg7.jpg", "bg7-en.jpg", "bg11.jpg"):
        im = Image.open(src / name).convert("RGB")
        if name.startswith("bg11"):
            im.save(out / name, quality=92)
            continue
        d = ImageDraw.Draw(im)
        x0, y0, x1, y1 = 180, 858, 320, 900
        if name.startswith("bg95"):
            # Original label: plain black Tahoma 24, sitting on a flat ~#bdbdbd
            # Win95 button. Reproduce those metrics so the swap reads as native.
            d.rectangle((x0, y0, x1, y1), fill=(189, 189, 189))
            d.text((188, 862), "rj_verceles", font=font(FONT_TASK95, 24), fill=(0, 0, 0))
        else:
            # OS7 button is a glass gradient whose shading is mostly vertical.
            # For every row, sample clean columns just outside the old label and
            # blend horizontally across the label area. Because each row keeps its
            # own brightness, the top highlight and bottom falloff survive intact
            # and no rectangular seam appears.
            px = im.load()

            def band(y: int, cols: range):
                vals = [px[x, y] for x in cols]
                return tuple(sum(c[i] for c in vals) / len(vals) for i in range(3))

            for y in range(y0, y1):
                a, b = band(y, range(170, 177)), band(y, range(326, 333))
                for x in range(x0, x1):
                    t = (x - 176) / (326 - 176)
                    px[x, y] = tuple(round(a[c] + (b[c] - a[c]) * t) for c in range(3))
            f = font(FONT_TASK7, 26)
            d.text((191, 858), "rj_verceles", font=f, fill=(20, 65, 105))
            d.text((190, 857), "rj_verceles", font=f, fill=(248, 252, 255))
        im.save(out / name, quality=92)


if __name__ == "__main__":
    build_logo()
    build_portrait()
    build_works()
    build_cases()
    build_ig()
    build_meta()
    build_os_wallpapers()
    print("placeholders written to", ASSETS)
