import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthProfile } from '../dist/simulator.js';
import { createLife, advanceYear, normalizeLife, setFocus } from '../dist/engine/life.js';
import { getInfluenceModifier } from '../dist/engine/profile-influence.js';
import { calculateAnnualEconomy } from '../dist/engine/economy.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const profile = createBirthProfile(() => 0.42, 2026);

test('유복한 수도권 가정은 교육 접근성과 초기 안전망을 높인다', () => {
  const rich = createLife({
    ...profile,
    finance: '매우 여유로운 가정',
    region: { name: '서울특별시', short: '서울', code: 'SEL' },
  }, 'rich');
  const tight = createLife({
    ...profile,
    finance: '생계가 빠듯한 가정',
    region: { name: '전라남도', short: '전남', code: 'JNM' },
  }, 'tight');
  assert.ok(getInfluenceModifier(rich, 'education-access') > getInfluenceModifier(tight, 'education-access'));
  assert.ok(rich.economy.householdSupport > tight.economy.householdSupport);
});

test('v4 저장은 새 필드가 없어도 v5로 정규화된다', () => {
  const legacyV3Life = createLife(profile, 'legacy-v3');
  legacyV3Life.version = 4;
  delete legacyV3Life.dataVersion;
  delete legacyV3Life.conditions;
  delete legacyV3Life.profileInfluence;
  delete legacyV3Life.economy.assets;
  const migrated = normalizeLife({ ...legacyV3Life, version: 4 });
  assert.equal(migrated.version, 5);
  assert.ok(migrated.dataVersion);
  assert.deepEqual(migrated.conditions, { chronic: [], losses: [], care: [] });
  assert.ok(migrated.profileInfluence);
  assert.deepEqual(Object.keys(migrated.economy.assets), [
    'deposits', 'bonds', 'stocks', 'crypto', 'businessEquity',
  ]);
  assert.equal(migrated.economy.netWorth, (
    migrated.economy.cash
    + migrated.economy.assets.deposits
    + migrated.economy.assets.bonds
    + migrated.economy.assets.stocks
    + migrated.economy.assets.crypto
    + migrated.economy.assets.businessEquity
    + migrated.economy.homeValue
    - migrated.economy.debt
  ));
});

test('시대 사건 id는 문자열 중복 없이 정규화된다', () => {
  const migrated = normalizeLife({
    ...createLife(profile, 'era-id-normalize'),
    eraEventIds: ['imf-crisis', 'imf-crisis', null, 1997],
  });
  assert.deepEqual(migrated.eraEventIds, ['imf-crisis', '1997']);
});

test('기존 저장본의 단일 부채는 주택 보유 여부에 따라 안전하게 분류된다', () => {
  const withHome = createLife(profile, 'legacy-home-debt');
  withHome.economy.debt = 100000000;
  withHome.economy.homeValue = 300000000;
  delete withHome.economy.housingDebt;
  delete withHome.economy.otherDebt;
  const migratedHome = normalizeLife(withHome);
  assert.equal(migratedHome.economy.housingDebt, 100000000);
  assert.equal(migratedHome.economy.otherDebt, 0);

  const withoutHome = createLife(profile, 'legacy-other-debt');
  withoutHome.economy.debt = 900000;
  delete withoutHome.economy.housingDebt;
  delete withoutHome.economy.otherDebt;
  const migratedOther = normalizeLife(withoutHome);
  assert.equal(migratedOther.economy.housingDebt, 0);
  assert.equal(migratedOther.economy.otherDebt, 900000);
});

test('연간 경제 계산 뒤에도 새 자산 항목이 보존된다', () => {
  const life = normalizeLife({
    ...createLife(profile, 'assets-persist'),
    age: 30,
    economy: {
      cash: 10000000,
      income: 0,
      fixedCosts: 0,
      debt: 0,
      deposit: 2000000,
      homeValue: 0,
      assets: { deposits: 2000000, bonds: 3000000, stocks: 4000000, crypto: 5000000, businessEquity: 6000000 },
    },
  });
  const next = calculateAnnualEconomy(life);
  assert.equal(next.economy.assets.bonds, 3000000);
  assert.equal(next.economy.assets.businessEquity, 6000000);
});

test('한 번의 진행은 나이를 정확히 1년 올린다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'life-1');
  const next = advanceYear(life);
  assert.equal(next.age, 1);
  assert.equal(next.year, 2027);
  assert.equal(next.history.some((entry) => entry.text === '1세의 한 해가 흘렀습니다.'), false);
});

test('같은 상태에 중복 tick id를 적용해도 한 번만 진행한다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'life-2');
  const once = advanceYear(life, 'tick-0');
  const twice = advanceYear(once, 'tick-0');
  assert.equal(twice.age, 1);
});

test('상태는 어떤 초점에서도 0에서 100 사이를 유지한다', () => {
  let life = createLife(createBirthProfile(() => 0.42, 2026), 'life-3');
  life = setFocus(life, 'health');
  for (let i = 0; i < 90; i += 1) life = advanceYear(life, `tick-${i}`);
  assert.ok(Object.values(life.stats).every((value) => Number.isFinite(value) && value >= 0 && value <= 100));
});

test('진학 과정은 정해진 나이에 수료 상태로 전환한다', () => {
  let life = createLife(createBirthProfile(() => 0.42, 2026), 'education-transition');
  life = { ...life, age: 21, year: 2047, education: { level: 'university', status: 'enrolled', schoolType: 'general', skills: [] } };
  const next = advanceYear(life, 'graduation');
  assert.equal(next.education.status, 'completed');
});

test('학교 선택 전 교육 상태도 해마다 실제 학령으로 갱신된다', () => {
  const six = makeLifeAtAge(6, { education: { level: 'preschool', status: 'not-started', schoolType: null, skills: [] } });
  const seven = advanceYear(six, 'school-age-seven');
  assert.equal(seven.education.level, 'elementary');
  assert.equal(seven.education.status, 'enrolled');
});

test('건강이 완전히 소진된 중년의 삶은 90세 전에 회고로 전환할 수 있다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'health-ending');
  const next = advanceYear({ ...life, age: 59, year: 2085, stats: { ...life.stats, health: 0 } }, 'health-end');
  assert.equal(next.status, 'review');
  assert.equal(next.age, 60);
});
