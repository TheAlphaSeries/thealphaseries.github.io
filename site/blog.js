/* =====================================================================================================================
   HALF LIFE: THE PAGE                                                                                     site/blog.js
   =====================================================================================================================

   Everything on the page except the tower itself (that's site/tower.js) and the music (site/music.js).

   HOW A VISIT GOES
     1. posts.json is fetched (it is built from the editor's files by scripts/build-index.mjs) and, at the same time,
        /api/quests (the "Quest:" events from Chris's Google Calendar, via scripts/worker.js).
     2. The tower is started with the posts, and with the quests too if the calendar answered within 1.2 s (so the gold
        rings are part of the opening); otherwise the gold is added the moment it arrives.
     3. The address after # picks the page (see ROUTES):
          #/              the tower (home), with the email alerts box at the foot
          #/posts         every post, newest first          #/post/<file>   one post
          #/quest/<id>    one quest's story                 #/photos        every photograph
          #/about         about Chris
        Old addresses from earlier versions of the site still lead to the right page.
     4. Every page but home has a close button (Escape works too); a post or quest closes back to wherever it was
        opened from.

   SECTIONS IN THIS FILE
     1 helpers · 2 the words (markdown) · 3 the data · 4 sounds · 5 the menu · 6 the tower's place · 7 the pages
     8 closing a page · 9 routes · 10 photo viewer · 11 email alerts · 12 push notifications · 13 the readout · 14 start
   ================================================================================================================== */
(() => {
  "use strict";

  /* ================================================================================================== 1. HELPERS */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };   // private windows can refuse storage
  const longDate = (iso) => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
  const shortDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // Photos come in three sizes (scripts/make-thumbs.sh): /photos/x (original), /thumbs/x.jpg and /large/x.jpg.
  const sized = (src, dir) => (/^\/photos\//.test(src) ? "/" + dir + src.slice(7) + ".jpg" : src);
  const imgTag = (src, alt, dir) => `<img src="${esc(sized(src, dir))}" data-full="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="if(this.src!==this.dataset.full)this.src=this.dataset.full">`;
  // A divider in the film's manner: a thin line with ticks and a bright mark at its left (styled in blog.css).
  const FLOURISH = '<svg class="flourish" viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 H600 M0 2 V12 M150 4 V10 M300 4 V10 M450 4 V10 M600 2 V12"/><rect class="tick" x="0" y="5" width="40" height="4"/></svg>';

  /* ============================================================================================= 2. THE WORDS */
  // A small Markdown reader, enough for what the editor writes: paragraphs, ## headings, > quotes, lists, *** ornaments,
  // photos (with captions), links, **bold**, *italic* and `code`. Everything is escaped first, and only safe link
  // addresses are allowed, so a post can never inject anything into the page.
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
    const out = [];
    for (let b of String(src || "").replace(/\r/g, "").split(/\n{2,}/)) {
      b = b.replace(/^\n+|\s+$/g, ""); if (!b) continue;
      if (/^(\*\s*\*\s*\*|-{3,}|_{3,})$/.test(b.trim())) { out.push('<hr class="fleuron">'); continue; }
      const h = /^(#{1,4})\s+(.*)$/.exec(b); if (h) { const n = Math.min(3, h[1].length + 1); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
      if (/^>/.test(b)) { out.push(`<blockquote>${markdown(b.replace(/^> ?/gm, ""))}</blockquote>`); continue; }
      if (/^([-*+]|\d+\.)\s/.test(b)) {
        const tag = /^\d+\./.test(b) ? "ol" : "ul", items = b.split(/\n(?=(?:[-*+]|\d+\.)\s)/).map((li) => `<li>${inline(li.replace(/^([-*+]|\d+\.)\s+/, ""))}</li>`);
        out.push(`<${tag}>${items.join("")}</${tag}>`); continue;
      }
      const pic = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/.exec(b.trim());
      if (pic) { const cap = pic[3] || pic[1]; out.push(`<figure><img src="${esc(safeUrl(pic[2]))}" alt="${esc(pic[1])}" loading="lazy">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`); continue; }
      out.push(`<p>${inline(b)}</p>`);
    }
    return out.join("\n");
  }
  const plain = (src) => String(src || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
  const lede = (src, words = 34) => { const w = plain(src).split(" "); return w.slice(0, words).join(" ") + (w.length > words ? "…" : ""); };

  /* ============================================================================================== 3. THE DATA */
  // DATA: what posts.json holds, tidied. Each post also gets .words (counted once here, used by the list and readout).
  // PHOTOS: every photograph, from albums and posts, without repeats (worked out once). QUESTS: from the calendar.
  let DATA = { posts: [], albums: [], about: "" }, PHOTOS = [], QUESTS = null;
  function load(d) {
    DATA = { posts: Array.isArray(d.posts) ? d.posts : [], albums: Array.isArray(d.albums) ? d.albums : [], about: d.about || "" };
    DATA.albums.forEach((a) => { a.photos = Array.isArray(a.photos) ? a.photos : []; a.captions = Array.isArray(a.captions) ? a.captions : []; });
    DATA.posts.forEach((p) => { p.body = p.body || ""; p.cover = p.cover || ""; p.words = plain(p.body).split(" ").filter(Boolean).length; });
    const seen = new Set(), add = (src, caption, from) => { if (src && !seen.has(src)) { seen.add(src); PHOTOS.push({ src, caption, from }); } };
    PHOTOS = [];
    DATA.albums.forEach((a) => a.photos.forEach((src) => add(src, (a.captions.find((c) => c.photo === src) || {}).caption || "", a.title)));
    DATA.posts.forEach((p) => { if (p.cover) add(p.cover, "", p.title); for (const m of p.body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)) add(m[2], m[3] || m[1], p.title); });
  }

  /* ================================================================================================ 4. SOUNDS */
  // A soft tick when the menu choice moves, two notes when something is picked. Made on the spot (no sound files),
  // never before the visitor has touched the page, and switched off with "Sound" at the foot of the menu (remembered).
  const soundBtn = $("#sound"); let audio = null, soundOn = store.get("hl-sound") !== "off";
  const showSound = () => { soundBtn.setAttribute("aria-pressed", String(soundOn)); $("span", soundBtn).textContent = soundOn ? "on" : "off"; };
  showSound();
  soundBtn.addEventListener("click", () => { soundOn = !soundOn; store.set("hl-sound", soundOn ? "on" : "off"); showSound(); blip("pick"); });
  function tone(f, t0, dur, vol) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .006); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  function blip(kind) {
    if (!soundOn || !navigator.userActivation?.hasBeenActive) return;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const t = audio.currentTime;
    if (kind === "pick") { tone(880, t, .09, .05); tone(1320, t + .07, .14, .045); } else tone(660, t, .05, .035);
  }

  /* ================================================================================================= 5. THE MENU */
  // As in an old game: one thing is chosen at a time; an arrowhead slides to it and bobs; the line at the foot types
  // out what it does (its data-say). Arrow keys move the choice, Enter takes it, 1 2 3 jump to Posts, Photos, About.
  // On a phone the menu folds behind the "Menu" button.
  const main = $("#main"), side = $(".side");
  const menuItems = () => $$(".cmds a, #entries a");
  let chosen = null, sayTimer = 0;
  function menuEntries() {                                               // the three newest posts, and the counts
    $("#entries").innerHTML = DATA.posts.slice(0, 3).map((p) => `<li><a href="#/post/${esc(p.file)}" data-file="${esc(p.file)}" data-say="${esc(lede(p.body, 16))}"><span class="d">${esc(longDate(p.date))}</span>${esc(p.title)}</a></li>`).join("");
    $("#postcount").textContent = DATA.posts.length || ""; $("#photocount").textContent = PHOTOS.length || "";
    menuItems().forEach((a) => { a.addEventListener("mouseenter", () => choose(a)); a.addEventListener("focus", () => choose(a)); a.addEventListener("click", () => blip("pick")); });
  }
  function choose(a, quiet) {
    if (!a || a === chosen) return;
    chosen = a; menuItems().forEach((x) => x.classList.toggle("sel", x === a));
    $$(".menuwin").forEach((w) => w.classList.toggle("active", w.contains(a)));
    const win = a.closest(".menuwin"), r = a.getBoundingClientRect(), wr = win.getBoundingClientRect();
    $(".pointer", win).style.top = (r.top - wr.top + r.height / 2 - 8) + "px";
    say(a.dataset.say || "");
    if (!quiet) blip("move");
  }
  function say(text) {                                                   // type it out, a letter every 16 ms
    const el = $("#say"); clearInterval(sayTimer);
    if (still) { el.textContent = text; return; }
    let i = 0; el.textContent = "";
    sayTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(sayTimer); }, 16);
  }
  addEventListener("keydown", (e) => {
    if (!viewer.hidden || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const items = menuItems(); if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); const next = items[(items.indexOf(chosen) + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      choose(next); next.focus({ preventScroll: true });
    } else if (/^[1-3]$/.test(e.key)) { const a = $$(".cmds a")[+e.key - 1]; if (a) { choose(a, true); blip("pick"); location.hash = a.getAttribute("href"); } }
    else if (e.key === "Enter" && chosen && document.activeElement === document.body) { blip("pick"); location.hash = chosen.getAttribute("href"); }
  });
  $(".menutoggle").addEventListener("click", (e) => { const open = side.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", String(open)); });

  /* ======================================================================================= 6. THE TOWER'S PLACE */
  // nav() is called by every page: it marks the menu, folds the phone menu away and moves the tower.
  // Home: the tower stands right of the menu at full strength. Reading on a wide screen: it steps into the strip left
  // of the page, half bright, and stays clickable. Reading on a narrow screen: it stays behind the page, dimmed.
  // `file` is the band to keep unwound and glowing (the post or quest being read).
  const SIDE_WIDTH = 240;                                                // = --side in blog.css
  let here = ["home"];
  function nav(route, file) {
    document.body.classList.toggle("home", route === "home");
    $$(".cmds a").forEach((a) => (a.dataset.route === route ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    $$("#entries a").forEach((a) => (a.dataset.file === file ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    side.classList.remove("open"); $(".menutoggle").setAttribute("aria-expanded", "false");
    choose($('.menu a[aria-current="page"]') || $(".cmds a"), true);
    here = [route, file]; placeTower(route, file);
  }
  function placeTower(route, file) {
    if (!window.Tower) return;
    const side = innerWidth > 860 ? SIDE_WIDTH / innerWidth : 0;
    if (route === "home") Tower.view({ x0: side, x1: 1, dim: 1, focus: null });
    else if (innerWidth > 1100) Tower.view({ x0: side, x1: 1 - Math.min(760, innerWidth * .55) / innerWidth, dim: .55, focus: file || null });
    else Tower.view({ x0: side, x1: 1, dim: .16, focus: file || null });
  }
  addEventListener("resize", () => placeTower(...here));

  /* ================================================================================================ 7. THE PAGES */
  // Home: the tower is the page; the alerts box sits at its foot. hush(false) lets the tower's callouts back.
  function showHome() {
    nav("home"); document.title = "Half Life";
    if (window.Tower) Tower.hush(false);
    main.innerHTML = `<section class="hall" aria-label="Half Life"><h1 class="sr">Half Life</h1>${ALERTS}</section>`;
    hookAlerts();
  }
  // Posts: every post, newest first, with its number, date and opening words.
  function showPosts() {
    nav("posts"); document.title = "Posts · Half Life";
    const n = DATA.posts.length;
    main.innerHTML = `<article class="sheet"><p class="kicker"><b>Record</b> · ${n} ${n === 1 ? "entry" : "entries"}</p><h1>Posts</h1><p class="when">most lately set down first</p>${FLOURISH}
      <ol class="contents">${DATA.posts.map((p, i) => `<li><a href="#/post/${esc(p.file)}"><span class="n">${n - i}</span><span><span class="t">${esc(p.title)}</span><span class="d">${esc(longDate(p.date))}</span></span><span class="l">${esc(lede(p.body))}</span></a></li>`).join("") || '<li class="empty">Nothing has yet been set down.</li>'}</ol></article>`;
  }
  // One post: entry number, title, date, cover (if it isn't already in the text), the writing, links to the
  // posts either side. Clicking a picture opens it in the viewer.
  function showPost(file) {
    const i = DATA.posts.findIndex((p) => p.file === file), p = DATA.posts[i];
    if (!p) { location.replace("#/posts"); return; }
    nav("posts", file); document.title = p.title + " · Half Life";
    const n = DATA.posts.length, newer = DATA.posts[i - 1], older = DATA.posts[i + 1], coverInBody = p.cover && p.body.includes(p.cover);
    main.innerHTML = `<article class="sheet">
        <p class="kicker"><b>Entry ${n - i}</b> · ${p.words.toLocaleString()} words · read</p><h1>${esc(p.title)}</h1><p class="when">${esc(longDate(p.date))}</p>${FLOURISH}
        ${p.cover && !coverInBody ? `<figure class="cover">${imgTag(p.cover, "", "large")}</figure>` : ""}
        <div class="prose">${markdown(p.body)}</div>
        <nav class="postnav" aria-label="More entries">
          ${older ? `<a class="prev" href="#/post/${esc(older.file)}"><span class="k">&larr; The post before</span><span class="t">${esc(older.title)}</span></a>` : "<span></span>"}
          ${newer ? `<a class="next" href="#/post/${esc(newer.file)}"><span class="k">The post after &rarr;</span><span class="t">${esc(newer.title)}</span></a>` : ""}
        </nav>
      </article>`;
    const pics = $$(".prose figure img, .cover img", main);
    pics.forEach((im, k) => im.addEventListener("click", () => view(pics.map((x) => ({ src: x.dataset.full || x.getAttribute("src"), caption: x.closest("figure")?.querySelector("figcaption")?.textContent || "" })), k)));
  }
  // Photos: every photograph as a grid of thumbnails; each opens in the viewer.
  function showPhotos() {
    nav("photos"); document.title = "Photos · Half Life";
    main.innerHTML = `<article class="sheet wide"><p class="kicker"><b>Plates</b> · ${PHOTOS.length} gathered while the light obliged</p><h1>Photos</h1><p class="when">plates taken before the sun thinks better of it</p>${FLOURISH}
      <div class="gallery">${PHOTOS.map((ph, k) => `<button type="button" data-k="${k}" aria-label="${esc(ph.caption || "Open photograph " + (k + 1))}">${imgTag(ph.src, ph.caption, "thumbs")}</button>`).join("") || '<p class="empty">The plates are still drying.</p>'}</div></article>`;
    $$(".gallery button", main).forEach((b) => b.addEventListener("click", () => view(PHOTOS, +b.dataset.k)));
  }
  // About: the text from the editor's About page.
  function showAbout() {
    nav("about"); document.title = "About · Half Life";
    main.innerHTML = `<article class="sheet about"><p class="kicker"><b>About</b> · the person behind Half Life</p><h1>About</h1>${FLOURISH}${markdown(DATA.about) || '<p class="empty">This remains to be set down.</p>'}</article>`;
  }
  // One quest: title, when (only the month while it is still to come), and the story from its calendar description.
  // If someone lands here before the calendar has answered, a placeholder shows and start() calls route() again.
  function showQuest(id) {
    nav("quest", "quest:" + id);
    const q = (QUESTS || []).find((x) => x.id === id);
    if (!q) { main.innerHTML = `<article class="sheet"><p class="kicker"><b>Quest</b></p><h1>${QUESTS ? "This quest is gone" : "Unrolling the map…"}</h1>${QUESTS ? '<p class="when">It may have been struck from the record.</p>' : ""}</article>`; return; }
    document.title = q.title + " · Half Life";
    const when = q.over ? longDate(q.date) + (q.end && q.end !== q.date ? " – " + longDate(q.end) : "") : "Sometime in " + q.month;
    main.innerHTML = `<article class="sheet quest"><p class="kicker"><b>Quest</b> · ${q.over ? "completed" : "to come"}</p><h1>${esc(q.title)}</h1><p class="when">${esc(when)}</p>${FLOURISH}
      <div class="prose">${q.blurb ? markdown(q.blurb) : '<p class="empty">The particulars of this quest have not yet been set down.</p>'}</div></article>`;
  }

  /* ======================================================================================= 8. CLOSING A PAGE */
  // The round × at the top right of every page (and Escape). A post or quest opened from the tower or the post list
  // closes back there; anything else closes to the tower.
  let cameFrom = "#/", current = "#/";
  const closeTo = () => (/^#\/(post|quest)\//.test(current) && /^(#\/?|#\/posts)?$/.test(cameFrom) ? cameFrom || "#/" : "#/");
  function addClose() {
    const sheet = $(".sheet", main); if (!sheet) return;
    const a = document.createElement("a"); a.className = "close"; a.href = closeTo(); a.setAttribute("aria-label", "Close this page");
    a.innerHTML = '<span aria-hidden="true">&times;</span>';
    a.addEventListener("click", () => blip("pick"));
    sheet.prepend(a);
  }
  addEventListener("keydown", (e) => { if (e.key === "Escape" && viewer.hidden && !document.body.classList.contains("home")) location.hash = closeTo(); });

  /* ================================================================================================== 9. ROUTES */
  // The part after # chooses the page. The second column lists older names that still work.
  const ROUTES = { post: showPost, quest: showQuest, posts: showPosts, accounts: showPosts, journal: showPosts, photos: showPhotos, visions: showPhotos, about: showAbout, chronicler: showAbout };
  function route() {
    cameFrom = current; current = location.hash || "#/";
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (/^\d{4}-\d{2}-\d{2}-/.test(h)) { location.replace("#/post/" + h); return; }   // links from the very first site
    const [what, arg] = h.split("/"), page = ROUTES[what];
    if (page && (arg || (what !== "post" && what !== "quest"))) page(arg); else showHome();
    addClose();
    scrollTo({ top: 0, behavior: "instant" });
  }
  addEventListener("hashchange", route);

  /* ============================================================================================ 10. PHOTO VIEWER */
  // Full-screen photograph, stepped with the arrows, arrow keys or a swipe; closed with ×, Escape or a click outside.
  // It loads the large copy and falls back to the original if that's missing.
  const viewer = $("#viewer"), vimg = $("img", viewer), vcap = $("figcaption", viewer);
  let vlist = [], vk = 0, back = null, x0 = null;
  function view(list, k) { vlist = list; back = document.activeElement; viewer.hidden = false; viewer.classList.toggle("single", list.length < 2); document.body.style.overflow = "hidden"; show(k); $(".vclose", viewer).focus(); }
  function show(k) { vk = (k + vlist.length) % vlist.length; const p = vlist[vk]; vimg.src = sized(p.src, "large"); vimg.onerror = () => { if (vimg.src.indexOf(p.src) < 0) vimg.src = p.src; }; vimg.alt = p.caption || ""; vcap.textContent = p.caption || p.from || ""; }
  function close() { viewer.hidden = true; vimg.removeAttribute("src"); document.body.style.overflow = ""; if (back) back.focus(); }
  $(".vclose", viewer).addEventListener("click", close);
  $(".vprev", viewer).addEventListener("click", () => show(vk - 1));
  $(".vnext", viewer).addEventListener("click", () => show(vk + 1));
  viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.tagName === "FIGURE") close(); });
  addEventListener("keydown", (e) => { if (viewer.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(vk - 1); if (e.key === "ArrowRight") show(vk + 1); });
  viewer.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(vk + (dx < 0 ? 1 : -1)); x0 = null; });

  /* =========================================================================================== 11. EMAIL ALERTS */
  // The box at the foot of the front page. A friend leaves an email address (scripts/worker.js keeps it, and emails
  // them once per NEW entry, never for edits; every email has an unsubscribe link). The hidden "website" field is a
  // trap only robots fill in. After signing up (or entering an address that's already on the list) they're offered
  // a notification on this device too (section 12). Opened from an iPhone home screen, that offer shows straight away.
  const ALERTS = `<form class="alerts" novalidate>
      <label for="alert-email">Get an email when a new entry is set down</label>
      <div class="arow"><input id="alert-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>
        <button type="submit">Notify me</button></div>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="amsg" role="status" aria-live="polite"></p>
      <div class="apush" aria-live="polite" hidden></div>
    </form>`;
  function hookAlerts() {
    const f = $(".alerts", main); if (!f) return;
    const msg = $(".amsg", f), btn = $("button", f), box = $(".apush", f);
    if (DEVICE.standalone && DEVICE.push) pushedHere().then((on) => { if (!on && store.get("hl-push") !== "no") pushPanel(box); });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = f.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = "That doesn't look like an email address."; f.email.focus(); return; }
      btn.disabled = true; msg.textContent = "Adding you…";
      try {
        const r = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, website: f.website.value }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) {
          blip("pick"); f.classList.add("done"); f.email.value = "";
          msg.textContent = d.already ? "You're already in." : "You're in. New entries only, never spam.";
          $(".arow", f).hidden = true; $("label", f).hidden = true;
          if (!(await pushedHere())) pushPanel(box);
        } else msg.textContent = d.error || "That didn't work. Try again in a moment.";
      } catch (err) { msg.textContent = "That didn't work. Check your connection and try again."; }
      btn.disabled = false;
    });
  }

  /* ===================================================================================== 12. PUSH NOTIFICATIONS */
  // "Want a notification on this device too?", with help that suits the device:
  //   iPhone in Safari       Apple only allows it from the home screen, so: the three taps to add it there
  //   iPhone home screen,    "Turn on notifications" / "Yes, notify me", then the device asks for permission
  //   Android, computers
  //   inside Instagram etc.  those built-in browsers can't: open it in Safari or Chrome
  //   blocked or too old     how to unblock it, or "email has you covered"
  // Saying yes: ask permission (inside the tap, as iPhones require), start sw.js (it shows the notifications), get
  // the site's public push key, subscribe, and hand the subscription to scripts/worker.js.
  const ua = navigator.userAgent;
  const DEVICE = {
    ios: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    android: /Android/i.test(ua),
    inApp: /Instagram|FBAN|FBAV|Line\/|Snapchat|TikTok|LinkedInApp|GSA\//i.test(ua),
    standalone: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
    push: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  };
  const iosVersion = () => { const m = /OS (\d+)_(\d+)/.exec(ua); return m ? +m[1] + +m[2] / 100 : 0; };
  const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function pushedHere() {                                          // is this device already subscribed?
    try { if (!DEVICE.push) return false; const reg = await navigator.serviceWorker.getRegistration(); return !!(reg && (await reg.pushManager.getSubscription())); } catch (e) { return false; }
  }
  function pushPanel(box) {
    const put = (html) => { box.innerHTML = html; box.hidden = false; if (window.Tower) Tower.hush(true); };   // hush: no callouts behind it on a phone
    if (DEVICE.inApp) return put(`<p>To get notifications, open <b>halflife.studio</b> in Safari or Chrome.</p>`);
    if (DEVICE.ios && !DEVICE.standalone) {
      const v = iosVersion();
      if (v && v < 16.4) return put(`<p>Notifications need iOS 16.4 or newer. Email has you covered.</p>`);
      return put(`<p class="aq">Want a notification on your iPhone too?</p>
        <ol class="steps"><li>Tap <b>Share</b> at the bottom of Safari</li><li>Tap <b>Add to Home Screen</b></li><li>Open Half Life from your home screen and tap <b>Turn on notifications</b></li></ol>`);
    }
    if (!DEVICE.push) return put(`<p>This browser can't show notifications. Email has you covered.</p>`);
    if (Notification.permission === "denied") return put(`<p>${DEVICE.ios ? "Notifications are off for Half Life. Turn them on in Settings → Notifications → Half Life."
      : DEVICE.android ? "Notifications are blocked. Tap the icon left of the address, then Permissions → Notifications → Allow."
      : "Notifications are blocked. Click the icon left of the address bar and allow notifications."}</p>`);
    const hint = DEVICE.ios ? "Tap Allow when your iPhone asks." : DEVICE.android ? "Tap Allow when your phone asks." : "Click Allow when your browser asks.";
    put(`<p class="aq">Want a notification on this device too?</p>
      <div class="abtns"><button type="button" class="yes">${DEVICE.standalone ? "Turn on notifications" : "Yes, notify me"}</button><button type="button" class="no">No thanks</button></div>
      <p class="ahint">${hint}</p>`);
    $(".no", box).onclick = () => { store.set("hl-push", "no"); put(`<p>No problem. Email has you covered.</p>`); };
    $(".yes", box).onclick = async () => {
      try {
        if ((await Notification.requestPermission()) !== "granted") return pushPanel(box);   // declined: show how to allow it, or ask again
        put(`<p>Turning on…</p>`);
        const reg = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
        const { key } = await (await fetch("/api/push/key")).json();
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(key) }));
        if (!(await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) })).ok) throw new Error("not saved");
        blip("pick"); put(`<p>Done. You'll get a notification when a new entry is set down.</p>`);
      } catch (e) { put(`<p>That didn't work. Try again in a moment.</p>`); }
    };
  }

  /* ============================================================================================= 13. THE READOUT */
  // The panel in the corner, after the film's system monitor: entries (with posts per month over the last year as
  // little bars), photos, words, the newest post's date, and its "half-life": 100% the day it's posted, halving every
  // 30 days, back to 100% with each new post.
  function readout() {
    const posts = DATA.posts, words = posts.reduce((n, p) => n + p.words, 0), now = new Date(), months = [];
    for (let k = 11; k >= 0; k--) { const m = new Date(now.getFullYear(), now.getMonth() - k, 1).toISOString().slice(0, 7); months.push(posts.filter((p) => p.date.startsWith(m)).length); }
    const top = Math.max(1, ...months), latest = posts[0];
    const life = latest ? Math.round(100 * Math.pow(.5, Math.max(0, (Date.now() - Date.parse(latest.date + "T12:00:00")) / 864e5) / 30)) : 0;
    $("#readout").innerHTML = `<p class="rt">Record</p>
      <dl>
        <div><dt>Entries</dt><dd class="spark" aria-hidden="true">${months.map((m) => `<i style="height:${Math.max(8, m / top * 100)}%" class="${m ? "on" : ""}"></i>`).join("")}</dd><dd>${posts.length}</dd></div>
        <div><dt>Photos</dt><dd class="bar"><i style="width:${Math.min(100, PHOTOS.length * 4)}%"></i></dd><dd>${PHOTOS.length}</dd></div>
        <div><dt>Words</dt><dd class="bar"><i style="width:${Math.min(100, words / 200)}%"></i></dd><dd>${words.toLocaleString()}</dd></div>
        <div><dt>Latest</dt><dd class="bar"><i style="width:${life}%"></i></dd><dd>${latest ? esc(shortDate(latest.date)) : "—"}</dd></div>
        <div><dt>Half-life</dt><dd class="bar life"><i style="width:${life}%"></i></dd><dd>${life}%</dd></div>
      </dl>`;
  }

  /* ================================================================================================== 14. START */
  // The calendar gets 1.2 s to answer so the gold can join the opening; after that the tower starts without it and
  // Tower.quests() adds it on arrival (and a quest page opened directly is drawn again once its story is known).
  const questsArrive = fetch("/api/quests").then((r) => (r.ok ? r.json() : { quests: [] })).then((d) => (Array.isArray(d.quests) ? d.quests : [])).catch(() => []);
  const questsSoon = Promise.race([questsArrive, new Promise((ok) => setTimeout(() => ok(null), 1200))]);
  Promise.all([fetch("/posts.json", { cache: "no-cache" }).then((r) => r.json()), questsSoon]).then(([d, early]) => {
    load(d); menuEntries(); readout();
    if (early) QUESTS = early;
    if (window.Tower) Tower.start($("#tower"), DATA.posts, { quests: early || [], onOpen: (file) => { blip("pick"); location.hash = "#/post/" + encodeURIComponent(file); } });
    if (!early) questsArrive.then((quests) => { QUESTS = quests; if (quests.length && window.Tower) Tower.quests(DATA.posts, quests); if (/^#\/quest\//.test(location.hash)) route(); });
    route();
  }).catch(() => { main.innerHTML = '<p class="empty">The pages could not be fetched. Try again in a moment.</p>'; });
})();
