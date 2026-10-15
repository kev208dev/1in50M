import test from 'node:test';
import assert from 'node:assert/strict';
import { DOKDO_POINT, KOREA_MAP_POINTS, mapRegionState } from '../dist/data/korea-map.js';

test('대한민국 전도는 17개 시도 위치를 모두 가진다', () => {
  assert.equal(KOREA_MAP_POINTS.length, 17);
  assert.equal(new Set(KOREA_MAP_POINTS.map((point) => point.code)).size, 17);
});

test('대한민국 전도에 독도를 별도 영토 표식으로 표시한다', () => {
  assert.equal(DOKDO_POINT.label, '독도');
  assert.equal(DOKDO_POINT.territory, true);
});

test('출생 지역만 지도에서 선택 상태가 된다', () => {
  const states = mapRegionState('SEL');
  assert.equal(states.filter((point) => point.selected).length, 1);
  assert.equal(states.find((point) => point.selected).code, 'SEL');
});
