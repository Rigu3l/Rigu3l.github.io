// S05–S07 on the modern monitor.
// S05 "update": TWO separate press-and-hold stages, each with its own full load bar.
//   Stage 1 — OS 95. At 100% the desktop switches to OS 7 with a quick wave. That press is spent: the visitor
//             must let go and press again. Nothing changes mid-hold.
//   Stage 2 — OS 7. A fresh press fills a NEW bar; at 100% the OS 11 skin spreads out in the widening circle.
// After that the fully revealed OS 11 wallpaper is shown on its own for a beat before the "paper sketches" card,
// so the reveal is never hidden behind a dialog. Holding puts the screen under "tension" (lean / tremble).
// Letting go before 100% springs the bar back to empty.
// Then three dialogs with real buttons (click / Enter). Scrolling past anything that waits is refused with a bounce.
const $ = (s, r = document) => r.querySelector(s);

export const OS_TIMES = {
  in: [366, 380],                  // the desktop lights up as soon as the new monitor comes alive (S04, wave B)
  gates: [
    { id: "hold", kind: "hold", show: 586, at: 600, next: 602 },
    { id: "update", kind: "dialog", show: 692, at: 705, next: 719 },
    { id: "error", kind: "dialog", show: 718, at: 735, next: 749 },
    { id: "success", kind: "dialog", show: 748, at: 765, next: 830 },
  ],
  out: [772, 830],                 // after "готово": smooth exit back into the full room (wide shot)
};
const STAGES = 2, STAGE_SEC = 1.8;   // two holds; hold.h is the progress (0–1) of the CURRENT stage
// Timing of the two reveals. Each fires from that stage's 100% event, never from hold
// progress and never from scroll position.
const QUICK7_MS = 460;       // 95 → 7 wave; keep in sync with .os-wave.go.quick (.45 s) in os.css
const WAVE11_MS = 900;       // 7 → 11 wave; keep in sync with .os-wave.go.final (.9 s) in os.css
const WALLPAPER_BEAT = 500;  // fully revealed OS 11 wallpaper, on its own, before the card
const COARSE = matchMedia("(hover: none), (pointer: coarse)").matches;    // 95 → 7, 7 → 11

const ICON = {
  pc: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="5" y="3" width="22" height="17" fill="#c0c0c0"/><rect x="5" y="3" width="22" height="1" fill="#fff"/><rect x="5" y="3" width="1" height="17" fill="#fff"/><rect x="26" y="3" width="1" height="17" fill="#404040"/><rect x="8" y="6" width="16" height="11" fill="#000080"/><rect x="10" y="8" width="5" height="2" fill="#0ff"/><rect x="11" y="20" width="10" height="3" fill="#808080"/><rect x="4" y="23" width="24" height="6" fill="#c0c0c0"/><rect x="4" y="23" width="24" height="1" fill="#fff"/><rect x="6" y="25" width="3" height="1" fill="#0f0"/><rect x="18" y="25" width="8" height="2" fill="#404040"/></svg>`,
  folder: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="3" y="11" width="26" height="17" fill="#e8c840"/><rect x="3" y="9" width="10" height="3" fill="#e8c840"/><rect x="3" y="27" width="26" height="1" fill="#806010"/><rect x="28" y="11" width="1" height="17" fill="#806010"/><rect x="14" y="2" width="5" height="6" fill="#ffff60"/><rect x="15" y="8" width="3" height="2" fill="#808080"/><rect x="12" y="3" width="1" height="1" fill="#ffff60"/><rect x="20" y="3" width="1" height="1" fill="#ffff60"/></svg>`,
  bin: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="8" y="6" width="16" height="3" fill="#c0c0c0"/><rect x="9" y="9" width="14" height="19" fill="#d8d8d8"/><rect x="9" y="9" width="1" height="19" fill="#fff"/><rect x="22" y="9" width="1" height="19" fill="#808080"/><rect x="13" y="14" width="6" height="2" fill="#008000"/><rect x="12" y="16" width="2" height="4" fill="#008000"/><rect x="18" y="16" width="2" height="4" fill="#008000"/><rect x="13" y="20" width="6" height="2" fill="#008000"/></svg>`,
  update95: `<svg viewBox="0 0 48 48" shape-rendering="crispEdges"><rect x="8" y="4" width="32" height="26" fill="#c0c0c0"/><rect x="8" y="4" width="32" height="2" fill="#fff"/><rect x="8" y="4" width="2" height="26" fill="#fff"/><rect x="38" y="4" width="2" height="26" fill="#404040"/><rect x="12" y="8" width="24" height="18" fill="#000080"/><path d="M18 14h9v-3l5 5-5 5v-3h-9z" fill="#20c040"/><path d="M30 22h-9v3l-5-5 5-5v3h9z" fill="#20c040" opacity=".85"/><rect x="16" y="30" width="16" height="4" fill="#808080"/><rect x="4" y="34" width="40" height="10" fill="#c0c0c0"/><rect x="4" y="34" width="40" height="2" fill="#fff"/><rect x="8" y="38" width="4" height="2" fill="#0f0"/><rect x="26" y="38" width="14" height="3" fill="#404040"/></svg>`,
};

// glossy (OS 7) and flat (OS 11) icons — original drawings, no real OS artwork
const G7 = {
  pc: `<svg viewBox="0 0 64 64"><defs><linearGradient id="a7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdfdfd"/><stop offset="1" stop-color="#9ea7b3"/></linearGradient><radialGradient id="b7" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#7cc4ff"/><stop offset=".6" stop-color="#1663d6"/><stop offset="1" stop-color="#0a2f7a"/></radialGradient></defs><rect x="8" y="6" width="48" height="36" rx="4" fill="url(#a7)" stroke="#6b7684"/><rect x="12" y="10" width="40" height="28" rx="2" fill="url(#b7)"/><path d="M12 10h40v9C38 22 24 16 12 22z" fill="#fff" opacity=".28"/><path d="M26 42h12l3 8H23z" fill="url(#a7)" stroke="#6b7684"/><rect x="16" y="50" width="32" height="5" rx="2" fill="url(#a7)" stroke="#6b7684"/></svg>`,
  folder: `<svg viewBox="0 0 64 64"><defs><linearGradient id="c7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset="1" stop-color="#e3a826"/></linearGradient><radialGradient id="d7" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#fffbd0"/><stop offset="1" stop-color="#ffd23a"/></radialGradient></defs><path d="M6 18h20l4 5h28v31H6z" fill="#d99a1e"/><path d="M6 25h52v29H6z" fill="url(#c7)"/><circle cx="40" cy="22" r="11" fill="url(#d7)"/><rect x="36" y="32" width="8" height="6" rx="1" fill="#9aa3ad"/><path d="M40 6v4M28 12l3 3M52 12l-3 3" stroke="#ffe37a" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  bin: `<svg viewBox="0 0 64 64"><defs><linearGradient id="e7" x1="0" x2="1"><stop offset="0" stop-color="#e9f4ff" stop-opacity=".9"/><stop offset=".5" stop-color="#b9d6f0" stop-opacity=".6"/><stop offset="1" stop-color="#7fa6c9" stop-opacity=".9"/></linearGradient></defs><path d="M14 12h36l-4 46H18z" fill="url(#e7)" stroke="#6e8aa6"/><ellipse cx="32" cy="12" rx="18" ry="4" fill="#d6e8f8" stroke="#6e8aa6"/><path d="M26 30l6-6 6 6M38 38l-6 6-6-6" fill="none" stroke="#2f7fe0" stroke-width="3" stroke-linecap="round"/></svg>`,
  upd: `<svg viewBox="0 0 96 96"><defs><linearGradient id="f7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdfdfd"/><stop offset="1" stop-color="#a5aeba"/></linearGradient><radialGradient id="g7" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#6ab8ff"/><stop offset=".65" stop-color="#1257c9"/><stop offset="1" stop-color="#08286d"/></radialGradient></defs><rect x="14" y="8" width="66" height="52" rx="5" fill="url(#f7)" stroke="#6b7684" stroke-width="1.5"/><rect x="20" y="14" width="54" height="40" rx="2" fill="url(#g7)"/><path d="M36 30a12 12 0 0 1 21-5l3-3v10H50l4-4a8 8 0 0 0-14 3z" fill="#3ee06a"/><path d="M58 38a12 12 0 0 1-21 5l-3 3V36h10l-4 4a8 8 0 0 0 14-3z" fill="#2bc35a"/><path d="M8 66h80l-4 20H12z" fill="url(#f7)" stroke="#6b7684" stroke-width="1.5"/><rect x="16" y="72" width="10" height="4" rx="1" fill="#3ee06a"/><rect x="58" y="72" width="22" height="5" rx="2" fill="#515b68"/></svg>`,
};
const F11 = {
  pc: `<svg viewBox="0 0 64 64"><defs><linearGradient id="a11" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd0ff"/><stop offset="1" stop-color="#0a64e0"/></linearGradient></defs><rect x="6" y="9" width="52" height="34" rx="4" fill="#dfe6ee"/><rect x="9" y="12" width="46" height="28" rx="2" fill="url(#a11)"/><rect x="28" y="43" width="8" height="7" fill="#b8c2cd"/><rect x="18" y="50" width="28" height="4" rx="2" fill="#c9d2dc"/></svg>`,
  folder: `<svg viewBox="0 0 64 64"><defs><linearGradient id="b11" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd86b"/><stop offset="1" stop-color="#f3b521"/></linearGradient></defs><path d="M6 14a3 3 0 0 1 3-3h15l5 5h26a3 3 0 0 1 3 3v6H6z" fill="#e3a10f"/><rect x="6" y="20" width="52" height="34" rx="3" fill="url(#b11)"/><circle cx="38" cy="34" r="8" fill="#fff6c4"/><rect x="35" y="41" width="6" height="5" rx="1" fill="#8d97a3"/></svg>`,
  bin: `<svg viewBox="0 0 64 64"><path d="M15 14h34l-3 42a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3z" fill="#e8f1fa" stroke="#9fb4c9"/><rect x="12" y="10" width="40" height="6" rx="3" fill="#cfdceb"/><path d="M27 30l5-5 5 5M37 39l-5 5-5-5" fill="none" stroke="#1e78ff" stroke-width="3" stroke-linecap="round"/></svg>`,
  upd: `<svg viewBox="0 0 96 96"><defs><linearGradient id="c11" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fb4ff"/><stop offset="1" stop-color="#0b5fe0"/></linearGradient></defs><rect x="12" y="8" width="72" height="50" rx="6" fill="#e3e9f0"/><rect x="17" y="13" width="62" height="40" rx="3" fill="url(#c11)"/><path d="M38 30a11 11 0 0 1 19-6l3-3v10H50l4-4a7 7 0 0 0-12 3zM58 37a11 11 0 0 1-19 6l-3 3V36h10l-4 4a7 7 0 0 0 12-3z" fill="#fff"/><path d="M10 66h76a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V70a4 4 0 0 1 4-4z" fill="#d7dee7"/><rect x="62" y="74" width="20" height="4" rx="2" fill="#0b5fe0"/></svg>`,
  search: `<svg viewBox="0 0 32 32"><circle cx="14" cy="14" r="8" fill="none" stroke="#1b2430" stroke-width="3"/><path d="M20 20l7 7" stroke="#1b2430" stroke-width="3" stroke-linecap="round"/></svg>`,
  gear: `<svg viewBox="0 0 32 32"><path d="M16 4l2.2 3.4 4-.8.8 4 3.4 2.2-1.8 3.6 1.8 3.6-3.4 2.2-.8 4-4-.8L16 28l-2.2-3.4-4 .8-.8-4L5.6 19.2 7.4 15.6 5.6 12l3.4-2.2.8-4 4 .8z" fill="#5d6b7a"/><circle cx="16" cy="16" r="5" fill="#eef3f8"/></svg>`,
  wifi: `<svg viewBox="0 0 32 32"><path d="M3 12a19 19 0 0 1 26 0M7 16.5a13 13 0 0 1 18 0M11 21a7 7 0 0 1 10 0" fill="none" stroke="#1b2430" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="25" r="2" fill="#1b2430"/></svg>`,
  vol: `<svg viewBox="0 0 32 32"><path d="M5 12h5l7-6v20l-7-6H5z" fill="#1b2430"/><path d="M21 11a7 7 0 0 1 0 10M24 7a12 12 0 0 1 0 18" fill="none" stroke="#1b2430" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  bat: `<svg viewBox="0 0 32 32"><rect x="3" y="10" width="23" height="12" rx="2.5" fill="none" stroke="#1b2430" stroke-width="2.4"/><rect x="6" y="13" width="15" height="6" rx="1" fill="#1b2430"/><rect x="27" y="14" width="2.5" height="4" rx="1" fill="#1b2430"/></svg>`,
};

export function makeOS() {
  const el = document.createElement("div");
  el.className = "os"; el.id = "os"; el.dataset.screen = "95"; el.setAttribute("aria-label", L("Екран комп'ютера", "Computer screen"));
  const blocks = Array.from({ length: 24 }, () => "<i></i>").join("");
  el.innerHTML = `<div class="os-inner">
    <!-- wallpapers, desktop icons and taskbars for each OS: they cross-fade while the update runs -->
    <div class="bg bg95"></div><div class="bg bg7"><div class="aero"></div></div><div class="bg bg11"></div>
    <div class="icons icons95"><span>${ICON.pc}${L("Мій<br>комп’ютер", "My<br>computer")}</span><span>${ICON.folder}${L("Мої ідеї", "My ideas")}</span><span>${ICON.bin}${L("Кошик", "Recycle Bin")}</span></div>
    <div class="icons icons7"><span>${G7.pc}${L("Мій<br>комп’ютер", "My<br>computer")}</span><span>${G7.folder}${L("Мої ідеї", "My ideas")}</span><span>${G7.bin}${L("Кошик", "Recycle Bin")}</span></div>
    <div class="icons icons11"><span>${F11.pc}${L("Мій<br>комп’ютер", "My<br>computer")}</span><span>${F11.folder}${L("Мої ідеї", "My ideas")}</span><span>${F11.bin}${L("Кошик", "Recycle Bin")}</span></div>
    <div class="tbar tbar95"><span class="logo"><img src="assets/rj-logo.png" alt=""></span><span class="start95"><img src="assets/rj-logo.png" alt="">${L("Пуск", "Start")}</span><span class="task95">rj_verceles</span><span class="lbl95">OS 95</span><span class="clk95">09:41</span></div>
    <div class="tbar tbar7"><span class="logo"><img src="assets/rj-logo.png" alt=""></span><span class="orb7"><img src="assets/rj-logo.png" alt=""></span><span class="task7">${G7.pc}rj_verceles</span><span class="lbl7">OS 7</span><span class="clk7">09:41</span></div>
    <div class="tbar tbar11"><span class="logo"><img src="assets/rj-logo.png" alt=""></span><span class="tb11"><i class="start11"><img src="assets/rj-logo.png" alt=""></i><i>${F11.search}</i><i class="act">${F11.upd}</i><i>${F11.folder}</i><i>${F11.gear}</i></span>
      <span class="tray11"><i>${F11.wifi}</i><i>${F11.vol}</i><i>${F11.bat}</i><b>09:41</b></span></div>
    <!-- ONE update window: the same structure on every OS, its skin morphs -->
    <section class="upd" aria-labelledby="updt">
      <header><b>rj_verceles</b><span class="x" aria-hidden="true"><i>✕</i></span></header>
      <div class="updbody">
        <span class="updicon"><i class="v95"><img src="assets/os/upd95.png" alt=""></i><i class="v7"><img src="assets/os/upd7.png" alt=""></i></span>
        <div class="updtext"><p class="updt" id="updt">${L("Доступне оновлення", "Update available")}</p><p class="upds">rj_verceles OS <b class="updto">7</b></p>
          <div class="prog"><div class="seg">${blocks}</div><div class="bar7"><u></u></div></div></div>
      </div>
      <button class="updbtn" type="button"><span>${L("НАТИСНИ І ТРИМАЙ", "PRESS AND HOLD")}</span></button>
    </section>
    ${dialog("update", "", L("Перетягни кабель і тримай, щоб оновити", "Drag the cable to connect, then hold to update the old OS."), L("Паперові ескізи <br>стали повним стеком", "Paper sketches <br>became full stack"), "↗", L("Продовжити", "Continue"), "↗")}
    ${dialog("error", "error", "Error: sketch_not_found", L("Стара система <br>вже не справляється", "The old system <br>can’t do the task anymore"), "!", L("Спробувати ще раз", "Try again"), "↻")}
    ${dialog("success", "success", L("Усе починається зараз", "Update complete · same task, now solved properly"), L("Я не прикрашаю. <br>Я розв’язую задачу.", "I don’t decorate. <br>I solve the task."), "✓", L("Готово", "Done"), "↓")}
    <div class="os-red" aria-hidden="true"></div><div class="os-red-vig" aria-hidden="true"></div>
    <div class="os-scan" aria-hidden="true"></div>

  </div>`;
  document.body.appendChild(el);
  // group each OS's wallpaper/icons/taskbar into one "skin" so a whole OS can be revealed at once
  const inner = $(".os-inner", el), skins = {};
  for (const k of ["95", "7", "11"]) {
    const sk = document.createElement("div"); sk.className = `skin skin${k}`;
    inner.insertBefore(sk, $(".upd", el));
    for (const c of [`.bg${k}`, `.icons${k}`, `.tbar${k}`]) sk.appendChild($(c, el));
    skins[k] = sk;
  }
  const wave = document.createElement("div"); wave.className = "os-wave"; wave.setAttribute("aria-hidden", "true");
  inner.insertBefore(wave, $(".upd", el));
  // the hold ring follows the pointer (outside .os so it isn't scaled with the screen)
  const ring = document.createElement("div");
  ring.className = "hold-ring"; ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = `<svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44"/></svg>`;
  document.body.appendChild(ring);
  // small hint pill next to the cursor (replaces the big centred hint)
  const pill = document.createElement("div"); pill.className = "cursor-hint"; pill.setAttribute("aria-hidden", "true");
  document.body.appendChild(pill);
  followPill(pill);
  const announce = document.createElement("p"); announce.className = "sr-only"; announce.setAttribute("aria-live", "polite");
  document.body.appendChild(announce);
  const dialogs = {}, buttons = {};
  for (const g of OS_TIMES.gates) if (g.kind === "dialog") { dialogs[g.id] = $(`#os-${g.id}`, el); buttons[g.id] = $(`#os-${g.id} .os-btn`, el); }
  return { armedAt: {}, el, inner, skins, wave, pill, ring, ringFg: $(".fg", ring), btnLabel: $(".updbtn span", el), announce, dialogs, buttons,
    holdBtn: $(".updbtn", el), segs: [...el.querySelectorAll(".seg i")], bar7: $(".bar7 u", el), updTo: $(".updto", el) };
}

// The pill trails the pointer on a spring and tilts with its speed, like the 3D pixel cursor does.
function followPill(pill) {
  const still = document.documentElement.classList.contains("reduce-motion");
  let tx = innerWidth / 2 - 60, ty = innerHeight * 0.7, x = tx, y = ty, vx = 0, vy = 0, sc = 0.8, raf = 0, last = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000) || 0.016; last = now;
    const k = still ? 1 : 1 - Math.exp(-dt * 16);                     // spring toward the pointer
    const nx = x + (tx + 26 - x) * k, ny = y + (ty + 14 - y) * k;
    vx += ((nx - x) / dt - vx) * 0.3; vy += ((ny - y) / dt - vy) * 0.3; x = nx; y = ny;
    const on = pill.classList.contains("show");
    sc += ((on ? 1 : 0.8) - sc) * (1 - Math.exp(-dt * 14));
    const ry = still ? 0 : Math.max(-28, Math.min(28, vx * 0.03)), rx = still ? 0 : Math.max(-22, Math.min(22, -vy * 0.03));
    const rz = still ? 0 : Math.max(-10, Math.min(10, vx * 0.008));
    pill.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) perspective(420px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
    const settled = Math.abs(tx + 26 - x) < 0.2 && Math.abs(ty + 14 - y) < 0.2 && Math.abs(vx) + Math.abs(vy) < 2 && Math.abs(sc - (on ? 1 : 0.8)) < 0.002;
    raf = settled ? 0 : requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; tx = e.clientX; ty = e.clientY; kick(); }, { passive: true });
  new MutationObserver(kick).observe(pill, { attributes: true, attributeFilter: ["class"] });
  kick();
}

// arrows are SVG (the sprite lives in index.html): text arrows like ↗ turn into emoji on phones
const ICONS = { "↗": "i-ne", "↻": "i-redo", "↓": "i-down", "→": "i-right" };
export const icon = (ch) => `<svg class="ico" aria-hidden="true"><use href="#${ICONS[ch] || "i-ne"}"/></svg>`;

function dialog(id, cls, eyebrow, title, symbol, button, arrow) {
  return `<section class="os-dialog ${cls}" id="os-${id}" aria-labelledby="os-${id}-t" inert>
    <div class="os-chrome"><span>rj_verceles/${id}</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
    <div class="os-body"><p class="os-eyebrow">${eyebrow}</p><h2 class="os-title" id="os-${id}-t">${title}</h2></div>
    <button class="os-btn" type="button"><b>${button}</b>${icon(arrow)}</button></section>`;
}

// ---------------------------------------------------------------- gates + the hold
export function makeGates(os, { scrollToVh, reduceMotion }) {
  const gates = OS_TIMES.gates.map((g) => ({ ...g, done: false, pressing: false }));
  // hold.h is the progress of the CURRENT stage (0–1); stage 1 = OS 95 → 7, stage 2 = OS 7 → 11.
  // A press is "consumed" the instant it completes a stage, so it can never roll straight into the
  // next one — the visitor has to let go and press again. pendingReset keeps the completed 100% bar
  // on screen until that next press starts, then the new stage gets a fresh empty bar.
  const hold = { h: 0, stage: 1, down: false, consumed: false, pendingReset: false, tension: 0,
    x: innerWidth / 2, y: innerHeight / 2, over: false, tip: false };
  let lastNudge = 0, curPv = 0;
  const holdGate = gates[0];
  const holdActive = () => !holdGate.done && curPv >= holdGate.show - 4;
  const hint = () => hold.stage === 2 ? L("натисни і тримай ще раз", "press and hold again") : L("натисни і тримай", "press and hold");

  const finish = (g) => { g.pressing = false; g.done = true; scrollToVh(g.next); };
  const press = (g) => {
    if (g.done || g.pressing || performance.now() < (os.armedAt[g.id] || 0)) return;   // still charging: ignore
    g.pressing = true;
    window.hwSfx?.({ update: "next", error: "error", success: "done" }[g.id] || "click");
    const b = os.buttons[g.id];
    b.classList.add("is-pressing"); os.dialogs[g.id].classList.add("sent");
    setTimeout(() => b.classList.remove("is-pressing"), 260);
    if (g.id === "error") { os.el.classList.add("glitch"); setTimeout(() => os.el.classList.remove("glitch"), 1100); }
    finish(g);                                                                   // move on at once
  };
  for (const g of gates) if (g.kind === "dialog") os.buttons[g.id].addEventListener("click", () => press(g));

  // press-and-hold: only on the update button itself (mouse / touch) or Enter / Space — a scroll or a tap elsewhere
  // must never start the update (on phones the whole screen is the OS, so scrolling back up used to start it)
  let downAt = 0, tipT = 0;
  const start = (e) => {
    if (!holdActive() || hold.consumed) return;                                   // a spent press needs a real release first
    if (hold.pendingReset) { hold.h = 0; hold.pendingReset = false; }             // stage 2 starts with an empty bar
    hold.down = true; downAt = performance.now(); os.holdBtn.classList.add("down");
    window.hwSfx?.("click");
    window.hwRiser?.start((hold.stage - 1 + hold.h) / STAGES);                    // the build-up, from the overall progress
    if (curPv < holdGate.at - 1) scrollToVh(holdGate.at);                        // settle the page at the update
    if (e && e.cancelable) e.preventDefault();
  };
  const stop = () => {
    if (!hold.down) return;
    hold.down = false; os.holdBtn.classList.remove("down");
    window.hwRiser?.stop(holdGate.done ? 0.6 : 0.3);
    if (performance.now() - downAt < 450 && !holdGate.done) {                    // a quick click: tell them to hold
      hold.tip = true; clearTimeout(tipT); tipT = setTimeout(() => (hold.tip = false), 1600);
    }
  };
  // A real release re-arms the button. It has to run even when the hold is already over (stage 1 ends the
  // press by itself), otherwise `consumed` would stay set and stage 2 could never start.
  const release = () => { hold.consumed = false; stop(); };
  // Each stage fires its own reveal at its own 100% — never from hold progress, never from scroll position.
  const completeStage = (api, now) => {
    stop();
    hold.consumed = true; hold.h = 1;                                              // this press is spent
    if (hold.stage === 1) {
      hold.stage = 2; hold.pendingReset = true;
      api.stage1At = now;                                                         // 100% #1 → OS 7, then press again
      window.hwSfx?.("next");
    } else {
      holdGate.done = true;
      api.completedAt = now; api.skipped = false;                                 // 100% #2 → OS 11, timed wallpaper beat
      window.hwSfx?.("start"); scrollToVh(holdGate.next);
    }
  };
  // mouse / pen: pointer events. Fingers: touch events — iPhone Safari ended the pointer stream early (pointercancel),
  // so a real hold read as a quick tap ("keep holding" forever); touchstart/touchend follow the finger reliably.
  const touchy = (e) => e.pointerType === "touch";
  os.holdBtn.addEventListener("pointerdown", (e) => { if (!touchy(e)) start(e); });
  addEventListener("pointerup", (e) => { if (!touchy(e)) release(); }); addEventListener("pointercancel", (e) => { if (!touchy(e)) release(); });
  addEventListener("touchend", (e) => { if (!e.touches.length) release(); }); addEventListener("touchcancel", release);
  addEventListener("blur", release);
  addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && holdActive() && !e.repeat) { start(); e.preventDefault(); } });
  addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") release(); });
  addEventListener("pointermove", (e) => { hold.x = e.clientX; hold.y = e.clientY; });
  os.el.addEventListener("pointerenter", () => (hold.over = true));
  os.el.addEventListener("pointerleave", () => (hold.over = false));
  os.el.addEventListener("contextmenu", (e) => holdActive() && e.preventDefault());   // long-press on phones
  // phones: a long press would select the button text / the whole page and open the magnifier — stop that at the source
  os.holdBtn.addEventListener("touchstart", (e) => { if (!holdActive()) return; if (e.cancelable) e.preventDefault(); start(); }, { passive: false });
  os.el.addEventListener("selectstart", (e) => e.preventDefault());

  return {
    gates, hold,
    stage1At: 0,      // performance.now() when stage 1 hit 100% — OS 7 stays up for the second hold
    completedAt: 0,   // performance.now() when stage 2 hit 100% — the OS 11 wallpaper beat is timed from here
    skipped: false,   // "skip the story" / deep link: no reveal beat, straight to OS 11
    hint,
    limit(pv) { curPv = pv; const g = gates.find((x) => !x.done); return g ? Math.min(pv, g.at) : pv; },
    pending() { return gates.find((g) => !g.done) || null; },
    tick() {
      // real elapsed time (the render loop clamps its dt; a slow frame must not make the hold take longer)
      const now = performance.now(), dt = Math.min(0.25, (now - (this._last || now)) / 1000); this._last = now;
      if (holdActive()) {
        if (hold.down) hold.h = Math.min(1, hold.h + dt / (reduceMotion ? STAGE_SEC * 0.6 : STAGE_SEC));
        else if (!hold.pendingReset) hold.h = Math.max(0, hold.h - dt * 1.6);  // let go early: spring back to empty
        if (hold.down && hold.h >= 1) completeStage(this, now);                 // 100% of THIS stage: fire its reveal
      }
      const want = hold.down && holdActive() ? 1 : 0;
      hold.tension += (want - hold.tension) * (1 - Math.exp(-dt * (want ? 4 : 9)));
    },
    tension() { return reduceMotion ? 0 : hold.tension; },
    holdActive,
    nudge() {
      const g = gates.find((x) => !x.done);
      if (!g || g.pressing || curPv < g.at - 3) return;
      const now = performance.now(); if (now - lastNudge < 450) return; lastNudge = now;
      os.el.classList.remove("nudge"); void os.el.offsetWidth; os.el.classList.add("nudge");
      os.pill.textContent = g.kind === "hold" ? hint() : L("натисни кнопку", "press the button"); os.pill.classList.add("show");
      clearTimeout(this._t); this._t = setTimeout(() => os.el.classList.remove("nudge"), 1400);
      clearTimeout(this._tp); this._tp = setTimeout(() => os.pill.classList.remove("show"), 4000);   // the hint stays long enough to read
      if (g.kind !== "hold") { const b = os.buttons[g.id]; b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
    },
    reset() {
      gates.forEach((g) => { g.done = false; g.pressing = false; });
      Object.assign(hold, { h: 0, stage: 1, down: false, consumed: false, pendingReset: false, tension: 0, tip: false });
      os.holdBtn.classList.remove("down");
      this.stage1At = 0; this.completedAt = 0; this.skipped = false;
    },
    skipAll() {
      gates.forEach((g) => { g.done = true; g.pressing = false; });
      Object.assign(hold, { h: 1, stage: 2, down: false, consumed: false, pendingReset: false, tension: 0, tip: false });
      os.holdBtn.classList.remove("down");
      this.stage1At = 0; this.completedAt = 0; this.skipped = true;            // "skip the story"
    },
  };
}

// ---------------------------------------------------------------- per-frame view
let lastScreen = "", lastShown = "", lastPct = -1, lastSeg = -1, ringVis = null, lastHint = "";
export function updateOS(os, pv, range, gates) {
  const T = OS_TIMES, hold = gates.hold;
  const vis = range(pv, T.in[0], T.in[1]);                      // the desktop stays on the monitor after the exit too
  os.el.style.opacity = vis.toFixed(3);
  os.el.classList.toggle("on", vis > 0.001);
  os.el.classList.toggle("live", pv > T.in[1] && pv < T.out[0]);
  // Which OS is on screen. Each stage's 100% swaps exactly one skin — no morph mid-hold:
  //   stage 1 keeps OS 95 → its 100% gives OS 7 (which then stays up for the second hold)
  //   stage 2's 100% gives OS 11 → wave, wallpaper alone, then the card.
  // "Skip the story" / deep links go straight to OS 11 with no beat.
  const hg = gates.gates[0], h = hold.h;
  const calm = document.documentElement.classList.contains("reduce-motion");
  const since = gates.completedAt ? performance.now() - gates.completedAt : 0;
  const settle = calm ? 700 : WAVE11_MS + WALLPAPER_BEAT;      // OS 11 wave + a wallpaper-only beat
  const screen = hg.done ? "11" : gates.stage1At ? "7" : "95";
  const quick = !gates.skipped && screen === "7";                                // short 95 → 7 wave
  const final = !gates.skipped && screen === "11" && !!gates.completedAt;        // the 7 → 11 reveal
  const wallpaperReady = !hg.done || gates.skipped || since >= settle;           // OS 11 wallpaper on its own first
  os.el.classList.toggle("dlg-upd", screen !== "11" && pv >= hg.show - 4);
  if (screen !== lastScreen) {
    // the new OS spreads out from the update window in a widening circle with a light wave on its edge
    const cur = os.skins[screen], prev = os.skins[lastScreen], animate = !!prev && !calm;
    for (const k in os.skins) if (os.skins[k] !== prev) os.skins[k].classList.remove("cur", "prev", "enter", "quick", "final");
    if (prev) {
      prev.classList.remove("cur", "enter", "quick", "final");
      prev.classList.toggle("prev", animate);
      prev.classList.toggle("quick", animate && quick);
      prev.classList.toggle("final", animate && final);
    }
    cur.classList.add("cur");
    if (animate) {
      void cur.offsetWidth; cur.classList.add("enter");
      cur.classList.toggle("quick", quick); cur.classList.toggle("final", final);
      os.wave.classList.remove("go", "quick", "final"); void os.wave.offsetWidth;
      os.wave.classList.add("go"); os.wave.classList.toggle("quick", quick); os.wave.classList.toggle("final", final);
      clearTimeout(os._wt); os._wt = setTimeout(() => prev.classList.remove("prev", "quick", "final"), quick ? QUICK7_MS : final ? WAVE11_MS : 1600);
    }
    os.el.dataset.screen = screen; lastScreen = screen;
    os.updTo.textContent = screen === "95" ? "7" : "11";
    os.announce.textContent = { 95: "", 7: L("Систему оновлено до OS 7. Доступне оновлення OS 11", "Updated to OS 7. OS 11 update available"), 11: L("Систему оновлено до OS 11", "Updated to OS 11") }[screen];
  }
  const stageP = Math.min(1, h);                                // one bar per stage, 0 → 100%
  const seg = Math.round(stageP * os.segs.length);
  if (seg !== lastSeg) { os.segs.forEach((x, i) => x.classList.toggle("on", i < seg)); lastSeg = seg; }
  const pct = Math.round(stageP * 1000) / 10;
  if (pct !== lastPct) { os.bar7.style.width = `${pct}%`; lastPct = pct; }
  // tension: the picture leans in toward the pointer and trembles while held; springs back on release
  const t = gates.tension();
  if (t > 0.002) {
    const r = os.el.getBoundingClientRect();
    const ox = ((hold.x - r.left) / r.width) * 100, oy = ((hold.y - r.top) / r.height) * 100;
    const j = t > 0.3 ? (Math.random() - 0.5) * 3 * t : 0;
    os.inner.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
    os.inner.style.transform = `translate(${j.toFixed(2)}px, ${(-j).toFixed(2)}px) scale(${(1 + 0.045 * t).toFixed(4)}, ${(1 + 0.06 * t).toFixed(4)})`;
    if (!COARSE) os.inner.style.filter = `saturate(${(1 + 0.4 * t).toFixed(2)}) brightness(${(1 + 0.12 * t).toFixed(2)})`;   // phones: a CSS filter on this big layer every frame costs too much memory
  } else if (os.inner.style.transform) { os.inner.style.transform = ""; os.inner.style.filter = ""; }
  // no ring at the cursor any more: while the update waits, the hint pill simply stays next to the pointer
  const stay = gates.holdActive() && hold.over && !hold.down && pv >= hg.at - 3;
  const hintText = gates.hint();
  if (stay !== ringVis || hintText !== lastHint) {
    if (stay) os.pill.textContent = hintText;
    os.pill.classList.toggle("stay", stay); ringVis = stay; lastHint = hintText;
  }
  // the words live on the button: stage 2 asks for a second hold, "updating…" while held
  const label = hold.down ? L("ОНОВЛЕННЯ…", "UPDATING…") : hold.tip ? L("ТРИМАЙ, НЕ ВІДПУСКАЙ", "KEEP HOLDING")
    : hold.stage === 2 ? L("НАТИСНИ І ТРИМАЙ ЩЕ РАЗ", "PRESS AND HOLD AGAIN") : L("НАТИСНИ І ТРИМАЙ", "PRESS AND HOLD");
  if (os.btnLabel.textContent !== label) os.btnLabel.textContent = label;

  // dialogs: exactly one at a time. On OS 11 the wallpaper gets its own beat first —
  // no card may cover the reveal while the new skin is still spreading out.
  let shown = "";
  for (const g of gates.gates) if (g.kind === "dialog" && pv >= g.show && pv < T.out[0]) shown = g.id;
  if (!shown && hg.done && pv >= hg.at - 2 && pv < T.out[0]) shown = "update";   // OS 11: nothing to update → straight to the brand dialog
  if (!wallpaperReady) shown = "";
  os.el.classList.toggle("error-state", shown === "error");
  if (shown !== lastShown) {
    for (const [id, d] of Object.entries(os.dialogs)) { const on = id === shown; d.classList.toggle("show", on); d.inert = !on; if (!on) d.classList.remove("sent"); }
    if (shown) {
      // the new button charges up (a fill sweeps across it) before it accepts a click
      const b = os.buttons[shown], ms = document.documentElement.classList.contains("reduce-motion") ? 250 : 750;
      os.armedAt[shown] = performance.now() + ms;
      b.classList.remove("arming"); void b.offsetWidth; b.classList.add("arming");
      clearTimeout(os._arm); os._arm = setTimeout(() => b.classList.remove("arming"), ms);
    }
    if (shown) os.announce.textContent = os.dialogs[shown].querySelector(".os-title").textContent;
    lastShown = shown;
  }
}
