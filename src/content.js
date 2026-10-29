import {
  computeNumbersBandState,
  formatCounterValue,
  computeFitLineScale,
  validateBriefForm,
  buildBriefMailtoUrl,
} from './part2-logic.js';
import { clamp } from './timeline.js';
import { warm, setBarColor, sfx } from './main.js';

/**
 * Part 2 — Editorial Page Sheet Controller (src/content.js)
 * - Reveal Engine: word-split blur reveal ([data-reveal="words"]), fade blocks ([data-reveal="fade"]),
 *   1.6s eased counters ([data-count]), and kinetic drifting display lines
 * - Numbers Band (#numbers): 300vh sticky stage with clip-path open, horizontal card run, and fade
 * - Header Nav & Color Adaptation: active section [aria-current="true"], header.top.on-color, and setBarColor
 * - Contact & Brief Form: Copy Email button, fit-lines input scaling, inline EN/FIL validation,
 *   POST /api/brief (8s timeout) with automatic mailto:rjverceles1@gmail.com fallback
 * - Footer Word (#footer): per-letter SVG feDisplacementMap warp driven by pointer proximity
 */

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  const params = new URLSearchParams(window.location.search);
  const isReducedMotion = () =>
    params.get('motion') === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');
  const isPhone = () => window.innerWidth < 768;

  // ==========================================================================
  // 1. WORD-SPLIT BLUR REVEAL & GENERIC FADE REVEAL ENGINE
  // ==========================================================================
  const wordElements = Array.from(document.querySelectorAll('[data-reveal="words"]'));
  const fadeElements = Array.from(document.querySelectorAll('[data-reveal="fade"]'));

  function splitWordsInElement(el) {
    const i18nKey = el.getAttribute('data-i18n');
    let rawText = el.textContent || '';
    if (i18nKey && window.I18N_STRINGS?.[i18nKey]) {
      const pair = window.I18N_STRINGS[i18nKey];
      rawText = window.__LANG === 'fil' ? pair[1] : pair[0];
    }
    const words = rawText.trim().split(/\s+/).filter(Boolean);
    const totalWords = Math.max(1, words.length);
    // 22ms stagger per word, capped at ~700ms total
    const stepMs = Math.min(22, 700 / totalWords);

    el.innerHTML = '';
    words.forEach((word, idx) => {
      const span = document.createElement('span');
      span.className = 'word-token';
      span.style.setProperty('--word-delay', `${Math.round(idx * stepMs)}ms`);
      span.textContent = word;
      el.appendChild(span);
      if (idx < words.length - 1) {
        el.appendChild(document.createTextNode(' '));
      }
    });
  }

  wordElements.forEach((el) => splitWordsInElement(el));

  // Re-split idempotently when language toggles between EN and FIL
  window.addEventListener('langchange', () => {
    wordElements.forEach((el) => {
      const wasRevealed = el.classList.contains('is-revealed');
      splitWordsInElement(el);
      if (wasRevealed) {
        el.classList.add('is-revealed');
      }
    });
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      }
    },
    { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
  );

  wordElements.forEach((el) => revealObserver.observe(el));
  fadeElements.forEach((el) => revealObserver.observe(el));

  // ==========================================================================
  // 2. COUNTERS ([data-count="N"]) — 1.6s Ease-Out When 60% Visible
  // ==========================================================================
  const counterElements = Array.from(document.querySelectorAll('[data-count]'));
  const startedCounters = new WeakSet();

  function animateCounter(el) {
    if (startedCounters.has(el)) return;
    startedCounters.add(el);

    const target = parseFloat(el.getAttribute('data-count') || '0');
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const getLocale = () => (window.__LANG === 'fil' ? 'fil-PH' : 'en-US');

    if (isReducedMotion()) {
      el.textContent = formatCounterValue(target, 1, { prefix, suffix, locale: getLocale() });
      return;
    }

    const duration = 1600;
    const startAt = performance.now();

    function step(now) {
      const t = clamp((now - startAt) / duration, 0, 1);
      el.textContent = formatCounterValue(target, t, { prefix, suffix, locale: getLocale() });
      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
        }
      }
    },
    { threshold: 0.6 }
  );

  counterElements.forEach((el) => counterObserver.observe(el));

  // ==========================================================================
  // 3. KINETIC DRIFTING LINES & NUMBERS BAND SCROLL DRIVER
  // ==========================================================================
  const kineticBand = document.getElementById('kinetic-band');
  const kineticLines = Array.from(document.querySelectorAll('.kinetic-line'));
  const numbersSection = document.getElementById('numbers');
  const numbersShell = document.getElementById('numbers-shell');
  const numbersTrack = document.getElementById('numbers-track');
  const topHeader = document.getElementById('top-header');
  const contentEl = document.getElementById('content');
  const meshSection = document.getElementById('mesh-section');
  const worksSection = document.getElementById('work');

  function updateScrollDrivenSections() {
    const vh = Math.max(1, window.innerHeight);
    const rm = isReducedMotion();
    const phone = isPhone();

    // 3a. Kinetic lines horizontal drift (scrollProgress * ±12vw)
    if (kineticBand && kineticLines.length > 0) {
      const kRect = kineticBand.getBoundingClientRect();
      if (kRect.bottom > -100 && kRect.top < vh + 100 && !rm) {
        const kProg = clamp((vh - kRect.top) / (vh + kRect.height), 0, 1) - 0.5;
        kineticLines.forEach((line) => {
          const dir = parseFloat(line.getAttribute('data-kinetic-dir') || '1');
          const offsetVw = kProg * 24 * dir; // -12vw .. +12vw
          line.style.setProperty('--kx', `${offsetVw.toFixed(2)}vw`);
        });
      }
    }

    // 3b. Numbers Band (#numbers) 300vh sticky stage: OPEN (0..0.25), RUN (0.25..0.85), FADE (0.85..1.0)
    if (numbersSection && numbersShell && numbersTrack) {
      if (rm || phone) {
        numbersShell.style.clipPath = 'none';
        numbersTrack.style.transform = 'none';
      } else {
        const nRect = numbersSection.getBoundingClientRect();
        const scrollable = Math.max(1, numbersSection.offsetHeight - vh);
        const progress = clamp(-nRect.top / scrollable, 0, 1);
        const nState = computeNumbersBandState(progress);

        numbersShell.style.clipPath = nState.clipPath;

        const maxTranslatePx = Math.max(0, numbersTrack.scrollWidth - window.innerWidth + 140);
        const tx = -nState.translateProgress * maxTranslatePx;
        numbersTrack.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
      }
    }

    // 3c. Header .on-color and mobile browser bar color (setBarColor)
    if (contentEl && topHeader) {
      const cRect = contentEl.getBoundingClientRect();
      if (cRect.top <= 72) {
        const contactSection = document.getElementById('contact');
        const footerSection = document.getElementById('footer');
        const checkAtY = (el, y) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.top <= y && r.bottom >= y;
        };
        const onDarkHeader =
          checkAtY(numbersSection, 48) ||
          checkAtY(meshSection, 48) ||
          checkAtY(worksSection, 48) ||
          checkAtY(contactSection, 48) ||
          checkAtY(footerSection, 48);
        topHeader.classList.toggle('on-color', onDarkHeader);

        const bottomY = vh - 24;
        if (checkAtY(meshSection, bottomY)) {
          setBarColor('#141B33');
        } else if (
          checkAtY(numbersSection, bottomY) ||
          checkAtY(worksSection, bottomY) ||
          checkAtY(contactSection, bottomY) ||
          checkAtY(footerSection, bottomY)
        ) {
          setBarColor('#0B1020');
        } else {
          setBarColor('#F7F5EF');
        }
      } else {
        topHeader.classList.remove('on-color');
        setBarColor(null);
      }
    }
  }

  window.addEventListener('scroll', updateScrollDrivenSections, { passive: true });
  window.addEventListener('resize', updateScrollDrivenSections, { passive: true });
  updateScrollDrivenSections();

  // ==========================================================================
  // 4. HEADER NAVIGATION & ACTIVE SECTION OBSERVER
  // ==========================================================================
  const navLinks = Array.from(document.querySelectorAll('.top-nav-link[data-section-link]'));
  const trackedSections = ['about', 'work', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        sfx('click', 0.2);
        try {
          history.replaceState(null, '', href);
        } catch (err) {}
        // Ensure story gates are bypassed if jumping directly to Part 2 via header nav
        const skipBtn = document.getElementById('skip-btn');
        if (!document.body.classList.contains('past-story') && skipBtn) {
          skipBtn.click();
        }
        window.setTimeout(() => {
          target.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth' });
        }, 30);
      }
    });
  });

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const match = link.getAttribute('data-section-link') === id;
            if (match) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      }
    },
    { rootMargin: '-30% 0px -55% 0px', threshold: 0 }
  );

  trackedSections.forEach((sec) => sectionObserver.observe(sec));

  // Back to top link in footer
  const footerTopLink = document.getElementById('footer-top-link');
  if (footerTopLink) {
    footerTopLink.addEventListener('click', (e) => {
      e.preventDefault();
      sfx('click', 0.2);
      window.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  // Dynamic copyright year
  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  // ==========================================================================
  // 5. CONTACT COPY EMAIL MICRO-INTERACTION
  // ==========================================================================
  const copyBtn = document.getElementById('copy-email-btn');
  const copyLabel = document.getElementById('copy-email-label');
  let copyTimer = null;

  if (copyBtn && copyLabel) {
    copyBtn.addEventListener('click', async () => {
      const email = copyBtn.getAttribute('data-email') || 'rjverceles1@gmail.com';
      sfx('click', 0.22);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(email);
        }
      } catch (e) {}

      copyBtn.classList.add('is-copied');
      const copiedPair = window.I18N_STRINGS?.['contact.copied'];
      copyLabel.textContent = copiedPair
        ? window.__LANG === 'fil'
          ? copiedPair[1]
          : copiedPair[0]
        : 'Copied';

      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        const defaultPair = window.I18N_STRINGS?.['contact.copyEmail'];
        copyLabel.textContent = defaultPair
          ? window.__LANG === 'fil'
            ? defaultPair[1]
            : defaultPair[0]
          : 'Copy email';
      }, 1600);
    });
  }

  // ==========================================================================
  // 6. BRIEF FORM: FIT-LINES, INLINE VALIDATION, POST /api/brief & MAILTO FALLBACK
  // ==========================================================================
  const briefForm = document.getElementById('brief-form');
  const nameInput = document.getElementById('brief-name');
  const emailInput = document.getElementById('brief-email');
  const msgInput = document.getElementById('brief-message');
  const gotchaInput = document.getElementById('brief-gotcha');
  const submitBtn = document.getElementById('brief-submit-btn');
  const submitLabel = document.getElementById('brief-submit-label');
  const statusEl = document.getElementById('brief-status');

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  function applyFitLine(inputEl) {
    if (!inputEl || !measureCtx) return;
    const val = inputEl.value || '';
    const availableW = Math.max(120, inputEl.clientWidth - 36);
    measureCtx.font = '400 16.8px Inter, system-ui, sans-serif';
    const measuredW = measureCtx.measureText(val).width;
    const scale = computeFitLineScale(measuredW, availableW, 0.6);
    inputEl.style.fontSize = `${(1.05 * scale).toFixed(3)}rem`;
  }

  [nameInput, emailInput].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener('input', () => applyFitLine(inp));
  });

  function setFieldError(inputEl, errorElId, message) {
    const errEl = document.getElementById(errorElId);
    if (!inputEl || !errEl) return;
    if (message) {
      inputEl.setAttribute('aria-invalid', 'true');
      errEl.textContent = message;
    } else {
      inputEl.removeAttribute('aria-invalid');
      errEl.textContent = '';
    }
  }

  function getFormValues() {
    const scopeChecked = briefForm?.querySelector('input[name="scope"]:checked');
    const budgetChecked = briefForm?.querySelector('input[name="budget"]:checked');
    return {
      name: nameInput ? nameInput.value : '',
      email: emailInput ? emailInput.value : '',
      message: msgInput ? msgInput.value : '',
      scope: scopeChecked ? scopeChecked.value : '',
      budget: budgetChecked ? budgetChecked.value : '',
      gotcha: gotchaInput ? gotchaInput.value : '',
    };
  }

  // Per-field blur validation
  if (nameInput) {
    nameInput.addEventListener('blur', () => {
      const res = validateBriefForm(getFormValues(), window.__LANG || 'en');
      setFieldError(nameInput, 'brief-name-error', res.errors.name);
    });
  }
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const res = validateBriefForm(getFormValues(), window.__LANG || 'en');
      setFieldError(emailInput, 'brief-email-error', res.errors.email);
    });
  }
  if (msgInput) {
    msgInput.addEventListener('blur', () => {
      const res = validateBriefForm(getFormValues(), window.__LANG || 'en');
      setFieldError(msgInput, 'brief-message-error', res.errors.message);
    });
  }

  if (briefForm) {
    briefForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (statusEl) statusEl.textContent = '';

      const values = getFormValues();
      const lang = window.__LANG === 'fil' ? 'fil' : 'en';
      const validation = validateBriefForm(values, lang);

      setFieldError(nameInput, 'brief-name-error', validation.errors.name);
      setFieldError(emailInput, 'brief-email-error', validation.errors.email);
      setFieldError(msgInput, 'brief-message-error', validation.errors.message);

      if (!validation.valid) {
        sfx('error', 0.2);
        if (validation.errors.name && nameInput) nameInput.focus();
        else if (validation.errors.email && emailInput) emailInput.focus();
        else if (validation.errors.message && msgInput) msgInput.focus();
        return;
      }

      // Honeypot check: silently succeed if filled by a bot
      if (values.gotcha && values.gotcha.trim() !== '') {
        const okPair = window.I18N_STRINGS?.['form.success'];
        if (statusEl) {
          statusEl.textContent = okPair ? (lang === 'fil' ? okPair[1] : okPair[0]) : 'Brief received — thank you!';
        }
        briefForm.reset();
        return;
      }

      // Lock submit button during 8s fetch attempt
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) {
        const sendingPair = window.I18N_STRINGS?.['form.sending'];
        submitLabel.textContent = sendingPair ? (lang === 'fil' ? sendingPair[1] : sendingPair[0]) : 'Sending…';
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);

      let sentViaApi = false;
      try {
        const res = await fetch('/api/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            scope: values.scope,
            budget: values.budget,
            message: values.message.trim(),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.ok) {
            sentViaApi = true;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }

      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) {
        const sendPair = window.I18N_STRINGS?.['form.submit'];
        submitLabel.textContent = sendPair ? (lang === 'fil' ? sendPair[1] : sendPair[0]) : 'Send brief';
      }

      if (sentViaApi) {
        sfx('success', 0.25);
        const okPair = window.I18N_STRINGS?.['form.success'];
        if (statusEl) {
          statusEl.textContent = okPair
            ? lang === 'fil'
              ? okPair[1]
              : okPair[0]
            : "Brief received — thank you! I'll reply to your email soon.";
        }
        briefForm.reset();
        [nameInput, emailInput].forEach((inp) => applyFitLine(inp));
      } else {
        // Fallback to mailto:rjverceles1@gmail.com so user input is never lost
        const mailtoUrl = buildBriefMailtoUrl(values);
        const fallbackPair = window.I18N_STRINGS?.['form.mailtoFallback'];
        if (statusEl) {
          statusEl.textContent = fallbackPair
            ? lang === 'fil'
              ? fallbackPair[1]
              : fallbackPair[0]
            : 'Opening your email client with your brief pre-filled…';
        }
        const tempLink = document.createElement('a');
        tempLink.href = mailtoUrl;
        tempLink.style.display = 'none';
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
      }
    });
  }

  // ==========================================================================
  // 7. FOOTER WORD (#footer) — Per-Letter SVG feDisplacementMap Warp
  // ==========================================================================
  const footerEl = document.getElementById('footer');
  const footerChars = Array.from(document.querySelectorAll('.footer-char[data-warp-idx]'));
  const dispMaps = footerChars.map((ch) => {
    const idx = ch.getAttribute('data-warp-idx');
    return document.getElementById(`warp-disp-${idx}`);
  });
  const currentScales = footerChars.map(() => 0);
  const targetScales = footerChars.map(() => 0);

  let footerVisible = false;
  let footerRaf = null;

  function updateFooterWarp() {
    if (!footerVisible || isReducedMotion()) {
      footerRaf = null;
      return;
    }

    let anyActive = false;
    for (let i = 0; i < footerChars.length; i++) {
      currentScales[i] += (targetScales[i] - currentScales[i]) * 0.12;
      if (Math.abs(currentScales[i]) > 0.08 || Math.abs(targetScales[i]) > 0.08) {
        anyActive = true;
      }
      const disp = dispMaps[i];
      if (disp) {
        disp.setAttribute('scale', currentScales[i].toFixed(2));
      }
    }

    if (anyActive) {
      footerRaf = requestAnimationFrame(updateFooterWarp);
    } else {
      footerRaf = null;
    }
  }

  if (footerEl && footerChars.length > 0) {
    footerEl.addEventListener(
      'pointermove',
      (e) => {
        if (!footerVisible || isReducedMotion()) return;
        footerChars.forEach((ch, idx) => {
          const r = ch.getBoundingClientRect();
          const cx = r.left + r.width * 0.5;
          const cy = r.top + r.height * 0.5;
          const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
          targetScales[idx] = Math.max(0, 1 - dist / 220) * 28;
        });
        if (footerRaf === null) {
          footerRaf = requestAnimationFrame(updateFooterWarp);
        }
      },
      { passive: true }
    );

    footerEl.addEventListener(
      'pointerleave',
      () => {
        for (let i = 0; i < targetScales.length; i++) {
          targetScales[i] = 0;
        }
        if (footerRaf === null && footerVisible) {
          footerRaf = requestAnimationFrame(updateFooterWarp);
        }
      },
      { passive: true }
    );

    const footerObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          footerVisible = entry.isIntersecting;
          if (!footerVisible && footerRaf !== null) {
            cancelAnimationFrame(footerRaf);
            footerRaf = null;
          }
        }
      },
      { rootMargin: '100px 0px' }
    );

    footerObserver.observe(footerEl);
  }
}

warm(init);
export default { init };
