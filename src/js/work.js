/**
 * Selected Work — Pinned Chaptered Project Showcase + Case Study Lightbox
 * - Desktop (>768px & no reduced motion): Pinned section scrubbed to scroll progress
 * - Syncs chapter state across vertical scroll, chapter index buttons (01..05),
 *   prev/next arrow buttons, keyboard arrows, and pointer drag/swipe on the cover stage
 * - Mobile (<=768px): Degrades gracefully to a vertical stack of project cards
 * - Includes full Case Study Inspector modal (ESC or button to close)
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CONTENT } from '../content.js';
import { splitIntoChars, animateCharsIn } from './text-split.js';
import { scrollToTarget, lockScroll, unlockScroll } from './smooth-scroll.js';
import { playChapterWhoosh, playClickSound } from './sound.js';
import { prefersReducedMotion, isMobileViewport, clamp } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export function initWork() {
  const projects = CONTENT.projects;
  if (!projects || !projects.length) return;

  const workSection = document.getElementById('work');
  const pinViewport = document.getElementById('work-pinned-viewport');
  const progressFill = document.getElementById('work-progress-fill');
  const chapterBtns = document.querySelectorAll('[data-chapter-btn]');
  const slides = document.querySelectorAll('[data-work-slide]');
  const mediaPanel = document.getElementById('work-media-panel');

  // Dynamic text fields inside the desktop pinned stage
  const chapterBadgeEl = document.getElementById('work-active-chapter');
  const clientRoleEl = document.getElementById('work-active-client');
  const titleEl = document.getElementById('work-active-title');
  const summaryEl = document.getElementById('work-active-summary');
  const metricsEl = document.getElementById('work-active-metrics');
  const tagsEl = document.getElementById('work-active-tags');
  const liveLinkEl = /** @type {HTMLAnchorElement | null} */ (
    document.getElementById('work-active-link')
  );
  const inspectBtnEl = document.getElementById('work-inspect-btn');

  const prevBtn = document.getElementById('work-prev-btn');
  const nextBtn = document.getElementById('work-next-btn');

  let activeIndex = 0;
  let workScrollTrigger = null;

  function renderChapterContent(index, animateText = true) {
    const proj = projects[index];
    if (!proj) return;

    if (chapterBadgeEl) {
      chapterBadgeEl.textContent = `Chapter ${proj.chapter} · ${proj.year}`;
    }
    if (clientRoleEl) {
      clientRoleEl.textContent = `${proj.client} · ${proj.role}`;
    }
    if (titleEl) {
      titleEl.textContent = proj.title;
      if (animateText && !prefersReducedMotion()) {
        const chars = splitIntoChars(titleEl);
        animateCharsIn(chars, { duration: 0.5, stagger: 0.014 });
      }
    }
    if (summaryEl) {
      summaryEl.textContent = proj.summary;
      if (animateText && !prefersReducedMotion()) {
        gsap.fromTo(
          summaryEl,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
      }
    }
    if (metricsEl) {
      metricsEl.textContent = proj.metrics;
    }
    if (tagsEl) {
      // Zero-Pill Discipline: clean unboxed text with typographic separators
      tagsEl.textContent = proj.tags.join(' · ');
    }
    if (liveLinkEl) {
      liveLinkEl.href = proj.liveUrl;
    }
    if (inspectBtnEl) {
      inspectBtnEl.setAttribute('data-inspect-index', String(index));
    }

    // Update active slide
    slides.forEach((slide, sIdx) => {
      if (sIdx === index) {
        slide.classList.add('is-active');
      } else {
        slide.classList.remove('is-active');
      }
    });

    // Update chapter index buttons
    chapterBtns.forEach((btn, bIdx) => {
      if (bIdx === index) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-current', 'step');
      } else {
        btn.classList.remove('is-active');
        btn.removeAttribute('aria-current');
      }
    });

    // Update progress bar
    if (progressFill) {
      const ratio = (index + 1) / projects.length;
      progressFill.style.transform = `scaleX(${ratio.toFixed(3)})`;
    }
  }

  function goToChapter(targetIndex, viaControl = false) {
    const clamped = clamp(targetIndex, 0, projects.length - 1);
    if (viaControl && workScrollTrigger && workScrollTrigger.isActive !== undefined && !isMobileViewport() && !prefersReducedMotion()) {
      const start = workScrollTrigger.start;
      const end = workScrollTrigger.end;
      const ratio = projects.length > 1 ? clamped / (projects.length - 1) : 0;
      const targetScroll = start + (end - start) * ratio;
      scrollToTarget(targetScroll, { duration: 0.85 });
    }
    if (clamped !== activeIndex) {
      activeIndex = clamped;
      playChapterWhoosh();
      renderChapterContent(activeIndex, true);
    }
  }

  // Initial render of Chapter 01
  renderChapterContent(0, false);

  // Setup GSAP ScrollTrigger matchMedia for Desktop Pinned Scrubbing vs Mobile Stack
  const mm = gsap.matchMedia();

  mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
    if (!workSection || !pinViewport) return;

    workScrollTrigger = ScrollTrigger.create({
      trigger: workSection,
      pin: pinViewport,
      start: 'top top',
      end: () => `+=${window.innerHeight * (projects.length * 0.72)}`,
      scrub: 0.35,
      onUpdate: (self) => {
        if (progressFill) {
          const minScale = 1 / projects.length;
          const scale = minScale + self.progress * (1 - minScale);
          progressFill.style.transform = `scaleX(${scale.toFixed(3)})`;
        }
        const nextIdx = Math.min(
          projects.length - 1,
          Math.floor(self.progress * projects.length + 0.02)
        );
        if (nextIdx !== activeIndex) {
          activeIndex = nextIdx;
          playChapterWhoosh();
          renderChapterContent(activeIndex, true);
        }
      },
    });

    return () => {
      if (workScrollTrigger) {
        workScrollTrigger.kill();
        workScrollTrigger = null;
      }
    };
  });

  // Mobile cards simple on-scroll reveal
  const mobileCards = document.querySelectorAll('.work-mobile-card');
  if (mobileCards.length && !prefersReducedMotion()) {
    mobileCards.forEach((card) => {
      gsap.fromTo(
        card,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
          },
        }
      );
    });
  }

  // Controls: Chapter index buttons
  chapterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-chapter-btn') || '0', 10);
      goToChapter(idx, true);
    });
  });

  // Controls: Prev / Next arrows
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goToChapter(activeIndex - 1, true);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      goToChapter(activeIndex + 1, true);
    });
  }

  // Controls: Keyboard Left / Right arrows when work section is in viewport
  window.addEventListener('keydown', (e) => {
    if (!workSection) return;
    if (document.body.classList.contains('is-locked')) return;
    const rect = workSection.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
    if (!inView) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToChapter(activeIndex + 1, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToChapter(activeIndex - 1, true);
    }
  });

  // Controls: Drag / Touch Swipe on Media Panel
  if (mediaPanel) {
    let startX = 0;
    let isDragging = false;
    let didSwipe = false;

    mediaPanel.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      isDragging = true;
      didSwipe = false;
    });

    window.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const deltaX = e.clientX - startX;
      if (Math.abs(deltaX) > 48) {
        didSwipe = true;
        if (deltaX < 0) {
          goToChapter(activeIndex + 1, true);
        } else {
          goToChapter(activeIndex - 1, true);
        }
      }
    });

    // Clicking media panel (without dragging) opens the Case Study Lightbox
    mediaPanel.addEventListener('click', () => {
      if (!didSwipe) {
        openCaseModal(activeIndex);
      }
    });
  }

  // Case Study Architecture Modal bindings
  const caseModal = document.getElementById('case-study-modal');
  const caseCloseBtn = document.getElementById('case-modal-close');
  const caseTitle = document.getElementById('case-modal-title');
  const caseMeta = document.getElementById('case-modal-meta');
  const caseImage = /** @type {HTMLImageElement | null} */ (
    document.getElementById('case-modal-image')
  );
  const caseSummary = document.getElementById('case-modal-summary');
  const caseArch = document.getElementById('case-modal-arch');
  const caseMetrics = document.getElementById('case-modal-metrics');
  const caseLiveLink = /** @type {HTMLAnchorElement | null} */ (
    document.getElementById('case-modal-live')
  );

  function openCaseModal(index) {
    const proj = projects[index];
    if (!proj || !caseModal) return;

    playClickSound();
    if (caseTitle) caseTitle.textContent = `${proj.chapter}. ${proj.title}`;
    if (caseMeta) {
      caseMeta.textContent = `${proj.client} · ${proj.role} · ${proj.year} · ${proj.tags.join(' · ')}`;
    }
    if (caseImage) {
      caseImage.src = proj.image;
      caseImage.alt = `${proj.title} architecture diagram`;
    }
    if (caseSummary) caseSummary.textContent = proj.summary;
    if (caseArch) caseArch.textContent = proj.architectureNote;
    if (caseMetrics) caseMetrics.textContent = proj.metrics;
    if (caseLiveLink) caseLiveLink.href = proj.liveUrl;

    caseModal.classList.add('is-open');
    caseModal.setAttribute('aria-hidden', 'false');
    lockScroll();
    if (caseCloseBtn) caseCloseBtn.focus();
  }

  function closeCaseModal() {
    if (!caseModal || !caseModal.classList.contains('is-open')) return;
    caseModal.classList.remove('is-open');
    caseModal.setAttribute('aria-hidden', 'true');
    unlockScroll();
  }

  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (!target) return;

    const inspectTrigger = target.closest('[data-inspect-index]');
    if (inspectTrigger) {
      const idx = parseInt(inspectTrigger.getAttribute('data-inspect-index') || '0', 10);
      openCaseModal(idx);
      return;
    }

    if (target === caseModal || target.closest('#case-modal-close')) {
      closeCaseModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && caseModal && caseModal.classList.contains('is-open')) {
      closeCaseModal();
    }
  });
}
