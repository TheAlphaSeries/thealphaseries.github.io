# The figure of Chris: a high mage in black. 41 x 58 pixels, six drawings.
# Run: python3 keeper.py   It writes keeper.json (the colours and frames, to paste into section 12 of index.html) and keeper.png (a preview).
# A tall lean figure in a deep peaked hood. Nothing of the face shows but three eyes burning in the dark: two, and a
# third above them. A layered mantle edged in gold over a long black robe that narrows at the waist and falls ragged
# to the ground, a violet sash with a hanging tabard, a long drooping sleeve on the arm held out under the orb, and
# a tall staff with a crescent head in the other hand. The orb itself is not drawn here: the page paints it, so
# that it can fly.
import json
from PIL import Image
W, H = 41, 58; OX, OY = 2, 6   # the figure is drawn 2 in from the left and 6 down, leaving room above for the lifted staff and the orb's flight
COL = {'o': '#3a3a4a',                                              # outline (lighter than the cloth so black reads on a dark page)
       'k': '#101016', 'K': '#24242e', 'j': '#383844', 'u': '#07070a', 'g': '#030304',   # black cloth: base, light, highlight, fold, and the dark inside the hood
       's': '#6e4429', 'd': '#523019', 'l': '#87583a',               # skin (the hands)
       'y': '#c8a040', 'Y': '#f0d070', 'z': '#8a6a20',               # gold
       'v': '#5a1e7a', 'V': '#8a3ab0', 'w': '#3a1250',               # violet
       'b': '#3a2a1e', 'B': '#5a4230',                               # staff wood
       'x': '#08080a', 'X': '#3e3e4a',                               # boots
       'a': '#6a3ad0', 'A': '#b98cff', 'c': '#f4eaff', 'e': '#d8c0ff'}   # the glow of the eyes, the stone and the orb: deep, mid, core, sparks
def frame(staff_dy=0, flare=0, eyes=1):
    g = [['.'] * W for _ in range(H)]
    def px(x, y, ch):
        x += OX; y += OY
        if 0 <= x < W and 0 <= y < H: g[y][x] = ch
    def row(y, x0, x1, ch):
        for x in range(x0, x1 + 1): px(x, y, ch)
    def rect(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1): row(y, x0, x1, ch)
    # ---- boots: long pointed toes under the hem
    row(51, 9, 14, 'x'); row(51, 19, 24, 'x'); px(8, 51, 'x'); px(25, 51, 'x'); px(10, 50, 'x'); px(23, 50, 'x'); px(10, 51, 'X'); px(23, 51, 'X')
    # ---- the robe: close at the waist, widening to a ragged hem
    half = {y: (5 if y < 33 else 5 + (y - 32) // 3) for y in range(27, 51)}      # half-width at each row
    for y in range(27, 51):
        w = min(half[y], 11); row(y, 17 - w, 16 + w, 'k'); px(17 - w, y, 'K'); px(16 + w, y, 'u')
        if y > 34: px(17 - w + 2, y, 'K' if y % 3 else 'k'); px(16 + w - 2, y, 'u')
    for x in (6, 9, 13, 20, 24, 27): px(x, 50, '.'); px(x, 49, 'u')            # tatters
    for x in (7, 11, 22, 26): px(x, 50, 'u')
    for y in range(37, 50): px(11, y, 'u'); px(22, y, 'u' if y % 4 else 'k'); px(9, y, 'K' if y % 5 == 0 else 'k')     # long folds
    # the front panel: a strip of violet-black down the middle, edged in gold, with small gold signs
    for y in range(28, 50): row(y, 15, 18, 'w'); px(14, y, 'z'); px(19, y, 'z')
    for y in range(29, 49, 4): px(14, y, 'Y')
    for y, pat in ((30, '.zz.'), (31, 'z..z'), (32, '.zz.'), (39, '.z..'), (40, '.zz.'), (41, '..z.'), (45, 'z..z'), (46, '.zz.'), (47, '.z..')):
        for i, ch in enumerate(pat):
            if ch != '.': px(15 + i, y, ch)
    # the sash, its knot, and the tabard hanging from it
    rect(11, 34, 22, 35, 'v'); row(34, 11, 22, 'V'); px(22, 34, 'w'); px(22, 35, 'w'); px(11, 35, 'w')
    rect(15, 33, 18, 36, 'y'); px(15, 33, 'Y'); px(16, 34, 'Y'); px(18, 36, 'z'); px(17, 35, 'a'); px(16, 35, 'A')
    rect(19, 36, 21, 42, 'v'); px(19, 36, 'V'); px(19, 37, 'V'); px(21, 42, '.'); px(21, 41, 'w'); px(20, 43, 'w'); px(19, 43, 'v'); px(20, 40, 'y')
    # ---- the mantle: two layers over the shoulders, each edged in gold, rising to points
    for y, x0, x1 in ((23, 9, 24), (24, 7, 26), (25, 6, 27), (26, 6, 27), (27, 7, 26), (28, 8, 25), (29, 10, 23)): row(y, x0, x1, 'k')
    px(5, 24, 'k'); px(28, 24, 'k'); px(4, 23, 'k'); px(29, 23, 'k'); px(5, 23, 'K'); px(28, 23, 'u')                   # the shoulder points
    row(24, 8, 14, 'K'); px(7, 25, 'K'); px(6, 25, 'j'); px(8, 24, 'j'); row(26, 21, 26, 'u')
    for x in range(6, 28): px(x, 27 if 7 < x < 26 else 26, 'z')
    for x in range(8, 26, 3): px(x, 27, 'Y')
    for x in range(10, 24): px(x, 29, 'z')
    px(16, 29, 'Y'); px(17, 29, 'Y'); row(28, 9, 24, 'u'); row(28, 9, 13, 'k')
    rect(15, 24, 18, 26, 'y'); px(15, 24, 'Y'); px(16, 25, 'A'); px(17, 25, 'a'); px(18, 26, 'z')                        # the clasp, set with a stone
    # ---- left arm (viewer's left): held out, palm up, with a long sleeve hanging from it
    for y, x0, x1 in ((27, 3, 7), (28, 2, 8), (29, 1, 8), (30, 1, 8), (31, 2, 8), (32, 3, 8), (33, 4, 8), (34, 5, 8), (35, 5, 8), (36, 6, 8), (37, 6, 8), (38, 7, 8), (39, 7, 8)): row(y, x0, x1, 'k')
    for y in range(29, 33): px(2 if y < 31 else 3, y, 'K')
    for y in range(33, 40): px(8, y, 'u')
    px(4, 33, 'w'); px(5, 34, 'w'); px(5, 35, 'v'); px(6, 36, 'v'); px(6, 37, 'w'); px(7, 39, 'z'); px(7, 38, 'z'); px(3, 32, 'z'); px(2, 31, 'z'); px(1, 30, 'z')   # its lining and gold hem
    rect(1, 28, 4, 28, 's'); px(0, 28, 's'); px(0, 27, 's'); px(4, 27, 's'); px(5, 28, 'd'); px(2, 28, 'l'); px(1, 27, 'd')      # the open hand
    # ---- right arm: the sleeve drawn up to the hand on the staff
    sh = staff_dy // 2
    for y, x0, x1 in ((27, 26, 29), (28, 25, 30), (29, 25, 30), (30, 25, 30), (31, 25, 30), (32, 25, 30), (33, 26, 29), (34, 26, 28)): row(y + sh, x0, x1, 'k')
    for y in range(28, 33): px(30, y + sh, 'u')
    px(26, 29 + sh, 'K'); px(26, 30 + sh, 'K'); row(34 + sh, 26, 28, 'z'); px(29, 33 + sh, 'z')
    # ---- the staff: dark wood bound in gold, a crescent at its head cradling a stone
    sx, top = 31, 9 + staff_dy
    for y in range(top, 52 + min(0, staff_dy)): px(sx, y, 'B' if y % 2 else 'b'); px(sx + 1, y, 'b')
    for y in (top + 3, top + 4, top + 13, 40 + staff_dy, 41 + staff_dy): row(y, sx, sx + 1, 'y'); px(sx, y, 'Y')
    px(sx, 51 + min(0, staff_dy), 'z'); px(sx + 1, 51 + min(0, staff_dy), 'z')
    for x, y in ((sx - 1, top - 1), (sx - 2, top - 2), (sx - 3, top - 3), (sx - 3, top - 4), (sx - 3, top - 5), (sx - 2, top - 6), (sx - 1, top - 7), (sx + 2, top - 1), (sx + 3, top - 2), (sx + 4, top - 3), (sx + 4, top - 4), (sx + 4, top - 5), (sx + 3, top - 6), (sx + 2, top - 7)): px(x, y, 'y')
    for x, y in ((sx - 3, top - 4), (sx - 2, top - 6), (sx - 1, top - 7)): px(x, y, 'Y')
    px(sx + 4, top - 3, 'z'); row(top, sx - 1, sx + 2, 'z'); row(top + 1, sx, sx + 1, 'y')
    rect(sx, top - 5, sx + 1, top - 3, 'A'); px(sx, top - 5, 'c'); px(sx + 1, top - 3, 'a'); px(sx - 1, top - 4, 'a'); px(sx + 2, top - 4, 'a')
    if flare:
        rect(sx, top - 5, sx + 1, top - 3, 'c'); px(sx - 1, top - 4, 'A'); px(sx + 2, top - 4, 'A')
        for x, y in ((sx - 5, top - 4), (sx + 6, top - 4), (sx, top - 9), (sx + 1, top - 9), (sx - 4, top - 8), (sx + 5, top - 8), (sx - 5, top - 1), (sx + 6, top - 1)): px(x, y, 'e')
    hy = 30 + sh; rect(30, hy, 32, hy + 1, 's'); px(33, hy, 's'); px(33, hy + 1, 'd'); px(30, hy + 1, 'd'); px(31, hy, 'l')          # the hand on the staff
    # ---- the hood: tall and peaked, its tip fallen back, deep enough to keep its own night
    for y, x0, x1 in ((6, 16, 18), (7, 14, 19), (8, 13, 20), (9, 12, 21), (10, 11, 22), (11, 10, 23), (12, 10, 23), (13, 9, 24), (14, 9, 24), (15, 9, 24), (16, 9, 24), (17, 9, 24), (18, 9, 24), (19, 9, 24), (20, 10, 23), (21, 10, 23), (22, 11, 22)): row(y, x0, x1, 'k')
    px(18, 5, 'k'); px(19, 5, 'k'); px(20, 4, 'k'); px(21, 4, 'k'); px(22, 5, 'k'); px(19, 4, 'K'); px(21, 5, 'u')                 # the tip
    for x, y in ((15, 7), (14, 8), (13, 9), (12, 10), (11, 11), (11, 12), (10, 13), (10, 14), (10, 15), (10, 16), (16, 6), (14, 9), (13, 10)): px(x, y, 'K')
    for x, y in ((15, 8), (13, 11), (12, 12), (11, 14)): px(x, y, 'j')
    for x, y in ((20, 8), (21, 9), (22, 10), (23, 12), (23, 13), (24, 15), (24, 16), (24, 17), (24, 18), (23, 20), (22, 22)): px(x, y, 'u')
    for y in range(7, 12): px(17, y, 'u' if y % 2 else 'k')                                                                        # the seam over the crown
    # the opening: a tall arch of dark, rimmed in violet
    for y, x0, x1 in ((12, 15, 18), (13, 13, 20), (14, 12, 21), (15, 12, 21), (16, 11, 22), (17, 11, 22), (18, 11, 22), (19, 11, 22), (20, 12, 21), (21, 13, 20), (22, 14, 19)): row(y, x0, x1, 'g')
    for x, y in ((14, 12), (19, 12), (12, 13), (21, 13), (11, 14), (22, 14), (11, 15), (22, 15), (10, 16), (23, 16), (10, 17), (23, 17), (10, 18), (23, 18), (10, 19), (23, 19), (11, 20), (22, 20), (12, 21), (21, 21), (13, 22), (20, 22)): px(x, y, 'v')
    for x, y in ((15, 11), (16, 11), (17, 11), (18, 11), (14, 12), (12, 13), (11, 14), (11, 15), (10, 16)): px(x, y, 'V')
    for x, y in ((22, 14), (23, 16), (23, 17), (23, 18), (23, 19), (22, 20), (21, 21)): px(x, y, 'w')
    # ---- three eyes in the dark: two, and a third above and between
    if eyes:
        hot = 'c' if (flare or eyes > 1) else 'A'
        for ex, ey, slant in ((13, 18, -1), (19, 18, 1), (16, 15, 0)):
            px(ex, ey, 'c'); px(ex + 1, ey, 'c'); px(ex - 1, ey, 'A' if slant >= 0 else 'a'); px(ex + 2, ey, 'A' if slant <= 0 else 'a')
            px(ex if slant <= 0 else ex + 1, ey - 1, hot if slant == 0 else 'A'); px(ex + 1 if slant <= 0 else ex, ey - 1, hot if slant == 0 else 'a')
            if slant == 0: px(ex, ey + 1, 'A'); px(ex + 1, ey + 1, 'A'); px(ex - 1, ey, 'A'); px(ex + 2, ey, 'A')            # the third stands upright
            if hot == 'c': px(ex - 2 if slant < 0 else ex + 3, ey - (1 if slant else 0), 'a')
    else:
        for ex, ey in ((13, 18), (19, 18)): px(ex, ey, 'a'); px(ex + 1, ey, 'a')                                                # shut: three dim lines
        px(16, 15, 'a'); px(17, 15, 'a')
    # ---- outline
    glow = set('aAce'); out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.' and any(0 <= x + a < W and 0 <= y + b < H and g[y + b][x + a] not in '.e' for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                near = [g[y + b][x + a] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < W and 0 <= y + b < H and g[y + b][x + a] != '.']
                out[y][x] = 'w' if all(n in glow for n in near) else 'o'
    return [''.join(r) for r in out]
# standing; staff lifted; staff high; staff high, its stone and the eyes flaring; standing, flaring; standing with the eyes shut (a blink)
frames = [frame(0, 0), frame(-3, 0), frame(-5, 0), frame(-5, 1), frame(0, 1), frame(0, 0, 0)]
used = set(''.join(''.join(f) for f in frames)) - {'.'}
json.dump({'cols': {k: v for k, v in COL.items() if k in used or k in 'aAcew'}, 'frames': frames, 'hand': [2 + OX, 23 + OY], 'stone': [31 + OX, 5 + OY], 'head': [16 + OX, 16 + OY]}, open('keeper.json', 'w'))
sc = 7; im = Image.new('RGB', (len(frames) * (W * sc + 10) + 10, H * sc + 20), (10, 14, 60))
for i, f in enumerate(frames):
    for y, r in enumerate(f):
        for x, ch in enumerate(r):
            if ch != '.':
                c = tuple(int(COL[ch][k:k+2], 16) for k in (1, 3, 5))
                for yy in range(sc):
                    for xx in range(sc): im.putpixel((10 + i * (W * sc + 10) + x * sc + xx, 10 + y * sc + yy), c)
im.save('keeper.png'); print(len(frames[0]), len(frames[0][0]))
