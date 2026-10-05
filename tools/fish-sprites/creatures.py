from engine import *
def spotfin(n, seed, dark='#161a12', rad=.06, amt=.85):
    pts = np.random.RandomState(seed).rand(n, 2)
    def tex(c, ss, hv, p):
        m = np.zeros(ss.shape)
        for a, b in pts: m = np.maximum(m, ((ss - a) ** 2 + (hv - b * .85) ** 2 < rad * rad) * 1.)
        return lerp3(c, C(dark), m * amt)
    return tex
def tipfin(col, start=.6, amt=.7):
    return lambda c, ss, hv, p: lerp3(c, C(col), sstep(start, 1, hv) * amt)
PALE = '#f6efe2'
def trout(kind='rainbow'):
    rb = kind == 'rainbow'
    f = Fish([(21, 67), (25.4, 44.6), (41, 25.6), (60, 16.6), (80, 15.5)],
             [(0, 2.9), (.1, 3.7), (.3, 6.8), (.5, 8.6), (.66, 8.8), (.8, 7.6), (.9, 5.6), (.96, 3.6), (.99, 2.0), (1, 1.1)],
             [(0, 2.9), (.1, 3.9), (.3, 7.4), (.5, 9.2), (.66, 9.0), (.8, 7.4), (.9, 5.4), (.96, 3.8), (.99, 2.3), (1, 1.2)], seed=1 if rb else 14, k=1.14)
    fc0, fc1 = ('#4f6038', '#8fa068') if rb else ('#414a56', '#8791a0'); wc0, wc1 = ('#c26a4c', '#eeb08e') if rb else ('#7f8a96', '#c5cdd4')
    f.tail(14, 10.5, 10, fc0, fc1, fork=.26, rays=10, kick=-8, dark=.6, tex=spotfin(22 if rb else 8, 3, rad=.045))
    f.edgefin('d', .64, .46, [(.635, 1.2), (.6, 7.4), (.53, 7.8), (.46, 5.6), (.415, 2.6)], c0=fc0, c1=fc1, rays=7, dark=.6, tex=spotfin(10 if rb else 4, 4))
    f.edgefin('d', .245, .19, [(.24, .6), (.21, 2.8), (.17, 3.2), (.155, 1.8)], c0=fc0, c1=fc1, rays=1, duty=0)          # adipose fin
    f.edgefin('v', .33, .2, [(.325, 1), (.3, 6.4), (.24, 5.6), (.185, 2.2)], c0=wc0, c1=wc1, rays=5, dark=.62, lead=PALE)
    f.edgefin('v', .53, .45, [(.525, 1), (.5, 6), (.45, 5.4), (.41, 2)], c0=wc0, c1=wc1, rays=4, dark=.62, lead=PALE)
    def col(t, r, u, v):
        if rb:
            c = ramp(r, [(-1, '#22331c'), (-.62, '#3f5a2c'), (-.32, '#6f8a4c'), (-.1, '#b4bf9c'), (.3, '#e4e6da'), (.7, '#fbf9f0'), (1, '#ffffff')])
            band = np.exp(-((r - .04) / .2) ** 2) * sstep(.04, .2, t) * (1 - sstep(.93, 1, t)) * (.8 + .35 * fbm(u, v, 6))
            c = lerp3(c, C('#e2496e'), np.clip(band, 0, 1) * .92)
            c = lerp3(c, C('#ea6884'), np.exp(-(((t - .85) / .05) ** 2 + ((r - .12) / .42) ** 2)) * .7)
        else:
            c = ramp(r, [(-1, '#232b36'), (-.62, '#3f4b5a'), (-.3, '#7a8898'), (-.05, '#c2ccd4'), (.4, '#ecf0f2'), (1, '#ffffff')])
        return lerp3(c, C('#27341f' if rb else '#262e38'), sstep(.8, .97, t) * sstep(-.2, -.75, r) * .6)
    f.body(col, scales=(3.2, 3.0, .26, .06, .8))
    f.shade(f.spotmask(95 if rb else 45, (.3, .62), (.02, .97), (-1, -.05 if rb else -.2), 1), col='#0e120c')
    if rb: f.shade(f.spotmask(18, (.3, .5), (.05, .78), (.0, .4), 2) * .8, col='#1a1e16')
    f.gill(.795, .045); f.band(lambda r: .86 - .02 * (1 - r * r), -.3, .8, .4, .72)
    f.seg((1.0, .8), (.895, 3.6), .55, .25); f.seg((.985, 1.9), (.905, 4.4), .45, 1.25)
    f.fanfin(.755, 5.2, 38, 10.5, 46, wc0, wc1, rootw=2.6, rays=5, dark=.62, lead=PALE, shape=(1, .97, .8, .55))
    f.eye(.905, -2.5, 2.5, iris='#e8c458' if rb else '#d8dce0'); f.cv.stamp(*f.P(.975, -1.2), '#141812')
    return finish(f.cv, f.seed, 23)
def bass():
    f = Fish([(27, 68), (27, 51), (35, 35), (51, 24), (70, 18)],
             [(0, 3.2), (.1, 4.2), (.3, 7.6), (.5, 9.4), (.68, 9.8), (.82, 9.0), (.92, 7.2), (.97, 5.0), (1, 2.8)],
             [(0, 3.2), (.1, 4.4), (.3, 8.4), (.5, 10.8), (.68, 11), (.82, 9.8), (.92, 8.0), (.97, 6.0), (1, 3.6)], seed=4, k=1.08)
    c0, c1 = '#33472a', '#7f9258'
    f.tail(13, 10, 10, c0, c1, fork=.14, rays=9, kick=8, dark=.62)
    f.edgefin('d', .72, .52, [(.71, 1), (.68, 6.4), (.6, 7), (.54, 4.8), (.5, 1.2)], c0=c0, c1=c1, rays=8, serr=.32, dark=.6)
    f.edgefin('d', .5, .3, [(.495, 1.5), (.46, 8), (.38, 8.4), (.3, 6), (.26, 2.4)], c0=c0, c1=c1, rays=7, dark=.62)
    f.edgefin('v', .36, .22, [(.355, 1), (.33, 7), (.27, 7), (.21, 4), (.19, 1.6)], c0='#5c6e40', c1='#a9b684', rays=6, dark=.66)
    f.edgefin('v', .62, .55, [(.615, .8), (.59, 6.5), (.54, 6), (.5, 2)], c0='#7c8a58', c1='#cdd4a8', rays=4, dark=.68, lead=PALE)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#17260f'), (-.62, '#2f4a22'), (-.3, '#58783a'), (-.05, '#93ad5c'), (.3, '#cdd8a0'), (.62, '#f1f0d8'), (1, '#ffffff')])
        c = lerp3(c, C('#1d2f15'), sstep(.52, .7, fbm(u, v, 7, 2)) * sstep(-.1, -.6, r) * .55)                         # mottled back
        stripe = np.exp(-((r - .02) / .15) ** 2) * sstep(.36, .5, fbm(u * 1.0, v * .6, 5, 5)) * sstep(.03, .12, t) * (1 - sstep(.74, .8, t))
        return lerp3(c, C('#0f1a0c'), np.clip(stripe * 1.2, 0, 1) * .92)
    f.body(col, scales=(3.4, 3.1, .26, .06, .76))
    f.gill(.752, .055); f.band(lambda r: .83 - .03 * (1 - r * r), -.2, .85, .45, .7)
    f.seg((.8, -1.5), (.86, -2.6), .5, .6); f.seg((.79, 1.5), (.87, .2), .5, .62)                                        # cheek streaks
    f.gape(.865, 2.2, 2.6, 3.4)
    f.fanfin(.69, 5.0, 34, 10, 52, '#6f8048', '#bcc890', rootw=2.6, rays=6, dark=.66, shape=(.9, 1, .9, .6))
    f.eye(.895, -4.6, 2.6, iris='#e0a02c')
    return finish(f.cv, f.seed, 28, power=1.1)
def sunfish():
    f = Fish([(27, 70), (30, 56), (40, 43), (56, 34), (70, 30)],
             [(0, 3), (.1, 5), (.28, 11), (.5, 14.2), (.7, 13.6), (.85, 10.4), (.94, 6.6), (.98, 3.9), (1, 1.9)],
             [(0, 3), (.1, 5.4), (.28, 11.6), (.5, 15), (.7, 14.2), (.85, 10.4), (.94, 6.4), (.98, 3.8), (1, 1.9)], seed=2, k=1.05)
    c0, c1 = '#3a4424', '#868a50'
    blotch = lambda c, ss, hv, p: lerp3(c, C('#12160e'), np.exp(-(((ss - .8) / .12) ** 2 + ((hv - .2) / .25) ** 2)) * .9)
    f.tail(12, 9.5, 9.5, c0, c1, fork=.16, rays=9, dark=.62)
    f.edgefin('d', .74, .44, [(.73, 1), (.7, 5.6), (.6, 6.4), (.5, 6), (.44, 4.6)], c0=c0, c1=c1, rays=10, serr=.34, dark=.6)
    f.edgefin('d', .45, .2, [(.45, 4.4), (.4, 8.6), (.32, 9), (.22, 6), (.17, 2.2)], c0=c0, c1=c1, rays=8, dark=.62, tex=blotch)
    f.edgefin('v', .44, .2, [(.435, 1.4), (.41, 7.6), (.32, 8.2), (.22, 5.4), (.17, 2)], c0='#5a5a30', c1='#a8a060', rays=8, dark=.64)
    f.edgefin('v', .62, .55, [(.615, .8), (.59, 7.4), (.53, 6.8), (.49, 2.2)], c0='#8a6a28', c1='#d8b860', rays=4, dark=.68, lead=PALE)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#1d2712'), (-.6, '#3c4c24'), (-.25, '#6a7a3a'), (.05, '#9c9a48'), (.4, '#cfae4a'), (.75, '#ecc866'), (1, '#f6e0a0')])
        bars = (.5 + .5 * np.sin(t * 2 * np.pi * 7 + r * 1.0)) ** 2.2 * sstep(.6, -.5, r) * sstep(.08, .16, t) * (1 - sstep(.7, .76, t))
        c = lerp3(c, C('#1b2412'), bars * .62)
        c = lerp3(c, C('#ee7d1e'), sstep(.38, .62, t) * (1 - sstep(.9, .99, t)) * sstep(.3, .7, r) * .92)                # the orange breast
        c = lerp3(c, C('#3f86b4'), sstep(.76, .8, t) * sstep(-.25, .05, r) * (1 - sstep(.5, .8, r)) * (.55 + .45 * np.sin(v * 2.4 + u * .8)) * .9)   # blue on the cheek
        return c
    f.body(col, scales=(3.4, 3.2, .26, .06, .74), flat=1.9)
    f.gill(.755, .05, r0=-.6, r1=.8)
    ear = np.clip((1.0 - np.hypot((f.u - .742 * f.sp.len) / 2.6, (f.v + 3.4) / 3.2)) * 3, 0, 1); f.shade(ear, col='#07090a')    # the dark ear flap
    f.seg((1.0, .5), (.945, 2.0), .5, .3)
    f.fanfin(.68, 4.0, 30, 13, 34, '#a08c3c', '#e0cf80', rootw=2.4, rays=6, dark=.72, shape=(.75, 1, .85, .5))
    f.eye(.895, -3.6, 3.0, iris='#d0621e')
    return finish(f.cv, f.seed, 29)
def crappie():
    f = Fish([(26, 70), (29, 55), (40, 41), (57, 32), (73, 28)],
             [(0, 2.8), (.1, 4.6), (.28, 9.6), (.5, 12.2), (.68, 12), (.82, 9.4), (.9, 6.2), (.96, 4.2), (1, 2.0)],
             [(0, 2.8), (.1, 4.8), (.28, 10), (.5, 12.4), (.68, 12), (.82, 9.6), (.92, 6.6), (.97, 4.4), (1, 2.4)], seed=3, k=1.05)
    c0, c1 = '#59644a', '#b9c2a4'; mott = spotfin(26, 8, rad=.085, amt=.8)
    f.tail(13, 10, 10, c0, c1, fork=.2, rays=9, dark=.64, tex=spotfin(18, 9, rad=.06, amt=.75))
    f.edgefin('d', .68, .22, [(.67, 1), (.62, 5), (.5, 8), (.38, 10.6), (.26, 9), (.18, 3)], c0=c0, c1=c1, rays=13, dark=.64, serr=.12, tex=mott)
    f.edgefin('v', .52, .2, [(.515, 1), (.47, 7), (.36, 10.4), (.26, 8.6), (.17, 3)], c0=c0, c1=c1, rays=10, dark=.64, serr=.08, tex=mott)
    f.edgefin('v', .66, .59, [(.655, .8), (.63, 7), (.57, 6.4), (.53, 2.2)], c0='#7c866c', c1='#d0d6c0', rays=4, dark=.7, lead=PALE)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#1c2418'), (-.62, '#3d4a34'), (-.3, '#7c8a6c'), (-.02, '#bcc6ae'), (.4, '#e2e8da'), (.8, '#f7f8f0'), (1, '#ffffff')])
        m = sstep(.56, .64, fbm(u, v * 1.1, 4.2, 4)) * (1 - sstep(.2, .7, r)) * sstep(.04, .1, t) * (1 - sstep(.74, .8, t)) * .9
        m = np.maximum(m, sstep(.64, .72, noise(u, v, 1.9, 7)) * (1 - sstep(.35, .85, r)) * (1 - sstep(.8, .9, t)) * .85)
        c = lerp3(c, C('#0c100c'), m * .9)
        return lerp3(c, C('#8fb09a'), np.exp(-(((t - .83) / .05) ** 2 + ((r - .2) / .4) ** 2)) * .35)
    f.body(col, scales=(3.3, 3.1, .24, .06, .76), flat=1.9)
    f.gill(.77, .05); f.band(lambda r: .845 - .025 * (1 - r * r), -.1, .8, .4, .72)
    f.seg((1.0, -.4), (.93, 3.6), .6, .28); f.seg((.985, 1.2), (.925, 4.6), .5, 1.25)
    f.fanfin(.7, 3.6, 32, 11, 36, '#8e987c', '#dfe4d2', rootw=2.4, rays=6, dark=.72, shape=(.8, 1, .85, .5))
    f.eye(.89, -3.0, 3.0, iris='#dccb7a')
    return finish(f.cv, f.seed, 28)
def catfish():
    f = Fish([(22, 69), (25, 50), (39, 34), (57, 25), (75, 21)],
             [(0, 2.6), (.1, 3.2), (.3, 5.4), (.5, 7.4), (.7, 8.4), (.85, 8.2), (.94, 6.8), (.98, 4.8), (1, 2.8)],
             [(0, 2.6), (.1, 3.4), (.3, 6.4), (.5, 8.6), (.7, 9.2), (.85, 8.4), (.94, 6.6), (.98, 4.6), (1, 2.8)], seed=5, k=1.1)
    c0, c1 = '#333c44', '#6f7a82'
    f.tail(15, 11, 11, c0, c1, fork=.46, rays=10, kick=-10, dark=.64)
    f.edgefin('d', .68, .58, [(.675, 1), (.66, 8.6), (.6, 8), (.55, 3)], c0=c0, c1=c1, rays=5, dark=.62, smooth=True)
    f.edgefin('d', .27, .2, [(.265, .6), (.23, 3), (.18, 3.6), (.16, 2)], c0=c0, c1=c1, rays=1, duty=0)
    f.edgefin('v', .44, .18, [(.435, 1), (.4, 6), (.3, 6.2), (.2, 4), (.16, 1.4)], c0='#566068', c1='#a2abb0', rays=11, dark=.68)
    f.edgefin('v', .57, .5, [(.565, .8), (.54, 5.6), (.49, 5), (.46, 1.8)], c0='#6a747a', c1='#c0c6c8', rays=4, dark=.7)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#1c2228'), (-.6, '#39444e'), (-.25, '#66747e'), (.05, '#a4b0b2'), (.4, '#dcdcd0'), (.75, '#f6f1e2'), (1, '#fffdf4')])
        return lerp3(c, C('#2a3238'), (fbm(u, v, 5, 6) - .5) * 1.2 * sstep(.2, -.5, r))
    f.body(col, gloss=.75, flat=1.4)
    f.shade(f.spotmask(22, (.5, .95), (.08, .78), (-.8, .3), 1), col='#0f1316')
    f.gill(.79, .04, r0=-.5); f.seg((1.0, 1.0), (.93, 3.4), .55, .28)
    f.fanfin(.77, 5.6, 36, 9.5, 44, '#59636a', '#aab2b6', rootw=2.4, rays=5, dark=.68, shape=(1, .9, .7, .5))
    f.eye(.925, -4.6, 2.5, iris='#cfc7a2')
    W1, W2 = '#20262c', '#ebe5d2'
    f.whisker([(.985, 1.6), (1.04, 5), (1.0, 10), (.9, 13)], W1); f.whisker([(.99, -2.2), (1.08, -6), (1.15, -11)], W1)       # the two long ones at the corners of the mouth
    f.whisker([(.985, -3.4), (1.03, -6.5), (1.04, -9.5)], W1)
    for a, b, c_ in ((.965, 7, .03), (.925, 8, -.035)): f.whisker([(a, float(f.bot(a)) * .9), (a + c_ * .6, float(f.bot(a)) + b * .5), (a + c_ * 1.6, float(f.bot(a)) + b)], W2)
    return finish(f.cv, f.seed, 24)
def flatfish():
    f = Fish([(27, 71), (30, 57), (40, 44), (56, 35), (71, 31)],
             [(0, 2.4), (.08, 4), (.25, 8.4), (.5, 11.4), (.7, 10.8), (.85, 8), (.94, 5), (.98, 3.2), (1, 1.8)],
             [(0, 2.4), (.08, 4), (.25, 8.2), (.5, 10.8), (.7, 10.2), (.85, 7.6), (.94, 4.8), (.98, 3), (1, 1.8)], seed=6, k=1.08)
    c0, c1 = '#5a4e34', '#a8966a'
    f.tail(11, 7.5, 7.5, c0, c1, round_=True, rays=9, dark=.66, tex=spotfin(10, 5, '#3a3020', .06, .7))
    f.edgefin('d', .9, .1, [(.9, .6), (.82, 4), (.6, 5.6), (.35, 5.2), (.16, 3.4), (.08, .8)], c0=c0, c1=c1, rays=26, dark=.66, duty=.4)
    f.edgefin('v', .8, .1, [(.8, .6), (.7, 4.4), (.5, 5.4), (.3, 5), (.15, 3.2), (.08, .8)], c0=c0, c1=c1, rays=22, dark=.66, duty=.4)
    def col(t, r, u, v):
        n = fbm(u, v, 7, 1); c = ramp(n, [(.2, '#4a3f2a'), (.45, '#6e6040'), (.62, '#8b7a52'), (.85, '#a8966a')])
        c = lerp3(c, C('#d8cba0'), sstep(.66, .74, noise(u, v, 2.6, 4)) * .85)
        c = lerp3(c, C('#2c2418'), sstep(.7, .78, noise(u + 9, v, 3.4, 8)) * .8)
        return lerp3(c, C('#3e3524'), sstep(.75, 1, np.abs(r)) * .5)
    f.body(col, flat=3.2, gloss=.2, ambient=.7, diffuse=.42)
    arch = np.abs(f.v - (-2.2 * f.k * np.exp(-((f.t - .66) / .09) ** 2) * 2.2 + .4)) < .5; f.shade(arch & (f.t > .1) & (f.t < .8), f=.62)   # the lateral line, arched over the fin
    f.gill(.8, .04, r0=-.55, r1=.75); f.seg((1.0, 1.2), (.915, 4.2), .55, .3)
    f.fanfin(.72, 1.8, 20, 8.5, 40, '#6a5c3c', '#b8a678', rootw=2.2, rays=5, dark=.66, shape=(.8, 1, .85, .5))
    for t_, v_ in ((.885, -4.8), (.91, -.6)):
        x, y = f.P(t_, v_ * f.k); f.cv.eye(x, y, 3.1, iris='#c9b25a', socket='#8a7a52')
    return finish(f.cv, f.seed, 29)
def shark():
    f = Fish([(15, 73), (19, 54), (33, 36), (53, 24), (79, 17)],
             [(0, 1.6), (.1, 2.4), (.3, 4.6), (.5, 6.2), (.68, 6.8), (.82, 6.2), (.92, 4.6), (.97, 3.0), (1, 1.5)],
             [(0, 1.6), (.1, 2.4), (.3, 4.8), (.5, 6.6), (.68, 7.0), (.82, 6.2), (.92, 4.4), (.97, 2.8), (1, 1.3)], seed=7, k=1.16)
    c0, c1 = '#3e4448', '#6c7478'; tip = tipfin('#1c2024', .55, .6); kw = dict(rays=1, duty=0, smooth=False, tex=tip)
    f.tail(18, 8, 6.5, c0, c1, fork=.5, kick=-20, lowf=.5, **kw)
    f.edgefin('d', .63, .5, [(.625, .6), (.535, 10.5), (.51, 9.6), (.5, 3), (.47, 1)], c0=c0, c1=c1, **kw)
    f.edgefin('d', .3, .22, [(.295, .5), (.235, 6.2), (.215, 5.6), (.21, 1.6), (.19, .6)], c0=c0, c1=c1, **kw)
    f.edgefin('v', .26, .19, [(.255, .5), (.2, 4.4), (.185, 4), (.18, 1), (.17, .4)], c0=c0, c1=c1, **kw)
    f.edgefin('v', .44, .36, [(.435, .5), (.375, 5), (.355, 4.4), (.35, 1), (.33, .4)], c0='#6a7074', c1='#a4aaac', **kw)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#22272b'), (-.6, '#474e53'), (-.2, '#737b7f'), (.12, '#959c9e'), (.3, '#e4e5e0'), (1, '#ffffff')])
        saddle = np.exp(-((np.mod(t * 9.5 + .2, 1) - .5) / .23) ** 2) * sstep(.02, -.5, r) * (1 - sstep(.86, .94, t))
        return lerp3(c, C('#15181b'), np.clip(saddle * 1.25, 0, 1) * .9)
    f.body(col, gloss=.5, flat=1.35)
    f.shade(f.spotmask(34, (.6, 1.1), (.06, .84), (-.3, .22), 1), col='#15181b')
    for tg in (.74, .765, .79, .815, .84): f.seg((tg, -1.6 * f.k), (tg - .008, 2.6 * f.k), .42, .42)
    f.seg((.985, 2.2), (.925, 3.4), .5, .35)
    f.fanfin(.73, 4.6, 58, 14, 26, '#454b4f', '#7b8286', rootw=4.5, rays=1, duty=0, smooth=False, tex=tip, shape=(.55, 1, .9, .3))
    x, y = f.P(.935, -2.0 * f.k); f.cv.eye(x, y, 2.5, iris='#c7cfb4'); f.cv.stamp(*f.P(.985, .4), '#15181b')
    return finish(f.cv, f.seed, 17, power=1.15)
def sturgeon():
    f = Fish([(14, 74), (18, 55), (32, 37), (52, 26), (80, 19)],
             [(0, 1.6), (.1, 2.4), (.3, 4.6), (.5, 5.8), (.7, 6.0), (.82, 5.4), (.9, 4.0), (.95, 2.7), (1, 1.1)],
             [(0, 1.6), (.1, 2.6), (.3, 5.0), (.5, 6.4), (.7, 6.4), (.82, 5.2), (.9, 3.6), (.95, 2.3), (1, 1.0)], seed=8, k=1.18)
    c0, c1 = '#454a42', '#8a8f80'
    f.tail(17, 9, 6.5, c0, c1, fork=.45, kick=-16, lowf=.55, rays=9, dark=.68)
    f.edgefin('d', .27, .16, [(.265, .6), (.225, 6.6), (.17, 5.4), (.13, 1.6)], c0=c0, c1=c1, rays=6, dark=.66)
    f.edgefin('v', .2, .12, [(.195, .5), (.165, 5), (.12, 4.2), (.095, 1.2)], c0=c0, c1=c1, rays=5, dark=.68)
    f.edgefin('v', .36, .29, [(.355, .5), (.32, 5), (.275, 4.4), (.255, 1.2)], c0='#6c7166', c1='#b2b6a8', rays=4, dark=.7)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#22261f'), (-.6, '#454b40'), (-.2, '#747a6a'), (.15, '#a2a694'), (.45, '#dedccb'), (1, '#fbf8ea')])
        return lerp3(c, C('#30342c'), (noise(u, v, 1.6, 2) - .5) * .8 * sstep(.3, -.4, r))
    f.body(col, gloss=.3, flat=1.4)
    f.rowmarks(-.86, 13, 1.7, 1.5, .1, .82, '#e6e2c8'); f.rowmarks(-.04, 26, 1.25, 1.3, .06, .8, '#e6e2c8'); f.rowmarks(.62, 11, 1.4, 1.1, .1, .74, '#fffbe8')
    f.gill(.795, .035, r0=-.6); f.seg((.93, 1.2 * f.k), (.905, 2.6 * f.k), .5, .35)
    f.fanfin(.775, 4.4, 48, 10.5, 34, '#585d54', '#9da294', rootw=3, rays=5, dark=.68, shape=(.7, 1, .85, .45))
    f.eye(.862, -2.8, 2.5, iris='#d2c88e')
    for a in (.925, .94, .955, .968): f.whisker([(a, float(f.bot(a)) * .9), (a + .004, float(f.bot(a)) + 3.6)], '#e6dec6')
    return finish(f.cv, f.seed, 16, power=1.15)
def tuna():
    f = Fish([(21, 68), (25, 49), (40, 32), (58, 23), (77, 21)],
             [(0, 1.2), (.06, 1.6), (.2, 4.6), (.4, 8.8), (.6, 10.2), (.76, 9.4), (.88, 7.0), (.95, 4.4), (.99, 2.2), (1, 1.1)],
             [(0, 1.2), (.06, 1.6), (.2, 4.8), (.4, 9.2), (.6, 10.6), (.76, 9.6), (.88, 7.0), (.95, 4.6), (.99, 2.4), (1, 1.2)], seed=9, k=1.1)
    c0, c1 = '#121c36', '#33487a'; Y0, Y1 = '#c9a21e', '#f2d64a'; kw = dict(rays=1, duty=0, smooth=False)
    f.tail(11, 15, 15, c0, c1, fork=.72, rays=9, dark=.7, t0=.01)
    f.edgefin('d', .66, .48, [(.655, .6), (.63, 5.6), (.56, 3.6), (.5, 1.6), (.47, .8)], c0=c0, c1=c1, rays=9, dark=.66, serr=.15)
    f.edgefin('d', .46, .39, [(.455, .5), (.39, 10.5), (.37, 10), (.385, 3.4), (.36, .6)], c0='#1a2a52', c1='#c8a836', **kw)
    f.edgefin('v', .42, .35, [(.415, .5), (.35, 9.5), (.33, 9), (.345, 3), (.32, .6)], c0='#8a94a4', c1='#e8cf4a', **kw)
    for i, t_ in enumerate(np.linspace(.33, .09, 7)):
        for side in 'dv': f.edgefin(side, t_ + .012, t_ - .014, [(t_ + .008, .2), (t_ - .022, 2.9 - i * .12), (t_ - .03, .3)], c0=Y0, c1=Y1, inset=.6, **kw)
    f.edgefin('v', .63, .58, [(.625, .5), (.59, 4.6), (.56, 4), (.55, 1)], c0='#3a4a6a', c1='#aab4c4', rays=3, dark=.7)
    def col(t, r, u, v):
        c = ramp(r, [(-1, '#070d1e'), (-.62, '#132447'), (-.36, '#1f448e'), (-.17, '#5f8cc4'), (-.04, '#c4d0da'), (.35, '#eef1f2'), (1, '#ffffff')])
        return lerp3(c, C('#b9c4d0'), sstep(.6, .68, noise(u, v * .5, 2.4, 5)) * sstep(.15, .5, r) * (1 - sstep(.8, 1, r)) * .7)
    f.body(col, gloss=.5, flat=1.3)
    f.gill(.795, .05); f.band(lambda r: .86 - .025 * (1 - r * r), -.2, .8, .4, .75); f.seg((1.0, .7), (.91, 2.8), .5, .3)
    f.fanfin(.74, 2.6, 14, 15, 16, '#101a32', '#2c3f6c', rootw=2.6, rays=1, duty=0, smooth=False, shape=(.9, 1, .6, .3))
    f.eye(.91, -1.6, 2.6, iris='#dfe4e8')
    return finish(f.cv, f.seed, 23, power=1.15)
# ---------------------------------------------------------------- the creatures without a spine
def xf(cx, cy, ang, sx=1., sy=None):
    a = math.radians(ang); c, s_ = math.cos(a), math.sin(a); sy = sx if sy is None else sy
    return lambda pts: [(cx + x * sx * c - y * sy * s_, cy + x * sx * s_ + y * sy * c) for x, y in pts]
def speck(amt=.3, scale=1.4, k=0, rim=None, rimw=2.2):
    def tex(base, X, Y, d):
        c = base * (1 + amt * (noise(X, Y, scale, k) - .5) * 2)[..., None]
        return lerp3(c, C(rim), sstep(rimw, 0, d) * .55) if rim else c
    return tex
def crab():
    cv = Canvas(); T = xf(48, 47, -9, 1.02); A, Bc, TIP = '#b85632', '#dc8848', '#f6e6c8'
    for side in (-1, 1):   # the walking legs, back pair first
        for i in (3, 2, 1, 0):
            ax, ay = [(13, 3.5), (11.5, 6), (8.5, 8), (5, 9)][i]; a0 = [-10, 16, 42, 66][i]; x, y = ax, ay; segs = []
            for l, a in zip([10, 8.5, 7], [a0 - 24, a0 + 30, a0 + 68]):
                nx, ny = x + l * math.cos(math.radians(a)), y + l * math.sin(math.radians(a)); segs.append([(side * x, y), (side * nx, ny)]); x, y = nx, ny
            cv.limb(T(segs[0]), 3.8, 3.0, A, gloss=.3); cv.limb(T(segs[1]), 2.8, 2.2, Bc, gloss=.3); cv.limb(T(segs[2]), 2.0, .6, TIP, gloss=.2)
            cv.drips.append(T([segs[2][1]])[0])
    for side in (-1, 1):   # the arms and claws, held high
        m = lambda pts: T([(side * x, y) for x, y in pts])
        cv.limb(m([(11, -6), (17, -8.5), (21, -13)]), 4.6, 5.0, A)
        cv.limb(m([(25.2, -24), (26.2, -29.5), (23.8, -34.5)]), 3.4, 1.0, Bc); cv.limb(m([(25.6, -31.5), (23.8, -34.8)]), 1.8, .8, TIP, seam=1)
        cv.limb(m([(20.6, -24), (17.8, -29), (19.6, -34.6)]), 3.0, 1.0, Bc); cv.limb(m([(18.2, -31.6), (19.7, -34.9)]), 1.6, .8, TIP, seam=1)
        cv.part(m([(19, -14.5), (25.5, -14), (28, -20), (26.8, -26), (21, -26.5), (17.8, -20.5)]), '#c2603a', bulge=3.4, tex=speck(.22, 1.2, 2, '#e8a468'))
    for k in range(11):   # the toothed front edge of the shell
        x = -15 + 3 * k; cv.disc(*T([(x, -9.3 + (x / 15) ** 2 * 4.4)])[0], 1.5, '#e0a068', gloss=.1)
    for side in (-1, 1): cv.limb(T([(side * 3.2, -9), (side * 3.9, -12.6)]), 1.8, 1.6, '#c87a4a')
    shell = [(-17.5, -2), (-14.5, -7), (-7, -9.6), (0, -10.2), (7, -9.6), (14.5, -7), (17.5, -2), (13.5, 4.5), (7, 8.5), (0, 9.6), (-7, 8.5), (-13.5, 4.5)]
    cv.part(T(shell), '#9c3f2c', bulge=6.5, gloss=.5, tex=speck(.3, 1.3, 1, '#d8905a', 2.6))
    for pts in ([(-9, -3.5), (-5, -1), (-3.5, 3), (-6, 6)], [(9, -3.5), (5, -1), (3.5, 3), (6, 6)], [(-3.5, -4), (0, -2.6), (3.5, -4)]):   # the grooves across the shell
        cv.limb(T(pts), 1.0, 1.0, '#6a2a20', bulge=.4, seam=1, gloss=0)
    for side in (-1, 1):
        x, y = T([(side * 4.0, -13.4)])[0]
        for dx in (0, 1):
            for dy in (0, 1): cv.stamp(x + dx - .5, y + dy - .5, '#0a0a0c')
        cv.stamp(x - .5, y - .5, '#ffffff')
    return finish(cv, 11, 48, ncol=26, power=1.25, jets=9)
def lobster():
    cv = Canvas(); path = resample([(21, 71), (26, 60), (36, 52), (49, 47), (61, 40), (70, 31)], 300)
    g = np.gradient(path, axis=0); tan = g / np.linalg.norm(g, axis=1)[:, None]; nrm = np.stack([-tan[:, 1], tan[:, 0]], 1)
    at = lambda s_, a=0., b=0.: tuple(path[int(s_ * 299)] + tan[int(s_ * 299)] * a + nrm[int(s_ * 299)] * b)
    A, D, Lc, PALEc = '#a8442a', '#7c2f20', '#d0743a', '#f2c88c'
    cv.limb([at(.95, 0, -2), (85, 25), (92, 36), (91, 52)], 3.0, .7, '#8c3a24', gloss=.3)                                     # the far feeler
    for i, a in enumerate((-56, -28, 0, 28, 56)):   # the tail fan
        d = -tan[0] * math.cos(math.radians(a)) + nrm[0] * math.sin(math.radians(a)); pr = np.array([-d[1], d[0]]); o = path[4]
        cv.part([tuple(o - pr * 2), tuple(o + d * 5 - pr * 3.2), tuple(o + d * 9.5), tuple(o + d * 5 + pr * 3.2), tuple(o + pr * 2)], '#b8562e', bulge=1.6, tex=speck(.2, 1.2, 3, '#f0c070', 1.6))
        cv.drips.append(tuple(o + d * 9.5))
    for i in range(5):   # walking legs under the body
        s_ = .5 + i * .075; p0 = at(s_, 0, 5.5); sw = -14 + i * 9
        d1 = tan[int(s_ * 299)] * math.sin(math.radians(sw)) + nrm[int(s_ * 299)] * math.cos(math.radians(sw)); p1 = (p0[0] + d1[0] * 8, p0[1] + d1[1] * 8)
        p2 = (p1[0] + d1[0] * 3 - 3.5 + i * .8, p1[1] + 8.5); p3 = (p2[0] - 1.5, p2[1] + 5)
        cv.limb([p0, p1], 2.6, 2.0, Lc); cv.limb([p1, p2], 2.0, 1.5, PALEc if i % 2 else Lc); cv.limb([p2, p3], 1.4, .5, PALEc)
    for i in range(6):   # the armoured tail, segment by segment, each overlapping the one behind
        s_ = .07 + i * .066; w = 5.4 + i * .28
        loc = [(-3.7, -w), (0, -w - .5), (3.7, -w), (4.3, 0), (3.6, w * .75), (.6, w + 2.0), (-2.6, w * .75), (-4.1, 0)]
        cv.part([at(s_, a, b) for a, b in loc], A, bulge=3.6, gloss=.45, tex=speck(.2, 1.3, i, '#d86a38', 1.4))
        for b in (-2.6, 1.6): x, y = at(s_, .6, b); cv.stamp(x, y, '#f6d8a0')
    n = 26; ss = np.linspace(.44, .88, n); wd = np.interp(ss, [.44, .56, .74, .88], [6.2, 7.6, 7.4, 5.2])
    cv.part([at(a, 0, -b) for a, b in zip(ss, wd)] + [at(.9, 0, 0)] + [at(a, 0, b) for a, b in zip(ss[::-1], wd[::-1])], '#8a3622', smooth=False, bulge=6, gloss=.5, tex=speck(.34, 1.1, 5, '#c85c34', 2.0))
    rs = np.random.RandomState(12)
    for _ in range(34):
        x, y = at(rs.uniform(.47, .86), 0, rs.uniform(-6, 4)); cv.stamp(x, y, '#f0b070' if rs.rand() < .6 else '#5a2018')
    cv.part([at(.86, 0, -4.4), at(.93, 0, -3.6), at(.975, 0, -1.2), at(.975, 0, 1.6), at(.93, 0, 3.4), at(.86, 0, 4.4)], '#9a3e26', bulge=3.2)
    for b in (-3.4, -1.0): cv.limb([at(.95, 0, b), at(.985, 3.5, b - 1.6)], 1.6, .5, '#f0c88c')                                 # horns over the eyes
    ex_, ey_ = at(.93, .5, -4.6); cv.disc(ex_, ey_, 1.7, '#3a1a14')
    cv.stamp(ex_, ey_, '#0a0a0c'); cv.stamp(ex_ - 1, ey_ - 1, '#ffffff')
    cv.limb([at(.94, 0, 1.4), (77, 22), (78, 10), (65, 4), (44, 6)], 3.6, .8, '#a23f26', gloss=.35)                             # the near feeler, swept back over the body
    for q in resample([(77, 22), (78, 10), (65, 4), (44, 6)], 9)[1:-1]: cv.stamp(q[0], q[1] - 1, '#f0b070')
    cv.line([at(.975, 0, 0), (80, 30), (86, 29)], '#c0562e', late=True); cv.line([at(.975, 0, 1), (79, 33), (84, 35)], '#c0562e', late=True)
    return finish(cv, 12, 22, ncol=26, power=1.1)
def squid():
    cv = Canvas(); T = xf(37, 57, -52)
    arm0, arm1 = '#c07a7c', '#eeb8b0'
    for i, o in enumerate((-4.2, -3, -1.8, -.6, .6, 1.8, 3, 4.2)):   # eight arms, trailing
        wig = (1.6 if i % 2 else -1.6); ln = 23 + (i * 5) % 4
        pts = [(-5, o), (-12, o * 1.7 + wig), (-19, o * 2.3 - wig), (-ln, o * 2.7 + wig * .7), (-ln - 5, o * 2.9)]
        cv.limb(T(pts), 2.6, .6, arm0 if i % 2 else arm1, gloss=.3); cv.drips.append(T([pts[-1]])[0])
    for o, ln in ((-2.2, 31), (2.4, 29)):   # two long tentacles, ending in clubs
        pts = [(-5, o), (-16, o * 2.6), (-ln, o * 1.4)]; cv.limb(T(pts), 1.5, 1.0, arm0)
        cv.limb(T([(-ln, o * 1.4), (-ln - 5, o * .9)]), 2.6, 1.2, arm1)
    for side in (-1, 1):   # the fins at the tip of the mantle
        cv.part(T([(24, side * 5), (29, side * 14.5), (37, side * 12.5), (44.5, side * .5), (34, side * 3)]), '#e2a8a6', bulge=1.3, tex=speck(.16, 1.5, 2, '#f6d8d0', 1.4))
    def skin(base, X, Y, d):
        dots = sstep(.63, .7, noise(X, Y, 1.25, 4)) * .85 + sstep(.66, .74, noise(X + 5, Y, 2.1, 6)) * .5
        back = sstep(5.5, 1.2, d) * 0 + 1
        return lerp3(base, C('#9a3848'), np.clip(dots, 0, 1) * back)
    cv.part(T([(-7, -4.2), (-2, -5.4), (3.5, -5), (3.5, 5), (-2, 5.4), (-7, 4.2)]), '#d8a09c', bulge=4.2, tex=skin)       # head
    mant = [(2.5, -6.4), (8, -7.6), (16, -7.8), (26, -6.4), (36, -3.8), (44.5, 0), (36, 3.8), (26, 6.4), (16, 7.8), (8, 7.6), (2.5, 6.4)]
    cv.part(T(mant), lambda X, Y: ramp((X - Y) / 60., [(-.4, '#f4dcd2'), (.3, '#e8b4ac'), (.8, '#d48a88')]), bulge=6.5, gloss=.6, tex=skin)
    cv.limb(T([(3.2, -5.6), (2.6, 0), (3.2, 5.6)]), 1.0, 1.0, '#b06870', bulge=.4, seam=1, gloss=0)                              # the collar
    x, y = T([(-2.2, 2.6)])[0]; cv.eye(x, y, 3.0, iris='#e6eadc', socket='#5a2c38')
    return finish(cv, 13, 21, ncol=26, power=1.1)
def ray():
    cv = Canvas(); T = xf(52, 43, -40); TOP, DK, UNDER = '#6e5a42', '#42362a', '#f4f0e4'
    def hide(base, X, Y, d):
        c = base * (1 + .24 * (fbm(X, Y, 5, 3) - .5) * 2)[..., None]
        return lerp3(c, C('#33291f'), sstep(.62, .74, noise(X, Y, 2.2, 6)) * .4)
    cv.limb(T([(-14, 0), (-25, 2), (-37, 7), (-49, 15)]), 2.8, .6, DK, gloss=.2)                                              # the whip tail
    cv.part(T([(-15, -1), (-19.5, -5), (-22, -1)]), DK, bulge=1, smooth=False)
    far = [(15.5, -4), (10, -9), (7.5, -17), (10.5, -27), (2.5, -22), (-5, -14), (-12.5, -6), (-15.5, -2), (-8, 0), (8, 0)]              # the far wing, thrown up so its pale underside shows
    belly = lambda base, X, Y, d: lerp3(base, C('#a9a8a4'), sstep(4.5, 0, d) * .45 + sstep(.6, .75, noise(X, Y, 3, 2)) * .08)
    cv.part(T(far), UNDER, bulge=3.0, gloss=.2, tex=belly)
    cv.limb(T([(15.5, -4.4), (10, -9.6), (7.4, -17.4), (10.6, -27.2)]), 2.2, 1.0, TOP, gloss=.2)                               # its leading edge, seen from above
    for k in range(4): cv.limb(T([(4.5 - k * 2.6, -4.2 - k * .2), (3.6 - k * 2.6, -7.4 - k * .3)]), .8, .8, '#8c8a86', bulge=.3, seam=1, gloss=0)   # gill slits
    near = [(21, 0), (19.5, 3.4), (15, 5.6), (11, 10), (5.5, 18), (0, 26.5), (-1.8, 28.5), (-4.8, 23.5), (-8.5, 15), (-12.5, 7.5), (-15.5, 3), (-16, 0), (-15, -2.6), (-8, -4), (4, -5.2), (15, -4.4), (19.5, -3)]
    cv.part(T(near), TOP, bulge=2.8, gloss=.35, tex=hide)
    cv.part(T([(20, 0), (16, 4.6), (4, 5.8), (-8, 4.2), (-15.5, 0), (-8, -3.8), (4, -5), (16, -4.2)]), '#7c684e', bulge=5.4, seam=1, gloss=.5, tex=hide)   # the raised body
    cv.limb(T([(13, 6.5), (8, 13.5), (3, 21), (-1, 27)]), 1.0, .6, '#927a5a', bulge=.4, seam=1, gloss=0)                        # light catching the near wing's front edge
    for side in (1, -.8):
        x, y = T([(14.4, 5.0 * side)])[0]; cv.disc(x, y, 2.2, '#57483a', seam=.8); cv.stamp(x, y, '#0a0a0c'); cv.stamp(x + 1, y, '#0a0a0c'); cv.stamp(x, y - 1, '#f6f2e6')
    cv.drips += [T([(-1.8, 28.5)])[0], T([(-30, 4)])[0], T([(-12, 7)])[0]]
    return finish(cv, 10, 19, ncol=26, power=1.1)
KINDS = {'trout': trout, 'sunfish': sunfish, 'crappie': crappie, 'bass': bass, 'catfish': catfish, 'fish': lambda: trout('silver'),
         'flatfish': flatfish, 'shark': shark, 'sturgeon': sturgeon, 'tuna': tuna, 'ray': ray, 'crab': crab, 'lobster': lobster, 'squid': squid}

