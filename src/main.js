/**
 * Main Boot Orchestrator — Riguel Aleje Portfolio
 * Boot order:
 * 1. Import modular CSS architecture
 * 2. Prepare Hero split characters + initialize Smooth Scroll (Lenis + ScrollTrigger)
 * 3. Initialize Preloader & Enter Gate (locks scroll until user enters)
 * 4. Initialize Sound, Cursor, Nav, Hero WebGL, About, Marquee, Work, Skills, Footer, Pong
 * 5. Refresh ScrollTrigger after fonts/images settle
 */

import './styles/base.css';
import './styles/typography.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { initSound } from './js/sound.js';
import { initSmoothScroll } from './js/smooth-scroll.js';
import { initCursor } from './js/cursor.js';
import { initNav } from './js/nav.js';
import { prepareHero, playHeroIntro, initHero } from './js/hero.js';
import { initPreloader } from './js/preloader.js';
import { initAbout } from './js/about.js';
import { initMarquee } from './js/marquee.js';
import { initWork } from './js/work.js';
import { initSkills } from './js/skills.js';
import { initFooter } from './js/footer.js';
import { initPong } from './js/pong.js';

gsap.registerPlugin(ScrollTrigger);

function boot() {
  initSound();
  initSmoothScroll();
  initCursor();
  initNav();

  prepareHero();
  initHero();
  initAbout();
  initMarquee();
  initWork();
  initSkills();
  initFooter();
  initPong();

  initPreloader(() => {
    playHeroIntro();
    ScrollTrigger.refresh();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
