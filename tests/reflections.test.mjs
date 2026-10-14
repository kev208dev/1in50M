import test from 'node:test';
import assert from 'node:assert/strict';
import { getReflection, applyReflection } from '../dist/data/reflections.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('정해진 다섯 나이에만 회고를 연다', () => {
  assert.equal(getReflection(makeLifeAtAge(30)).age, 30);
  assert.equal(getReflection(makeLifeAtAge(29)), null);
  assert.deepEqual([5, 15, 30, 50, 70].map((age) => getReflection(makeLifeAtAge(age))?.age), [5, 15, 30, 50, 70]);
});

test('회고 선택을 기록하면 같은 회고를 다시 열지 않는다', () => {
  const life = makeLifeAtAge(30);
  const next = applyReflection(life, 'people');
  assert.equal(next.reflections['reflection-30'], 'people');
  assert.equal(getReflection(next), null);
  assert.ok(next.history.some((entry) => entry.type === 'reflection'));
});

test('알 수 없는 회고 선택은 거부한다', () => {
  assert.throws(() => applyReflection(makeLifeAtAge(30), 'unknown'), /회고/);
});
