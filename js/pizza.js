/* Procedural pizza renderer: the original code-drawn build scene, used until real video frames are added. */
window.ProceduralPizza = function (cv, reduce) {
"use strict";
/* ================= math helpers ================= */
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eOutCubic = t => 1 - Math.pow(1 - t, 3);
const eInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const eOutBack = (t, s = 1.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* value noise + fbm */
const N = (() => {
  const r = rng(1989), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const P = new Uint16Array(512); for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const V = new Float32Array(256); for (let i = 0; i < 256; i++) V[i] = r();
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const X = xi & 255, Y = yi & 255;
    const a = V[P[P[X] + Y]], b = V[P[P[X + 1] + Y]], c = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * n2(x * f, y * f); n += a; a *= .5; f *= 2; } return s / n; };
  return { n2, fbm };
})();

/* ================= sprite factory ================= */
function mk(size) { const c = document.createElement("canvas"); c.width = c.height = size; return c; }
function pixelSprite(size, fn) {
  const c = mk(size), g = c.getContext("2d"), img = g.createImageData(size, size), d = img.data, h = size / 2, o = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!fn((x + .5 - h) / h, (y + .5 - h) / h, o)) continue;
    const i = (y * size + x) * 4; d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = o[3];
  }
  g.putImageData(img, 0, 0); return c;
}
const LX = -0.55, LY = -0.83; // light from top-left

function doughPx(baked) {
  return (x, y, o) => {
    const r = Math.hypot(x, y); if (r > 1) return false;
    const a = Math.atan2(y, x), ca = Math.cos(a), sa = Math.sin(a);
    const edge = 0.955 + 0.034 * (N.n2(ca * 1.8 + 4.3, sa * 1.8 + 2.1) - .5) + 0.014 * (N.n2(ca * 6 + 9, sa * 6 + 1) - .5);
    if (r > edge + 0.006) return false;
    const aa = clamp((edge + 0.006 - r) / 0.012);
    const rimW = 0.16, t = clamp((r - (edge - rimW)) / rimW);
    const bump = t > 0 ? Math.pow(Math.sin(t * Math.PI * .94 + .03), .75) : 0;
    const slope = t > 0 ? Math.cos(t * Math.PI) : 0;
    const rl = (x * LX + y * LY) / (r || 1);
    const shade = -slope * rl * Math.min(1, bump * 1.6);
    const n = N.fbm(x * 5 + 1.7, y * 5 + 3.1, 4) - .5, fine = N.n2(x * 55 + 7, y * 55 + 5);
    let cr, cg, cb;
    if (!baked) {
      cr = lerp(231, 246, bump); cg = lerp(205, 228, bump); cb = lerp(156, 190, bump);
      cr += n * 20; cg += n * 18; cb += n * 16;
      const s = 1 + shade * .17; cr *= s; cg *= s; cb *= s;
      if (fine > .8) { const k = (fine - .8) * 3.5; cr = lerp(cr, 253, k); cg = lerp(cg, 249, k); cb = lerp(cb, 240, k); }
    } else {
      cr = lerp(214, 186, bump); cg = lerp(163, 108, bump); cb = lerp(98, 44, bump);
      if (t > .82) { const k = (t - .82) / .18; cr = lerp(cr, 160, k * .5); cg = lerp(cg, 92, k * .5); cb = lerp(cb, 40, k * .5); }
      cr += n * 30; cg += n * 22; cb += n * 12;
      const s = 1 + shade * .24; cr *= s; cg *= s; cb *= s;
      const lp = N.n2(x * 22 + 13, y * 22 + 17), lp2 = N.n2(x * 64 + 3, y * 64 + 9);
      const zone = t > .12 ? 1 : .22;
      const c = Math.min(1, clamp((lp - .74) / .1) * zone + clamp((lp2 - .87) / .07) * .65 * zone);
      if (c > 0) { cr = lerp(cr, 56, c); cg = lerp(cg, 30, c); cb = lerp(cb, 16, c); }
    }
    o[0] = clamp(cr, 0, 255); o[1] = clamp(cg, 0, 255); o[2] = clamp(cb, 0, 255); o[3] = aa * 255; return true;
  };
}
function saucePx(x, y, o) {
  const r = Math.hypot(x, y); if (r > 1) return false;
  const a = Math.atan2(y, x), ca = Math.cos(a), sa = Math.sin(a);
  const edge = 0.92 + 0.11 * (N.n2(ca * 2.4 + 21, sa * 2.4 + 8) - .5) + 0.035 * (N.n2(ca * 8 + 2, sa * 8 + 30) - .5);
  if (r > edge) return false;
  const aa = clamp((edge - r) / .045);
  const n = N.fbm(x * 4 + 40, y * 4 + 12, 4);
  let cr = lerp(112, 214, n), cg = lerp(18, 64, n), cb = lerp(10, 38, n);
  const chunk = N.n2(x * 16 + 5, y * 16 + 50);
  if (chunk > .73) { const k = clamp((chunk - .73) / .1) * .75; cr = lerp(cr, 218, k); cg = lerp(cg, 82, k); cb = lerp(cb, 50, k); }
  const herb = N.n2(x * 72 + 11, y * 72 + 90);
  if (herb > .9) { const k = clamp((herb - .9) / .05); cr = lerp(cr, 60, k); cg = lerp(cg, 56, k); cb = lerp(cb, 26, k); }
  const gl = N.fbm(x * 3 + 70, y * 3 + 3, 3), g2 = clamp((gl - .6) / .1) * .3;
  cr = lerp(cr, 255, g2 * .5); cg = lerp(cg, 196, g2 * .45); cb = lerp(cb, 176, g2 * .45);
  const e = 1 - aa; cr = lerp(cr, 196, e * .5); cg = lerp(cg, 64, e * .3);
  o[0] = clamp(cr, 0, 255); o[1] = clamp(cg, 0, 255); o[2] = clamp(cb, 0, 255); o[3] = Math.pow(aa, .8) * 250; return true;
}
function blobPx(v, baked) {
  return (x, y, o) => {
    const r = Math.hypot(x, y); if (r > 1) return false;
    const a = Math.atan2(y, x), ca = Math.cos(a), sa = Math.sin(a);
    const edge = 0.7 + 0.15 * (N.n2(ca * 1.4 + v * 7, sa * 1.4 + v * 3) - .5) * 2 + 0.05 * (N.n2(ca * 4 + v, sa * 4 + v * 2) - .5) * 2;
    if (r > edge) return false;
    const aa = clamp((edge - r) / (baked ? .12 : .07)), d = r / edge, n = N.fbm(x * 3 + v * 5, y * 3 + v, 3) - .5;
    let cr, cg, cb;
    if (!baked) {
      cr = lerp(253, 232, d * d); cg = lerp(251, 223, d * d); cb = lerp(243, 202, d * d);
      cr += n * 8; cg += n * 8; cb += n * 12;
      const hl = clamp(1 - Math.hypot(x + .2, y + .24) / .36) * .55;
      cr = lerp(cr, 255, hl); cg = lerp(cg, 255, hl); cb = lerp(cb, 253, hl);
    } else {
      cr = lerp(253, 243, d); cg = lerp(240, 212, d); cb = lerp(204, 146, d);
      const sp = N.fbm(x * 5 + v * 9, y * 5 + v * 4, 3);
      const k = clamp((sp - .55) / .12); cr = lerp(cr, 200, k); cg = lerp(cg, 130, k); cb = lerp(cb, 54, k);
      const k2 = clamp((sp - .66) / .08) * .8; cr = lerp(cr, 150, k2); cg = lerp(cg, 84, k2); cb = lerp(cb, 34, k2);
      const bub = N.n2(x * 15 + v, y * 15 + 3); if (bub > .82) { const k3 = (bub - .82) * 3; cr = lerp(cr, 255, k3); cg = lerp(cg, 248, k3); cb = lerp(cb, 225, k3); }
    }
    o[0] = clamp(cr, 0, 255); o[1] = clamp(cg, 0, 255); o[2] = clamp(cb, 0, 255); o[3] = aa * 255; return true;
  };
}
function pepPx(baked) {
  return (x, y, o) => {
    const r = Math.hypot(x, y); if (r > 1) return false;
    const a = Math.atan2(y, x), ca = Math.cos(a), sa = Math.sin(a);
    const edge = 0.93 + 0.035 * (N.n2(ca * 3 + 1, sa * 3 + 5) - .5);
    if (r > edge) return false;
    const aa = clamp((edge - r) / .05), n = N.fbm(x * 4 + 2, y * 4 + 9, 3) - .5, fat = N.n2(x * 13 + 4, y * 13 + 1);
    let cr, cg, cb;
    if (!baked) {
      cr = 170 + n * 34; cg = 42 + n * 14; cb = 32 + n * 10;
      if (fat > .66) { const k = clamp((fat - .66) / .08); cr = lerp(cr, 228, k); cg = lerp(cg, 150, k); cb = lerp(cb, 132, k); }
      const rim = clamp((r - .78) / .15) * .7; cr = lerp(cr, 116, rim); cg = lerp(cg, 26, rim); cb = lerp(cb, 20, rim);
    } else {
      cr = 146 + n * 30; cg = 34 + n * 10; cb = 22 + n * 8;
      if (fat > .68) { const k = clamp((fat - .68) / .08); cr = lerp(cr, 200, k); cg = lerp(cg, 98, k); cb = lerp(cb, 60, k); }
      const rim = clamp((r - .64) / .28); cr = lerp(cr, 78, rim); cg = lerp(cg, 20, rim); cb = lerp(cb, 12, rim);
      const rl = (x * LX + y * LY) / (r || 1), lip = Math.exp(-Math.pow((r - .76) / .08, 2)), sh = lip * -rl * .55;
      cr *= 1 + sh; cg *= 1 + sh; cb *= 1 + sh;
      const pool = clamp(1 - r / .5); cr = lerp(cr, 118, pool * .35);
      const gl = Math.exp(-(((x + .2) ** 2 + (y + .24) ** 2) / .01)) * .6;
      cr = lerp(cr, 255, gl); cg = lerp(cg, 214, gl); cb = lerp(cb, 176, gl);
    }
    o[0] = clamp(cr, 0, 255); o[1] = clamp(cg, 0, 255); o[2] = clamp(cb, 0, 255); o[3] = aa * 255; return true;
  };
}
function basilSprite(baked) {
  const s = 200, c = mk(s), g = c.getContext("2d");
  g.translate(s / 2, s / 2);
  const leaf = () => { g.beginPath(); g.moveTo(0, -86); g.bezierCurveTo(52, -56, 50, 34, 0, 84); g.bezierCurveTo(-50, 34, -52, -56, 0, -86); g.closePath(); };
  leaf();
  const lg = g.createLinearGradient(-50, -60, 50, 60);
  if (!baked) { lg.addColorStop(0, "#5E9B4E"); lg.addColorStop(.55, "#3F7A39"); lg.addColorStop(1, "#2B5A29"); }
  else { lg.addColorStop(0, "#3B6A31"); lg.addColorStop(.6, "#2A4F24"); lg.addColorStop(1, "#1D3A19"); }
  g.fillStyle = lg; g.fill();
  g.save(); leaf(); g.clip();
  const hl = g.createRadialGradient(-16, -24, 2, -16, -24, 70);
  hl.addColorStop(0, baked ? "rgba(255,255,220,.10)" : "rgba(255,255,230,.26)"); hl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hl; g.fillRect(-100, -100, 200, 200);
  g.strokeStyle = baked ? "rgba(150,180,110,.28)" : "rgba(190,230,160,.5)"; g.lineWidth = 2.6; g.lineCap = "round";
  g.beginPath(); g.moveTo(0, -80); g.quadraticCurveTo(4, 0, 0, 80); g.stroke();
  g.lineWidth = 1.4; g.strokeStyle = baked ? "rgba(150,180,110,.18)" : "rgba(190,230,160,.32)";
  for (let i = 0; i < 6; i++) { const y0 = -56 + i * 22; g.beginPath(); g.moveTo(2, y0); g.quadraticCurveTo(20, y0 + 6, 34, y0 + 20); g.moveTo(1, y0); g.quadraticCurveTo(-18, y0 + 6, -32, y0 + 20); g.stroke(); }
  g.restore();
  g.strokeStyle = baked ? "#1E3A1A" : "#2E5A2A"; g.lineWidth = 3.4; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 82); g.lineTo(-2, 96); g.stroke();
  return c;
}
function dustPx(x, y, o) {
  const r = Math.hypot(x, y); if (r > 1) return false;
  const fall = Math.pow(clamp(1 - r), 1.3), dust = N.fbm(x * 3 + 5, y * 3 + 5, 3), spk = N.n2(x * 95 + 1, y * 95 + 2);
  const a = (clamp((dust - .42) * 1.6) * .22 + (spk > .83 ? (spk - .83) * 4 : 0) * .55) * fall;
  if (a <= 0) return false;
  o[0] = 246; o[1] = 238; o[2] = 222; o[3] = clamp(a) * 255; return true;
}

const SP = {};
async function buildSprites() {
  const tick = () => new Promise(r => setTimeout(r, 0));
  const hi = Math.min(1024, Math.max(640, Math.round(R * 2.1)));
  SP.dust = pixelSprite(384, dustPx); await tick();
  SP.doughRaw = pixelSprite(hi, doughPx(false)); dirty = true; await tick();
  SP.sauce = pixelSprite(Math.round(hi * .88), saucePx); await tick();
  SP.blobs = []; for (let v = 0; v < 4; v++) SP.blobs.push({ raw: pixelSprite(160, blobPx(v + 1, false)), baked: pixelSprite(200, blobPx(v + 1, true)) });
  await tick();
  SP.pep = { raw: pixelSprite(150, pepPx(false)), baked: pixelSprite(150, pepPx(true)) };
  SP.basil = { raw: basilSprite(false), baked: basilSprite(true) };
  await tick();
  SP.doughBaked = pixelSprite(hi, doughPx(true));
  dirty = true;
}

/* ================= scene items (in pizza-radius units) ================= */
const rand = rng(46);
function scatter(n, maxR, minD) {
  const pts = []; let tries = 0;
  while (pts.length < n && tries < 8000) {
    tries++; const a = rand() * TAU, r = Math.sqrt(rand()) * maxR, x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (pts.every(p => Math.hypot(p.x - x, p.y - y) > minD)) pts.push({ x, y });
  }
  return pts;
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const blobs = shuffle(scatter(15, .66, .27)).map((p, i) => ({ ...p, size: .3 + rand() * .1, rot: rand() * TAU, v: i % 4, a: .29 + i * .0085, d: .055, sx: (rand() - .5) * .5, sy: -(.7 + rand() * .35), spin: (rand() - .5) * 3 }));
const shreds = scatter(46, .75, .06).map(p => ({ ...p, len: .06 + rand() * .05, rot: rand() * TAU, a: .3 + rand() * .11, d: .03, sx: (rand() - .5) * .3, sy: -(.6 + rand() * .3) }));
const peps = shuffle(scatter(13, .64, .28)).map((p, i) => { const side = p.x < 0 ? -1 : 1; return { ...p, size: .25, rot: rand() * TAU, a: .43 + i * .0085, d: .05, side, sy: -(.18 + rand() * .2), spin: side * (4 + rand() * 3) }; });
const basils = shuffle(scatter(7, .6, .32)).map((p, i) => ({ ...p, size: .3, rot: rand() * TAU, a: .55 + i * .011, d: .06, ph: rand() * TAU, sx: (rand() - .5) * .25 }));
const flour = Array.from({ length: 70 }, (_, i) => ({ a: rand() * TAU, s: rand(), d: (i % 12) * .0012 }));
const embers = Array.from({ length: 34 }, () => ({ x: rand(), ph: rand(), s: rand() }));

const A_FINAL = 3.0;
const MID = Math.PI / 2 - A_FINAL;               // the pulled slice points straight down at the end
const CUTS = [0, 1, 2].map(j => MID - Math.PI / 6 + j * Math.PI / 3);
const CUT_T = [0, 1, 2].map(j => [.876 + j * .024, .876 + j * .024 + .019]);

/* honey drizzle path */
const honey = []; {
  const rot = -.55, c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= 900; i++) {
    const u = i / 900, yy = lerp(-.6, .58, u) + .035 * Math.sin(u * 17 + 1);
    const span = Math.sqrt(Math.max(0, .7 * .7 - yy * yy));
    const w = Math.sin(u * Math.PI * 6.5), sweep = Math.sign(w) * Math.pow(Math.abs(w), .55);
    const amp = .78 + .2 * Math.sin(u * 9.3 + 2) + .06 * Math.sin(u * 31);
    const xx = sweep * span * amp + .018 * Math.sin(u * 53);
    honey.push([xx * c - yy * s, xx * s + yy * c]);
  }
}
const honeyLen = [0]; for (let i = 1; i < honey.length; i++) honeyLen.push(honeyLen[i - 1] + Math.hypot(honey[i][0] - honey[i - 1][0], honey[i][1] - honey[i - 1][1]));

/* ================= canvas setup ================= */
const ctx = cv.getContext("2d");
const pz = mk(4), pzc = pz.getContext("2d");
const mask = mk(4), mkc = mask.getContext("2d");
let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 100, S = 4, mobile = false, dirty = true;

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = Math.max(1, Math.round(r.width * DPR)); H = Math.max(1, Math.round(r.height * DPR));
  cv.width = W; cv.height = H;
  mobile = r.width < 820;
  if (mobile) { cx = W * .5; cy = H * (r.height < 700 ? .31 : .37); R = Math.min(W * .42, H * (r.height < 700 ? .21 : .245)); }
  else { cx = W * .67; cy = H * .52; R = Math.min(H * .35, W * .26); }
  S = Math.ceil(R * 2.3); pz.width = pz.height = S; mask.width = mask.height = S;
  dirty = true;
}
const toW = (lx, ly, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return [cx + (lx * c - ly * s) * R, cy + (lx * s + ly * c) * R]; };
function spr(g, img, x, y, size, rot, alpha = 1, sc = 1) {
  if (!img || alpha <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha = alpha;
  g.drawImage(img, -size / 2, -size / 2, size, size); g.restore();
}

/* ================= pizza layer (local coordinates) ================= */
function drawBall(g, rd, f, t, alpha) {
  g.save(); g.globalAlpha = alpha;
  const wob = (1 - f) * .07;
  g.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = i / 72 * TAU, n = N.n2(Math.cos(a) * 1.4 + t * .35 + 3, Math.sin(a) * 1.4 + 7) - .5;
    const r = rd * (1 + wob * n * 2);
    i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  const gr = g.createRadialGradient(-rd * .32, -rd * .38, rd * .05, 0, 0, rd * 1.05);
  gr.addColorStop(0, "#FCF2DC"); gr.addColorStop(.45, "#EED9AF"); gr.addColorStop(.85, "#D6B783"); gr.addColorStop(1, "#C7A56F");
  g.fillStyle = gr; g.fill();
  const hl = g.createRadialGradient(-rd * .35, -rd * .42, 0, -rd * .35, -rd * .42, rd * .45);
  hl.addColorStop(0, "rgba(255,255,255,.55)"); hl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hl; g.fill();
  g.restore();
}

function renderPz(p, t, st) {
  const g = pzc;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
  g.setTransform(1, 0, 0, 1, S / 2, S / 2);
  const { f, rd, sauceS, b, drz, cuts } = st;

  // dough
  const da = SP.doughRaw ? smooth(.05, .45, f) : 0;
  if (da < 1) drawBall(g, rd, f, t, 1 - da);
  if (da > 0) {
    g.globalAlpha = da; g.drawImage(SP.doughRaw, -rd, -rd, rd * 2, rd * 2);
    if (b > 0 && SP.doughBaked) { g.globalAlpha = da * b; g.drawImage(SP.doughBaked, -rd, -rd, rd * 2, rd * 2); }
    g.globalAlpha = 1;
  }

  // sauce, spread in a spiral
  const sr = R * .88;
  if (sauceS > 0 && SP.sauce) {
    if (sauceS < 1) {
      const m = mkc;
      m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, S, S); m.setTransform(1, 0, 0, 1, S / 2, S / 2);
      m.globalCompositeOperation = "source-over"; m.lineCap = m.lineJoin = "round"; m.lineWidth = R * .26; m.strokeStyle = "#000";
      m.beginPath();
      const steps = Math.max(2, Math.ceil(sauceS * 520));
      for (let i = 0; i <= steps; i++) {
        const u = Math.sqrt(i / steps * sauceS), th = u * 4 * TAU, rr = u * .84 * R;
        i ? m.lineTo(Math.cos(th) * rr, Math.sin(th) * rr) : m.moveTo(Math.cos(th) * rr, Math.sin(th) * rr);
      }
      m.stroke();
      m.globalCompositeOperation = "source-in"; m.drawImage(SP.sauce, -sr, -sr, sr * 2, sr * 2);
      m.globalCompositeOperation = "source-over";
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(mask, 0, 0); g.setTransform(1, 0, 0, 1, S / 2, S / 2);
    } else g.drawImage(SP.sauce, -sr, -sr, sr * 2, sr * 2);
    const ga = .6 * (1 - smooth(.3, .5, p));
    if (ga > 0) {
      const steps = Math.max(2, Math.ceil(sauceS * 520));
      const track = (col, w, o) => {
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = "round"; g.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = Math.sqrt(i / steps * sauceS), th = u * 4 * TAU, rr = u * .84 * R;
          i ? g.lineTo(Math.cos(th) * rr + o, Math.sin(th) * rr + o) : g.moveTo(Math.cos(th) * rr + o, Math.sin(th) * rr + o);
        }
        g.stroke();
      };
      track(`rgba(90,10,5,${ga * .45})`, R * .016, R * .004);
      track(`rgba(255,170,140,${ga * .28})`, R * .007, -R * .004);
    }
    if (b > 0) { g.globalCompositeOperation = "multiply"; g.globalAlpha = b * .38; g.drawImage(SP.sauce, -sr, -sr, sr * 2, sr * 2); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }
  }

  // shredded mozzarella (melts away as it bakes)
  const shA = 1 - smooth(0, .55, b);
  if (shA > 0) {
    g.lineCap = "round";
    for (const s of shreds) {
      if (seg(p, s.a, s.a + s.d) < 1) continue;
      g.save(); g.translate(s.x * R, s.y * R); g.rotate(s.rot); g.globalAlpha = shA;
      const l = s.len * R / 2;
      g.strokeStyle = "rgba(60,20,10,.22)"; g.lineWidth = R * .026; g.beginPath(); g.moveTo(-l + 1.5, 2); g.lineTo(l + 1.5, 2); g.stroke();
      g.strokeStyle = "#F7F0DF"; g.lineWidth = R * .022; g.beginPath(); g.moveTo(-l, 0); g.lineTo(l, 0); g.stroke();
      g.restore();
    }
  }

  // fresh mozzarella blobs
  if (SP.blobs) for (const it of blobs) {
    const t1 = seg(p, it.a, it.a + it.d * .8); if (t1 < 1) continue;
    const k = seg(p, it.a + it.d * .8, it.a + it.d), sq = 1 + .14 * Math.sin(k * Math.PI);
    const size = it.size * R * (1 + .6 * b) * sq, s2 = SP.blobs[it.v];
    spr(g, s2.raw, it.x * R, it.y * R, size, it.rot, 1 - b * .4);
    if (b > 0) spr(g, s2.baked, it.x * R, it.y * R, size * 1.12, it.rot, b);
  }

  // pepperoni
  if (SP.pep) for (const it of peps) {
    const t1 = seg(p, it.a, it.a + it.d * .8); if (t1 < 1) continue;
    const k = seg(p, it.a + it.d * .8, it.a + it.d), sq = 1 + .12 * Math.sin(k * Math.PI);
    const size = it.size * R * (1 - .07 * b) * sq;
    g.save(); g.globalAlpha = .22; g.fillStyle = "#2a0d06"; g.beginPath(); g.arc(it.x * R + R * .008, it.y * R + R * .012, size * .47, 0, TAU); g.fill(); g.restore();
    spr(g, SP.pep.raw, it.x * R, it.y * R, size, it.rot, 1);
    if (b > 0) spr(g, SP.pep.baked, it.x * R, it.y * R, size, it.rot, b);
  }

  // basil
  if (SP.basil) for (const it of basils) {
    const t1 = seg(p, it.a, it.a + it.d * .8); if (t1 < 1) continue;
    const size = it.size * R;
    spr(g, SP.basil.raw, it.x * R, it.y * R, size, it.rot, 1);
    if (b > 0) spr(g, SP.basil.baked, it.x * R, it.y * R, size, it.rot, b * .85);
  }

  // hot honey drizzle
  if (drz > 0) {
    const L = honeyLen[honeyLen.length - 1] * drz;
    g.lineCap = g.lineJoin = "round";
    const pass = (w, col, ox, oy) => {
      g.strokeStyle = col;
      for (let c0 = 0; c0 < honey.length - 1; c0 += 12) {
        if (honeyLen[c0] > L) break;
        const u = c0 / honey.length, lw = w * (.7 + .6 * N.n2(u * 14 + 3, 7.7));
        g.lineWidth = lw; g.beginPath(); g.moveTo((honey[c0][0] + ox) * R, (honey[c0][1] + oy) * R);
        for (let i = c0 + 1; i <= Math.min(c0 + 12, honey.length - 1); i++) {
          if (honeyLen[i] > L) { const pv = honey[i - 1], cu = honey[i], k = (L - honeyLen[i - 1]) / (honeyLen[i] - honeyLen[i - 1]); g.lineTo((lerp(pv[0], cu[0], k) + ox) * R, (lerp(pv[1], cu[1], k) + oy) * R); break; }
          g.lineTo((honey[i][0] + ox) * R, (honey[i][1] + oy) * R);
        }
        g.stroke();
      }
    };
    pass(R * .024, "rgba(110,50,8,.22)", .005, .009);
    pass(R * .016, "rgba(226,150,36,.92)", 0, 0);
    pass(R * .006, "rgba(255,238,175,.7)", -.003, -.004);
  }

  // cut lines
  for (let j = 0; j < 3; j++) {
    const c = cuts[j]; if (c <= 0) continue;
    const u = [Math.cos(CUTS[j]), Math.sin(CUTS[j])], sign = j % 2 ? -1 : 1, Re = .93;
    const x0 = -sign * Re, x1 = lerp(-sign * Re, sign * Re, c);
    g.lineCap = "round";
    g.strokeStyle = "rgba(40,12,6,.55)"; g.lineWidth = Math.max(1.5, R * .011);
    g.beginPath(); g.moveTo(u[0] * x0 * R, u[1] * x0 * R); g.lineTo(u[0] * x1 * R, u[1] * x1 * R); g.stroke();
    g.strokeStyle = "rgba(255,230,190,.18)"; g.lineWidth = Math.max(1, R * .004);
    g.beginPath(); g.moveTo(u[0] * x0 * R + 1.5, u[1] * x0 * R + 1.5); g.lineTo(u[0] * x1 * R + 1.5, u[1] * x1 * R + 1.5); g.stroke();
  }
}

/* ================= main scene ================= */
function drawLadle(g, x, y, fill, ang) {
  const rb = R * .2;
  g.save(); g.translate(x, y); g.rotate(ang);
  const handle = (gg, ox, oy) => { gg.beginPath(); gg.moveTo(rb * .7 + ox, -rb * .26 + oy); gg.lineTo(R * 2 + ox, -rb * .2 + oy); gg.arc(R * 2 + ox, oy, rb * .2, -Math.PI / 2, Math.PI / 2); gg.lineTo(rb * .7 + ox, rb * .26 + oy); gg.closePath(); };
  g.save(); g.globalAlpha = .38; g.fillStyle = "#000"; g.filter = "blur(" + Math.round(R * .035) + "px)";
  g.beginPath(); g.ellipse(R * .06, R * .1, rb * 1.05, rb * .95, 0, 0, TAU); g.fill(); handle(g, R * .06, R * .1); g.fill(); g.restore();
  const hg = g.createLinearGradient(0, -rb * .26, 0, rb * .26);
  hg.addColorStop(0, "#F4F5F5"); hg.addColorStop(.45, "#B9BEC1"); hg.addColorStop(1, "#555C61");
  g.fillStyle = hg; handle(g, 0, 0); g.fill();
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = Math.max(1, rb * .05); g.beginPath(); g.moveTo(rb * 1.1, -rb * .12); g.lineTo(R * 1.95, -rb * .1); g.stroke();
  const bg = g.createRadialGradient(-rb * .35, -rb * .4, rb * .1, 0, 0, rb);
  bg.addColorStop(0, "#FAFBFB"); bg.addColorStop(.55, "#B5BBBF"); bg.addColorStop(1, "#5F676C");
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, rb, 0, TAU); g.fill();
  if (fill > 0) {
    const sg = g.createRadialGradient(-rb * .2, -rb * .25, 0, 0, 0, rb * .8);
    sg.addColorStop(0, "#D2452C"); sg.addColorStop(1, "#8E1D12");
    g.fillStyle = sg; g.beginPath(); g.arc(0, 0, rb * .8 * Math.sqrt(fill), 0, TAU); g.fill();
  }
  g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = Math.max(1, rb * .06); g.beginPath(); g.arc(0, 0, rb * .93, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
  g.restore();
}
function drawCutter(g, x, y, spin) {
  const rw = R * .12;
  g.save(); g.translate(x, y);
  g.save(); g.globalAlpha = .3; g.fillStyle = "#000"; g.filter = "blur(" + Math.round(R * .025) + "px)"; g.beginPath(); g.arc(R * .04, R * .06, rw, 0, TAU); g.fill(); g.restore();
  g.save(); g.rotate(.7);
  const hg = g.createLinearGradient(0, -rw * .35, 0, rw * .35); hg.addColorStop(0, "#3A2A20"); hg.addColorStop(.5, "#6B4E3A"); hg.addColorStop(1, "#2A1E17");
  g.fillStyle = "#9AA0A4"; g.fillRect(0, -rw * .12, rw * 1.6, rw * .24);
  g.fillStyle = hg; g.beginPath(); g.roundRect(rw * 1.5, -rw * .3, R * 1.4, rw * .6, rw * .3); g.fill();
  g.restore();
  const dg = g.createRadialGradient(-rw * .3, -rw * .35, rw * .1, 0, 0, rw);
  dg.addColorStop(0, "#FFFFFF"); dg.addColorStop(.6, "#BFC5C8"); dg.addColorStop(1, "#6E767B");
  g.fillStyle = dg; g.beginPath(); g.arc(0, 0, rw, 0, TAU); g.fill();
  g.rotate(spin); g.strokeStyle = "rgba(60,66,70,.35)"; g.lineWidth = Math.max(1, rw * .05);
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(rw * .3, 0); g.lineTo(rw * .82, 0); g.stroke(); g.rotate(TAU / 6); }
  g.fillStyle = "#7D858A"; g.beginPath(); g.arc(0, 0, rw * .22, 0, TAU); g.fill();
  g.restore();
}

let lastKey = "";
function render(p, t) {
  const g = ctx;
  const ang = A_FINAL * eInOutSine(clamp(p / .9)) + (reduce ? 0 : .02 * Math.sin(t * .5));
  const f = seg(p, .025, .14);
  const st = {
    f, rd: R * (.34 + .66 * eOutBack(f, 1.1)),
    sauceS: seg(p, .152, .285),
    b: smooth(.655, .775, p),
    drz: seg(p, .785, .862),
    cuts: CUT_T.map(([a, z]) => seg(p, a, z)),
  };
  const glow = smooth(.615, .69, p) * (1 - smooth(.775, .86, p));
  const pull = eOutCubic(seg(p, .955, .995));

  const key = p.toFixed(5) + (f < 1 ? t.toFixed(2) : "") + (dirty ? "d" : "");
  if (key !== lastKey) { renderPz(p, t, st); lastKey = key; dirty = false; }

  // background
  g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = g.createRadialGradient(cx, cy, R * .2, cx, cy, Math.max(W, H) * .85);
  bg.addColorStop(0, "#2B1F17"); bg.addColorStop(.55, "#1A130E"); bg.addColorStop(1, "#100B08");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // oven glow
  if (glow > 0) {
    const fl = .85 + .15 * N.n2(t * 1.7, 3.3);
    const og = g.createRadialGradient(cx, cy + R * .4, R * .3, cx, cy, R * 2.3);
    og.addColorStop(0, `rgba(255,132,40,${.55 * glow * fl})`); og.addColorStop(.5, `rgba(214,70,20,${.25 * glow * fl})`); og.addColorStop(1, "rgba(120,30,10,0)");
    g.fillStyle = og; g.fillRect(0, 0, W, H);
  }

  // flour dust on the counter
  if (SP.dust) { g.globalAlpha = .8 * (1 - glow * .6); g.drawImage(SP.dust, cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2); g.globalAlpha = 1; }

  // shadow under the pizza
  const sh = g.createRadialGradient(cx + R * .03, cy + R * .07, st.rd * .6, cx + R * .03, cy + R * .07, st.rd * 1.14);
  sh.addColorStop(0, "rgba(0,0,0,.55)"); sh.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh; g.beginPath(); g.arc(cx + R * .03, cy + R * .07, st.rd * 1.14, 0, TAU); g.fill();

  // the pizza
  g.save(); g.translate(cx, cy); g.rotate(ang);
  if (pull > 0) {
    const w0 = MID - Math.PI / 6, w1 = MID + Math.PI / 6, big = S;
    g.save(); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, big, w1, w0 + TAU); g.closePath(); g.clip();
    g.drawImage(pz, -S / 2, -S / 2); g.restore();
    const d = R * .2 * pull, dx = Math.cos(MID) * d, dy = Math.sin(MID) * d;
    // cheese strands stretching between slice and pie
    const sa = 1 - smooth(.7, 1, pull);
    if (sa > 0) {
      g.lineCap = "round";
      for (const w of [w0, w1]) for (let k = 0; k < 5; k++) {
        const rr = R * (.18 + .15 * k), ux = Math.cos(w) * rr, uy = Math.sin(w) * rr, sag = (k % 2 ? 1 : -1) * R * .015 * pull;
        g.strokeStyle = `rgba(250,236,200,${.9 * sa})`; g.lineWidth = Math.max(1, R * .012 * (1 - pull * .6));
        g.beginPath(); g.moveTo(ux, uy); g.quadraticCurveTo(ux + dx / 2 + sag, uy + dy / 2 - sag, ux + dx, uy + dy); g.stroke();
      }
    }
    g.save(); g.translate(dx, dy);
    g.save(); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = R * .09; g.shadowOffsetY = R * .05 * pull;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * .92, w0, w1); g.closePath(); g.fillStyle = "#3a2416"; g.fill(); g.restore();
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, big, w0, w1); g.closePath(); g.clip();
    g.drawImage(pz, -S / 2, -S / 2); g.restore();
  } else g.drawImage(pz, -S / 2, -S / 2);
  g.restore();

  // falling ingredients (drawn in screen space so they can come from off-canvas)
  const fallShadow = (x, y, r, a) => { const sx = x + R * .02, sy = y + R * .03, sg = g.createRadialGradient(sx, sy, 0, sx, sy, r * 1.3); sg.addColorStop(0, `rgba(30,8,3,${a})`); sg.addColorStop(1, "rgba(30,8,3,0)"); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, r * 1.3, 0, TAU); g.fill(); };
  for (const s of shreds) {
    const tt = seg(p, s.a, s.a + s.d); if (tt <= 0 || tt >= 1) continue;
    const [tx, ty] = toW(s.x, s.y, ang), x = tx + s.sx * W * (1 - tt), y = ty + s.sy * H * (1 - tt * tt);
    g.save(); g.translate(x, y); g.rotate(s.rot + ang + (1 - tt) * 4); const sc = 1 + .4 * (1 - tt), l = s.len * R / 2 * sc;
    g.lineCap = "round"; g.strokeStyle = "#F7F0DF"; g.lineWidth = R * .022 * sc; g.beginPath(); g.moveTo(-l, 0); g.lineTo(l, 0); g.stroke(); g.restore();
  }
  if (SP.blobs) for (const it of blobs) {
    const tt = seg(p, it.a, it.a + it.d * .8); if (tt <= 0 || tt >= 1) continue;
    const [tx, ty] = toW(it.x, it.y, ang);
    fallShadow(tx, ty, it.size * R * .35 * (.5 + .5 * tt), .22 * tt);
    const x = tx + it.sx * W * (1 - tt), y = ty + it.sy * H * (1 - tt * tt);
    spr(g, SP.blobs[it.v].raw, x, y, it.size * R * (1 + .45 * (1 - tt)), it.rot + ang + it.spin * (1 - tt), 1);
  }
  if (SP.pep) for (const it of peps) {
    const tt = seg(p, it.a, it.a + it.d * .8); if (tt <= 0 || tt >= 1) continue;
    const [tx, ty] = toW(it.x, it.y, ang), e = eOutCubic(tt);
    fallShadow(tx, ty, it.size * R * .4 * (.5 + .5 * tt), .25 * tt);
    const x = lerp(cx + it.side * W * .62, tx, e), y = lerp(ty + it.sy * H, ty, tt) - H * .12 * Math.sin(Math.PI * tt);
    spr(g, SP.pep.raw, x, y, it.size * R * (1 + .55 * (1 - tt)), it.rot + ang + it.spin * (1 - e), 1);
  }
  if (SP.basil) for (const it of basils) {
    const tt = seg(p, it.a, it.a + it.d * .8); if (tt <= 0 || tt >= 1) continue;
    const [tx, ty] = toW(it.x, it.y, ang), e = eInOutSine(tt), sw = Math.sin(tt * Math.PI * 2.6 + it.ph);
    fallShadow(tx, ty, it.size * R * .3 * (.5 + .5 * tt), .18 * tt);
    const x = tx + (it.sx * W + sw * R * .45) * (1 - tt), y = ty - H * .7 * (1 - e);
    spr(g, SP.basil.raw, x, y, it.size * R * (1 + .35 * (1 - tt)), it.rot + ang + sw * .9 * (1 - tt), 1, 1);
  }

  // ladle following the spiral
  const lin = seg(p, .128, .154), lout = seg(p, .285, .312);
  if (lin > 0 && lout < 1) {
    const u = Math.sqrt(st.sauceS), th = u * 4 * TAU, lr = u * .84;
    const [tx, ty] = toW(Math.cos(th) * lr, Math.sin(th) * lr, ang);
    const off = 1 - eOutCubic(lin) + lout * lout * 1.2;
    drawLadle(g, tx + W * .45 * off, ty - H * .55 * off, 1 - st.sauceS, -.55 + .08 * Math.sin(th * .5));
  }

  // honey stream
  if (st.drz > 0 && st.drz < 1) {
    const L = honeyLen[honeyLen.length - 1] * st.drz;
    let i = honeyLen.findIndex(v => v >= L); if (i < 1) i = 1;
    const q = honey[i], [hx, hy] = toW(q[0], q[1], ang);
    const fade = smooth(0, .04, st.drz) * (1 - smooth(.96, 1, st.drz));
    g.save(); g.globalAlpha = fade; g.lineCap = "round";
    const top = hx + W * .03, sway = Math.sin(t * 3) * R * .03;
    g.strokeStyle = "rgba(226,154,42,.95)"; g.lineWidth = Math.max(2, R * .014);
    g.beginPath(); g.moveTo(top, -10); g.bezierCurveTo(top + sway, hy * .4, hx - sway, hy * .75, hx, hy); g.stroke();
    g.strokeStyle = "rgba(255,240,190,.7)"; g.lineWidth = Math.max(1, R * .004);
    g.beginPath(); g.moveTo(top - R * .004, -10); g.bezierCurveTo(top + sway - R * .004, hy * .4, hx - sway - R * .004, hy * .75, hx - R * .004, hy); g.stroke();
    g.restore();
  }

  // pizza cutter
  const cin = seg(p, .86, .877), cout = seg(p, .946, .962);
  if (cin > 0 && cout < 1) {
    const pt = j => { const u = [Math.cos(CUTS[j]), Math.sin(CUTS[j])], sign = (j % 2 ? -1 : 1) * .93; return { s: [-sign * u[0], -sign * u[1]], e: [sign * u[0], sign * u[1]] }; };
    let lx, ly;
    if (p < CUT_T[0][0]) { const q = pt(0); [lx, ly] = q.s; }
    else {
      lx = null;
      for (let j = 0; j < 3 && lx === null; j++) {
        const q = pt(j), [a, z] = CUT_T[j];
        if (p <= z) { const c = seg(p, a, z); lx = lerp(q.s[0], q.e[0], c); ly = lerp(q.s[1], q.e[1], c); }
        else if (j < 2 && p < CUT_T[j + 1][0]) { const n = pt(j + 1), k = eInOutSine(seg(p, z, CUT_T[j + 1][0])); lx = lerp(q.e[0], n.s[0], k); ly = lerp(q.e[1], n.s[1], k); }
      }
      if (lx === null) { const q = pt(2); [lx, ly] = q.e; }
    }
    const [x, y] = toW(lx, ly, ang), off = 1 - eOutCubic(cin) + cout * cout * 1.3;
    drawCutter(g, x + W * .4 * off, y + H * .5 * off, p * 900);
  }

  // flour puff as the dough is pressed out
  if (f > 0 && f < 1) {
    g.fillStyle = "#F6EEDD";
    for (const fl of flour) {
      const ft = seg(p, .03 + fl.d, .13 + fl.d); if (ft <= 0 || ft >= 1) continue;
      const dist = R * (.3 + (.6 + fl.s * .8) * eOutCubic(ft));
      g.globalAlpha = Math.sin(ft * Math.PI) * .5;
      g.beginPath(); g.arc(cx + Math.cos(fl.a) * dist, cy + Math.sin(fl.a) * dist, (1 + fl.s * 2.4) * DPR, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }

  // embers in the oven
  if (glow > 0 && !reduce) {
    for (const e of embers) {
      const ph = (t * (.25 + e.s * .3) + e.ph) % 1;
      g.globalAlpha = glow * (1 - ph) * .9;
      g.fillStyle = e.s > .5 ? "#FFC46B" : "#FF8A3D";
      g.beginPath(); g.arc(cx + (e.x - .5) * R * 2.6 + Math.sin(ph * 6 + e.x * 9) * R * .1, cy + R * 1.15 - ph * R * 2.7, (1 + e.s * 1.8) * DPR, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }

  // steam rising off the fresh pie
  const steam = smooth(.74, .82, p) * (1 - .5 * pull);
  if (steam > 0 && !reduce) {
    for (let j = 0; j < 5; j++) {
      const [bx, by] = toW(Math.cos(j * 1.9) * .35, Math.sin(j * 1.9) * .35, ang);
      for (let k = 0; k < 7; k++) {
        const ph = (t * .22 + j * .37 + k / 7) % 1, x = bx + Math.sin(ph * 5 + j) * R * .1, y = by - ph * R * 1.2, rr = R * (.05 + .13 * ph);
        const a = (1 - ph) * ph * 4 * .045 * steam;
        const sg = g.createRadialGradient(x, y, 0, x, y, rr); sg.addColorStop(0, `rgba(255,250,240,${a})`); sg.addColorStop(1, "rgba(255,250,240,0)");
        g.fillStyle = sg; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      }
    }
  }

  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .8);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.45)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
return { layout, render, buildSprites };
};
