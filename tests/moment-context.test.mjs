import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMomentContext } from '../dist/ui/moment-context.js';

test('과거 기록을 읽을 때 해당 날짜와 전문을 표시하고 재생 시 현재 시점으로 돌아온다', () => {
  const nodes = Object.fromEntries(['.moment-kicker span', '[data-life="year-age"]', '#moment-copy'].map((key) => [key, { textContent: '' }]));
  const root = {
    dataset: {}, attributes: {},
    querySelector: (selector) => nodes[selector],
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
  };
  const text = '오래된 기록의 전체 내용입니다. '.repeat(100);
  renderMomentContext(root, { year: 2003, age: 1, text }, true);
  assert.equal(root.dataset.reading, 'true');
  assert.equal(root.attributes.tabindex, '0');
  assert.equal(nodes['.moment-kicker span'].textContent, '기록 다시 보기');
  assert.equal(nodes['[data-life="year-age"]'].textContent, '2003년 · 1세');
  assert.equal(nodes['#moment-copy'].textContent, text);
  renderMomentContext(root, { year: 2026, age: 24, text: '지금 일어난 일입니다.' });
  assert.equal(root.dataset.reading, 'false');
  assert.equal(root.attributes.tabindex, undefined);
  assert.equal(nodes['.moment-kicker span'].textContent, '지금 일어난 일');
  assert.equal(nodes['[data-life="year-age"]'].textContent, '2026년 · 24세');
  assert.equal(nodes['#moment-copy'].textContent, '지금 일어난 일입니다.');
});
