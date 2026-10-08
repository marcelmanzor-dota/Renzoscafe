(() => {
"use strict";

/* ============ settings you may want to change ============ */
// Photos for the zoom gallery between the menu and "Our story" (exactly 7 looks best; the first is the centre one).
// Leave empty to hide the section.
const GALLERY = [
  // { src: "assets/img/gallery-1.webp", alt: "Spicy Renzo fresh from the oven" },
];
// Where each build-scene caption appears (0 = top of the scene, 1 = bottom). Real video frames can override this in their manifest.
let STEP_AT = [.03, .14, .29, .425, .545, .635, .775, .875];
const NAMES = ["The dough", "The sauce", "Mozzarella", "Pepperoni", "Basil", "The oven", "Hot honey", "Ready"];

/* ============ setup ============ */
const html = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const G = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
const motion = !!(G && ST) && !reduce;
if (!motion) html.classList.remove("motion");
if (G && ST) G.registerPlugin(ST);
if (G && Split) G.registerPlugin(Split);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

/* ============ smooth scrolling (Lenis) ============ */
let lenis = null;
if (motion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ST.update);
  G.ticker.add(t => lenis.raf(t * 1000));
  G.ticker.lagSmoothing(0);
  $$('a[href^="#"]:not(.skip)').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href"), el = id.length > 1 ? document.querySelector(id) : null;
    if (!el && id !== "#top") return;
    e.preventDefault();
    lenis.start(); // the mobile menu pauses scrolling while open
    lenis.scrollTo(el || 0, { duration: 1.6 });
    if (el) { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
  }));
}

/* ============ the build scene ============ */
const cv = $("#pizza"), build = $("#build"), hero = $("#hero");
const caps = $$(".cap"), progress = $(".progress");
const stepName = $("#stepName"), stepCount = $("#stepCount"), barFill = $("#barFill");
let scene = null, target = 0, cur = 0, T = 0, last = performance.now(), running = false, visible = true;
const isMobile = () => innerWidth < 820;

let sceneResolve; const sceneReady = new Promise(r => (sceneResolve = r));
window.FrameScrub(cv, "assets/hero/")
  .then(s => { scene = s; cv.parentElement.classList.add("real"); if (Array.isArray(s.steps) && s.steps.length === 8) STEP_AT = s.steps; s.ready.then(sceneResolve); })
  .catch(() => { scene = window.ProceduralPizza(cv, reduce); scene.layout(); scene.buildSprites(); sceneResolve(); })
  .finally(start);

function readScroll() {
  const r = build.getBoundingClientRect(), span = r.height - innerHeight;
  target = clamp(-r.top / (span || 1));
}
if (G && ST) ST.create({ trigger: build, start: "top top", end: "bottom bottom", onUpdate: s => (target = s.progress), onRefresh: s => (target = s.progress) });
else addEventListener("scroll", readScroll, { passive: true });
readScroll(); cur = target;

// captions: each one swaps in with its words rising out of a blur
const capWords = caps.map(c => {
  const h = c.querySelector("h2");
  return motion && Split ? new Split(h, { type: "words", mask: "words" }).words : [];
});
let step = 0;
function setStep(n) {
  if (n === step) return;
  const prev = step, dir = n > prev ? 1 : -1; step = n;
  if (prev > 0) {
    const el = caps[prev - 1];
    if (motion) G.to(el, { autoAlpha: 0, y: -26 * dir, filter: "blur(6px)", duration: .35, ease: "power2.in", overwrite: true });
    else { el.style.opacity = 0; el.style.visibility = "hidden"; }
  }
  if (n > 0) {
    const el = caps[n - 1];
    if (motion) {
      G.fromTo(el, { autoAlpha: 0, y: 34 * dir, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: .8, ease: "expo.out", delay: prev > 0 ? .12 : 0, overwrite: true });
      if (capWords[n - 1].length) G.fromTo(capWords[n - 1], { yPercent: 105 }, { yPercent: 0, duration: .9, ease: "expo.out", stagger: .05, delay: prev > 0 ? .14 : 0, overwrite: true });
    } else { el.style.visibility = "visible"; el.style.opacity = 1; }
    stepName.textContent = NAMES[n - 1]; stepCount.textContent = String(n).padStart(2, "0") + " / 08";
  }
  progress.classList.toggle("on", n > 0);
}
function updateUI(p) {
  const h = smooth(.002, .03, p);
  hero.style.opacity = 1 - h;
  hero.style.transform = isMobile() ? `translateY(${-h * 30}px)` : `translateY(calc(-46% - ${h * 40}px))`;
  hero.style.visibility = h >= 1 ? "hidden" : "visible";
  hero.style.pointerEvents = h > .5 ? "none" : "";
  let n = 0; for (let i = 0; i < STEP_AT.length; i++) if (p >= STEP_AT[i]) n = i + 1;
  setStep(n);
  barFill.style.transform = `scaleX(${seg(p, STEP_AT[0], 1)})`;
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!reduce) T += dt;
  if (reduce) cur = target;
  else { cur += (target - cur) * (1 - Math.exp(-dt * (lenis ? 9 : 5.2))); if (Math.abs(target - cur) < 1e-5) cur = target; }
  if (scene) scene.render(cur, T);
  updateUI(cur);
  if (visible) requestAnimationFrame(frame); else running = false;
}
function start() { if (!running && scene) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }, { rootMargin: "100px" }).observe(build);
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (scene) scene.layout(); readScroll(); }, 120); });

/* ============ intro curtain + hero entrance ============ */
const loader = $("#loader");
if (motion) {
  if (lenis) lenis.stop();
  const mark = loader.querySelector("b");
  const letters = Split ? new Split(mark, { type: "chars" }).chars : [];
  const fill = $("#loadFill");
  G.set(hero.children, { autoAlpha: 0, y: 30 });
  const h1Words = Split ? new Split(hero.querySelector("h1"), { type: "words", mask: "words" }).words : [];
  const intro = G.timeline();
  intro.from(letters, { yPercent: 110, duration: .9, ease: "expo.out", stagger: .045 })
       .from(loader.querySelector("small"), { autoAlpha: 0, y: 10, duration: .6 }, "-=.5")
       .to(fill, { scaleX: .7, duration: 1.1, ease: "power2.out" }, 0);
  const maxWait = new Promise(r => setTimeout(r, 3500));
  Promise.all([Promise.race([sceneReady, maxWait]), new Promise(r => setTimeout(r, 1300)), document.fonts ? document.fonts.ready : 0]).then(() => {
    G.timeline({ onComplete: () => { loader.remove(); if (lenis) lenis.start(); ST.refresh(); } })
      .to(fill, { scaleX: 1, duration: .35, ease: "power2.out" })
      .to(letters, { yPercent: -110, duration: .6, ease: "expo.in", stagger: .03 }, "<.1")
      .to(loader, { yPercent: -100, duration: 1.05, ease: "expo.inOut" }, "-=.25")
      .to(hero.children, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: .09, clearProps: "transform" }, "-=.55")
      .from(h1Words, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: .06 }, "<");
  });
} else if (loader) loader.remove();

/* ============ everything below the build scene ============ */
// stars
$$(".stars").forEach(s => { s.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>'.repeat(5); });

// zoom gallery
const gallery = $("#gallery");
if (GALLERY.length) {
  const stage = gallery.querySelector(".zoom-stage");
  GALLERY.slice(0, 7).forEach(({ src, alt }, i) => {
    const layer = document.createElement("div"); layer.className = "zl";
    layer.innerHTML = `<figure><img src="${src}" alt="${alt || ""}" ${i ? 'loading="lazy"' : ""}></figure>`;
    stage.insertBefore(layer, stage.querySelector(".zoom-copy"));
  });
  gallery.hidden = false;
}

if (motion) {
  // nav: progress bar for the whole page, tuck away while scrolling down
  const nav = $(".nav"), sheet = $("#sheet");
  ST.create({
    start: 0, end: "max",
    onUpdate: s => {
      G.set("#navFill", { scaleX: s.progress });
      nav.classList.toggle("tuck", s.direction === 1 && s.scroll() > innerHeight * .8 && !sheet.classList.contains("open"));
    },
  });

  // headings: lines rise out of a mask as they come into view
  if (Split) $$("section.block h2.display, .zoom-copy h2").forEach(h => {
    Split.create(h, {
      type: "lines", mask: "lines", linesClass: "split-line", autoSplit: true,
      onSplit: self => G.from(self.lines, { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: .1, scrollTrigger: { trigger: h, start: "top 88%", once: true } }),
    });
  });

  // generic reveal
  G.set(".rv", { y: 44 });
  ST.batch(".rv", { start: "top 90%", once: true, onEnter: els => G.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: .1 }) });

  // marquee rows: speed up and flip direction with your scroll
  const rows = $$(".ribbon-track").map((el, i) => ({ el, x: 0, dir: i % 2 ? 1 : -1, w: 0 }));
  const measure = () => rows.forEach(r => (r.w = r.el.scrollWidth / 2));
  measure(); addEventListener("resize", measure);
  let vel = 0, boost = 0, ribbonOn = false;
  ST.create({ trigger: ".ribbon", start: "top bottom", end: "bottom top", onToggle: s => (ribbonOn = s.isActive), onUpdate: s => (vel = s.getVelocity()) });
  G.ticker.add((t, dt) => {
    if (!ribbonOn) return;
    vel *= .92;
    boost += (clamp(vel / 1200, -5, 5) - boost) * .12;
    const sign = boost < -.05 ? -1 : 1;
    rows.forEach(r => {
      r.x += r.dir * sign * (60 + Math.abs(boost) * 260) * dt / 1000;
      if (r.w) r.x = ((r.x % r.w) - r.w) % r.w;
      G.set(r.el, { x: r.x, skewX: clamp(-boost * 3, -10, 10) });
    });
  });

  // Ramsay quote: pinned while each word lights up
  const quote = $(".quote blockquote");
  if (Split && quote) {
    const words = new Split(quote, { type: "words", wordsClass: "w" }).words;
    G.timeline({ scrollTrigger: { trigger: ".quote", start: "top top", end: "+=110%", pin: true, scrub: .6 } })
      .fromTo(words, { opacity: .12 }, { opacity: 1, stagger: .12, ease: "none" })
      .from(".quote .mark", { scale: .4, rotate: -20, opacity: 0, duration: .6, ease: "none" }, 0)
      .from(".quote-side", { x: 40, duration: .8, ease: "none" }, .2);
  }

  // menu: sliding pill behind the active tab, rows stagger in
  const tabsEl = $(".tabs"), pill = document.createElement("span");
  pill.className = "tab-pill"; tabsEl.prepend(pill); tabsEl.classList.add("has-pill");
  window.__movePill = (tab, instant) => {
    const a = tab.getBoundingClientRect(), b = tabsEl.getBoundingClientRect();
    G.to(pill, { x: a.left - b.left, y: a.top - b.top, width: a.width, height: a.height, opacity: 1, duration: instant ? 0 : .55, ease: "expo.out" });
  };
  window.__movePill($('.tab[aria-selected="true"]'), true);
  addEventListener("resize", () => window.__movePill($('.tab[aria-selected="true"]'), true));
  G.set("#p-pizza .row", { autoAlpha: 0, y: 30 });
  ST.batch("#p-pizza .row", { start: "top 92%", once: true, onEnter: els => G.to(els, { autoAlpha: 1, y: 0, duration: .8, ease: "expo.out", stagger: .06 }) });

  // zoom gallery (ported from the 21st.dev Zoom Parallax component)
  if (GALLERY.length) {
    const scales = [4, 5, 6, 5, 6, 8, 9];
    const tl = G.timeline({ scrollTrigger: { trigger: gallery, start: "top top", end: "bottom bottom", scrub: true } });
    $$(".zl").forEach((l, i) => tl.to(l, { scale: scales[i % 7], ease: "none", duration: 1 }, 0));
    tl.to(".zoom-copy", { opacity: 1, duration: .25, ease: "none" }, .62).to(".zoom-stage", { "--shade": 1, duration: .3, ease: "none" }, .55);
  }

  // our story: section rises like a card, outlined type drifts behind, numbers count up
  G.fromTo(".about", { scale: .94, borderRadius: isMobile() ? 28 : 48 }, { scale: 1, borderRadius: 0, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "top 30%", scrub: true } });
  G.fromTo(".about-drift", { xPercent: 0 }, { xPercent: -35, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });
  $$("[data-count]").forEach(el => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suffix || "", o = { v: from };
    el.textContent = from + suf;
    G.to(o, { v: to, duration: 2, ease: "expo.out", onUpdate: () => (el.textContent = Math.round(o.v) + suf), scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });

  // events photo: opens from a window and drifts
  const photo = $(".photo"), pimg = photo && photo.querySelector("img");
  if (photo) {
    G.fromTo(photo, { clipPath: "inset(14% 10% 14% 10% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none", scrollTrigger: { trigger: photo, start: "top 95%", end: "center 55%", scrub: true } });
    if (pimg) G.fromTo(pimg, { scale: 1.3, yPercent: -6 }, { scale: 1.02, yPercent: 6, ease: "none", scrollTrigger: { trigger: photo, start: "top bottom", end: "bottom top", scrub: true } });
  }
  G.from(".checks li", { x: -24, autoAlpha: 0, duration: .7, ease: "expo.out", stagger: .1, scrollTrigger: { trigger: ".checks", start: "top 88%", once: true } });

  // reviews: pinned sideways scroll on desktop
  const strip = $("#rvStrip"), track = $("#rvTrack"), rvFill = $("#rvFill");
  ST.matchMedia({
    "(min-width: 900px)": () => {
      $(".reviews").classList.add("horiz"); $("#rvHintText").textContent = "Keep scrolling";
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const cards = $$("#rvTrack .card");
      const tl = G.timeline({ scrollTrigger: { trigger: ".reviews", start: "top top", end: () => "+=" + dist(), pin: true, scrub: .8, invalidateOnRefresh: true } });
      tl.to(track, { x: () => -dist(), ease: "none" }, 0).to(rvFill, { scaleX: 1, ease: "none" }, 0);
      cards.forEach((c, i) => tl.fromTo(c, { rotate: i % 2 ? 3 : -3, y: i % 2 ? 30 : -10 }, { rotate: i % 2 ? -2 : 2, y: 0, ease: "none" }, 0));
      return () => { $(".reviews").classList.remove("horiz"); $("#rvHintText").textContent = "Swipe for more"; };
    },
    "(max-width: 899px)": () => {
      const sync = () => G.set(rvFill, { scaleX: strip.scrollLeft / Math.max(1, strip.scrollWidth - strip.clientWidth) });
      strip.addEventListener("scroll", sync, { passive: true });
      return () => strip.removeEventListener("scroll", sync);
    },
  });

  // visit: map wipes open
  G.fromTo(".map", { clipPath: "inset(100% 0% 0% 0% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: ".map", start: "top 85%", once: true } });

  // footer wordmark: letters rise as you reach the bottom
  const mark = $("#footMark");
  if (Split && mark) {
    const chars = new Split(mark, { type: "chars" }).chars;
    G.fromTo(chars, { yPercent: 100, rotate: 6 }, { yPercent: 0, rotate: 0, ease: "none", stagger: .08, scrollTrigger: { trigger: ".foot", start: "top 85%", end: "bottom bottom", scrub: .6 } });
  }

  // magnetic order buttons (mouse only)
  if (finePointer) $$(".btn-red").forEach(b => {
    const xTo = G.quickTo(b, "x", { duration: .5, ease: "power3" }), yTo = G.quickTo(b, "y", { duration: .5, ease: "power3" });
    b.addEventListener("mousemove", e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
    b.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
  });

  if (document.fonts) document.fonts.ready.then(() => ST.refresh());
  addEventListener("load", () => ST.refresh());
}

/* ============ menu tabs ============ */
const tabs = $$(".tab");
function selectTab(tab) {
  tabs.forEach(t => { const on = t === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; document.getElementById(t.getAttribute("aria-controls")).hidden = !on; });
  if (window.__movePill) window.__movePill(tab);
  const rows = $$("#" + tab.getAttribute("aria-controls") + " .row");
  if (motion) { G.fromTo(rows, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .55, ease: "expo.out", stagger: .04, overwrite: true }); ST.refresh(); }
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", e => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); selectTab(n); }
  });
});

/* ============ mobile sheet ============ */
const mb = $(".menu-btn"), sheet = $("#sheet");
const setSheet = open => {
  sheet.classList.toggle("open", open); mb.setAttribute("aria-expanded", open); mb.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mb.innerHTML = open ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open && motion) G.fromTo("#sheet li", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, ease: "expo.out", stagger: .06 });
};
mb.addEventListener("click", () => setSheet(!sheet.classList.contains("open")));
sheet.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setSheet(false)));
addEventListener("keydown", e => { if (e.key === "Escape") setSheet(false); });

/* ============ Chef Ramsay audio ============ */
const clip = $("#clip"), playBtn = $("#playBtn"), pFill = $("#pFill"), playNote = $("#playNote");
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
playBtn.addEventListener("click", () => { clip.paused ? clip.play().catch(() => { playNote.textContent = "Audio unavailable right now"; }) : clip.pause(); });
clip.addEventListener("play", () => { playBtn.innerHTML = PAUSE; playBtn.setAttribute("aria-label", "Pause audio clip"); });
clip.addEventListener("pause", () => { playBtn.innerHTML = PLAY; playBtn.setAttribute("aria-label", "Play Chef Ramsay's audio clip"); });
clip.addEventListener("timeupdate", () => { if (clip.duration) pFill.style.width = (clip.currentTime / clip.duration * 100) + "%"; });
clip.addEventListener("error", () => { playNote.textContent = "Audio unavailable right now"; });

/* ============ open-now status (Boca Raton time) ============ */
(function status() {
  const el = $("#status");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const get = k => parts.find(x => x.type === k).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const mins = (+get("hour") % 24) * 60 + +get("minute");
  const close = (day === 5 || day === 6) ? 22 * 60 : 21 * 60 + 30;
  const open = mins >= 11 * 60 && mins < close;
  el.classList.toggle("open", open);
  el.querySelector("span").textContent = open ? `Open now · until ${close === 1320 ? "10:00" : "9:30"} PM` : (mins < 11 * 60 ? "Closed · opens today at 11 AM" : "Closed · opens tomorrow at 11 AM");
  $$("#hours li").forEach(li => li.classList.toggle("today", li.dataset.d.split(",").includes(String(day))));
})();
$("#yr").textContent = new Date().getFullYear();
})();
