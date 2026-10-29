import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_STORY_VH,
  clamp,
  range,
  ease,
  easeOutBack,
  computeTimelineState,
  computeTransitionState,
  getFirstUnfinishedGate,
  limitScrollPv,
} from './timeline.js';

test('total chapter height sums to 920 vh', () => {
  assert.equal(TOTAL_STORY_VH, 920);
});

test('math utilities clamp, range, ease, and easeOutBack behave deterministically', () => {
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(range(50, 0, 100), 0.5);
  assert.equal(ease(0), 0);
  assert.equal(ease(0.5), 0.5);
  assert.equal(ease(1), 1);
  assert.equal(easeOutBack(0), 0);
  assert.ok(easeOutBack(0.6) > 1.0, 'easeOutBack overshoots 1.0 mid-curve');
  assert.ok(Math.abs(easeOutBack(1) - 1) < 1e-6);
});

test('computeTimelineState transitions eras at mod = 0.5 (pv = 335)', () => {
  const before = computeTimelineState(290); // mod = 0.25
  assert.equal(before.isNewEra, false);
  assert.ok(before.mod > 0.2 && before.mod < 0.3);

  const after = computeTimelineState(380); // mod = 0.75
  assert.equal(after.isNewEra, true);
  assert.ok(after.mod > 0.7 && after.mod < 0.8);
});

test('computeTransitionState maps all 5 sequence beats onto mod = 0..1 accurately', () => {
  // 1. mod = 0.05 (POWER-DOWN)
  const s05 = computeTransitionState(0.05);
  assert.equal(s05.phaseName, 'power-down');
  assert.ok(s05.collapseY > 0.85, 'CRT has squeezed vertically by mod 0.05');
  assert.ok(s05.collapseX > 0 && s05.collapseX < 0.5, 'CRT begins horizontal collapse around mod 0.05');
  assert.equal(s05.uDissolve, 0);

  // 2. mod = 0.15 & 0.25 (RETIRE)
  const s15 = computeTransitionState(0.15);
  const s25 = computeTransitionState(0.25);
  assert.equal(s15.phaseName, 'retire');
  assert.equal(s25.phaseName, 'retire');
  assert.ok(Math.abs(s15.uDissolve - 0.25) < 1e-6);
  assert.ok(Math.abs(s25.uDissolve - 0.75) < 1e-6);
  assert.equal(s25.isNewEra, false);

  // 3. mod = 0.40 (BLANK BEAT)
  const s40 = computeTransitionState(0.4);
  assert.equal(s40.phaseName, 'blank');
  assert.equal(s40.uDissolve, 1);
  assert.ok(Math.abs(s40.blankBloomDelta - 0.3) < 1e-6, 'Bloom pulse peaks at +0.3 at mod 0.40');
  assert.ok(Math.abs(s40.blankFovDelta - -2.0) < 1e-6, 'Camera FOV delta peaks at -2 deg at mod 0.40');

  // 4. mod = 0.60 & 0.75 (ARRIVE)
  const s60 = computeTransitionState(0.6);
  const s75 = computeTransitionState(0.75);
  assert.equal(s60.phaseName, 'arrive');
  assert.equal(s75.phaseName, 'arrive');
  assert.equal(s60.isNewEra, true);
  assert.ok(s60.uArrive > 0.3 && s60.uArrive < 0.35);
  assert.ok(s75.uArrive > 0.8 && s75.uArrive < 0.85);
  assert.equal(s75.uBoot, 0);

  // 5. mod = 0.90 (BOOT)
  const s90 = computeTransitionState(0.9);
  assert.equal(s90.phaseName, 'boot');
  assert.ok(Math.abs(s90.uBoot - 0.5) < 1e-6);
  assert.ok(s90.bootBloomDelta > 0);
});

test('scroll gating clamps pv at the first unfinished gate', () => {
  const gates = {
    hold: { done: false },
    statement: { done: false },
    error: { done: false },
    success: { done: false },
  };
  assert.equal(getFirstUnfinishedGate(gates).id, 'hold');
  assert.equal(limitScrollPv(650, gates), 600);

  gates.hold.done = true;
  assert.equal(getFirstUnfinishedGate(gates).id, 'statement');
  assert.equal(limitScrollPv(720, gates), 705);

  gates.statement.done = true;
  gates.error.done = true;
  gates.success.done = true;
  assert.equal(getFirstUnfinishedGate(gates), null);
  assert.equal(limitScrollPv(900, gates), 900);
});
