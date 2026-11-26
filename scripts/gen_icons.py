"""Genera le icone dell'app (PNG) dal logo originale del gioco. Uso: uv run --with pillow python scripts/gen_icons.py"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

A, B, C = (255, 212, 90), (255, 61, 129), (139, 92, 255)  # oro, rosa, viola
BOLT = [(21.5, 6), (11, 22), (18, 22), (16.5, 34), (29, 17), (21.5, 17)]  # fulmine, in un riquadro 40x40


def lerp(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, ...]:
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b, strict=True))


def icona(size: int, maskable: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), (5, 4, 12, 255))
    grad = Image.new("RGBA", (size, size))
    px = grad.load()
    assert px is not None
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = (*(lerp(A, B, t / 0.5) if t < 0.5 else lerp(B, C, (t - 0.5) / 0.5)), 255)
    margine = int(size * (0.18 if maskable else 0.04))  # le icone "maskable" hanno più margine
    lato = size - 2 * margine
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (margine, margine, margine + lato, margine + lato), radius=int(lato * 0.27), fill=255
    )
    img.paste(grad, (0, 0), mask)
    k = lato / 40
    ImageDraw.Draw(img).polygon(
        [(margine + x * k, margine + y * k) for x, y in BOLT], fill=(11, 8, 24, 235)
    )
    return img


for nome, size, maskable in (
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, False),
):
    icona(size, maskable).save(OUT / nome)
    print("scritto", nome)
