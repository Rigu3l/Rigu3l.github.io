/**
 * Accessible Character & Word Splitter + Reveal Helpers
 * Preserves full screen-reader readability by applying aria-label to the parent
 * and aria-hidden="true" to all generated split spans.
 */

import gsap from 'gsap';
import { prefersReducedMotion, MOTION } from './utils.js';

/**
 * Splits an element's text into masked character spans while preserving accessibility.
 * @param {HTMLElement | null} element
 * @returns {HTMLElement[]} Array of character span elements
 */
export function splitIntoChars(element) {
  if (!element) return [];
  const rawText = (element.textContent || '').trim();
  if (!rawText) return [];

  element.setAttribute('aria-label', rawText);

  if (prefersReducedMotion()) {
    return [];
  }

  element.innerHTML = '';
  const chars = [];
  const words = rawText.split(/\s+/);

  words.forEach((word, wIdx) => {
    const wordWrap = document.createElement('span');
    wordWrap.className = 'split-line-mask';
    wordWrap.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < word.length; i++) {
      const charSpan = document.createElement('span');
      charSpan.className = 'split-char';
      charSpan.setAttribute('aria-hidden', 'true');
      charSpan.textContent = word[i];
      wordWrap.appendChild(charSpan);
      chars.push(charSpan);
    }

    element.appendChild(wordWrap);

    if (wIdx < words.length - 1) {
      const space = document.createTextNode(' ');
      element.appendChild(space);
    }
  });

  return chars;
}

/**
 * Splits an element's text into word spans for scroll-scrubbed opacity reveals.
 * @param {HTMLElement | null} element
 * @param {string} wordClass
 * @returns {HTMLElement[]} Array of word span elements
 */
export function splitIntoWords(element, wordClass = 'scrub-word') {
  if (!element) return [];
  const rawText = (element.textContent || '').trim();
  if (!rawText) return [];

  element.setAttribute('aria-label', rawText);

  if (prefersReducedMotion()) {
    return [];
  }

  element.innerHTML = '';
  const words = rawText.split(/\s+/);
  const spans = [];

  words.forEach((word, idx) => {
    const span = document.createElement('span');
    span.className = wordClass;
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    element.appendChild(span);
    spans.push(span);

    if (idx < words.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  return spans;
}

/**
 * Animate an array of split characters from below their mask
 * @param {HTMLElement[]} chars
 * @param {object} options
 */
export function animateCharsIn(chars, options = {}) {
  if (!chars || !chars.length || prefersReducedMotion()) return null;

  gsap.set(chars, { yPercent: 110, opacity: 0 });
  return gsap.to(chars, {
    yPercent: 0,
    opacity: 1,
    duration: options.duration ?? MOTION.DURATION_BASE,
    stagger: options.stagger ?? 0.018,
    ease: options.ease ?? MOTION.EASE_OUT_EXPO,
    delay: options.delay ?? 0,
  });
}
