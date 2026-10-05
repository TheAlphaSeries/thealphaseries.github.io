from fishkit import *
SP = {}
def claw(cv, wrist, ang, cs, palm, finger, tip, open_=24, flip=1, serr=None, patch=None):   # a pincer: palm, a fixed finger and a hinged one
    a = math.radians(ang); d = np.array([math.cos(a), -math.sin(a)]); p = np.array([d[1], -d[0]]) * flip; w = np.array(wrist, float)
    P_ = lambda al, ac: tuple(w + d * al * cs + p * ac * cs)
    def fing(base, dirang, L, w0):
        b = math.radians(dirang); dd = np.array([math.cos(b), -math.sin(b)]); B = np.array(base); q = np.array([dd[1], -dd[0]]) * flip
        pts = [tuple(B), tuple(B + dd * L * .55 * cs + q * .9 * cs), tuple(B + dd * L * cs - q * .6 * cs)]
        cv.limb(pts, w0 * cs, .9, finger, gloss=.3); cv.limb([pts[1], pts[2]], w0 * .55 * cs, .8, tip, seam=1, gloss=.3)
    fing(P_(8.2, 1.9), ang - 6 * flip, 8.5, 3.2); fing(P_(8.0, -1.9), ang + open_ * flip, 8.0, 2.9)
    cv.part([P_(-1, -2.6), P_(4, -3.6), P_(9.2, -3.2), P_(10, 0), P_(9.2, 3.2), P_(4, 3.6), P_(-1, 2.6)], palm, bulge=3.2 * cs, gloss=.4, tex=speck(.2, 1.2, 2))
    if serr:
        for k in np.linspace(1, 8.5, 6): cv.stamp(*P_(k, -3.2), serr)
    if patch:
        x, y = P_(8.6, -.4); cv.disc(x, y, 1.9 * cs, patch[1], seam=1, gloss=.2); cv.disc(x, y, 1.0 * cs, patch[0], seam=1, gloss=.2)
def crab(kind):
    dung = kind == 'dungeness'; cv = Canvas(); T = xf(48, 48, -8 if dung else 7, 1.0)
    shellc, rimc = ('#8a5a60', '#c9a98a') if dung else ('#a8321e', '#d0603a'); A, Bc, TIPL = ('#b07a52', '#d09a6a', '#f0dcc0') if dung else ('#9c2e1c', '#c0442a', '#e8a078')
    palm, finger, tip = ('#8a5a62', '#b08a7a', '#f5f0e6') if dung else ('#b03a22', '#b84a2c', '#1a1414'); cs = 1.0 if dung else 1.28
    for side in (-1, 1):   # walking legs, back pair first
        for i in (3, 2, 1, 0):
            ax, ay = [(13, 4.5), (11.5, 6.6), (8.5, 8.4), (5, 9.2)][i]; a0 = [-10, 16, 42, 66][i]; x, y = ax, ay; segs = []
            for l, a in zip([9.5, 8, 6.5] if dung else [9, 7.5, 6], [a0 - 24, a0 + 30, a0 + 68]):
                nx, ny = x + l * math.cos(math.radians(a)), y + l * math.sin(math.radians(a)); segs.append([(side * x, y), (side * nx, ny)]); x, y = nx, ny
            cv.limb(T(segs[0]), 3.8 if dung else 4.2, 3.0, A, gloss=.3); cv.limb(T(segs[1]), 2.8, 2.2, Bc, gloss=.3); cv.limb(T(segs[2]), 2.0, .6, TIPL, gloss=.2)
            cv.drips.append(T([segs[2][1]])[0])
    if dung:   # reared back, both claws spread wide
        arms = {-1: ([(11, -5), (18, -8), (22, -14)], 104), 1: ([(11, -5), (18, -8), (22, -14)], 76)}
    else:      # one heavy claw raised and open, the other held low and forward
        arms = {-1: ([(10, -6), (16, -11), (17, -19)], 96), 1: ([(11, -4), (20, -3), (26, -8)], 52)}
    for side in (-1, 1):
        pts, ang = arms[side]; pts = T([(side * x, y) for x, y in pts]); cv.limb(pts, 4.6 * cs, 4.8 * cs, A)
        claw(cv, pts[-1], ang + (8 if dung else -7), cs, palm, finger, tip, open_=30 if (dung or side < 0) else 8, flip=-side, serr='#3a2630' if dung else None)
    n = 10
    for side in (-1, 1):   # the teeth along each side of the shell's front edge
        for k in range(n):
            f_ = k / (n - 1); x = 3.5 + f_ * 14; y = (-9.6 + f_ ** 1.6 * (11 if dung else 8.2)); r = (1.0 + .9 * (k == n - 1)) if dung else 1.5
            cv.disc(*T([(side * x, y)])[0], r, rimc, gloss=.1)
    for side in (-1, 1): cv.limb(T([(side * 3.0, -9), (side * 3.6, -12.4)]), 1.8, 1.6, A)
    if dung: shell = [(-17.6, 1.6), (-15, -4.6), (-9, -8.6), (0, -9.8), (9, -8.6), (15, -4.6), (17.6, 1.6), (13, 6.2), (7, 9), (0, 9.8), (-7, 9), (-13, 6.2)]
    else: shell = [(-17, -1.6), (-14.5, -6.6), (-8, -9.2), (-3.4, -10.9), (3.4, -10.9), (8, -9.2), (14.5, -6.6), (17, -1.6), (12.5, 5), (6.5, 8.6), (0, 9.4), (-6.5, 8.6), (-12.5, 5)]
    cv.part(T(shell), shellc, bulge=6.5, gloss=.5 if not dung else .35, tex=speck(.3 if dung else .16, 1.3, 1, rimc, 2.4))
    for pts in ([(-9, -3.5), (-5, -1), (-3.5, 3), (-6, 6)], [(9, -3.5), (5, -1), (3.5, 3), (6, 6)], [(-3.5, -4), (0, -2.6), (3.5, -4)]):
        cv.limb(T(pts), 1.0, 1.0, dk(shellc, .62), bulge=.4, seam=1, gloss=0)
    if dung:
        rs = np.random.RandomState(4)
        for _ in range(26): cv.stamp(*T([(rs.uniform(-11, 11), rs.uniform(-6, 6))])[0], '#d8c2a8')
    for side in (-1, 1):
        x, y = T([(side * 3.7, -13.2)])[0]
        for dx in (0, 1):
            for dy in (0, 1): cv.stamp(x + dx - .5, y + dy - .5, '#0a0a0c')
        cv.stamp(x - .5, y - .5, '#ffffff')
    return finish(cv, 11 if dung else 41, 48, ncol=26, power=1.25, jets=9)
def crayfish():
    cv = Canvas(); path = resample([(27, 80), (37, 73), (44, 62), (47, 50), (49, 38)], 300)
    g = np.gradient(path, axis=0); tan = g / np.linalg.norm(g, axis=1)[:, None]; nrm = np.stack([-tan[:, 1], tan[:, 0]], 1)
    at = lambda s_, a=0., b=0.: tuple(path[int(s_ * 299)] + tan[int(s_ * 299)] * a + nrm[int(s_ * 299)] * b)
    BR, BR2, LEG, RED, TQ0, TQ1 = '#6b4a2e', '#7a5a34', '#9a6238', '#c8281e', '#e8f4f0', '#5fc8c0'
    for i, a in enumerate((-56, -28, 0, 28, 56)):   # tail fan
        d = -tan[0] * math.cos(math.radians(a)) + nrm[0] * math.sin(math.radians(a)); pr = np.array([-d[1], d[0]]); o = path[6]
        cv.part([tuple(o - pr * 2), tuple(o + d * 5 - pr * 3), tuple(o + d * 8.5), tuple(o + d * 5 + pr * 3), tuple(o + pr * 2)], BR2, bulge=1.6, tex=speck(.2, 1.2, 3, '#b08a58', 1.4))
    for side in (-1, 1):   # four pairs of thin walking legs
        for i in range(4):
            s_ = .56 + i * .07; p0 = at(s_, 0, side * 4.5); p1 = (p0[0] + side * (9 - i), p0[1] + 3 + i * 1.5); p2 = (p1[0] + side * 3, p1[1] + 8)
            cv.limb([p0, p1], 2.2, 1.6, LEG); cv.limb([p1, p2], 1.5, .5, '#c08a50')
    for side, el, wr, ang in ((-1, (33, 44), (25, 31), 112), (1, (64, 46), (73, 34), 64)):   # arms thrown up and apart, claws open
        sh = at(.8, 0, side * 4); cv.limb([sh, el, wr], 4.4, 4.8, BR2)
        cv.limb([(wr[0] + side * 2.2, wr[1] + 1), (wr[0] + side * 4.5, wr[1] - 9)], 2.2, 1.6, RED, seam=1)        # a flash of the red underside
        claw(cv, wr, ang, 1.3, BR, '#84582e', '#d0502a', open_=30, flip=-side, patch=(TQ0, TQ1))
    for i in range(6):   # the tail, segment over segment
        s_ = .06 + i * .068; w = 5.0 + i * .25
        cv.part([at(s_, a, b) for a, b in [(-3.6, -w), (0, -w - .4), (3.6, -w), (4.2, 0), (3.6, w), (0, w + .4), (-3.6, w), (-4.0, 0)]], BR, bulge=3.4, gloss=.45, tex=speck(.18, 1.3, i, '#9a7444', 1.4))
    n = 24; ss = np.linspace(.46, .9, n); wd = np.interp(ss, [.46, .6, .78, .9], [5.8, 7.2, 6.8, 4.2])
    cv.part([at(a, 0, -b) for a, b in zip(ss, wd)] + [at(.985, 0, 0)] + [at(a, 0, b) for a, b in zip(ss[::-1], wd[::-1])], '#5e4028', smooth=False, bulge=6, gloss=.55, tex=speck(.16, 1.3, 5, '#8a6438', 2.0))
    cv.limb([at(.72, 0, -6.6), at(.74, 0, 0), at(.72, 0, 6.6)], 1.0, 1.0, '#3e2a1a', bulge=.4, seam=1, gloss=0)     # the groove across the back
    for side in (-1, 1):
        x, y = at(.9, 0, side * 3.4); cv.disc(x, y, 1.5, '#2a1a12'); cv.stamp(x, y, '#0a0a0c'); cv.stamp(x - 1, y - 1, '#ffffff')
        cv.line([at(.93, 0, side * 2), (48 + side * 14, 22), (48 + side * 24, 8)], '#9a6238', late=True)
        cv.line([at(.96, 0, side * 1), (48 + side * 5, 28)], '#9a6238', late=True)
    return finish(cv, 20, 30, ncol=26, power=1.15)
def lobster():
    cv = Canvas(); path = resample([(21, 71), (26, 60), (36, 52), (49, 47), (61, 40), (70, 31)], 300)
    g = np.gradient(path, axis=0); tan = g / np.linalg.norm(g, axis=1)[:, None]; nrm = np.stack([-tan[:, 1], tan[:, 0]], 1)
    at = lambda s_, a=0., b=0.: tuple(path[int(s_ * 299)] + tan[int(s_ * 299)] * a + nrm[int(s_ * 299)] * b)
    A, D, Lc, PALEc = '#9a3424', '#5e1f18', '#c8602c', '#e8b080'
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
    cv.part([at(a, 0, -b) for a, b in zip(ss, wd)] + [at(.9, 0, 0)] + [at(a, 0, b) for a, b in zip(ss[::-1], wd[::-1])], '#7e2a1e', smooth=False, bulge=6, gloss=.5, tex=speck(.34, 1.1, 5, '#c85c34', 2.0))
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
    arm0, arm1 = '#c8989a', '#f0dcd8'
    for i, o in enumerate((-4.2, -3, -1.8, -.6, .6, 1.8, 3, 4.2)):   # eight arms, trailing
        wig = (1.6 if i % 2 else -1.6); ln = 23 + (i * 5) % 4
        pts = [(-5, o), (-12, o * 1.7 + wig), (-19, o * 2.3 - wig), (-ln, o * 2.7 + wig * .7), (-ln - 5, o * 2.9)]
        cv.limb(T(pts), 2.6, .6, arm0 if i % 2 else arm1, gloss=.3); cv.drips.append(T([pts[-1]])[0])
    for o, ln in ((-2.2, 31), (2.4, 29)):   # two long tentacles, ending in clubs
        pts = [(-5, o), (-16, o * 2.6), (-ln, o * 1.4)]; cv.limb(T(pts), 1.5, 1.0, arm0)
        cv.limb(T([(-ln, o * 1.4), (-ln - 5, o * .9)]), 2.6, 1.2, arm1)
    for side in (-1, 1):   # the fins at the tip of the mantle
        cv.part(T([(24, side * 5), (29, side * 14.5), (37, side * 12.5), (44.5, side * .5), (34, side * 3)]), '#e6d4dc', bulge=1.3, tex=speck(.16, 1.5, 2, '#f6d8d0', 1.4))
    def skin(base, X, Y, d):
        dots = sstep(.63, .7, noise(X, Y, 1.25, 4)) * .85 + sstep(.66, .74, noise(X + 5, Y, 2.1, 6)) * .5
        back = sstep(5.5, 1.2, d) * 0 + 1
        return lerp3(base, C('#a0403a'), np.clip(dots, 0, 1) * back)
    cv.part(T([(-7, -4.2), (-2, -5.4), (3.5, -5), (3.5, 5), (-2, 5.4), (-7, 4.2)]), '#e0c0c0', bulge=4.2, tex=skin)       # head
    mant = [(2.5, -6.4), (8, -7.6), (16, -7.8), (26, -6.4), (36, -3.8), (44.5, 0), (36, 3.8), (26, 6.4), (16, 7.8), (8, 7.6), (2.5, 6.4)]
    cv.part(T(mant), lambda X, Y: ramp((X - Y) / 60., [(-.4, '#eef2f4'), (.3, '#e6dce4'), (.8, '#e8c4c4')]), bulge=6.5, gloss=.6, tex=skin)
    cv.limb(T([(3.2, -5.6), (2.6, 0), (3.2, 5.6)]), 1.0, 1.0, '#b06870', bulge=.4, seam=1, gloss=0)                              # the collar
    x, y = T([(-2.2, 2.6)])[0]; cv.eye(x, y, 3.0, iris='#c0d0d8', socket='#5a3c48')
    return finish(cv, 13, 21, ncol=26, power=1.1)
def ray():
    cv = Canvas(); T = xf(52, 43, -40); TOP, DK, UNDER = '#4e4032', '#241e18', '#f4f2ea'
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
    cv.part(T([(20, 0), (16, 4.6), (4, 5.8), (-8, 4.2), (-15.5, 0), (-8, -3.8), (4, -5), (16, -4.2)]), '#5a4a3a', bulge=5.4, seam=1, gloss=.5, tex=hide)   # the raised body
    cv.limb(T([(13, 6.5), (8, 13.5), (3, 21), (-1, 27)]), 1.0, .6, '#74624a', bulge=.4, seam=1, gloss=0)                        # light catching the near wing's front edge
    for side in (1, -.8):
        x, y = T([(14.4, 5.0 * side)])[0]; cv.disc(x, y, 2.2, '#3a3028', seam=.8); cv.stamp(x, y, '#0a0a0c'); cv.stamp(x + 1, y, '#0a0a0c'); cv.stamp(x, y - 1, '#f6f2e6')
    cv.drips += [T([(-1.8, 28.5)])[0], T([(-30, 4)])[0], T([(-12, 7)])[0]]
    return finish(cv, 10, 19, ncol=26, power=1.1)
SP['dungeness-crab'] = dict(draw=lambda: crab('dungeness')); SP['red-rock-crab'] = dict(draw=lambda: crab('redrock'))
SP['california-spiny-lobster'] = dict(draw=lobster); SP['signal-crayfish'] = dict(draw=crayfish); SP['market-squid'] = dict(draw=squid); SP['bat-ray'] = dict(draw=ray)
