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
};

export function systemFeedItems(life, limit = 5) {
  const seen = new Set();
  const items = [];
  for (const entry of life?.history ?? []) {
    const id = String(entry.id ?? `${entry.year}-${entry.age}-${entry.text}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const meta = TYPE_META[entry.type] ?? { kind: 'auto', label: '자동 발생' };
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

export function renderSystemFeed(root, life, limit = 5) {
  if (!root) return;
  const documentRef = root.ownerDocument ?? document;
  root.replaceChildren(...systemFeedItems(life, limit).map((item) => {
    const row = documentRef.createElement('div');
    row.className = `system-feed-item is-${item.kind}`;
    row.dataset.messageId = item.id;
    const badge = documentRef.createElement('b');
    badge.textContent = item.label;
    const when = documentRef.createElement('span');
    when.textContent = `${item.year} · ${item.age}세`;
    const text = documentRef.createElement('p');
    text.textContent = item.text;
    row.append(badge, when, text);
    return row;
  }));
  root.scrollTop = root.scrollHeight;
}
