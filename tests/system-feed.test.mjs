import test from 'node:test';
import assert from 'node:assert/strict';
import { systemFeedItems, renderSystemFeed } from '../dist/ui/system-feed.js';

function feedRoot() {
  const node = (tagName) => ({ tagName, dataset: {}, children: [], textContent: '', append(...items) { this.children.push(...items); } });
  return {
    ownerDocument: { createElement: node }, children: [], scrollLeft: 0, scrollTop: 0,
    clientWidth: 300, clientHeight: 32, scrollHeight: 32,
    get scrollWidth() { return this.children.length * 300; },
    replaceChildren(...items) {
      this.children = items;
      items.forEach((item, index) => { item.offsetLeft = index * 300; item.offsetWidth = 300; });
    },
  };
}
const feedLife = { seed: 'feed', history: [
  { id: 'first', year: 2000, age: 0, text: '첫 기록' },
  { id: 'second', year: 2001, age: 1, text: '긴 기록도 눌러서 전체 내용을 읽습니다.' },
] };

test('가로 메시지 목록은 처음 표시할 때 최신 기록으로 이동한다', () => {
  const root = feedRoot();
  renderSystemFeed(root, feedLife);
  assert.equal(root.scrollLeft, 300);
  assert.equal(root.children.at(-1).tagName, 'button');
  assert.equal(root.children.at(-1).title, '긴 기록도 눌러서 전체 내용을 읽습니다.');
});

test('같은 상태를 다시 그려도 메시지 DOM과 읽던 위치를 유지한다', () => {
  const root = feedRoot();
  renderSystemFeed(root, feedLife);
  root.scrollLeft = 0;
  const first = root.children[0];
  renderSystemFeed(root, structuredClone(feedLife));
  assert.equal(root.children[0], first);
  assert.equal(root.scrollLeft, 0);
});

test('이전 기록을 읽는 동안 새 메시지가 와도 끝으로 강제 이동하지 않는다', () => {
  const root = feedRoot();
  renderSystemFeed(root, feedLife);
  root.scrollLeft = 0;
  renderSystemFeed(root, { ...feedLife, history: [...feedLife.history, { id: 'third', year: 2002, age: 2, text: '새 기록' }] });
  assert.equal(root.scrollLeft, 0);
});

test('최신 기록을 따라가는 중에는 새 메시지까지 자동 이동한다', () => {
  const root = feedRoot();
  renderSystemFeed(root, feedLife);
  root.scrollLeft = 300;
  renderSystemFeed(root, { ...feedLife, history: [...feedLife.history, { id: 'third', year: 2002, age: 2, text: '새 기록' }] });
  assert.equal(root.scrollLeft, 600);
});

test('숨겨진 화면에서 준비한 기록도 화면을 열면 최신 위치로 간다', () => {
  const root = feedRoot();
  root.clientWidth = 0;
  renderSystemFeed(root, feedLife);
  root.scrollLeft = 0;
  root.clientWidth = 300;
  renderSystemFeed(root, feedLife);
  assert.equal(root.scrollLeft, 300);
});

test('다른 삶으로 전환하면 이전 삶의 스크롤 위치 대신 최신 기록을 보여준다', () => {
  const root = feedRoot();
  renderSystemFeed(root, feedLife);
  root.scrollLeft = 0;
  renderSystemFeed(root, { ...feedLife, seed: 'new-life' });
  assert.equal(root.scrollLeft, 300);
});

test('오래된 기록이 목록에서 빠져도 읽고 있던 메시지의 위치를 유지한다', () => {
  const root = feedRoot();
  const history = Array.from({ length: 50 }, (_, index) => ({ id: `message-${index}`, year: 2000, age: 0, text: `기록 ${index}` }));
  renderSystemFeed(root, { seed: 'long', history });
  root.scrollLeft = 3010;
  renderSystemFeed(root, { seed: 'long', history: [...history, { id: 'new', year: 2001, age: 1, text: '새 기록' }] });
  assert.equal(root.children[9].dataset.messageId, 'message-10');
  assert.equal(root.scrollLeft, 2710);
});

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
