# 시대·역사·룰렛 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1950년대부터 미래까지 달력 연도에 맞춰 전개되는 한국형 생애 시뮬레이션과 제공된 룰렛 UI, 자동 병역판정, 가정·개인 경제 분리, 진행 캐릭터를 완성한다.

**Architecture:** 기존 정적 ES 모듈 구조를 유지하면서 시대·역사·병역을 독립된 순수 데이터/엔진 모듈로 추가한다. 출생연도는 런타임 설정에서 결정하고, `advanceYear` 이후 시대 사건과 병역 판정을 평가하며, UI는 엔진이 만든 뷰 모델만 렌더링한다. Supabase가 없는 GitHub Pages에서도 모든 핵심 플레이가 동작하고 공개 기록은 로컬 실제 기록만 보여준다.

**Tech Stack:** Buildless HTML/CSS/JavaScript ES modules, Node.js built-in test runner, localStorage, optional Supabase, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-15-era-history-roulette-design.md`

## Global Constraints

- 실제 역사 사건과 미래 전망 시나리오를 UI와 데이터에서 구분한다.
- 병역 판정은 게임용 단순화이며 면제·비대상을 사용자가 직접 고를 수 없다.
- 18세 미만 개인 현금과 가정 지원을 분리한다.
- 제공된 룰렛의 시각 구조를 재구성하되 제공 HTML의 2026년 전용 대규모 원자료는 복사하지 않는다.
- `함께 태어난 네 사람`과 공개 기록 샘플 데이터를 제거한다.
- 장애·인종·성별을 우열이나 희화화로 표현하지 않는다.
- 모션 감소, 키보드 조작, 320px 이상 모바일 화면을 지원한다.
- `sources/`와 동기화된 프로젝트 자료는 수정하지 않는다.

## Review Focus

- 2020년대 선택을 2029년까지 뽑는 오류: 현재 연도까지만 생성되는 테스트를 Task 1에 둔다.
- 오래된 저장본이 새 경제·병역 필드 때문에 깨지는 오류: v2~v4 정규화 테스트를 Task 3과 Task 4에 둔다.
- 역사 사건이 한 해에 두 번 발생하거나 미래 사건이 과거에 나타나는 오류: 중복·경계 테스트를 Task 2에 둔다.
- 비대상 또는 면제 프로필에 병역 선택창이 열리는 오류: 컨트롤러 통합 테스트를 Task 4에 둔다.
- 공개 기록이 없을 때 샘플 숫자나 가상 기록이 남는 오류: 빈 상태와 카운터 테스트를 Task 5에 둔다.

---

### Task 1: 10년 단위 시대 설정

**Files:**
- Create: `dist/data/eras.js`
- Modify: `dist/data/runtime-settings.js`
- Modify: `dist/index.html`
- Test: `tests/runtime-settings.test.mjs`
- Test: `tests/era-settings.test.mjs`

**Interfaces:**
- Produces: `ERA_OPTIONS`, `ERA_BY_ID`, `eraForYear(year, currentYear)`, `resolveBirthYear(settings, seed, currentYear)`
- Consumes: `createRng(seed)` from `dist/engine/random.js`

- [ ] **Step 1: Write the failing era range tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ERA_OPTIONS, eraForYear } from '../dist/data/eras.js';
import { resolveBirthYear } from '../dist/data/runtime-settings.js';

test('1950년대부터 2020년대와 미래를 고를 수 있다', () => {
  assert.deepEqual(ERA_OPTIONS.map((item) => item.id), [
    'random', '1950s', '1960s', '1970s', '1980s', '1990s',
    '2000s', '2010s', '2020s', 'future',
  ]);
});

test('각 연대는 해당 10년 안에서만 출생연도를 만든다', () => {
  for (const start of [1950, 1960, 1970, 1980, 1990, 2000, 2010]) {
    const year = resolveBirthYear({ era: `${start}s` }, `seed-${start}`, 2026);
    assert.ok(year >= start && year <= start + 9, `${start}: ${year}`);
  }
});

test('2020년대는 현재 연도 뒤를 만들지 않는다', () => {
  for (let index = 0; index < 100; index += 1) {
    const year = resolveBirthYear({ era: '2020s' }, `current-${index}`, 2026);
    assert.ok(year >= 2020 && year <= 2026);
  }
});

test('달력 연도를 시대 id로 분류한다', () => {
  assert.equal(eraForYear(1957, 2026).id, '1950s');
  assert.equal(eraForYear(2026, 2026).id, '2020s');
  assert.equal(eraForYear(2037, 2026).id, 'future');
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/era-settings.test.mjs tests/runtime-settings.test.mjs`

Expected: module-not-found for `dist/data/eras.js` and missing decade ids.

- [ ] **Step 3: Implement era data and deterministic year selection**

```js
export const ERA_OPTIONS = [
  { id: 'random', label: '완전 무작위', startYear: null, endYear: null },
  ...[1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((startYear) => ({
    id: `${startYear}s`, label: `${startYear}년대`, startYear, endYear: startYear + 9,
  })),
  { id: 'future', label: '미래 대한민국', startYear: null, endYear: null },
];
export const ERA_BY_ID = Object.fromEntries(ERA_OPTIONS.map((item) => [item.id, item]));
export function eraForYear(year, currentYear) {
  if (year > currentYear) return ERA_BY_ID.future;
  return ERA_BY_ID[`${Math.floor(year / 10) * 10}s`] ?? ERA_BY_ID.random;
}
```

Update `resolveBirthYear` so a decade uses `max(startYear, min(endYear, currentYear))`, future uses `currentYear + 5` through `currentYear + 35`, and random draws from the valid decade/future buckets with current decades weighted more heavily.

- [ ] **Step 4: Render the options from the same era data**

Replace the four hardcoded era options in `index.html` with the ten exact option values asserted above. Keep `normalizeRuntimeSettings` restricted to `ERA_OPTIONS`.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test tests/era-settings.test.mjs tests/runtime-settings.test.mjs`

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add dist/data/eras.js dist/data/runtime-settings.js dist/index.html tests/era-settings.test.mjs tests/runtime-settings.test.mjs
git commit -m "feat: add decade-based birth eras"
```

### Task 2: 실제 연도 역사 사건과 미래 전망

**Files:**
- Create: `dist/data/history-events.js`
- Create: `dist/data/future-events.js`
- Create: `dist/engine/era-events.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/render.js`
- Modify: `tests/support/life-fixtures.mjs`
- Test: `tests/era-events.test.mjs`
- Test: `tests/life-engine.test.mjs`
- Test: `tests/render.test.mjs`

**Interfaces:**
- Produces: `HISTORY_EVENTS`, `FUTURE_EVENTS`, `eligibleEraEvents(life, currentYear)`, `selectEraEvent(life, currentYear)`, `applyEraEvent(life, event)`, history entry fields `sourceLabel`, `sourceUrl`, `projection`
- Consumes: normalized life state and `createRng`

Add this fixture before writing the event tests so calendar-year assertions do not depend on whichever birth year the default profile happens to generate:

```js
export function makeLifeAtYear(year, overrides = {}) {
  const age = Number.isInteger(overrides.age) ? overrides.age : 30;
  const base = makeLifeAtAge(age);
  return normalizeLife(deepMerge(base, {
    age,
    year,
    profile: { birthYear: year - age },
    ...overrides,
  }));
}
```

- [ ] **Step 1: Write failing calendar-boundary and duplicate tests**

```js
test('한국전쟁 사건은 1950~1953년에만 후보가 된다', () => {
  assert.ok(eligibleEraEvents(makeLifeAtYear(1951), 2026).some((event) => event.id === 'korean-war-displacement'));
  assert.ok(!eligibleEraEvents(makeLifeAtYear(1954), 2026).some((event) => event.id === 'korean-war-displacement'));
});

test('1997년 외환위기는 같은 삶에서 한 번만 발생한다', () => {
  const life = makeLifeAtYear(1997, { eraEventIds: ['imf-crisis'] });
  assert.ok(!eligibleEraEvents(life, 2026).some((event) => event.id === 'imf-crisis'));
});

test('미래 전망은 현재 이후에만 나오고 projection으로 표시된다', () => {
  assert.equal(eligibleEraEvents(makeLifeAtYear(2026), 2026).some((event) => event.projection), false);
  assert.equal(eligibleEraEvents(makeLifeAtYear(2035), 2026).every((event) => event.projection), true);
});

test('같은 삶과 연도는 같은 시대 사건을 선택한다', () => {
  const life = makeLifeAtYear(1997, { seed: 'history-deterministic' });
  assert.deepEqual(selectEraEvent(life, 2026), selectEraEvent(life, 2026));
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/era-events.test.mjs`

Expected: missing `dist/engine/era-events.js`.

- [ ] **Step 3: Add the exact initial history dataset**

Create data objects for these ids and date ranges:

```js
export const HISTORY_EVENTS = [
  ['korean-war-displacement', 1950, 1953, '전쟁과 피란', 'archives-film'],
  ['postwar-reconstruction', 1954, 1960, '전후 복구의 일상', 'archives-film'],
  ['industrialization-move', 1962, 1969, '공업화와 도시 이주', 'archives-population'],
  ['saemaul-movement', 1970, 1979, '농촌과 산업현장의 변화', 'archives-saemaul'],
  ['democratization-1987', 1987, 1987, '1987년의 거리와 일상', 'history-timeline'],
  ['seoul-olympics', 1988, 1988, '서울올림픽의 해', 'archives-film'],
  ['pc-communication', 1990, 1996, 'PC통신과 대중문화', 'social-trends'],
  ['imf-crisis', 1997, 2001, '외환위기와 가계 재편', 'social-trends'],
  ['world-cup-internet', 2002, 2007, '월드컵과 초고속 인터넷', 'social-trends'],
  ['global-financial-crisis', 2008, 2009, '세계 금융위기의 여파', 'social-trends'],
  ['smartphone-platforms', 2010, 2019, '스마트폰과 플랫폼 일상', 'social-trends'],
  ['pandemic-life', 2020, 2022, '감염병과 비대면 일상', 'kdca-covid'],
  ['cost-of-living', 2023, 2026, '금리와 생활비의 압박', 'social-trends'],
].map(([id, startYear, endYear, title, sourceKey]) => ({
  id, startYear, endYear, title, sourceKey, projection: false,
}));
```

Create and export this exact source catalog; event records resolve `sourceLabel` and `sourceUrl` from it:

```js
export const ERA_EVENT_SOURCES = {
  'archives-film': ['국가기록원 문화영화로 보는 대한민국', 'https://theme.archives.go.kr/next/movie/index.do'],
  'archives-population': ['국가기록원 시기별 인구정책', 'https://theme.archives.go.kr/next/populationPolicy/policy1980.do'],
  'archives-saemaul': ['국가기록원 새마을운동', 'https://theme.archives.go.kr/next/koreaOfRecord/saemaeul.do'],
  'history-timeline': ['우리역사넷 연표', 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_h52_0060'],
  'social-trends': ['통계청 한국의 사회동향 2025', 'https://sri.kostat.go.kr/boardDownload.es?bid=246&list_no=438233&seq=7'],
  'kdca-covid': ['질병관리청 코로나19', 'https://ncov.kdca.go.kr/'],
  'future-households': ['통계청 장래가구추계', 'https://kostat.go.kr/board.es?act=view&bid=207&list_no=418919&mid=a10301020100'],
  'future-climate': ['기후정보포털 한국 기후위기 평가보고서', 'https://www.climate.go.kr/home/cc_data/2025/report_2025_2.pdf'],
  'future-ai': ['과학기술정보통신부 국가 인공지능 실행계획', 'https://www.msit.go.kr/eng/bbs/view.do?bbsSeqNo=42&mId=4&mPid=2&nttSeqNo=1040&sCode=eng'],
};
```

Add explicit age ranges, optional region/occupation predicates, numeric effects, and display text to every record. The Korean War event must not increase happiness or cash; the IMF event must require age 18 or older and weight employed households twice; school-related effects must use age ranges 6~18 only.

- [ ] **Step 4: Add future projections and selection engine**

Define these projection ids: `ai-coworker`, `automation-retraining`, `autonomous-mobility`, `synthetic-media-fraud`, `care-robot`, `climate-extremes`, `single-household-services`. Every object has `projection: true`, `startYear >= 2027`, an end year, age range, effects, and one of the exact source keys `future-ai`, `future-climate`, or `future-households`.

Implement selection as:

```js
export function eligibleEraEvents(life, currentYear = 2026) {
  const events = life.year > currentYear ? FUTURE_EVENTS : HISTORY_EVENTS;
  return events.filter((event) => life.year >= event.startYear
    && life.year <= event.endYear
    && life.age >= event.ageRange[0]
    && life.age <= event.ageRange[1]
    && !life.eraEventIds.includes(event.id)
    && (!event.when || event.when(life)));
}
```

`selectEraEvent` uses `seed`, `year`, and `rngState`; `applyEraEvent` updates clamped stats/economy, appends the id to `eraEventIds`, and writes source/projection metadata to history.

- [ ] **Step 5: Integrate one era event per year and render source badges**

Normalize `eraEventIds` to a unique string array. After annual economy and before generic random events, select and apply at most one era event. In the life log, append `전망 시나리오` only when `entry.projection === true`; historical entries show year and source without a forecast label.

- [ ] **Step 6: Run focused, completion, and full tests**

Run: `node --test tests/era-events.test.mjs tests/life-engine.test.mjs tests/render.test.mjs tests/full-life.test.mjs`

Run: `npm test`

Expected: all tests pass and 100 fixed seeds finish without duplicate era events or NaN values.

- [ ] **Step 7: Commit**

```bash
git add dist/data/history-events.js dist/data/future-events.js dist/engine/era-events.js dist/engine/life.js dist/ui/render.js tests/support/life-fixtures.mjs tests/era-events.test.mjs tests/life-engine.test.mjs tests/render.test.mjs
git commit -m "feat: add calendar-driven Korean history events"
```

### Task 3: 개인 현금과 가정 지원 분리

**Files:**
- Modify: `dist/engine/life.js`
- Modify: `dist/engine/decisions.js`
- Modify: `dist/engine/economy.js`
- Modify: `dist/ui/render.js`
- Modify: `dist/index.html`
- Test: `tests/career-economy.test.mjs`
- Test: `tests/education-decisions.test.mjs`
- Test: `tests/render.test.mjs`
- Test: `tests/life-storage-summary.test.mjs`

**Interfaces:**
- Produces: `economy.householdSupport: number`, `choice.payer: 'household' | 'personal'`, view model `householdSupport`, minor cash display `—`
- Consumes: finance-derived initial support and existing economy normalization

- [ ] **Step 1: Write failing ownership tests**

```js
test('새 삶은 개인 현금 0원과 별도의 가정 지원으로 시작한다', () => {
  const life = createLife(profile, 'newborn-money');
  assert.equal(life.economy.cash, 0);
  assert.ok(life.economy.householdSupport > 0);
});

test('미성년 사교육비는 가정 지원에서만 빠진다', () => {
  const life = makeLifeAtAge(10, { economy: { cash: 0, householdSupport: 5_000_000 } });
  const next = applyDecision(life, 'private-education', 'core-subjects');
  assert.equal(next.economy.cash, 0);
  assert.ok(next.economy.householdSupport < 5_000_000);
});

test('미성년 화면의 현금은 대시로 표시한다', () => {
  assert.equal(createLifeViewModel(makeLifeAtAge(0)).cash, '—');
  assert.equal(createLifeViewModel(makeLifeAtAge(18, { economy: { cash: 12000 } })).cash, '12,000원');
});

test('기존 v4 저장본은 현금을 잃지 않는다', () => {
  const legacy = makeLifeAtAge(30, { version: 4, economy: { cash: 3_000_000 } });
  delete legacy.economy.householdSupport;
  assert.equal(normalizeLife(legacy).economy.cash, 3_000_000);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/career-economy.test.mjs tests/education-decisions.test.mjs tests/render.test.mjs tests/life-storage-summary.test.mjs`

Expected: newborn cash is nonzero and `householdSupport` is missing.

- [ ] **Step 3: Implement economy ownership**

Set new-life cash to zero and initial household support to `financeBase(profile.finance)`. Normalize absent `householdSupport` to zero without moving legacy cash. Mark `private-education` costs with `payer: 'household'` and change availability/application:

```js
const availableMoney = choice.payer === 'household' && life.age < 18
  ? life.economy.householdSupport
  : life.economy.cash;

if (selected.cost) {
  if (selected.payer === 'household' && current.age < 18) economy.householdSupport -= selected.cost;
  else economy.cash -= selected.cost;
}
```

Recompute net worth without counting `householdSupport` as the child's asset.

- [ ] **Step 4: Render the distinction**

`createLifeViewModel` returns `cash: current.age < 18 ? '—' : formatWon(cash)` and `householdSupport: current.age < 18 ? formatWon(householdSupport) : null`. Add a `가정 지원` row that hides at age 18.

- [ ] **Step 5: Run focused and full tests, then commit**

Run: `node --test tests/career-economy.test.mjs tests/education-decisions.test.mjs tests/render.test.mjs tests/life-storage-summary.test.mjs`

Run: `npm test`

```bash
git add dist/engine/life.js dist/engine/decisions.js dist/engine/economy.js dist/ui/render.js dist/index.html dist/data/decisions-youth.js tests/career-economy.test.mjs tests/education-decisions.test.mjs tests/render.test.mjs tests/life-storage-summary.test.mjs
git commit -m "feat: separate household support from personal cash"
```

### Task 4: 자동 병역판정과 허용된 선택

**Files:**
- Create: `dist/engine/service.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/data/decisions-youth.js`
- Modify: `dist/engine/decisions.js`
- Modify: `dist/ui/controls.js`
- Modify: `dist/ui/render.js`
- Modify: `tests/support/life-fixtures.mjs`
- Test: `tests/service.test.mjs`
- Test: `tests/controller.test.mjs`
- Test: `tests/education-decisions.test.mjs`
- Test: `tests/life-storage-summary.test.mjs`

**Interfaces:**
- Produces: `defaultServiceState()`, `assessService(life)`, `serviceDecisionFor(life)`, life `service: { status, grade, assessedAge, completed }`
- Consumes: profile sex/disability, current health, birth year, deterministic RNG

Add this fixture so service tests state their target profile explicitly:

```js
export function makeMaleLifeAtAge(age, overrides = {}) {
  const base = makeLifeAtAge(age);
  return normalizeLife(deepMerge(base, {
    profile: { sex: { id: 'male', label: '남성' } },
    ...overrides,
  }));
}
```

- [ ] **Step 1: Write failing deterministic and no-self-exemption tests**

```js
test('같은 삶은 같은 병역판정을 받는다', () => {
  const life = makeMaleLifeAtAge(19, { seed: 'service-fixed' });
  assert.deepEqual(assessService(life), assessService(life));
});

test('비대상과 면제 판정에는 사용자 선택지가 없다', () => {
  const exempt = makeMaleLifeAtAge(19, { service: { status: 'exempt', grade: 6, assessedAge: 19, completed: true } });
  assert.equal(serviceDecisionFor(exempt), null);
  const nonTarget = makeLifeAtAge(19, { profile: { sex: { id: 'female', label: '여성' } } });
  assert.equal(serviceDecisionFor(nonTarget), null);
});

test('복무 결정에 면제·비대상 선택지가 존재하지 않는다', () => {
  const ids = DECISION_BY_ID['service-path'].choices.map((choice) => choice.id);
  assert.ok(!ids.includes('not-applicable'));
});

test('기존 저장본은 안전한 미판정 상태로 정규화된다', () => {
  const legacy = makeLifeAtAge(18);
  delete legacy.service;
  assert.equal(normalizeLife(legacy).service.status, 'unassessed');
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/service.test.mjs tests/controller.test.mjs tests/education-decisions.test.mjs`

Expected: missing service module and old `not-applicable` choice remains.

- [ ] **Step 3: Implement service state and assessment**

Use these statuses exactly: `unassessed`, `active`, `supplementary`, `wartime-labor`, `exempt`, `recheck`, `not-target`, `completed`. Non-target profiles resolve immediately. For target profiles, disability support level and health provide deterministic grade bands; RNG only resolves within valid neighboring grades. Grade mappings are 1~3 active, 4 supplementary, 5 wartime-labor, 6 exempt, 7 recheck.

```js
export function assessService(life) {
  if (!isServiceTarget(life.profile)) return { status: 'not-target', grade: null, assessedAge: life.age, completed: true };
  const grade = deterministicGrade(life);
  return { status: STATUS_BY_GRADE[grade], grade, assessedAge: life.age, completed: [5, 6].includes(grade) };
}
```

- [ ] **Step 4: Restrict decisions and controller flow**

At age 19, assess before `getDecision`. Replace service choices with `serve-now`, `defer-study`, and `defer-work`, each filtered by `service.status`; active and supplementary can choose timing, while wartime-labor, exempt, and non-target are logged automatically and never open a dialog. A recheck schedules `nextAssessmentAge = age + 1` and blocks service choices until reassessed.

- [ ] **Step 5: Add controller tests for automatic disposition**

Add one controller test each for active dialog, exempt no dialog, non-target no dialog, and recheck next-year assessment. Assert the life continues after automatic states and the user cannot inject a disabled status choice through `answerDecision`.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/service.test.mjs tests/controller.test.mjs tests/education-decisions.test.mjs tests/life-storage-summary.test.mjs`

Run: `npm test`

```bash
git add dist/engine/service.js dist/engine/life.js dist/data/decisions-youth.js dist/engine/decisions.js dist/ui/controls.js dist/ui/render.js tests/support/life-fixtures.mjs tests/service.test.mjs tests/controller.test.mjs tests/education-decisions.test.mjs tests/life-storage-summary.test.mjs
git commit -m "feat: determine military disposition before choices"
```

### Task 5: 실제 공개 기록만 표시하고 비교 인생 제거

**Files:**
- Delete: `dist/engine/companions.js`
- Delete: `dist/data/community-samples.js`
- Modify: `dist/community.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Modify: `dist/ui/birth-slot.js`
- Modify: `dist/ui/render.js`
- Modify: `dist/styles.css`
- Test: `tests/community.test.mjs`
- Test: `tests/companions.test.mjs` (delete after replacement coverage exists)
- Test: `tests/markup.test.mjs`

**Interfaces:**
- Produces: `filterPublicLives(lives, { memorial })`, empty-state renderer behavior
- Removes: `createCompanionLives`, `advanceCompanionLives`, companion DOM ids, default sample records

- [ ] **Step 1: Write failing real-record and memorial tests**

```js
test('설정과 로컬 기록이 없으면 공개 삶은 빈 배열이다', async () => {
  const client = createCommunityClient({}, { storage: memoryStorage() });
  assert.deepEqual(await client.listPublicLives(), []);
});

test('추모관은 90세 이전에 종료된 공개 기록만 보여준다', () => {
  const lives = [{ id: 'early', age: 54 }, { id: 'complete', age: 90 }];
  assert.deepEqual(filterPublicLives(lives, { memorial: true }).map((life) => life.id), ['early']);
});

test('공개 기록이 없으면 빈 상태가 렌더링된다', () => {
  const root = fakeDocument().createElement('div');
  renderPublicLives(root, []);
  assert.match(root.textContent, /아직 공개된 삶이 없습니다/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/community.test.mjs tests/markup.test.mjs`

Expected: samples make the empty list assertion fail and memorial includes age 90.

- [ ] **Step 3: Remove samples and implement filtering/empty states**

Remove the sample import and default argument from `createCommunityClient`. Implement:

```js
export function filterPublicLives(lives, { memorial = false } = {}) {
  const safe = Array.isArray(lives) ? lives : [];
  return memorial ? safe.filter((life) => life.age < 90) : safe;
}
```

Use this function before slicing cards. Empty community copy is `아직 공개된 삶이 없습니다.` and memorial copy is `아직 이곳에 남겨진 기록이 없습니다.` Live counters use actual returned list lengths and show `오프라인` for presence when no backend is connected.

- [ ] **Step 4: Remove companion code and UI**

Delete imports, candidate state, creation, storage, rendering, profile panel, life detail panel, styles, and tests that assert four generated peers. Existing saved `companions` properties may remain ignored; do not fail normalization.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/community.test.mjs tests/markup.test.mjs tests/birth-slot-ui.test.mjs`

Run: `npm test`

```bash
git add -A dist tests
git commit -m "fix: show only real public life records"
```

### Task 6: 제공 룰렛을 현재 출생 엔진에 연결

**Files:**
- Modify: `dist/ui/birth-slot.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Test: `tests/birth-slot-ui.test.mjs`
- Test: `tests/birth-slot.test.mjs`

**Interfaces:**
- Produces: `slotMachineModel(result)`, `reelStopSchedule(reduceMotion)`, `renderBirthSlot(root, result, state)`
- Consumes: one immutable `createBirthSlotResult` result; does not reroll inside renderer

- [ ] **Step 1: Write failing reel model and timing tests**

```js
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
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/birth-slot-ui.test.mjs tests/birth-slot.test.mjs`

Expected: `slotMachineModel` and `reelStopSchedule` are missing.

- [ ] **Step 3: Implement the pure reel model**

Return five top reels, three personality rolls, and three name syllables from the existing result. Each reel includes `id`, `group`, `label`, `value`, `detail`, and `tone`; no random function is called.

- [ ] **Step 4: Rebuild accessible markup and animation**

Use the provided HTML as the visual reference for machine body, five upper windows, three personality windows, three name windows, progress lamp, and round button. Preserve semantic buttons, `aria-live`, `aria-busy`, visible labels, keyboard activation, and details disclosure. `spinBirthSlot` renders a spinning state once, waits until the final schedule time, then renders the resolved state without changing the result.

- [ ] **Step 5: Add responsive and reduced-motion styles**

Desktop keeps the 5+3+3 arrangement. Below 720px the machine scales into a two-row horizontally scroll-free layout; text remains at least 12px. `prefers-reduced-motion` disables strip transforms and button bounce.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/birth-slot-ui.test.mjs tests/birth-slot.test.mjs tests/markup.test.mjs`

Run: `npm test`

```bash
git add dist/ui/birth-slot.js dist/app.js dist/index.html dist/styles.css tests/birth-slot-ui.test.mjs tests/birth-slot.test.mjs tests/markup.test.mjs
git commit -m "feat: integrate supplied birth roulette"
```

### Task 7: 대한민국 전도와 성장 캐릭터

**Files:**
- Create: `dist/data/korea-map.js`
- Create: `dist/engine/life-character.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Modify: `dist/app.js`
- Modify: `dist/ui/render.js`
- Test: `tests/korea-map.test.mjs`
- Test: `tests/life-character.test.mjs`
- Test: `tests/render.test.mjs`

**Interfaces:**
- Produces: `KOREA_MAP_POINTS`, `mapRegionState(regionCode)`, `characterViewModel(life)`
- Consumes: existing 17-region codes, life age/stats, reduced-motion CSS

- [ ] **Step 1: Write failing map and character tests**

```js
test('대한민국 전도는 17개 시도 위치를 모두 가진다', () => {
  assert.equal(KOREA_MAP_POINTS.length, 17);
  assert.equal(new Set(KOREA_MAP_POINTS.map((point) => point.code)).size, 17);
});

test('출생 지역만 지도에서 선택 상태가 된다', () => {
  const states = mapRegionState('SEL');
  assert.equal(states.filter((point) => point.selected).length, 1);
  assert.equal(states.find((point) => point.selected).code, 'SEL');
});

test('캐릭터는 여섯 생애 단계와 0~100 진행률을 만든다', () => {
  assert.equal(characterViewModel(makeLifeAtAge(0)).stage, 'infant');
  assert.equal(characterViewModel(makeLifeAtAge(16)).stage, 'teen');
  assert.equal(characterViewModel(makeLifeAtAge(70)).stage, 'senior');
  assert.equal(characterViewModel(makeLifeAtAge(45)).progress, 50);
});

test('낮은 건강은 캐릭터 상태를 tired로 만들지만 정체성 속성은 평가하지 않는다', () => {
  const model = characterViewModel(makeLifeAtAge(60, { stats: { health: 20, happiness: 50 } }));
  assert.equal(model.pose, 'tired');
  assert.equal('sex' in model, false);
  assert.equal('ancestry' in model, false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/korea-map.test.mjs tests/life-character.test.mjs`

Expected: both modules are missing.

- [ ] **Step 3: Implement map data and intro SVG**

Create 17 entries using existing region codes and percentage coordinates. Render one inline SVG outline of South Korea, Jeju, province boundary hints, and 17 accessible point labels. Before birth, points pulse in sequence; after a result, `renderProfileContext` sets the selected point.

- [ ] **Step 4: Implement character view model and rendering**

Use exact stages: `infant` ages 0~5, `child` 6~12, `teen` 13~18, `young-adult` 19~34, `adult` 35~64, `senior` 65~90. `progress = round(age / 90 * 100)`. Pose is `tired` for health below 35, `bright` for happiness above 70, otherwise `neutral`. Render a compact SVG inside the life-map section and set CSS variables `--life-progress`, `--character-tone`, and a stage class.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/korea-map.test.mjs tests/life-character.test.mjs tests/render.test.mjs tests/markup.test.mjs`

Run: `npm test`

```bash
git add dist/data/korea-map.js dist/engine/life-character.js dist/index.html dist/styles.css dist/app.js dist/ui/render.js tests/korea-map.test.mjs tests/life-character.test.mjs tests/render.test.mjs tests/markup.test.mjs
git commit -m "feat: visualize Korea and life progression"
```

### Task 8: 통합 검증, 문서, 배포

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/plans/2026-10-15-era-history-roulette-verification.md`
- Test: all `tests/*.test.mjs`

**Interfaces:**
- Consumes: all prior task outputs
- Produces: verified GitHub Pages deployment

- [ ] **Step 1: Add full-life era integration tests**

Extend `tests/full-life.test.mjs` with literal seeds for a 1950 birth, a 1990 birth, a 2026 birth, and a future birth. Assert each completes, historical event years stay inside their declared ranges, future events carry `projection: true`, no companion state is required, economy values are finite, and service state is not left `unassessed` for target profiles past assessment age.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: every test passes with no warnings, uncaught rejections, NaN values, or unfinished lives.

- [ ] **Step 3: Update user documentation**

Document the decade selector, history/future distinction, simplified service assessment, minor economy ownership, real-record-only community behavior, and optional Supabase setup. State that future events and individual effects are simulations rather than predictions.

- [ ] **Step 4: Run browser QA**

Before preview, read `/Users/chaeho/.codex/plugins/cache/openai-curated-remote/sites/1.0.0/skills/sites/references/preview/local.md`. Serve `dist/` locally and verify at desktop and 390×844 mobile sizes:

1. Intro fits and shows the Korea map.
2. Every decade can be selected.
3. The supplied-style roulette spins, stops, rerolls, and accepts.
4. A 1950s life receives dated historical events.
5. A future life receives only labeled forecast events.
6. Minor cash shows `—` and household support is separate.
7. Exempt/non-target lives do not see a service choice dialog.
8. The character moves as age advances.
9. Empty community and memorial screens contain no sample records.
10. Browser console contains no errors.

- [ ] **Step 5: Request final branch review and fix findings with TDD**

Use `superpowers:requesting-code-review`. For every finding, add a failing regression test before changing production code, then rerun focused and full suites.

- [ ] **Step 6: Commit documentation and verification fixes**

```bash
git add README.md docs/superpowers/plans/2026-10-15-era-history-roulette-verification.md dist tests
git commit -m "docs: finish era simulation expansion"
```

- [ ] **Step 7: Deploy and verify GitHub Pages**

Push the reviewed branch to `origin/main`, wait for `.github/workflows/pages.yml` to succeed, open `https://kev208dev.github.io/1in50M/` with a commit cache-buster, confirm the deployed era module and zero console errors, and leave the deployed tab open for the user.
