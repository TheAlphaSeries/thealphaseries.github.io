from fishkit import *
SP = {}
def rock(**kw):
    S = dict(SL=62, tail=dict(kind='square'), scales=(3.2, 3.0, .22), pect=dict(len=.24, kind='round', ang=30, v=.45), eye=(3.0, '#d8c070'), taper=(.92, .74, .5, .2)); S.update(kw); return S
def eyestripes(col, n=2):
    def post(f):
        t0 = 1 - f.hl * .5
        for i in range(n): f.seg((t0, -float(f.top(t0)) * .2 + i * 2.2), (1 - f.hl * .98, -1.5 + i * 3.4), .5, None, col)
    return post
SP['black-rockfish'] = rock(seed=21, depth=.34, deepest=.38, head=.33, ped=.11, cols=('#1e2126', '#3a3f47', '#7c828a', '#d9dbdc'), fin=('#191b1f', '#33373d'), lowfin=('#2a2d32', '#4a4f56'),
    pose=dict(a=(22, 42), water='clear', lift=13, ex=22, power=.9),
    marks=[M_mottle('#8a9098', 5, .5, (-.5, .15), (.3, .97), .6, 3), M_mottle('#15171a', 4, .6, (-1, -.2), (.1, 1), .5, 5)],
    dorsal=[dict(x=(.3, .62), h=.36, kind='spiny', serr=.42, tex=spotfin(12, 3, '#0a0b0d', .07)), dict(x=(.62, .85), h=.4, kind='soft')], anal=[dict(x=(.66, .82), h=.38, kind='soft')], pelvic=[dict(at=.36, h=.3)],
    mouth=dict(reach=.6), post=eyestripes('#101214'))
SP['vermilion-rockfish'] = rock(seed=22, depth=.4, deepest=.36, head=.36, ped=.12, cols=('#b5261b', '#d8371f', '#e8603a', '#f2a07e'), fin=('#b02a1a', '#e04a2c'), lowfin=('#c8381e', '#ee6a40'),
    pose=dict(a=(112, 94), water='tail', lift=13, ox=4),
    marks=[M_mottle('#5b4a4a', 5, .56, (-1, -.1), (.1, 1), .55, 3), M_lines('#e9b9a8', (-.18,), .04, (.5, .97), .6)],
    dorsal=[dict(x=(.3, .6), h=.4, kind='spiny', serr=.42, rim='#3a1512', rimw=.12), dict(x=(.6, .84), h=.38, kind='soft', rim='#3a1512', rimw=.12)], anal=[dict(x=(.66, .8), h=.36, kind='soft', rim='#3a1512', rimw=.14)],
    pelvic=[dict(at=.38, h=.3)], pect=dict(len=.27, kind='fan', ang=30, v=.4, rim='#3a1512', rimw=.1), tail=dict(kind='notch', rim='#3a1512', rimw=.1),
    mouth=dict(reach=.6), eye=(3.0, '#f0c040'), post=eyestripes('#f2a23a', 3))
def cabezon_bits(f):
    f.cv.limb([f.X(.04, -float(f.top(.96)) * .9), f.X(.03, -float(f.top(.96)) - 2.4)], 1.6, 1.0, '#8c7a4a', seam=1)                       # the flap on the snout
    e = f.X(f.hl * .36, -float(f.top(1 - f.hl * .36)) * .98); f.cv.limb([e, f.X(f.hl * .42, -float(f.top(1 - f.hl * .4)) - 3.4)], 1.8, .8, '#6b5a33', seam=1)   # the tuft over the eye
SP['cabezon'] = rock(seed=23, SL=64, depth=.3, deepest=.3, head=.38, ped=.07, belly=.5, cols=('#4a3a22', '#6b5a33', '#8c7a4a', '#bfd8cc'), fin=('#5a4a2a', '#8a743e'), lowfin=('#6a5830', '#a08a50'),
    pose=dict(a=(4, 22), water='clear', lift=11, ex=22, power=.9), taper=(1.0, .94, .78, .44), scales=None, gloss=.3, swell=.5,
    marks=[M_mottle('#c9b98a', 5, .6, (-1, .5), (0, 1), .7, 2), M_saddles('#2b2216', 5, (.1, 1.), .1, .85, .26), M_speck('#2b2216', 2, .68, (-1, .6), (0, 1), .7)],
    dorsal=[dict(x=(.3, .56), h=.4, kind='spiny', tex=barfin('#2e2416', 3, .55, True)), dict(x=(.58, .88), h=.42, kind='even', tex=barfin('#2e2416', 3, .55, True))],
    anal=[dict(x=(.6, .85), h=.32, kind='even', serr=.25)], pelvic=[dict(at=.35, h=.22)],
    pect=dict(len=.3, kind='fan', ang=40, v=.5, tex=barfin('#2e2416', 3, .5, True), root=4), tail=dict(kind='round', tex=barfin('#2e2416', 3, .5, True)),
    mouth=dict(reach=.6, open=(1.2, 1.6), vc=.5), eye=(3.0, '#d8a040'), eye_v=.6, eye_x=.38 * .36, post=cabezon_bits)
def sheep_bits(f):
    for dv in (.2, 1.6): f.cv.stamp(*f.X(.0, dv), '#f6f2e8')
    f.cv.stamp(*f.X(.015, 2.4), '#f6f2e8')
PT = [(0, .6), (.5, .7), (1.0, 1.1), (1.25, .35)]
SP['california-sheephead'] = rock(seed=24, SL=62, depth=.38, deepest=.35, head=.33, ped=.15, cols=('#b83a28', '#c8452f', '#e0633f', '#e89a7e'), fin=('#1a1a1e', '#2c2c32'), lowfin=('#1a1a1e', '#30303a'),
    pose=dict(a=(152, 184), water='clear', lift=13, ex=74), taper=(.97, .88, .68, .34), adj_top=[(.2, 1.12)], gloss=.5,
    marks=[M_block('#1b1b1f', -.1, .335), M_block('#1b1b1f', .63, 1.2), M_tint('#f4f1ea', (-.05, .2), (.42, 1.3), 1., .02, .1)],
    dorsal=[dict(x=(.33, .62), h=.2, kind='spiny'), dict(x=(.6, .85), h=.3, outer=PT)], anal=[dict(x=(.6, .84), h=.3, outer=PT)], pelvic=[dict(at=.38, h=.28)],
    pect=dict(len=.22, kind='round', ang=32, v=.4, c=('#3a2420', '#7a3a2c')), tail=dict(kind='fork', fork=.42, len=.22, spread=.17), mouth=dict(reach=.22, drop=.7), eye=(2.5, '#d8281e'), eye_v=.42, post=sheep_bits)
def calico(c, F):
    q = np.zeros_like(F.r)
    for r0, off in ((-.68, 0.), (-.3, .5)):
        q = np.maximum(q, (np.abs(F.r - r0) < .15) * (np.mod(F.x * 8.5 + off, 1) < .55))
    return lerp3(c, C('#d9d2b0'), q * sstep(.3, .34, F.x) * (1 - sstep(.93, .97, F.x)) * .9)
SP['kelp-bass'] = rock(seed=25, SL=64, depth=.31, deepest=.38, head=.36, ped=.11, cols=('#35351f', '#57522c', '#b5a45a', '#e9dfa8'), fin=('#7a6c2c', '#c9a83a'), lowfin=('#a08a34', '#d8be5a'),
    pose=dict(a=(58, 112), water='tail', lift=14, ox=-2, power=1.15), taper=(.92, .7, .46, .16),
    marks=[calico, M_mottle('#4a4526', 3.5, .55, (.0, .5), (.3, .97), .6, 4)],
    dorsal=[dict(x=(.34, .6), h=.46, kind='peak'), dict(x=(.6, .84), h=.36, kind='soft')], anal=[dict(x=(.66, .8), h=.36, kind='soft')], pelvic=[dict(at=.38, h=.3)],
    pect=dict(len=.2, kind='round', ang=32, v=.45), mouth=dict(reach=.5, open=(2.0, 3.0), vc=.3), eye=(3.0, '#d8b040'))
def pecspot(f): f.shade(np.clip((1.6 - np.hypot(f.u - (1 - f.hl - .035) * f.sp.len, f.v - float(f.bot(1 - f.hl - .03)) * .35)) * 2, 0, 1), col='#141414')
SP['white-seabass'] = rock(seed=26, SL=68, depth=.23, deepest=.35, head=.28, ped=.08, cols=('#4c5e78', '#8497a8', '#c9d2d8', '#f2f4f4'), fin=('#4a545e', '#7a8690'), lowfin=('#b8b8a0', '#e4e2cc'),
    pose=dict(a=(170, 190), wig=8, water='clear', lift=15, ex=76), taper=(.9, .66, .4, .12), gloss=.65, scales=(2.8, 2.6, .18),
    marks=[M_speck('#34404f', 1.8, .66, (-1, -.2), (.2, 1), .6)],
    dorsal=[dict(x=(.33, .5), h=.46, kind='spiny', serr=.2), dict(x=(.51, .88), h=.32, kind='low', c=('#5a6068', '#a8a070'))], anal=[dict(x=(.68, .78), h=.3, kind='trout')], pelvic=[dict(at=.33, h=.26)],
    pect=dict(len=.17, kind='point', ang=36, v=.4, c=('#6a747e', '#aab4bc')), tail=dict(kind='fork', fork=.2, c=('#4a545e', '#8a8e7a')), mouth=dict(reach=.6, open=(1.4, 2.0)), eye=(2.5, '#d8dcd0'), post=pecspot)
def ling_bits(f):
    teeth(f, 6)
    e = f.X(f.hl * .4, -float(f.top(1 - f.hl * .4)) * .98); f.cv.limb([e, f.X(f.hl * .46, -float(f.top(1 - f.hl * .45)) - 2.6)], 1.4, .7, '#5e6648', seam=1)
SP['lingcod'] = rock(seed=27, SL=74, depth=.2, deepest=.32, head=.31, ped=.06, cols=('#3f4a3a', '#5e6648', '#8e8a62', '#d8d4be'), fin=('#44482e', '#6e6c46'), lowfin=('#5a5a3f', '#8e8a5e'),
    pose=dict(a=(74, 46), water='tail', lift=13, ox=0, power=1.2), taper=(.96, .8, .6, .26), scales=(2.4, 2.2, .14), swell=.6,
    marks=[M_mottle('#8a5a2a', 3.4, .5, (-1, .35), (.05, 1), .8, 2), M_saddles('#262a20', 7, (.2, 1.), -.05, .7, .22), M_speck('#262a20', 1.8, .66, (-1, .4), (0, 1), .7), M_lines('#e8e6da', (-.16,), .035, (.3, .98), .8)],
    dorsal=[dict(x=(.28, .6), h=.46, kind='even', serr=.3, tex=spotfin(14, 3, '#262a20', .07, .7)), dict(x=(.6, .9), h=.44, kind='even', tex=spotfin(14, 4, '#262a20', .07, .7))],
    anal=[dict(x=(.6, .9), h=.3, kind='even')], pelvic=[dict(at=.33, h=.3)], pect=dict(len=.2, kind='fan', ang=36, v=.5, tex=spotfin(10, 5, '#262a20', .08, .6)),
    mouth=dict(reach=.72, open=(2.6, 3.6), vc=.3), eye=(2.5, '#d8b858'), eye_v=.5, post=ling_bits)
SP['jacksmelt'] = rock(seed=28, SL=66, depth=.17, deepest=.4, head=.22, ped=.06, cols=('#5e7a6a', '#8fa9a3', '#dce6e8', '#f6f8f8'), fin=('#8a9480', '#b9bfa8'), lowfin=('#a8b0a0', '#d8dccc'),
    pose=dict(a=(166, 148), water='tail', lift=11, ox=-2, power=.85), taper=(.9, .66, .4, .12), gloss=.85, scales=(2.4, 2.2, .14),
    marks=[M_stripe('#eef6fa', .03, .11, (.24, .98), .9), M_lines('#3f8fcf', (-.13,), .04, (.25, .98), .9), M_blush('#d9c35a', .16, .3, .03, .25, .7)],
    dorsal=[dict(x=(.5, .56), h=.42, kind='tri'), dict(x=(.68, .78), h=.42, kind='tri')], anal=[dict(x=(.58, .8), h=.3, kind='low')], pelvic=[dict(at=.45, h=.26)],
    pect=dict(len=.16, kind='point', ang=28, v=.1), tail=dict(kind='deep'), mouth=dict(reach=.3), eye=(3.0, '#e8ecec'))
def perch(**kw):
    S = dict(SL=56, ped=.12, flat=1.9, tail=dict(kind='fork', len=.2, spread=.15), scales=(3.2, 3.0, .22), eye=(3.0, '#d8d0a0'), mouth=dict(reach=.3, drop=.6), taper=(.86, .6, .34, .11), pelvic=[dict(at=.42, h=.24)]); S.update(kw); return S
SP['barred-surfperch'] = perch(seed=29, depth=.45, deepest=.42, head=.3, cols=('#6e7a3a', '#b9b77a', '#dde0d8', '#f5f6f2'), fin=('#8e8c64', '#c8c6a0'), lowfin=('#a8a688', '#dcdac4'),
    pose=dict(a=(12, 40), water='clear', lift=11, ex=22),
    marks=[M_bars('#b8922e', 9, (.33, .92), (-.9, .2), .42, .9), M_dotrows('#b8922e', (-.5, -.15, .2), 6.2, .1, (.36, .9), .8)],
    dorsal=[dict(x=(.38, .61), h=.2, kind='spiny'), dict(x=(.6, .85), h=.27, kind='soft')], anal=[dict(x=(.62, .85), h=.22, kind='low')], pect=dict(len=.25, kind='point', ang=26, v=.3))
SP['redtail-surfperch'] = perch(seed=30, depth=.48, deepest=.42, head=.29, cols=('#7a8a7a', '#c9d2cc', '#e8ecea', '#fafaf8'), fin=('#c8584c', '#e88a7c'), lowfin=('#d87064', '#f0a498'),
    pose=dict(a=(-14, -40), water='head', sink=-4, ox=-4), adj_top=[(.17, .86)], gloss=.6,
    marks=[M_bars('#6a4a38', 10, (.33, .93), (-.95, -.12), .4, .8), M_bars('#6a4a38', 10, (.36, .96), (-.06, .4), .4, .7)],
    dorsal=[dict(x=(.37, .61), h=.32, kind='peak'), dict(x=(.6, .85), h=.24, kind='soft')], anal=[dict(x=(.62, .85), h=.22, kind='low')],
    pect=dict(len=.25, kind='point', ang=26, v=.3, c=('#d8c0b4', '#f0e0d8')), tail=dict(kind='fork', len=.22, spread=.17, c=('#c03a32', '#e85a50')))
