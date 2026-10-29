import * as THREE from 'three';
import { clamp } from './timeline.js';

/**
 * HTML Headlines locked to the 3D wall anchor (0, 1.925, -1.28).
 * - Real selectable, accessible, translatable DOM text (<h2 class="wall-copy">)
 * - Sized ONCE per resize from the FINAL wide shot (--big = 0.35m * ppm, --lead = 0.077m * ppm)
 * - Every frame ONLY updates transform (translate3d + scale) and per-line staggered --rise
 * - Clamps vertical placement within {min, max} so it never clips under the header or covers the monitor
 */

const WALL_ANCHOR = new THREE.Vector3(0, 1.925, -1.28);
const WALL_ANCHOR_PLUS_1M = new THREE.Vector3(1, 1.925, -1.28);

export function createWallTextManager({ stageEl, getWideCamera, getScreenSize, roomInfo }) {
  const copy = window.STORY_COPY || {};

  function buildHeadlineDom(id, leadKey, bigKey, leadDefault, bigDefault) {
    const h2 = document.createElement('h2');
    h2.className = 'wall-copy';
    h2.id = id;

    const line0Outer = document.createElement('span');
    const line0Inner = document.createElement('span');
    line0Inner.className = 'lead';
    line0Inner.textContent = leadDefault;
    line0Outer.appendChild(line0Inner);

    const line1Outer = document.createElement('span');
    const line1Inner = document.createElement('span');
    line1Inner.className = 'big';
    line1Inner.textContent = bigDefault;
    line1Outer.appendChild(line1Inner);

    h2.appendChild(line0Outer);
    h2.appendChild(line1Outer);
    stageEl.appendChild(h2);

    return {
      el: h2,
      lines: [line0Inner, line1Inner],
      leadKey,
      bigKey,
      lastScale: 1,
      visible: false,
      live: false,
    };
  }

  const h1 = buildHeadlineDom(
    'wall-copy-1',
    'wall1.lead',
    'wall1.big',
    copy.wall1?.leadEn || 'It all starts with curiosity. I started on paper, in Zambales.',
    copy.wall1?.bigEn || 'A PROBLEM TO SOLVE — NOT DECORATION.'
  );

  const h2 = buildHeadlineDom(
    'wall-copy-2',
    'wall2.lead',
    'wall2.big',
    copy.wall2?.leadEn || 'Then the desk got glossy. Bright, loud — and hard to use.',
    copy.wall2?.bigEn || "BEAUTY FOR BEAUTY'S SAKE DOESN'T SELL."
  );

  function syncTextLanguage() {
    const w1 = window.STORY_COPY?.wall1 || {};
    const w2 = window.STORY_COPY?.wall2 || {};
    h1.lines[0].textContent = window.L ? window.L(w1.leadEn, w1.leadFil) : w1.leadEn;
    h1.lines[1].textContent = window.L ? window.L(w1.bigEn, w1.bigFil) : w1.bigEn;
    h2.lines[0].textContent = window.L ? window.L(w2.leadEn, w2.leadFil) : w2.leadEn;
    h2.lines[1].textContent = window.L ? window.L(w2.bigEn, w2.bigFil) : w2.bigEn;
  }

  syncTextLanguage();
  window.addEventListener('langchange', syncTextLanguage);

  let basePpm = 240;
  let measuredHeight = 140;
  const projA = new THREE.Vector3();
  const projB = new THREE.Vector3();
  const monitorTopWorld = new THREE.Vector3();

  /**
   * Sizes CSS variables --big and --lead ONCE per resize from the final WIDE camera pose.
   */
  function layoutFromWideShot() {
    const { width } = getScreenSize();
    const wideCam = getWideCamera();
    if (!wideCam || width <= 0) return;

    projA.copy(WALL_ANCHOR).project(wideCam);
    projB.copy(WALL_ANCHOR_PLUS_1M).project(wideCam);

    const ppm = Math.abs(projB.x - projA.x) * 0.5 * width;
    const isPortraitPhone = width < 768;
    const portraitScale = isPortraitPhone ? 1.02 : 1.0;

    basePpm = Math.max(80, ppm);
    const bigPx = isPortraitPhone
      ? Math.min(width * 0.108, 0.24 * basePpm)
      : Math.min(width * 0.052, 0.22 * basePpm);
    const leadPx = isPortraitPhone
      ? 18
      : Math.min(24, Math.max(16, 0.068 * basePpm));

    document.documentElement.style.setProperty('--big', `${bigPx.toFixed(1)}px`);
    document.documentElement.style.setProperty('--lead', `${leadPx.toFixed(1)}px`);
    measuredHeight = bigPx * 1.08 + leadPx * 1.65;
  }

  function updateSingleHeadline(item, inT, outT, camera, isModernMonitor) {
    const active = inT > 0.001 && outT < 0.999;
    if (!active) {
      if (item.visible) {
        item.visible = false;
        item.el.style.visibility = 'hidden';
      }
      if (item.live) {
        item.live = false;
        item.el.classList.remove('live');
      }
      return;
    }

    if (!item.visible) {
      item.visible = true;
      item.el.style.visibility = 'visible';
    }
    if (!item.live) {
      item.live = true;
      item.el.classList.add('live');
    }

    const { width, height } = getScreenSize();
    projA.copy(WALL_ANCHOR).project(camera);
    projB.copy(WALL_ANCHOR_PLUS_1M).project(camera);

    const currentPpm = Math.abs(projB.x - projA.x) * 0.5 * width;
    let k = basePpm > 0 ? currentPpm / basePpm : 1;

    // Ensure headline never overflows horizontal viewport margins
    const rawW = item.el.offsetWidth || width * 0.8;
    const maxAllowedW = width - 72;
    if (rawW * k > maxAllowedW && rawW > 0) {
      k = Math.min(k, maxAllowedW / rawW);
    }

    let screenX = (projA.x * 0.5 + 0.5) * width;
    let screenY = (-projA.y * 0.5 + 0.5) * height;

    // Room band clamp {min, max} between header and top of monitor case
    const minTop = 78;
    if (isModernMonitor) {
      monitorTopWorld.set(
        0,
        roomInfo.modernScreenCenter.y + roomInfo.modernScreenSize.y * 0.5,
        roomInfo.modernScreenCenter.z
      );
    } else {
      // Old monitor case top is ~15% above glass
      monitorTopWorld.set(
        0,
        roomInfo.oldScreenCenter.y + roomInfo.oldScreenSize.y * 0.65,
        roomInfo.oldScreenCenter.z
      );
    }
    monitorTopWorld.project(camera);
    const monitorTopPx = (-monitorTopWorld.y * 0.5 + 0.5) * height - 18;
    const maxBottom = Math.max(minTop + 80, monitorTopPx);
    const availH = maxBottom - minTop;

    const estH = measuredHeight * k;
    if (estH > availH && estH > 0) {
      const shrink = Math.max(0.6, availH / measuredHeight);
      k = Math.min(k, shrink);
    }

    const finalH = measuredHeight * k;
    if (screenY - finalH * 0.5 < minTop) {
      screenY = minTop + finalH * 0.5;
    }
    if (screenY + finalH * 0.5 > maxBottom) {
      screenY = Math.max(minTop + finalH * 0.5, maxBottom - finalH * 0.5);
    }

    if (Math.abs(k - item.lastScale) > 0.004) {
      item.lastScale = k;
    }

    item.el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${item.lastScale.toFixed(3)})`;

    // Staggered line rise animation:
    // up = 1 - clamp(inT * 1.6 - i * .6); away = clamp(outT * 1.6 - (1 - i) * .6); rise = (up > 0 ? up : -away) * 110%
    for (let i = 0; i < 2; i++) {
      const up = 1 - clamp(inT * 1.6 - i * 0.6, 0, 1);
      const away = clamp(outT * 1.6 - (1 - i) * 0.6, 0, 1);
      const risePct = (up > 0 ? up : -away) * 110;
      item.lines[i].style.setProperty('--rise', `${risePct.toFixed(2)}%`);
    }
  }

  function update(tState, camera) {
    updateSingleHeadline(h1, tState.wall1In, tState.wall1Out, camera, false);
    updateSingleHeadline(h2, tState.wall2In, tState.wall2Out, camera, true);
  }

  function dispose() {
    window.removeEventListener('langchange', syncTextLanguage);
    stageEl.innerHTML = '';
  }

  return {
    layoutFromWideShot,
    update,
    dispose,
  };
}
