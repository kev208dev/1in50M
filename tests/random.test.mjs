import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashSeed } from '../dist/engine/random.js';

test('같은 seed는 같은 수열을 만든다', () => {
  const a = createRng(hashSeed('KR-2026-SEL-ABC123'));
  const b = createRng(hashSeed('KR-2026-SEL-ABC123'));
  assert.deepEqual([a.next(), a.next(), a.int(1, 10)], [b.next(), b.next(), b.int(1, 10)]);
});

test('가중 선택은 0과 1 경계에서도 유효하다', () => {
  const zero = createRng(1, () => 0);
  const nearOne = createRng(1, () => 0.999999999);
  const items = [{ value: 'a', weight: 1 }, { value: 'b', weight: 1 }];
  assert.equal(zero.weighted(items).value, 'a');
  assert.equal(nearOne.weighted(items).value, 'b');
});
