/**
 * Process / Capabilities Section — Scroll-Driven Sticky Stacking Cards
 * Cards scale and rotate slightly as subsequent cards stack over them.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, isMobileViewport } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export function initSkills() {
  if (prefersReducedMotion() || isMobileViewport()) return;

  const cards = gsap.utils.toArray('.skill-card');
  if (!cards.length) return;

  cards.forEach((card, index) => {
    const el = /** @type {HTMLElement} */ (card);
    el.style.setProperty('--card-offset', `${index * 22}px`);

    if (index < cards.length - 1) {
      const nextCard = /** @type {HTMLElement} */ (cards[index + 1]);
      gsap.to(el, {
        scale: 0.96 - (cards.length - 1 - index) * 0.01,
        rotation: index % 2 === 0 ? -0.6 : 0.6,
        opacity: 0.68,
        ease: 'none',
        scrollTrigger: {
          trigger: nextCard,
          start: 'top 75%',
          end: 'top 22%',
          scrub: true,
        },
      });
    }
  });
}
