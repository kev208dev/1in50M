import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverrideRate, resolveAgencyChoice } from '../dist/engine/agency.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';
import { DECISION_BY_ID } from '../dist/data/decisions.js';

const extremeLife = makeLifeAtAge(24, {
  profile: { personality: { strength: 'extreme', dominant: 'impulsive', label: '극도로 충동적' } },
});
const choices = [
  { id: 'plan', label: '계획한다', enabled: true, personalityTags: ['calm'] },
  { id: 'jump', label: '바로 뛰어든다', enabled: true, personalityTags: ['impulsive'] },
];

test('강한 성격은 12%, 극단 성격은 28% 임계값을 쓴다', () => {
  assert.equal(getOverrideRate({ strength: 'mixed' }), 0);
  assert.equal(getOverrideRate({ strength: 'strong' }), 0.12);
  assert.equal(getOverrideRate({ strength: 'extreme' }), 0.28);
});

test('보호 결정과 성향에 맞는 유효 선택지가 없으면 사용자 선택을 지킨다', () => {
  const protectedResult = resolveAgencyChoice(
    extremeLife,
    { id: 'medical', overridePolicy: 'forbidden' },
    choices[0],
    choices,
  );
  assert.equal(protectedResult.overridden, false);
  const untaggedResult = resolveAgencyChoice(
    extremeLife,
    { id: 'untagged' },
    choices[0],
    choices.map((choice) => ({ ...choice, personalityTags: [] })),
  );
  assert.equal(untaggedResult.actualChoiceId, 'plan');
});

test('비활성 선택지는 성격이 강해도 대신 고르지 않는다', () => {
  const result = resolveAgencyChoice(
    { ...extremeLife, seed: 'disabled-seed' },
    { id: 'risk' },
    choices[0],
    [{ ...choices[0] }, { ...choices[1], enabled: false }],
  );
  assert.equal(result.actualChoiceId, 'plan');
});

test('10,000개 seed의 극단 성격 개입률은 28%에 수렴한다', () => {
  let overrides = 0;
  for (let index = 0; index < 10000; index += 1) {
    const result = resolveAgencyChoice(
      { ...extremeLife, seed: `agency-rate-${index}` },
      { id: 'rate-check' },
      choices[0],
      choices,
    );
    if (result.overridden) overrides += 1;
  }
  const rate = overrides / 10000;
  assert.ok(rate >= 0.265 && rate <= 0.295, String(rate));
});

test('성격 근거가 없는 선택에는 위치 순서로 태그를 만들지 않는다', () => {
  const artsAndSports = DECISION_BY_ID['private-education'].choices
    .find((choice) => choice.id === 'arts-sports');
  assert.deepEqual(artsAndSports.personalityTags, []);
});
