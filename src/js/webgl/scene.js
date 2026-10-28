/**
 * Three.js Hero WebGL Scene — Orbital Full-Stack Gyroscope & Data Core
 * Enforces all Three.js skill architecture & performance directives:
 * - Software WebGL guard (`isSoftwareGl`) from GPU renderer string
 * - Studio reflection environment via `RoomEnvironment` + `PMREMGenerator`
 * - 7-part composite `THREE.Group` with varied roughness/metalness + `InstancedMesh`
 * - Grounded radial contact shadow plane
 * - Zero GC allocations inside the render loop
 * - Exponential damping (`THREE.MathUtils.damp`) for cursor, scroll, and exploded view
 * - Pauses when off-screen (IntersectionObserver) or tab hidden
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { prefersReducedMotion } from '../utils.js';

// Pre-allocated math helpers at module scope (Zero GC in render loop)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function initHeroScene(mountEl) {
  if (!mountEl) return () => {};

  const reduced = prefersReducedMotion();

  // Probe WebGL2 support and detect Software WebGL (SwiftShader / llvmpipe / Basic Render)
  let webglAvailable = true;
  const isSoftwareGl = (() => {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        webglAvailable = false;
        return true;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      webglAvailable = false;
      return true;
    }
  })();

  if (!webglAvailable) {
    mountEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:2rem;text-align:center;">
        <p class="mono-label">STATIC ARCHITECTURAL CORE · WEBGL FALLBACK ACTIVE</p>
      </div>
    `;
    return () => {};
  }

  const width = mountEl.clientWidth || 640;
  const height = mountEl.clientHeight || 480;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x090a0f, 0.085);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0.35, 6.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  mountEl.innerHTML = '';
  mountEl.appendChild(renderer.domElement);

  // Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  // Balanced 3-Point Warm/Cool Studio Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x090a0f, 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffb26b, 2.4);
  keyLight.position.set(4, 6, 4);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xf97316, 1.6);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  // ==========================================================================
  // Composite 7-Part Procedural 3D Subject (THREE.Group)
  // ==========================================================================
  const assemblyGroup = new THREE.Group();
  assemblyGroup.position.set(0, 0.1, 0);
  scene.add(assemblyGroup);

  const geometries = [];
  const materials = [];
  const textures = [envTexture];

  // Finish Palettes (Anodized Obsidian, Brushed Titanium, Zambales Copper)
  const palettes = {
    obsidian: { core: 0xf97316, ringA: 0x1e2433, ringB: 0x94a3b8 },
    titanium: { core: 0x38bdf8, ringA: 0xcbd5e1, ringB: 0x64748b },
    copper: { core: 0xf59e0b, ringA: 0x9a3412, ringB: 0xfdba74 },
  };

  // Part 1: Primary Silhouette — Faceted Core Polyhedron (Low roughness, high metalness)
  const coreGeo = new THREE.IcosahedronGeometry(0.72, 1);
  geometries.push(coreGeo);
  const coreMat = new THREE.MeshStandardMaterial({
    color: palettes.obsidian.core,
    metalness: 0.88,
    roughness: 0.16,
  });
  materials.push(coreMat);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.castShadow = !isSoftwareGl;
  assemblyGroup.add(coreMesh);

  // Part 2: Primary Silhouette — Wireframe Geodesic Cage (Contrasting roughness +0.45)
  const cageGeo = new THREE.IcosahedronGeometry(0.92, 1);
  geometries.push(cageGeo);
  const cageMat = new THREE.MeshStandardMaterial({
    color: 0xf4f3ef,
    metalness: 0.5,
    roughness: 0.62,
    wireframe: true,
  });
  materials.push(cageMat);
  const cageMesh = new THREE.Mesh(cageGeo, cageMat);
  assemblyGroup.add(cageMesh);

  // Part 3: Secondary Read — Inner Precision Gimbal Ring
  const innerRingGeo = new THREE.TorusGeometry(1.26, 0.045, 20, 72);
  geometries.push(innerRingGeo);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: palettes.obsidian.ringA,
    metalness: 0.92,
    roughness: 0.2,
  });
  materials.push(innerRingMat);
  const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRingMesh.castShadow = !isSoftwareGl;
  assemblyGroup.add(innerRingMesh);

  // Part 4: Secondary Read — Mid Telemetry Gimbal Ring
  const midRingGeo = new THREE.TorusGeometry(1.62, 0.032, 16, 84);
  geometries.push(midRingGeo);
  const midRingMat = new THREE.MeshStandardMaterial({
    color: palettes.obsidian.ringB,
    metalness: 0.65,
    roughness: 0.48,
  });
  materials.push(midRingMat);
  const midRingMesh = new THREE.Mesh(midRingGeo, midRingMat);
  midRingMesh.rotation.x = Math.PI / 3;
  assemblyGroup.add(midRingMesh);

  // Part 5: Secondary Read — Outer Equatorial Beveled Ring
  const outerRingGeo = new THREE.TorusGeometry(1.96, 0.022, 16, 96);
  geometries.push(outerRingGeo);
  const outerRingMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    metalness: 0.85,
    roughness: 0.22,
  });
  materials.push(outerRingMat);
  const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRingMesh.rotation.y = Math.PI / 4;
  assemblyGroup.add(outerRingMesh);

  // Part 6: Accent Detail — Axial Spindle Cap Cylinders
  const spindleGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.5, 12);
  geometries.push(spindleGeo);
  const spindleMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.25,
  });
  materials.push(spindleMat);
  const spindleMesh = new THREE.Mesh(spindleGeo, spindleMat);
  spindleMesh.rotation.z = Math.PI / 4;
  assemblyGroup.add(spindleMesh);

  // Part 7: Accent Detail — InstancedMesh of 36 Orbital Telemetry Nodes
  const nodeCount = 36;
  const nodeGeo = new THREE.OctahedronGeometry(0.055, 0);
  geometries.push(nodeGeo);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.75,
    roughness: 0.28,
  });
  materials.push(nodeMat);
  const nodesInstanced = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const radius = 2.15 + (i % 3) * 0.14;
    const yOff = Math.sin(angle * 3) * 0.35;
    _dummy.position.set(Math.cos(angle) * radius, yOff, Math.sin(angle) * radius);
    _dummy.rotation.set(angle, angle * 0.5, 0);
    const scale = 0.85 + (i % 4) * 0.1;
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    nodesInstanced.setMatrixAt(i, _dummy.matrix);

    _color.setHex(i % 3 === 0 ? 0xf97316 : i % 2 === 0 ? 0xf4f3ef : 0x64748b);
    nodesInstanced.setColorAt(i, _color);
  }
  nodesInstanced.instanceMatrix.needsUpdate = true;
  if (nodesInstanced.instanceColor) nodesInstanced.instanceColor.needsUpdate = true;
  nodesInstanced.computeBoundingSphere();
  assemblyGroup.add(nodesInstanced);

  // Contact Shadow Grounding Plane beneath assembly
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  shadowTex.colorSpace = THREE.SRGBColorSpace;
  textures.push(shadowTex);

  const shadowPlaneGeo = new THREE.PlaneGeometry(4.2, 4.2);
  geometries.push(shadowPlaneGeo);
  const shadowPlaneMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  materials.push(shadowPlaneMat);
  const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -2.15;
  scene.add(shadowPlane);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Interactive State (Pointer + Scroll + Exploded Slider + Finish Preset)
  let pointerX = 0;
  let pointerY = 0;
  let scrollProgress = 0;
  let targetExplode = 0;
  let currentExplode = 0;
  let isVisible = true;
  let frameId = 0;

  const onPointerMove = (e) => {
    const rect = mountEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const onScroll = () => {
    scrollProgress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Bind HUD controls (Exploded slider, Finish presets, Collapse toggle)
  const explodeInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('hud-explode-range')
  );
  if (explodeInput) {
    explodeInput.addEventListener('input', () => {
      targetExplode = parseFloat(explodeInput.value) || 0;
    });
  }

  document.querySelectorAll('[data-finish-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-finish-preset') || 'obsidian';
      const pal = palettes[key] || palettes.obsidian;
      coreMat.color.setHex(pal.core);
      innerRingMat.color.setHex(pal.ringA);
      midRingMat.color.setHex(pal.ringB);
      if (reduced) renderer.render(scene, camera);
    });
  });

  const hudToggleBtn = document.getElementById('hud-collapse-toggle');
  const hudRoot = document.getElementById('hero-stage-hud');
  if (hudToggleBtn && hudRoot) {
    hudToggleBtn.addEventListener('click', () => {
      const collapsed = hudRoot.classList.toggle('is-collapsed');
      hudToggleBtn.textContent = collapsed ? '▴ Show Core Controls' : '▾ Hide Controls';
    });
  }

  // Resize Handler
  const onResize = () => {
    if (!mountEl) return;
    const w = mountEl.clientWidth || 640;
    const h = mountEl.clientHeight || 480;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (reduced) renderer.render(scene, camera);
  };
  window.addEventListener('resize', onResize);

  // Software WebGL Frame Pacer (`afterDraw` with `gl.fenceSync`)
  function afterDraw(cb) {
    const gl = /** @type {WebGL2RenderingContext | null} */ (renderer.getContext());
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  const clock = new THREE.Clock();

  function tick() {
    if (!isVisible || document.hidden) return;

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 6, delta);

    // Smoothly damp group rotation toward pointer + scroll
    const targetRotY = pointerX * 0.55 + scrollProgress * 1.8 + elapsed * 0.22;
    const targetRotX = pointerY * 0.35 + scrollProgress * 0.6;

    assemblyGroup.rotation.y = THREE.MathUtils.damp(
      assemblyGroup.rotation.y,
      targetRotY,
      4.5,
      delta
    );
    assemblyGroup.rotation.x = THREE.MathUtils.damp(
      assemblyGroup.rotation.x,
      targetRotX,
      4.5,
      delta
    );

    // Counter-rotate internal rings & apply exploded scale separation
    coreMesh.rotation.y = -elapsed * 0.45;
    coreMesh.scale.setScalar(1 - currentExplode * 0.15);

    cageMesh.rotation.x = elapsed * 0.3;
    cageMesh.scale.setScalar(1 + currentExplode * 0.22);

    innerRingMesh.rotation.x = elapsed * 0.5;
    innerRingMesh.rotation.y = elapsed * 0.25;
    innerRingMesh.scale.setScalar(1 + currentExplode * 0.3);

    midRingMesh.rotation.z = -elapsed * 0.38;
    midRingMesh.scale.setScalar(1 + currentExplode * 0.42);

    outerRingMesh.rotation.x = -elapsed * 0.22;
    outerRingMesh.scale.setScalar(1 + currentExplode * 0.55);

    nodesInstanced.rotation.y = elapsed * 0.18;
    nodesInstanced.scale.setScalar(1 + currentExplode * 0.65);

    renderer.render(scene, camera);

    if (reduced) return;
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  // Pause rendering when off-screen or tab hidden
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;
        if (isVisible && !wasVisible && !reduced) {
          clock.getDelta();
          tick();
        }
      });
    },
    { threshold: 0.05 }
  );
  observer.observe(mountEl);

  const onVisibilityChange = () => {
    if (!document.hidden && isVisible && !reduced) {
      clock.getDelta();
      tick();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Initial render
  tick();

  return () => {
    cancelAnimationFrame(frameId);
    clearTimeout(frameId);
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);

    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    renderer.dispose();
  };
}
