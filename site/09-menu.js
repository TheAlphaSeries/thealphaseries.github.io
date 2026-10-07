/* ==========================================================================
   10. MENU AND KEYBOARD
   ========================================================================== */
$("#m-files").addEventListener("click", () => showFiles(true));
$("#m-bestiary").addEventListener("click", () => showBestiary(true));
$("#m-plants").addEventListener("click", () => showPlants(plantsKind, true));
$("#m-photos").addEventListener("click", () => showPhotos(true));
$("#m-map").addEventListener("click", () => showMap(true));
$("#m-status").addEventListener("click", () => showStatus(true));
$("#m-gear").addEventListener("click", () => showEquipment(true));
if (SHELVED.equipment) $("#m-gear").remove();   /* on the shelf for now */
$("#m-quests").addEventListener("click", () => showQuestLog(true));
$("#m-chron").addEventListener("click", () => showChronicle(true));
$("#m-about").addEventListener("click", () => showPage("about", "m-about", "About", ABOUT));
$("#m-how").addEventListener("click", () => showPage("help", "m-how", "Help", HELP));

/* One place handles every key: Up/Down move the cursor, Left/Right switch window, Enter confirms (the
   browser does that itself), Esc goes back. What a key does depends on what is on top: the title
   screen, an enlarged photo, an open entry, or just the windows. */
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!introBox.classList.contains("done")) {   /* title screen: Enter or Space starts */
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (document.activeElement === $("#continuebtn")) $("#continuebtn").click(); else endIntro(); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { const c = $("#continuebtn"); if (!c.hidden) (document.activeElement === c ? $("#startbtn") : c).focus(); }
    return;
  }
  if (!zoomBox.hidden) {   /* an enlarged photo: Left and Right step through a set, anything else that confirms or cancels closes it */
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); zoomStep(e.key === "ArrowRight" ? 1 : -1); }
    else if (e.key === "Escape" || ((e.key === "Enter" || e.key === " ") && !(e.target.closest && e.target.closest(".zoomnav")))) { e.preventDefault(); unzoom(); }
    return;
  }
  const reading = !reader.hidden;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.key !== "Escape") return;   /* typing in a box: the arrow keys belong to the text */
  if (e.key === "Escape") { if (reading) closePost(); else if (view === "album") showPhotos(true); else if (view === "equip") showFiles(true); else if (view !== "files") showFiles(true); return; }
  const dir = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  const side = e.key === "ArrowLeft" || e.key === "ArrowRight";
  if (!dir && !side) return;
  const a = document.activeElement;
  if (reading) {   /* Left and Right move between Back and Next; Up and Down scroll the entry */
    const opts = [...rwin.querySelectorAll(".opt")], i = opts.indexOf(a);
    if (side && opts.length) { opts[(Math.max(i, 0) + (e.key === "ArrowRight" ? 1 : -1) + opts.length) % opts.length].focus(); e.preventDefault(); }
    return;
  }
  const inMenu = menu.contains(a), inMain = main.contains(a) && a !== main;
  let pane = inMenu ? menu : main;
  if (side) pane = (e.key === "ArrowRight" && !inMenu) ? menu : (e.key === "ArrowLeft" && inMenu) ? main : null;
  if (!pane) return;
  const opts = [...pane.querySelectorAll(".opt:not(.locked)")]; if (!opts.length) return;
  let i = opts.indexOf(a);
  if (side || (!inMenu && !inMain)) i = Math.max(0, opts.findIndex((o) => o.getAttribute("aria-current") === "true"));
  else i = (i + dir + opts.length) % opts.length;
  opts[i].focus(); e.preventDefault();
});

/* ==========================================================================
   11. TITLE SCREEN
   Shown on every visit. Pressing Start is also the tap browsers require
   before a page may play sound, so it is what starts the music.
   ========================================================================== */
let pendingPost = null;   /* an entry named in the link, opened once Start is pressed */
function endIntro() {
  if (introBox.classList.contains("done")) return;
  introBox.classList.add("done"); syncLayers(); stopSprite();
  stage.classList.remove("go"); void stage.offsetWidth; stage.classList.add("go");   /* replay the windows' entrance */
  showFiles(true);
  if (pendingPost) { showPost(pendingPost); pendingPost = null; }
  playMoments();
}
introBox.addEventListener("click", endIntro);
