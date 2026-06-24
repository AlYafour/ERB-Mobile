"""
Al Yafour ERP - Professional Launcher Icon Generator
Design: Three rising pillars (ERP modules / construction) with a gold unity bar.
Visible, high-contrast, bold on dark wallpaper.
"""
from PIL import Image, ImageDraw, ImageFilter
import os

SIZE = 1024
NAVY  = (11,  31,  51)   # #0B1F33 per v2 spec
WHITE = (255, 255, 255)
GOLD  = (200, 162,  74)  # #C8A24A per v2 spec

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'images')
os.makedirs(OUT_DIR, exist_ok=True)


def draw_rounded_rect(draw, x0, y0, x1, y1, r, fill):
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
    for cx, cy in [(x0, y0), (x1-2*r, y0), (x0, y1-2*r), (x1-2*r, y1-2*r)]:
        draw.ellipse([cx, cy, cx+2*r, cy+2*r], fill=fill)


def make_icon(size=1024, transparent_bg=False):
    if transparent_bg:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    else:
        img = Image.new('RGBA', (size, size), NAVY + (255,))

    draw = ImageDraw.Draw(img)

    PAD    = int(size * 0.20)
    W      = size - 2 * PAD
    BOTTOM = int(size * 0.77)

    BAR_COUNT = 3
    BAR_GAP   = int(W * 0.055)
    BAR_W     = (W - BAR_GAP * (BAR_COUNT - 1)) // BAR_COUNT
    CORNER_R  = max(6, BAR_W // 10)

    HEIGHTS = [int(H * W) for H in [0.44, 0.70, 0.56]]

    bar_rects = []
    x = PAD
    for h in HEIGHTS:
        top  = BOTTOM - h
        rect = (x, top, x + BAR_W, BOTTOM)
        bar_rects.append(rect)

        shadow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow_img)
        draw_rounded_rect(s_draw, rect[0]+4, rect[1]+8, rect[2]+4, rect[3]+4,
                          CORNER_R, (0, 0, 0, 60))
        shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(10))
        img = Image.alpha_composite(img, shadow_img)
        draw = ImageDraw.Draw(img)

        draw_rounded_rect(draw, rect[0], rect[1], rect[2], rect[3],
                          CORNER_R, WHITE)
        x += BAR_W + BAR_GAP

    gold_y  = bar_rects[0][1]
    gold_h  = max(16, int(size * 0.019))
    gold_r  = gold_h // 2
    draw_rounded_rect(draw,
                      PAD,          gold_y - gold_h // 2,
                      PAD + W,      gold_y + gold_h // 2,
                      gold_r, GOLD)

    hi_img  = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    h_draw  = ImageDraw.Draw(hi_img)
    cx_rect = bar_rects[1]
    hi_h    = int(BAR_W * 0.30)
    h_draw.rectangle([cx_rect[0], cx_rect[1],
                      cx_rect[2], cx_rect[1] + hi_h],
                     fill=(255, 255, 255, 25))
    img = Image.alpha_composite(img, hi_img)

    return img


# 1. Main icon 1024x1024
icon = make_icon(1024).convert('RGB')
icon.save(os.path.join(OUT_DIR, 'icon.png'))
print("OK  icon.png 1024x1024")

# 2. Splash icon 512x512
splash = make_icon(512).convert('RGB')
splash.save(os.path.join(OUT_DIR, 'splash-icon.png'))
print("OK  splash-icon.png 512x512")

# 3. Android adaptive foreground (mark on transparent bg)
fg = make_icon(1024, transparent_bg=True)
fg.save(os.path.join(OUT_DIR, 'android-icon-foreground.png'))
print("OK  android-icon-foreground.png (RGBA)")

# 4. Android adaptive background (solid navy)
bg_img = Image.new('RGB', (1024, 1024), NAVY)
bg_img.save(os.path.join(OUT_DIR, 'android-icon-background.png'))
print("OK  android-icon-background.png (navy)")

print("\nAll icons generated successfully.")
