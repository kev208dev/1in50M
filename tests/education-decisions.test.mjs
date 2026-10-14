import test from 'node:test';
import assert from 'node:assert/strict';
import { EDUCATION_PATHS } from '../dist/data/education.js';
import { DECISIONS } from '../dist/data/decisions.js';
import { getResearchSource } from '../dist/data/research.js';
import { getDecision, getChoices, applyDecision } from '../dist/engine/decisions.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('고등학교 8개 경로를 모두 제공한다', () => {
  assert.deepEqual(new Set(EDUCATION_PATHS.map((path) => path.id)), new Set([
    'general', 'vocational', 'meister', 'autonomous', 'special-purpose', 'arts', 'sports', 'alternative',
  ]));
});

test('15세에는 고등학교 결정이 열린다', () => {
  const life = makeLifeAtAge(15, { decisions: { 'middle-school-rhythm': 'steady' } });
  assert.equal(getDecision(life).id, 'choose-high-school');
  assert.equal(getChoices(life, 'choose-high-school').length, 8);
});

test('생활 장면 30개가 고유한 id와 두 개 이상의 선택지를 가진다', () => {
  assert.equal(DECISIONS.length, 30);
  assert.equal(new Set(DECISIONS.map((item) => item.id)).size, 30);
  assert.ok(DECISIONS.every((item) => item.choices.length >= 2));
});

test('같은 seed와 상태에서는 같은 조건부 장면이 선택된다', () => {
  const life = makeLifeAtAge(25, { seed: 'repeatable-scene' });
  assert.equal(getDecision(life)?.id, getDecision(structuredClone(life))?.id);
});

test('정체성을 발견하지 않은 삶에는 정체성 후속 장면이 열리지 않는다', () => {
  const life = makeLifeAtAge(26, { identity: { assigned: null, discovered: false } });
  assert.notEqual(getDecision(life)?.audience, 'lgbtq');
});

test('근거가 표시된 장면은 유효한 자료를 참조한다', () => {
  for (const scene of DECISIONS.filter((item) => item.sourceKey)) {
    assert.ok(getResearchSource(scene.sourceKey)?.url, scene.id);
  }
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

test('주거 결정은 보증금과 주거비를 공통 주거 모델로 반영한다', () => {
  const life = makeLifeAtAge(32, { economy: { cash: 100000000 } });
  const next = applyDecision(life, 'housing-path', 'jeonse');
  assert.equal(next.housing.type, 'jeonse');
  assert.equal(next.economy.deposit, 85000000);
  assert.equal(next.economy.fixedCosts, 650000);
});

test('가족 결정으로 자녀를 맞이하거나 자녀 없는 삶을 선택할 수 있다', () => {
  const life = makeLifeAtAge(35, { relationships: { partner: { id: 'partner', name: '동반자' } } });
  const next = applyDecision(life, 'family-path', 'welcome-child');
  assert.equal(next.relationships.children.length, 1);
});

test('직업 전환을 고르면 기존 직업을 내려놓고 다시 선택할 수 있다', () => {
  const life = makeLifeAtAge(40, {
    career: { groupId: 'management', careerId: 'management-1', title: '사무원', status: 'employed', annualIncome: 36000000 },
    economy: { income: 3000000 },
  });
  const next = applyDecision(life, 'mid-career', 'change');
  assert.equal(next.career.careerId, null);
  assert.equal(next.career.status, 'none');
  assert.equal(next.economy.income, 0);
});
