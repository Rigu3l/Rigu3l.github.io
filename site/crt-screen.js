// The monitor's picture: Vova's Figma frame (1350×1080, "Frame 2085661737") drawn to a canvas and shown
// on the curved CRT glass through a tube shader — barrel bulge, scanlines, aperture grille, glow, flicker.
import * as THREE from "three";

const W = 1440, H = 1080;            // 4:3 glass; the 1350-wide Figma frame sits centred, navy fills the sides
const FX = (W - 1350) / 2;            // frame offset

async function loadFonts() {
  const faces = [
    new FontFace("Coolvetica HC", "url(assets/fonts/coolvetica-heavy-compressed.otf)"),
    new FontFace("Inter", "url(assets/fonts/inter/inter-latin-wght-normal.woff2)", { weight: "100 900", unicodeRange: "U+0000-00FF,U+2000-206F" }),
    new FontFace("Inter", "url(assets/fonts/inter/inter-cyrillic-wght-normal.woff2)", { weight: "100 900", unicodeRange: "U+0400-045F,U+0490-0491" }),
  ];
  await Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff)).catch(() => {})));
}
function loadImage(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
// Figma "text radial light blue": radial-gradient(76.42% 95.44% at 0% 100%, #FFF 0%, #D0E8FF 100%) of the box
function lightBlue(g, x, y, w, h) {
  const r = Math.hypot(w * 0.7642, h * 0.9544);
  const grad = g.createRadialGradient(x, y + h, 0, x, y + h, r);
  grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#d0e8ff");
  return grad;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export async function makeScreenTexture() {
  await loadFonts();
  const logo = await loadImage("assets/rj-logo.png");
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  // dark bg
  g.fillStyle = "#051727"; g.fillRect(0, 0, W, H);
  // лого пнг 1: 1872×1221, centred, 70.5 up, 6%
  if (logo) {
    g.globalAlpha = 0.06;
    g.drawImage(logo, FX + 675 - 936, 540 - 610.5 - 70.5, 1872, 1221);
    g.globalAlpha = 1;
  }
  // pill: glass ring (white 20%) → blue #0A8CFF → text "Все почалось". The pill is sized to its text (40 px each side,
  // as in Figma) so a wider font can never touch the edge; the Figma cursor (Vector 264) hangs off its bottom-right corner.
  g.font = '400 56px "Inter", "Segoe UI", sans-serif'; g.textBaseline = "alphabetic";
  const label = L("Все почалось", "It all started"), tw = g.measureText(label).width;
  const px = FX + 136, py = 239, pw = Math.round(tw + 80 + 20), ph = 107;
  g.save();
  roundRect(g, px, py, pw, ph, 53.5); g.fillStyle = "rgba(255,255,255,0.2)"; g.fill();
  roundRect(g, px, py, pw, ph, 53.5); g.clip();
  g.filter = "blur(50px)";                                   // Ellipse 11902 — soft highlight inside the ring
  g.translate(px + 140 + 136, py + 36 + 24); g.rotate(Math.PI / 6);
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, 0, 136, 24, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  g.save();
  roundRect(g, px + 10, py + 10, pw - 20, ph - 20, 43.5); g.fillStyle = "#0a8cff"; g.fill();
  // Figma "Vector 264" (copied as SVG, rotation baked in): a soft cursor arrow, 51×58, 44 px in from the pill's right edge
  g.translate(px + pw - 44, py + ph - 16);
  g.fill(new Path2D("M27.273 14.1682L39.1435 1.64618C42.3318 -1.71704 47.9959 0.400831 48.1955 5.03079L50.2233 52.0775C50.406 56.3171 45.7429 59.0094 42.1627 56.7313L2.43289 31.4518C-1.47698 28.964 -0.47904 22.9998 4.02773 21.9203L20.8074 17.9011C23.2786 17.3092 25.5247 16.0124 27.273 14.1682Z"));
  g.restore();
  g.fillStyle = lightBlue(g, px + 50, py + 34, tw, 39);
  g.fillText(label, px + 10 + 40, py + 10 + 24 + 41);
  // з бажання / вивчати нове — Coolvetica Heavy Compressed 300px, line-height 86%, uppercase, cap-trimmed box at (136, 385)
  g.font = '850 300px "Coolvetica HC", "Arial Narrow", sans-serif';
  const tx = FX + 136, ty = 385, lh = 258;
  g.fillStyle = lightBlue(g, tx, ty, 911, 457);
  const cap = 0.72 * 300;                                    // cap height of Coolvetica ≈ 0.72em
  const maxW = g.measureText("ВИВЧАТИ НОВЕ").width;               // the Figma block width: other languages fit inside it
  [L("З БАЖАННЯ", "WITH A HUNGER"), L("ВИВЧАТИ НОВЕ", "TO LEARN")].forEach((t, i) => {
    const k = Math.min(1, maxW / g.measureText(t).width);
    g.save(); g.translate(tx, ty + cap + lh * i); g.scale(k, k); g.fillText(t, 0, 0); g.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 8;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function makeCrtMaterial(map) {
  return new THREE.ShaderMaterial({
    toneMapped: false, fog: false,
    uniforms: { map: { value: map }, time: { value: 0 }, power: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `
      uniform sampler2D map; uniform float time, power; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        vec2 c = vUv - .5;
        vec2 uv = .5 + c * (1. + .09 * dot(c, c) * 4.) * .94;            // convex tube: picture bulges towards the viewer
        if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) { gl_FragColor = vec4(0.,0.,0.,1.); return; }
        vec3 col = texture2D(map, uv).rgb;
        // light scanlines — faded out when the screen is drawn too small to show 540 lines (phones): otherwise they alias
        // into broad moving stripes
        float lines = fwidth(uv.y) * 1080.;
        col *= 1. - .1 * (.5 - .5 * cos(uv.y * 1080. * 3.14159)) * (1. - smoothstep(.5, 1., lines));
        col *= mix(.55, 1., smoothstep(.75, .3, length(c * vec2(1., 1.15))));   // soft dark corners
        gl_FragColor = vec4(col * power, 1.);
      }`,
  });
}

export function makeModernScreenTexture() {
  const W2 = 1600, H2 = 900, c = document.createElement("canvas"); c.width = W2; c.height = H2;
  const g = c.getContext("2d");
  const bg = g.createRadialGradient(W2 * .5, H2 * 1.1, 0, W2 * .5, H2 * 1.1, W2 * .9);
  bg.addColorStop(0, "#0a8cff"); bg.addColorStop(.45, "#0a3f7a"); bg.addColorStop(1, "#051727");
  g.fillStyle = bg; g.fillRect(0, 0, W2, H2);
  g.globalAlpha = .08; g.fillStyle = "#fff";
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(W2 * .5, H2 * 1.25, W2 * (.35 + i * .12), H2 * (.55 + i * .1), 0, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = "#fff"; g.stroke(); }
  g.globalAlpha = 1;
  const img = new Image(); img.src = "assets/rj-logo.png";
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  img.onload = () => { const w = 360, h = w * img.height / img.width; g.globalAlpha = .9; g.drawImage(img, (W2 - w) / 2, (H2 - h) / 2 - 20, w, h); g.globalAlpha = 1; tex.needsUpdate = true; };
  // dock-like strip
  g.fillStyle = "rgba(255,255,255,.12)"; const dw = 420, dh = 58; g.beginPath(); g.roundRect((W2 - dw) / 2, H2 - dh - 22, dw, dh, 18); g.fill();
  for (let i = 0; i < 6; i++) { g.fillStyle = ["#0a8cff", "#d0e8ff", "#ffffff", "#5fb6ff", "#b9c6ff", "#ffffff"][i]; g.beginPath(); g.roundRect((W2 - dw) / 2 + 22 + i * 66, H2 - dh - 12, 38, 38, 10); g.fill(); }
  return tex;
}
