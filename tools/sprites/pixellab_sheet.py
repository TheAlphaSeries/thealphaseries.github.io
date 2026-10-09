"""Build sprites.png and sprites.json from the PixelLab art in art/raw.

This replaces the drawn sheet that run.py makes. Fish are 96 x 64, side view facing right; plants are 64 x 64 and are
centred in the same 96 x 64 cell. Under each fish a small splash is painted with alpha 254, which is how the page
(03-bestiary.js) tells water from creature: the leaping fish rises out of it.

Run from the repository root:  python3 tools/sprites/pixellab_sheet.py
"""
import json
import math
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ART = os.path.join(ROOT, "art", "raw")
W, H, COLS = 96, 64, 8
LINE = round(H * 88 / 96)   # the water's surface, as 03-bestiary.js reckons it

FISH = """rainbow-trout steelhead brown-trout brook-trout golden-trout lahontan-cutthroat-trout lake-trout kokanee-salmon
chinook-salmon bass smallmouth-bass spotted-bass striped-bass bluegill redear-sunfish sunfish
crappie catfish brown-bullhead common-carp american-shad sacramento-pikeminnow black-rockfish vermilion-rockfish
cabezon lingcod kelp-bass california-sheephead barred-surfperch redtail-surfperch jacksmelt pacific-sanddab
starry-flounder halibut pacific-mackerel pacific-bonito yellowtail bluefin-tuna white-seabass white-sturgeon
leopard-shark sevengill-shark bat-ray dungeness-crab red-rock-crab california-spiny-lobster signal-crayfish market-squid""".split()
PLANTS = "queen-anthurium philodendron-gloriosum monstera-thai-constellation howards-dream juniper grape maple-grove redwood-grove".split()
FISH_ALIAS = {"trout": "rainbow-trout", "fish": "american-shad", "flatfish": "halibut", "shark": "leopard-shark", "sturgeon": "white-sturgeon",
              "tuna": "bluefin-tuna", "ray": "bat-ray", "crab": "dungeness-crab", "lobster": "california-spiny-lobster", "squid": "market-squid"}
PLANT_ALIAS = {"anthurium": "queen-anthurium", "gloriosum": "philodendron-gloriosum", "monstera": "monstera-thai-constellation", "orchid": "howards-dream",
               "bonsai": "juniper", "grove": "maple-grove", "plant": "philodendron-gloriosum"}

WATER = [(0x15, 0x0a, 0x0e), (0x34, 0x1a, 0x1c), (0x4e, 0x1c, 0x22), (0x70, 0x30, 0x28), (0xce, 0x54, 0x32)]


def splash(cell, cx, width):
    """a low crown of dark water with a few droplets, centred under the fish, painted only where the cell is empty"""
    p = cell.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H and p[x, y][3] == 0:
            p[x, y] = c + (254,)

    rx = max(8, width // 3)
    for a in range(0, 360, 2):   # the ring where the water parts
        t = math.radians(a)
        put(round(cx + rx * math.cos(t)), round(LINE + 2 * math.sin(t)), WATER[2] if math.sin(t) < 0 else WATER[1])
    for x in range(cx - rx + 1, cx + rx):
        put(x, LINE, WATER[0])
    for i, dx in enumerate((-rx, -rx // 2, rx // 2, rx)):   # spikes and droplets thrown up
        x = cx + dx
        for k in range(3 if i in (1, 2) else 2):
            put(x, LINE - 2 - k, WATER[3])
        put(x, LINE - 5 - (i % 2), WATER[4])


def main():
    sheet = Image.new("RGBA", (W * COLS, H * math.ceil((len(FISH) + 2 * len(PLANTS)) / COLS)), (0, 0, 0, 0))
    out = {"size": [W, H], "sheet": "sprites.png", "divers": [], "fish": {}, "fishAlias": FISH_ALIAS, "plants": {}, "plantAlias": PLANT_ALIAS}
    n = 0

    def place(img, key, group):
        nonlocal n
        col, row = n % COLS, n // COLS
        sheet.paste(img, (col * W, row * H))
        out[group][key] = [col, row]
        n += 1

    for name in FISH:
        src = Image.open(os.path.join(ART, "fish", "fish-" + name + ".png")).convert("RGBA")
        cell = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cell.alpha_composite(src.crop((0, 0, W, H)))
        px = cell.load()
        for y in range(H):   # the creature is fully solid; anything half-solid is made solid so the page reads it as creature
            for x in range(W):
                if 0 < px[x, y][3] < 255:
                    px[x, y] = px[x, y][:3] + (255,)
        box = cell.getchannel("A").getbbox()
        splash(cell, (box[0] + box[2]) // 2, box[2] - box[0])
        place(cell, name, "fish")
    for name in PLANTS:
        for suffix in ("", "-dead"):
            src = Image.open(os.path.join(ART, "plants", "plant-" + name + suffix + ".png")).convert("RGBA")
            cell = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            cell.alpha_composite(src, ((W - src.width) // 2, H - src.height))
            place(cell, name + ("~dead" if suffix else ""), "plants")
    sheet.save(os.path.join(ROOT, "sprites.png"))
    with open(os.path.join(ROOT, "sprites.json"), "w") as f:
        json.dump(out, f)
    print("wrote", n, "pictures")


if __name__ == "__main__":
    main()
