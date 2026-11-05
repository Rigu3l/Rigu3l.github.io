// Works vortex (after otsuka-air.jp): the portfolio as a tunnel of cards. Scrolling flies the camera down the axis,
// stopping at one "chapter" per category; between chapters it rushes forward with a light zoom blur and a spin.
// The block opens from the centre (a widening circle out of the navy the numbers block fades into) while the camera
// rushes in, and the whole spiral of cards turns as you fly, so the cards travel along the spiral, not only toward you.
import * as THREE from "three";

const CHAPTERS = [
  { key: "systems", t: "Systems", s: "QR systems · dashboards" },
  { key: "publishing", t: "Publishing", s: "PDF flipbooks" },
  { key: "portfolios", t: "Portfolios", s: "portfolio & landing sites" },
];
const STEP = 0.42;       // depth between two cards of one chapter's spiral
const TRAVEL = 13;       // empty run to the next chapter: far enough that its cards stay hidden behind this title
const INTRO = 16;        // the camera starts this far back and rushes in while the block opens from the centre
const W_IN = 0.5;        // scroll share after the block has docked, while the circle finishes opening
const BG = new THREE.Color("#051727");

const $ = (s, r = document) => r.querySelector(s);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const params = new URLSearchParams(location.search);
const reduce = params.get("motion") === "reduce";                     // full motion by default, like the rest of the site

const root = $("#work");
// the WebGL context is created only when the block gets near (≈ 2 screens away): fewer GPU contexts alive at once on phones
if (root) {
  let go = () => { go = null; io.disconnect(); init(root); };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) go?.(); }, { rootMargin: "200% 0px" });
  io.observe(root); window.hwWarm?.(() => go?.());                   // computers: prepared ahead, in a quiet moment
}

async function init(root) {
  const stage = $(".works-stage", root), canvas = $(".works-gl", root), copy = $(".works-copy", root);
  const dots = [...root.querySelectorAll(".works-dots button")];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1 : 1.25));   // phones: 1× (the cards are soft photos anyway)          // the cards are soft photos: 1.25× is plenty, far lighter on the GPU
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  // backdrop (brand navy with a soft light in the centre) is drawn in the final pass, not as a scene texture: the texture
  // version rendered black on iPhones. The cards render onto a transparent target and are laid over it.
  // no fog: far cards fade by opacity instead, so they never show as dark slabs over the centre glow 
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 60);

  // post: scene → target → zoom blur + vignette
  // linear half-float target, converted to sRGB once at the very end → the work cards keep their original colours
  const rt = new THREE.WebGLRenderTarget(2, 2, { samples: 2, type: THREE.HalfFloatType });
  const post = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rt.texture }, uBlur: { value: 0 }, uAspect: { value: 1 }, uOpen: { value: 1.3 }, uCy: { value: .5 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: `uniform sampler2D tex; uniform float uBlur, uAspect, uOpen, uCy; varying vec2 vUv;
      void main(){
        vec2 d = vUv - .5; vec4 s;
        if (uBlur < .01) s = texture2D(tex, vUv);                       // at rest: one tap, no blur work at all
        else { float w = 0.; s = vec4(0.);
          for (int i = 0; i < 10; i++) { float k = float(i) / 9.; float wi = 1. - k * .6;
            s += texture2D(tex, .5 + d * (1. - uBlur * k * .07)) * wi; w += wi; }
          s /= w; }
        // backdrop in linear light: #123d70 centre → #0a2747 → #051727 edges (same as the old 512 px gradient)
        float g = clamp(length(d) / .707, 0., 1.);
        vec3 bg = g < .45 ? mix(vec3(.0060, .0467, .1620), vec3(.0030, .0203, .0648), g / .45)
                          : mix(vec3(.0030, .0203, .0648), vec3(.0015, .0080, .0203), (g - .45) / .55);
        vec3 c = s.rgb + bg * (1. - s.a);                              // cards (premultiplied over transparent) on the backdrop
        float r = length(d * vec2(uAspect, 1.)); c *= mix(1., smoothstep(1.2, .5, r), .25 + uBlur * .45);   // vignette: edges only, stronger in flight
        // opening: everything outside a growing circle is the navy of the block above
        // the circle is centred on the SCREEN (uCy follows the block while it slides up), so the block's own edge never shows
        float rc = length((vUv - vec2(.5, uCy)) * vec2(uAspect, 1.));
        c = mix(vec3(.0016, .0080, .0203), c, smoothstep(uOpen, uOpen - .1, rc));
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  // cards
  const manifest = await fetch("assets/works/manifest.json").then((r) => r.json());
  // images decode off the main thread (ImageBitmap) and go to the GPU a few per frame (no long upload frame)
  const loader = new THREE.ImageBitmapLoader(); loader.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" });
  // phones: cards decoded at most 420 px on the long side (they show ~150–250 px there) — full-size cards (84 × ~1 MP)
  // were a few hundred MB of memory on an iPhone. Two loaders: the long side is the width or the height.
  const PHONE = innerWidth < 800 || matchMedia("(hover: none)").matches, CARD_PX = 420;
  const loaderW = new THREE.ImageBitmapLoader(); loaderW.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none", resizeWidth: CARD_PX, resizeQuality: "high" });
  const loaderH = new THREE.ImageBitmapLoader(); loaderH.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none", resizeHeight: CARD_PX, resizeQuality: "high" });
  const blank = new THREE.DataTexture(new Uint8Array([5, 23, 39, 255]), 1, 1); blank.colorSpace = THREE.SRGBColorSpace; blank.needsUpdate = true;   // same colour space as the real images → same shader
  const uploads = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  const spiral = new THREE.Group(); scene.add(spiral);
  const cards = [];
  // stations: where the camera rests for each chapter; a chapter is as deep as its spiral of cards
  const LEN = CHAPTERS.map((ch) => Math.max(5, ((manifest[ch.key] || []).length - 1) * STEP));
  const STATION = []; LEN.reduce((z, l, c) => { STATION[c] = z; return z - l - TRAVEL; }, 0);
  // scroll is shared out by chapter length (the 50-banner chapter gets the longest stretch)
  const W8 = LEN.map((l) => 1 + l / 12), W8SUM = W_IN + W8.reduce((a, b) => a + b, 0);
  root.style.height = `${Math.round(W8SUM * 110)}vh`;
  CHAPTERS.forEach((ch, c) => {
    const list = manifest[ch.key] || [];
    const z0 = STATION[c] - 3;
    list.forEach((it, i) => {
      const a = c * 1.9 + i * Math.max(0.52, 5.8 / list.length);     // spiral angle: small chapters still go all the way round
      const dz = i * STEP, z = z0 - dz;
      // nearer cards hug the axis less tightly than far ones, so the chapter title in the centre stays clear
      const r = 2.5 + Math.min(dz, 6) * 0.32 + ((i * 7) % 3) * 0.08;
      const asp = it.w / it.h, s = it.big ? 1.9 : 1.35;              // long side in metres
      const w = asp >= 1 ? s : s * asp, h = asp >= 1 ? s / asp : s;
      const mat = new THREE.MeshBasicMaterial({ map: blank, color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat); m.scale.set(w, h, 1);
      m.position.set(Math.cos(a) * r, Math.sin(a) * r, z);
      // face back toward the viewer, skewed like cards on the inside of a tunnel, rolled along the spiral
      m.lookAt(m.position.x * .25, m.position.y * .25, z + 6);
      m.rotateZ(Math.sin(a * 1.7) * .22);
      m.userData = { src: "assets/works/" + it.f, video: it.video ? "assets/works/" + it.video : null, loaded: false, ch: c, asp };
      spiral.add(m); cards.push(m);
    });
  });
  const loadCard = (m) => {
    if (m.userData.loaded) return; m.userData.loaded = true;
    (PHONE ? (m.userData.asp >= 1 ? loaderW : loaderH) : loader).load(m.userData.src, (bmp) => {   // decoded off the main thread
      const t = new THREE.Texture(bmp); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
      uploads.push([m, t]); loop();
    });
  };

  // motion loops (6 s, 360 px, muted MP4 — far lighter than GIF): created on first sight, paused when off screen
  const playing = new Set();
  function videoCard(m, on) {
    let v = m.userData.el;
    if (on && !v) {
      v = m.userData.el = document.createElement("video");
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "auto", src: m.userData.video });
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.addEventListener("playing", () => {
        if (m.userData.vtex) return;
        const vt = m.userData.vtex = new THREE.VideoTexture(v); vt.colorSpace = THREE.SRGBColorSpace;
        m.material.map = vt;                                            // same shader as the poster: no recompile
      }, { once: true });
    }
    if (!v) return;
    if (on && v.paused && !reduce) { v.play().catch(() => {}); playing.add(m); loop(); }
    else if (!on && !v.paused) { v.pause(); playing.delete(m); }
  }

  // layout
  let W = 1, H = 1;
  const resize = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false); rt.setSize(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
    camera.aspect = W / H; camera.fov = W < H ? 68 : 50; camera.updateProjectionMatrix();
    post.uniforms.uAspect.value = W / H; dirty = true;
    if (visible) { if (raf) { cancelAnimationFrame(raf); raf = 0; } frame(performance.now()); }   // redraw now: a resize clears the canvas
  };
  new ResizeObserver(resize).observe(stage);

  // scroll → camera
  let visible = false, dirty = true, camZ = 0, lastZ = 0, blur = 0, shown = -1;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting; if (visible) { cards.forEach(loadCard); dirty = true; loop(); }
    else for (const m of playing) { m.userData.el.pause(); playing.delete(m); }
  }, { rootMargin: "300% 0px" }).observe(root);                         // start loading the cards well before the block arrives

  const progress = () => {
    const r = root.getBoundingClientRect(), span = r.height - innerHeight;
    return clamp01(-r.top / Math.max(1, span));
  };
  const state = (p) => {
    let u = p * W8SUM - W_IN, c = 0;
    const docked = clamp01(p * W8SUM / W_IN);                       // after the block has docked
    const open = (enter + docked) / 2;                                // 0 → 1 across the whole opening
    u = Math.max(0, u);
    while (c < CHAPTERS.length - 1 && u > W8[c]) { u -= W8[c]; c++; }
    const f = clamp01(u / W8[c]), last = c === CHAPTERS.length - 1;
    // rest: drift slowly down this chapter's spiral (title on screen at first); then rush to the next station
    const drift = LEN[c] * 0.85 * smooth(0, last ? 1 : .7, f);
    const travel = last ? 0 : ease(smooth(.7, 1, f));
    const z = STATION[c] - drift - travel * (STATION[c] - drift - STATION[c + 1] || 0) + (1 - open) * INTRO;
    const roll = (c + travel) * .7 + f * .15;
    // copy: visible while resting at a station
    // the title arrives together with its cards: chapter 1 at the end of the opening, the next ones during the flight in
    const out = 1 - smooth(.3, .42, f);
    let show = c, alpha = (c === 0 ? smooth(.25, .6, open) : 1) * out;
    if (!last && f > .42) {                                           // once this title is gone, the next one arrives with its cards
      const dNext = z + 1.5 - (STATION[c + 1] - 3);                     // camera → that chapter's first card
      show = c + 1; alpha = smooth(18, 15, dNext);                      // in together with its first cards
    }
    return { c: show, z, roll, alpha, open };
  };
  dots.forEach((b, i) => b.addEventListener("click", () => {
    const span = root.offsetHeight - innerHeight, before = W8.slice(0, i).reduce((a, b) => a + b, 0);
    scrollTo({ top: root.getBoundingClientRect().top + scrollY + span * (W_IN + before + W8[i] * 0.08) / W8SUM, behavior: reduce ? "auto" : "smooth" });
  }));

  let raf = 0, enter = 0;
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    if (!visible) return;
    enter = clamp01(1 - root.getBoundingClientRect().top / innerHeight);
    if (uploads.length) {                                             // one texture to the GPU per frame: no hitches
      const [m, t] = uploads.shift(); renderer.initTexture(t); m.material.map = t; m.userData.ready = performance.now();
    }
    const s = state(progress());
    camZ += (s.z - camZ) * (reduce ? 1 : .14);
    const v = Math.abs(camZ - lastZ); lastZ = camZ;
    blur += ((reduce ? 0 : Math.min(1, v * 1.1)) - blur) * .2;
    camera.position.set(0, 0, camZ + 1.5);
    camera.rotation.z += (s.roll - camera.rotation.z) * .14;
    spiral.rotation.z = -camZ * 0.045;                                // the helix turns as we fly: cards sweep along the spiral
    // circle radius: grows while the block slides up (never past the screen centre → block edge stays hidden), then fills
    const pre = Math.max(0, enter - 0.55) * 0.95, docked = clamp01((s.open * 2) - enter);
    post.uniforms.uOpen.value = reduce ? 1.4 : (enter < 1 ? pre : THREE.MathUtils.lerp(0.43, 1.4, ease(docked)));
    post.uniforms.uCy.value = 1.5 - enter;
    // cards fade in when their texture arrives
    let fading = false;
    const eye = camZ + 1.5;
    for (const m of cards) {
      const t = m.userData.ready ? clamp01((now - m.userData.ready) / 600) : 0;
      const d = eye - m.position.z;                                   // distance ahead of the camera
      const o = t * smooth(20, 13, d) * smooth(.2, 1.2, d);           // fade in from the depth, out as we pass
      m.visible = o > .002;
      if (m.material.opacity !== o) { m.material.opacity = o; fading = fading || (t > 0 && t < 1); }
      if (m.userData.video && m.userData.ready) videoCard(m, m.visible);
    }
    // copy
    if (s.c !== shown) {
      shown = s.c; const ch = CHAPTERS[s.c];
      $(".works-title", copy).textContent = ch.t; $(".works-sub", copy).textContent = `( ${ch.s} )`;
      dots.forEach((b, i) => b.classList.toggle("on", i === s.c));
    }
    copy.style.opacity = s.alpha.toFixed(3);
    copy.style.transform = `translateY(${((1 - s.alpha) * 18).toFixed(1)}px)`;

    post.uniforms.uBlur.value = blur;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    const moving = Math.abs(s.z - camZ) > .002 || blur > .01 || Math.abs(s.roll - camera.rotation.z) > .001 || fading || s.open < 1 || uploads.length > 0 || playing.size > 0;
    if (moving || dirty) { dirty = false; loop(); }
  }
  addEventListener("scroll", loop, { passive: true });
  addEventListener("resize", loop);
  resize(); loop();
  // compile the shaders ahead of time, in parallel where the browser allows it — no compile stall on the first view
  renderer.compileAsync(scene, camera).then(() => renderer.compileAsync(postScene, postCam)).catch(() => {});
}
