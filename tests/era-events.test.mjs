import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEraEvent,
  eligibleEraEvents,
  selectEraEvent,
  resolveEraNarrative,
} from '../dist/engine/era-events.js';
import { makeLifeAtYear } from './support/life-fixtures.mjs';
import { HISTORY_EVENTS } from '../dist/data/history-events.js';

test('한국전쟁 사건은 1950~1953년에만 후보가 된다', () => {
  assert.ok(eligibleEraEvents(makeLifeAtYear(1951), 2026).some((event) => event.id === 'korean-war-displacement'));
  assert.ok(!eligibleEraEvents(makeLifeAtYear(1954), 2026).some((event) => event.id === 'korean-war-displacement'));
});

test('1997년 외환위기는 같은 삶에서 한 번만 발생한다', () => {
  const life = makeLifeAtYear(1997, { eraEventIds: ['imf-crisis'] });
  assert.ok(!eligibleEraEvents(life, 2026).some((event) => event.id === 'imf-crisis'));
});

test('미래 전망은 현재 이후에만 나오고 projection으로 표시된다', () => {
  assert.equal(eligibleEraEvents(makeLifeAtYear(2026), 2026).some((event) => event.projection), false);
  assert.equal(eligibleEraEvents(makeLifeAtYear(2035), 2026).every((event) => event.projection), true);
});

test('같은 삶과 연도는 같은 시대 사건을 선택한다', () => {
  const life = makeLifeAtYear(1997, { seed: 'history-deterministic' });
  assert.deepEqual(selectEraEvent(life, 2026), selectEraEvent(life, 2026));
});

test('시대 사건은 상태를 제한하고 출처 메타데이터를 기록한다', () => {
  const life = makeLifeAtYear(1951, { stats: { health: 2, happiness: 3 } });
  const event = eligibleEraEvents(life, 2026).find((item) => item.id === 'korean-war-displacement');
  const next = applyEraEvent(life, event);
  const recorded = next.history.find((item) => item.eraEventId === 'korean-war-displacement');
  assert.ok(next.stats.health >= 0 && next.stats.happiness >= 0);
  assert.deepEqual(next.eraEventIds, ['korean-war-displacement']);
  assert.equal(recorded.sourceLabel, '국가기록원 문화영화로 보는 대한민국');
  assert.match(recorded.sourceUrl, /^https:/);
  assert.equal(recorded.projection, false);
});

test('미성년의 시대 사건 경제 영향은 개인 현금 대신 가정 지원에 반영된다', () => {
  const life = makeLifeAtYear(1951, { age: 1, economy: { cash: 0, householdSupport: 8_000_000 } });
  const event = eligibleEraEvents(life, 2026).find((item) => item.id === 'korean-war-displacement');
  const next = applyEraEvent(life, event);
  assert.equal(next.economy.cash, 0);
  assert.equal(next.economy.householdSupport, 7_200_000);
});

test('외환위기는 아이와 노동 중인 성인에게 다른 장면으로 닿는다', () => {
  const event = HISTORY_EVENTS.find((item) => item.id === 'imf-crisis');
  const child = resolveEraNarrative(event, makeLifeAtYear(1997, { age: 6 }));
  const worker = resolveEraNarrative(event, makeLifeAtYear(1997, {
    age: 40,
    career: { status: 'employed', title: '사무원' },
  }));
  assert.match(child.text, /보호자|집/);
  assert.match(worker.text, /일자리|퇴직|직장/);
  assert.notEqual(child.text, worker.text);
});
