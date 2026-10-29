import * as THREE from 'three';

/**
 * Software 2D Canvas 3D-Projection Fallback Renderer
 * Used automatically when WebGL context creation is disabled or unavailable in the host browser/webview.
 * Projects the 3D room, lighting grade, dust particles, and interactive CRT/modern screen textures
 * using Three.js camera matrices so the full interactive story and scroll timeline work with zero WebGL errors.
 */
export function createCanvas2DRenderer({
  canvas,
  getRoom,
  getCrtMaterial,
  getModernScreenTex,
  getDustGeom,
  getDustMat,
  cardUniforms,
}) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let width = canvas.clientWidth || window.innerWidth || 1280;
  let height = canvas.clientHeight || window.innerHeight || 720;

  const tempVec = new THREE.Vector3();
  const viewMat = new THREE.Matrix4();
  const projViewMat = new THREE.Matrix4();

  function updateCanvasSize() {
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
  }

  updateCanvasSize();

  function projectPoint(x, y, z) {
    tempVec.set(x, y, z);
    tempVec.applyMatrix4(viewMat);
    const camZ = -tempVec.z;
    if (camZ <= 0.04) {
      // Clamp points behind near plane to avoid inverted projection
      tempVec.z = -0.04;
    }
    tempVec.applyMatrix4(
      projViewMat.Identity ? projViewMat : _currentCamera.projectionMatrix
    );
    const sx = (tempVec.x * 0.5 + 0.5) * width;
    const sy = (-tempVec.y * 0.5 + 0.5) * height;
    return { x: sx, y: sy, depth: camZ };
  }

  let _currentCamera = null;

  function drawQuad3D(p0, p1, p2, p3, fillStyle, strokeStyle = null, lineWidth = 1) {
    if (!ctx) return;
    const a = projectPoint(p0[0], p0[1], p0[2]);
    const b = projectPoint(p1[0], p1[1], p1[2]);
    const c = projectPoint(p2[0], p2[1], p2[2]);
    const d = projectPoint(p3[0], p3[1], p3[2]);
    if (a.depth <= 0.05 && b.depth <= 0.05 && c.depth <= 0.05 && d.depth <= 0.05) return;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function render(scene, camera) {
    if (!ctx) return;
    _currentCamera = camera;
    camera.updateMatrixWorld(true);
    viewMat.copy(camera.matrixWorldInverse);

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mod = cardUniforms?.uMod?.value ?? 0;
    const reveal = cardUniforms?.uReveal?.value ?? 0;
    const waveA = cardUniforms?.uWaveA?.value ?? -2;
    const waveB = cardUniforms?.uWaveB?.value ?? -2;
    const isNew = mod >= 0.5;

    // 1. Background & Haze
    const bgHex = scene.background ? `#${scene.background.getHexString()}` : '#18141c';
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, width, height);

    if (reveal > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, reveal * 1.15);

      // 2. Room Shell (Floor, Back Wall, Left Wall, Right Wall, Ceiling)
      const wallBackCol = isNew ? '#13192b' : '#2c221b';
      const wallSideCol = isNew ? '#0f1524' : '#241b15';
      const floorCol = isNew ? '#161b28' : '#33251a';
      const strokeCol = isNew ? 'rgba(130, 160, 255, 0.08)' : 'rgba(215, 167, 116, 0.14)';

      // Floor
      drawQuad3D(
        [-2.4, 0, -1.45],
        [2.4, 0, -1.45],
        [2.4, 0, 1.8],
        [-2.4, 0, 1.8],
        floorCol,
        strokeCol
      );

      // Back wall
      drawQuad3D(
        [-2.4, 0, -1.45],
        [2.4, 0, -1.45],
        [2.4, 2.7, -1.45],
        [-2.4, 2.7, -1.45],
        wallBackCol,
        strokeCol
      );

      // Left wall
      drawQuad3D(
        [-2.4, 0, 1.8],
        [-2.4, 0, -1.45],
        [-2.4, 2.7, -1.45],
        [-2.4, 2.7, 1.8],
        wallSideCol,
        strokeCol
      );

      // Right wall
      drawQuad3D(
        [2.4, 0, -1.45],
        [2.4, 0, 1.8],
        [2.4, 2.7, 1.8],
        [2.4, 2.7, -1.45],
        wallSideCol,
        strokeCol
      );

      // Left wall window with cold moonlight
      drawQuad3D(
        [-2.38, 0.85, -0.15],
        [-2.38, 0.85, -0.95],
        [-2.38, 2.05, -0.95],
        [-2.38, 2.05, -0.15],
        isNew ? 'rgba(90, 140, 235, 0.28)' : 'rgba(115, 155, 230, 0.22)',
        'rgba(160, 195, 255, 0.35)',
        1.5
      );

      // Bookshelf on back-left
      drawQuad3D(
        [-1.85, 0, -1.32],
        [-1.12, 0, -1.32],
        [-1.12, 1.82, -1.32],
        [-1.85, 1.82, -1.32],
        isNew ? '#1a2236' : '#3c2b1e',
        strokeCol
      );

      // 3. Desk Surface & Front Apron
      const deskTopCol = isNew ? '#1e2436' : '#6b4f35';
      const deskFrontCol = isNew ? '#141926' : '#4e3824';
      // Desk legs
      drawQuad3D(
        [-0.88, 0, -1.05],
        [-0.80, 0, -1.05],
        [-0.80, 0.74, -1.05],
        [-0.88, 0.74, -1.05],
        deskFrontCol
      );
      drawQuad3D(
        [0.80, 0, -1.05],
        [0.88, 0, -1.05],
        [0.88, 0.74, -1.05],
        [0.80, 0.74, -1.05],
        deskFrontCol
      );
      // Desk top
      drawQuad3D(
        [-0.92, 0.74, -1.22],
        [0.92, 0.74, -1.22],
        [0.92, 0.74, -0.56],
        [-0.92, 0.74, -0.56],
        deskTopCol,
        strokeCol
      );
      // Desk front edge
      drawQuad3D(
        [-0.92, 0.69, -0.56],
        [0.92, 0.69, -0.56],
        [0.92, 0.74, -0.56],
        [-0.92, 0.74, -0.56],
        deskFrontCol,
        strokeCol
      );

      // Ambient lamp glow / LED back-glow around desk
      const deskCenter2D = projectPoint(0, 1.05, -0.95);
      if (deskCenter2D.depth > 0.1) {
        const glowRadius = Math.max(120, Math.min(width, height) * 0.45);
        const grad = ctx.createRadialGradient(
          deskCenter2D.x,
          deskCenter2D.y,
          10,
          deskCenter2D.x,
          deskCenter2D.y,
          glowRadius
        );
        if (isNew) {
          grad.addColorStop(0, 'rgba(124, 92, 255, 0.26)');
          grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
          grad.addColorStop(1, 'rgba(11, 16, 32, 0)');
        } else {
          grad.addColorStop(0, 'rgba(255, 154, 69, 0.25)');
          grad.addColorStop(0.55, 'rgba(255, 140, 55, 0.08)');
          grad.addColorStop(1, 'rgba(20, 14, 10, 0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Wave A / Wave B transformation sweep highlight
      const activeWave =
        waveA > -1.4 && waveA < 1.4 ? waveA : waveB > -1.4 && waveB < 1.4 ? waveB : null;
      if (activeWave !== null) {
        const wavePos = projectPoint(0, 1.0 + activeWave * 0.4, -0.9);
        const waveR = Math.max(80, width * 0.35);
        const wGrad = ctx.createRadialGradient(
          wavePos.x,
          wavePos.y,
          waveR * 0.1,
          wavePos.x,
          wavePos.y,
          waveR
        );
        wGrad.addColorStop(0, 'rgba(255, 174, 70, 0.28)');
        wGrad.addColorStop(0.6, 'rgba(138, 108, 255, 0.18)');
        wGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = wGrad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();
    }

    // 4. Draw Old CRT Monitor or Modern Monitor Screen Texture
    const room = getRoom ? getRoom() : null;
    if (room) {
      if (!isNew && room.oldScreen && room.oldScreen.visible !== false) {
        const c = room.oldScreenCenter;
        const s = room.oldScreenSize;
        const hw = s.x * 0.5;
        const hh = s.y * 0.5;

        // Monitor bezel behind CRT screen
        const bz = 0.045;
        drawQuad3D(
          [c.x - hw - bz, c.y - hh - bz * 1.2, c.z - 0.01],
          [c.x + hw + bz, c.y - hh - bz * 1.2, c.z - 0.01],
          [c.x + hw + bz, c.y + hh + bz, c.z - 0.01],
          [c.x - hw - bz, c.y + hh + bz, c.z - 0.01],
          '#b9ab94',
          'rgba(55, 45, 35, 0.65)',
          2
        );

        // Project CRT screen corners
        const tl = projectPoint(c.x - hw, c.y + hh, c.z);
        const br = projectPoint(c.x + hw, c.y - hh, c.z);
        const sw = Math.max(2, br.x - tl.x);
        const sh = Math.max(2, br.y - tl.y);

        const crtMat = getCrtMaterial ? getCrtMaterial() : null;
        const texImg = crtMat?.uniforms?.tMap?.value?.image;
        const power = crtMat?.uniforms?.power?.value ?? 1.0;

        ctx.save();
        ctx.fillStyle = '#080604';
        ctx.fillRect(tl.x, tl.y, sw, sh);

        if (texImg && power > 0.01) {
          const scaleY = Math.max(0.02, Math.min(1, power));
          const drawH = sh * scaleY;
          const drawY = tl.y + (sh - drawH) * 0.5;
          ctx.globalAlpha = Math.min(1, power * 1.05);
          ctx.drawImage(texImg, tl.x, drawY, sw, drawH);
        }
        ctx.restore();
      } else if (isNew && room.modernScreen) {
        const c = room.modernScreenCenter;
        const s = room.modernScreenSize;
        const hw = s.x * 0.5;
        const hh = s.y * 0.5;

        // Sleek dark bezel
        const bz = 0.018;
        drawQuad3D(
          [c.x - hw - bz, c.y - hh - bz, c.z - 0.005],
          [c.x + hw + bz, c.y - hh - bz, c.z - 0.005],
          [c.x + hw + bz, c.y + hh + bz, c.z - 0.005],
          [c.x - hw - bz, c.y + hh + bz, c.z - 0.005],
          '#0d121d',
          'rgba(124, 92, 255, 0.35)',
          1.5
        );

        const tl = projectPoint(c.x - hw, c.y + hh, c.z);
        const br = projectPoint(c.x + hw, c.y - hh, c.z);
        const sw = Math.max(2, br.x - tl.x);
        const sh = Math.max(2, br.y - tl.y);

        const modTex = getModernScreenTex ? getModernScreenTex() : null;
        if (modTex?.image) {
          ctx.drawImage(modTex.image, tl.x, tl.y, sw, sh);
        }
      }
    }

    // 5. Render 3D Dust Particles
    const dustGeom = getDustGeom ? getDustGeom() : null;
    const dustMat = getDustMat ? getDustMat() : null;
    if (dustGeom && reveal > 0.05) {
      const posAttr = dustGeom.attributes.position;
      const arr = posAttr.array;
      const count = posAttr.count;
      const hex = dustMat?.color ? `#${dustMat.color.getHexString()}` : '#ffcfa0';
      ctx.save();
      ctx.fillStyle = hex;
      ctx.globalAlpha = 0.35 * Math.min(1, reveal);
      for (let i = 0; i < count; i++) {
        const p = projectPoint(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
        if (p.depth > 0.15 && p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
          const r = Math.max(1, Math.min(3.2, 2.4 / p.depth));
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }

  return {
    isFallback2D: true,
    domElement: canvas,
    outputColorSpace: THREE.SRGBColorSpace,
    toneMapping: 0,
    toneMappingExposure: 1.0,
    shadowMap: {
      enabled: false,
      type: 0,
      autoUpdate: false,
      needsUpdate: false,
    },
    capabilities: {
      getMaxAnisotropy: () => 1,
    },
    setPixelRatio(newDpr) {
      dpr = newDpr || 1;
      updateCanvasSize();
    },
    getPixelRatio() {
      return dpr;
    },
    setSize(w, h) {
      width = w;
      height = h;
      updateCanvasSize();
    },
    getContext() {
      return null;
    },
    render,
    dispose() {},
  };
}
