/**
 * Scroll-Velocity-Reactive Marquee
 * Speed and direction react to scroll velocity, with subtle skew when scrolling fast.
 */

import gsap from 'gsap';
import { getScrollVelocity } from './smooth-scroll.js';
import { prefersReducedMotion, clamp, lerp } from './utils.js';

export function initMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track || prefersReducedMotion()) {
    return () => {};
  }

  let xPercent = 0;
  let direction = -1;
  let currentSkew = 0;
  let speedMultiplier = 1;

  const tickerFn = () => {
    const velocity = getScrollVelocity();
    if (Math.abs(velocity) > 0.15) {
      direction = velocity > 0 ? -1 : 1;
    }

    const targetBoost = clamp(Math.abs(velocity) * 0.18, 0, 5.5);
    speedMultiplier = lerp(speedMultiplier, 1 + targetBoost, 0.12);

    const targetSkew = clamp(velocity * -0.18, -6, 6);
    currentSkew = lerp(currentSkew, targetSkew, 0.15);

    xPercent += 0.045 * direction * speedMultiplier;
    if (xPercent <= -50) xPercent += 50;
    if (xPercent > 0) xPercent -= 50;

    track.style.transform = `translate3d(${xPercent.toFixed(3)}%, 0, 0) skewX(${currentSkew.toFixed(
      2
    )}deg)`;
  };

  gsap.ticker.add(tickerFn);

  return () => {
    gsap.ticker.remove(tickerFn);
  };
}
