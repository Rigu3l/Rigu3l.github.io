# Riguel Aleje — Full Stack Developer Portfolio

An award-style, scroll-driven personal portfolio for **Riguel Aleje** (Full Stack Developer based in Olongapo City, Zambales, Philippines). Engineered with vanilla ES modules, custom CSS properties & fluid `clamp()` typography, **GSAP + ScrollTrigger**, **Lenis** smooth scrolling, **Three.js** WebGL, and procedural **Web Audio API** sound design.

---

## 1. Quick Start & Commands

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle into /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 2. Architecture & File Structure

```text
/
├── index.html                  # Semantic HTML, SEO/OG tags, JSON-LD Person schema, font preloads
├── package.json                # Scripts & dependencies (gsap, lenis, three, vite)
├── vite.config.ts              # Vite bundler config
├── public/
│   ├── favicon.svg             # Vector monogram favicon
│   ├── og.svg                  # OpenGraph social preview card
│   ├── portfolio.zip           # Downloadable project archive (excluding node_modules)
│   └── images/
│       ├── work-01.svg         # Ch 01: Subic Vessel Telemetry cover artwork
│       ├── work-02.svg         # Ch 02: KapeZambales ERP & POS cover artwork
│       ├── work-03.svg         # Ch 03: Luzon Grid Telemetry cover artwork
│       ├── work-04.svg         # Ch 04: Obra Publishing Engine cover artwork
│       └── work-05.svg         # Ch 05: Talon Ledger & Payroll cover artwork
└── src/
    ├── main.js                 # Boot sequence: sound -> smooth scroll -> sections -> preloader gate
    ├── content.js              # Single source of truth for bio, projects, stats, skills, socials
    ├── styles/
    │   ├── base.css            # 60-30-10 color tokens, dark/light themes, reset, film grain
    │   ├── typography.css      # Fluid clamp() type scale, tabular-nums, split-text & text-roll
    │   ├── layout.css          # 3-zone Top Bar Contract, 2-col hero split, pinned work stage
    │   ├── components.css      # Preloader, custom cursor, 3D HUD dock, Pong modal, lightbox
    │   └── animations.css      # @supports(animation-timeline: scroll()) & prefers-reduced-motion
    └── js/
        ├── preloader.js        # Real asset counter (00->100), witty status lines, enter gate
        ├── smooth-scroll.js    # Lenis + GSAP ScrollTrigger sync, scroll lock/unlock
        ├── cursor.js           # Desktop fine-pointer lerp ring cursor with contextual labels
        ├── nav.js              # 3-zone header hide/show, active section tracker, theme toggle, Easter egg
        ├── hero.js             # Hero character reveal, parallax, companion bot
        ├── webgl/
        │   └── scene.js        # Three.js 7-part Orbital Gyroscope, RoomEnvironment, software-GL guard
        ├── text-split.js       # Accessible char/word splitter (aria-label on parent, aria-hidden spans)
        ├── about.js            # Scroll-scrubbed bio opacity + count-up stats strip
        ├── marquee.js          # Scroll-velocity-reactive looping marquee with dynamic skew
        ├── work.js             # Pinned scrubbed chapter showcase, keyboard/drag/arrow sync, lightbox
        ├── skills.js           # Scroll-driven sticky stacking capability cards
        ├── footer.js           # Live Olongapo City (GMT+8) clock, magnetic CTA, copy-email fallback
        ├── pong.js             # Full-screen HTML5 Canvas Pong mini-game with AI opponent
        ├── sound.js            # Zero-dependency Web Audio API synthesizer (ticks, whooshes, drone)
        └── utils.js            # Shared motion tokens, lerp/clamp, reduced-motion helpers
```

---

## 3. How to Edit Content (`src/content.js`) & Swap Media

1. **Text, Bio, Stats, and Projects**:
   Open `src/content.js` to update your bio paragraph, stats strip numbers, project chapters (`CONTENT.projects`), capabilities (`CONTENT.skills`), email address, or social handles.
2. **Swapping Project Images / Videos**:
   - Place new `.webp`, `.avif`, or `.svg` cover assets inside `public/images/`.
   - Update the `image` path in `src/content.js` and the matching `<img src="/images/..." />` slides in `index.html`.
   - Always keep `width="1600" height="1000"` on `<img>` elements to guarantee zero Cumulative Layout Shift (`CLS = 0.00`).
3. **Customizing Sound Design (`src/js/sound.js`)**:
   - All UI sounds (hover tick, click, chapter transition whoosh, Pong blips, and ambient studio drone) are synthesized in real time via the browser's native Web Audio API in `src/js/sound.js`. No external `.mp3` files are required, eliminating audio network requests.

---

## 4. Deployment Steps

- **Vercel / Netlify**:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Node version: `20.x` or higher
- **GitHub Pages**:
  - Run `npm run build` and deploy the `dist/` folder via `gh-pages` or GitHub Actions (`actions/deploy-pages`).

---

## 5. Performance & Accessibility Notes

- **Compositor-Only Motion**: Animations strictly target `transform`, `opacity`, and `clip-path`.
- **WebGL Guard**: `src/js/webgl/scene.js` detects software renderers (`SwiftShader`, `llvmpipe`) and caps `devicePixelRatio`, pauses rendering via `IntersectionObserver` when scrolled off-screen or when the browser tab is hidden, and disposes all geometries/materials/textures on cleanup.
- **`prefers-reduced-motion`**: Automatically disables Lenis smooth-scroll hijacking, pinning, character split animations, WebGL continuous motion, and marquee movement so all content is immediately readable.
- **Screen-Reader Integrity**: `splitIntoChars` and `splitIntoWords` preserve `aria-label` on the parent heading/paragraph and mark split `<span>` nodes `aria-hidden="true"`.

---

## 6. Manual Test Checklist

- [x] **Preloader & Enter Gate**: Counts `00 -> 100`, rotates status lines, unlocks audio & scroll on click, skips on repeat session reload.
- [x] **Smooth Scroll & Progress Bar**: Lenis synced with ScrollTrigger; top progress bar scales `0 -> 1`.
- [x] **Hero & 3D Core**: Character reveal, collapsible bottom HUD (`Explode` slider + `Obsidian / Titanium / Copper` finishes), companion bot tracks cursor.
- [x] **About & Marquee**: Bio words illuminate on scroll scrub; stats count up on enter; marquee reacts to scroll velocity.
- [x] **Selected Work (Pinned Chapters)**: Scrubs `01 -> 05` on desktop scroll; syncs with `01..05` buttons, `←`/`→` buttons, keyboard arrows, and drag/swipe; degrades to vertical card stack on mobile (`<= 768px`).
- [x] **Footer**: Live Olongapo City (`GMT+8`) clock ticks every second; magnetic CTA follows pointer; `Copy Email` copies to clipboard and displays `Copied` for 1.5s.
- [x] **Pong Mini-Game & Easter Egg**: Opens full-screen Pong overlay (`ESC` to close); clicking `Riguel Aleje` wordmark 5 times (or Konami code) triggers Overclock Easter Egg.
