// Live mesh gradient (colours from his Figma screen, node 309-146): five soft colour points drifting on slow orbits,
// blended with a gentle domain warp. Drawn with WebGL at low resolution (it is all soft gradients) and only while
// the element is on screen. Usage: <div data-mesh> — a canvas is inserted as its first child.
const COLORS = ["#1989fe", "#3b0de7", "#6760f0", "#97cafc", "#1f52f6"];

const VERT = "attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }";
const FRAG = `precision mediump float;
varying vec2 uv; uniform float t, aspect; uniform vec3 c[5];
vec2 orbit(float i){ return vec2(.5 + .42 * sin(t * (.11 + i * .023) + i * 1.7), .5 + .42 * cos(t * (.09 + i * .019) + i * 2.3)); }
void main(){
  vec2 q = uv;
  q += .06 * vec2(sin(q.y * 5. + t * .3), cos(q.x * 4. - t * .25));          // soft warp: the colours flow, not slide
  vec3 col = vec3(0.); float w = 0.;
  for (int i = 0; i < 5; i++) {
    vec2 d = (q - orbit(float(i))) * vec2(aspect, 1.);
    float k = exp(-dot(d, d) * 3.2); col += c[i] * k; w += k;
  }
  col /= max(w, 1e-3);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;   // dither: no banding
  gl_FragColor = vec4(col, 1.);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const still = () => document.documentElement.classList.contains("reduce-motion");

export function mesh(el) {
  const canvas = document.createElement("canvas");
  canvas.className = "mesh"; canvas.setAttribute("aria-hidden", "true");
  el.prepend(canvas);
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) { el.classList.add("mesh-fallback"); return; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(pr, "t"), uA = gl.getUniformLocation(pr, "aspect");
  gl.uniform3fv(gl.getUniformLocation(pr, "c"), new Float32Array(COLORS.flatMap(hex)));
  const seed = Math.random() * 100;

  let visible = false, raf = 0;
  const size = () => {
    const r = el.getBoundingClientRect(), s = 0.33;                                // low-res: it is only soft colour
    canvas.width = Math.max(2, Math.round(r.width * s)); canvas.height = Math.max(2, Math.round(r.height * s));
    gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform1f(uA, r.width / Math.max(1, r.height));
  };
  const draw = (now) => {
    raf = 0;
    gl.uniform1f(uT, seed + now / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !still()) raf = requestAnimationFrame(draw);
  };
  // a resize clears the canvas: draw again right away (in the same frame), never leave it black for a frame
  new ResizeObserver(() => { size(); if (raf) { cancelAnimationFrame(raf); raf = 0; } draw(performance.now()); }).observe(el);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }).observe(el);
}

// each band gets its WebGL context only when it comes near the screen
document.querySelectorAll("[data-mesh]").forEach((el) => {
  let go = () => { go = null; io.disconnect(); mesh(el); };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) go?.(); }, { rootMargin: "100% 0px" });
  io.observe(el); window.hwWarm?.(() => go?.());                     // computers: prepared ahead, in a quiet moment
});
