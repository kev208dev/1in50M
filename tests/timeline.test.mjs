import test from 'node:test';
import assert from 'node:assert/strict';
import { appendTimeline, orderTimeline } from '../dist/engine/timeline.js';

test('기록은 연도·나이·우선순위·생성 순서로 안정적으로 정렬된다', () => {
  const entries = [
    { id: 'reflection', year: 1990, age: 5, priority: 30, sequence: 2, text: '회고' },
    { id: 'olympics', year: 1988, age: 3, priority: 20, sequence: 1, text: '올림픽' },
    { id: 'decision', year: 1990, age: 5, priority: 40, sequence: 1, text: '선택' },
  ];
  assert.deepEqual(orderTimeline(entries).map((item) => item.id), ['olympics', 'reflection', 'decision']);
});

test('필러를 버리면서 기존 생애를 바꾸지 않고 기록을 추가한다', () => {
  const life = { history: [{ id: 'birth', year: 1985, age: 0, text: '출생' }] };
  const next = appendTimeline(life, [
    { id: 'filler', year: 1986, age: 1, text: '한 해가 흘렀습니다.', filler: true },
    { id: 'event', year: 1987, age: 2, text: '구체적 사건' },
  ]);
  assert.deepEqual(next.history.map((item) => item.id), ['birth', 'event']);
  assert.deepEqual(life.history.map((item) => item.id), ['birth']);
});
