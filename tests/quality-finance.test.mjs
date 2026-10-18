import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFinancialAction, purchaseLotteryTicket, revealLotteryBroadcast } from '../dist/engine/finance.js';
import { createSimulationController } from '../dist/ui/controls.js';
import { systemFeedItems } from '../dist/ui/system-feed.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('100건이 넘는 같은 해 거래도 서로 다른 기록으로 남는다', () => {
  const controller = createSimulationController({ initialLife: makeLifeAtAge(30, { economy: { cash: 200000000 } }) });
  for (let index = 0; index < 105; index += 1) controller.performFinancialAction({ type: 'buy', asset: 'stocks', amount: 1000000 });
  const life = controller.getState();
  assert.equal(life.economy.transactions.length, 100);
  assert.equal(new Set(life.economy.transactions.map((entry) => entry.id)).size, 100);
  assert.equal(systemFeedItems(life, 200).filter((entry) => entry.kind === 'finance').length, 105);
});

test('같은 해 복권을 새로 사면 새 추첨을 하되 저장 복원 결과는 재현된다', () => {
  let life = makeLifeAtAge(30, { seed: 'quality-lottery', economy: { cash: 20000000 } });
  const tiers = new Set();
  const ids = new Set();
  for (let index = 0; index < 500; index += 1) {
    const ticket = purchaseLotteryTicket(life);
    assert.deepEqual(ticket.economy.pendingLotteryDraw, purchaseLotteryTicket(JSON.parse(JSON.stringify(life))).economy.pendingLotteryDraw);
    tiers.add(ticket.economy.pendingLotteryDraw.tier);
    ids.add(ticket.economy.pendingLotteryDraw.id);
    life = revealLotteryBroadcast(ticket);
  }
  assert.equal(ids.size, 500);
  assert.ok(tiers.size > 1, '매번 같은 해의 추첨 결과를 재사용하지 않아야 한다');
});

test('0원·음수·유효하지 않은 금액으로 무료 복권이나 거래를 만들 수 없다', () => {
  const life = makeLifeAtAge(30, { economy: { cash: 1000000 } });
  for (const amount of [0, -1, NaN, Infinity]) {
    assert.throws(() => purchaseLotteryTicket(life, { amount, roll: 1 }), RangeError);
    assert.throws(() => applyFinancialAction(life, { type: 'lottery', amount, roll: 1 }), RangeError);
    assert.throws(() => applyFinancialAction(life, { type: 'buy', asset: 'stocks', amount }), RangeError);
  }
  assert.equal(life.economy.cash, 1000000);
});
