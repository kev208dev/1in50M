import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  reelStopSchedule,
  slotDuration,
  slotMachineModel,
  slotRows,
} from '../dist/ui/birth-slot.js';
import { createBirthSlotResult } from '../dist/engine/birth-slot.js';

test('모션 감소 환경은 슬롯 대기 시간이 없다', () => {
  assert.equal(slotDuration(true), 0);
  assert.equal(slotDuration(false), 1760);
});

test('슬롯은 모든 출생 범주를 표시한다', () => {
  const ids = slotRows(createBirthSlotResult('ui', 2026)).map((row) => row.id);
  assert.deepEqual(ids, [
    'sex', 'region', 'household', 'disability', 'appearance',
    'personality-1', 'personality-2', 'personality-3',
    'surname', 'given-1', 'given-2',
  ]);
});

test('제공 룰렛 구조대로 11개 릴을 만든다', () => {
  const model = slotMachineModel(createBirthSlotResult('reel-layout', 1974));
  assert.deepEqual(model.reels.map((reel) => reel.id), [
    'sex', 'region', 'household', 'disability', 'appearance',
    'personality-1', 'personality-2', 'personality-3',
    'surname', 'given-1', 'given-2',
  ]);
});

test('상단 릴 뒤에 성격과 이름이 순서대로 멈춘다', () => {
  assert.deepEqual(reelStopSchedule(false), [400, 520, 640, 760, 880, 1080, 1200, 1320, 1520, 1640, 1760]);
  assert.deepEqual(reelStopSchedule(true), Array(11).fill(0));
});

test('렌더링은 출생 결과를 다시 추첨하지 않는다', () => {
  const result = createBirthSlotResult('single-result', 1988);
  const model = slotMachineModel(result);
  assert.equal(model.reels[0].value, result.sex.label);
  assert.equal(model.reels[8].value, result.name.surname);
});

test('출생 화면에 재추첨과 확정 버튼이 있다', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="slot-spin-button"/);
  assert.match(html, /id="slot-accept-button"/);
  assert.match(html, /id="birth-slot"/);
  assert.match(html, /id="birth-settings"/);
  assert.match(html, /id="birth-certificate-details"/);
  assert.doesNotMatch(html, /id="companion-preview"/);
});

test('출생 전 시대·시간·비교·음악·자동 선택을 설정할 수 있다', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  for (const id of ['era-setting', 'duration-setting', 'comparison-setting', 'music-setting', 'auto-setting']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('출생 상세만 렌더링하고 하드코딩 비교 인생은 제공하지 않는다', async () => {
  const source = await readFile(new URL('../dist/ui/birth-slot.js', import.meta.url), 'utf8');
  assert.match(source, /export function renderBirthCertificate/);
  assert.doesNotMatch(source, /export function renderCompanionLives/);
});

test('모바일과 모션 감소 화면에서 슬롯 동작을 보존한다', async () => {
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.birth-slot/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.slot-strip/);
  assert.match(css, /\.slot-actions[\s\S]*bottom:/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.slot-value[^}]*font-size: clamp\(12px,/);
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

test('모바일 상세 팝업은 좌·중·우 릴에서 화면 밖으로 나가지 않게 정렬한다', async () => {
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.slot-detail-mobile \{[^}]*left: 50%[^}]*transform: translateX\(-50%\)/);
  assert.match(css, /data-slot="region"[^}]*\.slot-detail-mobile[\s\S]*?left: -4px/);
  assert.match(css, /data-slot="appearance"[^}]*\.slot-detail-mobile[\s\S]*?right: -4px/);
});

test('각 릴은 자신의 정지 애니메이션이 끝나면 블러가 풀린다', async () => {
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.birth-slot\.is-spinning \.slot-value\s*\{[^}]*filter:\s*blur/);
});
