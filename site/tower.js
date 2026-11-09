/* =====================================================================================================================
   HALF LIFE: THE TOWER                                                                                   site/tower.js
   =====================================================================================================================

   WHAT IT IS
   The posts (and quests) drawn as the glowing security tower from the hack in Ghost in the Shell 2: Innocence.
   It is a reworking of iliabaranov/gits-file-visualizer (Apache-2.0, credited in README.md), which draws a computer's
   files that way as a GNOME wallpaper in Rust + WebGPU. This is a small plain-JavaScript version for one web page.

   HOW THE ORIGINAL MAPS ONTO THIS ONE
     original (files on a disk)                     here (writing on a site)
     ----------------------------------------       ------------------------------------------------------------
     a directory's row of files  = one RING         a paragraph                         = one RING
     one file                    = one ARC          one sentence (long sentence = long arc)
     a directory (many rings)    = one BAND         one post (or one quest)             = one BAND
     ~ at the top, deeper folders further out       newest post at the top and narrowest, older ones lower and wider
     a file being read flashes cream                every few seconds a random passage flashes white (READ)
     a new file grows along its ring                a post < 30 days old writes itself in on page load (NEW), and the newest post stays pink; plant entries are green;
                                                    quest rings draw themselves in the same way
     activity "unwinds" a subtree (rings part)      pointing at a band unwinds it: its rings part and it glows
     callouts name the files being touched          callouts name the passage being "read"
     the probe (wire gimbal) rides to the action    same
     teal lattice + floor lights around the base    same, in blue
   Not carried over: the GPU drum shader, deletes, the disk chart, the system monitor.

   THE PIECES OF DATA (made by build(), kept in three flat lists so each frame can loop quickly)
     band  one post or quest.  { kind: "post"|"quest", file, title, date, col (its colour), rings: [],
                                 unwind (1 = packed .. 2.5 = parted), glow (0..1, while pointed at or read),
                                 y0/y1 (its top and bottom, 0..1 down the tower), entry/words (posts), quest (quests) }
     ring  one line of arcs.   { band, r (radius, as a share of the tower's radius), phase/turn (spin angle and speed),
                                 boost (a short spin-up when read), heavy (thicker), segs: [], y (0..1 down the tower) }
     seg   one arc.            { ring, band, a0/len (where it starts on the ring and how long, in radians),
                                 kind: "line"|"head"|"photo"|"rule"|"quest"|"veiled", text, chars,
                                 lit (0..1 read-flash), litAt, red (0..1 "just written" colour),
                                 grow (0..1 how much of it is drawn), tc (when it starts growing, or null) }

   TIME
     clock    seconds since the page opened (only moves while the tab is visible).
     intro    0 → 1 over the first 2.2 s: rings fade in and widen from the top down (the opening sweep).
     tc/grow  an arc with a tc grows along its ring for GROW (1.5 s) starting at clock = tc, eased in and out, with a
              bright tip that fades as it completes. Exactly the original's "create" animation. Arcs that arrive
              late (quests from the calendar) get tc = now, so they grow in when they arrive.

   WHERE THINGS ARE ON SCREEN
     T is where the view is heading, V is where it is now (it glides). x0..x1 is the strip of screen the tower stands
     in (the page beside it changes this); dim is its brightness (1 on the home page, lower while reading).
     A ring at y (0 top .. 1 bottom) sits at screen height V.top + y * V.h. The camera looks down a little, so lower
     rings are drawn as wider-open ellipses (tilt).

   DRAWING ORDER, EVERY FRAME (paint)
     1. clear to transparent, add light on top ("lighter"): back half of the blue lattice, the axis, every arc as a
        soft neon tube, the front half of the lattice, the probe
     2. glow(): copy the picture at 1/4, 1/10 and 1/26 size and add it back, blurred by the scaling: the bloom
     3. the dark chamber gradient is laid in BEHIND the light ("destination-over")
     4. the sayings (sharp, no glow) and the callouts on top

   THE REST OF THE PAGE TALKS TO IT THROUGH window.Tower (used by site/blog.js)
     Tower.start(canvas, posts, { quests, onOpen(file) })  build and start drawing
     Tower.quests(posts, quests)                           add the gold rings when the calendar answers late
     Tower.view({ x0, x1, dim, focus })                    where to stand, how bright, which band stays unwound
     Tower.stats()                                         counts, for testing

   COST
     It sleeps while the tab is hidden, draws every other frame on phones, one in three while the page scrolls and one
     in four when dimmed behind a page; it holds still for visitors who ask their system for less motion. Arcs that look
     alike on a ring are stroked together in one batch, colours are worked out only when they change, and
     near-invisible strokes are skipped.
   ================================================================================================================== */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;   // visitor asked for less motion
  const coarse = matchMedia("(pointer: coarse)").matches;                // a touch screen

  /* ------------------------------------------------------------------------------------------------ small helpers */
  // dice(seed): a repeatable random-number generator, so each post's rings come out the same on every visit.
  function dice(seed) { let s = seed >>> 0 || 1; return () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (s | 1) ^ (s + (s ^ (s >>> 7)) * (s | 61))) >>> 0) / 4294967296); }
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));   // glide toward a value; same feel at any frame rate
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
  const MONO = (px) => `500 ${px}px "IBM Plex Mono", ui-monospace, monospace`;

  /* ------------------------------------------------------------------------------------------------------ colours */
  // The film's colour roles, turned violet. The names are the roles, not the hues:
  //   gold    the record's own colour (violet)          cream   being read (near-white)
  //   crimson just written (magenta)                    orange, bronze   cooled with age (orchid, deep indigo)
  //   blue    the chamber only (lattice, floor lights), never the writing
  const COL = { gold: [196, 108, 255], cream: [248, 238, 255], orange: [214, 90, 255], crimson: [255, 78, 168], bronze: [136, 82, 240], blue: [92, 132, 255] };
  const PINK = [255, 120, 210];          // a post's band glows this when pointed at or being read
  const QUEST_GOLD = [255, 194, 82];     // quest rings
  const QUEST_HOT = [255, 236, 170];     // a quest's band when pointed at
  const LEAF = [96, 236, 150];           // plant entries (house plants, bonsai): a soft neon green
  const LEAF_HOT = [196, 255, 214];      // a plant entry's band when pointed at

  /* ============================================================================================ 1. WORDS INTO RINGS */
  // A post's text broken into the pieces that become arcs. "fresh" marks the first sentence of a paragraph, which
  // prefers to start a new ring (so the rings follow the paragraphs).
  function pieces(body) {
    const out = [];
    for (let para of String(body || "").replace(/\r/g, "").split(/\n{2,}/)) {
      para = para.trim(); if (!para) continue;
      if (/^(\*\s*\*\s*\*|-{3,}|_{3,})$/.test(para)) { out.push({ kind: "rule", text: "", chars: 0, fresh: true }); continue; }   // *** ornament
      for (const m of para.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)) out.push({ kind: "photo", text: m[1] || "a photograph", chars: 300, fresh: true });
      const text = para.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").replace(/^>\s?/gm, "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const h = /^#{1,4}\s+(.*)$/.exec(text);
      if (h) { out.push({ kind: "head", text: h[1], chars: h[1].length, fresh: true }); continue; }
      // split into sentences (keeping closing quotes and brackets with their sentence)
      (text.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g) || [text]).forEach((s, k) => { s = s.trim(); if (s) out.push({ kind: "line", text: s, chars: s.length, fresh: k === 0 }); });
    }
    return out;
  }

  let bands = [], rings = [], segs = [];
  let questAt = .35, questOrder = 0;     // when gold arcs start growing: early in the opening, or "now" if they arrive late
  const radiusFor = (i, n) => (n > 1 ? .46 + .54 * Math.pow(i / (n - 1), .75) : .72);   // top band narrowest, widening down
  const newBand = (props) => ({ rings: [], unwind: 1, glow: 0, age: 0, fade: 1, words: 0, ...props, month: String(props.date || "").slice(0, 7) });
  const newSeg = (ring, band, a0, len, kind, text, chars, tc = null) => ({ ring, band, a0, len, kind, text, chars, lit: 0, litAt: -1e9, red: 0, grow: tc == null ? 1 : 0, tc, ck: "" });

  // Lay posts and quests into one tower by date, newest at the top. Quests still to come always sit above every post.
  function build(posts, quests = []) {
    bands = []; rings = []; segs = []; questOrder = 0;
    const items = [...posts.map((p, k) => ({ kind: "post", p, date: p.date, entry: posts.length - k })), ...quests.map((q) => ({ kind: "quest", q, date: q.date }))]
      .sort((a, b) => { const key = (x) => (x.kind === "quest" && !x.q.over ? "9" : "0") + String(x.date); return key(b).localeCompare(key(a)); });
    const n = items.length, newest = posts.findIndex((p) => !p.plants); newestEntry = newest < 0 ? 0 : posts.length - newest;
    items.forEach((it, i) => (it.kind === "quest" ? questBand(it.q, i, n) : postBand(it.p, it.entry, i, n)));
  }

  const PINK_REST = .85;                                                  // how pink the newest post stays
  let newestEntry = 0;                                                    // set by build(): the newest post's entry number
  // A post: its pieces laid along rings. A ring is filled to about two thirds of the way round, so arcs leave gaps.
  function postBand(p, entry, i, n) {
    const rnd = dice(hash(p.file || p.title || String(i)));
    const age = Math.max(0, (Date.now() - Date.parse(p.date + "T12:00:00")) / 864e5) || 0;   // days old
    const cool = 1 - Math.exp(-age / 120);                                                   // 0 new → 1 old
    const col = p.plants ? mix(LEAF, [60, 170, 120], cool * .3) : mix(COL.gold, mix(COL.orange, COL.bronze, .55), cool * .45);   // cools only a little: the tower stays neon
    const band = newBand({ i, kind: "post", plant: !!p.plants, entry, file: p.file, title: p.title || "Untitled", date: p.date, age, col,
      words: String(p.body || "").split(/\s+/).filter(Boolean).length, fade: .78 + .22 * Math.exp(-age / 200) });
    const radius = radiusFor(i, n);
    let ring = null, fill = 0;
    const open = (heavy) => {
      const shell = rnd() < .2 ? .84 : 1;                                   // now and then a ring set further in: shells within shells
      ring = { band, r: radius * shell * (1 + (rnd() - .5) * .07), phase: rnd() * TAU, turn: (rnd() < .5 ? -1 : 1) * (.065 + rnd() * .13), boost: 0, heavy, segs: [], y: 0 };
      band.rings.push(ring); rings.push(ring); fill = rnd() * .5;
    };
    for (const piece of pieces(p.body)) {
      const len = piece.kind === "head" ? TAU * .74 : piece.kind === "rule" ? TAU * .9 : piece.kind === "photo" ? 1.05 : Math.min(1.5, .16 + .13 * Math.log(1 + piece.chars));
      if (!ring || piece.kind === "head" || piece.kind === "rule" || (piece.fresh && fill > TAU * .3) || fill + len > TAU * .66) open(piece.kind === "head");
      const seg = newSeg(ring, band, fill, len, piece.kind, piece.text, piece.chars);
      ring.segs.push(seg); segs.push(seg); fill += len + .05 + rnd() * .1;
      if (piece.kind === "head" || piece.kind === "rule") ring = null;     // headings and ornaments get a ring to themselves
    }
    if (!band.rings.length) open(false);
    // The newest post stays pink at rest; every other post is violet (and a plant entry always green, so the pink goes
    // to the newest entry that isn't one). pink is the floor the "just written" magenta fades down to; see step().
    band.pink = entry === newestEntry && !p.plants ? PINK_REST : 0;
    for (const r of band.rings) for (const sg of r.segs) sg.red = band.pink;
    bands.push(band);
  }

  // A quest: three gold rings of a few long arcs. Still to come = dashed ("veiled"), as if not yet solid.
  // Its arcs always grow in, one after another, starting at questAt.
  function questBand(q, i, n) {
    const rnd = dice(hash("quest" + q.id + q.date));
    const band = newBand({ i, kind: "quest", quest: q, file: "quest:" + q.id, title: q.title, date: q.date, col: q.over ? QUEST_GOLD : mix(QUEST_GOLD, COL.cream, .15) });
    const radius = radiusFor(i, n);
    for (let k = 0; k < 3; k++) {
      const ring = { band, r: radius * (1.02 + k * .03), phase: rnd() * TAU, turn: (k % 2 ? -1 : 1) * (.05 + rnd() * .08), boost: 0, heavy: k === 1, segs: [], y: 0 };
      for (let a = 0, fill = rnd() * .4; a < 3 && fill < TAU * .9; a++) {
        const len = TAU * (.18 + rnd() * .14), seg = newSeg(ring, band, fill, len, q.over ? "quest" : "veiled", q.title, 0, questAt + (questOrder++) * .09);
        ring.segs.push(seg); segs.push(seg); fill += len + .25 + rnd() * .3;
      }
      band.rings.push(ring); rings.push(ring);
    }
    bands.push(band);
  }

  // Where each ring sits down the tower (0 top .. 1 bottom). Each ring takes one unit of height times its band's unwind
  // (so an unwound band spreads out); a gap of 2.6 units parts one band from the next, 5 when the month changes.
  // Runs every frame because unwind animates.
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

  /* =================================================================================================== 2. THE VIEW */
  const V = { x0: 0, x1: 1, dim: 1, cx: 0, top: 0, h: 0, R: 0 }, T = { x0: 0, x1: 1, dim: 1 };
  let W = 0, H = 0, S = 1, phone = false, cv = null, c = null, focusFile = null, hoverBand = null, onOpen = () => {};
  // Fit the tower into its strip: room is kept above for the header and a little below. On a phone
  // (phone = a window 860 px wide or less, blog.css section 14) the tower is drawn larger, under the top bar, with
  // room below for one saying, the RECORD panel and the tabs. dt = null snaps straight there.
  function aim(dt) {
    const free = (T.x1 - T.x0) * W, home = T.dim > .9;
    const top = (phone ? 80 : 56) * S, below = (phone ? (home ? 300 : 40) : (home ? 70 : 44)) * S;
    const R = Math.max(40 * S, Math.min(free * (phone ? .36 : .19), H * (phone ? .24 : .2), (H - top - below) * .3));
    const to = { cx: (T.x0 + T.x1) / 2 * W, top, h: Math.max(80 * S, (H - top - below - R * .62) / 1.06), R };
    for (const k in to) V[k] = dt == null ? to[k] : ease(V[k], to[k], 3.5, dt);
  }
  const ringAt = (y) => ({ cy: V.top + y * V.h, tilt: .1 + .26 * y });   // a ring's screen height, and how open its ellipse is
  const spread = (b) => 1 + (b.unwind - 1) * .06;                         // an unwound band also swells a touch
  function pointOn(seg, a) {                                              // a point on a ring at angle a (front = near side)
    const r = seg.ring, { cy, tilt } = ringAt(r.y), rx = r.r * V.R * spread(r.band);
    return { x: V.cx + rx * Math.cos(a), y: cy + rx * tilt * Math.sin(a), front: Math.sin(a) > 0 };
  }

  /* =============================================================================================== 3. WHAT HAPPENS */
  let clock = 0, nextRead = 2, intro = still ? 1 : 0;
  const GROW = 1.5;                                                      // seconds for an arc to grow along its ring
  const callouts = [], probe = { x: 0, y: 0, tx: 0, ty: 0, on: 0 };

  // READ: a passage flashes, its ring spins up for a moment, the probe glides there and (home page only) a callout names it.
  function read(seg) {
    seg.litAt = clock; seg.ring.boost = .5;
    if (T.dim > .9) callouts.push({ seg, kind: seg.kind === "photo" ? "VIEW" : "READ", t0: clock, ttl: 7 + Math.random() * 3 });
    while (callouts.length > (phone ? 1 : 7)) callouts.shift();
    const p = pointOn(seg, seg.a0 + seg.len / 2 + seg.ring.phase); probe.tx = p.x; probe.ty = p.y; probe.on = 1;
  }
  // Which passage to read next: newer posts far more often than old ones; never one read in the last 12 s.
  function pickPassage() {
    const posts = bands.filter((x) => x.kind === "post"); if (!posts.length) return null;
    let w = 0; const weights = posts.map((x, k) => (w += Math.exp(-k * .35)));
    const t = Math.random() * w, b = posts[weights.findIndex((x) => x >= t)] || posts[0];
    const pool = b.rings.flatMap((r) => r.segs).filter((s) => s.kind !== "rule" && clock - s.litAt > 12);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // NEW: a post under a month old writes itself in on page load, arc after arc, magenta cooling to violet.
  function writeIn() {
    const b = bands.find((x) => x.kind === "post"); if (!b || b.age > 30 || still) return;
    const list = b.rings.flatMap((r) => r.segs);
    list.forEach((s, k) => { s.grow = 0; s.red = b.plant ? 0 : .9; s.tc = 1.2 + k * Math.min(.06, 6 / list.length); });
    const first = list.find((s) => s.kind === "head") || list[0];
    if (first) setTimeout(() => callouts.push({ seg: first, kind: "NEW", t0: clock, ttl: 11, title: b.title }), 1300);
  }

  // Advance everything by dt seconds.
  function step(dt) {
    clock += dt; intro = Math.min(1, intro + dt / 2.2);
    for (const k of ["x0", "x1", "dim"]) V[k] = ease(V[k], T[k], 3, dt);
    aim(dt);
    for (const b of bands) {                                             // unwind + glow the band pointed at or being read
      const on = b.file === focusFile || b === hoverBand;
      b.unwind = ease(b.unwind, on ? 2.5 : 1, 4, dt); b.glow = ease(b.glow, on ? 1 : 0, 5, dt);
    }
    stack();
    if (!still) for (const r of rings) { r.phase += r.turn * (1 + r.boost * 6) * dt; r.boost = ease(r.boost, 0, .6, dt); }
    for (const s of segs) {
      if (s.tc != null) { const g = clamp((clock - s.tc) / GROW); s.grow = g * g * (3 - 2 * g); if (g >= 1) s.tc = null; }   // smoothstep, as the original
      const floor = s.band.pink || 0;
      if (s.red > floor && s.grow >= 1) s.red = Math.max(floor, s.red - dt / 18);                                            // "just written" fades over ~18 s, down to its resting pink
      const t = clock - s.litAt; s.lit = t < 0 ? 0 : Math.min(1, t / .18) * Math.exp(-t / 4.2);                             // quick flash, slow fade
    }
    if (!still && clock > nextRead && bands.length && T.dim > .3) { const s = pickPassage(); if (s) read(s); nextRead = clock + (phone ? 3.2 : 1.6) + Math.random() * 2.2; }
    for (let i = callouts.length - 1; i >= 0; i--) if (clock - callouts[i].t0 > callouts[i].ttl) callouts.splice(i, 1);
    probe.x = ease(probe.x || probe.tx, probe.tx, 1.8, dt); probe.y = ease(probe.y || probe.ty, probe.ty, 1.8, dt); probe.on = ease(probe.on, 0, .25, dt);
  }

  /* ============================================================================================= 4. DRAWING: RINGS */
  // Arcs are drawn in batches. All the arcs on one ring that look alike (same colour, dash and thickness) go into the
  // same few paths, and each pass of the neon tube is ONE stroke for the whole batch instead of one per arc. Each arc
  // is split at the ring's widest points: the near half (angles 0..π, the front) goes in the "front" path, the far half
  // (π..2π, seen through the tower) in the "back" path, which is drawn much fainter.
  function addArc(front, back, cx, cy, rx, ry, a, b) {
    for (let s = a; s < b - 1e-4;) {
      const k = Math.floor(s / Math.PI + 1e-6), e = Math.min(b, (k + 1) * Math.PI), p = ((k % 2) + 2) % 2 === 0 ? front : back;
      p.moveTo(cx + rx * Math.cos(s), cy + ry * Math.sin(s)); p.ellipse(cx, cy, rx, ry, 0, s, e); s = e;
    }
  }
  function strokeBoth(paths, width, near, far) {                         // one pass over a batch: front, then back
    c.lineWidth = width;
    if (near > .015) { c.globalAlpha = near; c.stroke(paths[0]); }
    if (far > .015) { c.globalAlpha = far; c.stroke(paths[1]); }        // fainter than that can't be seen: skip it
  }
  // An arc's two colour strings (tube and pale core), worked out only when its look changes (read flash, hover glow,
  // "just written" fade), in 1/20 steps. ck is the key of the look they were worked out for.
  function segColour(s, b) {
    const key = ((s.lit * 20) | 0) * 441 + ((b.glow * 20) | 0) * 21 + ((s.red * 20) | 0);
    if (s.ck !== key) {
      const col = mix(mix(mix(b.col, COL.crimson, s.red * (1 - b.glow)), b.kind === "quest" ? QUEST_HOT : b.plant ? LEAF_HOT : PINK, b.glow * .9), COL.cream, s.lit * WHITE);
      s.ck = key; s.cTube = rgb(col); s.cCore = rgb(mix(col, COL.cream, .7 * WHITE));
    }
  }
  const RING_LIGHT = .42;                                                 // the rings' brightness at rest (was .6): the one dial for "too bright"
  const WHITE = .45;                                                      // how much white light the rings carry: the pale core, read flashes, index tabs (was 1)
  const DASH = { photo: [4, 4], veiled: [7, 5], rule: [1, 5] };          // dashed kinds (in screen pixels)
  function drawRings() {
    c.lineCap = "round";
    const tips = [], cards = [];
    for (const r of rings) {
      const b = r.band, reveal = clamp(intro * 1.8 - r.y * .8);          // the opening sweep: top rings first
      const show = V.dim * b.fade * reveal; if (show < .01) continue;
      const { cy, tilt } = ringAt(r.y), rx = r.r * V.R * spread(b) * (still ? 1 : .55 + .45 * reveal), ry = rx * tilt;
      // 1. sort this ring's visible arcs into batches of arcs that look alike
      const batches = new Map();
      for (const s of r.segs) {
        if (s.grow <= 0) continue;                                       // not started growing yet
        segColour(s, b);
        const heat = Math.max(s.lit, b.glow * .45), dash = DASH[s.kind] || null, lw = (s.kind === "head" ? 2.4 : r.heavy ? 2 : 1.15) * S * (1 + heat * .5);
        const key = s.ck + "|" + s.kind + "|" + (lw * 10 | 0);
        let g = batches.get(key);
        if (!g) batches.set(key, (g = { s, heat, dash, lw, main: [new Path2D(), new Path2D()], line1: [new Path2D(), new Path2D()], line2: [new Path2D(), new Path2D()] }));
        const a = s.a0 + r.phase, end = a + s.len * s.grow;
        addArc(g.main[0], g.main[1], V.cx, cy, rx, ry, a, end);
        addArc(g.line1[0], g.line1[1], V.cx, cy + 2.2 * S, rx * .995, ry, a, end);              // two faint lines just under it, so packed
        if (end - a > .06) addArc(g.line2[0], g.line2[1], V.cx, cy + 4.4 * S, rx * .99, ry, a + .03, end - .03);   // rings merge into the film's striated drum
        if (s.grow < 1) tips.push({ s, b, end, show });                  // drawn after, so they sit on top
        if (!still && (s.kind === "photo" || s.kind === "head" || s.lit > .3)) cards.push({ s, a: a + s.len * s.grow / 2, show });
      }
      // 2. stroke each batch: soft neon, the way a lit glass tube looks: wide faint halo, closer halo, tube, pale core.
      //    RING_LIGHT is how bright a ring is at rest; pointed at or being read (heat) it still rises to full.
      for (const g of batches.values()) {
        const near = show * (RING_LIGHT + (1 - RING_LIGHT) * g.heat), far = near * .26;
        c.strokeStyle = g.s.cTube;
        if (g.dash) c.setLineDash(g.dash.map((v) => v * S));
        strokeBoth(g.main, g.lw * 5, near * .15, far * .06);
        strokeBoth(g.main, g.lw * 2.4, near * .32, far * .12);
        strokeBoth(g.main, g.lw, Math.min(1, near * 1.05), far);
        c.strokeStyle = g.s.cCore; strokeBoth(g.main, Math.max(.6 * S, g.lw * .4), near * .55 * WHITE, far * .5 * WHITE);
        if (g.dash) c.setLineDash([]);
        c.strokeStyle = g.s.cTube; strokeBoth(g.line1, .8 * S, near * .34, far * .4); strokeBoth(g.line2, .8 * S, near * .14, far * .2);
      }
    }
    // the bright leading tip of each arc still being written, fading as it completes (the original's create glow)
    for (const { s, b, end, show } of tips) {
      const p = pointOn(s, end), k = 1 - s.grow, tip = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9 * S);
      tip.addColorStop(0, rgb(COL.cream, show)); tip.addColorStop(.3, rgb(b.kind === "quest" ? QUEST_GOLD : b.plant ? LEAF : COL.gold, .7 * show * k)); tip.addColorStop(1, rgb(COL.cream, 0));
      c.globalAlpha = 1; c.fillStyle = tip; c.fillRect(p.x - 9 * S, p.y - 9 * S, 18 * S, 18 * S);
    }
    // white cards standing on the near side of headings, photos and passages being read, like index tabs
    c.fillStyle = rgb(COL.cream);
    for (const { s, a, show } of cards) {
      const p = pointOn(s, a);
      if (p.front) { c.globalAlpha = show * WHITE * (s.kind === "photo" ? .8 : .45 + s.lit * .5); c.fillRect(p.x - 1.4 * S, p.y - 15 * S, 2.8 * S, 13 * S); }
    }
  }

  /* =========================================================================================== 5. DRAWING: CHAMBER */
  // A lattice of blue points circling the foot of the tower (two wavy strands), and seven lights on the floor.
  // Drawn twice: the back half before the rings, the front half after, so the tower stands inside it.
  // The front half is softer (FRONT_LIGHT) so it doesn't drown the tower's base. (The older code left this to
  // whatever transparency the last ring had used, which happened to be faint; this fixes it at a set value.)
  const FRONT_LIGHT = .12;
  function chamber(front) {
    c.globalAlpha = front ? FRONT_LIGHT : 1;
    const fade = V.dim * intro, { cy } = ringAt(1.06), R = V.R * 1.75, n = phone ? 90 : 170;
    c.fillStyle = rgb(COL.blue, (front ? .85 : .35) * fade);
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + clock * .01, sn = Math.sin(a); if ((sn > 0) !== front) continue;
      const x = V.cx + R * Math.cos(a), y = cy + R * .34 * sn;
      for (let strand = 0; strand < 2; strand++) c.fillRect(x - S, y + Math.sin(a * 9 + strand * Math.PI + clock * .3) * 5 * S - S, 1.8 * S, 1.8 * S);
    }
    const fy = ringAt(1.02).cy;
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU + .4, sn = Math.sin(a); if ((sn > 0) !== front) continue;
      const x = V.cx + V.R * 1.4 * Math.cos(a), y = fy + V.R * 1.4 * .34 * sn, r = (front ? 28 : 17) * S;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgb([236, 242, 255], fade)); g.addColorStop(.18, rgb([150, 180, 255], .9 * fade)); g.addColorStop(.45, rgb(COL.blue, .45 * fade)); g.addColorStop(1, rgb(COL.blue, 0));
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  // The probe: a little gimbal of three wire circles with two arrowheads (white and red) circling it, as in the film.
  function drawProbe() {
    if (probe.on <= .02 || still) return;
    c.globalAlpha = probe.on * V.dim; c.strokeStyle = rgb(COL.cream); c.lineWidth = .8 * S; const r = 7 * S;
    for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(probe.x, probe.y, r, r * Math.abs(Math.cos(clock * 1.3 + k * 1.05)), k * 1.05, 0, TAU); c.stroke(); }
    for (const [k, col] of [[0, COL.cream], [1, COL.crimson]]) {
      const a = clock * 1.6 + k * Math.PI, x = probe.x + Math.cos(a) * r * 2.4, y = probe.y + Math.sin(a) * r * .9;
      c.fillStyle = rgb(col); c.beginPath(); c.moveTo(x, y - 4 * S); c.lineTo(x + 3 * S, y + 3 * S); c.lineTo(x - 3 * S, y + 3 * S); c.fill();
    }
  }

  /* ============================================================================================ 6. DRAWING: BLOOM */
  // The glow: the picture (light only, on a clear canvas) shrunk to 1/4, then 1/10, then 1/26 of its size, each from
  // the last; shrinking blurs it. Each is stretched back over the picture and added: a close glow, a halo, a faint
  // wash. Because the dark background is laid in only afterwards, only the light glows.
  const GLOW = [[4, .55], [10, .4], [26, .22]];                           // [times smaller, strength]
  let glows = null;
  function glow() {
    if (!glows) glows = GLOW.map(() => document.createElement("canvas"));
    let from = cv;
    GLOW.forEach(([k], i) => {
      const g = glows[i], w = Math.max(1, Math.round(W / k)), h = Math.max(1, Math.round(H / k));
      if (g.width !== w || g.height !== h) { g.width = w; g.height = h; }
      const x = g.getContext("2d"); x.globalCompositeOperation = "copy"; x.imageSmoothingEnabled = true; x.drawImage(from, 0, 0, w, h); from = g;
    });
    c.globalCompositeOperation = "lighter"; c.imageSmoothingEnabled = true;
    GLOW.forEach(([, strength], i) => { c.globalAlpha = strength; c.drawImage(glows[i], 0, 0, W, H); });
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  }

  /* ========================================================================================== 7. DRAWING: SAYINGS */
  // Sayings from site/quotes.js stand in the dark beside the tower, one at a time, from a deck shuffled on every visit:
  // the English on the left, on a slant like the film's calligraphy walls, and the same saying in Cantonese on the
  // right in columns read top to bottom, right to left. Every HOLD seconds the next one fades in. On a phone there is
  // room for one place only, under the tower: the English, then the Cantonese. They sway a little and are drawn after
  // the bloom, so the letters stay sharp.
  const deck = (window.HL_QUOTES || []).filter((q) => q && q.text).sort(() => Math.random() - .5);
  let dealt = 0, saying = null, sayAt = 0;
  let reserved = 0;      // how much of the right edge the Cantonese takes this frame (callouts keep out of it)
  let blocked = null;    // the stretch of the left side the English takes this frame { y0, y1 } (callouts step around it)
  const HOLD = 18, FADE = 2.4, INK = "rgb(226,214,255)", INK_ALPHA = .5;
  const fade = (age, hold) => clamp(age / FADE) * clamp((hold - age) / FADE);
  function wrap(text, width) {                                           // break text into lines that fit the width
    const lines = []; let line = "";
    for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (line && c.measureText(t).width > width) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function english(q, x, y, w, size, align, alpha, t) {                  // returns how tall it came out
    c.save(); c.translate(x + Math.sin(t * .21) * 8 * S, y + Math.sin(t * .16) * 5 * S); c.transform(1, -.07 + Math.sin(t * .09) * .02, -.16, 1, 0, 0);
    c.textAlign = align; c.textBaseline = "alphabetic"; c.fillStyle = INK; c.globalAlpha = alpha;
    c.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
    const lines = wrap("“" + q.text + "”", w), lh = size * 1.22;
    lines.forEach((line, j) => c.fillText(line, still ? 0 : Math.sin(t * .6 + j * 1.7) * 1.6 * S, j * lh));
    if (q.from) { c.font = MONO(Math.max(9 * S, size * .42)); c.globalAlpha = alpha * .7; c.fillText(("— " + q.from).toUpperCase(), 0, lines.length * lh + size * .25); }
    c.restore();
    return lines.length * lh + (q.from ? size * .8 : 0);
  }
  function cantonese(q, right, top, height, size, alpha, t) {
    const chars = [...q.yue], per = Math.max(4, Math.floor(height / (size * 1.12)));
    c.save(); c.textAlign = "center"; c.textBaseline = "top"; c.fillStyle = INK; c.globalAlpha = alpha;
    c.font = `500 ${size}px "Noto Serif TC", "Songti TC", "PMingLiU", "Noto Serif CJK TC", serif`;
    for (let k = 0; k * per < chars.length; k++) {
      const x = right - size * .5 - k * size * 1.45 + Math.sin(t * .19 + 1.3 + k * .9) * 3 * S, y0 = top + k * size * .5 + Math.sin(t * .14 + 1.3 + k * 1.3) * 4 * S;
      chars.slice(k * per, (k + 1) * per).forEach((ch, j) => c.fillText(ch, x, y0 + j * size * 1.12));
    }
    c.restore();
  }
  function sayings() {
    reserved = 0; blocked = null;
    const show = clamp((V.dim - .6) / .35) * intro; if (show < .01 || !deck.length) return;   // only on the home page
    if (!saying || clock - sayAt > HOLD) { saying = deck[dealt++ % deck.length]; sayAt = clock; }
    const age = clock - sayAt, t = still ? 0 : clock, gap = 32 * S;
    c.globalCompositeOperation = "source-over";
    if (phone) {                                                         // phone: one line under the tower, English for half the time, then Cantonese
      const half = saying.yue ? HOLD / 2 : HOLD, cant = saying.yue && age > half, a = show * fade(cant ? age - half : age, half) * .55;
      if (a < .01) return;
      // the saying's foot stays put just above the RECORD panel; longer sayings grow upward into the room left for them
      const foot = H - 214 * S, size = 15 * S, w = W - 44 * S;
      if (!cant) { c.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`; const n = wrap("“" + saying.text + "”", w).length;
        english(saying, W / 2, foot - (n - 1) * size * 1.22 - (saying.from ? size * .8 : 0), w, size, "center", a, t); return; }
      c.save(); c.textAlign = "center"; c.fillStyle = INK; c.globalAlpha = a; c.font = `500 ${17 * S}px "Noto Serif TC", "Songti TC", serif`;
      const per = Math.floor((W - 44 * S) / (17 * S * 1.05)), ch = [...saying.yue], rows = Math.ceil(ch.length / per);
      for (let k = 0; k < rows; k++) c.fillText(ch.slice(k * per, (k + 1) * per).join(""), W / 2 + Math.sin(t * .2 + k) * 3 * S, foot - (rows - 1 - k) * 17 * S * 1.5);
      c.restore(); return;
    }
    const a = show * fade(age, HOLD) * INK_ALPHA; if (a < .01) return;
    const lx = V.x0 * W + 40 * S, lw = Math.min(400 * S, (V.cx - V.R * 1.25 - gap) - lx);
    if (lw > 150 * S) {
      const y = V.top + V.h * .22, size = Math.min(26 * S, Math.max(17 * S, lw / 15)), tall = english(saying, lx, y, lw, size, "left", a, t);
      blocked = { y0: y - size - lw * .08 - 14 * S, y1: y + tall + 18 * S };   // the slant lifts the far end of each line a little
    }
    const rr = V.x1 * W - 44 * S, rl = V.cx + V.R * 1.3 + gap;
    if (saying.yue && rr - rl > 90 * S) {
      const size = Math.min(26 * S, Math.max(18 * S, V.h / 22)), cols = Math.ceil([...saying.yue].length / Math.max(4, Math.floor(V.h * .62 / (size * 1.12))));
      if (cols * size * 1.45 < rr - rl) { cantonese(saying, rr, V.top + V.h * .1, V.h * .62, size, a, t); reserved = W - rr + cols * size * 1.45 + 20 * S; }
    }
  }

  /* ========================================================================================= 8. DRAWING: CALLOUTS */
  // A leader line from the arc being read out to a label beside the tower: the passage, then its tag and post.
  // Labels keep off each other, off the English saying (left), the Cantonese (right) and the readout (bottom right).
  const measure = (t, px) => { c.font = MONO(px); return c.measureText(t).width; };
  const tagColour = (kind) => (kind === "NEW" ? COL.crimson : kind === "VIEW" ? COL.blue : COL.cream);
  const coAlpha = (co) => { const age = clock - co.t0; return clamp(age / .3) * clamp((co.ttl - age) / 1.4) * clamp((V.dim - .25) * 2); };
  const coPoint = (co) => pointOn(co.seg, co.seg.a0 + co.seg.len / 2 + co.seg.ring.phase);
  function labels() {
    if (V.dim < .25 || !callouts.length || phone) return;                // a phone has no room for callouts: the tower speaks for itself
    const fs = 12 * S, gapY = fs * 3.1, room = {
      l: Math.min(300 * S, (V.cx - V.R * 1.15 - 20 * S) - (V.x0 * W + 16 * S)),
      r: Math.min(300 * S, (V.x1 * W - 16 * S - reserved) - (V.cx + V.R * 1.15 + 20 * S)) };
    const lowest = { l: H - 130 * S, r: H - 215 * S };             // the right side stays clear of the RECORD panel
    const placed = { l: [], r: [] };
    for (const co of callouts) { const p = coPoint(co), side = p.x < V.cx ? "l" : "r"; placed[side].push({ co, p, alpha: coAlpha(co), y: clamp(p.y - 10 * S, 40 * S, lowest[side]) }); }
    c.textBaseline = "alphabetic"; c.globalCompositeOperation = "source-over";
    for (const side of ["l", "r"]) {
      const colW = room[side]; if (colW < 120 * S) continue;
      const list = placed[side];
      const inBlock = (y) => side === "l" && blocked && y + fs * 2 > blocked.y0 && y - fs < blocked.y1;
      for (const L of list) if (inBlock(L.y)) L.y = blocked.y1 + fs * 1.2 <= lowest.l ? blocked.y1 + fs * 1.2 : Math.max(40 * S, blocked.y0 - fs * 2.4);
      list.sort((a, b) => a.y - b.y);
      for (let i = 1; i < list.length; i++) { list[i].y = Math.max(list[i].y, list[i - 1].y + gapY); if (inBlock(list[i].y)) list[i].y = Math.max(blocked.y1 + fs * 1.2, list[i - 1].y + gapY); }
      for (let i = list.length - 2; i >= 0; i--) if (list[i + 1].y > lowest[side]) { list[i + 1].y = lowest[side]; list[i].y = Math.min(list[i].y, list[i + 1].y - gapY); }
      const edge = side === "l" ? V.cx - V.R * 1.15 - 20 * S : V.cx + V.R * 1.15 + 20 * S, dir = side === "l" ? -1 : 1;
      const chars = Math.max(10, Math.floor(colW / (fs * .62)));
      for (const L of list) {
        const s = L.co.seg, line1 = clip(L.co.title || s.text, chars), line2 = clip(`${s.chars ? s.chars + " ch  " : ""}${s.band.title}`, chars - 6), tag = L.co.kind + "  ";
        c.globalAlpha = L.alpha;
        c.strokeStyle = rgb(COL.gold, .7); c.lineWidth = .8 * S; c.beginPath(); c.moveTo(L.p.x, L.p.y); c.lineTo(edge, L.y + 4 * S);
        c.lineTo(edge + dir * Math.min(colW, measure(line1, fs) + 4 * S), L.y + 4 * S); c.stroke();
        c.fillStyle = rgb(COL.cream); c.beginPath(); c.arc(L.p.x, L.p.y, 1.8 * S, 0, TAU); c.fill();
        const tx = edge + dir * 2 * S; c.textAlign = side === "l" ? "right" : "left";
        c.font = MONO(fs); c.fillStyle = "#fff"; c.fillText(line1, tx, L.y);
        const tw = measure(tag, fs * .78), lw2 = measure(line2, fs * .78), y2 = L.y + fs * 1.45;   // measure() leaves the small font set
        if (side === "l") { c.fillStyle = "rgba(255,255,255,.72)"; c.fillText(line2, tx, y2); c.fillStyle = rgb(tagColour(L.co.kind)); c.fillText(tag, tx - lw2, y2); }
        else { c.fillStyle = rgb(tagColour(L.co.kind)); c.fillText(tag, tx, y2); c.fillStyle = "rgba(255,255,255,.72)"; c.fillText(line2, tx + tw, y2); }
      }
    }
    c.globalAlpha = 1;
  }
  /* ========================================================================================== 9. ONE WHOLE FRAME */
  let chamberCols = ["#170c28", "#0c0716", "#05030a"];   // read from --chamber-1..3 in blog.css (a theme there changes them here)
  function paint() {
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = "lighter";                              // light adds up, like the film's overexposed glow
    chamber(false);
    c.globalAlpha = .08 * V.dim * intro; c.fillStyle = rgb(COL.cream); c.fillRect(V.cx - .5 * S, V.top - 18 * S, S, V.h + 30 * S);   // the axis
    c.globalAlpha = .9 * V.dim * intro; c.fillRect(V.cx - 1.2 * S, V.top - 22 * S, 2.4 * S, 12 * S);                                  // and its tick at the top
    drawRings();
    chamber(true);
    drawProbe();
    glow();
    const bg = c.createRadialGradient(V.cx, H * .55, 0, V.cx, H * .55, Math.max(W, H) * .7);
    bg.addColorStop(0, chamberCols[0]); bg.addColorStop(.5, chamberCols[1]); bg.addColorStop(1, chamberCols[2]);
    c.globalCompositeOperation = "destination-over"; c.fillStyle = bg; c.fillRect(0, 0, W, H);   // the dark goes in behind the light
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    sayings(); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    labels();
  }

  /* ========================================================================================= 10. POINTING AT IT */
  // Which band is under the pointer: the nearest ring line within 22 px, or failing that a band whose span holds it.
  function bandAt(px, py) {
    px *= S; py *= S; if (Math.abs(px - V.cx) > V.R * 1.5) return null;
    let best = null, d = 22 * S;
    for (const r of rings) { const dy = Math.abs(ringAt(r.y).cy - py); if (dy < d) { d = dy; best = r.band; } }
    if (!best) for (const b of bands) if (py >= ringAt(b.y0).cy - 6 * S && py <= ringAt(b.y1).cy + 6 * S) best = b;
    return best;
  }
  // The card beside a band pointed at: a post's entry number, title, date; a quest's state, title, dates or month.
  let pin = null;
  const shortDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  function showPin(b) {
    if (!pin) { pin = document.createElement("a"); pin.className = "pin"; document.body.appendChild(pin); }
    if (!b) { pin.classList.remove("on"); return; }
    pin.classList.toggle("quest", b.kind === "quest"); pin.classList.toggle("plant", !!b.plant);
    if (b.kind === "quest") {
      const q = b.quest;
      pin.href = "#/quest/" + encodeURIComponent(q.id);
      pin.innerHTML = `<span class="pk">QUEST · ${q.over ? "COMPLETED" : "TO COME"}</span><span class="pt"></span><span class="pd"></span><span class="po">${coarse ? "Tap" : "Click"} to read ▸</span>`;
      pin.querySelector(".pd").textContent = q.over ? shortDate(q.date) + (q.end && q.end !== q.date ? " – " + shortDate(q.end) : "") : q.month;
    } else {
      pin.href = "#/post/" + encodeURIComponent(b.file);
      pin.innerHTML = `<span class="pk">${b.plant ? "PLANTS · " : ""}ENTRY ${b.entry} · ${b.words.toLocaleString()} WORDS</span><span class="pt"></span><span class="pd">${shortDate(b.date)}</span><span class="po">${coarse ? "Tap" : "Click"} to open ▸</span>`;
    }
    pin.querySelector(".pt").textContent = b.title;
    const mid = ringAt((b.y0 + b.y1) / 2).cy / S, right = (V.cx + V.R * 1.25) / S, w = 230;
    // beside the tower if there's room; while reading (the tower in its narrow strip) over the tower
    const x = T.dim < .9 ? V.cx / S - w / 2 : right + w + 16 < V.x1 * W / S ? right + 10 : Math.max(8, (V.cx - V.R * 1.25) / S - w - 10);
    pin.style.left = Math.min(x, innerWidth - w - 8) + "px"; pin.style.top = clamp(mid - 40, 70, innerHeight - 140) + "px";
    pin.classList.add("on");
  }
  function hover(b) { if (b === hoverBand) return; hoverBand = b; showPin(b); cv.style.cursor = b ? "pointer" : ""; poke(); }
  function hook() {
    cv.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") hover(bandAt(e.offsetX, e.offsetY)); });
    cv.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") hover(null); });
    cv.addEventListener("click", (e) => {
      const b = bandAt(e.offsetX, e.offsetY);
      if (!b || (coarse && b !== hoverBand)) return hover(b);            // phone: the first tap chooses, the second opens
      if (b.kind === "post") onOpen(b.file); else location.hash = "#/quest/" + encodeURIComponent(b.quest.id);
    });
    addEventListener("hashchange", () => hover(null));
  }

  /* ============================================================================================== 11. RUNNING */
  function size() {
    if (!cv) return;
    // On a phone the address bar slides away as the page scrolls, which counts as the window resizing. Rebuilding the
    // canvas for that mid-scroll causes stutter, so a change of height alone (under 160 px) is ignored there; the
    // canvas is simply stretched that little bit by the page's CSS until a real resize (or turning the phone).
    if (W && phone && Math.round(innerWidth * S) === W && Math.abs(innerHeight * S - H) < 160 * S) return;
    const css = getComputedStyle(document.documentElement);
    chamberCols = chamberCols.map((v, i) => css.getPropertyValue("--chamber-" + (i + 1)).trim() || v);
    S = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.75);            // canvas pixels per screen pixel (capped, for speed)
    W = Math.round(innerWidth * S); H = Math.round(innerHeight * S); phone = innerWidth <= 860;
    cv.width = W; cv.height = H; c = cv.getContext("2d");
    aim(null); poke();
  }
  // The frame loop. poke() makes sure it is running (it stops itself when there is nothing to animate in still mode).
  let last = 0, raf = 0, frame = 0, stillUntil = 0, scrolledAt = -1e9;
  const poke = () => { stillUntil = performance.now() + 1500; if (!raf && cv) raf = requestAnimationFrame(tick); };
  function tick(now) {
    raf = 0; if (document.hidden) return;                                // asleep while the tab is hidden
    const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    frame++;
    const every = T.dim < .3 ? 4 : now - scrolledAt < 200 ? 3 : coarse ? 2 : 1;   // dimmed: 1 in 4; scrolling: 1 in 3; phone: 1 in 2
    step(dt);
    if (T.dim === 0 && V.dim < .01) { paint(); return; }                 // switched off (a phone reading a page): one last clear frame, then sleep until view() wakes it
    if (frame % every === 0) paint();
    if (!still || now < stillUntil) raf = requestAnimationFrame(tick);
  }
  addEventListener("scroll", () => { scrolledAt = performance.now(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { last = 0; if (!document.hidden) poke(); });
  let resized = 0; addEventListener("resize", () => { clearTimeout(resized); resized = setTimeout(size, 150); });

  /* ======================================================================================= 12. WHAT THE PAGE USES */
  window.Tower = {
    start(canvas, posts, opts = {}) {
      cv = canvas; onOpen = opts.onOpen || onOpen; build(posts || [], opts.quests || []); stack(); size(); hook(); writeIn();
      if (still) { intro = 1; for (const s of segs) { s.grow = 1; s.tc = null; } setInterval(poke, 4000); }   // still, but the sayings change
      if (document.fonts) document.fonts.ready.then(poke);
      poke();
    },
    // The calendar answered after the tower started: rebuild with the quests, keeping every post arc exactly as it was
    // (mid-animation included), every ring's spin, and every callout; the gold grows in from now.
    quests(posts, list) {
      const key = (s) => s.band.file + "|" + s.a0, keep = new Map(segs.map((s) => [key(s), s]));
      const ringKey = (r) => r.band.file + "|" + r.band.rings.indexOf(r), phases = new Map(rings.map((r) => [ringKey(r), r.phase]));
      questAt = clock + .1; build(posts || [], list || []);
      for (const s of segs) { const old = keep.get(key(s)); if (old && s.band.kind === "post") Object.assign(s, { grow: old.grow, tc: old.tc, red: old.red, lit: old.lit, litAt: old.litAt }); }
      for (const r of rings) { const ph = phases.get(ringKey(r)); if (ph != null) r.phase = ph; }
      const fresh = new Map(segs.map((s) => [key(s), s]));
      for (const co of callouts) co.seg = fresh.get(key(co.seg)) || co.seg;
      if (still) for (const s of segs) { s.grow = 1; s.tc = null; }
      hoverBand = null; stack(); poke();
    },
    view(v = {}) {
      if (v.x0 === T.x0 && v.x1 === T.x1 && v.dim === T.dim && v.focus === focusFile) return;   // nothing changed: don't wake it
      if (v.x0 != null) T.x0 = v.x0; if (v.x1 != null) T.x1 = v.x1; if (v.dim != null) T.dim = v.dim;
      if ("focus" in v) focusFile = v.focus;
      if (!cv) { V.x0 = T.x0; V.x1 = T.x1; V.dim = T.dim; }
      poke();
    },
    stats() { return { posts: bands.length, rings: rings.length, arcs: segs.length }; }
  };
})();
