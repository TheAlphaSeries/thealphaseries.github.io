/* ==========================================================================
   14e. A LINE IN THE WATER
   A small fishing game, played from the Bestiary. The keeper stands on his
   pier (with his staff: he has no rod to spare) and the visitor casts for
   him. Only species the keeper has himself caught can be hooked; the fight
   each puts up comes from the Fight figure entered for it. It runs in five
   turns, as such games always have:
     ready    a power meter swings; press to cast. A long cast reaches the
              rarer fish.
     wait     the float bobs. There may be a nibble or two; then the bite,
              with a "!" and a jolt. Press within the moment to hook it.
     fight    the fish darts up and down a bar; hold to lift the green
              zone, let go and it sinks. Keep the fish inside it and the
              line draws in; let it out and the line pays out. All the way
              in and it is landed; all the way out and the line parts.
     landed   the fish leaps, as in the Bestiary, with its name and weight.
     lost     a word on what went wrong.
   Press means a tap or a held finger on the picture, or Space or Enter.
   The visitor's creel (what they have caught here) stays on their device.
   ========================================================================== */
const FGAME = { w: 320, h: 180, water: 112, pier: 68 };
const RARE_COL = { common: "#b8c0cc", uncommon: "#7fd68a", rare: "#8fd6ff", epic: "#e0a8ff", legendary: "#ffd257" }, RARE_W = { common: 10, uncommon: 6, rare: 3, epic: 1.5, legendary: .7 };
let fishing = null;   /* the game in play, if any */
const creel = () => { try { const v = JSON.parse(store.get("creel") || "{}"); return v && typeof v === "object" ? { n: Math.max(0, v.n | 0), kinds: v.kinds && typeof v.kinds === "object" ? v.kinds : {} } : { n: 0, kinds: {} }; } catch (e) { return { n: 0, kinds: {} }; } };
function creelLine() {
  const c = creel(), order = Object.keys(RARITY), names = Object.keys(c.kinds); if (!c.n) return "Your creel is empty.";
  const best = names.map((n) => [n, c.kinds[n]]).sort((a, b) => order.indexOf(b[1].rarity) - order.indexOf(a[1].rarity) || (b[1].weight || 0) - (a[1].weight || 0))[0];
  return "Your creel: " + count(c.n, "fish").replace("fishs", "fish") + " of " + count(names.length, "kind") + ".  Best: " + best[0] + (best[1].weight ? ", " + best[1].weight + " lb" : "") + ".";
}
/* the fish that may be hooked: one of each species the keeper has caught, with the fight it puts up */
function fishable() {
  const seen = new Set(), out = [];
  for (const b of BESTIARY) { const k = b.name.trim().toLowerCase(); if (b.status === "wanted" || seen.has(k)) continue; seen.add(k); out.push({ b, rarity: b.rarity || "common", fight: b.fight || (Object.keys(RARITY).indexOf(b.rarity || "common") + 1) }); }
  return out;
}
function fsfx(kind) {
  if (!ac || !musicOn || ac.state !== "running") return;
  try { const t = ac.currentTime + 0.01;
    if (kind === "cast") { note(72, t, 0.08, 0.03, "square"); note(84, t + 0.07, 0.14, 0.025, "square"); }
    else if (kind === "plop") { note(50, t, 0.12, 0.05, "sine"); }
    else if (kind === "nibble") note(91, t, 0.04, 0.02, "square");
    else if (kind === "bite") { note(96, t, 0.06, 0.05, "square"); note(103, t + 0.06, 0.08, 0.05, "square"); note(96, t + 0.14, 0.1, 0.04, "square"); }
    else if (kind === "tick") note(64 + Math.floor(Math.random() * 3), t, 0.03, 0.012, "triangle");
    else if (kind === "snap") { note(70, t, 0.05, 0.05, "sawtooth"); note(46, t + 0.05, 0.3, 0.05, "square"); }
    else if (kind === "gone") { note(64, t, 0.12, 0.03, "square"); note(57, t + 0.12, 0.2, 0.03, "square"); }
  } catch (e) {}
}
function showFishing(from) {
  current = null; questFrom = from && from.isConnected ? from : null; setHash("");
  rwin.textContent = "";
  const head = el("div", "filehead"), meta = el("p", "meta"); meta.append(el("span", null, "A game")); head.append(meta, el("h2", null, "A Line in the Water"));
  const words = el("div", "post intro"), pool = fishable();
  words.append(el("p", null, pool.length ? "The keeper lends his pier and, having no rod to spare, his staff. Only what he has caught may be caught here." : "The keeper has caught nothing yet, so there is nothing to cast for. The water is, however, very pleasant to look at."));
  const cv = el("canvas", "fgame"), say = el("p", "fsay"), bag = el("p", "sub fcreel", creelLine()), result = el("div", "fresult"), nav = el("div", "row group");
  cv.width = FGAME.w; cv.height = FGAME.h; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "The pier, the water, and the keeper with his line out."); say.setAttribute("role", "status");
  nav.append(opt("Back", closePost));
  rwin.append(head, words, cv, say, bag, result, nav);
  reader.hidden = false; document.body.style.overflow = "hidden"; syncLayers();
  rwin.classList.remove("pop"); void rwin.offsetWidth; rwin.classList.add("pop"); rwin.scrollTop = 0; rwin.focus();
  if (pool.length) fishing = startFishing(cv, say, bag, result, pool);
}
function startFishing(cv, say, bag, result, pool) {
  const c = cv.getContext("2d"), W = FGAME.w, H = FGAME.h, SURF = FGAME.water, keeper = figurePic(FIGURE.stand), lifted = figurePic(FIGURE.lift), flared = figurePic(FIGURE.highFlare);
  const KX = 12, KY = SURF - keeper.height / BIG + 1, TIP = [KX + STONE[0] + 1, KY + STONE[1] + 1];   /* the figure stands on the pier at a quarter of his size; the line runs from the staff's stone */
  const stars = Array.from({ length: 40 }, (_, i) => [(i * 97) % W, (i * 53) % (SURF - 30), i % 3]), g = { phase: "ready", t: 0, held: false, meter: 0, power: 0, shake: 0, flash: 0, bob: [TIP[0] + 60, SURF], spray: [], rings: [], fish: null, msg: "" };
  let last = performance.now(), raf = 0, alive = true;
  const tell = (m) => { say.textContent = m; };
  const splash = (x, y, n, big) => { for (let i = 0; i < n; i++) g.spray.push({ x, y, vx: (Math.random() - .5) * (big ? 90 : 50), vy: -(30 + Math.random() * (big ? 90 : 50)), life: .5 + Math.random() * .4 }); g.rings.push({ x, y, r: 1, life: 1 }); };
  const pick = (p) => {   /* which fish bites: the farther the cast, the better the odds of a rare one */
    const w = pool.map((f) => RARE_W[f.rarity] * (f.rarity === "common" ? 1.3 - p : 1 + 2.5 * p)); let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; } return pool[pool.length - 1];
  };
  const toReady = (m) => { g.phase = "ready"; g.t = 0; g.fish = null; tell(m || "Press to cast. A longer cast reaches the rarer fish."); };
  const press = () => {
    if (g.phase === "ready") { g.phase = "cast"; g.t = 0; g.power = g.meter; g.from = [...TIP]; g.to = [TIP[0] + 40 + g.power * 205, SURF]; fsfx("cast"); tell("The line goes out..."); }
    else if (g.phase === "wait") { if (g.bite > 0 && g.t >= g.bite && g.t < g.bite + .8) hook(); else if (g.t > .6) { g.phase = "lost"; g.t = 0; fsfx("gone"); tell("Too soon. Whatever was there has taken fright."); } }
    else if (g.phase === "fight") g.held = true;
    else if (g.phase === "landed" || g.phase === "lost") { if (g.t > .8) { result.textContent = ""; toReady(); } }
  };
  const release = () => { g.held = false; };
  const hook = () => {
    const f = g.fish; g.phase = "fight"; g.t = 0; g.fy = 50; g.ftarget = 50; g.fnext = 0; g.py = 40; g.pv = 0; g.zone = Math.max(26, 42 - f.fight * 3); g.line = 40; g.held = false; g.shake = .25; fsfx("bite");
    tell("Hooked! Hold to lift, let go to sink. Keep the fish in the green.");
  };
  const land = () => {
    const f = g.fish, b = f.b, w = b.weight ? Math.round(b.weight * (.6 + Math.random() * .7) * 10) / 10 : null; g.phase = "landed"; g.t = 0; g.shake = 0; fanfare(true); splash(g.bob[0], SURF, 18, true);
    const bagged = creel(); bagged.n++; const k = bagged.kinds[b.name] || { n: 0, rarity: f.rarity, weight: 0 }; k.n++; k.rarity = f.rarity; if (w && w > (k.weight || 0)) k.weight = w; bagged.kinds[b.name] = k; store.set("creel", JSON.stringify(bagged)); bag.textContent = creelLine();
    result.textContent = ""; const pic = el("canvas", "fishpic"), facts = el("dl", "facts"), fact = (kk, v) => facts.append(el("dt", null, kk), el("dd", null, v)); pic.setAttribute("aria-hidden", "true"); drawFish(pic, b.sprite, false, b.file);
    fact("Landed", b.name); fact("Rarity", RARITY[f.rarity][0]); if (w) fact("Weight", w + " lb" + (b.weight && w > b.weight ? "  -  heavier than the keeper's" : "")); fact("Fight", f.fight + " / 5");
    result.append(el("p", "qbanner", k.n === 1 ? "A new kind for your creel" : "Landed"), pic, el("h2", null, b.name), facts); leap(pic, b.sprite, b.file);
    tell("Landed. Press to cast again.");
  };
  const step = (now) => {
    if (!alive) return; if (!cv.isConnected || reader.hidden) return stop();
    const dt = Math.min(.05, (now - last) / 1000); last = now; g.t += dt; if (g.shake > 0) g.shake -= dt; if (g.flash > 0) g.flash -= dt;
    if (g.phase === "ready") g.meter = Math.abs(((g.t * .7) % 2) - 1);   /* the meter swings up and down */
    if (g.phase === "cast") { const p = Math.min(1, g.t / .6), e = p; g.bob = [g.from[0] + (g.to[0] - g.from[0]) * e, g.from[1] + (g.to[1] - g.from[1]) * e - Math.sin(Math.PI * p) * (30 + g.power * 40)];
      if (p >= 1) { g.phase = "wait"; g.t = 0; g.bite = 1.5 + Math.random() * 4; g.nibbles = [...Array(Math.floor(Math.random() * 3))].map(() => g.bite - .4 - Math.random() * 1.2).sort(); g.fish = pick(g.power); fsfx("plop"); splash(g.bob[0], SURF, 8); tell("The float settles. Wait for the bite, then press."); } }
    if (g.phase === "wait") { g.bob[1] = SURF + Math.sin(g.t * 3) * 1.2;
      while (g.nibbles.length && g.t >= g.nibbles[0]) { g.nibbles.shift(); g.bob[1] += 3; fsfx("nibble"); g.rings.push({ x: g.bob[0], y: SURF, r: 1, life: .6 }); }
      if (g.t >= g.bite && g.t < g.bite + .8) { g.bob[1] = SURF + 6 + Math.sin(g.t * 30) * 1.5; if (!g.bit) { g.bit = true; g.shake = .3; g.flash = .8; fsfx("bite"); splash(g.bob[0], SURF, 6); } }
      if (g.t >= g.bite + .8) { g.phase = "lost"; g.t = 0; g.bit = false; fsfx("gone"); tell("It took the bait and left. Press to cast again."); } }
    if (g.phase === "fight") { const f = g.fish, speed = 14 + f.fight * 7;
      if (g.t >= g.fnext) { g.ftarget = Math.random() * 100; g.fnext = g.t + .4 + Math.random() * (1.4 - f.fight * .15); }
      g.fy += Math.max(-speed * dt, Math.min(speed * dt, (g.ftarget - g.fy) * (1.5 + f.fight * .4) * dt)) + (Math.random() - .5) * f.fight * .6;
      g.fy = Math.max(0, Math.min(100, g.fy));
      g.pv += (g.held ? 220 : -220) * dt; g.py += g.pv * dt; if (g.py < 0) { g.py = 0; g.pv = Math.abs(g.pv) * .3; } if (g.py > 100 - g.zone) { g.py = 100 - g.zone; g.pv = -Math.abs(g.pv) * .3; }
      const inside = g.fy >= g.py - 2 && g.fy <= g.py + g.zone + 2; g.line += (inside ? 17 : -(5 + f.fight * 1.2)) * dt; if (inside && Math.floor(g.t * 8) !== Math.floor((g.t - dt) * 8)) fsfx("tick");
      g.bob[0] += (Math.random() - .5) * f.fight * 1.5; g.bob[0] = Math.max(TIP[0] + 30, Math.min(W - 40, g.bob[0])); g.bob[1] = SURF + 2 + Math.sin(g.t * 9) * 2;
      if (g.line >= 100) land(); else if (g.line <= 0) { g.phase = "lost"; g.t = 0; g.shake = .4; fsfx("snap"); tell("The line parts. The " + f.b.name.toLowerCase() + " keeps the hook as a souvenir. Press to cast again."); } }
    g.spray = g.spray.filter((s) => (s.life -= dt) > 0); g.spray.forEach((s) => { s.vy += 160 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }); g.rings = g.rings.filter((r) => (r.life -= dt * .9) > 0); g.rings.forEach((r) => { r.r += 28 * dt; });
    draw(); raf = requestAnimationFrame(step);
  };
  const draw = () => {
    c.save(); if (g.shake > 0 && !reduceMotion) c.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 4));
    c.fillStyle = "#070a2a"; c.fillRect(-4, -4, W + 8, H + 8);
    c.fillStyle = "#ffffff"; stars.forEach(([x, y, s]) => { c.globalAlpha = .35 + .4 * ((s + Math.floor(g.t * 2)) % 3) / 2; c.fillRect(x, y, 1, 1); }); c.globalAlpha = 1;
    c.fillStyle = "#7a1c1e"; c.beginPath(); c.arc(276, 30, 14, 0, 7); c.fill(); c.fillStyle = "#b02e20"; c.beginPath(); c.arc(273, 27, 11, 0, 7); c.fill(); c.fillStyle = "#4a0c10"; c.fillRect(270, 31, 3, 2); c.fillRect(277, 24, 2, 2);   /* the old sun */
    const bands = ["#345c84", "#2e527a", "#284870", "#24406a", "#1e3860"]; bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, SURF + i * 14, W, 14); }); c.fillStyle = "#1a3058"; c.fillRect(0, SURF + 70, W, H);
    c.fillStyle = "#b0def0"; for (let x = 0; x < W; x += 6) if ((x / 6 + Math.floor(g.t * 3)) % 4 === 0) c.fillRect(x, SURF, 3, 1);   /* glints along the surface */
    g.rings.forEach((r) => { c.strokeStyle = "rgba(176,222,240," + r.life * .8 + ")"; c.beginPath(); c.ellipse(r.x, r.y, r.r, r.r * .25, 0, 0, 7); c.stroke(); });
    c.fillStyle = "#5c3a1a"; c.fillRect(0, SURF - 4, FGAME.pier, 5); c.fillStyle = "#8a5a2c"; for (let x = 2; x < FGAME.pier; x += 9) c.fillRect(x, SURF - 4, 7, 2); c.fillStyle = "#3a2410"; [10, 34, 58].forEach((x) => c.fillRect(x, SURF, 3, 22));   /* the pier */
    c.imageSmoothingEnabled = false; const fig = g.phase === "landed" ? flared : g.phase === "fight" ? lifted : keeper; c.drawImage(fig, KX, KY, fig.width / BIG, fig.height / BIG);
    if (g.phase !== "ready") {   /* the line and the float */
      c.strokeStyle = "#e8e6ff"; c.lineWidth = 1; c.beginPath(); c.moveTo(TIP[0], TIP[1]); const mid = [(TIP[0] + g.bob[0]) / 2, Math.max(TIP[1], g.bob[1]) + (g.phase === "fight" ? -6 : 10)]; c.quadraticCurveTo(mid[0], mid[1], g.bob[0], g.bob[1]); c.stroke();
      c.fillStyle = "#c83a3a"; c.fillRect(Math.round(g.bob[0]) - 2, Math.round(g.bob[1]) - 4, 4, 3); c.fillStyle = "#f4f4fa"; c.fillRect(Math.round(g.bob[0]) - 2, Math.round(g.bob[1]) - 1, 4, 3);
    }
    if (g.phase === "ready") { const x = TIP[0] + 8, y = TIP[1] - 24; c.fillStyle = "#0a0a14"; c.fillRect(x - 1, y - 1, 62, 8); c.fillStyle = "#24406a"; c.fillRect(x, y, 60, 6); c.fillStyle = g.meter > .85 ? "#ffd257" : "#7fd68a"; c.fillRect(x, y, Math.round(60 * g.meter), 6); c.fillStyle = "#fff"; c.fillRect(x + Math.round(60 * g.meter) - 1, y - 2, 2, 10); }
    if (g.flash > 0) { c.fillStyle = Math.floor(g.flash * 12) % 2 ? "#ffd257" : "#fff"; c.font = "bold 18px monospace"; c.fillText("!", g.bob[0] - 4, g.bob[1] - 14); }
    if (g.phase === "fight") {   /* the bar: the fish darting, the green zone, and the line drawn in beside it */
      const bx = 286, by = 24, bh = 120, lx = 304; c.fillStyle = "#0a0a14"; c.fillRect(bx - 2, by - 2, 16, bh + 4); c.fillRect(lx - 2, by - 2, 10, bh + 4); c.fillStyle = "#24406a"; c.fillRect(bx, by, 12, bh); c.fillStyle = "#14161f"; c.fillRect(lx, by, 6, bh);
      const zy = by + bh - (g.py + g.zone) / 100 * bh; c.fillStyle = "rgba(127,214,138,.55)"; c.fillRect(bx, zy, 12, g.zone / 100 * bh); c.fillStyle = "#7fd68a"; c.fillRect(bx, zy, 12, 1); c.fillRect(bx, zy + g.zone / 100 * bh - 1, 12, 1);
      const fy = by + bh - g.fy / 100 * bh; c.fillStyle = RARE_COL[g.fish.rarity]; c.fillRect(bx + 2, fy - 2, 6, 4); c.fillRect(bx + 8, fy - 3, 2, 6); c.fillStyle = "#0a0a14"; c.fillRect(bx + 3, fy - 1, 1, 1);   /* the fish */
      c.fillStyle = g.line > 60 ? "#7fd68a" : g.line > 30 ? "#ffd257" : "#ff7a5a"; c.fillRect(lx, by + bh - g.line / 100 * bh, 6, g.line / 100 * bh);
    }
    c.fillStyle = "#f4f4fa"; g.spray.forEach((s) => c.fillRect(Math.round(s.x), Math.round(s.y), 2, 2));
    c.restore();
  };
  const stop = () => { if (!alive) return; alive = false; cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey, true); document.removeEventListener("keyup", onUp, true); if (fishing && fishing.stop === stop) fishing = null; };
  const onKey = (e) => { if (reader.hidden || !cv.isConnected) return; if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(); } };
  const onUp = (e) => { if (e.key === " " || e.key === "Enter") release(); };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); press(); }); ["pointerup", "pointercancel"].forEach((t) => cv.addEventListener(t, release));
  document.addEventListener("keydown", onKey, true); document.addEventListener("keyup", onUp, true);
  toReady(); raf = requestAnimationFrame(step);
  return { stop, press, release, state: () => g };   /* state and the two moves are handed back so the game can be driven from outside (the tests do) */
}
