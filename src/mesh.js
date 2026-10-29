import { warm } from './main.js';

/**
 * Part 2 — WebGL Mesh Gradient Block (src/mesh.js)
 * - Lazy initialized via IntersectionObserver, paused when offscreen
 * - Rendered at 1/3 viewport resolution (30fps cap on phones)
 * - Fragment shader: 5 Lissajous palette blobs (#7C5CFF, #2DD4BF, #FFB86B, #7FA6FF, #141B33),
 *   2-pass domain warping (0.15 amp), inverse-distance blend, vignette (0.85 edges),
 *   and Bayer 4x4 ordered dither (±0.5/255)
 * - Static single frame under prefers-reduced-motion: reduce
 * - Seamless CSS radial-gradient fallback if WebGL is unavailable
 */

const VERTEX_SHADER = `
  attribute vec2 aPos;
  varying highp vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying highp vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uResolution;

  // Value noise for 2-pass silk domain warp
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
  }

  // Bayer 4x4 ordered dither (±0.5/255)
  float bayer4x4(vec2 fragCoord) {
    vec2 p = mod(floor(fragCoord), 4.0);
    int x = int(p.x);
    int y = int(p.y);
    int idx = y * 4 + x;
    float m = 0.0;
    if (idx == 0) m = 0.0;
    else if (idx == 1) m = 8.0;
    else if (idx == 2) m = 2.0;
    else if (idx == 3) m = 10.0;
    else if (idx == 4) m = 12.0;
    else if (idx == 5) m = 4.0;
    else if (idx == 6) m = 14.0;
    else if (idx == 7) m = 6.0;
    else if (idx == 8) m = 3.0;
    else if (idx == 9) m = 11.0;
    else if (idx == 10) m = 1.0;
    else if (idx == 11) m = 9.0;
    else if (idx == 12) m = 15.0;
    else if (idx == 13) m = 7.0;
    else if (idx == 14) m = 13.0;
    else m = 5.0;
    return (m / 16.0 - 0.5) / 255.0;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.24;

    // Two-pass domain warping (amplitude <= 0.15 for silk folds without creases)
    vec2 w1 = vec2(
      noise(uv * 2.2 + vec2(t, -t * 0.8)),
      noise(uv * 2.2 - vec2(t * 0.9, t))
    );
    uv += 0.11 * w1;

    vec2 w2 = vec2(
      noise(uv * 3.1 + w1 + vec2(t * 0.6, t * 0.5)),
      noise(uv * 3.1 - w1 - vec2(t * 0.5, t * 0.7))
    );
    uv += 0.14 * w2;

    // 5 orbiting palette blob centers on slow Lissajous trajectories + pointer nudge
    vec2 p0 = vec2(0.26 + 0.22 * sin(t * 1.1), 0.34 + 0.20 * cos(t * 0.9)) + uPointer * 0.08;
    vec2 p1 = vec2(0.74 + 0.20 * cos(t * 0.85), 0.30 + 0.22 * sin(t * 1.25)) - uPointer * 0.05;
    vec2 p2 = vec2(0.56 + 0.24 * sin(t * 0.75 + 1.4), 0.72 + 0.18 * cos(t * 1.05));
    vec2 p3 = vec2(0.28 + 0.19 * cos(t * 1.3 + 2.1), 0.74 + 0.21 * sin(t * 0.8));
    vec2 p4 = vec2(0.50 + 0.16 * sin(t * 0.6), 0.50 + 0.16 * cos(t * 0.7));

    // Palette colors: #7C5CFF, #2DD4BF, #FFB86B, #7FA6FF, #141B33
    vec3 c0 = vec3(0.486, 0.361, 1.000); // #7C5CFF Electric Violet
    vec3 c1 = vec3(0.176, 0.831, 0.749); // #2DD4BF Mint Teal
    vec3 c2 = vec3(1.000, 0.722, 0.420); // #FFB86B Warm Amber
    vec3 c3 = vec3(0.498, 0.651, 1.000); // #7FA6FF Soft Sky Blue
    vec3 c4 = vec3(0.078, 0.106, 0.200); // #141B33 Deep Indigo Surface

    float w0 = 1.0 / pow(length(uv - p0) + 0.18, 2.2);
    float w1b = 1.0 / pow(length(uv - p1) + 0.18, 2.2);
    float w2b = 1.0 / pow(length(uv - p2) + 0.20, 2.2);
    float w3 = 1.0 / pow(length(uv - p3) + 0.19, 2.2);
    float w4 = 1.15 / pow(length(uv - p4) + 0.16, 2.2);

    float sumW = w0 + w1b + w2b + w3 + w4;
    vec3 col = (c0 * w0 + c1 * w1b + c2 * w2b + c3 * w3 + c4 * w4) / max(0.0001, sumW);

    // Blend slightly with deep ink base so white headline stays ultra-legible
    col = mix(vec3(0.043, 0.063, 0.125), col, 0.72);

    // Soft vignette (0.85 at edges)
    vec2 centered = vUv - 0.5;
    float vig = mix(0.85, 1.0, smoothstep(0.75, 0.15, length(centered)));
    col *= vig;

    // Bayer 4x4 ordered dither
    col += bayer4x4(gl_FragCoord.xy);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  const section = document.getElementById('mesh-section');
  const canvas = document.getElementById('mesh-canvas');
  if (!section || !canvas) return;

  const params = new URLSearchParams(window.location.search);
  const isReducedMotion = () =>
    params.get('motion') === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');
  const isPhone = () => window.innerWidth < 768;

  let gl = null;
  let program = null;
  let uTimeLoc = null;
  let uPointerLoc = null;
  let uResLoc = null;
  let isVisible = false;
  let rafId = null;
  let startTime = performance.now();
  let lastDrawTime = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function compileShader(ctx, type, source) {
    const shader = ctx.createShader(type);
    if (!shader) return null;
    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);
    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
      ctx.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function setupWebGL() {
    if (gl) return true;
    try {
      gl =
        canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }) ||
        canvas.getContext('experimental-webgl', { alpha: false, antialias: false, depth: false, stencil: false });
      if (!gl) return false;

      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vs || !fs) return false;

      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return false;
      }

      gl.useProgram(program);

      const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(program, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uTimeLoc = gl.getUniformLocation(program, 'uTime');
      uPointerLoc = gl.getUniformLocation(program, 'uPointer');
      uResLoc = gl.getUniformLocation(program, 'uResolution');

      resize();
      return true;
    } catch (e) {
      gl = null;
      return false;
    }
  }

  function resize() {
    if (!gl || !section) return;
    const rect = section.getBoundingClientRect();
    // Render at 1/3 viewport resolution and upscale smoothly
    const w = Math.max(64, Math.round((rect.width || window.innerWidth) / 3));
    const h = Math.max(64, Math.round((rect.height || window.innerHeight) / 3));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function renderFrame(now = performance.now()) {
    if (!gl || !program) return;

    // 30fps cap on phones
    if (isPhone() && now - lastDrawTime < 32 && !isReducedMotion()) {
      if (isVisible) rafId = requestAnimationFrame(renderFrame);
      return;
    }
    lastDrawTime = now;

    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    const elapsed = isReducedMotion() ? 4.2 : (now - startTime) / 1000;

    gl.useProgram(program);
    gl.uniform1f(uTimeLoc, elapsed);
    gl.uniform2f(uPointerLoc, pointer.x, pointer.y);
    gl.uniform2f(uResLoc, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (isVisible && !isReducedMotion()) {
      rafId = requestAnimationFrame(renderFrame);
    } else {
      rafId = null;
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      pointer.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
    },
    { passive: true }
  );

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          isVisible = true;
          if (setupWebGL()) {
            resize();
            if (rafId === null) {
              rafId = requestAnimationFrame(renderFrame);
            }
          }
        } else {
          isVisible = false;
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
