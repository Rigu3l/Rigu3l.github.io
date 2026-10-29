import * as THREE from 'three';
import { warm } from './main.js';

/**
 * Part 2 — 3D Voxel Cursor & Reconciled Hint Pill (src/cursor.js)
 * - 96x96 fixed transparent canvas following pointer with spring (1 - exp(-dt * 18))
 * - Single THREE.InstancedMesh of 26 small cubes morphing between:
 *   default (arrow), link (hand/accent arrow), drag (grab), view (eye), text (I-beam)
 * - Velocity tilt, press squash (scaleY 0.82), 300ms idle rAF sleep
 * - Reconciles Part 1's #cursor-pill for [data-hint] hovered elements
 */

const VOXEL_COUNT = 26;

// 26 (x, y, z) coordinates for each silhouette state in [-3.5 .. +3.5] grid units
const SHAPES = {
  default: [
    // Classic cursor arrow tip to stem
    [-2.5, 3.0, 0],
    [-2.5, 2.2, 0], [-1.7, 2.2, 0],
    [-2.5, 1.4, 0], [-1.7, 1.4, 0], [-0.9, 1.4, 0],
    [-2.5, 0.6, 0], [-1.7, 0.6, 0], [-0.9, 0.6, 0], [-0.1, 0.6, 0],
    [-2.5, -0.2, 0], [-1.7, -0.2, 0], [-0.9, -0.2, 0], [-0.1, -0.2, 0], [0.7, -0.2, 0],
    [-2.5, -1.0, 0], [-1.7, -1.0, 0], [-0.9, -1.0, 0], [-0.1, -1.0, 0], [0.7, -1.0, 0], [1.5, -1.0, 0],
    [-2.5, -1.8, 0], [-1.7, -1.8, 0], [-0.5, -1.8, 0],
    [-0.1, -2.6, 0], [0.4, -3.3, 0],
  ],
  link: [
    // Pointing hand / accented arrow silhouette
    [-0.8, 3.2, 0.2], [-0.8, 2.3, 0.2], [-0.8, 1.4, 0.2], [-0.8, 0.5, 0.2],
    [0.1, 1.2, 0], [0.9, 1.0, 0], [1.7, 0.6, 0],
    [-1.8, 0.3, 0], [-1.8, -0.5, 0],
    [-0.8, -0.4, 0], [0.1, -0.4, 0], [0.9, -0.4, 0], [1.7, -0.4, 0],
    [-1.2, -1.2, 0], [-0.4, -1.2, 0], [0.4, -1.2, 0], [1.2, -1.2, 0],
    [-0.9, -2.0, 0], [-0.1, -2.0, 0], [0.7, -2.0, 0], [1.1, -2.0, 0],
    [-0.6, -2.8, 0], [0.2, -2.8, 0], [0.8, -2.8, 0],
    [-0.2, -3.4, 0], [0.4, -3.4, 0],
  ],
  drag: [
    // Open grab hand / 4-way cluster
    [-1.6, 2.0, 0], [-0.6, 2.3, 0], [0.5, 2.3, 0], [1.5, 1.9, 0],
    [-1.6, 1.1, 0], [-0.6, 1.3, 0], [0.5, 1.3, 0], [1.5, 1.0, 0],
    [-2.3, 0.2, 0], [-1.2, 0.2, 0], [-0.1, 0.2, 0], [0.9, 0.2, 0], [1.8, 0.2, 0],
    [-1.8, -0.7, 0], [-0.9, -0.7, 0], [0.0, -0.7, 0], [0.9, -0.7, 0], [1.6, -0.7, 0],
    [-1.4, -1.6, 0], [-0.5, -1.6, 0], [0.4, -1.6, 0], [1.2, -1.6, 0],
    [-1.0, -2.4, 0], [-0.1, -2.4, 0], [0.7, -2.4, 0], [0.0, -3.1, 0],
  ],
  view: [
    // Eye / lens ring with glowing pupil
    [-1.2, 1.8, 0], [-0.4, 2.1, 0], [0.4, 2.1, 0], [1.2, 1.8, 0],
    [-2.0, 1.1, 0], [2.0, 1.1, 0],
    [-2.6, 0.2, 0], [-1.8, 0.2, 0], [1.8, 0.2, 0], [2.6, 0.2, 0],
    [-2.0, -0.7, 0], [2.0, -0.7, 0],
    [-1.2, -1.4, 0], [-0.4, -1.7, 0], [0.4, -1.7, 0], [1.2, -1.4, 0],
    // Pupil core
    [-0.5, 0.6, 0.3], [0.3, 0.6, 0.3],
    [-0.5, -0.2, 0.3], [0.3, -0.2, 0.3],
    [0.0, 0.2, 0.5], [-0.9, 0.2, 0.2], [0.8, 0.2, 0.2],
    [0.0, 1.0, 0.2], [0.0, -0.6, 0.2], [0.0, 0.2, -0.2],
  ],
  text: [
    // I-beam cursor
    [-1.6, 2.8, 0], [-0.8, 2.8, 0], [0.0, 2.8, 0], [0.8, 2.8, 0], [1.6, 2.8, 0],
    [-0.4, 2.0, 0], [0.4, 2.0, 0],
    [0.0, 1.3, 0], [0.0, 0.6, 0], [0.0, 0.0, 0], [0.0, -0.6, 0], [0.0, -1.3, 0],
    [-0.4, -2.0, 0], [0.4, -2.0, 0],
    [-1.6, -2.8, 0], [-0.8, -2.8, 0], [0.0, -2.8, 0], [0.8, -2.8, 0], [1.6, -2.8, 0],
    // Center crossbar accents
    [-0.7, 0.0, 0.15], [0.7, 0.0, 0.15],
    [0.0, 2.4, 0.15], [0.0, -2.4, 0.15],
    [0.0, 0.95, 0.1], [0.0, -0.95, 0.1], [0.0, 0.0, 0.25],
  ],
};

const STATE_COLORS = {
  default: new THREE.Color('#F5F2EB'),
  link: new THREE.Color('#7C5CFF'),
  drag: new THREE.Color('#2DD4BF'),
  view: new THREE.Color('#FFB86B'),
  text: new THREE.Color('#7FA6FF'),
};

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const params = new URLSearchParams(window.location.search);
  const isReducedMotion = () =>
    params.get('motion') === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');

  const canvas = document.getElementById('voxel-cursor-canvas');
  const cursorPill = document.getElementById('cursor-pill');

  if (!isFinePointer || isReducedMotion() || !canvas) {
    if (canvas) canvas.style.display = 'none';
    return;
  }

  // Probe whether WebGL is available and not a CPU-bound software renderer where extra contexts hurt
  let renderer = null;
  try {
    const glTest =
      canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' }) ||
      canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!glTest) {
      canvas.style.display = 'none';
      return;
    }
    const dbg = glTest.getExtension('WEBGL_debug_renderer_info');
    const unmasked = dbg ? String(glTest.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const isSoftware = /swiftshader|llvmpipe|software|softpipe|mesa offscreen/i.test(unmasked);

    // If running on headless SwiftShader, render the 26 3D voxels via lightweight software projection
    // on a 2D canvas clone so we don't consume a hardware WebGL context slot needed by Works/Mesh/Phone.
    if (isSoftware) {
      initSoftwareVoxelCursor(canvas, cursorPill, isReducedMotion);
      return;
    }

    renderer = new THREE.WebGLRenderer({
      canvas,
      context: glTest,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(96, 96, false);
    renderer.setClearColor(0x000000, 0);
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0, 14.5);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(6, 10, 12);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.5);
  rimLight.position.set(-8, -6, 6);
  scene.add(rimLight);

  const ambLight = new THREE.AmbientLight(0x7c5cff, 0.7);
  scene.add(ambLight);

  const cubeGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f2eb,
    roughness: 0.28,
    metalness: 0.18,
  });

  const instanced = new THREE.InstancedMesh(cubeGeo, cubeMat, VOXEL_COUNT);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(instanced);

  document.body.classList.add('voxel-cursor-ready');

  const dummy = new THREE.Object3D();
  const currentVox = Array.from({ length: VOXEL_COUNT }, (_, i) => {
    const p = SHAPES.default[i] || [0, 0, 0];
    return { x: p[0], y: p[1], z: p[2] };
  });

  const ptr = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    tx: window.innerWidth * 0.5,
    ty: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
  };

  let cursorMode = 'default';
  let pressed = false;
  let squash = 1.0;
  let lastMoveTime = performance.now();
  let rafId = null;
  let lastTick = performance.now();
  const currentColor = new THREE.Color('#F5F2EB');

  function detectCursorMode(target) {
    if (!target || !(target instanceof Element)) return { mode: 'default', hint: null };
    const hintEl = target.closest('[data-hint]');
    const hint = hintEl ? hintEl.getAttribute('data-hint') : null;

    const explicit = target.closest('[data-cursor]');
    if (explicit) {
      const m = explicit.getAttribute('data-cursor') || 'link';
      return { mode: SHAPES[m] ? m : 'link', hint };
    }
    if (target.closest('input[type="text"], input[type="email"], textarea')) {
      return { mode: 'text', hint };
    }
    if (target.closest('a, button, [role="button"], label')) {
      return { mode: 'link', hint };
    }
    return { mode: 'default', hint };
  }

  function updateHintPill(hintText) {
    if (!cursorPill) return;
    // Do not override Part 1 OS hold pill when inside the story hold gate
    const isStoryCovered = document.body.classList.contains('past-story') || document.body.classList.contains('content-covered');
    if (!isStoryCovered) return;

    if (hintText) {
      cursorPill.textContent = hintText;
      cursorPill.classList.add('visible');
    } else {
      cursorPill.classList.remove('visible');
    }
  }

  function wakeLoop() {
    lastMoveTime = performance.now();
    if (rafId === null) {
      lastTick = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (isReducedMotion()) return;
      ptr.tx = e.clientX;
      ptr.ty = e.clientY;
      const { mode, hint } = detectCursorMode(e.target);
      cursorMode = mode;
      updateHintPill(hint);
      wakeLoop();
    },
    { passive: true }
  );

  window.addEventListener(
    'pointerdown',
    () => {
      pressed = true;
      wakeLoop();
    },
    { passive: true }
  );

  window.addEventListener(
    'pointerup',
    () => {
      pressed = false;
      wakeLoop();
    },
    { passive: true }
  );

  function tick(now) {
    const dt = Math.min(0.06, Math.max(0.001, (now - lastTick) / 1000));
    lastTick = now;

    const spring = 1 - Math.exp(-dt * 18);
    const prevX = ptr.x;
    const prevY = ptr.y;
    ptr.x += (ptr.tx - ptr.x) * spring;
    ptr.y += (ptr.ty - ptr.y) * spring;
    ptr.vx = (ptr.x - prevX) / dt;
    ptr.vy = (ptr.y - prevY) / dt;

    // Position the 96x96 canvas centered on the pointer (or hotspot offset)
    canvas.style.transform = `translate3d(${(ptr.x - 42).toFixed(1)}px, ${(ptr.y - 42).toFixed(1)}px, 0)`;

    if (cursorPill && document.body.classList.contains('past-story')) {
      cursorPill.style.transform = `translate3d(${(ptr.x + 22).toFixed(1)}px, ${(ptr.y + 22).toFixed(1)}px, 0)`;
    }

    // Squash on press (scaleY 0.82)
    const targetSquash = pressed ? 0.82 : 1.0;
    squash += (targetSquash - squash) * (1 - Math.exp(-dt * 24));

    // Morph voxel positions toward target shape
    const shape = SHAPES[cursorMode] || SHAPES.default;
    const voxLerp = 1 - Math.exp(-dt * 16);
    for (let i = 0; i < VOXEL_COUNT; i++) {
      const target = shape[i] || [0, 0, 0];
      const v = currentVox[i];
      v.x += (target[0] - v.x) * voxLerp;
      v.y += (target[1] - v.y) * voxLerp;
      v.z += (target[2] - v.z) * voxLerp;

      dummy.position.set(v.x, v.y * squash, v.z);
      dummy.scale.set(1, squash, 1);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;

    // Velocity lean & gentle rotation
    const leanZ = THREE.MathUtils.clamp(-ptr.vx * 0.00045, -0.42, 0.42);
    const leanX = THREE.MathUtils.clamp(ptr.vy * 0.00045, -0.42, 0.42);
    instanced.rotation.z += (leanZ - instanced.rotation.z) * 0.22;
    instanced.rotation.x += (leanX - instanced.rotation.x) * 0.22;
    instanced.rotation.y = 0.26;

    // Tint interpolation
    const targetCol = STATE_COLORS[cursorMode] || STATE_COLORS.default;
    currentColor.lerp(targetCol, 0.18);
    cubeMat.color.copy(currentColor);

    renderer.render(scene, camera);

    // Stop rAF after 300ms of no pointer movement and settled spring
    const distSq = (ptr.tx - ptr.x) ** 2 + (ptr.ty - ptr.y) ** 2;
    if (now - lastMoveTime > 300 && distSq < 0.25 && !pressed && Math.abs(squash - 1) < 0.01) {
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(tick);
  }
}

/**
 * Software 3D voxel projection fallback for headless Chromium / SwiftShader
 * so the 26-voxel 3D cursor still renders with zero WebGL context contention.
 */
function initSoftwareVoxelCursor(canvas, cursorPill, isReducedMotion) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  document.body.classList.add('voxel-cursor-ready');

  const currentVox = Array.from({ length: VOXEL_COUNT }, (_, i) => {
    const p = SHAPES.default[i] || [0, 0, 0];
    return { x: p[0], y: p[1], z: p[2] };
  });

  const ptr = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    tx: window.innerWidth * 0.5,
    ty: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
  };

  let cursorMode = 'default';
  let pressed = false;
  let squash = 1.0;
  let lastMoveTime = performance.now();
  let rafId = null;
  let lastTick = performance.now();

  const PALETTE = {
    default: ['#F5F2EB', '#CBD2E1', '#8E98B0'],
    link: ['#9B82FF', '#7C5CFF', '#5336CC'],
    drag: ['#5EEAD4', '#2DD4BF', '#11998E'],
    view: ['#FFD09B', '#FFB86B', '#D98A36'],
    text: ['#A3C0FF', '#7FA6FF', '#4E73CC'],
  };

  function wakeLoop() {
    lastMoveTime = performance.now();
    if (rafId === null) {
      lastTick = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (isReducedMotion()) return;
      ptr.tx = e.clientX;
      ptr.ty = e.clientY;
      const el = e.target instanceof Element ? e.target : null;
      const explicit = el?.closest('[data-cursor]');
      if (explicit) {
        const m = explicit.getAttribute('data-cursor') || 'link';
        cursorMode = SHAPES[m] ? m : 'link';
      } else if (el?.closest('input, textarea')) {
        cursorMode = 'text';
      } else if (el?.closest('a, button, [role="button"], label')) {
        cursorMode = 'link';
      } else {
        cursorMode = 'default';
      }

      if (cursorPill && document.body.classList.contains('past-story')) {
        const hintEl = el?.closest('[data-hint]');
        const hint = hintEl ? hintEl.getAttribute('data-hint') : null;
        if (hint) {
          cursorPill.textContent = hint;
          cursorPill.classList.add('visible');
        } else {
          cursorPill.classList.remove('visible');
        }
      }
      wakeLoop();
    },
    { passive: true }
  );

  window.addEventListener('pointerdown', () => {
    pressed = true;
    wakeLoop();
  });
  window.addEventListener('pointerup', () => {
    pressed = false;
    wakeLoop();
  });

  function tick(now) {
    const dt = Math.min(0.06, Math.max(0.001, (now - lastTick) / 1000));
    lastTick = now;

    const spring = 1 - Math.exp(-dt * 18);
    ptr.x += (ptr.tx - ptr.x) * spring;
    ptr.y += (ptr.ty - ptr.y) * spring;

    canvas.style.transform = `translate3d(${(ptr.x - 42).toFixed(1)}px, ${(ptr.y - 42).toFixed(1)}px, 0)`;
    if (cursorPill && document.body.classList.contains('past-story')) {
      cursorPill.style.transform = `translate3d(${(ptr.x + 22).toFixed(1)}px, ${(ptr.y + 22).toFixed(1)}px, 0)`;
    }

    const targetSquash = pressed ? 0.82 : 1.0;
    squash += (targetSquash - squash) * (1 - Math.exp(-dt * 24));

    const shape = SHAPES[cursorMode] || SHAPES.default;
    const voxLerp = 1 - Math.exp(-dt * 16);
    const cols = PALETTE[cursorMode] || PALETTE.default;

    ctx.clearRect(0, 0, 96, 96);
    const cx = 48;
    const cy = 48;
    const scale = 6.2;

    for (let i = 0; i < VOXEL_COUNT; i++) {
      const target = shape[i] || [0, 0, 0];
      const v = currentVox[i];
      v.x += (target[0] - v.x) * voxLerp;
      v.y += (target[1] - v.y) * voxLerp;
      v.z += (target[2] - v.z) * voxLerp;

      const sx = cx + (v.x + v.z * 0.35) * scale;
      const sy = cy - (v.y * squash - v.z * 0.25) * scale;
      const s = 4.6;

      // Top face
      ctx.fillStyle = cols[0];
      ctx.fillRect(sx - s * 0.5, sy - s * 0.5, s, s * squash);
      // Right bevel shade
      ctx.fillStyle = cols[2];
      ctx.fillRect(sx + s * 0.35, sy - s * 0.4, s * 0.28, s * squash);
    }

    const distSq = (ptr.tx - ptr.x) ** 2 + (ptr.ty - ptr.y) ** 2;
    if (now - lastMoveTime > 300 && distSq < 0.25 && !pressed && Math.abs(squash - 1) < 0.01) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }
}

warm(init);
export default { init };
