import * as THREE from 'three';
import { undistortCrtUv } from './crt-screen.js';

/**
 * Low-res 360x270 pixel "connect" screen upscaled x4 into 1440x1080 with imageSmoothingEnabled=false.
 * Features original ASCII pixel sprites (sketchbook tablet device, interactive canvas grid target,
 * and stylus plug), a custom 6x11 1-px bitmap font cached layer, quadratic Bezier dotted cable,
 * and raycast barrel-undistorted pointer dragging + keyboard support.
 */

const LOW_W = 360;
const LOW_H = 270;
const HI_W = 1440;
const HI_H = 1080;

// Layout constants in low-res (360x270) px
export const CONNECT_LAYOUT = {
  device: { x: 42, y: 84, scale: 3 }, // 22*3 = 66w, 18*3 = 54h
  port: { x: 108, y: 112 },
  target: { x: 248, y: 86, scale: 3 }, // 20*3 = 60w, 17*3 = 51h
  socket: { x: 234, y: 112 },
  plugRest: { x: 146, y: 168 },
  plugScale: 3, // 9*3 = 27w, 5*3 = 15h
};

// Original 22x18 sketch-pad device sprite ('#' = frame, '.' = dark screen, '+' = accent screen, '=' = stand)
const SPRITE_DEVICE = [
  '  ##################  ',
  ' #..................# ',
  '#..++++++++++++++....#',
  '#..+............+....#',
  '#..+..###.......+..@.#',
  '#..+....###.....+....#',
  '#..+......###...+..@.#',
  '#..+........###.+....#',
  '#..+............+....#',
  '#..+..########..+....#',
  '#..+............+....#',
  '#..++++++++++++++....#',
  ' #..................# ',
  '  ##################  ',
  '        ======        ',
  '       ========       ',
  '     ============     ',
  '    ==============    ',
];

// Original 20x17 interactive web canvas target sprite ('#' = outer frame, '+' = inner grid/nodes, '*' = core)
const SPRITE_TARGET = [
  '    ############    ',
  '  ##............##  ',
  ' #..###..##..###..# ',
  '#..................#',
  '#..+----+--+----+..#',
  '#..|....|..|....|..#',
  '#..|..********..|..#',
  '#..+..*++++++*..+..#',
  '#..|..*+****+*..|..#',
  '#..+..*++++++*..+..#',
  '#..|..********..|..#',
  '#..|....|..|....|..#',
  '#..+----+--+----+..#',
  '#..................#',
  ' #..###......###..# ',
  '  ##............##  ',
  '    ############    ',
];

// Original 9x5 stylus-cable plug sprite ('#' = housing, '=' = grip, '>' = gold pins)
const SPRITE_PLUG = [
  ' #####   ',
  '#=====##>',
  '#=====###',
  '#=====##>',
  ' #####   ',
];

// Custom 6x11 (drawn as 5x9 active strokes in 6x11 cell) 1-pixel bitmap font for all uppercase letters & symbols
const GLYPHS_6X11 = {
  A: ['01110', '10001', '10001', '10001', '11111', '10001', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '10001', '11110', '10001', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '10000', '11110', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '10000', '11110', '10000', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10000', '10011', '10001', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '10001', '11111', '10001', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '11000', '10100', '10010', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '10001', '11110', '10000', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '10001', '11110', '10100', '10010', '10001', '10001'],
  S: ['01111', '10000', '10000', '10000', '01110', '00001', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  W: ['10001', '10001', '10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '01010', '00100', '01010', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '00100', '01000', '10000', '10000', '11111'],
  '-': ['00000', '00000', '00000', '00000', '11111', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawBitmapLine(ctx, text, centerX, topY, pixelSize, color) {
  const str = String(text || '').toUpperCase();
  const cellW = 6 * pixelSize;
  const totalW = str.length * cellW;
  let startX = Math.round(centerX - totalW * 0.5);

  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const rows = GLYPHS_6X11[ch] || GLYPHS_6X11[' '];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '1') {
          ctx.fillRect(startX + c * pixelSize, topY + r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    startX += cellW;
  }
}

export function createConnectScreen({
  screenMesh,
  camera,
  domElement,
  onConnected,
  sfx,
  maxAnisotropy = 8,
}) {
  const lowCanvas = document.createElement('canvas');
  lowCanvas.width = LOW_W;
  lowCanvas.height = LOW_H;
  const lowCtx = lowCanvas.getContext('2d');

  const hiCanvas = document.createElement('canvas');
  hiCanvas.width = HI_W;
  hiCanvas.height = HI_H;
  const hiCtx = hiCanvas.getContext('2d');
  hiCtx.imageSmoothingEnabled = false;

  // Cached full-resolution bitmap caption layer
  const captionCanvas = document.createElement('canvas');
  captionCanvas.width = HI_W;
  captionCanvas.height = HI_H;
  const capCtx = captionCanvas.getContext('2d');

  const texture = new THREE.CanvasTexture(hiCanvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.anisotropy = Math.min(8, maxAnisotropy);

  function buildCaptionCache() {
    capCtx.clearRect(0, 0, HI_W, HI_H);
    const prompts = window.STORY_COPY?.connectPrompt || {};
    const line1 = window.L
      ? window.L(
          prompts.line1En || 'DRAG THE STYLUS CABLE TO THE CANVAS PORT',
          prompts.line1Fil || 'IHILA ANG KABLE SA CANVAS PORT'
        )
      : 'DRAG THE STYLUS CABLE TO THE CANVAS PORT';
    const line2 = window.L
      ? window.L(
          prompts.line2En || 'OR PRESS ENTER TO CONNECT',
          prompts.line2Fil || 'O PINDUTIN ANG ENTER PARA KUMONEKTA'
        )
      : 'OR PRESS ENTER TO CONNECT';

    drawBitmapLine(capCtx, line1, HI_W * 0.5, 816, 4, '#E6E0FF');
    drawBitmapLine(capCtx, line2, HI_W * 0.5, 882, 3, '#7FA6FF');
  }

  buildCaptionCache();

  const state = {
    plugX: CONNECT_LAYOUT.plugRest.x,
    plugY: CONNECT_LAYOUT.plugRest.y,
    dragging: false,
    hovering: false,
    done: false,
    animatingKey: false,
    keyStartTime: 0,
    doneTime: 0,
    pulsePhase: 0,
    lastKey: '',
  };

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  function drawAsciiSprite(ctx, map, x0, y0, scale, palette) {
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ' ') continue;
        const col = palette[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x0 + c * scale), Math.round(y0 + r * scale), scale, scale);
      }
    }
  }

  function renderFrame(force = false) {
    const dx = state.plugX - CONNECT_LAYOUT.socket.x;
    const dy = state.plugY - CONNECT_LAYOUT.socket.y;
    const dist = Math.hypot(dx, dy);
    const near = state.done ? 1 : dist < 75 ? 1 - dist / 75 : 0;
    const nearBucket = Math.round(near * 12);
    const pulseStep = ( near > 0 || state.done ) ? Math.floor(state.pulsePhase * 6) % 12 : 0;

    const key = `${Math.round(state.plugX)}_${Math.round(state.plugY)}_${nearBucket}_${state.done ? 1 : 0}_${pulseStep}_${window.__LANG || 'en'}`;
    if (!force && key === state.lastKey) {
      return;
    }
    state.lastKey = key;

    // 1. Clear low-res canvas with deep CRT navy
    lowCtx.fillStyle = '#0B1020';
    lowCtx.fillRect(0, 0, LOW_W, LOW_H);

    // Subtle inner frame border in low-res
    lowCtx.fillStyle = '#141B33';
    lowCtx.fillRect(16, 16, LOW_W - 32, LOW_H - 32);
    lowCtx.fillStyle = '#0B1020';
    lowCtx.fillRect(18, 18, LOW_W - 36, LOW_H - 36);

    // 2. Installer-style dotted arrow between device and target while not done
    if (!state.done) {
      const arrowColor = near > 0.05 ? '#7FA6FF' : '#32416B';
      lowCtx.fillStyle = arrowColor;
      for (let x = 132; x <= 212; x += 8) {
        lowCtx.fillRect(x, 96, 3, 3);
      }
      // Arrowhead
      lowCtx.fillRect(208, 92, 3, 3);
      lowCtx.fillRect(211, 94, 3, 3);
      lowCtx.fillRect(208, 100, 3, 3);
      lowCtx.fillRect(211, 98, 3, 3);
    }

    // 3. Draw Sketch-pad Device sprite
    const devPalette = {
      '#': '#8E9CC0',
      '.': state.done ? '#1E3A8A' : '#141B33',
      '+': state.done ? '#7FA6FF' : '#3B4A78',
      '@': state.done ? '#2DD4BF' : '#7C5CFF',
      '=': '#536084',
    };
    drawAsciiSprite(
      lowCtx,
      SPRITE_DEVICE,
      CONNECT_LAYOUT.device.x,
      CONNECT_LAYOUT.device.y,
      CONNECT_LAYOUT.device.scale,
      devPalette
    );

    // 4. Pulsing pixel ring around the target when near (< 75 px)
    const targetCenterX = CONNECT_LAYOUT.target.x + 30;
    const targetCenterY = CONNECT_LAYOUT.target.y + 25;
    if (!state.done && near > 0.02) {
      const ringRadius = 36 + (pulseStep % 6) * 2;
      lowCtx.fillStyle = near > 0.5 ? '#2DD4BF' : '#7C5CFF';
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        const rx = Math.round(targetCenterX + Math.cos(ang) * ringRadius);
        const ry = Math.round(targetCenterY + Math.sin(ang) * ringRadius);
        lowCtx.fillRect(rx, ry, 2, 2);
      }
    }

    // 5. Draw Target Icon sprite (dim -> brighter when near -> bright/filled when done)
    const targetPalette = state.done
      ? {
          '#': '#FFFFFF',
          '.': '#1E2952',
          '+': '#2DD4BF',
          '-': '#7FA6FF',
          '|': '#7FA6FF',
          '*': '#7C5CFF',
        }
      : near > 0.05
      ? {
          '#': '#B9C8F0',
          '.': '#141B33',
          '+': '#7FA6FF',
          '-': '#5B73B8',
          '|': '#5B73B8',
          '*': '#7C5CFF',
        }
      : {
          '#': '#4B5982',
          '.': '#0F152B',
          '+': '#2C3759',
          '-': '#232D4B',
          '|': '#232D4B',
          '*': '#384670',
        };

    drawAsciiSprite(
      lowCtx,
      SPRITE_TARGET,
      CONNECT_LAYOUT.target.x,
      CONNECT_LAYOUT.target.y,
      CONNECT_LAYOUT.target.scale,
      targetPalette
    );

    // Socket port beside target
    lowCtx.fillStyle = state.done ? '#2DD4BF' : near > 0.2 ? '#FFB86B' : '#536084';
    lowCtx.fillRect(CONNECT_LAYOUT.socket.x + 10, CONNECT_LAYOUT.socket.y - 6, 6, 15);

    // Rest hook under the cable before plug is taken
    if (!state.done && !state.dragging) {
      lowCtx.fillStyle = '#283354';
      lowCtx.fillRect(CONNECT_LAYOUT.plugRest.x + 8, CONNECT_LAYOUT.plugRest.y + 15, 10, 3);
    }

    // 6. Quadratic Bezier Cable from port to plug with 2x2 pixel dots
    const p0x = CONNECT_LAYOUT.port.x;
    const p0y = CONNECT_LAYOUT.port.y;
    const p2x = state.plugX;
    const p2y = state.plugY + 7;
    const sag = state.done ? 6 : 26 - near * 14;
    const p1x = (p0x + p2x) * 0.5;
    const p1y = Math.max(p0y, p2y) + sag;

    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const inv = 1 - t;
      const bx = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
      const by = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;

      // Data pixels travel along the cable when connected
      const isDataBit = state.done && (i + (12 - pulseStep)) % 6 === 0;
      lowCtx.fillStyle = isDataBit ? '#2DD4BF' : state.done ? '#7C5CFF' : '#8E9CC0';
      lowCtx.fillRect(Math.round(bx), Math.round(by), 2, 2);
    }

    // 7. Draw Plug sprite
    const plugPalette = {
      '#': state.done ? '#2DD4BF' : state.dragging ? '#FFFFFF' : '#B9C8F0',
      '=': '#7C5CFF',
      '>': '#FFB86B',
    };
    drawAsciiSprite(
      lowCtx,
      SPRITE_PLUG,
      state.plugX,
      state.plugY,
      CONNECT_LAYOUT.plugScale,
      plugPalette
    );

    // 8. Copy low-res 360x270 -> 1440x1080 (x4) with imageSmoothingEnabled=false
    hiCtx.imageSmoothingEnabled = false;
    hiCtx.clearRect(0, 0, HI_W, HI_H);
    hiCtx.drawImage(lowCanvas, 0, 0, LOW_W, LOW_H, 0, 0, HI_W, HI_H);

    // 9. Stamp cached high-res bitmap caption layer
    hiCtx.drawImage(captionCanvas, 0, 0);

    texture.needsUpdate = true;
  }

  function getLowResPointer(clientX, clientY) {
    if (!screenMesh || !camera || !domElement) return null;
    const rect = domElement.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObject(screenMesh, false);
    if (!hits.length || !hits[0].uv) return null;

    const { u, v } = undistortCrtUv(hits[0].uv.x, hits[0].uv.y);
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;

    return {
      x: u * LOW_W,
      y: v * LOW_H,
    };
  }

  function isOverPlug(pt, isTouch = false) {
    if (!pt) return false;
    const hitScale = isTouch ? 1.8 : 1.15;
    const pw = 27 * hitScale;
    const ph = 18 * hitScale;
    const cx = state.plugX + 13.5;
    const cy = state.plugY + 7.5;
    return Math.abs(pt.x - cx) <= pw * 0.65 && Math.abs(pt.y - cy) <= ph * 0.75;
  }

  function completeConnection() {
    if (state.done) return;
    state.done = true;
    state.dragging = false;
    state.animatingKey = false;
    state.plugX = CONNECT_LAYOUT.socket.x - 16;
    state.plugY = CONNECT_LAYOUT.socket.y - 7;
    domElement.style.cursor = '';

    if (sfx) {
      sfx('click', 0.32);
      window.setTimeout(() => sfx('start', 0.34), 180);
    }

    renderFrame(true);
    if (onConnected) onConnected();
  }

  function onPointerDown(e) {
    if (state.done || state.animatingKey) return;
    const isTouch = e.pointerType === 'touch';
    const pt = getLowResPointer(e.clientX, e.clientY);
    if (isOverPlug(pt, isTouch)) {
      state.dragging = true;
      domElement.style.cursor = 'grabbing';
      if (sfx) sfx('click', 0.22);
      if (e.cancelable) e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (state.done || state.animatingKey) return;
    const isTouch = e.pointerType === 'touch';
    const pt = getLowResPointer(e.clientX, e.clientY);

    if (state.dragging && pt) {
      state.plugX = Math.max(24, Math.min(LOW_W - 44, pt.x - 13));
      state.plugY = Math.max(24, Math.min(LOW_H - 36, pt.y - 7));

      const dist = Math.hypot(
        state.plugX + 16 - CONNECT_LAYOUT.socket.x,
        state.plugY + 7 - CONNECT_LAYOUT.socket.y
      );
      if (dist <= 18) {
        completeConnection();
      }
    } else if (!isTouch) {
      const over = isOverPlug(pt, false);
      if (over !== state.hovering) {
        state.hovering = over;
        domElement.style.cursor = over ? 'grab' : '';
      }
    }
  }

  function onPointerUp() {
    if (!state.dragging || state.done) return;
    state.dragging = false;
    domElement.style.cursor = state.hovering ? 'grab' : '';

    const dist = Math.hypot(
      state.plugX + 16 - CONNECT_LAYOUT.socket.x,
      state.plugY + 7 - CONNECT_LAYOUT.socket.y
    );
    if (dist <= 45) {
      completeConnection();
    }
  }

  function onKeyDown(e) {
    if (state.done || state.animatingKey) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      state.animatingKey = true;
      state.keyStartTime = performance.now();
    }
  }

  function onLangChange() {
    buildCaptionCache();
    renderFrame(true);
  }

  domElement.addEventListener('pointerdown', onPointerDown, { passive: false });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('langchange', onLangChange);

  function update(dt) {
    state.pulsePhase += dt;

    if (state.animatingKey && !state.done) {
      const elapsed = performance.now() - state.keyStartTime;
      const t = Math.min(1, elapsed / 500);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      state.plugX =
        CONNECT_LAYOUT.plugRest.x +
        (CONNECT_LAYOUT.socket.x - 16 - CONNECT_LAYOUT.plugRest.x) * easeT;
      state.plugY =
        CONNECT_LAYOUT.plugRest.y +
        (CONNECT_LAYOUT.socket.y - 7 - CONNECT_LAYOUT.plugRest.y) * easeT;
      if (t >= 1) {
        completeConnection();
      }
    } else if (!state.dragging && !state.done) {
      // Spring back to hook (lerp 0.2 per frame)
      state.plugX += (CONNECT_LAYOUT.plugRest.x - state.plugX) * 0.2;
      state.plugY += (CONNECT_LAYOUT.plugRest.y - state.plugY) * 0.2;
    }

    renderFrame(false);
  }

  function reset() {
    state.plugX = CONNECT_LAYOUT.plugRest.x;
    state.plugY = CONNECT_LAYOUT.plugRest.y;
    state.dragging = false;
    state.hovering = false;
    state.done = false;
    state.animatingKey = false;
    state.lastKey = '';
    renderFrame(true);
  }

  function dispose() {
    domElement.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('langchange', onLangChange);
    texture.dispose();
  }

  renderFrame(true);

  return {
    texture,
    update,
    reset,
    dispose,
    isDone: () => state.done,
    connectNow: completeConnection,
  };
}
