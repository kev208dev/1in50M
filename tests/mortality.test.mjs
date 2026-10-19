import test from 'node:test';
import assert from 'node:assert/strict';
import { annualMortalityRisk, causeSpecificRisks, evaluateSurvival, mortalityProfile, selectDeathCause, survivalCurve } from '../dist/engine/mortality.js';
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

test('사망 위험 프로필에는 생명표 출처와 건강 보정이 함께 들어간다', () => {
  const profile = mortalityProfile(makeLifeAtAge(78));
  assert.ok(profile.annualRisk > 0);
  assert.ok(profile.sourceYear);
  assert.ok(profile.sourceKey);
  assert.ok(profile.lifeExpectancy);
});

test('같은 나이와 건강이라도 기대수명이 짧았던 출생 코호트는 위험이 더 높다', () => {
  const olderCohort = makeLifeAtAge(60, { year: 2045, profile: { birthYear: 1985, sex: { id: 'male', label: '남성' } } });
  const recentCohort = makeLifeAtAge(60, { year: 2084, profile: { birthYear: 2024, sex: { id: 'male', label: '남성' } } });
  const olderProfile = mortalityProfile(olderCohort);
  const recentProfile = mortalityProfile(recentCohort);
  assert.ok(olderProfile.lifeExpectancy < recentProfile.lifeExpectancy);
  assert.ok(olderProfile.annualRisk > recentProfile.annualRisk);
});

test('건강한 69세에게 선행 조건 없는 노환 사망을 붙이지 않는다', () => {
  const life = makeLifeAtAge(69, { stats: { health: 94 }, conditions: { chronic: [], losses: [], care: [] } });
  assert.notEqual(selectDeathCause(life, 0.5), 'age-related-disease');
});

test('만성질환은 해당 사망 원인의 후보가 되지만 조건 없는 삶에는 붙지 않는다', () => {
  const healthy = makeLifeAtAge(80, { conditions: { chronic: [], losses: [], care: [] } });
  const cardiac = makeLifeAtAge(80, { conditions: { chronic: ['cardiovascular'], losses: [], care: [] } });
  assert.notEqual(selectDeathCause(healthy, 0), 'cardiovascular-disease');
  assert.equal(selectDeathCause(cardiac, 0), 'cardiovascular-disease');
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
  const sustained = { ...crisis, history: [...(crisis.history ?? []), { id: 'wellbeing-16-crisis', age: 16, type: 'health' }] };
  assert.equal(causeSpecificRisks(strained).selfHarm, 0);
  assert.equal(causeSpecificRisks(crisis).selfHarm, 0, '위기가 처음 드러난 해에는 판정하지 않는다');
  assert.ok(causeSpecificRisks(sustained).selfHarm > 0);
});
