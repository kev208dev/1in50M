import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../dist/engine/random.js';
import {
  advanceAppearance,
  appearanceInfluence,
  createAppearance,
  describeAppearance,
} from '../dist/engine/appearance.js';
import { advanceYear, normalizeLife } from '../dist/engine/life.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('외모는 여러 축을 가진 자연스러운 설명을 만든다', () => {
  const appearance = createAppearance(createRng('appearance-1'), {
    sex: 'female',
    ancestry: 'korean',
  });
  const text = describeAppearance(appearance, { sexLabel: '여성' });
  assert.ok(['cat', 'dog', 'fox', 'rabbit', 'bear', 'dinosaur', 'gentle', 'cool'].includes(appearance.faceShape));
  assert.ok(Number.isFinite(appearance.heightCm));
  assert.ok(text.includes('여성'));
  assert.ok(appearance.build);
  assert.ok(appearance.hairTexture);
  assert.ok(appearance.style);
});

test('인종과 장애는 외모 평가 점수를 바꾸지 않는다', () => {
  const appearance = createAppearance(createRng('same-body'), { sex: 'male', ancestry: 'korean' });
  assert.equal(
    appearanceInfluence({ ...appearance, ancestry: 'black', disability: { type: 'mobility' } }, 'first-impression'),
    appearanceInfluence({ ...appearance, ancestry: 'korean', disability: null }, 'first-impression'),
  );
});

test('외모지상주의 영향은 연애와 첫인상에서 크게 작동하고 지식에는 개입하지 않는다', () => {
  const appearance = { socialRating: 90 };
  assert.ok(appearanceInfluence(appearance, 'romance') >= 18);
  assert.ok(appearanceInfluence(appearance, 'first-impression') >= 12);
  assert.equal(appearanceInfluence(appearance, 'knowledge'), 0);
});

test('건강 관리와 스트레스는 생애 중 관리 상태를 변화시킨다', () => {
  const base = { grooming: 50, socialRating: 60 };
  const healthier = advanceAppearance(base, { age: 25, focusId: 'health', stats: { happiness: 70 } });
  const stressed = advanceAppearance(base, { age: 25, focusId: 'career', stats: { happiness: 20 } });
  assert.ok(healthier.grooming > base.grooming);
  assert.ok(stressed.grooming < base.grooming);
  assert.equal(healthier.agePresentation, 25);
});

test('변화한 외모 점수는 현재 첫인상 영향에 다시 반영된다', () => {
  let life = makeLifeAtAge(20, {
    focusId: 'health',
    profile: { appearance: { grooming: 44, socialRating: 44 } },
  });
  life = normalizeLife(life);
  const before = life.profileInfluence.modifiers['first-impression'];
  for (let year = 0; year < 10; year += 1) life = advanceYear(life, `appearance-${year}`);
  assert.ok(life.profile.appearance.socialRating > 44);
  assert.ok(life.profileInfluence.modifiers['first-impression'] > before);
  assert.equal(
    life.profileInfluence.modifiers['first-impression'],
    appearanceInfluence(life.profile.appearance, 'first-impression'),
  );
});
