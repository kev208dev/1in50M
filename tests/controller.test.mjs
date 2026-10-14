import test from 'node:test';
import assert from 'node:assert/strict';
import { DECISIONS } from '../dist/data/decisions.js';
import { createSimulationController } from '../dist/ui/controls.js';
import { createRng } from '../dist/engine/random.js';
import { makeLifeAtAge, fakeClock } from './support/life-fixtures.mjs';

const completedDecisions = Object.fromEntries(DECISIONS.map((decision) => [decision.id, 'fixture-choice']));

test('1배속은 8초마다 한 해만 진행한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(0) });
  controller.play();
  clock.advance(7999);
  assert.equal(controller.getState().age, 0);
  clock.advance(1);
  assert.equal(controller.getState().age, 1);
});

test('결정이 열리면 시간은 자동 정지한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(14, {
      decisions: { 'family-relocation': 'move-together', 'middle-school-rhythm': 'steady' },
      reflections: { 'reflection-15': 'people' },
    }),
  });
  controller.play();
  clock.advance(8000);
  assert.equal(controller.isPlaying(), false);
  assert.equal(controller.getState().pendingDecisionId, 'choose-high-school');
});

test('숨겨진 탭에서 지난 시간은 복귀 후 몰아서 처리하지 않는다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(10) });
  controller.play();
  controller.setVisible(false);
  clock.advance(80000);
  controller.setVisible(true);
  assert.equal(controller.getState().age, 10);
});

test('속도를 바꿔도 타이머는 하나만 유지된다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(8, { decisions: { 'after-school-care': 'after-school' } }),
  });
  controller.play();
  controller.setSpeed(16);
  controller.setSpeed(4);
  assert.equal(clock.pendingCount(), 1);
  clock.advance(2000);
  assert.equal(controller.getState().age, 9);
});

test('재생 중 열린 결정에 답하면 기존 배속으로 자동 재생한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(14, {
      decisions: { 'family-relocation': 'move-together', 'middle-school-rhythm': 'steady' },
      reflections: { 'reflection-15': 'people' },
    }),
  });
  controller.play();
  clock.advance(8000);
  assert.equal(controller.getState().pendingDecisionId, 'choose-high-school');
  controller.answerDecision('vocational');
  assert.equal(controller.getState().education.schoolType, 'vocational');
  assert.equal(controller.getState().pendingDecisionId, null);
  assert.equal(controller.isPlaying(), true);
  clock.advance(8000);
  assert.equal(controller.getState().age, 16);
});

test('직접 정지한 상태의 결정은 답한 뒤에도 정지한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(15, { reflections: { 'reflection-15': 'people' } }),
  });
  controller.answerDecision('vocational');
  assert.equal(controller.isPlaying(), false);
  assert.equal(clock.pendingCount(), 0);
});

test('극단 성격이 선택을 뒤집으면 컨트롤러가 실제 선택과 이유를 알린다', () => {
  let seed = '';
  for (let index = 0; index < 10000; index += 1) {
    const candidate = `agency-controller-${index}`;
    if (createRng(`${candidate}:agency:choose-high-school:15`).next() < 0.28) {
      seed = candidate;
      break;
    }
  }
  let override = null;
  const controller = createSimulationController({
    initialLife: makeLifeAtAge(15, {
      seed,
      reflections: { 'reflection-15': 'people' },
      profile: { personality: { strength: 'extreme', dominant: 'impulsive', label: '극도로 충동적' } },
    }),
    onAgencyOverride: (resolution) => { override = resolution; },
  });
  controller.answerDecision('general');
  assert.equal(override?.overridden, true);
  assert.equal(override?.requestedChoiceId, 'general');
  assert.notEqual(override?.actualChoiceId, 'general');
  assert.match(override?.reason ?? '', /성향/);
});

test('성격 개입 안내 중에는 멈추고 확인한 뒤 기존 재생을 이어간다', () => {
  let seed = '';
  for (let index = 0; index < 10000; index += 1) {
    const candidate = `agency-resume-${index}`;
    if (createRng(`${candidate}:agency:choose-high-school:15`).next() < 0.28) {
      seed = candidate;
      break;
    }
  }
  const clock = fakeClock();
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(14, {
      seed,
      decisions: { 'family-relocation': 'move-together', 'middle-school-rhythm': 'steady' },
      reflections: { 'reflection-15': 'people' },
      profile: { personality: { strength: 'extreme', dominant: 'impulsive', label: '극도로 충동적' } },
    }),
  });
  controller.play();
  clock.advance(8000);
  controller.answerDecision('general');
  assert.equal(controller.isPlaying(), false);
  assert.equal(clock.pendingCount(), 0);
  controller.acknowledgeInterruption();
  assert.equal(controller.isPlaying(), true);
  assert.equal(clock.pendingCount(), 1);
});

test('12배속은 약 667ms마다 한 해를 진행한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(0) });
  controller.setSpeed(12);
  controller.play();
  clock.advance(666);
  assert.equal(controller.getState().age, 0);
  clock.advance(1);
  assert.equal(controller.getState().age, 1);
});

test('회고가 열리면 멈추고 답한 뒤 자동 재생한다', () => {
  const clock = fakeClock();
  let opened = 0;
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(4),
    onReflection: () => { opened += 1; },
  });
  controller.play();
  clock.advance(8000);
  assert.equal(opened, 1);
  assert.equal(controller.getState().pendingReflectionId, 'reflection-5');
  assert.equal(controller.isPlaying(), false);
  controller.answerReflection('play');
  assert.equal(controller.getState().pendingReflectionId, null);
  assert.equal(controller.isPlaying(), true);
});

test('직업 제안 중 하나를 선택해 프로필에 반영한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(25) });
  const offer = controller.getCareerOffers()[0];
  controller.selectCareer(offer.career.id);
  assert.equal(controller.getState().career.careerId, offer.career.id);
  assert.equal(controller.getState().career.status, 'employed');
});

test('조건을 충족하지 못한 직업은 직접 선택할 수 없다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(25, { stats: { knowledge: 10 } }) });
  const unavailable = controller.getCareerOffers(100).find((offer) => !offer.eligible);
  assert.throws(() => controller.selectCareer(unavailable.career.id), /필요/);
});

test('컨트롤러는 한 해의 경력과 경제를 정확히 한 번만 반영한다', () => {
  const clock = fakeClock();
  const initialLife = makeLifeAtAge(31, {
    decisions: completedDecisions,
    career: {
      groupId: 'management', careerId: 'management-1', title: '사무원', status: 'employed',
      years: 0, annualIncome: 36000000, history: [],
    },
    economy: { cash: 0, income: 3000000, fixedCosts: 1500000, debt: 0, deposit: 0, homeValue: 0 },
  });
  const controller = createSimulationController({ clock, initialLife });
  controller.play();
  clock.advance(8000);
  const next = controller.getState();
  assert.equal(next.career.years, 1);
  assert.ok(next.economy.cash > 15000000 && next.economy.cash < 22000000);
});

test('컨트롤러는 포트폴리오와 사업을 한 해에 정확히 한 번 진행한다', () => {
  const clock = fakeClock();
  const initialLife = makeLifeAtAge(31, {
    decisions: completedDecisions,
    economy: {
      cash: 30000000,
      assets: { deposits: 0, bonds: 10000000, stocks: 0, crypto: 0, businessEquity: 20000000 },
      transactions: [],
    },
    business: {
      status: 'operating', sector: 'online', capital: 20000000,
      debt: 0, equity: 20000000, years: 0,
    },
  });
  const controller = createSimulationController({ clock, initialLife });
  controller.play();
  clock.advance(8000);
  const next = controller.getState();
  assert.equal(next.economy.transactions.filter((entry) => entry.type === 'market').length, 1);
  assert.equal(next.business.years, 1);
});

test('자동 결정은 실제 컨트롤러에서도 가능한 직업을 선택한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(25) });
  controller.setAutoDecision(true);
  controller.play();
  clock.advance(8000);
  assert.ok(controller.getState().career.careerId);
  assert.equal(controller.getState().career.status, 'employed');
});

test('정체성 발견이 열리면 시간과 건너뛰기가 멈추고 확인 뒤에만 진행된다', () => {
  const clock = fakeClock();
  let discoveries = 0;
  const initialLife = makeLifeAtAge(15, {
    decisions: completedDecisions,
    reflections: { 'reflection-15': 'people' },
    identity: {
      assigned: 'bisexual', label: '양성애자', discoveryAge: 16, discovered: false, acknowledged: false,
    },
  });
  const controller = createSimulationController({
    clock,
    initialLife,
    onIdentityDiscovery: () => { discoveries += 1; },
  });
  controller.play();
  clock.advance(8000);
  assert.equal(discoveries, 1);
  assert.equal(controller.isPlaying(), false);
  assert.equal(controller.getState().pendingIdentityDiscovery, true);
  controller.skipToDecision();
  assert.equal(controller.getState().age, 16);
  controller.acknowledgeIdentity();
  assert.equal(controller.getState().pendingIdentityDiscovery, false);
  assert.equal(controller.getState().identity.acknowledged, true);
});

test('18세 정체성 발견을 확인하면 졸업 뒤의 길을 건너뛰지 않는다', () => {
  const clock = fakeClock();
  const decisions = { ...completedDecisions };
  delete decisions['after-graduation'];
  delete decisions['queer-trusted-friend'];
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(17, {
      decisions,
      identity: {
        assigned: 'bisexual', label: '양성애자', discoveryAge: 18, discovered: false, acknowledged: false,
      },
    }),
  });
  controller.play();
  clock.advance(8000);
  assert.equal(controller.getState().pendingIdentityDiscovery, true);
  const next = controller.acknowledgeIdentity();
  assert.equal(next.pendingIdentityDiscovery, false);
  assert.equal(next.pendingDecisionId, 'after-graduation');
  assert.equal(controller.play(), false);
});

test('현금이 없는 자동 진행도 투자 결정에서 멈추지 않는다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({
    clock,
    initialLife: makeLifeAtAge(24, { economy: { cash: 0 }, pendingDecisionId: 'asset-allocation' }),
  });
  controller.setAutoDecision(true);
  assert.equal(controller.getState().pendingDecisionId, null);
  assert.equal(controller.play(), true);
  clock.advance(8000);
  assert.equal(controller.getState().age, 25);
});
