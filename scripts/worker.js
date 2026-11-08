// The site is plain files, and Cloudflare serves those by itself. This small program does three things besides:
//
// 1. It makes sure a browser checks for a newer copy of the page, its script and its style before reusing one,
//    since those change often.
// 2. Email alerts for new entries:
//      POST /api/subscribe     a friend leaves their email address (the box at the foot of each post and on About)
//      GET  /api/unsubscribe   the link at the bottom of every alert email; removes the address at once
//      every 5 minutes         the site looks at its own list of posts; any post it has never seen before is new,
//                              and everyone on the list gets one email for it. Edits never send anything, because an
//                              edited post is one it has already seen. (The first look only remembers what is there.)
//    The addresses live in the site's own Cloudflare database (QUESTS_DB, table "subscribers") and are never shown
//    anywhere on the site. Emails are sent by Cloudflare's own Email Sending (the EMAIL binding in wrangler.jsonc)
//    from entries@halflife.studio; that needs the Workers paid plan and halflife.studio onboarded under
//    Compute > Email Service > Email Sending. Until the binding is there, sign-ups are kept and nothing is sent.

//
// 2b. Push notifications, for friends who want one on their phone or computer as well as (or instead of) email:
//      GET  /api/push/key        the site's public push key (made once, the first time anyone asks, and kept in the
//                                database's settings table; nothing to set up by hand)
//      POST /api/push/subscribe  a device that said yes leaves its push address (no name, no email)
//      GET  /api/push/latest     what the notification says: the newest entry's title and opening words. A push
//                                carries no words itself; the phone fetches them from here when it arrives.
//    The same every-5-minutes check that sends the emails sends one push per new entry, never for edits.
//
// 3. Quests: GET /api/quests reads Chris's Google Calendar (its private iCal address, saved in Cloudflare as the
//    secret QUEST_CALENDAR) and passes on ONLY events whose title starts with "Quest:": their title, their story
//    (the event's description) and when they happen. Nothing else in the calendar ever leaves this program: no
//    locations, no guests, no other events. A quest still to come shows only its month, never the day or time, and
//    stays at the top of the tower until the moment its event ends. A line "Veil: …" in the description gives an
//    upcoming quest a different public title. The tower draws them as gold rings (site/tower.js).
//
// The game that used to live here (quests, sign-ups, remarks) moved to its own repository, halflife-game. What
// people sent to it is still kept in the QUESTS_DB database, untouched; nothing on this site reads or writes it now.

const SITE = "https://halflife.studio";
const FROM = { email: "entries@halflife.studio", name: "Half Life" };

export default {
  // every 5 minutes (wrangler.jsonc, "triggers"): send alerts for any post not seen before
  async scheduled(event, env, ctx) { ctx.waitUntil(checkForNewPosts(env)); },
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    if (path === "/api/subscribe" && request.method === "POST") return subscribe(request, env);
    if (path === "/api/unsubscribe") return unsubscribe(url, env);
    if (path === "/api/quests") return quests(env);
    if (path === "/api/push/key") return json({ key: (await vapid(env)).pub });
    if (path === "/api/push/subscribe" && request.method === "POST") return pushSubscribe(request, env);
    if (path === "/api/push/latest") return pushLatest(env);
    if (path.startsWith("/api/")) return text("Gone.", 410);

    const r = await env.ASSETS.fetch(request), type = r.headers.get("content-type") || "";
    if (!/text\/html|javascript|text\/css|json/i.test(type)) return r;
    const h = new Headers(r.headers); h.set("cache-control", "no-cache");
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }
};

/* ------------------------------------------------------------------ helpers ------------------------------------ */
const text = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

// The table is made the first time anyone subscribes, so nothing needs to be set up by hand.
async function table(env) {
  await env.QUESTS_DB.prepare("CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, created INTEGER NOT NULL)").run();
}
function token() { const b = new Uint8Array(18); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); }

// Sends each email through Cloudflare, one at a time (each friend gets their own, with their own unsubscribe link).
// If Cloudflare refuses the unsubscribe headers, that email is sent again without them.
async function send(env, emails) {
  if (!env.EMAIL) return { ok: false, error: "Email sending is not switched on yet (no EMAIL binding)" };
  let sent = 0; const failed = [];
  for (const e of emails) {
    try { await env.EMAIL.send(e); sent++; }
    catch (err) {
      try { const { headers, ...plain } = e; await env.EMAIL.send(plain); sent++; }
      catch (err2) { failed.push(e.to + ": " + (err2.code || err2.message || err2)); }
    }
  }
  return failed.length ? { ok: sent > 0, sent, failed: failed.slice(0, 20), error: sent ? undefined : failed[0] } : { ok: true, sent };
}

/* ------------------------------------------------------------------ the emails --------------------------------- */
// Black, with the site's violet and white, set as simply as email allows (tables and inline styles).
function shell(inner, unsub) {
  return `<!doctype html><html><body style="margin:0;background:#000;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="font:400 13px/1 'Courier New',monospace;letter-spacing:6px;color:#fff;padding-bottom:28px">HALF LIFE</td></tr>
${inner}
<tr><td style="padding-top:36px;border-top:1px solid #3a2a55;font:12px/1.6 'Courier New',monospace;color:#9a8cb8">
You asked to hear when a new entry is set down at <a href="${SITE}" style="color:#bd94ff">halflife.studio</a>.<br>
<a href="${unsub}" style="color:#bd94ff">Stop these emails</a>
</td></tr></table></td></tr></table></body></html>`;
}
function plainBody(body, words = 60) {
  const w = String(body || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{1,4}\s+.*$/m, "").replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim().split(" ");
  return w.slice(0, words).join(" ") + (w.length > words ? "…" : "");
}

/* ------------------------------------------------------------------ subscribe ---------------------------------- */
async function subscribe(request, env) {
  let data = {};
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: "That did not arrive properly. Try again." }, 400); }
  if (data.website) return json({ ok: true });                            // the hidden field only robots fill in
  const email = String(data.email || "").trim().toLowerCase();
  if (email.length > 200 || !EMAIL.test(email)) return json({ ok: false, error: "That doesn't look like an email address." }, 400);
  await table(env);
  const existing = await env.QUESTS_DB.prepare("SELECT token FROM subscribers WHERE email = ?").bind(email).first();
  if (existing) return json({ ok: true, already: true });
  const t = token();
  await env.QUESTS_DB.prepare("INSERT INTO subscribers (email, token, created) VALUES (?, ?, ?)").bind(email, t, Date.now()).run();
  // a short welcome, so they know it worked and where the alerts will come from
  const unsub = `${SITE}/api/unsubscribe?t=${t}`;
  const welcome = await send(env, [{ from: FROM, to: email, subject: "You're on the list · Half Life",
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    html: shell(`<tr><td style="font:400 26px/1.3 Georgia,serif;color:#fff;padding-bottom:14px">You're on the list.</td></tr>
<tr><td style="font:17px/1.7 Georgia,serif;color:#e4ddf2;padding-bottom:36px">When a new entry is set down, you'll get one short email with a link to it. Nothing else, and never for small edits.</td></tr>`, unsub),
    text: `You're on the list. When a new entry is set down at ${SITE} you'll get one short email with a link to it.\n\nStop these emails: ${unsub}` }]).catch(() => ({ ok: false }));
  return json({ ok: true, welcomed: !!welcome.ok });
}

/* ------------------------------------------------------------------ unsubscribe -------------------------------- */
async function unsubscribe(url, env) {
  const t = url.searchParams.get("t") || "";
  if (/^[0-9a-f]{36}$/.test(t)) { await table(env); await env.QUESTS_DB.prepare("DELETE FROM subscribers WHERE token = ?").bind(t).run(); }
  const page = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Half Life</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font:18px/1.6 Georgia,serif;text-align:center;padding:24px">
<div><p style="font:13px 'Courier New',monospace;letter-spacing:6px">HALF LIFE</p><p>You won't get any more emails.</p>
<p><a href="${SITE}" style="color:#bd94ff">Back to the site</a></p></div></body>`;
  return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/* ------------------------------------------------------------------ new posts -------------------------------- */
// The post list is the one the site itself serves (posts.json), so a post is only "new" once it is actually live.
// alerts_sent remembers every post already seen. The very first time this runs it just remembers what is there, so
// old posts never go out; after that, anything not in it is a new post.
async function checkForNewPosts(env) {
  if (!env.QUESTS_DB) return { ok: false };
  await table(env);
  await env.QUESTS_DB.prepare("CREATE TABLE IF NOT EXISTS alerts_sent (file TEXT PRIMARY KEY, sent INTEGER NOT NULL)").run();
  const posts = (await (await env.ASSETS.fetch(new Request(SITE + "/posts.json"))).json()).posts || [];
  const seen = new Set(((await env.QUESTS_DB.prepare("SELECT file FROM alerts_sent").all()).results || []).map((r) => r.file));
  const remember = (file) => env.QUESTS_DB.prepare("INSERT OR IGNORE INTO alerts_sent (file, sent) VALUES (?, ?)").bind(file, Date.now()).run();
  if (!seen.size) { for (const p of posts) await remember(p.file); return { ok: true, seeded: posts.length }; }
  const fresh = posts.filter((p) => !seen.has(p.file)).reverse();   // oldest first, if several arrived at once
  const out = [];
  for (const p of fresh) { const r = await sendFor(env, p); if (r.ok) await remember(p.file); out.push({ file: p.file, ...r }); }
  // one push for the newest new entry (a phone shows one notification, even if two entries arrived together)
  if (fresh.length) out.push({ push: await pushOnce(env, fresh[fresh.length - 1].file) });
  return { ok: true, sent: out };
}

async function sendFor(env, p) {
  const { results } = await env.QUESTS_DB.prepare("SELECT email, token FROM subscribers").all();
  if (!(results || []).length) return { ok: true, sent: 0 };
  const link = `${SITE}/#/post/${encodeURIComponent(p.file)}`, when = new Date(p.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const lede = plainBody(p.body);
  const emails = results.map(({ email, token: t }) => {
    const unsub = `${SITE}/api/unsubscribe?t=${t}`;
    return { from: FROM, to: email, subject: `${p.title} · Half Life`,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      html: shell(`<tr><td style="font:12px 'Courier New',monospace;letter-spacing:3px;color:#bd94ff;padding-bottom:10px">NEW ENTRY · ${esc(when.toUpperCase())}</td></tr>
<tr><td style="font:400 30px/1.2 Georgia,serif;color:#fff;padding-bottom:16px">${esc(p.title)}</td></tr>
<tr><td style="font:17px/1.7 Georgia,serif;color:#e4ddf2;padding-bottom:26px">${esc(lede)}</td></tr>
<tr><td style="padding-bottom:36px"><a href="${link}" style="display:inline-block;padding:12px 22px;border:1px solid #bd94ff;color:#fff;text-decoration:none;font:13px 'Courier New',monospace;letter-spacing:3px">READ IT</a></td></tr>`, unsub),
      text: `New entry · ${when}\n\n${p.title}\n\n${lede}\n\nRead it: ${link}\n\nStop these emails: ${unsub}` };
  });
  return send(env, emails);
}

/* ------------------------------------------------------------------ quests ------------------------------------- */
function unfold(ics) { return String(ics).replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
function unescapeIcs(v) { return String(v || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim(); }
// Google sometimes stores a description as HTML; keep only the words and line breaks.
function plainText(v) {
  return String(v || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
// How far a time zone is ahead of UTC at a given moment, in milliseconds.
function zoneOffset(ms, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second) - ms;
}
// A calendar time ("20261109T160000Z", "20261109T160000" in a named zone, or the all-day "20261109") as a moment.
function icsMoment(params, value, calTz) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(value || ""); if (!m) return null;
  const local = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  if (m[7]) return local;
  let tz = (/TZID=([^;:]+)/.exec(params || "") || [])[1] || calTz;
  try { zoneOffset(local, tz); } catch (e) { tz = calTz; }
  const guess = local - zoneOffset(local, tz);
  return local - zoneOffset(guess, tz);
}
const dayIn = (ms, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
function events(ics) {
  const text = unfold(ics), out = [];
  let calTz = ((/^X-WR-TIMEZONE:(.+)$/m.exec(text) || [])[1] || "America/Los_Angeles").trim();
  try { zoneOffset(Date.now(), calTz); } catch (e) { calTz = "America/Los_Angeles"; }
  for (const block of text.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const field = (name) => { const m = new RegExp("^" + name + "((?:;[^:\\n]*)?):(.*)$", "m").exec(body); return m ? { params: m[1], value: m[2] } : { params: "", value: "" }; };
    const ds = field("DTSTART"), de = field("DTEND"), allDay = /VALUE=DATE(?!-)/.test(ds.params) || /^\d{8}$/.test(ds.value.trim());
    const start = icsMoment(ds.params, ds.value, calTz); if (start == null) continue;
    let end = icsMoment(de.params, de.value, calTz); if (end == null || end <= start) end = start + (allDay ? 864e5 : 36e5);
    out.push({ uid: field("UID").value, summary: unescapeIcs(field("SUMMARY").value), description: plainText(unescapeIcs(field("DESCRIPTION").value)),
      start, end, allDay, tz: calTz, status: field("STATUS").value.trim() });
  }
  return out;
}
function hashOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
const monthOf = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// The quests, as the site shows them. A quest stays "to come" until the moment its calendar event ends, then it is
// "completed". Upcoming quests show their title, the month and the story from the event's description; never the
// exact day, the time or the location. Completed quests also show their dates.
async function quests(env) {
  // "note" says plainly what happened, so opening /api/quests in a browser shows whether the calendar is connected
  if (!env.QUEST_CALENDAR) return json({ quests: [], note: "No calendar connected: the QUEST_CALENDAR secret is not set on this site." });
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request("https://halflife.studio/api/quests#cache-v2");
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let list = [], note = "", scanned = 0, failed = false, soonest = Infinity;
  try {
    const r = await fetch(String(env.QUEST_CALENDAR).trim().replace(/^webcal:/i, "https:"), { headers: { "user-agent": "halflife.studio" } });
    if (!r.ok) throw new Error("Google answered " + r.status + (r.status === 404 ? " (the calendar address is wrong or was reset)" : ""));
    const now = Date.now(), from = now - 2 * 365 * 864e5, to = now + 400 * 864e5, seen = new Set();
    const body = await r.text();
    if (!/BEGIN:VCALENDAR/.test(body)) throw new Error("the calendar address did not return a calendar (is it the 'Secret address in iCal format'?)");
    const all = events(body); scanned = all.length;
    for (const e of all) {
      const m = /^\s*quest\s*:\s*(.+)$/i.exec(e.summary);
      if (!m || e.status === "CANCELLED" || e.start < from || e.start > to || seen.has(e.uid + e.start)) continue;
      seen.add(e.uid + e.start);
      const over = e.end <= now, id = (hashOf(e.uid + e.start) >>> 0).toString(36);
      if (!over) soonest = Math.min(soonest, e.end);
      const veil = (/^\s*veil\s*:\s*(.+)$/im.exec(e.description) || [])[1];
      const blurb = e.description.replace(/^\s*veil\s*:.*$/gim, "").trim().slice(0, 4000);
      const day = dayIn(e.start, e.tz), last = dayIn(e.allDay ? e.end - 1 : e.end, e.tz);
      list.push(over
        ? { id, over: true, title: m[1].trim().slice(0, 100), date: day, end: last, blurb }
        : { id, over: false, title: (veil || m[1]).trim().slice(0, 100), month: monthOf(day), date: day.slice(0, 7) + "-01", blurb });
    }
    note = `Calendar read: ${scanned} events checked, ${list.length} quest${list.length === 1 ? "" : "s"} found.`;
  } catch (err) { list = []; failed = true; note = "Could not read the calendar: " + (err.message || err); }
  list.sort((a, b) => b.date.localeCompare(a.date));
  // A good answer is kept for up to 10 minutes, but never past the moment the next quest ends, so a quest turns
  // completed right on time. A failed answer is not kept, so the next visit tries again.
  const keep = Math.max(30, Math.min(600, Math.floor((soonest - Date.now()) / 1000)));
  const res = new Response(JSON.stringify({ quests: list, note }), { headers: { "content-type": "application/json", "cache-control": failed ? "no-store" : "public, max-age=" + keep } });
  if (cache && !failed) await cache.put(key, res.clone());
  return res;
}

/* ------------------------------------------------------------------ push notifications ------------------------- */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// The site's push key pair (VAPID): made once and kept, so devices that subscribed keep working.
async function vapid(env) {
  await env.QUESTS_DB.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)").run();
  const get = async () => { const row = await env.QUESTS_DB.prepare("SELECT value FROM settings WHERE key = 'push_vapid'").first(); return row ? JSON.parse(row.value) : null; };
  const have = await get(); if (have) return have;
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const v = { jwk: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  await env.QUESTS_DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('push_vapid', ?)").bind(JSON.stringify(v)).run();
  return get();   // if two visitors asked at the same moment, both get the one that was kept
}
// The signed note each push carries to prove it came from halflife.studio.
async function vapidAuth(v, endpoint) {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://halflife.studio" });
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${v.pub}`;
}
async function pushTable(env) { await env.QUESTS_DB.prepare("CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, created INTEGER NOT NULL)").run(); }

async function pushSubscribe(request, env) {
  let sub = {};
  try { sub = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  const endpoint = String(sub.endpoint || "");
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000) return json({ ok: false, error: "That isn't a push address." }, 400);
  await pushTable(env);
  await env.QUESTS_DB.prepare("INSERT OR IGNORE INTO push_subs (endpoint, created) VALUES (?, ?)").bind(endpoint, Date.now()).run();
  return json({ ok: true });
}

async function pushLatest(env) {
  const p = ((await (await env.ASSETS.fetch(new Request(SITE + "/posts.json"))).json()).posts || [])[0];
  if (!p) return json({ title: "Half Life", body: "A new entry has been set down.", url: "/" });
  return json({ title: p.title, body: plainBody(p.body, 18), url: "/#/post/" + encodeURIComponent(p.file) });
}

// Sends one push to every device, once per entry (remembered in settings as push_last). Devices that have since
// turned notifications off answer 404 or 410, and are forgotten.
async function pushOnce(env, file) {
  await pushTable(env);
  const last = await env.QUESTS_DB.prepare("SELECT value FROM settings WHERE key = 'push_last'").first().catch(() => null);
  if (last && last.value === file) return { skipped: "already pushed" };
  const { results } = await env.QUESTS_DB.prepare("SELECT endpoint FROM push_subs").all();
  const v = await vapid(env); let sent = 0, gone = 0;
  for (const { endpoint } of results || []) {
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { authorization: await vapidAuth(v, endpoint), ttl: "86400", urgency: "normal" }, body: "" });
      if (r.status === 404 || r.status === 410) { await env.QUESTS_DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(endpoint).run(); gone++; }
      else if (r.ok) sent++;
    } catch (e) {}
  }
  await env.QUESTS_DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('push_last', ?)").bind(file).run();
  return { sent, gone };
}

