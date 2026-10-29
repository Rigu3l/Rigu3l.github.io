import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cardboardify, cardUniforms, makeCardboard } from './cardboard.js';
import { patchModernScreenMaterial } from './crt-screen.js';

/**
 * Procedural 3D Room builder + optional GLB loader + dress() pass.
 * Builds a 4m wide studio room in Zambales with OLD era (sketchbook, pencils, CRT canvas monitor,
 * articulated warm lamp, retro speakers, shelves, posters) and NEW era (flat clean tablet display
 * SCREEN_modern, modern architectural lamp, LED wall wash, neon RV sign).
 * Merges static meshes sharing a material & era into single draw calls while preserving
 * per-vertex aEraC (local object centre) and aEraD (delay).
 */

/**
 * Packs Poster 1 (top-left quadrant), Poster 2 (top-right quadrant), and
 * Sketchbook spread (bottom-left quadrant) into a single shared texture atlas
 * to reduce texture objects and sampler bindings across the room.
 */
function makePropsAtlasTexture(isPhone = false) {
  const s = isPhone ? 0.5 : 1;
  const W = Math.round(1024 * s);
  const H = Math.round(1024 * s);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.scale(s, s);

  ctx.fillStyle = '#0F162E';
  ctx.fillRect(0, 0, 1024, 1024);

  // --- Quadrant 1 (Top-Left: x=0..512, y=0..512, UV u=0..0.5, v=0.5..1.0): Poster 1 ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();
  ctx.scale(1, 512 / 680);
  ctx.fillStyle = '#141B33';
  ctx.fillRect(0, 0, 512, 680);
  ctx.strokeStyle = '#7C5CFF';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, 464, 632);

  ctx.fillStyle = '#7C5CFF';
  ctx.beginPath();
  ctx.arc(256, 250, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFB86B';
  ctx.fillRect(110, 420, 292, 18);
  ctx.fillStyle = '#F7F5EF';
  ctx.font = '700 44px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLVE THE TASK', 256, 515);
  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.fillStyle = '#7FA6FF';
  ctx.fillText('ZAMBALES · STUDIO 01', 256, 565);
  ctx.restore();

  // --- Quadrant 2 (Top-Right: x=512..1024, y=0..512, UV u=0.5..1.0, v=0.5..1.0): Poster 2 ---
  ctx.save();
  ctx.translate(512, 0);
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();
  ctx.scale(1, 512 / 680);
  ctx.fillStyle = '#0F162E';
  ctx.fillRect(0, 0, 512, 680);
  ctx.strokeStyle = 'rgba(127, 166, 255, 0.22)';
  ctx.lineWidth = 2;
  for (let x = 32; x < 480; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x, 648);
    ctx.stroke();
  }
  for (let y = 32; y < 648; y += 32) {
    ctx.beginPath();
    ctx.moveTo(32, y);
    ctx.lineTo(480, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2DD4BF';
  ctx.lineWidth = 5;
  ctx.strokeRect(84, 96, 344, 260);
  ctx.beginPath();
  ctx.moveTo(84, 96);
  ctx.lineTo(428, 356);
  ctx.stroke();

  ctx.fillStyle = '#F7F5EF';
  ctx.font = '700 40px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FORM FOLLOWS TASK', 256, 480);
  ctx.fillStyle = '#2DD4BF';
  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.fillText('CANVAS 07 -> 11', 256, 535);
  ctx.restore();

  // --- Quadrant 3 (Bottom-Left: x=0..512, y=512..1024, UV u=0..0.5, v=0..0.5): Sketchbook ---
  ctx.save();
  ctx.translate(0, 512);
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();
  ctx.fillStyle = '#F7F5EF';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(11, 16, 32, 0.22)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  ctx.strokeStyle = '#2B3554';
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 48, 176, 120);
  ctx.strokeRect(60, 70, 140, 28);
  ctx.beginPath();
  ctx.moveTo(60, 120);
  ctx.lineTo(180, 120);
  ctx.moveTo(60, 140);
  ctx.lineTo(150, 140);
  ctx.stroke();

  ctx.strokeRect(42, 200, 176, 240);
  ctx.beginPath();
  ctx.arc(130, 310, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(292, 56, 178, 160);
  ctx.strokeStyle = '#7C5CFF';
  ctx.strokeRect(312, 162, 138, 34);
  ctx.strokeStyle = '#2B3554';
  ctx.strokeRect(292, 250, 178, 185);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function remapGeometryUvs(geom, uMin, vMin, uMax, vMax) {
  const uv = geom.attributes.uv;
  if (!uv) return geom;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
  }
  uv.needsUpdate = true;
  return geom;
}

/**
 * Counts how many fragment texture samplers a material will bind at draw time
 * (material maps + custom shader samplers + environment map + shadow maps).
 */
export function countMaterialSamplers(
  mat,
  { hasEnvMap = true, shadowLightCount = 1 } = {}
) {
  if (!mat) return 0;
  let count = 0;
  const mapKeys = [
    'map',
    'alphaMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'lightMap',
    'metalnessMap',
    'normalMap',
    'roughnessMap',
  ];
  for (const k of mapKeys) {
    if (mat[k]) count++;
  }
  if (mat.isShaderMaterial && mat.uniforms) {
    for (const u of Object.values(mat.uniforms)) {
      if (u && u.value && u.value.isTexture) count++;
    }
  }
  if (mat.isMeshStandardMaterial) {
    // cardboardify adds uCardTex (1 sampler)
    if (mat.onBeforeCompile) count += 1;
    if (hasEnvMap || mat.envMap) count += 1;
    count += Math.max(0, shadowLightCount);
  }
  return count;
}

/**
 * Strips optional secondary maps (aoMap, lightMap, bumpMap, normalMap, roughnessMap, metalnessMap)
 * on mobile/weak GPUs or if a material would exceed maxTextures.
 */
export function enforceMaterialSamplerLimits(
  materials,
  { isMobileOrWeak = false, maxTextures = 16, hasEnvMap = true, shadowLightCount = 1 } = {}
) {
  const extraMaps = [
    'aoMap',
    'lightMap',
    'bumpMap',
    'normalMap',
    'displacementMap',
    'roughnessMap',
    'metalnessMap',
  ];
  const stats = [];

  for (const mat of materials) {
    if (!mat) continue;
    if (isMobileOrWeak) {
      for (const k of extraMaps) {
        if (mat[k]) mat[k] = null;
      }
    }
    let samplers = countMaterialSamplers(mat, { hasEnvMap, shadowLightCount });
    if (samplers >= maxTextures) {
      for (const k of extraMaps) {
        if (mat[k]) {
          mat[k] = null;
          samplers = countMaterialSamplers(mat, { hasEnvMap, shadowLightCount });
          if (samplers < maxTextures) break;
        }
      }
    }
    stats.push({
      name: mat.name || mat.type,
      uuid: mat.uuid,
      samplers,
      maxTextures,
    });
  }
  return stats;
}

function makeNightSkyTexture(isPhone = false) {
  const size = isPhone ? 256 : 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#070B19');
  grad.addColorStop(0.55, '#111A3A');
  grad.addColorStop(1, '#1D2B58');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Moon glow + stars
  const moon = ctx.createRadialGradient(size * 0.72, size * 0.26, 4, size * 0.72, size * 0.26, size * 0.24);
  moon.addColorStop(0, 'rgba(230, 240, 255, 0.95)');
  moon.addColorStop(0.25, 'rgba(127, 166, 255, 0.42)');
  moon.addColorStop(1, 'rgba(127, 166, 255, 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, size, size);

  let seed = 9012;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 65; i++) {
    const x = rand() * size;
    const y = rand() * size * 0.85;
    const r = rand() > 0.85 ? 2 : 1.2;
    ctx.fillStyle = `rgba(230, 224, 255, ${0.35 + rand() * 0.6})`;
    ctx.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeNeonLogoTexture(isPhone = false) {
  const size = isPhone ? 256 : 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const s = size / 512;
  ctx.scale(s, s);

  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.strokeStyle = '#7C5CFF';
  ctx.shadowColor = '#7C5CFF';
  ctx.shadowBlur = 28;
  ctx.lineWidth = 10;
  ctx.strokeRect(56, 56, 400, 400);

  ctx.fillStyle = '#E6E0FF';
  ctx.shadowColor = '#2DD4BF';
  ctx.shadowBlur = 22;
  ctx.font = '400 220px "Anton", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RV', 256, 265);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeClockLedTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#070A14';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#2DD4BF';
  ctx.font = '700 66px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('09:41', 128, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Adds per-vertex aEraC (mesh local bounding center in world/merged space) and aEraD (delay)
 * attributes to a BufferGeometry.
 */
function stampEraAttributes(geom, centerVec, delay = 0) {
  const pos = geom.attributes.position;
  if (!pos) return;
  const count = pos.count;
  const centers = new Float32Array(count * 3);
  const delays = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    centers[i * 3] = centerVec.x;
    centers[i * 3 + 1] = centerVec.y;
    centers[i * 3 + 2] = centerVec.z;
    delays[i] = delay;
  }
  geom.setAttribute('aEraC', new THREE.BufferAttribute(centers, 3));
  geom.setAttribute('aEraD', new THREE.BufferAttribute(delays, 1));
}

/**
 * Builds the procedural room (or loads an optional GLB if provided) and runs the dress() pass.
 */
export async function buildOrLoadRoom({
  scene,
  crtMaterial,
  modernScreenTexture,
  isPhone = false,
  isWeakGpu = false,
  maxTextures = 16,
  useAlphaFade = false,
  glbUrl = null,
  onProgress = null,
}) {
  makeCardboard(isPhone);

  const root = new THREE.Group();
  root.name = 'ROOM_ROOT';
  scene.add(root);

  const createdTextures = [];
  const createdMaterials = [crtMaterial];
  const createdGeometries = [];

  function trackMat(m, eraTag = 'static', skipCardboard = false, skipInitialCardboard = false) {
    if ((eraTag === 'old' || eraTag === 'new') && useAlphaFade) {
      m.transparent = true;
      m.depthWrite = true;
    }
    if (!skipCardboard && m.isMeshStandardMaterial) {
      cardboardify(m, eraTag, { skipInitialCardboard });
    }
    createdMaterials.push(m);
    return m;
  }

  function addMesh(parent, geom, mat, pos, rot = null, scale = null, era = null, name = '', eraPivot = null) {
    createdGeometries.push(geom);
    const mesh = new THREE.Mesh(geom, mat);
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    if (era) mesh.userData.era = era;
    if (eraPivot) mesh.userData.eraPivot = new THREE.Vector3(eraPivot[0], eraPivot[1], eraPivot[2]);
    if (name) mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // If a GLB URL is supplied, load it via GLTFLoader + MeshoptDecoder
  if (glbUrl) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        glbUrl,
        (g) => resolve(g),
        (ev) => {
          if (onProgress && ev.total) onProgress(ev.loaded / ev.total);
        },
        (err) => reject(err)
      );
    });
    gltf.scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => trackMat(m, obj.userData.era || 'static'));
      }
    });
    root.add(gltf.scene);
  } else {
    // =========================================================================
    // PROCEDURAL 3D ROOM (~4.4 m wide, rich composite 3-12 part subjects)
    // =========================================================================
    if (onProgress) onProgress(0.2);

    // Shared static materials
    const matFloor = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x161d34, roughness: 0.78, metalness: 0.08 }),
      'static'
    );
    const matWall = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x12182e, roughness: 0.88, metalness: 0.04 }),
      'static'
    );
    const matTrim = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e2746, roughness: 0.55, metalness: 0.18 }),
      'static'
    );
    const matDeskWood = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.62, metalness: 0.06 }),
      'static'
    );
    const matDarkMetal = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1a2035, roughness: 0.36, metalness: 0.72 }),
      'static'
    );
    const matPlantPot = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xc87d55, roughness: 0.68, metalness: 0.05 }),
      'static'
    );
    const matFoliage = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x266b56, roughness: 0.52, metalness: 0.05 }),
      'static'
    );

    // 1. Floor, Baseboards & 3 Walls
    addMesh(root, new THREE.BoxGeometry(4.6, 0.12, 4.2), matFloor, [0, -0.06, 0.2], null, null, null, 'FLOOR');
    // Rug under desk (offset by >= 0.02 on Y so coplanar faces never Z-fight)
    const matRug = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e2544, roughness: 0.94, metalness: 0.02 }),
      'static'
    );
    addMesh(root, new THREE.BoxGeometry(2.4, 0.02, 1.65), matRug, [0, 0.012, -0.65]);

    // Back wall (z = -1.34)
    addMesh(root, new THREE.BoxGeometry(4.6, 3.4, 0.14), matWall, [0, 1.7, -1.34], null, null, null, 'WALL_BACK');
    // Left wall (x = -2.23) with window opening
    addMesh(root, new THREE.BoxGeometry(0.14, 3.4, 4.2), matWall, [-2.23, 1.7, 0.2], null, null, null, 'WALL_LEFT');
    // Right wall (x = 2.23)
    addMesh(root, new THREE.BoxGeometry(0.14, 3.4, 4.2), matWall, [2.23, 1.7, 0.2], null, null, null, 'WALL_RIGHT');
    // Baseboard trims
    addMesh(root, new THREE.BoxGeometry(4.46, 0.12, 0.04), matTrim, [0, 0.06, -1.26]);
    addMesh(root, new THREE.BoxGeometry(0.04, 0.12, 4.0), matTrim, [-2.15, 0.06, 0.2]);
    addMesh(root, new THREE.BoxGeometry(0.04, 0.12, 4.0), matTrim, [2.15, 0.06, 0.2]);

    // 2. Window with Night Sky Plane on Left Wall ("WINDOW - night sky")
    const skyTex = makeNightSkyTexture(isPhone);
    createdTextures.push(skyTex);
    const matSky = trackMat(
      new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false, fog: false }),
      'static',
      true
    );
    addMesh(
      root,
      new THREE.PlaneGeometry(1.35, 1.55),
      matSky,
      [-2.14, 1.68, -0.35],
      [0, Math.PI / 2, 0],
      null,
      null,
      'WINDOW - night sky'
    );
    // Window frame mullions (5 parts)
    addMesh(root, new THREE.BoxGeometry(0.06, 1.65, 0.08), matTrim, [-2.13, 1.68, -1.04]);
    addMesh(root, new THREE.BoxGeometry(0.06, 1.65, 0.08), matTrim, [-2.13, 1.68, 0.34]);
    addMesh(root, new THREE.BoxGeometry(0.08, 0.08, 1.46), matTrim, [-2.12, 2.48, -0.35]);
    addMesh(root, new THREE.BoxGeometry(0.12, 0.06, 1.54), matTrim, [-2.10, 0.88, -0.35]);
    addMesh(root, new THREE.BoxGeometry(0.04, 1.55, 0.04), matTrim, [-2.13, 1.68, -0.35]);
    addMesh(root, new THREE.BoxGeometry(0.04, 0.04, 1.35), matTrim, [-2.13, 1.68, -0.35]);

    // 3. Composite Studio Desk (7 parts: desktop slab, bevel edge, modesty panel, 4 steel legs, drawer unit)
    addMesh(root, new THREE.BoxGeometry(2.15, 0.055, 0.82), matDeskWood, [0, 0.74, -0.96], null, null, null, 'DESK_TOP');
    addMesh(root, new THREE.BoxGeometry(1.98, 0.42, 0.03), matDarkMetal, [0, 0.50, -1.30]);
    // 4 legs
    addMesh(root, new THREE.CylinderGeometry(0.028, 0.024, 0.72, 12), matDarkMetal, [-0.96, 0.36, -0.62]);
    addMesh(root, new THREE.CylinderGeometry(0.028, 0.024, 0.72, 12), matDarkMetal, [0.96, 0.36, -0.62]);
    addMesh(root, new THREE.CylinderGeometry(0.028, 0.024, 0.72, 12), matDarkMetal, [-0.96, 0.36, -1.28]);
    addMesh(root, new THREE.CylinderGeometry(0.028, 0.024, 0.72, 12), matDarkMetal, [0.96, 0.36, -1.28]);
    // Side drawer cabinet under right side of desk
    addMesh(root, new THREE.BoxGeometry(0.46, 0.62, 0.68), matTrim, [0.68, 0.34, -0.96]);
    addMesh(root, new THREE.BoxGeometry(0.42, 0.16, 0.02), matDeskWood, [0.68, 0.54, -0.61]);
    addMesh(root, new THREE.BoxGeometry(0.42, 0.16, 0.02), matDeskWood, [0.68, 0.35, -0.61]);
    addMesh(root, new THREE.BoxGeometry(0.42, 0.16, 0.02), matDeskWood, [0.68, 0.16, -0.61]);

    // 4. Shelves with books, props, canvas-drawn posters, potted plant, speaker, LED clock, cable
    addMesh(root, new THREE.BoxGeometry(0.82, 0.035, 0.24), matDeskWood, [-1.36, 1.46, -1.16]);
    addMesh(root, new THREE.BoxGeometry(0.82, 0.035, 0.24), matDeskWood, [1.36, 1.46, -1.16]);

    // Books on shelves
    const bookColors = [0x7c5cff, 0x2dd4bf, 0xffb86b, 0x7fa6ff, 0xe11d48];
    for (let i = 0; i < 5; i++) {
      const matBook = trackMat(
        new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.65, metalness: 0.05 }),
        'static'
      );
      addMesh(
        root,
        new THREE.BoxGeometry(0.045, 0.20 + (i % 2) * 0.04, 0.17),
        matBook,
        [-1.62 + i * 0.055, 1.58, -1.16]
      );
    }

    // Shared Atlas Texture for Framed Canvas Posters & Old-Era Sketchbook
    const propsAtlasTex = makePropsAtlasTexture(isPhone);
    createdTextures.push(propsAtlasTex);
    const matPosters = trackMat(
      new THREE.MeshStandardMaterial({ map: propsAtlasTex, roughness: 0.45, metalness: 0.05 }),
      'static'
    );
    // Left poster frame + canvas (top-left quadrant of atlas: u=0..0.5, v=0.5..1.0)
    addMesh(root, new THREE.BoxGeometry(0.46, 0.60, 0.025), matDarkMetal, [-1.36, 1.08, -1.26]);
    const poster1Geom = remapGeometryUvs(new THREE.PlaneGeometry(0.41, 0.55), 0.0, 0.5, 0.5, 1.0);
    addMesh(root, poster1Geom, matPosters, [-1.36, 1.08, -1.245]);
    // Right poster frame + canvas (top-right quadrant of atlas: u=0.5..1.0, v=0.5..1.0)
    addMesh(root, new THREE.BoxGeometry(0.46, 0.60, 0.025), matDarkMetal, [1.36, 1.08, -1.26]);
    const poster2Geom = remapGeometryUvs(new THREE.PlaneGeometry(0.41, 0.55), 0.5, 0.5, 1.0, 1.0);
    addMesh(root, poster2Geom, matPosters, [1.36, 1.08, -1.245]);

    // Potted Plant on right shelf/desk corner (composite 7 parts)
    addMesh(root, new THREE.CylinderGeometry(0.085, 0.065, 0.16, 14), matPlantPot, [0.84, 0.85, -1.08]);
    addMesh(root, new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14), matPlantPot, [0.84, 0.92, -1.08]);
    for (let l = 0; l < 5; l++) {
      const ang = (l / 5) * Math.PI * 2;
      addMesh(
        root,
        new THREE.SphereGeometry(0.065, 10, 8),
        matFoliage,
        [0.84 + Math.cos(ang) * 0.05, 0.98 + (l % 2) * 0.04, -1.08 + Math.sin(ang) * 0.05],
        [0.2, ang, 0.3],
        [1.2, 0.6, 0.8]
      );
    }

    // Studio Speaker Monitor on right side of desk (4 parts)
    addMesh(root, new THREE.BoxGeometry(0.18, 0.28, 0.20), matDarkMetal, [0.58, 0.91, -1.06]);
    addMesh(
      root,
      new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16),
      matTrim,
      [0.58, 0.87, -0.955],
      [Math.PI / 2, 0, 0]
    );
    addMesh(
      root,
      new THREE.CylinderGeometry(0.028, 0.028, 0.02, 16),
      matTrim,
      [0.58, 0.98, -0.955],
      [Math.PI / 2, 0, 0]
    );

    // Digital Clock with an LED on left side of desk
    const clockTex = makeClockLedTexture();
    createdTextures.push(clockTex);
    const matClockLed = trackMat(
      new THREE.MeshBasicMaterial({ map: clockTex, transparent: true, opacity: 1.0, toneMapped: false }),
      'static',
      true
    );
    addMesh(root, new THREE.BoxGeometry(0.16, 0.08, 0.09), matDarkMetal, [-0.46, 0.81, -1.08], [0, 0.22, 0]);
    addMesh(
      root,
      new THREE.PlaneGeometry(0.13, 0.055),
      matClockLed,
      [-0.458, 0.81, -1.033],
      [0, 0.22, 0],
      null,
      null,
      'CLOCK_LED'
    );

    // Draped Cable under desk (starts beneath desktop slab y=0.71 so no stub protrudes during Blank Beat)
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.71, -1.18),
      new THREE.Vector3(-0.30, 0.58, -1.24),
      new THREE.Vector3(-0.42, 0.34, -1.26),
      new THREE.Vector3(-0.55, 0.08, -1.22),
    ]);
    addMesh(root, new THREE.TubeGeometry(cableCurve, 18, 0.012, 8, false), matDarkMetal, [0, 0, 0]);

    if (onProgress) onProgress(0.5);

    // =========================================================================
    // HERO RIG GROUP ("CRT") & OLD ERA OBJECTS (userData.era = "old")
    // Hero object materials have fog: false and skipInitialCardboard: true so
    // startup haze/cardboard never covers the initial CRT, while RETIRE (mod 0.10-0.30)
    // dissolves the entire CRT monitor, stand, lamp, and desk props!
    // =========================================================================
    const crtGroup = new THREE.Group();
    crtGroup.name = 'CRT';
    root.add(crtGroup);

    const matCrtBezel = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd8d0c1,
        roughness: 0.52,
        metalness: 0.08,
        fog: false,
      }),
      'old',
      false,
      true
    );
    const matCrtBack = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x9e9585,
        roughness: 0.68,
        metalness: 0.12,
        fog: false,
      }),
      'old',
      false,
      true
    );

    const crtPivot = [0, 1.04, -0.98];
    // Composite 8-part Hero Monitor + Drawing Stand on Desk
    addMesh(crtGroup, new THREE.CylinderGeometry(0.16, 0.19, 0.04, 20), matCrtBack, [0, 0.785, -1.0], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.14, 0.09, 0.14), matCrtBack, [0, 0.84, -1.0], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.58, 0.45, 0.18), matCrtBezel, [0, 1.07, -0.96], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.42, 0.32, 0.22), matCrtBack, [0, 1.07, -1.12], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.58, 0.04, 0.04), matCrtBezel, [0, 1.275, -0.86], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.58, 0.05, 0.04), matCrtBezel, [0, 0.87, -0.86], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.045, 0.375, 0.04), matCrtBezel, [-0.268, 1.07, -0.86], null, null, 'old', '', crtPivot);
    addMesh(crtGroup, new THREE.BoxGeometry(0.045, 0.375, 0.04), matCrtBezel, [0.268, 1.07, -0.86], null, null, 'old', '', crtPivot);

    // 6. The interactive CRT Screen Mesh ("SCREEN", 4:3 ratio: 0.50m x 0.375m at z = -0.865)
    const screenGeom = new THREE.PlaneGeometry(0.50, 0.375);
    createdGeometries.push(screenGeom);
    const oldScreenMesh = new THREE.Mesh(screenGeom, crtMaterial);
    oldScreenMesh.name = 'SCREEN';
    oldScreenMesh.position.set(0, 1.07, -0.865);
    oldScreenMesh.userData.era = 'old';
    crtGroup.add(oldScreenMesh);

    // Old Era Paper Sketchbook (bottom-left quadrant of propsAtlasTex: u=0..0.5, v=0..0.5) & Pencils
    const matSketchbook = trackMat(
      new THREE.MeshStandardMaterial({ map: propsAtlasTex, roughness: 0.85, metalness: 0.02 }),
      'old'
    );
    const matPencil = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffb86b, roughness: 0.5, metalness: 0.1 }),
      'old'
    );
    const sketchGeom = remapGeometryUvs(new THREE.BoxGeometry(0.36, 0.018, 0.25), 0.0, 0.0, 0.5, 0.5);
    addMesh(root, sketchGeom, matSketchbook, [0.0, 0.778, -0.69], [0, 0.06, 0], null, 'old');
    addMesh(
      root,
      new THREE.CylinderGeometry(0.005, 0.005, 0.17, 8),
      matPencil,
      [0.24, 0.776, -0.68],
      [Math.PI / 2, 0.35, 0],
      null,
      'old'
    );
    addMesh(
      root,
      new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8),
      matPencil,
      [0.27, 0.776, -0.70],
      [Math.PI / 2, -0.18, 0],
      null,
      'old'
    );

    // Old Era Articulated Warm Desk Lamp + "LAMP BULB"
    const matOldLamp = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.42, metalness: 0.48 }),
      'old'
    );
    const matOldBulb = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffcfa0,
        emissive: new THREE.Color(0xff9a45),
        emissiveIntensity: 3.2,
        roughness: 0.2,
      }),
      'old',
      false,
      true
    );
    const oldLampPivot = [-0.66, 1.05, -0.95];
    addMesh(root, new THREE.CylinderGeometry(0.085, 0.095, 0.025, 16), matOldLamp, [-0.74, 0.78, -0.96], null, null, 'old', '', oldLampPivot);
    addMesh(
      root,
      new THREE.CylinderGeometry(0.012, 0.012, 0.34, 10),
      matOldLamp,
      [-0.76, 0.94, -0.98],
      [0, 0, 0.22],
      null,
      'old',
      '',
      oldLampPivot
    );
    addMesh(
      root,
      new THREE.CylinderGeometry(0.012, 0.012, 0.28, 10),
      matOldLamp,
      [-0.68, 1.18, -0.95],
      [0.18, 0, -0.48],
      null,
      'old',
      '',
      oldLampPivot
    );
    addMesh(
      root,
      new THREE.ConeGeometry(0.09, 0.13, 18, 1, true),
      matOldLamp,
      [-0.58, 1.26, -0.92],
      [0.25, 0, -0.45],
      null,
      'old',
      '',
      oldLampPivot
    );
    const oldBulbMesh = addMesh(
      root,
      new THREE.SphereGeometry(0.032, 12, 12),
      matOldBulb,
      [-0.56, 1.22, -0.91],
      null,
      null,
      'old',
      'LAMP BULB',
      oldLampPivot
    );
    oldBulbMesh.castShadow = false;

    if (onProgress) onProgress(0.75);

    // =========================================================================
    // NEW ERA OBJECTS (userData.era = "new")
    // Modern screen "SCREEN_modern", modern lamp "NEW_Lamp_bulb", LED wall wash, neon RV logo
    // =========================================================================
    const matModernFrame = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x161d35, roughness: 0.28, metalness: 0.82 }),
      'new'
    );
    const matModernStand = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x8e9cc0, roughness: 0.24, metalness: 0.88 }),
      'new'
    );

    const monitorPivot = [0, 1.12, -0.955];
    // Modern Ultrasharp Display Stand & Frame
    addMesh(root, new THREE.BoxGeometry(0.26, 0.012, 0.20), matModernStand, [0, 0.774, -1.02], null, null, 'new', '', monitorPivot);
    addMesh(
      root,
      new THREE.BoxGeometry(0.045, 0.28, 0.025),
      matModernStand,
      [0, 0.91, -1.05],
      [-0.12, 0, 0],
      null,
      'new',
      '',
      monitorPivot
    );
    addMesh(root, new THREE.BoxGeometry(0.768, 0.448, 0.022), matModernFrame, [0, 1.12, -0.955], null, null, 'new', '', monitorPivot);

    // Modern Screen Mesh ("SCREEN_modern", 1600:914 ratio: 0.74m x 0.4227m at z = -0.942)
    const matModernScreen = trackMat(
      new THREE.MeshBasicMaterial({ map: modernScreenTexture, toneMapped: false, fog: false }),
      'new',
      true
    );
    patchModernScreenMaterial(matModernScreen);

    const modernScreenGeom = new THREE.PlaneGeometry(0.74, 0.4227);
    createdGeometries.push(modernScreenGeom);
    const modernScreenMesh = new THREE.Mesh(modernScreenGeom, matModernScreen);
    modernScreenMesh.name = 'SCREEN_modern';
    modernScreenMesh.position.set(0, 1.12, -0.942);
    modernScreenMesh.userData.era = 'new';
    modernScreenMesh.userData.eraPivot = new THREE.Vector3(monitorPivot[0], monitorPivot[1], monitorPivot[2]);
    root.add(modernScreenMesh);

    // Modern Flat Drawing Tablet + Stylus on Desk Pad
    const tabletPivot = [0, 0.775, -0.68];
    addMesh(
      root,
      new THREE.BoxGeometry(0.38, 0.012, 0.24),
      matModernFrame,
      [0, 0.775, -0.68],
      [0.06, 0, 0],
      null,
      'new',
      '',
      tabletPivot
    );
    addMesh(
      root,
      new THREE.CylinderGeometry(0.0045, 0.0045, 0.15, 10),
      matModernStand,
      [0.24, 0.775, -0.68],
      [Math.PI / 2, 0.12, 0],
      null,
      'new',
      '',
      tabletPivot
    );

    // Modern Architectural Bar Lamp + "NEW_Lamp_bulb"
    const matNewBulb = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe6f0ff,
        emissive: new THREE.Color(0x7fa6ff),
        emissiveIntensity: 3.5,
        roughness: 0.15,
      }),
      'new',
      false,
      true
    );
    const newLampPivot = [-0.64, 1.06, -1.0];
    addMesh(root, new THREE.CylinderGeometry(0.075, 0.075, 0.018, 18), matModernStand, [-0.72, 0.777, -1.02], null, null, 'new', '', newLampPivot);
    addMesh(root, new THREE.CylinderGeometry(0.01, 0.01, 0.58, 10), matModernStand, [-0.72, 1.06, -1.02], null, null, 'new', '', newLampPivot);
    addMesh(root, new THREE.BoxGeometry(0.36, 0.018, 0.028), matModernStand, [-0.56, 1.35, -0.98], null, null, 'new', '', newLampPivot);
    const newBulbMesh = addMesh(
      root,
      new THREE.BoxGeometry(0.32, 0.012, 0.018),
      matNewBulb,
      [-0.56, 1.34, -0.98],
      null,
      null,
      'new',
      'NEW_Lamp_bulb',
      newLampPivot
    );
    newBulbMesh.castShadow = false;

    // LED Wall Wash Bar behind Desk
    const matLedStrip = trackMat(
      new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 1.0, toneMapped: false }),
      'new',
      true
    );
    addMesh(root, new THREE.BoxGeometry(1.92, 0.022, 0.022), matLedStrip, [0, 0.76, -1.25], null, null, 'new', 'LED_WALL_WASH');

    // Neon RV Logo Plane on Upper Right Wall
    const neonTex = makeNeonLogoTexture(isPhone);
    createdTextures.push(neonTex);
    const matNeon = trackMat(
      new THREE.MeshBasicMaterial({
        map: neonTex,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        toneMapped: false,
      }),
      'new',
      true
    );
    addMesh(
      root,
      new THREE.PlaneGeometry(0.42, 0.42),
      matNeon,
      [1.36, 1.72, -1.25],
      null,
      null,
      'new',
      'NEON_LOGO'
    );
  }

  // Enforce texture sampler limits across all materials (strip extra maps on mobile/weak GPUs)
  const samplerStats = enforceMaterialSamplerLimits(createdMaterials, {
    isMobileOrWeak: isPhone || isWeakGpu,
    maxTextures,
    hasEnvMap: Boolean(scene.environment),
    shadowLightCount: 1,
  });

  if (onProgress) onProgress(0.88);

  // =========================================================================
  // DRESS PASS: Find named anchors, stamp aEraC/aEraD, & merge static meshes
  // =========================================================================
  let oldScreen = null;
  let modernScreen = null;
  let oldLampBulb = null;
  let newLampBulb = null;
  let nightSky = null;
  let crtRig = null;
  let ledWallWash = null;
  let neonLogo = null;
  let clockLed = null;

  root.updateMatrixWorld(true);

  const mergeBuckets = new Map();
  const toRemove = [];
  const heroOrigin = new THREE.Vector3(0, 1.07, -0.92);

  function computeMeshDelay(center, era) {
    const dist = center.distanceTo(heroOrigin);
    if (era === 'old' || era === 'new') {
      // Spread desk & wall props over 0..0.68 so Wave A / Wave B clearly stagger each object
      return Math.min(0.68, dist / 1.35);
    }
    return Math.min(1.0, dist / 3.2);
  }

  root.traverse((obj) => {
    if (obj.name === 'CRT') crtRig = obj;
    if (!obj.isMesh) return;

    if (obj.name.startsWith('SCREEN') && obj.name !== 'SCREEN_modern') {
      oldScreen = obj;
    } else if (obj.name === 'SCREEN_modern') {
      modernScreen = obj;
    } else if (obj.name === 'LAMP BULB') {
      oldLampBulb = obj;
    } else if (obj.name === 'NEW_Lamp_bulb') {
      newLampBulb = obj;
    } else if (obj.name === 'WINDOW - night sky') {
      nightSky = obj;
    } else if (obj.name === 'LED_WALL_WASH') {
      ledWallWash = obj;
    } else if (obj.name === 'NEON_LOGO') {
      neonLogo = obj;
    } else if (obj.name === 'CLOCK_LED') {
      clockLed = obj;
    }

    const isSpecial =
      obj === oldScreen ||
      obj === modernScreen ||
      obj === oldLampBulb ||
      obj === newLampBulb ||
      obj === nightSky ||
      obj === ledWallWash ||
      obj === neonLogo ||
      obj === clockLed;

    if (!isSpecial && obj.geometry && obj.material && !Array.isArray(obj.material)) {
      const era = obj.userData.era || 'static';
      const key = `${obj.material.uuid}__${era}`;
      if (!mergeBuckets.has(key)) {
        mergeBuckets.set(key, { material: obj.material, era, list: [] });
      }
      mergeBuckets.get(key).list.push(obj);
    }
  });

  const worldCenter = new THREE.Vector3();

  // Stamp aEraC & aEraD on special non-merged meshes (like LAMP BULB, NEW_Lamp_bulb, SCREEN_modern)
  for (const sp of [oldLampBulb, newLampBulb, modernScreen, ledWallWash, neonLogo]) {
    if (!sp || !sp.geometry) continue;
    const box = new THREE.Box3().setFromObject(sp);
    box.getCenter(worldCenter);
    const pivot = sp.userData.eraPivot || worldCenter;
    const delay = computeMeshDelay(pivot, sp.userData.era || 'static');
    sp.userData.eraDelay = delay;
    stampEraAttributes(sp.geometry, pivot, delay);
  }

  for (const [, bucket] of mergeBuckets) {
    if (bucket.list.length === 1) {
      // Single-mesh bucket: bake world transform into geometry so aEraC is in world space just like merged meshes
      const single = bucket.list[0];
      const g = single.geometry.clone();
      g.applyMatrix4(single.matrixWorld);
      g.computeBoundingBox();
      g.boundingBox.getCenter(worldCenter);
      const pivot = single.userData.eraPivot || worldCenter;
      const delay = computeMeshDelay(pivot, bucket.era);
      stampEraAttributes(g, pivot, delay);
      createdGeometries.push(g);
      single.geometry = g;
      single.position.set(0, 0, 0);
      single.rotation.set(0, 0, 0);
      single.scale.set(1, 1, 1);
      if (single.parent !== root) {
        root.add(single);
      }
      continue;
    }

    const clonedGeoms = [];
    for (const mesh of bucket.list) {
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      g.computeBoundingBox();
      g.boundingBox.getCenter(worldCenter);
      const pivot = mesh.userData.eraPivot || worldCenter;
      const delay = computeMeshDelay(pivot, bucket.era);
      stampEraAttributes(g, pivot, delay);
      clonedGeoms.push(g);
      toRemove.push(mesh);
    }
    const mergedGeom = mergeGeometries(clonedGeoms, false);
    clonedGeoms.forEach((cg) => cg.dispose());
    if (mergedGeom) {
      createdGeometries.push(mergedGeom);
      const mergedMesh = new THREE.Mesh(mergedGeom, bucket.material);
      mergedMesh.name = `MERGED_${bucket.era}`;
      if (bucket.era !== 'static') {
        mergedMesh.userData.era = bucket.era;
      }
      mergedMesh.castShadow = true;
      mergedMesh.receiveShadow = true;
      root.add(mergedMesh);
    }
  }

  for (const rem of toRemove) {
    if (rem.parent) rem.parent.remove(rem);
  }

  // Collect final era meshes for visibility & shadow toggling
  const oldEraMeshes = [];
  const newEraMeshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      if (obj.userData.era === 'old') oldEraMeshes.push(obj);
      if (obj.userData.era === 'new') newEraMeshes.push(obj);
    }
  });

  // Compute screen world centers & sizes for camera framing
  root.updateMatrixWorld(true);

  const oldScreenBox = new THREE.Box3().setFromObject(oldScreen);
  const oldScreenCenter = oldScreenBox.getCenter(new THREE.Vector3());
  const oldScreenSize = oldScreenBox.getSize(new THREE.Vector3());

  const modernScreenBox = new THREE.Box3().setFromObject(modernScreen);
  const modernScreenCenter = modernScreenBox.getCenter(new THREE.Vector3());
  const modernScreenSize = modernScreenBox.getSize(new THREE.Vector3());

  cardUniforms.uHeroCenter.value.copy(oldScreenCenter);

  if (onProgress) onProgress(1.0);

  function setActiveEra(isNew, bothVisible = false) {
    for (const m of oldEraMeshes) {
      m.visible = bothVisible ? true : !isNew;
      m.castShadow = !isNew && m !== oldLampBulb && m !== oldScreen;
    }
    for (const m of newEraMeshes) {
      m.visible = bothVisible ? true : isNew;
      m.castShadow = isNew && m !== newLampBulb && m !== modernScreen;
    }
  }

  // Start with old era active
  setActiveEra(false);

  /**
   * Emergency fallback for Tier 0 retry if shader precompilation fails:
   * replaces patched materials with un-patched simple MeshLambertMaterial / MeshBasicMaterial.
   */
  function downgradeToSimpleMaterials() {
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      if (obj === oldScreen) return;
      const m = obj.material;
      if (m.isMeshStandardMaterial || m.onBeforeCompile) {
        const simple = m.isMeshBasicMaterial
          ? new THREE.MeshBasicMaterial({
              color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
              map: m.map || null,
              transparent: Boolean(m.transparent),
              opacity: m.opacity ?? 1.0,
              toneMapped: false,
            })
          : new THREE.MeshLambertMaterial({
              color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
              emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0x000000),
              emissiveIntensity: m.emissiveIntensity ?? 1.0,
              map: m.map || null,
              transparent: Boolean(m.transparent),
              opacity: m.opacity ?? 1.0,
            });
        createdMaterials.push(simple);
        obj.material = simple;
      }
    });
  }

  function dispose() {
    createdGeometries.forEach((g) => g.dispose());
    createdMaterials.forEach((m) => m.dispose());
    createdTextures.forEach((t) => t.dispose());
    scene.remove(root);
  }

  return {
    root,
    crtRig,
    oldScreen,
    modernScreen,
    oldLampBulb,
    newLampBulb,
    ledWallWash,
    neonLogo,
    clockLed,
    nightSky,
    oldEraMeshes,
    newEraMeshes,
    oldScreenCenter,
    oldScreenSize,
    modernScreenCenter,
    modernScreenSize,
    materials: createdMaterials,
    textures: createdTextures,
    samplerStats,
    setActiveEra,
    downgradeToSimpleMaterials,
    dispose,
  };
}

