import * as THREE from 'three';

/**
 * Shared uniforms for the cardboard-to-real reveal and old-to-new 5-stage era transition shader.
 */
export const cardUniforms = {
  uCardTex: { value: null },
  uHeroCenter: { value: new THREE.Vector3(0, 1.04, -1.05) },
  uReveal: { value: 0.0 },
  uCardFloor: { value: 0.0 },
  uMod: { value: 0.0 },
  uWaveA: { value: -0.2 },
  uWaveB: { value: -1.0 },
  uDissolve: { value: 0.0 },
  uArrive: { value: 0.0 },
  uBoot: { value: 0.0 },
  uSimpleFade: { value: 0.0 },
  uReduceMotion: { value: 0.0 },
};

let cachedCardTexture = null;
let patchCounter = 0;

/**
 * Generates a 1024x1024 (or 512x512 on phones) procedural kraft cardboard CanvasTexture.
 */
export function makeCardboard(isPhone = false) {
  if (cachedCardTexture) return cachedCardTexture;

  const size = isPhone ? 512 : 1024;
  const scale = size / 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 1. Kraft base
  ctx.fillStyle = '#B99364';
  ctx.fillRect(0, 0, size, size);

  let seed = 42197;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 2. ~90 blotchy radial pulp tones
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (35 + rand() * 115) * scale;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.48;
    const alpha = 0.04 + rand() * 0.07;
    grad.addColorStop(0, dark ? `rgba(92, 66, 38, ${alpha})` : `rgba(214, 182, 138, ${alpha})`);
    grad.addColorStop(1, 'rgba(185, 147, 100, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Faint corrugated flute stripes every 12 px
  const step = Math.max(4, Math.round(12 * scale));
  for (let x = 0; x < size; x += step) {
    ctx.fillStyle = 'rgba(78, 54, 28, 0.045)';
    ctx.fillRect(x, 0, Math.max(1, Math.round(3 * scale)), size);
    ctx.fillStyle = 'rgba(235, 205, 165, 0.035)';
    ctx.fillRect(x + Math.max(1, Math.round(4 * scale)), 0, Math.max(1, Math.round(2 * scale)), size);
  }

  // 4. Short random fibre strokes
  const fibreCount = isPhone ? 4500 : 9000;
  ctx.lineWidth = Math.max(0.8, 1.1 * scale);
  for (let i = 0; i < fibreCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = (3 + rand() * 9) * scale;
    const ang = rand() * Math.PI * 2;
    const tone = rand();
    if (tone < 0.45) {
      ctx.strokeStyle = 'rgba(72, 48, 24, 0.14)';
    } else if (tone < 0.82) {
      ctx.strokeStyle = 'rgba(142, 106, 68, 0.13)';
    } else {
      ctx.strokeStyle = 'rgba(238, 212, 174, 0.12)';
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  cachedCardTexture = tex;
  cardUniforms.uCardTex.value = tex;
  return tex;
}

/**
 * Patches a MeshStandardMaterial with onBeforeCompile while staying strictly within
 * mobile/desktop GPU varying, uniform, and sampler limits:
 * - Adds only 1 varying vector (`varying vec4 vCardWorld`, packing world pos .xyz and aEraD .w)
 * - Computes triplanar normal in fragment shader via screen-space derivatives dFdx/dFdy
 * - Assigns a unique customProgramCacheKey per patched material
 */
export function cardboardify(material, eraTag = 'static', options = {}) {
  const eraFlag = eraTag === 'old' ? 1.0 : eraTag === 'new' ? 2.0 : 0.0;
  const skipInitialCard = options.skipInitialCardboard ? 1.0 : 0.0;
  const patchId = ++patchCounter;
  material.userData.eraTag = eraTag;
  material.userData.cardboardPatched = true;
  material.userData.skipInitialCardboard = Boolean(options.skipInitialCardboard);

  const cacheKey = `cardboard_v4_${eraTag}_${skipInitialCard}_${patchId}_${material.uuid}`;
  material.customProgramCacheKey = () => cacheKey;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCardTex = cardUniforms.uCardTex;
    shader.uniforms.uHeroCenter = cardUniforms.uHeroCenter;
    shader.uniforms.uReveal = cardUniforms.uReveal;
    shader.uniforms.uCardFloor = cardUniforms.uCardFloor;
    shader.uniforms.uMod = cardUniforms.uMod;
    shader.uniforms.uWaveA = cardUniforms.uWaveA;
    shader.uniforms.uWaveB = cardUniforms.uWaveB;
    shader.uniforms.uDissolve = cardUniforms.uDissolve;
    shader.uniforms.uArrive = cardUniforms.uArrive;
    shader.uniforms.uBoot = cardUniforms.uBoot;
    shader.uniforms.uSimpleFade = cardUniforms.uSimpleFade;
    shader.uniforms.uReduceMotion = cardUniforms.uReduceMotion;
    shader.uniforms.uEraFlag = { value: eraFlag };
    shader.uniforms.uSkipInitCard = { value: skipInitialCard };

    material.userData.shader = shader;

    shader.vertexShader =
      `
      uniform highp float uMod;
      uniform highp float uEraFlag;
      uniform highp float uDissolve;
      uniform highp float uArrive;
      uniform highp float uSimpleFade;
      uniform highp float uReduceMotion;
      attribute vec3 aEraC;
      attribute float aEraD;
      varying highp vec4 vCardWorld;
      ` +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vec4 cardWp = modelMatrix * vec4(transformed, 1.0);

        if (uReduceMotion < 0.5) {
          if (uEraFlag > 0.5 && uEraFlag < 1.5) {
            float localDissolve = clamp((uDissolve - aEraD * 0.18) / max(0.001, 1.0 - aEraD * 0.18), 0.0, 1.0);
            if (uMod >= 0.5 || localDissolve >= 0.999) {
              cardWp.xyz = vec3(0.0, -50.0, 0.0);
            } else if (uSimpleFade < 0.5) {
              cardWp.y += localDissolve * 0.045;
            }
          } else if (uEraFlag > 1.5) {
            if (uMod < 0.5) {
              cardWp.xyz = vec3(0.0, -50.0, 0.0);
            } else if (uSimpleFade < 0.5 && uArrive < 0.999) {
              float localArrive = clamp((uArrive - aEraD * 0.42) / 0.58, 0.0, 1.0);
              float c1 = 1.70158;
              float c3 = c1 + 1.0;
              float tM = localArrive - 1.0;
              float eBack = 1.0 + c3 * tM * tM * tM + c1 * tM * tM;
              float sc = mix(0.92, 1.0, eBack);
              vec3 pivot = length(aEraC) > 0.001 ? aEraC : vec3(0.0, 1.0, -0.98);
              cardWp.xyz = pivot + (cardWp.xyz - pivot) * sc;
            }
          }
        } else {
          if (uEraFlag > 0.5 && uEraFlag < 1.5 && uMod >= 0.85) {
            cardWp.xyz = vec3(0.0, -50.0, 0.0);
          } else if (uEraFlag > 1.5 && uMod <= 0.15) {
            cardWp.xyz = vec3(0.0, -50.0, 0.0);
          }
        }

        vCardWorld = vec4(cardWp.xyz, aEraD);
        vec4 mvPosition = viewMatrix * cardWp;
        gl_Position = projectionMatrix * mvPosition;
        `
      );

    shader.fragmentShader =
      `
      uniform sampler2D uCardTex;
      uniform highp vec3 uHeroCenter;
      uniform highp float uReveal;
      uniform highp float uCardFloor;
      uniform highp float uMod;
      uniform highp float uWaveA;
      uniform highp float uWaveB;
      uniform highp float uDissolve;
      uniform highp float uArrive;
      uniform highp float uBoot;
      uniform highp float uSimpleFade;
      uniform highp float uReduceMotion;
      uniform highp float uEraFlag;
      uniform highp float uSkipInitCard;
      varying highp vec4 vCardWorld;

      float cardHash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float cardBlockNoise(vec3 wp) {
        vec3 vox = floor(wp * 56.0);
        vec3 cluster = floor(wp * 14.0);
        float hVox = cardHash31(vox);
        float hClust = cardHash31(cluster);
        float spatialWave = 0.5 + 0.5 * sin(wp.x * 19.0 + wp.y * 23.0 - wp.z * 17.0);
        return clamp(0.45 * hClust + 0.30 * spatialWave + 0.25 * hVox, 0.02, 0.98);
      }
      ` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          vec3 vCardWorldPos = vCardWorld.xyz;
          float vEraD = vCardWorld.w;
          vec3 dissolveEdgeGlow = vec3(0.0);
          vec3 bezelSweepGlow = vec3(0.0);

          vec3 dpdx = dFdx(vCardWorldPos);
          vec3 dpdy = dFdy(vCardWorldPos);
          vec3 worldFaceNorm = cross(dpdx, dpdy);
          vec3 an = abs(length(worldFaceNorm) > 1e-8 ? normalize(worldFaceNorm) : vec3(0.0, 1.0, 0.0));
          vec2 cardUv;
          if (an.x >= an.y && an.x >= an.z) {
            cardUv = vCardWorldPos.zy * 0.65;
          } else if (an.y >= an.x && an.y >= an.z) {
            cardUv = vCardWorldPos.xz * 0.65;
          } else {
            cardUv = vCardWorldPos.xy * 0.65;
          }
          vec4 cardTex = texture2D(uCardTex, cardUv);
          float edgeNoise = (cardTex.r - 0.55) * 0.5;
          float wd = distance(vCardWorldPos, uHeroCenter) + edgeNoise;

          float revealCard = uSkipInitCard > 0.5 ? 0.0 : smoothstep(uReveal - 0.14, uReveal + 0.14, wd);
          float cardMix = max(revealCard, uCardFloor * (1.0 - uSkipInitCard));

          if (uReduceMotion < 0.5) {
            float wA = 1.0 - smoothstep(uWaveA - 0.12, uWaveA + 0.12, wd);
            float wB = uWaveB < -0.5 ? 1.0 : smoothstep(uWaveB - 0.12, uWaveB + 0.12, wd);
            cardMix = max(cardMix, wA * wB);

            if (uEraFlag > 1.5) {
              float localArrive = clamp((uArrive - vEraD * 0.42) / 0.58, 0.0, 1.0);
              float arriveCard = 1.0 - smoothstep(0.12, 0.88, localArrive);
              cardMix = max(cardMix, arriveCard);
            }
          }

          cardMix = clamp(cardMix, 0.0, 1.0);
          vec3 kraftLinear = pow(cardTex.rgb, vec3(2.2)) * vec3(0.95, 0.86, 0.72);
          diffuseColor.rgb = mix(diffuseColor.rgb, kraftLinear, cardMix);

          if (uReduceMotion < 0.5) {
            if (uEraFlag > 0.5 && uEraFlag < 1.5 && uDissolve > 0.001) {
              float localDissolve = clamp((uDissolve - vEraD * 0.18) / max(0.001, 1.0 - vEraD * 0.18), 0.0, 1.0);
              if (uSimpleFade > 0.5) {
                if (localDissolve >= 0.995) discard;
                diffuseColor.a *= (1.0 - localDissolve);
              } else {
                float dither = cardBlockNoise(vCardWorldPos);
                if (dither < localDissolve) {
                  discard;
                }
                float edgeSpan = 0.16;
                if (dither < localDissolve + edgeSpan) {
                  float edgeK = 1.0 - (dither - localDissolve) / edgeSpan;
                  vec3 accentCol = vec3(0.486, 0.361, 1.0);
                  diffuseColor.rgb = mix(diffuseColor.rgb, accentCol, edgeK * 0.95);
                  dissolveEdgeGlow = accentCol * (edgeK * 2.4);
                }
              }
            }

            if (uEraFlag > 1.5) {
              float localArrive = clamp((uArrive - vEraD * 0.42) / 0.58, 0.0, 1.0);
              if (uSimpleFade > 0.5) {
                if (localArrive <= 0.005) discard;
                diffuseColor.a *= smoothstep(0.0, 0.65, localArrive);
              } else {
                if (localArrive <= 0.01) discard;
              }

              if (uArrive > 0.01 && uArrive < 0.99) {
                float sweepX = mix(-0.42, 0.42, uArrive);
                float inBezel = step(-0.41, vCardWorldPos.x) * step(vCardWorldPos.x, 0.41) *
                                step(0.86, vCardWorldPos.y) * step(vCardWorldPos.y, 1.37) *
                                step(-1.00, vCardWorldPos.z) * step(vCardWorldPos.z, -0.92);
                float band = exp(-pow((vCardWorldPos.x - sweepX) / 0.036, 2.0)) * inBezel;
                float env = sin(uArrive * 3.14159265);
                vec3 sweepCol = vec3(0.486, 0.361, 1.0);
                diffuseColor.rgb = mix(diffuseColor.rgb, sweepCol, band * env * 0.92);
                bezelSweepGlow = sweepCol * (band * env * 2.2);
              }
            }
          } else {
            if (uEraFlag > 0.5 && uEraFlag < 1.5) {
              float fadeOut = 1.0 - smoothstep(0.2, 0.8, uMod);
              if (fadeOut <= 0.01) discard;
              diffuseColor.a *= fadeOut;
            } else if (uEraFlag > 1.5) {
              float fadeIn = smoothstep(0.2, 0.8, uMod);
              if (fadeIn <= 0.01) discard;
              diffuseColor.a *= fadeIn;
            }
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 1.0, cardMix);
          `
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `
          #include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 0.0, cardMix);
          `
        )
        .replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          totalEmissiveRadiance *= (1.0 - cardMix);
          totalEmissiveRadiance += dissolveEdgeGlow + bezelSweepGlow;
          `
        );
  };

  return material;
}

export function disposeCardboard() {
  if (cachedCardTexture) {
    cachedCardTexture.dispose();
    cachedCardTexture = null;
  }
}
