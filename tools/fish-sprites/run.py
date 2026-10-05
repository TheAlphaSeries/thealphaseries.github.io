import sys, creatures, engine
names = sys.argv[1:] or list(creatures.KINDS)
pxs = {k: creatures.KINDS[k]() for k in names}
data = engine.export(pxs, 'fish.json' if not sys.argv[1:] else None)
engine.sheet(pxs, 'sheet.png' if not sys.argv[1:] else 'try.png', sc=8 if len(names) <= 2 else 4, cols=min(len(names), 5))
print({k: len(v['pal']) for k, v in data.items()})
