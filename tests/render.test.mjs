import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLifeViewModel,
  formatWon,
  formatAge,
  getVisibleLifeLog,
  renderTextFields,
} from '../dist/ui/render.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('나이와 원화 수치를 사람이 읽을 수 있게 표시한다', () => {
  assert.equal(formatAge(24), '24세');
  assert.equal(formatWon(123456789), '1억 2,346만원');
  assert.equal(formatWon(-2500000), '-250만원');
});

test('최신 인생 기록을 시간순으로 제한한다', () => {
  const history = Array.from({ length: 12 }, (_, age) => ({ age, text: `${age}세 기록` }));
  assert.deepEqual(getVisibleLifeLog(history, 3).map((entry) => entry.age), [11, 10, 9]);
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
    economy: { netWorth: 72000000 },
  });
  const model = createLifeViewModel(life);
  assert.equal(model.age, '30세');
  assert.equal(model.stats.length, 4);
  assert.equal(model.career, '소프트웨어 개발자');
  assert.match(model.netWorth, /만원|억/);
  assert.ok(model.lifeMap.length >= 91);
  assert.ok(model.log.length > 0);
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
