import * as THREE from 'three';
import { WORKS_DATA } from './part2-logic.js';
import { clamp, lerp } from './timeline.js';
import { warm, sfx } from './main.js';

/**
 * Part 2 — Works Tunnel & Accessible List View (src/works.js)
 * - 500vh pinned section with 100vh sticky stage
 * - 6 projects placed along negative Z in a 3D spiral/helix (angle = i * 0.85, z = -i * 6.5, r = 2.1)
 * - Rounded-rectangle signed-distance alpha mask shader on each card
 * - Procedural high-res cover textures with editorial serif display typography & UI wireframe graphics,
 *   decoded off-thread via createImageBitmap when supported
 * - Camera station stops (45% plateau per station slice) + radial zoom-blur & RGB chromatic split
 *   post-processing proportional to scroll velocity
 * - Opening & closing circular clip-path over the first 10% and last 10% of the section
 * - Bottom-left HTML HUD, 01 / 06 counter, right-edge clickable station dots, keyboard navigation,
 *   and "View as list" toggle (defaulting to list view under ?nostory or prefers-reduced-motion)
 */

const STATION_COUNT = WORKS_DATA.length;
const HELIX_ANGLE_STEP = 0.85;
const HELIX_Z_STEP = 6.5;
const HELIX_RADIUS = 2.1;

// Rounded-rect card shader with signed-distance alpha mask, border highlight & hover sheen
const CARD_VERT = `
  varying highp vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CARD_FRAG = `
  precision highp float;
  varying highp vec2 vUv;
  uniform sampler2D uTex;
  uniform float uActive;
  uniform float uVelocity;
  uniform vec3 uAccent;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 p = vUv - 0.5;
    // Aspect ratio 1.6 : 1.0
    vec2 halfSize = vec2(0.485, 0.485);
    float d = sdRoundBox(p, halfSize, 0.055);
    float alpha = 1.0 - smoothstep(-0.006, 0.006, d);
    if (alpha < 0.01) discard;

    // Velocity-based radial zoom blur & subtle RGB chromatic split
    float blurAmt = clamp(uVelocity * 0.035, 0.0, 0.028);
    vec2 dir = p * blurAmt;

    vec3 sum = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      float fi = float(i) / 4.0 - 0.5;
      vec2 uvSample = clamp(vUv + dir * fi, 0.002, 0.998);
      float r = texture2D(uTex, clamp(uvSample - dir * 0.35, 0.002, 0.998)).r;
      float g = texture2D(uTex, uvSample).g;
      float b = texture2D(uTex, clamp(uvSample + dir * 0.35, 0.002, 0.998)).b;
      sum += vec3(r, g, b);
    }
    vec3 col = sum / 5.0;

    // Subtle border rim glow on active station card
    float borderMask = smoothstep(-0.022, -0.004, d) * (1.0 - smoothstep(-0.004, 0.006, d));
    col = mix(col, uAccent, borderMask * (0.35 + 0.55 * uActive));

    // Dim non-active cards slightly for depth hierarchy
    col *= mix(0.62, 1.0, uActive);

    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Generates a high-resolution procedural cover canvas for each of the 6 works
 */
function buildProjectCoverCanvas(project, index) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const [bgA, bgB] = project.gradient;
  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, bgA);
  grad.addColorStop(1, bgB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle architectural grid lines
  ctx.strokeStyle = project.textColor === '#F5F2EB' ? 'rgba(245,242,235,0.08)' : 'rgba(20,20,19,0.08)';
  ctx.lineWidth = 1.5;
  for (let x = 64; x < c.width; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }
  for (let y = 64; y < c.height; y += 96) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
  }

  // Accent glow orb
  const orb = ctx.createRadialGradient(780, 220, 20, 780, 220, 320);
  orb.addColorStop(0, project.accentColor + '55');
  orb.addColorStop(1, 'transparent');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, c.width, c.height);

  // Top bar metadata
  ctx.fillStyle = project.textColor;
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillText(`0${index + 1} / 06  ·  ${project.category.toUpperCase()}`, 64, 72);
  ctx.fillText(String(project.year), c.width - 124, 72);

  // Project-specific wireframe / diagram illustration on right half
  ctx.save();
  ctx.translate(580, 140);
  ctx.strokeStyle = project.accentColor;
  ctx.lineWidth = 3;
  ctx.fillStyle = project.textColor === '#F5F2EB' ? 'rgba(11,16,32,0.38)' : 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect(0, 0, 380, 280, 18);
  ctx.fill();
  ctx.stroke();

  if (index === 0) {
    // CelCheck QR matrix + student log bars
    ctx.fillStyle = project.accentColor;
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 5; col++) {
        if ((r + col) % 2 === 0 || (r === 0 && col < 3) || (r === 4 && col > 1)) {
          ctx.fillRect(36 + col * 24, 44 + r * 24, 18, 18);
        }
      }
    }
    ctx.fillStyle = project.textColor;
    ctx.fillRect(190, 56, 150, 18);
    ctx.fillRect(190, 92, 120, 14);
    ctx.fillRect(190, 124, 140, 14);
    ctx.fillStyle = '#2DD4BF';
    ctx.fillRect(36, 200, 304, 36);
  } else if (index === 1) {
    // Online Clearance status rows
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = r < 3 ? '#2DD4BF' : '#FFB86B';
      ctx.beginPath();
      ctx.arc(46, 56 + r * 52, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = project.textColor;
      ctx.fillRect(76, 48 + r * 52, 200, 16);
      ctx.fillStyle = project.accentColor;
      ctx.fillRect(296, 46 + r * 52, 54, 20);
    }
  } else if (index === 2) {
    // Hotel Management 25-feature module grid
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 5; col++) {
        ctx.fillStyle = (r * 5 + col) % 3 === 0 ? project.accentColor : 'rgba(157,23,77,0.22)';
        ctx.fillRect(36 + col * 62, 32 + r * 44, 50, 32);
      }
    }
  } else if (index === 3) {
    // Manuazine dual page spread
    ctx.strokeStyle = project.accentColor;
    ctx.strokeRect(36, 36, 150, 208);
    ctx.strokeRect(186, 36, 150, 208);
    ctx.fillStyle = project.accentColor;
    ctx.fillRect(56, 64, 110, 14);
    ctx.fillRect(56, 92, 90, 10);
    ctx.fillRect(206, 64, 110, 90);
  } else {
    // Portfolio layout grid
    ctx.fillStyle = project.accentColor;
    ctx.fillRect(36, 36, 308, 96);
    ctx.fillStyle = project.textColor;
    ctx.fillRect(36, 152, 144, 92);
    ctx.fillRect(200, 152, 144, 92);
  }
  ctx.restore();

  // Editorial Serif / Fraunces-style cover title on left & bottom
  ctx.fillStyle = project.textColor;
  ctx.font = 'italic 700 68px "Fraunces", Georgia, "Times New Roman", serif';
  ctx.fillText(project.coverTitle, 64, 470);

  // Role & stack subtitle
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillStyle = project.accentColor;
  ctx.fillText(project.role, 64, 524);

  ctx.fillStyle = project.textColor;
  ctx.globalAlpha = 0.72;
  ctx.font = '400 20px Inter, system-ui, sans-serif';
  ctx.fillText(project.url.replace('https://', ''), 64, 568);
  ctx.globalAlpha = 1;

  return c;
}

/**
 * Computes camera station index and interpolated position from normalized scroll progress (0..1)
 * Each station gets a 45% plateau where the camera pauses directly in front of the card.
 */
export function computeTunnelStationProgress(scrollT) {
  const t = clamp(scrollT, 0, 1);
  const maxIdx = STATION_COUNT - 1;
  const scaled = t * maxIdx;
  const baseIdx = Math.min(maxIdx, Math.floor(scaled));
  const frac = scaled - baseIdx;

  // 45% station plateau (0.0 .. 0.45 stays at baseIdx, 0.45 .. 1.0 eases to baseIdx + 1)
  let smoothStep = 0;
  if (frac > 0.45) {
    const moveT = (frac - 0.45) / 0.55;
    // Cubic ease-in-out
    smoothStep = moveT < 0.5 ? 4 * moveT * moveT * moveT : 1 - Math.pow(-2 * moveT + 2, 3) / 2;
  }

  const continuousIndex = clamp(baseIdx + smoothStep, 0, maxIdx);
  const activeStation = Math.round(continuousIndex);
  return {
    continuousIndex,
    activeStation,
  };
}

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  const section = document.getElementById('work');
  const stageClip = document.getElementById('works-stage-clip');
  const canvas = document.getElementById('works-canvas');
  const toggleBtn = document.getElementById('works-view-toggle');
  const toggleLabel = document.getElementById('works-view-toggle-label');
  const hudCounter = document.getElementById('works-hud-counter');
  const hudCategory = document.getElementById('works-hud-category');
  const hudYear = document.getElementById('works-hud-year');
  const hudTitleLink = document.getElementById('works-hud-title-link');
  const hudTitle = document.getElementById('works-hud-title');
  const hudRole = document.getElementById('works-hud-role');
  const hudDesc = document.getElementById('works-hud-desc');
  const hudCta = document.getElementById('works-hud-cta');
  const dotBtns = Array.from(document.querySelectorAll('.works-dot-btn'));

  if (!section || !canvas) return;

  const params = new URLSearchParams(window.location.search);
  const isReducedMotion = () =>
    params.get('motion') === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');

  let isListMode = params.has('nostory') || isReducedMotion();
  let currentHudIndex = -1;
  let renderer = null;
  let scene = null;
  let camera = null;
  let cardMeshes = [];
  let coverCanvases = [];
  let useCanvas2D = false;
  let ctx2d = null;
  let tunnelInitialized = false;
  let isIntersecting = false;
  let rafId = null;
  let targetScrollT = 0;
  let smoothScrollT = 0;
  let lastFrameTime = performance.now();

  function applyViewMode(listMode) {
    isListMode = Boolean(listMode);
    section.classList.toggle('is-list-mode', isListMode);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(isListMode));
    }
    if (toggleLabel) {
      const key = isListMode ? 'works.viewTunnel' : 'works.viewList';
      toggleLabel.setAttribute('data-i18n', key);
      const pair = window.I18N_STRINGS?.[key];
      if (pair) {
        toggleLabel.textContent = window.__LANG === 'fil' ? pair[1] : pair[0];
      } else {
        toggleLabel.textContent = isListMode ? 'View 3D tunnel' : 'View as list';
      }
    }
  }

  applyViewMode(isListMode);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sfx('click', 0.22);
      applyViewMode(!isListMode);
      if (!isListMode) {
        ensureTunnelSetup();
        resizeTunnel();
        wakeTunnel();
      }
    });
  }

  function updateHud(index, force = false) {
    const idx = clamp(index, 0, STATION_COUNT - 1);
    if (idx === currentHudIndex && !force) return;
    currentHudIndex = idx;

    const item = WORKS_DATA[idx];
    const lang = window.__LANG === 'fil' ? 'fil' : 'en';

    if (hudCounter) hudCounter.textContent = `0${idx + 1} / 0${STATION_COUNT}`;
    if (hudCategory) hudCategory.textContent = lang === 'fil' ? item.chapterFil : item.chapterEn;
    if (hudYear) hudYear.textContent = String(item.year);
    if (hudTitle) hudTitle.textContent = lang === 'fil' ? item.titleFil : item.titleEn;
    if (hudTitleLink) hudTitleLink.setAttribute('href', item.url);
    if (hudCta) hudCta.setAttribute('href', item.url);
    if (hudRole) hudRole.textContent = lang === 'fil' ? item.roleFil : item.roleEn;
    if (hudDesc) hudDesc.textContent = lang === 'fil' ? item.descFil : item.descEn;

    dotBtns.forEach((btn, i) => {
      btn.setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
  }

  updateHud(0, true);
  window.addEventListener('langchange', () => updateHud(Math.max(0, currentHudIndex), true));

  function scrollToStation(stationIndex) {
    const idx = clamp(stationIndex, 0, STATION_COUNT - 1);
    const rect = section.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
    // Map station index to the middle of its plateau inside the 10%..90% active tunnel window
    const stationNorm = idx / (STATION_COUNT - 1);
    const overallT = 0.1 + stationNorm * 0.8;
    window.scrollTo({
      top: sectionTop + overallT * scrollable,
      behavior: isReducedMotion() ? 'auto' : 'smooth',
    });
  }

  dotBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-station') || '0', 10);
      sfx('click', 0.2);
      scrollToStation(idx);
    });
  });

  // Keyboard station navigation when focused inside #work
  section.addEventListener('keydown', (e) => {
    if (isListMode) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToStation(Math.min(STATION_COUNT - 1, currentHudIndex + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToStation(Math.max(0, currentHudIndex - 1));
    }
  });

  // ==========================================================================
  // 3D HELIX TUNNEL RENDERER (WebGL + Canvas2D Fallback)
  // ==========================================================================

  function getHelixPose(index) {
    const angle = index * HELIX_ANGLE_STEP;
    const x = Math.sin(angle) * HELIX_RADIUS;
    const y = Math.cos(angle) * (HELIX_RADIUS * 0.52);
    const z = -index * HELIX_Z_STEP;
    return { x, y, z, angle };
  }

  function ensureTunnelSetup() {
    if (tunnelInitialized) return;
    tunnelInitialized = true;

    coverCanvases = WORKS_DATA.map((proj, idx) => buildProjectCoverCanvas(proj, idx));

    try {
      const glTest =
        canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' }) ||
        canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
      if (!glTest) {
        useCanvas2D = true;
        ctx2d = canvas.getContext('2d');
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        context: glTest,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x0b1020, 1);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0b1020, 0.042);

      camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 80);

      // Tunnel guide rings for spatial depth perception
      const ringGeo = new THREE.RingGeometry(3.2, 3.24, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7c5cff,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 14; i++) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.z = -i * 3.2;
        scene.add(ring);
      }

      const cardGeo = new THREE.PlaneGeometry(3.6, 2.25);

      WORKS_DATA.forEach((proj, idx) => {
        const cCanvas = coverCanvases[idx];
        const tex = new THREE.CanvasTexture(cCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        // Decode via createImageBitmap off-thread when available (with flipY for WebGL UV orientation)
        if (typeof window.createImageBitmap === 'function') {
          window
            .createImageBitmap(cCanvas, { imageOrientation: 'flipY' })
            .then((bmp) => {
              tex.image = bmp;
              tex.flipY = false;
              tex.needsUpdate = true;
            })
            .catch(() => {});
        }

        const mat = new THREE.ShaderMaterial({
          vertexShader: CARD_VERT,
          fragmentShader: CARD_FRAG,
          transparent: true,
          uniforms: {
            uTex: { value: tex },
            uActive: { value: idx === 0 ? 1.0 : 0.0 },
            uVelocity: { value: 0.0 },
            uAccent: { value: new THREE.Color(proj.accentColor) },
          },
        });

        const mesh = new THREE.Mesh(cardGeo, mat);
        const pose = getHelixPose(idx);
        mesh.position.set(pose.x, pose.y, pose.z);
        mesh.rotation.z = -Math.sin(pose.angle) * 0.06;
        mesh.rotation.y = -Math.sin(pose.angle) * 0.14;
        scene.add(mesh);
        cardMeshes.push(mesh);
      });

      resizeTunnel();
    } catch (e) {
      renderer = null;
      useCanvas2D = true;
      ctx2d = canvas.getContext('2d');
    }
  }

  function resizeTunnel() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    if (renderer && camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    } else if (useCanvas2D) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  window.addEventListener('resize', resizeTunnel, { passive: true });

  function computeSectionScrollProgress() {
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
    return clamp(-rect.top / scrollable, 0, 1);
  }

  function renderTunnelFrame(now = performance.now()) {
    if (!isIntersecting || isListMode) {
      rafId = null;
      return;
    }

    const dt = Math.min(0.06, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    const rawSectionT = computeSectionScrollProgress();

    // Opening (0..0.07) and closing (0.93..1.00) circular clip-path mask
    if (stageClip && !isReducedMotion()) {
      let circleRadiusPct = 145;
      if (rawSectionT < 0.07) {
        circleRadiusPct = lerp(46, 145, rawSectionT / 0.07);
      } else if (rawSectionT > 0.93) {
        circleRadiusPct = lerp(145, 46, (rawSectionT - 0.93) / 0.07);
      }
      stageClip.style.clipPath = `circle(${circleRadiusPct.toFixed(1)}% at 50% 50%)`;
    } else if (stageClip) {
      stageClip.style.clipPath = 'circle(145% at 50% 50%)';
    }

    // Map middle 80% (0.08..0.92) to the 6 stations
    targetScrollT = clamp((rawSectionT - 0.08) / 0.84, 0, 1);
    const prevSmooth = smoothScrollT;
    smoothScrollT += (targetScrollT - smoothScrollT) * (1 - Math.exp(-dt * 8));
    const velocity = Math.abs(targetScrollT - prevSmooth) * 18;

    const { continuousIndex, activeStation } = computeTunnelStationProgress(smoothScrollT);
    updateHud(activeStation);

    const camPose = getHelixPose(continuousIndex);

    if (renderer && scene && camera) {
      // Position camera directly in front of the current station along the helix
      const isNarrow = window.innerWidth < 768;
      const zDist = isNarrow ? 4.35 : 3.45;
      camera.position.set(camPose.x * 0.92, camPose.y * 0.92, camPose.z + zDist);
      camera.lookAt(camPose.x, camPose.y - (isNarrow ? 0.25 : 0.08), camPose.z);

      cardMeshes.forEach((mesh, idx) => {
        const dist = Math.abs(idx - continuousIndex);
        const activeVal = clamp(1 - dist * 0.85, 0, 1);
        mesh.material.uniforms.uActive.value = activeVal;
        mesh.material.uniforms.uVelocity.value = velocity;
      });

      renderer.render(scene, camera);
    } else if (useCanvas2D && ctx2d) {
      // Clean 2D perspective fallback when WebGL is disabled
      const w = canvas.width || window.innerWidth;
      const h = canvas.height || window.innerHeight;
      ctx2d.fillStyle = '#0B1020';
      ctx2d.fillRect(0, 0, w, h);

      for (let idx = STATION_COUNT - 1; idx >= 0; idx--) {
        const relZ = idx - continuousIndex;
        if (relZ < -0.6 || relZ > 3.5) continue;
        const scale = 1 / (1 + Math.max(0, relZ) * 0.65);
        const cw = Math.min(w * 0.78, 620) * scale;
        const ch = cw * (640 / 1024);
        const cx = w * 0.5 + (idx - continuousIndex) * 90 * scale;
        const cy = h * 0.44 - (idx - continuousIndex) * 32 * scale;
        ctx2d.save();
        ctx2d.globalAlpha = clamp(1 - Math.abs(relZ) * 0.4, 0.15, 1);
        const cov = coverCanvases[idx];
        if (cov) {
          ctx2d.drawImage(cov, cx - cw * 0.5, cy - ch * 0.5, cw, ch);
        }
        ctx2d.restore();
      }
    }

    rafId = requestAnimationFrame(renderTunnelFrame);
  }

  function wakeTunnel() {
    if (rafId === null && isIntersecting && !isListMode) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(renderTunnelFrame);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          isIntersecting = true;
          if (!isListMode) {
            ensureTunnelSetup();
            resizeTunnel();
            wakeTunnel();
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
