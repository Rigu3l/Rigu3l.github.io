/**
 * Custom Cursor with Lerp Ring & Contextual States
 * Desktop with fine pointer only; disabled on touch and prefers-reduced-motion.
 * States: default, hover ("Visit" / custom label), drag ("Drag"), hidden (inputs).
 */

import { hasFinePointer, prefersReducedMotion, lerp } from './utils.js';

let rafId = 0;

export function initCursor() {
  if (!hasFinePointer() || prefersReducedMotion()) {
    return () => {};
  }

  const cursorRoot = document.getElementById('custom-cursor');
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const label = document.getElementById('cursor-label');

  if (!cursorRoot || !dot || !ring || !label) {
    return () => {};
  }

  document.documentElement.classList.add('has-custom-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let isVisible = false;

  const onPointerMove = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isVisible) {
      isVisible = true;
      ringX = mouseX;
      ringY = mouseY;
    }
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  };

  const onPointerOver = (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (!target) return;

    if (target.closest('input, textarea, select, [data-cursor="hidden"]')) {
      cursorRoot.classList.add('is-hidden');
      cursorRoot.classList.remove('is-hover', 'is-drag');
      return;
    }

    cursorRoot.classList.remove('is-hidden');

    const dragTrigger = target.closest('[data-cursor="drag"]');
    if (dragTrigger) {
      cursorRoot.classList.add('is-drag');
      cursorRoot.classList.remove('is-hover');
      label.textContent = dragTrigger.getAttribute('data-cursor-label') || 'DRAG';
      return;
    }

    const hoverTrigger = target.closest('[data-cursor-label], a, button');
    if (hoverTrigger) {
      const customText = hoverTrigger.getAttribute('data-cursor-label');
      if (customText) {
        cursorRoot.classList.add('is-hover');
        cursorRoot.classList.remove('is-drag');
        label.textContent = customText;
      } else {
        cursorRoot.classList.remove('is-hover', 'is-drag');
        label.textContent = '';
      }
      return;
    }

    cursorRoot.classList.remove('is-hover', 'is-drag');
    label.textContent = '';
  };

  const tick = () => {
    ringX = lerp(ringX, mouseX, 0.18);
    ringY = lerp(ringY, mouseY, 0.18);
    ring.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0)`;
    rafId = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerover', onPointerOver, { passive: true });
  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerover', onPointerOver);
    document.documentElement.classList.remove('has-custom-cursor');
  };
}
