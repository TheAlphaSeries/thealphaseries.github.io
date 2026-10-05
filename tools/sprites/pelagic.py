from fishkit import *
SP = {}
def flat(**kw):
    S = dict(SL=58, flat=3.2, ambient=.72, diffuse=.4, gloss=.18, scales=(2.6, 2.4, .12), cheek=False, gillb=.03, nostril=False, pelvic=[], eye_v=.5); S.update(kw); return S
def second_eye(x, v, rad=3.3, iris='#c9b25a', socket='#3a3020'):
    def post(f):
        xx, yy = f.X(x, v * float(f.top(1 - x)) if v < 0 else v * float(f.bot(1 - x))); f.cv.eye(xx, yy, rad, iris=iris, socket=socket)
    return post
def arch_line(f, k=2.2, at=.34, w=.09, base=.3, f_=.6):   # a flatfish's lateral line, arched over the pectoral fin
    line = np.abs(f.v - (-k * np.exp(-(((1 - f.t) - at) / w) ** 2) * 2.2 + base)) < .5; f.shade(line & (f.t > .08) & (f.t < 1 - f.hl * .9), f=f_)
def halibut_post(f): second_eye(.085, .05)(f); arch_line(f); teeth(f, 4)
H = '#5e5740'
SP['halibut'] = flat(seed=31, SL=62, fat=.5, depth=.49, deepest=.45, head=.27, ped=.1, cols=('#4a4630', '#5a5a3c', '#63583c', '#5a5236'), fin=('#4a4530', '#7a7250'), lowfin=('#4a4530', '#7a7250'),
    pose=dict(a=(112, 136), water='tail', lift=13, ox=4, power=1.2), taper=(.86, .62, .4, .16),
    marks=[M_mottle('#3a3626', 6, .55, (-1.2, 1.2), (0, 1), .7, 1), M_speck('#b8ad8a', 2.6, .66, (-1.2, 1.2), (0, 1), .8, 4), M_speck('#2a261a', 3.2, .7, (-1.2, 1.2), (0, 1), .7, 8)],
    dorsal=[dict(x=(.08, .92), h=.17, kind='fringe', rays=26, duty=.4, dark=.68)], anal=[dict(x=(.3, .92), h=.17, kind='fringe', rays=20, duty=.4, dark=.68)],
    pect=dict(len=.13, kind='point', ang=18, v=-.05, x=.31), tail=dict(kind='round', len=.15, spread=.12), mouth=dict(reach=.62, open=(1.4, 2.0), vc=.5),
    eye=(3.3, '#c9b25a', '#3a3020'), eye_x=.11, eye_v=.55, post=halibut_post)
def sand_post(f): second_eye(.075, .02, 3.3, '#d8c070', '#4a3a22')(f); arch_line(f, 0, .3, .1, .3)
SP['pacific-sanddab'] = flat(seed=32, SL=58, fat=.42, depth=.37, deepest=.4, head=.27, ped=.1, cols=('#93794c', '#a68b5b', '#a88e60', '#9c8458'), fin=('#84704a', '#b8a070'), lowfin=('#84704a', '#b8a070'),
    pose=dict(a=(172, 190), wig=10, water='clear', lift=12, ex=74, power=.8), taper=(.88, .64, .42, .16),
    marks=[M_mottle('#6b5435', 5, .55, (-1.2, 1.2), (0, 1), .6, 1), M_speck('#2e2a22', 2.0, .68, (-1.2, 1.2), (0, 1), .7, 8)],
    spots=[(22, (.7, 1.0), (.25, .95), (-.9, .9), '#d98a2b')],
    dorsal=[dict(x=(.07, .93), h=.22, kind='fringe', rays=26, duty=.4, dark=.7, tex=spotfin(16, 3, '#2e2a22', .04, .6))], anal=[dict(x=(.25, .93), h=.22, kind='fringe', rays=22, duty=.4, dark=.7, tex=spotfin(14, 4, '#2e2a22', .04, .6))],
    pect=dict(len=.12, kind='point', ang=18, v=-.05, x=.3), tail=dict(kind='round', len=.16, spread=.11), mouth=dict(reach=.42),
    eye=(3.3, '#d8c070', '#4a3a22'), eye_x=.1, eye_v=.62, post=sand_post)
SP['starry-flounder'] = flat(seed=33, SL=56, fat=.5, depth=.5, deepest=.45, head=.25, ped=.11, cols=('#2b2a22', '#3e3e2a', '#4a4a32', '#3a3a28'), fin=('#e8862a', '#f2c063'), lowfin=('#e8862a', '#f2c063'),
    pose=dict(a=(42, 64), water='tail', lift=13, ox=-2), taper=(.84, .56, .32, .12),
    marks=[M_mottle('#23221b', 5, .55, (-1.2, 1.2), (0, 1), .6, 1), M_speck('#8a866a', 1.9, .66, (-1.2, 1.2), (0, 1), .85, 4)],
    dorsal=[dict(x=(.1, .9), h=.27, kind='fringe', rays=22, duty=.3, dark=.8, tex=barfin('#141414', 6.5, .95))], anal=[dict(x=(.3, .9), h=.27, kind='fringe', rays=18, duty=.3, dark=.8, tex=barfin('#141414', 5.5, .95))],
    pect=dict(len=.12, kind='point', ang=18, v=-.05, x=.29, c=('#3a3a28', '#6a6a48')), tail=dict(kind='square', len=.17, spread=.12, rays=8, duty=.3, dark=.8, tex=barfin('#141414', 3.5, .95)), mouth=dict(reach=.3),
    eye=(2.5, '#c9b25a'), eye_x=.1, eye_v=.6, post=second_eye(.085, .08, 2.5, '#c9b25a', None))
def scombrid(**kw):
    S = dict(SL=70, scales=None, gloss=.6, flat=1.3, taper=(.92, .7, .42, .12), tail=dict(kind='lunate'), pelvic=[dict(at=.34, h=.2)], cheek=True); S.update(kw); return S
def keel(f): f.cv.limb([f.X(.955, 0), f.X(1.0, 0)], 2.2, 1.6, '#0c1018', seam=1, gloss=.4)
SP['bluefin-tuna'] = scombrid(seed=34, SL=68, fat=.37, depth=.285, deepest=.38, head=.28, ped=.05, cols=('#101a2e', '#2f4a6b', '#aeb8bf', '#e6e9ea'), fin=('#0e1626', '#2a3a5a'),
    pose=dict(a=(46, 8), water='clear', lift=22, ex=16, ox=2, power=1.3),
    marks=[M_stripe('#3f6b6a', -.3, .1, (.25, .9), .5), M_speck('#dadfe0', 2.2, .64, (.2, .8), (.3, .9), .8, 5)],
    dorsal=[dict(x=(.3, .52), h=.36, kind='slope', c=('#3a4a3a', '#6e7a5a'), rays=9, serr=.12), dict(x=(.54, .62), h=.5, kind='falcate', c=('#1c1a26', '#4a3036'))],
    anal=[dict(x=(.6, .67), h=.46, kind='falcate', c=('#9a9a8c', '#c8c8b8'))], finlets=[(.66, .9, 8, .2, ('#c8a21c', '#f0d02a'))],
    pect=dict(len=.18, kind='blade', ang=16, v=.3, c=('#0e1626', '#263656')), tail=dict(kind='lunate', len=.14, spread=.21, c=('#101726', '#27324a')), mouth=dict(reach=.42), eye=(2.5, '#dfe4e8'), post=keel)
SP['pacific-bonito'] = scombrid(seed=35, SL=64, depth=.23, deepest=.35, head=.27, ped=.045, cols=('#527f96', '#9dbcc6', '#c9d2d6', '#eceff0'), fin=('#2a343e', '#4a5560'),
    pose=dict(a=(158, 196), water='clear', lift=14, ex=76, ox=-5, power=1.05),
    marks=[M_lines('#0a1016', (-.16, -.36, -.56, -.76, -.96, -1.16), .075, (.3, .93), 1., -1.1)],
    dorsal=[dict(x=(.28, .58), h=.36, kind='slope', rays=12, serr=.1), dict(x=(.6, .67), h=.26, kind='falcate')], anal=[dict(x=(.65, .71), h=.26, kind='falcate', c=('#b8bcc0', '#e8e8e8'))],
    finlets=[(.7, .9, 7, .13, ('#3a444e', '#56606a'))], pect=dict(len=.12, kind='tri', ang=20, v=.3, c=('#566068', '#8c969c')), tail=dict(kind='lunate', len=.14, spread=.17, fork=.66),
    mouth=dict(reach=.62, open=(1.0, 1.4)), eye=(2.5, '#d8dce0'), post=lambda f: (keel(f), teeth(f, 4)))
SP['pacific-mackerel'] = scombrid(seed=36, SL=62, depth=.2, deepest=.35, head=.28, ped=.04, cols=('#3f927c', '#8cc4b0', '#c8d0cc', '#eef0ea'), fin=('#445048', '#6a7670'),
    pose=dict(a=(18, 138), water='clear', lift=13, ex=30, power=.9),
    marks=[M_wavy('#0a1210', 12, (.28, .98), (-1.1, -.14), .95), M_speck('#a9b2ae', 2.4, .7, (.0, .5), (.3, .9), .5, 5)],
    dorsal=[dict(x=(.33, .47), h=.48, kind='tri', rays=6), dict(x=(.62, .7), h=.26, kind='falcate')], anal=[dict(x=(.63, .71), h=.26, kind='falcate', c=('#a0a8a4', '#d8dcd6'))],
    finlets=[(.73, .9, 5, .14, ('#465049', '#5c6660'))], pect=dict(len=.11, kind='tri', ang=20, v=-.1, c=('#566660', '#8c9a94')), tail=dict(kind='deep', len=.2, spread=.14, c=('#3a4540', '#6a7468')),
    mouth=dict(reach=.5), eye=(3.3, '#e0e6e4'))
SP['yellowtail'] = scombrid(seed=37, SL=70, depth=.25, deepest=.4, head=.26, ped=.05, flat=1.5, cols=('#2c4a5e', '#6f8e93', '#d5dad8', '#f1f1ec'), fin=('#8a7a2a', '#c8b040'), lowfin=('#a89a3a', '#d8c868'),
    pose=dict(a=(50, 72), water='tail', lift=14, ox=-4, power=1.25), scales=(2.6, 2.4, .12),
    marks=[M_stripe('#e3c02a', -.06, .075, (.33, .99), .95), M_stripe('#a8862e', -.06, .075, (.0, .36), .9)],
    dorsal=[dict(x=(.36, .45), h=.12, kind='spiny', serr=.4), dict(x=(.46, .9), h=.36, kind='low', rays=14)], anal=[dict(x=(.62, .9), h=.3, kind='low', rays=10)], pelvic=[dict(at=.3, h=.26)],
    pect=dict(len=.14, kind='point', ang=30, v=.3), tail=dict(kind='deep', len=.22, spread=.17, c=('#c89a14', '#eecb30')), mouth=dict(reach=.45), eye=(2.5, '#e0d8a0'), eye_v=.12)
def shark(**kw):
    S = dict(SL=74, scales=None, gloss=.5, flat=1.35, gill=False, pelvic=[], tail=dict(kind='hetero'), mouth=dict(reach=.5, pos='inferior'), eye=(2.5, '#c7cfb4'), nostril=False); S.update(kw); return S
def leo_post(f): gillslits(f, np.linspace(.2, .25, 5) / .8 * 1.0, -.3, .45)
G1, G2 = '#57523f', '#8a846f'
SP['leopard-shark'] = shark(seed=38, fat=.2, depth=.15, deepest=.35, head=.25, ped=.05, cols=('#6e6858', '#958e7a', '#b3ac98', '#edebe0'), fin=(G1, G2), lowfin=(G1, G2),
    pose=dict(a=(24, 20), wig=30, water='clear', lift=14, ex=18, power=.9), taper=(.9, .74, .54, .28),
    marks=[M_saddles('#1e1c1a', 11, (.2, 1.02), .05, .95, .2, '#6e6858')], spots=[(18, (1.0, 1.5), (.25, .97), (.02, .3), '#1e1c1a')],
    dorsal=[dict(x=(.375, .5), h=.82, kind='shark', tex=tipfin('#1e1c1a', .6, .5)), dict(x=(.725, .84), h=.7, kind='shark', tex=tipfin('#1e1c1a', .6, .5))],
    anal=[dict(x=(.8, .87), h=.36, kind='shark'), dict(x=(.6, .68), h=.38, kind='shark')],
    pect=dict(len=.18, kind='tri', ang=52, v=.75, root=4.5, c=(G1, G2)), tail=dict(kind='hetero', len=.27, spread=.1, up=.8, down=.75, tex=tipfin('#1e1c1a', .7, .5)), eye_v=.25, post=leo_post)
def seven_post(f): gillslits(f, np.linspace(.19, .29, 7), -.35, .6); teeth(f, 5)
SP['sevengill-shark'] = shark(seed=39, SL=70, fat=.25, depth=.2, deepest=.4, head=.31, ped=.07, cols=('#5e5c52', '#7a7466', '#8e8c84', '#e4e1d6'), fin=('#4e4c44', '#7a766a'), lowfin=('#4e4c44', '#7a766a'),
    pose=dict(a=(162, 112), wig=22, water='tail', lift=14, ox=6, power=1.25), taper=(.97, .86, .68, .38),
    spots=[(54, (.45, .85), (.1, .98), (-1, .3), '#22221f'), (9, (.45, .7), (.2, .95), (-.9, .2), '#e8e8e0')],
    dorsal=[dict(x=(.785, .9), h=.42, kind='shark')], anal=[dict(x=(.9, .97), h=.26, kind='shark'), dict(x=(.66, .75), h=.3, kind='shark')],
    pect=dict(len=.17, kind='tri', ang=50, v=.75, root=4.5), tail=dict(kind='hetero', len=.36, spread=.09, up=.7, down=.7, lowf=.36),
    mouth=dict(reach=.6, open=(2.0, 2.8), vc=.55, pos='terminal'), eye=(2.5, '#b8c0a8'), eye_v=.2, post=seven_post)
def sturg_post(f):
    f.rowmarks(-.9, 12, 1.8, 1.6, .18, .92, '#d6d2bc'); f.rowmarks(-.06, 26, 1.3, 1.3, .08, .78, '#d6d2bc'); f.rowmarks(.64, 10, 1.5, 1.2, .26, .78, '#f4f0dc')
    for a in (.06, .075, .09, .105): barbel(f, a, 1, [(.0, 1.6), (-.004, 3.4)], '#e6dec6')
SP['white-sturgeon'] = shark(seed=40, SL=66, fat=.215, depth=.16, deepest=.4, head=.245, ped=.045, belly=.5, cols=('#50534c', '#6e7068', '#9a9a8e', '#f0eee4'), fin=('#4c4f48', '#787b72'), lowfin=('#5e6058', '#9a9c90'),
    pose=dict(a=(80, 104), wig=6, water='tail', lift=14, ox=0, power=1.35), taper=(.92, .66, .4, .16), gill=True, cheek=False, gloss=.3,
    marks=[M_speck('#30342c', 1.6, .64, (-1, .1), (0, 1), .4, 2)],
    dorsal=[dict(x=(.83, .95), h=.62, kind='tri', rays=6)], anal=[dict(x=(.9, .975), h=.4, kind='tri', rays=4), dict(x=(.73, .8), h=.42, kind='tri', rays=4)],
    pect=dict(len=.14, kind='point', ang=48, v=.85, root=3), tail=dict(kind='hetero', len=.24, spread=.1, up=.85, down=.8, lowf=.55, smooth=True, rays=9), mouth=dict(reach=.42, pos='inferior'), eye=(2.5, '#d2c88e'), eye_x=.245 * .62, eye_v=.4, post=sturg_post)
