// Pixel cursor in 3D: the classic Windows arrow / link hand built from voxels, tilting with mouse speed.
// Desktop (fine pointer) only. Outline colour #051727, fill warm white.
import * as THREE from "three";

const finePointer = matchMedia("(pointer: fine)").matches;
const params = new URLSearchParams(location.search);
const reduce = params.get("motion") === "reduce";                     // full motion by default, like the rest of the site

// X = outline, . = empty or fill (fill = whatever the outside flood-fill can't reach)
const SHAPES = {
  arrow: { hot: [0, 0], rows: [
    "X...........",
    "XX..........",
    "X.X.........",
    "X..X........",
    "X...X.......",
    "X....X......",
    "X.....X.....",
    "X......X....",
    "X.......X...",
    "X........X..",
    "X.........X.",
    "X......XXXXX",
    "X...X..X....",
    "X..XX..X....",
    "X.X..X..X...",
    "XX...X..X...",
    "X.....X..X..",
    "......X..X..",
    ".......XX...",
  ] },
  hand: { hot: [4.5, 0], rows: [
    "....XX..........",
    "...X..X.........",
    "...X..X.........",
    "...X..X.........",
    "...X..XXX.......",
    "...X..X..XXX....",
    "...X..X..X..XX..",
    "...X..X..X..X.X.",
    "XXXX..X..X..X..X",
    "X..X...........X",
    "X..X...........X",
    ".X.............X",
    "..X............X",
    "..X...........X.",
    "...X..........X.",
    "...X.........X..",
    "....X........X..",
    "....X........X..",
    "....XXXXXXXXXX..",
  ] },
};

function cells(rows) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const g = rows.map((r) => r.padEnd(w, ".").split(""));
  const outside = g.map((r) => r.map(() => false));
  const stack = [];
  for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h || outside[y][x] || g[y][x] === "X") continue;
    outside[y][x] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  const ink = [], fill = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] === "X") ink.push([x, y]); else if (!outside[y][x]) fill.push([x, y]);
  }
  return { ink, fill };
}

if (finePointer) {
  const PX = 2.8;                       // screen pixels per voxel
  const SIZE = 128, HOT = 36;           // canvas size, where the hotspot sits inside it (css px)
  const canvas = document.createElement("canvas");
  canvas.className = "cursor-3d"; canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  document.documentElement.classList.add("has-3d-cursor");

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(SIZE, SIZE, false);
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const half = SIZE / PX / 2;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, -50, 50);
  scene.add(new THREE.AmbientLight("#ffffff", 1.6));
  const key = new THREE.DirectionalLight("#fff3e2", 2.4); key.position.set(-4, 6, 9); scene.add(key);
  const rim = new THREE.DirectionalLight("#8fb0ff", 1.4); rim.position.set(6, -3, 2); scene.add(rim);   // lights the side walls of the voxels

  const box = new THREE.BoxGeometry(1, 1, 1);
  const inkMat = new THREE.MeshStandardMaterial({ color: "#051727", roughness: 0.4, metalness: 0.1 });
  const fillMat = new THREE.MeshStandardMaterial({ color: "#f6f1e7", roughness: 0.45 });
  const pivot = new THREE.Group(); scene.add(pivot);

  const models = {};
  for (const [name, s] of Object.entries(SHAPES)) {
    const { ink, fill } = cells(s.rows);
    const g = new THREE.Group();
    const add = (list, mat, depth, z) => {
      const m = new THREE.InstancedMesh(box, mat, list.length);
      const o = new THREE.Object3D();
      list.forEach(([x, y], i) => {
        o.position.set(x - s.hot[0] + 0.5, -(y - s.hot[1]) - 0.5, z);
        o.scale.set(1, 1, depth); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      });
      g.add(m);
    };
    add(ink, inkMat, 3.2, 0);            // outline stands proud
    add(fill, fillMat, 1.4, -0.4);       // fill sits recessed so the outline reads as raised pixel walls
    g.visible = false;
    pivot.add(g); models[name] = g;
  }
  // the hotspot sits at canvas point (HOT, HOT)
  const offset = (SIZE / 2 - HOT) / PX;
  pivot.position.set(-offset, offset, 0);

  let shape = "arrow"; models.arrow.visible = true;
  let x = -200, y = -200, px = x, py = y, vx = 0, vy = 0, tiltX = 0, tiltY = 0, press = 1, pop = 1, shown = false;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    if (!shown) { px = x; py = y; shown = true; canvas.style.opacity = "1"; }
    const hc = document.documentElement.classList;                  // the plug on the old PC's screen also shows the hand
    const want = (e.target.closest && e.target.closest("a, button, [role=button], label, select")) || hc.contains("hand") || hc.contains("grab") ? "hand" : "arrow";
    if (want !== shape) { models[shape].visible = false; shape = want; models[shape].visible = true; pop = 0.75; }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { canvas.style.opacity = "0"; shown = false; });
  if (params.get("cursor")) {            // stills: ?cursor=arrow|hand&cx=..&cy=..
    x = px = Number(params.get("cx") || 400); y = py = Number(params.get("cy") || 300); shown = true; canvas.style.opacity = "1";
    models.arrow.visible = false; shape = params.get("cursor"); models[shape].visible = true;
  }
  addEventListener("pointerdown", () => (press = 0.8));
  addEventListener("pointerup", () => (press = 1));

  let last = performance.now(), lastSig = "";
  (function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    vx += ((x - px) / Math.max(dt, 1e-3) - vx) * 0.25; vy += ((y - py) / Math.max(dt, 1e-3) - vy) * 0.25;
    px = x; py = y;
    const k = reduce ? 0 : 1;
    const tx = THREE.MathUtils.clamp(vy * 0.0009, -0.7, 0.7) * k + 0.3;   // resting pose shows the extrusion
    const ty = THREE.MathUtils.clamp(vx * 0.0011, -0.8, 0.8) * k - 0.36;
    tiltX += (tx - tiltX) * (1 - Math.exp(-dt * 12)); tiltY += (ty - tiltY) * (1 - Math.exp(-dt * 12));
    pivot.rotation.set(tiltX, tiltY, 0);
    pop += (1 - pop) * (1 - Math.exp(-dt * 14));
    const s = pop * (press < 1 ? 0.88 : 1);
    pivot.scale.setScalar(s);
    canvas.style.transform = `translate3d(${x - HOT}px, ${y - HOT}px, 0)`;
    // re-render the voxels only while they move (tilt / pop / press settle)
    const sig = `${tiltX.toFixed(3)}|${tiltY.toFixed(3)}|${s.toFixed(3)}|${shape}`;
    if (sig !== lastSig) { renderer.render(scene, cam); lastSig = sig; }
    requestAnimationFrame(tick);
  })(last);
}
