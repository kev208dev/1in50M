import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIdentityArc,
  revealIdentityIfDue,
  acknowledgeIdentityDiscovery,
} from '../dist/engine/identity.js';
import { normalizeLife } from '../dist/engine/life.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('10,000개 고정 seed에서 약 5%가 LGBT+ 정체성 경로를 가진다', () => {
  const arcs = Array.from({ length: 10000 }, (_, index) => createIdentityArc(`identity-${index}`));
  const rate = arcs.filter((arc) => arc.assigned).length / arcs.length;
  assert.ok(rate >= 0.045 && rate <= 0.055, rate);
});

test('같은 seed는 같은 정체성과 발견 나이를 만든다', () => {
  assert.deepEqual(createIdentityArc('same-seed'), createIdentityArc('same-seed'));
});

test('발견 나이는 16세부터 24세 사이다', () => {
  for (let index = 0; index < 20000; index += 1) {
    const arc = createIdentityArc(`age-${index}`);
    if (arc.assigned) assert.ok(arc.discoveryAge >= 16 && arc.discoveryAge <= 24);
  }
});

test('정체성 발견은 상태 수치를 직접 바꾸지 않고 한 번만 열린다', () => {
  const life = makeLifeAtAge(18, {
    identity: { assigned: 'bisexual', label: '양성애자', discoveryAge: 18, discovered: false, acknowledged: false },
  });
  const first = revealIdentityIfDue(life);
  const second = revealIdentityIfDue(first);
  assert.deepEqual(first.stats, life.stats);
  assert.deepEqual(first.economy, life.economy);
  assert.equal(first.pendingIdentityDiscovery, true);
  assert.equal(second.history.filter((entry) => entry.type === 'identity-discovery').length, 1);
});

test('확인한 정체성 사건은 같은 삶에서 다시 대기 상태가 되지 않는다', () => {
  const discovered = revealIdentityIfDue(makeLifeAtAge(18, {
    identity: { assigned: 'bisexual', label: '양성애자', discoveryAge: 18, discovered: false, acknowledged: false },
  }));
  const acknowledged = acknowledgeIdentityDiscovery(discovered);
  assert.equal(acknowledged.pendingIdentityDiscovery, false);
  assert.equal(acknowledged.identity.acknowledged, true);
  assert.equal(revealIdentityIfDue(acknowledged).pendingIdentityDiscovery, false);
});

test('버전 2 저장본도 안전한 기본 정체성 상태로 정규화된다', () => {
  const migrated = normalizeLife({ ...makeLifeAtAge(30), version: 2, identity: undefined });
  assert.equal(typeof migrated.identity.discovered, 'boolean');
  assert.equal(typeof migrated.pendingIdentityDiscovery, 'boolean');
});
