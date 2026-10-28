/**
 * Hero Section Controller
 * - Splits hero role headline into accessible character spans and reveals on enter
 * - Initializes the Three.js WebGL orbital gyroscope scene
 * - Animates metadata strip values on load
 * - Pins/parallaxes hero subtly as the About section slides over it
 * - Drives the cursor-following companion bot eyes + witty click status
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitIntoChars, animateCharsIn } from './text-split.js';
import { initHeroScene } from './webgl/scene.js';
import { prefersReducedMotion, MOTION } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

let heroChars = [];

export function prepareHero() {
  const headlineEl = document.getElementById('hero-headline');
  if (headlineEl) {
    heroChars = splitIntoChars(headlineEl);
    if (heroChars.length && !prefersReducedMotion()) {
      gsap.set(heroChars, { yPercent: 110, opacity: 0 });
    }
  }
}

export function playHeroIntro() {
  const reduced = prefersReducedMotion();
  const sublineEl = document.getElementById('hero-subline');
  const actionsEl = document.getElementById('hero-actions');
  const metaItems = document.querySelectorAll('.hero-meta-strip .meta-item');

  if (reduced) return;

  if (heroChars.length) {
    animateCharsIn(heroChars, { duration: 0.75, stagger: 0.02 });
  }

  const tl = gsap.timeline({ delay: 0.15 });
  if (sublineEl) {
    tl.fromTo(
      sublineEl,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: MOTION.DURATION_BASE, ease: MOTION.EASE_OUT_EXPO }
    );
  }
  if (actionsEl) {
    tl.fromTo(
      actionsEl,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: MOTION.DURATION_BASE, ease: MOTION.EASE_OUT_EXPO },
      '-=0.45'
    );
  }
  if (metaItems.length) {
    tl.fromTo(
      metaItems,
      { y: 16, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.55,
        stagger: 0.07,
        ease: MOTION.EASE_OUT_EXPO,
      },
      '-=0.4'
    );
  }
}

export function initHero() {
  const mountEl = document.getElementById('hero-webgl-mount');
  const cleanupWebGL = initHeroScene(mountEl);

  const heroSection = document.getElementById('hero');
  const heroInner = document.getElementById('hero-inner');

  if (heroSection && heroInner && !prefersReducedMotion()) {
    gsap.to(heroInner, {
      yPercent: 12,
      scale: 0.97,
      opacity: 0.35,
      ease: 'none',
      scrollTrigger: {
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // Interactive Companion Bot that tracks cursor and cycles witty dry remarks when poked
  const botEl = document.getElementById('companion-bot');
  const botStatusEl = document.getElementById('companion-bot-status');
  const eyes = document.querySelectorAll('.companion-bot__eye');

  const remarks = [
    'Hover or poke the orbital core. It judges unindexed SQL queries.',
    'Status: 0 merge conflicts in the last 14 minutes.',
    'Checked MySQL EXPLAIN plan: using index. We can sleep tonight.',
    'React + Angular + PHP in one portfolio? Peace treaties were signed.',
  ];
  let remarkIdx = 0;

  if (botEl && botStatusEl) {
    botEl.addEventListener('click', () => {
      remarkIdx = (remarkIdx + 1) % remarks.length;
      botStatusEl.textContent = remarks[remarkIdx];
    });
  }

  if (eyes.length && !prefersReducedMotion()) {
    window.addEventListener(
      'pointermove',
      (e) => {
        eyes.forEach((eye) => {
          const rect = eye.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
          const dist = Math.min(3.5, Math.hypot(e.clientX - cx, e.clientY - cy) / 40);
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          /** @type {HTMLElement} */ (eye).style.transform = `translate3d(${tx.toFixed(
            1
          )}px, ${ty.toFixed(1)}px, 0)`;
        });
      },
      { passive: true }
    );
  }

  return () => {
    cleanupWebGL();
  };
}
