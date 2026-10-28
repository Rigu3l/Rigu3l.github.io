/**
 * Preloader + Enter Gate
 * - Tracks real font & image asset readiness with a minimum 1.2s duration
 * - Rotating witty status text from CONTENT.preloader.statusLines
 * - Resolves into "Enter Studio" button + Sound On/Off opt-in
 * - Skips on repeat visits within the same session (sessionStorage)
 * - Respects prefers-reduced-motion with a clean fade
 */

import gsap from 'gsap';
import { CONTENT } from '../content.js';
import { lockScroll, unlockScroll } from './smooth-scroll.js';
import { setSoundEnabled, isSoundEnabled, playClickSound } from './sound.js';
import { prefersReducedMotion, MOTION } from './utils.js';

const SESSION_KEY = 'riguel_portfolio_preloader_seen';

export function initPreloader(onComplete) {
  const preloaderEl = document.getElementById('preloader');
  const counterEl = document.getElementById('preloader-counter');
  const barFillEl = document.getElementById('preloader-bar-fill');
  const statusEl = document.getElementById('preloader-status');
  const gateEl = document.getElementById('preloader-gate');
  const enterBtn = document.getElementById('btn-enter-studio');
  const soundOptBtn = document.getElementById('btn-preloader-sound');

  if (!preloaderEl || !counterEl || !barFillEl || !statusEl || !gateEl || !enterBtn) {
    if (onComplete) onComplete();
    return;
  }

  const reduced = prefersReducedMotion();
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {}

  // Fast path for repeat session visit or reduced motion
  if (alreadySeen || reduced) {
    counterEl.textContent = '100';
    gsap.set(barFillEl, { scaleX: 1 });
    gsap.to(preloaderEl, {
      opacity: 0,
      duration: reduced ? 0.15 : 0.45,
      ease: 'power2.out',
      onComplete: () => {
        preloaderEl.classList.add('is-hidden');
        unlockScroll();
        if (onComplete) onComplete();
      },
    });
    return;
  }

  lockScroll();

  // Default opt-in state on preloader sound button: let user toggle Sound On/Off before entering
  let optInSound = true;
  if (soundOptBtn) {
    soundOptBtn.setAttribute('aria-pressed', 'true');
    soundOptBtn.textContent = 'Sound: On (Recommended)';
    soundOptBtn.addEventListener('click', () => {
      optInSound = !optInSound;
      soundOptBtn.setAttribute('aria-pressed', String(optInSound));
      soundOptBtn.textContent = optInSound ? 'Sound: On (Recommended)' : 'Sound: Off';
    });
  }

  // Rotate witty status lines
  const lines = CONTENT.preloader.statusLines;
  let lineIdx = 0;
  statusEl.textContent = lines[0];
  const statusInterval = window.setInterval(() => {
    lineIdx = (lineIdx + 1) % lines.length;
    statusEl.textContent = lines[lineIdx];
  }, 340);

  // Track real assets (fonts + hero/work SVG images) + minimum 1200ms timer
  const minTimePromise = new Promise((resolve) => window.setTimeout(resolve, 1200));
  const fontsPromise =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  const imageUrls = CONTENT.projects.map((p) => p.image);
  const imagesPromise = Promise.all(
    imageUrls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );

  const progressState = { value: 0 };
  const counterTween = gsap.to(progressState, {
    value: 92,
    duration: 1.15,
    ease: 'power2.out',
    onUpdate: () => {
      const rounded = Math.round(progressState.value);
      counterEl.textContent = String(rounded).padStart(2, '0');
      gsap.set(barFillEl, { scaleX: progressState.value / 100 });
    },
  });

  Promise.all([minTimePromise, fontsPromise, imagesPromise]).then(() => {
    counterTween.kill();
    gsap.to(progressState, {
      value: 100,
      duration: 0.25,
      ease: 'power2.out',
      onUpdate: () => {
        const rounded = Math.round(progressState.value);
        counterEl.textContent = String(rounded).padStart(2, '0');
        gsap.set(barFillEl, { scaleX: progressState.value / 100 });
      },
      onComplete: () => {
        window.clearInterval(statusInterval);
        statusEl.textContent = 'All systems nominal · Ready in Olongapo City (GMT+8)';
        gateEl.classList.add('is-ready');
        enterBtn.focus();
      },
    });
  });

  const handleEnter = () => {
    enterBtn.removeEventListener('click', handleEnter);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {}

    setSoundEnabled(optInSound, true);
    if (isSoundEnabled()) {
      playClickSound();
    }

    const tl = gsap.timeline({
      onComplete: () => {
        preloaderEl.classList.add('is-hidden');
        unlockScroll();
        if (onComplete) onComplete();
      },
    });

    tl.to(gateEl, {
      opacity: 0,
      y: -10,
      duration: 0.25,
      ease: 'power2.in',
    }).to(
      preloaderEl,
      {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.85,
        ease: MOTION.EASE_OUT_EXPO,
      },
      '-=0.05'
    );
  };

  enterBtn.addEventListener('click', handleEnter);
}
