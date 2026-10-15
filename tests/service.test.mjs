import test from 'node:test';
import assert from 'node:assert/strict';
import { assessService, serviceDecisionFor } from '../dist/engine/service.js';
import { DECISION_BY_ID } from '../dist/data/decisions.js';
import { normalizeLife } from '../dist/engine/life.js';
import { makeLifeAtAge, makeMaleLifeAtAge } from './support/life-fixtures.mjs';
import { getChoices, getDecision } from '../dist/engine/decisions.js';

test('같은 삶은 같은 병역판정을 받는다', () => {
  const life = makeMaleLifeAtAge(19, { seed: 'service-fixed' });
  assert.deepEqual(assessService(life), assessService(life));
});

test('비대상과 면제 판정에는 사용자 선택지가 없다', () => {
  const exempt = makeMaleLifeAtAge(19, { service: { status: 'exempt', grade: 6, assessedAge: 19, completed: true } });
  assert.equal(serviceDecisionFor(exempt), null);
  const nonTarget = makeLifeAtAge(19, { profile: { sex: { id: 'female', label: '여성' } } });
  assert.equal(serviceDecisionFor(nonTarget), null);
});

test('복무 결정에 면제·비대상 선택지가 존재하지 않는다', () => {
  const ids = DECISION_BY_ID['service-path'].choices.map((choice) => choice.id);
  assert.ok(!ids.includes('not-applicable'));
});

test('기존 저장본은 안전한 미판정 상태로 정규화된다', () => {
  const legacy = makeLifeAtAge(18);
  delete legacy.service;
  assert.equal(normalizeLife(legacy).service.status, 'unassessed');
});

test('지원 필요도와 건강은 판정 가능한 등급 범위를 제한한다', () => {
  const highSupport = makeMaleLifeAtAge(19, {
    profile: { disability: { type: 'medical', supportLevel: 3 } },
    stats: { health: 20 },
  });
  assert.ok(assessService(highSupport).grade >= 5);
});

test('24세 이후 미해결 복무는 다시 열리지만 더 이상 유예할 수 없다', () => {
  for (const age of [24, 25]) {
    const life = makeMaleLifeAtAge(age, {
      service: { status: 'active', grade: 2, assessedAge: 19, completed: false, nextAssessmentAge: age },
    });
    assert.equal(getDecision(life)?.id, 'service-path');
    const choices = getChoices(life, 'service-path');
    assert.equal(choices.find((choice) => choice.id === 'serve-now').enabled, true);
    assert.equal(choices.find((choice) => choice.id === 'defer-study').enabled, false);
    assert.equal(choices.find((choice) => choice.id === 'defer-work').enabled, false);
  }
});
