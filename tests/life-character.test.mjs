import test from 'node:test';
import assert from 'node:assert/strict';
import { characterViewModel } from '../dist/engine/life-character.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('캐릭터는 여섯 생애 단계와 0~100 진행률을 만든다', () => {
  assert.equal(characterViewModel(makeLifeAtAge(0)).stage, 'infant');
  assert.equal(characterViewModel(makeLifeAtAge(8)).stage, 'child');
  assert.equal(characterViewModel(makeLifeAtAge(16)).stage, 'teen');
  assert.equal(characterViewModel(makeLifeAtAge(25)).stage, 'young-adult');
  assert.equal(characterViewModel(makeLifeAtAge(45)).stage, 'adult');
  assert.equal(characterViewModel(makeLifeAtAge(70)).stage, 'senior');
  assert.equal(characterViewModel(makeLifeAtAge(45)).progress, 50);
});

test('낮은 건강은 캐릭터 상태를 tired로 만들지만 정체성 속성은 평가하지 않는다', () => {
  const model = characterViewModel(makeLifeAtAge(60, { stats: { health: 20, happiness: 50 } }));
  assert.equal(model.pose, 'tired');
  assert.equal('sex' in model, false);
  assert.equal('ancestry' in model, false);
});

test('행복이 높으면 bright, 그 외에는 neutral 포즈를 쓴다', () => {
  assert.equal(characterViewModel(makeLifeAtAge(30, { stats: { health: 60, happiness: 80 } })).pose, 'bright');
  assert.equal(characterViewModel(makeLifeAtAge(30, { stats: { health: 60, happiness: 50 } })).pose, 'neutral');
});
