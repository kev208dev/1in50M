import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthProfile } from '../dist/simulator.js';
import { createLife, advanceYear, setFocus } from '../dist/engine/life.js';

test('한 번의 진행은 나이를 정확히 1년 올린다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'life-1');
  const next = advanceYear(life);
  assert.equal(next.age, 1);
  assert.equal(next.year, 2027);
  assert.equal(next.history.filter((entry) => entry.age === 1).length, 1);
});

test('같은 상태에 중복 tick id를 적용해도 한 번만 진행한다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'life-2');
  const once = advanceYear(life, 'tick-0');
  const twice = advanceYear(once, 'tick-0');
  assert.equal(twice.age, 1);
});

test('상태는 어떤 초점에서도 0에서 100 사이를 유지한다', () => {
  let life = createLife(createBirthProfile(() => 0.42, 2026), 'life-3');
  life = setFocus(life, 'health');
  for (let i = 0; i < 90; i += 1) life = advanceYear(life, `tick-${i}`);
  assert.ok(Object.values(life.stats).every((value) => Number.isFinite(value) && value >= 0 && value <= 100));
});

test('진학 과정은 정해진 나이에 수료 상태로 전환한다', () => {
  let life = createLife(createBirthProfile(() => 0.42, 2026), 'education-transition');
  life = { ...life, age: 21, year: 2047, education: { level: 'university', status: 'enrolled', schoolType: 'general', skills: [] } };
  const next = advanceYear(life, 'graduation');
  assert.equal(next.education.status, 'completed');
});

test('건강이 완전히 소진된 중년의 삶은 90세 전에 회고로 전환할 수 있다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'health-ending');
  const next = advanceYear({ ...life, age: 59, year: 2085, stats: { ...life.stats, health: 0 } }, 'health-end');
  assert.equal(next.status, 'review');
  assert.equal(next.age, 60);
});
