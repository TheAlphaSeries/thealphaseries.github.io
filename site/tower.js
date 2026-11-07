/* HALF LIFE: the tower.
   The posts drawn as the glowing security tower from the hack in Ghost in the Shell 2: Innocence, after
   iliabaranov/gits-file-visualizer (Apache-2.0), which draws a computer's files that way. Here the record is the posts.

   How the posts become the tower:
   - Each post is a BAND of stacked rings. The newest post is at the top and narrowest; older posts sit lower and
     further out, the way the old ones drift away from the centre of things.
   - Each sentence is an ARC on a ring. A long sentence makes a long arc. A paragraph starts a fresh ring, so a post's
     shape follows how it was written. Headings are heavy full rings; photographs are dashed arcs with a white card.
   - Every ring turns slowly at its own pace. Older posts burn from gold down toward bronze.
   - READ: every few seconds a passage somewhere lights cream-white, a little probe glides to it and a callout names it.
   - NEW: a post less than a month old writes itself in along its rings when the page opens, crimson cooling to gold.
   - Pointing at a band (or tapping it) unwinds it: its rings part, it glows, and a card offers to open the post.

   The rest of the page talks to it through window.Tower:
     Tower.start(canvas, posts, { onOpen(file) })   once the posts have arrived
     Tower.view({ x0, x1, dim, focus })               where to stand (the part of the screen left free), how bright,
                                                      and which post is being read (its band stays unwound)
   Drawn on a plain 2D canvas: no libraries. Light adds up ("lighter"), then a cheap glow is laid over it by drawing
   the picture again, smaller and blurred. It sleeps while the tab is hidden, and holds still for visitors who
   ask their system for less motion. */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  /* ------------------------------------------------------------------ small helpers --------------------------- */
  function dice(seed) { let s = seed >>> 0 || 1; return () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (s | 1) ^ (s + (s ^ (s >>> 7)) * (s | 61))) >>> 0) / 4294967296); }
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));   // glide toward a value
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

  // The colours, from the film: amber-gold for the record, cream-white where it is being read, crimson where it was
  // just written, bronze where it has cooled with age. Teal belongs to the chamber only, never to the posts.
  const COL = { gold: [238, 178, 76], cream: [255, 243, 214], orange: [255, 138, 44], crimson: [255, 46, 60], bronze: [150, 92, 36], teal: [92, 226, 204] };

  /* ------------------------------------------------------------------ 1. posts into rings --------------------- */
  // A post's words, broken into the pieces that become arcs: sentences, headings, photographs, ornaments.
  function pieces(body) {
    const out = [];
    for (let para of String(body || "").replace(/\r/g, "").split(/\n{2,}/)) {
      para = para.trim(); if (!para) continue;
      if (/^(\*\s*\*\s*\*|-{3,}|_{3,})$/.test(para)) { out.push({ kind: "rule", text: "", chars: 0, fresh: true }); continue; }
      for (const m of para.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)) out.push({ kind: "photo", text: m[1] || "a photograph", chars: 300, fresh: true });
      const text = para.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").replace(/^>\s?/gm, "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const h = /^#{1,4}\s+(.*)$/.exec(text);
      if (h) { out.push({ kind: "head", text: h[1], chars: h[1].length, fresh: true }); continue; }
      (text.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g) || [text]).forEach((s, k) => { s = s.trim(); if (s) out.push({ kind: "line", text: s, chars: s.length, fresh: k === 0 }); });
    }
    return out;
  }

  let bands = [], rings = [], segs = [];
  function build(posts) {
    bands = []; rings = []; segs = [];
    const n = posts.length, now = Date.now();
    posts.forEach((p, i) => {
      const rnd = dice(hash(p.file || p.title || String(i)));
      const age = Math.max(0, (now - Date.parse(p.date + "T12:00:00")) / 864e5) || 0;
      const cool = 1 - Math.exp(-age / 120);                                   // 0 when new, toward 1 as it ages
      const col = mix(mix(COL.gold, COL.cream, .22 * (1 - cool)), mix(COL.orange, COL.bronze, .55), cool * .7);
      const band = { i, file: p.file, title: p.title || "Untitled", date: p.date, age, col, rings: [], unwind: 1, unwindTo: 1, glow: 0, glowTo: 0,
        month: String(p.date || "").slice(0, 7), words: String(p.body || "").split(/\s+/).filter(Boolean).length, fade: .78 + .22 * Math.exp(-age / 200) };
      // the newest post narrowest, at the top; each older one a little further out
      const radius = n > 1 ? .46 + .54 * Math.pow(i / (n - 1), .75) : .72;
      let ring = null, fill = 0;
      const open = (heavy) => {
        const shell = rnd() < .2 ? .84 : 1;                                      // now and then a ring set further in: shells within shells
        ring = { band, r: radius * shell * (1 + (rnd() - .5) * .07), phase: rnd() * TAU, turn: (rnd() < .5 ? -1 : 1) * (.025 + rnd() * .055), boost: 0, heavy, segs: [], u: 0, y: 0 };
        band.rings.push(ring); rings.push(ring); fill = rnd() * .5;
      };
      for (const piece of pieces(p.body)) {
        const len = piece.kind === "head" ? TAU * .74 : piece.kind === "rule" ? TAU * .9 : piece.kind === "photo" ? 1.05 : Math.min(1.5, .16 + .13 * Math.log(1 + piece.chars));
        if (!ring || piece.kind === "head" || piece.kind === "rule" || (piece.fresh && fill > TAU * .3) || fill + len > TAU * .66) open(piece.kind === "head");
        const seg = { ring, band, a0: fill, len, kind: piece.kind, text: piece.text, chars: piece.chars, lit: 0, litAt: -1e9, red: 0, grow: 1 };
        ring.segs.push(seg); segs.push(seg); fill += len + .05 + rnd() * .1;
        if (piece.kind === "head" || piece.kind === "rule") ring = null;
      }
      if (!band.rings.length) open(false);
      bands.push(band);
    });
  }

  // Where each ring sits from top (0) to bottom (1). An unwound band takes more room; a gap parts one post from the
  // next, and a wider one parts the months.
  function stack() {
    let u = 0, prev = null;
    for (const b of bands) {
      if (prev) u += b.month !== prev.month ? 5 : 2.6;
      b.u0 = u; for (const r of b.rings) { r.u = u; u += b.unwind; } b.u1 = u; prev = b;
    }
    const total = Math.max(u, 1);
    for (const r of rings) r.y = r.u / total;
    for (const b of bands) { b.y0 = b.u0 / total; b.y1 = b.u1 / total; }
  }

  /* ------------------------------------------------------------------ 2. where we stand ------------------------ */
  // V is the view as it is; T is what it is gliding toward. x0..x1 is the free strip of screen the tower stands in.
  const V = { x0: 0, x1: 1, dim: 1, cx: 0, top: 0, h: 0, R: 0 }, T = { x0: 0, x1: 1, dim: 1 };
  let W = 0, H = 0, S = 1, cv = null, c = null, focusFile = null, hoverBand = null, onOpen = () => {};
  function aim(snap) {
    // Room is kept clear above for the header (and on a phone the readout under it), and below for the line naming
    // the newest post, plus on a phone the callout strip. The tower fills what is left, its floor included.
    const free = (T.x1 - T.x0) * W, narrow = W < 700, home = T.dim > .9;
    const top = (narrow ? 150 : 56) * S, below = (narrow ? (home ? 178 : 40) : 100) * S;
    const R = Math.max(40 * S, Math.min(free * (narrow ? .3 : .19), H * .2, (H - top - below) * .3));
    const to = { cx: (T.x0 + T.x1) / 2 * W, top, h: Math.max(80 * S, (H - top - below - R * .62) / 1.06), R };
    for (const k in to) V[k] = snap ? to[k] : ease(V[k], to[k], 3.5, snap === 0 ? 0 : 1 / 60);
  }
  // A ring's centre on screen, and how open its ellipse is: the camera looks down on the tower from above, so the
  // lower rings open wider.
  const ringAt = (y) => ({ cy: V.top + y * V.h, tilt: .1 + .26 * y });
  function pointOn(seg, a) {
    const r = seg.ring, { cy, tilt } = ringAt(r.y), rx = r.r * V.R * band_spread(r.band);
    return { x: V.cx + rx * Math.cos(a), y: cy + rx * tilt * Math.sin(a), front: Math.sin(a) > 0 };
  }
  const band_spread = (b) => 1 + (b.unwind - 1) * .06;                   // an unwound band also swells a touch

  /* ------------------------------------------------------------------ 3. what happens ------------------------- */
  let clock = 0, nextRead = 2, intro = still ? 1 : 0;
  const callouts = [], probe = { x: 0, y: 0, tx: 0, ty: 0, on: 0 };
  function read(seg, kind = seg.kind === "photo" ? "VIEW" : "READ") {
    seg.litAt = clock; seg.ring.boost = .5;
    if (T.dim > .9) callouts.push({ seg, kind, t0: clock, ttl: 7 + Math.random() * 3 });   // callouts only on the tower's own page
    const max = W < 700 ? 1 : 7; while (callouts.length > max) callouts.shift();
    const p = pointOn(seg, seg.a0 + seg.len / 2 + seg.ring.phase); probe.tx = p.x; probe.ty = p.y; probe.on = 1;
  }
  function pickPassage() {
    // newer posts are read more often than old ones
    let w = 0; const weights = bands.map((b) => (w += Math.exp(-b.i * .35)));
    const t = Math.random() * w, b = bands[weights.findIndex((x) => x >= t)] || bands[0];
    const pool = b.rings.flatMap((r) => r.segs).filter((s) => s.kind !== "rule" && clock - s.litAt > 12);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // A new post (under a month old) writes itself in when the page opens: its arcs grow one after another.
  function writeIn() {
    const b = bands[0]; if (!b || b.age > 30 || still) return;
    const list = b.rings.flatMap((r) => r.segs);
    list.forEach((s, k) => { s.grow = 0; s.red = .9; s.growAt = 1.2 + k * Math.min(.06, 6 / list.length); });
    const first = list.find((s) => s.kind === "head") || list[0];
    if (first) setTimeout(() => callouts.push({ seg: first, kind: "NEW", t0: clock, ttl: 11, title: b.title }), 1300);
  }
  function step(dt) {
    clock += dt; intro = Math.min(1, intro + dt / 2.2);
    for (const k of ["x0", "x1", "dim"]) V[k] = ease(V[k], T[k], 3, dt);
    aim();
    for (const b of bands) {
      const on = b.file === focusFile || b === hoverBand;
      b.unwindTo = on ? 2.5 : 1; b.glowTo = on ? 1 : 0;
      b.unwind = ease(b.unwind, b.unwindTo, 4, dt); b.glow = ease(b.glow, b.glowTo, 5, dt);
    }
    stack();
    if (!still) for (const r of rings) { r.phase += (r.turn * (1 + r.boost * 6)) * dt; r.boost = ease(r.boost, 0, .6, dt); }
    for (const s of segs) {
      if (s.grow < 1 && clock > s.growAt) s.grow = Math.min(1, s.grow + dt * 1.6);
      if (s.red > 0 && s.grow >= 1) s.red = Math.max(0, s.red - dt / 18);
      const t = clock - s.litAt; s.lit = t < 0 ? 0 : Math.min(1, t / .18) * Math.exp(-t / 4.2);
    }
    if (!still && clock > nextRead && bands.length && T.dim > .3) { const s = pickPassage(); if (s) read(s); nextRead = clock + (W < 700 ? 3.2 : 1.6) + Math.random() * 2.2; }
    for (let i = callouts.length - 1; i >= 0; i--) if (clock - callouts[i].t0 > callouts[i].ttl) callouts.splice(i, 1);
    probe.x = ease(probe.x || probe.tx, probe.tx, 1.8, dt); probe.y = ease(probe.y || probe.ty, probe.ty, 1.8, dt); probe.on = ease(probe.on, 0, .25, dt);
  }

  /* ------------------------------------------------------------------ 4. the picture -------------------------- */
  // An arc of an ellipse, its near half bright and its far half faint (the far side of the tower seen through it).
  function arc(cx, cy, rx, ry, a, b, near, far) {
    let s = a;
    while (s < b - 1e-4) {
      const k = Math.floor(s / Math.PI + 1e-6), e = Math.min(b, (k + 1) * Math.PI), front = ((k % 2) + 2) % 2 === 0;
      c.globalAlpha = front ? near : far; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, s, e); c.stroke(); s = e;
    }
  }
  let verse = null;   // the faint calligraphy behind the tower, drawn once per window size
  function paintVerse() {
    verse = document.createElement("canvas"); verse.width = W; verse.height = H; if (W < 900) return;
    const v = verse.getContext("2d"), cols = ["逝者如斯夫", "不舍晝夜"], sz = Math.round(Math.min(H * .055, 52 * S));
    v.font = `${sz}px "Noto Serif TC", "Songti TC", "Noto Serif CJK TC", serif`; v.textAlign = "center"; v.fillStyle = "rgba(214,150,60,.11)";
    const right = W - sz * 1.4;
    cols.forEach((col, k) => [...col].forEach((ch, j) => v.fillText(ch, right - k * sz * 1.25, H * .1 + sz + j * sz * 1.12 + k * sz * .6)));
  }

  /* ------------------------------------------------------------------ the sayings ------------------------------ */
  // Sayings from site/quotes.js drift faintly behind the tower, set on a slant like the film's calligraphy walls. Each
  // place on the screen shows one for a while, fades it, and takes the next from a deck shuffled fresh on every visit,
  // so no two places ever show the same one. They sway a little, and each line shimmers on its own.
  const deck = (window.HL_QUOTES || []).filter((q) => q && q.text).sort(() => Math.random() - .5);
  let dealt = 0;
  const slots = [{ ph: 0, q: null, t0: 0 }, { ph: 2.1, q: null, t0: 0 }];
  const HOLD = 17, FADE = 2.6;   // seconds each saying stays, and how long it takes to fade in or out
  function deal(slot, now) {
    if (!deck.length) return;
    const showing = slots.map((x) => x.q);
    for (let k = 0; k < deck.length; k++) { const q = deck[dealt++ % deck.length]; if (!showing.includes(q) || deck.length < 3) { slot.q = q; break; } }
    slot.t0 = now;
  }
  // where each place is: beside the tower on a wide screen (left high, right low), behind it on a phone
  function slotBox(k) {
    const narrow = W < 700, gap = 28 * S;
    if (narrow) return k ? null : { x: 22 * S, w: W - 44 * S, y: V.top + V.h * .42, size: 17 * S, align: "center" };
    const left = { x: V.x0 * W + 40 * S, w: (V.cx - V.R * 1.25 - gap) - (V.x0 * W + 40 * S), y: V.top + V.h * .2 };
    const right = { x: V.cx + V.R * 1.3 + gap, w: (V.x1 * W - 40 * S) - (V.cx + V.R * 1.3 + gap), y: V.top + V.h * .68 };
    const b = k ? right : left;
    b.w = Math.min(b.w, 420 * S); if (k) b.x = Math.max(b.x, V.x1 * W - 40 * S - b.w);
    b.size = Math.min(26 * S, Math.max(17 * S, b.w / 15)); b.align = k ? "right" : "left";
    return b.w > 150 * S ? b : null;
  }
  function wrap(text, width) {
    const lines = []; let line = "";
    for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (line && c.measureText(t).width > width) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function sayings() {
    const show = clamp((V.dim - .6) / .35) * intro; if (show < .01 || !deck.length) return;
    slots.forEach((slot, k) => {
      const b = slotBox(k); if (!b) return;
      if (!slot.q) deal(slot, clock - (k ? HOLD / 2 : 0));            // the two places change at different moments
      let age = clock - slot.t0; if (age > HOLD) { deal(slot, clock); age = 0; }
      const a = show * clamp(age / FADE) * clamp((HOLD - age) / FADE);
      if (a < .01) return;
      const t = still ? 0 : clock, dx = Math.sin(t * .21 + slot.ph) * 9 * S, dy = Math.sin(t * .16 + slot.ph * 2) * 6 * S, lean = Math.sin(t * .09 + slot.ph) * .025;
      c.save(); c.translate(b.x + (b.align === "right" ? b.w : b.align === "center" ? b.w / 2 : 0) + dx, b.y + dy); c.transform(1, -.07 + lean, -.16, 1, 0, 0);
      c.textAlign = b.align; c.textBaseline = "alphabetic";
      c.font = `italic 500 ${b.size}px "Cormorant Garamond", Georgia, serif`;
      const lines = wrap("\u201c" + slot.q.text + "\u201d", b.w), lh = b.size * 1.22;
      lines.forEach((line, j) => {
        const shimmer = still ? 0 : Math.sin(t * .6 + j * 1.7 + slot.ph) * 1.8 * S;
        c.globalAlpha = a * (W < 700 ? .17 : .3); c.fillStyle = "rgb(226,162,72)"; c.fillText(line, shimmer, j * lh);
      });
      if (slot.q.from) {
        c.font = `500 ${Math.max(9 * S, b.size * .42)}px "IBM Plex Mono", ui-monospace, monospace`; c.globalAlpha = a * .22;
        c.fillText(("\u2014 " + slot.q.from).toUpperCase(), 0, lines.length * lh + b.size * .2);
      }
      c.restore();
    });
  }
  // the chamber: a lattice of teal points circling the foot of the tower, and lights on the floor
  function chamber(front) {
    const { cy } = ringAt(1.06), R = V.R * 1.75, tilt = .34, n = W < 700 ? 90 : 170;
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + clock * .01, sn = Math.sin(a); if ((sn > 0) !== front) continue;
      for (const strand of [0, 1]) {
        const wob = Math.sin(a * 9 + strand * Math.PI + clock * .3) * 5 * S, x = V.cx + R * Math.cos(a), y = cy + R * tilt * sn + wob;
        c.fillStyle = rgb(COL.teal, (front ? .55 : .2) * V.dim * intro); c.fillRect(x - S, y - S, 1.6 * S, 1.6 * S);
      }
    }
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU + .4, sn = Math.sin(a); if ((sn > 0) !== front) continue;
      const x = V.cx + V.R * 1.4 * Math.cos(a), y = ringAt(1.02).cy + V.R * 1.4 * .34 * sn, r = (front ? 18 : 11) * S;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb([220, 255, 245], .9 * V.dim * intro)); g.addColorStop(.25, rgb(COL.teal, .45 * V.dim * intro)); g.addColorStop(1, rgb(COL.teal, 0));
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  function paint() {
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    const bg = c.createRadialGradient(V.cx, H * .55, 0, V.cx, H * .55, Math.max(W, H) * .7);
    bg.addColorStop(0, "#130c06"); bg.addColorStop(.5, "#090604"); bg.addColorStop(1, "#040302");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (verse) { c.globalAlpha = clamp((V.dim - .6) / .4); c.drawImage(verse, 0, 0); c.globalAlpha = 1; }
    sayings(); c.globalAlpha = 1;
    c.globalCompositeOperation = "lighter";
    chamber(false);
    // the axis: a faint thread of light down the middle, and a bright tick at the top
    c.globalAlpha = .08 * V.dim * intro; c.fillStyle = rgb(COL.cream); c.fillRect(V.cx - .5 * S, V.top - 18 * S, S, V.h + 30 * S);
    c.globalAlpha = .9 * V.dim * intro; c.fillRect(V.cx - 1.2 * S, V.top - 22 * S, 2.4 * S, 12 * S);
    c.lineCap = "round";
    for (const r of rings) {
      const { cy, tilt } = ringAt(r.y), b = r.band, rx = r.r * V.R * band_spread(b) * (still ? 1 : .55 + .45 * clamp(intro * 1.8 - r.y * .8)), ry = rx * tilt;
      const show = V.dim * b.fade * clamp(intro * 1.8 - r.y * .8);
      if (show < .01) continue;
      for (const s of r.segs) {
        if (s.grow <= 0) continue;
        const heat = Math.max(s.lit, b.glow * .55), col = mix(mix(b.col, COL.crimson, s.red * (1 - heat)), COL.cream, heat);
        const near = show * (.6 + .4 * heat), far = near * .26, a = s.a0 + r.phase, len = s.len * s.grow;
        c.strokeStyle = rgb(col); c.lineWidth = (s.kind === "head" ? 2.4 : r.heavy ? 2 : 1.15) * S * (1 + heat * .5);
        if (s.kind === "photo" || s.kind === "rule") c.setLineDash(s.kind === "photo" ? [4 * S, 4 * S] : [1 * S, 5 * S]);
        arc(V.cx, cy, rx, ry, a, a + len, near, far);
        c.setLineDash([]);
        // two faint lines just under it, so the packed rings merge into the drum's fine striations
        c.lineWidth = .8 * S; arc(V.cx, cy + 2.2 * S, rx * .995, ry, a, a + len, near * .34, far * .4);
        arc(V.cx, cy + 4.4 * S, rx * .99, ry, a + .03, a + len - .03, near * .14, far * .2);
        if (s.grow < 1) {                                                        // the bright tip of an arc being written
          const p = pointOn(s, a + len); c.globalAlpha = show; c.fillStyle = rgb(COL.cream); c.beginPath(); c.arc(p.x, p.y, 2.2 * S, 0, TAU); c.fill();
        }
        if ((s.kind === "photo" || s.kind === "head" || s.lit > .3) && !still) {   // white cards standing on the near side, like index tabs
          const p = pointOn(s, a + len / 2);
          if (p.front) { c.globalAlpha = show * (s.kind === "photo" ? .8 : .45 + s.lit * .5); c.fillStyle = rgb(COL.cream); c.fillRect(p.x - 1.4 * S, p.y - 15 * S, 2.8 * S, 13 * S); }
        }
      }
    }
    chamber(true);
    if (probe.on > .02 && !still) {                                         // the probe: a small gimbal of wire circles
      c.globalAlpha = probe.on * V.dim; c.strokeStyle = rgb(COL.cream); c.lineWidth = .8 * S; const r = 7 * S;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(probe.x, probe.y, r, r * Math.abs(Math.cos(clock * 1.3 + k * 1.05)), k * 1.05, 0, TAU); c.stroke(); }
      for (const [k, col] of [[0, COL.cream], [1, COL.crimson]]) {             // and its two arrowheads, white and red
        const a = clock * 1.6 + k * Math.PI, x = probe.x + Math.cos(a) * r * 2.4, y = probe.y + Math.sin(a) * r * .9;
        c.fillStyle = rgb(col); c.beginPath(); c.moveTo(x, y - 4 * S); c.lineTo(x + 3 * S, y + 3 * S); c.lineTo(x - 3 * S, y + 3 * S); c.fill();
      }
    }
    glow();
    labels();
  }
  // the glow: the picture drawn again at a quarter and a tenth of its size, then laid back over itself
  let small = null, smaller = null;
  function glow() {
    if (!small) { small = document.createElement("canvas"); smaller = document.createElement("canvas"); }
    const w1 = Math.max(1, W >> 2), h1 = Math.max(1, H >> 2), w2 = Math.max(1, Math.round(W / 10)), h2 = Math.max(1, Math.round(H / 10));
    if (small.width !== w1 || small.height !== h1) { small.width = w1; small.height = h1; smaller.width = w2; smaller.height = h2; }
    const a = small.getContext("2d"), b = smaller.getContext("2d");
    a.globalCompositeOperation = "copy"; a.drawImage(cv, 0, 0, w1, h1);
    b.globalCompositeOperation = "copy"; b.drawImage(small, 0, 0, w2, h2);
    c.globalCompositeOperation = "lighter"; c.imageSmoothingEnabled = true;
    c.globalAlpha = .5; c.drawImage(small, 0, 0, W, H);
    c.globalAlpha = .55; c.drawImage(smaller, 0, 0, W, H);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  }
  // The callouts: a leader line from the arc being read out to a label at the side, naming the passage and its post.
  function labels() {
    if (V.dim < .25 || !callouts.length) return;
    if (W < 700) return strip();
    const fs = 12 * S, room = {                                              // how wide each side's labels may be
      l: Math.min(300 * S, (V.cx - V.R * 1.15 - 20 * S) - (V.x0 * W + 16 * S)),
      r: Math.min(300 * S, (V.x1 * W - 16 * S) - (V.cx + V.R * 1.15 + 20 * S)) };
    // labels stay clear of the header above, the line at the foot, and on the right the readout in the corner
    const lowest = { l: H - 110 * S, r: H - 170 * S };
    const placed = { l: [], r: [] };
    for (const co of callouts) {
      const s = co.seg, p = pointOn(s, s.a0 + s.len / 2 + s.ring.phase), side = p.x < V.cx ? "l" : "r";
      const age = clock - co.t0, alpha = clamp(age / .3) * clamp((co.ttl - age) / 1.4) * clamp((V.dim - .25) * 2);
      placed[side].push({ co, p, side, alpha, y: clamp(p.y - 10 * S, 40 * S, lowest[side]) });
    }
    c.textBaseline = "alphabetic"; c.globalCompositeOperation = "source-over";
    for (const side of ["l", "r"]) {
      const colW = room[side]; if (colW < 120 * S) continue;
      const list = placed[side].sort((a, b) => a.y - b.y);
      for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + fs * 3.1);   // keep labels from overlapping
      for (let i = list.length - 2; i >= 0; i--) if (list[i + 1].y > lowest[side]) { list[i + 1].y = lowest[side]; list[i].y = Math.min(list[i].y, list[i + 1].y - fs * 3.1); }
      for (const L of list) {
        const edge = side === "l" ? V.cx - V.R * 1.15 - 20 * S : V.cx + V.R * 1.15 + 20 * S;
        const chars = Math.max(10, Math.floor(colW / (fs * .62)));
        const line1 = clip(L.co.title || L.co.seg.text, chars), kindCol = L.co.kind === "NEW" ? COL.crimson : L.co.kind === "VIEW" ? COL.teal : COL.cream;
        const line2 = `${L.co.seg.chars ? L.co.seg.chars + " ch  " : ""}${L.co.seg.band.title}`;
        c.globalAlpha = L.alpha;
        c.strokeStyle = rgb(COL.gold, .7); c.lineWidth = .8 * S; c.beginPath(); c.moveTo(L.p.x, L.p.y); c.lineTo(edge, L.y + 4 * S);
        c.lineTo(side === "l" ? edge - Math.min(colW, measure(line1, fs) + 4 * S) : edge + Math.min(colW, measure(line1, fs) + 4 * S), L.y + 4 * S); c.stroke();
        c.fillStyle = rgb(COL.cream); c.beginPath(); c.arc(L.p.x, L.p.y, 1.8 * S, 0, TAU); c.fill();
        c.textAlign = side === "l" ? "right" : "left"; const tx = side === "l" ? edge - 2 * S : edge + 2 * S;
        c.font = `500 ${fs}px "IBM Plex Mono", ui-monospace, monospace`; c.fillStyle = rgb(COL.gold); c.fillText(line1, tx, L.y);
        c.font = `500 ${fs * .78}px "IBM Plex Mono", ui-monospace, monospace`;
        const tag = L.co.kind + "  ", tw = measure(tag, fs * .78, 500);
        if (side === "l") { c.fillStyle = rgb(COL.gold, .62); c.fillText(clip(line2, chars - 6), tx, L.y + fs * 1.45); const lw = measure(clip(line2, chars - 6), fs * .78, 500); c.fillStyle = rgb(kindCol); c.fillText(tag, tx - lw, L.y + fs * 1.45); }
        else { c.fillStyle = rgb(kindCol); c.fillText(tag, tx, L.y + fs * 1.45); c.fillStyle = rgb(COL.gold, .62); c.fillText(clip(line2, chars - 6), tx + tw, L.y + fs * 1.45); }
      }
    }
    c.globalAlpha = 1;
  }
  // On a phone there is no room beside the tower, so the latest callout sits in a strip under it, the whole passage
  // over two lines, with its leader line running up to the arc being read.
  function strip() {
    const co = callouts[callouts.length - 1], s = co.seg, p = pointOn(s, s.a0 + s.len / 2 + s.ring.phase);
    const age = clock - co.t0, alpha = clamp(age / .3) * clamp((co.ttl - age) / 1.4) * clamp((V.dim - .25) * 2);
    const fs = 11 * S, x = 18 * S, w = W - 36 * S, y = H - 150 * S;
    c.textBaseline = "alphabetic"; c.globalCompositeOperation = "source-over"; c.globalAlpha = alpha;
    c.font = `500 ${fs}px "IBM Plex Mono", ui-monospace, monospace`;
    let lines = wrap(co.title || s.text, w);
    if (lines.length > 2) lines = [lines[0], clip(lines.slice(1).join(" "), Math.floor(w / (fs * .6)))];
    const anchorX = clamp(p.x, x, x + w);
    c.strokeStyle = rgb(COL.gold, .6); c.lineWidth = .8 * S; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(anchorX, y - fs * 1.6); c.lineTo(anchorX < W / 2 ? x : x + w, y - fs * 1.6); c.stroke();
    c.fillStyle = rgb(COL.cream); c.beginPath(); c.arc(p.x, p.y, 1.8 * S, 0, TAU); c.fill();
    c.textAlign = "left"; c.fillStyle = rgb(COL.gold); lines.forEach((l, j) => c.fillText(l, x, y + j * fs * 1.4));
    const ty = y + lines.length * fs * 1.4 + fs * .2, kindCol = co.kind === "NEW" ? COL.crimson : co.kind === "VIEW" ? COL.teal : COL.cream;
    c.font = `500 ${fs * .82}px "IBM Plex Mono", ui-monospace, monospace`; const tag = co.kind + "  ";
    c.fillStyle = rgb(kindCol); c.fillText(tag, x, ty);
    c.fillStyle = rgb(COL.gold, .62); c.fillText(clip(`${s.chars ? s.chars + " ch  " : ""}${s.band.title}`, 34), x + c.measureText(tag).width, ty);
    c.globalAlpha = 1;
  }
  const measure = (t, fs, w = 500) => { c.font = `${w} ${fs}px "IBM Plex Mono", ui-monospace, monospace`; return c.measureText(t).width; };

  /* ------------------------------------------------------------------ 5. pointing at it ----------------------- */
  // Which post's band is under the pointer: the ring whose centre line is nearest, if the pointer is near the tower.
  function bandAt(px, py) {
    px *= S; py *= S; if (Math.abs(px - V.cx) > V.R * 1.5) return null;
    let best = null, d = 22 * S;
    for (const r of rings) { const dy = Math.abs(ringAt(r.y).cy - py); if (dy < d) { d = dy; best = r.band; } }
    if (!best) for (const b of bands) if (py >= ringAt(b.y0).cy - 6 * S && py <= ringAt(b.y1).cy + 6 * S) best = b;
    return best;
  }
  let pin = null;   // the card that offers to open the band pointed at
  function showPin(b) {
    if (!pin) { pin = document.createElement("a"); pin.className = "pin"; document.body.appendChild(pin); }
    if (!b) { pin.classList.remove("on"); return; }
    const when = new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    pin.href = "#/post/" + encodeURIComponent(b.file);
    pin.innerHTML = `<span class="pk">ENTRY ${String(bands.length - b.i).padStart(3, "0")} · ${b.words.toLocaleString()} WORDS</span><span class="pt"></span><span class="pd">${when}</span><span class="po">${coarse ? "Tap to open" : "Click to open"} ▸</span>`;
    pin.querySelector(".pt").textContent = b.title;
    const mid = ringAt((b.y0 + b.y1) / 2).cy / S, right = (V.cx + V.R * 1.25) / S, w = 230;
    const x = right + w + 16 < V.x1 * W / S ? right + 10 : Math.max(8, (V.cx - V.R * 1.25) / S - w - 10);
    pin.style.left = Math.min(x, innerWidth - w - 8) + "px"; pin.style.top = clamp(mid - 40, 70, innerHeight - 140) + "px";
    pin.classList.add("on");
  }
  function hook() {
    cv.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; const b = bandAt(e.offsetX, e.offsetY); if (b !== hoverBand) { hoverBand = b; showPin(b); cv.style.cursor = b ? "pointer" : ""; poke(); } });
    cv.addEventListener("pointerleave", (e) => { if (e.pointerType === "touch") return; hoverBand = null; showPin(null); cv.style.cursor = ""; poke(); });
    cv.addEventListener("click", (e) => {
      const b = bandAt(e.offsetX, e.offsetY);
      if (!b) { hoverBand = null; showPin(null); poke(); return; }
      if (coarse && b !== hoverBand) { hoverBand = b; showPin(b); poke(); return; }   // on a phone: the first tap chooses, the second opens
      onOpen(b.file);
    });
    addEventListener("hashchange", () => { hoverBand = null; showPin(null); });
  }

  /* ------------------------------------------------------------------ 6. running ------------------------------ */
  function size() {
    if (!cv) return;
    S = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.75);
    W = Math.round(innerWidth * S); H = Math.round(innerHeight * S);
    cv.width = W; cv.height = H; c = cv.getContext("2d");
    paintVerse(); aim(true); poke();
  }
  let last = 0, raf = 0, frame = 0, stillUntil = 0;
  const poke = () => { stillUntil = performance.now() + 1500; if (!raf && cv) raf = requestAnimationFrame(tick); };
  function tick(now) {
    raf = 0; if (document.hidden) return;
    const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    // phones draw every other frame; a page being read with the tower dimmed behind it draws one frame in four
    frame++; const every = T.dim < .3 ? 4 : coarse ? 2 : 1;
    step(dt);
    if (frame % every === 0) paint();
    if (!still || now < stillUntil) raf = requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", () => { last = 0; if (!document.hidden) poke(); });
  let resized = 0; addEventListener("resize", () => { clearTimeout(resized); resized = setTimeout(size, 150); });

  window.Tower = {
    start(canvas, posts, opts = {}) {
      cv = canvas; onOpen = opts.onOpen || onOpen; build(posts || []); stack(); size(); hook(); writeIn();
      if (still) { intro = 1; for (const s of segs) s.grow = 1; setInterval(poke, 4000); }   // held still, but the sayings still change
      if (document.fonts) document.fonts.ready.then(() => { paintVerse(); poke(); });
      poke();
    },
    view(v = {}) {
      if (v.x0 != null) T.x0 = v.x0; if (v.x1 != null) T.x1 = v.x1; if (v.dim != null) T.dim = v.dim;
      if ("focus" in v) focusFile = v.focus;
      if (!cv) { V.x0 = T.x0; V.x1 = T.x1; V.dim = T.dim; }
      poke();
    },
    stats() { return { posts: bands.length, rings: rings.length, arcs: segs.length }; }
  };
})();
