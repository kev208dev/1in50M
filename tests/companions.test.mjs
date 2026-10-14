import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthSlotResult, profileFromSlotResult } from '../dist/engine/birth-slot.js';
import { createCompanionLives, advanceCompanionLives } from '../dist/engine/companions.js';

const profile = profileFromSlotResult(createBirthSlotResult('companion-profile', 2026));

test('같은 seed는 네 명의 같은 비교 인생을 만든다', () => {
  const first = createCompanionLives(profile, 'peer-seed');
  const second = createCompanionLives(profile, 'peer-seed');
  assert.equal(first.length, 4);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((item) => item.id)).size, 4);
});

test('비교 인생은 목표 나이까지 독립적으로 진행한다', () => {
  const companions = createCompanionLives(profile, 'peer-advance');
  const advanced = advanceCompanionLives(companions, 35);
  assert.ok(advanced.every((item) => item.age <= 35));
  assert.ok(advanced.some((item) => item.career));
  assert.deepEqual(advanced, advanceCompanionLives(companions, 35));
});

test('비교 인생은 실제 사용자가 아닌 가상 인생임을 표시한다', () => {
  const companions = createCompanionLives(profile, 'peer-fictional');
  assert.ok(companions.every((item) => item.simulationNotice.includes('가상')));
});
