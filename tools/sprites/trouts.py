from fishkit import *
SP = {}
def salmonid(**kw):
    S = dict(depth=.25, deepest=.4, head=.22, ped=.1, SL=66, adipose=.79, scales=(3.0, 2.8, .2),
             dorsal=[dict(x=(.44, .59), h=.5, kind='trout')], anal=[dict(x=(.69, .8), h=.36, kind='trout')], pelvic=[dict(at=.52, h=.3)],
             pect=dict(len=.17, kind='point', ang=36, v=.5), tail=dict(kind='notch'), mouth=dict(reach=.62))
    S.update(kw); return S
BLK = '#141810'
SP['rainbow-trout'] = salmonid(seed=1, cols=('#4f6b4a', '#8fa08a', '#c9ced0', '#f2f2ee'), fin=('#56684a', '#8c9c7c'), lowfin=('#b98c7c', '#e6c4b4'),
    pose=dict(a=(84, 12), water='tail', lift=15, ox=2),
    marks=[M_stripe('#dc5a7c', .03, .2, (.2, .97), .9, 0), M_blush('#e07888', .16, .12, .05, .45, .7)],
    spots=[(120, (.3, .6), (.03, .99), (-1, -.05), BLK), (22, (.3, .5), (.25, .95), (0, .4), '#1a1e16')],
    tail=dict(kind='notch', tex=spotfin(26, 3, rad=.045)), eye=(2.5, '#e8c458'),
    dorsal=[dict(x=(.44, .59), h=.5, kind='trout', tex=spotfin(10, 4))], anal=[dict(x=(.69, .8), h=.36, kind='trout', lead=PALE)], pelvic=[dict(at=.52, h=.3, lead=PALE)])
SP['steelhead'] = salmonid(seed=10, depth=.215, deepest=.42, head=.2, ped=.09, SL=66, cols=('#3f5a6b', '#a9b8c2', '#dde3e6', '#ffffff'), fin=('#59656c', '#8b979e'), lowfin=('#8b979e', '#c9d2d8'),
    pose=dict(a=(96, 68), wig=14, water='tail', lift=12, ox=-4, power=1.25), gloss=.75,
    marks=[M_blush('#e6c4cc', .15, .1, .05, .4, .45), M_stripe('#e6c4cc', .02, .12, (.25, .9), .28)],
    spots=[(60, (.3, .58), (.05, .99), (-1, -.1), '#20242a')], tail=dict(kind='square', tex=spotfin(22, 5, '#20242a', .045)), eye=(2.5, '#d8dee2'),
    dorsal=[dict(x=(.44, .59), h=.45, kind='trout', tex=spotfin(8, 6, '#20242a'))], mouth=dict(reach=.6, open=(1.4, 1.8), inside='#f4f0ee'))
SP['brown-trout'] = salmonid(seed=3, depth=.24, head=.24, ped=.11, cols=('#5a4a2a', '#9a7b3a', '#d1a84c', '#f0e2b0'), fin=('#6e5a2c', '#a8843c'), lowfin=('#a8843c', '#d6b566'),
    pose=dict(a=(168, 196), wig=13, water='clear', lift=9, ex=70, power=.9), adipose_c=('#b85a26', '#d9652b'),
    spots=[(34, (.6, .95), (.04, .93), (-1, .2), '#1a1408'), (10, (.5, .75), (.3, .9), (.0, .45), '#c8382a')],
    tail=dict(kind='square'), eye=(2.5, '#d8b050'), mouth=dict(reach=.82), taper=(.9, .66, .4, .11),
    dorsal=[dict(x=(.44, .59), h=.5, kind='trout', tex=spotfin(9, 4, '#1a1408', .08))], anal=[dict(x=(.69, .8), h=.36, kind='trout', lead=PALE, lead2='#1a1408')])
SP['brook-trout'] = salmonid(seed=4, head=.25, cols=('#2e4030', '#4f6645', '#b8763a', '#e8662a'), fin=('#33452f', '#5c7350'), lowfin=('#c8451e', '#ee7a3c'),
    pose=dict(a=(-22, -70), water='head', sink=5, ox=-4), marks=[M_worm('#a9b36a', 2.4, (-1, -.2), (.1, 1), .8)],
    spots=[(30, (.5, .85), (.2, .95), (-.3, .3), '#d8d08a'), (9, (.45, .7), (.3, .92), (.0, .45), '#d62b2b')],
    tail=dict(kind='square', tex=barfin('#22301f', 5, .45, True)), eye=(2.5, '#d8c060'), mouth=dict(reach=.8),
    dorsal=[dict(x=(.44, .59), h=.5, kind='trout', tex=barfin('#a9b36a', 4, .5, True))],
    anal=[dict(x=(.69, .8), h=.4, kind='trout', lead='#ffffff', lead2='#111111')], pelvic=[dict(at=.52, h=.34, lead='#ffffff', lead2='#111111')],
    pect=dict(len=.18, kind='point', ang=40, v=.5, lead='#ffffff'))
SP['golden-trout'] = salmonid(seed=5, depth=.24, head=.23, SL=58, cols=('#6b6a2e', '#d9a21e', '#f2b81c', '#e8451e'), fin=('#8a7226', '#c8a23a'), lowfin=('#d8501c', '#f08a3c'),
    pose=dict(a=(152, 122), water='tail', lift=14, ox=-6),
    marks=[M_stripe('#c8281e', .05, .17, (.2, .78), .92), M_bars('#5a5f5a', 10, (.24, .96), (-.3, .32), .5, .62), M_blush('#e8451e', .15, .25, .06, .5, .8)],
    spots=[(34, (.5, .85), (.55, .99), (-1, -.15), '#1a1a1a')], tail=dict(kind='notch', tex=spotfin(24, 3, '#1a1a1a', .06)), eye=(3.0, '#e8b030'),
    dorsal=[dict(x=(.44, .59), h=.5, kind='trout', tex=spotfin(12, 4, '#1a1a1a', .08), lead='#fff6e0', rim='#e8641e', rimw=.12)],
    anal=[dict(x=(.69, .8), h=.36, kind='trout', lead='#ffffff')], pelvic=[dict(at=.52, h=.3, lead='#ffffff')])
SP['lahontan-cutthroat-trout'] = salmonid(seed=6, depth=.23, head=.25, SL=64, cols=('#5f6b4a', '#a8a27a', '#c9b98f', '#efead8'), fin=('#6e6844', '#9c8a5a'), lowfin=('#b07a5c', '#d8a688'),
    pose=dict(a=(100, 168), wig=20, water='tail', lift=13, ox=6, power=1.15), taper=(.9, .66, .4, .11),
    marks=[M_stripe('#d9a09a', .03, .16, (.22, .95), .5), M_blush('#d9908a', .17, .1, .05, .4, .55)],
    spots=[(70, (.6, .95), (.02, .99), (-1, .55), '#1c1c1c')], tail=dict(kind='notch', tex=spotfin(18, 3, '#1c1c1c', .06)), eye=(2.5, '#d8c070'),
    dorsal=[dict(x=(.44, .59), h=.45, kind='trout', tex=spotfin(9, 4, '#1c1c1c', .08))], mouth=dict(reach=.85, open=(1.6, 3.0), vc=.2),
    post=lambda f: (f.seg((1 - f.hl * .2, float(f.bot(1 - f.hl * .2)) * .82), (1 - f.hl * .72, float(f.bot(1 - f.hl * .72)) * .9), .8, None, '#e0401e')))
SP['lake-trout'] = salmonid(seed=7, depth=.21, deepest=.38, head=.26, ped=.075, SL=66, cols=('#3e4a44', '#5f6e66', '#9ba69e', '#ededE6'.lower()), fin=('#44504a', '#6c7a70'), lowfin=('#b06a34', '#d89858'),
    pose=dict(a=(198, 238), wig=8, water='head', sink=-1, ox=8), taper=(.9, .68, .42, .12),
    spots=[(120, (.5, .95), (.02, .99), (-1, .5), '#c9cdb8')], tail=dict(kind='deep', tex=spotfin(30, 3, '#c9cdb8', .05, .7)), eye=(2.5, '#c8c8a8'), mouth=dict(reach=.86),
    dorsal=[dict(x=(.44, .59), h=.5, kind='trout', tex=spotfin(14, 4, '#c9cdb8', .07, .7))], anal=[dict(x=(.69, .8), h=.36, kind='trout', lead='#ffffff')], pelvic=[dict(at=.52, h=.3, lead='#ffffff')])
def kype(f):   # the hooked jaw of a spawning male
    a = f.X(-.01, 1.2); b = f.X(.035, 4.2); f.cv.limb([f.X(.03, .6), a, b], 2.4, 1.2, '#4c5a32', seam=1)
SP['kokanee-salmon'] = salmonid(seed=8, depth=.3, deepest=.38, head=.27, ped=.08, SL=60, cols=('#8e1616', '#c8201e', '#d8382c', '#e0503c'), fin=('#4a5a30', '#6f8048'), lowfin=('#7a2a1c', '#b8503a'),
    pose=dict(a=(62, -18), water='clear', lift=17, ex=20, ox=2), adj_top=[(.36, 1.14)], taper=(.88, .7, .46, .16), scales=(3.0, 2.8, .14),
    marks=[M_block('#5a6b3a', -.05, .255, 1., sx=.02), M_tint('#d8d4c0', (0, .2), (.45, 1.2), .7, .04, .15), M_tint('#5a6b3a', (.93, 1.05), (-1.2, 1.2), .9, .03)],
    tail=dict(kind='deep', c=('#4a5a30', '#6f8048')), eye=(2.5, '#e0d8a0'), mouth=dict(reach=.8, open=(1.0, 2.2), vc=.3), anal=[dict(x=(.68, .81), h=.4, kind='trout')], post=kype)
SP['chinook-salmon'] = salmonid(seed=9, depth=.26, deepest=.42, head=.22, ped=.085, SL=66, cols=('#2f5a5a', '#9fb0b4', '#dadfe0', '#ffffff'), fin=('#4c5a5c', '#7a8a8c'), lowfin=('#7c8a8c', '#c4ccce'),
    pose=dict(a=(124, 204), water='clear', lift=15, ex=74, ox=2, power=1.2), gloss=.7,
    spots=[(46, (.6, 1.0), (.2, .98), (-1, -.12), '#161a1c')], tail=dict(kind='fork', fork=.22, tex=spotfin(26, 3, '#161a1c', .055)), eye=(2.5, '#d8dcd8'),
    dorsal=[dict(x=(.44, .59), h=.42, kind='trout', tex=spotfin(8, 4, '#161a1c', .08))], anal=[dict(x=(.68, .82), h=.36, kind='trout')], mouth=dict(reach=.78),
    post=lambda f: f.seg((1.0, float(f.bot(1)) * .3 + .3), (1 - f.hl * .78, float(f.bot(1 - f.hl * .78)) * .52), .7, .12))
