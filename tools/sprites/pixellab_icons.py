"""Build icons.png (landmarks, medals, curiosities) and companions.png from the PixelLab art in art/raw.

icons.png: 32 x 32 cells, 8 to a row, in this order: the 24 landmarks (LANDMARKS), then the medals family by family
(MEDAL_FAMILIES) in bronze, silver, gold, then the 12 curiosities (ITEMS). 07-map.js, 08-status.js and figures.js
find a picture by its place in these lists, so keep them in step with ICON_LANDMARKS (07-map.js), MEDAL_ORDER
(08-status.js) and ITEM_ICONS (figures.js).

scene/: the fishing scene's pictures, copied as they are.

companions-walk.png: every figure's six-frame walk, one row each in the order of companions.png, the keeper last.

ui/menu-icons.png: the menu's pictures (art/raw/menu, 24 x 24), side by side in the order of MENU, which site.css
follows with --i on each command.

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
MENU = "log quests chronicle bestiary herbarium photos map status equipment shop about help music".split()
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


def walks():
    """companions-walk.png: each figure's walk (art/raw/companions/companion-*-walk.png, six 64 x 64 frames), one row each
    in the order of companions.png, and the keeper floating along (art/raw/keeper/keeper-float.png) as the last row"""
    rows = [os.path.join(ART, "companions", "companion-%s-%d-walk.png" % (c, i + 1)) for c in CALLINGS for i in range(5)]
    rows.append(os.path.join(ART, "keeper", "keeper-float.png"))
    sheet = Image.new("RGBA", (64 * 6, 64 * len(rows)), (0, 0, 0, 0))
    for r, f in enumerate(rows):
        if os.path.exists(f):
            sheet.paste(Image.open(f).convert("RGBA").crop((0, 0, 64 * 6, 64)), (0, r * 64))
        else:
            print("no walk yet:", os.path.basename(f))
    sheet.save(os.path.join(ROOT, "companions-walk.png"))
    print("wrote companions-walk.png")


def menu():
    sheet = Image.new("RGBA", (24 * len(MENU), 24), (0, 0, 0, 0))
    for i, n in enumerate(MENU):
        sheet.paste(Image.open(os.path.join(ART, "menu", "menu-" + n + ".png")).convert("RGBA"), (i * 24, 0))
    os.makedirs(os.path.join(ROOT, "ui"), exist_ok=True)
    sheet.save(os.path.join(ROOT, "ui", "menu-icons.png"))
    print("wrote ui/menu-icons.png", len(MENU), "pictures")


if __name__ == "__main__":
    menu()
    icons()
    companions()
    scene()
    walks()
