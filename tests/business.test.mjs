import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceBusiness,
  resolveBusinessYear,
  startBusiness,
} from '../dist/engine/business.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const business = {
  status: 'operating', sector: 'food', capital: 50000000,
  debt: 10000000, equity: 50000000, years: 3,
};

test('창업은 폐업과 큰 사업 매각 경로를 모두 가진다', () => {
  assert.equal(resolveBusinessYear(business, { demand: 0, execution: 0 }).status, 'closed');
  const sale = resolveBusinessYear(business, { demand: 1, execution: 1 });
  assert.equal(sale.status, 'sold');
  assert.ok(sale.equity > 1000000000);
});

test('창업 자금이 부족하면 시작할 수 없고 시작하면 현금과 지분에 반영된다', () => {
  const life = makeLifeAtAge(31, { economy: { cash: 30000000 } });
  assert.throws(
    () => startBusiness(life, { sector: 'food', capital: 50000000 }),
    /창업 자금이 부족/,
  );
  const started = startBusiness(life, { sector: 'food', capital: 20000000, debt: 5000000 });
  assert.equal(started.business.status, 'operating');
  assert.equal(started.economy.cash, 10000000);
  assert.equal(started.economy.assets.businessEquity, 20000000);
});

test('사업 연간 진행은 같은 상태에서 결정적이고 정확히 한 해만 진행한다', () => {
  const life = makeLifeAtAge(34, { business });
  const first = advanceBusiness(life);
  const second = advanceBusiness(structuredClone(life));
  assert.deepEqual(first, second);
  assert.equal(first.business.years, 4);
});

test('사업의 매각이나 폐업은 경제 거래와 생애 전환점으로 남는다', () => {
  let selected = null;
  for (let index = 0; index < 50000; index += 1) {
    const life = makeLifeAtAge(40, { seed: `business-outcome-${index}`, business });
    const result = advanceBusiness(life);
    if (result.business.status !== 'operating') {
      selected = result;
      break;
    }
  }
  assert.ok(selected);
  assert.ok(selected.history.some((entry) => /사업|창업/.test(entry.label ?? '')));
  assert.ok(selected.economy.transactions.some((entry) => entry.type.startsWith('business-')));
});
