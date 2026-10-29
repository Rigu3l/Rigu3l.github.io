/**
 * Web Audio API + HTMLAudioElement procedural sound engine.
 * Synthesizes an ambient pad WAV loop for HTMLAudioElement routed through a GainNode,
 * plus pre-decoded AudioBuffers for SFX (click, start, next, error, done, powerdown, whoosh, boot)
 * and the hold riser.
 */

const SOUND_STORAGE_KEY = 'rj_portfolio_sound';

let ctx = null;
let audioEl = null;
let mediaSource = null;
let musicGain = null;
let buffersReady = false;
const sfxBuffers = {};
let riserBuffer = null;
let activeRiser = null;

let soundEnabled = true;
let musicStarted = false;
let unlocked = false;

try {
  const saved = window.localStorage.getItem(SOUND_STORAGE_KEY);
  if (saved === 'off') soundEnabled = false;
} catch (e) {}

/**
 * Encodes a stereo Float32 PCM array pair into a WAV Blob URL for HTMLAudioElement.
 */
function createProceduralAmbientWavUrl(sampleRate = 22050, durationSec = 8) {
  const numSamples = sampleRate * durationSec;
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Frequencies that loop seamlessly over 8 seconds (integer cycles in 8s)
  const freqs = [110.0, 165.0, 220.0, 277.25, 330.0, 440.0];
  const amps = [0.28, 0.22, 0.18, 0.12, 0.11, 0.06];

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const lfo = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / durationSec);
    let sampleL = 0;
    let sampleR = 0;
    for (let k = 0; k < freqs.length; k++) {
      const f = freqs[k];
      const a = amps[k];
      const phaseMod = 0.08 * Math.sin((2 * Math.PI * (k + 1) * t) / durationSec);
      sampleL += a * Math.sin(2 * Math.PI * f * t + phaseMod);
      sampleR += a * Math.sin(2 * Math.PI * f * t - phaseMod + k * 0.4);
    }
    const valL = Math.max(-1, Math.min(1, sampleL * lfo * 0.55));
    const valR = Math.max(-1, Math.min(1, sampleR * lfo * 0.55));
    view.setInt16(offset, valL * 32767, true);
    view.setInt16(offset + 2, valR * 32767, true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function ensureContext() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (navigator.audioSession) {
    try {
      navigator.audioSession.type = 'playback';
    } catch (e) {}
  }

  ctx = new AudioCtx();
  musicGain = ctx.createGain();
  musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicGain.connect(ctx.destination);

  audioEl = new Audio();
  audioEl.loop = true;
  audioEl.preload = 'auto';
  audioEl.crossOrigin = 'anonymous';
  audioEl.src = createProceduralAmbientWavUrl();

  try {
    mediaSource = ctx.createMediaElementSource(audioEl);
    mediaSource.connect(musicGain);
  } catch (e) {}

  return ctx;
}

function buildSfxBuffers() {
  if (buffersReady || !ctx) return;
  buffersReady = true;
  const sr = ctx.sampleRate;

  // 1. click: crisp tactile mechanical click
  {
    const len = Math.floor(sr * 0.055);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 95);
      d[i] = (Math.sin(2 * Math.PI * 1150 * t) * 0.7 + Math.sin(2 * Math.PI * 2400 * t) * 0.3) * env;
    }
    sfxBuffers.click = buf;
  }

  // 2. start: warm CRT power-on & connection chime
  {
    const len = Math.floor(sr * 0.55);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.sin(Math.min(1, t / 0.02) * (Math.PI / 2)) * Math.exp(-t * 5.2);
      const f1 = 220 + 220 * Math.min(1, t / 0.14);
      const f2 = f1 * 1.5;
      d[i] = (Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.4) * env;
    }
    sfxBuffers.start = buf;
  }

  // 3. next: clean forward two-tone confirmation
  {
    const len = Math.floor(sr * 0.32);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = t < 0.09 ? 440 : 587.33;
      const env = Math.exp(-t * 10);
      d[i] = (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2 * t) * 0.25) * env;
    }
    sfxBuffers.next = buf;
  }

  // 4. error: low dissonant buzz
  {
    const len = Math.floor(sr * 0.45);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 6.5);
      const pulse = Math.sin(2 * Math.PI * 16 * t) > 0 ? 1 : 0.65;
      const wave =
        Math.sin(2 * Math.PI * 130.81 * t) * 0.55 +
        Math.sin(2 * Math.PI * 138.59 * t) * 0.45 +
        Math.sin(2 * Math.PI * 261.63 * t) * 0.25;
      d[i] = Math.tanh(wave * 2.2) * env * pulse * 0.8;
    }
    sfxBuffers.error = buf;
  }

  // 5. done: bright triad resolution chord
  {
    const len = Math.floor(sr * 0.85);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const notes = [440, 554.37, 659.25, 880];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.025) * Math.exp(-t * 3.8);
      let s = 0;
      for (let n = 0; n < notes.length; n++) {
        const delay = n * 0.045;
        if (t >= delay) {
          const lt = t - delay;
          s += Math.sin(2 * Math.PI * notes[n] * lt) * Math.exp(-lt * 4.2) * 0.28;
        }
      }
      d[i] = s * env;
    }
    sfxBuffers.done = buf;
  }

  // 6. powerdown (thunk): CRT tube power-down thunk + descending high-voltage beam zip
  {
    const dur = 0.38;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let phaseThunk = 0;
    let phaseZip = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const fThunk = 42 + 115 * Math.exp(-t * 28);
      phaseThunk += (2 * Math.PI * fThunk) / sr;
      const thunkEnv = Math.exp(-t * 16);

      const fZip = 160 + 2400 * Math.pow(Math.max(0, 1 - t / dur), 2.4);
      phaseZip += (2 * Math.PI * fZip) / sr;
      const zipEnv = Math.sin(Math.min(1, t / 0.015) * (Math.PI / 2)) * Math.exp(-t * 9.5);

      d[i] = Math.sin(phaseThunk) * thunkEnv * 0.68 + Math.sin(phaseZip) * zipEnv * 0.28;
    }
    sfxBuffers.powerdown = buf;
    sfxBuffers.thunk = buf;
  }

  // 7. whoosh: Blank-beat low atmospheric whoosh
  {
    const dur = 0.52;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let lp1 = 0;
    let lp2 = 0;
    let subPhase = 0;
    let seed = 1337;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const p = t / dur;
      const bell = Math.sin(p * Math.PI);
      seed = (seed * 16807) % 2147483647;
      const white = (seed - 1073741823) / 1073741823;
      const cutoff = 0.03 + 0.08 * bell;
      lp1 += cutoff * (white - lp1);
      lp2 += cutoff * (lp1 - lp2);

      const fSub = 56 + 38 * bell;
      subPhase += (2 * Math.PI * fSub) / sr;
      d[i] = (lp2 * 0.85 + Math.sin(subPhase) * 0.42) * bell * 0.85;
    }
    sfxBuffers.whoosh = buf;
  }

  // 8. boot: Modern screen boot chime (warm crystalline fifth/ninth chord)
  {
    const dur = 0.68;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const notes = [523.25, 783.99, 987.77, 1174.66]; // C5, G5, B5, D6
    const weights = [0.38, 0.28, 0.18, 0.16];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const attack = Math.sin(Math.min(1, t / 0.035) * (Math.PI / 2));
      const decay = Math.exp(-t * 4.6);
      let s = 0;
      for (let n = 0; n < notes.length; n++) {
        const delay = n * 0.025;
        if (t >= delay) {
          const lt = t - delay;
          s += Math.sin(2 * Math.PI * notes[n] * lt) * weights[n] * Math.exp(-lt * (3.5 + n * 0.6));
        }
      }
      d[i] = s * attack * decay;
    }
    sfxBuffers.boot = buf;
  }

  // 9. riser: 3.6s stretched harmonic build-up for hold-to-update
  {
    const dur = 3.6;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let phase1 = 0;
    let phase2 = 0;
    let phase3 = 0;
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const fBase = 140 + 520 * Math.pow(p, 1.75);
      phase1 += (2 * Math.PI * fBase) / sr;
      phase2 += (2 * Math.PI * fBase * 1.498) / sr;
      phase3 += (2 * Math.PI * fBase * 2.01) / sr;
      const shimmer = 0.75 + 0.25 * Math.sin(2 * Math.PI * (6 + p * 18) * (i / sr));
      d[i] =
        (Math.sin(phase1) * 0.5 + Math.sin(phase2) * 0.32 + Math.sin(phase3) * 0.18) *
        shimmer *
        (0.35 + 0.65 * p);
    }
    riserBuffer = buf;
  }
}

function updateSoundButtonUI() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
}

function syncMusicGain(fadeSec = 0.35) {
  if (!ctx || !musicGain) return;
  const now = ctx.currentTime;
  const target = soundEnabled && musicStarted && !document.hidden ? 0.32 : 0.0001;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now);
  musicGain.gain.linearRampToValueAtTime(target, now + fadeSec);
}

/**
 * Starts the ambient loop with a 2.5s fade-in.
 */
export function startMusic() {
  ensureContext();
  buildSfxBuffers();
  musicStarted = true;
  if (!ctx || !audioEl) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  audioEl.play().catch(() => {});
  syncMusicGain(2.5);
}

export function playMusic() {
  soundEnabled = true;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'on');
  } catch (e) {}
  updateSoundButtonUI();
  ensureContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (musicStarted && audioEl) {
    audioEl.play().catch(() => {});
    syncMusicGain(0.5);
  }
}

export function muteMusic() {
  soundEnabled = false;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, 'off');
  } catch (e) {}
  updateSoundButtonUI();
  syncMusicGain(0.25);
  riser.stop(0.1);
}

export function toggleSound() {
  if (soundEnabled) {
    muteMusic();
  } else {
    playMusic();
    sfx('click', 0.25);
  }
}

/**
 * Plays a pre-decoded SFX buffer ('click' | 'start' | 'next' | 'error' | 'done' | 'powerdown' | 'whoosh' | 'boot').
 * Volume is clamped below the music level (0.32) so SFX never overpower the ambient pad.
 */
export function sfx(name, vol = 0.24) {
  if (!soundEnabled) return;
  ensureContext();
  buildSfxBuffers();
  if (!ctx || !sfxBuffers[name]) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const src = ctx.createBufferSource();
    src.buffer = sfxBuffers[name];
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.28, Math.max(0.01, vol)), ctx.currentTime);
    src.connect(g);
    g.connect(ctx.destination);
    src.start(0);
  } catch (e) {}
}

/**
 * Stretched build-up riser controller for the 2-stage hold mechanic.
 */
export const riser = {
  start(frac = 0) {
    if (!soundEnabled) return;
    ensureContext();
    buildSfxBuffers();
    if (!ctx || !riserBuffer) return;
    this.stop(0.04);

    try {
      const src = ctx.createBufferSource();
      src.buffer = riserBuffer;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.12);
      src.connect(g);
      g.connect(ctx.destination);

      const offset = Math.max(0, Math.min(riserBuffer.duration - 0.1, frac * riserBuffer.duration));
      src.start(0, offset);
      activeRiser = { src, gain: g };
    } catch (e) {}
  },
  stop(sec = 0.18) {
    if (!activeRiser || !ctx) return;
    const { src, gain } = activeRiser;
    activeRiser = null;
    try {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.02, sec));
      src.stop(now + Math.max(0.03, sec + 0.02));
    } catch (e) {}
  },
};

function handleFirstGesture() {
  ensureContext();
  buildSfxBuffers();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (!unlocked && audioEl) {
    unlocked = true;
    if (musicStarted && soundEnabled) {
      audioEl.play().catch(() => {});
      syncMusicGain(1.2);
    } else {
      // Silent unlock play on iOS so later startMusic() works anywhere
      musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      const p = audioEl.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (!musicStarted) {
            audioEl.pause();
            audioEl.currentTime = 0;
          }
        }).catch(() => {});
      }
    }
  }
}

export function initMusic() {
  updateSoundButtonUI();

  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      toggleSound();
    });
  }

  const unlockEvents = ['touchstart', 'pointerdown', 'touchend', 'pointerup', 'click', 'keydown'];
  const onGesture = () => {
    handleFirstGesture();
  };
  unlockEvents.forEach((ev) => {
    window.addEventListener(ev, onGesture, { capture: true, passive: true, once: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!audioEl || !ctx) return;
    if (document.hidden) {
      syncMusicGain(0.2);
      audioEl.pause();
    } else if (musicStarted && soundEnabled) {
      audioEl.play().catch(() => {});
      syncMusicGain(0.6);
    }
  });
}

// Auto-initialize when loaded as a module from index.html
initMusic();
