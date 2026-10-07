/* ==========================================================================
   14b. MOMENTS
   When something has been earned since this visitor last looked in (a level,
   a new standing, a quest fulfilled, a medal, a new species, a new entry), a
   small banner drops in to say so, with a few notes of fanfare if the music
   is on. To know what is new, the page keeps a short note of what was last
   seen in the visitor's own browser. It never leaves their device and holds
   nothing about them: only the level and the lists it last showed. A first
   visit shows no banners; it only takes the note.
   Add ?moments to the address to see a sample of the banners at any time.
   ========================================================================== */
const STANDINGS = [["As angler", ANGLER_RANKS], ["As wanderer", EXPLORER_RANKS], ["As gardener", GARDEN_RANKS], ["As finisher", QUEST_RANKS]];
const momentBox = $("#moments");
let momentQueue = [], momentTimer = null, momentsDone = false;
function standingsNow() { const t = tally(); return [rankOf(ANGLER_RANKS, t.species, t.allSpecies), rankOf(EXPLORER_RANKS, t.seen, t.marks), rankOf(GARDEN_RANKS, t.green.living), rankOf(QUEST_RANKS, t.questsDone)].map((r) => r.name); }
function fanfare(big) {   /* a few bright notes over the music; silent unless the music is on and already playing */
  if (!ac || !musicOn || ac.state !== "running") return;
  try { const t = ac.currentTime + 0.05; (big ? [74, 78, 81, 86] : [81, 86]).forEach((n, i) => { note(n, t + i * 0.11, 0.5, 0.07, "triangle"); note(n + 12, t + i * 0.11, 0.3, 0.02, "sine"); }); } catch (e) {}
}
function nextMoment() {
  clearTimeout(momentTimer); momentBox.textContent = "";
  if (!reader.hidden) return;   /* something is open to read: the remaining banners wait (closePost starts them again) */
  const m = momentQueue.shift(); if (!m) return;
  const card = el("button", "moment win"), words = el("span", "mwords"); card.type = "button"; card.setAttribute("aria-label", m.kind + ": " + m.title + ". Dismiss");
  if (m.medal) { const pic = el("canvas", "medal"); pic.setAttribute("aria-hidden", "true"); drawMedal(pic, m.medal, false); card.append(pic); } else card.append(el("span", "mstar"));
  words.append(el("span", "mkind", m.kind), el("span", "mtitle", m.title)); if (m.sub) words.append(el("span", "msub", m.sub));
  card.append(words); card.addEventListener("click", () => { if (m.go && reader.hidden) { clearTimeout(momentTimer); momentBox.textContent = ""; m.go(); } else nextMoment(); });   /* choosing a banner that leads somewhere goes there; the rest wait until the window is closed again */
  momentBox.append(card); fanfare(m.big);
  momentTimer = setTimeout(nextMoment, 4600);
}
function playMoments() { if (momentQueue.length && !momentBox.firstChild && introBox.classList.contains("done")) { clearTimeout(momentTimer); momentTimer = setTimeout(nextMoment, 1500); } }
function moments() {   /* runs once, after everything has loaded */
  if (momentsDone || loadNote.indexOf("Could not") === 0) return; momentsDone = true;
  const t = tally(), ranks = standingsNow(), won = honours().filter((h) => h.won);
  const fish = [...new Set(BESTIARY.filter((b) => b.status !== "wanted").map((b) => b.name))], done = QUESTS.filter((q) => q.status === "completed");
  const list = (v) => (Array.isArray(v) ? v.map(text) : []);
  let old = null; try { old = JSON.parse(store.get("seen1") || "null"); } catch (e) {}
  if (!old) $("#firstline").hidden = false;   /* a first visit: a line on the title screen saying what this is */
  const found = [];
  if (old && typeof old === "object") {
    const oldRanks = list(old.ranks), had = (key, v) => list(old[key]).includes(v);
    if (t.level > (+old.level || 0) && +old.level > 0) found.push({ kind: "Level up", title: "Level " + t.level, sub: "The keeper has grown since you last looked in.", big: true });
    STANDINGS.forEach(([label, ladder], i) => {   /* only a step up is announced */
      const at = (name) => ladder.findIndex((r) => r[1] === name);
      if (oldRanks[i] && at(ranks[i]) > at(oldRanks[i]) && at(oldRanks[i]) >= 0) found.push({ kind: "New standing", title: ranks[i], sub: label, big: true });
    });
    done.forEach((q) => { if (!had("quests", q.file)) found.push({ kind: "Quest fulfilled", title: q.title, sub: "Grade " + questGrade(q) + "   +" + questExp(q) + " experience   (open the report)", big: true, go: () => showQuest(q) }); });
    won.forEach((h) => { if (!had("honours", h.id)) found.push({ kind: "Honour won", title: h.name, sub: h.how, medal: h }); });
    fish.forEach((n) => { if (!had("fish", n)) found.push({ kind: "New species", title: n, sub: "Entered in the Bestiary" }); });
    sorted.forEach((p) => { if (!had("entries", p.file)) found.push({ kind: "New in the log", title: p.title, sub: day(p.date) }); });
  }
  /* the note only ever grows, so a thing announced once is never announced again */
  const keep = (key, now) => [...new Set(list(old && old[key]).concat(now))].slice(-400);
  store.set("seen1", JSON.stringify({ level: Math.max(t.level, (old && +old.level) || 0), ranks, quests: keep("quests", done.map((q) => q.file)), honours: keep("honours", won.map((h) => h.id)),
    fish: keep("fish", fish), entries: keep("entries", sorted.map((p) => p.file)) }));
  if (/[?&]moments\b/.test(location.search)) {   /* a sample, for looking at the banners */
    found.length = 0; found.push({ kind: "Level up", title: "Level " + t.level, sub: "A sample of the banner.", big: true }, { kind: "New standing", title: ranks[0], sub: "As angler", big: true });
    if (won[0]) found.push({ kind: "Honour won", title: won[0].name, sub: won[0].how, medal: won[0] });
  }
  const more = found.length - 5;
  momentQueue = found.slice(0, 5); if (more > 0) momentQueue.push({ kind: "And more besides", title: count(more, "further matter"), sub: "See the Chronicle" });
  playMoments();
}
