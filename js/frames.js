/* Scroll-scrubbed photo frames, cut from a real (AI-generated) video.
   Reads assets/hero/manifest.json. If that file is missing, main.js falls back to the
   code-drawn pizza in pizza.js, so the site works with or without the frames.

   manifest.json:
   {
     "count": 180,                      // frames per set
     "ext": "webp",
     "desktop": { "dir": "d/", "focusX": 0.5, "focusY": 0.5, "steps": [...] },  // 16:9 frames
     "mobile":  { "dir": "m/", "focusX": 0.5, "focusY": 0.5, "steps": [...] },  // optional 9:16 frames
     "steps": [0.03, 0.14, 0.29, 0.425, 0.545, 0.635, 0.775, 0.875]  // fallback: where each caption appears
   }
   Frames are named 0001.webp, 0002.webp ... inside each dir. */
window.FrameScrub = async function (cv, base) {
  "use strict";
  const res = await fetch(base + "manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("no frames");
  const m = await res.json();
  if (!m || !m.count || !m.desktop) throw new Error("bad manifest");

  const ctx = cv.getContext("2d");
  const portrait = () => innerHeight > innerWidth * 1.1;
  let set = null, imgs = [], loaded = [], W = 1, H = 1, last = -1, lastFrac = -1;
  let firstReady, firstResolve;
  firstReady = new Promise(r => (firstResolve = r));

  const name = i => base + set.dir + String(i + 1).padStart(4, "0") + "." + (m.ext || "webp");

  function load(which) {
    if (set === which) return;
    set = which; imgs = new Array(m.count); loaded = new Array(m.count).fill(false); last = -1;
    // Coarse-to-fine order: every 16th frame first, then 8th, 4th... so scrubbing works early.
    const order = [], seen = new Set();
    for (let stride = 16; stride >= 1; stride >>= 1)
      for (let i = 0; i < m.count; i += stride) if (!seen.has(i)) { seen.add(i); order.push(i); }
    if (!seen.has(m.count - 1)) order.splice(1, 0, m.count - 1);
    let k = 0, inflight = 0;
    const mine = set;
    const pump = () => {
      while (inflight < 6 && k < order.length) {
        const i = order[k++], im = new Image();
        inflight++;
        im.decoding = "async";
        im.onload = () => { if (set !== mine) return; loaded[i] = true; inflight--; if (i === 0) firstResolve(); last = -1; pump(); };
        im.onerror = () => { inflight--; if (i === 0) firstResolve(); pump(); };
        im.src = name(i);
        imgs[i] = im;
      }
    };
    pump();
  }

  function nearest(i) {
    if (loaded[i]) return i;
    for (let d = 1; d < m.count; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < m.count && loaded[i + d]) return i + d;
    }
    return -1;
  }

  function cover(im, alpha) {
    const f = set, iw = im.naturalWidth, ih = im.naturalHeight;
    const s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
    const dx = (W - dw) * (f.focusX ?? 0.5), dy = (H - dh) * (f.focusY ?? 0.5);
    ctx.globalAlpha = alpha; ctx.drawImage(im, dx, dy, dw, dh); ctx.globalAlpha = 1;
  }

  function layout() {
    const DPR = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    W = cv.width = Math.max(1, Math.round(r.width * DPR));
    H = cv.height = Math.max(1, Math.round(r.height * DPR));
    load(portrait() && m.mobile ? m.mobile : m.desktop);
    last = -1;
  }

  function render(p) {
    const pos = Math.min(m.count - 1, Math.max(0, p) * (m.count - 1));
    const i = Math.floor(pos), frac = pos - i;
    if (i === last && Math.abs(frac - lastFrac) < 0.02) return;
    const a = nearest(i);
    if (a < 0) return;
    last = i; lastFrac = frac;
    ctx.fillStyle = "#100B08"; ctx.fillRect(0, 0, W, H);
    cover(imgs[a], 1);
    // blend into the next frame for extra smoothness between frames
    const b = i + 1 < m.count && loaded[i + 1] && a === i ? i + 1 : -1;
    if (b > 0 && frac > 0.02) cover(imgs[b], frac);
  }

  layout();
  return {
    layout, render, buildSprites() {}, ready: firstReady,
    get steps() { return (set && set.steps) || m.steps; }, // caption timing for whichever video is showing
  };
};
