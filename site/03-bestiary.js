/* ==========================================================================
   4. BESTIARY
   A list of fish on the left, the chosen one's card on the right.
   The pictures are all on one sheet, sprites.png, fetched once when the page
   loads (see section 15); sprites.json says where on the sheet each one is.
   Each is 96 x 64 (sprites.json gives the size), in full colour, and is shown
   on a small stage with water along the bottom (STAGE). There is one picture per species, found by the entry's file name
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
/* Every fish is shown on a little stage: the picture, with a strip of dark water along the bottom (STAGE). */
const STAGE = { w: 144, h: 108, surf: 78 }, stageX = () => Math.round((STAGE.w - FISH_SIZE[0]) / 2), stageY = () => STAGE.surf - FISH_SIZE[1] + 2;
function drawWater(c, tick, grey) {   /* the water along the foot of the stage: darker with depth, a lit edge where the surface catches the sun, and ripples drifting */
  const { w, h, surf } = STAGE, deep = h - surf, mix = (a, b, t) => "rgb(" + a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",") + ")";
  const top = grey ? [58, 60, 70] : [92, 34, 40], low = grey ? [18, 19, 24] : [20, 9, 14];
  for (let y = 0; y < deep; y++) { c.fillStyle = mix(top, low, Math.pow(y / (deep - 1), .7)); c.fillRect(0, surf + y, w, 1); }
  const glint = grey ? ["#8a8e9a", "#5a5e6a"] : ["#ffd257", "#ce5432"];
  for (let x = 0; x < w; x++) { const k = (x * 13 + Math.floor(tick / 3) * 7) % 23; if (k < 3) { c.fillStyle = k ? glint[1] : glint[0]; c.fillRect(x, surf, 1, 1); } }   /* the surface catching the light */
  for (let k = 0; k < 14; k++) {   /* ripples: short near the surface, longer below, each drifting its own way */
    const row = 2 + Math.floor((k * 7) % (deep - 3)), len = 2 + Math.round(row / deep * 8), dir = k % 2 ? 1 : -1;
    const x = ((k * 53 + dir * Math.floor(tick / (3 + k % 3))) % (w + len) + w + len) % (w + len) - len;
    c.fillStyle = grey ? "#4a4d58" : row < deep / 2 ? "#963414" : "#5a2228"; c.fillRect(x, surf + row, len, 1);
  }
  c.save(); c.globalCompositeOperation = "destination-out";   /* fade the water out at both ends, so it is a stretch of lake and not a block */
  for (let x = 0; x < 22; x++) { const a = Math.pow(1 - x / 22, 1.6); c.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")"; c.fillRect(x, surf, 1, deep); c.fillRect(w - 1 - x, surf, 1, deep); }
  c.restore();
}
function drawFish(canvas, kind, ghost, file) {   /* ghost: a shape only, for a fish not caught yet ("half" = a common one, shown a little clearer) */
  const key = fishKey(kind, file), [W, H] = FISH_SIZE; canvas.width = STAGE.w; canvas.height = STAGE.h;
  const src = owns(FISH, key) ? pixelsOf(FISH[key]) : null, c = canvas.getContext("2d");
  drawWater(c, 0, !!ghost);
  if (!src) return;   /* the pictures did not load: just the water */
  const pic = el("canvas"); pic.width = W; pic.height = H; const pc = pic.getContext("2d");
  if (!ghost) pc.putImageData(src, 0, 0);
  else {
    const p = src.data, out = pc.createImageData(W, H), o = out.data, body = (x, y) => x >= 0 && y >= 0 && x < W && y < H && p[(y * W + x) * 4 + 3] === 255;   /* is this spot part of the creature? */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (p[i + 3] !== 255) continue;
      const g = (body(x - 1, y) && body(x + 1, y) && body(x, y - 1) && body(x, y + 1)) ? (ghost === "half" ? GHOST_HALF : GHOST) : GHOST_EDGE;
      o[i] = g[0]; o[i + 1] = g[1]; o[i + 2] = g[2]; o[i + 3] = 255;
    }
    pc.putImageData(out, 0, 0);
  }
  c.drawImage(pic, stageX(), stageY());
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
   The pictures are stored still. The movement is made here, on the page
   (see leap()). The plants are left still. Only the picture on show moves, and nothing moves for a
   visitor who has asked their device for less motion.
   ========================================================================== */
let animTimer = null, DIVERS = [];
function stopAnim() { clearInterval(animTimer); animTimer = null; }
function animate(canvas, ms, step) {   /* run step(n) on a steady beat for as long as the picture is on the page */
  stopAnim(); let n = 0; step(0);
  animTimer = setInterval(() => { if (!canvas.isConnected) return stopAnim(); if (!document.hidden) step(++n); }, ms);
}
/* What each creature does on its stage. Fish breach: up out of the water nose first, over, and back in nose down,
   with a splash where they leave and where they land, and rings after. Crabs, crayfish and lobsters scuttle along the
   bottom; the squid jets up in pulses; the ray glides, its wings rippling. Under the surface a creature shows dim. */
const CRAWLERS = ["dungeness-crab", "red-rock-crab", "signal-crayfish", "california-spiny-lobster"], SWIMMERS = { "market-squid": "jet", "bat-ray": "glide" };
function leap(canvas, kind, file) {
  stopAnim(); if (reduceMotion) return;
  const key = fishKey(kind, file), src = owns(FISH, key) ? pixelsOf(FISH[key]) : null; if (!src) return;
  const [W, H] = FISH_SIZE, { w: SW, h: SH, surf } = STAGE, c = canvas.getContext("2d"); c.imageSmoothingEnabled = false;
  const p = src.data; let top = H, bottom = 0, left = W, right = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] === 255) { top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x); }
  if (top > bottom) return;
  const fw = right - left + 1, fh = bottom - top + 1, body = el("canvas"); body.width = fw; body.height = fh;
  { const full = el("canvas"); full.width = W; full.height = H; full.getContext("2d").putImageData(src, 0, 0); body.getContext("2d").drawImage(full, left, top, fw, fh, 0, 0, fw, fh); }
  const dim = el("canvas"); dim.width = fw; dim.height = fh; { const d = dim.getContext("2d"); d.drawImage(body, 0, 0); d.globalCompositeOperation = "source-atop"; d.fillStyle = "rgba(30,10,16,.72)"; d.fillRect(0, 0, fw, fh); }
  const restX = stageX() + left, restY = stageY() + top;   /* where the still picture has it */
  const drops = [], rings = [];
  const spray = (x, n, big) => { for (let i = 0; i < n; i++) drops.push({ x: x + (Math.random() - .5) * 8, y: surf, vx: (Math.random() - .5) * (big ? 2.4 : 1.4), vy: -(1.2 + Math.random() * (big ? 2.6 : 1.6)), life: 1 }); rings.push({ x, r: 2, life: 1 }); };
  const put = (x, y, a, under) => {   /* draw the creature with its middle at x, y, turned by a; whatever is below the surface shows dim */
    for (const [img, clip] of [[body, [0, 0, SW, surf]], [dim, [0, surf, SW, SH - surf]]]) {
      if (!under && img === dim && y - fh / 2 > surf + fh) continue;
      c.save(); c.beginPath(); c.rect(...clip); c.clip(); c.translate(Math.round(x), Math.round(y)); c.rotate(a); c.drawImage(img, -Math.round(fw / 2), -Math.round(fh / 2)); c.restore();
    }
  };
  const extras = () => {
    for (const r of rings) { r.r += .9; r.life -= .035; if (r.life > 0) { c.strokeStyle = "rgba(206,84,50," + (r.life * .7).toFixed(2) + ")"; c.lineWidth = 1; c.beginPath(); c.ellipse(r.x, surf + 1, r.r, r.r * .22, 0, 0, 7); c.stroke(); } }
    for (const d of drops) { d.x += d.vx; d.y += d.vy; d.vy += .22; d.life -= .03; if (d.y < surf && d.life > 0) { c.fillStyle = d.life > .5 ? "#ffd257" : "#ce5432"; c.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); } }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].y >= surf || drops[i].life <= 0) drops.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].life <= 0) rings.splice(i, 1);
  };
  const how = CRAWLERS.includes(key) ? "crawl" : SWIMMERS[key] || "breach";
  if (how === "breach") {
    const climb = Math.max(20, surf - fh / 2 - 3), turn = Math.min(.62, .34 + 18 / fw);   /* how high it gets, and how far it tips (a long fish tips less) */
    let start = 0, sx = 0, gap = 14, wasUp = false;
    animate(canvas, 50, (tick) => {
      c.clearRect(0, 0, SW, SH); drawWater(c, tick, false);
      const n = tick - start, LEAP = 26;
      if (n === 0) { sx = SW / 2 + (Math.random() - .5) * 18; gap = 10 + Math.floor(Math.random() * 18); }
      if (n < LEAP) {
        const u = n / (LEAP - 1), x = sx - 22 + 44 * u, y = surf + fh * .55 - (climb + fh * .55) * 4 * u * (1 - u), a = -turn + 2 * turn * u, up = y - fh * .3 < surf;
        if (up && !wasUp) spray(x - 6, 10, fw > 60); if (!up && wasUp) spray(x + 6, 14, fw > 60); wasUp = up;
        put(x, y, a, true);
      } else if (n >= LEAP + gap) { start = tick + 1; wasUp = false; }
      extras();
    });
  } else if (how === "crawl") {   /* along the bottom, side to side, stopping now and then */
    animate(canvas, 70, (tick) => {
      c.clearRect(0, 0, SW, SH); drawWater(c, tick, false);
      const cycle = tick % 80, go = cycle < 30 ? cycle / 30 : cycle < 40 ? 1 : cycle < 70 ? 1 - (cycle - 40) / 30 : 0, x = restX + fw / 2 - 16 + 32 * go;
      put(x, surf + 6 - fh / 2 + (cycle < 70 && cycle % 40 < 30 ? tick % 2 : 0), 0, true);
    });
  } else if (how === "jet") {   /* the squid, all under water: a quick push up, then drifting down */
    animate(canvas, 60, (tick) => {
      c.clearRect(0, 0, SW, SH); c.fillStyle = "#1e0e14"; c.fillRect(0, 0, SW, SH); drawWater(c, tick, false);
      const t = tick % 40, push = t < 6 ? t / 6 : 1 - (t - 6) / 34, y = surf - 18 - push * 26;
      c.save(); c.globalAlpha = .9; put(restX + fw / 2, y, -.12, false); c.restore();
      if (t === 1) for (let i = 0; i < 6; i++) drops.push({ x: restX + 4, y: y + 4, vx: -.8 - Math.random(), vy: Math.random() - .3, life: .8 });
      extras();
    });
  } else {   /* the ray, gliding just under and over the surface, wings beating slow */
    animate(canvas, 60, (tick) => {
      c.clearRect(0, 0, SW, SH); drawWater(c, tick, false);
      const y = surf - 22 + Math.sin(tick / 9) * 10, flap = 1 - .18 * (.5 + .5 * Math.sin(tick / 3)), x = restX + fw / 2 + Math.sin(tick / 23) * 10;
      c.save(); c.translate(0, y * (1 - flap)); c.scale(1, flap); put(x, y, Math.sin(tick / 9) * .08, true); c.restore();
      extras();
    });
  }
}
