import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStatistic,
  historicalDistrictName,
  isAvailableInYear,
} from '../dist/engine/historical-context.js';

test('화성은 2001년 이전에는 군, 이후에는 시로 표시된다', () => {
  assert.equal(historicalDistrictName('GGD', '화성시', 1985), '화성군');
  assert.equal(historicalDistrictName('GGD', '화성시', 2001), '화성시');
});

test('제도 시작 연도와 종료 연도 경계를 포함해 판정한다', () => {
  assert.equal(isAvailableInYear({ availableFrom: 2004 }, 2003), false);
  assert.equal(isAvailableInYear({ availableFrom: 2004 }, 2004), true);
  assert.equal(isAvailableInYear({ availableUntil: 2010 }, 2010), true);
  assert.equal(isAvailableInYear({ availableUntil: 2010 }, 2011), false);
  assert.equal(isAvailableInYear({ availableFrom: 2004 }, 'not-a-year'), false);
});

test('통계 범위 밖 연도는 출처가 있는 가장 가까운 값과 성격을 돌려준다', () => {
  const early = getStatistic('lifeExpectancy', { year: 1900, sex: 'male' });
  const future = getStatistic('lifeExpectancy', { year: 2100, sex: 'female' });
  assert.deepEqual(
    { value: early.value, year: early.year, kind: early.kind },
    { value: 64.6, year: 1985, kind: 'modeled' },
  );
  assert.deepEqual(
    { value: future.value, year: future.year, kind: future.kind },
    { value: 86.6, year: 2024, kind: 'statistic' },
  );
  assert.equal(future.sourceKey, 'lifeTable2024');
});

test('알 수 없는 통계 항목은 명시적인 모델링 빈값을 돌려준다', () => {
  assert.deepEqual(getStatistic('missing', { year: 2026 }), {
    value: null,
    year: null,
    sourceKey: null,
    kind: 'modeled',
  });
});
