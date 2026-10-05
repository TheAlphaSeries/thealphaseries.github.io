from fishkit import *
SP = {}
def perchlike(**kw):
    S = dict(SL=64, tail=dict(kind='notch'), scales=(3.4, 3.1, .26), pect=dict(len=.16, kind='round', ang=32, v=.4)); S.update(kw); return S
def cheekbars(f, col='#3a2f18'):
    for a, b in ((.05, -1.5), (.07, .8), (.06, 3.0)):
        t0 = 1 - f.hl * .58; f.seg((t0, -float(f.top(t0)) * .15 + b * .4), (t0 - f.hl * .3, b * 1.6), .5, None, col)
SP['bass'] = perchlike(seed=4, depth=.29, head=.33, ped=.12, belly=.55, cols=('#2f4a2a', '#5c7a3a', '#b9c28a', '#f2f0e0'), fin=('#3a4c2a', '#7c8c54'), lowfin=('#6a7a48', '#b9c492'),
    pose=dict(a=(92, 26), wig=14, water='tail', lift=14, ox=0, power=1.2), taper=(.94, .78, .56, .24),
    marks=[M_mottle('#1d2f15', 7, .58, (-1, -.2), (.1, 1), .5, 2), M_stripe('#121a0e', .02, .16, (.1, .98), .95, .36)],
    dorsal=[dict(x=(.4, .6), h=.35, kind='spiny'), dict(x=(.62, .8), h=.46, kind='soft')], anal=[dict(x=(.66, .8), h=.4, kind='soft')], pelvic=[dict(at=.4, h=.3, lead=PALE)],
    mouth=dict(reach=.72, open=(2.8, 3.8), vc=.3), eye=(2.5, '#e0a02c'), eye_v=.42)
SP['smallmouth-bass'] = perchlike(seed=11, depth=.27, head=.31, ped=.12, cols=('#4a3f22', '#7a6230', '#a88e55', '#e6ddc0'), fin=('#4e4222', '#8a7440'), lowfin=('#7a6636', '#b8a468'),
    pose=dict(a=(128, 150), wig=-16, water='tail', lift=13, ox=6, power=1.1), taper=(.92, .72, .48, .18),
    marks=[M_bars('#33290f', 10, (.3, .93), (-.8, .5), .5, .6, wob=.5)],
    dorsal=[dict(x=(.4, .61), h=.28, kind='spiny'), dict(x=(.6, .8), h=.42, kind='soft')], anal=[dict(x=(.66, .8), h=.38, kind='soft')], pelvic=[dict(at=.4, h=.3)],
    mouth=dict(reach=.52), eye=(2.5, '#c8452a'), post=cheekbars)
SP['spotted-bass'] = perchlike(seed=12, depth=.26, head=.31, ped=.11, cols=('#33502c', '#6a8440', '#c8cc98', '#f4f2e2'), fin=('#3c5030', '#7e9054'), lowfin=('#6c7c4c', '#bcc696'),
    pose=dict(a=(-78, -96), water='head', sink=-1, ox=2), taper=(.92, .72, .48, .18),
    marks=[M_mottle('#1f2b1b', 4.5, .56, (-1, -.2), (.1, 1), .6, 2), M_bars('#1a2417', 9, (.28, .97), (-.2, .22), .62, .95), M_dotrows('#3a4630', (.36, .5, .64, .78), 3.2, .06, (.3, .92), .85)],
    dorsal=[dict(x=(.4, .61), h=.32, kind='spiny'), dict(x=(.6, .8), h=.42, kind='soft')], anal=[dict(x=(.66, .8), h=.38, kind='soft')], pelvic=[dict(at=.4, h=.3)],
    mouth=dict(reach=.5), eye=(2.5, '#d8902c'))
SP['striped-bass'] = perchlike(seed=13, SL=70, depth=.27, deepest=.38, head=.3, ped=.1, cols=('#2e4a4a', '#8fa3a0', '#d5dcda', '#fafaf5'), fin=('#4a5a58', '#7e8f8c'), lowfin=('#8a9896', '#d0d8d6'),
    pose=dict(a=(10, -8), wig=10, water='clear', lift=17, ex=20, power=1.15), gloss=.65, taper=(.9, .68, .42, .13),
    marks=[M_lines('#182020', (-.66, -.48, -.3, -.12, .06, .24, .4), .045, (.28, .985), .95)],
    dorsal=[dict(x=(.36, .55), h=.44, kind='spiny'), dict(x=(.58, .78), h=.38, kind='trout')], anal=[dict(x=(.64, .78), h=.36, kind='trout')], pelvic=[dict(at=.38, h=.28)],
    tail=dict(kind='fork'), pect=dict(len=.14, kind='point', ang=34, v=.4), mouth=dict(reach=.5, open=(1.2, 1.8)), eye=(2.5, '#d8d8c8'))
def disc(**kw):
    S = dict(SL=56, ped=.14, flat=1.9, tail=dict(kind='notch', len=.2, spread=.15), scales=(3.4, 3.2, .26), eye=(3.0, '#c8a040'), mouth=dict(reach=.24), taper=(.86, .6, .34, .11)); S.update(kw); return S
SP['bluegill'] = disc(seed=14, depth=.48, deepest=.42, head=.31, cols=('#2f4a3a', '#4f6e4a', '#b58a3c', '#e0862a'), fin=('#33443a', '#66785e'), lowfin=('#5a5a3a', '#a09a5a'),
    pose=dict(a=(176, 150), water='tail', lift=13, ox=-10),
    marks=[M_bars('#22302a', 7, (.33, .93), (-1, .25), .5, .6), M_tint('#e0862a', (.2, .62), (.45, 1.2), .9, .08, .2), M_tint('#3f6fb0', (0, .3), (.2, 1.2), .85, .04, .2)],
    dorsal=[dict(x=(.36, .61), h=.25, kind='spiny'), dict(x=(.6, .82), h=.36, kind='fan', tex=blotfin('#101410'))], anal=[dict(x=(.6, .82), h=.32, kind='soft')], pelvic=[dict(at=.38, h=.24, lead=PALE)],
    pect=dict(len=.3, kind='point', ang=24, v=.25, c=('#8a8a4a', '#d2cc86')), post=lambda f: earflap(f, f.hl + .012, .1, 2.8, 2.4))
SP['redear-sunfish'] = disc(seed=15, depth=.45, deepest=.42, head=.33, cols=('#55602e', '#8e9448', '#c9be6a', '#e8c84a'), fin=('#5a6032', '#8e9050'), lowfin=('#8a8644', '#c8c078'),
    pose=dict(a=(214, 240), water='head', sink=-3, ox=6), taper=(.86, .58, .3, .09),
    marks=[M_bars('#454a22', 7, (.36, .93), (-1, .3), .45, .4), M_speck('#5a5030', 2.2, .62, (-1, .6), (.3, 1), .6)],
    dorsal=[dict(x=(.37, .61), h=.25, kind='spiny'), dict(x=(.6, .82), h=.34, kind='fan')], anal=[dict(x=(.6, .82), h=.3, kind='soft')], pelvic=[dict(at=.38, h=.24)],
    pect=dict(len=.33, kind='point', ang=22, v=.25, c=('#9a9650', '#d8d290')), post=lambda f: earflap(f, f.hl + .008, .1, 2.4, 2.2, '#141414', None, '#e02a1e'))
def green(f):
    earflap(f, f.hl + .008, .12, 2.4, 2.2, '#101010', '#f0d070')
    for i, vv in enumerate((-.6, .8, 2.2)):   # turquoise squiggles across the cheek
        pts = [(1 - f.hl * (.12 + k * .16), vv + (1.0 if (k + i) % 2 else 0)) for k in range(5)]
        for a, b in zip(pts, pts[1:]): f.seg(a, b, .45, None, '#3fb0c0')
SP['sunfish'] = disc(seed=2, SL=60, depth=.39, deepest=.42, head=.36, ped=.15, cols=('#2c4038', '#3f6a5a', '#8e9a4a', '#e0c860'), fin=('#2e3c30', '#55665a'), lowfin=('#4c5838', '#8c9460'),
    pose=dict(a=(30, 6), water='clear', lift=13, ex=20, power=1.2), taper=(.92, .72, .5, .2),
    marks=[M_speck('#48c0c0', 1.7, .66, (-.9, .5), (.36, .97), .7, 3), M_bars('#23332c', 8, (.38, .93), (-1, .2), .45, .4)],
    dorsal=[dict(x=(.4, .62), h=.26, kind='spiny', rim='#f0b040', rimw=.16), dict(x=(.61, .82), h=.36, kind='fan', tex=blotfin('#0e120e'), rim='#f0b040', rimw=.14)],
    anal=[dict(x=(.62, .82), h=.32, kind='soft', tex=blotfin('#0e120e'), rim='#f0b040', rimw=.16)], pelvic=[dict(at=.4, h=.24, rim='#f0d070', rimw=.2)],
    tail=dict(kind='notch', len=.2, spread=.15, rim='#f0b040', rimw=.1), pect=dict(len=.2, kind='round', ang=30, v=.3, c=('#5c6a44', '#a8b07c')),
    mouth=dict(reach=.5, open=(2.2, 3.0), vc=.3), eye=(3.0, '#c8782c'), post=green)
SP['crappie'] = disc(seed=3, SL=60, depth=.44, deepest=.45, head=.34, ped=.13, cols=('#2e3a30', '#8c9a8a', '#c8d0c4', '#eef0e8'), fin=('#59644e', '#b3bca4'), lowfin=('#7c866c', '#ccd2c0'),
    pose=dict(a=(64, 84), water='tail', lift=12, ox=-4), adj_top=[(.19, .8)], taper=(.86, .62, .36, .12),
    marks=[M_mottle('#0c100c', 3.2, .6, (-1, .2), (.3, .96), .75, 4, .05, 1.1), M_speck('#0c100c', 1.8, .66, (-1, .7), (.3, .97), .85)],
    dorsal=[dict(x=(.42, .82), h=.44, kind='fan', serr=.1, tex=spotfin(30, 8, '#161a12', .075, .8))], anal=[dict(x=(.48, .82), h=.44, kind='fan', tex=spotfin(26, 9, '#161a12', .08, .8))],
    pelvic=[dict(at=.4, h=.26, lead=PALE)], tail=dict(kind='notch', len=.2, spread=.15, tex=spotfin(20, 9, '#161a12', .06, .75)), pect=dict(len=.2, kind='round', ang=30, v=.3),
    mouth=dict(reach=.55, pos='superior'), eye=(3.0, '#dccb7a'))
def cat_barbels(dark='#20262c', pale='#e6e0cc', long_=.2):
    def post(f):
        L = long_ * f.SL
        barbel(f, .035, 1, [(.0, L * .25), (.06, L * .6), (.16, L * .8)], dark); barbel(f, .03, -1, [(-.03, L * .3), (-.05, L * .6)], dark)
        f.cv.line([f.X(.04, .5), f.X(-.05, -L * .25), f.X(-.1, -L * .62)], dark, late=True)
        for a in (.07, .1): barbel(f, a, 1, [(.0, L * .2), (.02, L * .42)], pale)
    return post
def catlike(**kw):
    S = dict(SL=68, scales=None, gloss=.75, flat=1.4, belly=.55, taper=(.98, .86, .66, .36), adipose=.75, mouth=dict(reach=.3, pos='inferior'), eye=(2.5, '#cfc7a2'), eye_v=.5, eye_x=None, cheek=False, gillb=.03)
    S.update(kw); S['eye_x'] = S['head'] * .36; return S
SP['catfish'] = catlike(seed=5, depth=.2, deepest=.3, head=.24, ped=.08, cols=('#4a545a', '#6e7a80', '#aeb6b8', '#f2f2ee'), fin=('#3c444a', '#70787c'), lowfin=('#5c6468', '#a4abae'),
    pose=dict(a=(124, 58), wig=30, water='tail', lift=14, ox=2),
    marks=[M_mottle('#2a3238', 5, .6, (-1, .0), (0, 1), .35, 6)], spots=[(26, (.5, .9), (.25, .92), (-.8, .3), '#101416')],
    dorsal=[dict(x=(.3, .4), h=.85, kind='trout', rays=5)], anal=[dict(x=(.58, .8), h=.5, kind='even', rim='#1a1e22', rimw=.12)], pelvic=[dict(at=.48, h=.34)],
    pect=dict(len=.15, kind='point', ang=40, v=.75), tail=dict(kind='deep', rim='#1a1e22', rimw=.06), post=cat_barbels())
SP['brown-bullhead'] = catlike(seed=16, SL=62, depth=.23, deepest=.3, head=.27, ped=.11, cols=('#3a2e1a', '#6a5428', '#9a8444', '#eae0b0'), fin=('#2a241a', '#4e4226'), lowfin=('#3a3020', '#6a5a34'),
    pose=dict(a=(192, 160), wig=26, water='clear', lift=11, ex=74, power=.9),
    marks=[M_mottle('#201810', 5, .52, (-1, .45), (0, 1), .8, 6, .08)],
    dorsal=[dict(x=(.32, .42), h=.7, kind='trout', rays=5)], anal=[dict(x=(.58, .78), h=.42, kind='even')], pelvic=[dict(at=.48, h=.3)],
    pect=dict(len=.15, kind='point', ang=40, v=.75), tail=dict(kind='square', fork=.08), mouth=dict(reach=.3, pos='terminal'), post=cat_barbels('#1a1610', '#1e1a14', .24))
def carp_barbels(f):
    for a, L in ((.03, 3.0), (.065, 4.4)): barbel(f, a, 1, [(.01, L * .5), (.03, L)], '#8a6a30')
SP['common-carp'] = perchlike(seed=17, SL=64, depth=.33, deepest=.4, head=.27, ped=.13, belly=.47, cols=('#4a4022', '#8a7230', '#c0a050', '#ead890'), fin=('#463e26', '#6e6238'), lowfin=('#a85a26', '#d88a48'),
    pose=dict(a=(104, 142), water='tail', lift=14, ox=6, power=1.25), taper=(.9, .7, .48, .22), scales=None,
    marks=[M_net('#3a3018', 4.6, 4.2, .6, (-1, .75), (.27, .99))],
    dorsal=[dict(x=(.42, .85), h=.4, kind='low', rays=14)], anal=[dict(x=(.72, .81), h=.34, kind='trout')], pelvic=[dict(at=.45, h=.3)],
    pect=dict(len=.17, kind='round', ang=38, v=.7), tail=dict(kind='fork', c=('#a85a26', '#d88a48')), mouth=dict(reach=.22, pos='inferior'), eye=(2.5, '#d8b848'), post=carp_barbels)
def shad_spots(f):
    for i in range(6):
        x = f.hl + .03 + i * .058; t = 1 - x; rad = 1.5 - i * .17
        f.shade(np.clip((rad - np.hypot(f.u - t * f.sp.len, f.v + float(f.top(t)) * .34)) * 1.6 + .5, 0, 1), col='#1e2a30')
SP['american-shad'] = perchlike(seed=18, SL=62, depth=.33, deepest=.4, head=.25, ped=.08, belly=.56, cols=('#2e5a66', '#a8bec2', '#e0e6e6', '#fafafa'), fin=('#7e9692', '#b8c8b8'), lowfin=('#a8b8b0', '#dfe6e0'),
    pose=dict(a=(136, 22), water='clear', lift=10, ex=74, ox=0, power=1.1), gloss=.85, scales=(3.6, 3.2, .2),
    dorsal=[dict(x=(.42, .56), h=.36, kind='tri')], anal=[dict(x=(.72, .86), h=.16, kind='low')], pelvic=[dict(at=.48, h=.22)],
    pect=dict(len=.15, kind='point', ang=44, v=.7), tail=dict(kind='deep', rim='#3a4a4e', rimw=.08), mouth=dict(reach=.55), eye=(3.0, '#e0e4dc'), post=shad_spots)
SP['sacramento-pikeminnow'] = perchlike(seed=19, SL=72, depth=.19, deepest=.45, head=.29, ped=.08, cols=('#4a4a2a', '#7a7440', '#c0a850', '#e8cc6a'), fin=('#5a5230', '#8a7a48'), lowfin=('#8a7a40', '#c8a858'),
    pose=dict(a=(30, 26), water='tail', lift=12, ox=0), taper=(.88, .62, .42, .2), scales=(2.4, 2.2, .14),
    dorsal=[dict(x=(.55, .66), h=.75, kind='tri')], anal=[dict(x=(.72, .82), h=.55, kind='tri')], pelvic=[dict(at=.52, h=.4)],
    pect=dict(len=.13, kind='point', ang=44, v=.75), tail=dict(kind='deep', c=('#8a5a2c', '#c8803c')), mouth=dict(reach=.6, open=(1.8, 2.6), vc=.2), eye=(2.5, '#d8c060'))
