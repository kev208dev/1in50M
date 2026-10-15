# Original Tone and Statistical Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출생의 비가역성, 시대 고증, 구체적인 생애 기록, 통계에 맞는 죽음과 엔딩을 기존 「5000만 분의 1」 게임에 일관되게 적용한다.

**Architecture:** 현재 정적 ESM 구조와 결정·생애 엔진을 유지하면서, 시대/통계 조회와 시간순 기록을 독립 모듈로 추가한다. 생애 저장 형식을 v5로 올리고, 출생·선택·사건·사망·엔딩이 동일한 연도 및 출처 규칙을 사용하도록 연결한다.

**Tech Stack:** 브라우저 네이티브 JavaScript ESM, HTML/CSS, Node.js `node:test`, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-15-original-tone-statistical-integrity-design.md`

## Global Constraints

- 플레이 중 외부 통계 API를 호출하지 않는다.
- 같은 시드와 설정은 같은 출생·사건·비교 인물·사망 결과를 만든다.
- 통계 기반 값, 모델링 값, 순수 서사 값을 내부적으로 구분한다.
- 주민등록번호 형식의 식별 정보를 만들지 않는다.
- 기존 v4 저장 데이터와 공개 생애 데이터를 파괴하지 않고 읽는다.
- 페이지 자체의 가로·세로 스크롤은 계속 잠그며 긴 내용은 내부 패널만 스크롤한다.
- 금융 기능은 성인기 전에는 숨기고 실제 투자 조언처럼 표현하지 않는다.

## Review Focus

- 스냅샷보다 이른 연도나 미래 연도가 들어와도 가장 가까운 유효 자료 또는 명시적인 모델링 값으로 안전하게 처리되어야 한다. Task 1의 경계 연도 테스트가 보장한다.
- v4 저장본에 새 `dataVersion`, `cohort`, `conditions` 필드가 없어도 v5로 열리고 같은 생애를 계속 진행할 수 있어야 한다. Task 2의 마이그레이션 테스트가 보장한다.
- 같은 해에 회고·역사 사건·결정이 겹쳐도 기록과 대형 카드가 과거로 역행하지 않아야 한다. Task 5의 동률 정렬 테스트가 보장한다.
- 건강이 높은 인물에게 설명 없는 질병 사망이 나오거나, 건강이 낮은 인물이 무조건 90세까지 생존하지 않아야 한다. Task 7의 사망 일관성 테스트가 보장한다.
- 360×800 화면에서 출생 카드, 결정 버튼, 시스템 기록 중 하나라도 화면 밖으로 밀리지 않아야 한다. Task 9의 브라우저 검증이 보장한다.

---

### Task 1: 시대·통계 조회 계층

**Files:**
- Create: `dist/data/public-statistics.js`
- Create: `dist/data/era-validity.js`
- Create: `dist/engine/historical-context.js`
- Modify: `dist/data/research.js`
- Test: `tests/historical-context.test.mjs`

**Interfaces:**
- Consumes: `regionCode`, `district`, `year`, `sex` 문자열/숫자
- Produces: `isAvailableInYear(item, year)`, `historicalDistrictName(regionCode, district, year)`, `getStatistic(metric, query)`

- [ ] **Step 1: 실패하는 시대 경계 테스트를 작성한다.**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalDistrictName, isAvailableInYear, getStatistic } from '../dist/engine/historical-context.js';

test('화성은 2001년 이전에는 군, 이후에는 시로 표시된다', () => {
  assert.equal(historicalDistrictName('GGD', '화성시', 1985), '화성군');
  assert.equal(historicalDistrictName('GGD', '화성시', 2001), '화성시');
});

test('제도 시작 연도와 통계 스냅샷 경계를 안전하게 처리한다', () => {
  assert.equal(isAvailableInYear({ availableFrom: 2004 }, 2003), false);
  assert.equal(isAvailableInYear({ availableFrom: 2004 }, 2004), true);
  const early = getStatistic('lifeExpectancy', { year: 1900, sex: 'male' });
  const future = getStatistic('lifeExpectancy', { year: 2100, sex: 'female' });
  assert.equal(early.kind, 'modeled');
  assert.ok(Number.isFinite(future.value));
  assert.ok(future.sourceKey);
});
```

- [ ] **Step 2: 테스트가 모듈 부재 또는 잘못된 결과로 실패하는지 확인한다.**

Run: `node --test tests/historical-context.test.mjs`

Expected: FAIL because `dist/engine/historical-context.js` does not exist.

- [ ] **Step 3: 최소 시대·통계 조회 API를 구현한다.**

```js
// dist/engine/historical-context.js
import { ADMINISTRATIVE_ALIASES, INSTITUTION_WINDOWS } from '../data/era-validity.js';
import { STATISTIC_SERIES } from '../data/public-statistics.js';

export function isAvailableInYear(item, year) {
  const value = Number(year);
  return Number.isFinite(value)
    && value >= (item.availableFrom ?? -Infinity)
    && value <= (item.availableUntil ?? Infinity);
}

export function historicalDistrictName(regionCode, district, year) {
  const rule = ADMINISTRATIVE_ALIASES.find((item) => item.regionCode === regionCode && item.current === district);
  return rule && Number(year) < rule.changedIn ? rule.before : district;
}

export function getStatistic(metric, query = {}) {
  const rows = STATISTIC_SERIES[metric] ?? [];
  const eligible = rows.filter((row) => (!row.sex || row.sex === query.sex) && row.year <= Number(query.year));
  const row = eligible.at(-1) ?? rows.find((item) => !item.sex || item.sex === query.sex);
  return row ? { ...row, kind: eligible.length ? 'statistic' : 'modeled' } : { value: null, year: null, sourceKey: null, kind: 'modeled' };
}

export { INSTITUTION_WINDOWS };
```

`STATISTIC_SERIES`에는 설계 문서의 기관별 공개표에서 확인한 최소 스냅샷만 저장하고 각 행에 `year`, `value`, `sourceKey`를 함께 둔다. `RESEARCH_SOURCES`에는 통계청 생명표·사망원인통계, KOSIS 인구동향조사, 교육통계 링크를 추가한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/historical-context.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/data/public-statistics.js dist/data/era-validity.js dist/data/research.js dist/engine/historical-context.js tests/historical-context.test.mjs
git commit -m "feat: add era-aware statistical context"
```

### Task 2: 비가역 출생과 v5 생애 데이터

**Files:**
- Modify: `dist/engine/birth-slot.js`
- Modify: `dist/ui/birth-slot.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Test: `tests/birth-slot.test.mjs`
- Test: `tests/birth-slot-ui.test.mjs`
- Test: `tests/life-engine.test.mjs`
- Test: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `historicalDistrictName()`, `getStatistic()`
- Produces: `birthCertificateModel(result)`, v5 `life.dataVersion`, `life.conditions`

- [ ] **Step 1: 재추첨 제거, 출생 카드, v4 마이그레이션 실패 테스트를 작성한다.**

```js
test('출생 카드에는 당시 지명과 통계 기준 연도가 들어간다', () => {
  const result = createBirthSlotResult('1985-hwaseong', 1985, { regionCode: 'GGD', district: '화성시' });
  const card = birthCertificateModel(result);
  assert.match(card.narrative, /화성군/);
  assert.ok(card.facts.every((fact) => fact.sourceYear || fact.kind === 'modeled'));
});

test('v4 생애는 v5 데이터 버전과 조건 필드로 정규화된다', () => {
  const legacy = createLife(profile, 'legacy-v4');
  delete legacy.dataVersion;
  delete legacy.conditions;
  const migrated = normalizeLife({ ...legacy, version: 4 });
  assert.equal(migrated.version, 5);
  assert.ok(migrated.dataVersion);
  assert.deepEqual(migrated.conditions, { chronic: [], losses: [], care: [] });
});

test('마크업에는 출생 재추첨과 같은 조건 재시작이 없다', () => {
  assert.doesNotMatch(html, /다시 돌리기|같은 조건으로 다시/);
  assert.match(html, /출생신고/);
});
```

- [ ] **Step 2: 기존 재추첨 마크업과 v4 정규화 때문에 실패하는지 확인한다.**

Run: `node --test tests/birth-slot.test.mjs tests/birth-slot-ui.test.mjs tests/life-engine.test.mjs tests/markup.test.mjs`

Expected: FAIL on missing `birthCertificateModel`, version 4, and reroll strings.

- [ ] **Step 3: 출생 카드 모델과 v5 정규화를 구현한다.**

```js
export function birthCertificateModel(result) {
  const district = historicalDistrictName(result.region.code, result.region.district, result.year);
  const expectancy = getStatistic('lifeExpectancy', { year: result.year, sex: result.sex.id });
  return {
    narrative: `${result.year}년, ${result.region.name} ${district}의 ${result.household.familyType}에서 ${result.name.full}의 삶이 시작됩니다.`,
    facts: [{ label: '기대수명', value: expectancy.value, sourceYear: expectancy.year, kind: expectancy.kind }],
  };
}
```

`createLife()`은 `version: 5`, `dataVersion: 'kr-public-v1'`, `conditions: { chronic: [], losses: [], care: [] }`를 저장한다. `normalizeLife()`은 v4에 같은 기본값을 넣는다. `app.js`에서는 첫 추첨 후 재추첨 경로를 제거하고 카드 확인 뒤에만 `candidateProfile`을 확정한다. HTML에서 재추첨·동일 조건 버튼을 제거한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/birth-slot.test.mjs tests/birth-slot-ui.test.mjs tests/life-engine.test.mjs tests/markup.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/engine/birth-slot.js dist/ui/birth-slot.js dist/engine/life.js dist/app.js dist/index.html dist/styles.css tests/birth-slot.test.mjs tests/birth-slot-ui.test.mjs tests/life-engine.test.mjs tests/markup.test.mjs
git commit -m "feat: make birth irreversible and add birth record"
```

### Task 3: 선택 효과 비공개와 능력치 체감 효과

**Files:**
- Create: `dist/engine/stat-effects.js`
- Modify: `dist/engine/decisions.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/render.js`
- Modify: `dist/index.html`
- Test: `tests/stat-effects.test.mjs`
- Test: `tests/render.test.mjs`
- Test: `tests/finance-paths.test.mjs`

**Interfaces:**
- Consumes: `life`, `{ health, happiness, knowledge, relationships }`, `context`
- Produces: `applyDiminishingEffects(life, effects)`, `describeEffectDirections(effects)`

- [ ] **Step 1: 상한 체감, 선택 전 수치 비공개, 성인 금융 가시성 테스트를 작성한다.**

```js
test('같은 +5 효과는 95에서 30보다 작게 적용된다', () => {
  const low = applyDiminishingEffects(makeLifeAtAge(20, { stats: { knowledge: 30 } }), { knowledge: 5 });
  const high = applyDiminishingEffects(makeLifeAtAge(20, { stats: { knowledge: 95 } }), { knowledge: 5 });
  assert.ok(low.stats.knowledge - 30 > high.stats.knowledge - 95);
});

test('선택 메타는 정확한 숫자 대신 방향만 보여준다', () => {
  assert.equal(choiceMeta({ effects: { knowledge: 5, happiness: -1 } }), '배움에 도움 · 마음의 여유 감소');
  assert.doesNotMatch(choiceMeta({ effects: { knowledge: 5 } }), /\+5|5/);
});

test('금융 메뉴는 19세 전에는 숨겨진다', () => {
  assert.equal(createLifeViewModel(makeLifeAtAge(18)).canUseFinance, false);
  assert.equal(createLifeViewModel(makeLifeAtAge(19)).canUseFinance, true);
});
```

- [ ] **Step 2: 현재의 단순 덧셈과 숫자 메타 때문에 실패하는지 확인한다.**

Run: `node --test tests/stat-effects.test.mjs tests/render.test.mjs tests/finance-paths.test.mjs`

Expected: FAIL because the new module is absent and `choiceMeta` exposes numbers.

- [ ] **Step 3: 체감 효과와 방향 문구를 구현한다.**

```js
export function applyDiminishingEffects(life, effects = {}) {
  const next = structuredClone(life);
  for (const [key, raw] of Object.entries(effects)) {
    const current = Number(next.stats[key] ?? 0);
    const scale = raw > 0 ? Math.max(0.2, (110 - current) / 100) : 1;
    next.stats[key] = Math.max(0, Math.min(100, Math.round(current + raw * scale)));
  }
  return next;
}
```

`applyDecision()`과 연간 초점 효과가 이 함수를 사용하게 한다. `choiceMeta()`는 효과 방향, 비용, 잠금 이유만 반환한다. HUD의 도파민 항목을 제거하고 금융 메뉴는 `age >= 19`일 때만 렌더링한다. 적용된 결과 문장은 결정 기록에 `changes`를 저장해 시스템 메시지에서 사후 설명한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/stat-effects.test.mjs tests/render.test.mjs tests/finance-paths.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/engine/stat-effects.js dist/engine/decisions.js dist/engine/life.js dist/ui/render.js dist/index.html tests/stat-effects.test.mjs tests/render.test.mjs tests/finance-paths.test.mjs
git commit -m "feat: hide choice scores and soften stat gains"
```

### Task 4: 교육 상태와 제도 연도 고증

**Files:**
- Modify: `dist/data/education.js`
- Modify: `dist/data/decisions-youth.js`
- Modify: `dist/engine/decisions.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/render.js`
- Test: `tests/education-decisions.test.mjs`
- Test: `tests/life-engine.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `isAvailableInYear()`
- Produces: `educationStateForAge(age, currentEducation)`, 연도 필터가 적용된 `getChoices()`

- [ ] **Step 1: 학령 상태와 제도 시작 연도 테스트를 작성한다.**

```js
test('학령 상태는 나이에 맞게 자동 갱신된다', () => {
  assert.equal(educationStateForAge(5, {}).label, '유아·미취학');
  assert.equal(educationStateForAge(7, {}).label, '초등학교');
  assert.equal(educationStateForAge(13, {}).label, '중학교');
});

test('시대에 없는 교육 선택지는 표시되지 않는다', () => {
  const in1992 = makeLifeAtAge(7, { year: 1992 });
  assert.equal(getChoices(in1992, 'after-school-care').some((item) => item.id === 'after-school'), false);
  const in2000 = makeLifeAtAge(15, { year: 2000 });
  const ids = getChoices(in2000, 'choose-high-school').map((item) => item.id);
  assert.equal(ids.includes('meister'), false);
  assert.equal(ids.includes('autonomous'), false);
});

test('자사고 표시 비용과 잠금 비용이 같다', () => {
  const option = EDUCATION_PATHS.find((item) => item.id === 'autonomous');
  assert.equal(option.minimumCash, option.cost);
});
```

- [ ] **Step 2: 현재 선택지가 모든 연도에 나오고 비용이 불일치해 실패하는지 확인한다.**

Run: `node --test tests/education-decisions.test.mjs tests/life-engine.test.mjs`

Expected: FAIL on era filtering, education labels, and autonomous-school cost.

- [ ] **Step 3: 교육 상태와 유효 연도 필터를 구현한다.**

```js
export function educationStateForAge(age, current = {}) {
  if (age <= 1) return { level: 'infant', status: 'not-started', label: '영아' };
  if (age <= 6) return { level: 'preschool', status: 'not-started', label: '유아·미취학' };
  if (age <= 12) return { level: 'elementary', status: 'enrolled', label: '초등학교' };
  if (age <= 15) return { level: 'middle-school', status: 'enrolled', label: '중학교' };
  return { ...current, label: EDUCATION_BY_ID[current.schoolType]?.label ?? '고등학교 이후 경로' };
}
```

`EDUCATION_PATHS`와 돌봄 선택지에 `availableFrom`을 넣고 `getChoices()`에서 유효하지 않은 선택지를 제거한다. `advanceYear()`은 고등학교 선택 전까지 `educationStateForAge()`로 상태를 갱신한다. 자사고 `minimumCash`를 `cost`와 같은 값으로 통일한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/education-decisions.test.mjs tests/life-engine.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/data/education.js dist/data/decisions-youth.js dist/engine/decisions.js dist/engine/life.js dist/ui/render.js tests/education-decisions.test.mjs tests/life-engine.test.mjs
git commit -m "fix: gate education choices by historical year"
```

### Task 5: 단일 시간순 사건 큐와 구체적 장면

**Files:**
- Create: `dist/engine/timeline.js`
- Modify: `dist/engine/events.js`
- Modify: `dist/engine/era-events.js`
- Modify: `dist/data/life-events.js`
- Modify: `dist/data/history-events.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/system-feed.js`
- Modify: `dist/ui/render.js`
- Test: `tests/timeline.test.mjs`
- Test: `tests/era-events.test.mjs`
- Test: `tests/system-feed.test.mjs`

**Interfaces:**
- Consumes: 생애 기록 항목 `{ id, year, age, priority, sequence, type, text, sourceKey }`
- Produces: `orderTimeline(entries)`, `appendTimeline(life, entries)`, `resolveEraNarrative(event, life)`

- [ ] **Step 1: 연도 역행, 동률 우선순위, 필러 제거 테스트를 작성한다.**

```js
test('같은 해 기록은 우선순위와 생성 순서로 안정적으로 정렬된다', () => {
  const entries = [
    { id: 'reflection', year: 1990, age: 5, priority: 30, sequence: 2 },
    { id: 'olympics', year: 1988, age: 3, priority: 20, sequence: 1 },
    { id: 'decision', year: 1990, age: 5, priority: 40, sequence: 1 },
  ];
  assert.deepEqual(orderTimeline(entries).map((item) => item.id), ['olympics', 'reflection', 'decision']);
});

test('필러 사건은 시스템 기록에 들어가지 않는다', () => {
  const life = makeLifeAtAge(6, { history: [{ id: 'filler', year: 1991, age: 6, type: 'event', text: '한 해가 흘렀습니다.', filler: true }] });
  assert.equal(systemFeedItems(life).length, 0);
});

test('역사 사건은 아이와 성인에게 다른 장면으로 닿는다', () => {
  assert.notEqual(resolveEraNarrative(IMF_EVENT, makeLifeAtAge(6)).text, resolveEraNarrative(IMF_EVENT, makeLifeAtAge(40)).text);
});
```

- [ ] **Step 2: 새 큐 모듈 부재와 기존 기록 순서 때문에 실패하는지 확인한다.**

Run: `node --test tests/timeline.test.mjs tests/era-events.test.mjs tests/system-feed.test.mjs`

Expected: FAIL because `timeline.js` and age-aware narration do not exist.

- [ ] **Step 3: 안정 정렬과 연령별 장면 해석을 구현한다.**

```js
export function orderTimeline(entries = []) {
  return entries
    .filter((item) => !item.filler)
    .map((item, index) => ({ ...item, sequence: item.sequence ?? index }))
    .sort((a, b) => a.year - b.year || a.age - b.age || (a.priority ?? 50) - (b.priority ?? 50) || a.sequence - b.sequence);
}

export function appendTimeline(life, entries) {
  return { ...life, history: orderTimeline([...life.history, ...entries]) };
}
```

`advanceYear()`은 자동 사건·시대 사건을 모은 뒤 한 번에 `appendTimeline()`에 넘긴다. 역사 사건 데이터에는 `scenes.child`, `scenes.adult`, `scenes.worker`를 두고 `resolveEraNarrative()`가 나이·직업·가정 형편으로 하나를 선택한다. 범용 연간 필러는 생성하지 않는다. 출처 표시는 대비를 높이고 상세 링크를 유지한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/timeline.test.mjs tests/era-events.test.mjs tests/system-feed.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/engine/timeline.js dist/engine/events.js dist/engine/era-events.js dist/data/life-events.js dist/data/history-events.js dist/engine/life.js dist/ui/system-feed.js dist/ui/render.js tests/timeline.test.mjs tests/era-events.test.mjs tests/system-feed.test.mjs
git commit -m "feat: order life events and add age-aware scenes"
```

### Task 6: 같은 해 태어난 네 명

**Files:**
- Create: `dist/engine/cohort.js`
- Create: `dist/ui/cohort.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Test: `tests/cohort.test.mjs`
- Test: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: 확정된 `profile`, `seed`, 현재 `age`
- Produces: `createCohortPeers(profile, seed)`, `advanceCohort(peers, age)`, `renderCohort(root, peers, age)`

- [ ] **Step 1: 네 명의 재현 가능한 비교 인물 테스트를 작성한다.**

```js
test('비교 인물은 다른 지역·형편의 네 명이며 같은 시드에서 재현된다', () => {
  const first = createCohortPeers(profile, 'cohort-1');
  const second = createCohortPeers(profile, 'cohort-1');
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(new Set(first.map((item) => item.regionCode)).size, 4);
});

test('비교 인물은 단계 경계에서만 상태가 바뀐다', () => {
  const peers = createCohortPeers(profile, 'cohort-2');
  assert.deepEqual(advanceCohort(peers, 8), advanceCohort(peers, 12));
  assert.notDeepEqual(advanceCohort(peers, 12), advanceCohort(peers, 18));
});
```

- [ ] **Step 2: 모듈 부재로 실패하는지 확인한다.**

Run: `node --test tests/cohort.test.mjs tests/markup.test.mjs`

Expected: FAIL because cohort modules and markup do not exist.

- [ ] **Step 3: 경량 단계형 비교 모델을 구현한다.**

```js
const STAGES = [0, 7, 18, 30, 50, 70];
export function advanceCohort(peers, age) {
  const stage = STAGES.filter((value) => value <= age).at(-1) ?? 0;
  return peers.map((peer) => ({ ...peer, stage, snapshot: peer.snapshots[stage] }));
}
```

`createCohortPeers()`는 주인공과 중복되지 않는 네 시도를 선택하고 경제 조건과 단계별 교육·직업·거주·생존 요약을 시드 기반으로 만든다. `createLife()`에 `cohort`를 저장하고 v4 마이그레이션에서는 빈 배열을 허용한다. 출생 카드, 생애 보조 패널, 엔딩에 같은 렌더러를 사용한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/cohort.test.mjs tests/markup.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/engine/cohort.js dist/ui/cohort.js dist/engine/life.js dist/app.js dist/index.html dist/styles.css tests/cohort.test.mjs tests/markup.test.mjs
git commit -m "feat: add same-year cohort stories"
```

### Task 7: 고령기 사건과 통계 기반 사망

**Files:**
- Modify: `dist/data/decisions-later.js`
- Modify: `dist/data/future-events.js`
- Modify: `dist/engine/mortality.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/controls.js`
- Test: `tests/full-life.test.mjs`
- Test: `tests/mortality.test.mjs`
- Test: `tests/education-decisions.test.mjs`

**Interfaces:**
- Consumes: Task 1의 생명표·사망원인 스냅샷, `life.conditions`, `life.stats.health`
- Produces: `mortalityProfile(life, age)`, `selectDeathCause(life, roll)`, 50세 이후 결정/사건

- [ ] **Step 1: 후반 사건 밀도와 사망 일관성 테스트를 작성한다.**

```js
test('50세 이후 각 10년 구간에 결정 또는 구체적 사건이 있다', () => {
  for (const [from, to] of [[50, 59], [60, 69], [70, 79], [80, 89]]) {
    assert.ok(DECISIONS.some((item) => item.ageRange[0] <= to && item.ageRange[1] >= from)
      || FUTURE_EVENTS.some((item) => item.ageRange[0] <= to && item.ageRange[1] >= from));
  }
});

test('건강한 69세에게 선행 조건 없는 노환 사망을 붙이지 않는다', () => {
  const life = makeLifeAtAge(69, { stats: { health: 94 }, conditions: { chronic: [], losses: [], care: [] } });
  assert.notEqual(selectDeathCause(life, 0.5), 'age-related-disease');
});

test('같은 생애는 같은 사망 판정을 만든다', () => {
  const life = makeLifeAtAge(78, { seed: 'stable-death' });
  assert.deepEqual(evaluateSurvival(life), evaluateSurvival(structuredClone(life)));
});
```

- [ ] **Step 2: 현재 일반 사망 원인과 후반 공백 때문에 실패하는지 확인한다.**

Run: `node --test tests/full-life.test.mjs tests/mortality.test.mjs tests/education-decisions.test.mjs`

Expected: FAIL on late-life density and cause consistency.

- [ ] **Step 3: 생명표 기본 위험과 조건부 사망 원인을 구현한다.**

```js
export function mortalityProfile(life, age = life.age) {
  const base = getStatistic('mortalityRisk', { year: life.year, age, sex: life.profile?.sex?.id });
  const healthScale = Math.max(0.35, 1 + (50 - life.stats.health) / 55);
  return { annualRisk: Math.min(1, base.value * healthScale), sourceYear: base.year, sourceKey: base.sourceKey };
}

export function selectDeathCause(life, roll) {
  const eligible = causeRowsFor(life).filter((row) => !row.requiresCondition || life.conditions.chronic.includes(row.requiresCondition));
  return weightedCause(eligible, roll)?.id ?? 'other';
}
```

50대 이후 결정과 사건에 만성질환, 돌봄, 퇴직, 재취업, 사별, 주거 축소를 배치한다. 사건은 `conditions`를 갱신하고 사망 원인 선택에 사용한다. `controls.js`는 `evaluateSurvival()`의 구체적 원인을 `endedReason`에 저장한다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/full-life.test.mjs tests/mortality.test.mjs tests/education-decisions.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/data/decisions-later.js dist/data/future-events.js dist/engine/mortality.js dist/engine/life.js dist/ui/controls.js tests/full-life.test.mjs tests/mortality.test.mjs tests/education-decisions.test.mjs
git commit -m "feat: deepen later life and align mortality"
```

### Task 8: 영향 기반 엔딩과 추모 메시지

**Files:**
- Modify: `dist/engine/summary.js`
- Modify: `dist/ui/render.js`
- Modify: `dist/app.js`
- Modify: `dist/storage.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Test: `tests/life-storage-summary.test.mjs`
- Test: `tests/render.test.mjs`
- Test: `tests/community.test.mjs`

**Interfaces:**
- Consumes: 시간순 `history`, 구체적 `endedReason`, `cohort`
- Produces: `representativeMoment(life)`, `summary.epitaph`, 추모 메시지 저장

- [ ] **Step 1: 대표 사건 점수와 추모 입력 테스트를 작성한다.**

```js
test('대표 사건은 마지막 사건보다 영향 점수가 큰 사건을 고른다', () => {
  const life = makeLifeAtAge(70, { history: [
    { id: 'major', age: 30, year: 2010, type: 'decision', text: '오랜 진로를 정했다.', changes: { happiness: 12 }, duration: 20 },
    { id: 'minor', age: 69, year: 2049, type: 'event', text: '산책했다.', changes: { happiness: 1 } },
  ] });
  assert.equal(representativeMoment(life).id, 'major');
});

test('추모 메시지는 앞뒤 공백을 제거하고 길이를 제한한다', () => {
  assert.equal(normalizeEpitaph('  잘 살았어요  '), '잘 살았어요');
  assert.equal(normalizeEpitaph('가'.repeat(300)).length, 120);
});
```

- [ ] **Step 2: 현재 균등 표본 대표 사건과 입력 부재 때문에 실패하는지 확인한다.**

Run: `node --test tests/life-storage-summary.test.mjs tests/render.test.mjs tests/community.test.mjs`

Expected: FAIL because representative scoring and epitaph normalization do not exist.

- [ ] **Step 3: 영향 기반 대표 사건과 엔딩 순서를 구현한다.**

```js
export function representativeMoment(life) {
  return [...life.history]
    .filter((item) => ['decision', 'event', 'era-event', 'career', 'housing'].includes(item.type))
    .map((item) => ({ item, score: Object.values(item.changes ?? {}).reduce((sum, value) => sum + Math.abs(value), 0) + Math.min(20, item.duration ?? 0) }))
    .sort((a, b) => b.score - a.score || a.item.year - b.item.year)[0]?.item ?? life.history[0];
}

export function normalizeEpitaph(value) {
  return String(value ?? '').trim().slice(0, 120);
}
```

결과 화면 순서를 사망 원인, 대표 사건, 출생 조건 영향, 비교 인물, 한마디, 추모관, 익명 공개, 새 생애로 바꾼다. 한마디는 요약과 공개 생애에 선택적으로 저장한다. 추모관을 첫 번째 주요 버튼으로 만들고 같은 조건 재시작 경로는 두지 않는다.

- [ ] **Step 4: 집중 테스트와 전체 테스트를 통과시킨다.**

Run: `node --test tests/life-storage-summary.test.mjs tests/render.test.mjs tests/community.test.mjs && npm test`

Expected: all tests PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add dist/engine/summary.js dist/ui/render.js dist/app.js dist/storage.js dist/index.html dist/styles.css tests/life-storage-summary.test.mjs tests/render.test.mjs tests/community.test.mjs
git commit -m "feat: center endings on impact and remembrance"
```

### Task 9: 재생 흐름, 모바일 레이아웃, 전체 검증

**Files:**
- Modify: `dist/ui/controls.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Test: `tests/controller.test.mjs`
- Test: `tests/markup.test.mjs`
- Test: `tests/render.test.mjs`

**Interfaces:**
- Consumes: 기존 `createSimulationController()` 재생 상태
- Produces: `resumeAfterBlockingDialog(wasPlaying, userPaused)`, 터치·키보드 공용 시작 흐름

- [ ] **Step 1: 결정 후 재개와 모바일 문구 테스트를 작성한다.**

```js
test('재생 중 열린 결정은 처리 후 자동 재개한다', () => {
  assert.equal(resumeAfterBlockingDialog(true, false), true);
  assert.equal(resumeAfterBlockingDialog(false, true), false);
});

test('인트로는 키보드 전용 문구를 사용하지 않는다', () => {
  assert.doesNotMatch(html, /PRESS ANY KEY/);
  assert.match(html, /화면을 눌러 시작/);
});
```

- [ ] **Step 2: 현재 문구와 결정 후 정지 동작 때문에 실패하는지 확인한다.**

Run: `node --test tests/controller.test.mjs tests/markup.test.mjs tests/render.test.mjs`

Expected: FAIL on missing resume helper and old intro copy.

- [ ] **Step 3: 재생 상태 보존과 반응형 압축을 구현한다.**

```js
export function resumeAfterBlockingDialog(wasPlaying, userPaused) {
  return Boolean(wasPlaying && !userPaused);
}
```

`app.js`는 결정·사건·출처 모달이 열릴 때 `wasPlaying`을 기록하고, 사용자가 직접 일시정지하지 않았다면 닫힌 뒤 `controller.play()`를 호출한다. 인트로는 클릭·터치·Enter·Space를 모두 지원하는 문구로 바꾼다. 768px 이하에서는 상단 HUD를 두 줄 이하로 압축하고, 출생 카드·결정·시스템 기록에 내부 `overflow: auto`와 명확한 최대 높이를 준다.

- [ ] **Step 4: 자동 테스트 전체를 통과시킨다.**

Run: `npm test`

Expected: all tests PASS with no warnings or unhandled rejections.

- [ ] **Step 5: 로컬 브라우저에서 대표 뷰포트와 생애를 검증한다.**

Run: `python3 -m http.server 4173 --directory dist`

Verify:

- 1440×1024, 1366×768, 390×844, 360×800에서 `document.documentElement.scrollWidth === innerWidth`, `scrollHeight === innerHeight`.
- 1985년 경기 출생에서 `화성군`, 1992년 돌봄교실 미노출, 2000년 마이스터고·자사고 미노출.
- 현재 시대에서는 유효한 선택지가 표시되고 선택 전 정확한 증감 수치는 보이지 않음.
- 출생 카드, 비교 인물, 시간순 시스템 기록, 50세 이후 결정, 구체적 사망 원인, 추모 입력을 확인.
- 자동 재생 중 결정 처리 뒤 재개되고 수동 일시정지는 유지됨.
- 콘솔 오류 0건, 가로·세로 페이지 스크롤 0건.

- [ ] **Step 6: 필요하면 브라우저에서 발견한 회귀를 실패 테스트로 먼저 고친 뒤 전체 테스트를 다시 실행한다.**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: 최종 구현을 커밋한다.**

```bash
git add dist/app.js dist/ui/controls.js dist/index.html dist/styles.css tests/controller.test.mjs tests/markup.test.mjs tests/render.test.mjs
git commit -m "fix: preserve playback and fit mobile life screens"
```

- [ ] **Step 8: 브랜치 상태와 배포 전 증거를 확인한다.**

Run: `git status --short && git log --oneline -10`

Expected: clean worktree and the nine task commits after the approved design and plan commits.

