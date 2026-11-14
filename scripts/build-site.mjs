// Prepares the site's own code for publishing. Cloudflare runs this once per publish (wrangler.jsonc, "build"),
// after build-index.mjs. It never runs on GitHub and its results are never saved back to the repository.
//
// What it does, and why:
//   1. Joins the four scripts every page needs (quotes, tower, blog, music) into ONE file, and shrinks it (comments
//      and spare spaces removed: the files in site/ stay fully commented for people; visitors get the lean copy).
//      Likewise the stylesheet, and relics.js on its own (it is fetched only when a note needs it).
//   2. Names each result after its contents, e.g. site/h/app.3f9a1c2e.js. A file with such a name never changes, so
//      browsers are told to keep it for a year without asking again (the _headers file). When the code changes, the
//      name changes, and index.html (which is always checked) points at the new one.
//   3. Rewrites index.html to load those files.
//
// Shrinking uses esbuild, fetched with npx. If that can't be had for any reason the files are joined and renamed
// unshrunk, so a publish never fails because of it.
//
// To try it by hand, do it in a COPY of the folder (it rewrites index.html):   node scripts/build-site.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const read = (f) => readFileSync(f, "utf8");
function shrink(code, kind) {                                            // kind: "js" or "css"
  try {
    return execFileSync("npx", ["--yes", "esbuild@0.25.12", "--minify", "--loader=" + kind, "--target=es2020", "--log-level=error"], { input: code, encoding: "utf8", maxBuffer: 1 << 26, timeout: 120000 });
  } catch (e) { console.log("could not shrink (" + kind + "); publishing it as written: " + String(e.message || e).split("\n")[0]); return code; }
}
function publish(name, ext, code) {
  const file = `site/h/${name}.${createHash("sha256").update(code).digest("hex").slice(0, 8)}.${ext}`;
  writeFileSync(file, code); console.log(file + "  " + (code.length / 1024).toFixed(1) + " KB");
  return "/" + file;
}

let html = read("index.html");

// the scripts between <!-- build:js --> and <!-- /build:js -->, in order, become one file
const block = /<!-- build:js -->([\s\S]*?)<!-- \/build:js -->/.exec(html);
if (!block && html.includes('src="/site/h/app.')) { console.log("index.html is already prepared; nothing to do"); process.exit(0); }   // run twice: harmless
if (!block) throw new Error("index.html has no <!-- build:js --> block");
const sources = [...block[1].matchAll(/<script src="\/(site\/[\w.-]+\.js)"/g)].map((m) => m[1]);
if (!sources.length) throw new Error("no scripts found in the build:js block");
rmSync("site/h", { recursive: true, force: true }); mkdirSync("site/h", { recursive: true });
// Each file is shrunk on its own (each is a self-contained unit), then joined; ";" guards the seams.
const app = publish("app", "js", sources.map((f) => shrink(read(f), "js").trim()).join(";\n"));
html = html.replace(block[0], `<script src="${app}" defer></script>`);

const css = publish("blog", "css", shrink(read("site/blog.css"), "css"));
if (!html.includes('href="/site/blog.css"')) throw new Error("index.html does not link /site/blog.css");
html = html.replace('href="/site/blog.css"', `href="${css}"`);

const relics = publish("relics", "js", shrink(read("site/relics.js"), "js"));
if (!html.includes('"/site/relics.js"')) throw new Error("index.html does not name /site/relics.js");
html = html.replace('"/site/relics.js"', `"${relics}"`);

writeFileSync("index.html", html);
console.log("index.html now loads: " + [app, css, relics].join(", "));
