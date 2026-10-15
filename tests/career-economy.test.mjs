import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_GROUPS } from '../dist/data/careers.js';
import { getCareerOffers, acceptCareer, advanceCareer } from '../dist/engine/career.js';
import { calculateAnnualEconomy } from '../dist/engine/economy.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';
import { createLife } from '../dist/engine/life.js';
import { createBirthProfile } from '../dist/simulator.js';

test('새 삶은 개인 현금 0원과 별도의 가정 지원으로 시작한다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'newborn-money');
  assert.equal(life.economy.cash, 0);
  assert.ok(life.economy.householdSupport > 0);
});

test('12개 직업군과 각 4개 이상의 직업이 있다', () => {
  assert.equal(CAREER_GROUPS.length, 12);
  assert.ok(CAREER_GROUPS.every((group) => group.careers.length >= 4));
});

test('같은 life state는 같은 직업 제안을 만든다', () => {
  const life = makeLifeAtAge(24, { education: { level: 'university', schoolType: 'general' } });
  assert.deepEqual(getCareerOffers(life), getCareerOffers(structuredClone(life)));
});

test('연간 경제 계산은 유한한 원화 수치를 만든다', () => {
  let life = makeLifeAtAge(28);
  life = acceptCareer(life, getCareerOffers(life)[0].career.id);
  const next = calculateAnnualEconomy(life);
  for (const [key, value] of Object.entries(next.economy)) {
    if (!['assets', 'transactions', 'lastReturns', 'pendingLotteryDraw'].includes(key)) assert.ok(Number.isFinite(value), key);
  }
  for (const [key, value] of Object.entries(next.economy.assets)) {
    assert.ok(Number.isFinite(value), key);
  }
});

test('일한 해가 쌓이면 경력과 소득이 함께 증가한다', () => {
  let life = makeLifeAtAge(28);
  life = acceptCareer(life, getCareerOffers(life)[0].career.id);
  const next = advanceCareer(life);
  assert.equal(next.career.years, 1);
  assert.ok(next.career.annualIncome >= life.career.annualIncome);
});

test('미성년 시기에는 개인 현금에서 가족 주거비를 차감하지 않는다', () => {
  const life = makeLifeAtAge(10);
  const next = calculateAnnualEconomy(life);
  assert.equal(next.economy.cash, life.economy.cash);
  assert.equal(next.economy.fixedCosts, 0);
  assert.equal(next.economy.householdSupport, life.economy.householdSupport);
});

test('대학 재학 중에는 대학 수료가 필요한 직업을 바로 선택할 수 없다', () => {
  const life = makeLifeAtAge(19, {
    stats: { knowledge: 100 },
    education: { level: 'university', status: 'enrolled' },
  });
  const offer = getCareerOffers(life, 100).find((item) => item.career.id === 'research-1');
  assert.equal(offer.eligible, false);
});

test('연간 경제 계산은 거래 기록과 시장 수익률을 지우지 않는다', () => {
  const life = makeLifeAtAge(40, {
    economy: {
      cash: 10000000,
      transactions: [{ id: 'tx-1', type: 'buy', amount: 1000000 }],
      lastReturns: { bonds: 0.02, stocks: -0.1, crypto: 0.3, deposits: 0.02 },
    },
  });
  const next = calculateAnnualEconomy(life);
  assert.deepEqual(next.economy.transactions, life.economy.transactions);
  assert.deepEqual(next.economy.lastReturns, life.economy.lastReturns);
});
