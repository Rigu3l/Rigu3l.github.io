# Rj Verceles — Interactive 3D Story & Portfolio

Full Stack Developer & Web Designer from Zambales, Philippines.
> *"It all starts with curiosity. I don't decorate — I solve the task: so people notice it, and so it works."*

---

## Architecture Overview

This project combines **Part 1 (The 3D Room & Scroll Story)** and **Part 2 (The Editorial Page Sheet, Works Tunnel, 3D Phone & Brief Form)** into a single Vite + Three.js application.

### Part 1 — The 3D Room & Scroll Story (`920vh` track)
- **`src/main.js`**: Master Three.js render loop, adaptive quality controller (`?q=0|1|2`, `?dpr=`), post-processing (`GTAOPass`, `UnrealBloomPass`, custom `FilmShader`), and cross-module exports (`warm`, `setBarColor`, `sfx`, `riser`, `startMusic`).
- **`src/timeline.js`**: Deterministic scroll math, 10-chapter timeline (`920vh`), scroll-gating at 4 interactive OS gates, and the 5-stage old-to-modern PC transition (`POWER-DOWN` -> `RETIRE` -> `BLANK BEAT` -> `ARRIVE` -> `BOOT`).
- **`src/room.js` & `src/cardboard.js`**: Procedural 3D studio desk (retro CRT & lamp morphing into modern widescreen monitor, LED bar, and neon logo) with custom corrugated-cardboard `onBeforeCompile` shader and dithered pixel dissolve.
- **`src/crt-screen.js` & `src/connect-screen.js`**: Curvature/scanline/phosphor CRT shader with tube collapse & afterglow, plus the interactive opening `Connect` screen.
- **`src/os.js` & `src/html-text.js`**: Monitor-projected interactive OS layer (Hold-to-Transform button with 3 skin states, Statement card, Error/Fix sequence, Calm Shipped window) and wall-projected 3D typography.
- **`src/music.js`**: Web Audio API procedural ambient soundtrack and synthesized sound effects (`powerdown`, `whoosh`, `boot`, `click`, `success`, `error`).

### Part 2 — The Page Sheet (`#content`)
- **`src/content.js`**:
  - **Reveal Engine**: Word-split blur reveal (`[data-reveal="words"]`), fade-up blocks (`[data-reveal="fade"]`), 1.6s eased counters (`[data-count]`), and scroll-driven kinetic drifting lines.
  - **Numbers Band (`#numbers`)**: `300vh` section with `100vh` sticky stage (`OPEN` clip-path -> `RUN` horizontal stat cards -> `FADE`), header `.on-color` toggle, and `setBarColor`.
  - **Contact & Brief Form (`#contact`)**: Hover-fill contact links (`rjverceles1@gmail.com` with Copy Email button, GitHub, Portfolio), fit-lines dynamic input font scaling, inline EN/FIL validation, and `POST /api/brief` with automatic `mailto:rjverceles1@gmail.com` fallback.
  - **Footer Word (`#footer`)**: Full-width `RJ VERCLES` display word with per-character inline SVG `feTurbulence` + `feDisplacementMap` warp driven by pointer proximity.
- **`src/mesh.js`**: Lazy `1/3`-resolution WebGL mesh-gradient shader (5 Lissajous palette blobs, 2-pass domain warping, Bayer 4x4 ordered dither, CSS radial-gradient fallback).
- **`src/works.js`**: `500vh` pinned 3D Works Tunnel placing all 6 projects along a Z-axis spiral/helix with rounded-corner alpha masks, procedural Fraunces-style cover textures, station stops, velocity zoom-blur + chromatic split, circular clip-path open/close, bottom-left HUD, dot nav, and `"View as list"` grid toggle.
- **`src/ig-phone.js`**: Lazy 3D Phone section (`ExtrudeGeometry` beveled metallic frame, `540x1170` 30fps scrolling studio feed of Rj's 7 posts, 4 floating post cards, pointer spring tilt / touch scroll sweep).
- **`src/cursor.js`**: `96x96` 3D voxel cursor (`InstancedMesh` of 26 cubes morphing across `default`, `link`, `drag`, `view`, and `text` states, with 300ms idle sleep) reconciled with `#cursor-pill`.
- **`src/lang.js`**: Instant English (`en`) and Filipino (`fil`) localization without page reload.

---

## Query Parameters for Testing & Inspection

| Parameter | Description |
| :--- | :--- |
| `?nostory` | Skips the 3D room story, jumps directly to `#content`, and defaults Works to list view |
| `?motion=reduce` | Forces reduced-motion mode (disables heavy transforms, defaults Works to list view, static mesh gradient) |
| `?mod=0..1` | Freezes the Part 1 old-to-modern PC transition at a specific `mod` value |
| `?v=0..920` | Freezes Part 1 story scroll at a specific `vh` position |
| `?q=0\|1\|2` | Forces rendering quality tier (`0` = low, `1` = medium, `2` = high) |
| `?debug` | Logs WebGL capabilities, unmasked renderer, and shader diagnostics |

---

## Development & Build Commands

```bash
# Install dependencies
npm install

# Start Vite development server on port 3000
npm run dev

# Run unit tests (Part 1 timeline + Part 2 pure logic)
npx tsx --test src/timeline.test.js src/part2.test.js

# Build production bundle to dist/
npm run build

# Preview production build
npm run preview
```
