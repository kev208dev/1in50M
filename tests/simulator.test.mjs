import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../dist/data.js';
import { weightedPick, createBirthProfile, validateProfile } from '../dist/simulator.js';

test('대한민국 17개 시도를 모두 제공한다', () => {
  assert.equal(REGIONS.length, 17);
  assert.equal(new Set(REGIONS.map((region) => region.name)).size, 17);
  assert.ok(REGIONS.every((region) => region.districts.length >= 3));
});

test('가중 선택은 양쪽 경계에서도 후보를 반환한다', () => {
  const items = [{ value: '처음', weight: 1 }, { value: '끝', weight: 1 }];
  assert.equal(weightedPick(items, 0).value, '처음');
  assert.equal(weightedPick(items, 0.999999).value, '끝');
});

test('생성된 프로필은 필수 필드와 0~100 능력치를 가진다', () => {
  const profile = createBirthProfile(() => 0.42, 2026);
  assert.equal(profile.birthYear, 2026);
  assert.equal(validateProfile(profile), true);
  assert.ok(Object.values(profile.stats).every((value) => value >= 0 && value <= 100));
});

test('렌더링할 수 없는 저장 프로필을 거부한다', () => {
  const valid = createBirthProfile(() => 0.42, 2026);
  assert.equal(validateProfile({ ...valid, id: 123 }), false);
  assert.equal(validateProfile({ ...valid, guardians: [null] }), false);
  assert.equal(validateProfile({ ...valid, stats: { ...valid.stats, surprise: 88 } }), false);
});
