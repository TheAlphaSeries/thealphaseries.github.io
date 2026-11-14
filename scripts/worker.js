/* =====================================================================================================================
   HALF LIFE: THE SERVER                                                                                scripts/worker.js
   =====================================================================================================================

   The site is plain files and Cloudflare serves those by itself. This small program (a Cloudflare Worker, set up in
   wrangler.jsonc) sits in front of them and does four things besides:

   1. FILES         Cloudflare serves the site's files itself, without running this program at all. How long a
                    browser may keep each kind is set in the _headers file at the top of the repository.

   2. EMAIL ALERTS  POST /api/subscribe    a friend leaves their address (the Email alerts page, from the RECORD panel)
                    GET  /api/unsubscribe  the link at the bottom of every email; removes the address at once
                    Every 5 minutes (the "cron" in wrangler.jsonc) checkForNewPosts() reads the site's own posts.json.
                    Any post it has never seen is new, and every friend gets one email for it. Edits never send
                    anything, because an edited post is one it has already seen. (Its very first look only remembers
                    what's there, so old posts never go out.) Emails go through Cloudflare's own Email Sending (the
                    EMAIL binding) from entries@halflife.studio; without that binding sign-ups are kept, nothing sent.

   3. PUSH          GET  /api/push/key        the site's public push key (made once, on first ask, and kept)
                    POST /api/push/subscribe  a device that said yes leaves its push address (no name, no email)
                    GET  /api/push/latest     what the notification says. A push carries no words itself (that would
                                              need encryption); the phone's sw.js fetches them from here on arrival.
                    The same 5-minute check sends one push per new entry.

   4. QUESTS        GET  /api/quests   reads Chris's Google Calendar (its secret iCal address, stored in Cloudflare as
                    the secret QUEST_CALENDAR) and passes on ONLY events whose title starts "Quest:": title, story (the
                    description, retold by the Cugel filter, section 9) and when. No locations, no guests, no other events ever leave this program. A quest
                    still to come shows only its month and stays at the top of the tower until its event ends. A line
                    "Veil: …" in the description gives an upcoming quest a different public title.

   Anything else under /api/ answers 410 Gone (the old game that lived here moved to its own repository).

   WHERE THINGS ARE KEPT: the Cloudflare D1 database bound as QUESTS_DB (its name is historical).
     subscribers  (email, token, created)   email friends; token is their private unsubscribe key
     alerts_sent  (file, sent)              every post already seen by the 5-minute check
     push_subs    (endpoint, created)       devices that want a notification
     settings     (key, value)              push_vapid: the push key pair · push_last: the last post pushed
     quest_tales  (key, tale, made)         each quest's story retold in Cugel's manner (section 9)
   The old game's tables are in there too, untouched; nothing here reads them.

   SECTIONS: 1 the doorway · 2 helpers · 3 the database · 4 emails · 5 sign-up and leaving · 6 new posts
             7 push · 8 quests (calendar reading) · 9 the Cugel filter
   ================================================================================================================== */

const SITE = "https://halflife.studio";
const FROM = { email: "entries@halflife.studio", name: "Half Life" };

/* ============================================================================================ 1. THE DOORWAY */
export default {
  // every 5 minutes (wrangler.jsonc "triggers"): alerts for any post not seen before
  // and read the calendar, so a new quest's retelling (section 9) is ready before the first visitor asks
  async scheduled(event, env, ctx) { ctx.waitUntil(checkForNewPosts(env)); ctx.waitUntil(quests(env).catch(() => {})); },

  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname, post = request.method === "POST";
    if (path.startsWith("/api/")) {
      if (path === "/api/subscribe" && post) return subscribe(request, env);
      if (path === "/api/unsubscribe") return unsubscribe(url, env);
      if (path === "/api/quests") return quests(env);
      if (path === "/api/push/key") return json({ key: (await vapid(env)).pub });
      if (path === "/api/push/subscribe" && post) return pushSubscribe(request, env);
      if (path === "/api/push/latest") return pushLatest(env);
      return text("Gone.", 410);
    }
    // Anything else that reaches here is a request for a file that doesn't exist (real files are served by
    // Cloudflare before this program is asked): pass on its "not found".
    return env.ASSETS.fetch(request);
  }
};

/* ============================================================================================== 2. HELPERS */
const text = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMAIL_SHAPE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const newToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map((x) => x.toString(16).padStart(2, "0")).join("");   // 36 hex letters
const longDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
// The site's own post list, exactly as visitors get it, so a post only counts once it is actually live.
const livePosts = async (env) => ((await (await env.ASSETS.fetch(new Request(SITE + "/posts.json"))).json()).posts || []);
// The first words of a post as plain text: no pictures, links, headings or Markdown marks.
function opening(body, words = 60) {
  const w = String(body || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{1,4}\s+.*$/m, "")
    .replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim().split(" ");
  return w.slice(0, words).join(" ") + (w.length > words ? "…" : "");
}

/* ======================================================================================== 3. THE DATABASE */
// The tables are made the first time they're needed, so nothing has to be set up by hand. A running copy of this
// program only does that once (Cloudflare keeps a copy warm between visits), instead of on every request.
const made = new WeakMap();                                          // database → its "tables are made" promise
function db(env) {
  const D = env.QUESTS_DB;
  if (!made.has(D)) made.set(D, (async () => {
    for (const sql of [
      "CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, created INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS alerts_sent (file TEXT PRIMARY KEY, sent INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, created INTEGER NOT NULL)",
      "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS quest_tales (key TEXT PRIMARY KEY, tale TEXT NOT NULL, made INTEGER NOT NULL)"
    ]) await D.prepare(sql).run();
  })().catch((e) => { made.delete(D); throw e; }));                   // if it failed, try again next time
  return made.get(D).then(() => D);
}

/* ================================================================================================ 4. EMAILS */
// Sends each email through Cloudflare, one at a time (each friend gets their own, with their own unsubscribe link).
// If Cloudflare refuses the unsubscribe headers, that email goes again without them.
async function send(env, emails) {
  if (!env.EMAIL) return { ok: false, error: "Email sending is not switched on yet (no EMAIL binding)" };
  let sent = 0; const failed = [];
  for (const e of emails) {
    try { await env.EMAIL.send(e); sent++; }
    catch (err) {
      try { const { headers, ...bare } = e; await env.EMAIL.send(bare); sent++; }
      catch (err2) { failed.push(e.to + ": " + (err2.code || err2.message || err2)); }
    }
  }
  return failed.length ? { ok: sent > 0, sent, failed: failed.slice(0, 20), error: sent ? undefined : failed[0] } : { ok: true, sent };
}
// One email to one friend: the site's frame around `inner` (table rows), the unsubscribe link, and a plain-text copy.
function letter(to, token, subject, inner, plain) {
  const unsub = `${SITE}/api/unsubscribe?t=${token}`;
  return { from: FROM, to, subject,
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },   // the mail app's own "unsubscribe"
    // black, with the site's violet and white, set as simply as email allows (tables and inline styles)
    html: `<!doctype html><html><body style="margin:0;background:#000;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="font:400 13px/1 'Courier New',monospace;letter-spacing:6px;color:#fff;padding-bottom:28px">HALF LIFE</td></tr>
${inner}
<tr><td style="padding-top:36px;border-top:1px solid #3a2a55;font:12px/1.6 'Courier New',monospace;color:#9a8cb8">
You asked to hear when a new entry is set down at <a href="${SITE}" style="color:#bd94ff">halflife.studio</a>.<br>
<a href="${unsub}" style="color:#bd94ff">Stop these emails</a>
</td></tr></table></td></tr></table></body></html>`,
    text: `${plain}\n\nStop these emails: ${unsub}` };
}

/* ================================================================================== 5. SIGN-UP AND LEAVING */
async function subscribe(request, env) {
  let data = {};
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: "That did not arrive properly. Try again." }, 400); }
  if (data.website) return json({ ok: true });                         // the hidden field only robots fill in
  const email = String(data.email || "").trim().toLowerCase();
  if (email.length > 200 || !EMAIL_SHAPE.test(email)) return json({ ok: false, error: "That doesn't look like an email address." }, 400);
  const D = await db(env);
  if (await D.prepare("SELECT 1 FROM subscribers WHERE email = ?").bind(email).first()) return json({ ok: true, already: true });
  const token = newToken();
  await D.prepare("INSERT INTO subscribers (email, token, created) VALUES (?, ?, ?)").bind(email, token, Date.now()).run();
  // a short welcome, so they know it worked and where the alerts will come from
  const welcome = await send(env, [letter(email, token, "You're on the list · Half Life",
    `<tr><td style="font:400 26px/1.3 Georgia,serif;color:#fff;padding-bottom:14px">You're on the list.</td></tr>
<tr><td style="font:17px/1.7 Georgia,serif;color:#e4ddf2;padding-bottom:36px">When a new entry is set down, you'll get one short email with a link to it. Nothing else, and never for small edits.</td></tr>`,
    `You're on the list. When a new entry is set down at ${SITE} you'll get one short email with a link to it.`)]).catch(() => ({ ok: false }));
  return json({ ok: true, welcomed: !!welcome.ok });
}

async function unsubscribe(url, env) {
  const t = url.searchParams.get("t") || "";
  if (/^[0-9a-f]{36}$/.test(t)) await (await db(env)).prepare("DELETE FROM subscribers WHERE token = ?").bind(t).run();
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Half Life</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font:18px/1.6 Georgia,serif;text-align:center;padding:24px">
<div><p style="font:13px 'Courier New',monospace;letter-spacing:6px">HALF LIFE</p><p>You won't get any more emails.</p>
<p><a href="${SITE}" style="color:#bd94ff">Back to the site</a></p></div></body>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/* ============================================================================================= 6. NEW POSTS */
// Run every 5 minutes. A post is remembered (alerts_sent) once its emails have gone, so a failed send is retried next
// time. If several arrived at once they go out oldest first; the push is sent once, for the newest.
async function checkForNewPosts(env) {
  if (!env.QUESTS_DB) return { ok: false };
  const D = await db(env), posts = await livePosts(env);
  const seen = new Set(((await D.prepare("SELECT file FROM alerts_sent").all()).results || []).map((r) => r.file));
  const remember = (file) => D.prepare("INSERT OR IGNORE INTO alerts_sent (file, sent) VALUES (?, ?)").bind(file, Date.now()).run();
  if (!seen.size) { for (const p of posts) await remember(p.file); return { ok: true, seeded: posts.length }; }   // the very first look
  const fresh = posts.filter((p) => !seen.has(p.file)).reverse();
  if (!fresh.length) return { ok: true, sent: [] };
  const friends = (await D.prepare("SELECT email, token FROM subscribers").all()).results || [], out = [];
  for (const p of fresh) { const r = await emailsFor(env, p, friends); if (r.ok) await remember(p.file); out.push({ file: p.file, ...r }); }
  out.push({ push: await pushOnce(env, fresh[fresh.length - 1].file) });
  return { ok: true, sent: out };
}
function emailsFor(env, p, friends) {
  if (!friends.length) return { ok: true, sent: 0 };
  const link = `${SITE}/#/post/${encodeURIComponent(p.file)}`, when = longDate(p.date), lede = opening(p.body);
  return send(env, friends.map(({ email, token }) => letter(email, token, `${p.title} · Half Life`,
    `<tr><td style="font:12px 'Courier New',monospace;letter-spacing:3px;color:#bd94ff;padding-bottom:10px">NEW ENTRY · ${esc(when.toUpperCase())}</td></tr>
<tr><td style="font:400 30px/1.2 Georgia,serif;color:#fff;padding-bottom:16px">${esc(p.title)}</td></tr>
<tr><td style="font:17px/1.7 Georgia,serif;color:#e4ddf2;padding-bottom:26px">${esc(lede)}</td></tr>
<tr><td style="padding-bottom:36px"><a href="${link}" style="display:inline-block;padding:12px 22px;border:1px solid #bd94ff;color:#fff;text-decoration:none;font:13px 'Courier New',monospace;letter-spacing:3px">READ IT</a></td></tr>`,
    `New entry · ${when}\n\n${p.title}\n\n${lede}\n\nRead it: ${link}`)));
}

/* ================================================================================================== 7. PUSH */
// Web Push with no message inside: each push is an empty knock, signed with the site's key (VAPID) so Apple, Google
// and Mozilla accept it. The phone's sw.js then asks /api/push/latest what to show.

// The site's key pair: made once and kept in settings, so devices that subscribed keep working.
async function vapid(env) {
  const D = await db(env), get = async () => { const row = await D.prepare("SELECT value FROM settings WHERE key = 'push_vapid'").first(); return row ? JSON.parse(row.value) : null; };
  const have = await get(); if (have) return have;
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const v = { jwk: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  await D.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('push_vapid', ?)").bind(JSON.stringify(v)).run();
  return get();                                                        // two first visitors at once both get the one kept
}
// The signed note (a JWT) each push carries, proving it came from halflife.studio. One per push service, good 12 h.
async function vapidAuth(v, key, origin) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud: origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE });
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${v.pub}`;
}

async function pushSubscribe(request, env) {
  let sub = {};
  try { sub = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  const endpoint = String(sub.endpoint || "");
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000) return json({ ok: false, error: "That isn't a push address." }, 400);
  await (await db(env)).prepare("INSERT OR IGNORE INTO push_subs (endpoint, created) VALUES (?, ?)").bind(endpoint, Date.now()).run();
  return json({ ok: true });
}

async function pushLatest(env) {
  const p = (await livePosts(env))[0];
  if (!p) return json({ title: "Half Life", body: "A new entry has been set down.", url: "/" });
  return json({ title: p.title, body: opening(p.body, 18), url: "/#/post/" + encodeURIComponent(p.file) });
}

// One push to every device, once per entry (settings push_last). Devices that have turned notifications off answer
// 404 or 410 and are forgotten. The signing key is loaded once, and one note is signed per push service.
async function pushOnce(env, file) {
  const D = await db(env);
  const last = await D.prepare("SELECT value FROM settings WHERE key = 'push_last'").first().catch(() => null);
  if (last && last.value === file) return { skipped: "already pushed" };
  const { results } = await D.prepare("SELECT endpoint FROM push_subs").all();
  let sent = 0, gone = 0;
  if ((results || []).length) {
    const v = await vapid(env), key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]), notes = {};
    for (const { endpoint } of results) {
      try {
        const origin = new URL(endpoint).origin;
        notes[origin] = notes[origin] || (await vapidAuth(v, key, origin));
        const r = await fetch(endpoint, { method: "POST", headers: { authorization: notes[origin], ttl: "86400", urgency: "normal" }, body: "" });
        if (r.status === 404 || r.status === 410) { await D.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(endpoint).run(); gone++; }
        else if (r.ok) sent++;
      } catch (e) {}
    }
  }
  await D.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('push_last', ?)").bind(file).run();
  return { sent, gone };
}

/* ================================================================================================ 8. QUESTS */
// The answer is cached for up to 10 minutes, but never past the moment the next quest ends (so a quest turns
// "completed" right on time). A failed read isn't cached, so the next visit tries again. "note" says plainly what
// happened, so opening /api/quests in a browser shows whether the calendar is connected.
async function quests(env) {
  if (!env.QUEST_CALENDAR) return json({ quests: [], note: "No calendar connected: the QUEST_CALENDAR secret is not set on this site." });
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(SITE + "/api/quests#cache-v3");
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let list = [], note = "", failed = false, soonest = Infinity;
  try {
    const r = await fetch(String(env.QUEST_CALENDAR).trim().replace(/^webcal:/i, "https:"), { headers: { "user-agent": "halflife.studio" } });
    if (!r.ok) throw new Error("Google answered " + r.status + (r.status === 404 ? " (the calendar address is wrong or was reset)" : ""));
    const body = await r.text();
    if (!/BEGIN:VCALENDAR/.test(body)) throw new Error("the calendar address did not return a calendar (is it the 'Secret address in iCal format'?)");
    const all = events(body), now = Date.now(), from = now - 2 * 365 * 864e5, to = now + 400 * 864e5, seen = new Set();   // two years back, 400 days ahead
    for (const e of all) {
      const m = /^\s*quest\s*:\s*(.+)$/i.exec(e.summary), once = e.uid + e.start;   // a repeating event: one quest per date
      if (!m || e.status === "CANCELLED" || e.start < from || e.start > to || seen.has(once)) continue;
      seen.add(once);
      const over = e.end <= now, id = hashOf(once).toString(36);
      if (!over) soonest = Math.min(soonest, e.end);
      const veil = (/^\s*veil\s*:\s*(.+)$/im.exec(e.description) || [])[1];
      // the description itself never leaves: only its retelling in Cugel's manner (section 9)
      const blurb = await retell(env, e.description.replace(/^\s*veil\s*:.*$/gim, "").trim().slice(0, 4000), over, veil || m[1]);
      const day = dayIn(e.start, e.tz), last = dayIn(e.allDay ? e.end - 1 : e.end, e.tz);   // all-day ends are the day after
      list.push(over
        ? { id, over: true, title: m[1].trim().slice(0, 100), date: day, end: last, blurb }
        // to come: only the month leaves here; "date" is the 1st of it, for ordering
        : { id, over: false, title: (veil || m[1]).trim().slice(0, 100), month: monthOf(day), date: day.slice(0, 7) + "-01", blurb });
    }
    note = `Calendar read: ${all.length} events checked, ${list.length} quest${list.length === 1 ? "" : "s"} found.`;
  } catch (err) { list = []; failed = true; note = "Could not read the calendar: " + (err.message || err); }
  list.sort((a, b) => b.date.localeCompare(a.date));
  const keep = Math.max(30, Math.min(600, Math.floor((soonest - Date.now()) / 1000)));
  const res = new Response(JSON.stringify({ quests: list, note }), { headers: { "content-type": "application/json", "cache-control": failed ? "no-store" : "public, max-age=" + keep } });
  if (cache && !failed) await cache.put(key, res.clone());
  return res;
}

// ---- reading an iCal file (the format Google's "secret address" serves) ----
// Long lines are folded onto the next line starting with a space; values escape \n , ; and \.
const unfold = (ics) => String(ics).replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
const unescapeIcs = (v) => String(v || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
// Google sometimes stores a description as HTML; keep only the words and line breaks.
const plainText = (v) => String(v || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
// How far a time zone is ahead of UTC at a given moment, in milliseconds (handles daylight saving).
function zoneOffset(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}
// A calendar time as a moment: "20261109T160000Z" (UTC), "20261109T160000" (in the event's TZID or the calendar's
// zone) or the all-day "20261109" (midnight there). Local times take two passes so a daylight-saving change between
// the guess and the answer comes out right.
function icsMoment(params, value, calTz) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(value || ""); if (!m) return null;
  const local = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  if (m[7]) return local;
  let tz = (/TZID=([^;:]+)/.exec(params || "") || [])[1] || calTz;
  try { zoneOffset(local, tz); } catch (e) { tz = calTz; }             // a zone name the clock doesn't know
  return local - zoneOffset(local - zoneOffset(local, tz), tz);
}
const dayIn = (ms, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));   // "2026-11-09"
const monthOf = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });                  // "November 2026"
function hashOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }   // a short steady id
// Every event in the file: what it's called, its description, when it starts and ends, and whether it's cancelled.
function events(ics) {
  const all = unfold(ics), out = [];
  let calTz = ((/^X-WR-TIMEZONE:(.+)$/m.exec(all) || [])[1] || "America/Los_Angeles").trim();
  try { zoneOffset(Date.now(), calTz); } catch (e) { calTz = "America/Los_Angeles"; }
  for (const block of all.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const field = (name) => { const m = new RegExp("^" + name + "((?:;[^:\\n]*)?):(.*)$", "m").exec(body); return m ? { params: m[1], value: m[2] } : { params: "", value: "" }; };
    const ds = field("DTSTART"), de = field("DTEND"), allDay = /VALUE=DATE(?!-)/.test(ds.params) || /^\d{8}$/.test(ds.value.trim());
    const start = icsMoment(ds.params, ds.value, calTz); if (start == null) continue;
    let end = icsMoment(de.params, de.value, calTz); if (end == null || end <= start) end = start + (allDay ? 864e5 : 36e5);   // no end: a day, or an hour
    out.push({ uid: field("UID").value, summary: unescapeIcs(field("SUMMARY").value), description: plainText(unescapeIcs(field("DESCRIPTION").value)),
      start, end, allDay, tz: calTz, status: field("STATUS").value.trim() });
  }
  return out;
}

/* ==================================================================================== 9. THE CUGEL FILTER */
// A quest's calendar description is never shown as written. Cloudflare's own AI (Workers AI, the AI binding in
// wrangler.jsonc; no account or key needed) retells it as a short passage in the manner of Jack Vance's Cugel the
// Clever, with the particulars veiled: no businesses, people, streets, addresses, dates, times, prices or links,
// each replaced by a Dying Earth invention ("a certain inkmaster of dire repute"). A quest still to come is veiled
// fully; a completed one may name the land it happened in, but still no people or addresses.
//
// Each retelling is made once and kept (table quest_tales), keyed by the description and whether the quest is
// over, so it costs nothing on later visits; editing the description in Google makes a new one. As a last guard, a
// retelling that repeats a proper name from the original (a capitalised word that isn't a sentence's first) is
// tried once more and, if it still does, dropped. If anything fails the quest shows no story at all (the page says
// its particulars have not yet been set down), never the original text.
const TALE_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const TALE_RULES = `You retell a traveller's private note about a coming journey as a short passage in the voice of Jack Vance's Dying Earth stories, as if written by Cugel the Clever: ornate, formal, wry, a little vain and sardonic, with archaic flourishes.
Rules:
- First person. Two to four sentences, under 90 words.
- Keep the spirit of what will happen and how the traveller feels about it.
- NEVER include any real name or particular: no businesses, shops, people, streets, cities, neighbourhoods, addresses, phone numbers, links, dates, days, times, prices or numbers. Replace each with an invented Dying Earth-style description (for example "a certain inkmaster of dire repute", "a hall beside the grey water").
- Output only the passage: no title, no quotation marks, no preamble.`;
const TALE_RULES_DONE = TALE_RULES.replace("about a coming journey", "about a journey already made")
  .replace("no businesses, shops, people, streets, cities, neighbourhoods,", "no businesses, shops, people, streets, neighbourhoods,") + "\n- You may name the country or region where it happened.";

// Proper names in the original: capitalised words of 3+ letters that don't start a sentence, leaving out the words
// of the quest's public title (those are already on the site).
const namesIn = (s, title) => { const shown = new Set(String(title).toLowerCase().match(/[a-z]+/g) || []);
  return new Set([...s.matchAll(/(?<![.!?:]\s|^)\b([A-Z][a-z]{2,})/gm)].map((m) => m[1].toLowerCase()).filter((w) => !shown.has(w))); };
const leaks = (tale, source, over, title) => {
  const names = namesIn(source, title), words = tale.toLowerCase().match(/[a-z]+/g) || [];
  return /https?:|www\.|@|\d/.test(tale) || (!over && words.some((w) => names.has(w)));
};
async function retell(env, source, over, title) {
  if (!source) return "";
  const D = env.QUESTS_DB ? await db(env).catch(() => null) : null, key = (over ? "done:" : "soon:") + hashOf(source).toString(36) + ":" + source.length;
  if (D) { const row = await D.prepare("SELECT tale FROM quest_tales WHERE key = ?").bind(key).first().catch(() => null); if (row) return row.tale; }
  if (!env.AI) return "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await env.AI.run(TALE_MODEL, { messages: [{ role: "system", content: over ? TALE_RULES_DONE : TALE_RULES }, { role: "user", content: source }],
        max_tokens: 260, temperature: .8, chat_template_kwargs: { enable_thinking: false } });
      const tale = String(r?.response ?? r?.choices?.[0]?.message?.content ?? "").replace(/^["“\s]+|["”\s]+$/g, "").trim().slice(0, 1200);
      if (!tale || leaks(tale, source, over, title)) continue;
      if (D) await D.prepare("INSERT OR REPLACE INTO quest_tales (key, tale, made) VALUES (?, ?, ?)").bind(key, tale, Date.now()).run().catch(() => {});
      return tale;
    } catch (e) {}
  }
  return "";
}
