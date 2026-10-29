import {
  TOTAL_STORY_VH,
  TIMELINE,
  OS_TIMES,
  clamp,
  lerp,
  range,
  easeOutBack,
  computeTimelineState,
  getFirstUnfinishedGate,
  limitScrollPv,
} from './timeline.js';
import {
  ensureDisplayFont,
  createFirstStoryScreenTexture,
  createModernScreenTexture,
} from './crt-screen.js';

/**
 * Software Canvas 2D Fallback Renderer used ONLY when the browser/sandbox
 * environment has WebGL completely disabled (e.g. GL_VENDOR = Disabled,
 * GL_RENDERER = Disabled, BindToCurrentSequence failed).
 * Ensures zero console errors and keeps the entire portfolio story,
 * 5-stage era transition, and gates 100% visual and interactive.
 */
export async function runCanvas2DFallback({
  canvas,
  params,
  paramP,
  paramV,
  paramMod,
  paramDebug,
  isReducedMotion,
  isPhone,
  VW,
  VH,
  updateLoaderText,
  headerEl,
  skipBtn,
  replayBtn,
  hintPill,
  hintText,
  eraAnnouncer,
  contentEl,
  logoTopLink,
  sfx,
  startMusic,
}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (paramDebug) {
    console.info('[WebGL Debug] UNMASKED_RENDERER_WEBGL: Canvas2D Software Fallback (WebGL Disabled)');
    console.info('[WebGL Debug] gl.MAX_TEXTURE_IMAGE_UNITS:', 0);
    console.info('[WebGL Debug] renderer.capabilities:', {
      maxTextures: 0,
      maxVertexTextures: 0,
      maxVaryings: 0,
      maxVertexUniforms: 0,
      maxFragmentUniforms: 0,
    });
  }

  updateLoaderText(45);
  await ensureDisplayFont();
  updateLoaderText(85);

  const firstScreen = createFirstStoryScreenTexture(1);
  const modernScreenTex = createModernScreenTexture(isPhone());
  const modernCanvas = modernScreenTex.image;

  let entered = true;
  document.body.classList.add('entered');

  const frozenPv = (() => {
    if (paramMod !== null && !Number.isNaN(paramMod)) {
      return lerp(TIMELINE.modPv[0], TIMELINE.modPv[1], clamp(paramMod, 0, 1));
    }
    if (paramV !== null && !Number.isNaN(paramV)) return clamp(paramV, 0, TOTAL_STORY_VH + 120);
    if (paramP !== null && !Number.isNaN(paramP)) return clamp(paramP, 0, 1) * TOTAL_STORY_VH;
    return null;
  })();

  let progressPv = frozenPv !== null ? frozenPv : 0;
  let targetPv = progressPv;

  function resizeCanvas() {
    const w = VW();
    const h = VH();
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('langchange', () => {
    firstScreen.redraw();
  });

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      sfx('click', 0.25);
      if (contentEl) {
        contentEl.scrollIntoView({ behavior: isReducedMotion() ? 'auto' : 'smooth' });
      }
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      sfx('click', 0.25);
      window.scrollTo(0, 0);
      progressPv = 0;
      targetPv = 0;
    });
  }

  if (logoTopLink) {
    logoTopLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  updateLoaderText(100);
  document.body.classList.add('ready');

  const hash = window.location.hash;
  const isDeepLink =
    params.has('nostory') ||
    ['#about', '#numbers', '#work', '#contact', '#content'].includes(hash);
  if (isDeepLink) {
    const targetBlock = (hash && document.querySelector(hash)) || contentEl;
    if (targetBlock) {
      window.setTimeout(() => targetBlock.scrollIntoView({ behavior: 'auto', block: 'start' }), 40);
    }
  }

  let lastTime = performance.now();
  let eraAnnounced = false;

  function drawFrame(now = performance.now()) {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    if (contentEl) {
      const cRect = contentEl.getBoundingClientRect();
      const isPastStory = cRect.top < window.innerHeight * 0.6;
      headerEl?.classList.toggle('past-story', isPastStory);
      document.body.classList.toggle('past-story', isPastStory);

      if (cRect.top <= 0 && frozenPv === null) {
        if (canvas.style.visibility !== 'hidden') {
          canvas.style.visibility = 'hidden';
          document.body.classList.add('content-covered');
        }
        requestAnimationFrame(drawFrame);
        return;
      } else if (canvas.style.visibility === 'hidden') {
        canvas.style.visibility = 'visible';
        document.body.classList.remove('content-covered');
      }
    }

    if (frozenPv !== null) {
      targetPv = frozenPv;
      progressPv = frozenPv;
    } else {
      const rawPv = (window.scrollY / Math.max(1, window.innerHeight)) * 100;
      targetPv = clamp(rawPv, 0, TOTAL_STORY_VH + 100);
      progressPv += (targetPv - progressPv) * (1 - Math.exp(-dt * 5));
    }

    const tState = computeTimelineState(progressPv, paramMod);
    document.body.classList.toggle('at-end', tState.atEnd);
    headerEl?.classList.toggle('scrolled', window.scrollY > 20);

    if (tState.mod >= 0.015 && !eraAnnounced) {
      eraAnnounced = true;
      if (eraAnnouncer) {
        eraAnnouncer.textContent = 'Switching to the modern setup';
      }
    } else if (tState.mod <= 0.002 && eraAnnounced) {
      eraAnnounced = false;
      if (eraAnnouncer) eraAnnouncer.textContent = '';
    }

    const w = canvas.width;
    const h = canvas.height;
    const rm = isReducedMotion();

    // 1. Studio Room Background (lerp warm haze to deep night navy)
    const k = tState.gradeK;
    ctx.fillStyle = k > 0.5 ? '#0B1020' : '#141B33';
    ctx.fillRect(0, 0, w, h);

    // Subtle studio wall & desk silhouette
    const deskY = h * lerp(0.84, 0.72, tState.pullT);
    ctx.fillStyle = tState.blankBell > 0.1 && !rm ? '#8E6D4F' : '#1A223D';
    ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, deskY - h * 0.08);

    // Desk surface
    ctx.fillStyle = tState.blankBell > 0.1 && !rm ? '#A68260' : '#4A3525';
    ctx.fillRect(w * 0.12, deskY, w * 0.76, h * 0.06);

    // Blank Beat soft light pulse
    if (!rm && tState.blankBell > 0.01) {
      const pulseGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 20, w * 0.5, h * 0.48, w * 0.45);
      pulseGrad.addColorStop(0, `rgba(124, 92, 255, ${(0.28 * tState.blankBell).toFixed(3)})`);
      pulseGrad.addColorStop(1, 'rgba(124, 92, 255, 0)');
      ctx.fillStyle = pulseGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Monitor framing scale based on camera pullT & pushZ
    const monitorScale = lerp(0.76, 0.42, tState.pullT) * lerp(1.0, 1.85, tState.pushZ);
    const monW = Math.min(w * 0.86, w * monitorScale);
    const monH = monW * (tState.isNewEra ? 9 / 16 : 3 / 4);
    const monX = (w - monW) * 0.5;
    const monY = deskY - monH - h * 0.04;

    if (!tState.isNewEra) {
      // OLD ERA CRT MONITOR (mod 0.00 - 0.50)
      const dissolveAlpha = rm ? 1 - range(tState.mod, 0.2, 0.8) : 1 - tState.uDissolve;
      if (dissolveAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(dissolveAlpha, 0, 1);
        const liftPx = rm ? 0 : tState.uDissolve * 18;
        ctx.translate(0, -liftPx);

        // Bezel
        ctx.fillStyle = tState.uDissolve > 0.1 ? '#B89470' : '#D8D0C1';
        ctx.fillRect(monX - 18, monY - 18, monW + 36, monH + 36);

        if (tState.uDissolve > 0.05 && tState.uDissolve < 0.95 && !rm) {
          ctx.strokeStyle = '#7C5CFF';
          ctx.lineWidth = 3;
          ctx.strokeRect(monX - 18, monY - 18, monW + 36, monH + 36);
        }

        // CRT Screen with POWER-DOWN collapse (collapseY, collapseX)
        ctx.fillStyle = '#070A14';
        ctx.fillRect(monX, monY, monW, monH);

        const scaleY = rm ? 1 : Math.max(0.008, 1 - tState.collapseY * 0.992);
        const scaleX = rm ? 1 : Math.max(0.008, 1 - tState.collapseX * 0.992);
        const drawW = monW * scaleX;
        const drawH = monH * scaleY;
        const drawX = monX + (monW - drawW) * 0.5;
        const drawY = monY + (monH - drawH) * 0.5;

        if (tState.mod < 0.1 || rm) {
          ctx.drawImage(firstScreen.canvas, drawX, drawY, drawW, drawH);
          if (tState.collapseY > 0.05 && !rm) {
            ctx.fillStyle = `rgba(230, 240, 255, ${clamp(tState.collapseY * 0.85, 0, 1).toFixed(3)})`;
            ctx.fillRect(drawX, drawY, drawW, Math.max(3, drawH));
          }
        }
        ctx.restore();
      }
    } else {
      // NEW ERA MODERN MONITOR (mod 0.50 - 1.00)
      const arr = rm ? range(tState.mod, 0.2, 0.8) : tState.uArrive;
      if (arr > 0.01) {
        ctx.save();
        const sc = rm ? 1.0 : lerp(0.92, 1.0, easeOutBack(arr));
        const cx = monX + monW * 0.5;
        const cy = monY + monH * 0.5;
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);
        ctx.translate(-cx, -cy);

        // Sleek dark bezel
        ctx.fillStyle = arr < 0.5 && !rm ? '#A68260' : '#161D35';
        ctx.fillRect(monX - 10, monY - 10, monW + 20, monH + 20);

        // Bezel sweep highlight during ARRIVE
        if (!rm && arr > 0.05 && arr < 0.98) {
          const sweepX = monX + monW * arr;
          ctx.fillStyle = '#7C5CFF';
          ctx.fillRect(clamp(sweepX - 18, monX, monX + monW), monY - 10, 24, 4);
        }

        // Screen panel BOOT (mod 0.80 - 1.00)
        ctx.fillStyle = '#050811';
        ctx.fillRect(monX, monY, monW, monH);

        const boot = rm ? range(tState.mod, 0.2, 0.8) : tState.uBoot;
        if (boot > 0.01 && modernCanvas) {
          ctx.save();
          ctx.globalAlpha = clamp(boot, 0, 1);
          ctx.drawImage(
            modernCanvas,
            0,
            0,
            modernCanvas.width,
            Math.round(modernCanvas.height * 0.75),
            monX,
            monY,
            monW,
            monH
          );
          // RV emblem scaled 0.9 -> 1.0
          const logoSc = lerp(0.9, 1.0, boot);
          const logoSize = Math.min(monW, monH) * 0.36 * logoSc;
          ctx.drawImage(
            modernCanvas,
            0,
            Math.round(modernCanvas.height * 0.75),
            Math.round(modernCanvas.width * (300 / 1600)),
            Math.round(modernCanvas.height * 0.25),
            cx - logoSize * 0.5,
            cy - logoSize * 0.5,
            logoSize,
            logoSize
          );
          ctx.restore();
        }
        ctx.restore();
      }
    }

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
}
