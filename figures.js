/* ---- The figure maker ----
   Every companion is drawn by lot from one number (their "seed"). The number picks a kind of creature, a calling,
   the colours, and the small details; the same number always draws the same figure. conjure(seed) builds the
   picture as a grid of colours and says what it drew. To add a kind of creature, add a line to KINDS and, if it
   needs ears or a tail of its own, a few lines under "the head" or "behind the body" in conjure(). To add a
   calling, add a line to CALLINGS. */
const LW = 24, LH = 30, UP = 4;   /* a figure is planned on a grid 24 wide and 30 tall, then drawn four times that size and smoothed */
const FW = LW * UP, FH = LH * UP;   /* how many pixels wide and tall the finished picture is */
const conjure = (function () {   /* everything inside is private to the figure maker, so its names cannot clash with the page's */
const tint = (hex, f) => { const n = parseInt(hex.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); return "#" + [n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, "0")).join(""); };
const NATURAL = ["#f1c9a5", "#e0ac7e", "#c68a5c", "#9c6239", "#6e4429"], HAIR = ["#1c1814", "#4a2c18", "#8a5a2c", "#c89a48", "#e8e0d0", "#a83a2a", "#5a5a6a", "#3a6ab0", "#8a4ab0", "#3a9a6a"];
const DYES = ["#a8323c", "#c85a28", "#c8982c", "#5c8a3a", "#2a8c8c", "#3c68b8", "#7a4cb4", "#b04888", "#8a8478", "#3a3a4a", "#e4dccc", "#205848"];
const METALS = ["#aab4c4", "#c8a850", "#6a7080", "#b87a4a"];
/* name, frame ("biped", "float" or "blob"), skins, [head half-width, head height, body half-width, body height, leg height], may it wear a hat, has it hair */
const KINDS = [
  ["Human", "biped", NATURAL, [5, 9, 4, 8, 4], true, true],
  ["Elf", "biped", NATURAL.concat(["#d8d0f0", "#c0e0d8"]), [5, 9, 4, 8, 5], true, true],
  ["Dwarf", "biped", NATURAL, [5, 9, 5, 7, 2], true, true],
  ["Orc", "biped", ["#6a9a48", "#4a7a3a", "#7a8a58", "#5a8a7a"], [5, 9, 5, 8, 4], true, true],
  ["Goblin", "biped", ["#9ab848", "#c8c050", "#78a868", "#b89a58"], [5, 8, 3, 6, 3], true, false],
  ["Lizardfolk", "biped", ["#4a9a58", "#2a8a8a", "#b85a3a", "#8a9a3a", "#5a6ab0"], [5, 9, 4, 8, 4], false, false],
  ["Catfolk", "biped", ["#d88a3a", "#8a8a94", "#2c2a30", "#e8e0d4", "#b89868"], [5, 9, 4, 8, 4], false, false],
  ["Birdfolk", "biped", ["#3a78c8", "#c83a3a", "#e8c840", "#e8e8f0", "#3a3a48", "#4aa868"], [5, 9, 4, 8, 4], false, false],
  ["Frogfolk", "biped", ["#5aa848", "#3a8ac8", "#e88a2a", "#c83a4a", "#8ab83a"], [6, 8, 4, 7, 3], false, false],
  ["Skeleton", "biped", ["#e8e4d4", "#d8d0b8", "#c8d8d0"], [5, 9, 4, 8, 4], true, false],
  ["Ghost", "float", ["#d8e8f8", "#c8f0d8", "#e0d0f8", "#f0e8c8"], [5, 9, 4, 8, 4], true, false],
  ["Slime", "blob", ["#5ac85a", "#4aa8e8", "#e85a8a", "#e8c83a", "#a85ae8", "#e8783a", "#48d8c8"], [6, 9, 6, 0, 0], true, false],
  ["Mushroom Folk", "biped", ["#c83a3a", "#8a4ab0", "#b87a3a", "#3a78c8", "#e8a83a", "#d85a9a"], [4, 8, 4, 7, 3], false, false],
  ["Golem", "biped", ["#8a8a84", "#a8885a", "#6a7a6a", "#7a6a8a", "#586878"], [4, 6, 6, 10, 4], false, false],
  ["Imp", "biped", ["#c83a3a", "#8a3ab0", "#3a5ac8", "#c85a2a", "#b03a78"], [5, 8, 3, 7, 3], false, false],
  ["Fishfolk", "biped", ["#3a8ac8", "#2aa8a0", "#e8783a", "#8a8ad8", "#c8c8d8"], [5, 9, 4, 8, 4], false, false],
  ["Shade", "biped", ["#1a1820", "#201a2a", "#141c24"], [5, 9, 4, 8, 4], true, false],
  ["Mothfolk", "biped", ["#b89868", "#e8e4d8", "#9ac878", "#8a7a9a", "#d8a878"], [5, 9, 4, 8, 4], false, false],
  ["Rootfolk", "biped", ["#8a6a3a", "#6a5a3a", "#a88a5a", "#5a6a4a"], [5, 9, 4, 8, 4], false, false],
  ["Foxfolk", "biped", ["#d8682a", "#e8e4dc", "#6a6a74", "#2c2830", "#c8a05a"], [5, 9, 4, 8, 4], false, false]];
/* name, clothes, hat, what is carried, what the other hand holds */
const CALLINGS = [
  ["Wanderer", "cloak", "hood", "staff", ""], ["Knight", "armour", "helm", "sword", "shield"], ["Mage", "robe", "wizard", "orb", "book"], ["Rogue", "tunic", "hood", "dagger", ""],
  ["Ranger", "tunic", "cap", "bow", "quiver"], ["Cleric", "robe", "circlet", "mace", "book"], ["Bard", "vest", "cap", "lute", ""], ["Alchemist", "apron", "bandana", "flask", ""],
  ["Angler", "vest", "straw", "rod", ""], ["Lamplighter", "cloak", "cap", "lantern", ""], ["Porter", "tunic", "bandana", "staff", "pack"], ["Cartographer", "vest", "turban", "scroll", ""],
  ["Cook", "apron", "toque", "ladle", ""], ["Boatman", "tunic", "straw", "oar", ""], ["Monk", "robe", "none", "beads", ""], ["Berserker", "vest", "horned", "axe", ""],
  ["Necromancer", "robe", "hood", "skull", ""], ["Merchant", "robe", "turban", "pouch", ""], ["Gardener", "apron", "straw", "can", ""], ["Smith", "apron", "bandana", "hammer", ""],
  ["Paladin", "armour", "circlet", "mace", "shield"], ["Witch", "robe", "wizard", "ladle", ""], ["Duelist", "vest", "cap", "sword", ""], ["Hermit", "cloak", "none", "lantern", "pack"]];
function conjure(seed, wanted) {   /* wanted: the calling the companion chose, if they chose one; otherwise that too is drawn by lot */
  let s = seed >>> 0 || 1; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)], chance = (p) => rnd() < p;
  const [kind, frame, skins, dims, hatOk, hairy] = pick(KINDS), drawn = pick(CALLINGS), [calling, clothes0, hat0, item, off] = CALLINGS.find((c) => c[0].toLowerCase() === String(wanted || "").toLowerCase()) || drawn;
  const skin = pick(skins), main = pick(DYES); let second = pick(DYES); if (second === main) second = tint(main, -.45);
  const accent = pick(["#f0c040", "#e8e6ff", "#ff7a5a", "#7fd6ff", "#9af08a", "#ff9ad8"]), metal = pick(METALS), hair = pick(HAIR), eye = pick(["#15131c", "#15131c", "#15131c", "#3a2a1a", "#1a3a5a"]);
  const glow = pick(["#ffd257", "#8fd6ff", "#9af08a", "#ff8a8a", "#e0a8ff"]), WOOD = "#8a5a2c", CREAM = "#efe6cc", STEEL = "#c8d0dc", BOOT = "#2a2018";
  const g = Array.from({ length: LH }, () => new Array(LW).fill(null)); let part = 0;
  const put = (x, y, c, flat) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < LW && y >= 0 && y < LH && c) g[y][x] = { c, p: part, flat: !!flat }; };
  const box = (x0, y0, x1, y1, c, flat) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c, flat); };
  const next = () => { part++; };
  let [hw, hh, bw, bh, lh] = dims; const clothes = frame === "float" && clothes0 !== "armour" ? "robe" : clothes0;
  const L = 12 - bw, R = 11 + bw, feet = 27, bb = feet - lh, bt = bb - bh + 1, hb = frame === "blob" ? 27 : bt - 1, ht = hb - hh + 1, HL = 12 - hw, HR = 11 + hw, er = ht + Math.floor(hh / 2) + (frame === "blob" ? 1 : 0);
  const sleeve = clothes === "vest" ? CREAM : clothes === "armour" ? metal : clothes === "apron" ? second : main, handY = bt + 5, HX = R + 2;   /* the carrying hand is on the right of the picture */
  const fur = kind === "Catfolk" || kind === "Foxfolk", pale = kind === "Foxfolk" || kind === "Catfolk" ? (skin === "#e8e0d4" || skin === "#e8e4dc" ? "#c8c0b4" : "#f0ece4") : tint(skin, .45);
  /* ---- behind the body: capes, packs, tails, wings ---- */
  if (frame === "biped") {
    if (kind === "Mothfolk") { next(); const wc = pick([tint(skin, -.25), "#c88a4a", "#a8d890", "#d8d0e8"]); for (let y = bt - 3; y <= bb + 2; y++) { const w = y < bt + 2 ? 4 + (y - bt + 3) : Math.max(2, 8 - (y - bt - 2)); box(L - 1 - w, y, L - 1, y, wc); box(R + 1, y, R + 1 + w, y, wc); } put(L - 5, bt + 1, accent, 1); put(R + 5, bt + 1, accent, 1); put(L - 4, bt + 5, tint(wc, -.4), 1); put(R + 4, bt + 5, tint(wc, -.4), 1); }
    if (kind === "Imp") { next(); const wc = tint(skin, -.4); for (let i = 0; i < 4; i++) { box(L - 2 - i, bt + i - 1, L - 2, bt + i - 1, wc); box(R + 2, bt + i - 1, R + 2 + i, bt + i - 1, wc); } }
    if (off === "pack") { next(); box(L - 2, bt, R + 2, bt + 5, "#7a5a34"); box(L - 1, bt - 2, R + 1, bt - 1, "#b8b0a0"); put(L - 2, bt + 2, "#c8a060", 1); put(R + 2, bt + 2, "#c8a060", 1); }
    else if (chance(.3) && clothes !== "cloak") { next(); for (let y = bt; y <= feet - 1; y++) box(L - 1 - (y > bt + 3 ? 1 : 0), y, R + 1 + (y > bt + 3 ? 1 : 0), y, second); }   /* a cape */
    if (off === "quiver") { next(); box(L - 1, bt - 3, L, bt + 1, "#7a5a34"); put(L - 1, bt - 4, accent, 1); put(L, bt - 5, "#e8e6ff", 1); put(L + 1, bt - 4, accent, 1); }
    const tailed = { Lizardfolk: skin, Catfolk: skin, Foxfolk: skin, Imp: skin, Fishfolk: tint(skin, -.2) }[kind];
    if (tailed) { next(); const ty = bb + 1; if (kind === "Foxfolk") { box(L - 5, ty - 4, L - 2, ty, tailed); box(L - 6, ty - 6, L - 4, ty - 3, tailed); box(L - 6, ty - 8, L - 5, ty - 7, pale); } else if (kind === "Lizardfolk" || kind === "Fishfolk") { box(L - 3, ty - 1, L - 1, ty + 1, tailed); box(L - 5, ty + 1, L - 3, ty + 2, tailed); put(L - 6, ty + 3, tailed); if (kind === "Fishfolk") { put(L - 7, ty + 2, tailed); put(L - 7, ty + 4, tailed); } } else { for (let i = 0; i < 5; i++) put(L - 2 - i, ty - Math.round(i * i / 4), tailed); put(L - 6, ty - 5, tailed); if (kind === "Imp") { put(L - 7, ty - 6, tailed); put(L - 6, ty - 7, tailed); put(L - 5, ty - 6, tailed); } } }
  }
  /* ---- legs and feet ---- */
  if (frame === "biped" && lh > 0) {
    const legc = clothes === "armour" ? tint(metal, -.15) : kind === "Birdfolk" ? "#e8a030" : clothes === "robe" ? main : kind === "Skeleton" ? skin : second;
    next(); box(12 - Math.min(bw, 4) + 1, bb + 1, 10, feet, legc); next(); box(13, bb + 1, 11 + Math.min(bw, 4) - 1, feet, legc);
    const boot = kind === "Birdfolk" ? "#e8a030" : ["Lizardfolk", "Frogfolk", "Fishfolk", "Golem", "Imp", "Catfolk", "Foxfolk", "Skeleton"].includes(kind) ? (fur ? pale : skin) : BOOT;
    next(); box(12 - Math.min(bw, 4), feet, 10, feet, boot); next(); box(13, feet, 11 + Math.min(bw, 4), feet, boot);
  }
  /* ---- the body and its clothes ---- */
  if (frame !== "blob") {
    const bare = kind === "Golem" || kind === "Skeleton" ? skin : null;
    next(); box(L, bt, R, bb, clothes === "armour" ? metal : clothes === "vest" ? CREAM : clothes === "cloak" ? second : main);
    if (clothes === "tunic") { box(L, bb - 2, R, bb - 2, tint(second, -.35), 1); put(11, bb - 2, accent, 1); for (let y = bt; y < bt + 2; y++) { put(11, y, tint(main, -.3), 1); put(12, y, tint(main, -.3), 1); } }
    if (clothes === "vest") { next(); box(L, bt, L + 1, bb, main); next(); box(R - 1, bt, R, bb, main); box(L, bb, R, bb, tint(second, -.3), 1); }
    if (clothes === "armour") { next(); box(11, bt + 1, 12, bb, main); next(); box(L - 1, bt, L + 1, bt + 1, tint(metal, .2)); next(); box(R - 1, bt, R + 1, bt + 1, tint(metal, .2)); box(L, bb - 1, R, bb - 1, tint(metal, -.35), 1); }
    if (clothes === "apron") { next(); box(L + 1, bt + 2, R - 1, Math.min(feet - 1, bb + 2), pick([CREAM, "#9a7248", "#d8d0c0"])); put(L + 1, bt + 1, CREAM, 1); put(R - 1, bt + 1, CREAM, 1); }
    if (clothes === "robe" || frame === "float") {
      next(); const end = frame === "float" ? feet : feet - 1;
      for (let y = bb + 1; y <= end; y++) { const w = y > bb + 2 ? 1 : 0; box(L - w, y, R + w, y, main); }
      if (frame === "float") for (let x = L - 1; x <= R + 1; x++) if ((x + (seed & 1)) % 3 === 0) { g[feet][x] = null; if (g[feet - 1][x]) g[feet - 1][x].c = tint(main, -.2); }   /* a ragged hem, and no feet under it */
      else box(L - 1, end, R + 1, end, second, 1);
      for (let y = bt + 1; y <= end - 1; y++) { put(11, y, second, 1); put(12, y, tint(second, -.2), 1); }
      box(L, bt + 4, R, bt + 4, tint(second, -.25), 1);
    }
    if (clothes === "cloak") { next(); for (let y = bt; y <= feet - 2; y++) { const w = y > bt + 2 ? 1 : 0; box(L - 1 - w, y, L + 1, y, main); box(R - 1, y, R + 1 + w, y, main); } put(11, bt, accent, 1); put(12, bt, accent, 1); box(L + 2, bb - 1, R - 2, bb - 1, tint(second, -.35), 1); }
    if (bare && clothes !== "armour" && clothes !== "robe") { /* bones and stone show at the chest */ if (kind === "Skeleton") for (let y = bt + 1; y < bt + 4; y++) { put(10, y, skin, 1); put(13, y, skin, 1); } }
    if (kind === "Golem") { put(L + 1, bt + 1, tint(skin, -.4), 1); put(R - 1, bb - 2, tint(skin, -.4), 1); put(11, bt + 3, glow, 1); put(12, bt + 3, glow, 1); if (chance(.5)) { put(L, bt, "#5a9a48", 1); put(L + 1, bt, "#5a9a48", 1); put(R, bt + 1, "#5a9a48", 1); } }
    /* arms: the left hangs, the right is held out to carry */
    const armc = kind === "Birdfolk" ? tint(skin, -.15) : kind === "Golem" ? skin : sleeve, hand = kind === "Shade" ? "#2a2634" : fur ? pale : skin;
    if (clothes !== "cloak") { next(); box(L - 2, bt + 1, L - 1, handY - 1, armc); next(); box(L - 2, handY, L - 1, handY, hand); }
    next(); box(R + 1, bt + 1, R + 2, handY - 1, clothes === "cloak" ? main : armc); next(); box(R + 1, handY, R + 2, handY, hand);
    if (kind === "Fishfolk") { put(L - 3, bt + 3, tint(skin, .3), 1); put(R + 3, bt + 3, tint(skin, .3), 1); }
  }
  /* ---- the head ---- */
  next();
  if (frame === "blob") {   /* a slime is all head: a glossy dome */
    for (let y = ht; y <= 27; y++) { const k = y - ht, w = k < 1 ? hw - 3 : k < 2 ? hw - 1 : k < 4 ? hw : y > 25 ? hw + 2 : hw + 1; box(12 - w, y, 11 + w, y, skin); }
    put(HL + 1, ht + 2, tint(skin, .6), 1); put(HL + 2, ht + 1, tint(skin, .6), 1); put(HL + 1, ht + 3, tint(skin, .4), 1); for (const [x, y] of [[9, 25], [14, 24], [12, 26]]) put(x, y, tint(skin, -.25), 1);
  } else {
    const face = kind === "Mushroom Folk" ? CREAM : skin;
    box(HL, ht + 1, HR, hb - 1, face); box(HL + 1, ht, HR - 1, ht, face); box(HL + 1, hb, HR - 1, hb, face);
  }
  const eyeL = 9, eyeR = 14, white = "#f4f4fa";
  if (kind === "Skeleton") { box(eyeL - 1, er - 1, eyeL, er, "#1a1620", 1); box(eyeR, er - 1, eyeR + 1, er, "#1a1620", 1); put(11, er + 1, "#1a1620", 1); for (let x = 9; x <= 14; x++) put(x, hb - 1, x % 2 ? "#1a1620" : white, 1); if (chance(.4)) { put(eyeL, er, glow, 1); put(eyeR, er, glow, 1); } }
  else if (kind === "Golem") { box(eyeL, er, eyeR, er, "#1a1620", 1); const one = chance(.5); if (one) box(11, er, 12, er, glow, 1); else { put(eyeL + 1, er, glow, 1); put(eyeR - 1, er, glow, 1); } put(HL, ht + 1, tint(skin, -.35), 1); put(HR, hb - 1, tint(skin, -.35), 1); }
  else if (kind === "Shade") { put(eyeL, er, glow, 1); put(eyeR, er, glow, 1); put(eyeL + 1, er, glow, 1); put(eyeR - 1, er, glow, 1); }
  else if (kind === "Ghost") { box(eyeL, er - 1, eyeL, er, "#2a2a4a", 1); box(eyeR, er - 1, eyeR, er, "#2a2a4a", 1); box(11, er + 2, 12, er + 2 + (chance(.5) ? 1 : 0), "#2a2a4a", 1); }
  else if (kind === "Frogfolk") { next(); box(HL, ht - 2, HL + 3, ht + 1, skin); next(); box(HR - 3, ht - 2, HR, ht + 1, skin); box(HL + 1, ht - 1, HL + 2, ht, white, 1); box(HR - 2, ht - 1, HR - 1, ht, white, 1); put(HL + 2, ht, eye, 1); put(HR - 2, ht, eye, 1); box(HL + 2, er + 1, HR - 2, er + 1, tint(skin, -.45), 1); box(HL + 2, er + 2, HR - 2, hb, pale, 1); }
  else if (kind === "Fishfolk") { box(eyeL - 1, er - 1, eyeL, er, white, 1); box(eyeR, er - 1, eyeR + 1, er, white, 1); put(eyeL, er, eye, 1); put(eyeR, er, eye, 1); box(10, er + 2, 13, er + 2, tint(skin, -.4), 1); box(HL + 2, hb - 1, HR - 2, hb, pale, 1); next(); box(HL - 2, er - 1, HL - 1, er + 1, tint(skin, .3)); put(HL - 3, er, tint(skin, .3)); next(); box(HR + 1, er - 1, HR + 2, er + 1, tint(skin, .3)); put(HR + 3, er, tint(skin, .3)); }
  else if (kind === "Mothfolk") { box(eyeL - 1, er - 1, eyeL, er, "#15131c", 1); box(eyeR, er - 1, eyeR + 1, er, "#15131c", 1); put(eyeL - 1, er - 1, "#6a6a8a", 1); put(eyeR, er - 1, "#6a6a8a", 1); box(HL + 1, hb, HR - 1, hb, pale, 1); }
  else if (frame === "blob") { box(eyeL, er - 1, eyeL, er, eye, 1); box(eyeR, er - 1, eyeR, er, eye, 1); put(eyeL, er - 1, white, 1); put(eyeR, er - 1, white, 1); if (chance(.6)) box(11, er + 2, 12, er + 2, tint(skin, -.5), 1); }
  else {
    const slit = kind === "Catfolk" || kind === "Lizardfolk" || kind === "Imp" ? pick(["#e8c83a", "#9af08a", "#ff8a4a"]) : null;
    if (slit) { box(eyeL - 1, er, eyeL, er, slit, 1); box(eyeR, er, eyeR + 1, er, slit, 1); put(eyeL, er, "#15131c", 1); put(eyeR, er, "#15131c", 1); }
    else { box(eyeL, er - 1, eyeL, er, eye, 1); box(eyeR, er - 1, eyeR, er, eye, 1); }
    if (kind === "Orc") { box(eyeL - 1, er - 2, eyeL + 1, er - 2, tint(skin, -.4), 1); box(eyeR - 1, er - 2, eyeR + 1, er - 2, tint(skin, -.4), 1); box(10, er + 2, 13, er + 2, tint(skin, -.45), 1); put(9, er + 1, white, 1); put(9, er + 2, white, 1); put(14, er + 1, white, 1); put(14, er + 2, white, 1); }
    else if (fur) { box(10, er + 1, 13, hb, pale, 1); if (kind === "Foxfolk") { box(HL, er + 1, HL + 1, hb - 1, pale, 1); box(HR - 1, er + 1, HR, hb - 1, pale, 1); } put(11, er + 1, kind === "Foxfolk" ? "#1a1620" : "#e88a9a", 1); put(12, er + 1, kind === "Foxfolk" ? "#1a1620" : "#e88a9a", 1); if (kind === "Catfolk") { put(HL - 1, er + 1, white, 1); put(HR + 1, er + 1, white, 1); put(HL - 1, er + 3, white, 1); put(HR + 1, er + 3, white, 1); } }
    else if (kind === "Birdfolk") { box(11, er + 1, 12, er + 2, "#e8a030", 1); put(11, er + 3, "#b87818", 1); box(HL + 1, er + 1, HL + 2, er + 2, tint(skin, .35), 1); box(HR - 2, er + 1, HR - 1, er + 2, tint(skin, .35), 1); }
    else if (kind === "Lizardfolk") { box(10, er + 1, 13, hb, tint(skin, .3), 1); put(10, er + 2, "#15131c", 1); put(13, er + 2, "#15131c", 1); }
    else if (kind === "Imp") { box(10, er + 2, 13, er + 2, "#1a1620", 1); put(10, er + 3, white, 1); put(13, er + 3, white, 1); }
    else if (kind === "Goblin") { box(11, er + 1, 12, er + 2, tint(skin, -.2), 1); box(10, er + 3, 13, er + 3, tint(skin, -.5), 1); if (chance(.5)) put(13, er + 4 > hb ? hb : er + 4, white, 1); }
    else if (kind === "Mushroom Folk") { put(eyeL - 1, er + 1, "#e8a0a0", 1); put(eyeR + 1, er + 1, "#e8a0a0", 1); box(11, er + 2, 12, er + 2, tint(CREAM, -.4), 1); }
    else if (kind === "Rootfolk") { box(11, er + 2, 12, er + 2, tint(skin, -.5), 1); put(HL + 1, ht + 2, tint(skin, -.3), 1); put(HR - 1, er + 2, tint(skin, -.3), 1); put(HL + 2, hb - 1, tint(skin, -.3), 1); }
    else { box(11, er + 2, 12, er + 2, tint(skin, -.4), 1); if (chance(.3)) { put(eyeL - 1, er + 1, tint(skin, -.12), 1); put(eyeR + 1, er + 1, tint(skin, -.12), 1); } }
  }
  /* ears, horns, crests and the like */
  let crowned = false;   /* something grows on top, so no tall hat */
  if (kind === "Elf") { next(); box(HL - 2, er - 1, HL - 1, er, skin); put(HL - 3, er - 2, skin); put(HL - 2, er - 2, skin); next(); box(HR + 1, er - 1, HR + 2, er, skin); put(HR + 3, er - 2, skin); put(HR + 2, er - 2, skin); }
  if (kind === "Goblin") { next(); for (let i = 0; i < 4; i++) box(HL - 1 - i, er - 1 - Math.floor(i / 2), HL - 1, er + 1 - i + Math.floor(i / 2), skin); next(); for (let i = 0; i < 4; i++) box(HR + 1, er - 1 - Math.floor(i / 2), HR + 1 + i, er + 1 - i + Math.floor(i / 2), skin); put(HL - 2, er, tint(skin, -.35), 1); put(HR + 2, er, tint(skin, -.35), 1); }
  if (kind === "Orc") { next(); box(HL - 1, er - 1, HL - 1, er, skin); next(); box(HR + 1, er - 1, HR + 1, er, skin); }
  if (fur) { crowned = true; const tall = kind === "Foxfolk" ? 4 : 3; next(); for (let i = 0; i < tall; i++) box(HL + Math.ceil(i / 2), ht - 1 - i, HL + 3 - Math.floor(i / 2) - (i > 1 ? 1 : 0), ht - 1 - i, skin); put(HL + 1, ht - 1, "#e88a9a", 1); put(HL + 2, ht - 1, "#e88a9a", 1); next(); for (let i = 0; i < tall; i++) box(HR - 3 + Math.floor(i / 2) + (i > 1 ? 1 : 0), ht - 1 - i, HR - Math.ceil(i / 2), ht - 1 - i, skin); put(HR - 1, ht - 1, "#e88a9a", 1); put(HR - 2, ht - 1, "#e88a9a", 1); }
  if (kind === "Imp") { crowned = true; next(); box(HL, ht - 2, HL + 1, ht - 1, "#e8e4d4"); put(HL - 1, ht - 3, "#e8e4d4"); put(HL - 1, ht - 4, "#e8e4d4"); next(); box(HR - 1, ht - 2, HR, ht - 1, "#e8e4d4"); put(HR + 1, ht - 3, "#e8e4d4"); put(HR + 1, ht - 4, "#e8e4d4"); }
  if (kind === "Lizardfolk") { crowned = true; next(); const cc = tint(skin, -.3); for (let i = 0; i < 4; i++) { put(9 + i * 2, ht - 1, cc); if (i % 2 === 0) put(9 + i * 2, ht - 2, cc); } }
  if (kind === "Birdfolk") { crowned = true; next(); const cc = pick([accent, tint(skin, .4), "#e8a030"]); box(11, ht - 3, 12, ht - 1, cc); put(10, ht - 2, cc); put(13, ht - 4, cc); put(13, ht - 2, cc); }
  if (kind === "Fishfolk") { crowned = true; next(); const cc = tint(skin, .3); for (let i = 0; i < 4; i++) box(10 + Math.floor(i / 2), ht - 1 - i, 13 - i, ht - 1 - i, cc); put(11, ht - 2, tint(skin, -.2), 1); }
  if (kind === "Mothfolk") { crowned = true; next(); for (let i = 0; i < 5; i++) { put(9 - Math.floor(i / 2), ht - 1 - i, tint(skin, -.3)); put(14 + Math.floor(i / 2), ht - 1 - i, tint(skin, -.3)); } put(6, ht - 5, tint(skin, -.3)); put(17, ht - 5, tint(skin, -.3)); next(); box(L - 1, bt, R + 1, bt, pale); }
  if (kind === "Rootfolk") { crowned = true; next(); const lf = pick(["#5c9a3a", "#8ab83a", "#c85a2a", "#e8a83a", "#d85a9a"]); box(10, ht - 2, 13, ht - 1, lf); box(7, ht - 3, 9, ht - 2, lf); box(14, ht - 4, 16, ht - 3, lf); put(11, ht - 3, lf); put(12, ht - 4, lf); put(12, ht - 5, tint(lf, .3)); if (chance(.4)) { put(8, ht - 4, accent, 1); put(15, ht - 5, accent, 1); } }
  if (kind === "Mushroom Folk") { crowned = true; next(); for (let y = ht - 4; y <= ht + 1; y++) { const k = y - (ht - 4), w = k === 0 ? 4 : k === 1 ? 6 : k < 5 ? 8 : 7; box(12 - w, y, 11 + w, y, skin); } const spot = pick([CREAM, "#f4f4fa", tint(skin, .5)]); for (const [x, y] of [[7, ht - 2], [8, ht - 2], [13, ht - 3], [14, ht - 3], [16, ht], [5, ht], [11, ht], [10, ht]]) put(x, y, spot, 1); box(12 - 6, ht + 2, 11 + 6, ht + 2, tint(skin, -.4), 1); box(HL, ht + 2, HR, ht + 2, tint(CREAM, -.25), 1); }
  /* hair and beards */
  if (hairy) {
    const style = pick(["short", "long", "bald", "mohawk", "bun", "short"]); next();
    if (style !== "bald") { box(HL + 1, ht, HR - 1, ht, hair); box(HL, ht + 1, HR, ht + 1 + (style === "mohawk" ? -1 : 0), hair); if (style !== "mohawk") { put(HL, ht + 2, hair); put(HR, ht + 2, hair); put(HL, ht + 3, hair); put(HR, ht + 3, hair); } }
    if (style === "long") { next(); box(HL - 1, ht + 2, HL, hb + 2, hair); next(); box(HR, ht + 2, HR + 1, hb + 2, hair); }
    if (style === "mohawk") { next(); box(11, ht - 3, 12, ht, hair); put(11, ht - 4, hair); }
    if (style === "bun") { next(); box(10, ht - 2, 13, ht - 1, hair); }
    if (kind === "Dwarf" || (kind !== "Elf" && chance(.25))) { next(); const bl = kind === "Dwarf" ? 4 : 1; box(HL + 1, er + 2, HR - 1, hb + bl, hair); box(HL, er + 1, HL, hb - 1, hair); box(HR, er + 1, HR, hb - 1, hair); if (kind === "Dwarf") { box(HL + 2, hb + bl + 1, HR - 2, hb + bl + 1, hair); put(11, hb + bl, accent, 1); put(12, hb + bl, accent, 1); } box(11, er + 2, 12, er + 2, tint(hair, -.4), 1); }
  }
  /* ---- the hat ---- */
  let hat = hat0; if (!hatOk || crowned) hat = ["circlet", "bandana", "none"].includes(hat0) && !crowned && kind !== "Golem" ? hat0 : "none";
  if (kind === "Shade" && hat !== "wizard") hat = "hood"; if (frame === "blob" && hat === "hood") hat = "bandana";
  const top = frame === "blob" ? ht : ht, hl = frame === "blob" ? HL + 2 : HL, hr = frame === "blob" ? HR - 2 : HR;
  next();
  if (hat === "wizard") { box(hl - 2, top, hr + 2, top, main); for (let i = 1; i <= 6; i++) { const inset = Math.min(i - 1, Math.floor((hr - hl) / 2)); box(hl + inset, top - i, hr - inset + (i > 4 ? 1 : 0), top - i, main); } box(hl, top - 1, hr, top - 1, second, 1); put(12, top - 3, accent, 1); }
  if (hat === "hood") { const hc = clothes === "cloak" || clothes === "robe" ? main : second; box(hl + 1, top - 2, hr - 1, top - 2, hc); box(hl, top - 1, hr, top - 1, hc); box(hl - 1, top, hr + 1, top + 1, hc); box(hl - 1, top + 2, hl, hb, hc); box(hr, top + 2, hr + 1, hb, hc); box(hl, hb + 1, hr, hb + 1, hc); put(12, top - 3, hc); }
  if (hat === "helm" || hat === "horned") { const mc = hat === "horned" ? "#8a8478" : metal; box(hl + 1, top - 1, hr - 1, top - 1, mc); box(hl, top, hr, top + 2, mc); box(hl, top + 3, hl, hb - 1, mc); box(hr, top + 3, hr, hb - 1, mc); if (hat === "helm") { box(11, top + 3, 12, er, mc); next(); box(11, top - 4, 12, top - 2, main); put(13, top - 3, main); } else { next(); box(hl - 2, top - 1, hl - 1, top + 1, "#e8e4d4"); put(hl - 2, top - 2, "#e8e4d4"); put(hl - 3, top - 3, "#e8e4d4"); next(); box(hr + 1, top - 1, hr + 2, top + 1, "#e8e4d4"); put(hr + 2, top - 2, "#e8e4d4"); put(hr + 3, top - 3, "#e8e4d4"); } }
  if (hat === "cap") { box(hl + 1, top - 2, hr - 1, top - 2, main); box(hl, top - 1, hr, top, main); box(hl, top + 1, hr + 2, top + 1, tint(main, -.25)); next(); put(hl + 1, top - 3, accent); put(hl, top - 4, accent); put(hl - 1, top - 5, accent); put(hl, top - 5, accent); }
  if (hat === "toque") { box(hl + 1, top, hr - 1, top + 1, "#e0dcd0"); next(); box(hl, top - 4, hr, top - 1, "#f4f4fa"); box(hl + 1, top - 5, hr - 1, top - 5, "#f4f4fa"); }
  if (hat === "straw") { const sc = "#d8b860"; box(hl + 1, top - 2, hr - 1, top, sc); box(hl + 1, top, hr - 1, top, main, 1); next(); box(hl - 3, top + 1, hr + 3, top + 1, sc); }
  if (hat === "circlet") { box(hl, top + 1, hr, top + 1, "#f0c040", 1); put(11, top + 1, glow, 1); put(12, top + 1, glow, 1); }
  if (hat === "bandana") { box(hl + 1, top, hr - 1, top, main); box(hl, top + 1, hr, top + 1, main); next(); box(hr + 1, top + 1, hr + 2, top + 2, main); put(hr + 2, top + 3, main); }
  if (hat === "turban") { box(hl + 1, top - 3, hr - 1, top - 3, main); box(hl, top - 2, hr, top + 1, main); box(hl - 1, top - 1, hr + 1, top, main); for (let x = hl; x <= hr; x += 2) put(x, top - 1 - ((x - hl) % 4 ? 1 : 0), second, 1); put(11, top, accent, 1); put(12, top, accent, 1); }
  if (frame !== "blob" && chance(.3)) { next(); const sc = pick(DYES); box(L, bt, R, bt, sc); box(L + 1, bt + 1, L + 2, bt + 3, sc); }   /* a scarf */
  /* ---- what is carried ---- */
  const hx = frame === "blob" ? HR + 3 : HX, hy = frame === "blob" ? 22 : handY, X = hx + 1; next();
  const pole = (y0, y1, c) => { for (let y = y0; y <= y1; y++) put(X, y, y % 6 === 0 ? tint(c, -.3) : c); };
  if (item === "staff") { pole(ht - 1, feet, WOOD); next(); box(X - 1, ht - 3, X + 1, ht - 2, WOOD); put(X, ht - 4, WOOD); }
  if (item === "orb") { pole(ht + 1, feet, WOOD); next(); box(X - 1, ht - 2, X + 1, ht, glow, 1); put(X - 1, ht - 2, "#ffffff", 1); put(X, ht - 3, glow, 1); put(X + 2, ht - 1, glow, 1); put(X - 2, ht - 1, glow, 1); }
  if (item === "skull") { pole(ht + 2, feet, "#4a3a4a"); next(); box(X - 1, ht - 2, X + 1, ht + 1, "#e8e4d4"); put(X - 1, ht - 1, "#1a1620", 1); put(X + 1, ht - 1, "#1a1620", 1); put(X, ht + 1, "#1a1620", 1); }
  if (item === "oar") { pole(ht + 3, feet, WOOD); next(); box(X - 1, ht - 3, X + 1, ht + 2, "#b88448"); put(X, ht - 4, "#b88448"); }
  if (item === "sword") { box(X, hy - 10, X, hy - 1, STEEL); box(X + 1, hy - 9, X + 1, hy - 1, tint(STEEL, -.3)); next(); box(X - 1, hy, X + 2, hy, "#f0c040"); put(X, hy + 1, WOOD); put(X, hy + 2, "#f0c040"); }
  if (item === "dagger") { box(X, hy - 4, X, hy - 1, STEEL); put(X + 1, hy - 3, tint(STEEL, -.3)); put(X + 1, hy - 2, tint(STEEL, -.3)); next(); box(X - 1, hy, X + 1, hy, "#f0c040"); put(X, hy + 1, WOOD); }
  if (item === "axe") { pole(hy - 9, hy + 4, WOOD); next(); box(X + 1, hy - 9, X + 2, hy - 5, STEEL); put(X + 3, hy - 8, STEEL); put(X + 3, hy - 7, STEEL); put(X + 3, hy - 6, STEEL); box(X - 1, hy - 8, X - 1, hy - 6, tint(STEEL, -.3)); }
  if (item === "mace") { pole(hy - 6, hy + 3, WOOD); next(); box(X - 1, hy - 9, X + 1, hy - 7, metal); put(X, hy - 10, metal); put(X - 2, hy - 8, metal); put(X + 2, hy - 8, metal); }
  if (item === "hammer") { pole(hy - 6, hy + 3, WOOD); next(); box(X - 2, hy - 9, X + 2, hy - 7, "#6a7080"); put(X - 2, hy - 9, STEEL, 1); put(X - 1, hy - 9, STEEL, 1); }
  if (item === "bow") { for (let y = hy - 6; y <= hy + 6; y++) put(X + (Math.abs(y - hy) > 4 ? 0 : 1), y, WOOD); put(X - 1, hy - 7, WOOD); put(X - 1, hy + 7, WOOD); next(); for (let y = hy - 6; y <= hy + 6; y++) if (y !== hy) put(X - 1, y, "#e8e6ff", 1); }
  if (item === "lute") { box(X - 2, hy, X + 1, hy + 4, "#b87a3a"); box(X - 1, hy - 1, X, hy + 5, "#b87a3a"); put(X - 1, hy + 2, "#3a2414", 1); put(X, hy + 2, "#3a2414", 1); next(); for (let i = 1; i <= 5; i++) put(X + Math.floor(i / 2), hy - 1 - i, WOOD); put(X + 3, hy - 6, "#e8e6ff", 1); }
  if (item === "flask") { put(X, hy - 2, "#d8e8f0"); put(X, hy - 3, WOOD); next(); box(X - 1, hy - 1, X + 1, hy + 2, glow, 1); put(X - 1, hy - 1, "#d8e8f0", 1); put(X + 1, hy - 1, "#d8e8f0", 1); put(X, hy - 5, glow, 1); put(X + 1, hy - 7, glow, 1); }
  if (item === "rod") { for (let i = 0; i <= 13; i++) put(X + Math.round(i / 5), hy + 2 - i, WOOD); next(); for (let y = hy - 10; y <= hy - 3; y++) put(X + 3, y, "#c8d8ff", 1); put(X + 3, hy - 2, "#e84a3a", 1); put(X + 3, hy - 1, "#f4f4fa", 1); }
  if (item === "lantern") { put(X, hy - 1, "#4a3a2a"); put(X, hy, "#4a3a2a"); next(); box(X - 1, hy + 1, X + 1, hy + 1, "#4a3a2a"); box(X - 1, hy + 2, X + 1, hy + 4, "#ffd257", 1); put(X, hy + 3, "#fff8c0", 1); box(X - 1, hy + 5, X + 1, hy + 5, "#4a3a2a"); }
  if (item === "scroll") { box(X - 2, hy - 2, X + 1, hy + 3, CREAM); box(X - 2, hy - 3, X + 1, hy - 3, "#c8b890"); box(X - 2, hy + 4, X + 1, hy + 4, "#c8b890"); for (let y = hy - 1; y <= hy + 2; y += 1) box(X - 1, y, X - (y % 2), y, "#8a7a5a", 1); }
  if (item === "ladle") { pole(hy - 7, hy + 2, WOOD); next(); box(X - 1, hy - 9, X + 1, hy - 8, "#8a8a94"); put(X, hy - 10, glow, 1); }
  if (item === "pouch") { box(X - 1, hy + 1, X + 1, hy + 3, "#7a5a34"); put(X, hy, "#7a5a34"); put(X, hy + 2, "#f0c040", 1); put(X + 1, hy - 1, "#f0c040", 1); put(X - 1, hy - 2, "#f0c040", 1); }
  if (item === "can") { box(X - 1, hy + 1, X + 1, hy + 3, "#3a9a9a"); put(X + 2, hy + 1, "#3a9a9a"); put(X + 3, hy, "#3a9a9a"); put(X, hy, "#2a6a6a"); put(X + 4, hy + 1, "#8fd6ff", 1); put(X + 4, hy + 3, "#8fd6ff", 1); }
  if (item === "beads" && frame !== "blob") { for (let x = L + 1; x <= R - 1; x++) if (x % 2) put(x, bt + (Math.abs(x - 11.5) < 2 ? 2 : 1), WOOD, 1); put(11, bt + 3, accent, 1); put(12, bt + 3, accent, 1); }
  if (frame !== "blob") { next(); box(R + 1, handY, R + 2, handY, kind === "Shade" ? "#2a2634" : fur ? pale : skin); }   /* the hand closes over what it holds */
  if (off === "shield" && frame !== "blob") { next(); box(L - 5, bt + 1, L - 1, bt + 6, main); box(L - 4, bt + 7, L - 2, bt + 7, main); put(L - 3, bt + 8, main); box(L - 5, bt + 1, L - 1, bt + 1, metal, 1); box(L - 3, bt + 3, L - 3, bt + 5, accent, 1); put(L - 4, bt + 4, accent, 1); put(L - 2, bt + 4, accent, 1); }
  if (off === "book" && frame !== "blob") { next(); box(L - 4, handY - 2, L - 1, handY + 1, second); box(L - 4, handY + 1, L - 1, handY + 1, CREAM, 1); put(L - 3, handY - 1, accent, 1); }
  /* ---- light and line: each piece is lit from the left and shaded on the right, then the whole is outlined ---- */
  return { pixels: finishBig(g, kind === "Ghost" ? 232 : 255), kind, calling, title: kind + " " + calling };
}
/* ---- From the plan to the picture ----
   The plan is small and blocky. Here it is drawn four times the size: the stair-steps are rounded off (twice over,
   by a rule that looks at each square's neighbours), every piece is shaded smoothly from light at its upper left to
   dark at its lower right, and the whole is given a dark edge. This is what makes it look 32-bit, not 16-bit.
   cells: rows of { c: colour, p: which piece, flat: leave unshaded } or nothing. Gives back raw pixels. */
function rounder(grid) {   /* one doubling */
  const h = grid.length, w = grid[0].length, key = (q) => (q ? q.c + "|" + q.p : ""), at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? grid[y][x] : null), out = Array.from({ length: h * 2 }, () => new Array(w * 2));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = grid[y][x], A = at(x, y - 1), B = at(x + 1, y), Cc = at(x - 1, y), Dd = at(x, y + 1), a = key(A), b = key(B), c = key(Cc), d = key(Dd);
    out[y * 2][x * 2] = c === a && c !== d && a !== b ? A : P; out[y * 2][x * 2 + 1] = a === b && a !== c && b !== d ? B : P;
    out[y * 2 + 1][x * 2] = d === c && d !== b && c !== a ? Cc : P; out[y * 2 + 1][x * 2 + 1] = b === d && b !== a && d !== c ? Dd : P;
  }
  return out;
}
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function finishBig(cells, solid) {
  const big = rounder(rounder(cells)), H = big.length, W = big[0].length, px = new Uint8ClampedArray(W * H * 4), box = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = big[y][x]; if (!q) continue; const b = box[q.p] || (box[q.p] = [x, y, x, y]); if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  const piece = (x, y) => (y >= 0 && y < H && x >= 0 && x < W && big[y][x] ? big[y][x].p : -1), set = (x, y, r, g, b, a) => { const i = (y * W + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = big[y][x]; if (!q) continue; let [r, g, b] = rgbOf(q.c);
    if (!q.flat) {
      const bx = box[q.p], u = (x - bx[0]) / Math.max(6, bx[2] - bx[0]), v = (y - bx[1]) / Math.max(6, bx[3] - bx[1]); let f = .17 - .4 * (.62 * u + .38 * v);
      if (piece(x - 1, y) !== q.p || piece(x, y - 1) !== q.p) f += .1; if (piece(x + 1, y) !== q.p || piece(x, y + 1) !== q.p) f -= .16; else if (piece(x + 2, y) !== q.p) f -= .07;
      const k = f >= 0 ? f : 0, m = f < 0 ? 1 + f : 1; r = (r + (255 - r) * k) * m; g = (g + (255 - g) * k) * m; b = (b + (255 - b) * k) * m;
    }
    set(x, y, r, g, b, solid);
  }
  for (let pass = 0; pass < 2; pass++) {   /* the edge: first a dark shade of whatever it touches, then near-black outside that */
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3]) continue;
      for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const n = (Y * W + X) * 4; if (px[n + 3]) { add.push(pass ? [x, y, 10, 10, 20] : [x, y, px[n] * .3, px[n + 1] * .3, px[n + 2] * .34]); break; } }
    }
    add.forEach(([x, y, r, g, b]) => set(x, y, r, g, b, 255));
  }
  return px;
}
/* ---- The starting items ----
   One curiosity each companion sets out with, chosen when they sign on. Each line: a short code name, what it is
   called, its colours, and a small picture (one letter per pixel, "." for nothing). */
const ITEMS = [
  ["lamp", "A Lamp That Burns Without Oil", { a: "#4a3a2a", b: "#ffd257", c: "#fff8c0" }, ["...aa....", "..a..a...", "..aaaa...", "..abba...", "..abca...", "..abba...", "..aaaa...", ".aaaaaa.."]],
  ["map", "A Map of a Country Since Drowned", { a: "#c8b890", b: "#efe6cc", c: "#8a5a3a", d: "#3a8ac8" }, [".aaaaaaa.", ".bbbbbbb.", ".bcbbddb.", ".bbcbdbb.", ".bbbcbbb.", ".bdbbcbb.", ".bbbbbbb.", ".aaaaaaa."]],
  ["bottle", "A Bottle of the Old Sun's Light", { a: "#8a5a2c", b: "#d8e8f0", c: "#ffb040", d: "#fff0a0" }, ["....a....", "...bab...", "...b.b...", "..bbbbb..", ".bcccccb.", ".bcdcccb.", ".bcccccb.", "..bbbbb.."]],
  ["coin", "A Coin Bearing No King's Face", { a: "#a87818", b: "#f0c040", c: "#fff4b0" }, ["..aaaaa..", ".abbbbba.", "abbcbbbba", "abcbbbbba", "abbbbbbba", "abbbbbbba", ".abbbbba.", "..aaaaa.."]],
  ["key", "A Key to a Door Not Yet Found", { a: "#a87818", b: "#f0c040" }, ["..bbb....", ".b...b...", ".b...b...", "..bbb....", "...b.....", "...b.....", "...bb....", "...b.....", "...bb...."]],
  ["compass", "A Compass That Points to Regret", { a: "#6e7786", b: "#e8e6ff", c: "#c83a3a", d: "#2a2a3a" }, ["..aaaaa..", ".abbbbba.", "abbbcbbba", "abbbcbbba", "abbbdbbba", "abbbdbbba", ".abbbbba.", "..aaaaa.."]],
  ["ring", "A Ring That Tightens at a Lie", { a: "#f0c040", b: "#a87818", c: "#e85a8a", d: "#ffc0d8" }, ["....c....", "...cdc...", "..aacaa..", ".a.....a.", ".a.....a.", ".a.....a.", "..b...b..", "...bbb..."]],
  ["whistle", "A Whistle No Dog Will Answer", { a: "#e8e4d4", b: "#b8b0a0", c: "#3a3a4a" }, [".........", ".........", "aaaaaaa..", "aacaaaaaa", "aaaaaaaab", "bbbbbbb..", ".........", "........."]],
  ["book", "A Book With One Page Remaining", { a: "#7a2a3a", b: "#a8323c", c: "#efe6cc", d: "#f0c040" }, [".aaaaaaa.", ".abbbbba.", ".abbdbba.", ".abdddba.", ".abbdbba.", ".abbbbba.", ".acccccc.", ".aaaaaaa."]],
  ["tooth", "A Tooth of Something Large", { a: "#e8e4d4", b: "#b8b0a0", c: "#8a5a2c" }, ["..ccccc..", ".aaaaaaa.", ".aaaaaab.", ".aaaaaab.", "..aaaab..", "..aaaab..", "...aab...", "....a...."]],
  ["mirror", "A Mirror Running a Day Behind", { a: "#a87818", b: "#b8e0f0", c: "#f4fcff", d: "#f0c040" }, ["..ddddd..", ".dbbbbbd.", ".dbcbbbd.", ".dcbbbbd.", ".dbbbbbd.", "..ddddd..", "....a....", "....a....", "....a...."]],
  ["egg", "An Egg, Warm, of Unknown Parentage", { a: "#e8dcc0", b: "#c8b890", c: "#7a9a6a", d: "#fff8e8" }, ["...aaa...", "..adaaa..", ".adaacaa.", ".aaaaaab.", ".acaaaab.", ".aaaacab.", "..aaaab..", "...bbb..."]]];
conjure.callings = CALLINGS.map((c) => c[0]);
conjure.items = ITEMS.map((i) => [i[0], i[1]]);
conjure.itemName = (id) => (ITEMS.find((i) => i[0] === id) || ["", ""])[1];
conjure.paintItem = (canvas, id) => {
  const it = ITEMS.find((i) => i[0] === id), n = 11; canvas.width = n * UP; canvas.height = n * UP; if (!it) return;   /* the little picture, with a square of room all round, drawn large and smoothed like the figures */
  const cells = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => { const ch = (it[3][y - 1] || "")[x - 1], col = it[2][ch]; return col ? { c: col, p: ch, flat: false } : null; }));
  canvas.getContext("2d").putImageData(new ImageData(finishBig(cells, 255), n * UP, n * UP), 0, 0);
};
/* ---- The teller of backgrounds ----
   Writes a short past for a companion, in the manner of the site: where they came from, what their kind is like,
   how they came by their calling and their curiosity, and why they are here. It is put together from the lines
   below, chosen by the same number that draws the figure, so one companion always has one past. {N} is the name. */
const PLACES = ["the salt towns of Ombrel", "Vash-under-the-Cliff", "the reed markets of Tuln", "a barge on the slow river Ess", "the ninth terrace of Caraphel", "the fog farms above Quill", "Low Sard, where the sun is said to linger", "the customs house at Embry Gap", "a village whose name was sold to pay a debt", "the glass quarries of Morrow Tine", "the back rooms of the Halt of Seven Scales", "an island that appears on no chart twice", "the lamp district of Old Vessary", "the wrong bank of the river at Dunmarrow"];
const BIRTHS = ["during an eclipse the almanac had not authorised", "to parents who disputed the matter", "in a year the tax rolls omit", "the seventh of a family that had budgeted for four", "under a sun already past its best", "at an inn, to the lasting inconvenience of the other guests", "on a market day, and was very nearly sold", "late, and has not since made up the time", "in the middle of a lawsuit, to which the birth was entered as evidence"];
const ORIGINS = [(n, p, b) => n + " was born in " + p + ", " + b + ".", (n, p) => "Of the early life of " + n + " there are three accounts, all supplied by " + n + " and none agreeing; the commonest begins at " + p + ".", (n, p) => n + " came out of " + p + " with one pair of boots and a grievance, and still has the grievance.", (n, p) => "The records of " + p + " show only that " + n + " lodged there for a season, and left owing for the candles.", (n, p) => n + " is from " + p + ", and speaks of it with the warmth of one who does not intend to return."];
const OF_KIND = { "Human": "{N} is a human being, a fact offered here for completeness and not as a recommendation.", "Elf": "Being of the elder kin, {N} recalls the sun when it was yellow, and mentions this more often than is welcome.", "Dwarf": "As a dwarf, {N} holds that anything worth knowing lies underground, and that the rest is weather.", "Orc": "{N} is an orc of mild habits, which among orcs is counted an eccentricity.", "Goblin": "{N} is a goblin, and has been asked to leave better establishments than this one.", "Lizardfolk": "Being cold of blood, {N} does little before noon and regrets none of it.", "Catfolk": "{N} is of the cat people, and regards every arrangement as provisional.", "Birdfolk": "{N} is of the bird people, and has never once been persuaded that walking is dignified.", "Frogfolk": "{N} is of the marsh folk, to whom a dry season is a moral failing in the sky.", "Skeleton": "{N} has been dead for some while, and finds it has simplified a great many decisions.", "Ghost": "{N} is a ghost, bound to the world by a matter never satisfactorily explained, least of all by {N}.", "Slime": "{N} is a slime, of no fixed outline, and has been refused entry on that ground alone.", "Mushroom Folk": "{N} sprouted in a single night after rain, and has been catching up on childhood ever since.", "Golem": "{N} was built for a purpose that the builder did not live to state.", "Imp": "{N} is an imp, released from a contract on a point of grammar.", "Fishfolk": "{N} came up out of the water on a wager, and has not yet collected.", "Shade": "{N} is a shade; what cast it is not known, and it is thought impolite to ask.", "Mothfolk": "{N} is of the moth people, drawn to lamps, argument, and other sources of harm.", "Rootfolk": "{N} grew, in the ordinary way of the root folk, in a place that has since been built upon.", "Foxfolk": "{N} is of the fox people, among whom honesty is admired chiefly in others." };
const OF_CALLING = { "Wanderer": "The road was taken up when the last fixed address proved to be owed to someone.", "Knight": "Knighthood was conferred by a lord of small territory and smaller means, who paid in title because it cost nothing.", "Mage": "Three spells were learned from a master who knew four, the last being withheld as security.", "Rogue": "A talent for entering rooms was discovered early, and a talent for leaving them shortly after.", "Ranger": "The wild places were chosen for their chief merit, the absence of creditors.", "Cleric": "Vows were sworn to a god whose temple has since been let as a granary; the vows, having no end date, stand.", "Bard": "Songs are sung of great deeds, most of them performed by other people.", "Alchemist": "The alchemist's art was taken up in the hope of gold and continued in the hope of eyebrows.", "Angler": "Much has been asked of the water, which has answered seldom, and then with small fish.", "Lamplighter": "The lamps of a long street were kept until the street was abandoned; the habit persisted.", "Porter": "Other people's burdens were carried for wages and the contents never asked after, which is why the work continued.", "Cartographer": "Maps were drawn of far places on the word of those who claimed to have returned from them.", "Cook": "A kitchen was run on the principle that anything may be eaten once.", "Boatman": "A ferry was worked across a river that has since moved, leaving the schedule of fares as the only record.", "Monk": "A vow of silence was taken, and kept for the better part of an afternoon.", "Berserker": "A reputation for fury was earned in a dispute over a bill, and has been expensive to maintain.", "Necromancer": "The dead were consulted, professionally, and found to be no better informed than the living.", "Merchant": "Goods were bought dear and sold cheap until the error was discovered and reversed.", "Gardener": "A garden was kept for a magnate who admired it from a distance and never learned what grew there.", "Smith": "Iron was worked for anyone who paid, and the purposes were not enquired into.", "Paladin": "An oath was sworn to defend the weak, the terms of which have proved alarmingly broad.", "Witch": "Remedies were sold at a crossroads by day, and curses at the same crossroads by night, at a higher price.", "Duelist": "Eleven duels were fought over points of honour and one, regrettably, over a point of fact.", "Hermit": "Solitude was sought for many years, and abandoned on discovering how poorly it listens." };
const OF_ITEM = { lamp: "The lamp was won from a man who could not explain it and seemed relieved to lose it.", map: "The map shows a country since drowned, and is consulted mainly for the pleasure of knowing where not to go.", bottle: "The bottle holds light from the sun's better days; it is uncorked rarely, and never for guests.", coin: "The coin bears no face and has been refused in every market, which {N} takes as proof of its value.", key: "The key fits no lock yet tried. The number of locks tried is a matter between {N} and several magistrates.", compass: "The compass points steadily at something, and {N} has had the sense never to follow it.", ring: "The ring tightens at a lie, and is for that reason worn on a hand kept in the pocket.", whistle: "The whistle summons nothing that any witness has seen, though once the grass lay flat.", book: "Of the book one page remains; {N} has not read it, on the theory that it is then still any page.", tooth: "The tooth is from something large. It was not come by honestly, in that the owner was not asked.", mirror: "The mirror shows the day before, which has settled several arguments and begun several more.", egg: "The egg is warm and has been for years. {N} has made no plans around it, and sleeps lightly." };
const ENDINGS = ["Asked why the keeper's company, {N} cited the pay, and on learning there was none, the scenery.", "{N} joined the keeper's company for reasons described as personal, which is to say financial.", "It is {N}'s stated view that the sun has a few good years left, and that they should not be spent indoors.", "{N} travels with the keeper on the understanding that someone else is carrying the provisions.", "What {N} wants from the venture has not been stated. It is assumed to be portable.", "{N} was advised against joining by everyone consulted, and took this as a sign that the thing was worth doing.", "{N} asks only a fair share of whatever is found, and has brought a large bag in case it is considerable.", "Of the future {N} says nothing, having been wrong about it before."];
conjure.tale = function (seed, who) {
  let s = ((seed >>> 0) ^ 0x9e3779b9) >>> 0 || 7; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, pick = (a) => a[Math.floor(rnd() * a.length)];
  const n = String((who && who.name) || "").trim() || "This one", f = conjure(seed, who && who.calling), place = pick(PLACES), birth = pick(BIRTHS), origin = pick(ORIGINS), ending = pick(ENDINGS);
  const lines = [origin(n, place, birth), OF_KIND[f.kind], OF_CALLING[f.calling]]; if (who && OF_ITEM[who.item]) lines.push(OF_ITEM[who.item]); lines.push(ending);
  return lines.filter(Boolean).map((l) => l.split("{N}").join(n)).join(" ");
};
return conjure;
})();
