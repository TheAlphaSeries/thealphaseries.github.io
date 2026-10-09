/* ==========================================================================
   9b. STATUS
   The character sheet. The name, class and blurb come from pages/status.md;
   every number is counted from the rest of the site, so it keeps itself up
   to date. The level is worked out from those numbers (see tally()).
   ========================================================================== */
/* Count everything on the site, and turn it into experience and a level. */
const PAY = { entry: 8, album: 6, photo: 1, objective: 5 };   /* the flat rates; fish, plants, the map and quests set their own (FISH_EXP, PLANT_EXP, MAP_EXP, questExp) */
/* Every source of experience, one row each: [what, how it was earned, experience]. The level is worked out from
   the total of this list and nothing else, so the Status screen can show exactly where it came from. */
function ledger() {
  const ft = fishTally(), mt = mapTally(), gt = plantTally(PLANTS), qt = questTally();
  const photos = ALBUMS.reduce((n, a) => n + a.photos.length, 0), goals = QUESTS.reduce((n, q) => n + q.objectives.filter((o) => o.done).length, 0);
  return [
    ["Entries", count(sorted.length, "entry").replace("entrys", "entries") + " at " + PAY.entry, sorted.length * PAY.entry],
    ["Fish", count(ft.species, "species").replace("speciess", "species") + ", by rarity", ft.earned],
    ["Landmarks", mt.seen + " seen at " + MAP_EXP.landmark, mt.seen * MAP_EXP.landmark],
    ["Places", count(mt.places, "place") + " at " + MAP_EXP.place, mt.places * MAP_EXP.place],
    ["Journeys", count(mt.trips, "journey") + " at " + MAP_EXP.journey, mt.trips * MAP_EXP.journey],
    ["Regions mastered", mt.mastered + " at " + MAP_EXP.mastered, mt.mastered * MAP_EXP.mastered],
    ["Photographs", count(ALBUMS.length, "album") + " at " + PAY.album + ", " + count(photos, "photo") + " at " + PAY.photo, ALBUMS.length * PAY.album + photos * PAY.photo],
    ["Plants", gt.living + " living, by rarity", gt.earned],
    ["Quests fulfilled", String(qt.done), qt.earned],
    ["Objectives", goals + " ticked at " + PAY.objective, goals * PAY.objective]];
}
function tally() {
  const caught = BESTIARY.filter((b) => b.status !== "wanted"), ft = fishTally(), mt = mapTally(), qt = questTally();
  const photos = ALBUMS.reduce((n, a) => n + a.photos.length, 0), green = census(PLANTS);
  const xp = ledger().reduce((n, row) => n + row[2], 0);
  const level = Math.floor(Math.sqrt(xp / 10)) + 1, floor = 10 * (level - 1) * (level - 1), next = 10 * level * level;   /* each level takes more than the last */
  return { xp, level, into: xp - floor, span: next - floor, toNext: next - xp, entries: sorted.length, caught: caught.length, species: ft.species, allSpecies: ft.all,
    seen: mt.seen, marks: mt.marks, places: mt.places, trips: mt.trips, albums: ALBUMS.length, photos, green, questsDone: qt.done, questsOpen: qt.open };
}
function showStatus(focusFirst) {
  openScreen("status", "m-status");
  const t = tally(), wrap = el("div", "sheet"), who = el("div", "who"), pic = el("canvas", "portrait"), facts = el("dl", "facts stats"), bar = el("div", "xpbar"), fill = el("i");
  pic.width = SPRITE_FRAMES[0][0].length * BIG; pic.height = SPRITE_FRAMES[0].length * BIG; pic.setAttribute("aria-hidden", "true");
  stopPortrait(); stopPortrait = figure(pic, "ease");   /* the same figure that waves from the title screen, here standing at his ease */
  fill.style.width = Math.max(2, Math.min(100, t.into / t.span * 100)) + "%"; bar.append(fill);
  bar.setAttribute("role", "img"); bar.setAttribute("aria-label", t.toNext + " experience to the next level");
  const talk = el("button", "talkbtn"), says = el("p", "says"); talk.type = "button"; talk.setAttribute("aria-label", "Speak with the keeper"); says.hidden = true; says.setAttribute("role", "status");
  talk.append(pic); talk.addEventListener("click", () => { sfx("confirm"); keeperSays(says); });
  who.append(talk, says, el("h2", null, STATUS.name || "The Keeper"));
  if (STATUS.class) who.append(el("p", "class", STATUS.class));
  who.append(el("p", "level", "Level " + t.level), bar, el("p", "tonext", t.toNext + " to next level"));
  if (STATUS.home) { const home = el("p", "home"); home.append(el("span", null, "Home"), el("span", null, STATUS.home)); who.append(home); }
  const stat = (k, v) => facts.append(el("dt", null, k), el("dd", null, v));   /* one line of the sheet */
  stat("Entries written", String(t.entries));
  stat("Fish caught", t.caught + "  (" + t.species + " of " + t.allSpecies + " species)");
  stat("Landmarks seen", t.seen + " of " + t.marks);
  stat("Places reached", String(t.places));
  stat("Journeys made", String(t.trips));
  stat("Photographs", t.photos + (t.albums ? "  in " + count(t.albums, "album") : ""));
  stat("Plants", t.green.living + " living,  " + t.green.perished + " perished");
  stat("Quests", t.questsDone + " fulfilled,  " + t.questsOpen + " in hand");
  const right = el("div", "sheetcol"), ranks = el("dl", "facts stats"), book = el("dl", "facts stats ledger");
  [["As angler", rankOf(ANGLER_RANKS, t.species, t.allSpecies)], ["As wanderer", rankOf(EXPLORER_RANKS, t.seen, t.marks)], ["As gardener", rankOf(GARDEN_RANKS, t.green.living)], ["As finisher", rankOf(QUEST_RANKS, t.questsDone)]]
    .forEach(([k, r]) => ranks.append(el("dt", null, k), el("dd", null, r.name)));
  ledger().forEach(([k, how, xp]) => { const dd = el("dd"); dd.append(el("span", "how", how), el("span", "xp", String(xp))); book.append(el("dt", null, k), dd); });
  const sum = el("dd", "total"); sum.append(el("span", "how", "Level " + t.level), el("span", "xp", String(t.xp))); book.append(el("dt", "total", "Total"), sum);
  const done = completion(), tot = el("div", "complete");
  done.rows.forEach(([k, part, whole]) => { const line = el("span", "region"); line.append(el("span", "rname", k), meter(part, whole)); tot.append(line); });
  right.append(facts, el("p", "label sheethead", "Completion   " + done.all + "%"), tot, el("p", "label sheethead", "Standings"), ranks, el("p", "label sheethead", "Experience"), book);
  wrap.append(who, right);
  main.append(el("p", "label", "Status"), wrap);
  if (STATUS.body) { const words = el("div", "post lore"); renderBody(STATUS.body, words); main.append(words); }
  main.append(honourBlock());
  { const nav = backRow(); if (EQUIPMENT.length && !SHELVED.equipment) nav.append(opt("Equipment", () => showEquipment(true, "dress"))); main.append(nav); }
  if (focusFirst) main.querySelector(".opt").focus({ preventScroll: true });
}

/* ==========================================================================
   9c. HONOURS
   Medals for particular feats. Each is one line below: a short code name, a
   family (which sets the ribbon and the device on the medal), a grade (1
   bronze, 2 silver, 3 gold), the name, how it is won, and the test that
   decides it. They pay no experience; the feat itself already did. To add
   one, add a line. A medal not yet won is drawn as a dark locked shape.
   ========================================================================== */
const HONOURS = [
  ["wet-hook", "fish", 1, "The First Wet Hook", "Catch a fish of any kind.", (c) => c.ft.species >= 1],
  ["five-kinds", "fish", 1, "A Modest Slaughter", "Record five species.", (c) => c.ft.species >= 5],
  ["ten-kinds", "fish", 2, "Ten Kinds of Regret", "Record ten species.", (c) => c.ft.species >= 10],
  ["uncommon-luck", "fish", 2, "Something Out of the Ordinary", "Catch a fish that is Rare or better.", (c) => c.rareFish >= 1],
  ["heft", "fish", 2, "Heft", "Land a fish of five pounds or more.", (c) => !!c.ft.heaviest && c.ft.heaviest.weight >= 5],
  ["spoken-of", "fish", 3, "The Fish of Which They Speak", "Catch a Legendary fish.", (c) => c.legendFish >= 1],
  ["empty-lakes", "fish", 3, "The Lakes Stand Empty", "Record every species in the Bestiary.", (c) => c.ft.all > 0 && c.ft.species >= c.ft.all],
  ["out-of-doors", "map", 1, "Out of Doors", "See a first landmark.", (c) => c.mt.seen >= 1],
  ["ten-places", "map", 2, "A Man of Several Addresses", "Reach ten places.", (c) => c.mt.places >= 10],
  ["three-roads", "map", 2, "Three Roads Taken", "Make three journeys.", (c) => c.mt.trips >= 3],
  ["fifty-sights", "map", 2, "Fifty Sights", "See fifty landmarks.", (c) => c.mt.seen >= 50],
  ["region", "map", 3, "Nothing Left to Look At", "See every landmark of one region.", (c) => c.mt.mastered >= 1],
  ["one-leaf", "plant", 1, "Something Green", "Keep one plant alive.", (c) => c.gt.living >= 1],
  ["compost", "plant", 1, "The Compost Speaks", "Lose three plants. It is entered here without comment.", (c) => c.gt.perished >= 3],
  ["indoor-wood", "plant", 2, "The Indoor Wood", "Keep five plants alive at once.", (c) => c.gt.living >= 5],
  ["rare-leaf", "plant", 3, "A Leaf Beyond Price", "Keep alive a plant that is Epic or better.", (c) => c.rarePlant >= 1],
  ["one-end", "quest", 1, "A Thing Finished", "Fulfil a quest.", (c) => c.qt.done >= 1],
  ["peril", "quest", 2, "Against Advice", "Fulfil a quest rated Perilous or worse.", (c) => c.done.some((q) => q.difficulty >= 4)],
  ["great-work", "quest", 3, "A Great Work Concluded", "Fulfil a Great Work.", (c) => c.done.some((q) => q.kind === "main")],
  ["not-alone", "company", 1, "Not Alone", "Accept a first companion.", (c) => c.fellows >= 1],
  ["full-company", "company", 2, "Every Post Filled", "Fill every post of a quest.", (c) => c.fullCompany],
  ["five-fellows", "company", 3, "A Following", "Gather five companions.", (c) => c.fellows >= 5],
  ["first-word", "log", 1, "The First Word", "Write an entry.", (c) => c.t.entries >= 1],
  ["ten-entries", "log", 2, "A Habit of Record", "Write ten entries.", (c) => c.t.entries >= 10],
  ["likenesses", "log", 2, "Five and Twenty Likenesses", "File twenty-five photographs.", (c) => c.t.photos >= 25],
  ["level-5", "level", 1, "Of Some Account", "Reach level 5.", (c) => c.t.level >= 5],
  ["level-10", "level", 2, "Of Considerable Account", "Reach level 10.", (c) => c.t.level >= 10],
  ["level-20", "level", 3, "Of Alarming Account", "Reach level 20.", (c) => c.t.level >= 20]];
function honours() {
  const order = Object.keys(RARITY), first = new Map();
  for (const b of BESTIARY) if (b.status !== "wanted" && !first.has(b.name.trim().toLowerCase())) first.set(b.name.trim().toLowerCase(), b);
  const got = [...first.values()], done = QUESTS.filter((q) => q.status === "completed");
  const c = { t: tally(), ft: fishTally(), mt: mapTally(), gt: plantTally(PLANTS), qt: questTally(), done,
    rareFish: got.filter((b) => order.indexOf(b.rarity) >= 2).length, legendFish: got.filter((b) => b.rarity === "legendary").length,
    rarePlant: PLANTS.filter((p) => p.status === "living" && order.indexOf(p.rarity) >= 3).length,
    fellows: companions().length, fullCompany: QUESTS.some((q) => { const r = roster(q); return r.posts.length > 0 && r.filled === r.posts.length; }) };
  return HONOURS.map(([id, family, grade, name, how, test]) => { let won = false; try { won = !!test(c); } catch (e) {} return { id, family, grade, name, how, won }; });
}
const MEDAL_METAL = [null, ["#b87333", "#e6a868", "#7a4a1e", "#43240c"], ["#b8c0cc", "#f2f5fa", "#6e7786", "#343c4a"], ["#f0c040", "#fff4b0", "#a87818", "#5e4006"]];   /* bronze, silver, gold: face, light, shade, and the dark of the device */
const MEDAL_FAMILY = {   /* ribbon colour, and the 7x7 device struck into the medal */
  fish:    ["#3c8fd0", ["..###..", "#.####.", "######.", "#.####.", "..###..", ".......", "......."]],
  map:     ["#d0a030", [".#####.", ".#####.", ".####..", ".#.....", ".#.....", ".#.....", "###...."]],
  plant:   ["#4ea858", ["....##.", "..####.", ".#####.", ".####..", ".###...", "#......", "#......"]],
  quest:   ["#c04848", ["...#...", "...#...", "...#...", "...#...", ".#####.", "...#...", "...#..."]],
  company: ["#e08c58", [".#...#.", "###.###", ".#...#.", ".#...#.", "###.###", "###.###", "......."]],
  log:     ["#b8b0e8", ["##...##", "###.###", "###.###", "###.###", "###.###", ".##.##.", "......."]],
  level:   ["#a060d0", ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "#.....#"]] };
/* Double a small picture, rounding off its stair-steps. rows: arrays of single letters, "." for nothing. Done twice
   it gives a picture four times the size with smooth diagonals; the medals' devices and the keeper's figure use it. */
function doubled(rows) {
  const h = rows.length, w = rows[0].length, at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] : "."), out = Array.from({ length: h * 2 }, () => new Array(w * 2));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = rows[y][x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    out[y * 2][x * 2] = C === A && C !== D && A !== B ? A : P; out[y * 2][x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
    out[y * 2 + 1][x * 2] = D === C && D !== B && C !== A ? C : P; out[y * 2 + 1][x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return out;
}
const MEDAL_ORDER = ["fish", "map", "plant", "quest", "company", "log", "level"];   /* the medals' order in icons.png (after the 24 landmarks), each in bronze, silver, gold */
function drawMedal(canvas, h, locked) {   /* 64 x 76: a ribbon, a round medal lit from the upper left, and the family's device struck into it */
  { const f = MEDAL_ORDER.indexOf(h.family), art = f >= 0 ? iconPic(24 + f * 3 + Math.min(3, Math.max(1, h.grade || 1)) - 1, !locked, 2) : null;   /* the PixelLab medal, twice its size */
    if (art) { canvas.width = 64; canvas.height = 76; canvas.getContext("2d").drawImage(art, 0, 8); return; } }
  const W = 64, H = 76, [face, light, shade, ink] = MEDAL_METAL[h.grade] || MEDAL_METAL[1], fam = MEDAL_FAMILY[h.family] || MEDAL_FAMILY.level;
  canvas.width = W; canvas.height = H; const c = canvas.getContext("2d"), cx = 32, cy = 49, r = 24;
  if (locked) {   /* not yet won: a dark shape with a pale edge */
    c.fillStyle = "#14161f"; c.strokeStyle = "#8c92a8"; c.lineWidth = 2;
    c.beginPath(); c.rect(21, 1, 22, 26); c.fill(); c.stroke(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.stroke(); return;
  }
  let g = c.createLinearGradient(20, 0, 44, 0); g.addColorStop(0, fam[0]); g.addColorStop(1, "rgba(0,0,0,.35)");
  c.fillStyle = fam[0]; c.fillRect(20, 0, 24, 30); c.fillStyle = g; c.fillRect(20, 0, 24, 30);
  g = c.createLinearGradient(28, 0, 36, 0); g.addColorStop(0, "#fffdf4"); g.addColorStop(1, "#cfc8b4"); c.fillStyle = g; c.fillRect(28, 0, 8, 30);
  c.strokeStyle = "#0a0a14"; c.lineWidth = 2; c.strokeRect(20, -2, 24, 32);
  g = c.createRadialGradient(cx - 9, cy - 10, 2, cx, cy, r); g.addColorStop(0, light); g.addColorStop(.45, face); g.addColorStop(1, shade);
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = g; c.fill(); c.strokeStyle = "#0a0a14"; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.arc(cx, cy, r - 4, 0, 7); c.strokeStyle = shade; c.lineWidth = 1.5; c.stroke();                       /* the raised rim */
  c.beginPath(); c.arc(cx, cy, r - 2.5, 3.5, 4.9); c.strokeStyle = light; c.lineWidth = 2; c.stroke();                   /* a glint along its upper left */
  const dev = doubled(doubled(fam[1].map((row) => [...row]))), ox = cx - 14, oy = cy - 14 + (h.family === "fish" ? 4 : 0);
  for (const [dx, dy, col] of [[1, 1, light], [0, 0, ink]]) { c.fillStyle = col; dev.forEach((row, y) => row.forEach((ch, x) => { if (ch === "#") c.fillRect(ox + x + dx, oy + y + dy, 1, 1); })); }   /* struck in: dark, with a lit lower edge */
}
/* the block of medals on the Status screen */
function honourBlock() {
  const all = honours(), box = el("div", "honours"), head = el("p", "label sheethead", "Honours   " + all.filter((h) => h.won).length + " / " + all.length);
  all.forEach((h) => {
    const tile = el("div", "honour" + (h.won ? "" : " locked")), pic = el("canvas", "medal"), words = el("div");
    pic.setAttribute("aria-hidden", "true"); drawMedal(pic, h, !h.won);
    words.append(el("span", "hname", h.name), el("span", "hhow", h.how));
    tile.append(pic, words); box.append(tile);
  });
  const wrap = el("div", "honourwrap"); wrap.append(head, box); return wrap;
}
