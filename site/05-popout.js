/* ==========================================================================
   6. POP-OUT WINDOW
   An opened log entry or quest: a see-through window over the home screen.
   ========================================================================== */
/* open a log entry */
function showPost(p, from) {   /* from: the row it was opened from, when that is not the home list (the Chronicle) */
  if (!(from && from.isConnected) && view !== "files") showFiles();
  current = p; questFrom = from && from.isConnected ? from : null; setHash(p.file);
  if (isNew("entries", p.file)) { markKnown("entries", p.file); main.querySelectorAll(".file").forEach((b) => { if (b.dataset.file === p.file) { const t = b.querySelector(".newtag"); if (t) t.remove(); } }); }
  rwin.textContent = "";
  const head = el("div", "filehead"), meta = el("p", "meta");
  meta.append(el("span", null, day(p.date))); if (p.place) meta.append(el("span", null, p.place));
  head.append(meta, el("h2", null, p.title));
  const body = el("div", "post"); renderBody(p.body, body);
  const nav = el("div", "row group"), next = sorted[sorted.indexOf(p) + 1];
  nav.append(opt("Back", closePost));
  if (next) nav.append(opt("Next", () => showPost(next)));
  const pin = pinFor(p.place);
  if (pin) nav.append(opt("Show on map", () => { closePost(); showMap(true, pin.file); }));
  rwin.append(head, body, remarksBlock(p), nav);
  reader.hidden = false; document.body.style.overflow = "hidden"; syncLayers(); encounter();
  rwin.classList.remove("pop"); void rwin.offsetWidth; rwin.classList.add("pop");
  rwin.scrollTop = 0; rwin.focus();
}
/* open a quest: its story and its objectives */
let questFrom = null;   /* the quest's button on the home screen, to put the cursor back on afterwards */
/* The company of a quest: the friends accepted onto it, and a way to ask to join. Petitions go to a small
   server program (scripts/worker.js) and wait there until Chris accepts or denies them at /keeper.html.
   No account is needed; only the name, e-mail address and note typed here are kept. The address is never sent
   back to this page: what comes back for each companion is a number (their "seed"), from which their figure is drawn. */
let PARTY = {}, partyOpen = false;   /* accepted names per quest, and whether the server answered at all */
const petitioned = () => { try { const v = JSON.parse(store.get("petitioned") || "[]"); return Array.isArray(v) ? v.map(text) : []; } catch (e) { return []; } };
function loadParty() {
  return fetch("/api/party", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !d.party || typeof d.party !== "object") return;
    PARTY = {}; partyOpen = true;
    for (const k of Object.keys(d.party)) if (Array.isArray(d.party[k])) PARTY[k] = d.party[k].map((m) => ({ name: text(m && m.name).trim().slice(0, 40), role: text(m && m.role).trim().slice(0, 60), at: day(text(m && m.at)) ? text(m.at).slice(0, 10) : "", seed: m && Number.isInteger(m.seed) && m.seed > 0 ? m.seed : 0, calling: text(m && m.calling).slice(0, 24), item: text(m && m.item).slice(0, 12) })).filter((m) => m.name).slice(0, 60);
    if (reader.hidden && !main.contains(document.activeElement)) { if (view === "quests") showQuestLog(false); if (view === "chron") showChronicle(false); if (view === "files") showFiles(false); if (view === "status") showStatus(false); }   /* redraw what is up, now that the companies are known */
  }).catch(() => {});
}
/* Who holds each post of a quest: the name written into the quest itself ("held"), or else the accepted
   companion who asked for it. Companions who asked for no post, or for one that no longer exists, are "others". */
function roster(q) {
  const members = owns(PARTY, q.file) ? PARTY[q.file] : [], used = new Set();
  const posts = q.roles.map((r) => { const m = r.held ? null : members.find((x) => !used.has(x) && x.role.toLowerCase() === r.name.toLowerCase()); if (m) used.add(m); return { name: r.name, about: r.about, holder: r.held || (m ? m.name : ""), fellow: !!m }; });
  return { posts, others: members.filter((m) => !used.has(m)).map((m) => m.name), filled: posts.filter((p) => p.holder).length };
}
/* ---- The companions as characters ----
   Everyone accepted onto a quest becomes a small figure with a page of their own: which posts they hold, how many
   ventures they have joined and seen through, and a title that grows with them. Each is some kind of creature
   with some calling (a Frogfolk Bard, a Skeleton Cook), drawn by lot when they first sign on and never changed after. */
function companions() {
  const by = new Map();
  for (const q of QUESTS) for (const m of (owns(PARTY, q.file) ? PARTY[q.file] : [])) {
    const k = m.seed ? "#" + m.seed : m.name.toLowerCase(); if (!by.has(k)) by.set(k, { name: m.name, seed: m.seed, calling: m.calling, item: m.item, names: new Set(), posts: [] });   /* the same figure is the same companion, whatever name they signed */
    by.get(k).names.add(m.name.toLowerCase()); by.get(k).posts.push({ quest: q, role: m.role, at: m.at });
  }
  return [...by.values()].map((c) => {
    const n = c.posts.length, done = c.posts.filter((x) => x.quest.status === "completed").length;
    c.done = done; c.bond = Math.min(5, n + done * 2);
    c.title = done >= 3 ? "Veteran of the Company" : done >= 1 ? "Proven Companion" : n >= 3 ? "Old Hand of the Company" : n === 2 ? "Twice-Sworn Companion" : "Fellow of the Road";
    c.since = c.posts.map((x) => x.at).filter(day).sort()[0] || "";
    c.stars = c.posts.filter((x) => x.quest.status === "completed" && commendedOn(x.quest, c)).length;   /* a companion has experience and a level of their own: for signing on, for each quest seen through, for being commended */
    c.xp = n * COMPANION_PAY.joined + c.posts.reduce((t, x) => t + (x.quest.status === "completed" ? questExp(x.quest) : 0), 0) + c.stars * COMPANION_PAY.commended; c.level = Math.floor(Math.sqrt(c.xp / 10)) + 1;
    return c;
  });
}
function nameHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/* The figures are made in figures.js (the same file the gallery at /figures.html uses). what(): which creature and
   calling a companion drew; drawCompanion(): their picture. A companion from before figures were drawn by lot has
   no number of their own, so their name stands in for one. */
const lot = (name, seed) => (seed > 0 ? seed : nameHash(String(name).toLowerCase()) || 1);
function what(name, seed, calling) { return typeof conjure === "function" ? conjure(lot(name, seed), calling) : null; }
/* the short past written for a companion (see "The teller of backgrounds" in figures.js) */
function pastOf(name, seed, calling, item) { return typeof conjure === "function" ? conjure.tale(lot(name, seed), { name, calling, item }) : ""; }
/* the facts of a companion's record, as the annals want them (see conjure.annals in figures.js) */
function factsOf(c) {
  const posts = c.posts.slice().sort((a, b) => (b.at || "").localeCompare(a.at || "")).map((x) => ({ quest: x.quest.title, place: x.quest.place, role: x.role, done: x.quest.status === "completed", grade: x.quest.status === "completed" ? questGrade(x.quest) : "", commended: x.quest.status === "completed" && commendedOn(x.quest, c), when: x.at }));
  const remarks = Object.keys(REMARKS).reduce((n, k) => n + REMARKS[k].filter((m) => c.names.has(m.name.toLowerCase())).length, 0);
  return { name: c.name, calling: c.calling, item: c.item, since: c.since, level: c.level, bond: c.bond, title: c.title, stars: c.stars, remarks, keeper: STATUS.name || "", posts };
}
function annalsOf(c) { return typeof conjure === "function" && conjure.annals ? conjure.annals(lot(c.name, c.seed), factsOf(c)) : ""; }
function drawCompanion(canvas, name, seed, calling) {
  const f = what(name, seed, calling); if (!f) return;   /* the figure maker did not load: leave the frame empty */
  const w = f.w || FW, h = f.h || FH; canvas.width = w; canvas.height = h; canvas.getContext("2d").putImageData(new ImageData(f.pixels, w, h), 0, 0);
}
/* the companions, as a block of tiles at the foot of the Quest Log */
function showCompany() {
  const all = companions(); if (!all.length && !partyOpen) return;
  main.append(el("p", "label questhead", "The Company"));
  if (!all.length) { main.append(el("p", "sub", "None yet has thrown in with the keeper. The posts above stand open.")); return; }
  const wrap = el("div", "fellows");
  all.forEach((c, i) => {
    const b = opt(null, () => showCompanion(c, b), "fellow"), pic = el("canvas", "fellowpic"); pic.setAttribute("aria-hidden", "true"); drawCompanion(pic, c.name, c.seed, c.calling); const w = what(c.name, c.seed, c.calling);
    b.append(pic, el("span", "name", c.name), el("span", "fkind", w ? w.title : ""), el("span", "flevel", "Level " + c.level), el("span", "ftitle", c.title), el("span", "fcount", count(c.posts.length, "venture")));
    b.style.setProperty("--i", Math.min(i, 6)); wrap.append(b);
  });
  main.append(wrap);
}
/* one companion's page, in the pop-out window */
function showCompanion(c, from) {
  current = null; questFrom = from && from.isConnected ? from : null; setHash("");
  rwin.textContent = "";
  const head = el("div", "filehead"), meta = el("p", "meta"), pic = el("canvas", "fellowpic big"); pic.setAttribute("aria-hidden", "true"); drawCompanion(pic, c.name, c.seed, c.calling);
  meta.append(el("span", null, "Companion")); head.append(meta, el("h2", null, c.name));
  const sheet = el("dl", "facts qstats"), row = (k, v) => { const dd = el("dd"); dd.append(v); sheet.append(el("dt", null, k), dd); };
  const w = what(c.name, c.seed, c.calling); if (w) { row("Kind", w.kind); row("Calling", w.calling); }
  if (w && conjure.itemName(c.item)) { const it = el("span", "carries"), ic = el("canvas", "itempic"); ic.setAttribute("aria-hidden", "true"); conjure.paintItem(ic, c.item); it.append(ic, conjure.itemName(c.item)); row("Carries", it); }
  row("Level", c.level + "   (" + c.xp + " experience)"); row("Title", c.title); row("Ventures joined", String(c.posts.length)); row("Seen through", String(c.done)); if (c.stars) row("Commended", count(c.stars, "time"));
  const bond = el("span", "hard"); bond.append(pips(c.bond), c.bond + " / 5"); row("Bond", bond);
  if (c.since) row("Of the company since", day(c.since));
  const posts = el("ul", "posts");
  c.posts.forEach((x) => {
    const li = el("li", x.quest.status === "completed" ? "held" : "vacant"), words = el("span", "pwords");
    words.append(el("span", "pname", x.role || "Of the company"), el("span", "pabout", x.quest.title));
    li.append(words, el("span", "pholder", x.quest.status === "completed" ? "Fulfilled, grade " + questGrade(x.quest) + (commendedOn(x.quest, c) ? "  -  commended" : "") : "In hand")); posts.append(li);
  });
  const tally = el("p", "goalhead"); tally.append(el("span", null, "Posts held"), el("span", "lmcount", String(c.posts.length)));
  const nav = el("div", "row group"); nav.append(opt("Back", closePost));
  if (typeof conjure === "function") { const note = el("span", "sharenote"); note.setAttribute("role", "status");
    nav.append(opt("Share card", () => shareCard(companionCard({ name: c.name, seed: c.seed, calling: c.calling, item: c.item, title: c.title, level: c.level, bond: c.bond, lines: c.posts.map((x) => (x.role || "Of the company") + ", " + x.quest.title), story: c.posts.length ? annalsOf(c) : "" }), "half-life-" + (c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "companion") + ".png", c.name + " of the keeper's company", note)), note); }
  const past = el("div", "post lore pastlore"), tale = pastOf(c.name, c.seed, c.calling, c.item), annals = annalsOf(c); if (tale) past.append(el("p", null, tale)); if (annals) { past.append(el("p", "goalhead", "The annals"), el("p", null, annals)); }
  rwin.append(head, pic, sheet); if (tale) rwin.append(past); rwin.append(tally, posts, nav);
  reader.hidden = false; document.body.style.overflow = "hidden"; syncLayers();
  rwin.classList.remove("pop"); void rwin.offsetWidth; rwin.classList.add("pop");
  rwin.scrollTop = 0; rwin.focus();
}
/* a companion's name as something to choose: it opens their page */
function fellowLink(name) {
  const c = companions().find((x) => x.names.has(name.toLowerCase())); if (!c) return el("span", null, name);
  const b = el("button", "plink", name); b.type = "button"; b.addEventListener("click", () => showCompanion(c, questFrom)); return b;
}
function company(q) {
  const { posts, others } = roster(q), open = partyOpen && q.file && q.status !== "completed";
  if (!posts.length && !others.length && !open) return;   /* nothing to show, and no server to petition */
  const head = el("p", "goalhead"); head.append(el("span", null, "Company"), el("span", "lmcount", posts.length ? posts.filter((p) => p.holder).length + " / " + posts.length + " posts" : others.length ? String(others.length) : ""));
  rwin.append(head); { const m = march(q); if (m) rwin.append(m); }
  const box = el("div", "petition"), asked = petitioned().includes(q.file);
  const form = (want) => {   /* the petition form; want: the post asked for, if the visitor chose one */
    box.textContent = "";
    const f = el("form"), name = el("input"), note = el("input"), trap = el("input"), note2 = el("p", "sub partynote"), send = opt("Send petition"), mail = el("input"), l3 = el("label", null, "Where word may reach you (an e-mail address, seen by the keeper alone)"), l1 = el("label", null, "The name you travel under"), l2 = el("label", null, "A word in your favour (optional)");
    const free = posts.filter((p) => !p.holder), pick = el("select"), l0 = el("label", null, "The post you seek");
    free.forEach((p) => { const o = el("option", null, p.name); o.value = p.name; pick.append(o); });
    const none = el("option", null, "No particular post"); none.value = ""; pick.append(none); pick.value = want || (free[0] ? free[0].name : ""); pick.id = "prole"; l0.htmlFor = "prole";
    name.type = "text"; name.maxLength = 40; name.required = true; name.autocomplete = "off"; name.id = "pname"; l1.htmlFor = "pname";
    mail.type = "email"; mail.maxLength = 120; mail.required = true; mail.autocomplete = "email"; mail.id = "pmail"; l3.htmlFor = "pmail";
    note.type = "text"; note.maxLength = 200; note.autocomplete = "off"; note.id = "pnote"; l2.htmlFor = "pnote";
    trap.type = "text"; trap.name = "website"; trap.tabIndex = -1; trap.autocomplete = "off"; trap.className = "trap"; trap.setAttribute("aria-hidden", "true");   /* people never see this; only a machine fills it in */
    send.type = "submit"; note2.setAttribute("role", "status"); note2.textContent = "Only what you write here is kept, and your address is never shown. Sign with the same address and your figure stays the same.";
    /* the lot: a figure drawn at random, which a newcomer may draw again as often as they like before sending */
    const lotBox = el("div", "lotbox"), lotPic = el("canvas", "fellowpic big"), lotWords = el("div"), lotName = el("p", "lotname"), again = opt("Draw again"); let lotSeed = 0;
    const trade = el("select"), lc = el("label", null, "Your calling"), thing = el("select"), li = el("label", null, "The curiosity you set out with"), lotPast = el("p", "lotpast");
    const paint = () => { drawCompanion(lotPic, "", lotSeed, trade.value); const w = what("", lotSeed, trade.value); lotName.textContent = w ? w.title : ""; lotPast.textContent = pastOf(name.value.trim(), lotSeed, trade.value, thing.value); };
    const draw = () => { lotSeed = (crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646) + 1; paint(); };   /* a new lot: another creature, other colours, another past; the calling and the curiosity stay as chosen */
    lotPic.setAttribute("aria-hidden", "true"); lotName.setAttribute("aria-live", "polite"); again.type = "button"; again.addEventListener("click", draw);
    lotWords.append(el("p", "sub partynote", "Your lot"), lotName, again); lotBox.append(lotPic, lotWords);
    if (typeof conjure === "function") {
      conjure.callings.forEach((c) => { const o = el("option", null, c); o.value = c.toLowerCase(); trade.append(o); }); trade.selectedIndex = Math.floor(Math.random() * conjure.callings.length);
      conjure.items.forEach(([id, label]) => { const o = el("option", null, label); o.value = id; thing.append(o); }); thing.selectedIndex = Math.floor(Math.random() * conjure.items.length);
      trade.id = "ptrade"; lc.htmlFor = "ptrade"; thing.id = "pthing"; li.htmlFor = "pthing"; trade.addEventListener("change", paint); thing.addEventListener("change", paint); name.addEventListener("input", paint);
      draw(); f.append(lc, trade, li, thing, lotBox, lotPast);
    }
    if (free.length) f.append(l0, pick);
    f.append(l1, name, l3, mail, l2, note, trap, send, note2); box.append(f); name.focus();
    f.addEventListener("submit", (e) => {
      e.preventDefault(); if (!name.value.trim() || !mail.value.trim() || send.disabled) return;
      send.disabled = true; note2.textContent = "Sending...";
      fetch("/api/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quest: q.file, name: name.value, email: mail.value, seed: lotSeed, calling: trade.value, item: thing.value, note: note.value, role: free.length ? pick.value : "", website: trap.value }) })
        .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) { send.disabled = false; note2.textContent = text(d.error) || "The petition could not be carried. Try again."; return; }
          store.set("petitioned", JSON.stringify(petitioned().concat(q.file).slice(-40)));
          box.textContent = "";
          if (Number.isInteger(d.seed) && d.seed > 0) store.set("figure", JSON.stringify([d.seed, trade.value, thing.value]));   /* a new figure was drawn: remember it on this device, to show it again */
          let kept = []; try { kept = JSON.parse(store.get("figure") || "[]"); } catch (err) {} if (!Array.isArray(kept)) kept = [kept];
          const mine = Number.isInteger(kept[0]) && kept[0] > 0 ? kept[0] : 0, myTrade = text(kept[1]), myThing = text(kept[2]);
          if (mine > 0) { const pic = el("canvas", "fellowpic big"); pic.setAttribute("aria-hidden", "true"); drawCompanion(pic, name.value, mine, myTrade); const w = what(name.value, mine, myTrade), carried = w ? conjure.itemName(myThing) : "";
            box.append(pic, el("p", "sub partynote figurenote", d.returning ? "The keeper knows you of old. The figure you first drew stands; the new lot is returned to the bag." : "The lot is drawn" + (w ? ": you are a " + w.title + (carried ? ", carrying " + carried.replace(/^An? /, (m) => m.toLowerCase()) : "") : "") + ". The figure is yours for as long as you sign with the same address."));
            const tale = pastOf(name.value.trim(), mine, myTrade, myThing); if (tale) box.append(el("p", "lotpast", tale));
            const mineName = name.value.trim(), note = el("span", "sharenote"), share = el("div", "row"); note.setAttribute("role", "status");
            share.append(opt("Share your lot", () => shareCard(companionCard({ name: mineName, seed: mine, calling: myTrade, item: myThing, title: "Petitioner to the keeper's company", lines: ["Petitioning to join " + q.title + (pick.value ? " as " + pick.value : "")] }), "half-life-my-lot.png", mineName + " has drawn a lot", note)), note); box.append(share); }
          else if (d.returning) box.append(el("p", "sub partynote", "The keeper knows you of old. The figure you first drew stands, and the new lot is returned to the bag."));
          box.append(el("p", "sub partynote", "Your petition has been carried to the keeper. He will consider it at his leisure, which is considerable."));
          rwin.querySelectorAll(".posts .opt").forEach((b) => b.remove());
        }).catch(() => { send.disabled = false; note2.textContent = "The petition could not be carried. Try again."; });
    });
  };
  if (posts.length) {   /* the named posts: who holds each, or a way to ask for it */
    const list = el("ul", "posts");
    posts.forEach((p) => {
      const li = el("li", p.holder ? "held" : "vacant"), words = el("span", "pwords"); words.append(el("span", "pname", p.name)); if (p.about) words.append(el("span", "pabout", p.about));
      const who = el("span", "pholder"); who.append(p.fellow ? fellowLink(p.holder) : (p.holder || "Open")); li.append(words, who);
      if (!p.holder && open && !asked) li.append(opt("Apply", () => form(p.name), "papply"));
      list.append(li);
    });
    rwin.append(list);
  }
  if (others.length) { const list = el("ul", "party"); others.forEach((n) => { const li = el("li"); li.append(fellowLink(n)); list.append(li); }); if (posts.length) rwin.append(el("p", "sub partynote", "Also of the company")); rwin.append(list); }
  else if (!posts.length) rwin.append(el("p", "sub partynote", "None yet has thrown in with this venture."));
  if (!open) return;
  rwin.append(box);
  if (asked) { box.append(el("p", "sub partynote", "Your petition lies on the keeper's desk.")); return; }
  box.append(opt(posts.length ? "Petition without a post" : "Petition to join", () => form("")));
}
/* ---- The log as save files ----
   Each entry is shown like a save slot in an old game: its number, and a line saying how things stood when it was
   written (the level, the species, the landmarks). That line is worked out by counting only what carries a date on
   or before the entry's; things with no date are counted as having always been so. */
function standingAt(d) {
  const by = (x) => !day(x) || x.slice(0, 10) <= d, seen = new Set(); let xp = sorted.filter((p) => p.date.slice(0, 10) <= d).length * PAY.entry, species = 0, marks = 0;
  BESTIARY.forEach((b) => { const k = b.name.trim().toLowerCase(); if (b.status === "wanted" || !by(b.date) || seen.has(k)) return; seen.add(k); species++; xp += fishExp(b); });
  const there = PLACES.filter((p) => by(p.date)), trips = new Set(there.map((p) => p.trip).filter(Boolean)).size + there.filter((p) => p.kind === "trip" && !p.trip).length;
  there.forEach((p) => { const n = p.landmarks.filter((l) => l.visited).length; marks += n; xp += n * MAP_EXP.landmark + (p.kind !== "region" ? MAP_EXP.place : 0); if (p.landmarks.length >= 5 && n === p.landmarks.length) xp += MAP_EXP.mastered; });
  xp += trips * MAP_EXP.journey + ALBUMS.filter((a) => by(a.date)).reduce((t, a) => t + PAY.album + a.photos.length * PAY.photo, 0) + PLANTS.filter((p) => p.status === "living" && by(p.acquired)).reduce((t, p) => t + plantExp(p), 0);
  QUESTS.forEach((q) => { if (q.status === "completed" && by(q.completed)) xp += questExp(q) + q.objectives.filter((o) => o.done).length * PAY.objective; });
  return { level: Math.floor(Math.sqrt(xp / 10)) + 1, species, marks };
}
function saveLine(p) {
  const s = standingAt(p.date.slice(0, 10)), words = p.body.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").split(/\s+/).filter(Boolean).length;
  return ["Lv " + s.level, count(s.species, "species").replace("speciess", "species"), count(s.marks, "landmark"), Math.max(1, Math.round(words / 220)) + " min"].join("   ·   ");
}
/* ---- Remarks: lines left on an entry by companions, each beside their figure. They come from the same small
   server as the petitions and show only once the keeper has approved them. ---- */
let REMARKS = {};
function loadRemarks() {
  return fetch("/api/remarks", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !d.remarks || typeof d.remarks !== "object") return; REMARKS = {};
    for (const k of Object.keys(d.remarks)) if (Array.isArray(d.remarks[k])) REMARKS[k] = d.remarks[k].filter((m) => m && typeof m === "object" && text(m.body).trim() && text(m.name).trim()).slice(0, 200)
      .map((m) => ({ name: text(m.name).trim().slice(0, 40), seed: Number.isInteger(m.seed) && m.seed > 0 ? m.seed : 0, calling: text(m.calling).slice(0, 24), body: text(m.body).trim().slice(0, 240), at: day(text(m.at)) ? text(m.at).slice(0, 10) : "" }));
  }).catch(() => {});
}
function remarksBlock(p) {
  const said = owns(REMARKS, p.file) ? REMARKS[p.file] : [], box = el("div", "remarks"); if (!said.length && !partyOpen) return box;
  const head = el("p", "goalhead"); head.append(el("span", null, "Remarks of the company"), el("span", "lmcount", said.length ? String(said.length) : "")); box.append(head);
  if (said.length) { const list = el("ul", "said");
    said.forEach((m) => { const li = el("li"), pic = el("canvas", "rollpic"), w = el("span", "swords"), who = el("span", "sname"); pic.setAttribute("aria-hidden", "true"); drawCompanion(pic, m.name, m.seed, m.calling);
      who.append(fellowLink(m.name)); if (m.at) who.append(el("span", "sdate", day(m.at))); w.append(who, el("span", "sbody", m.body)); li.append(pic, w); list.append(li); });
    box.append(list); } else box.append(el("p", "sub partynote", "None of the company has yet remarked upon this."));
  if (!partyOpen) return box;
  const form = el("form", "petition"), line = el("input"), mail = el("input"), trap = el("input"), send = opt("Leave the remark"), note = el("p", "sub partynote"), l1 = el("label", null, "Your remark"), l2 = el("label", null, "The address you signed on with (so the page knows whose figure to draw; it is never shown)");
  line.type = "text"; line.maxLength = 240; line.required = true; line.autocomplete = "off"; line.id = "rline"; l1.htmlFor = "rline";
  mail.type = "email"; mail.maxLength = 120; mail.required = true; mail.autocomplete = "email"; mail.id = "rmail"; l2.htmlFor = "rmail";
  trap.type = "text"; trap.name = "website"; trap.tabIndex = -1; trap.autocomplete = "off"; trap.className = "trap"; trap.setAttribute("aria-hidden", "true");
  send.type = "submit"; note.setAttribute("role", "status"); note.textContent = "Remarks are for those of the company. The keeper reads each before it is shown.";
  const open = opt("Leave a remark", () => { open.remove(); form.hidden = false; line.focus(); }); form.hidden = true;
  form.append(l1, line, l2, mail, trap, send, note); box.append(open, form);
  form.addEventListener("submit", (e) => {
    e.preventDefault(); if (!line.value.trim() || !mail.value.trim() || send.disabled) return; send.disabled = true; note.textContent = "Sending...";
    fetch("/api/remark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entry: p.file, email: mail.value, body: line.value, website: trap.value }) })
      .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) { send.disabled = false; note.textContent = text(d.error) || "The remark could not be carried. Try again."; return; } form.textContent = ""; form.append(el("p", "sub partynote", "Your remark has been carried to the keeper, who will read it before anyone else does.")); })
      .catch(() => { send.disabled = false; note.textContent = "The remark could not be carried. Try again."; });
  });
  return box;
}
/* ---- The order of march: a quest's company drawn in a row, the keeper at the front, each under the name of their
   post. A post nobody holds yet is an empty place in the line. ---- */
function march(q) {
  const ro = roster(q), all = companions(), row = el("div", "march"), place = (pic, name, post, cls) => { const d = el("div", "mplace" + (cls ? " " + cls : "")); d.append(pic, el("span", "mname", name), el("span", "mpost", post)); d.style.setProperty("--n", row.childElementCount); row.append(d); };
  const kp = el("canvas", "mpic"); kp.setAttribute("aria-hidden", "true"); { const f = figurePic(FIGURE.stand); kp.width = f.width; kp.height = f.height; kp.getContext("2d").drawImage(f, 0, 0); }
  place(kp, STATUS.name || "The keeper", "The keeper");
  const drawn = (name) => { const c = all.find((x) => x.names.has(name.toLowerCase())), pic = el("canvas", "mpic"); pic.setAttribute("aria-hidden", "true"); if (c) drawCompanion(pic, c.name, c.seed, c.calling); return c ? pic : null; };
  ro.posts.forEach((p) => { if (p.holder && !p.fellow) return;   /* a post held in name only (by the keeper, say) has no one to draw */
    const pic = p.holder ? drawn(p.holder) : null; if (pic) place(pic, p.holder, p.name); else { const gap = el("span", "mgap", "?"); gap.setAttribute("aria-hidden", "true"); place(gap, "Open", p.name, "open"); } });
  ro.others.forEach((n) => { const pic = drawn(n); if (pic) place(pic, n, "Of the company"); });
  return row.childElementCount > 1 ? row : null;
}
/* ---- Equipment: what the keeper wears and carries, set out slot by slot as on an old equipment screen. The list
   is written in the editor (Status page). ---- */
let EQUIPMENT = [], gearKit = "angling";   /* what the keeper wears and carries, and which kit the screen is showing */
const KITS = { angling: ["Angling", "Rods, reels and lures, for waters where the fish have other plans."], likeness: ["Likenesses", "The camera and its eyes, carried into places where they are unwelcome."], dress: ["Dress", "What is worn, in black, by one who has not been asked why."] };
/* "Reach +3, Patience +2" and the like, added up across a kit: { Reach: 3, Patience: 2 } */
function kitTotals(items) { const t = {}; items.forEach((it) => { for (const m of String(it.bonus).matchAll(/([A-Za-z][A-Za-z ]*?)\s*([+-]\d+)/g)) { const k = m[1].trim(); t[k] = (t[k] || 0) + parseInt(m[2], 10); } }); return t; }
function showEquipment(focusFirst, kit) {
  if (owns(KITS, kit)) gearKit = kit; else if (!EQUIPMENT.some((it) => it.kit === gearKit)) gearKit = (EQUIPMENT[0] || {}).kit || "dress";
  openScreen("equip", "m-gear");
  main.append(el("p", "label", "Equipment"));
  const intro = el("div", "post intro"); intro.append(el("p", null, "What the keeper carries, by kit. Each piece is entered with what it confers; the keeper's reckoning of these figures is his own, and has not been audited.")); main.append(intro);
  if (!EQUIPMENT.length) { main.append(el("p", "sub", loadNote === "Loading..." ? loadNote : "Nothing is entered as worn or carried."), backRow()); return; }
  const tabs = el("div", "chips");
  Object.keys(KITS).forEach((k) => { const n = EQUIPMENT.filter((it) => it.kit === k).length; if (!n) return; const b = el("button", "chip", KITS[k][0] + "  " + n); b.type = "button"; b.setAttribute("aria-pressed", String(k === gearKit)); b.addEventListener("click", () => { showEquipment(false, k); const now = [...main.querySelectorAll(".chip")].find((c) => c.getAttribute("aria-pressed") === "true"); if (now) now.focus({ preventScroll: true }); }); tabs.append(b); });
  main.append(tabs);
  const set = EQUIPMENT.filter((it) => it.kit === gearKit), totals = kitTotals(set), sum = Object.keys(totals).map((k) => k + " " + (totals[k] >= 0 ? "+" : "") + totals[k]).join(",  ");
  main.append(statBlock([["The kit", KITS[gearKit][1]], ["Pieces", String(set.length)], ["Confers, in all", sum || "Nothing the keeper will put a figure to"]]));
  const wrap = el("div", "beasts equip"), list = el("div", "beastlist"), card = el("div", "beastcard");
  const show = (it, btn) => {
    list.querySelectorAll(".opt").forEach((o) => o.setAttribute("aria-pressed", String(o === btn))); card.textContent = ""; stopPortrait();
    if (gearKit === "dress") { const doll = el("canvas", "portrait"); doll.width = SPRITE_FRAMES[0][0].length * BIG; doll.height = SPRITE_FRAMES[0].length * BIG; doll.setAttribute("aria-hidden", "true"); card.append(doll); stopPortrait = figure(doll, "ease"); }   /* the keeper himself models the dress */
    else if (typeof conjure === "function" && conjure.paintGear) { const pic = el("canvas", "gearpic"); pic.setAttribute("aria-hidden", "true"); conjure.paintGear(pic, conjure.gearIcon(it.slot, it.kit)); card.append(pic); }
    const facts = el("dl", "facts"), fact = (k, v) => { if (v) facts.append(el("dt", null, k), el("dd", null, v)); };
    fact("Slot", it.slot); fact("Maker", it.maker); fact("Confers", it.bonus);
    card.append(el("h2", null, it.name), facts); if (it.about) { const lore = el("div", "post lore"); renderBody(it.about, lore); card.append(lore); }
    card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
  };
  set.forEach((it, i) => { const pick = () => { if (btn.getAttribute("aria-pressed") !== "true") show(it, btn); }, btn = opt(null, pick, "beast gear"); btn.addEventListener("focus", pick);
    const ic = el("canvas", "gearmini"); ic.setAttribute("aria-hidden", "true"); if (typeof conjure === "function" && conjure.paintGear) conjure.paintGear(ic, conjure.gearIcon(it.slot, it.kit));
    btn.append(ic, el("span", "num", it.slot), el("span", "name", it.name)); btn.style.setProperty("--i", Math.min(i, 8)); list.append(btn); });
  wrap.append(list, card); main.append(wrap, backRow()); show(set[0], list.querySelector(".opt"));
  if (focusFirst) list.querySelector(".opt").focus({ preventScroll: true });
}
/* ---- A quest fulfilled ----
   When a quest is marked Completed it gets a report at the top of its page, laid out the way games do it: first the
   celebration (a banner, and a fanfare if the music is on), then the results plainly (a grade, the experience
   counted up, the objectives), then everyone who was there with what it earned them, then the keeper's account
   of how it went. The first time a visitor opens it, it plays out in that order; any tap or key skips to the end.
   After that it is simply there to read. The grade is the keeper's (set in the editor) or, left empty, worked
   out from how many objectives were ticked. */
const GRADES = { S: "Beyond Reproach", A: "Handsomely Done", B: "Done", C: "Done, After a Fashion", D: "Survived" };
function questGrade(q) {
  if (owns(GRADES, q.grade)) return q.grade;
  const n = q.objectives.length, part = n ? q.objectives.filter((o) => o.done).length / n : .8;
  return part >= 1 ? "S" : part >= .8 ? "A" : part >= .6 ? "B" : part >= .4 ? "C" : "D";
}
const commendedOn = (q, c) => !!q.commended && c.names.has(q.commended.toLowerCase());   /* did this companion stand out on this quest? */
const COMPANION_PAY = { joined: 15, commended: 25 };   /* what a companion earns for signing on, and for standing out; a fulfilled quest pays them what it pays the keeper */
const myLot = () => { try { const v = JSON.parse(store.get("figure") || "[]"); return Array.isArray(v) && Number.isInteger(v[0]) ? v[0] : Number.isInteger(v) ? v : 0; } catch (e) { return 0; } };   /* the figure this visitor drew, if they signed on from this device */
const reportsSeen = () => { try { const v = JSON.parse(store.get("reports") || "[]"); return Array.isArray(v) ? v.map(text) : []; } catch (e) { return []; } };
function questReport(q) {
  const box = el("div", "qreport"), grade = questGrade(q), exp = questExp(q), fresh = !reduceMotion && !reportsSeen().includes(q.file), got = q.objectives.filter((o) => o.done).length;
  const stamp = el("div", "qgrade g" + grade), num = el("span", "qexpnum", "+" + (fresh ? 0 : exp) + " EXP"), bar = el("span", "xpbar"), fill = el("i"), top = el("div", "qresult"), words = el("div", "qwords");
  stamp.append(el("span", "letter", grade), el("span", "gword", GRADES[grade])); stamp.setAttribute("aria-label", "Grade " + grade + ", " + GRADES[grade]);
  fill.style.width = fresh ? "0%" : "100%"; bar.append(fill);
  words.append(num, bar, el("span", "qmeta", [q.completed ? "Fulfilled " + day(q.completed) : "", q.objectives.length ? got + " of " + q.objectives.length + " objectives" : "", q.reward ? "Spoils: " + q.reward : ""].filter(Boolean).join("   ·   ")));
  top.append(stamp, words); box.append(el("p", "qbanner", "Quest Fulfilled"), top);
  /* everyone who was there, and what it earned them */
  const roll = el("ul", "roll"), mine = myLot(), there = companions().filter((c) => c.posts.some((x) => x.quest === q));
  const line = (pic, name, post, earned, extra, you) => { const li = el("li", you ? "you" : null), w = el("span", "rwords"), e = el("span", "rearn"); w.append(name, el("span", "rpost", post)); e.append(el("span", null, earned)); if (extra) e.append(el("span", "rextra", extra)); li.append(pic, w, e); roll.append(li); };
  const kp = el("canvas", "rollpic"); kp.width = 45; kp.height = 58; kp.setAttribute("aria-hidden", "true"); { const k = kp.getContext("2d"), f = figurePic(FIGURE.stand); k.drawImage(f, 0, 0, f.width, f.height, 0, 0, 45, 58); }
  line(kp, el("span", "rname", STATUS.name || "The keeper"), "The keeper", "+" + exp + " EXP", "", false);
  there.forEach((c) => {
    const pic = el("canvas", "rollpic"); pic.setAttribute("aria-hidden", "true"); drawCompanion(pic, c.name, c.seed, c.calling);
    const post = c.posts.find((x) => x.quest === q), star = commendedOn(q, c), you = !!mine && c.seed === mine, nm = el("span", "rname"); nm.append(fellowLink(c.name)); if (you) nm.append(el("span", "ryou", "You"));
    line(pic, nm, post.role || "Of the company", "+" + (exp + (star ? COMPANION_PAY.commended : 0)) + " EXP", star ? "Commended" : "Bond +2", you);
  });
  box.append(el("p", "goalhead rollhead", "Those who saw it through"), roll);
  if (q.report) { const tell = el("div", "post"); renderBody(q.report, tell); box.append(el("p", "goalhead", "How it went"), tell); }
  const acts = el("div", "row"), album = q.album && ALBUMS.find((a) => a.title.toLowerCase() === q.album.toLowerCase() || a.file === q.album);
  if (album) acts.append(opt("The album", () => { closePost(); showAlbum(album); }));
  if (typeof conjure === "function") { const note = el("span", "sharenote"); note.setAttribute("role", "status"); acts.append(opt("Share the report", () => shareCard(reportCard(q, there), "half-life-" + q.file + ".png", q.title + ": quest fulfilled", note)), note); }
  if (acts.firstChild) box.append(acts);
  if (fresh) {   /* the first showing: it plays out, and any tap or key ends it early */
    box.classList.add("fresh"); let done = false; const t0 = performance.now();
    const finish = () => { if (done) return; done = true; box.classList.remove("fresh"); num.textContent = "+" + exp + " EXP"; fill.style.width = "100%"; store.set("reports", JSON.stringify(reportsSeen().concat(q.file).slice(-200))); document.removeEventListener("keydown", finish, true); box.removeEventListener("pointerdown", finish); };
    const tick = (now) => { if (done) return; if (!box.isConnected) return finish(); const p = Math.min(1, Math.max(0, (now - t0 - 900) / 1300)), e = 1 - Math.pow(1 - p, 3); num.textContent = "+" + Math.round(exp * e) + " EXP"; fill.style.width = e * 100 + "%"; if (now - t0 > 3600) finish(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick); fanfare(true); document.addEventListener("keydown", finish, true); box.addEventListener("pointerdown", finish);
  }
  return box;
}
/* ---- Cards to share ----
   A picture of a companion (or of a quest's report) made on the spot, in the site's look, for sending to friends or
   posting. It holds only what the site already shows. On a phone it opens the usual share sheet; elsewhere it is
   saved as a picture. Nothing is sent anywhere by the site itself. */
const CARD = { w: 1080, h: 1350, gold: "#ffd257", dim: "#c9d0ff" };
async function cardBase() {
  try { await Promise.all(['40px "Press Start 2P"', '30px "DotGothic16"', 'italic 30px "Newsreader"'].map((f) => document.fonts.load(f))); } catch (e) {}
  const cv = el("canvas"); cv.width = CARD.w; cv.height = CARD.h; const c = cv.getContext("2d");
  c.fillStyle = "#05071f"; c.fillRect(0, 0, CARD.w, CARD.h);
  for (let i = 0; i < 140; i++) { const x = (i * 7919) % CARD.w, y = (i * 104729) % CARD.h; c.fillStyle = "rgba(255,255,255," + (.25 + (i % 5) * .12) + ")"; c.fillRect(x, y, i % 4 ? 3 : 5, i % 4 ? 3 : 5); }   /* the drifting specks, stood still */
  const g = c.createLinearGradient(0, 40, 0, CARD.h - 40); g.addColorStop(0, "#2a3da6"); g.addColorStop(1, "#080d48");
  const round = (x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };   /* older browsers get square corners */
  c.fillStyle = g; round(40, 40, CARD.w - 80, CARD.h - 80, 26); c.fill();
  c.lineWidth = 10; c.strokeStyle = "#f6f2ff"; c.stroke(); c.lineWidth = 4; c.strokeStyle = "#8f98c8"; round(52, 52, CARD.w - 104, CARD.h - 104, 18); c.stroke();
  c.textBaseline = "top"; c.shadowColor = "rgba(0,0,0,.7)"; c.shadowOffsetX = 3; c.shadowOffsetY = 3;
  c.fillStyle = "#fff"; c.font = '34px "Press Start 2P", monospace'; c.fillText("HALF LIFE", 96, 100);
  c.fillStyle = CARD.dim; c.font = '32px "DotGothic16", monospace'; c.textAlign = "right"; c.fillText("halflife.studio", CARD.w - 96, 102); c.textAlign = "left";
  c.shadowOffsetX = c.shadowOffsetY = 0; c.fillStyle = "rgba(255,255,255,.3)"; c.fillRect(96, 160, CARD.w - 192, 3); c.fillRect(96, CARD.h - 170, CARD.w - 192, 3); c.shadowOffsetX = c.shadowOffsetY = 3;
  return { cv, c };
}
/* write text wrapped to a width; gives back where the next line would start. max: the most lines to write (the last is cut short with "...") */
function cardText(c, words, x, y, width, lead, max) {
  const list = String(words).split(/\s+/); let lineNow = "", n = 0;
  for (let i = 0; i < list.length; i++) {
    const tryIt = lineNow ? lineNow + " " + list[i] : list[i];
    if (c.measureText(tryIt).width <= width || !lineNow) { lineNow = tryIt; continue; }
    if (++n === max) { while (lineNow && c.measureText(lineNow + "...").width > width) lineNow = lineNow.slice(0, -1); c.fillText(lineNow + "...", x, y); return y + lead; }
    c.fillText(lineNow, x, y); y += lead; lineNow = list[i];
  }
  if (lineNow) { c.fillText(lineNow, x, y); y += lead; } return y;
}
function cardFigure(c, name, seed, calling, x, y, scale) { const t = el("canvas"); drawCompanion(t, name, seed, calling); if (!t.width) return; c.imageSmoothingEnabled = false; c.drawImage(t, x, y, t.width * scale, t.height * scale); }
/* who: { name, seed, calling, item, title, level, bond, lines: [short lines about them] } */
async function companionCard(who) {
  const { cv, c } = await cardBase(), w = what(who.name, who.seed, who.calling), X = 600, W = 384;
  cardFigure(c, who.name, who.seed, who.calling, 96, 200, 4.6);
  let size = 40; c.font = size + 'px "Press Start 2P", monospace'; while (size > 20 && c.measureText(who.name).width > W) { size -= 2; c.font = size + 'px "Press Start 2P", monospace'; }
  c.fillStyle = "#fff"; let y = cardText(c, who.name, X, 220, W, size * 1.5, 2) + 14;
  c.fillStyle = CARD.gold; c.font = '36px "DotGothic16", monospace'; y = cardText(c, w ? w.title : "", X, y, W, 44, 2) + 6;
  c.fillStyle = CARD.dim; c.font = '30px "DotGothic16", monospace'; if (who.title) y = cardText(c, who.title, X, y, W, 38, 2); y += 18;
  if (who.level) { c.fillStyle = "#fff"; c.font = '22px "Press Start 2P", monospace'; c.fillText("LEVEL " + who.level, X, y); y += 46;
    c.fillStyle = CARD.dim; c.font = '26px "DotGothic16", monospace'; c.fillText("Bond", X, y + 2); for (let i = 0; i < 5; i++) { c.fillStyle = i < who.bond ? CARD.gold : "rgba(255,255,255,.25)"; c.fillRect(X + 90 + i * 34, y + 4, 24, 24); } y += 56; }
  const item = w ? conjure.itemName(who.item) : "";
  if (item) { const t = el("canvas"); conjure.paintItem(t, who.item); c.imageSmoothingEnabled = false; c.drawImage(t, X - 8, y, 110, 110); c.fillStyle = CARD.dim; c.font = '26px "DotGothic16", monospace'; cardText(c, item, X + 112, y + 12, W - 112, 32, 3); }
  y = 790; c.fillStyle = "#fff"; c.font = '28px "DotGothic16", monospace';
  (who.lines || []).slice(0, 3).forEach((l) => { c.fillStyle = CARD.gold; c.fillRect(100, y + 10, 12, 12); c.fillStyle = "#fff"; y = cardText(c, l, 128, y, CARD.w - 228, 36, 2) + 4; });
  const tale = who.story || pastOf(who.name, who.seed, who.calling, who.item);   /* a companion with a record gets their annals on the card; a newcomer, their background */
  if (tale) { c.fillStyle = CARD.dim; c.font = 'italic 31px "Newsreader", Georgia, serif'; cardText(c, tale, 100, y + 18, CARD.w - 200, 42, Math.max(2, Math.floor((CARD.h - 190 - y - 18) / 42))); }
  c.fillStyle = CARD.dim; c.font = '26px "DotGothic16", monospace'; c.fillText("Lot No. " + lot(who.name, who.seed), 96, CARD.h - 140);
  c.textAlign = "right"; c.fillStyle = "#fff"; c.fillText("Draw your own lot: halflife.studio", CARD.w - 96, CARD.h - 140); c.textAlign = "left";
  return cv;
}
async function reportCard(q, there) {
  const { cv, c } = await cardBase(), grade = questGrade(q);
  c.fillStyle = CARD.gold; c.font = '26px "Press Start 2P", monospace'; c.fillText("QUEST FULFILLED", 96, 206);
  c.fillStyle = "#fff"; let size = 44; c.font = size + 'px "Press Start 2P", monospace'; let y = cardText(c, q.title, 96, 262, CARD.w - 192, 66, 3) + 20;
  c.fillStyle = { S: "#ffd257", A: "#7fd68a", B: "#8fd6ff", C: "#e0a8ff", D: "#c98a6a" }[grade]; c.font = '170px "Press Start 2P", monospace'; c.fillText(grade, 96, y + 6);
  c.fillStyle = "#fff"; c.font = '36px "DotGothic16", monospace'; c.fillText(GRADES[grade], 300, y + 24);
  c.fillStyle = "#7fd68a"; c.font = '30px "Press Start 2P", monospace'; c.fillText("+" + questExp(q) + " EXP", 300, y + 84);
  c.fillStyle = CARD.dim; c.font = '28px "DotGothic16", monospace'; c.fillText([q.completed ? day(q.completed) : "", QUEST_KINDS[q.kind][0], HARDNESS[q.difficulty]].filter(Boolean).join("  ·  "), 300, y + 136);
  y += 230; if (q.reward) { c.fillStyle = "#fff"; c.font = '30px "DotGothic16", monospace'; y = cardText(c, "Spoils: " + q.reward, 96, y, CARD.w - 192, 40, 2) + 10; }
  const kp = figurePic(FIGURE.stand), show = there.slice(0, 4), each = (CARD.w - 192) / (show.length + 1), fy = Math.max(y + 20, 800);
  c.imageSmoothingEnabled = false; c.drawImage(kp, 96 + (each - kp.width * 1.4) / 2, fy + 4, kp.width * 1.4, kp.height * 1.4);
  c.font = '22px "DotGothic16", monospace'; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText(STATUS.name || "The keeper", 96 + each / 2, fy + 340);
  show.forEach((m, i) => { const x = 96 + each * (i + 1); cardFigure(c, m.name, m.seed, m.calling, x + (each - 96 * 2.6) / 2, fy + 10, 2.6); c.fillStyle = commendedOn(q, m) ? CARD.gold : "#fff"; c.fillText(m.name.length > 16 ? m.name.slice(0, 15) + "." : m.name, x + each / 2, fy + 340); });
  c.textAlign = "left"; c.fillStyle = CARD.dim; c.font = '26px "DotGothic16", monospace'; if (there.length > 4) c.fillText("and " + (there.length - 4) + " more", 96, fy + 376);
  c.fillText("The whole account:", 96, CARD.h - 140); c.textAlign = "right"; c.fillStyle = "#fff"; c.fillText("halflife.studio", CARD.w - 96, CARD.h - 140); c.textAlign = "left";
  return cv;
}
/* hand the finished card to the device's share sheet, or save it as a picture where there is none. note: where to say what happened */
async function shareCard(making, fileName, title, note) {
  const say = (t) => { if (note) note.textContent = t; };
  try {
    say("Drawing the card..."); const cv = await making, blob = await new Promise((done) => cv.toBlob(done, "image/png")); if (!blob) throw new Error("no picture");
    const file = new File([blob], fileName, { type: "image/png" }), data = { files: [file], title, text: title + " - halflife.studio" };
    if (navigator.canShare && navigator.canShare(data)) { await navigator.share(data); say(""); return; }
    const a = el("a"), url = URL.createObjectURL(blob); a.href = url; a.download = fileName; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); say("Saved as a picture.");
  } catch (e) { say(e && e.name === "AbortError" ? "" : "The card could not be made."); }
}
function showQuest(q, from) {
  if (!(from && from.isConnected) && view !== "files" && view !== "quests") showFiles();
  current = null; questFrom = from && from.isConnected ? from : null; setHash("");
  if (isNew("quests", questMark(q))) { markKnown("quests", questMark(q)); main.querySelectorAll(".quest").forEach((b) => { if (b.dataset.quest === q.file) { const t = b.querySelector(".newtag"); if (t) t.remove(); } }); }
  rwin.textContent = "";
  const head = el("div", "filehead"), meta = el("p", "meta"), goals = el("ul", "goals"), got = q.objectives.filter((o) => o.done).length;
  meta.append(el("span", null, "Quest")); if (q.status === "completed") meta.append(el("span", "when", "Fulfilled")); else if (q.when) meta.append(el("span", "when", q.when));
  head.append(meta, el("h2", null, q.title));
  rwin.append(head);
  if (q.status === "completed") rwin.append(questReport(q), el("p", "goalhead", "The undertaking"));
  if (q.body) { const story = el("div", "post"); renderBody(q.body, story); rwin.append(story); }
  q.objectives.forEach((o) => { const li = el("li", o.done ? "done" : null); li.append(el("span", "tick"), el("span", null, o.text)); li.setAttribute("aria-label", o.text + (o.done ? ": done" : ": not yet")); goals.append(li); });
  const sheet = el("dl", "facts qstats"), row = (k, v) => { const dd = el("dd"); dd.append(v); sheet.append(el("dt", null, k), dd); };
  const hard = el("span", "hard h" + q.difficulty); hard.append(pips(q.difficulty), HARDNESS[q.difficulty]);
  row("Sort", QUEST_KINDS[q.kind][0]); row("Difficulty", hard);
  row("Experience", questExp(q) + (q.status === "completed" ? " earned" : " on completion"));
  if (q.reward) row("Spoils", q.reward);
  if (q.status === "completed") row("Fulfilled", q.completed ? day(q.completed) : "Yes");
  rwin.append(sheet);
  if (q.objectives.length) { const tally = el("p", "goalhead"); tally.append(el("span", null, "Objectives"), el("span", "lmcount", got + " / " + q.objectives.length)); rwin.append(tally, goals); }
  company(q);
  const nav = el("div", "row group"), pin = pinFor(q.place);
  nav.append(opt("Back", closePost));
  if (pin) nav.append(opt("Show on map", () => { closePost(); showMap(true, pin.file); }));
  rwin.append(nav);
  reader.hidden = false; document.body.style.overflow = "hidden"; syncLayers();
  rwin.classList.remove("pop"); void rwin.offsetWidth; rwin.classList.add("pop");
  rwin.scrollTop = 0; rwin.focus();
}
/* close whatever is in the pop-out window and put the cursor back on the row it was opened from */
function closePost() {
  if (reader.hidden) return;
  reader.hidden = true; document.body.style.overflow = ""; setHash(""); syncLayers();
  const back = questFrom && questFrom.isConnected ? questFrom : current ? [...main.querySelectorAll(".file")].find((b) => b.dataset.file === current.file) : null;
  { const e = reader.querySelector(".encounter"); if (e) e.remove(); }
  current = null; questFrom = null; if (back) back.focus();
  playMoments();
}
reader.addEventListener("click", (e) => { if (e.target === reader) closePost(); });
