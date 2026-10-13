import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationController } from '../dist/ui/controls.js';
import { makeLifeAtAge, fakeClock } from './support/life-fixtures.mjs';

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
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(14) });
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
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(8) });
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
