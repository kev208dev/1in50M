# 5000만 분의 1 랜덤 출생 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대한민국 출생 조건을 반복해서 뽑고 확정할 수 있는 모바일 중심 인터랙티브 웹사이트를 구현해 Sites에 배포한다.

**Architecture:** 빌드 단계가 없는 정적 HTML·CSS·JavaScript 사이트로 만든다. 데이터와 순수 생성 로직은 화면 코드에서 분리해 Node 내장 테스트로 검증하고, 화면 상태는 브라우저 메모리와 `localStorage`로 관리한다.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js `node:test`, OpenAI Sites static hosting

**Spec:** `docs/superpowers/specs/2026-10-13-one-in-50-million-birth-draw-design.md`

## Global Constraints

- `sources/` 아래의 동기화된 프로젝트 파일을 수정·이동·삭제하지 않는다.
- 다크 모드만 구현하고 `#111613`, `#1A211C`, `#26302A`, `#EEF3EC`, `#3DF08A`를 중심으로 사용한다.
- 제공된 팔레트 밖의 강조색을 추가하지 않는다.
- 제목은 Hahmlet 500, 본문은 IBM Plex Sans KR 400·600, 코드·수치는 IBM Plex Mono 400·600을 사용한다.
- 결과 화면과 인트로에 `현재 결과는 실제 인구통계가 아닌 체험용 가상 시뮬레이션입니다.`를 표시한다.
- 생성 애니메이션은 1.2초 안에 끝나야 하며 `prefers-reduced-motion`에서는 즉시 끝난다.
- 최소 지원 너비는 360px이고 터치 영역은 최소 44px이다.
- 개인정보를 입력받거나 서버로 전송하지 않는다.

## Review Focus

- 손상된 `localStorage` JSON이 있어도 앱이 빈 상태로 정상 시작해야 한다.
- 무작위 가중치의 경계값이 정확히 0 또는 총합에 가까워도 유효한 후보를 반환해야 한다.
- 연속으로 매우 빠르게 `다시 태어나기`를 눌러도 생성이 중첩되지 않아야 한다.
- 직전 인생이 없을 때 `이전 인생`은 비활성화되고 키보드로 실행되지 않아야 한다.
- 360px 화면과 `prefers-reduced-motion` 환경에서도 가로 스크롤과 불필요한 모션이 없어야 한다.

---

### Task 1: 출생 데이터와 순수 시뮬레이션 엔진

**Files:**
- Create: `dist/data.js`
- Create: `dist/simulator.js`
- Create: `tests/simulator.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces: `REGIONS`, `FAMILY_TYPES`, `OCCUPATIONS`, `FINANCES`, `HOUSING`, `weightedPick(items, randomValue)`, `createBirthProfile(randomFn, year)`, `validateProfile(profile)`

- [ ] **Step 1: 17개 시도와 가중 선택의 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../dist/data.js';
import { weightedPick, createBirthProfile, validateProfile } from '../dist/simulator.js';

test('대한민국 17개 시도를 모두 제공한다', () => {
  assert.equal(REGIONS.length, 17);
  assert.equal(new Set(REGIONS.map((region) => region.name)).size, 17);
  assert.ok(REGIONS.every((region) => region.districts.length >= 3));
});

test('가중 선택은 양쪽 경계에서도 후보를 반환한다', () => {
  const items = [{ value: '처음', weight: 1 }, { value: '끝', weight: 1 }];
  assert.equal(weightedPick(items, 0).value, '처음');
  assert.equal(weightedPick(items, 0.999999).value, '끝');
});

test('생성된 프로필은 필수 필드와 0~100 능력치를 가진다', () => {
  const profile = createBirthProfile(() => 0.42, 2026);
  assert.equal(profile.birthYear, 2026);
  assert.equal(validateProfile(profile), true);
  assert.ok(Object.values(profile.stats).every((value) => value >= 0 && value <= 100));
});
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `node --test tests/simulator.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 체험용 가중 데이터 구현**

`dist/data.js`에 17개 시도와 각 3~6개의 대표 세부 지역, 가족 구성, 보호자 직업군, 가정 형편, 주거 형태, 형제자매 후보를 `{ value, weight }` 또는 `{ name, code, weight, districts }` 형태로 정의한다. 수도권 가중치는 다른 지역보다 높게 두되 파일 상단에 아래 주석을 둔다.

```js
// 체험용 가중치입니다. 실제 인구통계 비율이 아닙니다.
export const SIMULATION_DISCLAIMER =
  '현재 결과는 실제 인구통계가 아닌 체험용 가상 시뮬레이션입니다.';
```

- [ ] **Step 4: 생성 엔진 구현**

`dist/simulator.js`에 다음 시그니처를 구현한다.

```js
export function weightedPick(items, randomValue = Math.random()) {}
export function createBirthProfile(randomFn = Math.random, year = 2026) {}
export function validateProfile(profile) {}
```

프로필은 `{ id, birthYear, region, district, familyType, guardians, finance, housing, siblings, stats, summary }`를 반환한다. `stats`는 `{ health, stability, education, relationships }`이며 모든 값을 `0..100`으로 제한한다. 지역이나 가족 형태 자체에 부정적 능력치 가중치를 직접 부여하지 않고 가정 형편과 소량의 무작위 변동만 반영한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test tests/simulator.test.mjs`
Expected: 3 tests PASS

- [ ] **Step 6: 작업 상태 기록**

이 폴더는 Git 저장소가 아니므로 커밋 대신 계획 체크박스를 갱신하고 생성 파일 목록을 확인한다.

Run: `find dist tests -maxdepth 2 -type f -print`
Expected: `dist/data.js`, `dist/simulator.js`, `tests/simulator.test.mjs`

### Task 2: 반응형 출생 화면과 디자인 시스템

**Files:**
- Create: `dist/index.html`
- Create: `dist/styles.css`

**Interfaces:**
- Consumes: `SIMULATION_DISCLAIMER` 문구, `app.js`에서 갱신할 `[data-field]` 요소
- Produces: `#intro-view`, `#profile-view`, `#future-view`, `#birth-button`, `#reroll-button`, `#previous-button`, `#accept-button`, `#back-button`, `#live-region`

- [ ] **Step 1: 정적 구조 실패 검사를 작성**

`tests/markup.test.mjs`를 만들고 필수 랜드마크, 버튼, 안내 문구가 없을 때 실패하도록 한다.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

test('세 화면과 모든 주요 동작이 존재한다', () => {
  for (const id of ['intro-view', 'profile-view', 'future-view', 'birth-button', 'reroll-button', 'previous-button', 'accept-button', 'back-button', 'live-region']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('가상 시뮬레이션 안내를 인트로와 결과에 모두 표시한다', () => {
  const matches = html.match(/실제 인구통계가 아닌 체험용 가상 시뮬레이션입니다/g) ?? [];
  assert.ok(matches.length >= 2);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/markup.test.mjs`
Expected: FAIL because `dist/index.html` does not exist

- [ ] **Step 3: 접근 가능한 세 화면 HTML 작성**

`dist/index.html`은 하나의 `<main>` 안에 인트로, 프로필, 다음 단계 예고를 둔다. 프로필에는 지역·가족·가정·주거 카드와 건강·안정·교육 기회·관계 막대를 포함하고, 모든 변경 대상은 `data-field`를 갖는다. `#live-region`은 `aria-live="polite"`로 둔다. 하단 액션 바의 버튼 순서는 `이전 인생`, `다시 태어나기`, `이 인생 시작하기`다.

- [ ] **Step 4: 팔레트와 반응형 CSS 작성**

`dist/styles.css` 루트에 다음 토큰을 정의한다.

```css
:root {
  --bg: #111613;
  --surface: #1a211c;
  --surface-raised: #26302a;
  --ink: #eef3ec;
  --ink-muted: #c8d0c2;
  --accent: #3df08a;
  --accent-deep: #22c55e;
  --line: rgba(200, 208, 194, 0.18);
  --font-display: 'Hahmlet', 'Noto Serif KR', serif;
  --font-body: 'IBM Plex Sans KR', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

360px 이상은 한 열, 840px 이상은 프로필 2열을 사용한다. 모바일의 `.action-bar`는 하단 고정이며 `env(safe-area-inset-bottom)`을 포함한다. `@media (prefers-reduced-motion: reduce)`에서 애니메이션과 부드러운 스크롤을 끈다.

- [ ] **Step 5: 정적 검사 통과 확인**

Run: `node --test tests/markup.test.mjs`
Expected: 2 tests PASS

### Task 3: 상호작용, 기록, 저장 복구

**Files:**
- Create: `dist/state.js`
- Create: `dist/app.js`
- Create: `tests/state.test.mjs`

**Interfaces:**
- Consumes: `createBirthProfile()`, `validateProfile()`, Task 2 DOM IDs
- Produces: `readSavedState(storage)`, `writeSavedState(storage, state)`, `createHistoryState(current, previous)`, 브라우저 이벤트 핸들러

- [ ] **Step 1: 저장 상태 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSavedState, writeSavedState, createHistoryState } from '../dist/state.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('손상된 저장값은 예외 없이 빈 상태가 된다', () => {
  assert.deepEqual(readSavedState(memoryStorage({ oneIn50mState: '{broken' })), { current: null, previous: null });
});

test('현재와 직전 인생을 저장하고 복원한다', () => {
  const storage = memoryStorage();
  const state = createHistoryState({ id: 'new' }, { id: 'old' });
  writeSavedState(storage, state);
  assert.deepEqual(readSavedState(storage), state);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/state.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 방어적인 저장 모듈 구현**

`dist/state.js`는 고정 키 `oneIn50mState`를 사용한다. 파싱 실패, 객체가 아닌 값, 저장 공간 예외를 모두 잡고 `{ current: null, previous: null }`을 반환한다. 쓰기 실패는 앱 동작을 막지 않는다.

- [ ] **Step 4: 앱 상태 전환 구현**

`dist/app.js`에서 초기 저장 상태를 읽고 다음 동작을 연결한다.

```js
async function drawLife() {
  if (isDrawing) return;
  isDrawing = true;
  setControlsDisabled(true);
  // reduced motion이면 0ms, 아니면 900ms 동안 셔플 프레임 표시
  // 새 프로필을 current로, 기존 current를 previous로 이동
  // 저장·렌더링·aria-live 알림 후 잠금 해제
}
```

`previous-button`은 `previous === null`일 때 `disabled`로 유지한다. 이전 인생 복원은 current와 previous를 서로 교환해 다시 앞으로 돌아갈 수 있게 한다. `accept-button`은 다음 단계 예고 화면, `back-button`은 프로필 화면을 연다.

- [ ] **Step 5: 상태 테스트 통과 확인**

Run: `node --test tests/state.test.mjs`
Expected: 2 tests PASS

- [ ] **Step 6: 전체 자동 검사 실행**

Run: `node --test tests/*.test.mjs`
Expected: all tests PASS

### Task 4: 호스팅 설정, 브라우저 QA, Sites 게시

**Files:**
- Create: `.openai/hosting.json`
- Create: `.openai/site.json` through Sites registration helper when applicable
- Modify: plan checkboxes after verification

**Interfaces:**
- Consumes: 완성된 `dist/` 정적 사이트
- Produces: private deployed Sites URL and in-app preview

- [ ] **Step 1: 새 private Site를 등록하고 ID 저장**

Sites의 `create_site`를 호출한 뒤 반환된 `project_id` 원문을 `set-project-id.mjs`의 `--project-id` 인자로 그대로 전달한다. 값을 축약하거나 새 ID를 생성하지 않는다.

Run: `node /Users/chaeho/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/set-project-id.mjs --project-id "$ONE_IN_50M_SITE_ID"` after assigning `ONE_IN_50M_SITE_ID` to the exact `create_site` result
Expected: Site identity is persisted

- [ ] **Step 2: 정적 호스팅 매니페스트 작성**

`.openai/hosting.json`에 Step 1의 정확한 `project_id` 문자열과 `"static": { "directory": "dist" }`를 기록한다. 저장 직후 파일의 ID가 `create_site` 결과와 한 글자도 다르지 않은지 대조한다.

- [ ] **Step 3: 로컬 프리뷰와 브라우저 QA**

Sites 로컬 프리뷰 지침을 먼저 읽고 로컬 서버를 연다. 브라우저에서 다음을 확인한다.

1. 1440px: 인트로에서 태어나기 → 프로필 2열 표시
2. 다시 태어나기 연타: 중복 생성 없음
3. 이전 인생: 직전 프로필 복원
4. 이 인생 시작하기: 성장 예고 화면 이동
5. 새로고침: 마지막 프로필 유지
6. 390px: 가로 스크롤 없음, 하단 버튼 접근 가능
7. reduced motion: 셔플 애니메이션 생략

- [ ] **Step 4: 소스 패키징**

`site-workflow.mjs`를 TTY로 실행하고, 준비 완료 메시지 뒤에 source credential과 `commands: []`, 절대 `archivePath`를 표준 입력 JSON으로 전달한다.

Expected: verified `project_id`, `commit_sha`, `archive` returned

- [ ] **Step 5: private 버전 저장·배포**

패키징 결과를 `save_version_and_deploy_private`에 전달한다. 배포가 pending이면 `get_deployment_status`로 terminal 상태까지 확인한다.

Expected: successful deployment URL

- [ ] **Step 6: 사용자에게 사이트 열기**

배포 URL을 Codex 브라우저 패널에 열고, 링크와 구현된 동작을 사용자에게 전달한다.

