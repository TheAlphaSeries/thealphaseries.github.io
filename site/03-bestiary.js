/* ==========================================================================
   4. BESTIARY
   A list of fish on the left, the chosen one's card on the right.
   The pictures are all on one sheet, sprites.png, fetched once when the page
   loads (see section 15); sprites.json says where on the sheet each one is.
   Each is 144 pixels square, in full colour, already drawn in its pose with
   its splash. There is one picture per species, found by the entry's file name
   ("001-rainbow-trout" uses "rainbow-trout"); a species with no picture of
   its own falls back to the general picture for its kind (FISH_ALIAS).
   drawFish() copies a picture onto the page. A fish not yet caught is drawn
   as a dark shape with a pale edge.
   The pictures are made by the scripts in tools/sprites; nothing on this
   page needs to understand how.
   ========================================================================== */
let FISH_SIZE = [144, 144], FISH = {}, FISH_ALIAS = {}, SHEET = null;   /* filled in from sprites.json and the picture sheet it names */
const owns = (o, k) => !!o && typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
/* One picture out of the sheet, as raw pixels (four numbers each: red, green, blue, and how solid). where: its
   [column, row] in the sheet. In these pictures the creature is fully solid (255) and the water one step less
   (254), which is how the page tells them apart. Gives nothing if the pictures did not load. */
const cutOuts = new Map();
function pixelsOf(where) {
  if (!SHEET || !Array.isArray(where) || !(where[0] >= 0) || !(where[1] >= 0)) return null;
  const key = where[0] + "," + where[1], [W, H] = FISH_SIZE; if (cutOuts.has(key)) return cutOuts.get(key);
  let d = null; try { if ((where[0] + 1) * W <= SHEET.canvas.width && (where[1] + 1) * H <= SHEET.canvas.height) d = SHEET.getImageData(where[0] * W, where[1] * H, W, H); } catch (e) {}
  cutOuts.set(key, d); return d;
}
const fishKey = (kind, file) => (owns(FISH, file) ? file : owns(FISH, kind) ? kind : owns(FISH_ALIAS, kind) ? FISH_ALIAS[kind] : FISH_ALIAS.fish);
const GHOST = [12, 13, 16], GHOST_HALF = [44, 47, 56], GHOST_EDGE = [124, 128, 140];   /* the greys that stand in for a fish not yet caught */
function drawFish(canvas, kind, ghost, file) {   /* ghost: a shape only, for a fish not caught yet ("half" = a common one, shown a little clearer) */
  const key = fishKey(kind, file), [W, H] = FISH_SIZE; canvas.width = W; canvas.height = H;
  const src = owns(FISH, key) ? pixelsOf(FISH[key]) : null, c = canvas.getContext("2d");
  if (!src) return;   /* the pictures did not load: leave the frame empty */
  if (!ghost) { c.putImageData(src, 0, 0); return; }
  const p = src.data, out = c.createImageData(W, H), o = out.data, body = (x, y) => x >= 0 && y >= 0 && x < W && y < H && p[(y * W + x) * 4 + 3] === 255;   /* is this spot part of the creature? */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (!p[i + 3]) continue; let g;
    if (p[i + 3] !== 255) { const l = Math.round((p[i] * .3 + p[i + 1] * .6 + p[i + 2] * .1) * .52); g = [l, l + 2, l + 10]; }   /* water turns grey, keeping how light or dark it was */
    else g = (body(x - 1, y) && body(x + 1, y) && body(x, y - 1) && body(x, y + 1)) ? (ghost === "half" ? GHOST_HALF : GHOST) : GHOST_EDGE;
    o[i] = g[0]; o[i + 1] = g[1]; o[i + 2] = g[2]; o[i + 3] = 255;
  }
  c.putImageData(out, 0, 0);
}
const RARITY = { common: ["Common", 1], uncommon: ["Uncommon", 2], rare: ["Rare", 3], epic: ["Epic", 4], legendary: ["Legendary", 5] };   /* name and how many pips of five */
function pips(filled, cls) {   /* a row of five small squares, some lit, like a stat in a game menu */
  const row = el("span", "pips" + (cls ? " " + cls : "")); row.setAttribute("aria-hidden", "true");
  for (let i = 1; i <= 5; i++) row.append(el("i", i <= filled ? "on" : null));
  return row;
}
/* ---- the game layer shared by the Bestiary, the Herbarium and the Map ----
   Each screen opens with a short stat block: a standing (a rank earned by doing the thing), how complete the
   collection is, and the experience it has paid. Experience from all of them adds up to the level on Status. */
/* A rank ladder is a list of [how many it takes, name]. When the collection has an end (every species, every landmark),
   pass that total: no rung may ask for more than exists, so the top rank is always reached by finishing the collection. */
function rankOf(ranks, n, total) {
  const rungs = [];
  for (const [need, name] of ranks) { const at = total == null ? need : Math.min(need, Math.max(total, 0)); if (rungs.length && rungs[rungs.length - 1][0] === at) rungs[rungs.length - 1][1] = name; else rungs.push([at, name]); }
  const now = rungs.filter((r) => n >= r[0]).pop() || rungs[0], next = rungs.find((r) => r[0] > n);
  return { name: now[1], next: next ? { name: next[1], need: next[0] - n } : null };
}
const standing = (ranks, n, total) => { const r = rankOf(ranks, n, total); return r.name + (r.next ? "  (" + r.next.need + " more to " + r.next.name + ")" : ""); };
function meter(part, whole, text) {   /* a bar filled part-way, with its numbers beside it */
  const wrap = el("span", "meter"), bar = el("span", "xpbar"), fill = el("i"), pct = whole ? Math.round(part / whole * 100) : 0;
  fill.style.width = (whole ? Math.max(part ? 3 : 0, Math.min(100, part / whole * 100)) : 0) + "%"; bar.append(fill); bar.setAttribute("aria-hidden", "true");
  wrap.append(bar, el("span", null, text || (part + " of " + whole + "  (" + pct + "%)"))); return wrap;
}
function statBlock(rows) {   /* rows: [label, text or element] */
  const dl = el("dl", "facts qstats"); rows.forEach(([k, v]) => { if (v == null || v === "") return; const dd = el("dd"); dd.append(v); dl.append(el("dt", null, k), dd); }); return dl;
}
const FISH_EXP = { common: 10, uncommon: 20, rare: 40, epic: 80, legendary: 160 }, fishExp = (b) => FISH_EXP[b.rarity] || 10;   /* what a first catch of a species pays */
const ANGLER_RANKS = [[0, "Dry Hook"], [1, "Wetter of Lines"], [5, "Angler of the Shallows"], [10, "Reader of Water"], [20, "Terror of the Middle Depths"], [35, "Emptier of Lakes"], [48, "He of Whom the Fish Speak"]];
function fishTally() {
  const first = new Map(), every = new Map();   /* one of each species, by name */
  for (const b of BESTIARY) { const k = b.name.trim().toLowerCase(); if (!every.has(k)) every.set(k, b); if (b.status !== "wanted" && !first.has(k)) first.set(k, b); }
  const got = [...first.values()], all = [...every.values()], order = Object.keys(RARITY);
  const tiers = order.map((r) => [r, got.filter((b) => b.rarity === r).length, all.filter((b) => b.rarity === r).length]).filter((t) => t[2]);
  const caught = BESTIARY.filter((b) => b.status !== "wanted");
  return { species: got.length, all: all.length, earned: got.reduce((n, b) => n + fishExp(b), 0), offered: all.filter((b) => !first.has(b.name.trim().toLowerCase())).reduce((n, b) => n + fishExp(b), 0), tiers,
    rarest: got.slice().sort((a, b) => order.indexOf(b.rarity) - order.indexOf(a.rarity))[0] || null, heaviest: caught.filter((b) => b.weight).sort((a, b) => b.weight - a.weight)[0] || null };
}
const PLANT_EXP = { common: 5, uncommon: 10, rare: 20, epic: 40, legendary: 80 }, plantExp = (p) => (PLANT_EXP[p.rarity] || 5) * p.count;   /* what a plant pays for as long as it lives */
const GARDEN_RANKS = [[0, "Blight Upon the Windowsill"], [1, "Keeper of a Single Leaf"], [3, "Waterer of Some Regularity"], [6, "Tender of the Green"], [10, "Warden of the Indoor Wood"], [20, "One for Whom Things Grow"]];
function plantTally(set) {
  const living = set.filter((p) => p.status === "living"), dead = set.filter((p) => p.status !== "living"), n = (list) => list.reduce((t, p) => t + p.count, 0), order = Object.keys(RARITY);
  return { living: n(living), perished: n(dead), earned: living.reduce((t, p) => t + plantExp(p), 0), forfeit: dead.reduce((t, p) => t + plantExp(p), 0),
    rarest: living.slice().sort((a, b) => order.indexOf(b.rarity) - order.indexOf(a.rarity))[0] || null };
}
const MAP_EXP = { landmark: 5, place: 10, journey: 25, mastered: 100 };   /* a landmark seen, a place reached, a journey made, and every landmark of a region seen */
const EXPLORER_RANKS = [[0, "Homebody"], [5, "Stroller of Near Streets"], [20, "Wayfarer"], [50, "Seasoned Wanderer"], [80, "Cartographer's Nuisance"], [120, "Walker of the Whole Map"], [200, "One Who Has Seen It"]];
function mapTally() {
  const marks = PLACES.reduce((n, p) => n + p.landmarks.length, 0), seen = PLACES.reduce((n, p) => n + p.landmarks.filter((l) => l.visited).length, 0);
  const regions = PLACES.filter((p) => p.landmarks.length >= 5).map((p) => ({ name: p.name, seen: p.landmarks.filter((l) => l.visited).length, all: p.landmarks.length }));
  /* a journey is a named trip (however many stops it has), or a trip pin that stands alone; a region is an area on the map, not a place reached */
  const trips = new Set(PLACES.map((p) => p.trip).filter(Boolean)).size + PLACES.filter((p) => p.kind === "trip" && !p.trip).length;
  const places = PLACES.filter((p) => p.kind !== "region").length, mastered = regions.filter((r) => r.seen === r.all).length;
  return { marks, seen, regions, trips, mastered, places, earned: seen * MAP_EXP.landmark + places * MAP_EXP.place + trips * MAP_EXP.journey + mastered * MAP_EXP.mastered };
}
/* the Bestiary screen. pick: which fish to open on (used when arriving from the map) */
let beastShow = "all", beastSort = "number";   /* which fish the Bestiary lists, and in what order */
function showBestiary(focusFirst, pick) {
  openScreen("bestiary", "m-bestiary");
  main.append(el("p", "label", "Bestiary"));
  if (BESTIARY_INTRO) { const intro = el("div", "post lore intro"); renderBody(BESTIARY_INTRO, intro); main.append(intro); }
  if (!BESTIARY.length) { main.append(el("p", "sub", loadNote === "Loading..." ? loadNote : "Nothing recorded yet."), backRow()); return; }
  /* A species is whatever was picked in the editor's Species list; an entry left on the
     generic choice is told apart by its name instead. */
  const caught = BESTIARY.filter((b) => b.status !== "wanted"), wanted = BESTIARY.length - caught.length;
  const kinds = (set) => new Set(set.map((b) => b.name.trim().toLowerCase())).size;   /* a species is told apart by its name */
  const ft = fishTally(), tiers = el("span", "tiers");
  ft.tiers.forEach(([r, got, all]) => { const t = el("span", "rarity " + r, RARITY[r][0] + " " + got + "/" + all); tiers.append(t); });
  const wrap = el("div", "beasts"), list = el("div", "beastlist"), card = el("div", "beastcard");
  const show = (b, btn) => {
    list.querySelectorAll(".opt").forEach((o) => o.setAttribute("aria-pressed", String(o === btn)));
    card.textContent = "";
    const ghost = b.status === "wanted", known = ghost && b.rarity === "common";   /* not caught yet: an outline and a rumour. A common one is half unlocked: its name is known */
    const pic = el("canvas", "fishpic"); pic.setAttribute("aria-hidden", "true"); drawFish(pic, b.sprite, ghost ? (known ? "half" : true) : false, b.file);
    if (b.photo && !ghost) {   /* with a photo on file, the drawing is a button that opens it */
      const open = el("button", "fishbtn"); open.type = "button"; open.setAttribute("aria-label", "See the photo of this " + b.name);
      open.append(pic, el("span", "hint", "View photo")); open.addEventListener("click", () => zoom(safeUrl(b.photo), b.name, open));
      card.append(open);
    } else card.append(pic);
    const facts = el("dl", "facts"), fact = (k, v, extra) => { const dd = el("dd", null, v); if (extra) dd.prepend(extra); facts.append(el("dt", null, k), dd); return dd; };
    if (b.rarity) fact("Rarity", RARITY[b.rarity][0], pips(RARITY[b.rarity][1])).className = "rarity " + b.rarity;
    if (ghost) {
      fact("Status", "Not yet caught");
      fact("Bounty", fishExp(b) + " EXP").className = "bounty";
      if (b.location) fact("Last seen", b.location);
    } else {
      if (b.catch_rate) fact("Catch rate", b.catch_rate + "%");
      if (b.fight) fact("Fight", b.fight + " / 5", pips(b.fight));
      fact("Weight", b.weight ? b.weight + " lb" : "-");
      fact("Length", b.length ? b.length + " in" : "-");
      if (b.lure) fact("Caught on", b.lure);
      if (b.location) fact("Where", b.location);
      if (b.date) fact("Caught", day(b.date));
      fact("Experience", "+" + fishExp(b) + " earned").className = "earned";
    }
    card.append(el("h2", null, ghost && !known ? "???" : b.name), facts);
    const pin = pinFor(b.location);
    if (pin) { const row = el("div", "row"); row.append(opt("Show on map", () => showMap(true, pin.file))); card.append(row); }
    if (b.lore) { const lore = el("div", "post lore"); renderBody(b.lore, lore); card.append(lore); }
    card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
    if (!ghost && isNew("fish", b.name)) { markKnown("fish", b.name); const t = btn.querySelector(".newtag"); if (t) setTimeout(() => t.remove(), 1600); }   /* looked at: no longer new */
    if (ghost) stopAnim(); else leap(pic, b.sprite, b.file);   /* a caught fish leaps; one still at large stays a still shape */
  };
  /* which to list, and in what order: as the old creature-books allowed. Each keeps its own number whatever the order. */
  if (BESTIARY[pick]) { beastShow = "all"; }
  const order = Object.keys(RARITY), named = (b) => !(b.status === "wanted" && b.rarity !== "common");
  let rows = BESTIARY.map((b, i) => [b, i]).filter(([b]) => beastShow === "all" || (beastShow === "caught") === (b.status !== "wanted"));
  if (beastSort === "rarity") rows.sort((x, y) => order.indexOf(y[0].rarity) - order.indexOf(x[0].rarity) || x[1] - y[1]);
  if (beastSort === "name") rows.sort((x, y) => named(y[0]) - named(x[0]) || (named(x[0]) ? x[0].name.localeCompare(y[0].name) : x[1] - y[1]));   /* those still unnamed go last */
  const chips = el("div", "chips"), chip = (label, on, go) => { const c = el("button", "chip", label); c.type = "button"; c.setAttribute("aria-pressed", String(on)); c.addEventListener("click", () => { go(); showBestiary(false); const now = [...main.querySelectorAll(".chip")].find((x) => x.textContent === label); if (now) now.focus({ preventScroll: true }); }); chips.append(c); };
  [["all", "All  " + BESTIARY.length], ["caught", "Caught  " + caught.length], ["wanted", "At large  " + wanted]].forEach(([k, label]) => chip(label, beastShow === k, () => { beastShow = k; }));
  chips.append(el("span", "chipgap"));
  [["number", "By number"], ["rarity", "By rarity"], ["name", "By name"]].forEach(([k, label]) => chip(label, beastSort === k, () => { beastSort = k; }));
  if (caught.length) { const go = el("div", "row"); go.append(opt("Cast a line", () => showFishing(go.firstChild))); main.append(go); }   /* the fishing game */
  main.append(chips);
  if (!rows.length) { main.append(el("p", "sub", beastShow === "caught" ? "Nothing has been caught yet." : "Nothing remains at large."), backRow()); return; }
  rows.forEach(([b, i], n) => {
    const pick = () => { if (btn.getAttribute("aria-pressed") !== "true") show(b, btn); };
    const btn = opt(null, pick, "beast");
    btn.addEventListener("focus", pick);   /* moving the cursor shows that fish */
    const ghost = b.status === "wanted", known = ghost && b.rarity === "common"; if (ghost) btn.classList.add(known ? "known" : "ghost");
    const nm = el("span", "name", ghost && !known ? "???" : b.name); if (!ghost && isNew("fish", b.name)) nm.append(newTag());
    btn.append(el("span", "num", String(i + 1).padStart(3, "0")), nm);
    btn.style.setProperty("--i", Math.min(n, 12)); btn.dataset.at = i;
    list.append(btn);
  });
  wrap.append(list, card); main.append(wrap);
  main.append(el("p", "label questhead", "The angler's standing"), statBlock([["Standing", standing(ANGLER_RANKS, ft.species, ft.all)], ["Species", meter(ft.species, ft.all)], ["By rarity", tiers],
    ["Experience", ft.earned + " earned  /  " + ft.offered + " still swimming"],
    ["Rarest catch", ft.rarest && ft.rarest.rarity ? ft.rarest.name + " (" + RARITY[ft.rarest.rarity][0] + ")" : ""], ["Heaviest", ft.heaviest ? ft.heaviest.name + ", " + ft.heaviest.weight + " lb" : ""]]));
  main.append(backRow());   /* the fish first; the reckoning after */
  const start = [...list.querySelectorAll(".opt")].find((o) => +o.dataset.at === pick) || list.querySelector(".opt");
  show(BESTIARY[+start.dataset.at], start);
  if (focusFirst) start.focus();
}

/* ==========================================================================
   4b. HERBARIUM
   The plants, kept like the Bestiary: a list on the left, the chosen plant's
   card on the right. Two collections, Bonsai and House plants, each with a
   notice at the top and a count of the living and the perished.
   PLANT holds the pictures, made and stored the same way as the fish and
   found the same way, by the entry's file name. Every plant has a second
   picture for when it has perished, stored under its name plus "~dead".
   ========================================================================== */
let PLANT = {}, PLANT_ALIAS = {};   /* filled in from sprites.json */
const COLLECTIONS = { house: "House Plants", bonsai: "Bonsai" };
let plantsKind = "house";   /* which collection the Herbarium screen is showing */
/* how many plants (not entries: one entry can stand for several) are living or perished */
const census = (set) => ({ living: set.filter((p) => p.status === "living").reduce((n, p) => n + p.count, 0), perished: set.filter((p) => p.status !== "living").reduce((n, p) => n + p.count, 0) });
const censusText = (c) => (c.living + c.perished ? c.living + " living  /  " + c.perished + " perished" : "None living");
function drawPlant(canvas, kind, dead, file) {
  let key = owns(PLANT, file) ? file : owns(PLANT, kind) ? kind : owns(PLANT_ALIAS, kind) ? PLANT_ALIAS[kind] : PLANT_ALIAS.plant;
  const [W, H] = FISH_SIZE; canvas.width = W; canvas.height = H;
  if (!owns(PLANT, key)) return;   /* the pictures did not load: leave the frame empty */
  if (dead && owns(PLANT, key + "~dead")) { key += "~dead"; dead = false; }   /* its own perished picture */
  const src = pixelsOf(PLANT[key]), c = canvas.getContext("2d"); if (!src) return;
  if (!dead) { c.putImageData(src, 0, 0); return; }
  const out = c.createImageData(W, H), p = src.data, o = out.data;   /* no perished picture: turn every colour to a dry brown of the same brightness */
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255; o[i] = Math.round(40 + l * 150); o[i + 1] = Math.round(34 + l * 118); o[i + 2] = Math.round(26 + l * 84); o[i + 3] = p[i + 3]; }
  c.putImageData(out, 0, 0);
}
/* the Herbarium screen. kind: which collection to show, "house" or "bonsai" */
function showPlants(kind, focusFirst) {
  if (!Object.prototype.hasOwnProperty.call(COLLECTIONS, kind)) kind = "house";
  openScreen("plants", "m-plants"); plantsKind = kind;
  const set = PLANTS.filter((p) => p.kind === kind), tabs = el("div", "chips");
  const gt = plantTally(PLANTS);
  main.append(el("p", "label", "Herbarium"), statBlock([["Standing", standing(GARDEN_RANKS, gt.living)], ["Survival", meter(gt.living, gt.living + gt.perished)],
    ["Experience", gt.earned + " earned  /  " + gt.forfeit + " forfeited"], ["Rarest living", gt.rarest && gt.rarest.rarity ? gt.rarest.name + " (" + RARITY[gt.rarest.rarity][0] + ")" : ""]]));
  Object.keys(COLLECTIONS).forEach((k) => {
    const b = el("button", "chip", COLLECTIONS[k]); b.type = "button"; b.setAttribute("aria-pressed", String(k === kind));
    b.addEventListener("click", () => showPlants(k, true)); tabs.append(b);
  });
  main.append(tabs);
  if (PLANT_INTRO[kind]) { const intro = el("div", "post lore intro"); renderBody(PLANT_INTRO[kind], intro); main.append(intro); }
  main.append(el("p", "tally", COLLECTIONS[kind] + ":  " + censusText(census(set))));
  if (!set.length) {
    main.append(el("p", "sub", loadNote === "Loading..." ? loadNote : kind === "bonsai" ? "No trees are yet named here." : "Nothing recorded yet."), backRow());
    if (focusFirst) main.querySelector('.chip[aria-pressed="true"]').focus({ preventScroll: true });
    return;
  }
  const wrap = el("div", "beasts"), list = el("div", "beastlist"), card = el("div", "beastcard");
  const show = (p, btn) => {
    list.querySelectorAll(".opt").forEach((o) => o.setAttribute("aria-pressed", String(o === btn)));
    card.textContent = "";
    const dead = p.status !== "living", pic = el("canvas", "plantpic"); pic.setAttribute("aria-hidden", "true"); drawPlant(pic, p.sprite, dead, p.file);
    if (p.photo) {   /* with a photo on file, the drawing is a button that opens it */
      const open = el("button", "fishbtn"); open.type = "button"; open.setAttribute("aria-label", "See the photo of this " + p.name);
      open.append(pic, el("span", "hint", "View photo")); open.addEventListener("click", () => zoom(safeUrl(p.photo), p.name, open));
      card.append(open);
    } else card.append(pic);
    const facts = el("dl", "facts"), fact = (k, v, extra) => { const dd = el("dd", null, v); if (extra) dd.prepend(extra); facts.append(el("dt", null, k), dd); return dd; };
    fact("Status", dead ? "Perished" : "Living").className = dead ? "perished" : "living";
    if (p.count > 1) fact("Kept", String(p.count));
    if (p.rarity) fact("Rarity", RARITY[p.rarity][0], pips(RARITY[p.rarity][1])).className = "rarity " + p.rarity;
    if (p.temper) fact("Temper", p.temper + " / 5", pips(p.temper));
    if (p.light) fact("Light", p.light);
    if (p.water) fact("Water", p.water);
    if (p.acquired) fact("Acquired", day(p.acquired));
    fact("Experience", dead ? plantExp(p) + " forfeited" : "+" + plantExp(p) + " while it lives").className = dead ? "perished" : "earned";
    card.append(el("h2", null, p.name)); if (p.botanical) card.append(el("p", "botanical", p.botanical));
    card.append(facts);
    if (p.lore) { const lore = el("div", "post lore"); renderBody(p.lore, lore); card.append(lore); }
    card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
  };
  set.forEach((p, i) => {
    const pick = () => { if (btn.getAttribute("aria-pressed") !== "true") show(p, btn); };
    const btn = opt(null, pick, "beast" + (p.status !== "living" ? " known" : ""));
    btn.addEventListener("focus", pick);   /* moving the cursor shows that plant */
    btn.append(el("span", "num", String(i + 1).padStart(3, "0")), el("span", "name", p.name + (p.count > 1 ? "  x" + p.count : "")));
    btn.style.setProperty("--i", Math.min(i, 8)); list.append(btn);
  });
  wrap.append(list, card); main.append(wrap, backRow());
  show(set[0], list.querySelector(".opt"));
  if (focusFirst) list.querySelector(".opt").focus({ preventScroll: true });
}

/* ==========================================================================
   4c. MOVING PICTURES
   The pictures are stored still. The movement is made here, on the page.
   A caught fish leaps: its picture is split into the creature and the water,
   the creature rises out of the water to the pose it was drawn in, hangs
   there, and falls back, while the splash swells and dies away with it. A
   fish drawn going in head first only wriggles where it is. The plants are
   left still. Only the picture on show moves, and nothing moves for a
   visitor who has asked their device for less motion.
   ========================================================================== */
let animTimer = null, DIVERS = [];
function stopAnim() { clearInterval(animTimer); animTimer = null; }
function animate(canvas, ms, step) {   /* run step(n) on a steady beat for as long as the picture is on the page */
  stopAnim(); let n = 0; step(0);
  animTimer = setInterval(() => { if (!canvas.isConnected) return stopAnim(); if (!document.hidden) step(++n); }, ms);
}
function leap(canvas, kind, file) {
  stopAnim(); if (reduceMotion) return;
  const key = fishKey(kind, file), src = owns(FISH, key) ? pixelsOf(FISH[key]) : null; if (!src) return;
  const [W, H] = FISH_SIZE, k = W / 96, line = Math.round(H * 88 / 96), crown = line - Math.round(3 * k), p = src.data;   /* line: the row where the water's surface lies. k: how much finer these pictures are than the grid they were planned on */
  const layer = () => { const c = el("canvas"); c.width = W; c.height = H; return c; }, body = layer(), wetA = layer(), wetB = layer();
  const bd = new ImageData(W, H), wa = new ImageData(W, H), wb = new ImageData(W, H), B = bd.data;
  const solid = (x, y) => x >= 0 && x < W && y >= 0 && y < H && p[(y * W + x) * 4 + 3] === 255, wet = (x, y) => x >= 0 && x < W && y >= 0 && y < H && p[(y * W + x) * 4 + 3] === 254;
  const copy = (to, x, y, fx, fy) => { const i = (y * W + x) * 4, j = (fy * W + fx) * 4; to[i] = p[j]; to[i + 1] = p[j + 1]; to[i + 2] = p[j + 2]; to[i + 3] = 255; };
  let top = H, bottom = 0, left = W, right = 0, wsum = 0, wn = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (wet(x, y)) {
        copy(wa.data, x, y, x, y); copy(wb.data, x, y, x, y);
        if ((x * 7 + y * 13) % 5 < 2) { const i = (y * W + x) * 4, f = p[i] > 200 ? .84 : 1.16; for (let n = 0; n < 3; n++) wb.data[i + n] = Math.min(255, p[i + n] * f); }   /* the second water picture: the same splash, glinting elsewhere */
        if (y >= crown - 2 * k) { wsum += x; wn++; }
      } else if (solid(x, y)) { copy(B, x, y, x, y); if (y < top) top = y; if (y > bottom) bottom = y; if (x < left) left = x; if (x > right) right = x; }
    }
    /* where spray was drawn across the creature, paint the creature back in underneath, so no gap shows when it moves */
    for (let x = 1; x < W - 1; x++) {
      if (!wet(x, y) || !solid(x - 1, y)) continue;
      let e = x; while (e < W && wet(e, y)) e++;
      if (e < W && solid(e, y) && e - x <= 12 * k) for (let i = x; i < e; i++) copy(B, i, y, i - x < (e - x) / 2 ? x - 1 : e, y);
      x = e;
    }
  }
  if (top > bottom) return;
  for (let x = 0; x < W; x++) {   /* and where the creature goes down into the water, carry it on below the surface */
    let y = line - 1; while (y >= 0 && !solid(x, y)) y--;
    if (y >= 0 && y < line - 1 && wet(x, y + 1)) for (let j = y + 1; j < line; j++) copy(B, x, j, x, y);
  }
  body.getContext("2d").putImageData(bd, 0, 0); wetA.getContext("2d").putImageData(wa, 0, 0); wetB.getContext("2d").putImageData(wb, 0, 0);
  const touch = bottom >= line - 5 * k, diver = DIVERS.indexOf(key) >= 0, rise = line - top + 1;
  const from = touch || !wn ? 0 : Math.max(-34 * k, Math.min(34 * k, wsum / wn - (left + right) / 2));   /* a fish drawn clear of the water starts from where its splash is */
  const R = 9, A = 11, F = 8, U = 15, c = canvas.getContext("2d"); c.imageSmoothingEnabled = false;
  const splash = (pic, shift, s) => {
    if (s > 0.04) c.drawImage(pic, 0, 0, W, crown, Math.round(shift), Math.round(crown * (1 - s)), W, Math.round(crown * s));
    c.drawImage(pic, 0, crown, W, H - crown, Math.round(shift), crown, W, H - crown);
  };
  animate(canvas, 85, (tick) => {
    const pic = Math.floor(tick / 3) % 2 ? wetB : wetA; let dx = 0, dy = 0, s1 = 1, s2 = 0, show = true;
    if (diver) dy = [0, 0, 1, 2, 3, 3, 2, 1][Math.floor(tick / 2) % 8] * k;
    else {
      const n = tick % (R + A + F + U);
      if (n < R) { const q = (n + 1) / R, e = 1 - q; dy = rise * e * e; dx = from * e; s1 = Math.min(1, .3 + .95 * q); }
      else if (n < R + A) { const q = (n - R) / A; s1 = touch ? 1 : 1 - .55 * q; }
      else if (n < R + A + F) { const q = (n - R - A + 1) / F; dy = rise * q * q; dx = -from * .35 * q; s1 = touch ? 1 + .18 * q : .45 * (1 - q); s2 = touch ? 0 : Math.max(0, (q - .45) * 2); }
      else { const q = (n - R - A - F + 1) / U; show = false; s1 = touch ? Math.max(0, 1.18 * (1 - q * 1.7)) : 0; s2 = touch ? 0 : Math.max(0, 1.1 * (1 - q * 1.7)); }
    }
    c.clearRect(0, 0, W, H);
    if (show) { c.save(); c.beginPath(); c.rect(0, 0, W, line); c.clip(); c.drawImage(body, Math.round(dx), Math.round(dy)); c.restore(); }
    splash(pic, 0, s1);
    if (s2 > 0.04) splash(pic, -from * 1.35, s2);
  });
}
