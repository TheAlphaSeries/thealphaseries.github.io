/* HALF LIFE: the music. An original piece, site/theme.m4a (made by tools/music/compose.py): a lone flute over harp,
   strings joining the second time round, eighty seconds that loop without a seam. It never plays until the visitor
   turns it on with the Music button (remembered for next time, when it begins at their first touch of the page),
   and it pauses while the page is hidden. A plain audio element is used, so phones play it even on silent. */
(() => {
  "use strict";
  const btn = document.getElementById("music"); if (!btn) return;
  const audio = new Audio(); audio.src = "/site/theme.m4a"; audio.loop = true; audio.preload = "none"; audio.volume = 0;
  let want = false, fade = 0;
  try { want = localStorage.getItem("hl-music") === "on"; } catch (e) {}
  const show = () => { btn.setAttribute("aria-pressed", String(want)); btn.querySelector("span").textContent = want ? "on" : "off"; };
  const ramp = (to, ms, then) => {   // phones ignore volume; there it simply starts and stops
    clearInterval(fade); const from = audio.volume, t0 = performance.now();
    fade = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); audio.volume = from + (to - from) * k; if (k >= 1) { clearInterval(fade); if (then) then(); } }, 40);
  };
  const start = () => { audio.play().then(() => ramp(.7, 2500)).catch(() => {}); };
  const stop = () => ramp(0, 900, () => audio.pause());
  show();
  btn.addEventListener("click", () => { want = !want; try { localStorage.setItem("hl-music", want ? "on" : "off"); } catch (e) {} show(); want ? start() : stop(); });
  if (want) { const go = (e) => { if (e.target.closest && e.target.closest("#music")) return; removeEventListener("pointerdown", go, true); removeEventListener("keydown", go, true); if (want) start(); };
    addEventListener("pointerdown", go, true); addEventListener("keydown", go, true); }
  document.addEventListener("visibilitychange", () => { if (!want) return; if (document.hidden) audio.pause(); else if (audio.currentTime > 0) audio.play().catch(() => {}); });
})();
