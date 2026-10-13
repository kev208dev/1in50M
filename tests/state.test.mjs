import test from 'node:test';
import assert from 'node:assert/strict';
import { readSavedState, writeSavedState, createHistoryState, canStartDraw, getSafeStorage } from '../dist/state.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('손상된 저장값은 예외 없이 빈 상태가 된다', () => {
  assert.deepEqual(
    readSavedState(memoryStorage({ oneIn50mState: '{broken' })),
    { current: null, previous: null },
  );
});

test('현재와 직전 인생을 저장하고 복원한다', () => {
  const storage = memoryStorage();
  const state = createHistoryState({ id: 'new' }, { id: 'old' });
  writeSavedState(storage, state);
  assert.deepEqual(readSavedState(storage), state);
});

test('저장소 접근이 거부되어도 빈 상태로 복구한다', () => {
  const storage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  assert.deepEqual(readSavedState(storage), { current: null, previous: null });
  assert.equal(writeSavedState(storage, createHistoryState(null, null)), false);
});

test('생성 중에만 새 생성을 막고 버튼이 활성화되면 바로 허용한다', () => {
  assert.equal(canStartDraw(true, 0, 5000), false);
  assert.equal(canStartDraw(false, 4500, 5000), true);
  assert.equal(canStartDraw(false, 3000, 5000), true);
});

test('localStorage 속성 접근 자체가 거부되어도 null로 복구한다', () => {
  const hostileWindow = {};
  Object.defineProperty(hostileWindow, 'localStorage', {
    get() { throw new Error('blocked'); },
  });
  assert.equal(getSafeStorage(hostileWindow), null);
});
