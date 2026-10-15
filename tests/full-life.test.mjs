import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateAutomatically } from '../dist/engine/life.js';
import { createBirthProfile } from '../dist/simulator.js';
import { createLifeSummary } from '../dist/engine/summary.js';
import { createLifeViewModel } from '../dist/ui/render.js';
import { createBirthSlotResult, profileFromSlotResult } from '../dist/engine/birth-slot.js';
import { HISTORY_EVENTS } from '../dist/data/history-events.js';
import { FUTURE_EVENTS } from '../dist/data/future-events.js';

const ERA_EVENTS_BY_ID = new Map([...HISTORY_EVENTS, ...FUTURE_EVENTS].map((event) => [event.id, event]));

function simulateEraLife(seed, birthYear) {
  const profile = profileFromSlotResult(createBirthSlotResult(seed, birthYear));
  profile.sex = { id: 'male', label: '남성' };
  return simulateAutomatically(profile, `era-${seed}`);
}

function assertIntegratedLife(life) {
  assert.equal(life.status, 'review');
  assert.ok(life.age <= 90);
  assert.ok(Object.values(life.stats).every(Number.isFinite));
  assert.ok(Object.values(life.economy.assets).every(Number.isFinite));
  assert.equal('companions' in life, false);
  if (life.age >= 19) assert.notEqual(life.service.status, 'unassessed');
  for (const entry of life.history.filter((item) => item.type === 'era-event')) {
    const definition = ERA_EVENTS_BY_ID.get(entry.eraEventId);
    assert.ok(definition, `알 수 없는 시대 사건: ${entry.eraEventId}`);
    assert.ok(entry.year >= definition.startYear && entry.year <= definition.endYear);
  }
}

test('100개 seed가 선택지 고갈이나 NaN 없이 완주한다', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const result = simulateAutomatically(createBirthProfile(() => (seed % 97) / 97, 2026), `seed-${seed}`);
    assert.equal(result.status, 'review');
    assert.ok(result.age <= 90);
    assert.ok(Object.values(result.stats).every(Number.isFinite));
    assert.ok(Object.entries(result.economy)
      .filter(([key]) => !['assets', 'transactions', 'lastReturns', 'pendingLotteryDraw'].includes(key))
      .every(([, value]) => Number.isFinite(value)));
    assert.ok(Object.values(result.economy.assets).every(Number.isFinite));
    assert.equal(result.pendingDecisionId, null);
    assert.equal(result.pendingIdentityDiscovery, false);
  }
});

test('완주한 삶의 확장 상태는 화면과 인과 요약으로 직렬화된다', () => {
  const life = simulateAutomatically(createBirthProfile(() => 0.42, 2026), 'expanded-summary');
  const view = createLifeViewModel(life);
  const summary = createLifeSummary(life);
  assert.ok(view.assets.every((asset) => typeof asset.value === 'string'));
  assert.equal(typeof view.appearance, 'string');
  assert.ok(Array.isArray(summary.influences));
  assert.doesNotMatch(JSON.stringify({ view, summary }), /\[object Object\]/);
});

test('1950·1990·2026·미래 출생 삶이 시대 규칙을 지키며 완주한다', () => {
  const lives = [
    simulateEraLife('era-1950-literal', 1950),
    simulateEraLife('era-1990-literal', 1990),
    simulateEraLife('era-2026-literal', 2026),
    simulateEraLife('era-future-literal', 2035),
  ];
  lives.forEach(assertIntegratedLife);
  const futureEvents = lives[3].history.filter((item) => item.type === 'era-event');
  assert.ok(futureEvents.length > 0);
  assert.ok(futureEvents.every((entry) => entry.projection === true));
});
