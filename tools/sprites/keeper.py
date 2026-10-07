# The figure of Chris as a black-robed high mage: 41 x 58 pixels, five drawings. The orb is not in them: the page draws it, so it can fly.
# Run: python3 keeper.py   It writes keeper.json (the colours and frames, to paste into section 12 of index.html) and keeper.png (a preview).
# A tall three-tiered black hat with a jewel, black sunglasses, a long black robe with a high collar, a violet
# sash and gold trim, an orb floating over one hand and a staff in the other.
import json
from PIL import Image
W, H = 41, 58; OX, OY = 2, 6   # the figure is drawn 2 in from the left and 6 down, leaving room above for the lifted staff and the orb's flight
COL = {'o': '#3a3a4a',                                              # outline (lighter than the cloth so black reads on a dark page)
       'k': '#101016', 'K': '#24242e', 'j': '#34343f', 'u': '#07070a',   # black cloth: base, light, highlight, fold
       'g': '#040405', 'G': '#565664', 'r': '#22222a',               # sunglasses
       's': '#6e4429', 'd': '#523019', 'm': '#3a2012', 'l': '#87583a',   # skin
       'y': '#c8a040', 'Y': '#f0d070', 'z': '#8a6a20',               # gold trim
       'v': '#5a1e7a', 'V': '#8a3ab0', 'w': '#3a1250',               # violet sash and lining
       'b': '#3a2a1e', 'B': '#5a4230',                               # staff wood
       'x': '#08080a', 'X': '#3e3e4a',                               # boots
       'a': '#6a3ad0', 'A': '#b98cff', 'c': '#f4eaff', 'e': '#d8c0ff'}   # orb: outer, mid, core, sparks
def frame(staff_dy=0, flare=0, orb_y=None, orb_r=2, sparks=0):
    g = [['.'] * W for _ in range(H)]
    def px(x, y, ch):
        x += OX; y += OY
        if 0 <= x < W and 0 <= y < H: g[y][x] = ch
    def row(y, x0, x1, ch):
        for x in range(x0, x1 + 1): px(x, y, ch)
    def rect(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1): row(y, x0, x1, ch)
    C = 16   # the figure's centre is between columns 16 and 17
    # ---- boots: pointed toes showing under the hem
    row(50, 10, 14, 'x'); row(50, 19, 23, 'x'); px(9, 50, 'x'); px(24, 50, 'x'); px(10, 49, 'x'); px(23, 49, 'x'); px(11, 50, 'X'); px(22, 50, 'X')
    # ---- the robe: narrow at the shoulder, falling wide to the hem
    for y in range(24, 50):
        w = 8 if y < 27 else 8 + (y - 27) // 6 + (1 if y > 44 else 0)
        row(y, C - w + 1, C + w, 'k')
        px(C - w + 1, y, 'K'); px(C + w, y, 'u')
        if y > 28: px(C - w + 3, y, 'K' if y % 4 else 'k'); px(C + w - 2, y, 'u')
    for y in range(36, 49):                                    # long folds
        px(12, y, 'u'); px(21, y, 'u' if y % 5 else 'k'); px(14, y, 'K' if y % 3 == 0 else 'k')
    for y in range(26, 49): px(C, y, 'y' if y % 3 == 0 else 'z'); px(C + 1, y, 'u')      # gold braid down the front
    row(49, 6, 27, 'z'); [px(x, 49, 'Y') for x in range(7, 27, 3)]                          # hem
    rect(9, 34, 24, 35, 'v'); row(34, 9, 24, 'V'); px(9, 35, 'w'); px(24, 34, 'w'); px(24, 35, 'w')   # sash
    rect(15, 33, 18, 36, 'y'); px(16, 34, 'Y'); px(17, 35, 'z'); px(15, 33, 'Y')                      # its clasp
    rect(18, 36, 19, 41, 'v'); px(19, 41, 'w'); px(18, 42, 'V')                                       # the sash end hanging
    # mantle over the shoulders, and the high collar
    for y, x0, x1 in ((24, 7, 26), (25, 6, 27), (26, 6, 27), (27, 7, 26)): row(y, x0, x1, 'k')
    row(27, 7, 26, 'u'); row(24, 8, 25, 'K'); [px(x, 27, 'z') for x in range(8, 26, 2)]
    for y, xl in ((23, 9), (22, 8), (21, 8), (20, 7)): rect(xl, y, xl + 2, y, 'k'); rect(33 - xl - 2, y, 33 - xl, y, 'k'); px(xl + 2, y, 'w'); px(33 - xl - 2, y, 'w')
    px(7, 19, 'k'); px(26, 19, 'k')
    # ---- left arm (viewer's left): a bell sleeve, forearm out, palm up under the orb
    for y, x0, x1 in ((26, 4, 7), (27, 3, 7), (28, 2, 7), (29, 2, 7), (30, 2, 7), (31, 3, 7), (32, 4, 7), (33, 5, 7)): row(y, x0, x1, 'k')
    for y in range(28, 33): px(3, y, 'K')
    px(2, 30, 'u'); row(33, 5, 7, 'u'); px(4, 32, 'w'); px(3, 31, 'w')
    rect(3, 30, 5, 30, 's'); px(2, 30, 's'); px(6, 30, 'd'); px(2, 29, 's'); px(6, 29, 's'); px(4, 30, 'l')      # the cupped hand
    # ---- right arm: sleeve to the staff
    for y, x0, x1 in ((26, 26, 29), (27, 26, 30), (28, 26, 30), (29, 26, 30), (30, 26, 30), (31, 26, 30), (32, 26, 29), (33, 26, 28)): row(y + staff_dy // 2, x0, x1, 'k')
    for y in range(27, 32): px(30, y + staff_dy // 2, 'u')
    row(33 + staff_dy // 2, 26, 28, 'u'); px(27, 28 + staff_dy // 2, 'K')
    # ---- the staff: dark wood, gold bands, a claw at the top holding a stone
    sx, top = 31, 8 + staff_dy
    for y in range(top, 51 + min(0, staff_dy)): px(sx, y, 'B' if y % 2 else 'b'); px(sx + 1, y, 'b')
    for y in (top + 4, top + 5, 38 + staff_dy, 39 + staff_dy): row(y, sx, sx + 1, 'y'); px(sx, y, 'Y')
    for x, y in ((sx - 1, top - 1), (sx - 2, top - 2), (sx - 2, top - 3), (sx - 2, top - 4), (sx - 1, top - 5), (sx + 2, top - 1), (sx + 3, top - 2), (sx + 3, top - 3), (sx + 3, top - 4), (sx + 2, top - 5)): px(x, y, 'y')
    px(sx - 2, top - 4, 'Y'); row(top, sx - 1, sx + 2, 'z')
    rect(sx, top - 4, sx + 1, top - 2, 'A'); px(sx, top - 4, 'c'); px(sx + 1, top - 2, 'a')
    if flare: px(sx, top - 3, 'c'); px(sx + 1, top - 4, 'c'); px(sx - 4, top - 3, 'e'); px(sx + 5, top - 3, 'e'); px(sx, top - 7, 'e'); px(sx + 1, top - 7, 'e'); px(sx - 3, top - 6, 'e'); px(sx + 4, top - 6, 'e')
    hy = 30 + staff_dy // 2; rect(30, hy, 32, hy + 1, 's'); px(33, hy, 's'); px(30, hy + 1, 'd'); px(32, hy, 'l')          # the hand on the staff
    # ---- neck and head
    rect(15, 23, 18, 24, 'd'); px(15, 25, 'd'); px(18, 25, 'd'); row(25, 16, 17, 's')
    rect(11, 16, 22, 21, 's'); row(22, 12, 21, 's'); row(23, 13, 20, 's'); px(13, 23, 'd'); px(20, 23, 'd')
    for y in range(18, 22): px(11, y, 'd')
    px(22, 19, 'l'); px(21, 21, 'l'); px(10, 18, 's'); px(10, 19, 'd'); px(23, 18, 's'); px(23, 19, 'd')                      # ears
    px(16, 20, 'd'); px(17, 20, 'd'); px(17, 19, 'l')                                                                         # nose
    row(22, 15, 18, 'm'); px(19, 21, 'm')                                                                                     # a mouth with one corner up
    px(16, 23, 'k'); px(17, 23, 'k'); px(16, 24, 'k')                                                                         # a tuft of beard
    # ---- sunglasses
    row(17, 10, 23, 'g'); row(18, 10, 23, 'g'); row(19, 11, 15, 'g'); row(19, 18, 22, 'g'); px(16, 18, 'r'); px(17, 18, 'r'); px(10, 17, 'r'); px(23, 17, 'r')
    px(12, 17, 'G'); px(13, 17, 'G'); px(12, 18, 'r'); px(19, 17, 'G'); px(20, 18, 'r')
    # ---- the hat: a wide brim and three tiers, leaning a little, with a jewel
    row(16, 6, 27, 'k'); row(15, 5, 28, 'k'); row(14, 7, 26, 'k'); row(16, 6, 27, 'u'); px(5, 15, 'K'); px(6, 14, 'K'); row(14, 8, 14, 'K')
    for i, (x0, x1, y0, y1) in enumerate(((10, 23, 10, 13), (12, 22, 6, 9), (14, 21, 2, 5))):
        rect(x0, y0, x1, y1, 'k'); row(y1, x0 - 1, x1 + 1, 'k'); row(y1, x0 - 1, x1 + 1, 'u' if i else 'k')
        for y in range(y0, y1): px(x0, y, 'K'); px(x0 + 1, y, 'j' if y == y0 else 'K'); px(x1, y, 'u')
        row(y0, x0 + 1, x1 - 1, 'K')
    row(13, 9, 24, 'v'); row(13, 9, 12, 'V'); px(24, 13, 'w')                                                                 # the band
    rect(15, 11, 18, 13, 'y'); px(16, 12, 'A'); px(17, 12, 'a'); px(15, 11, 'Y'); px(16, 11, 'c' if flare else 'A')            # the jewel
    row(1, 16, 20, 'k'); px(21, 1, 'k'); px(22, 0, 'k'); px(21, 0, 'K')                                                        # the tip, bent
    # ---- the orb, floating over the open hand
    ox, oy = 4, orb_y if orb_y is not None else -99
    for y in range(oy - orb_r - 1, oy + orb_r + 2):
        for x in range(ox - orb_r - 1, ox + orb_r + 2):
            d = ((x - ox) ** 2 + (y - oy) ** 2) ** .5
            if d <= orb_r + .3: px(x, y, 'c' if d < orb_r - 1.2 or (x - ox == -1 and y - oy == -1) else 'A' if d < orb_r - .3 else 'a')
    for x, y in ((ox - orb_r - 2, oy - 1), (ox + orb_r + 2, oy + 1), (ox, oy - orb_r - 2))[:1 + sparks]: px(x, y, 'e')
    if sparks > 1: px(ox + 1, oy + orb_r + 2, 'e'); px(ox - 2, oy - orb_r - 2, 'e'); px(ox + orb_r + 3, oy - 2, 'e')
    # ---- outline
    glow = set('aAce'); out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.' and any(0 <= x + a < W and 0 <= y + b < H and g[y + b][x + a] not in '.e' for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                near = [g[y + b][x + a] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + a < W and 0 <= y + b < H and g[y + b][x + a] != '.']
                out[y][x] = 'w' if all(n in glow for n in near) else 'o'
    return [''.join(r) for r in out]
# standing; staff lifted; staff high; staff high with its stone flaring; standing with the stone flaring
frames = [frame(0, 0), frame(-3, 0), frame(-5, 0), frame(-5, 1), frame(0, 1)]
used = set(''.join(''.join(f) for f in frames)) - {'.'}
json.dump({'cols': {k: v for k, v in COL.items() if k in used or k in 'aAcew'}, 'frames': frames, 'hand': [4 + OX, 26 + OY], 'stone': [31 + OX, 5 + OY], 'head': [16 + OX, 19 + OY]}, open('keeper.json', 'w'))
sc = 7; im = Image.new('RGB', (len(frames) * (W * sc + 10) + 10, H * sc + 20), (10, 14, 60))
for i, f in enumerate(frames):
    for y, r in enumerate(f):
        for x, ch in enumerate(r):
            if ch != '.':
                c = tuple(int(COL[ch][k:k+2], 16) for k in (1, 3, 5))
                for yy in range(sc):
                    for xx in range(sc): im.putpixel((10 + i * (W * sc + 10) + x * sc + xx, 10 + y * sc + yy), c)
im.save('keeper.png'); print(len(frames[0]), len(frames[0][0]))
