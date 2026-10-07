/* ==========================================================================
   9. MAP
   The coastline comes from map-land.json (the whole world, coarse) and
   map-bay.json (San Francisco Bay, Hong Kong and Shanghai, fine). Both are
   painted small and blown up, so the map looks like a game's world map.

   makeMap() is the map itself: it draws, zooms and moves. It is used twice,
   for the big map and for the small one under the status window.
   showMap() is the Map screen around it: the buttons, the list of places,
   the card, and what happens when you point, tap or drag.

   A pin is a place (places/ folder). A place can list landmarks; a landmark
   with its own coordinates also appears on the map as a small box.
   ========================================================================== */
const KINDS = {   /* label, colour, and a 7x7 picture for the pin */
  home: ["Home", "#ffffff", ["...#...", "..###..", ".#####.", "#######", ".#####.", ".##.##.", ".##.##."]],
  region: ["Regions", "#ff8a5c", ["##.....", "######.", "#######", "######.", "##.....", "##.....", "##....."]],
  fishing: ["Fishing", "#6fb7ff", [".......", "#..###.", "#######", "#######", "#######", "#..###.", "......."]],
  landmark: ["Landmarks", "#ffd257", [".#####.", ".#####.", ".#####.", ".#.....", ".#.....", ".#.....", "###...."]],
  hike: ["Hikes", "#7fd68a", ["...#...", "..###..", "..###..", ".#####.", ".#####.", "#######", "#######"]],
  trip: ["Trips", "#c79bff", ["...#...", "..###..", "#######", ".#####.", ".#####.", "##...##", "#.....#"]]
};
const merc = (lat, lng) => [(lng + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360)) / Math.PI) / 2];
let landPath = null, landWait = null;
let bay = null;   /* finer coastline around San Francisco Bay: { box, path, cityBox, city, home }, all in map units */
function loadLand() {
  if (!landWait) landWait = fetch("map-land.json").then((r) => { if (!r.ok) throw new Error("status " + r.status); return r.json(); }).then((d) => {
    const path = new Path2D(), q = d.q || 100;
    for (const ring of d.rings) {   /* each ring: a start point, then steps from one point to the next */
      let x = ring[0], y = ring[1], m = merc(y / q, x / q); path.moveTo(m[0], m[1]);
      for (let i = 2; i + 1 < ring.length; i += 2) {
        let step = ring[i]; if (step > 180 * q) step -= 360 * q; else if (step < -180 * q) step += 360 * q;   /* a coast that crosses the date line carries on past the edge instead of jumping back across the map */
        x += step; y += ring[i + 1]; m = merc(y / q, x / q); path.lineTo(m[0], m[1]);
      }
      path.closePath();
    }
    landPath = path;
    return fetch("map-bay.json").then((r) => (r.ok ? r.json() : null)).then((b) => {   /* optional: without it the Bay is just drawn coarsely */
      if (!b || !Array.isArray(b.bay)) return;
      const trace = (rings) => {
        const p = new Path2D();
        for (const ring of rings || []) {
          let x = ring[0], y = ring[1], m = merc(y / b.q, x / b.q); p.moveTo(m[0], m[1]);
          for (let i = 2; i + 1 < ring.length; i += 2) { x += ring[i]; y += ring[i + 1]; m = merc(y / b.q, x / b.q); p.lineTo(m[0], m[1]); }
          p.closePath();
        }
        return p;
      };
      const rect = (box) => { const a = merc(box[3], box[0]), z = merc(box[1], box[2]); return [a[0], a[1], z[0] - a[0], z[1] - a[1]]; };   /* [west, south, east, north] to x, y, width, height */
      bay = { box: rect(b.box), path: trace(b.bay), cityBox: rect(b.cityBox), city: trace(b.city), home: trace(b.home),
        more: (Array.isArray(b.more) ? b.more : []).map((m) => ({ box: rect(m.box), path: trace(m.rings) })) };   /* other stretches of coast drawn finely (Hong Kong, Shanghai) */
    }).catch(() => {});
  }).catch(() => { landWait = null; });   /* no coastline: the map still works, as pins on open sea */
  return landWait;
}
const SEA = [5, 7, 10], SEA_DOT = [20, 28, 42], LAND_A = [42, 47, 55], LAND_B = [54, 60, 69], COAST = [214, 214, 224], COAST_DIM = [140, 140, 152], HOME_A = [92, 80, 44], HOME_B = [112, 98, 54];
/* canvas: where to draw. cell: how many screen pixels each map dot covers. small: the simple version for the minimap. */
function makeMap(canvas, cell, small) {
  const c = canvas.getContext("2d", { willReadFrequently: true });
  const v = { x: .5, y: .4, scale: 1, pins: [], chosen: null, hit: [], marks: [], glow: null, blink: false };   /* x, y: centre of the view (0 to 1 across the world); scale: map dots per world width */
  let w = 8, h = 8;
  function size() {
    w = Math.max(8, Math.round(canvas.clientWidth / cell)); h = Math.max(8, Math.round(canvas.clientHeight / cell));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function clamp() {
    v.scale = Math.max(w, Math.min(w * 6000, v.scale || w)); v.x = ((v.x % 1) + 1) % 1;
    const half = h / 2 / v.scale, lo = .1 + half, hi = .82 - half;   /* keep the view between the far north and the far south */
    v.y = lo > hi ? .46 : Math.max(lo, Math.min(hi, v.y));
  }
  const spot = (p) => { const m = merc(p.lat, p.lng); let dx = m[0] - v.x; dx -= Math.round(dx); return [Math.round(w / 2 + dx * v.scale), Math.round(h / 2 + (m[1] - v.y) * v.scale)]; };
  function stamp(rows, x, y, colour) {   /* a pin: its shape in black, one dot fatter, then the shape in colour on top */
    for (let pass = 0; pass < 2; pass++) {
      c.fillStyle = pass ? colour : "#000";
      rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "#") { if (pass) c.fillRect(x - 3 + i, y - 3 + j, 1, 1); else c.fillRect(x - 4 + i, y - 4 + j, 3, 3); } });
    }
  }
  function draw() {
    size(); clamp();
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    if (landPath) {
      c.fillStyle = "#fff"; const reach = w / 2 / v.scale;
      for (const k of [-2, -1, 0, 1, 2]) {   /* the world repeats to the left and right; a copy can spill one world-width past its own edges */
        if (v.x + reach < k - 1 || v.x - reach > k + 2) continue;
        c.setTransform(v.scale, 0, 0, v.scale, w / 2 - (v.x - k) * v.scale, h / 2 - v.y * v.scale); c.fill(landPath, "evenodd");
      }
      if (bay && v.scale > w * 6 && v.x + reach > bay.box[0] && v.x - reach < bay.box[0] + bay.box[2]) {
        /* near home the coarse coast is wiped and redrawn finely: the Bay, then the city itself, then the home neighbourhood in its own colour */
        c.save(); c.setTransform(v.scale, 0, 0, v.scale, w / 2 - v.x * v.scale, h / 2 - v.y * v.scale);
        c.beginPath(); c.rect(bay.box[0], bay.box[1], bay.box[2], bay.box[3]); c.clip();
        c.fillStyle = "#000"; c.fillRect(bay.box[0], bay.box[1], bay.box[2], bay.box[3]);
        c.fillStyle = "#fff"; c.fill(bay.path, "evenodd");
        c.fillStyle = "#000"; c.fillRect(bay.cityBox[0], bay.cityBox[1], bay.cityBox[2], bay.cityBox[3]);
        c.fillStyle = "#fff"; c.fill(bay.city);
        c.fillStyle = "#ffff00"; c.fill(bay.home);
        c.restore();
      }
      if (bay && v.scale > w * 6) for (const m of bay.more) {
        if (v.x + reach < m.box[0] || v.x - reach > m.box[0] + m.box[2]) continue;
        c.save(); c.setTransform(v.scale, 0, 0, v.scale, w / 2 - v.x * v.scale, h / 2 - v.y * v.scale);
        c.beginPath(); c.rect(m.box[0], m.box[1], m.box[2], m.box[3]); c.clip();
        c.fillStyle = "#000"; c.fillRect(m.box[0], m.box[1], m.box[2], m.box[3]);
        c.fillStyle = "#fff"; c.fill(m.path, "evenodd");
        c.restore();
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    const im = c.getImageData(0, 0, w, h), d = im.data, land = new Uint8Array(w * h), edgeCol = small ? COAST_DIM : COAST;
    for (let i = 0; i < w * h; i++) land[i] = d[i * 4] > 110 ? (d[i * 4 + 2] < 100 ? 2 : 1) : 0;   /* 2 = the home neighbourhood */
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let col;
      if (land[i]) col = ((x > 0 && !land[i - 1]) || (x < w - 1 && !land[i + 1]) || (y > 0 && !land[i - w]) || (y < h - 1 && !land[i + w])) ? edgeCol : land[i] === 2 ? ((x + y) % 2 ? HOME_A : HOME_B) : ((x + y) % 2 ? LAND_A : LAND_B);
      else col = (x % 4 === 0 && y % 4 === 2) ? SEA_DOT : SEA;
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    v.hit = [];
    const pins = v.pins.filter((p) => p.lat != null), last = pins.indexOf(v.chosen);
    c.fillStyle = small ? "#7d62b8" : "#a585e6";   /* a dotted line joins the stops of each trip, in order */
    for (const name of new Set(pins.map((p) => p.trip).filter(Boolean))) {
      const stops = tripStops(name, pins).map(spot);
      for (let n = 1; n < stops.length; n++) {
        let [x0, y0] = stops[n - 1]; const [x1, y1] = stops[n];
        if (Math.abs(x1 - x0) > w * 2 || Math.abs(y1 - y0) > h * 4) continue;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, step = 0;
        for (let guard = 0; guard < 20000; guard++) {
          if ((small ? step % 2 === 0 : step % 4 < 2) && x0 >= 0 && y0 >= 0 && x0 < w && y0 < h) c.fillRect(x0, y0, 1, 1);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } step++;
        }
      }
    }
    if (last >= 0) pins.push(pins.splice(last, 1)[0]);   /* the chosen pin is painted last, on top */
    for (const p of pins) {
      const [x, y] = spot(p); if (x < -6 || y < -6 || x > w + 6 || y > h + 6) continue;
      const kind = KINDS[p.kind] || KINDS.landmark;
      if (small) { c.fillStyle = "#000"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = kind[1]; c.fillRect(x - 1, y - 1, 3, 3); }
      else {
        stamp(kind[2], x, y, kind[1]);
        if (p === v.chosen && !v.blink) { c.fillStyle = "#fff"; for (const [ax, ay, aw, ah] of [[-7, -7, 4, 1], [-7, -7, 1, 4], [4, -7, 4, 1], [7, -7, 1, 4], [-7, 7, 4, 1], [-7, 4, 1, 4], [4, 7, 4, 1], [7, 4, 1, 4]]) c.fillRect(x + ax, y + ay, aw, ah); }
      }
      v.hit.push([x, y, p]);
    }
    v.marks = [];
    if (!small) for (const p of v.pins) {   /* each landmark that has its own spot is drawn as its picture: in colour if visited, a locked silhouette if not.
                                               Where pictures would pile up, the ones that do not fit become small dots until you zoom in. */
      const spots = (p.landmarks || []).filter((l) => l.lat != null); if (!spots.length) continue;
      if (p.spread == null) { const ms = spots.map((l) => merc(l.lat, l.lng)); p.spread = Math.max(Math.max(...ms.map((m) => m[0])) - Math.min(...ms.map((m) => m[0])), Math.max(...ms.map((m) => m[1])) - Math.min(...ms.map((m) => m[1]))); }
      if (v.scale * p.spread < 34 && v.scale < w * 200) continue;   /* zoomed out so far they would all sit on one dot */
      const order = spots.slice().sort((a, b) => (b === v.glow) - (a === v.glow) || b.visited - a.visited), placed = [], dots = [];
      for (const l of order) {
        const [x, y] = spot(l); if (x < -9 || y < -9 || x > w + 9 || y > h + 9) continue;
        if (l === v.glow || !placed.some((q) => Math.abs(q[0] - x) < 15 && Math.abs(q[1] - y) < 15)) placed.push([x, y, l, p]);
        else if (!dots.some((q) => Math.abs(q[0] - x) < 4 && Math.abs(q[1] - y) < 4)) dots.push([x, y, l, p]);
      }
      for (const [x, y, l] of dots) { c.fillStyle = "#000"; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = l.visited ? "#7fd68a" : "#8c92a8"; c.fillRect(x - 1, y - 1, 3, 3); }
      for (const [x, y, l] of placed.reverse()) c.drawImage(landmarkStamp(l.icon, l.visited, l === v.glow), x - 9, y - 9);
      v.marks.push(...dots, ...placed);
    }
    if (v.after) v.after();
  }
  function fit(pins, minSpan) {   /* frame every pin, or the whole world when there are none */
    size();
    const ms = pins.filter((p) => p.lat != null).map((p) => merc(p.lat, p.lng));
    if (!ms.length) { v.x = .5; v.y = .4; v.scale = w; return; }
    const xs = ms.map((m) => m[0]), ys = ms.map((m) => m[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    v.x = (x0 + x1) / 2; v.y = (y0 + y1) / 2;
    v.scale = Math.min(w / (Math.max(x1 - x0, minSpan) * 1.5), h / (Math.max(y1 - y0, minSpan * h / w) * 1.5));
  }
  function zoomAt(clientX, clientY, factor) {   /* zoom in or out, keeping the spot under the pointer still */
    const r = canvas.getBoundingClientRect(), cx = (clientX - r.left) / r.width * w - w / 2, cy = (clientY - r.top) / r.height * h - h / 2;
    const mx = v.x + cx / v.scale, my = v.y + cy / v.scale;
    v.scale = Math.max(w, Math.min(w * 6000, v.scale * factor)); v.x = mx - cx / v.scale; v.y = my - cy / v.scale; draw();
  }
  function zoomBy(factor) { const r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor); }
  function goTo(p) {   /* travel to a place: frame its own landmark markers if it has any, otherwise just move in close */
    const spots = landmarksOf(p).filter((l) => l.lat != null);
    if (spots.length > 1) { fit(spots.concat(p), .0002); return; }
    if (p.lat == null) return;
    const m = merc(p.lat, p.lng); v.x = m[0]; v.y = m[1]; v.scale = Math.max(v.scale, w / .012);
  }
  return { v, draw, fit, zoomAt, zoomBy, goTo, cells: () => [w, h] };
}
/* Landmark pictures: 16 x 16, one letter per pixel, each letter a colour in "pal". */
const LANDMARK = {"pal": {"k": "#0b0b0e", "w": "#f4f4f0", "g": "#8a8f9a", "d": "#4a4f5a", "r": "#c8443a", "R": "#7d2a24", "o": "#e08a3c", "y": "#ffd257", "n": "#5fae62", "N": "#2f6b3c", "b": "#6fb7ff", "B": "#2f5f9a", "t": "#c9a66b", "T": "#7a5230", "p": "#c79bff", "s": "#b9b4a6", "S": "#6e6a60"}, "icons": {"pagoda": [".......yy.......", ".......rr.......", ".....RrrrrR.....", "...RRrrrrrrRR...", "..R...tttt...R..", "......tkkt......", "....RrrrrrrR....", "..RRrrrrrrrrRR..", ".R....tttt....R.", "......tkkt......", "...RrrrrrrrrR...", ".RRrrrrrrrrrrRR.", "R....tttttt....R", ".....tkTTkt.....", ".....tkTTkt.....", "...SSSSSSSSSS..."], "tower": [".......w........", ".......w........", ".......g........", "......gwg.......", "......pwp.......", ".....ppwpp......", "......pwp.......", "......gwg.......", ".......g........", "......ggg.......", "......gwg.......", ".....pgwgp......", ".....ggwgg......", "....gg.w.gg.....", "...gg..w..gg....", "..SSSSSSSSSSS..."], "obelisk": [".......w........", "......www.......", "......wsw.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", "......wss.......", ".....wwsss......", "..nnnSSSSSSnnn..", ".NNNNNNNNNNNNNN."], "skyline": ["................", ".......g........", ".......g..d.....", "..d...ggg.dd....", "..dd..gyg.dyd...", "..dyd.ggg.ddd.g.", ".ddyd.gyg.dyd.g.", ".dddddggg.ddddgg", ".dydddgygdddydgy", ".dddddgggdddddgg", ".dydydgygdydydgy", ".dddddgggdddddgg", ".dydydgygdydydgy", "SSSSSSSSSSSSSSSS", "BbBBbBBBbBBbBBbB", "BBBbBBbBBBBBbBBB"], "bridge": ["................", "................", "...r........r...", "...r........r...", "..rrr......rrr..", "..rRr......rRr..", ".rrRrr....rrRrr.", "r.rRr.rrrr.rRr.r", "..rRr......rRr..", "rrrrrrrrrrrrrrrr", "RRRRRRRRRRRRRRRR", "..rRr......rRr..", "..rRr......rRr..", "BbBRBBbBBBbBRBBb", "BBBbBBBBbBBBBbBB", "bBBBBbBBBBbBBBBB"], "peak": ["................", ".......w........", "......www.......", "......wws.......", ".....wwsss......", ".....wsssS......", "....sssssSS.....", "....ssssSSS..w..", "...ssssSSSSSwws.", "...sssSSSSSSssSS", "..nssSSSSSSssSSS", "..nnsSSSSSnsSSSS", ".nnnnNSSSnnnNSSS", ".nnnNNNNnnnNNNNS", "nnnNNNNNnnNNNNNN", "NNNNNNNNNNNNNNNN"], "pillars": ["................", "...n.......n....", "..nnn.....nNn...", "..sNs..n..sNs...", "..sss.nNn.sSs...", "..sSs.sNs.sSs.n.", "..sSs.sss.sSs.Nn", "..sSs.sSs.sSsnsS", "..sSs.sSs.sSs.sS", ".wsSs.sSs.sSs.sS", "wwsSswsSswsSs.sS", "..sSswwSs.sSswsS", "w.sSs.sSswwSswwS", "ww.Ss.sSs.wSs.wS", ".wwwwwwSwwwwwww.", "..wwwwwwwwwwww.."], "cave": ["................", "....SSSSSSS.....", "..SSsssssssSS...", ".SsssssssssssS..", ".SsssSSSSSsssSS.", "SsssSkkkkkSsssS.", "SssSkkkkkkkSssS.", "SssSkkkkkkkkSsSS", "SsSkkkkkkkkkSssS", "SsSkkkkkkkkkkSsS", "SsSkkkkwkkkkkSsS", "SsSkkkkwwkkkkSsS", "sSkkkkwwwkkkkkSs", "nSkkkwwwwwkkkkSn", "nnNkkwwwwwwkkNnn", "NNNNNNNNNNNNNNNN"], "museum": ["................", "................", ".......ww.......", ".....wwsswww....", "...wwssssssww...", ".wwsssssssssssw.", "wwwwwwwwwwwwwwww", ".SSSSSSSSSSSSSS.", "..w.w.w..w.w.w..", "..w.w.w..w.w.w..", "..w.w.wkkw.w.w..", "..w.w.wkkw.w.w..", "..w.w.wkkw.w.w..", ".ssssssssssssss.", "SSSSSSSSSSSSSSSS", ".SSSSSSSSSSSSSS."], "dome": [".......y........", ".......w........", "......www.......", ".....wwsww......", "....wwsssww.....", "....wsssssw.....", "....wwwwwww.....", ".....w.w.w......", "....wwwwwww.....", "..wwwsssssswww..", ".wwwwwwwwwwwwww.", "..w.w.w.w.w.w.w.", "..w.w.wkkkw.w.w.", "..w.w.wkkkw.w.w.", ".ssssssssssssss.", "SSSSSSSSSSSSSSSS"], "house": ["................", "................", "......RR........", "....RRrrRR...d..", "..RRrrrrrrRR.d..", ".RrrrrrrrrrrRd..", "RrrrrrrrrrrrrrR.", ".tttttttttttttt.", ".tbbtttttttbbtt.", ".tbbtttttttbbtt.", ".ttttttTTttttttt", ".yoyoyoTToyoyoy.", ".ttttttTTtttttt.", ".ttttttTyttttt..", ".ttttttTTtttttt.", "SSSSSSSSSSSSSSSS"], "lantern": [".......T........", ".......T........", ".....yyyyy......", "....RrrrrrR.....", "...RrrrorrrR....", "..RrrroyorrrR...", "..RrroyyyorrR...", "..RrroyyyorrR...", "..RrrroyorrrR...", "...RrrrorrrR....", "....RrrrrrR.....", ".....yyyyy......", "......y.y.......", "......y.y.......", "......y.y.......", "................"], "buddha": [".......dd.......", "......gggg......", "......gkkg......", "......gggg......", ".....gggggg.....", "...gggggggggg...", "..ggggggggggdg..", "..gggdggggdggg..", "..ggg.dggd.ggg..", "...ggggyygggg...", "..gggggggggggg..", ".gggdddggdddggg.", ".ggggggggggggdg.", "..SSSSSSSSSSSS..", ".SSsSSsSSsSSsSS.", "SSSSSSSSSSSSSSSS"], "boat": ["................", ".......d........", ".......d..r.....", "......gdg.......", ".....ggdgg......", "....wwwwwwww....", "....wbbwbbww....", "..wwwwwwwwwwww..", "..wbbwbbwbbwbw..", ".nnnnnnnnnnnnnn.", ".NnnnnnnnnnnnnN.", "..NNnnnnnnnnNN..", "bBBNNNNNNNNNNBBb", "BBbBBBbBBBBbBBBB", "BBBBbBBBBbBBBBbB", "bBBBBBBbBBBBBBBB"], "cablecar": ["................", "dd..............", "..ddd...........", ".....dddd.......", ".......k.dddd...", ".......k.....ddd", "......kkk.......", "....rrrrrrr.....", "...rrrrrrrrr....", "...rbbrbbrbr....", "...rbbrbbrbr....", "...rrrrrrrrr....", "...RRRRRRRRR....", "....RRRRRRR.....", "................", "nNnnNNnnnNnnNNnn"], "tram": ["................", "......k.........", ".....k.k........", "....k...k.......", "..NNNNNNNNNNNN..", ".NnnnnnnnnnnnnN.", ".nbbnbbnbbnbbnn.", ".nbbnbbnbbnbbnn.", ".nnnnnnnnnnnnnn.", ".yNNNNNNNNNNNNy.", ".NNNNNNNNNNNNNN.", ".RRRRRRRRRRRRRR.", "..dkd......dkd..", "..kdk......kdk..", "dddddddddddddddd", "S.S.S.S.S.S.S.S."], "tree": ["................", "......nnnn......", "....nnnnnnnn....", "...nnnNnnnnnn...", "..nnnnnnnnNnnn..", "..nnNnnnnnnnnN..", ".nnnnnnnNnnnnNN.", ".nnnnnnnnnnnNNN.", ".NnnnNnnnnnNNNN.", "..NNnnnnnNNNNN..", "...NNNNNNNNNN...", "......TTT.......", "......TtT.......", "......TtT.......", ".....TTtTT......", "nnNnnnNNnnnNnnNn"], "panda": ["................", "..kkk......kkk..", ".kkkkk....kkkkk.", ".kkkwwwwwwwwkkk.", "..kwwwwwwwwwwk..", "..wwwwwwwwwwww..", ".wwkkkwwwwkkkww.", ".wkkwkkwwkkwkkw.", ".wkkkkkwwkkkkkw.", ".wwkkkwwwwkkkww.", ".wwwwwwkkwwwwww.", "..wwwwwkkwwwww..", "..wwwkwwwwkwww..", "...wwwkkkkwww...", "....wwwwwwww....", "................"], "lake": ["................", "......N.........", ".....NNN....N...", "....NNnNN..NNN..", "...NNnnnNNNNnNN.", "..NNnnnnnNNnnnNN", ".NNnnnnnnnNnnnnN", "NNNNNNNNNNNNNNNN", "bbbbbbbbbbbbbbbb", "bBbbbwwbbbbBbbbb", "bbbbBbbbbwwbbbBb", "BbbbbbbBbbbbbbbb", "bbwwbbbbbbbBbbbb", "BBbbbbBbbbbbbwwb", "bbbBbbbbbBbbbbbB", "BBBBBBBBBBBBBBBB"], "cathedral": [".......y........", ".......y........", "..y....w....y...", "..w...www...w...", ".www..wsw..www..", ".wsw..wsw..wsw..", ".wsw.wwsww.wsw..", ".wswwwsssswwsw..", ".wswssssssswsw..", ".wswsskkksswsw..", ".wswskbbbkswsw..", ".wswskbbbkswsw..", ".wswssTTTsswsw..", ".wswssTTTsswsw..", "SSSSSSSSSSSSSSSS", ".SSSSSSSSSSSSSS."], "carousel": [".......y........", ".......r........", ".....rrwrr......", "...rrwwrwwrr....", ".rrwwrrwrrwwrr..", "rwwrrwwrwwrrwwr.", "yyyyyyyyyyyyyyy.", ".d...d...d...d..", ".d.w.d...d.w.d..", ".dwwwd...dwwwd..", ".d.w.d.w.d.w.d..", ".d...dwwwd...d..", ".d...d.w.d...d..", ".rrrrrrrrrrrrr..", "RRRRRRRRRRRRRRR.", ".SSSSSSSSSSSSS.."], "cup": ["................", ".....w...w......", "....w...w.......", ".....w...w......", "....w...w.......", "................", "..wwwwwwwwww....", "..wTTTTTTTTwww..", "..wTTTTTTTTw.ww.", "..wwwwwwwwww..w.", "..wwwwwwwwww.ww.", "...wwwwwwwwww...", "...wwwwwwww.....", "....wwwwww......", ".ssssssssssss...", "..SSSSSSSSSS...."], "note": ["................", "......yyyyyyyy..", "......yyyyyyyy..", "......y......y..", "......y......y..", "......y......y..", "......y......y..", "......y......y..", "......y......y..", "...yyyy...yyyy..", "..yyyyy..yyyyy..", "..yyyyy..yyyyy..", "...yyy....yyy...", "................", "................", "................"], "gem": ["................", "................", "....nnnnnnnn....", "...nwwnnnnnNn...", "..nwwnnnnnnNNn..", ".nnnnnnnnnnnNNn.", ".NNNNNNNNNNNNNN.", ".nnnNnnnnnNNNNN.", "..nnnNnnnNNNNN..", "...nnnNnNNNNN...", "....nnnNNNNN....", ".....nnNNNN.....", "......nNNN......", ".......NN.......", "................", "................"]}};
function landmarkPic(icon, lit, halo) {   /* lit: in colour (been there); otherwise locked, a dark shape with a pale edge. halo: a one-pixel surround, for use on the map */
  const pad = halo ? 1 : 0, c = el("canvas"), x = c.getContext("2d"); c.width = c.height = 16 + pad * 2; c.setAttribute("aria-hidden", "true");
  const rows = Object.prototype.hasOwnProperty.call(LANDMARK.icons, icon) ? LANDMARK.icons[icon] : LANDMARK.icons.museum;
  const on = (i, y) => y >= 0 && y < rows.length && i >= 0 && i < rows[y].length && rows[y][i] !== ".";
  if (halo) { x.fillStyle = halo; rows.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (on(i, y)) x.fillRect(i, y, 3, 3); }); }
  rows.forEach((row, y) => { for (let i = 0; i < row.length; i++) {
    if (!on(i, y)) continue;
    x.fillStyle = lit ? (LANDMARK.pal[row[i]] || "#fff") : (on(i - 1, y) && on(i + 1, y) && on(i, y - 1) && on(i, y + 1)) ? "#14161f" : "#8c92a8";
    x.fillRect(i + pad, y + pad, 1, 1);
  } });
  return c;
}
const stamps = {};   /* the same pictures ready for the map, made once each */
const landmarkStamp = (icon, lit, glow) => { const k = icon + "|" + lit + "|" + glow; return stamps[k] || (stamps[k] = landmarkPic(icon, lit, glow ? "#ffffff" : "#000000")); };
function landmarksOf(p) {   /* a place's own landmarks; a pin with none of its own shows the ones other places have marked close by (a city inside a region) */
  if (p.landmarks.length || p.lat == null) return p.landmarks;
  if (!p.near) p.near = PLACES.filter((o) => o !== p).flatMap((o) => o.landmarks.filter((l) => l.lat != null && Math.abs(l.lat - p.lat) < .55 && Math.abs(l.lng - p.lng) < .5));
  return p.near;
}
const been = (p) => landmarksOf(p).filter((l) => l.visited).length;
const mapOff = new Set();   /* kinds of pin switched off with the buttons above the map */
/* Entries, albums and fish name a place in words ("Pine Lake, California"). This finds the pin they mean. */
function pinFor(where) {
  const t = String(where || "").trim().toLowerCase(); if (!t) return null;
  const first = t.split(",")[0].trim(), names = PLACES.map((p) => p.name.trim().toLowerCase());
  let i = names.indexOf(t);
  if (i < 0) i = names.findIndex((n) => n && (t.includes(n) || (first && n.includes(first))));
  return i < 0 ? null : PLACES[i];
}
const fishAt = (p) => BESTIARY.map((b, i) => [b, i]).filter(([b]) => b.status !== "wanted" && pinFor(b.location) === p);
/* The stops of one trip, in order: by stop number, then date, then name. */
function tripStops(name, pins) {
  return pins.filter((p) => p.trip && p.trip === name).sort((a, b) =>
    (a.stop == null ? 1e9 : a.stop) - (b.stop == null ? 1e9 : b.stop) || a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
/* the Map screen. chooseFile: a place to open on (used by every "Show on map" button) */
function showMap(focusFirst, chooseFile) {
  const wantedPin = chooseFile ? PLACES.find((p) => p.file === chooseFile) : null;
  if (wantedPin) mapOff.delete(wantedPin.kind);   /* asked to show a pin whose kind is switched off: switch it back on */
  openScreen("map", "m-map");
  const chips = el("div", "chips"), box = el("div", "mapbox"), canvas = el("canvas"), keys = el("div", "mapkeys");
  const wrap = el("div", "beasts maplist"), list = el("div", "beastlist"), card = el("div", "beastcard");
  canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "Map with a pin for each place in the list below");
  const map = makeMap(canvas, 3, false);
  const key = (text, label, fn, cls) => { const b = el("button", cls, text); b.type = "button"; b.setAttribute("aria-label", label); b.addEventListener("click", fn); keys.append(b); };
  key("+", "Zoom in", () => map.zoomBy(1.8)); key("-", "Zoom out", () => map.zoomBy(1 / 1.8)); key("All", "Show every pin", () => { map.fit(map.v.pins, .01); map.draw(); }, "wide");
  const tip = el("div", "maptip"); tip.hidden = true;
  box.append(canvas, tip, keys);
  let hovered = null, mark = null, tipFor = null;
  map.v.after = () => {   /* keep a label beside the landmark being pointed at, or the pin being pointed at, or else the chosen pin */
    const [w, h] = map.cells(), m = mark && map.v.marks.find((k) => k[2] === mark);
    const p = m ? null : (hovered || map.v.chosen), hit = m || (p && map.v.hit.find((k) => k[2] === p));
    if (!hit || hit[0] < 0 || hit[1] < 0 || hit[0] > w || hit[1] > h) { tip.hidden = true; return; }
    if (tipFor !== hit[2]) {
      tipFor = hit[2]; tip.textContent = ""; tip.classList.toggle("big", !!m);
      if (m) tip.append(landmarkPic(mark.icon, mark.visited), el("span", null, mark.name), el("span", "state", mark.visited ? "Been there" : "Not yet  -  " + MAP_EXP.landmark + " EXP"));
      else tip.append(p.name + (landmarksOf(p).length ? "  " + been(p) + "/" + landmarksOf(p).length : ""));
    }
    tip.style.left = (hit[0] / w * 100) + "%"; tip.style.top = (hit[1] / h * 100) + "%";
    tip.classList.toggle("left", hit[0] > w * .62); tip.hidden = false;
  };
  function showCard(p) {
    card.textContent = "";
    if (!p) { card.append(el("p", "sub", PLACES.length ? "Point at a pin, or a place in the list." : "No places marked yet.")); return; }
    const kind = KINDS[p.kind] || KINDS.landmark, facts = el("dl", "facts"), fact = (k, node) => { const dd = el("dd"); dd.append(node); facts.append(el("dt", null, k), dd); return dd; };
    fact("Kind", kind[0].replace(/s$/, "")).className = "kind " + p.kind;
    if (p.date) fact("Date", day(p.date));
    if (p.lat == null) fact("Pin", "No coordinates yet");
    const stops = p.trip ? tripStops(p.trip, PLACES) : [], at = stops.indexOf(p);
    if (stops.length > 1) fact("Trip", p.trip + "  (stop " + (at + 1) + " of " + stops.length + ")");
    card.append(el("h2", null, p.name), facts);
    if (stops.length > 1) {   /* step along the route */
      const row = el("div", "row");
      if (stops[at - 1]) row.append(opt("Prev stop", () => { mapOff.delete(stops[at - 1].kind); choose(stops[at - 1], true); }));
      if (stops[at + 1]) row.append(opt("Next stop", () => { mapOff.delete(stops[at + 1].kind); choose(stops[at + 1], true); }));
      card.append(row);
    }
    if (p.note) { const note = el("div", "post lore"); renderBody(p.note, note); card.append(note); }
    const marks = landmarksOf(p);
    if (marks.length) {   /* the landmarks here: in colour and ticked if visited, a dim outline if not */
      const head = el("p", "lmhead"), grid = el("ul", "lms"), done = been(p);
      head.append(el("span", null, "Landmarks"), el("span", "lmcount", done + " / " + marks.length));
      marks.forEach((l) => {
        const tile = el("li", "lm" + (l.visited ? " done" : ""));
        tile.append(landmarkPic(l.icon, l.visited), el("span", "lmname", l.name), el("span", "tick"));
        tile.setAttribute("aria-label", l.name + (l.visited ? ": been there" : ": not yet"));
        if (l.lat != null) {   /* this one has its own marker: pointing at the tile lights the marker, choosing it moves the map there */
          tile.classList.add("spot");
          tile.addEventListener("pointerenter", () => { map.v.glow = l; map.draw(); });
          tile.addEventListener("pointerleave", () => { if (map.v.glow === l) { map.v.glow = null; map.draw(); } });
          tile.addEventListener("click", () => { const m = merc(l.lat, l.lng); map.v.x = m[0]; map.v.y = m[1]; map.v.scale = Math.max(map.v.scale, map.cells()[0] * 1200); map.v.glow = l; mark = l; map.draw(); box.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" }); });
        }
        grid.append(tile);
      });
      card.append(head, grid);
    }
    const linked = (label, items) => {   /* things elsewhere on the site that name this place */
      if (!items.length) return;
      const row = el("div", "row caughthere"), tag = el("span", "sub", label); tag.style.margin = "0"; row.append(tag);
      items.forEach(([name, go]) => row.append(opt(name, go))); card.append(row);
    };
    linked("Photos:", ALBUMS.filter((a) => pinFor(a.place) === p).map((a) => [a.title, () => showAlbum(a)]));
    linked("Log:", sorted.filter((e) => pinFor(e.place) === p).map((e) => [e.title, () => showPost(e)]));
    linked("Caught here:", fishAt(p).map(([b, i]) => [b.name, () => showBestiary(true, i)]));
    if (p.photo) { const row = el("div", "row"); const b = opt("View photo", () => zoom(p.photo, p.name, b)); row.append(b); card.append(row); }
    card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
  }
  function choose(p, travel) {
    map.v.chosen = p || null;
    list.querySelectorAll(".opt").forEach((o) => o.setAttribute("aria-pressed", String(!!p && o.dataset.place === p.file)));
    if (p && travel) map.goTo(p);
    showCard(p); map.draw();
  }
  let quiet = false;   /* true while the cursor is being placed on the list without choosing anything */
  function refresh() {
    const shown = PLACES.filter((p) => !mapOff.has(p.kind));
    map.v.pins = shown; list.textContent = "";
    shown.forEach((p, i) => {
      const pick = () => { if (!quiet && b.getAttribute("aria-pressed") !== "true") choose(p, true); };
      const b = opt(null, () => choose(p, true), "place"); b.dataset.place = p.file; b.addEventListener("focus", pick);   /* choosing a name always travels there, even if pointing at it already showed its card */
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && map.v.chosen !== p) choose(p, false); });   /* pointing at a name shows that place */
      b.append(el("span", "dot " + p.kind), el("span", "name", p.name), el("span", "qty", landmarksOf(p).length ? been(p) + "/" + landmarksOf(p).length : "")); b.style.setProperty("--i", Math.min(i, 6));
      list.append(b);
    });
    if (!shown.includes(map.v.chosen)) choose(null); else choose(map.v.chosen);
  }
  Object.keys(KINDS).forEach((k) => {
    const n = PLACES.filter((p) => p.kind === k).length, b = el("button", "chip"); b.type = "button";
    b.append(el("span", "dot " + k), el("span", null, KINDS[k][0] + " " + n)); b.setAttribute("aria-pressed", String(!mapOff.has(k)));
    b.addEventListener("click", () => { if (mapOff.has(k)) mapOff.delete(k); else mapOff.add(k); b.setAttribute("aria-pressed", String(!mapOff.has(k))); refresh(); });
    chips.append(b);
  });
  /* drag to move, pinch or Ctrl + scroll to zoom, double-click to zoom in, tap a pin to choose it */
  const fingers = new Map(); let moved = 0, spread = 0;
  const gap = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  canvas.addEventListener("pointerdown", (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    fingers.set(e.pointerId, [e.clientX, e.clientY]); if (fingers.size === 1) moved = 0; if (fingers.size === 2) spread = gap();
    canvas.classList.add("dragging");
  });
  const under = (e, list, reach) => {   /* the pin (or landmark marker) nearest the pointer, if one is close */
    const r = canvas.getBoundingClientRect(), [w, h] = map.cells(), x = (e.clientX - r.left) / r.width * w, y = (e.clientY - r.top) / r.height * h;
    let best = null, near = reach;
    for (const k of list) { const far = Math.hypot(k[0] - x, k[1] - y); if (far < near) { near = far; best = k[2]; } }
    return best;
  };
  const pinUnder = (e) => under(e, map.v.hit, 7), markUnder = (e) => under(e, map.v.marks, 9);
  const light = (l) => {   /* show which tile in the card belongs to the landmark being pointed at */
    card.querySelectorAll(".lm.lit").forEach((t) => t.classList.remove("lit"));
    const p = map.v.chosen, i = l && p ? landmarksOf(p).indexOf(l) : -1, tile = i >= 0 && card.querySelectorAll(".lm")[i];
    if (tile) tile.classList.add("lit");
  };
  canvas.addEventListener("pointerleave", () => { if (hovered || mark) { hovered = null; mark = null; light(null); canvas.style.cursor = ""; map.draw(); } });
  canvas.addEventListener("pointermove", (e) => {
    if (!fingers.size && e.pointerType === "mouse") {   /* pointing at a landmark names it; pointing at a pin shows that place */
      const m = markUnder(e), p = m ? null : pinUnder(e);
      if (m !== mark || p !== hovered) {
        mark = m; hovered = p; canvas.style.cursor = m || p ? "pointer" : ""; light(m);
        if (p && p !== map.v.chosen) choose(p, false); else map.draw();
      }
      return;
    }
    const was = fingers.get(e.pointerId); if (!was) return;
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    const r = canvas.getBoundingClientRect(), [w] = map.cells(), per = w / (r.width || 1);
    if (fingers.size === 1) {
      moved += Math.abs(e.clientX - was[0]) + Math.abs(e.clientY - was[1]);
      map.v.x -= (e.clientX - was[0]) * per / map.v.scale; map.v.y -= (e.clientY - was[1]) * per / map.v.scale; map.draw();
    } else if (fingers.size === 2) {
      const now = gap(), [a, b] = [...fingers.values()]; moved += 20;
      if (spread > 0 && now > 0) map.zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, now / spread);
      spread = now;
    }
  });
  const lift = (e) => {
    if (!fingers.delete(e.pointerId)) return;
    if (fingers.size) return;
    canvas.classList.remove("dragging");
    if (e.type !== "pointerup" || moved > 8) return;
    const m = markUnder(e), best = m ? null : pinUnder(e);   /* a tap names the nearest landmark, or chooses the nearest pin */
    if (m || mark) { mark = m; light(m); map.draw(); }
    if (best) choose(best, false);
  };
  canvas.addEventListener("pointerup", lift); canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("wheel", (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); map.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .01)); }, { passive: false });
  canvas.addEventListener("dblclick", (e) => { e.preventDefault(); map.zoomAt(e.clientX, e.clientY, 2); });
  wrap.append(list, card);
  const marks = PLACES.reduce((n, p) => n + p.landmarks.length, 0), seen = PLACES.reduce((n, p) => n + p.landmarks.filter((l) => l.visited).length, 0);
  const mt = mapTally(), regs = el("span", "regions");
  mt.regions.forEach((r) => { const line = el("span", "region" + (r.seen === r.all ? " mastered" : "")); line.append(el("span", "rname", r.name), meter(r.seen, r.all, r.seen + "/" + r.all + (r.seen === r.all ? "  Mastered" : ""))); regs.append(line); });
  /* the map comes first; its stat block sits between the map and the list of places */
  main.append(el("p", "label", "Map"), chips, box, statBlock([["Standing", standing(EXPLORER_RANKS, mt.seen, mt.marks)], ["Landmarks", mt.marks ? meter(mt.seen, mt.marks) : ""], ["Regions", mt.regions.length ? regs : ""],
    ["Experience", mt.earned + " earned  (" + count(mt.places, "place") + ", " + count(mt.trips, "journey") + ")"]]), wrap, backRow());
  refresh(); map.fit(map.v.pins, .01);
  const homePin = PLACES.find((p) => p.kind === "home" && p.lat != null && !mapOff.has("home"));   /* with nothing else asked for, the map opens on home */
  if (wantedPin) choose(wantedPin, true); else if (homePin) choose(homePin, true); else map.draw();
  loadLand().then(() => { if (canvas.isConnected) map.draw(); });
  if (!reduceMotion) {   /* the frame around the chosen pin blinks */
    const timer = setInterval(() => { if (!canvas.isConnected) return clearInterval(timer); if (document.hidden || !map.v.chosen) return; map.v.blink = !map.v.blink; map.draw(); }, 480);
  }
  mapRedraw = () => { if (canvas.isConnected) map.draw(); };
  if (focusFirst) {
    const row = wantedPin && [...list.querySelectorAll(".opt")].find((o) => o.dataset.place === wantedPin.file);
    quiet = true; (row || list.querySelector(".opt") || main.querySelector(".chip")).focus({ preventScroll: true }); quiet = false;
  }
}
let mapRedraw = null;
/* the small map under the status window: every pin at a glance; choosing it opens the map */
const mini = makeMap($("#minimap canvas"), 2, true);
function drawMini() { mini.v.pins = PLACES; mini.fit(PLACES, .03); mini.draw(); }
$("#minimap").addEventListener("click", () => showMap(true));
window.addEventListener("resize", () => { drawMini(); if (mapRedraw) mapRedraw(); });
