"""Turn the Howard's Dream orchid's petals purple (art/raw/plants/plant-howards-dream*.png), in place.

The flowers sit in the top half of the picture, above the leaves and the pot. There every warm pixel (red, orange,
yellow) takes an orchid purple, keeping its light and shade; the red lip becomes a deeper magenta. In the wilted
version the same pixels (the petals the healthy one has, so not the browned leaves or stem) become a faded mauve. Run once, from the repository root:
python3 tools/sprites/orchid_purple.py
"""
import colorsys
import os

from PIL import Image

ART = os.path.join(os.path.dirname(__file__), "..", "..", "art", "raw", "plants")


def recolour(path, dead, petals):
    """petals: the set of (x, y) recoloured in the healthy picture; filled in when dead is False, used when True"""
    im = Image.open(path).convert("RGBA")
    p = im.load()
    for y in range(31):
        for x in range(im.width):
            r, g, b, a = p[x, y]
            if not a or (dead and (x, y) not in petals):
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            deg = h * 360
            if not dead and (s < .2 or l < .12 or not (deg < 58 or deg > 340)):
                continue
            if l < .12:
                continue                                   # the outline, the stems and the green buds stay
            if dead:
                h2, s2 = 300 / 360, min(s, .4) * .75
            elif deg < 18 or deg > 340:
                h2, s2, l = 322 / 360, min(1, s * 1.05), l * .92   # the lip
            else:
                h2, s2 = 282 / 360, min(1, s * .95)
            r2, g2, b2 = colorsys.hls_to_rgb(h2, l, s2)
            p[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
            if not dead:
                petals.add((x, y))
    im.save(path)


if __name__ == "__main__":
    petals = set()
    recolour(os.path.join(ART, "plant-howards-dream.png"), False, petals)
    recolour(os.path.join(ART, "plant-howards-dream-dead.png"), True, petals)
    print("orchid petals recoloured")
