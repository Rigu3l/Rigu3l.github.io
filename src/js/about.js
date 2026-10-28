/**
 * Intro / About Section (Scroll-Scrubbed Bio + Count-Up Stats + Mask-Up Secondary Lines)
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitIntoWords } from './text-split.js';
import { prefersReducedMotion, MOTION } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export function initAbout() {
  const reduced = prefersReducedMotion();
  const bioEl = document.getElementById('about-scrub-paragraph');
  const secondaryCards = document.querySelectorAll('.about-secondary-card');
  const statCounters = document.querySelectorAll('[data-stat-target]');

  if (bioEl && !reduced) {
    const wordSpans = splitIntoWords(bioEl, 'scrub-word');
    if (wordSpans.length) {
      gsap.fromTo(
        wordSpans,
        { opacity: 0.18 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: {
            trigger: bioEl,
            start: 'top 82%',
            end: 'bottom 48%',
            scrub: 0.4,
          },
        }
      );
    }
  }

  // Secondary lines mask-up reveal
  if (secondaryCards.length && !reduced) {
    gsap.fromTo(
      secondaryCards,
      { y: 28, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: MOTION.DURATION_BASE,
        stagger: 0.12,
        ease: MOTION.EASE_OUT_EXPO,
        scrollTrigger: {
          trigger: '.about-secondary-grid',
          start: 'top 85%',
        },
      }
    );
  }

  // Count-up numbers on stats strip
  statCounters.forEach((el) => {
    const targetVal = parseFloat(el.getAttribute('data-stat-target') || '0');
    const decimals = parseInt(el.getAttribute('data-stat-decimals') || '0', 10);
    const suffix = el.getAttribute('data-stat-suffix') || '';

    if (reduced) {
      el.textContent = `${targetVal.toFixed(decimals)}${suffix}`;
      return;
    }

    const counterObj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(counterObj, {
          val: targetVal,
          duration: 1.4,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = `${counterObj.val.toFixed(decimals)}${suffix}`;
          },
        });
      },
    });
  });
}
