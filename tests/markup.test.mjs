import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const themeCss = await readFile(new URL('../dist/theme.css', import.meta.url), 'utf8');
const renderSource = await readFile(new URL('../dist/ui/render.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

test('세 화면과 모든 주요 동작이 존재한다', () => {
  for (const id of ['intro-view', 'profile-view', 'future-view', 'birth-button', 'slot-accept-button', 'back-button', 'live-region']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /id=["']slot-spin-button["']/);
  assert.doesNotMatch(html, /id=["']same-life-button["']/);
});

test('시작 화면은 Figma Desktop - 1의 원문과 조작 안내를 그대로 사용한다', () => {
  assert.match(html, /If you are born poor its not your mistake/);
  assert.match(html, /But if you die poor its your mistake/);
  assert.match(html, /태어날 때 가난하게 태어난 것은/);
  assert.match(html, /-빌 게이츠-/);
  assert.match(html, /PRESS ANY KEY TO CONTINUE/);
});

test('시스템 메시지를 제외한 화면은 스크롤되지 않고 출처는 문서 명암 기준으로 보인다', () => {
  const combined = `${css}\n${themeCss}`;
  assert.match(combined, /\.view\s*\{[^}]*overflow:\s*hidden/);
  assert.match(combined, /\.system-feed\s*\{[^}]*overflow(?:-y)?:\s*auto/);
  assert.match(combined, /\.source-readable[\s\S]*color:\s*#8a8a8a/i);
  assert.match(combined, /\.source-readable[\s\S]*font-size:\s*11px/i);
  assert.match(combined, /\.source-readable[\s\S]*opacity:\s*1/i);
});

test('공개 통계 기반과 모델링 값의 구분을 인트로와 결과에 표시한다', () => {
  const matches = html.match(/공개 통계 기반/g) ?? [];
  assert.ok(matches.length >= 2);
});

test('720px 미만에서는 11개 릴을 세 단으로 재배치한다', () => {
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.birth-slot \{ grid-template-columns: 1fr; grid-template-rows:/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.slot-reel-group-birth \{[^}]*repeat\(5,/);
});

test('생애 화면과 원작형 컨트롤이 존재한다', () => {
  for (const id of [
    'life-view', 'age-display', 'year-display', 'play-button', 'speed-controls',
    'skip-button', 'auto-button', 'stats-panel', 'money-panel', 'life-log',
    'life-map', 'family-panel', 'decision-dialog', 'result-view', 'past-lives-view',
    'reflection-dialog', 'survival-curve',
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));
});

test('인트로에서 전생 기록에 접근하고 결과 그래프와 가족 요약을 볼 수 있다', () => {
  for (const id of ['intro-past-lives-button', 'clear-past-lives-button', 'result-stats', 'result-family']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('출생신고 기록과 모델링 값 안내가 있다', () => {
  assert.match(html, /출생신고 기록/);
  assert.match(html, /모델링 값/);
});

test('정체성 발견은 거절 선택 없는 가상 인물 사건으로 표시된다', () => {
  for (const id of ['identity-dialog', 'identity-title', 'identity-continue-button']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /실제 사용자의 정체성을 판정하는 결과가 아니라/);
  assert.match(html, /data-decision=["']source["']/);
  assert.match(html, /data-speed=["']12["']/);
  assert.doesNotMatch(html, /id=["']identity-(reject|cancel|close)-button["']/);
  assert.match(renderSource, /current\.identity\.label \?\? '성'\} 정체성/);
  assert.match(html, /온라인 조사에 기반한 가상 시뮬레이션 값/);
  assert.match(html, /공식 인구 비율이 아닙니다/);
  assert.match(html, /서로 겹칠 수 있는 정체성을 단순화/);
});

test('성격이 선택을 뒤집으면 요청과 실제 선택을 확인시킨다', () => {
  for (const id of ['agency-dialog', 'agency-title', 'agency-requested', 'agency-actual', 'agency-continue-button']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(appSource, /onAgencyOverride/);
  assert.match(appSource, /pendingAgencyResolution/);
});

test('PC 생애 화면은 뷰포트에 고정되고 시스템 메시지만 스크롤한다', () => {
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*body\[data-view="life"\][\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*\.life-layout[\s\S]*min-height:\s*0/);
  assert.match(themeCss, /\.life-layout\s*>\s*\.life-story,[\s\S]*\.life-layout\s*>\s*\.life-sidebar[\s\S]*overflow:\s*hidden\s*!important/);
});

test('모바일 생애 화면은 탭으로 패널을 전환하고 내부 스크롤을 만들지 않는다', () => {
  assert.match(css, /@media \(max-width: 959px\)[\s\S]*body\[data-view="life"\][^}]*overflow:\s*hidden/);
  assert.match(css, /@media \(max-width: 959px\)[\s\S]*\.life-layout[^}]*overflow:\s*hidden/);
  assert.match(themeCss, /data-mobile-panel="status"[\s\S]*\.life-story[\s\S]*display:\s*none/);
});

test('360px 모바일 생애 그리드는 탭을 위한 별도 행을 보존한다', () => {
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?grid-template-rows: auto auto auto minmax\(0, 1fr\) auto/);
  assert.match(css, /body\[data-view="life"\] \.life-panel-tabs \{ min-height: 42px; \}/);
});

test('돈 요약·투자 메뉴·복권 방송·하단 시스템 메시지 UI가 존재한다', () => {
  for (const id of ['money-hud', 'finance-menu-button', 'finance-dialog', 'lottery-broadcast-button', 'system-feed']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /대한민국 전도에서 투자 지역을 고르세요/);
  assert.match(appSource, /renderSystemFeed/);
  for (const page of ['stock', 'crypto', 'lottery', 'car', 'property']) assert.match(html, new RegExp(`data-finance-page=["']${page}["']`));
});

test('긴 직업·금융·결과 내용은 스크롤 대신 페이지 전환으로 접근한다', () => {
  assert.match(appSource, /careerGroupPage/);
  assert.match(appSource, /dataCareerPage|dataset\.careerPage/);
  for (const page of ['summary', 'curve', 'status', 'influence', 'records']) {
    assert.match(html, new RegExp(`data-result-page-target=["']${page}["']`));
  }
  assert.match(themeCss, /result-page-tabs[\s\S]*repeat\(5,/);
});

test('모바일에서 잘릴 수 있는 선택·자산·기록은 스크롤 대신 페이지로 접근한다', () => {
  assert.match(html, /data-decision=["']pager["']/);
  assert.match(appSource, /setDecisionChoicePage/);
  for (const page of ['flow', 'assets']) assert.match(html, new RegExp(`data-money-page=["']${page}["']`));
  assert.match(appSource, /dataNetworkPage|dataset\.networkPage/);
  assert.match(appSource, /dataPastPage|dataset\.pastPage/);
  assert.match(renderSource, /collection-pager/);
  assert.match(appSource, /innerHeight\s*<\s*520/);
  assert.match(appSource, /dataSourcePage|dataset\.sourcePage/);
  assert.match(html, /class=["']source-pager decision-pager["']/);
  assert.match(appSource, /result-timeline-link[\s\S]*setResultPage\('curve'\)/);
  assert.match(themeCss, /data-result-page="influence"[\s\S]*\.result-position\s*\{\s*display:\s*block/);
});

test('모바일 제목은 무대 축소 해제 뒤 읽을 수 있는 반응형 글꼴을 쓴다', () => {
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.figma-stage[^}]*transform:\s*none/);
  assert.match(themeCss, /@media \(max-width: 560px\)[\s\S]*\.intro-stage \.intro-quote[^}]*font-size:\s*clamp\(17px/);
  assert.match(themeCss, /\.intro-stage \.intro-continue[^}]*height:\s*44px[^}]*font-size:\s*clamp\(13px/);
});

test('생애 화면은 외모·성격 칩과 자산 상세, 투자 안내를 제공한다', () => {
  for (const id of ['profile-chips', 'asset-details', 'business-status', 'result-influences']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /실제 투자·도박 조언이 아닙니다/);
  assert.match(css, /\.profile-chip/);
  assert.match(css, /\.asset-details/);
});

test('원작형 라이브·공개 삶·추모 영역과 모바일 패널 전환을 제공한다', () => {
  for (const id of ['live-counters', 'community-view', 'memorial-view', 'life-panel-tabs', 'wellbeing-panel']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-life-panel-target=["']story["']/);
  assert.match(html, /data-life-panel-target=["']status["']/);
  assert.match(html, /data-life-panel-target=["']details["']/);
  assert.match(appSource, /mobilePanel/);
  assert.match(css, /@media \(max-width: 959px\)[\s\S]*data-mobile-panel/);
});

test('같은 해 태어난 네 사람을 출생·생애·엔딩에서 이어서 보여준다', () => {
  assert.match(html, /cohort-preview|cohort-life|cohort-result/);
  assert.match(html, /같은 해 태어난 네 사람/);
  assert.match(appSource, /createCohortPeers|advanceCohort|renderCohort/);
});

test('생애 작업공간은 화면 높이에 맞춰지고 현재 장면은 모바일에서도 유지된다', () => {
  assert.match(css, /height:\s*calc\(100svh - 80px\)/);
  assert.match(css, /@media \(max-width: 959px\)[\s\S]*\.current-moment[\s\S]*display:\s*block/);
});

test('공개 버튼은 비동기 이후에도 안전한 참조를 쓰고 작성자 숨김 동작을 제공한다', () => {
  assert.match(appSource, /const publishButton = event\.currentTarget/);
  assert.doesNotMatch(appSource, /await community\.publishLife[\s\S]{0,200}event\.currentTarget/);
  assert.match(renderSource, /data\.publicLifeId|dataset\.publicLifeId/);
  assert.match(appSource, /community\.hideLife/);
});
