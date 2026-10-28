/**
 * Shared Motion Tokens, Math Helpers, and Accessibility Queries
 */

export const MOTION = {
  EASE_OUT_EXPO: 'power4.out',
  EASE_IN_OUT: 'power3.inOut',
  DURATION_FAST: 0.25,
  DURATION_BASE: 0.65,
  DURATION_SLOW: 1.05,
};

/**
 * Linear interpolation
 * @param {number} start
 * @param {number} end
 * @param {number} amt
 */
export function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

/**
 * Clamp value between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Check if device has fine pointer (desktop mouse/trackpad)
 * @returns {boolean}
 */
export function hasFinePointer() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

/**
 * Check if viewport is mobile/tablet (< 769px)
 * @returns {boolean}
 */
export function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
}
