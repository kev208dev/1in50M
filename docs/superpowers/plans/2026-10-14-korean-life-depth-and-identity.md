# Korean Life Depth and Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic decisions with 30 grounded Korean life scenes, add a deterministic fictional LGBT+ identity-discovery arc, and fit the desktop simulation dashboard into one viewport while preserving mobile scrolling.

**Architecture:** Keep the existing static ES-module application and controller flow. Split decision content by life stage, let the decision engine select one deterministic eligible scene from an age range, and implement identity discovery as a separate non-choice blocking event with its own controller callback and dialog. The desktop life view becomes a bounded three-column dashboard whose subpanels scroll internally.

**Tech Stack:** HTML, CSS, browser-native JavaScript ES modules, Node.js built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-14-korean-life-depth-and-identity-design.md`

## Global Constraints

- The result must describe a fictional simulated character, never diagnose or infer the real user's identity.
- The identity-discovery probability is 5% and must be described as an indicative simulation value based on an online survey, not an official census value.
- Identity discovery occurs once between ages 16 and 24, cannot be rejected inside that life, and does not directly reduce health, knowledge, or money.
- Statistics-linked scenes show their source and year; unlinked values remain labelled as fictional simulation data.
- Desktop widths of 960px and above use a viewport-bounded life dashboard; widths below 960px keep vertical document scrolling.
- Existing profiles, saved lives, career selection, automatic play, and 100-seed completion remain compatible.
- No runtime framework or third-party dependency is added.

## Review Focus

- A saved version-2 life without identity or scene-history fields must normalize and continue without crashing; Task 2 adds this test.
- Multiple eligible scenes in the same age range must always resolve to the same scene for the same seed and state; Task 1 adds this test.
- A life waiting for identity acknowledgement must not continue through timers, skip, or automatic decisions; Task 3 adds this test.
- A non-LGBT+ life must never receive identity-specific scenes, while a discovered LGBT+ life can receive them; Tasks 1 and 2 add these tests.
- Desktop viewport bounding must not leak into mobile and disable document scrolling; Task 4 adds CSS contract tests and two viewport checks.

---

### Task 1: Conditional Korean life-scene engine and content

**Files:**
- Create: `dist/data/research.js`
- Create: `dist/data/decisions-youth.js`
- Create: `dist/data/decisions-adult.js`
- Create: `dist/data/decisions-later.js`
- Modify: `dist/data/decisions.js`
- Modify: `dist/engine/decisions.js`
- Modify: `tests/education-decisions.test.mjs`
- Modify: `tests/full-life.test.mjs`

**Interfaces:**
- Consumes: `createRng(seed)` from `dist/engine/random.js`, normalized `life` objects from `dist/engine/life.js`, and existing education/housing data.
- Produces: `DECISIONS`, `DECISION_BY_ID`, `RESEARCH_SOURCES`, `getResearchSource(key)`, `getDecision(life)`, `getChoices(life, id)`, and `applyDecision(life, id, choiceId)` with existing public signatures preserved.

- [ ] **Step 1: Add failing tests for age ranges, conditions, deterministic selection, sources, and the 30-scene inventory**

Add these cases to `tests/education-decisions.test.mjs`:

```js
import { DECISIONS } from '../dist/data/decisions.js';
import { getResearchSource } from '../dist/data/research.js';

test('생활 장면 30개가 고유한 id와 두 개 이상의 선택지를 가진다', () => {
  assert.equal(DECISIONS.length, 30);
  assert.equal(new Set(DECISIONS.map((item) => item.id)).size, 30);
  assert.ok(DECISIONS.every((item) => item.choices.length >= 2));
});

test('같은 seed와 상태에서는 같은 조건부 장면이 선택된다', () => {
  const life = makeLifeAtAge(25, { seed: 'repeatable-scene' });
  assert.equal(getDecision(life)?.id, getDecision(structuredClone(life))?.id);
});

test('정체성을 발견하지 않은 삶에는 정체성 후속 장면이 열리지 않는다', () => {
  const life = makeLifeAtAge(26, { identity: { assigned: null, discovered: false } });
  assert.notEqual(getDecision(life)?.audience, 'lgbtq');
});

test('근거가 표시된 장면은 유효한 자료를 참조한다', () => {
  for (const scene of DECISIONS.filter((item) => item.sourceKey)) {
    assert.ok(getResearchSource(scene.sourceKey)?.url, scene.id);
  }
});
```

Update the high-school test to find the scene by ID instead of assuming it is the only age-15 candidate:

```js
const life = makeLifeAtAge(15, { decisions: { 'middle-school-rhythm': 'steady' } });
assert.equal(getDecision(life).id, 'choose-high-school');
```

- [ ] **Step 2: Run the focused tests and verify the new imports or assertions fail**

Run: `node --test tests/education-decisions.test.mjs tests/full-life.test.mjs`

Expected: FAIL because `research.js` and the 30-scene inventory do not exist.

- [ ] **Step 3: Create the research registry**

Create `dist/data/research.js` with stable keys and plain-language source labels:

```js
export const RESEARCH_SOURCES = {
  privateEducation2024: {
    label: '교육부 2024년 초중고 사교육비 조사',
    year: 2024,
    url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=102822&lev=0&m=0204',
  },
  commute2024: {
    label: '통계청 2024년 근로자 이동행태',
    year: 2024,
    url: 'https://kostat.go.kr/board.es?act=view&bid=246&list_no=434303&mid=a10301010000',
  },
  onePerson2022: {
    label: '통계청 통계로 보는 1인 가구',
    year: 2022,
    url: 'https://kostat.go.kr/board.es?act=view&bid=10820&list_no=422143&mid=a10301060100',
  },
  socialTrends2025: {
    label: '통계청 한국의 사회동향 2025',
    year: 2025,
    url: 'https://mods.go.kr/board.es?act=view&bid=246&list_no=442587&mid=a10301150000',
  },
  olderAdults2024: {
    label: '통계청 2024 고령자 통계',
    year: 2024,
    url: 'https://mods.go.kr/board.es?act=view&bid=10820&list_no=432917&mid=a10301060100',
  },
  lgbtq2024: {
    label: 'Ipsos Pride Report 2024',
    year: 2024,
    url: 'https://www.ipsos.com/sites/default/files/ct/publication/documents/2024-06/Ipsos_Pride-Report-2024.pdf',
  },
};

export const getResearchSource = (key) => RESEARCH_SOURCES[key] ?? null;
```

- [ ] **Step 4: Split the exact 30-scene catalogue by life stage**

Each scene uses this contract:

```js
{
  id: 'commute-balance',
  ageRange: [25, 35],
  weight: 2,
  title: '왕복 74분의 하루',
  prompt: '출퇴근 시간이 길어지면서 돈과 시간을 다시 계산하게 됩니다.',
  sourceKey: 'commute2024',
  when: (life) => life.career.status === 'employed',
  choices: [
    choice('stay', '통근을 유지한다', '주거비를 아끼고 이동 시간을 감수합니다.', { health: -1, happiness: -1 }, ['주거비 절약']),
    choice('move', '직장 가까이 옮긴다', '월 고정비가 늘지만 하루의 시간을 되찾습니다.', { health: 1, happiness: 2 }, ['시간 확보']),
    choice('negotiate', '근무 방식을 조율한다', '재택·시차출근 가능성을 알아봅니다.', { knowledge: 1, happiness: 1 }, ['협상']),
  ],
}
```

Create these exact IDs and themes, with concrete Korean copy and 2–4 trade-off choices each:

| Module | IDs |
|---|---|
| `decisions-youth.js` | `after-school-care`, `private-education`, `family-relocation`, `middle-school-rhythm`, `choose-high-school`, `high-school-evening`, `after-graduation`, `tuition-and-work`, `service-path` |
| `decisions-adult.js` | `first-job-route`, `exam-or-experience`, `regional-move`, `first-housing`, `commute-balance`, `queer-trusted-friend`, `relationship-path`, `housing-path`, `family-path`, `childcare-career`, `queer-workplace`, `self-employment`, `parent-care`, `mid-career` |
| `decisions-later.js` | `restructure`, `family-support-vs-retirement`, `retirement-income-gap`, `retirement-path`, `solo-aging`, `digital-healthcare-access`, `late-life-community` |

Use this complete eligibility matrix:

| Scene | Age range | Required state | Source |
|---|---:|---|---|
| `after-school-care` | 7–9 | always | `socialTrends2025` |
| `private-education` | 10–12 | always | `privateEducation2024` |
| `family-relocation` | 11–14 | always | none |
| `middle-school-rhythm` | 13–14 | always | none |
| `choose-high-school` | 15 | always | `privateEducation2024` |
| `high-school-evening` | 16–17 | high-school enrolled | `privateEducation2024` |
| `after-graduation` | 18 | always | `socialTrends2025` |
| `tuition-and-work` | 19–23 | post-secondary enrolled | `socialTrends2025` |
| `service-path` | 20–22 | not previously decided | none |
| `first-job-route` | 21–26 | no current career | `socialTrends2025` |
| `exam-or-experience` | 21–27 | no current career | `socialTrends2025` |
| `regional-move` | 22–30 | always | `socialTrends2025` |
| `first-housing` | 23–29 | housing is `with-family` | `onePerson2022` |
| `commute-balance` | 25–35 | currently working | `commute2024` |
| `queer-trusted-friend` | 18–29 | identity discovered | `lgbtq2024` |
| `relationship-path` | 28–34 | no partner | none |
| `housing-path` | 30–38 | always | `onePerson2022` |
| `family-path` | 33–39 | always | none |
| `childcare-career` | 33–45 | has a child | `socialTrends2025` |
| `queer-workplace` | 25–45 | identity discovered and currently working | `lgbtq2024` |
| `self-employment` | 35–55 | currently working or career is empty | `socialTrends2025` |
| `parent-care` | 42–57 | always | `socialTrends2025` |
| `mid-career` | 40–49 | currently working | `socialTrends2025` |
| `restructure` | 50–59 | currently working | `socialTrends2025` |
| `family-support-vs-retirement` | 50–65 | has a child | `olderAdults2024` |
| `retirement-income-gap` | 58–64 | not retired | `olderAdults2024` |
| `retirement-path` | 60–69 | always | `olderAdults2024` |
| `solo-aging` | 70–79 | no partner or living alone | `olderAdults2024` |
| `digital-healthcare-access` | 70–85 | always | `olderAdults2024` |
| `late-life-community` | 75–89 | always | `olderAdults2024` |

Use these conditions exactly:

```js
const hasDiscoveredIdentity = (life) => Boolean(life.identity?.discovered);
const hasChild = (life) => life.relationships.children.length > 0;
const isWorking = (life) => ['employed', 'part-time', 'self-employed'].includes(life.career.status);

// queer-trusted-friend: ageRange [18, 29], when hasDiscoveredIdentity
// queer-workplace: ageRange [25, 45], when hasDiscoveredIdentity && isWorking
// tuition-and-work: ageRange [19, 23], when education.status === 'enrolled'
// commute-balance: ageRange [25, 35], when isWorking
// childcare-career: ageRange [33, 45], when hasChild
// parent-care: ageRange [42, 57], always eligible
// family-support-vs-retirement: ageRange [50, 65], when hasChild
// retirement-income-gap: ageRange [58, 64], when career.status !== 'retired'
```

The two LGBT+ follow-up scenes may affect happiness and relationships based on support or concealment choices, but must not attach a negative effect to identity itself.

- [ ] **Step 5: Aggregate the stage modules without breaking existing imports**

Rewrite `dist/data/decisions.js` as the shared `choice` helper plus aggregator:

```js
import { YOUTH_DECISIONS } from './decisions-youth.js';
import { ADULT_DECISIONS } from './decisions-adult.js';
import { LATER_DECISIONS } from './decisions-later.js';

export const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

export const DECISIONS = [...YOUTH_DECISIONS, ...ADULT_DECISIONS, ...LATER_DECISIONS];
export const DECISION_BY_ID = Object.fromEntries(DECISIONS.map((item) => [item.id, item]));
```

To avoid an import cycle, the stage modules define their local `choice` helper with the same object shape rather than importing it from the aggregator.

- [ ] **Step 6: Implement deterministic conditional scene selection**

In `dist/engine/decisions.js`, add:

```js
import { createRng } from './random.js';

export function isDecisionEligible(life, decision) {
  const [minimumAge, maximumAge] = decision.ageRange ?? [decision.age, decision.age];
  return life.age >= minimumAge
    && life.age <= maximumAge
    && !life.decisions[decision.id]
    && (typeof decision.when !== 'function' || decision.when(life));
}

function chooseWeightedDecision(life, candidates) {
  if (candidates.length <= 1) return candidates[0] ?? null;
  const rng = createRng(`${life.seed}:decision:${life.age}`);
  const total = candidates.reduce((sum, item) => sum + Math.max(1, item.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const candidate of candidates) {
    roll -= Math.max(1, candidate.weight ?? 1);
    if (roll < 0) return candidate;
  }
  return candidates.at(-1) ?? null;
}
```

Change `getDecision` to return the persisted pending scene first, otherwise `chooseWeightedDecision(current, DECISIONS.filter(...))`. Keep `availability`, `getChoices`, `applyDecision`, and `chooseAutomatically` public signatures unchanged. Extend `applyDecision` so choices can carry `economyEffects`, `careerStatus`, `housingRegion`, and `relationshipNote`, applying only explicit fields.

- [ ] **Step 7: Run scene tests and the complete suite**

Run: `npm test`

Expected: all tests pass, including the 100-seed completion test and the 30-scene inventory.

- [ ] **Step 8: Commit the scene engine and content**

```bash
git add dist/data/research.js dist/data/decisions*.js dist/engine/decisions.js tests/education-decisions.test.mjs tests/full-life.test.mjs
git commit -m "feat: deepen Korean life decision scenes"
```

---

### Task 2: Deterministic fictional identity arc

**Files:**
- Create: `dist/data/identity.js`
- Create: `dist/engine/identity.js`
- Modify: `dist/engine/life.js`
- Create: `tests/identity.test.mjs`
- Modify: `tests/life-engine.test.mjs`
- Modify: `tests/support/life-fixtures.mjs`

**Interfaces:**
- Consumes: `hashSeed(value)` from `dist/engine/random.js`.
- Produces: `LGBTQ_SIMULATION_RATE`, `IDENTITY_VARIANTS`, `createIdentityArc(seed)`, `revealIdentityIfDue(life)`, `acknowledgeIdentityDiscovery(life)`, and normalized `life.identity` / `life.pendingIdentityDiscovery` fields.

- [ ] **Step 1: Write failing identity probability, age, permanence, migration, and neutral-effects tests**

Create `tests/identity.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityArc, revealIdentityIfDue, acknowledgeIdentityDiscovery } from '../dist/engine/identity.js';
import { normalizeLife } from '../dist/engine/life.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

test('10,000개 고정 seed에서 약 5%가 LGBT+ 정체성 경로를 가진다', () => {
  const arcs = Array.from({ length: 10000 }, (_, index) => createIdentityArc(`identity-${index}`));
  const rate = arcs.filter((arc) => arc.assigned).length / arcs.length;
  assert.ok(rate >= 0.045 && rate <= 0.055, rate);
});

test('같은 seed는 같은 정체성과 발견 나이를 만든다', () => {
  assert.deepEqual(createIdentityArc('same-seed'), createIdentityArc('same-seed'));
});

test('발견 나이는 16세부터 24세 사이다', () => {
  for (let index = 0; index < 20000; index += 1) {
    const arc = createIdentityArc(`age-${index}`);
    if (arc.assigned) assert.ok(arc.discoveryAge >= 16 && arc.discoveryAge <= 24);
  }
});

test('정체성 발견은 상태 수치를 직접 바꾸지 않고 한 번만 열린다', () => {
  const life = makeLifeAtAge(18, {
    identity: { assigned: 'bisexual', label: '양성애자', discoveryAge: 18, discovered: false, acknowledged: false },
  });
  const first = revealIdentityIfDue(life);
  const second = revealIdentityIfDue(first);
  assert.deepEqual(first.stats, life.stats);
  assert.deepEqual(first.economy, life.economy);
  assert.equal(first.pendingIdentityDiscovery, true);
  assert.equal(second.history.filter((entry) => entry.type === 'identity-discovery').length, 1);
});

test('확인한 정체성 사건은 같은 삶에서 다시 대기 상태가 되지 않는다', () => {
  const discovered = revealIdentityIfDue(makeLifeAtAge(18, {
    identity: { assigned: 'bisexual', label: '양성애자', discoveryAge: 18, discovered: false, acknowledged: false },
  }));
  const acknowledged = acknowledgeIdentityDiscovery(discovered);
  assert.equal(acknowledged.pendingIdentityDiscovery, false);
  assert.equal(acknowledged.identity.acknowledged, true);
  assert.equal(revealIdentityIfDue(acknowledged).pendingIdentityDiscovery, false);
});

test('버전 2 저장본도 안전한 기본 정체성 상태로 정규화된다', () => {
  const migrated = normalizeLife({ ...makeLifeAtAge(30), version: 2, identity: undefined });
  assert.equal(typeof migrated.identity.discovered, 'boolean');
  assert.equal(typeof migrated.pendingIdentityDiscovery, 'boolean');
});
```

- [ ] **Step 2: Run identity tests and verify module-not-found failure**

Run: `node --test tests/identity.test.mjs`

Expected: FAIL because the identity modules do not exist.

- [ ] **Step 3: Define the simplified identity catalogue and disclosure copy**

Create `dist/data/identity.js`:

```js
export const LGBTQ_SIMULATION_RATE = 0.05;
export const IDENTITY_VARIANTS = [
  { id: 'bisexual', label: '양성애자', weight: 3 },
  { id: 'gay-lesbian', label: '동성애자', weight: 1 },
  { id: 'pansexual', label: '범성애자', weight: 1 },
  { id: 'asexual-spectrum', label: '무성애 스펙트럼', weight: 1 },
  { id: 'trans-nonbinary', label: '트랜스젠더·논바이너리', weight: 2 },
];

export const IDENTITY_NOTICE = '실제 사용자의 정체성을 판정하는 결과가 아니라, 이 가상 인생에만 적용되는 시뮬레이션 사건입니다.';
```

- [ ] **Step 4: Implement deterministic assignment and one-time discovery**

Create `dist/engine/identity.js`:

```js
import { LGBTQ_SIMULATION_RATE, IDENTITY_VARIANTS } from '../data/identity.js';
import { hashSeed } from './random.js';

const unit = (seed, salt) => hashSeed(`${seed}:${salt}`) / 0x100000000;

export function createIdentityArc(seed) {
  if (unit(seed, 'identity-eligible') >= LGBTQ_SIMULATION_RATE) {
    return { assigned: null, label: null, discoveryAge: null, discovered: false, acknowledged: false };
  }
  const total = IDENTITY_VARIANTS.reduce((sum, item) => sum + item.weight, 0);
  let roll = unit(seed, 'identity-variant') * total;
  const selected = IDENTITY_VARIANTS.find((item) => ((roll -= item.weight) < 0)) ?? IDENTITY_VARIANTS.at(-1);
  return {
    assigned: selected.id,
    label: selected.label,
    discoveryAge: 16 + Math.floor(unit(seed, 'identity-age') * 9),
    discovered: false,
    acknowledged: false,
  };
}

export function revealIdentityIfDue(life) {
  const identity = life.identity;
  if (!identity?.assigned || identity.discovered || life.age < identity.discoveryAge) return life;
  return {
    ...life,
    identity: { ...identity, discovered: true },
    pendingIdentityDiscovery: true,
    history: [...life.history, {
      id: 'identity-discovery', age: life.age, year: life.year, type: 'identity-discovery',
      text: `가상 인물이 자신의 ${identity.label} 정체성을 더 분명히 알게 되었습니다.`,
    }],
    milestones: [...life.milestones, { age: life.age, type: 'identity-discovery', label: '정체성 발견' }],
  };
}

export function acknowledgeIdentityDiscovery(life) {
  if (!life.pendingIdentityDiscovery) return life;
  return {
    ...life,
    pendingIdentityDiscovery: false,
    identity: { ...life.identity, acknowledged: true },
  };
}
```

- [ ] **Step 5: Add identity state to life creation, normalization, and annual advancement**

In `createLife`, initialize `identity: createIdentityArc(initialSeed)` and `pendingIdentityDiscovery: false`. In `normalizeLife`, preserve known identity fields, create a safe default for old saves, coerce booleans, and clear `pendingIdentityDiscovery` when no assigned identity exists. Set `version: 3`.

At the end of `advanceYear`, normalize the next life, pass it through `revealIdentityIfDue`, then normalize the returned life again. This ensures discovery happens only after the age increments and before the controller chooses a later scene. In `simulateAutomatically`, call `acknowledgeIdentityDiscovery` immediately when a discovery is pending because headless completion has no dialog; extend `tests/full-life.test.mjs` to assert `result.pendingIdentityDiscovery === false`.

- [ ] **Step 6: Run identity and full-life tests**

Run: `node --test tests/identity.test.mjs tests/life-engine.test.mjs tests/full-life.test.mjs`

Expected: PASS, with non-finite values absent and all automatic lives still reaching review.

- [ ] **Step 7: Commit the identity model**

```bash
git add dist/data/identity.js dist/engine/identity.js dist/engine/life.js tests/identity.test.mjs tests/life-engine.test.mjs tests/support/life-fixtures.mjs
git commit -m "feat: add deterministic fictional identity arc"
```

---

### Task 3: Identity discovery dialog, research links, and controller blocking

**Files:**
- Modify: `dist/index.html`
- Modify: `dist/app.js`
- Modify: `dist/ui/controls.js`
- Modify: `dist/ui/render.js`
- Modify: `dist/styles.css`
- Modify: `tests/controller.test.mjs`
- Modify: `tests/render.test.mjs`
- Modify: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `life.identity`, `life.pendingIdentityDiscovery`, `IDENTITY_NOTICE`, `getResearchSource(key)`, `acknowledgeIdentityDiscovery(life)`.
- Produces: controller callback `onIdentityDiscovery(life)`, method `acknowledgeIdentity()`, renderer `renderIdentityDiscovery(dialog, life)`, and source metadata in the decision dialog.

- [ ] **Step 1: Add failing controller and markup tests**

Add to `tests/controller.test.mjs`:

```js
test('정체성 발견이 열리면 시간과 건너뛰기가 멈추고 확인 뒤에만 진행된다', () => {
  const clock = fakeClock();
  let discoveries = 0;
  const initialLife = makeLifeAtAge(15, {
    identity: { assigned: 'bisexual', label: '양성애자', discoveryAge: 16, discovered: false, acknowledged: false },
  });
  const controller = createSimulationController({
    clock,
    initialLife,
    onIdentityDiscovery: () => { discoveries += 1; },
  });
  controller.play();
  clock.advance(8000);
  assert.equal(discoveries, 1);
  assert.equal(controller.isPlaying(), false);
  assert.equal(controller.getState().pendingIdentityDiscovery, true);
  controller.skipToDecision();
  assert.equal(controller.getState().age, 16);
  controller.acknowledgeIdentity();
  assert.equal(controller.getState().pendingIdentityDiscovery, false);
  assert.equal(controller.getState().identity.acknowledged, true);
});
```

Add markup assertions for `identity-dialog`, `identity-continue-button`, the no-diagnosis sentence, and a decision source container.

- [ ] **Step 2: Run focused UI tests and verify they fail**

Run: `node --test tests/controller.test.mjs tests/render.test.mjs tests/markup.test.mjs`

Expected: FAIL because the callback, acknowledgement method, and dialog do not exist.

- [ ] **Step 3: Make the controller stop for identity discovery before decisions**

Extend `createSimulationController` options with `onIdentityDiscovery = () => {}`. Add:

```js
function setPendingIdentityDiscovery() {
  if (!life.pendingIdentityDiscovery) return false;
  playing = false;
  cancelTimer();
  publish();
  onIdentityDiscovery(structuredClone(life));
  return true;
}
```

After annual systems run, call it before `setPendingDecision()`. Make `play`, `scheduleNext`, and the `skipToDecision` loop stop when `pendingIdentityDiscovery` is true. Add:

```js
acknowledgeIdentity() {
  if (!life.pendingIdentityDiscovery) return structuredClone(life);
  life = normalizeLife(acknowledgeIdentityDiscovery(life));
  publish();
  return structuredClone(life);
}
```

On controller creation, preserve a loaded pending discovery and notify through the callback when `startLife` evaluates it.

- [ ] **Step 4: Add the non-dismissible identity dialog and visible profile field**

Add to `dist/index.html` after the decision dialog:

```html
<dialog id="identity-dialog" class="decision-dialog identity-dialog" aria-labelledby="identity-title">
  <div class="decision-card identity-card">
    <p class="eyebrow"><span>IDENTITY DISCOVERY</span> FICTIONAL LIFE EVENT</p>
    <h2 id="identity-title" tabindex="-1">가상 인물이 자신의<br><em data-identity="label">정체성</em>을 찾았습니다.</h2>
    <p data-identity="notice">실제 사용자의 정체성을 판정하는 결과가 아니라, 이 가상 인생에만 적용되는 시뮬레이션 사건입니다.</p>
    <a data-identity="source" href="https://www.ipsos.com/sites/default/files/ct/publication/documents/2024-06/Ipsos_Pride-Report-2024.pdf" target="_blank" rel="noreferrer">확률 참고: Ipsos Pride Report 2024</a>
    <button id="identity-continue-button" class="primary-button" type="button">이 삶을 계속 살아간다 <span aria-hidden="true">→</span></button>
  </div>
</dialog>
```

Add this source slot inside the existing decision card between the choices and footnote:

```html
<p class="decision-source" data-decision="source" hidden></p>
```

Add an initially hidden profile row under “배움과 일”:

```html
<div data-identity-profile hidden><dt>정체성</dt><dd data-life="identity">발견 전</dd></div>
```

- [ ] **Step 5: Render sources and the discovered identity safely**

In `createLifeViewModel`, include `identity: current.identity.discovered ? current.identity.label : null`. In `renderLife`, set the row hidden state based on that value.

Add `renderIdentityDiscovery(dialog, life)` that uses `textContent` for the label and notice. Change the decision renderer signature to `renderDecision(dialog, decision, choices, currentAge = decision.age ?? decision.ageRange?.[0])`; use `currentAge` in the kicker, and have `openDecision` pass `life.age`. In `renderDecision`, resolve `decision.sourceKey`; render an anchor inside `[data-decision="source"]` with `target="_blank"` and `rel="noreferrer"`, or hide it when no source exists.

- [ ] **Step 6: Wire the dialog in `app.js`**

Pass `onIdentityDiscovery: openIdentityDiscovery` to the controller. The dialog's `cancel` handler must call `preventDefault()`. The sole button calls `controller.acknowledgeIdentity()`, closes the dialog with the existing inert/focus helper, and announces the fictional event in the live region. On load, open the identity dialog before reopening a pending decision.

- [ ] **Step 7: Style the event as part of the existing palette**

Use existing CSS variables only. Give `.identity-card em` the accent color, keep the source link muted but keyboard-visible, and keep the continue button full-width on mobile. Do not add rainbow gradients or a different visual system.

- [ ] **Step 8: Run UI and full regression tests**

Run: `npm test`

Expected: all tests pass, and the controller cannot advance while identity acknowledgement is pending.

- [ ] **Step 9: Commit the identity UI**

```bash
git add dist/index.html dist/app.js dist/ui/controls.js dist/ui/render.js dist/styles.css tests/controller.test.mjs tests/render.test.mjs tests/markup.test.mjs
git commit -m "feat: present identity discovery as a life event"
```

---

### Task 4: One-viewport desktop life dashboard

**Files:**
- Modify: `dist/styles.css`
- Modify: `dist/index.html`
- Modify: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: existing `.site-header`, `.life-view`, `.life-toolbar`, `.simulation-notice`, `.life-layout`, `.life-story`, `.life-sidebar`, `.current-moment`, `.map-section`, and `.log-section` markup.
- Produces: a no-document-scroll desktop life view at widths >=960px and unchanged stacked scrolling below 960px.

- [ ] **Step 1: Add failing CSS contract tests for desktop bounding and mobile reset**

Add to `tests/markup.test.mjs`:

```js
test('PC 생애 화면은 뷰포트에 고정되고 내부 패널만 스크롤한다', () => {
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*body\[data-view="life"\][\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*\.life-layout[\s\S]*min-height:\s*0/);
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*\.life-sidebar[\s\S]*overflow-y:\s*auto/);
});

test('모바일 생애 화면은 문서 스크롤을 유지한다', () => {
  assert.match(css, /@media \(max-width: 959px\)[\s\S]*body\[data-view="life"\][\s\S]*overflow-y:\s*auto/);
});
```

- [ ] **Step 2: Run markup tests and verify the new contracts fail**

Run: `node --test tests/markup.test.mjs`

Expected: FAIL because the desktop media block does not exist.

- [ ] **Step 3: Add the bounded desktop dashboard rules**

Add this structure before the existing max-width media blocks:

```css
@media (min-width: 960px) {
  body[data-view="life"] { height: 100svh; overflow: hidden; }
  body[data-view="life"] main { height: calc(100svh - 80px); }
  .life-view {
    display: grid;
    grid-template-rows: 66px 34px minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    padding-bottom: 0;
    overflow: hidden;
  }
  .life-toolbar { position: relative; min-height: 0; padding-block: 8px; }
  .simulation-notice { display: flex; align-items: center; min-height: 0; padding-block: 6px; }
  .life-layout { height: 100%; min-height: 0; overflow: hidden; }
  .life-sidebar { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .life-story {
    display: grid;
    grid-template-rows: minmax(185px, 1.25fr) minmax(142px, .85fr) minmax(112px, .7fr);
    min-height: 0;
    overflow: hidden;
  }
  .current-moment { min-height: 0; padding: clamp(22px, 3vh, 42px) clamp(26px, 3.4vw, 54px); }
  .current-moment h1 { font-size: clamp(38px, 4.2vh, 58px); }
  .current-moment > p:last-child { margin-top: 14px; line-height: 1.55; }
  .map-section, .log-section { min-height: 0; padding: clamp(14px, 2vh, 24px) clamp(22px, 3vw, 42px); overflow: hidden; }
  .life-section-heading { margin-bottom: 12px; }
  .life-section-heading h2 { font-size: clamp(22px, 2.6vh, 30px); }
  .life-map { grid-template-columns: repeat(19, minmax(16px, 1fr)); gap: 3px; }
  .life-log { max-height: calc(100% - 42px); overflow-y: auto; overscroll-behavior: contain; }
  .log-entry { grid-template-columns: 52px 1fr; padding: 8px 0; }
  .life-panel summary { padding: 11px 14px; }
  .panel-body { padding: 0 14px 14px; }
  .life-stat + .life-stat { margin-top: 9px; }
}
```

At `max-width: 959px`, explicitly reset `body[data-view="life"] { height: auto; overflow-y: auto; }`, `main { height: auto; }`, and `.life-view { display: block; height: auto; min-height: 100svh; overflow: visible; }` before the stacked mobile layout declarations.

- [ ] **Step 4: Run markup and full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Verify real desktop and mobile viewports in the browser**

Serve `dist` locally, open a life at each viewport, and evaluate these exact conditions:

```js
// 1366x768 and 1440x900
document.documentElement.scrollHeight === document.documentElement.clientHeight

// 390x844
document.documentElement.scrollHeight > document.documentElement.clientHeight
  && document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Also open a long decision and the identity dialog to confirm each dialog scrolls internally without moving the background.

- [ ] **Step 6: Commit the dashboard layout**

```bash
git add dist/styles.css dist/index.html tests/markup.test.mjs
git commit -m "feat: fit desktop life dashboard to one viewport"
```

---

### Task 5: End-to-end verification and GitHub Pages release

**Files:**
- Modify only if verification finds a defect in files already listed above.

**Interfaces:**
- Consumes: the complete simulation, GitHub Pages workflow, and public repository remote.
- Produces: a tested `main` branch and updated `https://kev208dev.github.io/1in50M/` deployment.

- [ ] **Step 1: Run the complete automated suite twice**

Run: `npm test && npm test`

Expected: both runs pass with identical totals, proving deterministic scene and identity behavior.

- [ ] **Step 2: Run a 10,000-seed identity audit and 100-seed life completion audit**

Run:

```bash
node --input-type=module -e "import {createIdentityArc} from './dist/engine/identity.js'; const n=10000; const hits=Array.from({length:n},(_,i)=>createIdentityArc('audit-'+i)).filter(x=>x.assigned).length; console.log({hits,rate:hits/n}); if(hits/n<0.045||hits/n>0.055) process.exit(1)"
node --test tests/full-life.test.mjs
```

Expected: identity rate is between 0.045 and 0.055 and the completion test passes.

- [ ] **Step 3: Perform the user journey in the local browser**

Verify: repeatedly reroll birth profiles; start a life; use manual and automatic decisions; encounter source links; use a forced test seed/state for the identity dialog; confirm it has one continuation action; continue to an LGBT+ follow-up scene; finish a life; reopen the archive; reload a saved version-2 fixture.

- [ ] **Step 4: Inspect the final diff and working tree**

Run: `git diff HEAD~4..HEAD --check && git status --short`

Expected: no whitespace errors and no uncommitted files.

- [ ] **Step 5: Push `main` and wait for GitHub Pages**

```bash
git push origin main
```

Confirm the Pages workflow succeeds, then open `https://kev208dev.github.io/1in50M/` with a cache-busting query and repeat the 1366×768, 1440×900, and 390×844 checks.

- [ ] **Step 6: Report the release**

Provide the live URL, the final commit SHA, automated test total, measured identity rate, and desktop/mobile viewport verification results. Explicitly repeat that the identity event belongs only to the fictional character and is not a real-user diagnosis.
