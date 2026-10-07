// The site is plain files, and Cloudflare serves those by itself. This small program answers only the
// addresses that are not files: the ones under /api/, which let friends ask to join a quest.
//
//   Anyone:
//     GET  /api/party          the names accepted onto each quest
//     POST /api/apply          ask to join a quest, optionally in a named post: { quest, name, note, role }
//     GET  /api/remarks        the remarks the keeper has approved, by log entry
//     POST /api/remark         a companion leaves a line on an entry: { entry, email, body }
//   The keeper only (must send the passphrase):
//     GET  /api/keeper/state   whether a passphrase has been chosen yet
//     POST /api/keeper/setup   choose the passphrase, once, with the one-time setup code
//     GET  /api/keeper/list    every petition, waiting or accepted
//     POST /api/keeper/decide  accept one, or remove one: { id, action }
//     POST /api/keeper/remark  show a remark, or destroy it: { id, action }
//
// What is kept: for a petition, the name, e-mail address and note a visitor types, the calling and curiosity
// they chose, the quest, the time, and the number their figure is drawn from; for a remark, its words, the
// entry, the time and the e-mail address. No cookie, no account. Anything denied is deleted, not kept. The
// e-mail address is only ever sent to the keeper. It all lives in a small database (QUESTS_DB).

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
    const { results } = await db.prepare("SELECT quest, name, role, created, seed, calling, item FROM applications WHERE status = 'accepted' ORDER BY created").all();
    const party = {}; for (const r of results) (party[r.quest] = party[r.quest] || []).push({ name: r.name, role: r.role || "", at: r.created ? new Date(r.created).toISOString().slice(0, 10) : "", seed: r.seed || 0, calling: r.calling || "", item: r.item || "" });   /* seed: the number their figure is drawn from; the e-mail address is never sent out */   /* at: the day the petition was made, for the chronicle */
    return json({ party }, 200, { "cache-control": "public, max-age=30" });
  }

  if (path === "/api/apply" && method === "POST") {
    const b = await body(request); if (!b) return json({ error: "That petition could not be read." }, 400);
    if (clean(b.website, 10)) return json({ ok: true });   // a field people never see; only a machine fills it in
    const quest = clean(b.quest, 80), name = clean(b.name, 40), note = clean(b.note, 200), asked = clean(b.role, 60);
    const email = clean(b.email, 120).toLowerCase();
    const calling = /^[a-z ]{1,24}$/.test(clean(b.calling, 24).toLowerCase()) ? clean(b.calling, 24).toLowerCase() : "", item = /^[a-z]{1,12}$/.test(clean(b.item, 12)) ? clean(b.item, 12) : "";   /* the calling and the curiosity they chose; the page knows what the words mean */
    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(quest)) return json({ error: "A petition needs a name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A petition needs an address at which you may be reached." }, 400);
    const open = await openQuests(request, env);
    if (!Object.prototype.hasOwnProperty.call(open, quest)) return json({ error: "That quest is not taking companions." }, 400);
    const role = asked ? open[quest].find((r) => r.toLowerCase() === asked.toLowerCase()) : "";
    if (asked && !role) return json({ error: "There is no such post in this company." }, 400);
    if (role && (await db.prepare("SELECT id FROM applications WHERE quest = ? AND lower(role) = lower(?) AND status = 'accepted'").bind(quest, role).first())) return json({ error: "That post has been filled." }, 409);
    const now = Date.now();
    const busy = await db.prepare("SELECT (SELECT COUNT(*) FROM applications WHERE status = 'pending') AS waiting, (SELECT COUNT(*) FROM applications WHERE created > ?) AS lately").bind(now - 3600000).first();
    if (busy.waiting >= 150 || busy.lately >= 40) return json({ error: "The keeper's desk is buried. Try again in a while." }, 429);
    /* The figure. Each address is given a random number the first time it signs, and keeps it: the same address
       always gets the same figure, whatever name it signs under (so a figure cannot be changed by someone who
       merely knows the address). The number is only handed back when it is new,
       so nobody can type in someone else's address to find out which companion they are. */
    const known = await db.prepare("SELECT seed, calling, item FROM applications WHERE email = ? AND seed != 0 LIMIT 1").bind(email).first();
    const chosen = Number.isInteger(b.seed) && b.seed > 0 && b.seed < 2147483647 ? b.seed : 0;   /* a newcomer may draw again before sending, and sends the number they settled on */
    const seed = known ? known.seed : chosen || crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1;
    const twin = await db.prepare("SELECT id FROM applications WHERE quest = ? AND email = ?").bind(quest, email).first();   /* one petition per address per quest */
    if (!twin) await db.prepare("INSERT INTO applications (quest, name, note, role, status, created, email, seed, calling, item) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)").bind(quest, name, note, role || "", now, email, seed, known ? known.calling : calling, known ? known.item : item).run();   /* someone known keeps the calling and curiosity they first chose, along with their figure */
    return json(known ? { ok: true, returning: true } : { ok: true, seed });
  }

  /* Remarks: a line left on a log entry by someone already of the company. It is tied to their e-mail address (which
     is how the page knows whose figure to draw beside it) and waits unseen until the keeper approves it. */
  if (path === "/api/remarks" && method === "GET") {
    const { results } = await db.prepare("SELECT r.entry, r.body, r.created, a.name, a.seed, a.calling, a.item FROM remarks r JOIN applications a ON a.id = (SELECT id FROM applications WHERE email = r.email AND status = 'accepted' ORDER BY created DESC LIMIT 1) WHERE r.status = 'approved' ORDER BY r.created LIMIT 2000").all();
    const remarks = {}; for (const r of results) (remarks[r.entry] = remarks[r.entry] || []).push({ name: r.name, seed: r.seed || 0, calling: r.calling || "", item: r.item || "", body: r.body, at: new Date(r.created).toISOString().slice(0, 10) });
    return json({ remarks }, 200, { "cache-control": "public, max-age=30" });
  }
  if (path === "/api/remark" && method === "POST") {
    const b = await body(request); if (!b) return json({ error: "That remark could not be read." }, 400);
    if (clean(b.website, 10)) return json({ ok: true });
    const entry = clean(b.entry, 80), email = clean(b.email, 120).toLowerCase(), words = clean(b.body, 240);
    if (!words || !/^[a-z0-9][a-z0-9-]*$/.test(entry)) return json({ error: "A remark needs words." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Give the address you signed on with." }, 400);
    let known = false; try { const r = await env.ASSETS.fetch(new Request(new URL("/posts.json", request.url))); known = ((await r.json()).posts || []).some((p) => p && p.file === entry); } catch (e) {}
    if (!known) return json({ error: "There is no such entry." }, 400);
    if (!(await db.prepare("SELECT id FROM applications WHERE email = ? AND status = 'accepted' LIMIT 1").bind(email).first())) return json({ error: "Only those of the company may leave a remark. Sign on to a quest with this address, and be accepted, first." }, 403);
    const now = Date.now();
    const busy = await db.prepare("SELECT (SELECT COUNT(*) FROM remarks WHERE status = 'pending') AS waiting, (SELECT COUNT(*) FROM remarks WHERE created > ?) AS lately, (SELECT COUNT(*) FROM remarks WHERE status = 'pending' AND email = ?) AS mine").bind(now - 3600000, email).first();
    if (busy.waiting >= 100 || busy.lately >= 30 || busy.mine >= 5) return json({ error: "The keeper's desk is buried. Try again in a while." }, 429);
    await db.prepare("INSERT INTO remarks (entry, email, body, status, created) VALUES (?, ?, ?, 'pending', ?)").bind(entry, email, words, now).run();
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
      const { results } = await db.prepare("SELECT id, quest, name, note, role, status, created, email, calling, item FROM applications ORDER BY status DESC, created DESC LIMIT 500").all();
      const said = await db.prepare("SELECT r.id, r.entry, r.body, r.status, r.created, r.email, (SELECT name FROM applications WHERE email = r.email ORDER BY created DESC LIMIT 1) AS name FROM remarks r ORDER BY r.status DESC, r.created DESC LIMIT 500").all();
      return json({ petitions: results, remarks: said.results });
    }
    if (path === "/api/keeper/remark" && method === "POST") {
      const b = await body(request), id = b && Number.isInteger(b.id) ? b.id : 0;
      if (!id || !["approve", "remove"].includes(b.action)) return json({ error: "Nothing to do." }, 400);
      if (b.action === "approve") await db.prepare("UPDATE remarks SET status = 'approved' WHERE id = ?").bind(id).run();
      else await db.prepare("DELETE FROM remarks WHERE id = ?").bind(id).run();   // turned away or taken down: gone
      return json({ ok: true });
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
      else { const gone = await db.prepare("SELECT email FROM applications WHERE id = ?").bind(id).first(); await db.prepare("DELETE FROM applications WHERE id = ?").bind(id).run();   // denied or dismissed: gone, not filed away
        if (gone && gone.email && !(await db.prepare("SELECT id FROM applications WHERE email = ? LIMIT 1").bind(gone.email).first())) await db.prepare("DELETE FROM remarks WHERE email = ?").bind(gone.email).run(); }   // and when the last trace of someone goes, so do their remarks
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
