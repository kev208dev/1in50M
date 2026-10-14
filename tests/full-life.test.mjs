import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateAutomatically } from '../dist/engine/life.js';
import { createBirthProfile } from '../dist/simulator.js';

test('100개 seed가 선택지 고갈이나 NaN 없이 완주한다', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const result = simulateAutomatically(createBirthProfile(() => (seed % 97) / 97, 2026), `seed-${seed}`);
    assert.equal(result.status, 'review');
    assert.ok(result.age <= 90);
    assert.ok(Object.values(result.stats).every(Number.isFinite));
    assert.ok(Object.entries(result.economy).filter(([key]) => key !== 'assets').every(([, value]) => Number.isFinite(value)));
    assert.ok(Object.values(result.economy.assets).every(Number.isFinite));
    assert.equal(result.pendingDecisionId, null);
    assert.equal(result.pendingIdentityDiscovery, false);
  }
});
