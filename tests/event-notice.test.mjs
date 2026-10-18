import test from 'node:test';
import assert from 'node:assert/strict';
import * as bigEvent from '../dist/ui/big-event.js';
import { systemFeedItems } from '../dist/ui/system-feed.js';

const before = { seed: 'life', history: [] };
const after = { ...before, history: [{ id: 'era-2003', type: 'era-event', year: 2003, age: 1, title: '시대의 변화', text: '새로운 시대를 경험했습니다.' }] };

test('자동 사건은 기록만 갱신하고 명시적으로 열 때만 상세 화면을 표시한다', () => {
  const shown = [];
  assert.equal(typeof bigEvent.createEventNotice, 'function');
  const notice = bigEvent.createEventNotice((event) => shown.push(event));
  assert.equal(notice.update(before, after), true);
  assert.equal(shown.length, 0);
  assert.equal(systemFeedItems(after)[0].text, '새로운 시대를 경험했습니다.');
  notice.open();
  assert.equal(shown.length, 1);
  assert.equal(shown[0].year, 2003);
});

test('새 사건이 없는 동안 상세 보기를 유지하고 새 삶에서는 초기화한다', () => {
  const shown = [];
  assert.equal(typeof bigEvent.createEventNotice, 'function');
  const notice = bigEvent.createEventNotice((event) => shown.push(event));
  notice.update(before, after);
  assert.equal(notice.update(after, after), true);
  notice.open();
  assert.equal(shown[0].id, 'era-2003');
  assert.equal(notice.update(after, { seed: 'new', history: [] }), false);
  notice.open();
  assert.equal(shown.length, 1);
});
