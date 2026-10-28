/**
 * Footer / Contact Controller
 * - Giant character-reveal headline on scroll enter
 * - Live local-time clock for Olongapo City, Zambales (Asia/Manila GMT+8) updating every second
 * - Magnetic hover effect on primary "Start a Project" CTA button
 * - Copy Email button with Clipboard API + textarea fallback ("Copied" state for 1.5s)
 * - Smooth Back-to-Top button
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CONTENT } from '../content.js';
import { splitIntoChars, animateCharsIn } from './text-split.js';
import { scrollToTarget } from './smooth-scroll.js';
import { playClickSound } from './sound.js';
import { prefersReducedMotion, hasFinePointer } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export function initFooter() {
  const headlineEl = document.getElementById('footer-headline');
  const clockEl = document.getElementById('footer-live-clock');
  const magneticBtn = document.getElementById('footer-magnetic-cta');
  const copyBtn = document.getElementById('btn-copy-email');
  const copyLabel = document.getElementById('copy-email-label');
  const backToTopBtn = document.getElementById('btn-back-to-top');

  // 1. Headline Character Reveal on Scroll
  if (headlineEl && !prefersReducedMotion()) {
    const chars = splitIntoChars(headlineEl);
    if (chars.length) {
      gsap.set(chars, { yPercent: 105, opacity: 0 });
      ScrollTrigger.create({
        trigger: headlineEl,
        start: 'top 86%',
        once: true,
        onEnter: () => {
          animateCharsIn(chars, { duration: 0.7, stagger: 0.016 });
        },
      });
    }
  }

  // 2. Live Local Clock for Olongapo City (Asia/Manila GMT+8)
  function updateClock() {
    if (!clockEl) return;
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CONTENT.profile.timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const timeString = formatter.format(now);
      clockEl.textContent = `${CONTENT.profile.location} · ${timeString} ${CONTENT.profile.gmtOffset}`;
    } catch {
      const now = new Date();
      clockEl.textContent = `${CONTENT.profile.location} · ${now.toLocaleTimeString()} ${CONTENT.profile.gmtOffset}`;
    }
  }

  updateClock();
  const clockInterval = window.setInterval(updateClock, 1000);

  // 3. Magnetic Primary CTA Button (Desktop fine pointer + no reduced motion)
  if (magneticBtn && hasFinePointer() && !prefersReducedMotion()) {
    magneticBtn.addEventListener('pointermove', (e) => {
      const rect = magneticBtn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      gsap.to(magneticBtn, {
        x: dx * 0.28,
        y: dy * 0.28,
        duration: 0.3,
        ease: 'power2.out',
      });
    });

    magneticBtn.addEventListener('pointerleave', () => {
      gsap.to(magneticBtn, {
        x: 0,
        y: 0,
        duration: 0.55,
        ease: 'elastic.out(1, 0.4)',
      });
    });
  }

  // 4. Copy Email with Clipboard API + Fallback
  let copyTimeout = 0;
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const email = CONTENT.profile.email;
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(email);
          copied = true;
        } catch {
          copied = false;
        }
      }

      if (!copied) {
        try {
          const tempInput = document.createElement('textarea');
          tempInput.value = email;
          tempInput.setAttribute('readonly', '');
          tempInput.style.position = 'fixed';
          tempInput.style.opacity = '0';
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          copied = true;
        } catch {}
      }

      playClickSound();
      if (copyLabel) {
        copyLabel.textContent = copied ? 'Copied' : 'Copy Email';
      } else {
        copyBtn.textContent = copied ? 'Copied' : 'Copy Email';
      }

      window.clearTimeout(copyTimeout);
      copyTimeout = window.setTimeout(() => {
        if (copyLabel) {
          copyLabel.textContent = 'Copy Email';
        } else {
          copyBtn.textContent = 'Copy Email';
        }
      }, 1500);
    });
  }

  // 5. Back to Top
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      scrollToTarget(0);
    });
  }

  return () => {
    window.clearInterval(clockInterval);
  };
}
