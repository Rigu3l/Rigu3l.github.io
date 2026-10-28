/**
 * Procedural Web Audio API Sound Manager
 * Zero external MP3 dependencies (0 404s, instant load).
 * Synthesizes soft tactile hover ticks, clicks, chapter whooshes,
 * Pong arcade blips, and a warm low-pass ambient studio drone.
 */

const STORAGE_KEY = 'riguel_portfolio_sound_enabled';

let audioCtx = null;
let ambientGain = null;
let ambientOscA = null;
let ambientOscB = null;
let isMuted = true;
let isPausedForOverlay = false;

function ensureContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function startAmbientLoop() {
  const ctx = ensureContext();
  if (!ctx || ambientOscA) return;

  try {
    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, ctx.currentTime);

    ambientOscA = ctx.createOscillator();
    ambientOscB = ctx.createOscillator();
    ambientOscA.type = 'sine';
    ambientOscB.type = 'triangle';
    ambientOscA.frequency.setValueAtTime(110, ctx.currentTime); // A2
    ambientOscB.frequency.setValueAtTime(164.81, ctx.currentTime); // E3 fifth

    ambientOscA.connect(filter);
    ambientOscB.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(ctx.destination);

    ambientOscA.start();
    ambientOscB.start();

    if (!isMuted && !isPausedForOverlay) {
      ambientGain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.8);
    }
  } catch {
    // Ignore audio context restrictions prior to gesture
  }
}

function updateAmbientVolume() {
  if (!audioCtx || !ambientGain) return;
  const now = audioCtx.currentTime;
  const target = !isMuted && !isPausedForOverlay ? 0.018 : 0.0001;
  try {
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(Math.max(0.0001, ambientGain.gain.value), now);
    ambientGain.gain.exponentialRampToValueAtTime(target, now + 0.35);
  } catch {
    // Fallback
  }
}

export function playHoverTick() {
  if (isMuted || isPausedForOverlay) return;
  const ctx = ensureContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
}

export function playClickSound() {
  if (isMuted) return;
  const ctx = ensureContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch {}
}

export function playChapterWhoosh() {
  if (isMuted || isPausedForOverlay) return;
  const ctx = ensureContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(290, ctx.currentTime + 0.14);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.29);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export function playPongBeep(freq = 520) {
  if (isMuted) return;
  const ctx = ensureContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  } catch {}
}

export function setSoundEnabled(enabled, fromUserGesture = false) {
  isMuted = !enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}

  if (fromUserGesture && enabled) {
    ensureContext();
    startAmbientLoop();
  }
  updateAmbientVolume();
  syncSoundButtonsUI();
}

export function isSoundEnabled() {
  return !isMuted;
}

export function setOverlayAudioPause(paused) {
  isPausedForOverlay = paused;
  updateAmbientVolume();
}

function syncSoundButtonsUI() {
  const buttons = document.querySelectorAll('[data-sound-toggle]');
  buttons.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(!isMuted));
    const labelEl = btn.querySelector('[data-sound-label]');
    if (labelEl) {
      labelEl.textContent = isMuted ? 'Sound: Off' : 'Sound: On';
    } else {
      btn.textContent = isMuted ? 'Sound: Off' : 'Sound: On';
    }
  });
}

export function initSound() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Default off until user opts in
    isMuted = saved === 'true' ? false : true;
  } catch {
    isMuted = true;
  }

  syncSoundButtonsUI();

  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (!target) return;
    const soundBtn = target.closest('[data-sound-toggle]');
    if (soundBtn) {
      setSoundEnabled(isMuted, true);
      playClickSound();
      return;
    }

    if (target.closest('a, button')) {
      playClickSound();
    }
  });

  document.addEventListener(
    'pointerenter',
    (e) => {
      const target = /** @type {HTMLElement | null} */ (e.target);
      if (target && target.matches && target.matches('a, button, [data-cursor]')) {
        playHoverTick();
      }
    },
    true
  );
}
