import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRuntimeSettings,
  resolveBirthYear,
  tickInterval,
} from '../dist/data/runtime-settings.js';

test('진행 시간과 설정값을 허용 목록으로 정규화한다', () => {
  assert.equal(normalizeRuntimeSettings().durationMinutes, 60);
  assert.equal(normalizeRuntimeSettings({ durationMinutes: 60 }).durationMinutes, 60);
  assert.equal(normalizeRuntimeSettings({ durationMinutes: 45 }).durationMinutes, 60);
  assert.equal(normalizeRuntimeSettings({ era: '1970s' }).era, '1970s');
  assert.equal(normalizeRuntimeSettings({ era: 'invalid' }).era, 'random');
});

test('기본 생애는 60분이며 1배속에서 한 해가 40초다', () => {
  assert.equal(tickInterval({}, 1), 40000);
  assert.equal(tickInterval({}, 16), 2500);
});

test('30분 생애의 1배속은 한 해당 20초다', () => {
  assert.equal(tickInterval({ durationMinutes: 30 }, 1), 20000);
  assert.equal(tickInterval({ durationMinutes: 30 }, 16), 1250);
});

test('같은 seed의 무작위 시대는 같은 출생 연도를 만든다', () => {
  assert.equal(resolveBirthYear({ era: 'random' }, 'era-seed', 2026), resolveBirthYear({ era: 'random' }, 'era-seed', 2026));
  assert.ok(resolveBirthYear({ era: '1950s' }, 'past-seed', 2026) < 1960);
  assert.ok(resolveBirthYear({ era: 'future' }, 'future-seed', 2026) > 2026);
});
