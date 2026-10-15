import test from 'node:test';
import assert from 'node:assert/strict';
import { KOREA_REGION_SHAPES, KOREA_MAP_VIEWBOX } from '../dist/data/korea-regions.js';
import { KOREA_MAP_POINTS } from '../dist/data/korea-map.js';

test('지도 경계는 17개 시도를 한 번씩 모두 그린다', () => {
  const codes = KOREA_REGION_SHAPES.map((shape) => shape.code);
  assert.equal(codes.length, 17);
  assert.deepEqual([...codes].sort(), KOREA_MAP_POINTS.map((point) => point.code).sort());
});

test('각 경계는 닫힌 경로이고 중심점이 지도 안에 있다', () => {
  for (const shape of KOREA_REGION_SHAPES) {
    assert.match(shape.d, /^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+Z$/);
    assert.ok(shape.cx > 0 && shape.cx < KOREA_MAP_VIEWBOX.width, shape.code);
    assert.ok(shape.cy > 0 && shape.cy < KOREA_MAP_VIEWBOX.height, shape.code);
  }
});

test('다른 도 안에 있는 시는 바깥 도보다 나중에 그려진다', () => {
  const order = KOREA_REGION_SHAPES.map((shape) => shape.code);
  assert.ok(order.indexOf('SEL') > order.indexOf('GGD'));
  assert.ok(order.indexOf('DGU') > order.indexOf('GBK'));
  assert.ok(order.indexOf('GJU') > order.indexOf('JNM'));
});
