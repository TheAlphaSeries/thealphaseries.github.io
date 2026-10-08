/* ==========================================================================
   3. HOME SCREEN AND SIMPLE PAGES
   The home screen lists the log entries, then the quest log beneath them.
   About and Help are plain pages of text.
   ========================================================================== */
/* Every screen starts the same way: note which screen is up, empty the main window, move the menu's marker. */
function openScreen(name, menuId) {
  view = name; main.textContent = ""; stopAnim();
  menu.querySelectorAll(".opt").forEach((b) => { if (b.id !== "m-music" && b.id !== "menutoggle") b.setAttribute("aria-current", String(b.id === menuId)); });
  { const on = $("#" + menuId); $("#menuwhere").textContent = on ? on.textContent : ""; }   /* the folded phone menu names the screen that is up */
  if (typeof sayHelp === "function" && !menu.contains(document.activeElement)) sayHelp(menuId);   /* the bar at the top says where you are */
}
/* 12 as XII: the writings are numbered as folios */
const roman = (n) => { let out = ""; for (const [v, r] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { out += r; n -= v; } return out; };
/* the "Back" option at the foot of a screen: returns to the home screen */
function backRow() { const nav = el("div", "row group"); nav.append(opt("Back", () => showFiles(true))); return nav; }

/* the home screen */
function showFiles(focusFirst) {
  openScreen("files", "m-files");
  const list = el("div", "files");
  sorted.forEach((p, i) => {
    const b = opt(null, () => {   /* flash the chosen row, then open it */
      if (reduceMotion) return showPost(p);
      if (b.classList.contains("chosen")) return;
      b.classList.add("chosen");
      setTimeout(() => { b.classList.remove("chosen"); if (b.isConnected && reader.hidden) showPost(p); }, 250);
    }, "file"); b.dataset.file = p.file;
    const nm = el("span", "name", p.title); if (isNew("entries", p.file)) nm.append(newTag());
    b.append(el("span", "slot", "Folio " + roman(sorted.length - i)), nm, el("span", "date", day(p.date)), el("span", "saveline", saveLine(p) + (p.place ? "   ·   " + p.place : "")));   /* laid out like a save slot: its number, its name, and how things stood */
    b.style.setProperty("--i", i);
    list.append(b);
  });
  main.append(list);
  if (!sorted.length) main.append(el("p", "sub", loadNote));
  if (sorted.length) showSaying();
  showQuests();   /* the latest happenings are in the Chronicle; the home screen keeps to the log and the quests */
  if (focusFirst) { const f = list.querySelector(".opt"); if (f) f.focus(); }
}
/* ----- the quest log: a small strip under the entries. Each quest shows its name, a vague "when" and
   how many objectives are done; choosing one opens it in the pop-out window. Real dates and place
   names are kept out of quests on purpose, because the site is public. ----- */
function showQuests() {
  if (!QUESTS.length) return;
  const active = QUESTS.filter((q) => q.status !== "completed"), done = QUESTS.filter((q) => q.status === "completed");
  const head = el("p", "label questhead", "Quests"), wrap = el("div", "quests");
  active.forEach((q, i) => {
    const got = q.objectives.filter((o) => o.done).length, b = opt(null, () => showQuest(q, b), "quest"), bar = el("span", "qbar");
    q.objectives.slice(0, 12).forEach((o) => bar.append(el("i", o.done ? "on" : null)));   /* one small square per objective, lit when done */
    const nm = el("span", "name", q.title); if (isNew("quests", questMark(q))) nm.append(newTag()); b.dataset.quest = q.file;
    b.append(nm, el("span", "when", q.when), bar, el("span", "qcount", q.objectives.length ? got + "/" + q.objectives.length : ""));
    b.style.setProperty("--i", Math.min(i, 6));
    wrap.append(b);
  });
  main.append(head, wrap);
  if (done.length) {
    const past = el("ul", "goals pastquests");
    done.forEach((q) => { const li = el("li", "done"); li.append(el("span", "tick"), el("span", null, q.title)); past.append(li); });
    main.append(el("p", "sub questdone", "Completed"), past);
  }
}
/* The Quest Log screen: every quest in full, the open ones first and the fulfilled ones kept below as a record.
   The home screen shows the same open quests as a short strip (showQuests above); both open the same pop-out. */
/* The game side of a quest. Difficulty runs 1 to 5; the sort of quest scales what it pays; a quest can also name
   its own experience. Experience is only earned when the quest is fulfilled (each objective ticked along the way
   pays a little by itself: see tally() in section 9b). */
const HARDNESS = ["", "Trifling", "Modest", "Arduous", "Perilous", "Ruinous"], PAYS = [0, 30, 60, 100, 160, 250];
const QUEST_KINDS = { main: ["Great Work", 1.5], side: ["Venture", 1], errand: ["Errand", .5] };
const questExp = (q) => (q.exp != null ? q.exp : Math.round(PAYS[q.difficulty] * QUEST_KINDS[q.kind][1] / 5) * 5);
const QUEST_RANKS = [[0, "Unproven"], [1, "Runner of Errands"], [3, "Journeyman of Small Matters"], [6, "Adept of the Road"], [10, "Veteran of Many Ends"], [16, "Finisher of Things"], [25, "One Whom Tasks Avoid"]];
function questTally() {   /* the keeper's standing as a finisher of quests */
  const done = QUESTS.filter((q) => q.status === "completed"), earned = done.reduce((n, q) => n + questExp(q), 0);
  const offered = QUESTS.filter((q) => q.status !== "completed").reduce((n, q) => n + questExp(q), 0);
  const r = rankOf(QUEST_RANKS, done.length), rank = [0, r.name], next = r.next ? [r.next.need + done.length, r.next.name] : null;
  const hardest = done.slice().sort((a, b) => b.difficulty - a.difficulty || questExp(b) - questExp(a))[0] || null;
  return { done: done.length, open: QUESTS.length - done.length, earned, offered, rank: rank[1], next: next ? [next[1], next[0] - done.length] : null, hardest };
}
function questTags(q) {   /* one line: what sort, how hard, what it pays */
  const line = el("span", "qtags"), hard = el("span", "hard h" + q.difficulty);
  hard.append(pips(q.difficulty), el("span", null, HARDNESS[q.difficulty]));
  hard.setAttribute("aria-label", "Difficulty " + q.difficulty + " of 5, " + HARDNESS[q.difficulty]);
  line.append(el("span", "qkind", QUEST_KINDS[q.kind][0]), hard, el("span", "qexp", (q.status === "completed" ? "" : "+") + questExp(q) + " EXP" + (q.status === "completed" ? " earned" : "")));
  return line;
}
function questRow(q, i) {
  const got = q.objectives.filter((o) => o.done).length, b = opt(null, () => showQuest(q, b), "quest" + (q.status === "completed" ? " fulfilled" : "")), bar = el("span", "qbar");
  const ro = roster(q), names = (owns(PARTY, q.file) ? PARTY[q.file] : []).map((m) => m.name);
  q.objectives.slice(0, 24).forEach((o) => bar.append(el("i", o.done ? "on" : null)));
  const nm = el("span", "name", q.title); if (isNew("quests", questMark(q))) nm.append(newTag()); b.dataset.quest = q.file;
  b.append(nm, el("span", "when", q.status === "completed" ? "Fulfilled" + (q.completed ? " " + day(q.completed) : "") + "   Grade " + questGrade(q) : q.when), questTags(q), bar, el("span", "qcount", q.objectives.length ? got + "/" + q.objectives.length : ""));
  if (q.reward) b.append(el("span", "qparty", "Spoils: " + q.reward));
  if (names.length) b.append(el("span", "qparty", "Company of " + (names.length + 1) + ": the keeper, " + names.join(", ")));
  else if (partyOpen && q.status !== "completed" && !ro.posts.length) b.append(el("span", "qparty", "Seeking companions"));
  if (ro.posts.length) b.append(el("span", "qparty", "Posts: " + ro.filled + " of " + ro.posts.length + " filled" + (ro.filled < ro.posts.length && q.status !== "completed" ? "  -  seeking " + ro.posts.filter((p) => !p.holder).map((p) => p.name).join(", ") : "")));
  b.style.setProperty("--i", Math.min(i, 6));
  return b;
}
function showQuestLog(focusFirst) {
  openScreen("quests", "m-quests");
  const open = QUESTS.filter((q) => q.status !== "completed"), done = QUESTS.filter((q) => q.status === "completed");
  main.append(el("p", "label", "Quest Log"));
  const intro = el("div", "post intro");
  intro.append(el("p", null, "The keeper's undertakings: in hand above, fulfilled below. Abandonment is not recorded, there being no column for it."));
  main.append(intro);
  if (!QUESTS.length) { main.append(el("p", "sub", loadNote === "Loading..." ? loadNote : "No undertakings are in hand."), backRow()); return; }
  const t = questTally(), facts = el("dl", "facts qstats"), fact = (k, v) => facts.append(el("dt", null, k), el("dd", null, v));
  fact("Standing", t.rank + (t.next ? "  (" + t.next[1] + " more to " + t.next[0] + ")" : ""));
  fact("Quests", t.open + " in hand  /  " + t.done + " fulfilled");
  fact("Experience", t.earned + " earned  /  " + t.offered + " on offer");
  if (t.hardest) fact("Hardest fulfilled", t.hardest.title + " (" + HARDNESS[t.hardest.difficulty] + ")");
  main.append(facts);
  const list = el("div", "questlog"); open.forEach((q, i) => list.append(questRow(q, i)));
  if (open.length) main.append(list); else main.append(el("p", "sub", "Nothing is in hand. The keeper is, for the moment, at liberty."));
  if (done.length) {
    const past = el("div", "questlog"); done.sort((a, b) => b.completed.localeCompare(a.completed)).forEach((q, i) => past.append(questRow(q, i)));   /* most recently finished first */
    main.append(el("p", "label questhead", "Fulfilled"), past);
  }
  showCompany();
  main.append(backRow());
  if (focusFirst) { const f = main.querySelector(".quest") || main.querySelector(".opt"); if (f) f.focus(); }
}
/* a plain page of text: About or Help */
function showPage(name, menuId, label, text) {
  openScreen(name, menuId);
  const body = el("div", "post"); renderBody(text, body);
  if (!body.firstChild) body.append(el("p", "sub", loadNote === "Loading..." ? loadNote : "Nothing here yet."));
  main.append(el("p", "label", label), body, backRow());
}

/* ==========================================================================
   3b. CHRONICLE
   One dated list of everything recorded on the site, newest first: entries
   written, fish caught, places reached, quests fulfilled, plants taken in,
   albums filed, companions joined. Nothing is typed in here by hand: it is
   gathered from the dates already given elsewhere. A thing with no date is
   left out. The home screen shows the latest few under "Lately".
   ========================================================================== */
const CHRON = { entry: "Writ", fish: "Catch", place: "Road", quest: "Quest", plant: "Green", album: "Likeness", company: "Company" };   /* the tag shown beside each kind of happening */
function chronicle() {
  const out = [], add = (date, kind, words, go, exp) => { if (day(date)) out.push({ date: date.slice(0, 10), kind, words, go, exp: exp || 0 }); };
  sorted.forEach((p) => add(p.date, "entry", "Wrote " + p.title, (from) => showPost(p, from), PAY.entry));
  const seen = new Set();   /* only the first catch of a species pays */
  BESTIARY.forEach((b, i) => {
    if (b.status === "wanted") return; const k = b.name.trim().toLowerCase(), first = !seen.has(k); seen.add(k);
    add(b.date, "fish", "Caught a " + b.name + (b.location ? " at " + b.location : ""), () => showBestiary(true, i), first ? fishExp(b) : 0);
  });
  PLACES.forEach((p) => { if (p.kind !== "region") add(p.date, "place", (p.kind === "home" ? "Settled in " : "Reached ") + p.name + (p.trip ? ", on the road through " + p.trip : ""), () => showMap(true, p.file), MAP_EXP.place); });
  QUESTS.forEach((q) => { if (q.status === "completed") add(q.completed, "quest", "Fulfilled " + q.title, (from) => showQuest(q, from), questExp(q)); });
  PLANTS.forEach((p) => add(p.acquired, "plant", "Took in " + p.name + (p.count > 1 ? " (" + p.count + ")" : ""), () => showPlants(p.kind, true)));
  ALBUMS.forEach((a) => add(a.date, "album", "Filed the likenesses of " + a.title, () => showAlbum(a), PAY.album));
  companions().forEach((c) => c.posts.forEach((x) => add(x.at, "company", c.name + " threw in with " + x.quest.title + (x.role ? " as " + x.role : ""), (from) => showCompanion(c, from))));
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
function chronRow(ev, i) {
  const b = opt(null, () => ev.go(b), "chron k-" + ev.kind);
  b.append(el("span", "cdate", day(ev.date).split(",")[0]), el("span", "ctag", CHRON[ev.kind]), el("span", "cwords", ev.words), el("span", "cexp", ev.exp ? "+" + ev.exp : ""));
  b.style.setProperty("--i", Math.min(i, 8));
  return b;
}
let chronKind = "";   /* which kind of happening the Chronicle is narrowed to; "" shows all */
function showChronicle(focusFirst) {
  openScreen("chron", "m-chron");
  main.append(el("p", "label", "Chronicle"));
  const intro = el("div", "post intro");
  intro.append(el("p", null, "The record entire, latest first. What carries no date is left out, the chronicler declining to guess."));
  main.append(intro);
  const all = chronicle();
  if (!all.length) { main.append(el("p", "sub", loadNote === "Loading..." ? loadNote : "Nothing here carries a date as yet."), backRow()); return; }
  const kinds = Object.keys(CHRON).filter((k) => all.some((e) => e.kind === k)); if (!kinds.includes(chronKind)) chronKind = "";
  const tabs = el("div", "chips");
  [""].concat(kinds).forEach((k) => {
    const n = k ? all.filter((e) => e.kind === k).length : all.length, b = el("button", "chip", (k ? CHRON[k] : "All") + "  " + n); b.type = "button"; b.setAttribute("aria-pressed", String(k === chronKind));
    b.addEventListener("click", () => { chronKind = k; showChronicle(false); const now = [...main.querySelectorAll(".chip")].find((c) => c.getAttribute("aria-pressed") === "true"); if (now) now.focus({ preventScroll: true }); });
    tabs.append(b);
  });
  main.append(tabs);
  const list = el("div", "chronlist"); let month = "";
  all.filter((e) => !chronKind || e.kind === chronKind).forEach((e, i) => {
    const m = MONTHS[+e.date.slice(5, 7) - 1] + " " + e.date.slice(0, 4);
    if (m !== month) { month = m; list.append(el("p", "cmonth", m)); }
    list.append(chronRow(e, i));
  });
  main.append(list, backRow());
  if (focusFirst) { const f = list.querySelector(".opt"); if (f) f.focus({ preventScroll: true }); }
}
/* the latest few happenings, under the quests on the home screen (entries are left out: they are listed just above) */
function showLately() {
  const recent = chronicle().filter((e) => e.kind !== "entry").slice(0, 3); if (!recent.length) return;
  const list = el("div", "chronlist"); recent.forEach((e, i) => list.append(chronRow(e, i)));
  const more = el("div", "row"); more.append(opt("The whole chronicle", () => showChronicle(true)));
  main.append(el("p", "label questhead", "Lately"), list, more);
}
