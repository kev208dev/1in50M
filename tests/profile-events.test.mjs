import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, eventWeight } from '../dist/engine/events.js';
import { LIFE_EVENT_BY_ID, PROFILE_EVENTS } from '../dist/data/life-events.js';
import { advanceYear } from '../dist/engine/life.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const academyEvent = LIFE_EVENT_BY_ID['academy-offer'];
const richSeoulLife = makeLifeAtAge(12, {
  profileInfluence: { modifiers: { 'education-access': 24 } },
});
const tightRuralLife = makeLifeAtAge(12, {
  profileInfluence: { modifiers: { 'education-access': -18 } },
});
const appearanceLife = makeLifeAtAge(25, {
  profile: { appearance: { grooming: 50, socialRating: 55, skinTone: 'medium' } },
});

test('가정형편과 지역은 교육 사건 가중치를 바꾼다', () => {
  assert.ok(eventWeight(richSeoulLife, academyEvent) > eventWeight(tightRuralLife, academyEvent));
});

test('외모 관련 사건은 외모를 변화시키고 인종 점수는 건드리지 않는다', () => {
  const changed = applyEvent(appearanceLife, 'fitness-routine');
  assert.ok(changed.profile.appearance.grooming > appearanceLife.profile.appearance.grooming);
  assert.equal(changed.profile.appearance.skinTone, appearanceLife.profile.appearance.skinTone);
});

test('조건 사건은 생애 단계별로 네 개 이상 제공된다', () => {
  for (const stage of ['childhood', 'youth', 'youngAdult', 'adult', 'midlife', 'senior']) {
    assert.ok(PROFILE_EVENTS.filter((event) => event.conditionStage === stage).length >= 4);
  }
});

test('장애 접근성 사건은 해당 조건이 있을 때만 가중치를 갖는다', () => {
  const event = LIFE_EVENT_BY_ID['access-support'];
  const withoutDisability = makeLifeAtAge(12, { profile: { disability: null } });
  const withDisability = makeLifeAtAge(12, {
    profile: { disability: { type: 'mobility', label: '이동 지원 필요' } },
  });
  assert.equal(eventWeight(withoutDisability, event), 0);
  assert.ok(eventWeight(withDisability, event) > 0);
});

test('한 해 진행은 외모 나이를 정확히 한 번 갱신하며 중복 틱은 무시한다', () => {
  const life = makeLifeAtAge(24, {
    focusId: 'health',
    profile: { appearance: { grooming: 50, socialRating: 55, skinTone: 'medium' } },
  });
  const advanced = advanceYear(life, 'appearance-year');
  const duplicate = advanceYear(advanced, 'appearance-year');
  assert.equal(advanced.profile.appearance.grooming, 52);
  assert.equal(advanced.profile.appearance.socialRating, 57);
  assert.equal(advanced.profile.appearance.agePresentation, 25);
  assert.deepEqual(duplicate.profile.appearance, advanced.profile.appearance);
});
