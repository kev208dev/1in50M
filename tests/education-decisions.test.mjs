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

test('18세에는 정체성 후속 장면보다 졸업 진로가 먼저 열린다', () => {
  const life = makeLifeAtAge(18, {
    seed: 'collision-0',
    identity: {
      assigned: 'bisexual', label: '양성애자', discoveryAge: 18, discovered: true, acknowledged: true,
    },
  });
  assert.equal(getDecision(life).id, 'after-graduation');
});

test('생활 장면 34개 이상이 고유한 id와 두 개 이상의 선택지를 가진다', () => {
  assert.ok(DECISIONS.length >= 34);
  assert.equal(new Set(DECISIONS.map((item) => item.id)).size, DECISIONS.length);
  assert.ok(DECISIONS.every((item) => item.choices.length >= 2));
  assert.ok(DECISIONS.every((item) => item.choices.every((choice) => Array.isArray(choice.personalityTags))));
  assert.ok(DECISIONS.some((item) => item.choices.some((choice) => choice.personalityTags.length === 0)));
});

test('동의와 권리가 중요한 장면은 성격 개입을 금지한다', () => {
  for (const id of ['mental-health-support', 'service-path', 'queer-trusted-friend', 'queer-workplace', 'relationship-path', 'family-path', 'digital-healthcare-access']) {
    assert.equal(DECISIONS.find((item) => item.id === id)?.overridePolicy, 'forbidden', id);
  }
});

test('밤샘과 고카페인 선택은 누적 위험을 높이고 휴식은 낮춘다', () => {
  const life = makeLifeAtAge(16, {
    education: { level: 'high-school', status: 'enrolled', schoolType: 'general', skills: [] },
  });
  const night = applyDecision(life, 'high-school-evening', 'all-night-energy');
  assert.ok(night.riskFactors.caffeineLoad > life.riskFactors.caffeineLoad);
  assert.ok(night.riskFactors.sleepDebt > life.riskFactors.sleepDebt);
  const rested = applyDecision(life, 'high-school-evening', 'rest');
  assert.ok(rested.riskFactors.sleepDebt <= life.riskFactors.sleepDebt);
});

test('미성년 사교육비는 가정 지원에서만 빠진다', () => {
  const life = makeLifeAtAge(10, { economy: { cash: 0, householdSupport: 5_000_000 } });
  const next = applyDecision(life, 'private-education', 'core-subjects');
  assert.equal(next.economy.cash, 0);
  assert.ok(next.economy.householdSupport < 5_000_000);
});

test('정신건강 위기에서는 도움 요청 장면이 최우선으로 열린다', () => {
  const life = makeLifeAtAge(17, {
    mentalHealthState: 'crisis',
    riskFactors: { academicStress: 90, sleepDebt: 85, caffeineLoad: 35, support: 5 },
    education: { level: 'high-school', status: 'enrolled', schoolType: 'general', skills: [] },
  });
  assert.equal(getDecision(life).id, 'mental-health-support');
  const helped = applyDecision(life, 'mental-health-support', 'trusted-help');
  assert.ok(helped.riskFactors.support > life.riskFactors.support);
  assert.ok(helped.riskFactors.academicStress < life.riskFactors.academicStress);
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

test('즉시 취업과 창업 선택은 직업명과 반복 소득을 함께 바꾼다', () => {
  const unemployed = makeLifeAtAge(23);
  const employed = applyDecision(unemployed, 'exam-or-experience', 'available-job');
  assert.equal(employed.career.status, 'employed');
  assert.equal(employed.career.title, '서비스·현장 일자리');
  assert.ok(employed.career.annualIncome > 0);
  assert.ok(employed.economy.income > 0);

  const officeWorker = makeLifeAtAge(40, {
    career: { groupId: 'management', careerId: 'management-1', title: '사무원', status: 'employed', annualIncome: 36000000 },
    economy: { cash: 20000000, income: 3000000 },
  });
  const owner = applyDecision(officeWorker, 'self-employment', 'open-shop');
  assert.equal(owner.career.status, 'self-employed');
  assert.equal(owner.career.title, '소규모 자영업');
  assert.equal(owner.career.careerId, null);
  assert.ok(owner.career.annualIncome > 0);
});

test('시간제 전환과 노인 일자리 소득은 다음 해에도 유지된다', async () => {
  const { advanceCareer } = await import('../dist/engine/career.js');
  const { calculateAnnualEconomy } = await import('../dist/engine/economy.js');
  const worker = makeLifeAtAge(60, {
    career: { groupId: 'management', careerId: 'management-1', title: '사무원', status: 'employed', annualIncome: 48000000 },
    economy: { cash: 0, income: 4000000 },
  });
  const reduced = applyDecision(worker, 'retirement-income-gap', 'part-time');
  assert.equal(reduced.career.status, 'part-time');
  assert.ok(reduced.career.annualIncome < 48000000);
  const nextYear = calculateAnnualEconomy(advanceCareer(reduced));
  assert.equal(nextYear.economy.income, Math.round(nextYear.career.annualIncome / 12));
  assert.ok(nextYear.economy.income < 4000000);

  const retired = makeLifeAtAge(76, {
    career: { groupId: 'management', careerId: 'management-1', title: '사무원', status: 'retired', annualIncome: 48000000 },
    economy: { cash: 0, income: 0 },
  });
  const seniorJob = applyDecision(retired, 'late-life-community', 'senior-job');
  assert.equal(seniorJob.career.title, '지역 단시간 일자리');
  assert.equal(seniorJob.career.annualIncome, 4200000);
  assert.equal(calculateAnnualEconomy(seniorJob).economy.income, 350000);
});
