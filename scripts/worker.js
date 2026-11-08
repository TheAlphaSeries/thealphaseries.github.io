// The site is plain files, and Cloudflare serves those by itself. This small program does two things besides:
//
// 1. It makes sure a browser checks for a newer copy of the page, its script and its style before reusing one,
//    since those change often.
// 2. Email alerts for new entries:
//      POST /api/subscribe     a friend leaves their email address (the box at the foot of each post and on About)
//      GET  /api/unsubscribe   the link at the bottom of every alert email; removes the address at once
//      POST /api/notify        called by GitHub (.github/workflows/alert.yml) when a NEW post file appears in posts/,
//                              never when a post is edited; sends one email per address
//    The addresses live in the site's own Cloudflare database (QUESTS_DB, table "subscribers") and are never shown
//    anywhere on the site. Emails are sent through Resend (resend.com) from entries@halflife.studio.
//
//    It needs two secrets, set in Cloudflare (Workers > thealphaseries-github-io > Settings > Variables and Secrets):
//      RESEND_API_KEY   the key from Resend
//      NOTIFY_SECRET    a long random password; the same one is saved in GitHub so only GitHub can trigger a send
//
// The game that used to live here (quests, sign-ups, remarks) moved to its own repository, halflife-game. What
// people sent to it is still kept in the QUESTS_DB database, untouched; nothing on this site reads or writes it now.

const SITE = "https://halflife.studio";
const FROM = "Half Life <entries@halflife.studio>";

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    if (path === "/api/subscribe" && request.method === "POST") return subscribe(request, env);
    if (path === "/api/unsubscribe") return unsubscribe(url, env);
    if (path === "/api/notify" && request.method === "POST") return notify(request, env);
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

// Both sides of a comparison take the same time, so the secret cannot be guessed a letter at a time.
function same(a, b) { a = String(a || ""); b = String(b || ""); if (!a || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

async function resend(env, emails) {
  if (!env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY is not set" };
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {                         // Resend takes up to 100 emails per request
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST", headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify(emails.slice(i, i + 100))
    });
    if (!r.ok) return { ok: false, sent, error: "Resend said " + r.status + ": " + (await r.text()).slice(0, 300) };
    sent += Math.min(100, emails.length - i);
  }
  return { ok: true, sent };
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
  const welcome = await resend(env, [{ from: FROM, to: email, subject: "You're on the list · Half Life",
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

/* ------------------------------------------------------------------ notify ------------------------------------- */
// GitHub sends { file: "2026-11-07-entry-5" } once that new post is live. The post's title and opening lines come
// from posts.json on this very site, so the email always matches what people will see.
async function notify(request, env) {
  if (!env.NOTIFY_SECRET || !same(request.headers.get("x-notify-secret"), env.NOTIFY_SECRET)) return json({ ok: false, error: "Not allowed." }, 403);
  let data = {};
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request." }, 400); }
  const file = String(data.file || "");
  const posts = await (await env.ASSETS.fetch(new Request(SITE + "/posts.json"))).json();
  const p = (posts.posts || []).find((x) => x.file === file);
  if (!p) return json({ ok: false, error: "No post called " + file + " is live yet." }, 404);

  await table(env);
  // never twice for the same post, even if GitHub runs again
  await env.QUESTS_DB.prepare("CREATE TABLE IF NOT EXISTS alerts_sent (file TEXT PRIMARY KEY, sent INTEGER NOT NULL)").run();
  if (await env.QUESTS_DB.prepare("SELECT file FROM alerts_sent WHERE file = ?").bind(file).first()) return json({ ok: true, skipped: "already sent" });

  const { results } = await env.QUESTS_DB.prepare("SELECT email, token FROM subscribers").all();
  const link = `${SITE}/#/post/${encodeURIComponent(file)}`, when = new Date(p.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const lede = plainBody(p.body);
  const emails = (results || []).map(({ email, token: t }) => {
    const unsub = `${SITE}/api/unsubscribe?t=${t}`;
    return { from: FROM, to: email, subject: `${p.title} · Half Life`,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      html: shell(`<tr><td style="font:12px 'Courier New',monospace;letter-spacing:3px;color:#bd94ff;padding-bottom:10px">NEW ENTRY · ${esc(when.toUpperCase())}</td></tr>
<tr><td style="font:400 30px/1.2 Georgia,serif;color:#fff;padding-bottom:16px">${esc(p.title)}</td></tr>
<tr><td style="font:17px/1.7 Georgia,serif;color:#e4ddf2;padding-bottom:26px">${esc(lede)}</td></tr>
<tr><td style="padding-bottom:36px"><a href="${link}" style="display:inline-block;padding:12px 22px;border:1px solid #bd94ff;color:#fff;text-decoration:none;font:13px 'Courier New',monospace;letter-spacing:3px">READ IT</a></td></tr>`, unsub),
      text: `New entry · ${when}\n\n${p.title}\n\n${lede}\n\nRead it: ${link}\n\nStop these emails: ${unsub}` };
  });
  if (!emails.length) { await env.QUESTS_DB.prepare("INSERT OR IGNORE INTO alerts_sent (file, sent) VALUES (?, ?)").bind(file, Date.now()).run(); return json({ ok: true, sent: 0 }); }
  const r = await resend(env, emails);
  if (r.ok) await env.QUESTS_DB.prepare("INSERT OR IGNORE INTO alerts_sent (file, sent) VALUES (?, ?)").bind(file, Date.now()).run();
  return json(r, r.ok ? 200 : 502);
}
