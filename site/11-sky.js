/* ==========================================================================
   13. DRIFTING SPARKLES (background)
   ========================================================================== */
const sky = $("#sky"), sx = sky.getContext("2d");
let motes = [], skyBeat = 0, gutter = 0, nextGutter = 600 + Math.random() * 1500;
/* The sky is the keeper's: it follows the hour and the season in San Francisco, as they would look under a sun near
   its end. By day a great dim red sun, pocked with dark, crosses the sky, and now and then gutters like a lamp short
   of oil; the stars never quite go out. At dawn and dusk the horizon rusts. There is no moon; it left some while ago.
   Each season has its own drift: ash in winter, spores rising in spring, slow fireflies in summer, embers in
   autumn. Summer mornings bring the fog. */
const DRIFT = { winter: ["#cfd4e6", .5, 1], spring: ["#b8e08a", .45, -1], summer: ["#ffd98a", .3, -1], autumn: ["#f08a3c", .55, 1] };   /* colour, how many of the specks, falling (1) or rising (-1) */
function sunNow() {   /* where the sun is: 0 at rising, 1 at setting, or nothing at night. Days are longer in summer. */
  const { h, month, season } = keeperTime(), long = Math.cos((month - 6.5) / 12 * 2 * Math.PI), rise = 6.6 - long * .85, set = 18.4 + long * 1.9;
  return { t: h >= rise && h <= set ? (h - rise) / (set - rise) : null, h, month, season, dusk: Math.max(0, 1 - Math.abs(h - set) / 1.3), dawn: Math.max(0, 1 - Math.abs(h - rise) / 1.3) };
}
function sizeSky() {
  const sameWidth = sky.width === window.innerWidth && motes.length;
  sky.width = window.innerWidth; sky.height = window.innerHeight;
  if (sameWidth) { drawSky(0); return; }
  const n = Math.round(Math.min(90, sky.width * sky.height / 14000)), share = DRIFT[keeperTime().season][1];
  motes = Array.from({ length: n }, (_, i) => ({ x: Math.random() * sky.width, y: Math.random() * sky.height,
    s: Math.random() < .25 ? 3 : 2, v: .12 + Math.random() * .35, p: Math.random() * 6.28, drift: i / n < share }));   /* some are stars, some the season's drift */
  drawSky(0);
}
function drawSky(step) {
  const W = sky.width, H = sky.height, sun = sunNow(), [driftCol, , fall] = DRIFT[sun.season]; skyBeat += step;
  sx.clearRect(0, 0, W, H);
  if (step && skyBeat > nextGutter) { gutter = 70; nextGutter = skyBeat + 1500 + Math.random() * 3600; }   /* the sun gutters every half minute to a minute and a half */
  const dim = gutter > 0 ? .45 + .55 * Math.abs(Math.cos(gutter-- / 70 * Math.PI * 2.5)) : 1, glowOf = Math.max(sun.dawn, sun.dusk);
  if (sun.t != null) {   /* the wash of day: a faint maroon from above */
    const g = sx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(96,22,28," + .2 * dim * Math.sin(Math.PI * sun.t) + ")"); g.addColorStop(1, "rgba(96,22,28,0)"); sx.fillStyle = g; sx.fillRect(0, 0, W, H);
  }
  if (glowOf > 0) { const g = sx.createLinearGradient(0, H * .35, 0, H); g.addColorStop(0, "rgba(150,52,20,0)"); g.addColorStop(1, "rgba(150,52,20," + .34 * glowOf + ")"); sx.fillStyle = g; sx.fillRect(0, 0, W, H); }   /* rust along the horizon at dawn and dusk */
  if (sun.t != null) {
    const r = Math.max(46, Math.min(W, H) * .11), x = W * (.06 + .88 * sun.t), y = H * (.86 - .62 * Math.sin(Math.PI * sun.t));
    let g = sx.createRadialGradient(x, y, r * .6, x, y, r * 3.2); g.addColorStop(0, "rgba(190,50,30," + .3 * dim + ")"); g.addColorStop(1, "rgba(190,50,30,0)"); sx.fillStyle = g; sx.beginPath(); sx.arc(x, y, r * 3.2, 0, 7); sx.fill();
    g = sx.createRadialGradient(x - r * .25, y - r * .25, r * .1, x, y, r); g.addColorStop(0, "rgba(232,104,58," + .9 * dim + ")"); g.addColorStop(.7, "rgba(176,46,32," + .88 * dim + ")"); g.addColorStop(1, "rgba(112,22,24," + .8 * dim + ")");
    sx.fillStyle = g; sx.beginPath(); sx.arc(x, y, r, 0, 7); sx.fill();
    sx.fillStyle = "rgba(60,10,14," + .5 * dim + ")"; for (const [a, b, s] of [[-.35, -.1, .16], [.25, .3, .11], [.1, -.45, .08], [-.15, .5, .07], [.5, -.15, .06]]) { sx.beginPath(); sx.ellipse(x + a * r, y + b * r, s * r * 1.3, s * r, .4, 0, 7); sx.fill(); }   /* the dark places on its face */
  }
  const night = sun.t == null ? 1 : .45 + .3 * glowOf;   /* the stars are faint by day, but under this sun they do not go out */
  for (const m of motes) {
    const dir = m.drift ? fall : -1;
    m.y += dir * m.v * (m.drift ? 1.5 : 1) * step; m.p += .02 * step; m.x += Math.sin(m.p) * (m.drift ? .6 : .25) * step + (m.drift && fall > 0 ? .15 * step : 0);
    if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; } if (m.y > H + 4) { m.y = -4; m.x = Math.random() * W; } if (m.x > W + 4) m.x = -4;
    sx.fillStyle = m.drift ? driftCol : "#ffffff"; sx.globalAlpha = (m.drift ? .75 : night) * (.25 + .55 * (.5 + .5 * Math.sin(m.p * (m.drift && sun.season === "summer" ? 4 : 2))));
    sx.fillRect(Math.round(m.x), Math.round(m.y), m.s, m.s);
  }
  sx.globalAlpha = 1;
  const fog = (sun.season === "summer" ? 1 : .45) * Math.max(0, 1 - Math.abs(sun.h - 7.5) / 3.2);   /* fog in the morning, thickest in summer */
  if (fog > 0) for (let i = 0; i < 4; i++) { const y = H * (.3 + i * .17), drift = ((skyBeat * (.15 + i * .05) + i * 400) % (W * 2)) - W * .5, g = sx.createLinearGradient(0, y - 70, 0, y + 70);
    g.addColorStop(0, "rgba(200,204,220,0)"); g.addColorStop(.5, "rgba(200,204,220," + .1 * fog + ")"); g.addColorStop(1, "rgba(200,204,220,0)"); sx.fillStyle = g; sx.fillRect(drift - W * .6, y - 70, W * 1.2, 140); }
  /* the title screen has its own solid backing, so the sun is painted onto that as well */
}
window.addEventListener("resize", sizeSky);
