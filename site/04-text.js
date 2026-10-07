/* ==========================================================================
   5. ENTRY TEXT
   The editor saves writing as Markdown: a blank line starts a new paragraph,
   # makes a heading, - or 1. a list, > a quote, **bold**, *italic*,
   [link](address), ![caption](photo). renderBody() reads that and builds
   the matching elements. Used for entries, lore, blurbs and quest stories.
   ========================================================================== */
const IMG = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const INLINE = /\\([\\`*_\[\]()!#>.+-])|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*(.+?)\*\*|__(.+?)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_|`([^`]+)`|<(https?:\/\/[^\s<>]+)>|(https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]])/;
const WORDCHAR = /[A-Za-z0-9]/;
const safeUrl = (u) => (/^(https?:|mailto:|\/|\.\/|#)/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u)) ? u : "#";
/* A job makes two smaller copies of everything in photos/: thumbs/ for grids and large/ for viewing.
   The page asks for the copy first and falls back to the original if the copy is not there yet. */
function copyOf(src, dir) { const m = /^\/?photos\/(.+\.(?:jpe?g|png|webp))$/i.exec(src); return m ? "/" + dir + "/" + m[1] + ".jpg" : ""; }
function loadPicture(img, src, dir, onMissing) {
  src = safeUrl(src); const small = copyOf(src, dir); let triedOriginal = !small;
  img.onerror = () => {
    if (!triedOriginal) { triedOriginal = true; img.src = src; }
    else { img.onerror = null; if (onMissing) onMissing(); }
  };
  img.src = small || src;
}
function photo(src, caption) {
  const fig = el("figure"), b = el("button", "shot"), img = el("img");
  b.type = "button"; b.setAttribute("aria-label", "Enlarge photo" + (caption ? ": " + caption : ""));
  img.alt = caption || ""; img.loading = "lazy";
  loadPicture(img, src, "large", () => { fig.textContent = ""; fig.append(el("p", "sub", "[photo missing]")); });   /* says so instead of showing a broken picture */
  b.append(img); b.addEventListener("click", () => zoom(src, caption || "", b));
  fig.append(b); if (caption) fig.append(el("figcaption", null, caption));
  return fig;
}
function inline(text, into) {   /* bold, italic, links and code inside a line */
  const re = new RegExp(INLINE.source, "g");
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m[9] && (WORDCHAR.test(text[m.index - 1] || "") || WORDCHAR.test(text[re.lastIndex] || ""))) {
      re.lastIndex = m.index + 1; continue;   /* an underscore inside a word (snake_case) is just an underscore */
    }
    if (m.index > last) into.append(text.slice(last, m.index));
    if (m[1]) into.append(m[1]);
    else if (m[3]) into.append(photo(m[3], m[2]));
    else if (m[5]) { const a = el("a"); inline(m[4], a); a.href = safeUrl(m[5]); a.target = "_blank"; a.rel = "noopener"; into.append(a); }
    else if (m[6] || m[7]) { const b = el("strong"); inline(m[6] || m[7], b); into.append(b); }
    else if (m[8] || m[9]) { const i = el("em"); inline(m[8] || m[9], i); into.append(i); }
    else if (m[10]) into.append(el("code", null, m[10]));
    else if (m[11] || m[12]) { const a = el("a", null, m[11] || m[12]); a.href = m[11] || m[12]; a.target = "_blank"; a.rel = "noopener"; into.append(a); }
    last = re.lastIndex;
  }
  if (last < text.length) into.append(text.slice(last));
}
/* Build the elements for a piece of writing and put them inside "into". depth counts quotes inside quotes. */
function renderBody(text, into, depth) {
  String(text || "").replace(/\r/g, "").split(/\n\s*\n/).forEach((block) => {
    let lines = block.split("\n").map((l) => l.replace(/\s+$/, (m) => (m.length > 1 ? "  " : ""))).filter((l) => l.trim());   /* two trailing spaces are kept: they mean a line break */
    if (!lines.length) return;
    const head = /^\s*#{1,6}\s+(.*)$/.exec(lines[0]);
    if (head) { const h = el("h3"); inline(head[1].replace(/\s+#+\s*$/, "").trim(), h); into.append(h); lines = lines.slice(1); if (!lines.length) return; }
    const flat = lines.map((l) => l.trim());
    if (flat.length === 1 && /^([-*_])(\s*\1){2,}$/.test(flat[0])) { into.append(el("hr")); return; }
    const joined = flat.join(" ");
    if (joined.replace(new RegExp(IMG.source, "g"), "").trim() === "") {   /* nothing but photos: lay them out as a set */
      const shots = [...joined.matchAll(new RegExp(IMG.source, "g"))];
      const wrap = el("div", "shots" + (shots.length > 1 ? " multi" : ""));
      shots.forEach((m) => wrap.append(photo(m[2], m[1])));
      into.append(wrap); return;
    }
    const bullet = /^[-*+]\s+/, number = /^\d+[.)]\s+/;
    if (bullet.test(flat[0]) || number.test(flat[0])) {
      const marker = bullet.test(flat[0]) ? bullet : number, list = el(marker === bullet ? "ul" : "ol");
      let li = null;
      flat.forEach((l) => {
        if (marker.test(l)) { li = el("li"); inline(l.replace(marker, ""), li); list.append(li); }
        else if (li) { li.append(" "); inline(l, li); }
      });
      into.append(list); return;
    }
    if (flat.every((l) => l.startsWith(">"))) {
      /* a quote can hold paragraphs, headings and lists of its own, so its inside is read the same way as an entry */
      const q = el("blockquote"), inner = flat.map((l) => l.replace(/^>\s?/, ""));
      if ((depth || 0) < 4) renderBody(inner.join("\n"), q, (depth || 0) + 1); else inline(inner.join(" "), q);
      into.append(q); return;
    }
    const para = el("p");
    lines.forEach((l, i) => {   /* a line ending in two spaces or a backslash is a deliberate line break */
      const hard = /( {2,}|\\)$/.test(l);
      inline(l.replace(/( {2,}|\\)$/, "").trim(), para);
      if (i < lines.length - 1) para.append(hard ? el("br") : " ");
    });
    into.append(para);
  });
}
