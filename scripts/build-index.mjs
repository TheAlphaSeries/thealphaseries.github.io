// Gathers everything written in the editor into posts.json, the single file the site loads.
//
//   posts/      the journal: one file per post    ->  "posts"
//   albums/     photo albums                      ->  "albums"
//   pages/about.md                                ->  "about"
//
// Each file is a small header between two "---" lines (name: value pairs, and lists) followed by
// the writing itself. parse() reads that shape; the rest of this script picks out the fields the
// site needs and tidies them (dates, numbers, coordinates).
//
// It runs by itself in two places after every change: on GitHub (.github/workflows/build-index.yml)
// and again when Cloudflare publishes the site (wrangler.jsonc). Never edit posts.json by hand.
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
      const pair = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/;       // "name: value" inside a list item makes that item a small record
      while (i + 1 < lines.length && (/^\s*-(\s|$)/.test(lines[i + 1]) || (/^\s+\S/.test(lines[i + 1]) && list.length))) {
        const line = lines[++i], item = /^\s*-\s*(.*)$/.exec(line), last = list[list.length - 1];
        if (item) { const kv = pair.exec(item[1].trim()); list.push(kv ? { [kv[1]]: unquote(kv[2] || "") } : unquote(item[1])); }
        else if (last && typeof last === "object") { const kv = pair.exec(line.trim()); if (kv) last[kv[1]] = unquote(kv[2] || ""); }
        else list[list.length - 1] += " " + line.trim();
      }
      meta[k[1]] = list.filter((x) => (typeof x === "object" ? Object.keys(x).length : x)); continue;
    }
    const block = /^[>|][+-]?$/.test(value);                // a long value wrapped over several indented lines
    const parts = block ? [] : [value];
    const more = (j) => { while (j < lines.length && !lines[j].trim()) j++; return j < lines.length && /^\s+\S/.test(lines[j]); };   // is there more of this value after a blank line?
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || (block && !lines[i + 1].trim() && more(i + 1)))) parts.push(lines[++i].trim());   // a long text keeps its blank lines (they part its paragraphs)
    meta[k[1]] = block ? (value.startsWith("|") ? parts.join("\n") : parts.join(" ").replace(/ {2,}/g, "\n\n")) : unquote(parts.join(" "));
  }
  return { meta, body: m[2].trim() };
}
const str = (v) => (Array.isArray(v) ? v.join(" ") : String(v == null ? "" : v));
const list = (v) => (Array.isArray(v) ? v : str(v) ? [str(v)] : []).filter((x) => typeof x !== "object").map((x) => String(x).trim()).filter(Boolean);
const isoDay = (v) => { const d = /^\d{4}-\d{2}-\d{2}/.exec(str(v)); return d ? d[0] : ""; };

const photo = (v) => str(v).trim().replace(/^\/+/, "/");   // "/photos/x.jpg" as the editor writes it

// Posts: one file per post in posts/, newest first. A post may name a cover photo; its first picture otherwise.
const posts = [];
if (existsSync("posts")) {
  for (const name of readdirSync("posts")) {
    if (!name.endsWith(".md")) continue;
    const { meta, body } = parse(readFileSync("posts/" + name, "utf8"));
    const first = /!\[[^\]]*\]\(([^)\s]+)/.exec(body);
    posts.push({ file: name.replace(/\.md$/, ""), title: str(meta.title) || name.replace(/\.md$/, ""), date: isoDay(meta.date) || isoDay(name),
      cover: photo(meta.cover) || (first ? first[1] : ""), body });
  }
}
posts.sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file));

// Photo albums: one file per album in albums/, newest first.
const albums = [];
if (existsSync("albums")) {
  for (const name of readdirSync("albums")) {
    if (!name.endsWith(".md")) continue;
    const file = name.replace(/\.md$/, ""), { meta, body } = parse(readFileSync("albums/" + name, "utf8"));
    albums.push({ file, title: str(meta.title) || file, date: isoDay(meta.date) || isoDay(name), photos: list(meta.photos).map(photo), body,
      // captions: which photo, and what to say under it. Kept apart from the photo list so photos can still be added many at a time.
      captions: (Array.isArray(meta.captions) ? meta.captions : []).filter((c) => c && typeof c === "object" && str(c.photo).trim() && str(c.caption).trim())
        .map((c) => ({ photo: photo(c.photo), caption: str(c.caption).trim() })) });
  }
}
albums.sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file));

const about = existsSync("pages/about.md") ? parse(readFileSync("pages/about.md", "utf8")).body : "";
const source = process.env.GITHUB_ACTIONS ? "github" : (process.env.WORKERS_CI || process.env.WORKERS_CI_BUILD_UUID) ? "cloudflare" : "other";
writeFileSync("posts.json", JSON.stringify({ source, about, posts, albums }, null, 2) + "\n");
console.log("posts.json: " + posts.length + " posts, " + albums.length + " albums");
