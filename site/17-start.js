/* ==========================================================================
   15. LOADING AND START
   Draws the first screen straight away (empty), then fetches posts.json,
   tidies every piece of it so one odd entry can never break a screen, and
   redraws whichever screen is showing.
   ========================================================================== */
const tick = () => { $("#clock").textContent = new Date().toTimeString().slice(0, 8); };
tick(); setInterval(tick, 1000);
sizeSky();
if (!reduceMotion) (function loop() { if (!document.hidden) drawSky(1); requestAnimationFrame(loop); })();
syncMusic();
showFiles();
syncLayers();
function linkedPost() {   /* the entry named after # in the address, if there is one */
  let id = (location.hash || "").slice(1);
  try { id = decodeURIComponent(id); } catch (e) {}
  return (id && sorted.find((p) => p.file === id)) || null;
}
(async function loadEntries() {   /* fetch the entry list; the title screen is up while this happens */
  try {
    /* the pictures: a short list saying where each one is, and the sheet they are all on. Fetched alongside; the site works without them */
    const pictures = fetch("sprites.json", { cache: "no-cache" }).then((p) => (p.ok ? p.json() : null)).then((pics) => {
      if (!pics || typeof pics !== "object" || !/^[\w.-]+\.png$/.test(text(pics.sheet))) return pics;
      return new Promise((done) => { const im = new Image(); im.onload = () => { try { const cv = el("canvas"); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const x = cv.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0); SHEET = x; } catch (e) { SHEET = null; } done(pics); }; im.onerror = () => done(pics); im.src = pics.sheet; });
    }).catch(() => null);
    const r = await fetch("posts.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("status " + r.status);
    const pics = await pictures;
    if (pics && typeof pics === "object") {
      const group = (g) => (g && typeof g === "object" && !Array.isArray(g) ? g : {});
      FISH = group(pics.fish); FISH_ALIAS = group(pics.fishAlias); PLANT = group(pics.plants); PLANT_ALIAS = group(pics.plantAlias);
      if (Array.isArray(pics.divers)) DIVERS = pics.divers.map(text);
      if (Array.isArray(pics.size) && pics.size[0] > 0 && pics.size[1] > 0 && pics.size[0] <= 512 && pics.size[1] <= 512) FISH_SIZE = [Math.round(pics.size[0]), Math.round(pics.size[1])];
    }
    const data = (await r.json()) || {};
    /* Tidy everything on the way in, so one odd or half-filled entry can never break a screen. */
    ABOUT = text(data.about); BESTIARY_INTRO = text(data.bestiary_intro);
    BESTIARY = (Array.isArray(data.bestiary) ? data.bestiary : []).filter((b) => b && typeof b === "object").map((b) => ({
      name: text(b.name).trim() || "Unknown", sprite: text(b.sprite) || "fish", file: text(b.file).replace(/^\d+-/, ""), date: text(b.date), weight: amount(b.weight), length: amount(b.length),
      location: text(b.location), photo: text(b.photo), lore: text(b.lore), status: text(b.status) === "wanted" ? "wanted" : "caught",
      rarity: Object.prototype.hasOwnProperty.call(RARITY, text(b.rarity)) ? text(b.rarity) : "", lure: text(b.lure),
      catch_rate: Math.min(100, amount(b.catch_rate) || 0) || null, fight: Math.min(5, Math.round(amount(b.fight) || 0)) || null }));
    BESTIARY = BESTIARY.filter((b) => b.status !== "wanted").concat(BESTIARY.filter((b) => b.status === "wanted"));   /* caught first, then the ones still at large */
    ALBUMS = (Array.isArray(data.albums) ? data.albums : []).filter((a) => a && typeof a === "object" && text(a.file)).map((a) => ({
      file: text(a.file), title: text(a.title) || text(a.file), date: text(a.date), place: text(a.place), body: text(a.body),
      photos: (Array.isArray(a.photos) ? a.photos : []).map(text).filter(Boolean),
      captions: (Array.isArray(a.captions) ? a.captions : []).filter((c) => c && typeof c === "object" && text(c.photo) && text(c.caption)).map((c) => ({ photo: text(c.photo), caption: text(c.caption) })) }))
      .map((a) => { for (const c of a.captions) if (!a.photos.includes(c.photo)) a.photos.push(c.photo); return a; });   /* a captioned photo that was not in the list still belongs to the album */
    PLACES = (Array.isArray(data.places) ? data.places : []).filter((p) => p && typeof p === "object").map((p, i) => {
      const lat = typeof p.lat === "number" ? p.lat : NaN, lng = typeof p.lng === "number" ? p.lng : NaN, good = Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      return { file: text(p.file) || "place-" + i, name: text(p.name).trim() || "Unnamed place", kind: Object.prototype.hasOwnProperty.call(KINDS, text(p.kind)) ? text(p.kind) : "landmark",
        lat: good ? lat : null, lng: good ? lng : null, date: text(p.date), photo: text(p.photo), note: text(p.note),
        trip: text(p.trip).trim(), stop: typeof p.stop === "number" && Number.isFinite(p.stop) ? p.stop : null,
        landmarks: (Array.isArray(p.landmarks) ? p.landmarks : []).filter((l) => l && typeof l === "object" && text(l.name).trim()).map((l) => {
          const at = typeof l.lat === "number" && typeof l.lng === "number" && Math.abs(l.lat) <= 90 && Math.abs(l.lng) <= 180;
          return { name: text(l.name).trim(), icon: text(l.icon), visited: l.visited === true, lat: at ? l.lat : null, lng: at ? l.lng : null };
        }) };
    });
    const kindOrder = Object.keys(KINDS);   /* list order: by kind, then trips together in stop order, then by name */
    PLACES.sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.trip.localeCompare(b.trip) ||
      (a.stop == null ? 1e9 : a.stop) - (b.stop == null ? 1e9 : b.stop) || a.name.localeCompare(b.name));
    const st = data.status && typeof data.status === "object" ? data.status : {};
    STATUS = { name: text(st.name).trim(), class: text(st.class).trim(), home: text(st.home).trim(), body: text(st.body) };
    EQUIPMENT = (Array.isArray(st.equipment) ? st.equipment : []).filter((x) => x && typeof x === "object" && text(x.name).trim()).slice(0, 24).map((x) => ({ kit: owns(KITS, text(x.kit)) ? text(x.kit) : "dress", slot: text(x.slot).trim() || "Carried", name: text(x.name).trim(), maker: text(x.maker).trim(), bonus: text(x.bonus).trim(), about: text(x.about) }));
    PLANTS = (Array.isArray(data.plants) ? data.plants : []).filter((p) => p && typeof p === "object").map((p) => ({
      name: text(p.name).trim() || "Unnamed plant", botanical: text(p.botanical), kind: text(p.kind) === "bonsai" ? "bonsai" : "house", sprite: text(p.sprite) || "plant", file: text(p.file).replace(/^\d+-/, ""),
      status: text(p.status) === "perished" ? "perished" : "living", count: Math.max(1, Math.min(999, Math.round(amount(p.count) || 1))),
      rarity: Object.prototype.hasOwnProperty.call(RARITY, text(p.rarity)) ? text(p.rarity) : "", temper: Math.min(5, Math.round(amount(p.temper) || 0)) || null,
      light: text(p.light), water: text(p.water), acquired: text(p.acquired), photo: text(p.photo), lore: text(p.lore) }));
    const intro = data.plants_intro && typeof data.plants_intro === "object" ? data.plants_intro : {};
    PLANT_INTRO = { bonsai: text(intro.bonsai), house: text(intro.house) };
    QUESTS = (Array.isArray(data.quests) ? data.quests : []).filter((q) => q && typeof q === "object" && text(q.title).trim()).map((q) => ({
      file: text(q.file), title: text(q.title).trim(), status: text(q.status) === "completed" ? "completed" : "active",
      difficulty: Math.min(5, Math.max(1, Math.round(amount(q.difficulty) || 2))), kind: owns(QUEST_KINDS, text(q.kind)) ? text(q.kind) : "side", reward: text(q.reward).trim(), grade: text(q.grade), commended: text(q.commended).trim().slice(0, 40), album: text(q.album).trim(), report: text(q.report),
      roles: (Array.isArray(q.roles) ? q.roles : []).filter((r) => r && typeof r === "object" && text(r.name).trim()).slice(0, 12).map((r) => ({ name: text(r.name).trim().slice(0, 60), about: text(r.about).trim(), held: text(r.held).trim().slice(0, 40) })),
      exp: typeof q.exp === "number" && Number.isFinite(q.exp) ? Math.min(9999, Math.max(0, Math.round(q.exp))) : null, completed: /^\d{4}-\d{2}-\d{2}/.test(text(q.completed)) ? text(q.completed).slice(0, 10) : "", order: typeof q.order === "number" && Number.isFinite(q.order) ? q.order : 1e9, when: text(q.when), place: text(q.place), body: text(q.body),
      objectives: (Array.isArray(q.objectives) ? q.objectives : []).filter((o) => o && typeof o === "object" && text(o.text).trim()).map((o) => ({ text: text(o.text).trim(), done: o.done === true })) }))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    sorted = (Array.isArray(data.posts) ? data.posts : []).filter((p) => p && typeof p === "object" && text(p.file)).map((p) => ({
      file: text(p.file), title: text(p.title) || text(p.file), date: text(p.date), place: text(p.place), body: text(p.body) }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file));
    loadNote = "No entries yet.";
  } catch (e) { ABOUT = ""; BESTIARY_INTRO = ""; BESTIARY = []; ALBUMS = []; PLACES = []; QUESTS = []; PLANTS = []; PLANT_INTRO = { bonsai: "", house: "" }; sorted = []; loadNote = "Could not load the log. Refresh to try again."; }
  $("#count").textContent = sorted.length; $("#lvl").textContent = tally().level;
  $("#latest").textContent = sorted[0] ? day(sorted[0].date).split(",")[0] || "-" : "-";
  loadKnown(); menuDots(); offerContinue(); $("#pct").textContent = sorted.length || BESTIARY.length ? completion().all + "%" : "-";
  pendingPost = linkedPost();
  const started = introBox.classList.contains("done");
  if (view === "files" && reader.hidden) showFiles(started);   /* redraw whichever screen is up, now that there is something to show */
  if (view === "bestiary") showBestiary(started);
  if (view === "plants") showPlants(plantsKind, started);
  if (view === "status") showStatus(started);
  if (view === "equip") showEquipment(started);
  if (view === "quests") showQuestLog(started);
  if (view === "chron") showChronicle(started);
  if (view === "photos" || view === "album") showPhotos(started);
  if (view === "map") showMap(started);
  drawMini(); loadLand().then(drawMini); loadParty().then(moments); loadRemarks();
  if (view === "about") showPage("about", "m-about", "Preface", ABOUT);
  if (pendingPost && started) { showPost(pendingPost); pendingPost = null; }
})();
window.addEventListener("hashchange", () => {   /* following a link to another entry while the page is open */
  const p = linkedPost();
  if (p && p !== current && introBox.classList.contains("done")) { if (!zoomBox.hidden) unzoom(); showPost(p); }
});
startSprite();
$("#startbtn").focus();
