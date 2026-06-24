# -*- coding: utf-8 -*-
import os, sys
from collections import deque
from PIL import Image
import numpy as np

ROOT   = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC    = os.path.join(ROOT, 'MY LOGO.png')
ASSETS = os.path.join(ROOT, 'assets', 'images')

# ── Load source ──────────────────────────────────────────────────────────────
src = Image.open(SRC).convert('RGBA')
arr = np.array(src)
h, w = arr.shape[:2]
print('Source:', src.size)

# ── Remove outer white background via BFS flood-fill from corners ─────────────
# Only removes white pixels reachable from any corner edge — the inner white
# circle stays because it is not connected to the outer background.
is_white = np.all(arr[:,:,:3] >= 235, axis=2)

mask = np.zeros((h, w), dtype=bool)
queue = deque()
for sy, sx in [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1)]:
    if is_white[sy, sx] and not mask[sy, sx]:
        mask[sy, sx] = True
        queue.append((sy, sx))

while queue:
    y, x = queue.popleft()
    for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
        ny, nx = y+dy, x+dx
        if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and is_white[ny, nx]:
            mask[ny, nx] = True
            queue.append((ny, nx))

fg_arr = arr.copy()
fg_arr[mask, 3] = 0
logo_rgba = Image.fromarray(fg_arr, 'RGBA')

# Crop to tight bounding box of the mark
bbox = logo_rgba.getbbox()
mark = logo_rgba.crop(bbox)
print('Mark bbox:', bbox, '  mark size:', mark.size)

# ── Helper: paste mark centred on canvas ─────────────────────────────────────
def make_canvas(size, bg_rgba, mark_img, mark_max_px):
    """Create size×size canvas with bg, mark scaled to fit mark_max_px."""
    canvas = Image.new('RGBA', (size, size), bg_rgba)
    mw, mh = mark_img.size
    scale  = min(mark_max_px / mw, mark_max_px / mh)
    nw, nh = int(mw * scale), int(mh * scale)
    resized = mark_img.resize((nw, nh), Image.LANCZOS)
    px = (size - nw) // 2
    py = (size - nh) // 2
    canvas.paste(resized, (px, py), resized)
    return canvas

# ── 1. icon.png ── white bg, mark fills ~72% of 1024 ─────────────────────────
icon = make_canvas(1024, (255, 255, 255, 255), mark, 736)
icon.save(os.path.join(ASSETS, 'icon.png'))
print('Wrote: icon.png')

# ── 2. android-icon-foreground.png ── transparent bg, mark in safe zone (66%) ─
fg = make_canvas(1024, (0, 0, 0, 0), mark, 680)
fg.save(os.path.join(ASSETS, 'android-icon-foreground.png'), optimize=False)
print('Wrote: android-icon-foreground.png')

# ── 3. android-icon-background.png ── white ──────────────────────────────────
bg = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
bg.save(os.path.join(ASSETS, 'android-icon-background.png'))
print('Wrote: android-icon-background.png')

# ── 4. splash-icon.png ── same as icon ───────────────────────────────────────
icon.save(os.path.join(ASSETS, 'splash-icon.png'))
print('Wrote: splash-icon.png')

# ── 5. favicon.png ── 64x64 ──────────────────────────────────────────────────
fav = make_canvas(64, (255, 255, 255, 255), mark, 46)
fav.save(os.path.join(ASSETS, 'favicon.png'))
print('Wrote: favicon.png')

# ── 6. Delete clutter ─────────────────────────────────────────────────────────
for name in ['partial-react-logo.png','react-logo.png','react-logo@2x.png',
             'react-logo@3x.png','android-icon-monochrome.png']:
    path = os.path.join(ASSETS, name)
    if os.path.exists(path):
        os.remove(path)
        print('Deleted:', name)

print('Done.')
