# Draws og.png, the picture shown when the site is shared in a message: the keeper under the dying sun, and the name.
# Run: python3 og.py (after keeper.py, which writes keeper.json). Writes ../../og.png, 1200 x 630.
import json, math
from PIL import Image, ImageDraw
W, H = 1200, 630
k = json.load(open('keeper.json')); cols = k['cols']; rows = [list(r) for r in k['frames'][0]]
def doubled(g):   # round off the stair-steps, as the page does
    h, w = len(g), len(g[0]); at = lambda x, y: g[y][x] if 0 <= y < h and 0 <= x < w else '.'; out = [[None] * (w * 2) for _ in range(h * 2)]
    for y in range(h):
        for x in range(w):
            P, A, B, C, D = g[y][x], at(x, y - 1), at(x + 1, y), at(x - 1, y), at(x, y + 1)
            out[y*2][x*2] = A if (C == A and C != D and A != B) else P; out[y*2][x*2+1] = B if (A == B and A != C and B != D) else P
            out[y*2+1][x*2] = C if (D == C and D != B and C != A) else P; out[y*2+1][x*2+1] = D if (B == D and B != A and D != C) else P
    return out
big = doubled(doubled(rows)); fh, fw = len(big), len(big[0]); sc = 2   # 45x58 -> 180x232 -> drawn at 2x = 360x464
im = Image.new('RGB', (W, H), (12, 6, 8)); d = ImageDraw.Draw(im)
import random; rnd = random.Random(4)
for _ in range(140): x, y = rnd.randrange(W), rnd.randrange(H); d.rectangle([x, y, x + rnd.choice((2, 2, 3)), y + rnd.choice((2, 2, 3))], fill=(246, 234, 210) if rnd.random() < .6 else (196, 168, 138))
# the old sun, low on the right, with its dark places and a rust along the bottom
for r, a in ((230, .10), (190, .16), (160, .25)):
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(glow).ellipse([980 - r, 300 - r, 980 + r, 300 + r], fill=(190, 50, 30, int(255 * a))); im.paste(Image.alpha_composite(im.convert('RGBA'), glow).convert('RGB'))
d = ImageDraw.Draw(im); d.ellipse([980 - 120, 300 - 120, 980 + 120, 300 + 120], fill=(176, 46, 32)); d.ellipse([980 - 112, 300 - 112, 980 + 24, 300 + 24], fill=(206, 84, 50)); d.ellipse([980 - 120, 300 - 120, 980 + 120, 300 + 120], outline=(112, 22, 24), width=6)
for (ax, ay, s) in ((-40, -10, 18), (30, 36, 13), (12, -54, 9), (-18, 60, 8), (60, -18, 7)): d.ellipse([980 + ax - s * 1.3, 300 + ay - s, 980 + ax + s * 1.3, 300 + ay + s], fill=(60, 10, 14))
rust = Image.new('RGBA', (W, H), (0, 0, 0, 0)); rd = ImageDraw.Draw(rust)
for y in range(H // 2, H): rd.line([0, y, W, y], fill=(150, 52, 20, int(90 * (y - H // 2) / (H // 2))))
im = Image.alpha_composite(im.convert('RGBA'), rust).convert('RGB'); d = ImageDraw.Draw(im)
# the figure
ox, oy = 110, (H - fh * sc) // 2
for y in range(fh):
    for x in range(fw):
        ch = big[y][x]
        if ch in cols: c = cols[ch]; d.rectangle([ox + x * sc, oy + y * sc, ox + x * sc + sc - 1, oy + y * sc + sc - 1], fill=tuple(int(c[i:i+2], 16) for i in (1, 3, 5)))
# the orb over his hand
hx, hy = ox + (k['hand'][0] * 4 + 2) * sc, oy + (k['hand'][1] * 4 + 2) * sc
for r, col in ((40, (106, 58, 208)), (30, (185, 140, 255)), (16, (244, 234, 255))): d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=col)
for a in range(4): sx, sy = hx + 62 * math.cos(a * 1.57 + .5), hy + 62 * math.sin(a * 1.57 + .5); d.rectangle([sx - 3, sy - 9, sx + 3, sy + 9], fill=(216, 192, 255)); d.rectangle([sx - 9, sy - 3, sx + 9, sy + 3], fill=(216, 192, 255))
# the name, in a small pixel alphabet of its own (the site's font is not to hand here)
FONT = {'H': ["#...#", "#...#", "#####", "#...#", "#...#", "#...#", "#...#"], 'A': [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], 'L': ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
        'F': ["#####", "#....", "#....", "####.", "#....", "#....", "#...."], 'I': ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"], 'E': ["#####", "#....", "#....", "####.", "#....", "#....", "#####"], ' ': ["....."] * 7}
def word(text, x, y, px, col):
    for ch in text:
        for j, row in enumerate(FONT[ch]):
            for i, c in enumerate(row):
                if c == '#': d.rectangle([x + i * px, y + j * px, x + i * px + px - 1, y + j * px + px - 1], fill=col)
        x += 6 * px
word("HALF LIFE", 560, 186, 11, (10, 10, 20)); word("HALF LIFE", 554, 180, 11, (246, 242, 255))
d.rectangle([554, 286, 554 + 9 * 6 * 11 - 11, 290], fill=(255, 210, 87))
from PIL import ImageFont
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 30); f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 24)
d.text((556, 318), "Still receiving...", font=f, fill=(230, 211, 176))
im.save('../../og.png', optimize=True); print(im.size)
