import test from 'node:test';
import assert from 'node:assert/strict';
import { LIFE_EVENTS, PROFILE_EVENTS } from '../dist/data/life-events.js';
import { selectAnnualEvents, applyEvent } from '../dist/engine/events.js';
import { changeHousing, updateRelationships } from '../dist/engine/relationships.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('생애 단계별 사건을 합쳐 최소 48개 제공한다', () => {
  assert.ok(LIFE_EVENTS.length >= 48);
  for (const stage of ['childhood', 'school', 'young-adult', 'adult', 'midlife', 'senior']) {
    assert.ok(LIFE_EVENTS.filter((event) => event.stage === stage).length >= 6);
  }
});

test('조건형 사건은 조건이나 가중치 또는 실제 상태 변화를 가진다', () => {
  assert.ok(PROFILE_EVENTS.length >= 29);
  for (const event of PROFILE_EVENTS) {
    assert.ok(event.text.length > 0);
    assert.ok(Array.isArray(event.ageRange));
    assert.ok(
      typeof event.when === 'function'
      || typeof event.weightFor === 'function'
      || Object.keys(event.effects ?? {}).length > 0
      || Object.keys(event.economyEffects ?? {}).length > 0
      || Object.keys(event.appearanceEffects ?? {}).length > 0,
    );
  }
});

test('최근 발생한 사건은 쿨다운 동안 다시 나오지 않는다', () => {
  const life = makeLifeAtAge(32, { recentEventIds: ['work-project-success'] });
  assert.ok(selectAnnualEvents(life).every((event) => event.id !== 'work-project-success'));
});

test('감당할 수 없는 자가 선택은 원래 상태를 유지한다', () => {
  const life = makeLifeAtAge(30, { economy: { cash: 1000000, debt: 0, netWorth: 1000000 } });
  const result = changeHousing(life, 'owned-home');
  assert.equal(result.ok, false);
  assert.equal(result.life.housing.type, life.housing.type);
});

test('사건과 관계 갱신은 원본을 바꾸지 않고 기록을 남긴다', () => {
  const life = makeLifeAtAge(10);
  const event = selectAnnualEvents(life)[0];
  const afterEvent = applyEvent(life, event.id);
  const afterRelationship = updateRelationships(afterEvent);
  assert.notEqual(afterEvent, life);
  assert.ok(afterEvent.history.some((entry) => entry.eventId === event.id));
  assert.ok(Array.isArray(afterRelationship.relationships.friends));
});

test('사건은 쿨다운이 지난 뒤 다시 후보가 될 수 있다', () => {
  const life = makeLifeAtAge(70, {
    recentEventIds: LIFE_EVENTS.filter((event) => event.stage === 'senior').map((event) => event.id),
    history: LIFE_EVENTS.filter((event) => event.stage === 'senior').map((event, index) => ({
      id: `old-${event.id}`, eventId: event.id, type: 'event', age: 60 + index, year: 2086 + index, text: event.text,
    })),
  });
  assert.ok(selectAnnualEvents(life).length > 0);
});
