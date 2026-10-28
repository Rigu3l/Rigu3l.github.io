/**
 * Smooth Scroll (Lenis) + GSAP ScrollTrigger Sync
 * Respects prefers-reduced-motion and provides scroll lock/unlock and smooth scrollTo.
 */

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance = null;
let tickerCallback = null;
let currentVelocity = 0;

export function initSmoothScroll() {
  const reduced = prefersReducedMotion();
  const progressBar = document.querySelector('.scroll-progress-bar');

  // Check native CSS scroll-timeline support; if unsupported, drive via ScrollTrigger
  const supportsCssTimeline =
    typeof CSS !== 'undefined' &&
    CSS.supports &&
    CSS.supports('animation-timeline: scroll()');

  if (progressBar) {
    if (supportsCssTimeline && !reduced) {
      progressBar.classList.add('has-css-timeline');
    } else {
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          gsap.set(progressBar, { scaleX: self.progress });
        },
      });
    }
  }

  if (reduced) {
    // Native scroll only for reduced motion users
    ScrollTrigger.refresh();
    return null;
  }

  lenisInstance = new Lenis({
    duration: 1.12,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.5,
  });

  lenisInstance.on('scroll', (e) => {
    currentVelocity = e.velocity || 0;
    ScrollTrigger.update();
  });

  tickerCallback = (time) => {
    if (lenisInstance) {
      lenisInstance.raf(time * 1000);
    }
  };

  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function lockScroll() {
  document.body.classList.add('is-locked');
  if (lenisInstance) {
    lenisInstance.stop();
  }
}

export function unlockScroll() {
  document.body.classList.remove('is-locked');
  if (lenisInstance) {
    lenisInstance.start();
  }
  ScrollTrigger.refresh();
}

export function scrollToTarget(target, options = {}) {
  if (lenisInstance && !prefersReducedMotion()) {
    lenisInstance.scrollTo(target, {
      offset: options.offset || 0,
      duration: options.duration ?? 1.1,
      immediate: Boolean(options.immediate),
    });
  } else {
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    } else if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }
}

export function getScrollVelocity() {
  return currentVelocity;
}

export function destroySmoothScroll() {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}
