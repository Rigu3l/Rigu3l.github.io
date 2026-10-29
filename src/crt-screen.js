import * as THREE from 'three';
import { cardUniforms } from './cardboard.js';

let displayFontLoaded = false;

/**
 * Ensures the Anton display face is loaded via FontFace() before drawing canvas text.
 */
export async function ensureDisplayFont() {
  if (displayFontLoaded) return;
  try {
    if (typeof FontFace !== 'undefined') {
      const ff = new FontFace('Anton', 'url(/assets/fonts/anton.woff2)', {
        weight: '400',
        style: 'normal',
      });
      const loaded = await ff.load();
      document.fonts.add(loaded);
    }
    await document.fonts.ready;
    displayFontLoaded = true;
  } catch (e) {
    displayFontLoaded = true;
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Creates and draws the 1440x1080 (4:3) first-screen canvas texture.
 * Includes the 6% RV watermark, translucent ring + accent pill chip ("Rj Verceles · Zambales")
 * with cursor arrow, and the 2-line 300px Anton headline with radial light gradient.
 */
export function createFirstStoryScreenTexture(maxAnisotropy = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 1440;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(8, maxAnisotropy);

  function redraw() {
    const W = 1440;
    const H = 1080;
    const frameW = 1350;

    // 1. Background navy
    ctx.fillStyle = '#0B1020';
    ctx.fillRect(0, 0, W, H);

    // Subtle deep radial ambient glow inside 1350px design frame
    const bgGlow = ctx.createRadialGradient(W * 0.5, H * 0.56, 40, W * 0.5, H * 0.56, 680);
    bgGlow.addColorStop(0, 'rgba(124, 92, 255, 0.16)');
    bgGlow.addColorStop(0.6, 'rgba(20, 27, 51, 0.08)');
    bgGlow.addColorStop(1, 'rgba(11, 16, 32, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect((W - frameW) * 0.5, 0, frameW, H);

    // 2. Faint RV watermark (6% alpha, large, centred)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '400 680px "Anton", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RV', W * 0.5, H * 0.54);
    ctx.restore();

    // 3. Small pill chip at top-center
    const copy = window.STORY_COPY?.meta || {};
    const chipText = window.L
      ? window.L(copy.chipEn || 'Rj Verceles · Zambales', copy.chipFil || 'Rj Verceles · Zambales')
      : 'Rj Verceles · Zambales';

    ctx.font = '600 30px "Inter", sans-serif';
    const textMetrics = ctx.measureText(chipText);
    const innerPadX = 40;
    const innerW = Math.ceil(textMetrics.width + innerPadX * 2);
    const innerH = 64;
    const outerPad = 12;
    const outerW = innerW + outerPad * 2;
    const outerH = innerH + outerPad * 2;
    const outerX = (W - outerW) * 0.5;
    const outerY = 185;

    // Translucent outer ring with clipped soft blurred highlight ellipse
    ctx.save();
    drawRoundedRect(ctx, outerX, outerY, outerW, outerH, outerH * 0.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();
    ctx.clip();

    const hlGrad = ctx.createRadialGradient(
      W * 0.5,
      outerY + 8,
      4,
      W * 0.5,
      outerY + 8,
      outerW * 0.45
    );
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, outerY + 8, outerW * 0.42, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Accent-coloured inner pill
    const innerX = outerX + outerPad;
    const innerY = outerY + outerPad;
    ctx.save();
    drawRoundedRect(ctx, innerX, innerY, innerW, innerH, innerH * 0.5);
    ctx.fillStyle = '#7C5CFF';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 30px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipText, W * 0.5, innerY + innerH * 0.5 + 1);
    ctx.restore();

    // Soft cursor-arrow shape hanging off bottom-right corner of the pill
    const curX = innerX + innerW - 14;
    const curY = innerY + innerH - 8;
    ctx.save();
    ctx.translate(curX, curY);
    ctx.fillStyle = '#F7F5EF';
    ctx.strokeStyle = '#0B1020';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 32);
    ctx.lineTo(9, 24);
    ctx.lineTo(16, 36);
    ctx.lineTo(22, 33);
    ctx.lineTo(15, 21);
    ctx.lineTo(26, 21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Two-line giant headline in Anton (~250-300px, line-height 86%, uppercase)
    const enLine1 = (copy.firstLine1En || "I DON'T DECORATE —").toUpperCase();
    const enLine2 = (copy.firstLine2En || 'I SOLVE THE TASK.').toUpperCase();
    const line1 = window.L
      ? window.L(enLine1, (copy.firstLine1Fil || 'HINDI AKO NAGDEDEKORASYON —').toUpperCase())
      : enLine1;
    const line2 = window.L
      ? window.L(enLine2, (copy.firstLine2Fil || 'NILULUTAS KO ANG PROBLEMA.').toUpperCase())
      : enLine2;

    const baseFontSize = 235;
    const lineHeight = baseFontSize * 0.86;
    ctx.font = `400 ${baseFontSize}px "Anton", sans-serif`;

    const primaryMaxW = Math.min(
      frameW - 40,
      Math.max(ctx.measureText(enLine1).width, ctx.measureText(enLine2).width, 1180)
    );

    const textBoxTop = 365;
    const textBoxBottom = textBoxTop + lineHeight * 2;
    const textGrad = ctx.createRadialGradient(
      W * 0.5,
      textBoxTop + 60,
      40,
      W * 0.5,
      (textBoxTop + textBoxBottom) * 0.5,
      760
    );
    textGrad.addColorStop(0, '#FFFFFF');
    textGrad.addColorStop(0.65, '#F2EEFF');
    textGrad.addColorStop(1, '#E6E0FF');

    const lines = [line1, line2];
    lines.forEach((ln, idx) => {
      ctx.save();
      ctx.font = `400 ${baseFontSize}px "Anton", sans-serif`;
      const w = ctx.measureText(ln).width;
      const scale = w > primaryMaxW ? primaryMaxW / w : 1;
      const yCenter = textBoxTop + idx * lineHeight + baseFontSize * 0.44;
      ctx.translate(W * 0.5, yCenter);
      ctx.scale(scale, scale);
      ctx.fillStyle = textGrad;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ln, 0, 0);
      ctx.restore();
    });

    tex.needsUpdate = true;
  }

  redraw();
  return { texture: tex, redraw, canvas };
}

/**
 * Inverse mapping of the CRT barrel distortion so pointer raycast UVs align with pixel coordinates.
 */
export function undistortCrtUv(vUvX, vUvY) {
  const cX = vUvX - 0.5;
  const cY = vUvY - 0.5;
  const r2 = cX * cX + cY * cY;
  const factor = (1.0 + 0.09 * r2 * 4.0) * 0.94;
  const u = 0.5 + cX * factor;
  // Flip Y because tex.flipY = false on canvas textures
  const v = 1.0 - (0.5 + cY * factor);
  return { u, v };
}

/**
 * Builds the CRT tube ShaderMaterial:
 * - Convex barrel distortion: uv = .5 + c * (1 + .09 * dot(c,c) * 4) * .94
 * - Scanlines faded by fwidth(uv.y) * 1080 so phones never alias
 * - Soft dark corners vignette
 * - Power uniform for tube flicker
 * - Phase 1 POWER-DOWN (mod 0.00-0.10): uCollapseY / collapseY (vertical squeeze to bright line),
 *   uCollapseX / collapseX (horizontal shrink to glowing dot), and uAfterglow (~300ms phosphor decay)
 * - toneMapped: false, fog: false
 */
export function createCrtMaterial(initialTexture) {
  const collapseYUniform = { value: 0.0 };
  const collapseXUniform = { value: 0.0 };
  const afterglowUniform = { value: 0.0 };

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: initialTexture },
      power: { value: 1.0 },
      uCollapseY: collapseYUniform,
      collapseY: collapseYUniform,
      uCollapseX: collapseXUniform,
      collapseX: collapseXUniform,
      uAfterglow: afterglowUniform,
    },
    vertexShader: `
      varying highp vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tMap;
      uniform highp float power;
      uniform highp float uCollapseY;
      uniform highp float uCollapseX;
      uniform highp float uAfterglow;
      varying highp vec2 vUv;

      void main() {
        vec2 c = vUv - 0.5;
        vec2 uv = 0.5 + c * (1.0 + 0.09 * dot(c, c) * 4.0) * 0.94;

        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        // CRT tube collapse: squeeze vertically first (uCollapseY), then horizontally (uCollapseX)
        float dy = uv.y - 0.5;
        float dx = uv.x - 0.5;
        float scaleY = max(0.006, 1.0 - uCollapseY * 0.994);
        float scaleX = max(0.008, 1.0 - uCollapseX * 0.992);
        vec2 cUv = vec2(0.5 + dx / scaleX, 0.5 + dy / scaleY);

        vec3 col = vec3(0.0);
        if (cUv.x >= 0.0 && cUv.x <= 1.0 && cUv.y >= 0.0 && cUv.y <= 1.0) {
          vec2 sampleUv = vec2(cUv.x, 1.0 - cUv.y);
          vec3 texCol = texture2D(tMap, sampleUv).rgb;
          float squeezeBoost = 1.0 + uCollapseY * 2.2 + uCollapseX * 2.8;
          vec3 beamTint = mix(texCol, vec3(0.95, 0.97, 1.0), clamp(uCollapseY * 0.82 + uCollapseX * 0.55, 0.0, 1.0));
          col = beamTint * squeezeBoost;
        }

        // Scanlines with derivative fade-out when screen is small
        float fw = fwidth(uv.y) * 1080.0;
        float scanVis = 1.0 - smoothstep(0.35, 0.95, fw);
        float scan = 1.0 - 0.1 * scanVis * (0.5 - 0.5 * cos(uv.y * 1080.0 * 3.14159265));

        // Soft dark corners
        float vig = mix(0.55, 1.0, smoothstep(0.75, 0.3, length(c * vec2(1.0, 1.15))));

        // Luminous horizontal scanline & center phosphor dot during tube collapse + 300ms afterglow
        float beamHalfH = mix(0.45, 0.011, uCollapseY);
        float beamHalfW = mix(0.48, 0.016, uCollapseX);
        float distY = abs(dy) / max(0.003, beamHalfH);
        float distX = abs(dx) / max(0.005, beamHalfW);
        float lineCore = exp(-distY * distY * 1.9) * exp(-distX * distX * 1.6);
        float dotCore = exp(-dot(vec2(dx, dy * 1.25), vec2(dx, dy * 1.25)) * 180.0);
        float collapseVis = smoothstep(0.02, 0.25, uCollapseY);
        vec3 phosphorTone = mix(vec3(0.486, 0.361, 1.0), vec3(0.94, 0.97, 1.0), clamp(lineCore + dotCore, 0.0, 1.0));
        vec3 collapseGlow = phosphorTone * (lineCore * collapseVis * 1.45 + dotCore * uCollapseX * 2.1);

        // ~300ms phosphor afterglow on collapsed beam trace & central phosphor dot
        vec3 afterglow = phosphorTone * (dotCore * 1.65 + lineCore * 0.75) * uAfterglow;

        vec3 finalCol = (col * scan * vig + collapseGlow * vig) * power + afterglow * vig;
        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
    toneMapped: false,
    fog: false,
  });

  return mat;
}

/**
 * Creates a single atlased 1600x1200 modern screen texture containing:
 * - Top 75% (y = 0..900, UV v = 0.25..1.0): 1600x900 modern desktop wallpaper
 * - Bottom-left 300x300 cell (x = 0..300, y = 900..1200, UV u = 0..0.1875, v = 0..0.25):
 *   RV boot emblem with radial glow so Phase 5 BOOT scales the logo from 0.9 -> 1.0
 *   using only a SINGLE texture sampler (map).
 */
export function createModernScreenTexture(isPhone = false) {
  const scale = isPhone ? 0.5 : 1;
  const W = Math.round(1600 * scale);
  const H = Math.round(1200 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.clearRect(0, 0, 1600, 1200);

  // --- REGION A: Top 1600x900 Wallpaper (y = 0..900) ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1600, 900);
  ctx.clip();

  // 1. Radial gradient from accent glow at bottom centre to dark base
  ctx.fillStyle = '#0B1020';
  ctx.fillRect(0, 0, 1600, 900);

  const glow = ctx.createRadialGradient(800, 900, 30, 800, 880, 920);
  glow.addColorStop(0, 'rgba(124, 92, 255, 0.62)');
  glow.addColorStop(0.42, 'rgba(45, 212, 191, 0.18)');
  glow.addColorStop(1, 'rgba(11, 16, 32, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1600, 900);

  // 2. 6 faint concentric ellipse arcs at 8% alpha
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.ellipse(800, 880, i * 155, i * 105, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Dock-like rounded strip with 6 small coloured rounded squares
  const dockW = 360;
  const dockH = 64;
  const dockX = (1600 - dockW) * 0.5;
  const dockY = 805;
  ctx.save();
  drawRoundedRect(ctx, dockX, dockY, dockW, dockH, 20);
  ctx.fillStyle = 'rgba(20, 27, 51, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const colors = ['#7C5CFF', '#2DD4BF', '#FFB86B', '#7FA6FF', '#F43F5E', '#A78BFA'];
  for (let i = 0; i < 6; i++) {
    const sqX = dockX + 22 + i * 54;
    const sqY = dockY + 14;
    drawRoundedRect(ctx, sqX, sqY, 36, 36, 9);
    ctx.fillStyle = colors[i];
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();

  // --- REGION B: Bottom-left 300x300 RV Boot Emblem Atlas Cell (x = 0..300, y = 900..1200) ---
  ctx.save();
  ctx.translate(0, 900);
  const halo = ctx.createRadialGradient(150, 150, 8, 150, 150, 130);
  halo.addColorStop(0, 'rgba(124, 92, 255, 0.58)');
  halo.addColorStop(0.5, 'rgba(45, 212, 191, 0.18)');
  halo.addColorStop(1, 'rgba(124, 92, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(150, 150, 130, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F7F5EF';
  ctx.shadowColor = '#7C5CFF';
  ctx.shadowBlur = 16;
  ctx.font = '400 112px "Anton", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RV', 150, 154);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Patches the SCREEN_modern material via onBeforeCompile with uBoot so during
 * Phase 5 BOOT (mod 0.80 - 1.00):
 * - The panel brightens from black with a short bloom flash
 * - The wallpaper fades in (sampled from top 75% of map atlas)
 * - The RV logo scales in from 0.9 to 1.0 with a soft glow (sampled from bottom-left atlas cell)
 * Uses zero additional texture samplers (only built-in `map`).
 */
export function patchModernScreenMaterial(material) {
  material.customProgramCacheKey = () => `modern_screen_boot_v2_${material.uuid}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBoot = cardUniforms.uBoot;
    shader.uniforms.uReduceMotion = cardUniforms.uReduceMotion;
    material.userData.shader = shader;

    shader.fragmentShader =
      `
      uniform highp float uBoot;
      uniform highp float uReduceMotion;
      ` +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 wallUv = vec2(vMapUv.x, 0.25 + vMapUv.y * 0.75);
          vec4 wallTexel = texture2D(map, wallUv);
          if (uReduceMotion > 0.5) {
            vec2 logoUvRm = (vMapUv - vec2(0.5, 0.54)) * vec2(1600.0 / 360.0, 900.0 / 360.0) + 0.5;
            vec4 logoRm = vec4(0.0);
            if (logoUvRm.x >= 0.02 && logoUvRm.x <= 0.98 && logoUvRm.y >= 0.02 && logoUvRm.y <= 0.98) {
              vec2 atlasUvRm = vec2(logoUvRm.x * (300.0 / 1600.0), logoUvRm.y * 0.25);
              logoRm = texture2D(map, atlasUvRm);
            }
            vec3 fullScreen = mix(wallTexel.rgb, logoRm.rgb, logoRm.a * 0.92);
            diffuseColor.rgb = mix(vec3(0.02, 0.028, 0.055), fullScreen, clamp(uBoot, 0.0, 1.0));
          } else {
            // 1. Dark off-state glass panel before mod 0.80
            vec3 offPanel = vec3(0.02, 0.028, 0.055);

            // 2. Short panel turn-on bloom flash at start of boot
            float flashEnv = sin(clamp(uBoot / 0.52, 0.0, 1.0) * 3.14159265);
            vec2 centerD = vMapUv - vec2(0.5, 0.5);
            float radialFlash = exp(-dot(centerD * vec2(1.1, 1.5), centerD * vec2(1.1, 1.5)) * 4.2);
            vec3 flashCol = mix(vec3(0.486, 0.361, 1.0), vec3(0.88, 0.94, 1.0), radialFlash) * flashEnv * (0.45 + 0.75 * radialFlash);

            // 3. Wallpaper fade-in
            float wallAlpha = smoothstep(0.08, 0.78, uBoot);
            vec3 panelCol = mix(offPanel, wallTexel.rgb, wallAlpha) + flashCol;

            // 4. RV logo scaling from 0.90 to 1.00 with soft glow (sampled from atlas cell)
            float logoT = smoothstep(0.16, 0.96, uBoot);
            float logoScale = mix(0.90, 1.0, logoT);
            vec2 logoAspect = vec2(1600.0 / 380.0, 900.0 / 380.0);
            vec2 logoUv = ((vMapUv - vec2(0.5, 0.54)) * logoAspect) / max(0.01, logoScale) + 0.5;
            if (logoUv.x >= 0.02 && logoUv.x <= 0.98 && logoUv.y >= 0.02 && logoUv.y <= 0.98) {
              vec2 atlasUv = vec2(logoUv.x * (300.0 / 1600.0), logoUv.y * 0.25);
              vec4 logoSample = texture2D(map, atlasUv);
              float glowBoost = 1.0 + 0.85 * sin(logoT * 3.14159265);
              panelCol = mix(panelCol, logoSample.rgb * glowBoost, logoSample.a * logoT * 0.94);
            }

            diffuseColor.rgb = panelCol;
          }
        #endif
        `
      );
  };

  return material;
}

