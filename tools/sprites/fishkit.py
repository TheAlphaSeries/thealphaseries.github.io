# A fish from a spec sheet. Each species is described the way an identification guide does it - how deep the body is,
# where the fins sit, what colour it is, what marks it carries - with positions as fractions of body length measured
# from the snout. make_fish() turns that sheet into a posed, lit, pixelled picture.
from engine import *
from types import SimpleNamespace as NS
PALE = '#f6efe2'
def dk(h, f): return '#%02x%02x%02x' % tuple(int(max(0, min(255, v * f))) for v in C(h))
def mixh(a, b, f): return '#%02x%02x%02x' % tuple(int(x + (y - x) * f) for x, y in zip(C(a), C(b)))
def xf(cx, cy, ang, sx=1., sy=None):   # place and turn a shape drawn around (0, 0)
    a = math.radians(ang); c, s_ = math.cos(a), math.sin(a); sy = sx if sy is None else sy
    return lambda pts: [(cx + x * sx * c - y * sy * s_, cy + x * sx * s_ + y * sy * c) for x, y in pts]
def speck(amt=.3, scale=1.4, k=0, rim=None, rimw=2.2):   # a mottled surface, optionally paler toward the edge
    def tex(base, X, Y, d):
        c = base * (1 + amt * (noise(X, Y, scale, k) - .5) * 2)[..., None]
        return lerp3(c, C(rim), sstep(rimw, 0, d) * .55) if rim else c
    return tex
def fat(d): return d * (1.42 - .6 * d)   # real fish drawn at this size read as skinny, so bodies are deepened: slim ones most
TPL = {   # fin outlines: (how far along the base, how tall), front to back
    'soft': [(0, .2), (.25, .92), (.6, 1), (1.0, .78), (1.16, .3)],
    'spiny': [(0, .25), (.18, .9), (.45, 1), (.8, .8), (1, .4)],
    'trout': [(.02, .2), (.2, 1), (.62, .95), (1.0, .68), (1.2, .3)],
    'tri': [(0, .1), (.5, 1), (.9, .85), (1.15, .2)],
    'shark': [(0, .05), (.72, 1), (.95, .9), (.98, .3), (1.28, .06)],
    'falcate': [(0, .05), (.75, 1), (1.0, .95), (.8, .34), (1.15, .05)],
    'low': [(0, .85), (.12, 1), (.3, .62), (.7, .46), (1, .36), (1.06, .1)],
    'slope': [(0, .25), (.07, 1), (.5, .55), (1, .16)],
    'fringe': [(0, .12), (.15, .72), (.5, 1), (.85, .72), (1, .12)],
    'fan': [(0, .3), (.3, .85), (.7, 1), (1.05, .9), (1.2, .35)],
    'peak': [(0, .3), (.12, 1), (.35, .9), (.7, .6), (1, .4)],
    'even': [(0, .5), (.1, .95), (.5, 1), (.9, .95), (1.04, .5)],
    'lobe': [(0, .3), (.4, 1), (1.1, 1), (1.3, .5)]}
# ---- markings: each takes the colour so far and the body's coordinates (x from the snout, r from back -1 to belly +1)
def _xr(F, x, r, sx=.04, sr=.12):
    return sstep(x[0], x[0] + sx, F.x) * (1 - sstep(x[1] - sx, x[1], F.x)) * sstep(r[0] - sr, r[0], F.r) * (1 - sstep(r[1], r[1] + sr, F.r))
def M_stripe(col, r0, w, x=(0., 1.), amt=.9, rag=0., k=5):
    def m(c, F):
        q = np.exp(-((F.r - r0) / w) ** 2) * sstep(x[0], x[0] + .04, F.x) * (1 - sstep(x[1] - .04, x[1], F.x))
        if rag: q = q * sstep(rag - .08, rag + .08, fbm(F.u, F.v * .6, 5, k)) * 1.25
        return lerp3(c, C(col), np.clip(q, 0, 1) * amt)
    return m
def M_bars(col, n, x=(.3, .95), r=(-1, .3), w=.45, amt=.7, lean=0., wob=0.):
    def m(c, F):
        ph = (F.x - x[0]) / (x[1] - x[0]) * n + lean * F.r + wob * (noise(F.u, F.v, 4, 2) - .5)
        b = sstep(1 - w, 1 - w + .3, .5 + .5 * np.cos(2 * np.pi * ph))
        return lerp3(c, C(col), b * _xr(F, x, r) * amt)
    return m
def M_mottle(col, scale, thr, r=(-1, 1), x=(0, 1), amt=.85, k=0, soft=.07, sv=1.):
    return lambda c, F: lerp3(c, C(col), sstep(thr - soft, thr + soft, fbm(F.u, F.v * sv, scale, k)) * _xr(F, x, r) * amt)
def M_speck(col, scale, thr, r=(-1, 1), x=(0, 1), amt=.8, k=7):
    return lambda c, F: lerp3(c, C(col), sstep(thr - .04, thr + .04, noise(F.u, F.v, scale, k)) * _xr(F, x, r) * amt)
def M_block(col, x0, x1, amt=1., r=(-1.2, 1.2), sx=.012):
    return lambda c, F: lerp3(c, C(col), _xr(F, (x0, x1), r, sx, .02) * amt)
def M_tint(col, x=(0, 1), r=(-1, 1), amt=.6, sx=.06, sr=.2):
    return lambda c, F: lerp3(c, C(col), _xr(F, x, r, sx, sr) * amt)
def M_blush(col, x0, r0, wx, wr, amt=.6):
    return lambda c, F: lerp3(c, C(col), np.exp(-(((F.x - x0) / wx) ** 2 + ((F.r - r0) / wr) ** 2)) * amt)
def M_lines(col, rs, w=.035, x=(.25, .97), amt=.9, slant=0., px=None):   # thin lengthwise lines, optionally slanting up toward the tail
    def m(c, F):
        q = np.zeros_like(F.r)
        for r0 in rs:
            d = np.abs(F.r - (r0 - slant * (F.x - x[0]))); q = np.maximum(q, 1 - sstep(w * .5, w * 1.4, d))
        return lerp3(c, C(col), q * sstep(x[0], x[0] + .03, F.x) * (1 - sstep(x[1] - .03, x[1], F.x)) * amt)
    return m
def M_wavy(col, n, x=(.28, .98), r=(-1, -.12), amt=.85):   # a mackerel's zigzag bars
    def m(c, F):
        ph = F.x * n + .34 * np.sin(F.r * 11) + .25 * np.sin(F.r * 23 + F.x * 30)
        return lerp3(c, C(col), sstep(.62, .8, .5 + .5 * np.cos(2 * np.pi * ph)) * _xr(F, x, r, .03, .08) * amt)
    return m
def M_saddles(col, n, x=(.2, 1.), rmax=0., amt=.9, w=.23, pale=None):   # dark saddles across the back
    def m(c, F):
        fr = np.mod((F.x - x[0]) / (x[1] - x[0]) * n, 1) - .5; q = np.exp(-(fr / w) ** 2) * sstep(rmax + .1, rmax - .3, F.r) * sstep(x[0], x[0] + .03, F.x)
        c = lerp3(c, C(col), np.clip(q * 1.3, 0, 1) * amt)
        if pale: c = lerp3(c, C(pale), np.exp(-(fr / (w * .4)) ** 2) * sstep(rmax - .15, rmax - .5, F.r) * .7)
        return c
    return m
def M_net(col, su, sv, amt=.5, r=(-1, .7), x=(.3, 1)):   # big scales, each edged dark (carp)
    def m(c, F):
        row = np.floor(F.v / sv); fu = np.mod(F.u / su + .5 * np.mod(row, 2), 1); fv = np.mod(F.v / sv, 1)
        e = (1 - fu) + .34 * (1 - (2 * fv - 1) ** 2)
        return lerp3(c, C(col), (e > 1.0) * _xr(F, x, r) * amt)
    return m
def M_worm(col, scale=2.6, r=(-1, -.25), x=(.2, 1), amt=.75, k=3):   # pale worm-tracks (brook trout's back)
    def m(c, F):
        n_ = noise(F.u, F.v, scale, k); return lerp3(c, C(col), (1 - sstep(.03, .09, np.abs(n_ - .5))) * _xr(F, x, r) * amt)
    return m
def M_dotrows(col, rs, pitch=3., w=.05, x=(.3, .95), amt=.8):   # neat rows of dots, one per scale
    def m(c, F):
        q = np.zeros_like(F.r)
        for i, r0 in enumerate(rs): q = np.maximum(q, (1 - sstep(w * .5, w * 1.4, np.abs(F.r - r0))) * (np.mod(F.u + i * pitch / 2, pitch) < pitch * .45))
        return lerp3(c, C(col), q * sstep(x[0], x[0] + .03, F.x) * (1 - sstep(x[1] - .03, x[1], F.x)) * amt)
    return m
# ---- things added after the body is painted
def earflap(f, x, vfrac, a, b, col='#101010', ring=None, crescent=None):   # the gill-cover tab of a sunfish
    cu = (1 - x) * f.sp.len; cv_ = -float(f.top(1 - x)) * vfrac; d = np.hypot((f.u - cu) / a, (f.v - cv_) / b)
    if ring: f.shade(np.clip((1.32 - d) * 3, 0, 1), col=ring)
    if crescent: f.shade(np.clip((1.36 - d) * 3, 0, 1) * (f.u < cu - a * .2), col=crescent)
    f.shade(np.clip((1.0 - d) * 3, 0, 1), col=col)
def barbel(f, x, side, pts, col, late=True):   # a whisker from the edge of the head; pts are (how far back, how far out) steps from its root
    t0 = 1 - x; e = float(f.bot(t0)) if side > 0 else -float(f.top(t0))
    f.cv.line([f.P(t0, e * .9)] + [f.P(t0 - a, e + side * b) for a, b in pts], col, late=late)
def teeth(f, n=5, col='#f6f2e8', lower=True):   # teeth along an open mouth
    Mo = f.S['mouth']; tm = 1 - f.hl * Mo['reach']; vc = float(f.bot(tm)) * Mo.get('vc', .25); a, b = Mo['open']
    for k in np.linspace(.35, .95, n):
        t = tm + k * (1 - tm); f.cv.stamp(*f.P(t, vc - a * k + .9), col)
        if lower: f.cv.stamp(*f.P(t - .01, vc + b * k - .9), col)
def gillslits(f, xs, v0=-.25, v1=.45, f_=.42):
    for x in xs:
        t = 1 - x; f.seg((t, -float(f.top(t)) * -v0 if v0 > 0 else float(f.top(t)) * v0), (t - .008, float(f.bot(t)) * v1), .42, f_)
# ---- fin textures
def spotfin(n, seed, dark='#161a12', rad=.06, amt=.85):
    pts = np.random.RandomState(seed).rand(n, 2)
    def tex(c, ss, hv, p):
        m = np.zeros(ss.shape)
        for a, b in pts: m = np.maximum(m, ((ss - a) ** 2 + (hv - b * .85) ** 2 < rad * rad) * 1.)
        return lerp3(c, C(dark), m * amt)
    return tex
def tipfin(col, start=.6, amt=.7): return lambda c, ss, hv, p: lerp3(c, C(col), sstep(start, 1, hv) * amt)
def barfin(col, n, amt=.9, along=False): return lambda c, ss, hv, p: lerp3(c, C(col), (np.mod((hv if along else ss) * n, 1) < .5) * amt)
def blotfin(col, s0=.8, h0=.2, ws=.12, wh=.25, amt=.9): return lambda c, ss, hv, p: lerp3(c, C(col), np.exp(-(((ss - s0) / ws) ** 2 + ((hv - h0) / wh) ** 2)) * amt)
def texes(*ts):
    def tex(c, ss, hv, p):
        for t_ in ts: c = t_(c, ss, hv, p)
        return c
    return tex
def pose_way(P, SL):
    a0, a1 = P['a']; wig = P.get('wig', 0); ease = P.get('ease', 1.); n = 9; pts = [(0., 0.)]
    for i in range(n - 1):
        s = (i + .5) / (n - 1); h = math.radians(a0 + (a1 - a0) * s ** ease + wig * math.sin(2 * math.pi * s))
        pts.append((pts[-1][0] + SL / (n - 1) * math.cos(h), pts[-1][1] - SL / (n - 1) * math.sin(h)))
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; ox = 48 + P.get('ox', 0) - (min(xs) + max(xs)) / 2 + math.cos(math.radians(a0)) * SL * .1; w = P.get('water', 'tail')   # nudged toward the head to leave room for the tail fin
    if w == 'tail': oy = BASE - P.get('lift', 13) - ys[0]
    elif w == 'head': oy = BASE + P.get('sink', 4) - ys[-1]
    else: oy = BASE - P.get('lift', 14) - max(ys)
    oy += P.get('oy', 0); way = [(x + ox, y + oy) for x, y in pts]
    ex = P.get('ex', way[-1][0] if w == 'head' else way[0][0] + (2 if pts[-1][0] > 0 else -2))
    return way, (pts[-1][0] < pts[0][0]) != bool(P.get('roll', False)), ex
def make_fish(S):
    SL = S.get('SL', 60); D = S.get('fat', fat(S['depth'])) * SL; xd = S.get('deepest', .4); hl = S['head']; pd = S['ped'] * 1.22 * SL; bf = S.get('belly', .52)
    g_, e_, n_, s_ = S.get('taper', (.9, .68, .4, .14)); th = 1 - hl; td = min(1 - xd, th - .05)
    base = [(0, pd / 2), (.06, pd / 2 * 1.03), (td * .5, pd / 2 + (D / 2 - pd / 2) * S.get('swell', .66)), (td, D / 2), (th, g_ * D / 2), (1 - hl * .5, e_ * D / 2), (1 - hl * .15, n_ * D / 2), (1, s_ * D / 2)]
    def prof(side):
        k = 2 * (1 - bf) if side == 'top' else 2 * bf; pts = {t: w * k for t, w in base}
        if S.get('adj_' + side):
            b0 = PchipInterpolator([t for t, w in base], [w * k for t, w in base])
            for x, mult in S['adj_' + side]: pts[1 - x] = float(b0(1 - x)) * mult
        return sorted(pts.items())
    way, flip, ex = pose_way(S['pose'], SL)
    f = Fish(way, prof('top'), prof('bot'), seed=S.get('seed', 1), flip=flip); f.SL, f.D, f.hl, f.S = SL, D, hl, S
    f.X = lambda x, v=0.: f.P(1 - x, v)                                   # a point x of the way back from the snout
    back, upper, lower, belly = S['cols']; fc = S.get('fin', (dk(back, .95), mixh(back, upper, .8))); lc = S.get('lowfin', fc)
    def edge(side, d, defc):
        x0, x1 = d['x']; H = d.get('h', .4) * D * .9; tf, tb = 1 - x0, 1 - x1; kind = d.get('kind', 'soft')
        outer = [(tf - a * (tf - tb), b * H) for a, b in (d.get('outer') or TPL[kind])]
        kw = {k: v for k, v in d.items() if k in ('rays', 'serr', 'dark', 'tex', 'lead', 'lead2', 'rim', 'rimw', 'duty', 'smooth', 'edge', 'inset')}
        if kind in ('shark', 'falcate'): kw.setdefault('smooth', False); kw.setdefault('rays', 1); kw.setdefault('duty', 0)
        if kind in ('spiny', 'peak'): kw.setdefault('serr', .3)
        kw.setdefault('rays', max(3, int(round((tf - tb) * SL / 2.5)))); kw.setdefault('dark', .62)
        c0, c1 = d.get('c', defc); f.edgefin(side, tf, tb, outer, c0=c0, c1=c1, **kw)
    T = dict(kind='fork'); T.update(S.get('tail', {})); kd = T['kind']
    L0, sp0, fk0 = {'fork': (.21, .15, .3), 'deep': (.24, .16, .5), 'square': (.18, .13, .06), 'round': (.17, .11, 0), 'lunate': (.15, .2, .72), 'hetero': (.27, .1, .5), 'notch': (.19, .14, .16)}[kd]
    tc = T.get('c', fc); tkw = {k: v for k, v in T.items() if k in ('rays', 'dark', 'tex', 'rim', 'rimw', 'duty', 'smooth', 'kick', 'lowf', 't0')}
    if kd == 'hetero': tkw.setdefault('lowf', .5); tkw.setdefault('kick', -20); tkw.setdefault('smooth', False)
    tkw.setdefault('rays', 10); tkw.setdefault('dark', .62)
    f.tail(T.get('len', L0) * SL, T.get('spread', sp0) * SL * T.get('up', 1), T.get('spread', sp0) * SL * T.get('down', 1), tc[0], tc[1], fork=T.get('fork', fk0), round_=(kd == 'round'), **tkw)
    for d in S.get('dorsal', []): edge('d', d, fc)
    if S.get('adipose'): edge('d', dict(x=(S['adipose'], S['adipose'] + .05), h=.17, kind='lobe', rays=1, duty=0, c=S.get('adipose_c', fc)), fc)
    for d in S.get('anal', []): edge('v', d, lc)
    for d in S.get('pelvic', []):
        d = dict(d); x = d.pop('at'); d.setdefault('x', (x, x + .075)); d.setdefault('kind', 'trout'); d.setdefault('h', .3); d.setdefault('rays', 4); edge('v', d, lc)
    for d in S.get('finlets', []):   # (first x, last x, how many, height, colours, sides)
        x0, x1, n, h, cc = d[:5]
        for i, x in enumerate(np.linspace(x0, x1, n)):
            for side in (d[5] if len(d) > 5 else 'dv'): edge(side, dict(x=(x - .012, x + .016), h=h * (1 - i * .05), outer=[(.2, .1), (1.2, 1), (1.5, .15)], rays=1, duty=0, smooth=False, c=cc, inset=.5, rim='#15171a', rimw=.3), fc)
    marks = S.get('marks', [])
    def col(t, r, u, v):
        c = ramp(r, [(-1, dk(back, .62)), (-.66, back), (-.28, upper), (.1, lower), (.52, belly), (1, belly)])
        F = NS(t=t, r=r, u=u, v=v, x=1 - t, f=f)
        for m in marks: c = m(c, F)
        return c
    sc = S.get('scales', (3.2, 3.0, .24))
    f.body(col, scales=(sc[0], sc[1], sc[2], .06, th) if sc else None, gloss=S.get('gloss', .45), flat=S.get('flat', 1.5), ambient=S.get('ambient', .6), diffuse=S.get('diffuse', .56))
    for i, sp in enumerate(S.get('spots', [])):
        n, rad, xr, rr, colr = sp[:5]; halo = sp[5] if len(sp) > 5 else None; tr = (1 - xr[1], 1 - xr[0])
        if halo: f.shade(f.spotmask(n, (rad[0] + .9, rad[1] + .9), tr, rr, 50 + i), col=halo)
        f.shade(f.spotmask(n, rad, tr, rr, 50 + i), col=colr)
    if S.get('gill', True):
        f.gill(th, S.get('gillb', .045)); 
        if S.get('cheek', True): f.band(lambda r: 1 - hl * .62 - .02 * (1 - r * r), -.3, .8, .4, .74)
    Mo = dict(reach=.5, pos='terminal'); Mo.update(S.get('mouth', {})); tm = 1 - hl * Mo['reach']; b1, t1 = float(f.bot(1)), float(f.top(1)); bm = float(f.bot(tm))
    if Mo.get('open'):
        f.gape(tm, bm * Mo.get('vc', .25), Mo['open'][0], Mo['open'][1], Mo.get('inside', '#5c1c22'))
    elif Mo['pos'] == 'superior': f.seg((1.0, -.25 * t1), (tm, bm * .5), .55, .26)
    elif Mo['pos'] == 'inferior': f.seg((1 - hl * .1, float(f.bot(1 - hl * .1)) * .78), (tm, bm * .86), .5, .3)
    else: f.seg((1.0, b1 * .15), (tm, bm * Mo.get('drop', .4)), .55, .26)
    Pc = S.get('pect')
    if Pc:
        kind = Pc.get('kind', 'point'); px_ = Pc.get('x', hl + .03); spread, shape = {'point': (34, (.8, 1, .82, .5)), 'round': (56, (.85, 1, .95, .7)), 'fan': (84, (.8, .97, 1, .95, .8)), 'blade': (16, (.9, 1, .6, .3)), 'tri': (28, (.55, 1, .9, .3))}[kind]
        c0, c1 = Pc.get('c', lc); pk = {k: v for k, v in Pc.items() if k in ('rays', 'tex', 'lead', 'rim', 'smooth', 'duty', 'dark')}
        if kind in ('blade', 'tri'): pk.setdefault('smooth', False); pk.setdefault('rays', 1); pk.setdefault('duty', 0)
        pk.setdefault('rays', 6 if kind != 'fan' else 9); pk.setdefault('dark', .66)
        f.fanfin(1 - px_, float(f.bot(1 - px_)) * Pc.get('v', .42), Pc.get('ang', 34), Pc.get('len', .2) * SL, Pc.get('spread', spread), c0, c1, rootw=Pc.get('root', 2.6), shape=shape, **pk)
    Ey = S.get('eye', (2.5, '#e0c060')); exx = S.get('eye_x', hl * .44); et = 1 - exx
    f.eye(et, -float(f.top(et)) * S.get('eye_v', .3), 3.3 if Ey[0] == 3.0 else Ey[0], iris=Ey[1], **({'socket': Ey[2]} if len(Ey) > 2 else {}))
    if S.get('nostril', True): f.cv.stamp(*f.P(1 - hl * .12, -float(f.top(1 - hl * .12)) * .5), dk(back, .45))
    if S.get('post'): S['post'](f)
    Pp = S['pose']; return finish(f.cv, S.get('seed', 1), int(round(ex)), ncol=S.get('ncol', 28), power=Pp.get('power', 1.), jets=Pp.get('jets'))
