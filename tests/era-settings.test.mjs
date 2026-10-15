import test from 'node:test';
import assert from 'node:assert/strict';
import { ERA_OPTIONS, eraForYear } from '../dist/data/eras.js';
import { resolveBirthYear } from '../dist/data/runtime-settings.js';

test('1950년대부터 2020년대와 미래를 고를 수 있다', () => {
  assert.deepEqual(ERA_OPTIONS.map((item) => item.id), [
    'random', '1950s', '1960s', '1970s', '1980s', '1990s',
    '2000s', '2010s', '2020s', 'future',
  ]);
});

test('각 연대는 해당 10년 안에서만 출생연도를 만든다', () => {
  for (const start of [1950, 1960, 1970, 1980, 1990, 2000, 2010]) {
    const year = resolveBirthYear({ era: `${start}s` }, `seed-${start}`, 2026);
    assert.ok(year >= start && year <= start + 9, `${start}: ${year}`);
  }
});

test('2020년대는 현재 연도 뒤를 만들지 않는다', () => {
  for (let index = 0; index < 100; index += 1) {
    const year = resolveBirthYear({ era: '2020s' }, `current-${index}`, 2026);
    assert.ok(year >= 2020 && year <= 2026);
  }
});

test('달력 연도를 시대 id로 분류한다', () => {
  assert.equal(eraForYear(1957, 2026).id, '1950s');
  assert.equal(eraForYear(2026, 2026).id, '2020s');
  assert.equal(eraForYear(2037, 2026).id, 'future');
});
