from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
public_dir = root / 'public'
android_res = root / 'android' / 'app' / 'src' / 'main' / 'res'

NAVY_1 = (20, 27, 43)
NAVY_3 = (8, 11, 18)
GOLD_1 = (241, 215, 122)
GOLD_2 = (212, 175, 55)
GOLD_3 = (180, 135, 42)


def make_bg(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    inset = int(size * 0.03)
    rect = (inset, inset, size - inset - 1, size - inset - 1)
    draw.rounded_rectangle(rect, radius=int(size * 0.22), fill=(16, 24, 35, 255))

    for y in range(size):
        t = y / max(1, size - 1)
        r = int(16 * (1 - t) + 9 * t)
        g = int(24 * (1 - t) + 12 * t)
        b = int(35 * (1 - t) + 18 * t)
        draw.line((0, y, size, y), fill=(r, g, b, 255))

    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((int(size * 0.40), int(size * 0.04), int(size * 1.06), int(size * 0.76)), fill=(212, 175, 55, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(20, size // 8)))
    img = Image.alpha_composite(img, glow)

    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(rect, radius=int(size * 0.22), fill=255)
    img.putalpha(mask)
    return img


def draw_m(img: Image.Image, size: int, line_width: int) -> None:
    draw = ImageDraw.Draw(img)
    pad = size * 0.18
    scale = (size - 2 * pad) / 290
    pts = [(110, 300), (110, 180), (182, 250), (256, 172), (330, 250), (402, 180), (402, 300)]
    mapped = [(pad + x * scale, pad + y * scale) for x, y in pts]

    for i, color in enumerate((GOLD_1, GOLD_2, GOLD_3)):
        draw.line(mapped, fill=color, width=max(8, line_width - i * 2), joint='curve')


def make_icon(size: int) -> Image.Image:
    img = make_bg(size)
    draw_m(img, size, max(20, int(size * 0.12)))
    return img


def make_foreground(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    inset = int(size * 0.04)
    bg_draw.rounded_rectangle((inset, inset, size - inset - 1, size - inset - 1), radius=int(size * 0.22), fill=(20, 27, 43, 255))
    img = Image.alpha_composite(img, bg)
    draw_m(img, size, max(16, int(size * 0.1)))
    return img


public_dir.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    make_icon(size).save(public_dir / f'icon-{size}.png')

mipmap_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}
for folder_name, size in mipmap_sizes.items():
    folder = android_res / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    make_icon(size).save(folder / 'ic_launcher.png')
    make_icon(size).save(folder / 'ic_launcher_round.png')
    make_foreground(size).save(folder / 'ic_launcher_foreground.png')

colors_path = android_res / 'values' / 'colors.xml'
colors_path.parent.mkdir(parents=True, exist_ok=True)

stale_color_file = colors_path.parent / 'ic_launcher_background.xml'
if stale_color_file.exists():
    stale_color_file.unlink()

colors_path.write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<resources>\n'
    '    <color name="ic_launcher_background">#0D1220</color>\n'
    '</resources>\n',
    encoding='utf-8',
)

print('Generated updated icon PNGs for public and Android.')
