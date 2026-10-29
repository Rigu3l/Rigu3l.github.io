/**
 * Pure scroll-timeline constants, math helpers, and scroll-gate limit calculations.
 * Kept decoupled from DOM/WebGL so deterministic unit tests can verify all transitions.
 */

export const CHAPTERS = [
  { id: 'screen', vh: 60 },
  { id: 'room', vh: 140 },
  { id: 'hold', vh: 40 },
  { id: 'modern', vh: 220 },
  { id: 'tech', vh: 80 },
  { id: 'push', vh: 70 },
  { id: 'os', vh: 100 },
  { id: 'dialogs', vh: 90 },
  { id: 'exit', vh: 70 },
  { id: 'end', vh: 50 },
];

export const TOTAL_STORY_VH = CHAPTERS.reduce((acc, c) => acc + c.vh, 0); // 920 vh

export const OS_TIMES = {
  in: [425, 445],
  gates: {
    hold: { id: 'hold', show: 586, at: 600, next: 602 },
    statement: { id: 'statement', show: 692, at: 705, next: 719 },
    error: { id: 'error', show: 718, at: 735, next: 749 },
    success: { id: 'success', show: 748, at: 765, next: 830 },
  },
  out: [772, 830],
};

/**
 * Enhanced "old PC to modern PC" 5-beat transition constants (mapped onto mod = 0..1).
 */
export const TRANSITION_CONSTANTS = {
  // 1. POWER-DOWN (mod 0.00 - 0.10): CRT squeezes vertically -> shrinks horizontally -> fades; lamp flickers & dims
  powerDownMod: [0.0, 0.1],
  collapseYMod: [0.0, 0.055],
  collapseXMod: [0.045, 0.09],
  crtPowerFadeMod: [0.075, 0.1],
  afterglowMs: 300,

  // 2. RETIRE (mod 0.10 - 0.30): Old PC & desk props pixel-dissolve with accent edge + slight upward lift; Wave A links
  retireMod: [0.1, 0.3],
  retireLiftM: 0.045,
  dissolveEdgeWidth: 0.11,

  // 3. BLANK BEAT (mod 0.30 - 0.50): Cardboard silhouettes only, bloom +0.3 pulse (~400ms), low whoosh SFX, camera FOV -2 deg
  blankMod: [0.3, 0.5],
  blankBloomPulse: 0.3,
  blankPulseMs: 400,
  blankFovDeltaDeg: -2.0,

  // 4. ARRIVE (mod 0.50 - 0.80): New meshes scale 0.92 -> 1 with easeOutBack (delayed by aEraD), Wave B reveals, bezel sweep
  swapMod: 0.5,
  arriveMod: [0.5, 0.8],
  arriveScaleFrom: 0.92,
  arriveOvershoot: 1.70158,

  // 5. BOOT (mod 0.80 - 1.00): Modern screen brightens with bloom flash, wallpaper fades in, RV logo scales 0.9 -> 1 with glow
  bootMod: [0.8, 1.0],
  bootLogoScaleFrom: 0.9,
  bootBloomPulse: 0.25,
};

export const TIMELINE = {
  pullBackSpan: 200,
  pullBackCamera: [0.12, 0.66],
  hazeClear: [0.18, 0.78],
  cardReveal: [0.42, 0.9],
  cardRevealRadius: 3.2,
  cardFloor: [0.7, 0.95],
  cardFloorMax: 0.1,
  wall1InP1: [0.6, 0.76],
  wall1OutPv: [225, 255],
  modPv: [245, 425],
  waveAMod: [0.02, 0.3],
  waveBMod: [0.5, 0.8],
  waveRange: [-0.2, 3.4],
  gradeMod: [0.05, 0.9],
  ledMod: [0.52, 0.88],
  wall2InPv: [430, 470],
  wall2OutPv: [500, 522],
  pushInPv: [510, 575],
  exitPv: [772, 830],
  endAtPv: 815,
  os: OS_TIMES,
  transition: TRANSITION_CONSTANTS,
};

export function clamp(x, min = 0, max = 1) {
  return x < min ? min : x > max ? max : x;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function range(x, a, b) {
  if (a === b) return x >= b ? 1 : 0;
  return clamp((x - a) / (b - a), 0, 1);
}

export function ease(t) {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function easeOutBack(t, overshoot = TRANSITION_CONSTANTS.arriveOvershoot) {
  const c = clamp(t, 0, 1);
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + overshoot * Math.pow(c - 1, 2);
}

/**
 * Computes the 5-stage old-PC-to-modern-PC transition parameters for a given `mod` in [0, 1].
 */
export function computeTransitionState(modInput) {
  const mod = clamp(modInput, 0, 1);
  const tc = TRANSITION_CONSTANTS;

  // Phase 1: POWER-DOWN (0.00 - 0.10)
  const collapseY = ease(range(mod, tc.collapseYMod[0], tc.collapseYMod[1]));
  const collapseX = ease(range(mod, tc.collapseXMod[0], tc.collapseXMod[1]));
  const crtPowerFade = 1 - ease(range(mod, tc.crtPowerFadeMod[0], tc.crtPowerFadeMod[1]));

  // Deterministic single lamp flicker & dim curve across mod 0.00 - 0.10
  let oldLampFlicker = 1.0;
  if (mod > 0 && mod < tc.powerDownMod[1]) {
    const p = mod / tc.powerDownMod[1]; // 0..1
    if (p < 0.25) {
      oldLampFlicker = lerp(1.0, 0.28, p / 0.25);
    } else if (p < 0.48) {
      oldLampFlicker = lerp(0.28, 1.32, (p - 0.25) / 0.23);
    } else {
      oldLampFlicker = lerp(1.32, 0.18, ease((p - 0.48) / 0.52));
    }
  } else if (mod >= tc.powerDownMod[1]) {
    oldLampFlicker = lerp(0.18, 0.0, range(mod, 0.1, 0.3));
  }

  // Phase 2: RETIRE (0.10 - 0.30)
  const uDissolve = range(mod, tc.retireMod[0], tc.retireMod[1]);

  // Phase 3: BLANK BEAT (0.30 - 0.50)
  const inBlankBeat = mod >= tc.blankMod[0] && mod <= tc.blankMod[1];
  const blankPhase = range(mod, tc.blankMod[0], tc.blankMod[1]);
  const blankBell = inBlankBeat ? Math.sin(blankPhase * Math.PI) : 0;
  const blankBloomDelta = tc.blankBloomPulse * blankBell;
  const blankFovDelta = tc.blankFovDeltaDeg * blankBell;

  // Phase 4: ARRIVE (0.50 - 0.80)
  const isNewEra = mod >= tc.swapMod;
  const uArrive = range(mod, tc.arriveMod[0], tc.arriveMod[1]);

  // Phase 5: BOOT (0.80 - 1.00)
  const uBoot = range(mod, tc.bootMod[0], tc.bootMod[1]);
  const bootFlashBell =
    mod >= tc.bootMod[0] && mod <= 0.92
      ? Math.sin(range(mod, tc.bootMod[0], 0.92) * Math.PI)
      : 0;
  const bootBloomDelta = tc.bootBloomPulse * bootFlashBell;

  let phaseName = 'idle';
  if (mod > 0 && mod < tc.powerDownMod[1]) phaseName = 'power-down';
  else if (mod >= tc.retireMod[0] && mod < tc.retireMod[1]) phaseName = 'retire';
  else if (mod >= tc.blankMod[0] && mod < tc.blankMod[1]) phaseName = 'blank';
  else if (mod >= tc.arriveMod[0] && mod < tc.arriveMod[1]) phaseName = 'arrive';
  else if (mod >= tc.bootMod[0] && mod <= tc.bootMod[1]) phaseName = 'boot';

  return {
    mod,
    phaseName,
    collapseY,
    collapseX,
    crtPowerFade,
    oldLampFlicker,
    uDissolve,
    inBlankBeat,
    blankBell,
    blankBloomDelta,
    blankFovDelta,
    isNewEra,
    uArrive,
    uBoot,
    bootBloomDelta,
  };
}

/**
 * Computes all normalized timeline parameters for a given story scroll position `pv` (in vh).
 */
export function computeTimelineState(pv, forcedMod = null) {
  const p1 = clamp(pv / TIMELINE.pullBackSpan, 0, 1);
  const pullT = ease(range(p1, TIMELINE.pullBackCamera[0], TIMELINE.pullBackCamera[1]));
  const hazeR = ease(range(p1, TIMELINE.hazeClear[0], TIMELINE.hazeClear[1]));
  const uReveal = lerp(
    0,
    TIMELINE.cardRevealRadius,
    ease(range(p1, TIMELINE.cardReveal[0], TIMELINE.cardReveal[1]))
  );
  const uCardFloor = TIMELINE.cardFloorMax * ease(range(p1, TIMELINE.cardFloor[0], TIMELINE.cardFloor[1]));

  const wall1In = ease(range(p1, TIMELINE.wall1InP1[0], TIMELINE.wall1InP1[1]));
  const wall1Out = ease(range(pv, TIMELINE.wall1OutPv[0], TIMELINE.wall1OutPv[1]));

  const rawMod = range(pv, TIMELINE.modPv[0], TIMELINE.modPv[1]);
  const mod = forcedMod !== null && !Number.isNaN(forcedMod) ? clamp(forcedMod, 0, 1) : rawMod;

  const waveA = lerp(
    TIMELINE.waveRange[0],
    TIMELINE.waveRange[1],
    ease(range(mod, TIMELINE.waveAMod[0], TIMELINE.waveAMod[1]))
  );
  const waveB =
    mod < TIMELINE.waveBMod[0]
      ? -1
      : lerp(
          TIMELINE.waveRange[0],
          TIMELINE.waveRange[1],
          ease(range(mod, TIMELINE.waveBMod[0], TIMELINE.waveBMod[1]))
        );

  const trans = computeTransitionState(mod);

  const gradeK = ease(range(mod, TIMELINE.gradeMod[0], TIMELINE.gradeMod[1]));
  const ledIntensity = 10 * ease(range(mod, TIMELINE.ledMod[0], TIMELINE.ledMod[1]));
  const isNewEra = trans.isNewEra;

  const wall2In = ease(range(pv, TIMELINE.wall2InPv[0], TIMELINE.wall2InPv[1]));
  const wall2Out = ease(range(pv, TIMELINE.wall2OutPv[0], TIMELINE.wall2OutPv[1]));

  const pushIn = ease(range(pv, TIMELINE.pushInPv[0], TIMELINE.pushInPv[1]));
  const pushOut = ease(range(pv, TIMELINE.exitPv[0], TIMELINE.exitPv[1]));
  const pushZ = pushIn * (1 - pushOut);

  const osIn = ease(range(pv, OS_TIMES.in[0], OS_TIMES.in[1]));
  const osOut = ease(range(pv, OS_TIMES.out[0], OS_TIMES.out[1]));
  const osOpacity = clamp(osIn * (1 - osOut), 0, 1);
  const osLive = pv >= OS_TIMES.in[1] && pv <= OS_TIMES.out[0];

  const atEnd = pv >= TIMELINE.endAtPv;

  return {
    pv,
    p1,
    pullT,
    hazeR,
    uReveal,
    uCardFloor,
    wall1In,
    wall1Out,
    mod,
    waveA,
    waveB,
    gradeK,
    ledIntensity,
    isNewEra,
    collapseY: trans.collapseY,
    collapseX: trans.collapseX,
    crtPowerFade: trans.crtPowerFade,
    oldLampFlicker: trans.oldLampFlicker,
    uDissolve: trans.uDissolve,
    blankBell: trans.blankBell,
    blankBloomDelta: trans.blankBloomDelta,
    blankFovDelta: trans.blankFovDelta,
    uArrive: trans.uArrive,
    uBoot: trans.uBoot,
    bootBloomDelta: trans.bootBloomDelta,
    phaseName: trans.phaseName,
    wall2In,
    wall2Out,
    pushIn,
    pushOut,
    pushZ,
    osIn,
    osOut,
    osOpacity,
    osLive,
    atEnd,
  };
}

/**
 * Returns the first unfinished gate in sequence, or null if all gates are completed.
 */
export function getFirstUnfinishedGate(gateStateMap) {
  const order = ['hold', 'statement', 'error', 'success'];
  for (const key of order) {
    const gateSpec = OS_TIMES.gates[key];
    const done = gateStateMap && gateStateMap[key] && gateStateMap[key].done;
    if (!done) {
      return gateSpec;
    }
  }
  return null;
}

/**
 * Clamps the story scroll position `pv` to the first unfinished gate's `at` point.
 */
export function limitScrollPv(pv, gateStateMap) {
  const firstGate = getFirstUnfinishedGate(gateStateMap);
  if (!firstGate) return pv;
  return Math.min(pv, firstGate.at);
}
