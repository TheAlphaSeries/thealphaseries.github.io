/* ==========================================================================
   14. MUSIC
   An original looping piece made in the browser (no audio file): a slow
   melody over a drone and a hand drum. On unless the visitor turned it off.
   Browsers only allow sound to start from inside a tap, click or key press,
   so the audio engine is created there (unlockAudio), never at page load.
   ========================================================================== */
const MELODY = [[62, 0, 66, 67, 69, 0, 67, 66], [63, 0, 62, 0, 0, 0, 57, 0], [62, 0, 66, 67, 69, 0, 70, 69], [67, 0, 66, 0, 63, 0, 62, 0],
                [74, 0, 72, 70, 69, 0, 70, 0], [69, 0, 67, 66, 67, 0, 63, 0], [62, 63, 66, 0, 67, 66, 63, 0], [62, 0, 0, 0, 0, 0, 0, 0]];   /* 8 bars of 8 steps; 0 = rest */
const STEP = 0.31;   /* seconds per step */
const AudioEngine = window.AudioContext || window.webkitAudioContext;
let musicOn = store.get("music3") !== "0";
let ac = null, bus = null, musicTimer = null, nextNote = 0, stepNo = 0;
let audioError = "", unlockedBy = "";   /* kept for the ?debug readout */

function note(midi, t, len, vol, type) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + len + 0.05);
}
function drum(t, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.25);
}
function playStep(bar, s, t) {
  const n = MELODY[bar][s];
  if (n) { note(n, t, 1.3, 0.06, "triangle"); note(n + 12, t, 0.5, 0.012, "sine"); }
  if (s === 0) { note(38, t, 2.6, 0.09, "sine"); note(50, t, 2.6, 0.03, "triangle"); }   /* drone */
  if (s === 4) note(45, t, 1.4, 0.045, "sine");
  if (s === 0 || s === 3 || s === 6) drum(t, s === 0 ? 0.11 : 0.06);
}
function schedule() {   /* queue the next fraction of a second of notes; runs ten times a second */
  if (!ac || ac.state !== "running" || !musicOn || document.hidden) { nextNote = 0; return; }
  try {
    if (nextNote < ac.currentTime) nextNote = ac.currentTime + 0.06;
    while (nextNote < ac.currentTime + 0.4) {
      playStep(Math.floor(stepNo / 8) % MELODY.length, stepNo % 8, nextNote);
      nextNote += STEP; stepNo++;
    }
  } catch (err) { audioError = "schedule: " + err; }
}
function syncMusic() {   /* make the button and the sound match musicOn; safe to call at any time */
  const b = $("#m-music");
  b.textContent = musicOn ? "Music Off" : "Music On";   /* the button names what choosing it will do */
  b.setAttribute("aria-pressed", String(musicOn));
  if (!ac) return;   /* sound is not unlocked yet; unlockAudio() calls back here */
  const now = ac.currentTime;
  bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now); bus.gain.setTargetAtTime(musicOn ? 0.6 : 0, now, musicOn ? 0.4 : 0.12);
  clearInterval(musicTimer); musicTimer = null;
  if (musicOn) { stepNo = 0; nextNote = 0; musicTimer = setInterval(schedule, 100); schedule(); }
}
function unlockAudio(e) {   /* must run inside a tap, click or key press */
  if (!AudioEngine || (!ac && !musicOn)) return;
  try {
    if (!ac) {
      /* "ambient" tells phones this is background sound: it plays alongside a visitor's own music
         instead of stopping it, and stays quiet when the phone's ring switch is on silent */
      if (navigator.audioSession) { try { navigator.audioSession.type = "ambient"; } catch (err) {} }
      ac = new AudioEngine(); unlockedBy = (e && e.type) || "button";
      const soften = ac.createBiquadFilter(); soften.type = "lowpass"; soften.frequency.value = 2400;
      bus = ac.createGain(); bus.gain.value = 0; bus.connect(soften); soften.connect(ac.destination);
      const wake = ac.createBufferSource(); wake.buffer = ac.createBuffer(1, 1, 22050); wake.connect(ac.destination); wake.start(0);   /* a silent sample: wakes audio on iPhones */
      syncMusic();
    }
    if (ac.state !== "running") { const r = ac.resume(); if (r && r.then) r.then(schedule, (err) => { audioError = "resume: " + err; }); }
  } catch (err) { audioError = String(err); }
}
["click", "touchend", "pointerup", "mousedown", "keydown"].forEach((type) => document.addEventListener(type, unlockAudio, { capture: true, passive: true }));
document.addEventListener("visibilitychange", schedule);
$("#m-music").addEventListener("click", () => {
  musicOn = !musicOn; store.set("music3", musicOn ? "1" : "0");
  syncMusic(); unlockAudio();
});

/* Add ?debug to the address (halflife.studio/?debug) to show a live readout of the sound system. */
if (/[?&]debug\b/.test(location.search)) {
  const box = el("pre"); box.style.cssText = "position:fixed;left:8px;top:8px;z-index:9;margin:0;padding:8px 10px;background:#000;color:#fff;border:2px solid #fff;font:12px/1.5 monospace;white-space:pre-wrap;max-width:calc(100vw - 16px);text-shadow:none;pointer-events:none";
  document.body.append(box);
  setInterval(() => {
    box.textContent = [
      "SOUND DEBUG",
      "saved choice: " + store.get("music3"),
      "music wanted: " + musicOn,
      "engine: " + (ac ? ac.state : "not created") + (unlockedBy ? " (created on " + unlockedBy + ")" : ""),
      "engine clock: " + (ac ? ac.currentTime.toFixed(2) : "-"),
      "steps played: " + stepNo,
      "volume: " + (bus ? bus.gain.value.toFixed(2) : "-"),
      "audio session: " + (navigator.audioSession ? navigator.audioSession.type : "n/a"),
      "error: " + (audioError || "none"),
      navigator.userAgent.replace(/^Mozilla\/5\.0 /, "")
    ].join("\n");
  }, 300);
}
