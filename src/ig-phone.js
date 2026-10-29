import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SOCIAL_POSTS } from './part2-logic.js';
import { clamp, lerp } from './timeline.js';
import { warm } from './main.js';

/**
 * Part 2 — 3D Phone & Studio Feed Section (src/ig-phone.js)
 * - Rounded-rectangle ExtrudeGeometry with bevel, metallic frame (roughness 0.25, metalness 0.85),
 *   recessed screen plane, dynamic-island pill, and RoomEnvironment PMREM reflection
 * - 540x1170 2D canvas redrawn at 30fps showing an infinitely scrolling generic social feed
 *   of Rj's 7 build-log posts (no third-party trademarked logos)
 * - 4 floating post cards at staggered depths (z = ±0.4..0.9) bobbing on sine waves
 * - Pointer tilt (±14° Y, ±10° X) with spring (1 - exp(-dt * 8)) on desktop;
 *   scroll-driven -12°..+12° Y-rotation sweep on touch devices
 * - Lazy IntersectionObserver initialization + 2D fallback if WebGL is unavailable
 */

function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);
  return shape;
}

function drawPostIllustration(ctx, post, x, y, w, h, index) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.clip();

  // Background fill
  ctx.fillStyle = post.bg;
  ctx.fillRect(x, y, w, h);

  // Subtle glow
  const grad = ctx.createRadialGradient(x + w * 0.72, y + h * 0.28, 10, x + w * 0.72, y + h * 0.28, w * 0.65);
  grad.addColorStop(0, post.accent + '66');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Motif illustration per post
  ctx.strokeStyle = post.accent;
  ctx.fillStyle = post.accent;
  ctx.lineWidth = 3;

  if (index === 0) {
    // Sketchbook & pencil grid
    ctx.strokeRect(x + 48, y + 40, w - 96, h - 80);
    ctx.beginPath();
    ctx.moveTo(x + 80, y + h - 70);
    ctx.lineTo(x + w - 90, y + 70);
    ctx.stroke();
  } else if (index === 1) {
    // QR scanner frame
    const s = 110;
    const qx = x + (w - s) * 0.5;
    const qy = y + (h - s) * 0.5;
    ctx.strokeRect(qx, qy, s, s);
    ctx.fillRect(qx + 16, qy + 16, 26, 26);
    ctx.fillRect(qx + s - 42, qy + 16, 26, 26);
    ctx.fillRect(qx + 16, qy + s - 42, 26, 26);
  } else if (index === 2) {
    // Clearance status bars
    for (let r = 0; r < 3; r++) {
      ctx.fillRect(x + 56, y + 54 + r * 44, w - 112, 24);
    }
  } else if (index === 3) {
    // Flipbook spread
    ctx.strokeRect(x + 54, y + 42, (w - 108) * 0.5, h - 84);
    ctx.strokeRect(x + 54 + (w - 108) * 0.5, y + 42, (w - 108) * 0.5, h - 84);
  } else {
    // Code & UI cards
    ctx.strokeRect(x + 48, y + 44, w - 96, h - 88);
    ctx.fillRect(x + 72, y + 72, (w - 144) * 0.65, 20);
    ctx.fillRect(x + 72, y + 108, (w - 144) * 0.45, 16);
  }

  // Tag pill
  const isLightBg = post.bg === '#FAF8F5' || post.bg === '#FFF1E6';
  ctx.fillStyle = isLightBg ? '#141413' : '#F5F2EB';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText(`0${index + 1} · ${post.tag}`, x + 28, y + h - 24);

  ctx.restore();
}

function buildFloatingCardCanvas(post, index) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 220;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  drawPostIllustration(ctx, post, 0, 0, 320, 220, index);
  return c;
}

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  const section = document.getElementById('social-section');
  const canvas = document.getElementById('phone-canvas');
  if (!section || !canvas) return;

  const params = new URLSearchParams(window.location.search);
  const isReducedMotion = () =>
    params.get('motion') === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  // Offscreen 540x1170 2D canvas for the phone's scrolling social feed
  const feedCanvas = document.createElement('canvas');
  feedCanvas.width = 540;
  feedCanvas.height = 1170;
  const feedCtx = feedCanvas.getContext('2d');

  const CARD_HEIGHT = 410;
  const TOTAL_FEED_H = SOCIAL_POSTS.length * CARD_HEIGHT;
  let feedScrollY = 0;

  function drawFeedCanvas() {
    if (!feedCtx) return;
    const W = 540;
    const H = 1170;

    feedCtx.fillStyle = '#0B1020';
    feedCtx.fillRect(0, 0, W, H);

    // Top status & generic studio feed header
    const startY = 108;
    const lang = window.__LANG === 'fil' ? 'fil' : 'en';

    // Draw scrolling cards (wrapping seamlessly with modulo)
    for (let i = 0; i < SOCIAL_POSTS.length + 3; i++) {
      const postIdx = i % SOCIAL_POSTS.length;
      const post = SOCIAL_POSTS[postIdx];
      const y = startY + i * CARD_HEIGHT - (feedScrollY % TOTAL_FEED_H);
      if (y + CARD_HEIGHT < 70 || y > H) continue;

      // Post container
      feedCtx.fillStyle = '#141B33';
      feedCtx.beginPath();
      feedCtx.roundRect(24, y, W - 48, CARD_HEIGHT - 22, 24);
      feedCtx.fill();

      // Author row
      feedCtx.fillStyle = '#7C5CFF';
      feedCtx.beginPath();
      feedCtx.arc(58, y + 36, 16, 0, Math.PI * 2);
      feedCtx.fill();

      feedCtx.fillStyle = '#F5F2EB';
      feedCtx.font = '600 18px Inter, system-ui, sans-serif';
      feedCtx.fillText('rjverceles.dev', 86, y + 42);

      feedCtx.fillStyle = '#A3ACC2';
      feedCtx.font = '500 15px Inter, system-ui, sans-serif';
      feedCtx.fillText('Zambales', W - 116, y + 42);

      // Post illustration
      drawPostIllustration(feedCtx, post, 42, y + 66, W - 84, 215, postIdx);

      // Caption text
      const caption = post.caption[lang] || post.caption.en;
      feedCtx.fillStyle = '#F5F2EB';
      feedCtx.font = '400 17px Inter, system-ui, sans-serif';
      const words = caption.split(' ');
      let line = '';
      let ly = y + 314;
      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const test = line ? `${line} ${words[wIdx]}` : words[wIdx];
        if (feedCtx.measureText(test).width > W - 96) {
          feedCtx.fillText(line, 44, ly);
          line = words[wIdx];
          ly += 24;
        } else {
          line = test;
        }
      }
      if (line) feedCtx.fillText(line, 44, ly);

      // Action icons row (heart + bookmark shapes)
      feedCtx.fillStyle = post.accent;
      feedCtx.beginPath();
      feedCtx.arc(54, y + CARD_HEIGHT - 46, 7, 0, Math.PI * 2);
      feedCtx.fill();

      feedCtx.fillStyle = '#A3ACC2';
      feedCtx.font = '500 14px Inter, system-ui, sans-serif';
      feedCtx.fillText('Shipped build note', 72, y + CARD_HEIGHT - 41);
    }

    // Fixed top app bar over scrolling feed
    feedCtx.fillStyle = 'rgba(11, 16, 32, 0.92)';
    feedCtx.fillRect(0, 0, W, 96);
    feedCtx.fillStyle = '#F5F2EB';
    feedCtx.font = '700 22px Inter, system-ui, sans-serif';
    feedCtx.fillText('RJ VERCELES · BUILD FEED', 32, 68);
  }

  drawFeedCanvas();

  let renderer = null;
  let scene = null;
  let camera = null;
  let phoneGroup = null;
  let feedTexture = null;
  let floatingCards = [];
  let useCanvas2D = false;
  let ctx2d = null;
  let setupDone = false;
  let isIntersecting = false;
  let rafId = null;

  const pointer = { tx: 0, ty: 0, rotX: 0, rotY: -0.12 };
  let lastFrameTime = performance.now();
  let lastFeedDraw = 0;

  function ensurePhoneSetup() {
    if (setupDone) return;
    setupDone = true;

    try {
      const glTest =
        canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' }) ||
        canvas.getContext('webgl', { antialias: true, alpha: true, powerPreference: 'high-performance' });
      if (!glTest) {
        useCanvas2D = true;
        ctx2d = canvas.getContext('2d');
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        context: glTest,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
      camera.position.set(0, 0, 7.2);

      // RoomEnvironment reflection (or lightweight directional lights on software GL)
      const dbg = glTest.getExtension('WEBGL_debug_renderer_info');
      const unmasked = dbg ? String(glTest.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      const isSoftware = /swiftshader|llvmpipe|software|softpipe|mesa offscreen/i.test(unmasked);

      if (!isSoftware) {
        try {
          const pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
          pmrem.dispose();
        } catch (e) {}
      }

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(4, 6, 6);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x7c5cff, 1.8);
      rimLight.position.set(-5, -3, 4);
      scene.add(rimLight);

      const fillLight = new THREE.DirectionalLight(0x2dd4bf, 1.1);
      fillLight.position.set(3, -4, 3);
      scene.add(fillLight);

      phoneGroup = new THREE.Group();
      scene.add(phoneGroup);

      // 1. Extruded rounded-rectangle metallic phone body with bevel
      const bodyW = 2.15;
      const bodyH = 4.45;
      const bodyShape = createRoundedRectShape(bodyW, bodyH, 0.32);
      const extrudeSettings = {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04,
      };
      const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
      bodyGeo.center();

      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1b2444,
        roughness: 0.25,
        metalness: 0.85,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      phoneGroup.add(bodyMesh);

      // 2. Recessed screen plane with scrolling 540x1170 CanvasTexture
      feedTexture = new THREE.CanvasTexture(feedCanvas);
      feedTexture.colorSpace = THREE.SRGBColorSpace;

      const screenGeo = new THREE.PlaneGeometry(bodyW - 0.12, bodyH - 0.14);
      const screenMat = new THREE.MeshBasicMaterial({ map: feedTexture });
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.z = 0.132;
      phoneGroup.add(screenMesh);

      // 3. Dynamic-island pill notch at top of screen
      const notchShape = createRoundedRectShape(0.56, 0.13, 0.06);
      const notchGeo = new THREE.ShapeGeometry(notchShape);
      const notchMat = new THREE.MeshBasicMaterial({ color: 0x070a14 });
      const notchMesh = new THREE.Mesh(notchGeo, notchMat);
      notchMesh.position.set(0, bodyH * 0.5 - 0.24, 0.136);
      phoneGroup.add(notchMesh);

      // 4. Four floating post cards around the phone at staggered depths (z = ±0.4..0.9)
      const floatOffsets = [
        { x: -1.85, y: 1.15, z: 0.65, phase: 0.0 },
        { x: 1.9, y: 0.85, z: -0.45, phase: 1.6 },
        { x: -1.75, y: -1.1, z: -0.55, phase: 3.1 },
        { x: 1.82, y: -1.05, z: 0.8, phase: 4.5 },
      ];

      const cardPlaneGeo = new THREE.PlaneGeometry(1.32, 0.91);
      floatOffsets.forEach((cfg, idx) => {
        const cardCanvas = buildFloatingCardCanvas(SOCIAL_POSTS[idx], idx);
        const cardTex = new THREE.CanvasTexture(cardCanvas);
        cardTex.colorSpace = THREE.SRGBColorSpace;
        const cardMat = new THREE.MeshBasicMaterial({
          map: cardTex,
          transparent: true,
          opacity: 0.94,
        });
        const cardMesh = new THREE.Mesh(cardPlaneGeo, cardMat);
        cardMesh.position.set(cfg.x, cfg.y, cfg.z);
        cardMesh.userData = { ...cfg };
        phoneGroup.add(cardMesh);
        floatingCards.push(cardMesh);
      });

      resizePhone();
    } catch (e) {
      renderer = null;
      useCanvas2D = true;
      ctx2d = canvas.getContext('2d');
    }
  }

  function resizePhone() {
    const w = Math.max(1, canvas.clientWidth || 520);
    const h = Math.max(1, canvas.clientHeight || 560);
    if (renderer && camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    } else if (useCanvas2D) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  window.addEventListener('resize', resizePhone, { passive: true });

  if (isFinePointer) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        // Desktop pointer tilt: rotY ±14°, rotX ±10°
        pointer.tx = nx * THREE.MathUtils.degToRad(14);
        pointer.ty = ny * THREE.MathUtils.degToRad(10);
      },
      { passive: true }
    );
  }

  function renderPhoneFrame(now = performance.now()) {
    if (!isIntersecting) {
      rafId = null;
      return;
    }

    const dt = Math.min(0.06, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    // Update scrolling feed at 30fps
    if (!isReducedMotion() && now - lastFeedDraw >= 33) {
      lastFeedDraw = now;
      feedScrollY = (feedScrollY + 1.8) % TOTAL_FEED_H;
      drawFeedCanvas();
      if (feedTexture) feedTexture.needsUpdate = true;
    }

    // Touch / non-fine pointer: scroll progress drives a smooth -12° -> +12° Y-rotation sweep
    if (!isFinePointer) {
      const rect = section.getBoundingClientRect();
      const prog = clamp((window.innerHeight - rect.top) / Math.max(1, window.innerHeight + rect.height), 0, 1);
      pointer.tx = THREE.MathUtils.degToRad(lerp(-12, 12, prog));
      pointer.ty = 0;
    }

    // Spring (1 - exp(-dt * 8))
    const spring = 1 - Math.exp(-dt * 8);
    pointer.rotY += (pointer.tx - pointer.rotY) * spring;
    pointer.rotX += (pointer.ty - pointer.rotX) * spring;

    if (renderer && scene && camera && phoneGroup) {
      phoneGroup.rotation.y = pointer.rotY;
      phoneGroup.rotation.x = pointer.rotX;

      const t = now * 0.001;
      floatingCards.forEach((card) => {
        const { y, phase } = card.userData;
        card.position.y = isReducedMotion() ? y : y + Math.sin(t * 1.8 + phase) * 0.11;
        card.rotation.z = isReducedMotion() ? 0 : Math.cos(t * 1.2 + phase) * 0.04;
      });

      renderer.render(scene, camera);
    } else if (useCanvas2D && ctx2d) {
      const w = canvas.width || 480;
      const h = canvas.height || 540;
      ctx2d.clearRect(0, 0, w, h);
      const pw = Math.min(w * 0.56, 260);
      const ph = pw * (1170 / 540);
      const px = (w - pw) * 0.5;
      const py = (h - ph) * 0.5;
      ctx2d.save();
      ctx2d.fillStyle = '#1B2444';
      ctx2d.beginPath();
      ctx2d.roundRect(px - 10, py - 10, pw + 20, ph + 20, 28);
      ctx2d.fill();
      ctx2d.drawImage(feedCanvas, px, py, pw, ph);
      ctx2d.restore();
    }

    if (!isReducedMotion()) {
      rafId = requestAnimationFrame(renderPhoneFrame);
    } else {
      rafId = null;
    }
  }

  window.addEventListener('langchange', () => {
    drawFeedCanvas();
    if (feedTexture) feedTexture.needsUpdate = true;
    if (isIntersecting && isReducedMotion()) {
      renderPhoneFrame(performance.now());
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          isIntersecting = true;
          ensurePhoneSetup();
          resizePhone();
          if (rafId === null) {
            lastFrameTime = performance.now();
            rafId = requestAnimationFrame(renderPhoneFrame);
          }
        } else {
          isIntersecting = false;
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }
      }
    },
    { rootMargin: '200px 0px' }
  );

  observer.observe(section);
}

warm(init);
export default { init };
