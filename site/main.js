// Rj Verceles — live 3D room, v2 "cinematic": PBR materials, soft shadows, AO, bloom, depth of field, grain.
// Stage 1: pull back from the retro monitor into the room. Mouse parallax on desktop.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeScreenTexture, makeCrtMaterial, makeModernScreenTexture } from "./crt-screen.js";
import { makeHtmlText, sizeHtmlText, placeHtmlText } from "./html-text.js";
import { makeOS, makeGates, updateOS, OS_TIMES } from "./os.js";
const screenTexPromise = makeScreenTexture();

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const canvas = $("scene");
// the room canvas is as tall as the LARGEST viewport (100lvh): on phones it also fills the area under the browser bars,
// and it keeps one size while those bars slide in and out (no resize → no cleared frames). Everything is measured on it.
const VW = () => canvas.clientWidth || innerWidth, VH = () => canvas.clientHeight || innerHeight;
const screenEl = $("screen");
const contentEl = $("content");
const motionParam = params.get("motion");
// Full motion by default (the animation IS the portfolio), but the calm version is
// reachable two ways: ?motion=reduce, or the visitor's OS "reduce motion" setting.
// ?motion=full always wins, so the cinematic story stays available on demand.
const prefersReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const reduceMotion = motionParam === "reduce" || (motionParam !== "full" && prefersReduce);
document.documentElement.classList.toggle("reduce-motion", reduceMotion);
const finePointer = matchMedia("(pointer: fine)").matches;
// Computers: the blocks further down (works tunnel, IG phone, colour bands) get ready in quiet moments after the visitor
// has entered — one at a time, while they read the story — so scrolling never pays for them later. Phones keep creating
// them only near the screen (less GPU memory alive at once; iOS reloads the page when it runs out).
{
  const q = []; let busy = false;
  const pump = () => {
    if (busy || !q.length) return;
    if (!document.body.classList.contains("entered")) { setTimeout(pump, 500); return; }
    busy = true;
    const go = () => { const fn = q.shift(); try { fn(); } catch {} setTimeout(() => { busy = false; pump(); }, 700); };
    window.requestIdleCallback ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 300);
  };
  window.hwWarm = (fn) => { if (finePointer && !matchMedia("(hover: none)").matches) { q.push(fn); setTimeout(pump, 1500); } };
}
const light = !finePointer || Math.min(innerWidth, innerHeight) < 700; // phones/tablets: lighter pipeline
const fixedP = params.get("p"); // ?p=0.8 freezes the story at a point (for stills)
// the story always starts from the beginning — a reload (or a phone restoring the tab) must not land mid-story
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (fixedP === null && params.get("v") === null && !location.hash) scrollTo(0, 0);
// a link straight to a block of the page (back from the case pages: /#work) — no cable, no story, straight there
const deep = ["#about", "#numbers", "#work", "#contact"].includes(location.hash);

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
let DPR = params.get("dpr") ? Number(params.get("dpr")) : Math.min(window.devicePixelRatio || 1, 1.5);
// ?clean=all hides every HTML text layer, ?clean=wall keeps the monitor text (for design stills)
if (params.get("clean")) document.documentElement.dataset.clean = params.get("clean");
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;   // the room never moves: shadows are rendered once after load, not every frame
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#07080f");
scene.fog = new THREE.FogExp2("#0b0c18", 0.02);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.05;

const camera = new THREE.PerspectiveCamera(40, VW() / VH(), 0.03, 40);

// ------------------------------------------------------------------ lights: night — warm desk lamp is the key, cold moon through the window, screen glow
scene.add(new THREE.HemisphereLight("#8a78a0", "#2a1a10", 0.13));

const moon = new THREE.DirectionalLight("#7fa6ff", 1.6);
moon.position.set(-4.2, 3.4, -0.2);
moon.target.position.set(0.4, 0.2, -0.9);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -2.8, right: 2.8, top: 2.8, bottom: -2.8, near: 0.5, far: 10 });
moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.025; moon.shadow.radius = 5;
scene.add(moon, moon.target);

const lamp = new THREE.SpotLight("#ff9a45", 3.4, 0, 0.95, 0.75, 2);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
lamp.shadow.bias = -0.0003; lamp.shadow.normalBias = 0.01; lamp.shadow.radius = 4;
scene.add(lamp, lamp.target);
const lampHalo = { position: new THREE.Vector3() };
const hemi = scene.children.find((o) => o.isHemisphereLight);
const strip = new THREE.SpotLight("#0a8cff", 0, 0, 1.25, 0.9, 2);   // brand-blue LED strip behind the desk, washing up the wall
strip.position.set(0, 0.70, 0.86); strip.target.position.set(0, 2.6, 1.3);
scene.add(strip, strip.target);
const LAMP_OLD = new THREE.Color("#ff9a45"), LAMP_NEW = new THREE.Color("#dfe9ff");
const HEMI_OLD = new THREE.Color("#8a78a0"), HEMI_NEW = new THREE.Color("#6f8cff");
const lampOldPos = new THREE.Vector3(), lampNewPos = new THREE.Vector3(), lampOldTgt = new THREE.Vector3(), lampNewTgt = new THREE.Vector3();   // (removed a point light — its spill was invisible but cost every pixel)

// the screen glows as a soft panel (area light), not a point bulb — no hot spot on the keyboard
// screen glow comes from the emissive tube + bloom; no extra light
// no frontal fill light: it left a specular dot on the glossy desk; the hemisphere light keeps corners readable

// ------------------------------------------------------------------ cardboard maquette → real room
// At the start everything except the computer is plain kraft cardboard. As the camera pulls back,
// reality spreads outward from the computer (uReveal = radius in metres), with a torn, fibrous edge.
function makeCardboard() {
  const c = document.createElement("canvas"); c.width = c.height = 1024;
  const g = c.getContext("2d"); let seed = 3;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "#b48c63"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) {                                     // blotchy pulp tone
    const x = r() * 1024, y = r() * 1024, rad = 40 + r() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const k = r() > 0.5 ? "120,88,58" : "200,165,120";
    gr.addColorStop(0, `rgba(${k},${0.08 + r() * 0.1})`); gr.addColorStop(1, `rgba(${k},0)`);
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let y = 0; y < 1024; y += 12) {                               // faint corrugated flutes
    g.fillStyle = "rgba(90,60,35,0.06)"; g.fillRect(0, y, 1024, 5);
  }
  for (let i = 0; i < 9000; i++) {                                   // fibres
    const x = r() * 1024, y = r() * 1024, a = r() * Math.PI, l = 3 + r() * 14;
    g.strokeStyle = r() > 0.55 ? `rgba(70,45,25,${0.12 + r() * 0.2})` : `rgba(235,205,160,${0.1 + r() * 0.2})`;
    g.lineWidth = 0.6 + r() * 0.9;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const CARD = { uReveal: { value: 0 }, uCardFloor: { value: 0 }, uCardTex: { value: makeCardboard() }, uCenter: { value: new THREE.Vector3() }, uMod: { value: 0 }, uWaveA: { value: -1 }, uWaveB: { value: -1 } };
// opts.reveal: take part in the stage-1 cardboard reveal; opts.era: "old" | "new" for the stage-2 modernisation.
// Era meshes carry per-vertex aEraC (object centre) and aEraD (start delay): each object folds to cardboard,
// shrinks into its centre and the new one grows out of the same spot, one by one, outward from the computer.
function cardboardify(mat, opts = { reveal: true }) {
  const defs = Object.assign({}, mat.defines);
  if (opts.era) { defs.USE_ERA = 1; defs.ERA_OLD = opts.era === "old" ? 1 : 0; }
  if (!opts.reveal) defs.NO_REVEAL = 1;
  mat.defines = defs;
  mat.customProgramCacheKey = () => `card-${opts.era || "-"}-${opts.reveal ? 1 : 0}`;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CARD);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        varying vec3 vCardPos; varying vec3 vCardN; varying float vEraT;
        #ifdef USE_ERA
          attribute vec3 aEraC; attribute float aEraD; uniform float uMod;
        #endif`)
      .replace("#include <project_vertex>", `
        vec4 cardWp = modelMatrix * vec4(transformed, 1.0);
        vEraT = 0.;
        #ifdef USE_ERA
          #if ERA_OLD
            if (uMod >= .5) cardWp.xyz = vec3(0., -50., 0.);         // old room leaves while everything is cardboard
          #else
            if (uMod < .5) cardWp.xyz = vec3(0., -50., 0.);          // new room arrives at the same moment
          #endif
        #endif
        vec4 mvPosition = viewMatrix * cardWp;
        gl_Position = projectionMatrix * mvPosition;
        vCardPos = cardWp.xyz; vCardN = normalize(mat3(modelMatrix) * normal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uReveal, uCardFloor, uWaveA, uWaveB; uniform sampler2D uCardTex; uniform vec3 uCenter; varying vec3 vCardPos; varying vec3 vCardN; varying float vEraT;
        float cardMix; vec3 cardCol;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 an = abs(vCardN);
        vec2 cuv = an.x > an.y && an.x > an.z ? vCardPos.zy : (an.y > an.z ? vCardPos.xz : vCardPos.xy);
        cardCol = texture2D(uCardTex, cuv * 1.1).rgb;
        #ifdef NO_REVEAL
          cardMix = 0.;
        #else
          float edge = (cardCol.r - .55) * .5;
          cardMix = max(smoothstep(uReveal - .12, uReveal + .12, distance(vCardPos, uCenter) + edge), uCardFloor);
        #endif
        // S04 modernisation: a cardboard circle scales out from the computer (wave A) over the old room,
        // then — after the swap — the living new room scales out the same way (wave B)
        float wd = distance(vCardPos, uCenter) + (cardCol.r - .55) * .5;
        cardMix = max(cardMix, (1. - smoothstep(uWaveA - .12, uWaveA + .12, wd)) * smoothstep(uWaveB - .12, uWaveB + .12, wd));
        diffuseColor.rgb = mix(diffuseColor.rgb, cardCol, cardMix);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 1.0, cardMix);`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.0, cardMix);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance *= 1. - cardMix;`);
  };
  mat.needsUpdate = true;
}

// ------------------------------------------------------------------ materials: the GLB is already PBR; only light-emitting parts are replaced
let screenMesh = null, lampBulb = null, crtMat = null, modernScreen = null, lampBulbNew = null;
const NO_SHADOW_CASTERS = /^floor|night sky/i;   // walls DO cast: moonlight only enters through the window
const glowColor = { "LAMP BULB": ["#ffd9a0", 8], "PC LED": ["#3dff7a", 3], "CLOCK LED": ["#ff2a1a", 3] };

const neonTex = new THREE.TextureLoader().load("assets/rj-logo.png", (t) => (t.colorSpace = THREE.SRGBColorSpace));
function eraOf(o) { for (let p = o; p; p = p.parent) if (p.userData && p.userData.era) return p.userData.era; return null; }
function dress(root) {
  const toRemove = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material, name = m.name || "";
    o.receiveShadow = true;
    o.castShadow = !NO_SHADOW_CASTERS.test(o.name) && !NO_SHADOW_CASTERS.test(name);
    o.userData.era = eraOf(o);
    if (/^SCREEN_?modern/i.test(o.name)) { modernScreen = o; o.castShadow = false; return; }
    if (name.startsWith("NEW — neon logo")) {
      o.material = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, color: new THREE.Color("#4fb2ff").multiplyScalar(2.6), toneMapped: false, depthWrite: false });
      o.castShadow = false; return;
    }
    if (/^NEW_Lamp_bulb/.test(o.name)) { lampBulbNew = o; toRemove.push(o); return; }   // used only to place the light
    if (glowColor[name]) {
      const [c, k] = glowColor[name];
      o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
      o.castShadow = false;
      if (name === "LAMP BULB") lampBulb = o;
      return;
    }
    if (name.startsWith("SCREEN")) {
      screenMesh = o; return;            // material set after the Figma screen texture is ready
    }
    if (name.startsWith("WINDOW — night sky")) {
      o.material = new THREE.MeshBasicMaterial({ map: m.emissiveMap || m.map, color: new THREE.Color(1.3, 1.3, 1.4), side: THREE.DoubleSide });
      o.castShadow = false; return;
    }
    if (m.isMeshStandardMaterial) m.envMapIntensity = 0.6;
    if (/^NEW — LED/.test(name)) toRemove.push(o);            // thin LED lines shimmered — removed (the wall wash light stays)
  });
  root.updateMatrixWorld(true);
  if (lampBulbNew) new THREE.Box3().setFromObject(lampBulbNew).getCenter(lampNewPos);
  toRemove.forEach((o) => o.removeFromParent());
}

// ------------------------------------------------------------------ post: AO → depth of field → bloom → tone map → grain/aberration
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// Quality tiers: 2 = AO + bloom, 1 = bloom only, 0 = minimal. Starts high on desktop, steps down if frames are slow.
const gpuName = (() => { try { const gl = renderer.getContext(); const e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ""; } catch { return ""; } })();
const weakGpu = /Intel|UHD|Iris|Mali|Adreno|PowerVR|Apple GPU|SwiftShader|llvmpipe/i.test(gpuName) && !/NVIDIA|Radeon RX|GeForce/i.test(gpuName);
if (!params.get("dpr")) {
  if (light) {
    // phones: their GPUs ("Apple GPU", Adreno, Mali) are fine for this small screen — the old 0.75× cap made the monitor text
    // soft. Spend a fixed pixel budget instead (~0.9 MP: crisp on a 390×844 phone), adaptive quality still steps down if slow.
    DPR = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(650000 / (innerWidth * innerHeight)));   // ~0.65 MP: sharp, and leaves memory for iOS
    renderer.setPixelRatio(DPR);
  } else if (weakGpu) { DPR = Math.min(DPR, 0.75); renderer.setPixelRatio(DPR); }
}
let tier = params.get("q") ? Number(params.get("q")) : (light || weakGpu ? 1 : 2);
let gtao = null;
if (!light) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.5, scale: 1.1, samples: 8 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 });
  composer.addPass(gtao);
}
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.6, 0.93);
composer.addPass(bloom);
let aoMod = 1, aoTier = 1;
function updateAO(dt) {                      // AO never pops: it eases with the quality tier and around the morph
  if (!gtao) return;
  aoTier += ((tier >= 2 ? 1 : 0) - aoTier) * (1 - Math.exp(-dt * 3));
  const k = aoTier * aoMod;
  gtao.blendIntensity = k;
  gtao.enabled = k > 0.01;
}
function applyTier() {
  bloom.enabled = tier >= 1;
}
composer.addPass(new OutputPass());
const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, blur: { value: 0 }, warm: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, blur, warm; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - .5; float r2 = dot(d, d);
      vec2 ca = d * r2 * .012;                       // chromatic aberration towards the edges
      vec3 c = vec3(texture2D(tDiffuse, vUv + ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - ca).b);
      // cheap lens blur: sharp centre (the monitor), soft edges. Distance is measured in real screen proportions, so on a
      // tall phone the monitor text (which spans the whole width) stays sharp instead of blurring at its left/right ends
      vec2 dq = d * vec2(min(res.x / res.y, 1.), 1.);
      float b = blur * smoothstep(.04, .22, dot(dq, dq));
      if (b > .0005) {
        vec3 acc = c; vec2 px = b / res * 900.;
        acc += texture2D(tDiffuse, vUv + px * vec2( 1., 0.)).rgb; acc += texture2D(tDiffuse, vUv + px * vec2(-1., 0.)).rgb;
        acc += texture2D(tDiffuse, vUv + px * vec2(0.,  1.)).rgb; acc += texture2D(tDiffuse, vUv + px * vec2(0., -1.)).rgb;
        acc += texture2D(tDiffuse, vUv + px * vec2(.7, .7)).rgb;  acc += texture2D(tDiffuse, vUv + px * vec2(-.7, -.7)).rgb;
        acc += texture2D(tDiffuse, vUv + px * vec2(.7, -.7)).rgb; acc += texture2D(tDiffuse, vUv + px * vec2(-.7, .7)).rgb;
        c = acc / 9.;
      }
      c *= mix(vec3(.96, 1.0, 1.06), vec3(1.07, 1.0, 0.86), warm);   // warm "tungsten" grade → cool modern grade
      c = mix(c, c * c * (3. - 2. * c), .28);            // gentle S-curve contrast
      c += mix(vec3(0., .004, .012), vec3(.014, .007, 0.), warm);     // lifted blacks follow the grade
      c += (hash(vUv * res + fract(time) * 91.) - .5) * .035;   // film grain
      c *= 1. - r2 * .8;                               // vignette
      gl_FragColor = vec4(c, 1.);
    }`,
});
composer.addPass(film);

// ------------------------------------------------------------------ camera path (straight back along the monitor axis) + parallax
// Final shot: camera further back + longer lens (perspective compression) → bigger computer, denser back wall.
// ?wz=2.4&hf=50 tweak distance and horizontal field of view for tests.
const WIDE_Z = Number(params.get("wz") || 1.62), WIDE_HFOV = Number(params.get("hf") || 62);
const WIDE = { pos: new THREE.Vector3(0, 1.36, WIDE_Z), target: new THREE.Vector3(0, 1.22, -1.3) };
// phones (portrait): a tall frame can't use the long lens — it would see past the room — so stay inside, wider lens
const WIDE_PORTRAIT = { pos: new THREE.Vector3(0, 1.32, 1.28), target: new THREE.Vector3(0, 1.13, -1.45) };   // phones: closer, the room fills the tall frame
const CLOSE = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };
const CLOSE_M = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30 };   // the modern screen, filling the view
const msBox = new THREE.Box3(), msCenter = new THREE.Vector3(), msSize = new THREE.Vector3();
const screenBox = new THREE.Box3(), screenCenter = new THREE.Vector3(), screenSize = new THREE.Vector3();

function wideFov() {
  const a = VW() / VH();
  const v = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad((a >= 1 ? WIDE_HFOV : 82) / 2)) / a);
  // wide screens (16:9 and wider) keep at least 35° vertically so the poster tops stay in frame
  return Math.min(Math.max(THREE.MathUtils.radToDeg(v), a >= 1 ? 35 : 0), 74);
}
function layoutCloseModern() {
  if (!modernScreen) return;
  const a = VW() / VH(), t = 2 * Math.tan(THREE.MathUtils.degToRad(CLOSE_M.fov / 2));
  // landscape: the panel fills ~96% of the frame; portrait: the dialogs (56% of the panel) fill ~92% of the width
  const d = a >= 1 ? Math.max(msSize.y / 0.94, msSize.x / (0.96 * a)) / t : (msSize.x / 2.3 / a) / t;   // portrait: the panel is 2.3× the phone width → the middle 700 design px fill the screen
  CLOSE_M.pos.set(msCenter.x, msCenter.y, msBox.max.z + d);
  CLOSE_M.target.copy(msCenter);
}
function layoutClose() {
  const a = VW() / VH();
  const t = 2 * Math.tan(THREE.MathUtils.degToRad(CLOSE.fov / 2));
  // phones (portrait): fit the TEXT block, not the whole glass — the headline then reads at a comfortable size.
  // The text sits a little left of the glass centre (Figma x 136…1047 of 1350), so the camera moves left with it.
  // (while the connect screen is up, the whole glass stays in view and centred — its picture is centred)
  const narrow = a < 0.8, connecting = !document.body.classList.contains("entered") && !connectDone;
  const d = Math.max(screenSize.y / 0.78, screenSize.x / ((narrow ? (connecting ? 1.08 : 1.28) : 0.9) * a)) / t;   // phones: the glass fills the width
  const dx = narrow && !connecting ? -0.062 * screenSize.x : 0;
  CLOSE.pos.set(screenCenter.x + dx, screenCenter.y, screenBox.max.z + d);
  CLOSE.target.set(screenCenter.x + dx, screenCenter.y, screenCenter.z);
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const range = (p, a, b) => clamp01((p - a) / (b - a));

let target = 0, progress = 0;      // both in vh of scroll
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
// The story position is measured in vh of scroll (see the chapter heights in style.css).
// ?v=300 freezes it at 300 vh, ?p=0.5 at a fraction of the whole page (stills / tests).
let rawPv = 0;
const maxVh = () => (document.documentElement.scrollHeight - innerHeight) / innerHeight * 100;
function readScroll(e) {
  if (params.get("v") !== null) rawPv = Number(params.get("v"));
  else if (fixedP !== null) rawPv = Number(fixedP) * maxVh();
  else rawPv = scrollY / innerHeight * 100;
  if (e && gates) gates.nudge();
  document.body.classList.toggle("scrolled", scrollY > 20);
  if (contentEl) document.body.classList.toggle("past-story", contentEl.getBoundingClientRect().top < innerHeight * 0.6);
}
addEventListener("scroll", readScroll, { passive: true });
// a new wheel / swipe / key press counts as "wants to go on", even when the page can't scroll any further
const gestureNow = () => gates && gates.nudge();
// While a button waits, scrolling down is refused at the input (wheel / touch / keys) instead of being undone after the
// browser has already painted the page further down — that undo was a one-frame flash.
const waitLimitPx = () => { const w = !frozen && gates && gates.pending(); return w && !w.pressing ? (w.at + 3) / 100 * innerHeight : Infinity; };
addEventListener("wheel", (e) => {
  if (e.deltaY <= 0) return;
  gestureNow();
  const lim = waitLimitPx(), d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
  if (scrollY + d > lim) { e.preventDefault(); if (scrollY < lim - 1) scrollTo(0, lim); }
}, { passive: false });
let touchY = 0;
addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener("touchmove", (e) => {
  gestureNow();
  const up = touchY - e.touches[0].clientY;                                     // finger up = page down
  if (up > 0 && scrollY >= waitLimitPx() - 2 && e.cancelable) e.preventDefault();
}, { passive: false });
addEventListener("keydown", (e) => {
  if (!["ArrowDown", "PageDown", " ", "Spacebar"].includes(e.key)) return;
  gestureNow();
  if (scrollY >= waitLimitPx() - 2 && e.target === document.body) e.preventDefault();
});
const os = makeOS();
const gates = makeGates(os, { reduceMotion, scrollToVh: (vh) => scrollTo({ top: vh / 100 * innerHeight, behavior: reduceMotion ? "auto" : "smooth" }) });
const frozen = params.get("v") !== null || fixedP !== null;
if (finePointer) {
  addEventListener("pointermove", (e) => mouse.set(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1));
  document.addEventListener("pointerleave", () => mouse.set(0, 0));
}
if (params.get("mx")) mouse.set(Number(params.get("mx")), Number(params.get("my") || 0)); // stills: fixed mouse
// ------------------------------------------------------------------ "connect to the internet" on the old PC's screen
// The first screen shows a pixel monitor, a pixel globe and a cable (connect-screen.js). The visitor drags the plug
// into the globe's socket (mouse or finger; Enter also works). Then: connect sound, the music starts (this gesture is
// what lets the browser play sound), the tube flickers and shows the Figma screen, and the page can be scrolled.
let crtFlick = 1, connectDone = frozen || deep;                              // stills (?p / ?v) skip the connect step
async function startConnect() {
  const { makeConnectScreen, CONNECT } = await import("./connect-screen.js");
  const cs = makeConnectScreen(), figmaTex = crtMat.uniforms.map.value;
  crtMat.uniforms.map.value = cs.tex;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hc = document.documentElement.classList;
  const plug = { x: CONNECT.rest.x, y: CONNECT.rest.y }, target = { x: CONNECT.socket.x - 27, y: CONNECT.socket.y - 7 };
  const reach = finePointer ? 1 : 1.8;                                // fingers are bigger than a mouse pointer
  let drag = null, done = false, raf = 0;
  // screen pixel → low-res connect-canvas pixel (through the tube's bulge, like the CRT shader)
  const toCanvas = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(screenMesh, false)[0];
    if (!hit || !hit.uv) return null;
    const c = hit.uv.clone().subScalar(0.5), k = (1 + 0.09 * c.dot(c) * 4) * 0.94;
    return { x: (0.5 + c.x * k) * cs.size.w, y: (0.5 + c.y * k) * cs.size.h };
  };
  const onPlug = (p) => p && p.x > plug.x - 14 * reach && p.x < plug.x + 28 + 14 * reach && p.y > plug.y - 16 * reach && p.y < plug.y + 14 + 16 * reach;
  const draw = (now) => {
    raf = 0;
    if (!drag && !done) { plug.x += (CONNECT.rest.x - plug.x) * 0.2; plug.y += (CONNECT.rest.y - plug.y) * 0.2; }   // let go: back to its hook
    const near = done ? 1 : drag ? Math.max(0, 1 - Math.hypot(plug.x - target.x, plug.y - target.y) / 75) : 0;
    cs.draw({ plug, near, done, time: now / 1000 });
    if (drag || done || Math.hypot(plug.x - CONNECT.rest.x, plug.y - CONNECT.rest.y) > 0.5 || near > 0.05) raf = requestAnimationFrame(draw);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const connect = () => {
    if (done) return;
    done = true; drag = null; hc.remove("hand", "grab");
    plug.x = target.x; plug.y = target.y; kick();
    window.hwSfx?.("click"); setTimeout(() => window.hwSfx?.("start"), 180);
    window.hwMusic?.start();
    // the tube flickers and shows the real first screen, then the story is free to scroll
    setTimeout(() => {
      const t0 = performance.now();
      (function flick(now) {
        const t = (now - t0) / 650;
        crtFlick = t < 0.35 ? 1 - (t / 0.35) * 0.95 : t < 0.5 ? 0.05 : t < 1 ? 0.05 + ((t - 0.5) / 0.5) * 1.15 : 1;
        if (t >= 0.42 && crtMat.uniforms.map.value !== figmaTex) { crtMat.uniforms.map.value = figmaTex; connectDone = true; layoutClose(); }   // reframe while the tube is dark
        if (t < 1.25) requestAnimationFrame(flick);
        else { crtFlick = 1; document.body.classList.add("entered"); cancelAnimationFrame(raf); raf = 0; }
      })(t0);
    }, 1100);
  };
  addEventListener("pointerdown", (e) => {
    if (done || !document.body.classList.contains("ready")) return;
    if (e.target.closest && e.target.closest("button, a")) return;
    const p = toCanvas(e.clientX, e.clientY);
    if (!onPlug(p)) return;
    drag = { dx: plug.x - p.x, dy: plug.y - p.y }; hc.add("grab"); kick();
    if (e.cancelable) e.preventDefault();
  });
  addEventListener("pointermove", (e) => {
    if (done || !document.body.classList.contains("ready")) return;
    const p = toCanvas(e.clientX, e.clientY);
    if (!drag) { hc.toggle("hand", !!onPlug(p)); return; }
    if (!p) return;
    plug.x = p.x + drag.dx; plug.y = p.y + drag.dy;
    if (Math.hypot(plug.x - target.x, plug.y - target.y) < 18 * reach) connect(); else kick();
  });
  // let go close to the socket: the plug is pulled in (magnet); farther away it springs back to its hook
  const release = () => {
    if (!drag || done) return;
    drag = null; hc.remove("grab");
    if (Math.hypot(plug.x - target.x, plug.y - target.y) < 45 * reach) connect(); else kick();
  };
  addEventListener("pointerup", release); addEventListener("pointercancel", release);
  addEventListener("keydown", (e) => {                               // keyboard: Enter / Space plugs it in
    if (done || !document.body.classList.contains("ready") || !["Enter", " "].includes(e.key)) return;
    e.preventDefault();
    const s = { x: plug.x, y: plug.y }, t0 = performance.now();
    (function slide(now) {
      const t = Math.min(1, (now - t0) / 500), q = t * t * (3 - 2 * t);
      plug.x = s.x + (target.x - s.x) * q; plug.y = s.y + (target.y - s.y) * q; kick();
      if (t < 1) requestAnimationFrame(slide); else connect();
    })(t0);
  });
  if (params.has("cctest")) window.__cc = { toCanvas, plug, target };   // tests only
  draw(performance.now());
}

$("home").addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
document.getElementById("replay")?.addEventListener("click", () => { scrollTo({ top: 0, behavior: "auto" }); setTimeout(() => gates.reset(), 50); });
// "Skip the story": for people in a hurry and for the second visit — every button counts as pressed, straight to the page
document.getElementById("skip")?.addEventListener("click", () => {
  gates.skipAll();
  scrollTo({ top: contentEl.getBoundingClientRect().top + scrollY, behavior: "auto" });
});

const tmpPos = new THREE.Vector3(), tmpTgt = new THREE.Vector3(), v = new THREE.Vector3();
const PARALLAX = reduceMotion && motionParam !== "full" ? 0.6 : 1;
function updateCamera(p, pv = 0) {
  const t = ease(range(p, 0.12, 0.66));
  const W = VW() >= VH() ? WIDE : WIDE_PORTRAIT;
  tmpPos.lerpVectors(CLOSE.pos, W.pos, t);
  tmpTgt.lerpVectors(CLOSE.target, W.target, t);
  // S05: push into the modern monitor; after "готово" pull back out into the room
  const z = ease(range(pv, 510, 575)) * (1 - ease(range(pv, OS_TIMES.out[0], OS_TIMES.out[1])));
  tmpPos.lerp(CLOSE_M.pos, z); tmpTgt.lerp(CLOSE_M.target, z);
  // parallax: the camera slides with the mouse while still looking at the scene → foreground and wall move differently
  const k = (0.35 + 0.65 * t) * PARALLAX * (1 - 0.9 * z);
  tmpPos.x += mouseS.x * 0.22 * k;
  tmpPos.y -= mouseS.y * 0.10 * k;
  tmpTgt.x += mouseS.x * 0.05 * k;
  tmpTgt.y -= mouseS.y * 0.03 * k;
  camera.position.copy(tmpPos);
  camera.fov = THREE.MathUtils.lerp(THREE.MathUtils.lerp(CLOSE.fov, wideFov(), t), CLOSE_M.fov, z);
  const ten = typeof gates !== "undefined" ? gates.tension() : 0;      // holding the update button: the lens tightens and trembles
  if (ten > 0.001) { camera.fov *= 1 - 0.06 * ten; tmpPos.x += (Math.random() - 0.5) * 0.004 * ten; tmpPos.y += (Math.random() - 0.5) * 0.004 * ten; camera.position.copy(tmpPos); }
  camera.aspect = VW() / VH(); camera.updateProjectionMatrix();
  camera.lookAt(tmpTgt);
  camera.rotateZ(-mouseS.x * 0.008 * k);             // a hint of roll, like a hand-held camera
  camera.updateMatrixWorld();
  film.uniforms.blur.value = THREE.MathUtils.lerp(0.006, 0.0018, t) * (document.body.classList.contains("entered") ? 1 : 0.15);   // the connect screen stays sharp to its edges
}

// The room emerges from haze: dense fog around the monitor at the start, clearing as the camera pulls back.
// The computer itself never fogs (its materials have fog off), like the hand in the reference.
const HAZE = new THREE.Color("#5a4436"), NIGHT = new THREE.Color("#0b0c18");
function updateFog(p) {
  const r = ease(range(p, 0.18, 0.78));
  const dm = Math.max(0.3, camera.position.distanceTo(screenCenter));
  scene.fog.density = THREE.MathUtils.lerp(0.12 / dm, 0.02, r);   // light haze only: the cardboard reads from the very first frame
  CARD.uReveal.value = THREE.MathUtils.lerp(0.0, 3.2, ease(range(p, 0.42, 0.9)));
  CARD.uCardFloor.value = 0.1 * ease(range(p, 0.7, 0.95));   // a 10% cardboard memory stays in the finished room
  scene.fog.color.copy(HAZE).lerp(NIGHT, r);
  scene.background.copy(scene.fog.color);
}

// dust motes floating in the lamp light (our version of the petals)
const DUST = 260, DUST_OLD = new THREE.Color(1, .78, .52), DUST_NEW = new THREE.Color(.75, .88, 1);
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 2.6; dustPos[i * 3 + 1] = 0.7 + Math.random() * 1.6; dustPos[i * 3 + 2] = -1.2 + Math.random() * 2.2;
  dustSeed[i] = Math.random() * 100;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
dustGeo.setAttribute("seed", new THREE.BufferAttribute(dustSeed, 1));
const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 }, lamp: { value: new THREE.Vector3() }, tint: { value: new THREE.Color(1, .78, .52) } },
  vertexShader: `attribute float seed; uniform float time; uniform vec3 lamp; varying float vA;
    void main(){ vec3 p = position;
      p.x += sin(time * .11 + seed) * .08; p.y += sin(time * .07 + seed * 1.7) * .12; p.z += cos(time * .09 + seed) * .08;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      float l = 1. / (1. + 6. * dot(p - lamp, p - lamp));            // motes glow near the lamp
      vA = (.12 + l) * (.6 + .4 * sin(time * .8 + seed * 3.));
      gl_PointSize = (2.2 + mod(seed, 3.)) * (1.6 / -mv.z) * ${DPR.toFixed(2)};
      gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 tint; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
      gl_FragColor = vec4(tint * vA, smoothstep(.5, 0., d) * vA); }`,
}));
dust.frustumCulled = false;
scene.add(dust);

function project(p) {
  v.copy(p).project(camera);
  return { x: (v.x * 0.5 + 0.5) * VW(), y: (-v.y * 0.5 + 0.5) * VH() };
}

// HTML on the glass: fit the 800×600 design box to the projected screen rectangle
const corners = [new THREE.Vector3(), new THREE.Vector3()];
function placeScreen() {
  corners[0].set(screenBox.min.x, screenBox.max.y, screenBox.max.z);
  corners[1].set(screenBox.max.x, screenBox.min.y, screenBox.max.z);
  const a = project(corners[0]), b = project(corners[1]);
  const inset = 0.06;
  const w = (b.x - a.x) * (1 - inset * 2), h = (b.y - a.y) * (1 - inset * 2);
  const x = a.x + (b.x - a.x) * inset, y = a.y + (b.y - a.y) * inset;
  const s = Math.min(w / 800, h / 600);
  if (screenEl.hidden) return;
  screenEl.style.transform = `translate(${x + (w - 800 * s) / 2}px, ${y + (h - 600 * s) / 2}px) scale(${s})`;
}

const mc = [new THREE.Vector3(), new THREE.Vector3()];
let osPos = "";
function placeOS() {
  if (!modernScreen || !os.el.classList.contains("on")) return;
  mc[0].set(msBox.min.x, msBox.max.y, msBox.max.z); mc[1].set(msBox.max.x, msBox.min.y, msBox.max.z);
  const a = project(mc[0]), b = project(mc[1]);
  const sx = (b.x - a.x) / 1600, sy = (b.y - a.y) / 914;
  const tr = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  if (tr !== osPos) { os.el.style.transform = tr; osPos = tr; }
}

const wallAnchor = new THREE.Vector3(0, 1.925, -1.28);
let wallText = null, wallText2 = null;
// Scroll timeline in vh (must match the chapter heights in style.css): stage 1 = pull back (0–200),
// headline out 225–255, modernisation 245–425, "з часом технології ставали краще" 430–470, end after 500.
const TL = { total: 540, s1: 200 };
const textScale = () => (innerWidth >= innerHeight ? 1 : 1.02);   // phone shot is wider; this keeps the line inside the screen
// the free band for a wall headline: below the header, above the monitor (old CRT case / modern panel)
const capTop = new THREE.Vector3();
function textRoom(modern) {
  if (modern) capTop.set(msCenter.x, msBox.max.y, msBox.max.z);
  else capTop.set(screenCenter.x, screenBox.max.y + screenSize.y * 0.15, screenCenter.z);   // the case rises ~15% above the glass
  capTop.project(camera);
  const H = canvas.clientHeight;
  return { min: Math.max(56, H * 0.1), max: (-capTop.y * 0.5 + 0.5) * H - Math.max(18, H * 0.03) };
}
function showText(t, inT, outT, modern = false) { if (t) placeHtmlText(t, camera, wallAnchor, inT, outT, textScale(), inT > 0 && outT < 1 ? textRoom(modern) : null); }
let shadowEra = "old", eraVisState = "";
function updateStory(pv, p1) {
  const r1 = ease(range(p1, 0.6, 0.76));
  showText(wallText, r1, ease(range(pv, 225, 255)));
  showText(wallText2, ease(range(pv, 430, 470)), ease(range(pv, 500, 522)), true);
  updateOS(os, pv, range, gates);
  // modernisation
  const mod = range(pv, 245, 425);
  CARD.uMod.value = mod;
  CARD.uWaveA.value = mod <= 0 ? -1 : THREE.MathUtils.lerp(-0.2, 3.4, ease(range(mod, 0.02, 0.46)));
  CARD.uWaveB.value = mod < 0.54 ? -1 : THREE.MathUtils.lerp(-0.2, 3.4, ease(range(mod, 0.54, 0.98)));
  if (screenMesh) screenMesh.visible = mod < 0.1;                    // hide the CRT glass before its monitor folds (the glass isn't scaled with it)
  if (crtMat) crtMat.uniforms.power.value = (1 - 0.25 * r1) * (1 - range(mod, 0.04, 0.1)) * crtFlick;
  const k = ease(range(mod, 0.05, 0.9));
  lamp.color.copy(LAMP_OLD).lerp(LAMP_NEW, k);
  lamp.intensity = THREE.MathUtils.lerp(3.4, 2.2, k);
  lamp.position.lerpVectors(lampOldPos, lampNewPos, k); lamp.target.position.lerpVectors(lampOldTgt, lampNewTgt, k);
  lamp.angle = THREE.MathUtils.lerp(0.95, 1.15, k);
  strip.intensity = 10 * ease(range(mod, 0.35, 0.8));
  if (hemi) { hemi.color.copy(HEMI_OLD).lerp(HEMI_NEW, k); hemi.intensity = THREE.MathUtils.lerp(0.13, 0.18, k); }
  film.uniforms.warm.value = 1 - k;
  dust.material.uniforms.tint.value.copy(DUST_OLD).lerp(DUST_NEW, k);
  // AO and shadows are drawn without our vertex animation: hide whichever room is fully gone,
  // and switch AO off while the two rooms are morphing (otherwise ghosts of the old objects stay in the AO)
  const eraVis = mod < 0.5 ? "old" : "new";
  if (eraVis !== eraVisState) {
    eraVisState = eraVis;
    scene.traverse((o) => { if (o.isMesh && o.userData.era) o.visible = eraVis === "both" || o.userData.era === eraVis; });
  }
  // fade AO out/in around the morph instead of switching it (switching made the whole room flicker)
  aoMod = 1;
  const want = mod > 0.5 ? "new" : "old";
  if (want !== shadowEra) {                                          // shadows are static: re-bake once when the room swaps
    shadowEra = want;
    scene.traverse((o) => { if (o.isMesh && o.userData.era) o.castShadow = o.userData.era === want; });
    renderer.shadowMap.needsUpdate = true;
  }
  document.body.classList.toggle("at-end", pv > OS_TIMES.out[1] - 4);
}

let last = performance.now(), roomHidden = false, tintN = 0;
// Phones: Safari / Chrome paint their status bar and toolbar with the page background (or theme-color). With a fixed
// navy background they showed as "blue edges" above and below the room. Sample the rendered room right under the bars
// (one pixel, a few times a second) and give the page background and theme-color that colour.
const tintPx = new Uint8Array(4), themeMeta = document.querySelector('meta[name="theme-color"]');
function setBarColor(c) {
  if (c === setBarColor.last) return; setBarColor.last = c;
  document.documentElement.style.background = c; if (themeMeta) themeMeta.content = c;
}
window.__setBarColor = setBarColor;
function tintBars() {
  if (!light) return;
  const gl = renderer.getContext();
  gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), gl.drawingBufferHeight - 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, tintPx);
  setBarColor(`rgb(${tintPx[0]}, ${tintPx[1]}, ${tintPx[2]})`);
}
function frame(now) {
  if (pendingScale) { DPR = pendingScale; pendingScale = 0; renderer.setPixelRatio(DPR); resize(); }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  gates.tick(dt);
  target = frozen ? rawPv : gates.limit(rawPv);
  const wait = !frozen && gates.pending();
  if (wait && !wait.pressing && rawPv > wait.at + 3) scrollTo(0, (wait.at + 3) / 100 * innerHeight);   // the page can't run past a waiting button
  progress += (target - progress) * (1 - Math.exp(-dt * 5));
  mouseS.lerp(mouse, 1 - Math.exp(-dt * 2.6));
  // once the page content fully covers the room, skip the whole room (camera, story, overlays, render): the page reads alone
  const contentTop = contentEl ? contentEl.getBoundingClientRect().top : 1e9;
  const hidden = contentTop <= 0;
  if (hidden !== roomHidden) { canvas.style.visibility = hidden ? "hidden" : "visible"; roomHidden = hidden; }
  if (hidden) { requestAnimationFrame(frame); return; }
  const pv = progress, p1 = clamp01(pv / TL.s1);
  updateCamera(p1, pv);
  placeScreen();
  placeOS();
  if (!params.has("nostory")) updateStory(pv, p1);
  updateFog(p1);
  dust.material.uniforms.time.value = now / 1000;
  if (crtMat) crtMat.uniforms.time.value = reduceMotion ? 0 : now / 1000;
  film.uniforms.time.value = reduceMotion ? 0 : now / 1000;
  const tr0 = performance.now();
  updateAO(dt);
  if (!hidden) composer.render(dt);
  if (!hidden && ++tintN % 20 === 0) tintBars();                   // phone browser bars take the colour of the room behind them
  const tr1 = performance.now();
  adaptQuality(dt);                                   // may change the render size — it takes effect next frame, before drawing
  if (params.has("trace") && (tr1 - tr0 > 100 || performance.now() - tr1 > 100))
    console.log(`[trace] p=${progress.toFixed(2)} render=${(tr1 - tr0).toFixed(0)}ms adapt=${(performance.now() - tr1).toFixed(0)}ms dpr=${DPR} tier=${tier}`);
  requestAnimationFrame(frame);
}

function resize() {
  renderer.setSize(VW(), VH(), false);
  composer.setPixelRatio(DPR);
  composer.setSize(VW(), VH());
  film.uniforms.res.value.set(VW() * DPR, VH() * DPR);
  if (screenMesh) layoutClose();
  layoutCloseModern();
  if (wallText) {
    updateCamera(1, 300);                                              // final wide shot, no push-in
    sizeHtmlText(wallText, camera, wallAnchor, textScale()); sizeHtmlText(wallText2, camera, wallAnchor, textScale());
    updateCamera(clamp01(progress / TL.s1), progress);
  }
}
// a resize clears the canvas — draw the room again at once, so the browser never shows an empty frame
let lastSize = "";
addEventListener("resize", () => {
  const sz = VW() + "x" + VH();
  if (sz === lastSize) return; lastSize = sz;                      // phone toolbars change innerHeight, not the canvas
  resize(); if (!roomHidden && document.body.classList.contains("ready")) composer.render(0);
});

// ------------------------------------------------------------------ performance helpers
async function precompileAll() {
  const hidden = [];
  scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  // the room is drawn into the composer's render target (linear, no tone mapping) — compile exactly those variants
  const prevRT = renderer.getRenderTarget();
  renderer.setRenderTarget(composer.readBuffer);
  await renderer.compileAsync(scene, camera);
  renderer.setRenderTarget(prevRT);
  hidden.forEach((o) => (o.visible = false));
  // post-processing materials: put each on a quad in a throw-away scene and compile those too
  const post = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2), seen = new Set();
  const grab = (v) => { if (v && v.isMaterial && !seen.has(v)) { seen.add(v); post.add(new THREE.Mesh(quad, v)); } };
  for (const pass of composer.passes) for (const v of Object.values(pass)) { if (Array.isArray(v)) v.forEach(grab); else grab(v); if (v && v.material) grab(v.material); }
  await renderer.compileAsync(post, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
}

const countMeshes = (root) => { let n = 0; root.traverse((o) => { if (o.isMesh) n++; }); return n; };
// The room is static: bake every group of meshes that share a material into one mesh (one draw call instead of dozens).
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  // flatten first: meshes parented to meshes (keys on the keyboard, labels on cassettes) must survive their parent's removal
  const all = []; root.traverse((o) => { if (o.isMesh) all.push(o); });
  all.forEach((o) => root.attach(o));
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(), c = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.userData.era) return;
    box.setFromObject(o); box.getCenter(c);
    const d = clamp01(Math.hypot(c.x - screenCenter.x, (c.y - screenCenter.y) * 0.6, c.z - screenCenter.z) / 2.2);
    const lc = o.worldToLocal(c.clone());                      // local space: survives applyMatrix4 when merged
    o.geometry = o.geometry.clone();
    const n = o.geometry.attributes.position.count, cc = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { cc[i * 3] = lc.x; cc[i * 3 + 1] = lc.y; cc[i * 3 + 2] = lc.z; }
    o.geometry.setAttribute("aEraC", new THREE.BufferAttribute(cc, 3));
    o.geometry.setAttribute("aEraD", new THREE.BufferAttribute(new Float32Array(n).fill(d), 1));
  });
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o === screenMesh) return;
    const g = o.geometry;
    const key = [o.material.uuid, Object.keys(g.attributes).sort().join(","), g.index ? "i" : "n", o.castShadow, o.matrixWorld.determinant() < 0, o.userData.era || ""].join("|");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  const merged = new THREE.Group(); merged.name = "room (merged)";
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => {
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (g.attributes.aEraC) g.attributes.aEraC.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      return g.index ? g : g;
    });
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, list[0].material);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = true; mesh.userData.era = list[0].userData.era;
    mesh.name = list[0].name + ` ×${list.length}`;
    merged.add(mesh);
    list.forEach((o) => o.removeFromParent());
  }
  scene.add(merged);
}

// Dynamic resolution: keep frames under ~16 ms by scaling the internal render size (0.5…max) and dropping
// AO / bloom when even half resolution is too slow. Reacts within ~0.5 s, so weak laptops stop stuttering fast.
const DPR_MAX = DPR;
// phones never go below 1× (below that the monitor text turns to mush — his iPhone showed it); they drop effects instead
const DPR_MIN = light ? Math.min(DPR_MAX, 1) : 0.5;
let frameAvg = 1 / 60, perfFrames = 0, sinceChange = 0, ups = 0;
let pendingScale = 0;
function setScale(v) {
  v = Math.round(THREE.MathUtils.clamp(v, DPR_MIN, DPR_MAX) * 20) / 20;
  if (Math.abs(v - DPR) < 0.04) return false;
  pendingScale = v; return true;                      // applied at the start of the next frame, right before it is drawn
}
function adaptQuality(dt) {
  if (document.hidden || params.get("q") || params.get("dpr")) return;
  perfFrames++; if (perfFrames < 60 || dt > 0.25) return;      // skip warm-up and one-off hitches
  frameAvg += (dt - frameAvg) * 0.08;
  ++sinceChange;
  // a slow moment (loading, a busy phone) must not leave the site blurry for good: after 4 s of smooth frames, step back up
  if (sinceChange > 240 && frameAvg < 1 / 57 && DPR < DPR_MAX - 0.04 && ups < 3) { ups++; sinceChange = 0; setScale(DPR * 1.2); return; }
  if (sinceChange < 45 || frameAvg <= 1 / 48) return;
  sinceChange = 0; frameAvg = 1 / 60;
  if (tier === 2) { tier = 1; applyTier(); }                 // first drop AO (no resize needed)
  else if (DPR > DPR_MIN + 0.04) setScale(DPR * 0.8);        // then render fewer pixels
  else if (tier === 1) { tier = 0; applyTier(); }
}

// ------------------------------------------------------------------ load
const numEl = $("loader-num");
// loader glow follows the pointer (eases toward it)
{
  const L = $("loader"); let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
  (function glow() {
    if (document.body.classList.contains("ready")) return;
    gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
    L.style.setProperty("--gx", `${gx.toFixed(0)}px`); L.style.setProperty("--gy", `${gy.toFixed(0)}px`);
    requestAnimationFrame(glow);
  })();
}
let shown = 0, loaded = 0;
// the loader reads like the old PC booting up (the story starts here): the status line steps through boot stages
const BOOT = [[0, L("Перевірка пам’яті…", "Memory check…")], [25, L("Завантаження системи…", "Loading the system…")],
  [55, L("Збираємо кімнату…", "Building the room…")], [85, L("Вмикаємо світло…", "Turning on the lights…")], [96, L("Прогріваємо монітор…", "Warming up the monitor…")]];
const statusEl = $("loader-status");
let bootStage = -1;
const tick = setInterval(() => {
  shown += Math.max(1, Math.round((loaded - shown) * 0.25));
  if (shown > loaded) shown = loaded;
  numEl.textContent = shown;
  let st = 0; BOOT.forEach(([at], i) => { if (shown >= at) st = i; });
  if (st !== bootStage && statusEl && !statusEl.dataset.error) { bootStage = st; statusEl.textContent = BOOT[st][1]; }
}, 40);

// the room: v6 = v5 compressed (gltfpack -cc -vpf -vtf -vnf -kn -km -ke -kv, 10.7 → 5.7 MB). Phones get v6-m: the same room
// with textures limited to 512 px — 64 textures at 1024 px took ~300 MB of GPU memory and iPhone Safari closed the page.
const ROOM_URL = params.get("room") === "v5" ? "assets/room-v5.glb" : params.get("room") === "full" || !light ? "assets/room-v6.glb" : "assets/room-v6-m.glb";
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(ROOM_URL, async (gltf) => {
  dress(gltf.scene);
  scene.add(gltf.scene);
  scene.updateMatrixWorld(true);
  let rig = screenMesh; while (rig.parent && !/CRT/i.test(rig.name)) rig = rig.parent;
  const heroMats = new Map();
  rig.traverse((o) => {
    if (!o.isMesh || o === screenMesh) return;
    if (!heroMats.has(o.material)) { const c = o.material.clone(); c.fog = false; heroMats.set(o.material, c); }
    o.material = heroMats.get(o.material); o.userData.hero = true;
  });
  // era objects get their own material copies (old / new) so the shared originals stay untouched
  const eraMats = new Map();
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !o.userData.era || o === screenMesh) return;
    const key = o.material.uuid + o.userData.era + (o.userData.hero ? "h" : "");
    if (!eraMats.has(key)) {
      const c = o.material.clone();
      const reveal = !o.userData.hero && !o.material.isMeshBasicMaterial;
      cardboardify(c, { reveal, era: o.userData.era });
      eraMats.set(key, c);
    }
    o.material = eraMats.get(key);
    if (o.userData.era === "new") o.castShadow = false;
  });
  gltf.scene.traverse((o) => {
    if (!o.isMesh || o.userData.hero || o.userData.era) return;
    if (o.material.isMeshStandardMaterial || (o.material.isMeshBasicMaterial && o.material.map)) cardboardify(o.material);
  });
  if (modernScreen) {
    msBox.setFromObject(modernScreen); msBox.getCenter(msCenter); msBox.getSize(msSize);
    modernScreen.material = new THREE.MeshBasicMaterial({ map: makeModernScreenTexture(), toneMapped: false });
    cardboardify(modernScreen.material, { reveal: false, era: "new" });
  }
  crtMat = makeCrtMaterial(await screenTexPromise);
  if (!frozen && !deep) startConnect();                                       // the visit starts by plugging the old PC into the internet
  screenMesh.material = crtMat; screenMesh.castShadow = false;
  screenBox.setFromObject(screenMesh);
  screenBox.getCenter(screenCenter); screenBox.getSize(screenSize);
  CARD.uCenter.value.copy(screenCenter);
  if (lampBulb) {
    new THREE.Box3().setFromObject(lampBulb).getCenter(lamp.position);
    lampHalo.position.copy(lamp.position).add(new THREE.Vector3(0, 0.08, 0));
    dust.material.uniforms.lamp.value.copy(lamp.position);
    lamp.target.position.set(lamp.position.x + 0.06, 0.76, lamp.position.z + 0.16);   // pool right under the shade, like a real desk lamp
    lampOldPos.copy(lamp.position); lampOldTgt.copy(lamp.target.position);
  }
  if (lampBulbNew) {
    lampNewPos.y -= 0.02;
    lampNewTgt.set(lampNewPos.x + 0.02, 0.76, lampNewPos.z + 0.05);
  }
  // Rj's origin story on the room wall: paper sketches + an old PC → full-stack tools
  wallText = makeHtmlText(L("та інтересу до", "paper sketches and"), L("цифрового світу", "an old PC"));
  wallText2 = makeHtmlText(L("з часом технології", "PHP/MySQL · QR · dashboards · flipbooks"), L("ставали краще", "full stack"));
  const before = countMeshes(gltf.scene);
  mergeStatic(gltf.scene);
  console.info(`[perf] meshes ${before} → ${countMeshes(gltf.scene)}`);
  renderer.shadowMap.needsUpdate = true;
  applyTier();
  resize();
  // upload every texture to the GPU now (otherwise each one uploads — and stalls — the first time it comes into view)
  const texs = new Set();
  scene.traverse((o) => { if (!o.material) return; for (const mat of [].concat(o.material)) for (const v of Object.values(mat)) if (v && v.isTexture) texs.add(v); });
  texs.add(CARD.uCardTex.value);
  texs.forEach((t) => renderer.initTexture(t));
  // compile EVERY shader before the loader goes: hidden objects (the new room, the OS-era meshes) and the post-processing
  // passes are skipped by a plain compile and then compiled synchronously on first use — that was an 11 s freeze
  loaded = 97;                                                       // "warming up the monitor": shaders + first frames
  updateCamera(1); await precompileAll(); composer.render(0); CARD.uMod.value = 0.5; composer.render(0); CARD.uMod.value = 0;
  updateCamera(0); composer.render(0);
  readScroll();
  target = progress = frozen ? rawPv : gates.limit(rawPv);
  mouseS.copy(mouse);
  await document.fonts.ready;
  // hold the loader until the room really runs smoothly (the first frames still settle: shadows, last shader variants,
  // GPU caches) — so the visitor never sees those first stutters. At most 2.5 s extra.
  if (!frozen) await new Promise((done) => {
    let good = 0, last = performance.now(); const t0 = last;
    (function check(now) {
      good = now - last < 34 ? good + 1 : 0; last = now;
      if (good >= 20 || now - t0 > 2500) done(); else requestAnimationFrame(check);
    })(last);
  });
  loaded = 100;
  if (fixedP !== null || params.get("v") !== null) $("loader").style.display = "none";
  setTimeout(() => {
    clearInterval(tick); numEl.textContent = "100";
    document.body.classList.add("ready");
    screenEl.hidden = true;
    if (frozen) document.body.classList.add("entered");               // stills / tests skip the connect step
    if (deep && !frozen) {                                            // deep link: the story counts as seen
      gates.skipAll(); document.body.classList.add("entered");
      // the browser jumps to the anchor before this runs, so a "press and hold"
      // hint can already be queued from that first scroll. Clear it, otherwise it
      // floats over the editorial page for four seconds on every deep link.
      const pill = document.querySelector(".cursor-hint");
      if (pill) { pill.classList.remove("show", "stay"); pill.textContent = ""; }
      document.getElementById("os")?.classList.remove("nudge");
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "auto" });
    }
  }, 450);
  if (params.has("debug")) {           // ?debug&pick=x,y → name of the object under that pixel (for fixing stray highlights)
    const [px, py] = (params.get("pick") || "720,725").split(",").map(Number);
    updateCamera(progress);
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1)), camera);
    const hit = rc.intersectObjects(scene.children, true)[0];
    const em = []; scene.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.emissive.getHex() && o.material.emissiveIntensity) em.push(o.name + ":" + o.material.name + ":" + o.material.emissive.getHexString()); });
    const ls = []; scene.traverse((o) => { if (o.isLight) ls.push(o.type + "@" + o.position.toArray().map((x) => x.toFixed(2)).join(",")); });
    document.title = "PICK " + (hit ? hit.object.name + " | " + hit.object.material.name + " | d=" + hit.distance.toFixed(2) : "none") + " || EMISSIVE " + em.join(" ; ") + " || LIGHTS " + ls.join(" ; ");
  }
  if (params.has("bench")) {             // ?bench → average GPU-bound frame time + draw calls in the tab title
    const gl = renderer.getContext(); updateCamera(progress); composer.render(0); gl.finish();
    const n = 40, t0 = performance.now();
    for (let i = 0; i < n; i++) { composer.render(0.016); gl.finish(); }
    const ms = (performance.now() - t0) / n;
    renderer.info.autoReset = false; renderer.info.reset(); renderer.render(scene, camera);
    document.title = `BENCH ${ms.toFixed(1)}ms calls=${renderer.info.render.calls} tris=${renderer.info.render.triangles} dpr=${DPR}`;
    renderer.info.autoReset = true;
  }
  requestAnimationFrame(frame);
}, (e) => { if (e.total) loaded = Math.min(95, Math.round(e.loaded / e.total * 95)); },
(err) => { $("loader-status").dataset.error = "1"; $("loader-status").textContent = L("Не вдалося завантажити 3D. Онови сторінку.", "Couldn’t load the 3D room. Please refresh the page."); console.error(err); });
