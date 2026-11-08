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
// 3. Quests: GET /api/quests reads Chris's Google Calendar (its private iCal address, saved in Cloudflare as the
//    secret QUEST_CALENDAR) and passes on ONLY events whose title starts with "Quest:". Nothing else in the calendar
//    ever leaves this program: no locations, no notes, no other events. A quest still to come is veiled: just a
//    Dying Earth-style name and the month (write "Veil: …" in the event's description to choose the name yourself);
//    once it is over, its real title and date are shown. The tower draws them as gold rings (site/tower.js).
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
// The names an upcoming quest goes by until it is over, when its own name has not been chosen with "Veil: …".
const VEILS = [
  "A journey toward a far shore", "An errand beyond the mountains", "A voyage of uncertain purpose", "A summons from a distant city",
  "A pilgrimage, details withheld", "An expedition across the water", "A matter requiring travel", "A crossing of some consequence",
  "An appointment at the edge of the map", "A wandering, plans imprecise", "A visit to people of good repute", "A quest whose nature is not yet told"
];
function unfold(ics) { return String(ics).replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
function unescapeIcs(v) { return String(v || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim(); }
// "20261114", "20261114T090000Z" or "20261114T090000" (with a TZID) all become "2026-11-14"
function icsDay(v) { const m = /(\d{4})(\d{2})(\d{2})/.exec(v || ""); return m ? `${m[1]}-${m[2]}-${m[3]}` : ""; }
function events(ics) {
  const out = [];
  for (const block of unfold(ics).split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0], field = (name) => { const m = new RegExp("^" + name + "(?:;[^:\\n]*)?:(.*)$", "m").exec(body); return m ? m[1] : ""; };
    out.push({ uid: field("UID"), summary: unescapeIcs(field("SUMMARY")), description: unescapeIcs(field("DESCRIPTION")), start: icsDay(field("DTSTART")),
      end: icsDay(field("DTEND")), allDay: /DTSTART;VALUE=DATE:/.test(body), status: field("STATUS") });
  }
  return out;
}
function hashOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
const monthOf = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

async function quests(env) {
  if (!env.QUEST_CALENDAR) return json({ quests: [] });
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request("https://halflife.studio/api/quests#cache");
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let list = [];
  try {
    const r = await fetch(env.QUEST_CALENDAR, { headers: { "user-agent": "halflife.studio" } });
    if (!r.ok) throw new Error("calendar " + r.status);
    const today = new Date().toISOString().slice(0, 10), from = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10), to = new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10);
    const seen = new Set();
    for (const e of events(await r.text())) {
      const m = /^\s*quest\s*:\s*(.+)$/i.exec(e.summary);
      if (!m || !e.start || e.status === "CANCELLED" || e.start < from || e.start > to || seen.has(e.uid + e.start)) continue;
      seen.add(e.uid + e.start);
      // an all-day event's end date is the day after it finishes
      let end = e.end || e.start; if (e.allDay && end > e.start) end = new Date(Date.parse(end + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
      const over = end < today, id = (hashOf(e.uid + e.start) >>> 0).toString(36);
      const veil = (/^\s*veil\s*:\s*(.+)$/im.exec(e.description) || [])[1];
      list.push(over
        ? { id, over: true, title: m[1].trim().slice(0, 80), date: e.start, end }
        : { id, over: false, title: (veil || VEILS[hashOf(e.uid) % VEILS.length]).trim().slice(0, 80), month: monthOf(e.start), date: e.start.slice(0, 7) + "-01" });
    }
  } catch (err) { list = []; }
  list.sort((a, b) => b.date.localeCompare(a.date));
  const res = new Response(JSON.stringify({ quests: list }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=600" } });
  if (cache) await cache.put(key, res.clone());
  return res;
}

