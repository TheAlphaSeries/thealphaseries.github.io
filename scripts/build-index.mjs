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
  const m = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(text);
  const meta = {};
  if (!m) return { meta, body: text.trim() };
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const k = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!k) continue;
    let value = k[2];
    if (/^[>|][+-]?$/.test(value.trim())) {            // a long value wrapped over several indented lines
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(value.trim().startsWith("|") ? "\n" : " ");
    } else value = unquote(value);
    meta[k[1]] = value;
  }
  return { meta, body: m[2].trim() };
}

const posts = [];
if (existsSync("posts")) {
  for (const name of readdirSync("posts")) {
    if (!name.endsWith(".md")) continue;
    const { meta, body } = parse(readFileSync("posts/" + name, "utf8"));
    const date = /^\d{4}-\d{2}-\d{2}/.exec(String(meta.date || "")) || /^\d{4}-\d{2}-\d{2}/.exec(name);
    posts.push({ file: name.replace(/\.md$/, ""), title: String(meta.title || name.replace(/\.md$/, "")), date: date ? date[0] : "", body });
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
      photo: String(meta.photo || ""), lore: body });
  }
}
const about = existsSync("pages/about.md") ? parse(readFileSync("pages/about.md", "utf8")).body : "";
// "source" records where this copy of the list was built, which helps when checking the site.
const source = process.env.GITHUB_ACTIONS ? "github" : (process.env.WORKERS_CI || process.env.WORKERS_CI_BUILD_UUID) ? "cloudflare" : "other";
writeFileSync("posts.json", JSON.stringify({ source, about, posts, bestiary }, null, 2) + "\n");
// A small stamp, written only at publish time, to confirm this script ran there.
if (!process.env.GITHUB_ACTIONS) writeFileSync("build.json", JSON.stringify({ source, entries: posts.length, built: new Date().toISOString() }) + "\n");
console.log("posts.json: " + posts.length + " entries");
