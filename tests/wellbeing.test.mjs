import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRiskEffects, advanceWellbeing } from '../dist/engine/wellbeing.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';
import { applyDecision } from '../dist/engine/decisions.js';
import { causeSpecificRisks } from '../dist/engine/mortality.js';

test('학업 압박과 밤샘 선택은 위험 요인을 누적하고 0~100으로 제한한다', () => {
  const life = makeLifeAtAge(16);
  const next = applyRiskEffects(life, {
    academicStress: 140,
    sleepDebt: 70,
    caffeineLoad: 120,
    support: -200,
  });
  assert.deepEqual(next.riskFactors, {
    academicStress: 100,
    sleepDebt: 70,
    caffeineLoad: 100,
    support: 0,
  });
});

test('여러 위험이 함께 심해지면 상태와 건강·행복이 악화된다', () => {
  const life = makeLifeAtAge(17, {
    stats: { health: 55, happiness: 22, relationships: 18 },
    riskFactors: { academicStress: 92, sleepDebt: 88, caffeineLoad: 75, support: 5 },
  });
  const next = advanceWellbeing(life);
  assert.equal(next.mentalHealthState, 'crisis');
  assert.ok(next.stats.health < life.stats.health);
  assert.ok(next.stats.happiness < life.stats.happiness);
});

test('휴식과 주변 지원은 누적 위험을 낮춘다', () => {
  const life = makeLifeAtAge(17, {
    riskFactors: { academicStress: 80, sleepDebt: 70, caffeineLoad: 50, support: 10 },
  });
  const next = applyRiskEffects(life, {
    academicStress: -35,
    sleepDebt: -30,
    caffeineLoad: -20,
    support: 40,
  });
  assert.deepEqual(next.riskFactors, {
    academicStress: 45,
    sleepDebt: 40,
    caffeineLoad: 30,
    support: 50,
  });
});

test('밤샘 습관이 여러 해 이어지면 위기와 추가 건강 위험에 실제로 도달할 수 있다', () => {
  let life = makeLifeAtAge(16, {
    stats: { health: 55, happiness: 48, relationships: 48 },
    education: { level: 'high-school', status: 'enrolled', schoolType: 'general', skills: [] },
  });
  life = applyDecision(life, 'high-school-evening', 'all-night-energy');
  for (let age = 17; age <= 23; age += 1) {
    life = advanceWellbeing({ ...life, age, year: life.year + 1 });
  }
  assert.equal(life.mentalHealthState, 'crisis');
  assert.ok(causeSpecificRisks(life).caffeineCardiac > 0);
  assert.ok(causeSpecificRisks(life).selfHarm > 0);
});
