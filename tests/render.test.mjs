import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLifeViewModel,
  formatWon,
  formatAge,
  getVisibleLifeLog,
  renderTextFields,
  choiceMeta,
} from '../dist/ui/render.js';
import { makeLifeAtAge, makeMaleLifeAtAge } from './support/life-fixtures.mjs';
import { createLifeSummary } from '../dist/engine/summary.js';

const v4Life = makeLifeAtAge(38, {
  economy: {
    assets: {
      deposits: 10000000, bonds: 5000000, stocks: 18000000,
      crypto: 3000000, businessEquity: 0,
    },
  },
  business: {
    status: 'operating', sector: 'online', capital: 20000000,
    debt: 3000000, equity: 24000000, years: 2,
  },
});

const completedV4Life = makeLifeAtAge(90, {
  status: 'review',
  history: [{
    id: 'sale', age: 44, year: 2070, type: 'event',
    text: '창업한 회사를 매각했습니다.', label: '창업 회사 매각',
  }],
});

test('나이와 원화 수치를 사람이 읽을 수 있게 표시한다', () => {
  assert.equal(formatAge(24), '24세');
  assert.equal(formatWon(123456789), '1억 2,346만원');
  assert.equal(formatWon(-2500000), '-250만원');
});

test('선택지는 정확한 증감 수치 대신 삶의 방향만 보여준다', () => {
  const meta = choiceMeta({ effects: { knowledge: 5, happiness: -1 } });
  assert.equal(meta.effect, '배움에 도움 · 마음의 여유 감소');
  assert.doesNotMatch(meta.effect, /\+5|−1|5|1/);
});

test('금융 메뉴는 성인기부터 사용할 수 있다', () => {
  assert.equal(createLifeViewModel(makeLifeAtAge(18)).canUseFinance, false);
  assert.equal(createLifeViewModel(makeLifeAtAge(19)).canUseFinance, true);
});

test('미성년 화면은 개인 현금 대신 가정 지원을 구분해 표시한다', () => {
  const minor = createLifeViewModel(makeLifeAtAge(0, { economy: { cash: 12000, householdSupport: 5000000 } }));
  const adult = createLifeViewModel(makeLifeAtAge(18, { economy: { cash: 12000, householdSupport: 5000000 } }));
  assert.equal(minor.cash, '—');
  assert.equal(minor.householdSupport, '500만원');
  assert.equal(adult.cash, '1만원');
  assert.equal(adult.householdSupport, null);
});

test('최신 인생 기록을 시간순으로 제한한다', () => {
  const history = Array.from({ length: 12 }, (_, age) => ({ age, text: `${age}세 기록` }));
  assert.deepEqual(getVisibleLifeLog(history, 3).map((entry) => entry.age), [11, 10, 9]);
});

test('시대 사건의 출처와 전망 여부가 화면 모델에 보존된다', () => {
  const view = createLifeViewModel(makeLifeAtAge(40, {
    history: [{
      id: 'future-ai', age: 40, year: 2035, type: 'era-event', text: 'AI 동료와 일했습니다.',
      sourceLabel: '과학기술정보통신부', sourceUrl: 'https://example.test/ai', projection: true,
    }],
  }));
  assert.equal(view.log[0].sourceLabel, '과학기술정보통신부');
  assert.equal(view.log[0].projection, true);
});

test('같은 나이의 기록도 가장 나중에 쌓인 항목부터 보여준다', () => {
  const history = [{ age: 5, text: '한 해' }, { age: 5, text: '첫 사건' }, { age: 5, text: '둘째 사건' }];
  assert.deepEqual(getVisibleLifeLog(history, 3).map((entry) => entry.text), ['둘째 사건', '첫 사건', '한 해']);
});

test('같은 데이터 필드를 쓰는 모든 화면 요소를 함께 갱신한다', () => {
  const nodes = [{ textContent: '' }, { textContent: '' }];
  const root = { querySelectorAll: () => nodes };
  renderTextFields(root, '[data-life="location"]', '제주특별자치도 애월읍');
  assert.deepEqual(nodes.map((node) => node.textContent), ['제주특별자치도 애월읍', '제주특별자치도 애월읍']);
});

test('생애 화면용 모델에 상태·경제·관계·기록이 모두 담긴다', () => {
  const life = makeLifeAtAge(30, {
    career: { title: '소프트웨어 개발자', status: 'employed', annualIncome: 48000000 },
    economy: { cash: 72000000 },
  });
  const model = createLifeViewModel(life);
  assert.equal(model.age, '30세');
  assert.equal(model.stats.length, 4);
  assert.equal(model.career, '소프트웨어 개발자');
  assert.match(model.netWorth, /만원|억/);
  assert.ok(model.lifeMap.length >= 91);
  assert.ok(model.log.length > 0);
  assert.equal(model.character.stage, 'young-adult');
  assert.equal(model.character.progress, 33);
});

test('발견한 가상 정체성만 생애 화면 모델에 표시한다', () => {
  const discovered = createLifeViewModel(makeLifeAtAge(24, {
    identity: {
      assigned: 'bisexual', label: '양성애자', discoveryAge: 20, discovered: true, acknowledged: true,
    },
  }));
  const undiscovered = createLifeViewModel(makeLifeAtAge(15));
  assert.equal(discovered.identity, '양성애자');
  assert.equal(undiscovered.identity, null);
});

test('삶 화면은 외모 성격 자산 사업을 표시한다', () => {
  const view = createLifeViewModel(v4Life);
  assert.match(view.appearance, /얼굴|체형|스타일/);
  assert.ok(view.personality.length > 0);
  assert.ok(view.assets.some((asset) => asset.label === '주식'));
  assert.match(view.business, /운영|온라인|사업/);
});

test('삶 화면 모델은 학업 스트레스·수면·카페인·지원과 마음 상태를 표시한다', () => {
  const view = createLifeViewModel(makeLifeAtAge(17, {
    mentalHealthState: 'strained',
    riskFactors: { academicStress: 70, sleepDebt: 62, caffeineLoad: 45, support: 20 },
  }));
  assert.equal(view.mentalHealth.label, '지침');
  assert.deepEqual(view.wellbeing.map((item) => item.value), [70, 62, 45, 20]);
});

test('병역 자동 판정 결과를 사용자 선택과 구분해 표시한다', () => {
  const view = createLifeViewModel(makeMaleLifeAtAge(20, {
    service: { status: 'supplementary', grade: 4, assessedAge: 19, completed: false },
  }));
  assert.equal(view.service, '보충역 판정');
});

test('요약은 출생 조건과 주요 경제 전환점을 설명한다', () => {
  const summary = createLifeSummary(completedV4Life);
  assert.ok(summary.influences.length >= 3);
  assert.ok(summary.turningPoints.some((item) => /창업|주식|복권|가상자산/.test(item.label)));
});
