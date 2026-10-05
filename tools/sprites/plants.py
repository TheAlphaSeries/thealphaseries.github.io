# The Herbarium, drawn with the same tools as the Bestiary: lit, layered parts cut down to pixels.
# Every plant has two pictures, living and perished.
from fishkit import *
SP = {}
def cyl(cv, pts, col, cx, hw, gloss=.25, tex=None, seam=.62):   # an upright round thing (a pot), lit across its width
    m = cv.polymask(pts, smooth=False); nx = np.clip((XX - cx) / hw, -1, 1); nz = np.sqrt(1 - nx * nx)
    lam = np.clip(nx * L[0] + nz * L[2] - .25 * L[1] * 0, 0, 1); base = np.broadcast_to(C(col), (R, R, 3)).copy(); d = ndi.distance_transform_edt(m) / Q
    if tex is not None: base = tex(base, XX, YY, d)
    c = base * (.48 + .78 * lam)[..., None]; hl = np.clip(nx * Hh[0] + nz * Hh[2], 0, 1) ** 22 * gloss; c = c + (255 - c) * hl[..., None]
    under = cv.a & m & (d < .85); c[under] *= seam; cv.put(m, np.clip(c, 0, 255)); return m
def pot(cv, cx, y0, y1, w0, w1, col, rim=3, lip=1.6, soil='#33261c'):
    cyl(cv, [(cx - w0 / 2, y0 + rim), (cx + w0 / 2, y0 + rim), (cx + w1 / 2, y1), (cx - w1 / 2, y1)], col, cx, w0 / 2)
    cyl(cv, [(cx - w0 / 2 - lip, y0), (cx + w0 / 2 + lip, y0), (cx + w0 / 2 + lip, y0 + rim), (cx - w0 / 2 - lip, y0 + rim)], mixh(col, '#ffffff', .14), cx, w0 / 2 + lip)
    cv.part([(cx - w0 / 2 + .5, y0 - 1.2), (cx + w0 / 2 - .5, y0 - 1.2), (cx + w0 / 2 - .5, y0 + .4), (cx - w0 / 2 + .5, y0 + .4)], soil, bulge=.8, smooth=False, gloss=0, tex=speck(.4, 1.2, 3))
def tray(cv, cx, y0, y1, w, col, moss='#5a8f3e', mound=5, mw=None):   # a shallow bonsai tray with a mossy mound
    mw = mw or w - 8; pts = [(cx - mw / 2, y0 + 1)] + [(cx - mw / 2 + mw * k / 10, y0 + 1 - mound * math.sin(math.pi * k / 10) ** .7 * (.85 + .15 * math.sin(k * 2.1))) for k in range(1, 10)] + [(cx + mw / 2, y0 + 1)]
    cv.part(pts, moss, bulge=mound * .8, gloss=0, tex=speck(.5, 1.3, 2))
    cyl(cv, [(cx - w / 2, y0), (cx + w / 2, y0), (cx + w / 2 - 3, y1), (cx - w / 2 + 3, y1)], col, cx, w / 2 * 1.05, gloss=.2)
    cyl(cv, [(cx - w / 2 - 1, y0 - 1), (cx + w / 2 + 1, y0 - 1), (cx + w / 2 + 1, y0 + 1), (cx - w / 2 - 1, y0 + 1)], mixh(col, '#ffffff', .16), cx, w / 2 * 1.05)
    for sx in (-1, 1): cv.part([(cx + sx * (w / 2 - 12), y1), (cx + sx * (w / 2 - 6), y1), (cx + sx * (w / 2 - 6), y1 + 2), (cx + sx * (w / 2 - 12), y1 + 2)], dk(col, .7), bulge=1, smooth=False, gloss=0)
SHAPES = {   # half of a leaf's outline: (how far from stalk to tip, half-width); negative reaches back behind the stalk
    'heart': [(0, 0), (-.16, .28), (-.25, .62), (-.15, .92), (.1, 1.0), (.4, .92), (.7, .6), (.9, .25), (1, 0)],
    'lance': [(0, 0), (-.05, .42), (-.03, .82), (.07, 1.0), (.3, .98), (.6, .8), (.85, .42), (1, 0)],
    'monstera': [(0, 0), (-.14, .4), (-.2, .76), (-.08, 1.0), (.2, 1.06), (.5, .96), (.75, .68), (.92, .32), (1, 0)],
    'strap': [(0, .5), (.1, 1), (.6, .9), (.9, .5), (1, 0)],
    'grape': [(0, 0), (-.16, .5), (-.06, .98), (.14, .78), (.3, 1.08), (.46, .7), (.6, .84), (.78, .4), (.88, .46), (1, 0)]}
def leaf(cv, base, tip, width, shape, col, vein=None, nv=5, bend=0., bulge=1.6, gloss=.08, tex=None, slots=0, holes=0, veinw=.8, mid=1.1, rim=None, seam=.6, vamt=1.):
    b, t = np.array(base, float), np.array(tip, float); ax = t - b; ln = np.linalg.norm(ax); ax /= ln; pr = np.array([-ax[1], ax[0]])
    def M(u, v): return tuple(b + ax * u * ln + pr * (v * width / 2 + bend * ln * 4 * u * (1 - u) * (1 if u > 0 else 0)))
    half = SHAPES[shape]; poly = [M(u, v) for u, v in half] + [M(u, -v) for u, v in half[::-1][1:-1]]
    m = cv.polymask(poly, smooth=(shape != 'grape'))
    wd = lambda u: np.interp(u, [p[0] for p in half if p[0] >= 0][0:] or [0, 1], [p[1] for p in half if p[0] >= 0][0:] or [1, 0])
    for side in (-1, 1):
        for k in range(slots):   # the cuts in from the edge of a monstera leaf
            u0 = .16 + .68 * (k + .5) / slots; w_ = float(np.interp(u0, [.0, .2, .5, .75, .92, 1], [1, 1.06, .96, .68, .32, 0]))
            m &= ~cv.polymask([M(u0 - .035, side * w_ * 1.3), M(u0 + .05, side * w_ * 1.3), M(u0 - .06, side * .34), M(u0 - .09, side * .34)], smooth=False)
        for k in range(holes):
            u0 = .2 + .55 * (k + .5) / holes; cx_, cy_ = M(u0, side * .2); m &= ~(((XX - cx_) / 1.5) ** 2 + ((YY - cy_) / 1.5) ** 2 < 1)
    tx = tex
    if rim: tx = (lambda base_, X, Y, d, t0=tex: lerp3(t0(base_, X, Y, d) if t0 else base_, C(rim), (d < .9) * .8))
    cv.part(None, col, bulge=bulge, mask=m, gloss=gloss, tex=tx, seam=seam)
    if vein:
        cv.limb([M(0, 0), M(.5, 0), M(.98, 0)], mid, .5, vein, bulge=.35, seam=1, gloss=0, clip=m)
        for side in (-1, 1):
            for k in range(nv):
                u0 = .04 + .72 * k / max(1, nv - 1) if nv > 1 else .3; w_ = float(np.interp(min(1, u0 + .2), [p[0] for p in half], [p[1] for p in half]))
                cv.limb([M(u0, 0), M(u0 + .1, side * w_ * .55), M(u0 + .2 if u0 > .1 else u0 - .12, side * w_ * .96)], veinw, .4, mixh(col, vein, vamt), bulge=.3, seam=1, gloss=0, clip=m)
    return M
def bark(a=.3, sx=.9, sy=5., k=1): return lambda base, X, Y, d: base * (1 + a * (noise(X * 3 / sx, Y / sy * 1.2, 1., k) - .5) * 2)[..., None]
def pad(cv, cx, cy, rx, ry, col, seed=0, tips=None, spiky=.3, n=22, bulge=None):   # a cloud of foliage
    rs = np.random.RandomState(seed); pts = []
    for i in range(n):
        a = 2 * math.pi * i / n; k = 1 + spiky * (rs.rand() - .35); pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
    cv.part(pts, col, bulge=bulge or ry * .8, smooth=False, gloss=0, tex=speck(.5, 1.1, seed), seam=.7)
    if tips:
        for _ in range(int(rx * ry * .22)):
            a = rs.rand() * 6.28; r_ = rs.rand() ** .5; cv.stamp(cx + rx * r_ * math.cos(a) * .9, cy + ry * r_ * math.sin(a) * .9 - .5, tips)
# ------------------------------------------------------------------ house plants
def anthurium(dead=False):
    cv = Canvas(); W = '#6a4a30'
    for x0, x1 in ((38, 35), (58, 61)): cv.limb([(x0, 48), (x1, 93)], 2.6, 2.6, W, gloss=.1)
    cv.limb([(36.5, 74), (59.5, 74)], 2, 2, dk(W, .85), gloss=.1); cv.part([(33, 45.5), (63, 45.5), (63, 48.5), (33, 48.5)], mixh(W, '#ffffff', .1), bulge=1.4, smooth=False, gloss=.1)
    pot(cv, 48, 29, 45.5, 22, 16, '#b5653a', soil='#6a5a3e')
    G, V, ST = ('#1f3a2a', '#d0dcc6', '#4e7a45') if not dead else ('#5a3a1e', '#8a6a3a', '#7a6a42')
    vel = lambda base, X, Y, d: lerp3(base, C('#14261c' if not dead else '#3e2814'), sstep(.45, .7, fbm(X, Y, 6, 2)) * .5)
    if not dead:
        L_ = [((30, 21), (23, 76), 15, (47, 29), (36, 15)), ((73, 23), (81, 70), 13, (50, 29), (62, 14)), ((61, 13), (65, 74), 15, (49, 28), (55, 8)), ((41, 13), (38, 68), 14, (48, 28), (44, 7))]
        cv.limb([(49, 28), (51, 18), (54, 8)], 1.6, 1.2, '#6f9a55'); leaf(cv, (54, 9), (57, -3), 7, 'lance', '#5e8a4a', '#b8d0a0', 3, bulge=1.2)
        for base, tip, w, p0, p1 in L_:
            cv.limb([p0, p1, base], 1.8, 1.4, ST, gloss=.1); leaf(cv, base, tip, w, 'lance', G, V, 7, bend=.01, bulge=2.0, gloss=.04, tex=vel, mid=1.3, veinw=.9, vamt=.8)
    else:
        for p0, p1, p2 in (((47, 29), (40, 20), (33, 34)), ((50, 29), (60, 22), (66, 40)), ((48, 28), (46, 16), (42, 26))): cv.limb([p0, p1, p2], 1.8, 1.0, ST, gloss=0)
        for base, tip, w in (((33, 33), (27, 68), 9), ((66, 39), (71, 62), 8)):
            leaf(cv, base, tip, w, 'lance', G, V, 5, bend=.03, bulge=1.2, gloss=0, tex=vel, slots=3, vamt=.5)
        cv.part([(20, 91), (30, 89.5), (36, 92), (26, 93)], '#4a3018', bulge=1, gloss=0)                                  # a fallen leaf
    return finish(cv, 61 + dead, water=False, ncol=28)
def gloriosum(dead=False):
    cv = Canvas()
    cv.part([(14, 75), (82, 75), (79, 91), (17, 91)], '#d8cfb8', bulge=2.6, smooth=False, gloss=.3); cv.part([(12.5, 72.6), (83.5, 72.6), (83.5, 75.6), (12.5, 75.6)], '#e8e0cc', bulge=1.5, smooth=False, gloss=.3)
    cv.part([(15, 71), (81, 71), (81, 73), (15, 73)], '#3a2c20', bulge=.8, smooth=False, gloss=0, tex=speck(.4, 1.2, 3))
    G, V, ST, RH = ('#2e5a36', '#f0f2e4', '#5c8a4e', '#6a7a45') if not dead else ('#6b4423', '#a88a50', '#8a7a4a', '#2a2018')
    cv.limb([(22, 70.5), (46, 69.5), (74, 70.5)], 4.6, 4.0, RH, gloss=.15)
    for x in (30, 42, 54, 66): cv.limb([(x, 68.4), (x + 1.4, 72)], 1.6, 1.6, '#c2a878' if not dead else '#4a3a2a', seam=1, gloss=0)
    vel = lambda base, X, Y, d: lerp3(base, C('#23472b' if not dead else '#4e3018'), sstep(.45, .7, fbm(X, Y, 6, 2)) * .5)
    if not dead:
        Ls = [((81, 45), (92, 66), 20, (68, 70)), ((23, 33), (8, 58), 27, (30, 70)), ((63, 27), (72, 57), 28, (56, 70)), ((40, 18), (35, 50), 30, (43, 70))]
        for base, tip, w, root in Ls:
            cv.limb([root, ((root[0] + base[0]) / 2 + (2 if base[0] > 48 else -2), (root[1] + base[1]) / 2), base], 2.0, 1.6, ST, gloss=.1)
            leaf(cv, base, tip, w, 'heart', G, V, 5, bulge=2.2, gloss=.04, tex=vel, mid=1.5, veinw=1.0, rim='#b88a90')
        cv.limb([(50, 70), (51, 58)], 1.6, 1.2, '#7aa862'); leaf(cv, (51, 58), (54, 71), 11, 'heart', '#6fa05a', '#f0c8cc', 3, bulge=1.4)
    else:
        for base, tip, w, root, c in (((22, 62), (5, 80), 20, (30, 70), '#6b4423'), ((70, 62), (90, 82), 20, (58, 70), '#9a8038'), ((44, 68), (40, 92), 20, (44, 70), '#5a3a1c')):
            cv.limb([root, ((root[0] + base[0]) / 2, root[1] - 9), base], 2.0, 1.4, ST, gloss=0)
            leaf(cv, base, tip, w, 'heart', c, V, 4, bend=.03, bulge=1.3, gloss=0, tex=vel, vamt=.5)
    return finish(cv, 63 + dead, water=False, ncol=28)
def monstera(dead=False):
    cv = Canvas(); pot(cv, 48, 70, 91, 30, 24, '#e8e4dc')
    cv.limb([(48, 70), (48, 12)], 6.5, 6, '#7a5e3a', gloss=0, tex=speck(.6, 1.1, 4))
    G, ST = ('#2f6b3a', '#4e7a3e') if not dead else ('#7a5a2a', '#6a5a34')
    def var(base, X, Y, d):
        if dead: return lerp3(lerp3(base, C('#c9b84a'), sstep(.5, .64, fbm(X, Y, 7, 3)) * .7), C('#4a3018'), sstep(.6, .7, noise(X, Y, 2.6, 5)) * .7)
        c = lerp3(base, C('#f3ebc8'), sstep(.68, .73, noise(X, Y, 1.2, 4)) * .95); return lerp3(c, C('#efe6bc'), sstep(.7, .74, fbm(X, Y, 8, 6)) * .95)
    if not dead:
        Ls = [((57, 19), (76, 5), 22, (48, 26)), ((41, 23), (24, 4), 24, (48, 32)), ((61, 37), (89, 49), 30, (48, 44)), ((34, 41), (8, 54), 30, (48, 50)), ((47, 42), (44, 71), 30, (48, 38))]
    else:
        Ls = [((62, 58), (84, 84), 24, (48, 46)), ((34, 58), (12, 82), 26, (48, 50)), ((48, 60), (51, 90), 24, (48, 44))]
        cv.part([(44, 64), (52, 64), (52, 70), (44, 70)], '#2b1e16', bulge=2, smooth=False, gloss=0)
    for i, (base, tip, w, root) in enumerate(Ls):
        mid_ = ((root[0] + base[0]) / 2, (root[1] + base[1]) / 2 - (4 if not dead else 8)); cv.limb([root, mid_, base], 2.2, 1.6, ST, gloss=.15)
        leaf(cv, base, tip, w, 'monstera', G, '#7fae62' if not dead else '#5a4420', 4, bulge=2.4, gloss=.45 if not dead else 0, tex=var, slots=4, holes=3 if w > 23 else 2, veinw=.6, vamt=.5, bend=.02 if dead else 0)
    if not dead:
        for p in ([(48, 56), (56, 62), (57, 70)], [(48, 60), (41, 66), (40, 71)]): cv.limb(p, 1.4, 1.0, '#7a5a3a', gloss=0)       # aerial roots
    return finish(cv, 65 + dead, water=False, ncol=30)
def orchid(dead=False):
    cv = Canvas(); pot(cv, 42, 75, 91, 20, 15, '#b5653a', soil='#8a6a44')
    LF, BU = ('#4f8a3c', '#8fb060') if not dead else ('#9a8440', '#8a6e3a')
    blades = [((36, 63), (16, 41), .1), ((37, 62), (29, 28), .05), ((44, 61), (43, 24), -.02), ((45, 61), (60, 36), -.08), ((50, 64), (70, 50), -.1)] if not dead else [((36, 64), (15, 66), -.14), ((45, 62), (60, 70), .16), ((43, 62), (34, 46), .1)]
    for base, tip, bend in blades:
        M = leaf(cv, base, tip, 5.5 if not dead else 4.5, 'strap', LF, mixh(LF, '#000000', .25), 0, bend=bend, bulge=1.4, gloss=.2 if not dead else 0)
        if dead: x, y = tip; cv.disc(x, y, 1.3, '#2a2018', gloss=0)
    for (x, y), (rx, ry) in (((36, 68), (4.4, 6.4)), ((44, 66), (5, 7.4)), ((51, 69), (4.2, 6))):
        pts = [(x + rx * math.cos(a) * (.72 if dead else 1), y + ry * math.sin(a)) for a in np.linspace(0, 6.28, 14)[:-1]]
        cv.part(pts, BU, bulge=3.2, gloss=.4 if not dead else 0, tex=(lambda base, X, Y, d: base * (1 - .32 * (np.mod(X * 1.1, 1.6) < .5))[..., None]) if dead else None)
        cv.limb([(x - rx * .7, y + ry * .8), (x + rx * .7, y + ry * .8)], 1.6, 1.6, '#c8b48a' if not dead else '#6a4e2a', seam=1, gloss=0)
    if dead:
        cv.limb([(47, 61), (50, 40), (58, 28), (70, 30)], 1.3, .8, '#b59a5e', gloss=0); cv.limb([(48, 74), (51, 34)], 1.0, 1.0, '#c8b890', gloss=0)
        return finish(cv, 68, water=False, ncol=24)
    cv.limb([(48, 74), (52, 20)], 1.0, 1.0, '#c8b890', gloss=0)                                                           # the stake
    spike = [(47, 61), (51, 38), (59, 17), (72, 7), (86, 7), (93, 13)]; cv.limb(spike, 1.6, .9, '#5a7a3a', gloss=.1)
    P1, P2, WH = '#4a1238', '#7a1e4a', '#f2e9f0'
    def flower(x, y, s=1., seed=0):
        rs = np.random.RandomState(seed)
        cv.part([(x - 2.4 * s, y + 1), (x - 3.6 * s, y + 4.5 * s), (x - 1.6 * s, y + 7 * s), (x, y + 6 * s), (x + 1.6 * s, y + 7 * s), (x + 3.6 * s, y + 4.5 * s), (x + 2.4 * s, y + 1)], '#e9d7e6', bulge=1.6, gloss=.2,
                tex=lambda base, X, Y, d: lerp3(base, C(P2), sstep(.5, .62, noise(X, Y, 1.5, seed)) * .9))                # the frilled lip
        for ang, L in ((90, 6.2), (158, 5.6), (22, 5.6), (214, 5.8), (326, 5.8)):
            a = math.radians(ang); tx, ty = x + math.cos(a) * L * s, y - math.sin(a) * L * s
            cv.limb([(x, y), ((x + tx) / 2 + math.sin(a) * .5, (y + ty) / 2 + math.cos(a) * .5), (tx, ty)], 3.0 * s, .7, P1 if ang != 90 else P2, gloss=.25, seam=.8)
            for _ in range(2): k = rs.uniform(.35, .8); cv.stamp(x + (tx - x) * k, y + (ty - y) * k, WH)
            cv.stamp(tx, ty, WH)
        cv.stamp(x, y + 1, '#e8c63a'); cv.stamp(x, y + 2, '#e8c63a'); cv.stamp(x - 1, y + 4, P1); cv.stamp(x + 1, y + 3, P1)
    for i, (x, y) in enumerate(((56, 36), (66, 22), (80, 17))): flower(x, y, 1.45 - i * .1, i + 3)
    for x, y in ((90, 9), (93.5, 14)): cv.disc(x, y, 1.7, '#6b1e52')                                                    # buds still to open
    return finish(cv, 67, water=False, ncol=30)
# ------------------------------------------------------------------ bonsai
def juniper(dead=False):
    cv = Canvas()
    cv.part([(22, 79), (78, 79), (75, 88), (25, 88)], '#6b4a3a', bulge=2.2, smooth=False, gloss=.12); cv.part([(20.5, 77.4), (79.5, 77.4), (79.5, 80), (20.5, 80)], '#7c5a48', bulge=1.3, smooth=False, gloss=.12)
    for sx in (30, 66): cv.part([(sx, 88), (sx + 5, 88), (sx + 5, 90.5), (sx, 90.5)], '#4a3228', bulge=1, smooth=False, gloss=0)
    cv.part([(24, 77.6), (34, 75.6), (48, 74.6), (62, 75.4), (76, 77.6)], '#5c8a3a' if not dead else '#9a8a4a', bulge=2.2, gloss=0, tex=speck(.5, 1.3, 2))
    BK, BONE = ('#7a4a32', '#e6e0d2') if not dead else ('#7e7468', '#d8d2c6')
    trunk = [(45, 77), (39, 67), (48, 56), (42, 45), (51, 33)]
    for p in ([(46, 57), (58, 55), (68, 52)], [(43, 46), (33, 43), (24, 41)], [(50, 36), (60, 31), (68, 28)], [(42, 45), (37, 36), (36, 30)]): cv.limb(p, 3.0, 1.6, BK, gloss=0, tex=bark())
    cv.limb(trunk, 9.5, 3.6, BK, gloss=.05, tex=bark(.34))
    cv.limb([(46, 76), (41.5, 67), (49.5, 56), (44, 46)], 2.6, 1.6, BONE, bulge=1, seam=.8, gloss=.1)                    # shari: a strip of bare, bleached wood
    cv.limb([(40, 64), (31, 60), (25, 55)], 2.6, .7, BONE, gloss=.1); cv.limb([(51, 33), (54, 25), (58, 18)], 2.4, .6, BONE, gloss=.1)   # jin: dead branch and dead top
    if not dead: F, TIP, pads = '#4a7a5c', '#9cc88a', [(70, 51, 14, 6.2), (22, 40, 13, 6), (69, 27, 12.5, 6), (36, 28, 10, 5.4), (48, 21, 13, 7), (57, 41, 8, 4.2)]
    else: F, TIP, pads = '#8a5a2e', '#c2a85a', [(70, 52, 11, 4.6), (23, 41, 10, 4.2), (68, 28, 9, 4), (47, 23, 10, 5)]
    for i, (x, y, rx, ry) in enumerate(pads): pad(cv, x, y, rx, ry, F, i + 1, TIP, spiky=.42)
    if dead:
        for p in ([(36, 30), (30, 24)], [(58, 41), (64, 38)], [(42, 45), (36, 40)]): cv.limb(p, 1.2, .6, BK, gloss=0)
        for x in (30, 38, 57, 66, 71): cv.stamp(x, 76, '#8a5a2e')
    return finish(cv, 71 + dead, water=False, ncol=28)
def grape(dead=False):
    cv = Canvas(); pot(cv, 46, 71, 91, 30, 24, '#2e4a6a')
    BK, CANE = ('#6a5240', '#b08a58') if not dead else ('#8e867a', '#8a6e4a')
    canes = [[(44, 40), (34, 30), (24, 27), (12, 31)], [(47, 42), (58, 30), (70, 27), (84, 30)], [(45, 38), (46, 26), (49, 15)]]
    for c in canes: cv.limb(c, 2.4, 1.0, CANE, gloss=0)
    cv.limb([(45, 71), (40, 60), (49, 49), (44, 38)], 10, 5, BK, gloss=0, tex=bark(.4, .8, 4)); cv.limb([(41, 63), (36, 58), (33, 60)], 3, 1.2, BK, gloss=0, tex=bark())
    G, V = ('#3f7a2e', '#a8cc7c') if not dead else ('#7a5228', '#a07a44')
    if not dead:
        lv = [((25, 27), (10, 15), 17), ((84, 30), (93, 46), 15), ((49, 17), (50, 0), 17), ((17, 30), (5, 45), 16), ((62, 29), (61, 11), 17), ((72, 28), (88, 16), 16), ((34, 31), (22, 44), 14)]
        for i, (b, t, w) in enumerate(lv): leaf(cv, b, t, w, 'grape', G if i % 3 else '#4c8a34', V, 3, bulge=1.8, gloss=.3, veinw=.7, mid=.9)
        def bunch(x, y, seed):
            rs = np.random.RandomState(seed); cv.limb([(x, y - 4), (x, y)], 1, 1, CANE, gloss=0)
            for r_, n in enumerate((3, 4, 3, 3, 2, 1)):
                for k in range(n): cv.disc(x + (k - (n - 1) / 2) * 3.6 + rs.uniform(-.4, .4), y + r_ * 3.1 + 1.5, 2.3, '#4a2460' if (k + r_) % 3 else '#5c3274', gloss=.55, seam=.72)
        bunch(34, 37, 1); bunch(60, 36, 2)
        cv.line([(84, 30), (89, 27), (92, 30), (90, 33), (87, 31), (88, 29)], '#7aa04a', late=True); cv.line([(12, 31), (8, 29), (5, 31), (7, 34), (9, 32)], '#7aa04a', late=True)
    else:
        for b, t, w in (((24, 28), (20, 42), 9), ((70, 28), (74, 41), 8)): leaf(cv, b, t, w, 'grape', G, V, 2, bulge=1.2, gloss=0, bend=.05)
        for x, y in ((33, 33), (34, 36), (32, 38), (35, 39), (60, 33), (61, 36)): cv.disc(x, y, 1.3, '#3a2220', gloss=0)
        cv.limb([(34, 30), (33.5, 34)], 1, 1, CANE, gloss=0); cv.limb([(60, 29), (60.5, 33)], 1, 1, CANE, gloss=0)
        cv.line([(84, 30), (88, 28), (90, 31), (88, 33)], '#8a6e4a', late=True); cv.part([(64, 92), (71, 90.6), (75, 92.6), (68, 93.6)], '#6a4420', bulge=1, gloss=0)
    return finish(cv, 73 + dead, water=False, ncol=30)
def maple(dead=False):
    cv = Canvas(); rs = np.random.RandomState(5); tray(cv, 48, 83, 88.5, 80, '#5e7a8a', '#5a8f3e' if not dead else '#9a8a4a', 5.5, 74)
    BK = '#8c8a7c' if not dead else '#6e665c'
    trees = [(46, 44, 1.7), (22, 47, 2.0), (71, 49, 1.9), (62, 40, 2.5), (30, 36, 2.9), (53, 29, 3.3), (40, 20, 4.4)]   # (where it stands, how high it reaches, how thick)
    tops = []
    for x, top, w in trees:
        lean = (x - 46) * .09; tip = (x + lean * 3, top); cv.limb([(x, 81), (x + lean, (81 + top) / 2 + 4), tip], w, max(.9, w * .35), BK, gloss=.05, tex=bark(.2))
        for k in range(3 if w > 2 else 2):
            y0 = top + 6 + k * (7 + w); sd = -1 if (k + int(x)) % 2 else 1; e = (x + lean * 2 + sd * (7 + w * 1.6), y0 - 6 - w); cv.limb([(x + lean * 1.6, y0), ((x + e[0]) / 2, y0 - 2), e], max(1.1, w * .45), .7, BK, gloss=0); tops.append((e[0], e[1], w))
            if dead:
                for j in (-1, 1): cv.limb([e, (e[0] + j * 3 + sd, e[1] - 4)], .9, .5, BK, gloss=0)
        tops.append((tip[0], tip[1], w + 1))
        if dead: cv.limb([tip, (tip[0] - 2, tip[1] - 5)], .9, .5, BK, gloss=0); cv.limb([tip, (tip[0] + 3, tip[1] - 4)], .9, .5, BK, gloss=0)
    if not dead:
        cols = ['#a81e24', '#c8382a', '#d8502a', '#e0762a', '#c8382a', '#b82a26']
        for i, (x, y, w) in enumerate(sorted(tops, key=lambda t: -t[2])[::-1]):
            for k in range(2): pad(cv, x + rs.uniform(-3, 3), y + rs.uniform(-3, 1), 5 + w * 1.25 + rs.uniform(0, 2), 3.6 + w * .8, cols[(i + k) % len(cols)], i * 3 + k, None, spiky=.5, n=18)
        for _ in range(110):   # single leaves picked out: tiny stars, lighter than the mass
            x, y = rs.uniform(8, 88), rs.uniform(8, 60)
            if cv.a[int(y * Q), int(x * Q)]:
                c = rs.choice(['#f09a4a', '#f0c060', '#e85a3a', '#b8d060']); cv.stamp(x, y, c)
                if rs.rand() < .5: cv.stamp(x + 1, y, c); cv.stamp(x, y + 1, c); cv.stamp(x - 1, y, c); cv.stamp(x, y - 1, c)
    else:
        for x, y, w in tops[::3]: cv.stamp(x + 1, y + 2, '#8a5a2a'); cv.stamp(x + 1, y + 3, '#6b4a2a')
        for _ in range(16): cv.stamp(rs.uniform(14, 82), rs.uniform(78.5, 81.5), rs.choice(['#8a5a2a', '#6b4a2a', '#a8642a']))
    return finish(cv, 75 + dead, water=False, ncol=30)
def redwood(dead=False):
    cv = Canvas(); rs = np.random.RandomState(9); tray(cv, 48, 84, 89.5, 82, '#5a4238', '#4f8a3a' if not dead else '#8a7a4a', 4.5, 76)
    BK = '#8a4a32' if not dead else '#7a6258'; G = ['#2f6a3a', '#3f7f45', '#28582f'] if not dead else ['#b5622a', '#8a4e28', '#6e4428']
    trees = [(77, 46, 3.2), (21, 40, 3.6), (67, 31, 4.4), (31, 25, 5.0), (57, 17, 5.6), (44, 7, 7.0)]
    furrow = lambda base, X, Y, d: base * (1 - .3 * (np.mod(X * 1.25, 1.5) < .42) + .12 * (noise(X, Y, 1.4, 3) - .5))[..., None]
    for x, top, w in trees:
        H = 83 - top
        cv.part([(x - w * 1.25, 83.5), (x - w * .55, 76), (x + w * .55, 76), (x + w * 1.25, 83.5)], BK, bulge=w * .8, gloss=0, tex=furrow)        # the flared foot
        cv.limb([(x, 82), (x, top + 3)], w, max(1.1, w * .3), BK, gloss=0, tex=furrow)
        if w > 6: cv.limb([(x, top + 4), (x + .4, top - 4)], 1.8, .6, '#d8d0c0', gloss=.1)                                                      # a dead, bleached top
        n = int(H * .62 / 4.6)
        for k in range(n):
            if dead and (k + int(x)) % 3 == 0: continue
            y = top + 3 + k * 4.6; hw = (2.6 + k * (w * .5 + 1.4) / max(1, n) * 2.3) * (.8 if dead else 1)
            for sd in (-1, 1):
                j = rs.uniform(-.8, .8); cv.part([(x, y - .6), (x + sd * hw * .5, y - 1.8 + j), (x + sd * hw, y + 1.2 + j), (x + sd * hw * .55, y + 2.4), (x, y + 1.6)], G[(k + (sd > 0)) % 3], bulge=1.3, gloss=0, tex=speck(.45, 1.1, k), seam=.7)
                if not dead and rs.rand() < .6: cv.stamp(x + sd * hw * .9, y + 1 + j, '#8fc85a')
        if not dead and w > 4: pad(cv, x + w * .9, 81, 2.6, 1.8, '#3f8f45', int(x), '#8fc85a', spiky=.4, n=10)
    for _ in range(14): cv.stamp(rs.uniform(12, 84), rs.uniform(80.5, 83), '#8a4a30' if not dead else '#a8642a')
    return finish(cv, 77 + dead, water=False, ncol=30)
for key, fn in (('queen-anthurium', anthurium), ('philodendron-gloriosum', gloriosum), ('monstera-thai-constellation', monstera), ('howards-dream', orchid), ('juniper', juniper), ('grape', grape), ('maple-grove', maple), ('redwood-grove', redwood)):
    SP['plant:' + key] = dict(draw=(lambda f=fn: f(False)), grp='plants'); SP['plant:' + key + '~dead'] = dict(draw=(lambda f=fn: f(True)), grp='dead')
