import test from 'node:test';
import assert from 'node:assert/strict';
import { annualMortalityRisk, causeSpecificRisks, evaluateSurvival, survivalCurve } from '../dist/engine/mortality.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('고령의 연간 사망 위험은 청년보다 높다', () => {
  assert.ok(annualMortalityRisk(makeLifeAtAge(80)) > annualMortalityRisk(makeLifeAtAge(30)));
});

test('건강이 낮을수록 같은 나이의 위험이 높다', () => {
  const healthy = makeLifeAtAge(65, { stats: { health: 90 } });
  const frail = makeLifeAtAge(65, { stats: { health: 15 } });
  assert.ok(annualMortalityRisk(frail) > annualMortalityRisk(healthy));
});

test('생존 평가는 같은 삶과 나이에 재현 가능하다', () => {
  const life = makeLifeAtAge(73, { seed: 'mortality-deterministic' });
  assert.deepEqual(evaluateSurvival(life), evaluateSurvival(life));
});

test('생존 곡선은 출생부터 90세까지 감소한다', () => {
  const curve = survivalCurve(makeLifeAtAge(25));
  assert.equal(curve.length, 91);
  assert.equal(curve[0].survival, 1);
  assert.ok(curve[80].survival < curve[30].survival);
  assert.ok(curve.every((point, index) => index === 0 || point.survival <= curve[index - 1].survival));
});

test('극심한 수면 부족과 고카페인 부담이 겹쳐야 추가 건강 위험이 생긴다', () => {
  const baseline = makeLifeAtAge(17, {
    riskFactors: { academicStress: 10, sleepDebt: 10, caffeineLoad: 10, support: 50 },
  });
  const overloaded = makeLifeAtAge(17, {
    riskFactors: { academicStress: 80, sleepDebt: 92, caffeineLoad: 95, support: 5 },
  });
  assert.equal(causeSpecificRisks(baseline).caffeineCardiac, 0);
  assert.ok(causeSpecificRisks(overloaded).caffeineCardiac > 0);
  assert.ok(annualMortalityRisk(overloaded) > annualMortalityRisk(baseline));
});

test('자해 관련 위험은 여러 지표가 겹친 극심한 정신건강 위기에서만 추가된다', () => {
  const strained = makeLifeAtAge(17, {
    stats: { happiness: 35, relationships: 45 },
    mentalHealthState: 'strained',
    riskFactors: { academicStress: 80, sleepDebt: 75, caffeineLoad: 20, support: 20 },
  });
  const crisis = makeLifeAtAge(17, {
    stats: { happiness: 10, relationships: 12 },
    mentalHealthState: 'crisis',
    riskFactors: { academicStress: 95, sleepDebt: 90, caffeineLoad: 40, support: 0 },
  });
  assert.equal(causeSpecificRisks(strained).selfHarm, 0);
  assert.ok(causeSpecificRisks(crisis).selfHarm > 0);
});
