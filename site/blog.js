/* HALF LIFE: how the page works.
   1. The sky: a painting made fresh on every visit, stroke by stroke, on the canvas at the top (paintSky): a dying
      red sun low over San Francisco (the Golden Gate, Coit Tower, the Transamerica Pyramid, the Salesforce Tower,
      Sutro Tower), a wanderer on the near ridge, embers rising. Gold ink lines draw themselves across it (filigree).
   2. The words: posts.json (made from the editor's files by scripts/build-index.mjs) is read once, then the address
      after # picks the page: #/ the journal, #/post/<file> one post, #/photos, #/about.
   3. The photographs open in a viewer that can be stepped through with the arrow keys or a swipe. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ------------------------------------------------------------------ the painting ---------------------------- */
  // A small repeatable dice and a smooth noise, so the strokes follow currents rather than scatter.
  function dice(seed) { let s = seed >>> 0 || 1; return () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (s | 1) ^ (s + (s ^ (s >>> 7)) * (s | 61))) >>> 0) / 4294967296); }
  function noise(rnd) {
    const p = new Uint8Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = rnd(); }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const at = (x, y) => v[p[(p[x & 255] + y) & 255]], s = (t) => t * t * (3 - 2 * t);
    const n = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = s(x - X), w = s(y - Y);
      return (at(X, Y) * (1 - u) + at(X + 1, Y) * u) * (1 - w) + (at(X, Y + 1) * (1 - u) + at(X + 1, Y + 1) * u) * w; };
    return (x, y) => n(x, y) * .5 + n(x * 2.03, y * 2.03) * .25 + n(x * 4.1, y * 4.1) * .125 + n(x * 8.3, y * 8.3) * .0625;
  }
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // Frazetta's sky, from the top down: violet-black, wine, oxblood, ember, molten gold at the horizon.
  const SKY = [[0, [18, 11, 20]], [.28, [44, 18, 30]], [.5, [98, 26, 24]], [.68, [176, 64, 28]], [.8, [228, 146, 68]], [.86, [246, 196, 112]]];
  const skyAt = (t) => { for (let i = 1; i < SKY.length; i++) if (t <= SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (t - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0])); return SKY[SKY.length - 1][1]; };
  const INK = [11, 7, 6], FAR = [46, 18, 16], CLOUD = [26, 11, 20], LIT = [255, 204, 120], RIM = [190, 74, 34];

  function paintSky(cv, seed, bare) {   // bare: only the sky and its sun, for the small plates
    const W = cv.width, H = cv.height, c = cv.getContext("2d"), rnd = dice(seed), nz = noise(rnd);
    const u = Math.min(W, H * 1.75) / 100;             // one unit of the city: keeps the landmarks in proportion
    const hy = H * (bare ? .97 : .83), sun = bare ? { x: W * (.25 + rnd() * .5), y: H * (.55 + rnd() * .3), r: u * (14 + rnd() * 10) } : { x: W * .53, y: hy - u * 10, r: u * 16 };
    // the ground of the sky
    const g = c.createLinearGradient(0, 0, 0, hy);
    SKY.forEach(([t, col]) => g.addColorStop(Math.min(1, t / .86), rgb(col)));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // the sun, huge and tired, with its glow
    let r = c.createRadialGradient(sun.x, sun.y, sun.r * .2, sun.x, sun.y, sun.r * 4.2);
    r.addColorStop(0, "rgba(255,214,140,.55)"); r.addColorStop(.35, "rgba(222,98,40,.28)"); r.addColorStop(1, "rgba(120,24,20,0)");
    c.fillStyle = r; c.fillRect(0, 0, W, H);
    r = c.createRadialGradient(sun.x - sun.r * .25, sun.y - sun.r * .3, sun.r * .1, sun.x, sun.y, sun.r);
    r.addColorStop(0, "#ffe2a4"); r.addColorStop(.55, "#f08a3a"); r.addColorStop(.9, "#b8361c"); r.addColorStop(1, "rgba(150,30,20,.0)");
    c.fillStyle = r; c.beginPath(); c.arc(sun.x, sun.y, sun.r, 0, 7); c.fill();
    // the clouds, in two passes: broad soft masses first, then thousands of short loaded strokes along the currents
    c.lineCap = "round";
    const cloudAt = (x, y) => {
      const t = y / hy, d = nz(x / (u * 26), y / (u * 7)), dens = Math.max(0, (d - .45) * 2.8) * (1 - Math.pow(t, 6) * .85);
      const toSun = Math.hypot(x - sun.x, (y - sun.y) * 1.5) / (u * 55), glow = Math.max(0, 1 - toSun);
      const lift = nz(x / (u * 26) + .04, y / (u * 7) + .09) - d;            // which way the cloud faces: towards the light or away
      let col = skyAt(t * .86);
      col = mix(col, CLOUD, Math.min(.92, dens * (1.15 - glow * .7) * (1.2 - t * .5)));
      if (lift < 0) col = mix(col, glow > .25 ? LIT : RIM, Math.min(.9, -lift * 7 * (.25 + glow * 1.2) * (.4 + dens)));
      return { col, dens, glow };
    };
    for (let i = 0, n = Math.round(W * hy / 2600); i < n; i++) {
      const x = rnd() * W, y = rnd() * hy, { col, dens } = cloudAt(x, y), len = u * (6 + rnd() * 14), wdt = u * (2 + rnd() * 3.5) * (.6 + dens);
      c.strokeStyle = rgb(col, .18 + rnd() * .2); c.lineWidth = wdt;
      const ang = (nz(x / (u * 40), y / (u * 40)) - .5) * .7;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(ang) * len * .5, y - wdt * .3, x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke();
    }
    for (let i = 0, n = Math.round(W * hy / 85); i < n; i++) {
      const x = rnd() * W * 1.1 - W * .05, y = Math.pow(rnd(), .8) * hy * 1.01, { col: base, dens } = cloudAt(x, y);
      const col = base.map((v) => v + (rnd() - .5) * 20);
      const ang = (nz(x / (u * 40), y / (u * 40)) - .5) * 1.1 + (rnd() - .5) * .25, len = u * (.8 + rnd() * 3.2) * (1 + dens * 1.4);
      const wdt = u * (.12 + rnd() * .45) * (1 + dens);
      c.strokeStyle = rgb(col, .35 + rnd() * .5); c.lineWidth = wdt;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(ang) * len * .5, y + Math.sin(ang) * len * .5 - wdt * .6, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      c.stroke();
    }
    // the sun again, burning through: its disc, then a few dark cloud bars drawn across it
    r = c.createRadialGradient(sun.x, sun.y, sun.r * .9, sun.x, sun.y, sun.r * 2.6);
    r.addColorStop(0, "rgba(255,190,110,.45)"); r.addColorStop(1, "rgba(220,90,40,0)");
    c.fillStyle = r; c.beginPath(); c.arc(sun.x, sun.y, sun.r * 2.6, 0, 7); c.fill();
    r = c.createRadialGradient(sun.x - sun.r * .2, sun.y - sun.r * .25, sun.r * .05, sun.x, sun.y, sun.r);
    r.addColorStop(0, "rgba(255,240,196,.97)"); r.addColorStop(.5, "rgba(250,170,84,.94)"); r.addColorStop(.92, "rgba(206,72,30,.9)"); r.addColorStop(1, "rgba(160,40,22,0)");
    c.fillStyle = r; c.beginPath(); c.arc(sun.x, sun.y, sun.r, 0, 7); c.fill();
    for (let i = 0; i < 7; i++) {
      const y = sun.y + (rnd() - .35) * sun.r * 1.5, x = sun.x + (rnd() - .5) * sun.r, len = sun.r * (1.2 + rnd() * 1.8);
      c.strokeStyle = `rgba(${90 + rnd() * 40 | 0},${24 + rnd() * 20 | 0},${24 + rnd() * 16 | 0},${.35 + rnd() * .35})`; c.lineWidth = u * (.25 + rnd() * .7);
      c.beginPath(); c.moveTo(x - len / 2, y); c.quadraticCurveTo(x, y - u * .6, x + len / 2, y + u * (rnd() - .5) * .8); c.stroke();
    }
    // a few long gold streaks across the sun, as in old oils
    for (let i = 0; i < 14; i++) {
      const y = sun.y + (rnd() - .55) * sun.r * 1.6, x = sun.x + (rnd() - .5) * sun.r * 3, len = u * (8 + rnd() * 20);
      c.strokeStyle = `rgba(255,${190 + rnd() * 40 | 0},120,${.12 + rnd() * .25})`; c.lineWidth = u * (.2 + rnd() * .5);
      c.beginPath(); c.moveTo(x - len / 2, y); c.quadraticCurveTo(x, y - u * rnd(), x + len / 2, y + u * (rnd() - .5)); c.stroke();
    }
    if (!bare) city(c, W, H, u, hy, sun, rnd);
    return { sun, hy, u };
  }

  // San Francisco, ruined and black against the light.
  function city(c, W, H, u, hy, sun, rnd) {
    const fill = rgb(INK);
    // the bay, between the city and the near shore, holding the sun's reflection
    const bay = c.createLinearGradient(0, hy, 0, H);
    bay.addColorStop(0, "#7a2a16"); bay.addColorStop(.12, "#4a1a12"); bay.addColorStop(.5, "#1c0c09"); bay.addColorStop(1, "#0a0605");
    c.fillStyle = bay; c.fillRect(0, hy, W, H - hy);
    for (let i = 0; i < 520; i++) {
      const y = hy + Math.pow(rnd(), 1.6) * (H - hy) * .7, spread = (y - hy) / (H - hy) * u * 18 + u * 2;
      const x = sun.x + (rnd() - .5) * spread * 2, len = u * (.6 + rnd() * 3.2) * (1 - (y - hy) / (H - hy) * .5);
      c.strokeStyle = `rgba(255,${150 + rnd() * 80 | 0},90,${(.55 - (y - hy) / (H - hy)) * (.4 + rnd() * .6)})`; c.lineWidth = u * (.08 + rnd() * .18);
      c.beginPath(); c.moveTo(x - len / 2, y); c.lineTo(x + len / 2, y); c.stroke();
    }
    // a far row of towers, paler with distance, then the near blocks of the city, broken at the tops
    c.fillStyle = rgb(FAR, .9); c.beginPath(); c.moveTo(W * .26, hy);
    for (let x = W * .26; x < W * 1.02;) { const w = u * (1 + rnd() * 2), h = u * (4 + Math.pow(rnd(), 1.5) * 11) * (x > W * .78 ? .6 : 1); c.lineTo(x, hy - h); c.lineTo(x + w * (.3 + rnd() * .4), hy - h - u * rnd() * 1.5); c.lineTo(x + w, hy - h * (.8 + rnd() * .2)); x += w; }
    c.lineTo(W * 1.02, hy); c.fill();
    c.fillStyle = fill; c.beginPath(); c.moveTo(W * .27, hy + u * .4);
    let x = W * .27;
    while (x < W * 1.02) {
      const w = u * (1.2 + rnd() * 2.6), h = u * (1.5 + Math.pow(rnd(), 2) * 7) * (x > W * .78 ? .7 : 1);
      const broken = rnd() < .45;
      c.lineTo(x, hy - h); if (broken) { c.lineTo(x + w * .35, hy - h - u * rnd() * 1.2); c.lineTo(x + w * .55, hy - h + u * .6); }
      c.lineTo(x + w, hy - h + (broken ? u * rnd() : 0)); c.lineTo(x + w, hy - h * .4 * rnd());
      x += w + u * rnd() * .4;
    }
    c.lineTo(W * 1.02, hy + u); c.lineTo(W * .27, hy + u); c.fill();
    // Telegraph Hill and Coit Tower
    const cx = W * .37; c.beginPath(); c.moveTo(cx - u * 9, hy); c.quadraticCurveTo(cx, hy - u * 11, cx + u * 9, hy); c.fill();
    c.fillRect(cx - u * .7, hy - u * 13.5, u * 1.4, u * 6.5); c.fillRect(cx - u * .95, hy - u * 13.7, u * 1.9, u * .7);
    // the Transamerica Pyramid, standing in the sun
    const tx = sun.x - u * 2.5; c.beginPath(); c.moveTo(tx - u * 2.6, hy); c.lineTo(tx, hy - u * 25); c.lineTo(tx + u * 2.6, hy);
    c.moveTo(tx - u * 1.7, hy - u * 9); c.lineTo(tx - u * 2.5, hy - u * 9.4); c.lineTo(tx - u * 1.6, hy - u * 13); c.closePath();
    c.moveTo(tx + u * 1.7, hy - u * 9); c.lineTo(tx + u * 2.5, hy - u * 9.4); c.lineTo(tx + u * 1.6, hy - u * 13); c.closePath(); c.fill();
    // the Salesforce Tower, its crown broken off
    const sx = W * .64, sw = u * 2.3, sh = u * 23; c.beginPath(); c.moveTo(sx - sw, hy);
    c.lineTo(sx - sw, hy - sh * .78); c.quadraticCurveTo(sx - sw, hy - sh, sx - sw * .2, hy - sh * 1.02); c.lineTo(sx + sw * .05, hy - sh * .93);
    c.lineTo(sx + sw * .35, hy - sh * .97); c.lineTo(sx + sw * .6, hy - sh * .86); c.quadraticCurveTo(sx + sw, hy - sh * .84, sx + sw, hy - sh * .7); c.lineTo(sx + sw, hy); c.fill();
    // Sutro Tower on its hill
    const ux = W * .87, ub = hy - u * 6; c.beginPath(); c.moveTo(ux - u * 14, hy); c.quadraticCurveTo(ux, hy - u * 13, ux + u * 16, hy); c.fill();
    c.strokeStyle = fill; c.lineWidth = u * .32; c.beginPath();
    [[-2.6, -1.4], [0, 0], [2.6, -1.4]].forEach(([dx, top]) => { c.moveTo(ux + dx * .35, ub); c.lineTo(ux + dx, ub - u * (17 + top)); });
    [9, 13, 16.2].forEach((h, i) => { c.moveTo(ux - 2.6 * u * (h / 17), ub - u * h + (i === 2 ? u * .4 : 0)); c.lineTo(ux + 2.6 * u * (h / 17), ub - u * h + (i === 2 ? u * .4 : 0)); });
    c.stroke();
    // the Golden Gate, its middle fallen into the water
    const g1 = W * .055, g2 = W * .215, gt = hy - u * 19, deck = hy - u * 5.5;
    c.lineWidth = u * .42;
    [g1, g2].forEach((gx) => {
      c.beginPath(); c.moveTo(gx - u * 1.15, hy + u); c.lineTo(gx - u * .85, gt); c.lineTo(gx - u * .45, gt); c.lineTo(gx - u * .6, hy + u); c.fill();
      c.beginPath(); c.moveTo(gx + u * 1.15, hy + u); c.lineTo(gx + u * .85, gt); c.lineTo(gx + u * .45, gt); c.lineTo(gx + u * .6, hy + u); c.fill();
      for (let k = 0; k < 4; k++) c.fillRect(gx - u * .95, gt + u * (.4 + k * k * 1.15), u * 1.9, u * .32);
    });
    c.beginPath(); c.moveTo(g1 - u * 8, deck + u * .5); c.lineTo(g1 + (g2 - g1) * .38, deck); c.moveTo(g1 + (g2 - g1) * .6, deck + u * .3); c.lineTo(g2 + u * 8, deck + u * .5); c.stroke();
    c.lineWidth = u * .14; c.beginPath();
    c.moveTo(g1, gt); c.quadraticCurveTo(g1 + (g2 - g1) * .25, deck - u * 2, g1 + (g2 - g1) * .38, deck - u * .3); c.lineTo(g1 + (g2 - g1) * .41, deck + u * 3);   /* the cable, snapped and hanging */
    c.moveTo(g2, gt); c.quadraticCurveTo(g2 - (g2 - g1) * .25, deck - u * 2, g1 + (g2 - g1) * .6, deck); c.lineTo(g1 + (g2 - g1) * .57, deck + u * 2.4);
    c.moveTo(g1, gt); c.quadraticCurveTo(g1 - u * 5, deck - u, g1 - u * 9, deck + u * .5); c.moveTo(g2, gt); c.quadraticCurveTo(g2 + u * 5, deck - u, g2 + u * 9, deck + u * .5);
    c.stroke();
    // rim light where the sun catches the edges, laid on as short warm strokes along the skyline's top
    c.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 600; i++) {
      const px = W * .25 + rnd() * W * .8, py = hy - rnd() * u * 26, dx = px - sun.x;
      c.strokeStyle = `rgba(${200 + rnd() * 55 | 0},${80 + rnd() * 60 | 0},40,${Math.max(0, .22 - Math.abs(dx) / (W * 2.2))})`; c.lineWidth = u * .18;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px - Math.sign(dx) * u * .7, py + u * .2); c.stroke();
    }
    c.globalCompositeOperation = "source-over";
    // the near ridge, and a wanderer upon it with a staff
    const ridge = () => { c.beginPath(); c.moveTo(-10, H + 4); c.lineTo(-10, H - u * 10);
      c.bezierCurveTo(W * .08, H - u * 14, W * .16, H - u * 10.5, W * .26, H - u * 6); c.bezierCurveTo(W * .34, H - u * 3, W * .4, H - u * 1.4, W * .48, H + 4); c.closePath(); };
    c.save(); c.translate(u * .25, -u * .3); c.fillStyle = "rgba(214,110,50,.55)"; ridge(); c.fill(); c.restore();   /* the sun along the ridge's edge */
    c.fillStyle = "#070504"; ridge(); c.fill();
    const wx = W * .135, wy = H - u * 12.15, s = u * 1.05;
    c.save(); c.translate(s * .18, -s * .2); c.fillStyle = "rgba(214,110,50,.6)";
    c.beginPath(); c.moveTo(wx - s * 1.5, wy); c.lineTo(wx - s * .55, wy - s * 4.6); c.quadraticCurveTo(wx, wy - s * 6.2, wx + s * .6, wy - s * 4.5); c.lineTo(wx + s * 1.7, wy); c.fill(); c.restore();
    c.fillStyle = "#070504";
    c.beginPath(); c.moveTo(wx - s * 1.5, wy); c.lineTo(wx - s * .55, wy - s * 4.6); c.quadraticCurveTo(wx, wy - s * 6.2, wx + s * .6, wy - s * 4.5); c.lineTo(wx + s * 1.7, wy); c.fill();
    c.strokeStyle = "#070504"; c.lineWidth = s * .35; c.beginPath(); c.moveTo(wx + s * 1.9, wy + s * .3); c.lineTo(wx + s * 2.5, wy - s * 7.2); c.stroke();
    const orb = c.createRadialGradient(wx + s * 2.55, wy - s * 7.6, 0, wx + s * 2.55, wy - s * 7.6, s * 1.4);
    orb.addColorStop(0, "rgba(244,234,255,.95)"); orb.addColorStop(.25, "rgba(185,140,255,.7)"); orb.addColorStop(1, "rgba(106,58,208,0)");
    c.fillStyle = orb; c.beginPath(); c.arc(wx + s * 2.55, wy - s * 7.6, s * 1.4, 0, 7); c.fill();   /* the stone of his staff, glowing faintly */
  }

  // Embers drifting up from the city, over a still copy of the painting.
  const sky = $("#sky");
  let art = null, motes = [], running = false, frame = 0, seen = true;
  function setSky() {
    const box = sky.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 1.6), W = Math.round(box.width * k), H = Math.round(box.height * k);
    if (!W || !H || (art && Math.abs(art.width - W) < 40 && Math.abs(art.height - H) < 40)) return;
    art = document.createElement("canvas"); art.width = W; art.height = H;
    const at = paintSky(art, (Math.random() * 2 ** 31) | 0);
    sky.width = W; sky.height = H; sky.getContext("2d").drawImage(art, 0, 0);
    motes = Array.from({ length: Math.round(W / 22) }, () => mote(W, H, at, true));
    sky.dataset.u = at.u;
    filigree(W / k, H / k);
    if (!still && !running) { running = true; requestAnimationFrame(tick); }
  }
  function mote(W, H, at, anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : at.hy + Math.random() * at.u * 6, v: .25 + Math.random() * .7, r: .6 + Math.random() * 1.8, ph: Math.random() * 6.3, life: 1, hy: at.hy, u: at.u };
  }
  function tick() {
    if (!sky.isConnected) { running = false; return; }
    requestAnimationFrame(tick);
    if (document.hidden || !seen || (frame++ & 1)) return;      // about thirty frames a second, and only while it can be seen
    const c = sky.getContext("2d"), W = sky.width, H = sky.height, k = W / 1000;
    c.globalCompositeOperation = "source-over"; c.drawImage(art, 0, 0);
    c.globalCompositeOperation = "lighter";
    motes.forEach((m, i) => {
      m.y -= m.v * k * 1.6; m.ph += .04; m.x += Math.sin(m.ph) * .5 * k; m.life -= .0016;
      if (m.y < H * .05 || m.life <= 0) motes[i] = mote(W, H, { hy: m.hy, u: m.u }, false);
      const a = Math.max(0, Math.min(1, m.life)) * (.45 + .4 * Math.sin(m.ph * 2.3));
      c.fillStyle = `rgba(255,${150 + (m.r * 30 | 0)},80,${a})`; c.beginPath(); c.arc(m.x, m.y, m.r * k * 1.4, 0, 7); c.fill();
    });
    c.globalCompositeOperation = "source-over";
  }
  new IntersectionObserver((e) => { seen = e[0].isIntersecting; }).observe(sky);

  // Amano's gold: a few long flowing lines that end in curls, drawn across the sky as if by a slow pen.
  function filigree(W, H) {
    const svg = $("#filigree"), ns = "http://www.w3.org/2000/svg", rnd = dice((Math.random() * 2 ** 31) | 0);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("preserveAspectRatio", "none"); svg.textContent = "";
    svg.insertAdjacentHTML("afterbegin", '<defs><linearGradient id="gilt" x1="0" x2="1"><stop offset="0" stop-color="#8a5a22" stop-opacity="0"/><stop offset=".2" stop-color="#d6a24c"/><stop offset=".55" stop-color="#fff1cc"/><stop offset=".85" stop-color="#d6a24c"/><stop offset="1" stop-color="#8a5a22" stop-opacity="0"/></linearGradient></defs>');
    const bands = W < 700 ? [.07, .5, .58] : [.06, .11, .48, .55, .62], lines = bands.length;   // above the title and below the motto, never across them
    for (let k = 0; k < lines; k++) {
      const pts = [], base = H * (bands[k] + rnd() * .03), A = H * (.012 + rnd() * .022), f = (.5 + rnd() * .7) * Math.PI * 2 / W, ph = rnd() * 6.3;
      const curlAt = k % 2 ? 2 : .15 + rnd() * .7, B = H * .008 * rnd(), f2 = f * (2.1 + rnd());
      for (let x = -60, i = 0; x <= W + 60; x += 10, i++) {
        const y = base + A * Math.sin(x * f + ph) + B * Math.sin(x * f2 + ph * 1.7);
        pts.push([x, y]);
        if (Math.abs(x - W * curlAt) < 7) {                    // a curl, as Amano ends a line: round and inward
          const turn = base < H * .3 ? 1 : -1, R = H * (.022 + rnd() * .018), cx0 = x, cy0 = y - turn * R;
          for (let t = 0; t < Math.PI * 3.4; t += .22) { const rr = R * Math.exp(-t * .17); pts.push([cx0 + Math.sin(t) * rr * 1.1, cy0 + turn * Math.cos(t) * rr]); }
          pts.push([x + 14, y]);
        }
      }
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; d += ` Q${x1.toFixed(1)} ${y1.toFixed(1)} ${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2).toFixed(1)}`; }
      const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); if (k % 2) p.setAttribute("class", "fine"); svg.appendChild(p);
      if (!still) {
        const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.getBoundingClientRect(); p.style.transition = `stroke-dashoffset ${5 + k * .8}s cubic-bezier(.45,.05,.3,1) ${.3 + k * .5}s`; p.style.strokeDashoffset = 0;
      }
    }
  }
  let resized = 0;
  addEventListener("resize", () => { clearTimeout(resized); resized = setTimeout(() => { setSky(); if (typeof minis === "function") minis(); }, 250); });

  /* ------------------------------------------------------------------ the words ------------------------------- */
  // Markdown, as the editor writes it, made into HTML: paragraphs, headings, quotes, lists, photos, links, emphasis.
  const safeUrl = (u) => (/^(https?:|mailto:|\/|#|\.\/)/i.test(u) ? u : "#");
  function inline(s) {
    return esc(s)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${safeUrl(u)}"${/^https?:/.test(u) ? ' rel="noopener" target="_blank"' : ""}>${t}</a>`)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => `<strong>${a || b}</strong>`)
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)|(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, (m, p1, a, p2, b) => `${p1 || p2 || ""}<em>${a || b}</em>`)
      .replace(/ {2,}\n|\\\n/g, "<br>");
  }
  function markdown(src) {
    const blocks = String(src || "").replace(/\r/g, "").split(/\n{2,}/), out = [];
    for (let b of blocks) {
      b = b.replace(/^\n+|\s+$/g, ""); if (!b) continue;
      if (/^(\*\s*\*\s*\*|-{3,}|_{3,})$/.test(b.trim())) { out.push('<hr class="fleuron">'); continue; }
      const h = /^(#{1,4})\s+(.*)$/.exec(b); if (h) { const n = Math.min(3, h[1].length + 1); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
      if (/^>/.test(b)) { out.push(`<blockquote>${markdown(b.replace(/^> ?/gm, ""))}</blockquote>`); continue; }
      if (/^([-*+]|\d+\.)\s/.test(b)) {
        const ordered = /^\d+\./.test(b), items = b.split(/\n(?=(?:[-*+]|\d+\.)\s)/).map((li) => `<li>${inline(li.replace(/^([-*+]|\d+\.)\s+/, ""))}</li>`);
        out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`); continue;
      }
      const pic = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/.exec(b.trim());
      if (pic) { const cap = pic[3] || pic[1]; out.push(`<figure><img src="${esc(safeUrl(pic[2]))}" alt="${esc(pic[1])}" loading="lazy">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`); continue; }
      out.push(`<p>${inline(b)}</p>`);
    }
    return out.join("\n");
  }
  const plain = (src) => String(src || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
  const lede = (src, words = 46) => { const w = plain(src).split(" "); return w.slice(0, words).join(" ") + (w.length > words ? "…" : ""); };
  const when = (iso) => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
  const roman = (n) => { let s = ""; for (const [v, r] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { s += r; n -= v; } return s; };
  // the smaller copies made for each photo (scripts/make-thumbs.sh): thumbs/ for grids, large/ for viewing
  const sized = (src, dir) => (/^\/photos\//.test(src) ? "/" + dir + src.slice(7) + ".jpg" : src);
  const imgTag = (src, alt, dir, extra = "") => `<img src="${esc(sized(src, dir))}" data-full="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${extra} onerror="if(this.src!==this.dataset.full)this.src=this.dataset.full">`;

  const RULE = '<svg class="rule" viewBox="0 0 280 22" aria-hidden="true"><path d="M2 11 H118 M162 11 H278 M140 2 C 128 2, 124 20, 140 20 C 156 20, 152 2, 140 2 M118 11 C 124 6, 130 6, 134 11 M162 11 C 156 16, 150 16, 146 11"/></svg>';
  const CORNER = (k) => `<svg class="corner ${k}" viewBox="0 0 46 46" aria-hidden="true"><path d="M2 44 V14 C2 6, 6 2, 14 2 H44 M8 44 V18 C8 12, 12 8, 18 8 H44 M14 22 C 14 16, 22 14, 22 20 C 22 24, 17 24, 17 21"/></svg>`;
  const ARROW = '<svg viewBox="0 0 54 14" aria-hidden="true"><path d="M1 7 C 14 1, 26 13, 40 7 H52 M46 2 L52 7 L46 12"/></svg>';

  let DATA = { posts: [], albums: [], about: "" };
  const main = $("#main"), hero = $("#hero"), HOME_HERO = hero.innerHTML;

  function setHero(html, home) {
    document.body.classList.toggle("home", !!home);
    hero.innerHTML = html;
    requestAnimationFrame(setSky);
  }
  function nav(route) { document.querySelectorAll(".nav [data-route]").forEach((a) => (a.dataset.route === route ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"))); }
  function reveal() {
    const items = main.querySelectorAll(".reveal");
    if (still || !("IntersectionObserver" in window)) { items.forEach((x) => x.classList.add("seen")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach((x) => io.observe(x));
  }

  function showJournal() {
    setHero(HOME_HERO, true); nav("journal"); document.title = "Half Life";
    const n = DATA.posts.length;
    main.innerHTML = `<div class="section-head reveal"><span class="label">The Journal</span><h2>Accounts, in no particular order of importance</h2>${RULE}</div>
      <div class="plates">${DATA.posts.map((p, i) => `
        <article class="plate reveal">
          <a class="plate-art" href="#/post/${esc(p.file)}" aria-label="${esc(p.title)}">
            <span class="frame">${p.cover ? imgTag(p.cover, "", "large") : `<canvas class="mini" data-seed="${esc(p.file)}"></canvas><span class="numeral">${roman(n - i)}</span>`}</span>
            ${CORNER("tl")}${CORNER("tr")}${CORNER("bl")}${CORNER("br")}
          </a>
          <div class="plate-text">
            <span class="label">${roman(n - i)} &middot; ${esc(when(p.date))}</span>
            <h2><a href="#/post/${esc(p.file)}">${esc(p.title)}</a></h2>
            <p class="lede">${esc(lede(p.body))}</p>
            <a class="more" href="#/post/${esc(p.file)}">Read on ${ARROW}</a>
          </div>
        </article>`).join("") || '<p class="empty">Nothing is written here yet.</p>'}</div>`;
    minis(); reveal();
  }

  // a small painted sky for each post without a photograph: the same post always gets the same sky
  const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  function minis() {
    main.querySelectorAll("canvas.mini").forEach((cv) => {
      const r = cv.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = Math.max(200, Math.round(r.width * k)); cv.height = Math.max(160, Math.round(r.height * k));
      paintSky(cv, hash(cv.dataset.seed), true);
    });
  }

  function showPost(file) {
    const i = DATA.posts.findIndex((p) => p.file === file), p = DATA.posts[i];
    if (!p) { location.replace("#/"); return; }
    const n = DATA.posts.length;
    setHero(`<p class="kicker">Entry ${roman(n - i)}</p><h1 class="posttitle">${esc(p.title)}</h1><p class="when">${esc(when(p.date))}</p>`, false);
    nav("journal"); document.title = p.title + " · Half Life";
    const body = markdown(p.body), coverInBody = p.cover && p.body.includes(p.cover);
    const newer = DATA.posts[i - 1], older = DATA.posts[i + 1];
    main.innerHTML = `<article class="post">
        ${p.cover && !coverInBody ? `<figure class="cover">${imgTag(p.cover, "", "large")}</figure>` : ""}
        <div class="prose">${body}</div>
      </article>
      <nav class="postnav" aria-label="More entries">
        ${older ? `<a class="prev" href="#/post/${esc(older.file)}"><span class="label">&larr; Earlier</span><span class="t">${esc(older.title)}</span></a>` : "<span></span>"}
        ${newer ? `<a class="next" href="#/post/${esc(newer.file)}"><span class="label">Later &rarr;</span><span class="t">${esc(newer.title)}</span></a>` : ""}
      </nav>`;
    const pics = [...main.querySelectorAll(".prose figure img, .cover img")];
    pics.forEach((im, k) => { im.style.cursor = "zoom-in"; im.addEventListener("click", () => view(pics.map((x) => ({ src: x.dataset.full || x.getAttribute("src"), caption: x.closest("figure")?.querySelector("figcaption")?.textContent || "" })), k)); });
  }

  // every photograph on the site: the albums first, then those in posts
  function allPhotos() {
    const seen = new Set(), list = [];
    const add = (src, caption, from) => { if (src && !seen.has(src)) { seen.add(src); list.push({ src, caption, from }); } };
    DATA.albums.forEach((a) => a.photos.forEach((src) => add(src, (a.captions.find((c) => c.photo === src) || {}).caption || "", a.title)));
    DATA.posts.forEach((p) => { if (p.cover) add(p.cover, "", p.title); for (const m of p.body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)) add(m[2], m[3] || m[1], p.title); });
    return list;
  }
  function showPhotos() {
    setHero('<p class="kicker">The Collection</p><h1 class="posttitle">Photographs</h1><p class="when">What the light allowed</p>', false);
    nav("photos"); document.title = "Photographs · Half Life";
    const all = allPhotos();
    main.innerHTML = `<div class="section-head reveal"><span class="label">${all.length} ${all.length === 1 ? "plate" : "plates"}</span>${RULE}</div>
      <div class="gallery">${all.map((ph, k) => `<button type="button" class="reveal" data-k="${k}" aria-label="${esc(ph.caption || "Open photograph " + (k + 1))}">${imgTag(ph.src, ph.caption, "thumbs")}</button>`).join("") || '<p class="empty">The plates are still drying.</p>'}</div>`;
    main.querySelectorAll(".gallery button").forEach((b) => b.addEventListener("click", () => view(all, +b.dataset.k)));
    reveal();
  }

  function showAbout() {
    setHero('<p class="kicker">On the name</p><h1 class="posttitle">About</h1><p class="when">Chris, of San Francisco</p>', false);
    nav("about"); document.title = "About · Half Life";
    main.innerHTML = `<article class="about prose-about">${markdown(DATA.about) || '<p class="empty">To be written.</p>'}</article>`;
  }

  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (/^\d{4}-\d{2}-\d{2}-/.test(h)) { location.replace("#/post/" + h); return; }   // links from the old site
    const [what, arg] = h.split("/");
    if (what === "post" && arg) showPost(arg); else if (what === "photos") showPhotos(); else if (what === "about") showAbout(); else showJournal();
    if (what) scrollTo({ top: 0, behavior: "instant" });
    progress();
  }
  addEventListener("hashchange", route);

  /* ------------------------------------------------------------------ the viewer ------------------------------ */
  const viewer = $("#viewer"), vimg = $("img", viewer), vcap = $("figcaption", viewer);
  let vlist = [], vk = 0, back = null;
  function view(list, k) { vlist = list; back = document.activeElement; viewer.hidden = false; viewer.classList.toggle("single", list.length < 2); document.body.style.overflow = "hidden"; show(k); $(".vclose", viewer).focus(); }
  function show(k) { vk = (k + vlist.length) % vlist.length; const p = vlist[vk]; vimg.src = sized(p.src, "large"); vimg.onerror = () => { if (vimg.src.indexOf(p.src) < 0) vimg.src = p.src; }; vimg.alt = p.caption || ""; vcap.textContent = p.caption || p.from || ""; }
  function close() { viewer.hidden = true; vimg.removeAttribute("src"); document.body.style.overflow = ""; if (back) back.focus(); }
  $(".vclose", viewer).addEventListener("click", close);
  $(".vprev", viewer).addEventListener("click", () => show(vk - 1));
  $(".vnext", viewer).addEventListener("click", () => show(vk + 1));
  viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.tagName === "FIGURE") close(); });
  addEventListener("keydown", (e) => { if (viewer.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(vk - 1); if (e.key === "ArrowRight") show(vk + 1); });
  let x0 = null;
  viewer.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(vk + (dx < 0 ? 1 : -1)); x0 = null; });

  /* ------------------------------------------------------------------ the reading line ------------------------ */
  const bar = $("#progress");
  function progress() { const post = $(".post"); if (!post) { bar.style.width = 0; return; } const r = post.getBoundingClientRect(), total = r.height - innerHeight * .6; bar.style.width = Math.max(0, Math.min(1, -r.top / Math.max(1, total))) * 100 + "%"; }
  addEventListener("scroll", progress, { passive: true });

  /* ------------------------------------------------------------------ begin ----------------------------------- */
  setSky();
  fetch("/posts.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    DATA = { posts: Array.isArray(d.posts) ? d.posts : [], albums: Array.isArray(d.albums) ? d.albums : [], about: d.about || "" };
    DATA.albums.forEach((a) => { a.photos = Array.isArray(a.photos) ? a.photos : []; a.captions = Array.isArray(a.captions) ? a.captions : []; });
    DATA.posts.forEach((p) => { p.body = p.body || ""; p.cover = p.cover || ""; });
    route();
  }).catch(() => { main.innerHTML = '<p class="empty">The pages could not be fetched. Try again in a moment.</p>'; });
})();
