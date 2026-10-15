const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const DIRECTION_LABELS = {
  health: { positive: '몸 상태에 도움', negative: '건강 부담' },
  happiness: { positive: '마음의 여유에 도움', negative: '마음의 여유 감소' },
  knowledge: { positive: '배움에 도움', negative: '배움 시간 감소' },
  relationships: { positive: '관계에 도움', negative: '관계 부담' },
};

const RESULT_LABELS = {
  health: { positive: '몸 상태가 나아졌습니다', negative: '건강에 부담이 남았습니다' },
  happiness: { positive: '마음의 여유가 생겼습니다', negative: '마음의 여유가 줄었습니다' },
  knowledge: { positive: '배움이 쌓였습니다', negative: '배움의 기회를 놓쳤습니다' },
  relationships: { positive: '관계가 가까워졌습니다', negative: '관계에 거리가 생겼습니다' },
};

export function applyDiminishingEffects(life, effects = {}) {
  const next = structuredClone(life);
  next.stats = { ...(next.stats ?? {}) };
  for (const [key, rawValue] of Object.entries(effects)) {
    if (!(key in next.stats)) continue;
    const raw = Number(rawValue) || 0;
    const current = Number(next.stats[key]) || 0;
    const scale = raw > 0 ? Math.max(0.2, (110 - current) / 100) : 1;
    next.stats[key] = clamp(current + raw * scale);
  }
  return next;
}

export function describeEffectDirections(effects = {}) {
  return Object.entries(effects)
    .filter(([key, value]) => DIRECTION_LABELS[key] && Number(value))
    .map(([key, value]) => DIRECTION_LABELS[key][Number(value) > 0 ? 'positive' : 'negative']);
}

export function describeAppliedChanges(changes = {}) {
  return Object.entries(changes)
    .filter(([key, value]) => RESULT_LABELS[key] && Number(value))
    .map(([key, value]) => RESULT_LABELS[key][Number(value) > 0 ? 'positive' : 'negative'])
    .join(' ');
}
