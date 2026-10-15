import test from 'node:test';
import assert from 'node:assert/strict';
import { createCohortPeers, advanceCohort } from '../dist/engine/cohort.js';
import { createBirthProfile } from '../dist/simulator.js';
import { createLife, normalizeLife } from '../dist/engine/life.js';

const profile = createBirthProfile(() => 0.42, 1990);

test('비교 인물은 다른 지역·형편의 네 명이며 같은 시드에서 재현된다', () => {
  const first = createCohortPeers(profile, 'cohort-1');
  const second = createCohortPeers(profile, 'cohort-1');
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(new Set(first.map((item) => item.regionCode)).size, 4);
  assert.ok(first.every((item) => item.regionCode !== profile.region.code));
});

test('비교 인물은 단계 경계에서만 상태가 바뀐다', () => {
  const peers = createCohortPeers(profile, 'cohort-2');
  assert.deepEqual(advanceCohort(peers, 8), advanceCohort(peers, 12));
  assert.notDeepEqual(advanceCohort(peers, 12), advanceCohort(peers, 18));
});

test('새 삶은 비교 인물 네 명을 저장하고 기존 저장본은 빈 배열로 복구한다', () => {
  assert.equal(createLife(profile, 'cohort-life').cohort.length, 4);
  const legacy = createLife(profile, 'legacy-cohort');
  delete legacy.cohort;
  assert.deepEqual(normalizeLife(legacy).cohort, []);
});
