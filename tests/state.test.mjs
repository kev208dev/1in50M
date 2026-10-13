import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveCurrentLife,
  loadCurrentLife,
  clearCurrentLife,
  canStartDraw,
  getSafeStorage,
} from '../dist/storage.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('손상된 저장값은 예외 없이 빈 상태가 된다', () => {
  assert.equal(loadCurrentLife(memoryStorage({ oneIn50mLifeV2: '{broken' })), null);
});

test('현재 인생을 저장하고 복원한 뒤 지울 수 있다', () => {
  const storage = memoryStorage();
  const life = makeLifeAtAge(24);
  assert.equal(saveCurrentLife(storage, life), true);
  assert.equal(loadCurrentLife(storage).age, 24);
  assert.equal(clearCurrentLife(storage), true);
  assert.equal(loadCurrentLife(storage), null);
});

test('저장소 접근이 거부되어도 빈 상태로 복구한다', () => {
  const storage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  assert.equal(loadCurrentLife(storage), null);
  assert.equal(saveCurrentLife(storage, makeLifeAtAge(10)), false);
  assert.equal(clearCurrentLife(storage), false);
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
