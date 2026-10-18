/* HALF LIFE: how the page works.
   1. The world: behind every page, the last dusk of the Dying Earth over Saint Frane, painted by paintWorld afresh
      on each visit; motes drift across it and the old sun now and then gutters.
   2. The words: posts.json (made from the editor's files by scripts/build-index.mjs) is read once, then the address
      after # picks the page: #/ the poster, #/posts, #/post/<file> (one post), #/photos,
      #/about. The side menu leads to each, as an old game's menu would (see "the menu" below).
   3. The portraits on the poster (PORTRAITS) take turns: a different one first on each visit, then a slow
      crossfade every few seconds. If none will load, a sketch stands in.
   4. The photographs open in a viewer that can be stepped through with the arrow keys or a swipe. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ------------------------------------------------------------------ the world ----------------------------- */
  // Behind every page, the last dusk of the world, painted fresh on each visit: a sky gone deep blue above and rose
  // at the rim, a vast dim sun the colour of old wine, spotted and guttering, sinking over the broken spires of Saint
  // Frane and its seven hills, veils of violet haze between them, and motes adrift in the failing light.
  function dice(seed) { let s = seed >>> 0 || 1; return () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (s | 1) ^ (s + (s ^ (s >>> 7)) * (s | 61))) >>> 0) / 4294967296); }
  function noise(rnd) {
    const p = new Uint8Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = rnd(); }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const at = (x, y) => v[p[(p[x & 255] + y) & 255]], sm = (t) => t * t * (3 - 2 * t);
    const n = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = sm(x - X), w = sm(y - Y);
      return (at(X, Y) * (1 - u) + at(X + 1, Y) * u) * (1 - w) + (at(X, Y + 1) * (1 - u) + at(X + 1, Y + 1) * u) * w; };
    return (x, y) => n(x, y) * .55 + n(x * 2.1, y * 2.1) * .3 + n(x * 4.3, y * 4.3) * .15;
  }
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const SKY = [[0, [10, 12, 32]], [.35, [30, 26, 66]], [.58, [74, 42, 92]], [.76, [150, 70, 96]], [.88, [206, 112, 104]], [1, [226, 150, 118]]];
  const skyAt = (t) => { for (let i = 1; i < SKY.length; i++) if (t <= SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (t - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0])); return SKY[SKY.length - 1][1]; };
  function paintWorld(cv, seed) {
    const W = cv.width, H = cv.height, c = cv.getContext("2d"), rnd = dice(seed), nz = noise(rnd);
    const u = Math.max(W, H * 1.4) / 100, hz = H * .7;             // u: one unit of the scene; hz: the far shore
    const sun = { x: W * (.58 + rnd() * .16), y: hz - u * 6.5, r: u * 15 };
    let g = c.createLinearGradient(0, 0, 0, hz); SKY.forEach(([t, col]) => g.addColorStop(t, rgb(col))); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0, n = Math.round(W * H / 2600); i < n; i++) {     // the stars, which no longer quite go out by day
      const y = Math.pow(rnd(), 1.8) * hz * .75; c.fillStyle = `rgba(232,226,255,${(.12 + rnd() * .55) * (1 - y / (hz * .75))})`; const z = rnd() < .08 ? 2 : 1; c.fillRect(rnd() * W, y, z, z);
    }
    // the sky laid on in strokes, as paint is, following slow currents
    c.lineCap = "round";
    for (let i = 0, n = Math.round(W * hz / 900); i < n; i++) {
      const x = rnd() * W, y = rnd() * hz, t = y / hz, d = nz(x / (u * 28), y / (u * 7)), lit = Math.max(0, 1 - Math.hypot(x - sun.x, (y - sun.y) * 1.6) / (u * 60));
      let col = skyAt(t); if (d > .5) col = mix(col, [40, 22, 56], Math.min(.7, (d - .5) * 3) * (1 - lit)); col = mix(col, [240, 160, 140], lit * lit * .5);
      col = col.map((v) => v + (rnd() - .5) * 14);
      const len = u * (1 + rnd() * 5) * (1 + (d > .5 ? 1.5 : 0)), ang = (nz(x / (u * 50), y / (u * 50)) - .5) * .5;
      c.strokeStyle = rgb(col, .18 + rnd() * .3); c.lineWidth = u * (.15 + rnd() * .6);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(ang) * len / 2, y - u * .2, x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke();
    }
    // the sun's breath on the sky, then the sun: huge, dim, wine and ember, spotted with soft dark blots
    g = c.createRadialGradient(sun.x, sun.y, sun.r * .6, sun.x, sun.y, sun.r * 4.5); g.addColorStop(0, "rgba(246,140,108,.5)"); g.addColorStop(.35, "rgba(196,80,100,.22)"); g.addColorStop(1, "rgba(90,30,80,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(sun.x - sun.r * .2, sun.y - sun.r * .28, sun.r * .05, sun.x, sun.y, sun.r);
    g.addColorStop(0, "#ffc39a"); g.addColorStop(.45, "#ec7a62"); g.addColorStop(.85, "#b13f50"); g.addColorStop(1, "rgba(150,44,70,0)");
    c.fillStyle = g; c.beginPath(); c.arc(sun.x, sun.y, sun.r, 0, 7); c.fill();
    for (let i = 0; i < 4; i++) {
      const a = rnd() * 6.3, d = Math.sqrt(rnd()) * sun.r * .7, sx = sun.x + Math.cos(a) * d, sy = sun.y + Math.sin(a) * d, sr = sun.r * (.04 + rnd() * .07);
      g = c.createRadialGradient(sx, sy, 0, sx, sy, sr); g.addColorStop(0, "rgba(120,36,52,.3)"); g.addColorStop(1, "rgba(120,36,52,0)"); c.fillStyle = g; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
    for (let i = 0; i < 9; i++) {                                    // thin cloud bars drawn across the sun's face
      const y = sun.y + (rnd() - .3) * sun.r * 1.4, len = sun.r * (.5 + rnd() * 1.1), x = sun.x + (rnd() - .5) * sun.r * 1.3 - len / 2;
      c.strokeStyle = `rgba(${70 + rnd() * 40 | 0},${28 + rnd() * 20 | 0},${60 + rnd() * 20 | 0},${.25 + rnd() * .35})`; c.lineWidth = u * (.15 + rnd() * .45);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y - u * (.3 + rnd() * .5), x + len, y + u * (rnd() - .5) * .8); c.stroke();
    }
    // the far shore: a low line of towers and domes, pale with distance
    const ridge = (x, base, amp, off) => base - (nz(x / (u * 20) + off, off) - .3) * amp;
    const towers = (col, base, amp, off, count, scale, lamps) => {
      c.fillStyle = rgb(col);
      for (let i = 0; i < count; i++) {
        const x = rnd() * W, gnd = ridge(x, base, amp, off), w = u * (.25 + rnd() * .7) * scale, h = u * (1.5 + Math.pow(rnd(), 2) * 9) * scale, kind = rnd();
        c.beginPath(); c.moveTo(x - w, gnd + u); c.lineTo(x - w, gnd - h);
        if (kind < .3) { c.lineTo(x, gnd - h - w * 3.2); c.lineTo(x + w, gnd - h); }                         /* a spire */
        else if (kind < .55) { c.arc(x, gnd - h, w, Math.PI, 0); }                                          /* a dome */
        else { c.lineTo(x - w * .2, gnd - h - u * rnd() * 1.2 * scale); c.lineTo(x + w * .4, gnd - h + u * .5 * scale); c.lineTo(x + w, gnd - h * (.8 + rnd() * .15)); }   /* broken */
        c.lineTo(x + w, gnd + u); c.fill();
        if (lamps && rnd() < .3) { c.fillStyle = `rgba(255,196,150,${.35 + rnd() * .45})`; c.fillRect(x - w * .25, gnd - h * (.25 + rnd() * .5), Math.max(1, u * .12), Math.max(1, u * .16)); c.fillStyle = rgb(col); }
      }
    };
    c.fillStyle = rgb([92, 58, 104]); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += u * .5) c.lineTo(x, ridge(x, hz, u * 4, 1)); c.lineTo(W, H); c.fill();
    towers([92, 58, 104], hz + u * .5, u * 4, 1, Math.round(W / (u * 2.2)), .55, false);
    // the Grey Water, holding the sun
    const sea = hz + u * 1.5;
    g = c.createLinearGradient(0, sea, 0, H); g.addColorStop(0, "#5a3456"); g.addColorStop(.3, "#2e1c3a"); g.addColorStop(1, "#110b1a"); c.fillStyle = g; c.fillRect(0, sea, W, H - sea);
    for (let i = 0; i < 420; i++) {
      const y = sea + Math.pow(rnd(), 1.5) * (H - sea) * .8, k = (y - sea) / (H - sea), spread = u * (3 + k * 22);
      const x = sun.x + (rnd() - .5) * spread * 2, len = u * (.5 + rnd() * 3) * (1 - k * .5);
      c.strokeStyle = `rgba(255,${150 + rnd() * 60 | 0},${120 + rnd() * 40 | 0},${(.6 - k) * (.3 + rnd() * .6)})`; c.lineWidth = Math.max(1, u * (.06 + rnd() * .12));
      c.beginPath(); c.moveTo(x - len / 2, y); c.lineTo(x + len / 2, y); c.stroke();
    }
    g = c.createLinearGradient(0, hz - u * 4, 0, sea + u * 3); g.addColorStop(0, "rgba(200,130,160,0)"); g.addColorStop(.7, "rgba(200,130,160,.22)"); g.addColorStop(1, "rgba(200,130,160,0)");
    c.fillStyle = g; c.fillRect(0, hz - u * 4, W, u * 8.5);         /* the haze that lies along the water */
    // the near hills of Saint Frane at either hand, the bay open between them
    [[[48, 30, 66], 1.1, 7, 3], [[18, 12, 28], 1.6, 13, 5]].forEach(([col, scale, rise, off], L) => {
      const edge = (x) => Math.pow(Math.abs(x / W - .5) * 2, 1.6);
      const top = (x) => H - (u * rise * (.35 + edge(x)) + (nz(x / (u * 16) + off, off) - .3) * u * 6) * (L ? 1 : .9) - (L ? 0 : u * 3);
      c.fillStyle = rgb(col); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += u * .5) c.lineTo(x, top(x)); c.lineTo(W, H); c.fill();
      c.fillStyle = rgb(col);
      for (let i = 0, n = L ? 9 : 14; i < n; i++) {
        let x = rnd() * W; if (Math.abs(x / W - .5) < .22) x = rnd() < .5 ? x * .45 : W - (W - x) * .45;   /* keep the bay clear */
        const gnd = top(x), w = u * (.4 + rnd() * .9) * scale, h = u * (2 + Math.pow(rnd(), 1.6) * 8) * scale, kind = rnd();
        c.beginPath(); c.moveTo(x - w, gnd + u * 2); c.lineTo(x - w, gnd - h);
        if (kind < .35) { c.lineTo(x, gnd - h - w * 3); c.lineTo(x + w, gnd - h); } else if (kind < .55) c.arc(x, gnd - h, w, Math.PI, 0);
        else { c.lineTo(x - w * .2, gnd - h - u * rnd()); c.lineTo(x + w * .3, gnd - h + u * .6); c.lineTo(x + w, gnd - h * (.82 + rnd() * .1)); }
        c.lineTo(x + w, gnd + u * 2); c.fill();
        if (L === 0 && rnd() < .4) { c.fillStyle = `rgba(255,196,150,${.4 + rnd() * .4})`; c.fillRect(x - w * .2, gnd - h * (.3 + rnd() * .4), Math.max(1, u * .14), Math.max(1, u * .2)); c.fillStyle = rgb(col); }
      }
      // rim light: where the sun catches the tops of the near hills
      c.strokeStyle = L ? "rgba(230,130,120,.18)" : "rgba(230,140,130,.25)"; c.lineWidth = Math.max(1, u * .12);
      c.beginPath(); for (let x = 0; x <= W; x += u * .5) { const y = top(x); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    });
    // a fine grain over all, so it reads as paint rather than glass
    const img = c.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(img, 0, 0);
    return sun;
  }
  // The painting is kept, and motes drift over a copy of it; now and then the sun gutters like a lamp short of oil.
  const world = $("#leaf"); let art = null, motes = [], sunAt = null, worldSize = "", frame = 0, gutter = 0, nextGutter = 0;
  function setWorld() {
    const k = Math.min(devicePixelRatio || 1, 1.5), W = Math.round(innerWidth * k), H = Math.round(innerHeight * k);
    if (worldSize === W + "x" + H) return; worldSize = W + "x" + H;
    art = document.createElement("canvas"); art.width = W; art.height = H; sunAt = paintWorld(art, (Math.random() * 2 ** 31) | 0);
    world.width = W; world.height = H; world.getContext("2d").drawImage(art, 0, 0);
    motes = Array.from({ length: Math.round(W / 26) }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .1 + Math.random() * .35, r: .5 + Math.random() * 1.6, p: Math.random() * 6.3 }));
    nextGutter = frame + 600 + Math.random() * 1200;
  }
  function drift() {
    requestAnimationFrame(drift); if (document.hidden || (frame++ & 1) || !art) return;
    const c = world.getContext("2d"), W = world.width, H = world.height, k = W / 1400;
    c.globalCompositeOperation = "source-over"; c.drawImage(art, 0, 0);
    if (frame > nextGutter) { gutter = 90; nextGutter = frame + 1400 + Math.random() * 2400; }
    if (gutter > 0) { const dim = Math.abs(Math.sin(gutter-- / 90 * Math.PI * 3)) * .45; c.fillStyle = `rgba(10,6,20,${dim * Math.sin(gutter / 90 * Math.PI)})`; c.fillRect(0, 0, W, H); }
    c.globalCompositeOperation = "lighter";
    for (const m of motes) {
      m.y -= m.v * k; m.p += .02; m.x += Math.sin(m.p) * .3 * k; if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
      c.fillStyle = `rgba(255,200,180,${.15 + .35 * (.5 + .5 * Math.sin(m.p * 2))})`; c.beginPath(); c.arc(m.x, m.y, m.r * k * 1.3, 0, 7); c.fill();
    }
    c.globalCompositeOperation = "source-over";
  }
  let resized = 0;
  addEventListener("resize", () => { clearTimeout(resized); resized = setTimeout(setWorld, 250); });

  /* ------------------------------------------------------------------ the portrait ---------------------------- */
  // Should no portrait load, a small painting of the dying sun keeps the frame.
  function sketch(cv) {
    const r = cv.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(r.width * k); cv.height = Math.round(r.height * k); paintWorld(cv, 7);
  }

  /* ------------------------------------------------------------------ the words ------------------------------- */
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
  const lede = (src, words = 34) => { const w = plain(src).split(" "); return w.slice(0, words).join(" ") + (w.length > words ? "…" : ""); };
  const when = (iso) => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
  const ORDINAL = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth"];
  const ordinal = (n) => ORDINAL[n] || "No. " + n;   /* "The Second Post" */
  const roman = (n) => { let s = ""; for (const [v, r] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { s += r; n -= v; } return s; };
  const sized = (src, dir) => (/^\/photos\//.test(src) ? "/" + dir + src.slice(7) + ".jpg" : src);
  const imgTag = (src, alt, dir) => `<img src="${esc(sized(src, dir))}" data-full="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="if(this.src!==this.dataset.full)this.src=this.dataset.full">`;
  const FLOURISH = '<svg class="flourish" viewBox="0 0 220 26" aria-hidden="true"><path d="M2 13 H80 M140 13 H218 M110 3 L120 13 L110 23 L100 13 Z M80 13 C 88 7, 94 7, 98 13 M140 13 C 132 19, 126 19, 122 13"/></svg>';

  let DATA = { posts: [], albums: [], about: "" };
  const main = $("#main"), side = $(".side");

  function nav(route, file) {
    document.body.classList.toggle("home", route === "home");
    document.querySelectorAll(".cmds a").forEach((a) => (a.dataset.route === route ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    document.querySelectorAll("#entries a").forEach((a) => (a.dataset.file === file ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    side.classList.remove("open"); $(".menutoggle").setAttribute("aria-expanded", "false");
    choose(document.querySelector('.menu a[aria-current="page"]') || document.querySelector(".cmds a"), true);
  }
  function menuEntries() {
    $("#entries").innerHTML = DATA.posts.slice(0, 5).map((p) => `<li><a href="#/post/${esc(p.file)}" data-file="${esc(p.file)}" data-say="${esc(lede(p.body, 16))}"><span class="d">${esc(when(p.date))}</span>${esc(p.title)}</a></li>`).join("");
    $("#postcount").textContent = DATA.posts.length || ""; $("#photocount").textContent = allPhotos().length || "";
    menuItems().forEach((a) => { a.addEventListener("mouseenter", () => choose(a)); a.addEventListener("focus", () => choose(a)); a.addEventListener("click", () => blip("pick")); });
  }

  /* ------------------------------------------------------------------ the menu -------------------------------- */
  // As in an old game: one thing is chosen at a time; the pointer slides to it and bobs; the window at the foot says
  // what it does, a letter at a time; the arrow keys move the choice, Enter takes it, 1 2 3 jump to the commands.
  const menuItems = () => [...document.querySelectorAll(".cmds a, #entries a")];
  let chosen = null, sayTimer = 0;
  function choose(a, quiet) {
    if (!a || a === chosen) return;
    chosen = a; menuItems().forEach((x) => x.classList.toggle("sel", x === a));
    document.querySelectorAll(".menuwin").forEach((w) => w.classList.toggle("active", w.contains(a)));
    const win = a.closest(".menuwin"), ptr = $(".pointer", win), r = a.getBoundingClientRect(), wr = win.getBoundingClientRect();
    ptr.style.top = (r.top - wr.top + r.height / 2 - 8) + "px";
    say(a.dataset.say || "");
    if (!quiet) blip("move");
  }
  function say(text) {
    const el = $("#say"); clearInterval(sayTimer);
    if (still) { el.textContent = text; return; }
    let i = 0; el.textContent = "";
    sayTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(sayTimer); }, 16);
  }
  addEventListener("keydown", (e) => {
    if (!viewer.hidden || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const items = menuItems(); if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); const i = items.indexOf(chosen), next = items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      choose(next); next.focus({ preventScroll: true });
    } else if (/^[1-4]$/.test(e.key)) { const a = document.querySelectorAll(".cmds a")[+e.key - 1]; if (a) { choose(a, true); blip("pick"); location.hash = a.getAttribute("href"); } }
    else if (e.key === "Enter" && chosen && document.activeElement === document.body) { blip("pick"); location.hash = chosen.getAttribute("href"); }
  });

  // the sounds: a short soft tick when the choice moves, two notes when it is taken. Off with the button at the foot.
  const soundBtn = $("#sound"); let audio = null, soundOn = true;
  try { soundOn = localStorage.getItem("hl-sound") !== "off"; } catch (e) {}
  const showSound = () => { soundBtn.setAttribute("aria-pressed", String(soundOn)); $("span", soundBtn).textContent = soundOn ? "on" : "off"; };
  showSound();
  soundBtn.addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem("hl-sound", soundOn ? "on" : "off"); } catch (e) {} showSound(); blip("pick"); });
  function tone(f, t0, dur, vol) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .006); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  function blip(kind) {
    if (!soundOn || !navigator.userActivation?.hasBeenActive) return;   // never before the visitor has touched the page
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const t = audio.currentTime;
    if (kind === "pick") { tone(880, t, .09, .05); tone(1320, t + .07, .14, .045); } else tone(660, t, .05, .035);
  }

  function showHome() {
    nav("home"); document.title = "Half Life";
    const p = DATA.posts[0];
    main.innerHTML = `<section class="poster" aria-label="Half Life">
        <h1 class="poster-title">Half <em>Life</em></h1>
        <div class="poster-rule" aria-hidden="true"></div>
        <p class="epigraph">Being a record kept in Saint Frane, in the last age of the sun</p>
        <div class="portrait" role="img" aria-label="Chris, drawn in ink and smoke"></div>
        ${p ? `<p class="latest">Lately set down: <a href="#/post/${esc(p.file)}">${esc(p.title)}</a></p>` : ""}
      </section>`;
    hang($(".portrait"));
  }

  // The portraits take turns. The first is shown as soon as it loads; the others are fetched after it, and each
  // fades in over the last every ROTATE milliseconds while the home page is open and can be seen.
  const PORTRAITS = ["/site/portrait-1.webp?v=3", "/site/portrait-2.webp?v=3", "/site/portrait-3.webp?v=3", "/site/portrait-4.webp?v=3", "/site/portrait-5.webp?v=3"], ROTATE = 9000;
  let rotation = 0;
  function hang(box) {
    clearInterval(rotation);
    let last = -1; try { last = +sessionStorage.getItem("hl-portrait"); } catch (e) {}
    const order = PORTRAITS.map((_, i) => i).sort(() => Math.random() - .5);
    if (order[0] === last && order.length > 1) order.push(order.shift());   // not the same one twice running
    try { sessionStorage.setItem("hl-portrait", order[0]); } catch (e) {}
    const imgs = order.map((k, n) => { const im = document.createElement("img"); im.alt = ""; im.decoding = "async"; im.className = "pic"; im.dataset.n = n; return im; });
    const first = imgs[0];
    first.onload = () => {
      box.classList.add("hung"); first.classList.add("on"); box.appendChild(first);
      imgs.slice(1).forEach((im, j) => { im.src = PORTRAITS[order[j + 1]]; box.appendChild(im); });
      if (still || imgs.length < 2) return;
      let at = 0;
      rotation = setInterval(() => {
        if (!box.isConnected) return clearInterval(rotation);
        if (document.hidden) return;
        const next = imgs[(at + 1) % imgs.length]; if (!next.complete || !next.naturalWidth) return;   // wait until it has arrived
        imgs[at].classList.remove("on"); next.classList.add("on"); at = (at + 1) % imgs.length;
      }, ROTATE);
    };
    first.onerror = () => { const cv = document.createElement("canvas"); cv.className = "sketch"; cv.setAttribute("aria-hidden", "true"); box.appendChild(cv); requestAnimationFrame(() => sketch(cv)); };
    first.src = PORTRAITS[order[0]];
  }

  function showJournal() {
    nav("posts"); document.title = "Posts · Half Life";
    const n = DATA.posts.length;
    main.innerHTML = `<article class="sheet"><p class="kicker">Set down in ink</p><h1>Posts</h1><p class="when">in no particular order of importance</p>${FLOURISH}
      <ol class="contents">${DATA.posts.map((p, i) => `<li><a href="#/post/${esc(p.file)}"><span class="n">${roman(n - i)}</span><span><span class="t">${esc(p.title)}</span><span class="d">${esc(when(p.date))}</span></span><span class="l">${esc(lede(p.body))}</span></a></li>`).join("") || '<li class="empty">Nothing has yet been set down.</li>'}</ol></article>`;
  }

  function showPost(file) {
    const i = DATA.posts.findIndex((p) => p.file === file), p = DATA.posts[i];
    if (!p) { location.replace("#/posts"); return; }
    nav("posts", file); document.title = p.title + " · Half Life";
    const n = DATA.posts.length, newer = DATA.posts[i - 1], older = DATA.posts[i + 1], coverInBody = p.cover && p.body.includes(p.cover);
    main.innerHTML = `<article class="sheet">
        <p class="kicker">The ${ordinal(n - i)} Post</p><h1>${esc(p.title)}</h1><p class="when">${esc(when(p.date))}</p>${FLOURISH}
        ${p.cover && !coverInBody ? `<figure class="cover">${imgTag(p.cover, "", "large")}</figure>` : ""}
        <div class="prose">${markdown(p.body)}</div>
        <nav class="postnav" aria-label="More entries">
          ${older ? `<a class="prev" href="#/post/${esc(older.file)}"><span class="k">&larr; The post before</span><span class="t">${esc(older.title)}</span></a>` : "<span></span>"}
          ${newer ? `<a class="next" href="#/post/${esc(newer.file)}"><span class="k">The post after &rarr;</span><span class="t">${esc(newer.title)}</span></a>` : ""}
        </nav>
      </article>`;
    const pics = [...main.querySelectorAll(".prose figure img, .cover img")];
    pics.forEach((im, k) => im.addEventListener("click", () => view(pics.map((x) => ({ src: x.dataset.full || x.getAttribute("src"), caption: x.closest("figure")?.querySelector("figcaption")?.textContent || "" })), k)));
  }

  function allPhotos() {
    const seen = new Set(), list = [];
    const add = (src, caption, from) => { if (src && !seen.has(src)) { seen.add(src); list.push({ src, caption, from }); } };
    DATA.albums.forEach((a) => a.photos.forEach((src) => add(src, (a.captions.find((c) => c.photo === src) || {}).caption || "", a.title)));
    DATA.posts.forEach((p) => { if (p.cover) add(p.cover, "", p.title); for (const m of p.body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)) add(m[2], m[3] || m[1], p.title); });
    return list;
  }
  function showPhotos() {
    nav("photos"); document.title = "Photos · Half Life";
    const all = allPhotos();
    main.innerHTML = `<article class="sheet wide"><p class="kicker">Gathered while the light obliged</p><h1>Photos</h1><p class="when">plates taken before the sun thinks better of it</p>${FLOURISH}
      <div class="gallery">${all.map((ph, k) => `<button type="button" data-k="${k}" aria-label="${esc(ph.caption || "Open photograph " + (k + 1))}">${imgTag(ph.src, ph.caption, "thumbs")}</button>`).join("") || '<p class="empty">The plates are still drying.</p>'}</div></article>`;
    main.querySelectorAll(".gallery button").forEach((b) => b.addEventListener("click", () => view(all, +b.dataset.k)));
  }

  function showAbout() {
    nav("about"); document.title = "About · Half Life";
    main.innerHTML = `<article class="sheet about"><p class="kicker">Concerning the one who keeps this record</p><h1>About</h1>${FLOURISH}${markdown(DATA.about) || '<p class="empty">This remains to be set down.</p>'}</article>`;
  }


  /* ------------------------------------------------------------------ the realm ------------------------------- */
  // A gazetteer of the Chronicler's world, in the manner of the old almanacs: each entry a heading and a few lines.
  const REALM = [
    ["The Sun", "Old, swollen and the colour of spilled wine, the sun hangs low and is not to be trusted. Now and then it gutters like a lamp short of oil, and every soul in the city pauses mid-word to see whether it will return. So far it has. The almanac-makers have given up predicting its end and now sell instead small medallions which, worn at the throat, are said to make the matter less upsetting."],
    ["Saint Frane", "A city of seven hills on the last coast, older than its own records. Its towers were raised by people who understood what they built; their descendants understand only that the towers are tall and that certain of the doors still open. Streets climb and fall like a wave stopped mid-motion. The inhabitants are courteous, superstitious, and fond of argument, in roughly that order."],
    ["The Grey Water", "The bay below the city, wide and cold, with an island in its middle where a fortress of the old age keeps its silence. Fishermen work the shallows at dusk, which here lasts most of the day. They say the deep water holds things that remember being fish and resent having changed. The Chronicler has caught several and found them, on the whole, reasonable."],
    ["The Fog Wall", "Each morning a pale wall walks in from the sea and swallows the western hills. Those who go into it come back, as a rule, though occasionally a day or two later than they left, and with opinions they did not previously hold."],
    ["The Broken Span", "A great red bridge once leapt the mouth of the bay. Its two towers stand yet; the road between them fell long ago into the sea. Pilgrims climb the southern tower to watch the sun set through the cables, and to throw small offerings into the gap, for luck, or for spite."],
    ["The Isle of Rest", "Far across the western ocean, reached by airship, lies an island of warm water, long afternoons and drinks served in vessels the size of a thimble beneath little paper canopies. It is said to restore the body and correct the opinions. The Chronicler has been, and intends to go again."],
    ["Magic", "There is magic still, though no one now alive could invent a spell. The great formulae were written ages ago and are hoarded, traded and stolen like jewels; a magician holds only a few in mind at once, and each, once spoken, is gone until it is learned again. Most practitioners are therefore careful, and the careless ones are brief."],
    ["Curiosities", "The realm teems with oddities: the cat who sits upon the Chronicler's shoulders and will not say from where it came; mirrors that show yesterday; plants which, properly flattered, flower out of season; and the fish of the Grey Water, catalogued with some pride and released with some relief."],
    ["The Chronicler", "Of no fixed occupation, the Chronicler goes about the city in black with jade at the ear and an unreasonable number of plans. He keeps this record of what he sees, catches, grows and photographs, on the principle that the sun may go out at any moment and someone ought to have written it down."]
  ];
  function showRealm() {
    nav("realm"); document.title = "The Realm · Half Life";
    main.innerHTML = `<article class="sheet realm"><p class="kicker">A gazetteer of the last age</p><h1>The Realm</h1><p class="when">Saint Frane and its surroundings, as the Chronicler has found them</p>${FLOURISH}
      ${REALM.map(([t, b], i) => `<section class="entry"><h2><span class="n">${roman(i + 1)}</span>${esc(t)}</h2><p>${esc(b)}</p></section>`).join("")}</article>`;
  }

  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (/^\d{4}-\d{2}-\d{2}-/.test(h)) { location.replace("#/post/" + h); return; }   // links from the old site
    const [what, arg] = h.split("/");
    if (what === "post" && arg) showPost(arg); else if (["posts", "accounts", "journal"].includes(what)) showJournal(); else if (what === "photos" || what === "visions") showPhotos(); else if (what === "realm") showRealm(); else if (["about", "chronicler"].includes(what)) showAbout(); else showHome();   /* the old names still lead to the same pages */
    scrollTo({ top: 0, behavior: "instant" });
  }
  addEventListener("hashchange", route);
  $(".menutoggle").addEventListener("click", (e) => { const open = side.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", String(open)); });

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

  /* ------------------------------------------------------------------ begin ----------------------------------- */
  setWorld(); if (!still) requestAnimationFrame(drift);
  fetch("/posts.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    DATA = { posts: Array.isArray(d.posts) ? d.posts : [], albums: Array.isArray(d.albums) ? d.albums : [], about: d.about || "" };
    DATA.albums.forEach((a) => { a.photos = Array.isArray(a.photos) ? a.photos : []; a.captions = Array.isArray(a.captions) ? a.captions : []; });
    DATA.posts.forEach((p) => { p.body = p.body || ""; p.cover = p.cover || ""; });
    menuEntries(); route();
  }).catch(() => { main.innerHTML = '<p class="empty">The pages could not be fetched. Try again in a moment.</p>'; });
})();
