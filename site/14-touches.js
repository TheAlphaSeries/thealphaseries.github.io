/* ==========================================================================
   14c. THE OLD-GAME TOUCHES
   Small things the old console games did, and their players still expect:
     - a help line: the bar at the top says what the highlighted command is
     - sounds: a blip as the cursor moves, a chime on confirm, a lower one
       on going back (only while the music is on)
     - NEW marks: an entry, quest or fish this visitor has not opened yet is
       marked, with a dot on its menu command, until they open it
     - Continue: on the title screen, a second button that goes straight to
       the newest entry they have not read
     - a gamepad works: the pad or stick moves, A confirms, B goes back
     - talk: choose the keeper's portrait on Status and he says something
     - and the old cheat code is recognised
   The NEW marks need to know what the visitor has already opened. That is
   kept as a short list in their own browser, like the other notes; a first
   visit marks nothing as new.
   ========================================================================== */
const HELPS = { "m-files": "The log: what was written, newest first.", "m-quests": "Undertakings in hand, those fulfilled, and the company.", "m-chron": "Everything recorded, in the order it befell.",
  "m-bestiary": "Fish caught, and fish still at large.", "m-plants": "The plants: the living and the perished.", "m-photos": "Likenesses, by album.", "m-map": "Where it all happened.",
  "m-status": "The keeper: level, standings, honours.", "m-prints": "The shop is shut.", "m-about": "What this is.", "m-how": "How to get about.", "m-music": "Music and sounds, on or off." };
const helpLine = $("#helpline");
function sayHelp(id) { helpLine.textContent = owns(HELPS, id) ? HELPS[id] : ""; }
menu.addEventListener("focusin", (e) => { const b = e.target.closest && e.target.closest(".opt"); if (b) sayHelp(b.id); });
menu.addEventListener("pointerover", (e) => { const b = e.target.closest && e.target.closest(".opt"); if (b) sayHelp(b.id); });
menu.addEventListener("pointerleave", () => { const on = menu.querySelector('.opt[aria-current="true"]'); sayHelp(on ? on.id : ""); });
menu.addEventListener("focusout", () => { const on = menu.querySelector('.opt[aria-current="true"]'); sayHelp(on ? on.id : ""); });
/* ---- sounds: short and plain, the same three everywhere ---- */
function sfx(kind) {
  if (!ac || !musicOn || ac.state !== "running") return;
  try { const t = ac.currentTime + 0.01;
    if (kind === "move") note(88, t, 0.05, 0.022, "square");
    else if (kind === "back") { note(76, t, 0.07, 0.03, "square"); note(69, t + 0.06, 0.1, 0.03, "square"); }
    else if (kind === "talk") note(72 + Math.floor(Math.random() * 5), t, 0.03, 0.014, "square");
    else { note(79, t, 0.06, 0.03, "square"); note(86, t + 0.055, 0.12, 0.03, "square"); }
  } catch (e) {}
}
document.addEventListener("click", (e) => {   /* confirm, or back, by what was chosen */
  const b = e.target.closest && e.target.closest(".opt, .chip, .plink, .fig"); if (!b || b.id === "m-music" || b.classList.contains("moment")) return;
  sfx(/^(Back|Close)$/.test(b.textContent.trim()) ? "back" : "confirm");
}, true);
document.addEventListener("keydown", (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey && introBox.classList.contains("done")) { if (/^Arrow/.test(e.key) && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || "")) sfx("move"); else if (e.key === "Escape") sfx("back"); } });
/* ---- NEW marks ---- */
let KNOWN = null;   /* what this visitor has already opened: { entries, quests, fish }, or nothing until the site has loaded */
function loadKnown() {
  let v = null; try { v = JSON.parse(store.get("known1") || "null"); } catch (e) {}
  const list = (x) => (Array.isArray(x) ? x.map(text) : []);
  if (v && typeof v === "object") KNOWN = { entries: list(v.entries), quests: list(v.quests), fish: list(v.fish) };
  else { KNOWN = { entries: sorted.map((p) => p.file), quests: QUESTS.map(questMark), fish: BESTIARY.filter((b) => b.status !== "wanted").map((b) => b.name) }; saveKnown(); }   /* a first visit: everything counts as seen */
}
const saveKnown = () => store.set("known1", JSON.stringify({ entries: KNOWN.entries.slice(-600), quests: KNOWN.quests.slice(-300), fish: KNOWN.fish.slice(-300) }));
const questMark = (q) => q.file + (q.status === "completed" ? "#done" : "");   /* a quest is new when first posted, and new again once fulfilled */
const isNew = (kind, id) => !!KNOWN && !KNOWN[kind].includes(id);
function markKnown(kind, id) { if (!KNOWN || KNOWN[kind].includes(id)) return; KNOWN[kind].push(id); saveKnown(); menuDots(); }
const newTag = () => el("span", "newtag", "NEW");
function menuDots() {   /* a dot on a menu command while something under it is new */
  const any = { "m-files": sorted.some((p) => isNew("entries", p.file)), "m-quests": QUESTS.some((q) => isNew("quests", questMark(q))), "m-bestiary": BESTIARY.some((b) => b.status !== "wanted" && isNew("fish", b.name)) };
  for (const id of Object.keys(any)) $("#" + id).classList.toggle("fresh", any[id]);
}
/* ---- Continue, on the title screen ---- */
function offerContinue() {
  const p = sorted.find((x) => isNew("entries", x.file)), b = $("#continuebtn"); if (!p || introBox.classList.contains("done")) { b.hidden = true; return; }
  b.textContent = "Continue:  " + p.title; b.hidden = false; b.onclick = (e) => { e.stopPropagation(); endIntro(); showPost(p); };
}
/* ---- a gamepad: its buttons are turned into the keys the page already understands ---- */
(function pad() {
  let held = "", since = 0, on = false;
  const press = (key) => { if (key === "Enter" && introBox.classList.contains("done")) { const a = document.activeElement; if (a && a !== document.body && a.click) a.click(); return; } document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); };
  const poll = (now) => {
    const g = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean); if (!g) { on = false; return; }
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes || [];
    const want = b(12) || ax[1] < -.6 ? "ArrowUp" : b(13) || ax[1] > .6 ? "ArrowDown" : b(14) || ax[0] < -.6 ? "ArrowLeft" : b(15) || ax[0] > .6 ? "ArrowRight" : b(0) || b(9) ? "Enter" : b(1) ? "Escape" : "";
    if (want && (want !== held || (/^Arrow/.test(want) && now - since > 260))) { press(want); since = now; }   /* a held direction repeats; a held button does not */
    held = want; requestAnimationFrame(poll);
  };
  window.addEventListener("gamepadconnected", () => { if (!on) { on = true; requestAnimationFrame(poll); } });
})();
/* ---- the old cheat code ---- */
(function cheat() {
  const want = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let at = 0;
  document.addEventListener("keydown", (e) => {
    if (!e.isTrusted) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; at = k === want[at] ? at + 1 : k === want[0] ? 1 : 0;
    if (at === want.length) { at = 0; momentQueue.unshift({ kind: "The old sign", title: "Recognised", sub: "Nothing is granted. It is, however, noted.", big: true }); clearTimeout(momentTimer); if (introBox.classList.contains("done")) nextMoment(); }
  }, true);
})();
/* ---- talk to the keeper ---- */
const SAYINGS = ["You find me at my ease. This should not be taken as an invitation.", "The fish are where they were. I have checked.", "I had a plant once that outlived two governments. It is listed among the perished.",
  "Ask me nothing about the third eye. It was there when I woke.", "The orb is not for sale. The staff is not for sale. Enquire again when the shop opens.", "A level is a small thing. I have several.",
  "The sun came up again today, which I am told should not be relied upon.", "Sign on to a quest if you must. The pay is nothing and the company is drawn by lot.", "I keep a log so that I may later dispute it.",
  "You have the look of someone about to give advice. Reconsider.", "Everything here is true, in the sense that it is written down.", "The map is accurate to within one grievance."];
let lastSaid = -1, talkTimer = null;
function keeperSays(box) {
  let n = Math.floor(Math.random() * SAYINGS.length); if (n === lastSaid) n = (n + 1) % SAYINGS.length; lastSaid = n;
  const line = SAYINGS[n]; clearInterval(talkTimer); box.hidden = false; box.setAttribute("aria-label", line);
  if (reduceMotion) { box.textContent = line; return; }
  let i = 0; box.textContent = ""; talkTimer = setInterval(() => { if (!box.isConnected || i >= line.length) return clearInterval(talkTimer); box.textContent = line.slice(0, ++i); if (i % 3 === 0 && line[i - 1] !== " ") sfx("talk"); }, 28);   /* letter by letter, as the old games spoke */
}
/* ---- how complete it all is: the things that can be finished, each by itself and all together ---- */
function completion() {
  const ft = fishTally(), mt = mapTally(), hs = honours(), rows = [["Species", ft.species, ft.all], ["Landmarks", mt.seen, mt.marks], ["Honours", hs.filter((h) => h.won).length, hs.length], ["Quests", QUESTS.filter((q) => q.status === "completed").length, QUESTS.length]].filter((r) => r[2] > 0);
  return { rows, all: rows.length ? Math.round(rows.reduce((t, r) => t + r[1] / r[2], 0) / rows.length * 100) : 0 };
}
