# Draws every picture and writes them where the website reads them.
#   python3 run.py                 draw everything, write ../../sprites.json and a preview, sheet.png
#   python3 run.py rainbow-trout   draw just the named ones into try.png (nothing on the site changes)
import sys, json, importlib, engine, fishkit
SP = {}
for m in ('trouts', 'fresh', 'salt', 'pelagic', 'inverts', 'plants'): SP.update(importlib.import_module(m).SP)
args = sys.argv[1:]
names = [k for k in SP if not args or any(a == k or a == k.replace('plant:', '') or a == SP[k].get('grp') for a in args)]
pxs = {k: (SP[k]['draw']() if 'draw' in SP[k] else fishkit.make_fish(SP[k])) for k in names}
engine.sheet(pxs, 'try.png' if args else 'sheet.png')
if not args:
    where = engine.atlas(pxs, '../../sprites.png')
    out = {'size': [engine.OUT, engine.OUT], 'sheet': 'sprites.png',
           # the fish drawn going in head first: the page animates these differently (they cannot leap up tail first)
           'divers': [k for k in SP if isinstance(SP[k].get('pose'), dict) and SP[k]['pose'].get('water') == 'head' and k in pxs],
           # where each picture is in the sheet: [column, row]
           'fish': {k: v for k, v in where.items() if not k.startswith('plant:')},
           # which picture stands in for a kind of creature that has no picture of its own
           'fishAlias': {'trout': 'rainbow-trout', 'fish': 'american-shad', 'flatfish': 'halibut', 'shark': 'leopard-shark', 'sturgeon': 'white-sturgeon', 'tuna': 'bluefin-tuna',
                         'ray': 'bat-ray', 'crab': 'dungeness-crab', 'lobster': 'california-spiny-lobster', 'squid': 'market-squid'},
           'plants': {k[6:]: v for k, v in where.items() if k.startswith('plant:')},
           'plantAlias': {'anthurium': 'queen-anthurium', 'gloriosum': 'philodendron-gloriosum', 'monstera': 'monstera-thai-constellation', 'orchid': 'howards-dream',
                          'bonsai': 'juniper', 'grove': 'maple-grove', 'plant': 'philodendron-gloriosum'}}
    json.dump(out, open('../../sprites.json', 'w'), separators=(',', ':'))
print(len(pxs), 'drawn')
