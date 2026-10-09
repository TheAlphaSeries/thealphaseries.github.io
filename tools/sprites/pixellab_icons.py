"""Build icons.png (landmarks, medals, curiosities) and companions.png from the PixelLab art in art/raw.

icons.png: 32 x 32 cells, 8 to a row, in this order: the 24 landmarks (LANDMARKS), then the medals family by family
(MEDAL_FAMILIES) in bronze, silver, gold, then the 12 curiosities (ITEMS). 07-map.js, 08-status.js and figures.js
find a picture by its place in these lists, so keep them in step with ICON_LANDMARKS (07-map.js), MEDAL_ORDER
(08-status.js) and ITEM_ICONS (figures.js).

scene/: the fishing scene's pictures, copied as they are.

companions.png: 64 x 64 cells, one row per calling in the order of CALLINGS in figures.js, five figures to a row in
the order of ART_KINDS there.

Run from the repository root:  python3 tools/sprites/pixellab_icons.py
"""
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ART = os.path.join(ROOT, "art", "raw")
LANDMARKS = ("pagoda tower obelisk skyline bridge peak pillars cave museum dome house lantern buddha boat cablecar tram "
             "tree panda lake cathedral carousel cup note gem").split()
MEDAL_FAMILIES = "fish map plant quest company log level".split()
ITEMS = "lamp map bottle coin key compass ring whistle book tooth mirror egg".split()
CALLINGS = ("wanderer knight mage rogue ranger cleric bard alchemist angler lamplighter porter cartographer cook boatman monk "
            "berserker necromancer merchant gardener smith paladin witch duelist hermit").split()


def icons():
    files = [os.path.join(ART, "landmarks", "landmark-" + n + ".png") for n in LANDMARKS]
    files += [os.path.join(ART, "medals", "medal-%s-%s.png" % (f, m)) for f in MEDAL_FAMILIES for m in ("bronze", "silver", "gold")]
    files += [os.path.join(ART, "items", "item-" + n + ".png") for n in ITEMS]
    cols = 8
    sheet = Image.new("RGBA", (32 * cols, 32 * ((len(files) + cols - 1) // cols)), (0, 0, 0, 0))
    for i, f in enumerate(files):
        sheet.paste(Image.open(f).convert("RGBA"), ((i % cols) * 32, (i // cols) * 32))
    sheet.save(os.path.join(ROOT, "icons.png"))
    print("wrote icons.png", len(files), "pictures")


def companions():
    sheet = Image.new("RGBA", (64 * 5, 64 * len(CALLINGS)), (0, 0, 0, 0))
    for r, c in enumerate(CALLINGS):
        for i in range(5):
            sheet.paste(Image.open(os.path.join(ART, "companions", "companion-%s-%d.png" % (c, i + 1))).convert("RGBA"), (i * 64, r * 64))
    sheet.save(os.path.join(ROOT, "companions.png"))
    print("wrote companions.png", 5 * len(CALLINGS), "figures")


def scene():
    """the fishing scene's five pictures, copied out of art/raw (which is not published) into scene/"""
    import shutil
    os.makedirs(os.path.join(ROOT, "scene"), exist_ok=True)
    for n in ("lake", "water", "pier", "float", "splash"):
        shutil.copyfile(os.path.join(ART, "fishing", "fish-scene-" + n + ".png"), os.path.join(ROOT, "scene", n + ".png"))
    print("copied the fishing scene into scene/")


if __name__ == "__main__":
    icons()
    companions()
    scene()
