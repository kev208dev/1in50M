import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBigEvents, eraEventImpacts } from '../dist/ui/big-event.js';
import { choiceMeta } from '../dist/ui/render.js';

const base = { seed: 's', age: 2, year: 1997, history: [], economy: { transactions: [] }, relationships: { partner: null, children: [] } };

test('새로 생긴 역사·미래 사건만 대형 사건으로 고른다', () => {
  const fact = { id: 'era-1997-a', type: 'era-event', eraEventId: 'x', year: 1997, age: 2, title: '외환위기', text: '…', sourceLabel: '연표' };
  const future = { id: 'era-2041-b', type: 'era-event', eraEventId: 'y', year: 2041, age: 46, title: 'AI', text: '…', projection: true, sourceLabel: '전망' };
  const events = detectBigEvents(base, { ...base, history: [fact, future] });
  assert.deepEqual(events.map((event) => event.kind), ['fact', 'future']);
  assert.equal(detectBigEvents({ ...base, history: [fact] }, { ...base, history: [fact] }).length, 0);
});

test('복권 대박·창업 매각·동반자·자녀 출생을 인생의 순간으로 고른다', () => {
  const next = {
    ...base,
    economy: { transactions: [
      { id: 'tx-1', type: 'lottery', tier: 'jackpot', payout: 1500000000, year: 2030, age: 35 },
      { id: 'tx-2', type: 'lottery', tier: 'none', payout: 0, year: 2030, age: 35 },
      { id: 'tx-3', type: 'business-sale', amount: 900000000, year: 2031, age: 36 },
    ] },
    relationships: { partner: { id: 'p' }, children: [{ id: 'c' }] },
  };
  const titles = detectBigEvents(base, next).map((event) => event.title);
  assert.deepEqual(titles, ['복권 1등 당첨', '창업 성공', '삶의 동반자를 만났습니다', '첫 아이가 태어났습니다']);
});

test('다른 삶으로 바뀌면 사건을 만들지 않는다', () => {
  assert.equal(detectBigEvents(base, { ...base, seed: 'other', relationships: { partner: { id: 'p' }, children: [] } }).length, 0);
  assert.equal(detectBigEvents(null, base).length, 0);
});

test('사건 효과는 최대 3개, 미성년의 현금 변화는 가정 지원으로 표시한다', () => {
  const impacts = eraEventImpacts({ effects: { happiness: -7, relationships: -2, health: -1 }, economyEffects: { cash: -2500000 } }, { minor: true });
  assert.equal(impacts.length, 3);
  const money = eraEventImpacts({ economyEffects: { cash: -2500000 } }, { minor: true });
  assert.equal(money[0].label, '가정 지원');
});

test('선택지 카드는 비용·위험·예상 영향을 요약한다', () => {
  assert.deepEqual(choiceMeta({ effects: { knowledge: 3, happiness: -1 }, tags: ['사교육'], cost: 2400000 }), { cost: '240만원', risk: '낮음', effect: '지식 +3 · 행복 −1' });
  assert.equal(choiceMeta({ effects: { happiness: -3, health: -1 }, tags: ['충동', '위험'], financialAction: { type: 'gamble', amount: 100000 } }).risk, '높음');
  assert.equal(choiceMeta({ effects: {}, tags: ['도전'] }).risk, '보통');
  assert.equal(choiceMeta({ effects: {} }).effect, '큰 변화 없음');
});
