/* HALF LIFE: how the page works.
   1. The tower: site/tower.js draws the posts as the glowing tower from Ghost in the Shell 2: Innocence on the canvas
      behind everything. This file tells it where to stand on each page (Tower.view) and opens a post when a band of
      it is clicked.
   2. The words: posts.json (made from the editor's files by scripts/build-index.mjs) is read once, then the address
      after # picks the page: #/ the tower, #/posts, #/post/<file> (one post), #/photos, #/about. The side menu leads
      to each, as an old game's menu would (see "the menu" below).
   3. The readout in the corner counts the record, after the film's system monitor (see "the readout").
   4. The photographs open in a viewer that can be stepped through with the arrow keys or a swipe. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
  const sized = (src, dir) => (/^\/photos\//.test(src) ? "/" + dir + src.slice(7) + ".jpg" : src);
  const imgTag = (src, alt, dir) => `<img src="${esc(sized(src, dir))}" data-full="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="if(this.src!==this.dataset.full)this.src=this.dataset.full">`;
  // a rule in the film's manner: a thin line with ticks, and a bright mark at its left
  const FLOURISH = '<svg class="flourish" viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 H600 M0 2 V12 M150 4 V10 M300 4 V10 M450 4 V10 M600 2 V12"/><rect class="tick" x="0" y="5" width="40" height="4"/></svg>';
  const num = (n) => String(n);   /* entry numbers, plainly: 1, 2, 3 */
  const wordsIn = (src) => plain(src).split(" ").filter(Boolean).length;

  let DATA = { posts: [], albums: [], about: "" };
  const main = $("#main"), side = $(".side");

  function nav(route, file) {
    document.body.classList.toggle("home", route === "home");
    document.querySelectorAll(".cmds a").forEach((a) => (a.dataset.route === route ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    document.querySelectorAll("#entries a").forEach((a) => (a.dataset.file === file ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    side.classList.remove("open"); $(".menutoggle").setAttribute("aria-expanded", "false");
    choose(document.querySelector('.menu a[aria-current="page"]') || document.querySelector(".cmds a"), true);
    here = [route, file]; placeTower(route, file);
  }
  function menuEntries() {
    $("#entries").innerHTML = DATA.posts.slice(0, 3).map((p) => `<li><a href="#/post/${esc(p.file)}" data-file="${esc(p.file)}" data-say="${esc(lede(p.body, 16))}"><span class="d">${esc(when(p.date))}</span>${esc(p.title)}</a></li>`).join("");
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

  // Home is the tower itself; the menu and the readout frame it, and the email alerts box sits at the foot.
  function showHome() {
    nav("home"); document.title = "Half Life";
    if (window.Tower) Tower.hush(false);
    main.innerHTML = `<section class="hall" aria-label="Half Life"><h1 class="sr">Half Life</h1>${ALERTS}</section>`;
    hookAlerts();
  }

  /* ------------------------------------------------------------------ the tower's place on each page ---------- */
  // Home: the tower stands in the space right of the menu, at full strength. Reading: it steps into the strip left of
  // the page (on a wide screen) or stays behind it, dimmed, with the post being read unwound and glowing.
  function placeTower(route, file) {
    if (!window.Tower) return;
    const wide = innerWidth > 1100, mid = innerWidth > 860, side = mid ? 240 / innerWidth : 0;   /* 240: --side in blog.css */
    if (route === "home") Tower.view({ x0: side, x1: 1, dim: 1, focus: null });
    else if (wide) { const sheet = Math.min(760, innerWidth * .55) / innerWidth; Tower.view({ x0: side, x1: 1 - sheet, dim: .55, focus: file || null }); }
    else Tower.view({ x0: side, x1: 1, dim: .16, focus: file || null });
  }
  let here = ["home"];
  addEventListener("resize", () => placeTower(...here));

  /* ------------------------------------------------------------------ the readout ----------------------------- */
  // In the corner, as the film's system monitor: how many entries, photographs and words, posts per month as a row of
  // little bars, and the half-life of the newest post: how bright it still burns, halving every thirty days.
  function readout() {
    const posts = DATA.posts, words = posts.reduce((n, p) => n + plain(p.body).split(" ").filter(Boolean).length, 0);
    const months = [], now = new Date();
    for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); months.push(posts.filter((p) => p.date.startsWith(d.toISOString().slice(0, 7))).length); }
    const top = Math.max(1, ...months), latest = posts[0], age = latest ? Math.max(0, (Date.now() - Date.parse(latest.date + "T12:00:00")) / 864e5) : 0;
    const life = latest ? Math.round(100 * Math.pow(.5, age / 30)) : 0;
    $("#readout").innerHTML = `<p class="rt">Record</p>
      <dl>
        <div><dt>Entries</dt><dd class="spark" aria-hidden="true">${months.map((m) => `<i style="height:${Math.max(8, m / top * 100)}%" class="${m ? "on" : ""}"></i>`).join("")}</dd><dd>${posts.length}</dd></div>
        <div><dt>Photos</dt><dd class="bar"><i style="width:${Math.min(100, allPhotos().length * 4)}%"></i></dd><dd>${allPhotos().length}</dd></div>
        <div><dt>Words</dt><dd class="bar"><i style="width:${Math.min(100, words / 200)}%"></i></dd><dd>${words.toLocaleString()}</dd></div>
        <div><dt>Latest</dt><dd class="bar"><i style="width:${life}%"></i></dd><dd>${latest ? esc(new Date(latest.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })) : "—"}</dd></div>
        <div><dt>Half-life</dt><dd class="bar life"><i style="width:${life}%"></i></dd><dd>${life}%</dd></div>
      </dl>`;
  }

  function showJournal() {
    nav("posts"); document.title = "Posts · Half Life";
    const n = DATA.posts.length;
    main.innerHTML = `<article class="sheet"><p class="kicker"><b>Record</b> · ${n} ${n === 1 ? "entry" : "entries"}</p><h1>Posts</h1><p class="when">most lately set down first</p>${FLOURISH}
      <ol class="contents">${DATA.posts.map((p, i) => `<li><a href="#/post/${esc(p.file)}"><span class="n">${num(n - i)}</span><span><span class="t">${esc(p.title)}</span><span class="d">${esc(when(p.date))}</span></span><span class="l">${esc(lede(p.body))}</span></a></li>`).join("") || '<li class="empty">Nothing has yet been set down.</li>'}</ol></article>`;
  }

  function showPost(file) {
    const i = DATA.posts.findIndex((p) => p.file === file), p = DATA.posts[i];
    if (!p) { location.replace("#/posts"); return; }
    nav("posts", file); document.title = p.title + " · Half Life";
    const n = DATA.posts.length, newer = DATA.posts[i - 1], older = DATA.posts[i + 1], coverInBody = p.cover && p.body.includes(p.cover);
    main.innerHTML = `<article class="sheet">
        <p class="kicker"><b>Entry ${num(n - i)}</b> · ${wordsIn(p.body).toLocaleString()} words · read</p><h1>${esc(p.title)}</h1><p class="when">${esc(when(p.date))}</p>${FLOURISH}
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
    main.innerHTML = `<article class="sheet wide"><p class="kicker"><b>Plates</b> · ${all.length} gathered while the light obliged</p><h1>Photos</h1><p class="when">plates taken before the sun thinks better of it</p>${FLOURISH}
      <div class="gallery">${all.map((ph, k) => `<button type="button" data-k="${k}" aria-label="${esc(ph.caption || "Open photograph " + (k + 1))}">${imgTag(ph.src, ph.caption, "thumbs")}</button>`).join("") || '<p class="empty">The plates are still drying.</p>'}</div></article>`;
    main.querySelectorAll(".gallery button").forEach((b) => b.addEventListener("click", () => view(all, +b.dataset.k)));
  }

  function showAbout() {
    nav("about"); document.title = "About · Half Life";
    main.innerHTML = `<article class="sheet about"><p class="kicker"><b>About</b> · the person behind Half Life</p><h1>About</h1>${FLOURISH}${markdown(DATA.about) || '<p class="empty">This remains to be set down.</p>'}</article>`;
  }

  /* ------------------------------------------------------------------ email alerts ------------------------- */
  // A small box at the foot of the front page: friends leave an email address and get one short email when a
  // new entry is published (never for edits). The address is kept by scripts/worker.js; every email can stop them.
  const ALERTS = `<form class="alerts" novalidate>
      <label for="alert-email">Get an email when a new entry is set down</label>
      <div class="arow"><input id="alert-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>
        <button type="submit">Notify me</button></div>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="amsg" role="status" aria-live="polite"></p>
      <div class="apush" aria-live="polite" hidden></div>
    </form>`;
  function hookAlerts() {
    const f = main.querySelector(".alerts"); if (!f) return;
    // opened from an iPhone home screen (or as an installed app): offer notifications straight away
    if (DEVICE.standalone && DEVICE.push) pushedHere().then((on) => { let no = ""; try { no = localStorage.getItem("hl-push"); } catch (e) {} if (!on && no !== "no") pushPanel(f.querySelector(".apush")); });
    const msg = f.querySelector(".amsg"), btn = f.querySelector("button");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = f.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = "That doesn't look like an email address."; f.email.focus(); return; }
      btn.disabled = true; msg.textContent = "Adding you…";
      try {
        const r = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, website: f.website.value }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) {
          blip("pick"); f.classList.add("done"); msg.textContent = d.already ? "You're already in." : "You're in. New entries only, never spam."; f.email.value = "";
          f.querySelector(".arow").hidden = true; f.querySelector("label").hidden = true;
          if (!(await pushedHere())) pushPanel(f.querySelector(".apush"));   // then offer a notification on this device too
        }
        else msg.textContent = d.error || "That didn't work. Try again in a moment.";
      } catch (err) { msg.textContent = "That didn't work. Check your connection and try again."; }
      btn.disabled = false;
    });
  }

  /* ------------------------------------------------------------------ push notifications ------------------- */
  // After someone signs up for email, they're asked whether they want a notification on this device too, with a
  // few words of help that suit the device: on an iPhone, the site has to be added to the home screen first (Apple's
  // rule), so they get the three taps for that; elsewhere the browser simply asks. sw.js shows the notifications.
  const ua = navigator.userAgent;
  const DEVICE = {
    ios: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    android: /Android/i.test(ua),
    inApp: /Instagram|FBAN|FBAV|Line\/|Snapchat|TikTok|LinkedInApp|GSA\//i.test(ua),   // browsers inside other apps can't
    standalone: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
    push: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  };
  const iosVersion = () => { const m = /OS (\d+)_(\d+)/.exec(ua); return m ? +m[1] + +m[2] / 100 : 0; };
  const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function pushedHere() {
    try { if (!DEVICE.push) return false; const reg = await navigator.serviceWorker.getRegistration(); return !!(reg && (await reg.pushManager.getSubscription())); } catch (e) { return false; }
  }
  function pushPanel(box) {
    const say = (html) => { box.innerHTML = html; box.hidden = false; if (window.Tower) Tower.hush(true); };
    if (DEVICE.inApp) return say(`<p>To get notifications, open <b>halflife.studio</b> in Safari or Chrome.</p>`);
    if (DEVICE.ios && !DEVICE.standalone) {
      const v = iosVersion();
      if (v && v < 16.4) return say(`<p>Notifications need iOS 16.4 or newer. Email has you covered.</p>`);
      return say(`<p class="aq">Want a notification on your iPhone too?</p>
        <ol class="steps"><li>Tap <b>Share</b> at the bottom of Safari</li><li>Tap <b>Add to Home Screen</b></li><li>Open Half Life from your home screen and tap <b>Turn on notifications</b></li></ol>`);
    }
    if (!DEVICE.push) return say(`<p>This browser can't show notifications. Email has you covered.</p>`);
    if (Notification.permission === "denied") return say(`<p>${DEVICE.ios ? "Notifications are off for Half Life. Turn them on in Settings → Notifications → Half Life."
      : DEVICE.android ? "Notifications are blocked. Tap the icon left of the address, then Permissions → Notifications → Allow."
      : "Notifications are blocked. Click the icon left of the address bar and allow notifications."}</p>`);
    const hint = DEVICE.ios ? "Tap Allow when your iPhone asks." : DEVICE.android ? "Tap Allow when your phone asks." : "Click Allow when your browser asks.";
    say(`<p class="aq">Want a notification on this device too?</p>
      <div class="abtns"><button type="button" class="yes">${DEVICE.standalone ? "Turn on notifications" : "Yes, notify me"}</button><button type="button" class="no">No thanks</button></div>
      <p class="ahint">${hint}</p>`);
    box.querySelector(".no").onclick = () => { try { localStorage.setItem("hl-push", "no"); } catch (e) {} say(`<p>No problem. Email has you covered.</p>`); };
    box.querySelector(".yes").onclick = async () => {
      try {
        const perm = await Notification.requestPermission();   // first, inside the tap: iPhones insist on that
        if (perm !== "granted") return pushPanel(box);            // declined: show how to allow it, or ask again
        say(`<p>Turning on…</p>`);
        const reg = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
        const { key } = await (await fetch("/api/push/key")).json();
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(key) }));
        const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
        if (!r.ok) throw new Error("not saved");
        blip("pick"); say(`<p>Done. You'll get a notification when a new entry is set down.</p>`);
      } catch (e) { say(`<p>That didn't work. Try again in a moment.</p>`); }
    };
  }

  /* ------------------------------------------------------------------ closing a page ------------------------ */
  // Every page has a close button (and Escape works too). A post closes back to the list or the tower it was opened
  // from; any other page closes to the tower.
  let cameFrom = "#/", here_ = "#/";
  function closeTo() {
    if (/^#\/(post|quest)\//.test(here_) && /^(#\/?|#\/posts)?$/.test(cameFrom)) return cameFrom || "#/";
    return "#/";
  }
  function addClose() {
    const sheet = main.querySelector(".sheet"); if (!sheet) return;
    const a = document.createElement("a"); a.className = "close"; a.href = closeTo(); a.setAttribute("aria-label", "Close this page");
    a.innerHTML = '<span aria-hidden="true">&times;</span>';
    a.addEventListener("click", () => blip("pick"));
    sheet.prepend(a);
  }
  addEventListener("keydown", (e) => { if (e.key === "Escape" && viewer.hidden && !document.body.classList.contains("home")) { location.hash = closeTo(); } });

  // A quest's own page: its title, when (only the month while it is still to come), and the story from its calendar
  // description. The quests arrive from the calendar a moment after the page, so this waits for them.
  let QUESTS = null;
  function showQuest(id) {
    nav("quest", "quest:" + id);
    const q = (QUESTS || []).find((x) => x.id === id);
    if (!q) { main.innerHTML = `<article class="sheet"><p class="kicker"><b>Quest</b></p><h1>${QUESTS ? "This quest is gone" : "Unrolling the map…"}</h1>${QUESTS ? '<p class="when">It may have been struck from the record.</p>' : ""}</article>`; return; }
    document.title = q.title + " · Half Life";
    const day = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const when_ = q.over ? day(q.date) + (q.end && q.end !== q.date ? " – " + day(q.end) : "") : "Sometime in " + q.month;
    main.innerHTML = `<article class="sheet quest"><p class="kicker"><b>Quest</b> · ${q.over ? "completed" : "to come"}</p><h1>${esc(q.title)}</h1><p class="when">${esc(when_)}</p>${FLOURISH}
      <div class="prose">${q.blurb ? markdown(q.blurb) : '<p class="empty">The particulars of this quest have not yet been set down.</p>'}</div></article>`;
  }

  function route() {
    cameFrom = here_; here_ = location.hash || "#/";
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (/^\d{4}-\d{2}-\d{2}-/.test(h)) { location.replace("#/post/" + h); return; }   // links from the old site
    const [what, arg] = h.split("/");
    if (what === "quest" && arg) showQuest(arg); else if (what === "post" && arg) showPost(arg); else if (["posts", "accounts", "journal"].includes(what)) showJournal(); else if (what === "photos" || what === "visions") showPhotos(); else if (["about", "chronicler"].includes(what)) showAbout(); else showHome();   /* the old names still lead to the same pages */
    addClose();
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
  // Quests come from Chris's calendar through the site (scripts/worker.js). The tower waits up to 1.2 seconds for them,
  // so the gold rings draw themselves in as part of the opening; if the calendar is slower than that, the tower opens
  // without them and the gold rings grow in at the top the moment they arrive.
  const questsArrive = fetch("/api/quests").then((r) => (r.ok ? r.json() : { quests: [] })).then((d) => (Array.isArray(d.quests) ? d.quests : [])).catch(() => []);
  const questsSoon = Promise.race([questsArrive, new Promise((ok) => setTimeout(() => ok(null), 1200))]);
  Promise.all([fetch("/posts.json", { cache: "no-cache" }).then((r) => r.json()), questsSoon]).then(([d, early]) => {
    DATA = { posts: Array.isArray(d.posts) ? d.posts : [], albums: Array.isArray(d.albums) ? d.albums : [], about: d.about || "" };
    DATA.albums.forEach((a) => { a.photos = Array.isArray(a.photos) ? a.photos : []; a.captions = Array.isArray(a.captions) ? a.captions : []; });
    DATA.posts.forEach((p) => { p.body = p.body || ""; p.cover = p.cover || ""; });
    menuEntries(); readout();
    if (early) QUESTS = early;
    // the tower is drawn from the posts, with quests as gold rings among them; clicking a band opens that post or quest
    if (window.Tower) Tower.start($("#tower"), DATA.posts, { quests: early || [], onOpen: (file) => { blip("pick"); location.hash = "#/post/" + encodeURIComponent(file); } });
    if (!early) questsArrive.then((quests) => { QUESTS = quests; if (quests.length && window.Tower) Tower.quests(DATA.posts, quests); if (/^#\/quest\//.test(location.hash)) route(); });
    route();
  }).catch(() => { main.innerHTML = '<p class="empty">The pages could not be fetched. Try again in a moment.</p>'; });
})();
