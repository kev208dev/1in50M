import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_GROUPS } from '../dist/data/careers.js';
import { getCareerOffers, acceptCareer, advanceCareer } from '../dist/engine/career.js';
import { calculateAnnualEconomy } from '../dist/engine/economy.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

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
  for (const value of Object.values(next.economy)) assert.ok(Number.isFinite(value));
});

test('일한 해가 쌓이면 경력과 소득이 함께 증가한다', () => {
  let life = makeLifeAtAge(28);
  life = acceptCareer(life, getCareerOffers(life)[0].career.id);
  const next = advanceCareer(life);
  assert.equal(next.career.years, 1);
  assert.ok(next.career.annualIncome >= life.career.annualIncome);
});
