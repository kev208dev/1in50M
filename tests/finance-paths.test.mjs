import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePortfolio,
  applyFinancialAction,
  resolveLottery,
} from '../dist/engine/finance.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';
import { FINANCE_DECISIONS } from '../dist/data/decisions-finance.js';
import { applyDecision } from '../dist/engine/decisions.js';

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
  assert.equal(next.economy.assets.bonds, 5000000);
  assert.equal(next.economy.cash, 15000000);
  assert.equal(next.economy.transactions.at(-1).asset, 'bonds');
});
