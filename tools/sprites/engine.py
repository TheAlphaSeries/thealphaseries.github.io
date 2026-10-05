# Sprite engine for the Bestiary, fourth pass.
# Every creature is modelled, lit and then reduced to pixel art:
#   fish     - a curved spine, separate back and belly outlines, a rounded lit body with pigment, scales and gloss,
#              fins built ray by ray, then head details
#   others   - layered "puffy" parts (shell, legs, arms), each a lit dome
# The model is painted at 3x, shrunk to a 96 x 96 grid, cut down to a small palette with ordered dither,
# outlined, and given a splash.
import numpy as np, math, json, sys, random, cv2
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from scipy.interpolate import PchipInterpolator
G, Q = 96, 3; R = G * Q; BASE = 85
YY, XX = (np.mgrid[0:R, 0:R] + .5) / Q
L = np.array([-.42, -.74, .53]); L /= np.linalg.norm(L)
Hh = L + np.array([0, 0, 1.]); Hh /= np.linalg.norm(Hh)
FOAM, WLIGHT, WMID, WDEEP, WDARK = '#fdfeff', '#b0def0', '#68a0c4', '#345c84', '#24406a'
WATER = [FOAM, WLIGHT, WMID, WDEEP, WDARK]
def C(c): return np.array([int(c[i:i+2], 16) for i in (1, 3, 5)], float) if isinstance(c, str) else np.asarray(c, float)
def ramp(x, stops):
    xs = [s[0] for s in stops]; cs = np.array([C(s[1]) for s in stops])
    return np.stack([np.interp(x, xs, cs[:, k]) for k in range(3)], -1)
def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def lerp3(a, b, w): return a + (b - a) * np.asarray(w)[..., None]
_NG = np.random.RandomState(7).rand(10, 64, 64)
def noise(u, v, scale=4., k=0): return ndi.map_coordinates(_NG[k % 10], [np.mod(v / scale, 64), np.mod(u / scale, 64)], order=1, mode='grid-wrap')
def fbm(u, v, scale=6., k=0): return (noise(u, v, scale, k) + .5 * noise(u, v, scale / 2, k + 1) + .25 * noise(u, v, scale / 4, k + 2)) / 1.75
def cr(pts, n=24):   # a smooth curve through the points
    pts = [tuple(map(float, p)) for p in pts]; Pp = [pts[0]] + pts + [pts[-1]]; out = []
    for i in range(1, len(Pp) - 2):
        p0, p1, p2, p3 = map(np.array, (Pp[i-1], Pp[i], Pp[i+1], Pp[i+2]))
        for k in range(n):
            t = k / n; out.append(.5 * ((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t**3))
    out.append(np.array(pts[-1])); return np.array(out)
def resample(pts, n, smooth=True):
    d = cr(pts, 30) if (smooth and len(pts) > 2) else np.array(pts, float)
    seg = np.hypot(*np.diff(d, axis=0).T); cum = np.r_[0, np.cumsum(seg)]
    if cum[-1] < 1e-6: return np.repeat(d[:1], n, 0)
    tt = np.linspace(0, cum[-1], n); return np.stack([np.interp(tt, cum, d[:, 0]), np.interp(tt, cum, d[:, 1])], 1)
class Canvas:
    def __init__(s): s.rgb = np.zeros((R, R, 3)); s.a = np.zeros((R, R), bool); s.stamps = []; s.late = []; s.drips = []
    def put(s, m, col): s.rgb[m] = col[m] if col.ndim == 3 else col; s.a |= m
    def polymask(s, pts, smooth=True):
        q = cr(list(pts) + [pts[0]], 14) if smooth else np.array(pts, float)
        im = Image.new('L', (R, R), 0); ImageDraw.Draw(im).polygon([(x * Q, y * Q) for x, y in q], fill=255); return np.array(im) > 127
    # ---- puffy parts, for creatures without a spine
    def part(s, pts, col, bulge=3., smooth=True, gloss=.25, seam=.6, tex=None, mask=None, lit=1.):
        m = s.polymask(pts, smooth) if mask is None else mask
        if not m.any(): return m
        d = ndi.distance_transform_edt(m) / Q
        h = bulge * np.sqrt(np.clip(1 - (1 - np.clip(d / bulge, 0, 1)) ** 2, 0, 1))
        h = ndi.gaussian_filter(h, 1.2)
        gy, gx = np.gradient(h, 1 / Q); n = np.stack([-gx, -gy, np.ones_like(gx)], -1); n /= np.linalg.norm(n, axis=-1)[..., None]
        lam = np.clip(n @ L, 0, 1); base = col(XX, YY) if callable(col) else np.broadcast_to(C(col), (R, R, 3)).copy()
        if tex is not None: base = tex(base, XX, YY, d)
        c = base * (.46 + .74 * lam)[..., None] * lit
        hl = np.clip(n @ Hh, 0, 1) ** 26 * gloss; c = c + (255 - c) * hl[..., None]
        under = s.a & m & (d < .85); c[under] *= seam
        s.put(m, np.clip(c, 0, 255)); return m
    def limb(s, pts, w0, w1, col, bulge=None, clip=None, **kw):   # a tapering tube along a path
        c = resample(pts, 40); g = np.gradient(c, axis=0); g /= np.maximum(np.linalg.norm(g, axis=1), 1e-6)[:, None]; nr = np.stack([-g[:, 1], g[:, 0]], 1)
        w = np.linspace(w0, w1, len(c))[:, None] / 2
        poly = np.r_[c + nr * w, (c - nr * w)[::-1]]
        m = s.polymask(poly, smooth=False)
        for (x, y), ww in ((c[0], w0), (c[-1], w1)):
            m |= (XX - x) ** 2 + (YY - y) ** 2 < (ww / 2) ** 2
        if clip is not None: m &= clip
        return s.part(None, col, bulge=bulge or max(w0, w1) / 2, mask=m, **kw)
    def disc(s, x, y, r, col, **kw): return s.part(None, col, bulge=kw.pop('bulge', r), mask=(XX - x) ** 2 + (YY - y) ** 2 < r * r, **kw)
    def stamp(s, x, y, col): s.stamps.append((int(round(x)), int(round(y)), tuple(int(v) for v in C(col))))
    def eye(s, x, y, rad=2.4, iris='#d8b85a', pupil='#0a0a0c', socket=None, glint=True):
        cx, cy = int(math.floor(x)), int(math.floor(y)); n = int(rad) + 2
        for dy in range(-n, n + 1):
            for dx in range(-n, n + 1):
                d = math.hypot(dx, dy)
                if d > rad: continue
                if socket and d > rad - .8: c = socket
                elif d > 1.5: c = iris
                else: c = pupil
                s.stamp(cx + dx, cy + dy, c)
        if glint: s.stamp(cx - 1, cy - 1, '#ffffff')
    def line(s, pts, col, smooth=True, late=False):   # a crisp one-pixel line, stamped after the palette is cut
        d = resample(pts, int(4 * sum(math.dist(pts[i], pts[i+1]) for i in range(len(pts) - 1))) + 2, smooth)
        seen = set()
        for x, y in d:
            k = (int(math.floor(x)), int(math.floor(y)))
            if k not in seen: seen.add(k); (s.late if late else s.stamps).append((k[0], k[1], tuple(int(v) for v in C(col))))
class Spine:
    def __init__(s, way, n=400, flip=False):   # flip: for a fish heading left, so its belly still faces down
        d = cr(way, 200); seg = np.hypot(*np.diff(d, axis=0).T); cum = np.r_[0, np.cumsum(seg)]; s.len = cum[-1]; s.n = n
        tt = np.linspace(0, s.len, n + 1); s.p = np.stack([np.interp(tt, cum, d[:, 0]), np.interp(tt, cum, d[:, 1])], 1)
        g = np.gradient(s.p, axis=0); s.tan = g / np.linalg.norm(g, axis=1)[:, None]; s.sg = -1. if flip else 1.; s.nrm = np.stack([-s.tan[:, 1], s.tan[:, 0]], 1) * s.sg
        _, idx = cKDTree(s.p).query(np.stack([XX.ravel(), YY.ravel()], 1)); idx = idx.reshape(R, R); s.idx = idx
        q = s.p[idx]; dx = XX - q[..., 0]; dy = YY - q[..., 1]
        al = dx * s.tan[idx][..., 0] + dy * s.tan[idx][..., 1]
        s.t = idx / n + al / s.len; s.v = dx * s.nrm[idx][..., 0] + dy * s.nrm[idx][..., 1]
    def frame(s, t):
        t = np.asarray(t, float); tc = np.clip(t, 0, 1) * s.n; i = np.minimum(tc.astype(int), s.n - 1); f = (tc - i)[..., None]
        p = s.p[i] * (1 - f) + s.p[i + 1] * f; tn = s.tan[i] * (1 - f) + s.tan[i + 1] * f; tn /= np.linalg.norm(tn, axis=-1)[..., None]
        p = p + tn * ((t - np.clip(t, 0, 1)) * s.len)[..., None]
        return p, tn, np.stack([-tn[..., 1], tn[..., 0]], -1) * s.sg
    def P(s, t, v):
        p, tn, nr = s.frame(t); return p + nr * np.asarray(v, float)[..., None]
class Fish:
    def __init__(s, way, top, bot, seed=1, k=1., flip=False):   # k: one knob that fattens the body and grows the fins together
        s.sp = Spine(way, flip=flip); s.k = k; s.cv = Canvas(); s.seed = seed; s.rs = np.random.RandomState(seed)
        s.top = PchipInterpolator([a for a, b in top], [b * k for a, b in top]); s.bot = PchipInterpolator([a for a, b in bot], [b * k for a, b in bot])
    def P(s, t, v): return tuple(s.sp.P(t, v))
    def E(s, t, side, extra=0.):   # a point on the body's edge (d = back, v = belly), pushed out by extra
        tc = min(max(t, 0), 1); return s.P(t, -(float(s.top(tc)) + extra) if side == 'd' else float(s.bot(tc)) + extra)
    def dirv(s, t, ang):   # a direction: 0 = straight back toward the tail, positive angles swing toward the belly
        p, tn, nr = s.sp.frame(t); a = math.radians(ang); return -tn * math.cos(a) + nr * math.sin(a)
    def fin(s, root, outer, c0, c1, rays=10, duty=.36, dark=.68, serr=0., edge=.82, lit=1., smooth=True, tex=None, sroot=True, lead=None, lead2=None, rim=None, rimw=.14):
        S, Hn = 520, 200
        rt = resample(root, S, sroot); ot = resample(outer, S, smooth)
        hh = np.linspace(0, 1, Hn)[:, None]; ss = np.broadcast_to(np.linspace(0, 1, S)[None, :], (Hn, S)); hv = np.broadcast_to(hh, (Hn, S))
        pts = rt[None] + (ot - rt)[None] * hh[..., None]
        keep = np.ones((Hn, S), bool)
        if serr: keep = hv <= 1 - serr * (.5 - .5 * np.cos(ss * rays * 2 * math.pi))
        col = lerp3(np.broadcast_to(C(c0), (Hn, S, 3)), C(c1), hv ** .8)
        ray = np.mod(ss * rays + duty / 2, 1) < duty; col = col * np.where(ray, dark, 1.06)[..., None]
        col = col * np.where(hv > .94, edge, 1)[..., None]
        if lead is not None: col = lerp3(col, C(lead), (ss < .08) * .92)
        if lead2 is not None: col = lerp3(col, C(lead2), ((ss >= .08) & (ss < .15)) * .9)
        if rim is not None: col = lerp3(col, C(rim), (hv > 1 - rimw) * .9)
        if tex is not None: col = tex(col, ss, hv, pts)
        col = np.clip(col * lit, 0, 255)
        ix = np.floor(pts[..., 0] * Q).astype(int); iy = np.floor(pts[..., 1] * Q).astype(int)
        ok = keep & (ix >= 0) & (ix < R) & (iy >= 0) & (iy < R)
        s.cv.rgb[iy[ok], ix[ok]] = col[ok]; s.cv.a[iy[ok], ix[ok]] = True
    def edgefin(s, side, tf, tb, outer, inset=1.2, **kw):   # a fin standing on the back or the belly; outer = [(t, height above the edge), ...] front to back
        root = [s.E(t, side, -inset) for t in np.linspace(tf, tb, 12)]
        s.fin(root, [s.E(t, side, h * s.k) for t, h in outer], **kw)
    def fanfin(s, t, v, ang, length, spread, c0, c1, rootw=2., shape=(1, .95, .8, .6), **kw):   # a paired fin: a fan from a short root
        c = np.array(s.P(t, v)); d0 = s.dirv(t, ang); pr = np.array([-d0[1], d0[0]]); length *= s.k; rootw *= s.k
        root = [tuple(c - pr * rootw / 2), tuple(c + pr * rootw / 2)]
        angs = np.linspace(ang - spread / 2, ang + spread / 2, len(shape))
        s.fin(root, [tuple(c + s.dirv(t, a) * length * k) for a, k in zip(angs, shape)], c0, c1, sroot=False, **kw)
    def tail(s, length, up, down, c0, c1, fork=.3, t0=.015, kick=0., round_=False, lowf=1., **kw):
        length *= s.k; up *= s.k; down *= s.k
        p, tn, nr = s.sp.frame(t0); a = math.radians(kick); back = -tn * math.cos(a) + nr * math.sin(a); side = np.array([-back[1], back[0]]) * -1
        if np.dot(side, nr) < 0: side = -side
        wt, wb = float(s.top(t0)), float(s.bot(t0))
        root = [tuple(p - nr * (wt + .3) + tn * 1.5), tuple(p + tn * 2.2), tuple(p + nr * (wb + .3) + tn * 1.5)]
        o = lambda a_, b_: tuple(p + back * a_ + side * b_)
        if round_: outer = [o(length * .8, -up), o(length * .98, -up * .5), o(length, 0), o(length * .98, down * .5), o(length * .8, down)]
        else: outer = [o(length, -up), o(length * (1 - fork * .45), -up * .56), o(length * (1 - fork), 0), o(length * lowf * (1 - fork * .45), down * .56), o(length * lowf, down)]
        s.fin(root, outer, c0, c1, **kw); s.cv.drips += [o(length, -up), o(length * lowf, down), o(length * (1 - fork), 0)]
    def spotmask(s, n, rad, trange=(.05, .95), rrange=(-1, 1), seed=0):
        rs = np.random.RandomState(s.seed * 100 + seed); sp = s.sp; u = np.clip(sp.t, 0, 1) * sp.len; m = np.zeros((R, R))
        for _ in range(n):
            ti = rs.uniform(*trange); ri = rs.uniform(*rrange); ra = rs.uniform(*rad)
            vi = ri * (float(s.top(ti)) if ri < 0 else float(s.bot(ti)))
            m = np.maximum(m, np.clip((ra - np.hypot(u - ti * sp.len, sp.v - vi)) * 1.6 + .5, 0, 1))
        return m
    def body(s, colfn, scales=None, gloss=.45, flat=1.5, ambient=.6, diffuse=.56):
        sp = s.sp; t = sp.t; v = sp.v; tc = np.clip(t, 0, 1); wt = s.top(tc); wb = s.bot(tc)
        m = (t >= 0) & (t <= 1) & (v > -wt) & (v < wb)
        r = np.clip(np.where(v < 0, v / np.maximum(wt, .01), v / np.maximum(wb, .01)), -1, 1)
        rr = np.sign(r) * np.abs(r) ** flat; nz = np.sqrt(np.clip(1 - rr * rr, 0, 1)); nrm = sp.nrm[sp.idx]
        nx, ny = rr * nrm[..., 0], rr * nrm[..., 1]; u = tc * sp.len
        s.t, s.r, s.u, s.v, s.m = tc, r, u, v, m
        base = colfn(tc, r, u, v)
        if scales:
            su, sv, amt, t0, t1 = scales
            row = np.floor(v / sv); fu = np.mod(u / su + .5 * np.mod(row, 2), 1); fv = np.mod(v / sv, 1)
            e = (1 - fu) + .34 * (1 - (2 * fv - 1) ** 2)
            f = 1 - amt * (e > 1.02) + amt * .55 * ((e > .42) & (e < .72))
            f = 1 + (f - 1) * sstep(t0, t0 + .05, tc) * (1 - sstep(t1 - .03, t1, tc)) * (1 - sstep(.5, .95, r))
            base = base * f[..., None]
        lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
        col = base * (ambient + diffuse * lam)[..., None]
        hl = np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1) ** 18 * gloss * (.4 + .9 * noise(u, v, 3., 3))
        col = col + (255 - col) * hl[..., None]
        col = lerp3(col, np.array([120., 170, 215]), sstep(.7, 1, r) * .2)      # cool light thrown back up off the water
        s.cv.put(m, np.clip(col, 0, 255)); return m
    def shade(s, w, f=None, col=None):   # darken, lighten or tint body pixels by a 0-1 weight map
        m = s.m; w = np.clip(w, 0, 1)
        if f is not None: s.cv.rgb[m] = np.clip(s.cv.rgb[m] * (1 + (f - 1) * w[m])[..., None], 0, 255)
        if col is not None: s.cv.rgb[m] = s.cv.rgb[m] + (C(col) - s.cv.rgb[m]) * w[m][..., None]
    def band(s, tline, r0=-.8, r1=.85, width=.55, f=.55):   # a line across the body at t = tline(r), such as the gill cover's edge
        d = np.abs(s.t - tline(s.r)) * s.sp.len; s.shade((d < width) & (s.r > r0) & (s.r < r1), f)
    def gill(s, tg, bulge=.04, r0=-.72, r1=.88, f=.5):
        s.band(lambda r: tg - bulge * (1 - r * r), r0, r1, .5, f); s.band(lambda r: tg + 1.1 / s.sp.len - bulge * (1 - r * r), r0, r1, .5, 1.22)
    def seg(s, a, b, width=.5, f=.4, col=None):   # a short stroke between two (t, v) points, such as a mouth
        ua, va, ub, vb = a[0] * s.sp.len, a[1], b[0] * s.sp.len, b[1]; du, dv = ub - ua, vb - va; l2 = du * du + dv * dv
        k = np.clip(((s.u - ua) * du + (s.v - va) * dv) / l2, 0, 1); d = np.hypot(s.u - ua - k * du, s.v - va - k * dv)
        s.shade(np.clip((width - d) * 2 + .5, 0, 1), f, col)
    def eye(s, t, v, rad=2.4, **kw): x, y = s.P(t, v); s.cv.eye(x, y, rad, **kw)
    def gape(s, t0, vc, a, b, col='#5c1c22'):   # an open mouth: a wedge cut back from the snout, dark inside, with lit lips
        k = np.clip((s.t - t0) / (1 - t0), 0, 1); m = (s.t > t0) & (s.v > vc - a * k) & (s.v < vc + b * k) & s.m
        lip = ((np.abs(s.v - (vc - a * k)) < .7) | (np.abs(s.v - (vc + b * k)) < .7)) & (s.t > t0) & ~m; s.shade(lip, f=1.3)
        s.shade(m * 1., col=col); s.shade(m * (1 - k) * .7, f=.45)
    def rowmarks(s, rline, n, a, b, t0, t1, col, f=None):   # a row of little diamonds along the body, such as a sturgeon's plates
        per = (t1 - t0) * s.sp.len / n; uu = np.mod(s.u - t0 * s.sp.len, per) - per / 2
        vl = rline * np.where(rline < 0, s.top(s.t), s.bot(s.t)); dv = s.v - vl
        m = (np.abs(uu) / a + np.abs(dv) / b < 1) & (s.t > t0) & (s.t < t1)
        sh = (np.abs(uu + .9) / a + np.abs(dv - 1.0) / b < 1) & (s.t > t0) & (s.t < t1) & ~m; s.shade(sh, f=.62); s.shade(m, f, col)
    def whisker(s, pts, col, late=True): s.cv.line([s.P(t, v) for t, v in pts], col, late=late)
def finish(cv, seed, ex=48, ncol=28, dith=5., power=1., jets=None, drips=True, water=True):
    a3 = cv.a.reshape(G, Q, G, Q); cnt = a3.sum((1, 3)); m = cnt >= 5
    rgb = (cv.rgb * cv.a[..., None]).reshape(G, Q, G, Q, 3).sum((1, 3)) / np.maximum(cnt, 1)[..., None]
    bayer = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - .47)
    data = np.clip(rgb + np.tile(bayer, (G // 4, G // 4))[..., None] * dith, 0, 255)[m].astype(np.float32)
    cv2.setRNGSeed(seed)
    _, lab, cen = cv2.kmeans(data, ncol, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .3), 5, cv2.KMEANS_PP_CENTERS)
    out = np.zeros((G, G, 3), int); out[m] = np.round(cen[lab[:, 0]]).astype(int)
    for x, y, c in cv.stamps:
        if 0 <= x < G and 0 <= y < G: out[y, x] = c; m[y, x] = True
    # outline: every empty pixel touching the creature takes a dark shade of what it touches
    acc = np.zeros((G, G, 3)); n = np.zeros((G, G))
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sm = np.roll(m, (dy, dx), (0, 1)); so = np.roll(out, (dy, dx), (0, 1)); acc += so * sm[..., None]; n += sm
    edge = (~m) & (n > 0); oc = acc[edge] / n[edge][..., None]
    lum = oc.mean(1); oc = np.where(lum[:, None] > 150, oc * .36, oc * .3); oc = np.maximum(oc, [18, 20, 27])
    oc = (np.round(oc / 12) * 12).astype(int); out[edge] = oc; m2 = m | edge
    for x, y, c in cv.late:
        if 0 <= x < G and 0 <= y < G and not m[y, x]: out[y, x] = c; m2[y, x] = True
    px = [[tuple(int(v) for v in out[y, x]) if m2[y, x] else None for x in range(G)] for y in range(G)]
    if water: splash(px, ex, seed, power, jets, cv.drips if drips else [])
    return px
def splash(px, ex, seed, power=1., jets=None, drips=()):
    rnd = random.Random(seed * 13 + 5); T = lambda h: tuple(int(v) for v in C(h))
    def put(x, y, col, over=False):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < G and 0 <= y < G and (over or px[y][x] is None): px[y][x] = T(col)
    for y in range(BASE + 2, G):   # nothing shows below the surface
        for x in range(G): px[y][x] = None
    for k, (rx, col, gap) in enumerate([(10, WLIGHT, 6), (17, WMID, 5), (25, WMID, 4), (34, WDEEP, 3), (43, WDARK, 3)]):   # rings spreading from where it left the water
        ry = rx * .16 + .8; steps = int(rx * 7)
        for i in range(steps):
            a = 2 * math.pi * i / steps; x = ex + rx * math.cos(a); y = BASE + 2 + ry * math.sin(a)
            if int(i * rx / steps * 2.2 + k * 2 + seed) % gap == 0: continue
            if y < BASE + 1.5: put(x, y, col)
            else: put(x, y, col, True)
    for x in range(ex - 8, ex + 9):   # the churned patch
        d = abs(x - ex) / 8
        for y in (BASE, BASE + 1, BASE + 2):
            if d < 1 - (y - BASE) * .22: put(x, y, FOAM if (x * 3 + y * 5 + seed) % 4 == 0 else WLIGHT if (x + y) % 3 else WMID, True)
    for x in range(ex - 11, ex + 12):   # a mound of foam where the water is still boiling
        d = abs(x - ex) / 11; hgt = int(round(4.2 * power * (1 - d * d) + rnd.random() * 1.6))
        for k in range(hgt + 1):
            col = FOAM if k >= hgt - 1 else WLIGHT if (k > hgt // 2 or (x + k) % 3 == 0) else WMID
            put(x, BASE + 1 - k, col, k < 2)
    n = jets or 7
    for j in range(n):   # the crown: jets of water thrown up and outward
        f = (j + .5) / n * 2 - 1; ang = math.radians(f * 46 + rnd.uniform(-6, 6)); v0 = (3.2 + rnd.random() * 1.5) * power * (.8 + .42 * abs(f)); g = .55
        x0 = ex + f * 9; tend = v0 * math.cos(ang) / g * rnd.uniform(.95, 1.2); steps = int(tend * 9) + 1; front = j % 3 == 1
        for i in range(steps + 1):
            tau = tend * i / steps; x = x0 + v0 * math.sin(ang) * tau; y = BASE + 1 - (v0 * math.cos(ang) * tau - .5 * g * tau * tau); k = i / steps
            w = 4.4 * (1 - k) ** 1.2 + 1.0
            for q in range(int(round(w))):
                xx = x - w / 2 + q + .5
                col = FOAM if (k > .72 or q == 0 and k > .3) else WMID if (q == int(round(w)) - 1 and w >= 2) else WLIGHT
                if k < .16 and q == int(round(w)) - 1: col = WDEEP
                put(xx, y, col, front and k < .35)
        for d in range(rnd.randint(1, 3)):   # drops let go from the tip
            tau = tend * (1.1 + d * .14 + rnd.random() * .08); x = x0 + v0 * math.sin(ang) * tau * 1.05; y = BASE + 1 - (v0 * math.cos(ang) * tau - .5 * g * tau * tau) - rnd.uniform(0, 2.5)
            put(x, y, FOAM); 
            if rnd.random() < .55: put(x, y + 1, WLIGHT)
            if rnd.random() < .3: put(x + 1, y + 1, WMID)
    for (dx, dy) in drips:   # water still running off the tail
        dx += rnd.uniform(-1, 1); y = dy + 2
        if dy > BASE - 3: continue
        while y < BASE - 1:
            if rnd.random() < .5: put(dx + rnd.choice((0, 0, 1, -1)), y, rnd.choice((FOAM, WLIGHT, WLIGHT))); 
            y += rnd.uniform(1.5, 4)
    for _ in range(int(12 * power)):   # stray spray
        x = ex + rnd.choice((-1, 1)) * rnd.uniform(5, 26); y = BASE - rnd.uniform(4, 22) * power
        put(x, y, FOAM if rnd.random() < .6 else WLIGHT)
        if rnd.random() < .3: put(x, y + 1, WMID)
def export(pxs, path):
    CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%()*+,-/:;=?@[]^_{|}~'; data = {}
    for k, px in pxs.items():
        pal = {}; rows = []
        for row in px:
            s = ''
            for c in row:
                if c is None: s += '.'; continue
                h = '#%02x%02x%02x' % c
                if h not in pal: pal[h] = CH[len(pal)]
                s += pal[h]
            rows.append(s)
        data[k] = {'pal': {v: kk for kk, v in pal.items()}, 'rows': rows}
    if path: json.dump({'w': G, 'h': G, 'water': WATER, 'fish': data}, open(path, 'w'))
    return data
def sheet(pxs, path, sc=4, cols=5, bg=(22, 36, 120)):
    n = len(pxs); rws = (n + cols - 1) // cols; im = Image.new('RGB', (cols * (G * sc + 8) + 8, rws * (G * sc + 8) + 8), bg); a = np.array(im)
    for i, px in enumerate(pxs.values()):
        ox, oy = 8 + (i % cols) * (G * sc + 8), 8 + (i // cols) * (G * sc + 8)
        for y in range(G):
            for x in range(G):
                if px[y][x] is not None: a[oy + y * sc: oy + y * sc + sc, ox + x * sc: ox + x * sc + sc] = px[y][x]
    Image.fromarray(a).save(path)
