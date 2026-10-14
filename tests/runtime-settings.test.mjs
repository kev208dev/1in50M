import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRuntimeSettings,
  resolveBirthYear,
  tickInterval,
} from '../dist/data/runtime-settings.js';

test('진행 시간과 설정값을 허용 목록으로 정규화한다', () => {
  assert.equal(normalizeRuntimeSettings({ durationMinutes: 60 }).durationMinutes, 60);
  assert.equal(normalizeRuntimeSettings({ durationMinutes: 45 }).durationMinutes, 30);
  assert.equal(normalizeRuntimeSettings({ era: 'past' }).era, 'past');
  assert.equal(normalizeRuntimeSettings({ era: 'invalid' }).era, 'random');
});

test('30분 생애의 1배속은 한 해당 20초다', () => {
  assert.equal(tickInterval({ durationMinutes: 30 }, 1), 20000);
  assert.equal(tickInterval({ durationMinutes: 30 }, 16), 1250);
});

test('같은 seed의 무작위 시대는 같은 출생 연도를 만든다', () => {
  assert.equal(resolveBirthYear({ era: 'random' }, 'era-seed', 2026), resolveBirthYear({ era: 'random' }, 'era-seed', 2026));
  assert.ok(resolveBirthYear({ era: 'past' }, 'past-seed', 2026) < 2000);
  assert.ok(resolveBirthYear({ era: 'future' }, 'future-seed', 2026) > 2026);
});
