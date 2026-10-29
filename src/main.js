import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import {
  TOTAL_STORY_VH,
  OS_TIMES,
  clamp,
  lerp,
  range,
  ease,
  computeTimelineState,
  getFirstUnfinishedGate,
  limitScrollPv,
} from './timeline.js';
import { cardUniforms, disposeCardboard } from './cardboard.js';
import {
  ensureDisplayFont,
  createFirstStoryScreenTexture,
  createCrtMaterial,
  createModernScreenTexture,
} from './crt-screen.js';
import { createConnectScreen } from './connect-screen.js';
import { buildOrLoadRoom } from './room.js';
import { createWallTextManager } from './html-text.js';
import { createOsLayer } from './os.js';
import { startMusic, playMusic, muteMusic, sfx, riser } from './music.js';
import { createCanvas2DRenderer } from './fallback-renderer.js';

/**
 * Cross-module exports for Part 2 integration:
 * - warm(fn): idle-time queue for heavy blocks
 * - setBarColor(css): sets mobile browser theme-color and root background
 * - music / sfx / riser controls
 */
const warmQueue = [];
let warmRunning = false;

export function warm(fn) {
  if (typeof fn !== 'function') return;
  warmQueue.push(fn);
  if (!warmRunning) {
    warmRunning = true;
    const schedule = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 32));
    const step = () => {
      const task = warmQueue.shift();
      if (task) {
        try {
          task();
        } catch (e) {}
      }
      if (warmQueue.length > 0) {
        schedule(step);
      } else {
        warmRunning = false;
      }
    };
    schedule(step);
  }
}

let customBarColor = null;
export function setBarColor(cssColor) {
  customBarColor = cssColor || null;
  if (cssColor) {
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', cssColor);
    document.documentElement.style.backgroundColor = cssColor;
  }
}

export { startMusic, playMusic, muteMusic, sfx, riser };

window.PortfolioAPI = {
  warm,
  setBarColor,
  startMusic,
  playMusic,
  muteMusic,
  sfx,
  riser,
};

// ============================================================================
// CUSTOM FILM SHADER PASS (Chromatic Aberration, 9-Tap Edge Blur, Warm/Cool
// Grade, S-Curve Contrast, Lifted Blacks, Film Grain, Vignette)
// ============================================================================
const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1440, 900) },
    uBlur: { value: 0.0008 },
    uWarm: { value: 1.0 },
    uTime: { value: 0.0 },
    uGrainAmp: { value: 0.028 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uBlur;
    uniform float uWarm;
    uniform float uTime;
    uniform float uGrainAmp;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float aspect = uResolution.x / max(1.0, uResolution.y);
      vec2 propC = vec2(c.x * min(1.0, aspect), c.y * min(1.0, 1.0 / aspect));
      float edgeDist = length(propC);
      float edgeFactor = smoothstep(0.14, 0.68, edgeDist);

      // Cheap 9-tap lens blur sharp in centre, soft at edges + chromatic aberration
      float rBlur = uBlur * edgeFactor;
      vec2 caOffset = c * (0.0022 * edgeFactor);

      vec3 sum = vec3(0.0);
      float totalW = 0.0;
      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          vec2 off = vec2(float(x), float(y)) * rBlur;
          float w = (x == 0 && y == 0) ? 4.0 : (x == 0 || y == 0) ? 2.0 : 1.0;
          float r = texture2D(tDiffuse, clamp(vUv + off - caOffset, 0.001, 0.999)).r;
          float g = texture2D(tDiffuse, clamp(vUv + off, 0.001, 0.999)).g;
          float b = texture2D(tDiffuse, clamp(vUv + off + caOffset, 0.001, 0.999)).b;
          sum += vec3(r, g, b) * w;
          totalW += w;
        }
      }
      vec3 col = sum / totalW;

      // Warm-tungsten to cool-modern grade driven by uWarm
      vec3 warmTint = vec3(1.06, 0.99, 0.91);
      vec3 coolTint = vec3(0.95, 0.99, 1.06);
      col *= mix(coolTint, warmTint, uWarm);

      // Subtle S-curve contrast + lifted blacks
      vec3 sc = col * col * (3.0 - 2.0 * col);
      col = mix(col, sc, 0.24);
      col = mix(vec3(0.025, 0.032, 0.065), col, 0.975);

      // Film grain
      float grain = (hash12(vUv * uResolution + vec2(uTime * 37.0, uTime * 19.0)) - 0.5) * uGrainAmp;
      col += grain;

      // Vignette
      float vig = mix(0.62, 1.0, smoothstep(0.82, 0.22, length(c * vec2(1.0, 1.12))));
      col *= vig;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

// ============================================================================
// MAIN APPLICATION INIT
// ============================================================================
async function initPortfolioStory() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const params = new URLSearchParams(window.location.search);
  const paramP = params.has('p') ? parseFloat(params.get('p')) : null;
  const paramV = params.has('v') ? parseFloat(params.get('v')) : null;
  const paramQ = params.has('q') ? parseInt(params.get('q'), 10) : null;
  const paramDpr = params.has('dpr') ? parseFloat(params.get('dpr')) : null;
  const paramSkin = params.has('skin') ? parseInt(params.get('skin'), 10) : null;
  const paramNoStory = params.has('nostory');
  const paramReduceMotion = params.get('motion') === 'reduce';

  const mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReducedMotion = () => paramReduceMotion || mediaReduce.matches;
  if (isReducedMotion()) {
    document.documentElement.classList.add('reduce-motion');
  }

  const canvas = document.getElementById('scene');
  const loaderEl = document.getElementById('loader');
  const loaderGlow = document.getElementById('loader-glow');
  const loaderStatus = document.getElementById('loader-status');
  const loaderFile = document.getElementById('loader-file');
  const loaderPct = document.getElementById('loader-pct');
  const headerEl = document.getElementById('top-header');
  const skipBtn = document.getElementById('skip-btn');
  const replayBtn = document.getElementById('replay-btn');
  const hintPill = document.getElementById('hint-pill');
  const hintText = document.getElementById('hint-text');
  const contentEl = document.getElementById('content');
  const langToggle = document.getElementById('lang-toggle');
  const logoTopLink = document.getElementById('logo-top-link');

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      if (window.toggleLang) window.toggleLang();
      sfx('click', 0.22);
    });
  }

  // Canvas dimensions helper (always reads the 100lvh canvas, not window)
  const VW = () => canvas.clientWidth || window.innerWidth;
  const VH = () => canvas.clientHeight || window.innerHeight;
  const isPhone = () => VW() < 768 || window.matchMedia('(pointer: coarse)').matches;

  // Detect GPU & Software WebGL
  const gpuProbe = (() => {
    if (params.get('renderer') === '2d') {
      return { hasWebGL: false, isSoftwareGl: true, isWeakGpu: true, rendererName: 'canvas2d' };
    }
    try {
      const c = document.createElement('canvas');
      const gl =
        c.getContext('webgl2', { powerPreference: 'high-performance' }) ||
        c.getContext('webgl', { powerPreference: 'high-performance' }) ||
        c.getContext('experimental-webgl');
      if (!gl) {
        return { hasWebGL: false, isSoftwareGl: true, isWeakGpu: true, rendererName: 'none' };
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const name = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      const isSw = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(name);
      const isStrong = /NVIDIA|Radeon RX|GeForce|RTX|GTX/i.test(name);
      const isWeak =
        isSw ||
        (!isStrong && /Intel|UHD|Iris|Mali|Adreno|PowerVR|Apple GPU/i.test(name));
      return { hasWebGL: true, isSoftwareGl: isSw, isWeakGpu: isWeak, rendererName: name };
    } catch (e) {
      return { hasWebGL: false, isSoftwareGl: true, isWeakGpu: true, rendererName: 'unknown' };
    }
  })();

  const isSoftwareGl = gpuProbe.isSoftwareGl;

  // Quality tiers: 2 = AO + bloom, 1 = bloom only, 0 = minimal
  let qualityTier =
    paramQ !== null && !Number.isNaN(paramQ)
      ? clamp(paramQ, 0, 2)
      : isSoftwareGl
      ? 0
      : isPhone() || gpuProbe.isWeakGpu
      ? 1
      : 2;

  function computeInitialDpr() {
    if (paramDpr !== null && !Number.isNaN(paramDpr)) {
      return clamp(paramDpr, 0.5, 2.5);
    }
    if (isSoftwareGl) return 1.0;
    const rawDpr = window.devicePixelRatio || 1;
    if (isPhone()) {
      const budget = Math.sqrt(650000 / Math.max(1, VW() * VH()));
      return Math.max(1.0, Math.min(rawDpr, 2.0, budget));
    }
    return gpuProbe.isWeakGpu ? Math.min(rawDpr, 0.75) : Math.min(rawDpr, 1.5);
  }

  let currentDpr = computeInitialDpr();
  let pendingDpr = null;

  // Loader state & pointer glow
  let realLoadPct = 5;
  let shownLoadPct = 0;
  const loaderGlowPos = { x: VW() * 0.5, y: VH() * 0.5, tx: VW() * 0.5, ty: VH() * 0.5 };

  window.addEventListener(
    'pointermove',
    (e) => {
      loaderGlowPos.tx = e.clientX;
      loaderGlowPos.ty = e.clientY;
    },
    { passive: true }
  );

  function updateLoaderText(pct) {
    const stages = window.STORY_COPY?.loader || [];
    let chosen = stages[0];
    for (const s of stages) {
      if (pct >= s.threshold) chosen = s;
    }
    if (pct >= 97 && pct < 100) {
      const wu = window.STORY_COPY?.loaderWarmup;
      loaderStatus.textContent = window.L ? window.L(wu?.en || 'Warming up', wu?.fil || 'Inihahanda') : 'Warming up';
      loaderFile.textContent = 'gpu/compile_shaders.bin';
    } else if (chosen) {
      loaderStatus.textContent = window.L ? window.L(chosen.en, chosen.fil) : chosen.en;
      loaderFile.textContent = chosen.file;
    }
    loaderPct.textContent = `${Math.round(pct)}%`;
  }

  // ==========================================================================
  // THREE.JS SCENE, RENDERER & POST-PROCESSING
  // ==========================================================================
  let room = null;
  let crtMaterial = null;
  let modernScreenTex = null;
  let dustGeom = null;
  let dustMat = null;

  let renderer = null;
  if (gpuProbe.hasWebGL) {
    try {
      const ctxAttrs = {
        alpha: false,
        antialias: !isSoftwareGl && qualityTier > 0,
        powerPreference: 'high-performance',
      };
      const glContext =
        canvas.getContext('webgl2', ctxAttrs) ||
        canvas.getContext('webgl', ctxAttrs) ||
        canvas.getContext('experimental-webgl', ctxAttrs);
      if (glContext) {
        renderer = new THREE.WebGLRenderer({
          canvas,
          context: glContext,
          antialias: !isSoftwareGl && qualityTier > 0,
          powerPreference: 'high-performance',
          alpha: false,
        });
      }
    } catch (err) {
      renderer = null;
    }
  }

  if (!renderer) {
    renderer = createCanvas2DRenderer({
      canvas,
      getRoom: () => room,
      getCrtMaterial: () => crtMaterial,
      getModernScreenTex: () => modernScreenTex,
      getDustGeom: () => dustGeom,
      getDustMat: () => dustMat,
      cardUniforms,
    });
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(currentDpr);
  renderer.setSize(VW(), VH(), false);
  renderer.shadowMap.enabled = !isSoftwareGl && !renderer.isFallback2D;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const nightBgColor = new THREE.Color(0x0b1020);
  const hazeBgColor = new THREE.Color(0x5a4436);
  const currentFogColor = new THREE.Color(0x5a4436);
  scene.background = currentFogColor;
  scene.fog = new THREE.FogExp2(0x5a4436, 0.08);

  const camera = new THREE.PerspectiveCamera(45, VW() / VH(), 0.08, 25);

  // Studio environment reflections (RoomEnvironment at intensity 0.05)
  if (!renderer.isFallback2D) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      if ('environmentIntensity' in scene) {
        scene.environmentIntensity = 0.05;
      }
      pmrem.dispose();
    } catch (e) {}
  }

  realLoadPct = 28;
  await ensureDisplayFont();
  realLoadPct = 45;

  // Build CRT & Modern Screen textures
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const firstScreen = createFirstStoryScreenTexture(maxAniso);
  modernScreenTex = createModernScreenTexture(isPhone());
  crtMaterial = createCrtMaterial(firstScreen.texture);

  // Build or Load the 3D Room
  try {
    room = await buildOrLoadRoom({
      scene,
      crtMaterial,
      modernScreenTexture: modernScreenTex,
      isPhone: isPhone(),
      onProgress: (p) => {
        realLoadPct = 45 + Math.round(p * 42);
      },
    });
  } catch (err) {
    const errCopy = window.STORY_COPY?.loaderError;
    loaderStatus.textContent = window.L
      ? window.L(errCopy?.en || "Couldn't load, please refresh", errCopy?.fil || 'Paki-refresh')
      : "Couldn't load, please refresh";
    return;
  }

  // Create Connect Screen and bind to CRT material until connected
  let entered = false;
  let tubeFlickerStart = -1;

  const connectScreen = createConnectScreen({
    screenMesh: room.oldScreen,
    camera,
    domElement: canvas,
    sfx,
    maxAnisotropy: maxAniso,
    onConnected: () => {
      startMusic();
      tubeFlickerStart = performance.now();
    },
  });

  crtMaterial.uniforms.tMap.value = connectScreen.texture;

  window.addEventListener('langchange', () => {
    firstScreen.redraw();
    updateLoaderText(shownLoadPct);
  });

  // ==========================================================================
  // LIGHTS & ~260 ADDITIVE DUST PARTICLES
  // ==========================================================================
  // 1. Warm desk SpotLight key (#ff9a45, intensity ~3.4, angle .95, penumbra .75, soft shadow)
  const oldLampPos = new THREE.Vector3(-0.56, 1.24, -0.88);
  const newLampPos = new THREE.Vector3(-0.56, 1.33, -0.94);
  const oldLampTarget = new THREE.Vector3(0.0, 0.78, -0.92);
  const newLampTarget = new THREE.Vector3(0.0, 0.85, -0.96);

  const deskSpot = new THREE.SpotLight(0xff9a45, 3.4, 5.5, 0.95, 0.75, 1.2);
  deskSpot.position.copy(oldLampPos);
  deskSpot.target.position.copy(oldLampTarget);
  deskSpot.castShadow = !isSoftwareGl;
  deskSpot.shadow.mapSize.set(1024, 1024);
  deskSpot.shadow.bias = -0.0005;
  deskSpot.shadow.normalBias = 0.02;
  deskSpot.shadow.camera.near = 0.15;
  deskSpot.shadow.camera.far = 4.0;
  scene.add(deskSpot);
  scene.add(deskSpot.target);

  // 2. Cold moon DirectionalLight (#7fa6ff, 1.6) through window
  const moonLight = new THREE.DirectionalLight(0x7fa6ff, 1.6);
  moonLight.position.set(-2.8, 2.3, -0.25);
  moonLight.target.position.set(0.2, 0.7, -0.95);
  moonLight.castShadow = false; // Keep 1 primary shadow-caster for crisp performance
  scene.add(moonLight);
  scene.add(moonLight.target);

  // 3. Very low HemisphereLight
  const hemiSkyWarm = new THREE.Color(0x282238);
  const hemiSkyCool = new THREE.Color(0x2b3b68);
  const hemiGndWarm = new THREE.Color(0x120e1a);
  const hemiGndCool = new THREE.Color(0x0b1020);
  const hemiLight = new THREE.HemisphereLight(0x282238, 0x120e1a, 0.42);
  scene.add(hemiLight);

  // 4. Accent LED-strip SpotLight behind desk that fades in with the modern era
  const ledSpot = new THREE.SpotLight(0x7c5cff, 0.0, 4.2, 1.25, 0.85, 1.2);
  ledSpot.position.set(0, 0.85, -1.22);
  ledSpot.target.position.set(0, 1.75, -1.32);
  scene.add(ledSpot);
  scene.add(ledSpot.target);

  // 5. ~260 additive dust points drifting on sin/cos
  const DUST_COUNT = 260;
  dustGeom = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_COUNT * 3);
  const dustSeeds = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 3.4;
    dustPos[i * 3 + 1] = 0.25 + Math.random() * 2.1;
    dustPos[i * 3 + 2] = -1.2 + Math.random() * 2.4;
    dustSeeds[i * 3] = Math.random() * Math.PI * 2;
    dustSeeds[i * 3 + 1] = 0.3 + Math.random() * 0.7;
    dustSeeds[i * 3 + 2] = dustPos[i * 3 + 1];
  }
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustMat = new THREE.PointsMaterial({
    color: 0xffcfa0,
    size: 0.018,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeom, dustMat);
  scene.add(dustPoints);

  // ==========================================================================
  // POST-PROCESSING COMPOSER
  // ==========================================================================
  let composer = null;
  let gtaoPass = null;
  let bloomPass = { enabled: false };
  let filmPass = {
    uniforms: {
      uResolution: { value: new THREE.Vector2(VW(), VH()) },
      uBlur: { value: 0.0008 },
      uWarm: { value: 1.0 },
      uTime: { value: 0.0 },
      uGrainAmp: { value: 0.028 },
    },
  };

  if (!renderer.isFallback2D) {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    if (!isPhone() && !isSoftwareGl) {
      try {
        gtaoPass = new GTAOPass(scene, camera, VW(), VH());
        gtaoPass.output = GTAOPass.OUTPUT.Default;
        gtaoPass.enabled = qualityTier >= 2;
        composer.addPass(gtaoPass);
      } catch (e) {
        gtaoPass = null;
      }
    }

    bloomPass = new UnrealBloomPass(new THREE.Vector2(VW(), VH()), 0.62, 0.6, 0.93);
    bloomPass.enabled = qualityTier >= 1 && !isSoftwareGl;
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    filmPass = new ShaderPass(FilmShader);
    filmPass.uniforms.uResolution.value.set(VW(), VH());
    composer.addPass(filmPass);
  } else {
    composer = {
      setSize() {},
      render() {
        renderer.render(scene, camera);
      },
    };
  }

  // ==========================================================================
  // CAMERA POSES (CLOSE, WIDE, CLOSE_M) & PARALLAX
  // ==========================================================================
  const poseClose = {
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 38,
  };
  const poseWide = {
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 45,
  };
  const poseCloseM = {
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 30,
  };
  const wideCameraHelper = new THREE.PerspectiveCamera(45, VW() / VH(), 0.08, 25);

  function computeCameraPoses() {
    const w = VW();
    const h = VH();
    const aspect = w / Math.max(1, h);

    // 1. CLOSE shot on old CRT screen
    const sSize = room.oldScreenSize;
    const sCenter = room.oldScreenCenter;
    const closeFov = 38;
    const tanHalfClose = Math.tan(THREE.MathUtils.degToRad(closeFov * 0.5));
    let closeD;
    let shiftX = 0;
    if (aspect < 0.8) {
      const fitMult = entered ? 1.28 : 1.08;
      closeD = (sSize.x * fitMult) / (aspect * 2 * tanHalfClose);
      shiftX = -0.062 * sSize.x;
    } else {
      closeD = Math.max(sSize.y / 0.78, sSize.x / (0.9 * aspect)) / (2 * tanHalfClose);
    }
    poseClose.fov = closeFov;
    poseClose.pos.set(sCenter.x + shiftX, sCenter.y, sCenter.z + closeD);
    poseClose.target.set(sCenter.x + shiftX, sCenter.y, sCenter.z);

    // 2. WIDE shot
    const isPortraitPhone = aspect < 0.85;
    const hFovDeg = isPortraitPhone ? 82 : 62;
    const hFovRad = THREE.MathUtils.degToRad(hFovDeg);
    const vFovRad = 2 * Math.atan(Math.tan(hFovRad * 0.5) / aspect);
    const vFovDeg = clamp(THREE.MathUtils.radToDeg(vFovRad), 35, 74);

    poseWide.fov = vFovDeg;
    if (isPortraitPhone) {
      poseWide.pos.set(0, 1.32, 1.28);
      poseWide.target.set(0, 1.13, -1.45);
    } else {
      poseWide.pos.set(0, 1.36, 1.62);
      poseWide.target.set(0, 1.22, -1.3);
    }

    wideCameraHelper.fov = poseWide.fov;
    wideCameraHelper.aspect = aspect;
    wideCameraHelper.position.copy(poseWide.pos);
    wideCameraHelper.lookAt(poseWide.target);
    wideCameraHelper.updateProjectionMatrix();
    wideCameraHelper.updateMatrixWorld(true);

    // 3. CLOSE_M shot on modern monitor SCREEN_modern
    const msSize = room.modernScreenSize;
    const msCenter = room.modernScreenCenter;
    const closeMFov = 30;
    const tM = 2 * Math.tan(THREE.MathUtils.degToRad(closeMFov * 0.5));
    let closeMD;
    if (aspect < 0.85) {
      closeMD = msSize.x / 2.3 / aspect / tM;
    } else {
      closeMD = Math.max(msSize.y / 0.94, msSize.x / (0.96 * aspect)) / tM;
    }
    poseCloseM.fov = closeMFov;
    poseCloseM.pos.set(msCenter.x, msCenter.y, msCenter.z + closeMD);
    poseCloseM.target.copy(msCenter);
  }

  computeCameraPoses();

  // ==========================================================================
  // WALL TEXT & STORY OS LAYER
  // ==========================================================================
  const wallStage = document.getElementById('wall-stage');
  const wallText = createWallTextManager({
    stageEl: wallStage,
    getWideCamera: () => wideCameraHelper,
    getScreenSize: () => ({ width: VW(), height: VH() }),
    roomInfo: room,
  });
  wallText.layoutFromWideShot();

  let hintTimeout = null;
  function showHintPill(mode, durationMs = 4000) {
    if (!hintPill || !hintText) return;
    const key =
      mode === 'hold'
        ? 'ui.hint.hold'
        : mode === 'button'
        ? 'ui.hint.button'
        : 'ui.hint.scroll';
    hintText.setAttribute('data-i18n', key);
    const pair = window.I18N_STRINGS?.[key];
    if (pair) {
      hintText.textContent = window.__LANG === 'fil' ? pair[1] : pair[0];
    }
    hintPill.classList.add('visible');
    if (hintTimeout) clearTimeout(hintTimeout);
    if (durationMs > 0) {
      hintTimeout = window.setTimeout(() => {
        hintPill.classList.remove('visible');
      }, durationMs);
    }
  }

  function scrollToPv(targetPv, instant = false) {
    const y = (targetPv / 100) * window.innerHeight;
    window.scrollTo({
      top: y,
      behavior: instant || isReducedMotion() ? 'auto' : 'smooth',
    });
  }

  const osMount = document.getElementById('os-mount');
  const osLayer = createOsLayer({
    mountEl: osMount,
    modernScreenMesh: room.modernScreen,
    camera,
    getScreenSize: () => ({ width: VW(), height: VH() }),
    isReducedMotion,
    sfx,
    riser,
    onScrollToPv: (pvTarget) => scrollToPv(pvTarget, false),
    onShowHint: (mode, dur) => showHintPill(mode, dur),
  });

  // ==========================================================================
  // SCROLL GATING AT INPUT (Wheel, Touchmove, Keydown)
  // ==========================================================================
  let progressPv = 0;
  let targetPv = 0;

  function getFrozenPv() {
    if (paramV !== null && !Number.isNaN(paramV)) return clamp(paramV, 0, TOTAL_STORY_VH + 120);
    if (paramP !== null && !Number.isNaN(paramP)) return clamp(paramP, 0, 1) * TOTAL_STORY_VH;
    return null;
  }

  window.addEventListener(
    'wheel',
    (e) => {
      if (!entered) {
        e.preventDefault();
        return;
      }
      if (e.deltaY <= 0) return;
      const firstGate = getFirstUnfinishedGate(osLayer.gates);
      if (!firstGate) return;
      const limitPx = ((firstGate.at + 3) / 100) * window.innerHeight;
      if (window.scrollY + e.deltaY > limitPx) {
        e.preventDefault();
        window.scrollTo(0, (firstGate.at / 100) * window.innerHeight);
        osLayer.nudge();
      }
    },
    { passive: false }
  );

  let touchStartY = 0;
  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      if (!entered) {
        e.preventDefault();
        return;
      }
      if (!e.touches || e.touches.length === 0) return;
      const dy = touchStartY - e.touches[0].clientY; // positive when dragging finger up (scrolling down)
      if (dy <= 0) return;
      const firstGate = getFirstUnfinishedGate(osLayer.gates);
      if (!firstGate) return;
      const limitPx = (firstGate.at / 100) * window.innerHeight;
      if (window.scrollY >= limitPx - 2) {
        e.preventDefault();
        window.scrollTo(0, limitPx);
        osLayer.nudge();
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    if (!entered) return;
    if (e.target !== document.body && e.target !== document.documentElement) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      const firstGate = getFirstUnfinishedGate(osLayer.gates);
      if (!firstGate) return;
      const limitPx = (firstGate.at / 100) * window.innerHeight;
      if (window.scrollY >= limitPx - 10) {
        e.preventDefault();
        window.scrollTo(0, limitPx);
        osLayer.nudge();
      }
    }
  });

  // ==========================================================================
  // SKIP, REPLAY, TOP LOGO & DEEP LINKS
  // ==========================================================================
  function enterStoryRoom() {
    if (entered) return;
    entered = true;
    document.body.classList.add('entered');
    crtMaterial.uniforms.tMap.value = firstScreen.texture;
    crtMaterial.uniforms.power.value = 1.0;
    computeCameraPoses();
    showHintPill('scroll', 5000);
  }

  function skipEntireStory() {
    enterStoryRoom();
    osLayer.skipAll();
    if (contentEl) {
      contentEl.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function replayStory() {
    window.scrollTo(0, 0);
    progressPv = 0;
    targetPv = 0;
    window.setTimeout(() => {
      osLayer.reset();
      room.setActiveEra(false);
      renderer.shadowMap.needsUpdate = true;
      document.body.classList.remove('at-end', 'past-story', 'content-covered');
      showHintPill('scroll', 4500);
    }, 50);
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      sfx('click', 0.25);
      skipEntireStory();
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      sfx('click', 0.25);
      replayStory();
    });
  }

  if (logoTopLink) {
    logoTopLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  // Handle deep links (#about, #numbers, #work, #contact, #content) or ?nostory
  const hash = window.location.hash;
  const isDeepLink =
    paramNoStory ||
    ['#about', '#numbers', '#work', '#contact', '#content'].includes(hash);

  // If frozen testing query param (?v= or ?p=) is used, configure gates to match target position
  const frozenPv = getFrozenPv();
  if (frozenPv !== null) {
    enterStoryRoom();
    if (paramSkin === 2) {
      osLayer.hold.h = 1.25;
    } else if (paramSkin === 3) {
      osLayer.gates.hold.done = true;
      osLayer.hold.h = 2;
    }
    if (frozenPv > OS_TIMES.gates.hold.at + 2) {
      osLayer.gates.hold.done = true;
      osLayer.hold.h = 2;
    }
    if (frozenPv > OS_TIMES.gates.statement.at + 2) {
      osLayer.gates.statement.done = true;
    }
    if (frozenPv > OS_TIMES.gates.error.at + 2) {
      osLayer.gates.error.done = true;
    }
    if (frozenPv > OS_TIMES.gates.success.at + 2) {
      osLayer.gates.success.done = true;
    }
    progressPv = frozenPv;
    targetPv = frozenPv;
  } else {
    window.scrollTo(0, 0);
  }

  // ==========================================================================
  // SHADER PRE-COMPILATION & TEXTURE UPLOAD BEHIND LOADER
  // ==========================================================================
  realLoadPct = 97;
  updateLoaderText(97);

  // Upload textures to GPU
  if (renderer.initTexture) {
    renderer.initTexture(firstScreen.texture);
    renderer.initTexture(connectScreen.texture);
    renderer.initTexture(modernScreenTex);
    if (cardUniforms.uCardTex.value) {
      renderer.initTexture(cardUniforms.uCardTex.value);
    }
  }

  // Render once with era at 0 (old) and once with era at 0.5 (new) so every shader compiles behind loader
  camera.position.copy(poseWide.pos);
  camera.lookAt(poseWide.target);
  camera.updateMatrixWorld(true);

  cardUniforms.uMod.value = 0.0;
  room.setActiveEra(false);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  cardUniforms.uMod.value = 0.6;
  room.setActiveEra(true);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  // Reset back to initial state and bake initial shadow map once
  cardUniforms.uMod.value = 0.0;
  room.setActiveEra(false);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  if (renderer.compileAsync) {
    try {
      await renderer.compileAsync(scene, camera);
    } catch (e) {}
  }

  realLoadPct = 100;

  if (isDeepLink) {
    shownLoadPct = 100;
    updateLoaderText(100);
    document.body.classList.add('ready');
    skipEntireStory();
    const targetBlock = document.querySelector(hash) || contentEl;
    if (targetBlock) {
      window.setTimeout(() => targetBlock.scrollIntoView(), 50);
    }
  } else if (frozenPv !== null || params.has('connect')) {
    shownLoadPct = 100;
    updateLoaderText(100);
    document.body.classList.add('ready');
  }

  // ==========================================================================
  // MOUSE PARALLAX & RESIZE HANDLING
  // ==========================================================================
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (isFinePointer) {
    window.addEventListener(
      'pointermove',
      (e) => {
        mouse.tx = (e.clientX / Math.max(1, VW())) * 2 - 1;
        mouse.ty = (e.clientY / Math.max(1, VH())) * 2 - 1;
      },
      { passive: true }
    );
  }

  let lastCanvasW = VW();
  let lastCanvasH = VH();

  window.addEventListener('resize', () => {
    const w = VW();
    const h = VH();
    // Ignore phone toolbar resizes unless the 100lvh canvas dimensions actually changed
    if (w === lastCanvasW && h === lastCanvasH) return;
    lastCanvasW = w;
    lastCanvasH = h;

    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();

    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    filmPass.uniforms.uResolution.value.set(w, h);

    computeCameraPoses();
    wallText.layoutFromWideShot();

    if (isSoftwareGl || qualityTier === 0) {
      renderer.render(scene, camera);
    } else {
      composer.render();
    }
  });

  // ==========================================================================
  // ADAPTIVE QUALITY & BAR COLOR SAMPLING
  // ==========================================================================
  let slowFrameCount = 0;
  let smoothTimeAccum = 0;
  let stepUpCount = 0;
  let lastBarSampleAt = 0;
  const pixelBuf = new Uint8Array(4);

  function sampleBottomBarColor(now) {
    if (customBarColor || now - lastBarSampleAt < 400) return;
    lastBarSampleAt = now;
    try {
      const gl = renderer.getContext();
      let hex;
      if (gl && typeof gl.readPixels === 'function') {
        const px = Math.floor((VW() * renderer.getPixelRatio()) * 0.5);
        gl.readPixels(px, 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuf);
        hex = `#${pixelBuf[0].toString(16).padStart(2, '0')}${pixelBuf[1]
          .toString(16)
          .padStart(2, '0')}${pixelBuf[2].toString(16).padStart(2, '0')}`;
      } else if (scene.background) {
        hex = `#${scene.background.getHexString()}`;
      }
      if (hex) {
        const meta = document.getElementById('theme-color-meta');
        if (meta) meta.setAttribute('content', hex);
        document.documentElement.style.backgroundColor = hex;
      }
    } catch (e) {}
  }

  // Pre-allocated scratch vectors for 0-GC render loop
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const wideMixPos = new THREE.Vector3();
  const wideMixTarget = new THREE.Vector3();
  const warmLampColor = new THREE.Color(0xff9a45);
  const coolLampColor = new THREE.Color(0xc8dcff);
  const warmDustColor = new THREE.Color(0xffcfa0);
  const coolDustColor = new THREE.Color(0x9ec5ff);

  let lastFrameTime = performance.now();
  let elapsedTotal = 0;
  let currentActiveEraIsNew = false;
  let stableFrames = 0;
  const bootStartAt = performance.now();

  function afterDraw(cb) {
    const gl = renderer.getContext();
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          window.setTimeout(cb, 80);
        }
      };
      window.setTimeout(poll, 5);
    } else {
      window.setTimeout(cb, 80);
    }
  }

  function tick(now = performance.now()) {
    const rawDt = Math.max(0.001, (now - lastFrameTime) / 1000);
    const dt = Math.min(0.1, rawDt);
    lastFrameTime = now;
    elapsedTotal += dt;

    // 1. Apply any pending DPR change at the START of the frame before drawing
    if (pendingDpr !== null) {
      currentDpr = pendingDpr;
      pendingDpr = null;
      renderer.setPixelRatio(currentDpr);
      composer.setSize(VW(), VH());
    }

    // 2. Loader progression & stability check
    if (!document.body.classList.contains('ready')) {
      loaderGlowPos.x += (loaderGlowPos.tx - loaderGlowPos.x) * 0.12;
      loaderGlowPos.y += (loaderGlowPos.ty - loaderGlowPos.y) * 0.12;
      if (loaderGlow) {
        loaderGlow.style.left = `${loaderGlowPos.x.toFixed(1)}px`;
        loaderGlow.style.top = `${loaderGlowPos.y.toFixed(1)}px`;
      }

      if (shownLoadPct < realLoadPct) {
        shownLoadPct = Math.min(realLoadPct, shownLoadPct + Math.max(1.2, dt * 42));
        updateLoaderText(shownLoadPct);
      }

      if (realLoadPct >= 100 && shownLoadPct >= 99.5) {
        if (rawDt < 0.034 || isSoftwareGl) {
          stableFrames++;
        } else {
          stableFrames = Math.max(0, stableFrames - 1);
        }
        if (stableFrames >= 20 || now - bootStartAt > 2500 || isSoftwareGl) {
          shownLoadPct = 100;
          updateLoaderText(100);
          document.body.classList.add('ready');
        }
      }
    }

    // 3. Check if #content completely covers the room (its top <= 0)
    if (contentEl) {
      const cRect = contentEl.getBoundingClientRect();
      const isPastStory = cRect.top < window.innerHeight * 0.6;
      headerEl?.classList.toggle('past-story', isPastStory);
      document.body.classList.toggle('past-story', isPastStory);

      if (cRect.top <= 0 && frozenPv === null) {
        if (canvas.style.visibility !== 'hidden') {
          canvas.style.visibility = 'hidden';
          document.body.classList.add('content-covered');
        }
        if (isSoftwareGl) afterDraw(tick);
        else requestAnimationFrame(tick);
        return;
      } else if (canvas.style.visibility === 'hidden') {
        canvas.style.visibility = 'visible';
        document.body.classList.remove('content-covered');
      }
    }

    headerEl?.classList.toggle('scrolled', window.scrollY > 20);

    // 4. Opening CRT Connect Screen & Tube Flicker Transition
    if (!entered) {
      connectScreen.update(dt);
      if (tubeFlickerStart > 0) {
        const sinceConnect = (now - tubeFlickerStart) / 1000;
        if (sinceConnect >= 1.1 && sinceConnect < 1.75) {
          const flkT = (sinceConnect - 1.1) / 0.65;
          if (flkT < 0.22) {
            crtMaterial.uniforms.power.value = 0.05;
          } else {
            crtMaterial.uniforms.tMap.value = firstScreen.texture;
            crtMaterial.uniforms.power.value = lerp(0.05, 1.0, (flkT - 0.22) / 0.78);
          }
        } else if (sinceConnect >= 1.75) {
          enterStoryRoom();
        }
      }
    }

    // 5. Compute & Gate Story Scroll Position pv (in vh)
    const fPv = getFrozenPv();
    if (fPv !== null) {
      targetPv = fPv;
      progressPv = fPv;
    } else if (entered) {
      const rawPv = (window.scrollY / Math.max(1, window.innerHeight)) * 100;
      const firstGate = getFirstUnfinishedGate(osLayer.gates);
      if (firstGate && !osLayer.isHolding() && rawPv > firstGate.at + 3) {
        window.scrollTo(0, (firstGate.at / 100) * window.innerHeight);
      }
      targetPv = limitScrollPv(rawPv, osLayer.gates);
      progressPv += (targetPv - progressPv) * (1 - Math.exp(-dt * 5));

      if (rawPv > 18 && hintPill?.classList.contains('visible') && !firstGate) {
        hintPill.classList.remove('visible');
      }
    } else {
      targetPv = 0;
      progressPv = 0;
    }

    const tState = computeTimelineState(progressPv);
    document.body.classList.toggle('at-end', tState.atEnd);

    // 6. Update Cardboard & Era Shader Uniforms
    cardUniforms.uReveal.value = tState.uReveal;
    cardUniforms.uCardFloor.value = tState.uCardFloor;
    cardUniforms.uMod.value = tState.mod;
    cardUniforms.uWaveA.value = tState.waveA;
    cardUniforms.uWaveB.value = tState.waveB;

    // Swap Era Meshes & Re-bake Shadows ONCE when era flips at mod = 0.5
    if (tState.isNewEra !== currentActiveEraIsNew) {
      currentActiveEraIsNew = tState.isNewEra;
      room.setActiveEra(currentActiveEraIsNew);
      renderer.shadowMap.needsUpdate = true;
    }

    // Hide old CRT glass early (visible only while mod < 0.1)
    if (room.oldScreen) {
      room.oldScreen.visible = tState.mod < 0.1;
    }
    const basePower =
      (1 - 0.25 * tState.wall1In * (1 - tState.wall1Out)) *
      (1 - range(tState.mod, 0.04, 0.1));
    if (entered) {
      crtMaterial.uniforms.power.value = Math.max(0, basePower);
    }

    // 7. Lighting Grade & Haze Interpolation
    const kGrade = tState.gradeK;
    deskSpot.color.copy(warmLampColor).lerp(coolLampColor, kGrade);
    deskSpot.intensity = lerp(3.4, 2.2, kGrade);
    deskSpot.position.copy(oldLampPos).lerp(newLampPos, kGrade);
    deskSpot.target.position.copy(oldLampTarget).lerp(newLampTarget, kGrade);
    deskSpot.angle = lerp(0.95, 1.15, kGrade);

    hemiLight.color.copy(hemiSkyWarm).lerp(hemiSkyCool, kGrade);
    hemiLight.groundColor.copy(hemiGndWarm).lerp(hemiGndCool, kGrade);
    hemiLight.intensity = lerp(0.42, 0.65, kGrade);
    ledSpot.intensity = tState.ledIntensity;

    // Update dust particles & tint
    dustMat.color.copy(warmDustColor).lerp(coolDustColor, kGrade);
    const posAttr = dustGeom.attributes.position;
    for (let i = 0; i < DUST_COUNT; i++) {
      const seed = dustSeeds[i * 3];
      const spd = dustSeeds[i * 3 + 1];
      const baseY = dustSeeds[i * 3 + 2];
      posAttr.array[i * 3 + 1] = baseY + Math.sin(elapsedTotal * spd + seed) * 0.08;
      posAttr.array[i * 3] += Math.cos(elapsedTotal * 0.4 * spd + seed) * 0.0003;
    }
    posAttr.needsUpdate = true;

    // 8. Camera Path & Mouse Parallax + Hold Tension Tremble
    wideMixPos.copy(poseClose.pos).lerp(poseWide.pos, tState.pullT);
    wideMixTarget.copy(poseClose.target).lerp(poseWide.target, tState.pullT);
    const wideMixFov = lerp(poseClose.fov, poseWide.fov, tState.pullT);

    camPos.copy(wideMixPos).lerp(poseCloseM.pos, tState.pushZ);
    camTarget.copy(wideMixTarget).lerp(poseCloseM.target, tState.pushZ);
    let activeFov = lerp(wideMixFov, poseCloseM.fov, tState.pushZ);

    // Smooth mouse parallax
    const mouseLerp = 1 - Math.exp(-dt * 2.6);
    mouse.x += (mouse.tx - mouse.x) * mouseLerp;
    mouse.y += (mouse.ty - mouse.y) * mouseLerp;

    const motionScale = isReducedMotion() ? 0.6 : 1.0;
    const paraK = (0.35 + 0.65 * tState.pullT) * (1 - 0.9 * tState.pushZ) * motionScale;
    camPos.x += mouse.x * 0.22 * paraK;
    camPos.y -= mouse.y * 0.1 * paraK;
    camTarget.x += mouse.x * 0.05 * paraK;
    camTarget.y -= mouse.y * 0.03 * paraK;

    // Hold tension camera FOV tightening & tremble
    const tension = osLayer.getTension();
    if (tension > 0.001 && !isReducedMotion()) {
      activeFov *= 1 - 0.06 * tension;
      camPos.x += (Math.random() - 0.5) * 0.008 * tension;
      camPos.y += (Math.random() - 0.5) * 0.008 * tension;
    }

    camera.fov = activeFov;
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.rotation.z += -mouse.x * 0.008 * paraK;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    // Haze density & colour lerp
    const distToScreen = Math.max(0.35, camera.position.distanceTo(room.oldScreenCenter));
    scene.fog.density = lerp(0.12 / distToScreen, 0.02, tState.hazeR);
    currentFogColor.copy(hazeBgColor).lerp(nightBgColor, tState.hazeR);

    // 9. Update Wall HTML Headlines & OS Layer
    wallText.update(tState, camera);
    osLayer.update(rawDt, tState);

    // 10. Update Post-Processing Film Uniforms
    const baseBlur = lerp(0.006, 0.0018, tState.pullT);
    filmPass.uniforms.uBlur.value = entered ? baseBlur : baseBlur * 0.15;
    filmPass.uniforms.uWarm.value = 1.0 - kGrade;
    filmPass.uniforms.uTime.value = isReducedMotion() ? 0.0 : elapsedTotal;

    // 11. Render Scene
    if (isSoftwareGl || qualityTier === 0) {
      renderer.render(scene, camera);
    } else {
      composer.render();
    }

    sampleBottomBarColor(now);

    // 12. Adaptive Quality Monitoring (skip when ?q or ?dpr is set or tab is hidden)
    if (paramQ === null && paramDpr === null && !document.hidden && !isSoftwareGl) {
      const frameMs = rawDt * 1000;
      if (frameMs > 21.5) {
        slowFrameCount++;
        smoothTimeAccum = 0;
        if (slowFrameCount >= 45) {
          slowFrameCount = 0;
          if (gtaoPass && gtaoPass.enabled) {
            gtaoPass.enabled = false;
            qualityTier = 1;
          } else if (currentDpr > 0.65 && !isPhone()) {
            pendingDpr = Math.max(0.5, currentDpr * 0.8);
          } else if (bloomPass.enabled) {
            bloomPass.enabled = false;
            qualityTier = 0;
          }
        }
      } else if (frameMs < 17.5) {
        slowFrameCount = Math.max(0, slowFrameCount - 1);
        smoothTimeAccum += rawDt;
        if (smoothTimeAccum >= 4.0 && stepUpCount < 3 && currentDpr < 1.5) {
          smoothTimeAccum = 0;
          stepUpCount++;
          pendingDpr = Math.min(1.5, currentDpr * 1.2);
        }
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);

  // Clean disposal on page teardown
  window.addEventListener('beforeunload', () => {
    connectScreen.dispose();
    wallText.dispose();
    room.dispose();
    disposeCardboard();
    dustGeom.dispose();
    dustMat.dispose();
    firstScreen.texture.dispose();
    modernScreenTex.dispose();
    crtMaterial.dispose();
    renderer.dispose();
  });
}

initPortfolioStory();
