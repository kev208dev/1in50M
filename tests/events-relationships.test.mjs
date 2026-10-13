import test from 'node:test';
import assert from 'node:assert/strict';
import { LIFE_EVENTS } from '../dist/data/life-events.js';
import { selectAnnualEvents, applyEvent } from '../dist/engine/events.js';
import { changeHousing, updateRelationships } from '../dist/engine/relationships.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('생애 단계별 사건을 합쳐 최소 48개 제공한다', () => {
  assert.ok(LIFE_EVENTS.length >= 48);
  for (const stage of ['childhood', 'school', 'young-adult', 'adult', 'midlife', 'senior']) {
    assert.ok(LIFE_EVENTS.filter((event) => event.stage === stage).length >= 6);
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
