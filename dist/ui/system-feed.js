import { orderTimeline } from '../engine/timeline.js';

const TYPE_META = {
  decision: { kind: 'choice', label: '선택 결과' },
  finance: { kind: 'finance', label: '금융' },
  'era-event': { kind: 'history', label: '역사' },
  'service-assessment': { kind: 'auto', label: '자동 발생' },
  event: { kind: 'auto', label: '자동 발생' },
  relationship: { kind: 'auto', label: '자동 발생' },
  career: { kind: 'auto', label: '자동 발생' },
  birth: { kind: 'system', label: '시스템' },
  review: { kind: 'system', label: '시스템' },
  reflection: { kind: 'choice', label: '회고 선택' },
};

const renderedFeeds = new WeakMap();

export function systemFeedItems(life, limit = 5) {
  const seen = new Set();
  const items = [];
  for (const entry of orderTimeline(life?.history ?? [])) {
    const id = String(entry.id ?? `${entry.year}-${entry.age}-${entry.text}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const meta = entry.type === 'era-event' && entry.projection
      ? { kind: 'history', label: '미래 전망' }
      : TYPE_META[entry.type] ?? { kind: 'auto', label: '자동 발생' };
    items.push({
      id,
      year: entry.year,
      age: entry.age,
      text: entry.text,
      ...meta,
    });
  }
  return items.slice(-Math.max(1, Number(limit) || 5));
}

export function renderSystemFeed(root, life, limit = 50) {
  if (!root) return;
  if (!root.clientWidth) {
    renderedFeeds.delete(root);
    return;
  }
  const items = systemFeedItems(life, limit);
  const signature = JSON.stringify([life?.seed, items]);
  const previous = renderedFeeds.get(root);
  if (previous?.signature === signature) return;
  const followLatest = !previous || previous.seed !== life?.seed || !root.children.length || root.scrollHeight - root.clientHeight - root.scrollTop < 24;
  const previousTop = root.scrollTop;
  const anchor = !followLatest && [...root.children].find((row) => row.offsetTop + row.offsetHeight > previousTop);
  const anchorOffset = anchor ? previousTop - anchor.offsetTop : 0;
  const documentRef = root.ownerDocument ?? document;
  root.replaceChildren(...items.map((item) => {
    const row = documentRef.createElement('button');
    row.type = 'button';
    row.className = `system-feed-item is-${item.kind}`;
    row.dataset.messageId = item.id;
    row.title = item.text;
    const badge = documentRef.createElement('b');
    badge.textContent = item.label;
    const when = documentRef.createElement('span');
    when.textContent = `${item.year} · ${item.age}세`;
    const text = documentRef.createElement('span');
    text.className = 'system-feed-text';
    text.textContent = item.text;
    row.append(badge, when, text);
    return row;
  }));
  const retained = anchor && [...root.children].find((row) => row.dataset.messageId === anchor.dataset.messageId);
  root.scrollTop = followLatest
    ? Math.max(0, root.scrollHeight - root.clientHeight)
    : retained ? Math.max(0, retained.offsetTop + anchorOffset) : 0;
  renderedFeeds.set(root, { signature, seed: life?.seed });
}
