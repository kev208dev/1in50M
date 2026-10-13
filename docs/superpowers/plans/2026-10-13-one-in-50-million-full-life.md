# 5000만 분의 1 전체 생애 시뮬레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 랜덤 출생 MVP를 대한민국의 교육·직업·경제·주거·관계·노년을 포함한 자동 진행형 전체 생애 시뮬레이션으로 확장하고 GitHub와 private Site에 지속 배포한다.

**Architecture:** 기존 빌드 없는 정적 HTML·CSS·ES module 구조를 유지한다. seed 기반 순수 시뮬레이션 엔진, 정적 콘텐츠 데이터, 버전 저장소, DOM 렌더러, 재생 컨트롤러를 분리해 Node 내장 테스트로 엔진을 검증하고 브라우저에서 반응형·접근성·타이머 동작을 확인한다.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js `node:test`, GitHub `kev208dev/1in50M`, OpenAI Sites static hosting

**Spec:** `docs/superpowers/specs/2026-10-13-one-in-50-million-full-life-design.md`

## Global Constraints

- `sources/` 아래 파일은 읽기 전용이며 수정·이동·삭제하지 않는다.
- 원작의 문구·그래픽·코드를 복제하지 않고 자동 진행, 결정 정지, 상태 패널, 기록 구조만 참고한다.
- 실제 통계 API를 사용하지 않으며 모든 확률과 금액은 체험용 가상 데이터라고 반복 안내한다.
- 색상은 `#111613`, `#1A211C`, `#26302A`, `#EEF3EC`, `#C8D0C2`, `#3DF08A`, `#22C55E`, `#F3F5F1`, `#E1E6DD`만 사용한다.
- 큰 제목은 Hahmlet 500, 본문은 IBM Plex Sans KR 400·600, 수치는 IBM Plex Mono 400·600을 사용한다.
- 내부 계산은 1년 단위이며 기본 1배속에서 1년은 8초다.
- 속도는 `1×`, `2×`, `4×`, `8×`, `16×`이며 결정이 열리면 자동 정지한다.
- 생애는 0세부터 시작하고 늦어도 90세에 회고 단계로 종료한다.
- 사용자 결과에 성공·실패 점수를 매기지 않는다.
- 현재 Sites `project_id`를 유지하고 새 Site를 만들지 않는다.
- GitHub 원격은 `https://github.com/kev208dev/1in50M.git`이며 각 Task 커밋 후 `main`을 푸시한다.

## Review Focus

- 배속 버튼을 빠르게 바꾸거나 일시정지 직후 재생해도 한 해가 두 번 처리되지 않아야 한다. Task 2의 중복 tick 테스트가 이를 고정한다.
- 저장된 삶에 삭제된 학교·직업·사건 ID가 있어도 안전한 일반 경로로 복구해야 한다. Task 6의 알 수 없는 ID 복구 테스트가 이를 고정한다.
- 자동 결정으로 여러 seed를 완주했을 때 선택지 0개, `NaN`, 무한 루프가 없어야 한다. Task 9의 100개 seed 완주 테스트가 이를 고정한다.
- 모바일에서 결정 모달이 열린 동안 배경 컨트롤이 포커스되거나 실행되지 않아야 한다. Task 8의 브라우저 키보드 검증이 이를 고정한다.
- 탭을 오래 백그라운드에 두었다 돌아와도 지난 시간을 몰아서 진행하지 않아야 한다. Task 8의 visibility 복귀 테스트가 이를 고정한다.

---

### Task 1: GitHub 기준선과 seed 난수 엔진

**Files:**
- Create: `dist/engine/random.js`
- Create: `tests/random.test.mjs`
- Modify: `package.json`
- Preserve: `.openai/hosting.json`

**Interfaces:**
- Consumes: 기존 `createBirthProfile()`의 출생 프로필
- Produces: `hashSeed(value: string): number`, `createRng(seed: number | string): { next(): number, int(min, max): number, pick(items): unknown, weighted(items): unknown, snapshot(): number }`

- [ ] **Step 1: GitHub 원격 상태 확인**

Run: `git ls-remote https://github.com/kev208dev/1in50M.git`
Expected: empty output because the repository has no refs

- [ ] **Step 2: seed 재현성 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashSeed } from '../dist/engine/random.js';

test('같은 seed는 같은 수열을 만든다', () => {
  const a = createRng(hashSeed('KR-2026-SEL-ABC123'));
  const b = createRng(hashSeed('KR-2026-SEL-ABC123'));
  assert.deepEqual([a.next(), a.next(), a.int(1, 10)], [b.next(), b.next(), b.int(1, 10)]);
});

test('가중 선택은 0과 1 경계에서도 유효하다', () => {
  const zero = createRng(1, () => 0);
  const nearOne = createRng(1, () => 0.999999999);
  const items = [{ value: 'a', weight: 1 }, { value: 'b', weight: 1 }];
  assert.equal(zero.weighted(items).value, 'a');
  assert.equal(nearOne.weighted(items).value, 'b');
});
```

- [ ] **Step 3: RED 확인**

Run: `node --test tests/random.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 4: 난수 엔진 구현**

`dist/engine/random.js`에 32비트 정수 상태를 사용하는 Mulberry32 계열 생성기를 구현한다. `next()`는 `0 <= value < 1`, `int(min, max)`는 양 끝을 포함한다. `weighted(items)`는 음수 가중치를 0으로 취급하고 전체 가중치가 0이면 첫 항목을 반환한다. 테스트에서 경계값을 주입할 수 있도록 `createRng(seed, sourceOverride)`의 두 번째 인자를 선택적으로 지원한다.

- [ ] **Step 5: GREEN 확인**

Run: `node --test tests/random.test.mjs`
Expected: 2 tests PASS

- [ ] **Step 6: 원격 연결과 기준선 푸시**

Run: `git remote add origin https://github.com/kev208dev/1in50M.git && git add package.json dist/engine/random.js tests/random.test.mjs docs/superpowers && git commit -m "feat: add deterministic life simulation foundation" && git push -u origin main`
Expected: `main -> main` and GitHub contains the existing MVP plus Task 1

### Task 2: 생애 상태와 연도 진행 엔진

**Files:**
- Create: `dist/engine/life.js`
- Create: `dist/data/focuses.js`
- Create: `tests/life-engine.test.mjs`

**Interfaces:**
- Consumes: `createRng()`, 기존 출생 프로필
- Produces: `createLife(profile, seed)`, `advanceYear(life)`, `setFocus(life, focusId)`, `normalizeLife(life)`, `isLifeComplete(life)`

- [ ] **Step 1: 상태 진행 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthProfile } from '../dist/simulator.js';
import { createLife, advanceYear, setFocus } from '../dist/engine/life.js';

test('한 번의 진행은 나이를 정확히 1년 올린다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'life-1');
  const next = advanceYear(life);
  assert.equal(next.age, 1);
  assert.equal(next.year, 2027);
  assert.equal(next.history.filter((entry) => entry.age === 1).length, 1);
});

test('같은 상태에 중복 tick id를 적용해도 한 번만 진행한다', () => {
  const life = createLife(createBirthProfile(() => 0.42, 2026), 'life-2');
  const once = advanceYear(life, 'tick-0');
  const twice = advanceYear(once, 'tick-0');
  assert.equal(twice.age, 1);
});

test('상태는 어떤 초점에서도 0에서 100 사이를 유지한다', () => {
  let life = createLife(createBirthProfile(() => 0.42, 2026), 'life-3');
  life = setFocus(life, 'health');
  for (let i = 0; i < 90; i += 1) life = advanceYear(life, `tick-${i}`);
  assert.ok(Object.values(life.stats).every((value) => Number.isFinite(value) && value >= 0 && value <= 100));
});
```

- [ ] **Step 2: RED 확인**

Run: `node --test tests/life-engine.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 상태 모델과 초점 데이터 구현**

`createLife()`는 `{ version: 2, seed, rngState, profile, age: 0, year, status: 'living', stats, economy, education, career, relationships, housing, focusId, pendingDecisionId, history, milestones, processedTickIds }`를 반환한다. `processedTickIds`는 최근 8개만 보존한다.

`dist/data/focuses.js`에는 `growth`, `health`, `relationships`, `career`, `balance` 다섯 초점과 매년 적용할 상태 보정치를 정의한다.

- [ ] **Step 4: 연도 진행과 종료 구현**

`advanceYear()`는 입력을 변경하지 않고 새 객체를 반환한다. 초점 보정, 나이에 따른 건강 감소, 기본 생활비, 고용 소득, 연간 기록을 적용한다. 90세에는 `status: 'review'`로 바꾼다. `normalizeLife()`는 수치의 `NaN`을 기본값으로 바꾸고 상태를 0~100으로 제한한다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/life-engine.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/engine/life.js dist/data/focuses.js tests/life-engine.test.mjs && git commit -m "feat: add yearly life progression engine" && git push origin main`
Expected: `main -> main`

### Task 3: 교육·복무·진로 결정 시스템

**Files:**
- Create: `dist/data/education.js`
- Create: `dist/data/decisions.js`
- Create: `dist/engine/decisions.js`
- Create: `tests/education-decisions.test.mjs`
- Create: `tests/support/life-fixtures.mjs`

**Interfaces:**
- Consumes: life state from Task 2
- Produces: `EDUCATION_PATHS`, `DECISIONS`, `getDecision(life)`, `getChoices(life, decisionId)`, `applyDecision(life, decisionId, choiceId)`, `chooseAutomatically(life, decisionId)`

- [ ] **Step 1: 교육 경로 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { EDUCATION_PATHS } from '../dist/data/education.js';
import { getDecision, getChoices, applyDecision } from '../dist/engine/decisions.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('고등학교 8개 경로를 모두 제공한다', () => {
  assert.deepEqual(new Set(EDUCATION_PATHS.map((path) => path.id)), new Set([
    'general', 'vocational', 'meister', 'autonomous', 'special-purpose', 'arts', 'sports', 'alternative',
  ]));
});

test('15세에는 고등학교 결정이 열린다', () => {
  const life = makeLifeAtAge(15);
  assert.equal(getDecision(life).id, 'choose-high-school');
  assert.equal(getChoices(life, 'choose-high-school').length, 8);
});

test('선택 조건을 못 채운 경로도 이유와 함께 비활성으로 보인다', () => {
  const life = makeLifeAtAge(15, { stats: { knowledge: 20 } });
  const choice = getChoices(life, 'choose-high-school').find((item) => item.id === 'special-purpose');
  assert.equal(choice.enabled, false);
  assert.match(choice.reason, /지식/);
});

test('고등학교 선택이 학력과 기록에 반영된다', () => {
  const life = makeLifeAtAge(15);
  const next = applyDecision(life, 'choose-high-school', 'vocational');
  assert.equal(next.education.schoolType, 'vocational');
  assert.ok(next.history.some((entry) => entry.type === 'decision'));
});
```

- [ ] **Step 2: fixture와 RED 확인**

`tests/support/life-fixtures.mjs`를 만들고 `makeLifeAtAge(age, overrides)`가 유효한 life state를 반환하게 한다. `stats`, `economy`, `education`, `career`, `relationships` 같은 중첩 객체는 얕은 교체가 아니라 기본값과 깊게 병합한다. 뒤 작업에서 함께 쓸 `memoryStorage(initial)`도 이 fixture에 정의한다.

Run: `node --test tests/education-decisions.test.mjs`
Expected: FAIL because education modules do not exist

- [ ] **Step 3: 교육과 결정 데이터 구현**

고등학교 8개 경로와 19세 이후 `university`, `college`, `training`, `employment`, `startup-prep`, `rest`를 정의한다. 5세 회고, 7세 초점, 15세 고교, 18세 졸업 후 경로, 20세 복무, 25세 주거·직업, 30세 관계, 40세 경력, 50세 회고, 60세 은퇴, 70세 회고 결정을 `DECISIONS`에 정의한다.

- [ ] **Step 4: 조건 판정과 선택 적용 구현**

선택지는 항상 반환하고 `{ enabled, reason, tags }`를 포함한다. `applyDecision()`은 비활성 선택을 거부하고 활성 선택의 상태·경제·프로필 효과를 불변 방식으로 적용한다. `chooseAutomatically()`는 활성 선택 중 현재 상태의 최저 항목을 가장 많이 보완하는 선택을 고른다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/education-decisions.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/data/education.js dist/data/decisions.js dist/engine/decisions.js tests/education-decisions.test.mjs tests/support/life-fixtures.mjs && git commit -m "feat: add Korean education and life decisions" && git push origin main`
Expected: `main -> main`

### Task 4: 직업·소득·지출·자산 엔진

**Files:**
- Create: `dist/data/careers.js`
- Create: `dist/engine/career.js`
- Create: `dist/engine/economy.js`
- Create: `tests/career-economy.test.mjs`

**Interfaces:**
- Consumes: life state, education path, seeded RNG
- Produces: `CAREER_GROUPS`, `getCareerOffers(life)`, `acceptCareer(life, careerId)`, `advanceCareer(life)`, `calculateAnnualEconomy(life)`

- [ ] **Step 1: 직업과 경제 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_GROUPS } from '../dist/data/careers.js';
import { getCareerOffers, acceptCareer } from '../dist/engine/career.js';
import { calculateAnnualEconomy } from '../dist/engine/economy.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('12개 직업군과 각 4개 이상의 직업이 있다', () => {
  assert.equal(CAREER_GROUPS.length, 12);
  assert.ok(CAREER_GROUPS.every((group) => group.careers.length >= 4));
});

test('같은 life state는 같은 직업 제안을 만든다', () => {
  const life = makeLifeAtAge(24, { education: { level: 'university', schoolType: 'general' } });
  assert.deepEqual(getCareerOffers(life), getCareerOffers(structuredClone(life)));
});

test('연간 경제 계산은 유한한 원화 수치를 만든다', () => {
  let life = makeLifeAtAge(28);
  life = acceptCareer(life, getCareerOffers(life)[0].career.id);
  const next = calculateAnnualEconomy(life);
  for (const value of Object.values(next.economy)) assert.ok(Number.isFinite(value));
});
```

- [ ] **Step 2: RED 확인**

Run: `node --test tests/career-economy.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 12개 직업군 데이터 구현**

`management`, `research`, `education-public`, `health-welfare`, `culture-media`, `service-sales`, `manufacturing-tech`, `construction`, `transport-logistics`, `agriculture`, `it-data`, `self-employed`를 정의한다. 각 직업은 `id`, `title`, `requirements`, `salaryRange`, `stability`, `stress`, `healthEffect`, `relationshipEffect`를 가진다.

- [ ] **Step 4: 직업 제안과 경제 계산 구현**

제안은 지식·학력·거주지·seed를 사용한다. 연간 경제는 `income`, `fixedCosts`, `debt`, `deposit`, `homeValue`, `cash`, `netWorth`를 정수 원 단위로 계산한다. 실업 상태에서도 생활비가 반영되고 모든 수치는 유한값으로 보정된다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/career-economy.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/data/careers.js dist/engine/career.js dist/engine/economy.js tests/career-economy.test.mjs && git commit -m "feat: add careers and household economy" && git push origin main`
Expected: `main -> main`

### Task 5: 연간 사건·관계·주거 시스템

**Files:**
- Create: `dist/data/life-events.js`
- Create: `dist/data/housing.js`
- Create: `dist/engine/events.js`
- Create: `dist/engine/relationships.js`
- Create: `tests/events-relationships.test.mjs`

**Interfaces:**
- Consumes: life state and seeded RNG
- Produces: `LIFE_EVENTS`, `HOUSING_OPTIONS`, `selectAnnualEvents(life)`, `applyEvent(life, eventId)`, `updateRelationships(life)`, `changeHousing(life, housingId)`

- [ ] **Step 1: 사건 쿨다운과 주거 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIFE_EVENTS } from '../dist/data/life-events.js';
import { selectAnnualEvents } from '../dist/engine/events.js';
import { changeHousing } from '../dist/engine/relationships.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('생애 단계별 사건을 합쳐 최소 48개 제공한다', () => {
  assert.ok(LIFE_EVENTS.length >= 48);
  for (const stage of ['childhood', 'school', 'young-adult', 'adult', 'midlife', 'senior']) {
    assert.ok(LIFE_EVENTS.filter((event) => event.stage === stage).length >= 6);
  }
});

test('최근 발생한 사건은 쿨다운 동안 다시 나오지 않는다', () => {
  const life = makeLifeAtAge(32, { recentEventIds: ['work-project-success'] });
  assert.ok(selectAnnualEvents(life).every((event) => event.id !== 'work-project-success'));
});

test('감당할 수 없는 자가 선택은 원래 상태를 유지한다', () => {
  const life = makeLifeAtAge(30, { economy: { cash: 1000000, debt: 0, netWorth: 1000000 } });
  const result = changeHousing(life, 'owned-home');
  assert.equal(result.ok, false);
  assert.equal(result.life.housing.type, life.housing.type);
});
```

- [ ] **Step 2: RED 확인**

Run: `node --test tests/events-relationships.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 사건과 주거 데이터 구현**

각 단계에 8개씩 총 48개 사건을 만든다. 사건은 `id`, `stage`, `ageRange`, `conditions`, `weight`, `cooldownYears`, `text`, `effects`, `milestone`을 가진다. 주거는 `with-family`, `dormitory`, `monthly-rent`, `jeonse`, `public-rental`, `owned-home`을 정의한다.

- [ ] **Step 4: 사건·관계·주거 엔진 구현**

한 해에 최대 2개 사건을 선택하고 최근 5년 기록으로 쿨다운을 검사한다. 관계는 `family`, `friends`, `partner`, `children`을 별도 배열로 저장한다. 결혼·비혼·자녀 선택은 사용자 결정으로만 변경하며 무작위 사건이 강제로 변경하지 않는다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/events-relationships.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/data/life-events.js dist/data/housing.js dist/engine/events.js dist/engine/relationships.js tests/events-relationships.test.mjs && git commit -m "feat: add life events relationships and housing" && git push origin main`
Expected: `main -> main`

### Task 6: 저장·이어하기·전생·결과 요약

**Files:**
- Replace: `dist/state.js` with `dist/storage.js`
- Create: `dist/engine/summary.js`
- Create: `tests/life-storage-summary.test.mjs`
- Rewrite: `tests/state.test.mjs` to import the version 2 storage API while preserving every existing corruption and expiry assertion
- Modify: `dist/app.js` imports only after tests pass

**Interfaces:**
- Consumes: complete life state from Tasks 2–5
- Produces: `saveCurrentLife(storage, life)`, `loadCurrentLife(storage)`, `clearCurrentLife(storage)`, `archiveLife(storage, life)`, `listPastLives(storage)`, `createLifeSummary(life)`

- [ ] **Step 1: 저장과 요약 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCurrentLife, loadCurrentLife, archiveLife, listPastLives } from '../dist/storage.js';
import { createLifeSummary } from '../dist/engine/summary.js';
import { memoryStorage, makeLifeAtAge } from './support/life-fixtures.mjs';

test('손상된 저장값은 예외 없이 빈 결과가 된다', () => {
  const storage = memoryStorage({ oneIn50mLifeV2: '{broken' });
  assert.equal(loadCurrentLife(storage), null);
});

test('알 수 없는 학교와 직업 ID는 일반 경로로 복구한다', () => {
  const storage = memoryStorage();
  saveCurrentLife(storage, makeLifeAtAge(30, {
    education: { schoolType: 'removed-school', level: 'removed-level' },
    career: { careerId: 'removed-career', status: 'employed' },
  }));
  const restored = loadCurrentLife(storage);
  assert.equal(restored.education.schoolType, 'general');
  assert.equal(restored.career.careerId, null);
});

test('전생 기록은 최신 10개만 보존한다', () => {
  const storage = memoryStorage();
  for (let index = 0; index < 12; index += 1) archiveLife(storage, makeLifeAtAge(90, { seed: `seed-${index}` }));
  assert.equal(listPastLives(storage).length, 10);
});

test('결과 요약은 점수나 성공 등급을 만들지 않는다', () => {
  const summary = createLifeSummary(makeLifeAtAge(90));
  assert.equal('score' in summary, false);
  assert.equal('grade' in summary, false);
  assert.equal(summary.turningPoints.length, 5);
});
```

- [ ] **Step 2: RED 확인**

Run: `node --test tests/life-storage-summary.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: version 2 저장소 구현**

현재 삶은 `oneIn50mLifeV2`, 전생은 `oneIn50mPastLivesV2` 키를 사용한다. 저장 전에 `normalizeLife()`를 실행하고 version이 다르거나 필수 필드가 없으면 `null`로 복구한다. 기존 MVP 출생 프로필은 사용자가 새 삶을 시작할 때 Task 2의 state로 전환한다.

- [ ] **Step 4: 결과 요약 구현**

출생·거주지·교육·가장 오래 한 직업·가족·순자산·상태 변화·전환점 5개·한 문단 서사를 만든다. 완료된 전체 state 대신 결과 요약만 전생 기록에 저장한다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/life-storage-summary.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/storage.js dist/engine/summary.js dist/app.js tests/life-storage-summary.test.mjs tests/state.test.mjs tests/support/life-fixtures.mjs && git rm dist/state.js && git commit -m "feat: add resumable lives and past life summaries" && git push origin main`
Expected: `main -> main`

### Task 7: 원작형 생애 화면과 반응형 레이아웃

**Files:**
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Create: `dist/ui/render.js`
- Modify: `tests/markup.test.mjs`
- Create: `tests/render.test.mjs`

**Interfaces:**
- Consumes: life state, decisions, summary
- Produces: `createLifeViewModel(life)`, `renderLife(root, life)`, `renderDecision(root, decision, choices)`, `renderResult(root, summary)`, required DOM IDs for Task 8

- [ ] **Step 1: 전체 생애 마크업 실패 테스트 작성**

`tests/markup.test.mjs`에 다음 검사를 추가한다.

```js
test('생애 화면과 원작형 컨트롤이 존재한다', () => {
  for (const id of [
    'life-view', 'age-display', 'year-display', 'play-button', 'speed-controls',
    'skip-button', 'auto-button', 'stats-panel', 'money-panel', 'life-log',
    'life-map', 'family-panel', 'decision-dialog', 'result-view', 'past-lives-view',
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));
});

test('가상 데이터 안내가 생애 화면과 결과 화면에 있다', () => {
  const matches = html.match(/체험용 가상 데이터/g) ?? [];
  assert.ok(matches.length >= 2);
});
```

- [ ] **Step 2: RED 확인**

Run: `node --test tests/markup.test.mjs`
Expected: FAIL because life screen IDs are missing

- [ ] **Step 3: 데스크톱 3영역과 모바일 화면 구현**

기존 인트로와 출생 카드 디자인을 보존한다. `life-view`에 상단 재생 바, 왼쪽 상태·돈·초점, 중앙 사건·결정·기록·인생 지도, 오른쪽 가족·학교·직업·주거·그래프를 추가한다. 모바일에서는 중앙 콘텐츠를 먼저 배치하고 상태·가족 패널은 `details` 기반 접이식 영역으로 바꾼다.

- [ ] **Step 4: 렌더러 실패 테스트와 구현**

`tests/render.test.mjs`는 DOM 라이브러리 없이 순수 함수인 `createLifeViewModel(life)`, `formatWon(value)`, `formatAge(age)`, `getVisibleLifeLog(history, limit)`를 검사해 상태 라벨, 원화 포맷, 인생 기록, 결과 전환점용 데이터가 빠짐없이 만들어지는지 확인한다. DOM 함수는 이 view model만 소비하고 조작 범위는 전달받은 root 아래로 제한한다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/markup.test.mjs tests/render.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/index.html dist/styles.css dist/ui/render.js tests/markup.test.mjs tests/render.test.mjs && git commit -m "feat: build full life simulation interface" && git push origin main`
Expected: `main -> main`

### Task 8: 재생·배속·결정·포커스 컨트롤러

**Files:**
- Create: `dist/ui/controls.js`
- Rewrite: `dist/app.js`
- Create: `tests/controller.test.mjs`
- Modify: `tests/support/life-fixtures.mjs`

**Interfaces:**
- Consumes: all engine functions, storage, Task 7 DOM IDs
- Produces: `createSimulationController({ now, schedule, cancel, onState, onDecision })` and browser event handlers

- [ ] **Step 1: 가짜 시계 컨트롤러 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationController } from '../dist/ui/controls.js';
import { makeLifeAtAge, fakeClock } from './support/life-fixtures.mjs';

test('1배속은 8초마다 한 해만 진행한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(0) });
  controller.play();
  clock.advance(7999);
  assert.equal(controller.getState().age, 0);
  clock.advance(1);
  assert.equal(controller.getState().age, 1);
});

test('결정이 열리면 시간은 자동 정지한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(14) });
  controller.play();
  clock.advance(8000);
  assert.equal(controller.isPlaying(), false);
  assert.equal(controller.getState().pendingDecisionId, 'choose-high-school');
});

test('숨겨진 탭에서 지난 시간은 복귀 후 몰아서 처리하지 않는다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(10) });
  controller.play();
  controller.setVisible(false);
  clock.advance(80000);
  controller.setVisible(true);
  assert.equal(controller.getState().age, 10);
});
```

`fakeClock()`은 `schedule(callback, delay)`, `cancel(id)`, `advance(ms)`, `pendingCount()`를 제공하고 실제 시간을 기다리지 않고 timer 동작을 재현한다.

- [ ] **Step 2: RED 확인**

Run: `node --test tests/controller.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: 컨트롤러 구현**

속도별 간격은 8000, 4000, 2000, 1000, 500ms다. 컨트롤러는 한 번에 하나의 timer만 유지하고 `play`, `pause`, `setSpeed`, `skipToDecision`, `setAutoDecision`, `setFocus`, `answerDecision`, `setVisible`, `destroy`를 제공한다.

- [ ] **Step 4: 앱 조립 구현**

출생 확정 시 `createLife()`로 변환하고 `life-view`를 연다. 모든 상태 변경 후 저장하고 렌더링한다. 결정 dialog가 열리면 제목으로 포커스를 이동하고 닫힐 때 이전 컨트롤로 돌린다. dialog가 열린 동안 배경에 `inert`를 적용한다. 이어하기, 자동 결정, 결과, 전생 기록, 새 삶 시작을 연결한다.

- [ ] **Step 5: GREEN과 전체 회귀 확인**

Run: `node --test tests/controller.test.mjs && npm test`
Expected: all tests PASS

- [ ] **Step 6: 커밋과 푸시**

Run: `git add dist/ui/controls.js dist/app.js tests/controller.test.mjs tests/support/life-fixtures.mjs && git commit -m "feat: add life playback and decision controls" && git push origin main`
Expected: `main -> main`

### Task 9: 100개 삶 완주·브라우저 QA·GitHub·Sites 배포

**Files:**
- Create: `tests/full-life.test.mjs`
- Modify: `dist/engine/life.js`
- Modify: `.openai/hosting.json` only if the existing `project_id` is absent; otherwise preserve byte-for-byte
- Modify: plan checkboxes and execution ledger

**Interfaces:**
- Consumes: complete static site and all simulation modules
- Produces: verified GitHub `main`, private Sites version, user-visible deployed URL

- [ ] **Step 1: 자동 완주 실패 테스트 작성**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateAutomatically } from '../dist/engine/life.js';
import { createBirthProfile } from '../dist/simulator.js';

test('100개 seed가 선택지 고갈이나 NaN 없이 완주한다', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const result = simulateAutomatically(createBirthProfile(() => (seed % 97) / 97, 2026), `seed-${seed}`);
    assert.equal(result.status, 'review');
    assert.ok(result.age <= 90);
    assert.ok(Object.values(result.stats).every(Number.isFinite));
    assert.ok(Object.values(result.economy).every(Number.isFinite));
    assert.equal(result.pendingDecisionId, null);
  }
});
```

- [ ] **Step 2: RED 확인 후 자동 완주 구현**

Run: `node --test tests/full-life.test.mjs`
Expected: FAIL because `simulateAutomatically` is not exported

`simulateAutomatically(profile, seed)`는 모든 결정을 `chooseAutomatically()`로 처리하고 90세 또는 `status: 'review'`까지 진행한다. 120회 반복을 넘으면 명시적 오류를 던진다.

- [ ] **Step 3: 전체 자동 검증**

Run: `npm test`
Expected: all tests PASS with 0 failures and 0 warnings

Run: `git diff --check`
Expected: no output

- [ ] **Step 4: 로컬 브라우저 QA**

Sites 로컬 프리뷰 지침을 읽고 정적 서버를 연다. 다음을 직접 확인한다.

1. 1440px에서 출생 → 생애 시작 → 결정 → 결과 레이아웃
2. 960px에서 패널 잘림 없음
3. 390px와 360px에서 가로 넘침 없음
4. 5개 배속, 일시정지, 다음 결정까지, 자동 결정
5. 결정 dialog에서 Tab 포커스가 dialog 안에 머무름
6. 탭 숨김 후 복귀해도 나이가 건너뛰지 않음
7. 새로고침 후 현재 나이·결정·돈이 유지됨
8. 모션 감소에서 스캔·숫자 애니메이션 생략
9. 콘솔 오류 0건

- [ ] **Step 5: 최종 커밋과 GitHub 푸시**

Run: `git add tests/full-life.test.mjs dist/engine/life.js docs/superpowers && git commit -m "feat: complete Korean life simulation" && git push origin main && git status --short --branch`
Expected: branch is up to date with `origin/main`; only execution-ledger scratch may remain untracked or modified

- [ ] **Step 6: Sites 소스 패키징과 private 배포**

기존 Sites `project_id`로 새 source write credential을 만든다. `site-workflow.mjs`에 credential, `commands: [["npm", "test"]]`, 절대 archive 경로를 stdin JSON으로 전달한다. 반환된 `commit_sha`와 archive를 `save_version_and_deploy_private`에 전달하고 terminal `succeeded`를 확인한다.

- [ ] **Step 7: 배포 화면 전달**

배포 URL을 Codex 브라우저 패널에 열고 deliverable로 유지한다. GitHub 저장소 URL과 배포 URL, 테스트 수, 구현된 생애 단계를 사용자에게 전달한다.
