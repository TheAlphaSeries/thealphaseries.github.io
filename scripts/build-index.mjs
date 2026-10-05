// Reads every entry in posts/ and the About page, and writes posts.json,
// the single file the site loads. Run automatically after each change.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

function unquote(v) {
  v = v.trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length > 1) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  if (v.startsWith("'") && v.endsWith("'") && v.length > 1) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}
// Splits a file into its header (title, date) and its text.
function parse(text) {
  text = text.replace(/^﻿/, "").replace(/^\s*\n/, "");
  // The header sits between two lines that are exactly "---"; dashes inside a title do not end it.
  const m = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(text);
  const meta = {};
  if (!m) return { meta, body: text.trim() };
  const lines = (m[1] || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const k = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!k) continue;
    let value = k[2].trim();
    const inline = /^\[(.*)\]$/.exec(value);
    if (inline) { meta[k[1]] = inline[1].trim() ? inline[1].split(",").map(unquote).filter(Boolean) : []; continue; }   // photos: [a, b]
    if (value === "" && i + 1 < lines.length && /^\s*-(\s|$)/.test(lines[i + 1])) {                                   // a list, one "- item" per line
      const list = [];
      while (i + 1 < lines.length && (/^\s*-(\s|$)/.test(lines[i + 1]) || (/^\s+\S/.test(lines[i + 1]) && list.length))) {
        const line = lines[++i], item = /^\s*-\s*(.*)$/.exec(line);
        if (item) list.push(unquote(item[1])); else list[list.length - 1] += " " + line.trim();
      }
      meta[k[1]] = list.filter(Boolean); continue;
    }
    const block = /^[>|][+-]?$/.test(value);                // a long value wrapped over several indented lines
    const parts = block ? [] : [value];
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
    meta[k[1]] = block ? parts.join(value.startsWith("|") ? "\n" : " ") : unquote(parts.join(" "));
  }
  return { meta, body: m[2].trim() };
}
const str = (v) => (Array.isArray(v) ? v.join(" ") : String(v == null ? "" : v));
const list = (v) => (Array.isArray(v) ? v : str(v) ? [str(v)] : []).map((x) => String(x).trim()).filter(Boolean);
const isoDay = (v) => { const d = /^\d{4}-\d{2}-\d{2}/.exec(str(v)); return d ? d[0] : ""; };

const posts = [];
if (existsSync("posts")) {
  for (const name of readdirSync("posts")) {
    if (!name.endsWith(".md")) continue;
    const { meta, body } = parse(readFileSync("posts/" + name, "utf8"));
    const date = /^\d{4}-\d{2}-\d{2}/.exec(String(meta.date || "")) || /^\d{4}-\d{2}-\d{2}/.exec(name);
    posts.push({ file: name.replace(/\.md$/, ""), title: String(meta.title || name.replace(/\.md$/, "")), date: date ? date[0] : "", place: str(meta.place), body });
  }
}
posts.sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file));
// The bestiary: one file per fish caught in bestiary/, listed in file-name order.
const bestiary = [];
if (existsSync("bestiary")) {
  for (const name of readdirSync("bestiary").sort()) {
    if (!name.endsWith(".md")) continue;
    const { meta, body } = parse(readFileSync("bestiary/" + name, "utf8"));
    const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : null; };
    const day = /^\d{4}-\d{2}-\d{2}/.exec(String(meta.date || ""));
    bestiary.push({ file: name.replace(/\.md$/, ""), name: String(meta.name || name.replace(/\.md$/, "")), sprite: String(meta.sprite || "fish"),
      date: day ? day[0] : "", weight: num(meta.weight), length: num(meta.length), location: String(meta.location || ""),
      rarity: String(meta.rarity || "").toLowerCase(), catch_rate: num(meta.catch_rate), fight: num(meta.fight), lure: String(meta.lure || ""),
      photo: String(meta.photo || ""), status: /^(wanted|uncaught|no)$/i.test(str(meta.status).trim()) ? "wanted" : "caught", lore: body });
  }
}
// Photo albums: one file per album in albums/, newest first.
const albums = [];
if (existsSync("albums")) {
  for (const name of readdirSync("albums")) {
    if (!name.endsWith(".md")) continue;
    const { meta, body } = parse(readFileSync("albums/" + name, "utf8"));
    const file = name.replace(/\.md$/, "");
    albums.push({ file, title: str(meta.title) || file, date: isoDay(meta.date) || isoDay(name), place: str(meta.place), photos: list(meta.photos), body });
  }
}
albums.sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file));
// Map pins: one file per place in places/. Coordinates are pasted as "latitude, longitude".
const places = [];
if (existsSync("places")) {
  for (const name of readdirSync("places").sort()) {
    if (!name.endsWith(".md")) continue;
    const { meta, body } = parse(readFileSync("places/" + name, "utf8"));
    const file = name.replace(/\.md$/, "");
    const c = /(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[\s,;]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i.exec(str(meta.coordinates));
    let lat = null, lng = null;
    if (c) {
      lat = parseFloat(c[1]) * (/s/i.test(c[2] || "") ? -1 : 1); lng = parseFloat(c[3]) * (/w/i.test(c[4] || "") ? -1 : 1);
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) { lat = null; lng = null; }
    }
    places.push({ file, name: str(meta.name) || file, kind: str(meta.kind).toLowerCase() || "landmark", lat, lng, date: isoDay(meta.date), photo: str(meta.photo),
      trip: str(meta.trip).trim(), stop: Number.isFinite(parseFloat(meta.stop)) ? parseFloat(meta.stop) : null, note: body });
  }
}
const about = existsSync("pages/about.md") ? parse(readFileSync("pages/about.md", "utf8")).body : "";
// "source" records where this copy of the list was built, which helps when checking the site.
const source = process.env.GITHUB_ACTIONS ? "github" : (process.env.WORKERS_CI || process.env.WORKERS_CI_BUILD_UUID) ? "cloudflare" : "other";
const bestiaryIntro = existsSync("pages/bestiary.md") ? parse(readFileSync("pages/bestiary.md", "utf8")).body : "";
writeFileSync("posts.json", JSON.stringify({ source, about, bestiary_intro: bestiaryIntro, posts, bestiary, albums, places }, null, 2) + "\n");
// A small stamp, written only at publish time, to confirm this script ran there.
if (!process.env.GITHUB_ACTIONS) writeFileSync("build.json", JSON.stringify({ source, entries: posts.length, built: new Date().toISOString() }) + "\n");
console.log("posts.json: " + posts.length + " entries");
