import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCurrentLife, loadCurrentLife, archiveLife, listPastLives } from '../dist/storage.js';
import { createLifeSummary } from '../dist/engine/summary.js';
import { memoryStorage, makeLifeAtAge } from './support/life-fixtures.mjs';

test('손상된 저장값은 예외 없이 빈 결과가 된다', () => {
  const storage = memoryStorage({ oneIn50mLifeV2: '{broken' });
  assert.equal(loadCurrentLife(storage), null);
});

test('알 수 없는 학교와 직업 ID는 일반 경로로 복구한다', () => {
  const storage = memoryStorage();
  saveCurrentLife(storage, makeLifeAtAge(30, {
    education: { schoolType: 'removed-school', level: 'removed-level' },
    career: { careerId: 'removed-career', status: 'employed' },
  }));
  const restored = loadCurrentLife(storage);
  assert.equal(restored.education.schoolType, 'general');
  assert.equal(restored.career.careerId, null);
});

test('전생 기록은 최신 10개만 보존한다', () => {
  const storage = memoryStorage();
  for (let index = 0; index < 12; index += 1) archiveLife(storage, makeLifeAtAge(90, { seed: `seed-${index}` }));
  assert.equal(listPastLives(storage).length, 10);
});

test('결과 요약은 점수나 성공 등급을 만들지 않는다', () => {
  const summary = createLifeSummary(makeLifeAtAge(90));
  assert.equal('score' in summary, false);
  assert.equal('grade' in summary, false);
  assert.equal(summary.turningPoints.length, 5);
});

test('결과 서사는 학교 유형 ID 대신 한국어 이름을 사용한다', () => {
  const summary = createLifeSummary(makeLifeAtAge(90, {
    education: { schoolType: 'arts', level: 'high-school' },
  }));
  assert.match(summary.narrative, /예술고 경로/);
  assert.doesNotMatch(summary.narrative, /arts 경로/);
});
