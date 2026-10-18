import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('매수·매도 버튼은 실제 현금과 보유액의 경계를 구분한다', async () => {
  const { financeMenuState } = await import('../dist/ui/finance-menu.js');
  const life = makeLifeAtAge(30, { economy: { cash: 999999, assets: { stocks: 1000000 } } });
  let menu = financeMenuState(life);
  assert.equal(menu['stock-buy']?.enabled, false);
  assert.match(menu['stock-buy'].reason, /현금/);
  assert.equal(menu['stock-sell'].enabled, true);
  life.economy.cash = 1000000;
  life.economy.assets.stocks = 999999;
  menu = financeMenuState(life);
  assert.equal(menu['stock-buy'].enabled, true);
  assert.equal(menu['stock-sell'].enabled, false);
});

test('시대·복권 대기·지도 선택 조건을 거래 전에 알린다', async () => {
  const { financeMenuState } = await import('../dist/ui/finance-menu.js');
  const life = makeLifeAtAge(30, { year: 2009, economy: { cash: 20000000 } });
  let menu = financeMenuState(life);
  assert.match(menu['crypto-buy']?.reason ?? '', /2010/);
  assert.equal(menu['property-buy'].enabled, false);
  assert.equal(menu['lottery-broadcast'].enabled, false);
  life.year = 2010;
  life.economy.pendingLotteryDraw = { id: 'pending' };
  menu = financeMenuState(life, '서울특별시');
  assert.equal(menu['crypto-buy'].enabled, true);
  assert.equal(menu['property-buy'].enabled, true);
  assert.equal(menu['property-buy'].action.region, '서울특별시');
  assert.equal(menu['lottery-buy'].enabled, false);
  assert.equal(menu['lottery-broadcast'].enabled, true);
});
