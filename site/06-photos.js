/* ==========================================================================
   7. PHOTO VIEWER
   One enlarged photo, or a set of them to step through with Prev / Next,
   the arrow keys or a swipe.
   ========================================================================== */
const zoomImg = zoomBox.querySelector("img"), zoomNote = zoomBox.querySelector("p"), zoomNav = zoomBox.querySelector(".zoomnav");
let zoomFrom = null, zoomSet = null, zoomAt = 0;
function zoomShow() {
  const it = zoomSet[zoomAt];
  zoomImg.alt = it.caption || ""; zoomNote.textContent = it.caption || "";
  loadPicture(zoomImg, it.src, "large", () => { if (!zoomBox.hidden) zoomNote.textContent = "This photo could not be loaded."; });
  zoomNav.hidden = zoomSet.length < 2; $("#zcount").textContent = (zoomAt + 1) + " / " + zoomSet.length;
}
function zoom(src, caption, from, set, at) {
  const many = Array.isArray(set) && set.length > 0;
  zoomSet = many ? set : [{ src, caption }]; zoomAt = many ? Math.max(0, Math.min(set.length - 1, at || 0)) : 0;
  zoomFrom = from || null; zoomBox.hidden = false; syncLayers(); zoomShow();
}
function zoomStep(d) { if (zoomBox.hidden || !zoomSet || zoomSet.length < 2) return; zoomAt = (zoomAt + d + zoomSet.length) % zoomSet.length; zoomShow(); }
function unzoom() {
  if (zoomBox.hidden) return;
  zoomBox.hidden = true; zoomImg.onerror = null; zoomImg.removeAttribute("src"); syncLayers();
  if (zoomFrom && zoomFrom.isConnected) zoomFrom.focus();
  zoomFrom = null; zoomSet = null;
}
zoomBox.addEventListener("click", (e) => { if (!e.target.closest(".zoomnav")) unzoom(); });
$("#zprev").addEventListener("click", () => zoomStep(-1));
$("#znext").addEventListener("click", () => zoomStep(1));
let swipeX = null;   /* swipe left or right to step through a set */
zoomBox.addEventListener("touchstart", (e) => { swipeX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
zoomBox.addEventListener("touchend", (e) => {
  if (swipeX == null) return;
  const dx = e.changedTouches[0].clientX - swipeX; swipeX = null;
  if (Math.abs(dx) > 45 && zoomSet && zoomSet.length > 1) { e.preventDefault(); zoomStep(dx < 0 ? 1 : -1); }   /* preventDefault: a swipe is not also a tap-to-close */
});

/* ==========================================================================
   8. PHOTO ALBUMS
   A grid of album covers; each opens into a grid of its photos.
   ========================================================================== */
/* the Photos screen: every album's cover. focusFile: the album to put the cursor back on */
function showPhotos(focusFile) {
  openScreen("photos", "m-photos");
  main.append(el("p", "label", "Photos"));
  if (!ALBUMS.length) { main.append(el("p", "sub", loadNote === "Loading..." ? loadNote : "No albums yet."), backRow()); return; }
  const wrap = el("div", "albums");
  ALBUMS.forEach((a, i) => {
    const b = opt(null, () => showAlbum(a), "album"), cover = el("span", "cover");
    if (a.photos[0]) { const img = el("img"); img.alt = ""; img.loading = "lazy"; loadPicture(img, a.photos[0], "thumbs", () => img.remove()); cover.append(img); }
    b.append(cover, el("span", "name", a.title), el("span", "date", [day(a.date), count(a.photos.length, "photo")].filter(Boolean).join("  /  ")));
    b.dataset.album = a.file; b.style.setProperty("--i", Math.min(i, 6));
    wrap.append(b);
  });
  main.append(wrap, backRow());
  if (focusFile) { const all = [...wrap.querySelectorAll(".opt")]; (all.find((b) => b.dataset.album === focusFile) || all[0]).focus(); }
}
/* one album: its photos as a grid */
function showAlbum(a) {
  openScreen("album", "m-photos");
  const head = el("div", "albumhead"), meta = el("p", "meta");
  [day(a.date), a.place, count(a.photos.length, "photo")].filter(Boolean).forEach((t) => meta.append(el("span", null, t)));
  head.append(el("p", "label", "Photos"), el("h2", null, a.title), meta);
  main.append(head);
  if (a.body) { const words = el("div", "post"); renderBody(a.body, words); main.append(words); }
  const said = (src) => { const c = a.captions.find((k) => k.photo === src); return c ? c.caption : ""; };   /* the caption written for a photo, if any */
  const set = a.photos.map((src) => ({ src, caption: said(src) })), grid = el("div", "grid");
  a.photos.forEach((src, i) => {
    const b = el("button", "shot thumb"), img = el("img"), words = said(src);
    b.type = "button"; b.setAttribute("aria-label", "Photo " + (i + 1) + " of " + a.photos.length + (words ? ": " + words : "")); img.alt = words; img.loading = "lazy";
    if (words) { b.title = words; b.classList.add("said"); }   /* a small mark in the corner shows which photos have a caption */
    loadPicture(img, src, "thumbs", () => { b.textContent = "missing"; b.classList.add("missing"); b.disabled = true; });
    b.append(img); b.addEventListener("click", () => zoom(src, words, b, set, i));
    grid.append(b);
  });
  if (!a.photos.length) main.append(el("p", "sub", "No photos in this album yet."));
  const nav = el("div", "row group"); nav.append(opt("Back", () => showPhotos(a.file)));
  const pin = pinFor(a.place);
  if (pin) nav.append(opt("Show on map", () => showMap(true, pin.file)));
  main.append(grid, nav);
  nav.querySelector(".opt").focus({ preventScroll: true });
}
