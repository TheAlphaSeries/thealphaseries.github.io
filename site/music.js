/* HALF LIFE: the music. An original piece, composed for the site and played live in the browser, never a recording:
   a slow hymn in D minor for a choir of synthetic voices, a low bass, and a bell doubled by a wordless voice, all
   laid into a long cathedral reverb. Eight bars, round and round; every other time through the melody rests and the
   choir sings alone. It never plays until the visitor turns it on with the Music button (remembered for next time,
   when it begins at their first touch of the page), and it falls silent while the page is hidden. */
(() => {
  "use strict";
  const btn = document.getElementById("music"); if (!btn) return;
  const BEAT = 60 / 66, BAR = BEAT * 4;
  const N = (name) => { const m = /^([A-G])(#|b)?(\d)$/.exec(name), base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    return 440 * Math.pow(2, (base + (+m[3] + 1) * 12 - 69) / 12); };
  // the chords, one to a bar, and the bass beneath them
  const CHORDS = [["D3", "F3", "A3", "D4"], ["Bb2", "D3", "F3", "Bb3"], ["G2", "D3", "G3", "Bb3"], ["A2", "E3", "A3", "C#4"],
                  ["D3", "F3", "A3", "D4"], ["F2", "C3", "F3", "A3"], ["C3", "E3", "G3", "C4"], ["A2", "E3", "A3", "C#4"]];
  const BASS = ["D2", "Bb1", "G1", "A1", "D2", "F1", "C2", "A1"];
  // the melody: [note, beats], bar by bar
  const TUNE = [[["A4", 2], ["F4", 1], ["E4", 1]], [["D4", 3], ["F4", 1]], [["G4", 2], ["A4", 1], ["Bb4", 1]], [["A4", 3], ["C#5", 1]],
                [["D5", 2], ["C5", 1], ["A4", 1]], [["C5", 2], ["A4", 1], ["F4", 1]], [["G4", 1], ["E4", 1], ["G4", 1], ["C5", 1]], [["A4", 4]]];

  let ctx = null, master = null, wet = null, dry = null, playing = false, timer = 0, nextBar = 0, barNo = 0;
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(master);
    dry = ctx.createGain(); dry.gain.value = .55; dry.connect(comp);
    // the cathedral: five seconds of noise dying away, used as the room's echo
    const len = ctx.sampleRate * 5.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = .75; verb.connect(wet); wet.connect(comp);
    dry.verb = verb;
  }
  const out = (node, reverbShare) => { node.connect(dry); const s = ctx.createGain(); s.gain.value = reverbShare; node.connect(s); s.connect(dry.verb); };

  // a voice of the choir: two detuned saws, softened, then shaped into an "ah" by two vowel bands
  function choir(freq, t, dur, vol) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = "bandpass";
    f1.frequency.value = 730; f1.Q.value = 6; f2.frequency.value = 1090; f2.Q.value = 7;
    const mix = ctx.createGain(); mix.gain.value = 1;
    [-7, 6].forEach((cents) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = cents;
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 4.6 + Math.random() * .8; vg.gain.value = 5; vib.connect(vg); vg.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + dur + 3); vib.start(t); vib.stop(t + dur + 3);
    });
    lp.connect(f1); lp.connect(f2); f1.connect(mix); f2.connect(mix);
    const body = ctx.createGain(); body.gain.value = .12; lp.connect(body); body.connect(mix);   /* a little of the plain tone, for warmth */
    mix.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.6); g.gain.setValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 2.6);
    out(g, .9);
  }
  function bass(freq, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .8); g.gain.setValueAtTime(.22, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur + 1.2);
    o.connect(g); o.start(t); o.stop(t + dur + 1.5); out(g, .35);
  }
  // the bell: a struck tone with its overtones, ringing away; and the wordless voice that sings the same note
  function bell(freq, t) {
    [[1, .16, 3.2], [2.0, .06, 1.6], [3.01, .035, .9], [4.2, .02, .5]].forEach(([k, v, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = freq * k;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); o.start(t); o.stop(t + d + .1); out(g, .8);
    });
  }
  function voice(freq, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = "triangle"; o.frequency.value = freq;
    lp.type = "lowpass"; lp.frequency.value = 2400;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = 0; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(9, t + dur * .6);
    vib.connect(vg); vg.connect(o.detune);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .35); g.gain.setValueAtTime(.07, t + dur * .85); g.gain.linearRampToValueAtTime(0, t + dur + .8);
    o.connect(lp); lp.connect(g); o.start(t); o.stop(t + dur + 1); vib.start(t); vib.stop(t + dur + 1); out(g, 1);
  }

  function scheduleBar(t, n) {
    const i = n % 8, pass = Math.floor(n / 8);
    CHORDS[i].forEach((note, k) => choir(N(note), t + k * .04, BAR - .2, k === 3 ? .045 : .06));
    bass(N(BASS[i]), t, BAR);
    if (pass % 2 === 0 || i >= 4) {                       // every other pass, the melody rests for the first half
      let at = t;
      TUNE[i].forEach(([note, beats]) => { const f = N(note) * (pass % 4 === 2 ? 2 : 1); bell(f, at); voice(f, at, beats * BEAT); at += beats * BEAT; });
    }
  }
  function tick() {
    while (nextBar < ctx.currentTime + 1.2) { scheduleBar(nextBar, barNo++); nextBar += BAR; }
    timer = setTimeout(tick, 250);
  }

  function start() {
    if (playing) return;
    try { if (!ctx) build(); } catch (e) { return; }
    ctx.resume(); playing = true;
    nextBar = ctx.currentTime + .1; barNo = 0;
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(.85, ctx.currentTime + 4);
    tick();
  }
  function stop() {
    if (!playing) return; playing = false; clearTimeout(timer);
    const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => { if (!playing) ctx.suspend(); }, 3200);
  }

  let want = false; try { want = localStorage.getItem("hl-music") === "on"; } catch (e) {}
  const show = () => { btn.setAttribute("aria-pressed", String(want)); btn.querySelector("span").textContent = want ? "on" : "off"; };
  show();
  btn.addEventListener("click", () => { want = !want; try { localStorage.setItem("hl-music", want ? "on" : "off"); } catch (e) {} show(); want ? start() : stop(); });
  // turned on last time: begin at the first touch of the page (browsers forbid sound before one)
  if (want) { const go = (e) => { if (e.target.closest && e.target.closest("#music")) return; removeEventListener("pointerdown", go, true); removeEventListener("keydown", go, true); if (want) start(); };
    addEventListener("pointerdown", go, true); addEventListener("keydown", go, true); }
  document.addEventListener("visibilitychange", () => { if (!ctx || !want) return; if (document.hidden) { clearTimeout(timer); ctx.suspend(); } else if (playing) { ctx.resume(); nextBar = Math.max(nextBar, ctx.currentTime + .1); clearTimeout(timer); tick(); } });
})();
