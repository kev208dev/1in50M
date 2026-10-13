import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCurrentLife, loadCurrentLife, archiveLife, listPastLives, deletePastLife, clearPastLives } from '../dist/storage.js';
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

test('손상된 중첩 기록과 사라진 결정은 복구 과정에서 제거한다', () => {
  const damaged = makeLifeAtAge(31, {
    milestones: [null, { age: 20, type: 'decision', label: '선택' }],
    history: [null, { age: 31, type: 'year', text: '한 해' }],
    pendingDecisionId: 'removed-decision',
  });
  const storage = memoryStorage({ oneIn50mLifeV2: JSON.stringify(damaged) });
  const restored = loadCurrentLife(storage);
  assert.equal(restored.pendingDecisionId, null);
  assert.ok(restored.milestones.every((item) => item && typeof item.label === 'string'));
  assert.ok(restored.history.every((item) => item && typeof item.text === 'string'));
});

test('완료한 삶은 현재 삶으로 다시 저장하지 않는다', () => {
  const storage = memoryStorage();
  assert.equal(saveCurrentLife(storage, makeLifeAtAge(90)), false);
  assert.equal(loadCurrentLife(storage), null);
});

test('전생 기록은 한 개씩 지우거나 모두 초기화할 수 있다', () => {
  const storage = memoryStorage();
  archiveLife(storage, makeLifeAtAge(90, { seed: 'first' }));
  archiveLife(storage, makeLifeAtAge(90, { seed: 'second' }));
  const target = listPastLives(storage)[0];
  assert.equal(deletePastLife(storage, target.id), true);
  assert.equal(listPastLives(storage).length, 1);
  assert.equal(clearPastLives(storage), true);
  assert.equal(listPastLives(storage).length, 0);
});

test('결과는 가장 최근 직업이 아니라 가장 오래 한 직업을 보여준다', () => {
  const summary = createLifeSummary(makeLifeAtAge(90, {
    career: {
      title: '짧은 직업', status: 'retired', years: 1,
      history: [
        { age: 20, title: '오래 한 직업', action: 'started' },
        { age: 60, title: '오래 한 직업', action: 'left' },
        { age: 89, title: '짧은 직업', action: 'started' },
      ],
    },
  }));
  assert.equal(summary.longestCareer, '오래 한 직업');
});

test('다섯 전환점은 생애 후반의 중요한 선택도 포함한다', () => {
  const milestones = [0, 5, 7, 15, 18, 25, 30, 40, 60].map((age) => ({ age, type: 'decision', label: `${age}세 선택` }));
  const summary = createLifeSummary(makeLifeAtAge(90, { milestones }));
  assert.ok(summary.turningPoints.some((point) => point.age >= 40));
});
