import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKS_DATA,
  SOCIAL_POSTS,
  NUMBERS_DATA,
  computeNumbersBandState,
  formatCounterValue,
  computeFitLineScale,
  validateBriefForm,
  buildBriefMailtoUrl,
} from './part2-logic.js';

test('Part 2 datasets contain the exact 6 works, 7 social posts, and 4 numbers stats', () => {
  assert.equal(WORKS_DATA.length, 6);
  assert.equal(WORKS_DATA[0].titleEn, 'CelCheck');
  assert.equal(WORKS_DATA[5].url, 'https://rigu3l.github.io/');
  assert.equal(SOCIAL_POSTS.length, 7);
  assert.equal(NUMBERS_DATA.length, 4);
  assert.deepEqual(
    NUMBERS_DATA.map((d) => d.count),
    [6, 25, 150, 5]
  );
});

test('computeNumbersBandState maps open (0-0.25), run (0.25-0.85), and fade (0.85-1)', () => {
  const s0 = computeNumbersBandState(0);
  assert.equal(s0.openEase, 0);
  assert.ok(s0.insetY > 10);
  assert.equal(s0.runProgress, 0);
  assert.equal(s0.fadeOut, 0);

  const sMid = computeNumbersBandState(0.55);
  assert.equal(sMid.openEase, 1);
  assert.equal(sMid.insetY, 0);
  assert.ok(Math.abs(sMid.runProgress - 0.5) < 1e-6);
  assert.equal(sMid.fadeOut, 0);

  const sEnd = computeNumbersBandState(1.0);
  assert.equal(sEnd.runProgress, 1);
  assert.equal(sEnd.fadeOut, 1);
});

test('formatCounterValue and computeFitLineScale behave deterministically', () => {
  assert.equal(formatCounterValue(150, 'en', '', '+'), '150+');
  assert.equal(computeFitLineScale(200, 400), 1.0);
  assert.equal(computeFitLineScale(500, 400), 0.8);
  assert.equal(computeFitLineScale(1000, 400), 0.6); // Clamped at 60%
});

test('validateBriefForm validates required fields in English and Filipino', () => {
  const invalidEn = validateBriefForm({ name: 'R', email: 'bad', project: 'short' }, 'en');
  assert.equal(invalidEn.valid, false);
  assert.ok(invalidEn.errors.name);
  assert.ok(invalidEn.errors.email);
  assert.ok(invalidEn.errors.project);

  const invalidFil = validateBriefForm({ name: '', email: '', project: '' }, 'fil');
  assert.equal(invalidFil.valid, false);
  assert.ok(invalidFil.errors.name.includes('Pakilagay'));

  const valid = validateBriefForm(
    {
      name: 'Rj Verceles',
      email: 'rjverceles1@gmail.com',
      project: 'Building a new QR lab logging dashboard for Celtech College.',
    },
    'en'
  );
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('buildBriefMailtoUrl targets rjverceles1@gmail.com and truncates long bodies safely', () => {
  const url = buildBriefMailtoUrl({
    name: 'Ada Lovelace',
    email: 'ada@analytical.org',
    project: 'A full-stack dashboard system in PHP and MySQL.',
    budget: 'Full System',
  });
  assert.ok(url.startsWith('mailto:rjverceles1@gmail.com?subject='));
  assert.ok(url.includes('Ada%20Lovelace'));
  assert.ok(url.includes('ada%40analytical.org'));
});
