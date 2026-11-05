// Motion for the page after the story (Swiss editorial, about.css):
// · [data-split]  words come out of a blur one after another when the block enters the screen
// · [data-reveal] rows / cards slide up in sequence; their hairline rules draw from the left
// · [data-count]  numbers count up
// · .ln[data-drift] display lines drift sideways with the scroll (kinetic type)
// · #path         the experience line grows down the grid rule; each stop lights up as the line reaches it
// · #numbers      the colour band opens up from a card, the figures run sideways, then it sinks into navy
// · .sw-word      the big footer word: letters near the pointer stretch up, take the accent colour and ripple (SVG distortion)
const content = document.getElementById("content");
if (content) init();

function colourAt(x, y) {
  let el = document.elementFromPoint(x, y);
  if (el && el.closest(".nums-stage, .sw-formcard")) return "#3e5ff2";       // the live gradient bands: their mid blue
  if (el && el.closest(".works")) return "#051727";
  for (; el; el = el.parentElement) { const b = getComputedStyle(el).backgroundColor; if (b && b !== "transparent" && !/rgba\(.*, 0\)$/.test(b)) return b; }
  return "#ffffff";
}

function init() {
  const html = document.documentElement;
  const still = () => html.classList.contains("reduce-motion");
  content.classList.add("js-motion");

  // split words (lines keep their own element so they can sit on different grid columns); inline elements such as the
  // work tiles in the lead become one animated item each, wrappers like .dim are split inside
  for (const el of content.querySelectorAll("[data-split]")) {
    const targets = el.querySelectorAll(".ln").length ? el.querySelectorAll(".ln") : [el];
    let i = 0, tiles = 0;
    const word = (text) => { const o = document.createElement("span"); o.className = "w"; const n = document.createElement("span"); n.textContent = text; n.style.setProperty("--i", i++); o.appendChild(n); return o; };
    const split = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          for (const part of parts) { if (!part) continue; frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(" ") : word(part)); }
          node.replaceChild(frag, ch);
        } else if (ch.classList && ch.classList.contains("tile")) {
          const o = document.createElement("span"); o.className = "w w-tile"; ch.style.setProperty("--i", i++);
          ch.style.setProperty("--r", ["-7deg", "5deg", "-3deg", "8deg"][(tiles++) % 4]);
          node.replaceChild(o, ch); o.appendChild(ch);
        } else if (ch.nodeType === 1) split(ch);
      }
    };
    for (const t of targets) { t.normalize(); split(t); }
  }
  // stagger siblings that reveal together
  for (const list of content.querySelectorAll(".sw-stats, .sw-list, .sw-nums, .sw-links")) {
    [...list.querySelectorAll("[data-reveal]")].forEach((el, i) => el.style.setProperty("--i", i % 8));
  }

  // counters
  const count = (el) => {
    if (el.dataset.done) return; el.dataset.done = "1";
    const to = Number(el.dataset.count), from = Number(el.dataset.from || 0), suf = el.dataset.suffix || "";
    if (still()) { el.textContent = to + suf; return; }
    const t0 = performance.now(), dur = 1500;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(2, -10 * t);       // expo out
      el.textContent = Math.round(from + (to - from) * (t >= 1 ? 1 : e)) + (t >= 1 ? suf : "");
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = from; requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(count);
      if (e.target.dataset.count) count(e.target);
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -4% 0px", threshold: 0.05 });
  content.querySelectorAll("[data-split]:not([data-early]), [data-reveal], .num").forEach((el) => io.observe(el));
  // the greeting starts appearing while it is still entering the screen
  const ioEarly = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); ioEarly.unobserve(e.target); }
  }, { rootMargin: "0px 0px 8% 0px", threshold: 0 });
  content.querySelectorAll("[data-early]").forEach((el) => ioEarly.observe(el));
  // counters that are not inside a revealing block
  content.querySelectorAll("[data-count]").forEach((el) => { if (!el.closest("[data-reveal], [data-split]")) io.observe(el); });

  // scroll-linked: drifting lines + the experience path
  const drifters = [...content.querySelectorAll(".ln[data-drift], .sw-word .ln")];
  const pathList = content.querySelector(".sw-path");
  const stops = pathList ? [...pathList.querySelectorAll(".stop")] : [];
  const nums = content.querySelector(".sw-numbers"), numStage = nums && nums.querySelector(".nums-stage"), numTrack = nums && nums.querySelector(".nums-track");
  const top = document.querySelector(".top"), meshes = [...content.querySelectorAll("[data-mesh]")];
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let raf = 0;
  const frame = () => {
    raf = 0;
    const vh = innerHeight, cr = content.getBoundingClientRect();
    if (cr.top > vh || cr.bottom < 0) return;
    if (!still()) {
      for (const el of drifters) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const p = (r.top + r.height / 2) / vh - 0.5;                                  // −0.5 … 0.5 across the screen
        const k = Number(el.dataset.drift || (el.closest(".sw-word") ? 1.4 : 0));
        el.style.transform = `translate3d(${(-p * k * 7).toFixed(2)}vw, 0, 0)`;
      }
    }
    // the header is drawn in "difference" (white on dark, ink on paper); over the colour blocks it would turn yellow → plain white there
    // once the page covers the room, the phone's browser bars take the colour of whatever block is under them
    if (top) {
      const on = meshes.some((m) => { const q = m.getBoundingClientRect(); return q.top <= 30 && q.bottom >= 30; });
      if (on !== top.classList.contains("on-color")) top.classList.toggle("on-color", on);
    }
    if (nums) {
      const r = nums.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const open = smooth(vh, 0, r.top);                                            // 0 while entering → 1 when pinned
        numStage.style.setProperty("--ins", `${((1 - open) * 7).toFixed(2)}vw`);
        numStage.style.setProperty("--rad", `${((1 - open) * 36).toFixed(1)}px`);
        const p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
        const run = Math.max(0, numTrack.scrollWidth - innerWidth);
        const x = smooth(0.02, 0.56, p);                                             // the run ends before the works block rises
        numTrack.style.setProperty("--tx", `${(-run * x).toFixed(1)}px`);
        numStage.style.setProperty("--fade", smooth(0.56, 0.68, p).toFixed(3));     // melts into navy before the works block slides over
      }
    }
    if (pathList) {
      const r = pathList.getBoundingClientRect(), pen = vh * 0.62;
      const draw = Math.max(0, Math.min(r.height, pen - r.top));
      pathList.style.setProperty("--draw", `${draw.toFixed(1)}px`);
      const pad = parseFloat(getComputedStyle(stops[0]).paddingTop) || 60;
      for (const s of stops) s.classList.toggle("on", s.getBoundingClientRect().top + pad + 8 < pen);
    }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  // once the page covers the room, the phone's browser bars take the colour of whatever block is under them
  // (checked a few times a second — sticky blocks change under the bar without a layout-visible scroll step)
  if (matchMedia("(hover: none), (pointer: coarse)").matches) setInterval(() => {
    if (document.hidden || !window.__setBarColor || content.getBoundingClientRect().top > 0) return;
    window.__setBarColor(colourAt(innerWidth / 2, 2));
  }, 300);
  footerWord(still);
  fitLines();
  briefForm();
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  kick();
}

// The footer word fills the width; letters near the pointer stretch up and turn accent, springing back when it leaves.
function footerWord(still) {
  const el = document.querySelector(".sw-word");
  if (!el) return;
  const text = el.textContent.trim(); el.textContent = "";
  const chars = [...text].map((c) => { const s = document.createElement("span"); s.className = c === "_" ? "ch us" : "ch"; s.textContent = c; el.appendChild(s); return s; });
  const fit = () => {                                                               // font size so the word spans the grid
    el.style.setProperty("--fs", "100px");
    const pad = parseFloat(getComputedStyle(el).paddingLeft) * 2;
    // the widest line (phones break "rj_verceles" into two lines, the underscore is hidden there)
    const lines = new Map();
    for (const ch of chars) { if (!ch.offsetWidth) continue; const k = ch.offsetTop, l = lines.get(k) || [Infinity, -Infinity]; lines.set(k, [Math.min(l[0], ch.offsetLeft), Math.max(l[1], ch.offsetLeft + ch.offsetWidth)]); }
    const w = Math.max(...[...lines.values()].map(([a, b]) => b - a));
    el.style.setProperty("--fs", `${(100 * (el.clientWidth - pad) / w * 0.995).toFixed(2)}px`);
  };
  let fitW = 0;
  const refit = () => { if (el.clientWidth !== fitW) { fitW = el.clientWidth; fit(); } };   // ignore phone toolbar resizes
  document.fonts.ready.then(() => { fitW = 0; refit(); }); addEventListener("resize", refit); refit();
  // one displacement filter per letter, so the warp stays local to the letters under the pointer
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
  const maps = [], noises = [];
  chars.forEach((c, i) => {
    const f = document.createElementNS(NS, "filter"); f.id = `sw-warp-${i}`;
    f.setAttribute("x", "-20%"); f.setAttribute("y", "-20%"); f.setAttribute("width", "140%"); f.setAttribute("height", "140%");
    const tu = document.createElementNS(NS, "feTurbulence");
    tu.setAttribute("type", "fractalNoise"); tu.setAttribute("baseFrequency", "0.006 0.016"); tu.setAttribute("numOctaves", "1"); tu.setAttribute("seed", String(i * 7 + 3)); tu.setAttribute("result", "n");
    const dm = document.createElementNS(NS, "feDisplacementMap");
    dm.setAttribute("in", "SourceGraphic"); dm.setAttribute("in2", "n"); dm.setAttribute("scale", "0"); dm.setAttribute("xChannelSelector", "R"); dm.setAttribute("yChannelSelector", "G");
    f.append(tu, dm); svg.appendChild(f); maps.push(dm); noises.push(tu);
  });
  document.body.appendChild(svg);
  const k = chars.map(() => 0), want = chars.map(() => 0);
  let mx = -1e4, my = -1e4, over = false, raf = 0, energy = 0, lx = 0, ly = 0, gain = 1;
  const tick = () => {
    raf = 0;
    const r = el.getBoundingClientRect(), R = r.height * 0.9;
    let moving = false;
    energy = energy * 0.92 + Math.min(1, Math.hypot(mx - lx, my - ly) / 30) * 0.35; lx = mx; ly = my;   // pointer speed → ripple energy
    chars.forEach((c, i) => {
      const cr = c.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      const d = Math.hypot(cx - mx, (cy - my) * 0.6);
      want[i] = over ? Math.exp(-(d * d) / (R * R)) : 0;
      k[i] += (want[i] - k[i]) * 0.18;
      if (Math.abs(want[i] - k[i]) > 0.002) moving = true;
      const side = Math.max(-1, Math.min(1, (cx - mx) / R));
      const f = k[i] * gain;                                          // the self-playing version on phones is gentler
      c.style.transform = `scale(${(1 - 0.12 * f).toFixed(3)}, ${(1 + 0.42 * f).toFixed(3)}) skewX(${(-side * 10 * f).toFixed(2)}deg)`;
      c.style.setProperty("--k", k[i].toFixed(3));
      // the ripple: displacement grows with the hover and the noise drifts, so the letter looks liquid, not just stretched
      const amt = k[i] * gain * Math.min(1, energy) * 85;                  // strong ripple while the pointer moves, settles when it stops
      maps[i].setAttribute("scale", amt.toFixed(1));
      if (amt > 0.3) { const t = performance.now() / 1000; noises[i].setAttribute("baseFrequency", `${(0.006 + Math.sin(t * 1.1 + i) * 0.0015).toFixed(4)} ${(0.016 + Math.cos(t * 0.9 + i) * 0.004).toFixed(4)}`); }
      c.style.filter = amt > 0.3 ? `url(#sw-warp-${i})` : "";
    });
    if (moving || energy > 0.01) raf = requestAnimationFrame(tick);
  };
  const go = () => { if (!raf && !still()) raf = requestAnimationFrame(tick); };
  el.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; mx = e.clientX; my = e.clientY; over = true; go(); });
  if (matchMedia("(hover: none), (pointer: coarse)").matches) {
    gain = 0.4;
    // touch screens have no hover: a virtual pointer wanders through the letters by itself while the word is on screen
    let seen = false, t0 = performance.now();
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) auto(); }).observe(el);
    const auto = () => {
      if (!seen || still()) return;
      const r = el.getBoundingClientRect(), t = (performance.now() - t0) / 1000;
      mx = r.left + r.width * (0.5 + 0.48 * Math.sin(t * 0.7));
      my = r.top + r.height * (0.5 + 0.35 * Math.sin(t * 1.3));
      over = true; go(); requestAnimationFrame(auto);
    };
  }
  el.addEventListener("pointerleave", () => { over = false; go(); });
}

// [data-fit]: every line is sized so it spans the full width of its box (Swiss justified block)
function fitLines() {
  const els = [...document.querySelectorAll("[data-fit]")];
  const fit = () => els.forEach((el) => {
    const w = el.clientWidth;
    const cs = getComputedStyle(el), w0 = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    el.querySelectorAll(".ln").forEach((ln) => {
      // phones stack the words (.w2 as blocks) and use the one headline size for every block — no fitting there
      const parts = [...ln.querySelectorAll(".w2")];
      if (parts.length && getComputedStyle(parts[0]).display === "block") {
        ln.style.removeProperty("--fs");
        parts.forEach((p) => (p.style.fontSize = ""));                 // phones: the shared headline size from CSS (--big)
        return;
      }
      parts.forEach((p) => (p.style.fontSize = ""));
      ln.style.setProperty("--fs", "100px");
      const r = document.createRange(); r.selectNodeContents(ln);
      const tw = r.getBoundingClientRect().width || 1;
      // never larger than the block's own size (e.g. the H1 size of the form heading)
      const cap = parseFloat(cs.fontSize) || Infinity;
      ln.style.setProperty("--fs", `${Math.min(cap, 100 * w / tw * 0.995).toFixed(2)}px`);
    });
  });
  let lastW = 0;
  const refit = () => { if (innerWidth !== lastW) { lastW = innerWidth; fit(); } };   // phones fire resize on every toolbar show/hide
  document.fonts.ready.then(fit); addEventListener("resize", refit); fit();
}

// The brief form: name, email and task. No backend — submitting opens a ready
// email in the visitor's mail client (mailto only, as specified).
function briefForm() {
  const form = document.getElementById("brief");
  if (!form) return;
  const note = form.querySelector(".f-note");
  // the fields take exactly the width of the heading (its widest line)
  const head = form.querySelector("h3"), fields = form.querySelector(".sw-fields");
  const size = () => {
    let w = 0;
    head.querySelectorAll(".ln").forEach((ln) => { const r = document.createRange(); r.selectNodeContents(ln); w = Math.max(w, r.getBoundingClientRect().width); });
    fields.style.setProperty("--fw", `${Math.round(w)}px`);
  };
  document.fonts.ready.then(size); addEventListener("resize", size); size();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const body = `Name: ${d.name}
Email: ${d.email}

Task:
${d.task || "—"}`;
    const subject = "Brief from the Rj Verceles site";
    location.href = `mailto:rjverceles1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Your email app is open with the brief ready — just press Send.";
  });
}
