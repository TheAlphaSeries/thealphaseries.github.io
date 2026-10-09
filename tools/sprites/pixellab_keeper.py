"""Build keeper.png, the six drawings of the keeper used by site/10-figure.js, from the PixelLab art in art/raw/keeper.

Each drawing is cut to the 50 x 58 plan the page was built around (shown four times the size), mirrored so the open
hand is on the left and the staff on the right as the page expects, with the orbs taken out: the page paints the
three orbs itself so that they can move. The six sit side by side in the order of FIGURE in 10-figure.js.

Run from the repository root:  python3 tools/sprites/pixellab_keeper.py
"""
import os

from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KEEPER = os.path.join(ROOT, "art", "raw", "keeper")
PW, PH = 50, 58          # the plan
CROP = (6, 3, 56, 61)    # where the plan sits in a 64 x 64 frame (wide enough for the staff when he casts)

# FIGURE: stand, lift, high, highFlare, standFlare, blink -> (strip, frame)
POSES = [("idle", 0), ("cast", 1), ("cast", 2), ("cast", 3), ("cast", 4), ("idle", 0)]
BLINK = 5   # PixelLab's blink never shuts the eyes, so this one is the standing pose with the eyes put out by hand


def frame(strip, i):
    im = Image.open(os.path.join(KEEPER, "keeper-" + strip + ".png")).convert("RGBA")
    return im.crop((i * 64, 0, i * 64 + 64, 64))


def no_orbs(im):
    """clear the glowing orbs over the open hand (right of the hood, above the hand)"""
    p = im.load()
    for y in range(0, 30):
        for x in range(40, 64):
            r, g, b, a = p[x, y]
            if a and ((b > 140 and r > 110 and b > g + 30) or (r > 200 and b > 200 and g > 150)):
                p[x, y] = (0, 0, 0, 0)
    return im


def shut_eyes(im):
    """darken the three glowing eyes inside the hood"""
    p = im.load()
    for y in range(6, 24):
        for x in range(20, 40):
            r, g, b, a = p[x, y]
            if a and b > 90 and b > g + 25 and r > 60:
                p[x, y] = (12, 8, 18, 255)
    return im


def main():
    sheet = Image.new("RGBA", (PW * len(POSES), PH), (0, 0, 0, 0))
    for n, (strip, i) in enumerate(POSES):
        im = no_orbs(frame(strip, i))
        if n == BLINK:
            im = shut_eyes(im)
        im = ImageOps.mirror(im.crop(CROP))
        sheet.paste(im, (n * PW, 0))
    sheet.save(os.path.join(ROOT, "keeper.png"))
    print("wrote keeper.png", sheet.size)


if __name__ == "__main__":
    main()
