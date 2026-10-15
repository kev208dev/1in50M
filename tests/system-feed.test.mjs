import test from 'node:test';
import assert from 'node:assert/strict';
import { systemFeedItems } from '../dist/ui/system-feed.js';

test('하단 시스템 메시지는 자동 사건·역사·선택·금융 결과를 시간순으로 구분한다', () => {
  const life = {
    history: [
      { id: 'a', age: 20, year: 2020, type: 'event', text: '질병이 발생했습니다.' },
      { id: 'b', age: 21, year: 2021, type: 'era-event', text: '역사적 사건이 발생했습니다.' },
      { id: 'c', age: 22, year: 2022, type: 'decision', text: '직업을 선택했습니다.' },
      { id: 'd', age: 23, year: 2023, type: 'finance', text: '주식을 매수했습니다.' },
    ],
  };
  const items = systemFeedItems(life, 4);
  assert.deepEqual(items.map((item) => item.kind), ['auto', 'history', 'choice', 'finance']);
  assert.deepEqual(items.map((item) => item.label), ['자동 발생', '역사', '선택 결과', '금융']);
});

test('같은 id의 시스템 메시지는 한 번만 나오고 최신 개수만 유지한다', () => {
  const life = { history: [
    { id: 'same', age: 1, year: 2001, type: 'event', text: '첫 메시지' },
    { id: 'same', age: 1, year: 2001, type: 'event', text: '중복 메시지' },
    { id: 'new', age: 2, year: 2002, type: 'decision', text: '새 메시지' },
  ] };
  assert.deepEqual(systemFeedItems(life, 2).map((item) => item.text), ['첫 메시지', '새 메시지']);
});

test('변화 없는 해의 필러 문장은 시스템 기록에서 제외한다', () => {
  const life = { history: [
    { id: 'filler', age: 6, year: 1991, type: 'event', text: '한 해가 흘렀습니다.', filler: true },
  ] };
  assert.equal(systemFeedItems(life).length, 0);
});
