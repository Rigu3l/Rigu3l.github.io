/**
 * Fixed Minimal Navigation + ScrollTrigger Active Section Indicator + Theme Toggle
 * Hides on scroll down, reveals on scroll up.
 * Includes Easter Egg (clicking wordmark 5 times or Konami Code triggers studio glitch).
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToTarget } from './smooth-scroll.js';
import { playClickSound } from './sound.js';

gsap.registerPlugin(ScrollTrigger);

const THEME_STORAGE_KEY = 'riguel_portfolio_theme';

export function initNav() {
  const header = document.getElementById('site-header');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const brandLink = document.getElementById('brand-wordmark');
  const sectionReadout = document.getElementById('active-section-readout');

  // Initialize saved theme (dark by default)
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  } catch {}

  syncThemeButtons();

  // Hide on scroll down, show on scroll up
  let lastScrollY = window.scrollY;
  const onScroll = () => {
    const currentY = window.scrollY;
    if (!header) return;
    if (currentY > 140 && currentY > lastScrollY + 6) {
      header.classList.add('is-hidden');
    } else if (currentY < lastScrollY - 6 || currentY <= 140) {
      header.classList.remove('is-hidden');
    }
    lastScrollY = currentY;
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Section tracking via ScrollTrigger
  const sections = [
    { id: 'hero', label: '00 · Overview' },
    { id: 'about', label: '01 · Editorial' },
    { id: 'work', label: '02 · Selected Work' },
    { id: 'skills', label: '03 · Capabilities' },
    { id: 'contact', label: '04 · Contact' },
  ];

  sections.forEach((sec) => {
    const el = document.getElementById(sec.id);
    if (!el) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 45%',
      end: 'bottom 45%',
      onEnter: () => setActiveSection(sec.id, sec.label),
      onEnterBack: () => setActiveSection(sec.id, sec.label),
    });
  });

  function setActiveSection(activeId, labelText) {
    navLinks.forEach((link) => {
      const target = link.getAttribute('href');
      if (target === `#${activeId}`) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
    if (sectionReadout) {
      sectionReadout.textContent = labelText;
    }
  }

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href === '#main-content') return;
      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        scrollToTarget(targetEl);
      }
    });
  });

  // Theme toggle handler
  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (!target) return;
    const themeBtn = target.closest('[data-theme-toggle]');
    if (themeBtn) {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {}
      syncThemeButtons();
    }
  });

  // Easter Egg: Click brand wordmark 5 times rapidly OR enter Konami Code
  let clickCount = 0;
  let clickTimer = 0;
  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget(0);
      clickCount += 1;
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => {
        clickCount = 0;
      }, 1400);

      if (clickCount >= 5) {
        clickCount = 0;
        triggerEasterEgg();
      }
    });
  }

  const konami = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
  ];
  let konamiIndex = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key === konami[konamiIndex] || e.key.toLowerCase() === konami[konamiIndex]) {
      konamiIndex += 1;
      if (konamiIndex === konami.length) {
        konamiIndex = 0;
        triggerEasterEgg();
      }
    } else {
      konamiIndex = 0;
    }
  });
}

function syncThemeButtons() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.textContent = current === 'light' ? 'Theme: Light' : 'Theme: Dark';
  });
}

function triggerEasterEgg() {
  playClickSound();
  document.body.classList.add('easter-egg-active');
  const toast = document.getElementById('easter-egg-toast');
  if (toast) {
    toast.textContent = 'Zambales Overclock Mode Activated · All SQL Queries Now O(1)';
    toast.removeAttribute('hidden');
  }
  window.setTimeout(() => {
    document.body.classList.remove('easter-egg-active');
    if (toast) toast.setAttribute('hidden', 'true');
  }, 3200);
}
