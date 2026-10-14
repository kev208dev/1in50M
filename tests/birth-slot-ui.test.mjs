import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { slotDuration, slotRows } from '../dist/ui/birth-slot.js';
import { createBirthSlotResult } from '../dist/engine/birth-slot.js';

test('모션 감소 환경은 슬롯 대기 시간이 없다', () => {
  assert.equal(slotDuration(true), 0);
  assert.equal(slotDuration(false), 1500);
});

test('슬롯은 모든 출생 범주를 표시한다', () => {
  const ids = slotRows(createBirthSlotResult('ui', 2026)).map((row) => row.id);
  assert.deepEqual(ids, ['sex', 'region', 'family', 'disability', 'appearance', 'personality', 'name']);
});

test('출생 화면에 재추첨과 확정 버튼이 있다', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="slot-spin-button"/);
  assert.match(html, /id="slot-accept-button"/);
  assert.match(html, /id="birth-slot"/);
  assert.match(html, /id="birth-settings"/);
  assert.match(html, /id="birth-certificate-details"/);
  assert.match(html, /id="companion-preview"/);
});

test('출생 전 시대·시간·비교·음악·자동 선택을 설정할 수 있다', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  for (const id of ['era-setting', 'duration-setting', 'comparison-setting', 'music-setting', 'auto-setting']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('출생 상세와 네 비교 인생을 렌더링하는 함수를 제공한다', async () => {
  const source = await readFile(new URL('../dist/ui/birth-slot.js', import.meta.url), 'utf8');
  assert.match(source, /export function renderBirthCertificate/);
  assert.match(source, /export function renderCompanionLives/);
});

test('모바일과 모션 감소 화면에서 슬롯 동작을 보존한다', async () => {
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.birth-slot/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.slot-strip/);
  assert.match(css, /\.slot-actions[\s\S]*bottom:/);
});

test('모바일에서도 출생 조건 상세를 키보드로 펼쳐 볼 수 있다', async () => {
  const source = await readFile(new URL('../dist/ui/birth-slot.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.match(source, /makeNode\(documentRef, ['"]details['"]/);
  assert.match(source, /makeNode\(documentRef, ['"]summary['"]/);
  assert.doesNotMatch(css, /@media \(max-width: 720px\)[\s\S]*?\.slot-detail \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.slot-detail-disclosure/);
  assert.match(css, /\.slot-reel:has\(\.slot-detail-disclosure\[open\]\)[\s\S]*?overflow: visible/);
});
