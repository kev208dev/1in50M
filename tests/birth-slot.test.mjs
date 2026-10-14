import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthSlotResult, profileFromSlotResult } from '../dist/engine/birth-slot.js';

test('같은 seed는 같은 완전한 슬롯 결과를 만든다', () => {
  const first = createBirthSlotResult('birth-42', 2026);
  const second = createBirthSlotResult('birth-42', 2026);
  assert.deepEqual(first, second);
  assert.ok(first.sex.id);
  assert.ok(first.region.district);
  assert.equal(first.personality.rolls.length, 3);
  assert.ok(first.appearance.faceShape);
  assert.ok(first.name.full);
});

test('슬롯 결과는 기존 엔진이 받을 수 있는 프로필이 된다', () => {
  const profile = profileFromSlotResult(createBirthSlotResult('profile-7', 2026));
  assert.equal(profile.birthYear, 2026);
  assert.ok(profile.guardians.length >= 1);
  assert.ok(profile.personality.strength === 'mixed' || profile.personality.dominant);
  assert.ok(profile.appearance.description.length > 10);
});
