/* =====================================================================================================================
   HALF LIFE: THE RELICS                                                                                site/relics.js
   =====================================================================================================================

   When an entry without a photograph is opened, the "physical object" shown beside it (as lore notes are shown in
   games like Phantom Blade Zero) is an old piece of data storage, drawn here as an SVG picture: a floppy disk, a
   cassette, a punch card, and so on, with the entry's title written on its label in the author's hand.

   Every note gets its own: the kind of medium follows the entry number (so neighbouring entries never share one, and
   the first sixteen entries are all different), and everything else (colour, tilt, label paper, ink, wear, serial
   number, the holes in a punch card) comes from the entry's own name, so no two are alike, and each is the same
   on every visit.

   Used by blog.js:  Relics.svg({ seed, n, title, sub })  →  an <svg> string
                     Relics.name(n)                        →  what it is, for the caption ("3½-inch diskette, 1.44 MB")
     seed   anything unique to the note (its file name)    n      a number choosing the medium (the entry number)
     title  written on the label                           sub    a smaller second line (e.g. "No. 6")

   To add a medium: write a function like the others (it draws in a 400 × 400 box, centred on 200, 200, and is given
   o = { rnd, pick, title, sub, u, ... }) and add it to MEDIA with its name.
   ================================================================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------------------------------------- helpers */
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const dice = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const HAND = `'Caveat', 'Segoe Print', 'Bradley Hand', cursive`, TYPE = `'IBM Plex Mono', ui-monospace, monospace`;
  // Break a title into at most `lines` lines of about `chars` letters (the last one ends with … if it doesn't fit).
  function wrap(text, chars, lines) {
    const words = String(text).split(/\s+/).filter(Boolean), out = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > chars && line) { out.push(line); line = w; } else line = (line + " " + w).trim();
      if (out.length === lines) break;
    }
    if (out.length < lines && line) out.push(line);
    const used = out.join(" ").split(/\s+/).length;
    if (used < words.length && out.length) out[out.length - 1] = out[out.length - 1].replace(/.{0,2}$/, "") + "…";
    return out.map((l) => (l.length > chars + 2 ? l.slice(0, chars) + "…" : l));
  }
  // How many lines a title needs at `chars` letters a line, and the largest size (down to 60%) at which it fits in `lines`.
  const linesNeeded = (text, chars) => { let n = 1, line = 0; for (const w of String(text).split(/\s+/).filter(Boolean)) { if (line && line + 1 + w.length > chars) { n++; line = w.length; } else line += (line ? 1 : 0) + w.length; } return n; };
  function fit(text, w, size, lines) {
    for (let s = size; s >= size * .6; s -= 1) if (linesNeeded(text, Math.floor(w / (s * .44))) <= lines) return s;
    return size * .6;
  }
  // Handwriting: lines of text on a label, a little uneven, as written with a marker.
  function hand(o, x, y, w, size, lines, ink, anchor = "start", lh = 1.08) {
    return lines.map((l, i) => `<text x="${x + (o.rnd() - .5) * 3}" y="${y + i * size * lh}" font-family="${HAND}" font-size="${size}" fill="${ink}" text-anchor="${anchor}" transform="rotate(${((o.rnd() - .5) * 2.4).toFixed(2)} ${x} ${y + i * size * lh})" textLength="${Math.min(w, l.length * size * .42).toFixed(0)}" lengthAdjust="spacingAndGlyphs">${esc(l)}</text>`).join("");
  }
  // Fine wear: a few thin light scratches across a box.
  function wear(o, x, y, w, h, n = 6, op = .08) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const x1 = x + o.rnd() * w, y1 = y + o.rnd() * h, a = o.rnd() * Math.PI, l = 10 + o.rnd() * 40;
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + Math.cos(a) * l).toFixed(1)}" y2="${(y1 + Math.sin(a) * l).toFixed(1)}" stroke="#fff" stroke-opacity="${(op * (.5 + o.rnd())).toFixed(3)}" stroke-width=".7"/>`;
    }
    return s;
  }
  const screw = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#metal)" stroke="#000" stroke-opacity=".35" stroke-width=".8"/><path d="M${x - r * .6} ${y} H${x + r * .6} M${x} ${y - r * .6} V${y + r * .6}" stroke="#000" stroke-opacity=".45" stroke-width="1"/>`;
  // A paper sticker with ruled lines and the title written on it.
  function sticker(o, x, y, w, h, opts = {}) {
    const paper = opts.paper || o.paper, ink = opts.ink || o.ink, size = fit(o.title, w - 20, opts.size || Math.min(30, h / 2.6), opts.lines || 2);
    const lines = wrap(o.title, Math.max(6, Math.floor(w / (size * .44))), opts.lines || 2);
    let rules = "";
    if (opts.rules !== false) for (let ry = y + size * 1.15; ry < y + h - 4; ry += size * 1.08) rules += `<line x1="${x + 6}" y1="${ry}" x2="${x + w - 6}" y2="${ry}" stroke="${o.rule}" stroke-width=".8" opacity=".6"/>`;
    const band = opts.band ? `<rect x="${x}" y="${y}" width="${w}" height="${h * .16}" fill="${opts.band}"/>` : "";
    const top = opts.band ? y + h * .16 : y;
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${paper}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#paperShade)"/>${band}${rules}
      ${hand(o, x + 10, top + size * 1.0 + (opts.band ? 2 : 0), w - 20, size, lines, ink)}
      ${o.sub && opts.sub !== false ? `<text x="${x + w - 10}" y="${y + h - 8}" font-family="${HAND}" font-size="${size * .62}" fill="${ink}" text-anchor="end" opacity=".85">${esc(o.sub)}</text>` : ""}</g>`;
  }
  // Shared gradients and the shadow; ids are made unique per picture (u) so several can sit on one page.
  function defs(u) {
    return `<defs>
      <filter id="${u}sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".7"/></filter>
      <linearGradient id="${u}metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9ecf0"/><stop offset=".35" stop-color="#9aa1aa"/><stop offset=".55" stop-color="#d5d9de"/><stop offset="1" stop-color="#6d737b"/></linearGradient>
      <linearGradient id="${u}gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8892c"/><stop offset=".5" stop-color="#f3d27a"/><stop offset="1" stop-color="#a87a22"/></linearGradient>
      <linearGradient id="${u}sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity=".04"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
      <linearGradient id="${u}paperShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <radialGradient id="${u}platter" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#c9ced6"/><stop offset=".6" stop-color="#7d8590"/><stop offset="1" stop-color="#3b4048"/></radialGradient>
      <linearGradient id="${u}rainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5aae" stop-opacity=".0"/><stop offset=".3" stop-color="#ffd25a" stop-opacity=".35"/><stop offset=".45" stop-color="#5affb4" stop-opacity=".35"/><stop offset=".6" stop-color="#5ab4ff" stop-opacity=".35"/><stop offset=".75" stop-color="#b45aff" stop-opacity=".3"/><stop offset="1" stop-color="#ff5aae" stop-opacity="0"/></linearGradient>
      <radialGradient id="${u}tape" cx=".5" cy=".5" r=".5"><stop offset=".3" stop-color="#2a1a10"/><stop offset=".95" stop-color="#4a3020"/><stop offset="1" stop-color="#20140c"/></radialGradient>
    </defs>`;
  }

  /* ---------------------------------------------------------------------------------------------- the media */
  // Each draws its object (centred in a 400 × 400 box) and returns SVG. "#metal" etc. are rewritten to the unique ids.

  function floppy35(o) {                                                  // 3½-inch diskette
    const body = o.pick(["#1e2026", "#22396b", "#7a1f2b", "#d8d2c4", "#2f5a43", "#5b2a7a"]), light = body === "#d8d2c4";
    return `<path d="M68 60 H305 L332 87 V335 Q332 342 325 342 H75 Q68 342 68 335 Z" fill="${body}"/>
      <path d="M68 60 H305 L332 87 V335 Q332 342 325 342 H75 Q68 342 68 335 Z" fill="url(#sheen)"/>
      <rect x="140" y="60" width="148" height="104" fill="url(#metal)"/><rect x="140" y="60" width="148" height="104" fill="url(#sheen)" opacity=".6"/>
      <rect x="196" y="72" width="38" height="80" rx="2" fill="${light ? "#4a4a50" : "#0c0c10"}"/>
      <rect x="150" y="68" width="22" height="88" rx="2" fill="#000" opacity=".12"/>
      ${sticker(o, 98, 182, 204, 140, { band: o.pick(["#d33", "#36c", "#2a2", "#e90", null]) })}
      <rect x="78" y="312" width="12" height="14" fill="${light ? "#888" : "#000"}" opacity=".7"/><rect x="310" y="312" width="12" height="14" fill="${light ? "#888" : "#000"}" opacity=".7"/>
      ${wear(o, 70, 60, 260, 280)}`;
  }
  function floppy525(o) {                                                 // 5¼-inch floppy
    return `<rect x="62" y="62" width="276" height="276" rx="4" fill="#141418"/><rect x="62" y="62" width="276" height="276" rx="4" fill="url(#sheen)"/>
      <circle cx="200" cy="200" r="44" fill="#3d2a1a"/><circle cx="200" cy="200" r="38" fill="#5c3e26"/><circle cx="200" cy="200" r="20" fill="#08080a"/>
      <circle cx="200" cy="200" r="44" fill="none" stroke="#000" stroke-width="2"/>
      <rect x="186" y="262" width="28" height="68" rx="14" fill="#5c3e26"/><rect x="186" y="262" width="28" height="68" rx="14" fill="none" stroke="#000" stroke-width="2"/>
      <circle cx="252" cy="196" r="5" fill="#08080a"/>
      <rect x="330" y="96" width="9" height="20" fill="#000"/>
      <path d="M62 330 L72 338 H62 Z" fill="#000"/>
      ${sticker(o, 80, 74, 200, 74, { lines: 1, size: 34, paper: o.pick(["#f4efe2", "#fffbe6", "#e8f0ff"]) })}
      ${wear(o, 62, 62, 276, 276, 8, .07)}`;
  }
  function usb(o) {                                                       // USB stick
    const body = o.pick(["#2a2d33", "#b3262e", "#1f4f8f", "#e6e2d8", "#3f6d3a", "#f0b429"]);
    return `<g transform="rotate(-18 200 200)">
      <rect x="48" y="168" width="78" height="64" rx="3" fill="url(#metal)"/><rect x="62" y="182" width="14" height="12" fill="#222"/><rect x="62" y="206" width="14" height="12" fill="#222"/>
      <rect x="124" y="156" width="214" height="88" rx="22" fill="${body}"/><rect x="124" y="156" width="214" height="88" rx="22" fill="url(#sheen)"/>
      <circle cx="318" cy="200" r="11" fill="#000" opacity=".55"/><circle cx="318" cy="200" r="15" fill="none" stroke="url(#metal)" stroke-width="4"/>
      <circle cx="140" cy="176" r="3.5" fill="#6dff9e"/><circle cx="140" cy="176" r="7" fill="#6dff9e" opacity=".25"/>
      ${sticker(o, 152, 170, 140, 60, { lines: 2, size: 22, rules: false, sub: false })}
      ${wear(o, 124, 156, 214, 88, 5)}</g>
      <path d="M333 200 C 360 230, 350 300, 300 330" fill="none" stroke="${o.pick(["#c33", "#333", "#36c"])}" stroke-width="3" opacity=".8"/>`;
  }
  function sdcard(o) {                                                    // SD card
    const body = o.pick(["#1c1d22", "#2d4a7a", "#7c1d2a", "#3b3b44"]);
    let pins = ""; for (let i = 0; i < 9; i++) pins += `<rect x="${122 + i * 18}" y="80" width="12" height="${i === 0 ? 22 : 34}" rx="1.5" fill="url(#gold)"/>`;
    return `<path d="M110 70 H262 L292 100 V332 Q292 340 284 340 H118 Q110 340 110 332 Z" fill="${body}"/><path d="M110 70 H262 L292 100 V332 Q292 340 284 340 H118 Q110 340 110 332 Z" fill="url(#sheen)"/>
      ${pins}
      <rect x="104" y="150" width="10" height="34" rx="2" fill="#ddd"/><rect x="106" y="${o.rnd() < .5 ? 152 : 168}" width="8" height="14" fill="#999"/>
      <rect x="126" y="130" width="148" height="18" fill="${o.pick(["#d33", "#e90", "#36c", "#2a2"])}"/>
      <text x="134" y="144" font-family="${TYPE}" font-size="12" fill="#fff" letter-spacing="2">${o.pick(["SD", "SDHC", "SDXC"])} · ${o.pick(["4", "16", "32", "64", "128"])}GB</text>
      ${sticker(o, 126, 160, 148, 158, { lines: 3, size: 26 })}
      ${wear(o, 110, 70, 182, 270, 5)}`;
  }
  function cassette(o) {                                                  // audio cassette
    const body = o.pick(["#1d1d22", "#e9e4d8", "#2f3a5a", "#c43a2f", "#d8dde6"]);
    const reel = (x) => { let t = ""; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + o.rnd(); t += `<rect x="${x - 2}" y="188" width="4" height="9" fill="#fff" transform="rotate(${(a * 57.3).toFixed(0)} ${x} 200)"/>`; } return `<circle cx="${x}" cy="200" r="${22 + o.rnd() * 18}" fill="url(#tape)"/><circle cx="${x}" cy="200" r="14" fill="#f2f2f2"/>${t}<circle cx="${x}" cy="200" r="6" fill="#111"/>`; };
    return `<rect x="40" y="98" width="320" height="204" rx="12" fill="${body}"/><rect x="40" y="98" width="320" height="204" rx="12" fill="url(#sheen)"/>
      ${sticker(o, 62, 112, 276, 140, { lines: 1, size: 32, band: o.pick(["#e9532d", "#2d7fe9", "#e9b82d", "#7a3fc4"]), sub: false })}
      <rect x="120" y="170" width="160" height="58" rx="26" fill="#0b0b0e" opacity=".88"/>${reel(156)}${reel(244)}<rect x="120" y="170" width="160" height="58" rx="26" fill="url(#sheen)"/>
      <path d="M96 302 L118 262 H282 L304 302 Z" fill="${body}"/><path d="M96 302 L118 262 H282 L304 302 Z" fill="#000" opacity=".22"/>
      <circle cx="150" cy="284" r="7" fill="#0b0b0e"/><circle cx="250" cy="284" r="7" fill="#0b0b0e"/><rect x="186" y="276" width="28" height="14" fill="#0b0b0e"/>
      ${screw(56, 114, 4)}${screw(344, 114, 4)}${screw(56, 286, 4)}${screw(344, 286, 4)}
      ${o.sub ? `<text x="330" y="244" font-family="${HAND}" font-size="22" fill="${o.ink}" text-anchor="end">${esc(o.sub)}</text>` : ""}
      ${wear(o, 40, 98, 320, 204, 7)}`;
  }
  function cdr(o) {                                                       // CD-R, written on in marker
    const cs = fit(o.title, 230, 36, 2), lines = wrap(o.title, Math.floor(230 / (cs * .44)), 2), ink = o.pick(["#111", "#1a3fa8", "#b01c1c"]);
    return `<circle cx="200" cy="200" r="148" fill="${o.pick(["#cfd6df", "#d9c9a0", "#a9b7c9", "#2a2a2e"])}"/>
      <circle cx="200" cy="200" r="148" fill="url(#rainbow)"/><circle cx="200" cy="200" r="148" fill="url(#sheen)"/>
      <path d="M 200 52 A 148 148 0 0 1 330 130 L 200 200 Z" fill="#fff" opacity=".12"/>
      <circle cx="200" cy="200" r="46" fill="#e8ecf2" opacity=".55"/><circle cx="200" cy="200" r="46" fill="none" stroke="#fff" stroke-opacity=".5"/>
      <circle cx="200" cy="200" r="18" fill="#070709"/><circle cx="200" cy="200" r="148" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      ${lines.map((l, i) => `<text x="200" y="${118 + i * 38}" font-family="${HAND}" font-size="${cs}" fill="${ink}" text-anchor="middle" transform="rotate(${((o.rnd() - .5) * 8).toFixed(1)} 200 ${118 + i * 38})">${esc(l)}</text>`).join("")}
      ${o.sub ? `<text x="200" y="300" font-family="${HAND}" font-size="26" fill="${ink}" text-anchor="middle">${esc(o.sub)}</text>` : ""}
      ${wear(o, 60, 60, 280, 280, 10, .1)}`;
  }
  function minidisc(o) {                                                  // MiniDisc
    const body = o.pick(["#5b7fd9", "#d95b8a", "#3fae8c", "#2b2b33", "#c8a24a"]);
    return `<path d="M82 68 H318 V328 Q318 336 310 336 H90 Q82 336 82 328 Z" fill="${body}" opacity=".95"/><path d="M82 68 H318 V328 Q318 336 310 336 H90 Q82 336 82 328 Z" fill="url(#sheen)"/>
      <circle cx="200" cy="262" r="58" fill="#000" opacity=".25"/>
      <rect x="82" y="220" width="236" height="96" fill="url(#metal)"/><rect x="82" y="220" width="236" height="96" fill="url(#sheen)" opacity=".7"/>
      <rect x="190" y="236" width="20" height="64" rx="3" fill="#000" opacity=".2"/>
      ${sticker(o, 100, 84, 200, 120, { lines: 2, size: 30 })}
      <path d="M300 322 l10 -10 l-10 -10 z" fill="#fff" opacity=".7"/>
      ${wear(o, 82, 68, 236, 268, 5)}`;
  }
  function zip(o) {                                                       // chunky removable disk
    const body = o.pick(["#2a3f8c", "#1e1e24", "#7a7f88", "#2d6b6b"]);
    return `<rect x="66" y="56" width="268" height="290" rx="16" fill="${body}"/><rect x="66" y="56" width="268" height="290" rx="16" fill="url(#sheen)"/>
      <rect x="84" y="70" width="232" height="36" rx="6" fill="#000" opacity=".25"/>${Array.from({ length: 10 }, (_, i) => `<line x1="${96 + i * 22}" y1="76" x2="${96 + i * 22}" y2="100" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>`).join("")}
      <path d="M170 120 L230 120 L200 150 Z" fill="#fff" opacity=".5"/>
      ${sticker(o, 92, 168, 216, 150, { lines: 3, size: 28 })}
      <rect x="310" y="130" width="24" height="40" rx="3" fill="url(#metal)"/>
      ${wear(o, 66, 56, 268, 290, 7)}`;
  }
  function punchcard(o) {                                                 // 80-column punch card; the holes spell the title
    const cream = o.pick(["#efe3c2", "#f3ead2", "#e8dcc0", "#e6d3b0"]), x0 = 36, y0 = 118, cw = 4.1, rh = 13.2;
    let digits = "", holes = "";
    for (let r = 0; r < 12; r++) if (r >= 2) for (let c2 = 0; c2 < 80; c2 += 1) digits += `<text x="${x0 + 6 + c2 * cw}" y="${y0 + 40 + (r - 2) * rh}" font-family="${TYPE}" font-size="5" fill="#9a8a6a">${r - 2}</text>`;
    const text = String(o.title).toUpperCase().slice(0, 48);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i), rows = [code % 12, (code >> 3) % 12].filter((v, k, a) => a.indexOf(v) === k);
      for (const r of rows) holes += `<rect x="${x0 + 5 + i * cw * 1.6}" y="${y0 + 18 + r * rh}" width="3.4" height="8" fill="#151515"/>`;
    }
    return `<g transform="rotate(-6 200 200)"><path d="M${x0} ${y0} H${x0 + 336} V${y0 + 172} H${x0} V${y0 + 14} Z" fill="${cream}"/><path d="M${x0} ${y0} H${x0 + 336} V${y0 + 172} H${x0} V${y0 + 14} Z" fill="url(#paperShade)"/>
      <path d="M${x0} ${y0 + 14} L${x0 + 14} ${y0}" stroke="#a89878"/>
      ${digits}${holes}
      <text x="${x0 + 10}" y="${y0 + 12}" font-family="${TYPE}" font-size="9" fill="#555" letter-spacing="1.2">${esc(text.slice(0, 54))}</text>
      ${hand(o, x0 + 200, y0 + 158, 120, 20, [o.sub || ""], o.pick(["#1a3fa8", "#b01c1c"]))}
      ${wear(o, x0, y0, 336, 172, 4, .15)}</g>`;
  }
  function reel(o) {                                                      // reel-to-reel tape, with a tag on a string
    const plastic = o.pick(["#c9ced6", "#2a2a30", "#b8862e", "#7a1f2b"]);
    let cut = ""; for (let i = 0; i < 3; i++) cut += `<path d="M200 200 L ${200 + 120 * Math.cos(i * 2.094 + .5)} ${200 + 120 * Math.sin(i * 2.094 + .5)} A120 120 0 0 1 ${200 + 120 * Math.cos(i * 2.094 + 1.5)} ${200 + 120 * Math.sin(i * 2.094 + 1.5)} Z" fill="#000" opacity=".55"/>`;
    return `<circle cx="200" cy="200" r="${76 + o.rnd() * 40}" fill="url(#tape)"/>
      <circle cx="200" cy="200" r="150" fill="${plastic}" opacity=".9"/><circle cx="200" cy="200" r="150" fill="url(#sheen)"/>
      <g opacity=".95">${cut}</g><circle cx="200" cy="200" r="${70 + o.rnd() * 40}" fill="url(#tape)" opacity=".85"/>
      <circle cx="200" cy="200" r="30" fill="${plastic}"/><circle cx="200" cy="200" r="12" fill="#0b0b0e"/>
      <path d="M200 200 C 260 240, 300 300, 300 330" fill="none" stroke="#c8b48a" stroke-width="1.5"/>
      <g transform="rotate(14 300 330)">${sticker(o, 236, 318, 130, 64, { lines: 2, size: 20, rules: false, paper: "#efe3c2", sub: false })}<circle cx="246" cy="328" r="4" fill="#0b0b0e"/></g>`;
  }
  function vhs(o) {                                                       // VHS tape
    return `<rect x="36" y="104" width="328" height="192" rx="6" fill="#141417"/><rect x="36" y="104" width="328" height="192" rx="6" fill="url(#sheen)"/>
      <rect x="60" y="210" width="98" height="56" rx="6" fill="#050506"/><circle cx="96" cy="238" r="${18 + o.rnd() * 8}" fill="url(#tape)"/><circle cx="96" cy="238" r="7" fill="#ddd"/>
      <rect x="242" y="210" width="98" height="56" rx="6" fill="#050506"/><circle cx="300" cy="238" r="${18 + o.rnd() * 8}" fill="url(#tape)"/><circle cx="300" cy="238" r="7" fill="#ddd"/>
      ${sticker(o, 60, 120, 280, 72, { lines: 1, size: 34, paper: o.pick(["#fffbea", "#f2f2f2", "#ffe9e9"]) })}
      <rect x="170" y="214" width="60" height="50" rx="4" fill="#0e0e10"/><text x="200" y="245" font-family="${TYPE}" font-size="11" fill="#777" text-anchor="middle" letter-spacing="2">${o.pick(["SP", "LP", "EP"])}</text>
      ${wear(o, 36, 104, 328, 192, 9)}`;
  }
  function hdd(o) {                                                       // an opened hard drive
    let s = ""; for (const [x, y] of [[84, 66], [316, 66], [84, 334], [316, 334], [200, 66]]) s += screw(x, y, 6);
    return `<rect x="70" y="52" width="260" height="296" rx="10" fill="url(#metal)"/><rect x="70" y="52" width="260" height="296" rx="10" fill="url(#sheen)"/>
      <rect x="84" y="78" width="232" height="232" rx="116" fill="#000" opacity=".25"/>
      <circle cx="200" cy="186" r="108" fill="url(#platter)"/><circle cx="200" cy="186" r="108" fill="url(#rainbow)" opacity=".6"/>
      <circle cx="200" cy="186" r="30" fill="url(#metal)"/>${screw(200, 186, 8)}
      <path d="M290 300 L300 290 L214 182 L206 190 Z" fill="#cfd3d8" stroke="#555" stroke-width="1"/><circle cx="296" cy="296" r="18" fill="url(#metal)" stroke="#444"/>
      ${s}
      ${sticker(o, 96, 304, 170, 38, { lines: 1, size: 22, rules: false, paper: "#f6f6f2", sub: false })}
      ${wear(o, 70, 52, 260, 296, 10, .12)}`;
  }
  function cartridge(o) {                                                 // game cartridge
    const body = o.pick(["#8d9096", "#2a2b30", "#b3262e", "#3c5aa6"]);
    let ridge = ""; for (let i = 0; i < 9; i++) ridge += `<rect x="${110 + i * 21}" y="306" width="12" height="26" rx="2" fill="#000" opacity=".22"/>`;
    return `<path d="M76 70 H324 V316 H300 V340 H100 V316 H76 Z" fill="${body}"/><path d="M76 70 H324 V316 H300 V340 H100 V316 H76 Z" fill="url(#sheen)"/>
      <rect x="96" y="92" width="208" height="196" rx="6" fill="#000" opacity=".25"/>
      <rect x="104" y="100" width="192" height="180" rx="4" fill="${o.pick(["#1d1b2a", "#3a0f1f", "#0f2a28", "#2b1a0e"])}"/>
      <path d="M104 230 Q150 200 200 226 T296 214 V280 H104 Z" fill="${o.pick(["#ff5aae", "#5ab4ff", "#5affb4", "#ffd25a"])}" opacity=".35"/>
      <text x="200" y="128" font-family="${TYPE}" font-size="10" fill="#fff" opacity=".7" text-anchor="middle" letter-spacing="3">HALF LIFE · ARCHIVE</text>
      ${wrap(o.title, 14, 2).map((l, i) => `<text x="200" y="${172 + i * 30}" font-family="'Cinzel', Georgia, serif" font-size="24" fill="#fff" text-anchor="middle">${esc(l)}</text>`).join("")}
      ${o.sub ? `<text x="200" y="268" font-family="${TYPE}" font-size="11" fill="#fff" opacity=".7" text-anchor="middle" letter-spacing="2">${esc(o.sub.toUpperCase())}</text>` : ""}
      ${ridge}${wear(o, 76, 70, 248, 270, 8)}`;
  }
  function core(o) {                                                      // magnetic core memory plane, with a tag
    const board = o.pick(["#1b3a2a", "#3a2a1b", "#1b2a3a"]);
    let g = ""; for (let i = 0; i < 9; i++) g += `<line x1="96" y1="${96 + i * 26}" x2="304" y2="${96 + i * 26}" stroke="#c98a4a" stroke-width=".8"/><line x1="${96 + i * 26}" y1="96" x2="${96 + i * 26}" y2="304" stroke="#c98a4a" stroke-width=".8"/>`;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) g += `<ellipse cx="${96 + i * 26}" cy="${96 + j * 26}" rx="6.5" ry="4" transform="rotate(${(i + j) % 2 ? 45 : -45} ${96 + i * 26} ${96 + j * 26})" fill="none" stroke="#4a4a4e" stroke-width="2.6"/>`;
    return `<rect x="70" y="70" width="260" height="260" rx="6" fill="${board}"/><rect x="70" y="70" width="260" height="260" rx="6" fill="url(#sheen)"/>
      <rect x="84" y="84" width="232" height="232" fill="none" stroke="#c98a4a" stroke-width="3" opacity=".7"/>${g}
      ${screw(80, 80, 4)}${screw(320, 80, 4)}${screw(80, 320, 4)}${screw(320, 320, 4)}
      <path d="M320 320 C 330 340, 336 350, 330 358" stroke="#c8b48a" fill="none" stroke-width="1.4"/>
      <g transform="rotate(-10 300 360)">${sticker(o, 238, 340, 140, 52, { lines: 2, size: 18, rules: false, paper: "#efe3c2", sub: false })}</g>`;
  }
  function m2(o) {                                                        // M.2 solid-state stick
    const pcb = o.pick(["#0f3d22", "#141414", "#1a2b5c"]);
    let pins = ""; for (let i = 0; i < 12; i++) pins += `<rect x="${44 + (i > 4 ? 6 : 0) + i * 5}" y="${i % 2 ? 214 : 186}" width="3.4" height="18" fill="url(#gold)"/>`;
    return `<g transform="rotate(-14 200 200)"><path d="M40 176 H352 A 14 14 0 0 1 352 224 H40 Z" fill="${pcb}"/><path d="M40 176 H352 A 14 14 0 0 1 352 224 H40 Z" fill="url(#sheen)"/>
      <rect x="40" y="182" width="66" height="36" fill="url(#gold)" opacity=".85"/><rect x="66" y="176" width="6" height="16" fill="#000"/>
      <rect x="118" y="182" width="56" height="36" rx="2" fill="#111"/><rect x="186" y="182" width="56" height="36" rx="2" fill="#111"/><rect x="254" y="184" width="40" height="32" rx="2" fill="#111"/>
      <circle cx="352" cy="200" r="9" fill="#d8b46a"/><circle cx="352" cy="200" r="4" fill="#111"/>
      ${sticker(o, 128, 170, 160, 60, { lines: 2, size: 20, rules: false, paper: "#f2f2f2", sub: false })}
      ${wear(o, 40, 176, 320, 48, 5)}</g>`;
  }
  function crystal(o) {                                                   // a glass data disc, written by light
    const hue = o.pick(["#7fd7ff", "#c79bff", "#7fffc4", "#ffb37f"]);
    let dots = ""; for (let i = 0; i < 140; i++) { const a = o.rnd() * 6.283, r = 30 + o.rnd() * 95; dots += `<circle cx="${(200 + Math.cos(a) * r).toFixed(1)}" cy="${(200 + Math.sin(a) * r).toFixed(1)}" r="${(.6 + o.rnd() * 1.2).toFixed(2)}" fill="${hue}" opacity="${(.3 + o.rnd() * .6).toFixed(2)}"/>`; }
    let rings = ""; for (let r = 40; r < 130; r += 9) rings += `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${hue}" stroke-opacity="${(.05 + o.rnd() * .15).toFixed(2)}" stroke-dasharray="${(2 + o.rnd() * 8).toFixed(1)} ${(2 + o.rnd() * 6).toFixed(1)}"/>`;
    return `<circle cx="200" cy="200" r="142" fill="#cfe8ff" opacity=".2"/><circle cx="200" cy="200" r="142" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
      <circle cx="200" cy="200" r="134" fill="none" stroke="#fff" stroke-opacity=".15"/>${rings}${dots}
      <path d="M110 110 A 128 128 0 0 1 290 110" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>
      <path id="${o.u}arc" d="M 82 214 A 118 118 0 0 0 318 214" fill="none"/>
      <text font-family="${TYPE}" font-size="11" fill="#fff" fill-opacity=".75" letter-spacing="2"><textPath href="#${o.u}arc" startOffset="50%" text-anchor="middle">${esc(String(o.title).toUpperCase().slice(0, 38))}${o.sub ? " · " + esc(o.sub.toUpperCase()) : ""}</textPath></text>`;
  }
  function sim(o) {                                                       // SIM card, still in its snap-out frame
    const frame = o.pick(["#f2f2f2", "#e8e1cc", "#ffe1e6", "#e1ecff"]);
    let c2 = ""; for (let i = 0; i < 6; i++) c2 += `<rect x="${i % 2 ? 214 : 170}" y="${172 + Math.floor(i / 2) * 22}" width="38" height="18" rx="2" fill="url(#gold)" stroke="#8a6a20" stroke-width=".6"/>`;
    return `<rect x="50" y="86" width="300" height="228" rx="16" fill="${frame}"/><rect x="50" y="86" width="300" height="228" rx="16" fill="url(#paperShade)"/>
      <path d="M150 150 H262 L282 170 V256 H150 Z" fill="none" stroke="#000" stroke-opacity=".25" stroke-dasharray="3 3"/>
      ${c2}
      <rect x="70" y="100" width="260" height="20" fill="${o.pick(["#d33", "#36c", "#2a2", "#e90", "#7a3fc4"])}"/>
      ${hand(o, 72, 290, 220, fit(o.title, 220, 26, 1), wrap(o.title, Math.floor(220 / (fit(o.title, 220, 26, 1) * .44)), 1), o.ink)}
      <text x="330" y="140" font-family="${TYPE}" font-size="10" fill="#555" text-anchor="end" letter-spacing="1">${o.serial}</text>
      ${o.sub ? `<text x="330" y="160" font-family="${HAND}" font-size="20" fill="${o.ink}" text-anchor="end">${esc(o.sub)}</text>` : ""}`;
  }

  // The order the media come in: entry 1 gets the first, entry 2 the second, and so on round again.
  const MEDIA = [
    [floppy35, "3½-inch diskette, 1.44 MB"], [cassette, "audio cassette, C90"], [usb, "USB stick"], [punchcard, "punch card, 80 columns"],
    [cdr, "CD-R, written in marker"], [floppy525, "5¼-inch floppy, 360 KB"], [sdcard, "SD card"], [reel, "reel-to-reel tape"],
    [minidisc, "MiniDisc"], [hdd, "hard drive, opened"], [cartridge, "game cartridge"], [core, "magnetic core memory, 81 bits"],
    [vhs, "VHS tape"], [m2, "M.2 drive"], [zip, "removable disk, 100 MB"], [crystal, "glass data disc, written by light"], [sim, "SIM card"]
  ];

  window.Relics = {
    count: MEDIA.length,
    name: (n) => MEDIA[(((n | 0) - 1) % MEDIA.length + MEDIA.length) % MEDIA.length][1],
    svg({ seed = "", n = 1, title = "", sub = "" } = {}) {
      const rnd = dice(hash(String(seed)));
      const o = { rnd, pick: (list) => list[Math.floor(rnd() * list.length)], title: title || "Untitled", sub, u: "r" + hash(seed + "u").toString(36) + "_" };
      o.paper = o.pick(["#f6f1e4", "#fffbea", "#f3f3ee", "#fbeee0", "#eef4ff"]);
      o.ink = o.pick(["#151515", "#1a3fa8", "#1a1a40", "#7a1010"]);
      o.rule = o.pick(["#9bb8e8", "#e8a0a0", "#c8c0a8"]);
      o.serial = "HL-" + (hash(seed + "s") % 1e6).toString().padStart(6, "0");
      const [draw] = MEDIA[(((n | 0) - 1) % MEDIA.length + MEDIA.length) % MEDIA.length];
      const tilt = ((rnd() - .5) * 12).toFixed(1);
      const body = draw(o).replace(/url\(#(\w+)\)/g, `url(#${o.u}$1)`);
      return `<svg class="relic-svg" viewBox="0 0 400 400" role="img" aria-label="${esc(MEDIA[(((n | 0) - 1) % MEDIA.length + MEDIA.length) % MEDIA.length][1])}, labelled ${esc(title)}">${defs(o.u)}<g filter="url(#${o.u}sh)" transform="rotate(${tilt} 200 200)">${body}</g></svg>`;
    }
  };
})();
