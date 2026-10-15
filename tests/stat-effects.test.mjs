import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiminishingEffects } from '../dist/engine/stat-effects.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('같은 긍정 효과는 상한에 가까울수록 작게 적용된다', () => {
  const low = applyDiminishingEffects(makeLifeAtAge(20, { stats: { knowledge: 30 } }), { knowledge: 10 });
  const high = applyDiminishingEffects(makeLifeAtAge(20, { stats: { knowledge: 95 } }), { knowledge: 10 });
  assert.ok(low.stats.knowledge - 30 > high.stats.knowledge - 95);
});

test('부정 효과는 상한과 무관하게 적용되고 능력치는 범위를 벗어나지 않는다', () => {
  const next = applyDiminishingEffects(makeLifeAtAge(20, { stats: { health: 2, happiness: 99 } }), { health: -8, happiness: 20 });
  assert.equal(next.stats.health, 0);
  assert.ok(next.stats.happiness <= 100);
});
