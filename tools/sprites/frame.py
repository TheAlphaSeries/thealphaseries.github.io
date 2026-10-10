"""Draw ui/frame.png, the gold window frame (a nine-slice: corners, edges, empty middle) used by .win in site.css.

Drawn on a 14 x 14 plan, each pixel doubled, so the corners are 12 px and the edges 12 px thick on the page. From the
outside in, every edge is a black outline, a bright then a dark line of gold, a dark gap and a thin dim gold line;
each corner carries a small violet stone like the keeper's orbs, set in gold.

Run from the repository root:  python3 tools/sprites/frame.py
"""
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
N, S = 14, 6                      # the plan's size and the slice (corner) size, in plan pixels
K, G1, G2, G3, D = (6, 4, 8, 255), (240, 208, 112, 255), (200, 160, 64, 255), (138, 106, 32, 255), (20, 12, 20, 255)
V1, V2, V3 = (244, 234, 255, 255), (185, 140, 255, 255), (106, 58, 208, 255)


def main():
    im = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    p = im.load()
    rings = [K, G1, G2, D, G3]    # outermost first
    for i, c in enumerate(rings):
        for t in range(i, N - i):
            for x, y in ((t, i), (t, N - 1 - i), (i, t), (N - 1 - i, t)):
                p[x, y] = c
    for i in range(1, N - 1):     # light from the top left: the bright line is darker on the bottom and right
        for x, y in ((i, N - 2), (N - 2, i)):
            p[x, y] = G2
    for cx, cy in ((2, 2), (N - 3, 2), (2, N - 3), (N - 3, N - 3)):   # a stone set in each corner
        for dx, dy in ((0, -2), (-2, 0), (2, 0), (0, 2)):
            if 0 < cx + dx < N - 1 and 0 < cy + dy < N - 1:
                p[cx + dx, cy + dy] = G3
        for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            p[cx + dx, cy + dy] = G1 if dx + dy < 0 else G3
        for dx, dy in ((0, -1), (-1, 0)):
            p[cx + dx, cy + dy] = V2
        for dx, dy in ((1, 0), (0, 1)):
            p[cx + dx, cy + dy] = V3
        p[cx, cy] = V1
    im.resize((N * 2, N * 2), Image.NEAREST).save(os.path.join(ROOT, "ui", "frame.png"))
    print("wrote ui/frame.png; slice", S * 2, "px")


if __name__ == "__main__":
    main()
