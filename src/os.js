import * as THREE from 'three';
import { OS_TIMES, clamp, getFirstUnfinishedGate } from './timeline.js';

/**
 * Story UI Layer (os.js):
 * - Fixed 1600x914 design box projected onto SCREEN_modern every frame
 * - 3 original SVG skins (Era 1: pixel art sketchbook OS, Era 2: glossy skeuomorphic tablet OS, Era 3: flat clean modern OS)
 * - Circular reveal mask (@property --r) + light-wave ring
 * - Morphing Update Window (Canvas 7 -> Canvas 11) with 24-cell segmented bar & smooth bar
 * - 2-stage Press-and-Hold controller with tension, jitter, camera FOV/tremble output, and cursor spring pill
 * - 3 armed dialogs (Statement, Error with red monochrome glitch overlay, Success)
 * - Scroll-refusal gate controller with bounce nudge() and hint pill feedback
 */

const STAGES = 2;
const BASE_STAGE_SEC = 1.8;

function buildSkinMarkup(era) {
  if (era === 1) {
    // Era 1: Crisp Pixel Art Sketchbook OS
    return `
      <div class="plate-wallpaper">
        <svg viewBox="0 0 1600 914" preserveAspectRatio="none" shape-rendering="crispEdges">
          <rect width="1600" height="914" fill="#182242" />
          <g fill="#22305C">
            <rect x="0" y="0" width="1600" height="860" fill="none" />
            <path d="M0 120H1600V124H0zM0 240H1600V244H0zM0 360H1600V364H0zM0 480H1600V484H0zM0 600H1600V604H0zM0 720H1600V724H0z" />
            <path d="M200 0V860H204V0zM400 0V860H404V0zM600 0V860H604V0zM800 0V860H804V0zM1000 0V860H1004V0zM1200 0V860H1204V0zM1400 0V860H1404V0z" />
          </g>
          <rect x="1180" y="72" width="320" height="220" fill="#10172E" stroke="#7FA6FF" stroke-width="6" />
          <rect x="1204" y="96" width="180" height="16" fill="#7C5CFF" />
          <rect x="1204" y="128" width="240" height="12" fill="#4B5D92" />
          <rect x="1204" y="152" width="200" height="12" fill="#4B5D92" />
          <rect x="1204" y="196" width="110" height="64" fill="#2DD4BF" />
        </svg>
      </div>
      <div class="plate-icons">
        <div class="desk-icon">
          <svg viewBox="0 0 32 32" shape-rendering="crispEdges">
            <rect x="3" y="6" width="10" height="4" fill="#FFB86B" />
            <rect x="3" y="10" width="26" height="17" fill="#F59E0B" />
            <rect x="5" y="12" width="22" height="13" fill="#FDE68A" />
          </svg>
          <span data-i18n="os.icon.projects">My projects</span>
        </div>
        <div class="desk-icon">
          <svg viewBox="0 0 32 32" shape-rendering="crispEdges">
            <rect x="6" y="4" width="20" height="24" fill="#F7F5EF" />
            <rect x="9" y="9" width="14" height="2" fill="#0B1020" />
            <rect x="9" y="14" width="10" height="2" fill="#7C5CFF" />
            <rect x="9" y="19" width="14" height="2" fill="#0B1020" />
          </svg>
          <span data-i18n="os.icon.sketches">My sketches</span>
        </div>
        <div class="desk-icon">
          <svg viewBox="0 0 32 32" shape-rendering="crispEdges">
            <rect x="7" y="6" width="18" height="22" fill="#8E9CC0" />
            <rect x="5" y="4" width="22" height="3" fill="#CBD5E1" />
            <rect x="11" y="11" width="2" height="12" fill="#141B33" />
            <rect x="15" y="11" width="2" height="12" fill="#141B33" />
            <rect x="19" y="11" width="2" height="12" fill="#141B33" />
          </svg>
          <span data-i18n="os.icon.drafts">Old drafts</span>
        </div>
      </div>
      <div class="plate-chrome">
        <div class="taskbar">
          <div class="tb-start"><span>RV</span> <span>ZAMBALES-OS 1.0</span></div>
          <div class="tb-clock">09:41</div>
        </div>
      </div>
    `;
  }

  if (era === 2) {
    // Era 2: Glossy Skeuomorphic Gradients & Highlights
    return `
      <div class="plate-wallpaper">
        <svg viewBox="0 0 1600 914" preserveAspectRatio="none">
          <defs>
            <linearGradient id="g2-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#1E1448" />
              <stop offset="50%" stop-color="#163268" />
              <stop offset="100%" stop-color="#0B1838" />
            </linearGradient>
            <radialGradient id="g2-orb1" cx="75%" cy="28%" r="45%">
              <stop offset="0%" stop-color="#FFB86B" stop-opacity="0.55" />
              <stop offset="45%" stop-color="#7C5CFF" stop-opacity="0.38" />
              <stop offset="100%" stop-color="#7C5CFF" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="g2-orb2" cx="25%" cy="72%" r="45%">
              <stop offset="0%" stop-color="#2DD4BF" stop-opacity="0.45" />
              <stop offset="60%" stop-color="#7FA6FF" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#0B1020" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="g2-folder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFE082" />
              <stop offset="100%" stop-color="#F57C00" />
            </linearGradient>
            <linearGradient id="g2-doc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#B3E5FC" />
            </linearGradient>
          </defs>
          <rect width="1600" height="914" fill="url(#g2-bg)" />
          <circle cx="1180" cy="260" r="640" fill="url(#g2-orb1)" />
          <circle cx="420" cy="660" r="620" fill="url(#g2-orb2)" />
          <path d="M0 540 Q 460 360 920 520 T 1600 440 L 1600 914 L 0 914 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M0 640 Q 520 480 1080 620 T 1600 560 L 1600 914 L 0 914 Z" fill="rgba(124,92,255,0.12)" />
        </svg>
      </div>
      <div class="plate-icons">
        <div class="desk-icon">
          <svg viewBox="0 0 64 64">
            <rect x="6" y="14" width="22" height="10" rx="4" fill="url(#g2-folder)" />
            <rect x="6" y="20" width="52" height="36" rx="8" fill="url(#g2-folder)" stroke="#FFFFFF" stroke-width="1.5" />
            <ellipse cx="32" cy="26" rx="22" ry="5" fill="rgba(255,255,255,0.45)" />
          </svg>
          <span data-i18n="os.icon.projects">My projects</span>
        </div>
        <div class="desk-icon">
          <svg viewBox="0 0 64 64">
            <rect x="12" y="8" width="40" height="48" rx="8" fill="url(#g2-doc)" stroke="#FFFFFF" stroke-width="1.5" />
            <circle cx="32" cy="32" r="11" fill="#7C5CFF" />
            <ellipse cx="32" cy="14" rx="16" ry="4" fill="rgba(255,255,255,0.65)" />
          </svg>
          <span data-i18n="os.icon.sketches">My sketches</span>
        </div>
        <div class="desk-icon">
          <svg viewBox="0 0 64 64">
            <rect x="14" y="14" width="36" height="42" rx="8" fill="url(#g2-doc)" stroke="#7FA6FF" stroke-width="2" />
            <rect x="22" y="24" width="20" height="4" rx="2" fill="#1E293B" />
            <rect x="22" y="34" width="14" height="4" rx="2" fill="#7C5CFF" />
          </svg>
          <span data-i18n="os.icon.drafts">Old drafts</span>
        </div>
      </div>
      <div class="plate-chrome">
        <div class="taskbar">
          <div class="tb-start"><span>RV</span> <span>GLOSS-STUDIO</span></div>
          <div class="tb-clock">09:41</div>
        </div>
      </div>
    `;
  }

  // Era 3: Flat Clean Modern Tablet OS with 5-icon centred dock + tray (wifi, volume, battery, clock)
  return `
    <div class="plate-wallpaper">
      <svg viewBox="0 0 1600 914" preserveAspectRatio="none">
        <defs>
          <radialGradient id="g3-glow" cx="50%" cy="95%" r="75%">
            <stop offset="0%" stop-color="#7C5CFF" stop-opacity="0.38" />
            <stop offset="48%" stop-color="#141B33" stop-opacity="0.92" />
            <stop offset="100%" stop-color="#0B1020" stop-opacity="1" />
          </radialGradient>
        </defs>
        <rect width="1600" height="914" fill="url(#g3-glow)" />
        <g stroke="rgba(255,255,255,0.06)" stroke-width="1.5" fill="none">
          <circle cx="800" cy="900" r="240" />
          <circle cx="800" cy="900" r="420" />
          <circle cx="800" cy="900" r="600" />
          <circle cx="800" cy="900" r="780" />
        </g>
      </svg>
    </div>
    <div class="plate-icons">
      <div class="desk-icon">
        <svg viewBox="0 0 64 64">
          <rect x="8" y="16" width="48" height="36" rx="10" fill="#7C5CFF" />
          <rect x="14" y="24" width="22" height="6" rx="3" fill="#F7F5EF" />
        </svg>
        <span data-i18n="os.icon.projects">My projects</span>
      </div>
      <div class="desk-icon">
        <svg viewBox="0 0 64 64">
          <rect x="12" y="10" width="40" height="44" rx="10" fill="#1E294B" stroke="#7FA6FF" stroke-width="2" />
          <path d="M22 36L30 26L42 38" stroke="#2DD4BF" stroke-width="3.5" stroke-linecap="round" fill="none" />
        </svg>
        <span data-i18n="os.icon.sketches">My sketches</span>
      </div>
      <div class="desk-icon">
        <svg viewBox="0 0 64 64">
          <rect x="14" y="12" width="36" height="40" rx="10" fill="#1E294B" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
          <circle cx="32" cy="32" r="8" fill="#FFB86B" />
        </svg>
        <span data-i18n="os.icon.drafts">Old drafts</span>
      </div>
    </div>
    <div class="plate-chrome">
      <div class="taskbar">
        <div class="tb-start"><span>RV</span> <span>Canvas 11</span></div>
        <div class="modern-dock">
          <div class="dock-app" style="background:#7C5CFF"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg></div>
          <div class="dock-app" style="background:#2DD4BF"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1020" stroke-width="2"><path d="M12 3L20 19H4L12 3Z"/></svg></div>
          <div class="dock-app" style="background:#FFB86B"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1020" stroke-width="2"><circle cx="12" cy="12" r="7"/></svg></div>
          <div class="dock-app" style="background:#7FA6FF"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1020" stroke-width="2"><path d="M4 7H20M4 12H16M4 17H12"/></svg></div>
          <div class="dock-app" style="background:#1E294B"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E6E0FF" stroke-width="2"><path d="M8 9L11 12L8 15M13 15H16"/></svg></div>
        </div>
        <div class="tb-tray">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <svg width="18" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/></svg>
          <span>09:41</span>
        </div>
      </div>
    </div>
  `;
}

export function createOsLayer({
  mountEl,
  modernScreenMesh,
  camera,
  getScreenSize,
  isReducedMotion,
  sfx,
  riser,
  onScrollToPv,
  onShowHint,
}) {
  const layer = document.createElement('section');
  layer.className = 'os-layer';
  layer.setAttribute('data-i18n-aria', 'os.aria');
  layer.setAttribute('aria-label', window.L ? window.L('Computer screen', 'Screen ng computer') : 'Computer screen');

  // Build 24 cells for segmented bar
  let segCellsHtml = '';
  for (let i = 0; i < 24; i++) {
    segCellsHtml += `<div class="uw-seg" data-seg="${i}"></div>`;
  }

  layer.innerHTML = `
    <div class="sr-only" aria-live="polite" id="os-live-region"></div>
    <div class="os-stage" id="os-stage" data-skin="1">
      <div class="skins-wrap">
        <div class="skin cur" data-era="1">${buildSkinMarkup(1)}</div>
        <div class="skin" data-era="2">${buildSkinMarkup(2)}</div>
        <div class="skin" data-era="3">${buildSkinMarkup(3)}</div>
        <div class="light-wave" id="os-light-wave"></div>
      </div>

      <!-- Morphing Update Window (1 structure across skins) -->
      <div class="update-win" id="update-win">
        <div class="uw-header">
          <span data-i18n="os.win.header">canvas-updater.exe</span>
          <span class="uw-close" aria-hidden="true">×</span>
        </div>
        <div class="uw-body">
          <div class="uw-icon" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="12" fill="#7C5CFF" />
              <path d="M32 18V42M32 18L22 28M32 18L42 28" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h3 class="uw-title" data-i18n="os.win.title">Update available</h3>
          <p class="uw-sub">Canvas <b id="uw-ver-num">7</b></p>
          <div class="uw-progress-wrap">
            <div class="uw-segments" id="uw-segments">${segCellsHtml}</div>
            <div class="uw-smooth-bar"><div class="uw-smooth-fill" id="uw-smooth-fill"></div></div>
          </div>
          <button type="button" class="uw-hold-btn" id="uw-hold-btn">
            <span id="uw-hold-label" data-i18n="os.btn.hold">PRESS AND HOLD</span>
            <span class="btn-ring" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <!-- Red Monochrome Error Overlay -->
      <div class="error-fx" id="error-fx" aria-hidden="true"></div>

      <!-- Three Story Dialogs (Statement, Error, Success) -->
      <div class="dialogs-wrap">
        <!-- 1. STATEMENT -->
        <article class="os-dialog" id="dlg-statement" data-dlg="statement" inert>
          <header class="dlg-bar">
            <span>rj-verceles/statement</span>
            <span class="dlg-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </header>
          <div class="dlg-body">
            <p class="dlg-eyebrow" data-i18n="dlg.statement.eyebrow">It all starts with curiosity — from paper in Zambales to real tools</p>
            <h3 class="dlg-title">
              <span data-i18n="dlg.statement.line1">I DON'T DECORATE.</span>
              <span data-i18n="dlg.statement.line2">I SOLVE THE TASK: SO PEOPLE NOTICE IT, AND SO IT WORKS.</span>
            </h3>
          </div>
          <div class="dlg-action-wrap">
            <button type="button" class="dlg-btn" id="btn-statement">
              <span class="arm-bar" aria-hidden="true"></span>
              <span data-i18n="dlg.statement.btn">Continue</span>
              <svg aria-hidden="true"><use href="#i-right"></use></svg>
              <span class="btn-ring" aria-hidden="true"></span>
            </button>
          </div>
        </article>

        <!-- 2. ERROR -->
        <article class="os-dialog" id="dlg-error" data-dlg="error" inert>
          <header class="dlg-bar">
            <span>rj-verceles/launch-error</span>
            <span class="dlg-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </header>
          <div class="dlg-body">
            <p class="dlg-eyebrow" data-i18n="dlg.error.eyebrow">Error: sketch_not_found</p>
            <h3 class="dlg-title">
              <span data-i18n="dlg.error.line1">ONE LAUNCH BROKE. BLANK PAGE.</span>
              <span data-i18n="dlg.error.line2">THE DEADLINE DIDN'T MOVE. I FIXED IT LINE BY LINE — TEST, FIX, TEST AGAIN.</span>
            </h3>
          </div>
          <div class="dlg-action-wrap">
            <button type="button" class="dlg-btn" id="btn-error">
              <span class="arm-bar" aria-hidden="true"></span>
              <span data-i18n="dlg.error.btn">Try again</span>
              <svg aria-hidden="true"><use href="#i-redo"></use></svg>
              <span class="btn-ring" aria-hidden="true"></span>
            </button>
          </div>
        </article>

        <!-- 3. SUCCESS -->
        <article class="os-dialog" id="dlg-success" data-dlg="success" inert>
          <header class="dlg-bar">
            <span>rj-verceles/shipped</span>
            <span class="dlg-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </header>
          <div class="dlg-body">
            <p class="dlg-eyebrow" data-i18n="dlg.success.eyebrow">Update complete · Canvas 11</p>
            <h3 class="dlg-title">
              <span data-i18n="dlg.success.line1">THE CALM VERSION SHIPPED.</span>
              <span data-i18n="dlg.success.line2">NOT THE LOUDEST WORK — THE ONE THAT WORKED.</span>
              <span data-i18n="dlg.success.line3">PEOPLE USED IT, AND IT SOLD.</span>
            </h3>
          </div>
          <div class="dlg-action-wrap">
            <button type="button" class="dlg-btn" id="btn-success">
              <span class="arm-bar" aria-hidden="true"></span>
              <span data-i18n="dlg.success.btn">Done</span>
              <svg aria-hidden="true"><use href="#i-down"></use></svg>
              <span class="btn-ring" aria-hidden="true"></span>
            </button>
          </div>
        </article>
      </div>
    </div>
  `;

  mountEl.appendChild(layer);
  if (window.applyLang) window.applyLang();

  const liveRegion = layer.querySelector('#os-live-region');
  const stageEl = layer.querySelector('#os-stage');
  const skinEls = Array.from(layer.querySelectorAll('.skin'));
  const waveEl = layer.querySelector('#os-light-wave');
  const updateWin = layer.querySelector('#update-win');
  const verNumEl = layer.querySelector('#uw-ver-num');
  const segEls = Array.from(layer.querySelectorAll('.uw-seg'));
  const smoothFillEl = layer.querySelector('#uw-smooth-fill');
  const holdBtn = layer.querySelector('#uw-hold-btn');
  const holdLabel = layer.querySelector('#uw-hold-label');
  const cursorPill = document.getElementById('cursor-pill');

  const dlgEls = {
    statement: layer.querySelector('#dlg-statement'),
    error: layer.querySelector('#dlg-error'),
    success: layer.querySelector('#dlg-success'),
  };
  const dlgBtns = {
    statement: layer.querySelector('#btn-statement'),
    error: layer.querySelector('#btn-error'),
    success: layer.querySelector('#btn-success'),
  };

  // Prevent contextmenu and text selection inside OS layer
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  layer.addEventListener('selectstart', (e) => e.preventDefault());

  const gates = {
    hold: { done: false, armedAt: 0 },
    statement: { done: false, armedAt: 0, shown: false },
    error: { done: false, armedAt: 0, shown: false },
    success: { done: false, armedAt: 0, shown: false },
  };

  const hold = {
    h: 0,
    down: false,
    tension: 0,
    downStartAt: 0,
    keepTipUntil: 0,
    currentSkinEra: 1,
    pointerLocalX: 800,
    pointerLocalY: 457,
    overLayer: false,
  };

  const pillSpring = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    targetX: window.innerWidth * 0.5,
    targetY: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
  };

  let currentPv = 0;
  let lastNudgeAt = 0;
  let lastTransformKey = '';
  let lastOpacity = -1;
  let isLive = false;

  const isCoarsePointer = () =>
    window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;

  function setSkinEra(nextEra) {
    if (nextEra === hold.currentSkinEra) return;
    const prevEra = hold.currentSkinEra;
    hold.currentSkinEra = nextEra;
    stageEl.setAttribute('data-skin', String(nextEra));

    // Flip target version label Canvas 7 -> Canvas 11 as era changes
    verNumEl.textContent = nextEra >= 2 ? '11' : '7';

    skinEls.forEach((el) => {
      const eNum = Number(el.getAttribute('data-era'));
      el.classList.remove('cur', 'prev', 'enter');
      if (eNum === nextEra) {
        el.classList.add('cur', 'enter');
      } else if (eNum === prevEra) {
        el.classList.add('prev');
      }
    });

    if (!isCoarsePointer() && !isReducedMotion()) {
      waveEl.classList.remove('active');
      void waveEl.offsetWidth;
      waveEl.classList.add('active');
    }

    if (liveRegion) {
      liveRegion.textContent =
        nextEra === 2
          ? 'Updated to Canvas 7 glossy interface'
          : nextEra === 3
          ? 'Updated to Canvas 11 modern interface'
          : 'Canvas 1 interface';
    }
  }

  function updateHoldButtonCopy() {
    const now = performance.now();
    if (hold.down) {
      const pair = window.I18N_STRINGS?.['os.btn.updating'];
      holdLabel.textContent = pair ? (window.__LANG === 'fil' ? pair[1] : pair[0]) : 'UPDATING...';
    } else if (now < hold.keepTipUntil) {
      const pair = window.I18N_STRINGS?.['os.btn.keep'];
      holdLabel.textContent = pair ? (window.__LANG === 'fil' ? pair[1] : pair[0]) : 'KEEP HOLDING';
    } else {
      const pair = window.I18N_STRINGS?.['os.btn.hold'];
      holdLabel.textContent = pair ? (window.__LANG === 'fil' ? pair[1] : pair[0]) : 'PRESS AND HOLD';
    }
  }

  function canStartHold() {
    return !gates.hold.done && currentPv >= OS_TIMES.gates.hold.show - 4;
  }

  function beginHold() {
    if (!canStartHold() || hold.down) return;
    hold.down = true;
    hold.downStartAt = performance.now();
    hold.keepTipUntil = 0;
    holdBtn.classList.add('holding');
    updateHoldButtonCopy();

    if (sfx) sfx('click', 0.28);
    if (riser) riser.start(hold.h / STAGES);
    if (currentPv < OS_TIMES.gates.hold.at - 1 && onScrollToPv) {
      onScrollToPv(OS_TIMES.gates.hold.at);
    }
  }

  function endHold() {
    if (!hold.down) return;
    hold.down = false;
    holdBtn.classList.remove('holding');
    if (riser) riser.stop(0.18);

    const heldMs = performance.now() - hold.downStartAt;
    if (!gates.hold.done && heldMs < 450) {
      hold.keepTipUntil = performance.now() + 1600;
    }
    updateHoldButtonCopy();
  }

  // Mouse/pen pointerdown on BUTTON ONLY
  holdBtn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    e.preventDefault();
    beginHold();
  });
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    endHold();
  });
  window.addEventListener('pointercancel', (e) => {
    if (e.pointerType === 'touch') return;
    endHold();
  });

  // Touch uses touchstart / touchend / touchcancel on the button
  holdBtn.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      beginHold();
    },
    { passive: false }
  );
  window.addEventListener('touchend', () => endHold(), { passive: true });
  window.addEventListener('touchcancel', () => endHold(), { passive: true });

  // Keyboard Space / Enter hold (ignore repeats)
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if ((e.key === ' ' || e.key === 'Enter') && canStartHold() && !gates.hold.done) {
      // Only start hold if hold gate is waiting
      const first = getFirstUnfinishedGate(gates);
      if (first && first.id === 'hold') {
        e.preventDefault();
        beginHold();
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      endHold();
    }
  });

  // Pointer tracking for tension lean & desktop cursor pill
  window.addEventListener(
    'pointermove',
    (e) => {
      pillSpring.targetX = e.clientX + 26;
      pillSpring.targetY = e.clientY + 14;
      const rect = layer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        hold.overLayer = inside;
        if (inside) {
          hold.pointerLocalX = ((e.clientX - rect.left) / rect.width) * 1600;
          hold.pointerLocalY = ((e.clientY - rect.top) / rect.height) * 914;
        }
      }
    },
    { passive: true }
  );

  // Dialog button click handlers with ARMING check
  function handleDialogClick(key, sfxName) {
    const g = gates[key];
    if (!g || g.done) return;
    const now = performance.now();
    if (now < g.armedAt) return; // Ignore clicks until armed

    g.done = true;
    const btn = dlgBtns[key];
    const dlg = dlgEls[key];

    if (sfx) sfx(sfxName, 0.32);
    if (btn) {
      btn.classList.add('is-pressing');
      window.setTimeout(() => btn.classList.remove('is-pressing'), 260);
    }
    if (dlg) {
      dlg.classList.add('sent');
    }

    if (key === 'error') {
      stageEl.classList.add('glitch');
      window.setTimeout(() => stageEl.classList.remove('glitch'), 1100);
    }

    const spec = OS_TIMES.gates[key];
    if (spec && onScrollToPv) {
      onScrollToPv(spec.next);
    }
  }

  dlgBtns.statement.addEventListener('click', () => handleDialogClick('statement', 'next'));
  dlgBtns.error.addEventListener('click', () => handleDialogClick('error', 'error'));
  dlgBtns.success.addEventListener('click', () => handleDialogClick('success', 'done'));

  /**
   * Bounces the active waiting card, pulses its button, and shows a 4s hint pill.
   */
  function nudge() {
    const now = performance.now();
    if (now - lastNudgeAt < 450) return;
    lastNudgeAt = now;

    const first = getFirstUnfinishedGate(gates);
    if (!first) return;

    if (first.id === 'hold') {
      updateWin.classList.remove('nudge-bounce');
      holdBtn.classList.remove('pulse-nudge');
      void updateWin.offsetWidth;
      updateWin.classList.add('nudge-bounce');
      holdBtn.classList.add('pulse-nudge');
      if (onShowHint) onShowHint('hold', 4000);
    } else {
      const dlg = dlgEls[first.id];
      const btn = dlgBtns[first.id];
      if (dlg && btn) {
        dlg.classList.remove('nudge-bounce');
        btn.classList.remove('pulse-nudge');
        void dlg.offsetWidth;
        dlg.classList.add('nudge-bounce');
        btn.classList.add('pulse-nudge');
      }
      if (onShowHint) onShowHint('button', 4000);
    }
  }

  function setDialogVisibility(activeKey) {
    const armDelay = isReducedMotion() ? 250 : 750;
    const keys = ['statement', 'error', 'success'];

    stageEl.classList.toggle('has-error', activeKey === 'error');

    for (const k of keys) {
      const dlg = dlgEls[k];
      const g = gates[k];
      const shouldShow = k === activeKey;
      if (shouldShow) {
        if (!g.shown) {
          g.shown = true;
          g.armedAt = performance.now() + armDelay;
          dlg.classList.remove('sent');
          dlg.classList.add('visible');
          dlg.removeAttribute('inert');
          if (liveRegion) {
            const titleEl = dlg.querySelector('.dlg-title');
            if (titleEl) liveRegion.textContent = titleEl.textContent;
          }
        }
      } else {
        if (g.shown) {
          g.shown = false;
          dlg.classList.remove('visible');
          dlg.setAttribute('inert', '');
        }
      }
    }
  }

  const cornerTL = new THREE.Vector3();
  const cornerBR = new THREE.Vector3();

  /**
   * Projects SCREEN_modern's top-left and bottom-right corners to screen space
   * and updates the 1600x914 layer transform + hold progress + tension + dialogs.
   */
  function update(realDt, tState) {
    currentPv = tState.pv;
    const dt = Math.min(0.25, Math.max(0.001, realDt));

    // 1. Update layer opacity and .live state
    if (Math.abs(tState.osOpacity - lastOpacity) > 0.002) {
      lastOpacity = tState.osOpacity;
      layer.style.opacity = tState.osOpacity.toFixed(3);
      layer.style.visibility = tState.osOpacity > 0.005 ? 'visible' : 'hidden';
    }
    if (tState.osLive !== isLive) {
      isLive = tState.osLive;
      layer.classList.toggle('live', isLive);
    }

    // 2. Project SCREEN_modern corners to position and scale the 1600x914 design box
    if (tState.osOpacity > 0.005 && modernScreenMesh) {
      const { width, height } = getScreenSize();
      const geomParams = modernScreenMesh.geometry.parameters;
      const halfW = (geomParams?.width || 0.74) * 0.5;
      const halfH = (geomParams?.height || 0.4227) * 0.5;

      cornerTL.set(-halfW, halfH, 0).applyMatrix4(modernScreenMesh.matrixWorld).project(camera);
      cornerBR.set(halfW, -halfH, 0).applyMatrix4(modernScreenMesh.matrixWorld).project(camera);

      const x0 = (cornerTL.x * 0.5 + 0.5) * width;
      const y0 = (-cornerTL.y * 0.5 + 0.5) * height;
      const x1 = (cornerBR.x * 0.5 + 0.5) * width;
      const y1 = (-cornerBR.y * 0.5 + 0.5) * height;

      const sx = Math.max(0.05, (x1 - x0) / 1600);
      const sy = Math.max(0.05, (y1 - y0) / 914);

      const tKey = `${x0.toFixed(1)}_${y0.toFixed(1)}_${sx.toFixed(4)}_${sy.toFixed(4)}`;
      if (tKey !== lastTransformKey) {
        lastTransformKey = tKey;
        layer.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      }
    }

    // 3. Advance hold-to-progress state
    const stageSec = isReducedMotion() ? BASE_STAGE_SEC * 0.6 : BASE_STAGE_SEC;
    if (!gates.hold.done) {
      if (hold.down) {
        hold.h += dt / stageSec;
        if (hold.h >= STAGES) {
          hold.h = STAGES;
          hold.down = false;
          holdBtn.classList.remove('holding');
          gates.hold.done = true;
          if (riser) riser.stop(0.15);
          if (sfx) sfx('start', 0.35);
          setSkinEra(3);
          if (onScrollToPv) onScrollToPv(OS_TIMES.gates.hold.next);
        }
      } else {
        const floorStage = Math.floor(hold.h);
        if (hold.h > floorStage) {
          hold.h = Math.max(floorStage, hold.h - dt * 1.6);
        }
      }

      // Era is driven by h: h < 1 is era 1; h >= 1 is era 2; done or h >= 2 is era 3
      const targetEra = gates.hold.done || hold.h >= 2 ? 3 : hold.h >= 1 ? 2 : 1;
      setSkinEra(targetEra);

      // Update 24-cell segmented bar & smooth bar with fractional part of h
      const frac = gates.hold.done ? 1 : hold.h - Math.floor(hold.h);
      const activeCells = Math.round(frac * 24);
      for (let i = 0; i < 24; i++) {
        segEls[i].classList.toggle('on', i < activeCells);
      }
      smoothFillEl.style.width = `${(frac * 100).toFixed(1)}%`;
    } else if (hold.currentSkinEra !== 3) {
      setSkinEra(3);
    }

    updateHoldButtonCopy();

    // 4. Update hold tension (eases to 1 at 4/s while holding, back to 0 at 9/s)
    if (isReducedMotion()) {
      hold.tension = 0;
    } else if (hold.down && !gates.hold.done) {
      hold.tension = Math.min(1, hold.tension + dt * 4);
    } else {
      hold.tension = Math.max(0, hold.tension - dt * 9);
    }

    const t = hold.tension;
    if (t > 0.001) {
      const jx = t > 0.3 ? (Math.random() - 0.5) * 6 * t : 0;
      const jy = t > 0.3 ? (Math.random() - 0.5) * 6 * t : 0;
      const scX = 1 + 0.045 * t;
      const scY = 1 + 0.06 * t;
      stageEl.style.setProperty('--px', `${hold.pointerLocalX.toFixed(0)}px`);
      stageEl.style.setProperty('--py', `${hold.pointerLocalY.toFixed(0)}px`);
      stageEl.style.transform = `translate3d(${jx.toFixed(1)}px, ${jy.toFixed(1)}px, 0) scale(${scX.toFixed(4)}, ${scY.toFixed(4)})`;
      if (!isCoarsePointer()) {
        stageEl.style.filter = `saturate(${(1 + 0.4 * t).toFixed(2)}) brightness(${(1 + 0.12 * t).toFixed(2)})`;
      }
    } else {
      stageEl.style.transform = '';
      stageEl.style.filter = '';
    }

    // 5. Determine which dialog (if any) is active
    let activeDialog = null;
    if (gates.hold.done) {
      if (!gates.statement.done && currentPv >= OS_TIMES.gates.hold.at) {
        activeDialog = 'statement';
      } else if (
        gates.statement.done &&
        !gates.error.done &&
        currentPv >= OS_TIMES.gates.error.show - 6
      ) {
        activeDialog = 'error';
      } else if (
        gates.error.done &&
        !gates.success.done &&
        currentPv >= OS_TIMES.gates.success.show - 6
      ) {
        activeDialog = 'success';
      }
    }
    setDialogVisibility(activeDialog);

    // 6. Update desktop cursor-following spring pill
    if (cursorPill && !isCoarsePointer()) {
      const showPill =
        isLive &&
        !gates.hold.done &&
        currentPv >= OS_TIMES.gates.hold.show - 6 &&
        hold.overLayer &&
        !hold.down;
      cursorPill.classList.toggle('shown', showPill);

      const k = 1 - Math.exp(-dt * 16);
      const nextX = pillSpring.x + (pillSpring.targetX - pillSpring.x) * k;
      const nextY = pillSpring.y + (pillSpring.targetY - pillSpring.y) * k;
      pillSpring.vx = (nextX - pillSpring.x) / dt;
      pillSpring.vy = (nextY - pillSpring.y) / dt;
      pillSpring.x = nextX;
      pillSpring.y = nextY;

      const scaleVal = showPill ? 1 : 0.8;
      if (isReducedMotion()) {
        cursorPill.style.transform = `translate3d(${pillSpring.x.toFixed(1)}px, ${pillSpring.y.toFixed(1)}px, 0) scale(${scaleVal})`;
      } else {
        const rotY = clamp(pillSpring.vx * 0.03, -28, 28);
        const rotX = clamp(-pillSpring.vy * 0.03, -22, 22);
        const rotZ = clamp(pillSpring.vx * 0.008, -10, 10);
        cursorPill.style.transform = `perspective(400px) translate3d(${pillSpring.x.toFixed(1)}px, ${pillSpring.y.toFixed(1)}px, 0) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scaleVal})`;
      }
    }
  }

  function reset() {
    gates.hold.done = false;
    gates.statement.done = false;
    gates.statement.shown = false;
    gates.error.done = false;
    gates.error.shown = false;
    gates.success.done = false;
    gates.success.shown = false;

    hold.h = 0;
    hold.down = false;
    hold.tension = 0;
    hold.keepTipUntil = 0;
    setSkinEra(1);
    setDialogVisibility(null);
    for (let i = 0; i < 24; i++) segEls[i].classList.remove('on');
    smoothFillEl.style.width = '0%';
    updateHoldButtonCopy();
  }

  function skipAll() {
    gates.hold.done = true;
    gates.statement.done = true;
    gates.error.done = true;
    gates.success.done = true;
    hold.h = STAGES;
    hold.down = false;
    hold.tension = 0;
    if (riser) riser.stop(0.1);
    setSkinEra(3);
    setDialogVisibility(null);
  }

  return {
    layer,
    gates,
    hold,
    update,
    nudge,
    reset,
    skipAll,
    getTension: () => hold.tension,
    isHolding: () => hold.down,
  };
}
