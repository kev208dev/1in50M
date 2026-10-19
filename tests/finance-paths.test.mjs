import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePortfolio,
  applyFinancialAction,
  purchaseLotteryTicket,
  revealLotteryBroadcast,
  resolveLottery,
} from '../dist/engine/finance.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';
import { FINANCE_DECISIONS } from '../dist/data/decisions-finance.js';
import { applyDecision } from '../dist/engine/decisions.js';
import { getChoices } from '../dist/engine/decisions.js';
import { calculateAnnualEconomy } from '../dist/engine/economy.js';

const investedLife = makeLifeAtAge(35, {
  economy: {
    cash: 20000000,
    assets: {
      deposits: 10000000,
      bonds: 10000000,
      stocks: 10000000,
      crypto: 10000000,
      businessEquity: 0,
    },
  },
});

test('채권은 주식과 가상자산보다 변동폭이 작다', () => {
  const calm = advancePortfolio(investedLife, { marketRoll: 0.01 });
  assert.ok(Math.abs(calm.economy.lastReturns.bonds) < Math.abs(calm.economy.lastReturns.crypto));
  assert.ok(Math.abs(calm.economy.lastReturns.bonds) < Math.abs(calm.economy.lastReturns.stocks));
});

test('복권은 희귀한 대박과 대부분의 손실을 모두 재현한다', () => {
  assert.ok(resolveLottery(0.9999999, 10000).payout >= 1000000000);
  assert.equal(resolveLottery(0.5, 10000).payout, 0);
});

test('보유 현금을 넘는 금융 행동은 거부하고 모든 성공 행동은 거래로 남긴다', () => {
  assert.throws(
    () => applyFinancialAction(investedLife, { type: 'buy', asset: 'stocks', amount: 30000000 }),
    /자금이 부족/,
  );
  const bought = applyFinancialAction(investedLife, { type: 'buy', asset: 'bonds', amount: 5000000 });
  assert.equal(bought.economy.assets.bonds, 15000000);
  assert.equal(bought.economy.cash, 15000000);
  assert.equal(bought.economy.transactions.at(-1).type, 'buy');
});

test('가상자산은 2010년 전에는 살 수 없다', () => {
  const oldLife = makeLifeAtAge(25, { year: 2009, economy: { cash: 10000000 } });
  assert.throws(
    () => applyFinancialAction(oldLife, { type: 'buy', asset: 'crypto', amount: 1000000 }),
    /2010년/,
  );
});

test('2010년 전 결정 화면에서는 가상자산 선택이 이유와 함께 비활성화된다', async () => {
  const { getChoices } = await import('../dist/engine/decisions.js');
  const oldLife = makeLifeAtAge(30, { year: 1980, economy: { cash: 10000000 } });
  const crypto = getChoices(oldLife, 'alternative-assets').find((item) => item.id === 'buy-crypto');
  assert.equal(crypto.enabled, false);
  assert.match(crypto.reason, /2010년/);
});

test('도박 유혹은 손실과 빚을 만들 수 있고 대박·폭락·안정 채권 경로가 도달 가능하다', () => {
  const gamblingLife = makeLifeAtAge(35, { economy: { cash: 100000, debt: 0 } });
  const lost = applyFinancialAction(gamblingLife, {
    type: 'gamble', amount: 100000, borrowed: 900000, roll: 0,
  });
  assert.ok(lost.economy.debt > 0);

  const jackpot = applyFinancialAction(investedLife, { type: 'lottery', amount: 10000, roll: 0.9999999 });
  assert.ok(jackpot.economy.cash >= 1000000000);

  const crash = advancePortfolio(investedLife, { marketRoll: 0 });
  assert.ok(crash.economy.lastReturns.crypto < -0.5);
  assert.ok(Math.abs(crash.economy.lastReturns.bonds) < 0.01);
});

test('성인기 금융 장면은 예금·채권·주식·가상자산·복권·도박·부동산·창업을 안내한다', () => {
  const text = JSON.stringify(FINANCE_DECISIONS);
  for (const term of ['deposits', 'bonds', 'stocks', 'crypto', 'lottery', 'gamble', 'property', 'businessPlan']) {
    assert.match(text, new RegExp(term));
  }
  assert.ok(FINANCE_DECISIONS.every((decision) => decision.prompt.includes('실제 투자·도박 조언이 아닙니다')));
  assert.ok(FINANCE_DECISIONS.every((decision) => decision.choices.every((choice) => choice.tags.length > 0)));
});

test('금융 선택은 일반 결정 흐름에서도 자산과 기록에 반영된다', () => {
  const life = makeLifeAtAge(30, { economy: { cash: 20000000 } });
  const next = applyDecision(life, 'asset-allocation', 'buy-bonds');
  assert.equal(next.economy.assets.bonds, 2000000);
  assert.equal(next.economy.cash, 18000000);
  assert.equal(next.economy.transactions.at(-1).asset, 'bonds');
});

test('현금이 없어도 투자 결정을 미루고 생애를 계속할 수 있다', () => {
  const life = makeLifeAtAge(24, {
    economy: { cash: 0 },
    pendingDecisionId: 'asset-allocation',
  });
  const available = getChoices(life, 'asset-allocation').filter((choice) => choice.enabled);
  assert.ok(available.some((choice) => choice.id === 'defer-allocation'));
  const next = applyDecision(life, 'asset-allocation', 'defer-allocation');
  assert.equal(next.pendingDecisionId, null);
});

test('도박 빚은 주거를 바꿔도 사라지지 않는다', () => {
  const life = makeLifeAtAge(32, {
    economy: { cash: 1000000, debt: 900000, otherDebt: 900000, housingDebt: 0 },
  });
  const next = applyDecision(life, 'housing-path', 'with-family');
  assert.equal(next.economy.otherDebt, 900000);
  assert.equal(next.economy.housingDebt, 0);
  assert.equal(next.economy.debt, 900000);
});

test('추가 부동산 매입은 기존 주택 가치를 지우지 않는다', () => {
  const life = makeLifeAtAge(35, {
    economy: {
      cash: 30000000,
      debt: 100000000,
      housingDebt: 100000000,
      otherDebt: 0,
      homeValue: 300000000,
    },
  });
  const next = applyFinancialAction(life, {
    type: 'property', amount: 20000000, homeValue: 150000000, debt: 130000000,
  });
  assert.equal(next.economy.homeValue, 450000000);
  assert.equal(next.economy.housingDebt, 230000000);
  assert.equal(next.economy.debt, 230000000);
});

test('학자금 같은 비주거 부채는 주택 부채와 분리되어 해가 지나도 보존된다', () => {
  const homeowner = makeLifeAtAge(20, {
    economy: {
      cash: 0,
      homeValue: 300000000,
      debt: 100000000,
      housingDebt: 100000000,
      otherDebt: 0,
    },
  });
  const borrowed = applyDecision(homeowner, 'tuition-and-work', 'loan');
  assert.equal(borrowed.economy.housingDebt, 100000000);
  assert.equal(borrowed.economy.otherDebt, 8000000);
  const afterYear = calculateAnnualEconomy(borrowed);
  assert.equal(afterYear.economy.housingDebt, 100000000);
  assert.equal(afterYear.economy.otherDebt, 8000000);
  assert.equal(afterYear.economy.debt, 108000000);
});

test('복권 결과는 방송을 확인하기 전까지 지급액을 공개하거나 반영하지 않는다', () => {
  const life = makeLifeAtAge(35, { economy: { cash: 100000 } });
  const waiting = purchaseLotteryTicket(life, { amount: 10000, roll: 0.9999999 });
  assert.equal(waiting.economy.cash, 90000);
  assert.equal(waiting.economy.pendingLotteryDraw.revealed, false);
  assert.equal(waiting.economy.transactions.at(-1).type, 'lottery-ticket');
  const revealed = revealLotteryBroadcast(waiting);
  assert.ok(revealed.economy.cash >= 1000000000);
  assert.equal(revealed.economy.pendingLotteryDraw, null);
  assert.equal(revealed.economy.transactions.at(-1).tier, 'jackpot');
});

test('가상자산 거래는 도파민을 올리고 자동차는 자산과 유지비를 만든다', () => {
  const life = makeLifeAtAge(35, { year: 2026, economy: { cash: 30000000 } });
  const crypto = applyFinancialAction(life, { type: 'buy', asset: 'crypto', amount: 2000000 });
  assert.ok(crypto.economy.dopamine > life.economy.dopamine);
  const car = applyFinancialAction(crypto, { type: 'vehicle', amount: 10000000, vehicleValue: 18000000, debt: 8000000, monthlyCost: 350000 });
  assert.equal(car.economy.vehicleValue, 18000000);
  assert.ok(car.economy.otherDebt >= 8000000);
  assert.equal(car.economy.recurringCosts, 350000);
  const afterYear = calculateAnnualEconomy(car);
  assert.equal(afterYear.economy.fixedCosts, 1150000);
});

test('현금 지출형 선택은 필요한 자금이 없으면 잠긴다', () => {
  const life = makeLifeAtAge(55, {
    economy: { cash: 1000000 },
    relationships: { children: [{ id: 'child', name: '자녀', since: 30 }] },
  });
  const support = getChoices(life, 'family-support-vs-retirement').find((choice) => choice.id === 'large-support');
  assert.equal(support.enabled, false);
  assert.match(support.reason, /20,000,000원/);
});
