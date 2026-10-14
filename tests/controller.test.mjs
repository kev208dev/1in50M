import test from 'node:test';
import assert from 'node:assert/strict';
import { DECISIONS } from '../dist/data/decisions.js';
import { createSimulationController } from '../dist/ui/controls.js';
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

test('결정에 답하면 기록을 남기고 다시 진행할 수 있다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(15) });
  assert.equal(controller.getState().pendingDecisionId, 'choose-high-school');
  controller.answerDecision('vocational');
  assert.equal(controller.getState().education.schoolType, 'vocational');
  assert.equal(controller.getState().pendingDecisionId, null);
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
