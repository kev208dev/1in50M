import { HISTORY_EVENTS } from '../data/history-events.js';
import { FUTURE_EVENTS } from '../data/future-events.js';

const ERA_EVENT_BY_ID = Object.fromEntries([...HISTORY_EVENTS, ...FUTURE_EVENTS].map((event) => [event.id, event]));

const STAT_LABELS = { health: '건강', happiness: '행복', knowledge: '지식', relationships: '관계' };
const ECONOMY_LABELS = {
  cash: '개인 현금',
  householdSupport: '가정 지원',
  income: '월 소득',
  debt: '부채',
  fixedCosts: '월 고정비',
};

function won(value) {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '−' : '+';
  const absolute = Math.abs(number);
  if (absolute >= 100000000) return `${sign}${Math.round(absolute / 10000000) / 10}억`;
  if (absolute >= 10000) return `${sign}${Math.round(absolute / 10000).toLocaleString('ko-KR')}만원`;
  return `${sign}${absolute.toLocaleString('ko-KR')}원`;
}

function signed(value) {
  const number = Math.round(Number(value) || 0);
  return `${number < 0 ? '−' : '+'}${Math.abs(number)}`;
}

/** 시대 사건 정의의 효과를 「라벨 · 값 · 긍정 여부」 목록으로 바꾼다. 최대 3개. */
export function eraEventImpacts(definition, { minor = false } = {}) {
  if (!definition) return [];
  const impacts = [];
  for (const [key, amount] of Object.entries(definition.effects ?? {})) {
    if (!STAT_LABELS[key] || !Number(amount)) continue;
    impacts.push({ label: STAT_LABELS[key], value: signed(amount), positive: Number(amount) > 0 });
  }
  for (const [key, amount] of Object.entries(definition.economyEffects ?? {})) {
    if (!Number(amount)) continue;
    const label = key === 'cash' && minor ? ECONOMY_LABELS.householdSupport : ECONOMY_LABELS[key];
    if (!label) continue;
    const positive = key === 'debt' || key === 'fixedCosts' ? Number(amount) < 0 : Number(amount) > 0;
    impacts.push({ label, value: won(amount), positive });
  }
  return impacts.slice(0, 3);
}

function ids(list) {
  return new Set((Array.isArray(list) ? list : []).map((item) => item?.id).filter(Boolean));
}

/**
 * 이전 상태와 다음 상태를 비교해 크게 연출할 사건만 골라낸다.
 * - 역사 사건(역사적 사실)과 미래 사건(미래 전망 시나리오)
 * - 복권 당첨, 도박 대박·손실, 창업 회사 매각·폐업
 * - 동반자를 만난 순간, 아이가 태어난 순간
 */
export function detectBigEvents(previous, next) {
  if (!previous || !next || previous.seed !== next.seed) return [];
  const events = [];
  const seenHistory = ids(previous.history);
  for (const entry of next.history ?? []) {
    if (entry?.type !== 'era-event' || seenHistory.has(entry.id)) continue;
    const definition = ERA_EVENT_BY_ID[entry.eraEventId];
    events.push({
      id: entry.id,
      kind: entry.projection ? 'future' : 'fact',
      year: entry.year,
      age: entry.age,
      title: entry.title ?? definition?.title ?? '시대의 사건',
      text: entry.text,
      impacts: eraEventImpacts(definition, { minor: entry.age < 18 }),
      source: entry.sourceLabel ? `${entry.projection ? '전망 시나리오 · ' : '출처 · '}${entry.sourceLabel}` : null,
    });
  }

  const seenTransactions = ids(previous.economy?.transactions);
  for (const item of next.economy?.transactions ?? []) {
    if (!item?.id || seenTransactions.has(item.id)) continue;
    const base = { id: item.id, kind: 'life', year: item.year, age: item.age };
    if (item.type === 'lottery' && item.tier === 'jackpot') {
      events.push({ ...base, title: '복권 1등 당첨', text: '평소처럼 산 복권 한 장이 1등에 당첨되었습니다. 삶의 숫자가 한순간에 바뀌었습니다.', impacts: [{ label: '개인 현금', value: won(item.payout), positive: true }], source: '가상 확률 · 실제 투자·도박 조언이 아닙니다' });
    } else if (item.type === 'gamble' && item.tier === 'big-win') {
      events.push({ ...base, title: '도박 대박', text: '빚까지 걸었던 판이 크게 터졌습니다. 다음에도 그럴 거라는 착각이 가장 위험합니다.', impacts: [{ label: '개인 현금', value: won(item.payout), positive: true }, { label: '부채', value: won(item.borrowed), positive: false }], source: '가상 확률 · 실제 투자·도박 조언이 아닙니다' });
    } else if (item.type === 'gamble' && item.tier === 'loss') {
      events.push({ ...base, title: '도박 손실', text: '건 돈을 모두 잃고 빌린 돈은 빚으로 남았습니다.', impacts: [{ label: '잃은 돈', value: won(-item.amount), positive: false }, { label: '부채', value: won(item.borrowed), positive: false }], source: '가상 확률 · 실제 투자·도박 조언이 아닙니다' });
    } else if (item.type === 'business-sale') {
      events.push({ ...base, title: '창업 성공', text: '키워 온 회사를 매각했습니다. 오랜 시간의 위험이 큰 보상으로 돌아왔습니다.', impacts: [{ label: '매각 대금', value: won(item.amount), positive: true }], source: '가상 사업 결과' });
    } else if (item.type === 'business-close') {
      events.push({ ...base, title: '사업 폐업', text: '가게의 문을 닫았습니다. 남은 것은 경험과, 때로는 빚입니다.', impacts: [], source: '가상 사업 결과' });
    }
  }

  if (!previous.relationships?.partner && next.relationships?.partner) {
    events.push({ id: `partner-${next.year}`, kind: 'life', year: next.year, age: next.age, title: '삶의 동반자를 만났습니다', text: '함께 시간을 쌓아 갈 사람이 생겼습니다.', impacts: [{ label: '관계', value: '새 가족', positive: true }], source: null });
  }
  const before = previous.relationships?.children?.length ?? 0;
  const after = next.relationships?.children?.length ?? 0;
  if (after > before) {
    events.push({ id: `child-${next.year}-${after}`, kind: 'life', year: next.year, age: next.age, title: after === 1 ? '첫 아이가 태어났습니다' : '아이가 태어났습니다', text: '당신의 삶에 새로운 이름이 하나 더해졌습니다.', impacts: [{ label: '자녀', value: `${after}명`, positive: true }], source: null });
  }
  return events;
}

const BADGES = {
  fact: '역사적 사실',
  future: '미래 전망 시나리오',
  life: '인생의 순간',
};

// Automatic events remain in the system feed. Full-screen details are opt-in.
export function createEventNotice(show) {
  let latest = null;
  return {
    update(previous, next) {
      if (!previous || previous.seed !== next?.seed) latest = null;
      const events = detectBigEvents(previous, next);
      if (events.length) latest = events.at(-1);
      return Boolean(latest);
    },
    open() {
      if (latest) show(latest);
    },
  };
}

export function renderBigEvent(dialog, event, name = '') {
  if (!dialog || !event) return;
  const set = (field, value) => {
    dialog.querySelectorAll(`[data-event="${field}"]`).forEach((node) => { node.textContent = value ?? ''; });
  };
  dialog.dataset.kind = event.kind;
  set('badge', BADGES[event.kind] ?? BADGES.life);
  set('year', String(event.year ?? ''));
  set('when', `${event.year}년${name ? ` · ${name}` : ''} ${event.age}세`);
  set('title', event.title);
  set('text', event.text);
  set('source', event.source ?? '');
  const impacts = dialog.querySelector('[data-event="impacts"]');
  if (impacts) {
    impacts.replaceChildren(...event.impacts.map((impact) => {
      const tile = dialog.ownerDocument.createElement('div');
      tile.className = `event-impact${impact.positive ? ' is-positive' : ''}`;
      const label = dialog.ownerDocument.createElement('span');
      label.textContent = impact.label;
      const value = dialog.ownerDocument.createElement('strong');
      value.textContent = impact.value;
      tile.append(label, value);
      return tile;
    }));
    impacts.hidden = event.impacts.length === 0;
  }
}
