import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLifeAtAge } from './support/life-fixtures.mjs';
import { calculateAnnualEconomy } from '../dist/engine/economy.js';
import { applyDecision, getChoices, getDecision, isDecisionEligible } from '../dist/engine/decisions.js';
import { DECISION_BY_ID } from '../dist/data/decisions.js';
import { advanceYear } from '../dist/engine/life.js';
import { choiceMeta } from '../dist/ui/render.js';

test('부모 동거 대학생은 제한된 가정 지원으로 생활하고 지원 잔액은 실제 감소한다', () => {
  const life = makeLifeAtAge(19, { education: { level: 'university', status: 'enrolled' }, economy: { cash: 0, householdSupport: 6000000 } });
  const next = calculateAnnualEconomy(life);
  assert.equal(next.economy.cash, 0);
  assert.equal(next.economy.householdSupport, 600000);
  assert.equal(calculateAnnualEconomy(advanceYear(next)).economy.cash, -4800000);
});

test('무소득 독립 성인의 생활비와 기존 빚은 사라지지 않는다', () => {
  const next = calculateAnnualEconomy(makeLifeAtAge(30, { housing: { type: 'monthly-rent' }, economy: { cash: 0, debt: 10000000, householdSupport: 60000000 } }));
  assert.equal(next.economy.cash, -24250000);
  assert.equal(next.economy.debt, 10000000);
  assert.equal(next.economy.householdSupport, 60000000);
});

test('졸업 뒤 바로 취업은 실제 지속 급여와 저축을 만든다', () => {
  const started = applyDecision(makeLifeAtAge(18), 'after-graduation', 'employment');
  assert.equal(started.career.status, 'employed');
  assert.ok(started.economy.income >= 2000000);
  const year = calculateAnnualEconomy(advanceYear(started));
  assert.ok(year.economy.cash > 10000000);
  assert.ok(year.history.some((entry) => entry.type === 'economy' && /소득/.test(entry.text)));
});

test('중소기업 취업 선택은 집중 항목만 바꾸는 것이 아니라 급여를 지급한다', () => {
  const next = applyDecision(makeLifeAtAge(21), 'first-job-route', 'small-company');
  assert.equal(next.career.status, 'employed');
  assert.ok(calculateAnnualEconomy(next).economy.cash > 0);
});

test('빚이 있는 구직자는 무료 소득 경로가 우선 열리고 이후 경력 선택으로 연결된다', () => {
  const life = makeLifeAtAge(24, { service: { completed: true }, economy: { cash: -12000000, householdSupport: 0 } });
  assert.equal(getDecision(life)?.id, 'income-recovery');
  const options = getChoices(life, 'income-recovery');
  assert.ok(options.filter((item) => item.enabled).length >= 3);
  const next = applyDecision(life, 'income-recovery', 'paid-training');
  assert.ok(next.career.annualIncome > 0);
  assert.equal(isDecisionEligible(advanceYear(next), DECISION_BY_ID['training-next-step']), true);
  assert.equal(isDecisionEligible(advanceYear(life), DECISION_BY_ID['training-next-step']), false);
});

test('현금 100만원이면 전액이 아닌 10만원부터 투자하고 자산 합계는 보존한다', () => {
  const life = makeLifeAtAge(25, { economy: { cash: 1000000 } });
  const options = getChoices(life, 'asset-allocation');
  const deposit = options.find((item) => item.id === 'save-deposit');
  assert.equal(deposit.enabled, true);
  assert.equal(deposit.financialAction.amount, 100000);
  const next = applyDecision(life, 'asset-allocation', 'save-deposit');
  assert.equal(next.economy.cash, 900000);
  assert.equal(next.economy.assets.deposits, 100000);
  assert.equal(next.economy.netWorth, life.economy.netWorth);
});

test('현금이 마이너스여도 투자 화면에는 유보 외에 실행 가능한 자금 마련 선택이 있다', () => {
  const life = makeLifeAtAge(25, { economy: { cash: -5000000 } });
  const options = getChoices(life, 'asset-allocation');
  assert.ok(options.filter((item) => item.enabled).length >= 2);
  assert.equal(options.find((item) => item.id === 'save-deposit').enabled, false);
  const next = applyDecision(life, 'asset-allocation', 'earn-first');
  assert.equal(next.economy.cash, -4400000);
  assert.ok(next.stats.health < life.stats.health);
});

test('재학 중 시간제 일을 시작해도 학생 생활비가 갑자기 성인 가구 수준으로 오르지 않는다', () => {
  const life = makeLifeAtAge(19, { education: { level: 'university', status: 'enrolled' }, economy: { cash: 0, householdSupport: 6000000 } });
  const next = calculateAnnualEconomy(applyDecision(life, 'student-work-balance', 'campus-work'));
  assert.equal(next.economy.cash, 1800000);
  assert.equal(next.economy.householdSupport, 6000000);
});

test('선택 미리보기는 급여와 실제 현금 지출 및 고정비 변화를 숨기지 않는다', () => {
  const meta = choiceMeta({ careerTransition: { annualIncome: 30000000 }, economyEffects: { cash: -4000000, fixedCosts: 500000 } });
  assert.equal(meta.cost, '400만원');
  assert.match(meta.money, /월 소득 250만원/);
  assert.match(meta.money, /월 지출 \+50만원/);
});

test('교대 경력을 택한 사람만 다음 해 수면과 수입의 후속 선택을 만난다', () => {
  let life = applyDecision(makeLifeAtAge(24), 'income-recovery', 'paid-training');
  life = applyDecision(advanceYear(life), 'training-next-step', 'shift');
  assert.equal(isDecisionEligible(life, DECISION_BY_ID['shift-recovery']), false);
  life = advanceYear(life);
  assert.equal(isDecisionEligible(life, DECISION_BY_ID['shift-recovery']), true);
  const next = applyDecision(life, 'shift-recovery', 'daytime');
  assert.ok(next.career.annualIncome < life.career.annualIncome);
  assert.ok(next.stats.health > life.stats.health);
});

test('맥락별 경로는 관련 없는 삶에는 등장하지 않는다', () => {
  const plain = makeLifeAtAge(30);
  for (const id of ['student-work-balance', 'care-return', 'accessible-work', 'business-customer-terms']) {
    assert.equal(isDecisionEligible(plain, DECISION_BY_ID[id]), false, id);
  }
  const caregiver = makeLifeAtAge(35, { relationships: { children: [{ id: 'child', since: 2058 }] } });
  assert.equal(isDecisionEligible(caregiver, DECISION_BY_ID['care-return']), true);
  const next = applyDecision(caregiver, 'care-return', 'fulltime');
  assert.equal(next.economy.recurringCosts, 500000);
  assert.equal(next.career.annualIncome, 30000000);
});

test('대학은 개인 목돈이 없어도 가정 지원과 명시된 학자금 빚으로 진학할 수 있다', () => {
  const life = makeLifeAtAge(18, { stats: { knowledge: 70 }, economy: { cash: 1000000, householdSupport: 5000000 } });
  const option = getChoices(life, 'after-graduation').find((item) => item.id === 'university');
  assert.equal(option.enabled, true);
  assert.deepEqual(option.educationFunding, { family: 5000000, cash: 1000000, loan: 22000000 });
  assert.match(choiceMeta(option).money, /학자금 빚 \+2,200만원/);
  const next = applyDecision(life, 'after-graduation', 'university');
  assert.equal(next.economy.cash, 0);
  assert.equal(next.economy.householdSupport, 0);
  assert.equal(next.economy.otherDebt, 22000000);
  assert.equal(next.education.level, 'university');
});

test('학자금 분담은 필요한 금액만 쓰고 학력 조건 자체를 지우지 않는다', () => {
  const life = makeLifeAtAge(18, { stats: { knowledge: 70 }, economy: { cash: 1000000, householdSupport: 60000000 } });
  const next = applyDecision(life, 'after-graduation', 'university');
  assert.equal(next.economy.otherDebt, 0);
  assert.equal(next.economy.cash, 1000000);
  assert.equal(next.economy.householdSupport, 32000000);
  const low = getChoices(makeLifeAtAge(18, { stats: { knowledge: 10 } }), 'after-graduation');
  assert.equal(low.find((item) => item.id === 'university').enabled, false);
  assert.equal(low.find((item) => item.id === 'training').enabled, true);
});

test('주거 선택은 실제 초기 현금과 주택 빚 및 월 주거비를 확정 전에 표시한다', () => {
  const life = makeLifeAtAge(32, { economy: { cash: 250000000 } });
  const home = getChoices(life, 'housing-path').find((choice) => choice.id === 'owned-home');
  const meta = choiceMeta(home);
  assert.equal(meta.cost, '2억 2,000만원');
  assert.equal(meta.risk, '높음');
  assert.match(meta.money, /주택 빚 1억원/);
  assert.match(meta.money, /월 주거비 80만원/);
  const next = applyDecision(life, 'housing-path', 'owned-home');
  assert.equal(next.economy.cash, 30000000);
  assert.equal(next.economy.housingDebt, 100000000);
});

test('농촌에서 태어나도 도시로 옮기면 지역 잔류 경로는 열리지 않는다', () => {
  const life = makeLifeAtAge(25, { profile: { urbanicity: '군·읍면 생활권' }, economy: { cash: 4000000 } });
  assert.equal(isDecisionEligible(life, DECISION_BY_ID['regional-livelihood']), true);
  const moved = applyDecision(life, 'regional-move', 'capital');
  assert.equal(isDecisionEligible(moved, DECISION_BY_ID['regional-livelihood']), false);
});

test('이미 선택한 유급 일자리가 있으면 미취업자용 첫 취업 선택을 반복하지 않는다', () => {
  const life = applyDecision(makeLifeAtAge(21), 'income-recovery', 'paid-training');
  assert.equal(isDecisionEligible(life, DECISION_BY_ID['first-job-route']), false);
  assert.equal(isDecisionEligible(life, DECISION_BY_ID['exam-or-experience']), false);
});
