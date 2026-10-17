/* HALF LIFE: how the page works.
   1. The ground: pale blue paper, washes of blue laid on it, silver-white ribbons and fine ink lines, painted by
      paintLeaf on the canvas behind everything, a little differently each visit.
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

  /* ------------------------------------------------------------------ the gold and the ink -------------------- */
  function dice(seed) { let s = seed >>> 0 || 1; return () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (s | 1) ^ (s + (s ^ (s >>> 7)) * (s | 61))) >>> 0) / 4294967296); }
  function noise(rnd) {
    const p = new Uint8Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = rnd(); }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const at = (x, y) => v[p[(p[x & 255] + y) & 255]], s = (t) => t * t * (3 - 2 * t);
    const n = (x, y) => { const X = Math.floor(x), Y = Math.floor(y), u = s(x - X), w = s(y - Y);
      return (at(X, Y) * (1 - u) + at(X + 1, Y) * u) * (1 - w) + (at(X, Y + 1) * (1 - u) + at(X + 1, Y + 1) * u) * w; };
    return (x, y) => n(x, y) * .55 + n(x * 2.1, y * 2.1) * .3 + n(x * 4.3, y * 4.3) * .15;
  }

  // a long ribbon of silver-white, the way Amano's cloth and smoke fly: wide pale body, fine grey edges
  function ribbon(c, W, H, rnd, nz, x0, y0, len, wide) {
    const pts = []; let x = x0, y = y0, a = rnd() * 6.3;
    for (let i = 0; i < len; i++) { a += (nz(x / W * 2.2, y / H * 2.2) - .5) * .5; x += Math.cos(a) * 9; y += Math.sin(a) * 9; pts.push([x, y, a]); }
    // many fine strands side by side, thickest in the middle of the ribbon and drawn to a point at each end
    const strands = Math.max(8, Math.round(wide / 2.2));
    c.lineCap = "round"; c.lineJoin = "round";
    for (let k = 0; k <= strands; k++) {
      const o = k / strands - .5, edge = Math.abs(o) > .44, wob = rnd() * 6.3;
      c.beginPath();
      pts.forEach(([px, py, pa], i) => {
        const t = i / (pts.length - 1), taper = Math.pow(Math.sin(Math.PI * t), .7), off = o * wide * taper + Math.sin(t * 9 + wob) * wide * .03;
        const qx = px - Math.sin(pa) * off, qy = py + Math.cos(pa) * off;
        i ? c.lineTo(qx, qy) : c.moveTo(qx, qy);
      });
      c.strokeStyle = edge ? `rgba(122,132,150,${.35 + rnd() * .2})` : `rgba(252,251,247,${.16 + rnd() * .22})`;
      c.lineWidth = edge ? .7 : 1.2 + rnd() * 2.2; c.stroke();
    }
  }
  // a fine ink line that wanders and ends in a curl
  function inkLine(c, W, H, rnd, nz, x0, y0) {
    let x = x0, y = y0, a = rnd() * 6.3; c.beginPath(); c.moveTo(x, y);
    const n = 40 + rnd() * 90;
    for (let i = 0; i < n; i++) { a += (nz(x / W * 3, y / H * 3) - .5) * .7; x += Math.cos(a) * 7; y += Math.sin(a) * 7; c.lineTo(x, y); }
    const turn = rnd() < .5 ? 1 : -1;
    for (let t = 0, r = 10 + rnd() * 16; t < 9; t += .25) { a += turn * .35; r *= .95; x += Math.cos(a) * r * .25; y += Math.sin(a) * r * .25; c.lineTo(x, y); }
    c.strokeStyle = `rgba(30,28,36,${.35 + rnd() * .3})`; c.lineWidth = .6 + rnd() * .8; c.stroke();
  }
  // Washes: where the noise is high, a pale blue laid on like watercolour, its edges ragged, its surface mottled
  // where the pigment pooled. Worked out pixel by pixel at half size, then laid on.
  function gild(c, W, H, nz, s, cover, bias) {
    const k = 2, w = Math.ceil(W / k), h = Math.ceil(H / k), img = new ImageData(w, h), d = img.data, sk = s / k;
    const edge = .055, t0 = 1 - cover;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / w, fy = y / h, m = nz(fx * 2.4 + 3, fy * 2.4 * (H / W) * 1.6) + (bias ? bias(fx, fy) : 0) + (nz(fx * 22, fy * 22) - .5) * .08;
      if (m < t0) continue;
      const a = Math.min(1, (m - t0) / edge), sheen = nz(fx * 5 + 9, fy * 5) - .5, flake = nz(fx * 60, fy * 60) - .5;
      const i = (y * w + x) * 4, lum = 1 + sheen * .14 + flake * .05, edgeDark = a < 1 ? .93 : 1;   // pigment gathers at a wash's edge
      d[i] = Math.min(255, 186 * lum * edgeDark); d[i + 1] = Math.min(255, 207 * lum * edgeDark); d[i + 2] = Math.min(255, 230 * lum); d[i + 3] = 150 * a;
    }
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h; tmp.getContext("2d").putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true; c.drawImage(tmp, 0, 0, W, H);
  }
  function paintLeaf(cv, seed, opts = {}) {
    const W = cv.width, H = cv.height, c = cv.getContext("2d"), rnd = dice(seed), nz = noise(rnd);
    c.fillStyle = "#eef3f8"; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {                         // blue-grey and sepia washes, soaked into the paper
      const x = rnd() * W, y = rnd() * H, r = Math.max(W, H) * (.08 + rnd() * .22), cool = rnd() < .6;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, cool ? `rgba(138,160,190,${.1 + rnd() * .12})` : `rgba(170,160,200,${.06 + rnd() * .06})`); g.addColorStop(1, "rgba(238,243,248,0)");
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    gild(c, W, H, nz, opts.leaf || Math.max(48, Math.min(96, W / 16)), opts.cover ?? .5, opts.bias);
    for (let i = 0, n = opts.ribbons ?? Math.round(W / 220); i < n; i++) ribbon(c, W, H, rnd, nz, rnd() * W, rnd() * H, 50 + rnd() * 120, (14 + rnd() * 40) * (opts.scale || 1));
    for (let i = 0, n = opts.ink ?? Math.round(W / 140); i < n; i++) inkLine(c, W, H, rnd, nz, rnd() * W, rnd() * H);
  }

  const leaf = $("#leaf"); let leafSize = "";
  function setLeaf() {
    const k = Math.min(devicePixelRatio || 1, 1.5), W = Math.round(innerWidth * k), H = Math.round(innerHeight * k);
    if (leafSize === W + "x" + H) return; leafSize = W + "x" + H;
    leaf.width = W; leaf.height = H;
    const wide = innerWidth > 860, menuEdge = 300 / innerWidth;   // on a wide screen, keep the washes off the menu's side, fading in beyond it
    const t0 = performance.now();
    paintLeaf(leaf, (Math.random() * 2 ** 31) | 0, { bias: wide ? (fx) => Math.min(0, (fx - menuEdge * 1.1) * 1.6) : null });
    leaf.dataset.ms = Math.round(performance.now() - t0);
  }
  let resized = 0;
  addEventListener("resize", () => { clearTimeout(resized); resized = setTimeout(() => { setLeaf(); if ($("canvas.sketch")) sketch($("canvas.sketch")); }, 250); });

  /* ------------------------------------------------------------------ the portrait ---------------------------- */
  // Until a portrait is hung, a sketch holds its place: a head and shoulders in blue-grey wash on gold, its hair
  // flying out in ink, and smoke crossing in front, after the Weeknd print.
  function sketch(cv) {
    const r = cv.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(r.width * k); cv.height = Math.round(r.height * k);
    const W = cv.width, H = cv.height, c = cv.getContext("2d"), rnd = dice(7), nz = noise(rnd);
    paintLeaf(cv, 11, { leaf: W / 8, cover: .6, ribbons: 0, ink: 0 });
    for (let i = 0; i < 6; i++) ribbon(c, W, H, rnd, nz, W * (.2 + rnd() * .6), H * (.2 + rnd() * .6), 70 + rnd() * 60, W * (.03 + rnd() * .05));
    for (let i = 0; i < 9; i++) inkLine(c, W, H, rnd, nz, W * rnd(), H * rnd());
    c.font = `italic ${Math.round(W * .028)}px "Cormorant Garamond", serif`; c.fillStyle = "rgba(70,67,79,.85)"; c.textAlign = "center";
    c.fillText("the portrait is being painted", W / 2, H * .955);
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
    } else if (/^[1-3]$/.test(e.key)) { const a = document.querySelectorAll(".cmds a")[+e.key - 1]; if (a) { choose(a, true); blip("pick"); location.hash = a.getAttribute("href"); } }
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
        <div class="portrait" role="img" aria-label="Chris, drawn in ink and smoke"></div>
        ${p ? `<p class="latest">Lately set down: <a href="#/post/${esc(p.file)}">${esc(p.title)}</a></p>` : ""}
      </section>`;
    hang($(".portrait"));
  }

  // The portraits take turns. The first is shown as soon as it loads; the others are fetched after it, and each
  // fades in over the last every ROTATE milliseconds while the home page is open and can be seen.
  const PORTRAITS = ["/site/portrait-1.webp", "/site/portrait-2.webp", "/site/portrait-3.webp"], ROTATE = 9000;
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

  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (/^\d{4}-\d{2}-\d{2}-/.test(h)) { location.replace("#/post/" + h); return; }   // links from the old site
    const [what, arg] = h.split("/");
    if (what === "post" && arg) showPost(arg); else if (["posts", "accounts", "journal"].includes(what)) showJournal(); else if (what === "photos" || what === "visions") showPhotos(); else if (["about", "chronicler"].includes(what)) showAbout(); else showHome();   /* the old names still lead to the same pages */
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
  setLeaf();
  fetch("/posts.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    DATA = { posts: Array.isArray(d.posts) ? d.posts : [], albums: Array.isArray(d.albums) ? d.albums : [], about: d.about || "" };
    DATA.albums.forEach((a) => { a.photos = Array.isArray(a.photos) ? a.photos : []; a.captions = Array.isArray(a.captions) ? a.captions : []; });
    DATA.posts.forEach((p) => { p.body = p.body || ""; p.cover = p.cover || ""; });
    menuEntries(); route();
  }).catch(() => { main.innerHTML = '<p class="empty">The pages could not be fetched. Try again in a moment.</p>'; });
})();
