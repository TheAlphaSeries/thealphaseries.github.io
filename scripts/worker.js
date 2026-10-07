// The site is plain files, and Cloudflare serves those by itself. This small program answers only the
// addresses that are not files: the ones under /api/, which let friends ask to join a quest.
//
//   Anyone:
//     GET  /api/party          the names accepted onto each quest
//     POST /api/apply          ask to join a quest, optionally in a named post: { quest, name, note, role }
//   The keeper only (must send the passphrase):
//     GET  /api/keeper/state   whether a passphrase has been chosen yet
//     POST /api/keeper/setup   choose the passphrase, once, with the one-time setup code
//     GET  /api/keeper/list    every petition, waiting or accepted
//     POST /api/keeper/decide  accept one, or remove one: { id, action }
//
// What is kept: the name and note a visitor types, the quest, and the time. Nothing else: no address, no
// e-mail, no cookie. A denied petition is deleted, not kept. It all lives in a small database (QUESTS_DB).

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra } });
const clean = (v, max) => (typeof v === "string" ? v : "").replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function sha256(text) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))); }
async function stretch(pass, salt) {   // a slow fingerprint of the passphrase, so the database never holds the passphrase itself
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256));
}
const setting = async (db, key) => { const r = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first(); return r ? r.value : null; };
const setSetting = (db, key, value) => db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(key, value).run();

// Wrong passphrases are counted two ways. Per caller: eight in a quarter of an hour and that caller must wait. The
// caller's address is held only in this program's short-lived memory for that purpose, never written down.
// Overall: three hundred in a quarter of an hour locks the door for everyone, as a backstop.
const WINDOW = 15 * 60 * 1000, TRIES = 8, TRIES_ALL = 300, callers = new Map();
const who = (request) => request.headers.get("cf-connecting-ip") || "local";
async function locked(db, request) {
  const mine = callers.get(who(request)), now = Date.now();
  if (mine && mine.n >= TRIES && now - mine.since < WINDOW) return true;
  const [n, since] = ((await setting(db, "fails")) || "0:0").split(":").map(Number); return n >= TRIES_ALL && now - since < WINDOW;
}
async function failed(db, request) {
  const now = Date.now(), key = who(request), mine = callers.get(key);
  if (callers.size > 5000) callers.clear();
  callers.set(key, mine && now - mine.since < WINDOW ? { n: mine.n + 1, since: mine.since } : { n: 1, since: now });
  const [n, since] = ((await setting(db, "fails")) || "0:0").split(":").map(Number);
  await setSetting(db, "fails", now - since < WINDOW ? (n + 1) + ":" + since : "1:" + now);
}
async function isKeeper(request, db) {
  const sent = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), stored = await setting(db, "pass");
  if (!sent || !stored || sent.length > 200) return false;
  const [salt, want] = stored.split(":");
  if (same(await stretch(sent, salt), want)) return true;
  await failed(db, request); return false;
}
async function body(request) {   // the JSON a page sent, or null if it is not that, is too big, or came from another site
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return null;
  if (!/^application\/json/i.test(request.headers.get("content-type") || "")) return null;
  const raw = await request.text(); if (raw.length > 4000) return null;
  try { const v = JSON.parse(raw); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch (e) { return null; }
}
async function openQuests(request, env) {   // the quests that can be joined right now, read from the same list the site shows
  try {
    const r = await env.ASSETS.fetch(new Request(new URL("/posts.json", request.url)));
    const quests = (await r.json()).quests;
    const open = {};   // quest -> the posts in it that a friend may ask for
    for (const q of Array.isArray(quests) ? quests : []) {
      if (!q || q.status === "completed" || typeof q.file !== "string") continue;
      open[q.file] = (Array.isArray(q.roles) ? q.roles : []).filter((r) => r && typeof r.name === "string" && !r.held).map((r) => r.name);
    }
    return open;
  } catch (e) { return {}; }
}

async function api(request, env, path) {
  const db = env.QUESTS_DB, method = request.method;
  if (!db) return json({ error: "The ledger is not connected." }, 503);

  if (path === "/api/party" && method === "GET") {
    const { results } = await db.prepare("SELECT quest, name, role, created FROM applications WHERE status = 'accepted' ORDER BY created").all();
    const party = {}; for (const r of results) (party[r.quest] = party[r.quest] || []).push({ name: r.name, role: r.role || "", at: r.created ? new Date(r.created).toISOString().slice(0, 10) : "" });   /* at: the day the petition was made, for the chronicle */
    return json({ party }, 200, { "cache-control": "public, max-age=30" });
  }

  if (path === "/api/apply" && method === "POST") {
    const b = await body(request); if (!b) return json({ error: "That petition could not be read." }, 400);
    if (clean(b.website, 10)) return json({ ok: true });   // a field people never see; only a machine fills it in
    const quest = clean(b.quest, 80), name = clean(b.name, 40), note = clean(b.note, 200), asked = clean(b.role, 60);
    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(quest)) return json({ error: "A petition needs a name." }, 400);
    const open = await openQuests(request, env);
    if (!Object.prototype.hasOwnProperty.call(open, quest)) return json({ error: "That quest is not taking companions." }, 400);
    const role = asked ? open[quest].find((r) => r.toLowerCase() === asked.toLowerCase()) : "";
    if (asked && !role) return json({ error: "There is no such post in this company." }, 400);
    if (role && (await db.prepare("SELECT id FROM applications WHERE quest = ? AND lower(role) = lower(?) AND status = 'accepted'").bind(quest, role).first())) return json({ error: "That post has been filled." }, 409);
    const now = Date.now();
    const busy = await db.prepare("SELECT (SELECT COUNT(*) FROM applications WHERE status = 'pending') AS waiting, (SELECT COUNT(*) FROM applications WHERE created > ?) AS lately").bind(now - 3600000).first();
    if (busy.waiting >= 150 || busy.lately >= 40) return json({ error: "The keeper's desk is buried. Try again in a while." }, 429);
    const twin = await db.prepare("SELECT id FROM applications WHERE quest = ? AND lower(name) = lower(?)").bind(quest, name).first();
    if (!twin) await db.prepare("INSERT INTO applications (quest, name, note, role, status, created) VALUES (?, ?, ?, ?, 'pending', ?)").bind(quest, name, note, role || "", now).run();
    return json({ ok: true });
  }

  if (path === "/api/keeper/state" && method === "GET") return json({ ready: !!(await setting(db, "pass")) });

  if (path === "/api/keeper/setup" && method === "POST") {
    if (await locked(db, request)) return json({ error: "Too many wrong tries. Wait a quarter of an hour." }, 429);
    const b = await body(request), want = await setting(db, "setup");
    if (!b || !want || (await setting(db, "pass"))) return json({ error: "Setup is already done." }, 400);
    const pass = typeof b.passphrase === "string" ? b.passphrase : "";
    if (!same(await sha256(clean(b.code, 100)), want)) { await failed(db, request); return json({ error: "That is not the setup code." }, 403); }
    if (pass.length < 10 || pass.length > 200) return json({ error: "Choose a passphrase of at least ten characters." }, 400);
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    await setSetting(db, "pass", salt + ":" + (await stretch(pass, salt)));
    await db.prepare("DELETE FROM settings WHERE key IN ('setup', 'fails')").run();
    return json({ ok: true });
  }

  if (path.startsWith("/api/keeper/")) {
    if (await locked(db, request)) return json({ error: "Too many wrong tries. Wait a quarter of an hour." }, 429);
    if (!(await isKeeper(request, db))) return json({ error: "Wrong passphrase." }, 401);
    if (path === "/api/keeper/list" && method === "GET") {
      const { results } = await db.prepare("SELECT id, quest, name, note, role, status, created FROM applications ORDER BY status DESC, created DESC LIMIT 500").all();
      return json({ petitions: results });
    }
    if (path === "/api/keeper/decide" && method === "POST") {
      const b = await body(request), id = b && Number.isInteger(b.id) ? b.id : 0;
      if (!id || !["accept", "remove"].includes(b.action)) return json({ error: "Nothing to do." }, 400);
      if (b.action === "accept") {
        const row = await db.prepare("SELECT quest, role FROM applications WHERE id = ?").bind(id).first();
        if (!row) return json({ error: "That petition is gone." }, 404);
        const holder = row.role ? await db.prepare("SELECT name FROM applications WHERE quest = ? AND lower(role) = lower(?) AND status = 'accepted' AND id != ?").bind(row.quest, row.role, id).first() : null;
        if (holder) return json({ error: "That post is already held by " + holder.name + ". Remove them first, or deny this one." }, 409);   // one holder to a post
        await db.prepare("UPDATE applications SET status = 'accepted' WHERE id = ?").bind(id).run();
      }
      else await db.prepare("DELETE FROM applications WHERE id = ?").bind(id).run();   // denied or dismissed: gone, not filed away
      return json({ ok: true });
    }
  }
  return json({ error: "No such door." }, 404);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) {
      try { return await api(request, env, path); } catch (e) { return json({ error: "Something went wrong." }, 500); }
    }
    return env.ASSETS.fetch(request);
  }
};
