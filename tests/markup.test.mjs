import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const renderSource = await readFile(new URL('../dist/ui/render.js', import.meta.url), 'utf8');

test('세 화면과 모든 주요 동작이 존재한다', () => {
  for (const id of ['intro-view', 'profile-view', 'future-view', 'birth-button', 'slot-spin-button', 'slot-accept-button', 'back-button', 'live-region']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('가상 시뮬레이션 안내를 인트로와 결과에 모두 표시한다', () => {
  const matches = html.match(/실제 인구통계가 아닌 체험용 가상 시뮬레이션입니다/g) ?? [];
  assert.ok(matches.length >= 2);
});

test('720px 미만에서는 슬롯을 두 열로 재배치한다', () => {
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.birth-slot \{ grid-template-columns: repeat\(2,/);
});

test('생애 화면과 원작형 컨트롤이 존재한다', () => {
  for (const id of [
    'life-view', 'age-display', 'year-display', 'play-button', 'speed-controls',
    'skip-button', 'auto-button', 'stats-panel', 'money-panel', 'life-log',
    'life-map', 'family-panel', 'decision-dialog', 'result-view', 'past-lives-view',
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));
});

test('인트로에서 전생 기록에 접근하고 결과 그래프와 가족 요약을 볼 수 있다', () => {
  for (const id of ['intro-past-lives-button', 'clear-past-lives-button', 'result-stats', 'result-family']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('가상 데이터 안내가 생애 화면과 결과 화면에 있다', () => {
  const matches = html.match(/체험용 가상 데이터/g) ?? [];
  assert.ok(matches.length >= 2);
});

test('정체성 발견은 거절 선택 없는 가상 인물 사건으로 표시된다', () => {
  for (const id of ['identity-dialog', 'identity-title', 'identity-continue-button']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /실제 사용자의 정체성을 판정하는 결과가 아니라/);
  assert.match(html, /data-decision=["']source["']/);
  assert.doesNotMatch(html, /id=["']identity-(reject|cancel|close)-button["']/);
  assert.match(renderSource, /current\.identity\.label \?\? '성'\} 정체성/);
  assert.match(html, /온라인 조사에 기반한 가상 시뮬레이션 값/);
  assert.match(html, /공식 인구 비율이 아닙니다/);
  assert.match(html, /서로 겹칠 수 있는 정체성을 단순화/);
});

test('PC 생애 화면은 뷰포트에 고정되고 내부 패널만 스크롤한다', () => {
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*body\[data-view="life"\][\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*\.life-layout[\s\S]*min-height:\s*0/);
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*\.life-sidebar[\s\S]*overflow-y:\s*auto/);
});

test('모바일 생애 화면은 문서 스크롤을 유지한다', () => {
  assert.match(css, /@media \(max-width: 959px\)[\s\S]*body\[data-view="life"\][\s\S]*overflow-y:\s*auto/);
});
