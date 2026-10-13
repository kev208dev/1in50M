import test from 'node:test';
import assert from 'node:assert/strict';
import { EDUCATION_PATHS } from '../dist/data/education.js';
import { getDecision, getChoices, applyDecision } from '../dist/engine/decisions.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('고등학교 8개 경로를 모두 제공한다', () => {
  assert.deepEqual(new Set(EDUCATION_PATHS.map((path) => path.id)), new Set([
    'general', 'vocational', 'meister', 'autonomous', 'special-purpose', 'arts', 'sports', 'alternative',
  ]));
});

test('15세에는 고등학교 결정이 열린다', () => {
  const life = makeLifeAtAge(15);
  assert.equal(getDecision(life).id, 'choose-high-school');
  assert.equal(getChoices(life, 'choose-high-school').length, 8);
});

test('선택 조건을 못 채운 경로도 이유와 함께 비활성으로 보인다', () => {
  const life = makeLifeAtAge(15, { stats: { knowledge: 20 } });
  const choice = getChoices(life, 'choose-high-school').find((item) => item.id === 'special-purpose');
  assert.equal(choice.enabled, false);
  assert.match(choice.reason, /지식/);
});

test('고등학교 선택이 학력과 기록에 반영된다', () => {
  const life = makeLifeAtAge(15);
  const next = applyDecision(life, 'choose-high-school', 'vocational');
  assert.equal(next.education.schoolType, 'vocational');
  assert.ok(next.history.some((entry) => entry.type === 'decision'));
});

test('잔액이 음수여도 비용 없는 선택은 활성 상태를 유지한다', () => {
  const life = makeLifeAtAge(5, { economy: { cash: -1000000 } });
  assert.ok(getChoices(life, 'first-reflection').every((choice) => choice.enabled));
});
