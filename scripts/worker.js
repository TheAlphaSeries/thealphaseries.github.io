// The site is plain files, and Cloudflare serves those by itself. This small program only makes sure a browser
// checks for a newer copy of the page, its script and its style before reusing one, since those change often.
//
// The game that used to live here (quests, sign-ups, remarks) moved to its own repository, halflife-game. What
// people sent to it is still kept in the QUESTS_DB database, untouched; nothing on this site reads or writes it now.

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) return new Response("Gone.", { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } });
    const r = await env.ASSETS.fetch(request), type = r.headers.get("content-type") || "";
    if (!/text\/html|javascript|text\/css|json/i.test(type)) return r;
    const h = new Headers(r.headers); h.set("cache-control", "no-cache");
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }
};
