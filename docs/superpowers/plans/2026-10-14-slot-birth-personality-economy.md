# Slot Birth, Personality Agency, and Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current birth draw with the supplied slot-machine experience and make birth conditions, multidimensional appearance, personality agency, investment, gambling, and entrepreneurship materially shape a complete Korean life simulation.

**Architecture:** Keep the dependency-free ES module application and add focused data/engine modules behind the existing `createBirthProfile`, `createLife`, decision, controller, render, storage, and summary interfaces. All randomness remains seed-driven after a slot result is accepted; UI animation is separated from profile generation so reduced-motion and tests receive the same result.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node.js built-in test runner, localStorage, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-14-slot-birth-personality-economy-design.md`

## Global Constraints

- All displayed probabilities and money values that are not directly connected to verified statistics must be labeled as fictional simulation weights.
- Keep the existing black, white, blue, and green visual system; use `#111613`, `#1A211C`, `#26302A`, `#EEF3EC`, and `#3DF08A` in the slot surface.
- Preserve the current font stack and dependency-free static deployment.
- The primary birth and life actions must remain visible without page-level scrolling at common desktop and mobile viewport sizes.
- Race or cultural background must never directly modify attractiveness, ability, morality, or financial outcome.
- Disability must never directly reduce intelligence, morality, happiness, or automatic-choice agency.
- Personality override rates are exactly 0% for mixed, 12% for strong, and 28% for extreme personalities.
- Personality overrides are forbidden for medical, identity, crime, locked, and untagged decisions.
- The same accepted seed must reproduce the same birth profile and life path.
- Existing save, resume, archive, summary, and share-compatible state must migrate without data loss.

## Review Focus

- A legacy v3 save with none of the new fields must normalize to a playable v4 life; Task 4 adds the migration test.
- A random source returning exactly `0` or nearly `1` must still produce every required slot field; Task 1 adds boundary tests.
- A decision with no enabled choice matching the dominant trait must honor the user choice; Task 5 adds the fallback test.
- Race and disability fields must not change the computed attractiveness score; Task 2 adds the invariance test.
- A mobile viewport with reduced motion must expose both reroll and accept actions and finish immediately; Task 3 adds markup/style assertions and a pure animation-duration test.

---

### Task 1: Deterministic Birth Slot Data

**Files:**
- Create: `dist/data/birth-slot.js`
- Create: `dist/engine/birth-slot.js`
- Modify: `dist/data.js`
- Modify: `dist/simulator.js`
- Create: `tests/birth-slot.test.mjs`
- Modify: `tests/simulator.test.mjs`

**Interfaces:**
- Consumes: `weightedPick(items, randomValue)` from `dist/simulator.js` only through injected helpers to avoid an import cycle.
- Produces: `createBirthSlotResult(seed, year)`, `profileFromSlotResult(result)`, and a backward-compatible `createBirthProfile(randomFn, year)`.

- [ ] **Step 1: Write failing deterministic slot tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthSlotResult, profileFromSlotResult } from '../dist/engine/birth-slot.js';

test('같은 seed는 같은 완전한 슬롯 결과를 만든다', () => {
  const first = createBirthSlotResult('birth-42', 2026);
  const second = createBirthSlotResult('birth-42', 2026);
  assert.deepEqual(first, second);
  assert.ok(first.sex.id);
  assert.ok(first.region.district);
  assert.equal(first.personality.rolls.length, 3);
  assert.ok(first.appearance.faceShape);
  assert.ok(first.name.full);
});

test('슬롯 결과는 기존 엔진이 받을 수 있는 프로필이 된다', () => {
  const profile = profileFromSlotResult(createBirthSlotResult('profile-7', 2026));
  assert.equal(profile.birthYear, 2026);
  assert.ok(profile.guardians.length >= 1);
  assert.ok(profile.personality.strength === 'mixed' || profile.personality.dominant);
  assert.ok(profile.appearance.description.length > 10);
});
```

- [ ] **Step 2: Run the new tests and verify missing-module failure**

Run: `node --test tests/birth-slot.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `dist/engine/birth-slot.js`.

- [ ] **Step 3: Add normalized weighted data and seeded generation**

```js
// dist/data/birth-slot.js
export const SEX_OPTIONS = [
  { id: 'female', label: '여성', weight: 49.8 },
  { id: 'male', label: '남성', weight: 50.2 },
];

export const PERSONALITY_OPTIONS = [
  ['impulsive', '충동적'], ['confrontational', '호전적'], ['calm', '차분한'],
  ['optimistic', '낙관적'], ['pessimistic', '부정적'], ['avoidant', '회피적'],
].map(([id, label]) => ({ id, label, weight: 1 }));

export const BIRTH_WEIGHT_NOTICE = '실제 인구통계와 창작용 가중치를 함께 사용한 가상 시뮬레이션입니다.';
```

```js
// dist/engine/birth-slot.js
import { createRng } from './random.js';
import { SEX_OPTIONS, PERSONALITY_OPTIONS } from '../data/birth-slot.js';

const pick = (rng, items) => rng.weighted(items);
const personality = (rng) => {
  const rolls = Array.from({ length: 3 }, () => pick(rng, PERSONALITY_OPTIONS));
  const counts = Object.fromEntries(rolls.map(({ id }) => [id, rolls.filter((x) => x.id === id).length]));
  const dominantId = Object.keys(counts).find((id) => counts[id] >= 2) ?? null;
  return {
    rolls,
    dominant: dominantId,
    strength: dominantId ? (counts[dominantId] === 3 ? 'extreme' : 'strong') : 'mixed',
  };
};

export function createBirthSlotResult(seed, year = 2026) {
  const rng = createRng(`birth:${seed}:${year}`);
  return { seed: String(seed), year, sex: pick(rng, SEX_OPTIONS), personality: personality(rng) };
}
```

Complete the returned object with normalized region, household, guardians, finance, housing, disability, appearance, and name records from focused exported arrays. `profileFromSlotResult` must preserve the existing `id`, `region`, `district`, `guardians`, `finance`, `housing`, `siblings`, `stats`, and `summary` keys while adding `sex`, `disability`, `appearance`, `personality`, `name`, and `simulationNotice`.

- [ ] **Step 4: Preserve the legacy generator and validate all new fields**

```js
// dist/simulator.js
export function createBirthProfile(randomFn = Math.random, year = 2026) {
  const entropy = Array.from({ length: 4 }, () => Math.floor(randomFn() * 0xffffffff).toString(16)).join('-');
  return profileFromSlotResult(createBirthSlotResult(entropy, year));
}

// validateProfile additions
if (!profile.appearance || typeof profile.appearance.description !== 'string') return false;
if (!profile.personality || !['mixed', 'strong', 'extreme'].includes(profile.personality.strength)) return false;
if (!profile.name || typeof profile.name.full !== 'string') return false;
```

Add boundary assertions using `() => 0` and `() => 1 - Number.EPSILON` to `tests/simulator.test.mjs`, then run:

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the deterministic birth model**

```bash
git add dist/data.js dist/data/birth-slot.js dist/engine/birth-slot.js dist/simulator.js tests/birth-slot.test.mjs tests/simulator.test.mjs
git commit -m "feat: add deterministic Korean birth slot model"
```

### Task 2: Multidimensional Appearance Model

**Files:**
- Create: `dist/data/appearance.js`
- Create: `dist/engine/appearance.js`
- Modify: `dist/engine/birth-slot.js`
- Create: `tests/appearance.test.mjs`

**Interfaces:**
- Consumes: seeded `rng` object with `weighted(items)`, `int(min, max)`, and `next()`.
- Produces: `createAppearance(rng, context)`, `describeAppearance(appearance, context)`, `advanceAppearance(appearance, life)`, and `appearanceInfluence(appearance, contextTag)`.

- [ ] **Step 1: Write failing appearance composition and invariance tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../dist/engine/random.js';
import { createAppearance, describeAppearance, appearanceInfluence } from '../dist/engine/appearance.js';

test('외모는 여러 축을 가진 자연스러운 설명을 만든다', () => {
  const appearance = createAppearance(createRng('appearance-1'), { sex: 'female', ancestry: 'korean' });
  const text = describeAppearance(appearance, { sexLabel: '여성' });
  assert.ok(['cat', 'dog', 'fox', 'rabbit', 'bear', 'dinosaur', 'gentle', 'cool'].includes(appearance.faceShape));
  assert.ok(Number.isFinite(appearance.heightCm));
  assert.ok(text.includes('여성'));
});

test('인종과 장애는 외모 평가 점수를 바꾸지 않는다', () => {
  const appearance = createAppearance(createRng('same-body'), { sex: 'male', ancestry: 'korean' });
  assert.equal(
    appearanceInfluence({ ...appearance, ancestry: 'black', disability: { type: 'mobility' } }, 'first-impression'),
    appearanceInfluence({ ...appearance, ancestry: 'korean', disability: null }, 'first-impression'),
  );
});
```

- [ ] **Step 2: Run the appearance tests and verify failure**

Run: `node --test tests/appearance.test.mjs`

Expected: FAIL because `dist/engine/appearance.js` does not exist.

- [ ] **Step 3: Implement independent appearance axes and Korean descriptions**

```js
export function createAppearance(rng, { sex = 'female' } = {}) {
  const appearance = {
    faceShape: rng.weighted(FACE_SHAPES).id,
    build: rng.weighted(BODY_BUILDS).id,
    heightCm: rng.int(sex === 'male' ? 158 : 148, sex === 'male' ? 195 : 185),
    skinTone: rng.weighted(SKIN_TONES).id,
    hairTexture: rng.weighted(HAIR_TEXTURES).id,
    hairStyle: rng.weighted(HAIR_STYLES).id,
    style: rng.weighted(STYLE_OPTIONS).id,
    grooming: rng.int(35, 85),
    socialRating: rng.int(25, 92),
  };
  return { ...appearance, description: describeAppearance(appearance, { sexLabel: sex === 'male' ? '남성' : '여성' }) };
}

export function appearanceInfluence(appearance, contextTag) {
  const contextScale = { 'first-impression': 0.32, romance: 0.45, service: 0.28, knowledge: 0 }[contextTag] ?? 0.1;
  return Math.round((Number(appearance.socialRating) - 50) * contextScale);
}
```

Store labels in `dist/data/appearance.js`; do not derive `socialRating` from `skinTone`, ancestry, disability, or gender identity.

- [ ] **Step 4: Add life-stage appearance evolution**

```js
export function advanceAppearance(appearance, life) {
  const stressPenalty = life.stats.happiness < 35 ? 2 : 0;
  const healthBonus = life.focusId === 'health' ? 2 : 0;
  const grooming = Math.max(0, Math.min(100, appearance.grooming + healthBonus - stressPenalty));
  return {
    ...appearance,
    grooming,
    agePresentation: life.age,
    socialRating: Math.max(0, Math.min(100, appearance.socialRating + healthBonus - stressPenalty)),
  };
}
```

Run: `node --test tests/appearance.test.mjs tests/birth-slot.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the appearance model**

```bash
git add dist/data/appearance.js dist/engine/appearance.js dist/engine/birth-slot.js tests/appearance.test.mjs
git commit -m "feat: generate evolving multidimensional appearances"
```

### Task 3: Slot Machine UI and One-Screen Responsive Layout

**Files:**
- Create: `dist/ui/birth-slot.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Modify: `dist/app.js`
- Modify: `tests/markup.test.mjs`
- Create: `tests/birth-slot-ui.test.mjs`

**Interfaces:**
- Consumes: `createBirthSlotResult(seed, year)` and `profileFromSlotResult(result)`.
- Produces: `slotRows(result)`, `slotDuration(reduceMotion)`, `renderBirthSlot(root, result)`, and application actions `spinBirthSlot()` and `acceptBirthSlot()`.

- [ ] **Step 1: Write failing UI contract tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { slotDuration, slotRows } from '../dist/ui/birth-slot.js';
import { createBirthSlotResult } from '../dist/engine/birth-slot.js';

test('모션 감소 환경은 슬롯 대기 시간이 없다', () => assert.equal(slotDuration(true), 0));
test('슬롯은 모든 출생 범주를 표시한다', () => {
  const ids = slotRows(createBirthSlotResult('ui', 2026)).map((row) => row.id);
  assert.deepEqual(ids, ['sex', 'region', 'family', 'disability', 'appearance', 'personality', 'name']);
});
test('출생 화면에 재추첨과 확정 버튼이 있다', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="slot-spin-button"/);
  assert.match(html, /id="slot-accept-button"/);
});
```

- [ ] **Step 2: Run UI tests and verify failure**

Run: `node --test tests/birth-slot-ui.test.mjs tests/markup.test.mjs`

Expected: FAIL because `dist/ui/birth-slot.js` and slot controls do not exist.

- [ ] **Step 3: Replace the birth certificate with accessible slot markup**

```html
<section id="profile-view" class="view slot-view" aria-labelledby="slot-title" hidden>
  <header class="slot-heading">
    <p class="eyebrow">ONE LIFE / RANDOM BIRTH</p>
    <h1 id="slot-title">당신의 시작 조건</h1>
    <p>실제 통계와 창작용 가중치를 함께 사용한 가상 시뮬레이션입니다.</p>
  </header>
  <div id="birth-slot" class="birth-slot" aria-live="polite"></div>
  <div class="slot-actions">
    <button id="slot-spin-button" class="secondary-button" type="button">다시 돌리기</button>
    <button id="slot-accept-button" class="primary-button" type="button">이 삶으로 시작하기</button>
  </div>
</section>
```

Keep compatibility aliases in `app.js` only where needed; remove the obsolete previous-result control after its tests are updated.

- [ ] **Step 4: Implement pure row mapping, staggered reel animation, and responsive CSS**

```js
export const slotDuration = (reduceMotion) => reduceMotion ? 0 : 1500;

export function slotRows(result) {
  return [
    { id: 'sex', label: '성별', value: result.sex.label },
    { id: 'region', label: '출생지', value: `${result.region.name} ${result.region.district}` },
    { id: 'family', label: '가정', value: result.household.summary },
    { id: 'disability', label: '장애', value: result.disability?.label ?? '비장애' },
    { id: 'appearance', label: '외모', value: result.appearance.description },
    { id: 'personality', label: '성격', value: result.personality.label },
    { id: 'name', label: '이름', value: result.name.full },
  ];
}
```

```css
.slot-view { min-height: calc(100dvh - 5rem); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; }
.birth-slot { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: clamp(.5rem, 1vw, 1rem); min-height: 0; }
.slot-reel { background: #1A211C; border: 1px solid #26302A; color: #EEF3EC; overflow: hidden; }
.slot-reel[data-slot="personality"], .slot-reel[data-slot="name"] { grid-column: span 2; }
@media (max-width: 720px) {
  .birth-slot { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .slot-reel[data-slot="appearance"] { grid-column: 1 / -1; }
  .slot-actions { position: sticky; bottom: env(safe-area-inset-bottom); }
}
@media (prefers-reduced-motion: reduce) { .slot-strip { transition: none; animation: none; } }
```

Wire `birth-button` to the first spin, disable both actions while spinning, and keep the same generated result when reduced motion changes only the duration.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the slot interface**

```bash
git add dist/index.html dist/styles.css dist/app.js dist/ui/birth-slot.js tests/markup.test.mjs tests/birth-slot-ui.test.mjs
git commit -m "feat: replace birth draw with responsive slot machine"
```

### Task 4: Life v4 Profile Influence and Save Migration

**Files:**
- Create: `dist/engine/profile-influence.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/storage.js`
- Modify: `tests/life-engine.test.mjs`
- Modify: `tests/life-storage-summary.test.mjs`
- Modify: `tests/support/life-fixtures.mjs`

**Interfaces:**
- Consumes: accepted v4 birth profile.
- Produces: `createProfileInfluence(profile)`, `getInfluenceModifier(life, tag)`, and normalized life state version 4.

- [ ] **Step 1: Write failing influence and legacy migration tests**

```js
import { createBirthProfile } from '../dist/simulator.js';
import { createLife, normalizeLife } from '../dist/engine/life.js';
import { getInfluenceModifier } from '../dist/engine/profile-influence.js';

const profile = createBirthProfile(() => 0.42, 2026);

test('유복한 수도권 가정은 교육 접근성과 초기 안전망을 높인다', () => {
  const rich = createLife({ ...profile, finance: '매우 여유로운 가정', region: { name: '서울특별시', short: '서울', code: 'SEL' } }, 'rich');
  const tight = createLife({ ...profile, finance: '생계가 빠듯한 가정', region: { name: '전라남도', short: '전남', code: 'JLN' } }, 'tight');
  assert.ok(getInfluenceModifier(rich, 'education-access') > getInfluenceModifier(tight, 'education-access'));
  assert.ok(rich.economy.cash > tight.economy.cash);
});

test('v3 저장은 새 필드가 없어도 v4로 정규화된다', () => {
  const legacyV3Life = createLife(profile, 'legacy-v3');
  delete legacyV3Life.profileInfluence;
  delete legacyV3Life.economy.assets;
  const migrated = normalizeLife({ ...legacyV3Life, version: 3 });
  assert.equal(migrated.version, 4);
  assert.ok(migrated.profileInfluence);
  assert.ok(migrated.economy.assets);
});
```

- [ ] **Step 2: Run migration tests and verify failure**

Run: `node --test tests/life-engine.test.mjs tests/life-storage-summary.test.mjs`

Expected: FAIL because version 4 influence and asset state are absent.

- [ ] **Step 3: Build named modifiers from profile conditions**

```js
export function createProfileInfluence(profile = {}) {
  const affluent = profile.finance?.includes('여유') ? 18 : profile.finance?.includes('빠듯') ? -16 : 0;
  const metro = ['SEL', 'GGD', 'ICN'].includes(profile.region?.code) ? 8 : 0;
  return {
    modifiers: {
      'education-access': affluent + metro,
      'financial-buffer': affluent,
      'housing-pressure': metro ? 10 : -2,
      'first-impression': Math.round(((profile.appearance?.socialRating ?? 50) - 50) * 0.16),
    },
    tags: [profile.finance, profile.region?.code, profile.disability?.type].filter(Boolean),
  };
}

export function getInfluenceModifier(life, tag) {
  return Number(life.profileInfluence?.modifiers?.[tag]) || 0;
}
```

- [ ] **Step 4: Normalize legacy state without losing saves**

```js
copy.version = 4;
copy.profileInfluence = copy.profileInfluence?.modifiers
  ? structuredClone(copy.profileInfluence)
  : createProfileInfluence(copy.profile);
copy.economy.assets = {
  deposits: finite(copy.economy?.assets?.deposits, copy.economy?.deposit),
  bonds: finite(copy.economy?.assets?.bonds),
  stocks: finite(copy.economy?.assets?.stocks),
  crypto: finite(copy.economy?.assets?.crypto),
  businessEquity: finite(copy.economy?.assets?.businessEquity),
};
```

Update `netWorth` to include all asset buckets and keep the old `deposit` mirror until all render/storage tests use `assets.deposits`.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit influence and migration**

```bash
git add dist/engine/profile-influence.js dist/engine/life.js dist/storage.js tests/life-engine.test.mjs tests/life-storage-summary.test.mjs tests/support/life-fixtures.mjs
git commit -m "feat: make birth conditions persist through life state"
```

### Task 5: Personality-Driven Autonomous Choices

**Files:**
- Create: `dist/engine/agency.js`
- Modify: `dist/data/decisions.js`
- Modify: `dist/data/decisions-youth.js`
- Modify: `dist/data/decisions-adult.js`
- Modify: `dist/data/decisions-later.js`
- Modify: `dist/engine/decisions.js`
- Modify: `dist/ui/controls.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Create: `tests/agency.test.mjs`
- Modify: `tests/controller.test.mjs`

**Interfaces:**
- Consumes: `choice.personalityTags`, `decision.overridePolicy`, and normalized `life.profile.personality`.
- Produces: `resolveAgencyChoice(life, decision, requestedChoice, choices)` and `applyUserDecision(life, decisionId, requestedChoiceId)` returning `{ life, requestedChoiceId, actualChoiceId, overridden, reason }`.

- [ ] **Step 1: Write failing override-rate, safety, and fallback tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverrideRate, resolveAgencyChoice } from '../dist/engine/agency.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const extremeLife = makeLifeAtAge(24, {
  profile: { personality: { strength: 'extreme', dominant: 'impulsive', label: '극도로 충동적' } },
});
const choices = [
  { id: 'plan', enabled: true, personalityTags: ['calm'] },
  { id: 'jump', enabled: true, personalityTags: ['impulsive'] },
];

test('강한 성격은 12%, 극단 성격은 28% 임계값을 쓴다', () => {
  assert.equal(getOverrideRate({ strength: 'mixed' }), 0);
  assert.equal(getOverrideRate({ strength: 'strong' }), 0.12);
  assert.equal(getOverrideRate({ strength: 'extreme' }), 0.28);
});

test('보호 결정과 성향에 맞는 유효 선택지가 없으면 사용자 선택을 지킨다', () => {
  const protectedResult = resolveAgencyChoice(
    extremeLife,
    { id: 'medical', overridePolicy: 'forbidden' },
    choices[0],
    choices,
  );
  assert.equal(protectedResult.overridden, false);
  const untaggedResult = resolveAgencyChoice(
    extremeLife,
    { id: 'untagged' },
    choices[0],
    choices.map((choice) => ({ ...choice, personalityTags: [] })),
  );
  assert.equal(untaggedResult.actualChoiceId, 'plan');
});
```

- [ ] **Step 2: Run agency tests and verify missing exports**

Run: `node --test tests/agency.test.mjs`

Expected: FAIL because `getOverrideRate` and `resolveDecisionIntent` do not exist.

- [ ] **Step 3: Implement deterministic personality resolution**

```js
export const getOverrideRate = (personality = {}) => ({ mixed: 0, strong: 0.12, extreme: 0.28 }[personality.strength] ?? 0);

export function resolveAgencyChoice(life, decision, requestedChoice, choices) {
  const personality = life.profile?.personality ?? { strength: 'mixed', dominant: null };
  if (decision.overridePolicy === 'forbidden' || !personality.dominant) return keep(requestedChoice);
  const alternatives = choices.filter((choice) => choice.enabled && choice.id !== requestedChoice.id && choice.personalityTags?.includes(personality.dominant));
  if (alternatives.length === 0) return keep(requestedChoice);
  const rng = createRng(`${life.seed}:agency:${decision.id}:${life.age}`);
  if (rng.next() >= getOverrideRate(personality)) return keep(requestedChoice);
  const selected = alternatives[Math.floor(rng.next() * alternatives.length)];
  return { requestedChoiceId: requestedChoice.id, actualChoiceId: selected.id, overridden: true, reason: `${personality.label} 성향이 계획을 앞질렀습니다.` };
}
```

Add personality tags to every decision choice; use `overridePolicy: 'forbidden'` for identity, medical, crime, and consent-sensitive scenes.

- [ ] **Step 4: Route user answers through agency and show the result**

```js
// dist/engine/decisions.js
export function applyUserDecision(life, decisionId, requestedChoiceId) {
  const current = normalizeLife(life);
  const decision = DECISION_BY_ID[decisionId];
  const choices = getChoices(current, decisionId);
  const requested = choices.find((choice) => choice.id === requestedChoiceId);
  const resolution = resolveAgencyChoice(current, decision, requested, choices);
  return { ...resolution, life: applyDecision(current, decisionId, resolution.actualChoiceId) };
}
```

Pass `onAgencyOverride` into `createSimulationController`; call it after publishing the changed life. Add an accessible `#agency-dialog` with the requested choice, actual choice, and reason, then require an acknowledgement button before playback resumes.

Run: `npm test`

Expected: all tests PASS and 10,000 deterministic seeds yield an override rate within ±1.5 percentage points of the configured rate.

- [ ] **Step 5: Commit personality agency**

```bash
git add dist/engine/agency.js dist/engine/decisions.js dist/ui/controls.js dist/data/decisions*.js dist/app.js dist/index.html tests/agency.test.mjs tests/controller.test.mjs
git commit -m "feat: let strong personalities override some choices"
```

### Task 6: Conditional Korean Life Events and Appearance Evolution

**Files:**
- Modify: `dist/data/life-events.js`
- Modify: `dist/engine/events.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/controls.js`
- Create: `tests/profile-events.test.mjs`
- Modify: `tests/events-relationships.test.mjs`

**Interfaces:**
- Consumes: `event.when(life)`, `event.weightFor(life)`, `event.appearanceEffects`, and profile influence tags.
- Produces: condition-aware `selectAnnualEvents(life)` and evolving `life.profile.appearance`.

- [ ] **Step 1: Write failing condition-weight and evolution tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, eventWeight } from '../dist/engine/events.js';
import { LIFE_EVENT_BY_ID } from '../dist/data/life-events.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const academyEvent = LIFE_EVENT_BY_ID['academy-offer'];
const richSeoulLife = makeLifeAtAge(12, { profileInfluence: { modifiers: { 'education-access': 24 } } });
const tightRuralLife = makeLifeAtAge(12, { profileInfluence: { modifiers: { 'education-access': -18 } } });
const life = makeLifeAtAge(25, { profile: { appearance: { grooming: 50, socialRating: 55, skinTone: 'medium' } } });

test('가정형편과 지역은 교육 사건 가중치를 바꾼다', () => {
  assert.ok(eventWeight(richSeoulLife, academyEvent) > eventWeight(tightRuralLife, academyEvent));
});

test('외모 관련 사건은 외모를 변화시키고 인종 점수는 건드리지 않는다', () => {
  const changed = applyEvent(life, 'fitness-routine');
  assert.ok(changed.profile.appearance.grooming > life.profile.appearance.grooming);
  assert.equal(changed.profile.appearance.skinTone, life.profile.appearance.skinTone);
});
```

- [ ] **Step 2: Run profile event tests and verify failure**

Run: `node --test tests/profile-events.test.mjs`

Expected: FAIL because conditional event weights and appearance effects are not implemented.

- [ ] **Step 3: Add Korean condition-linked event families**

```js
export const PROFILE_EVENTS = [
  { id: 'academy-offer', ageRange: [8, 17], weight: 1, tags: ['education'], weightFor: (life) => 1 + Math.max(0, getInfluenceModifier(life, 'education-access')) / 12, text: '주변 친구들이 다니는 학원을 권유받았습니다.' },
  { id: 'appearance-ranking', ageRange: [12, 24], weight: 0.8, tags: ['appearance'], text: '외모를 순위처럼 말하는 분위기에 놓였습니다.' },
  { id: 'fitness-routine', ageRange: [16, 60], weight: 0.7, tags: ['appearance', 'health'], appearanceEffects: { grooming: 4, socialRating: 1 }, text: '운동을 꾸준히 하며 체형과 자세가 달라졌습니다.' },
  { id: 'access-barrier', ageRange: [7, 75], weight: 0.5, when: (life) => Boolean(life.profile.disability), tags: ['accessibility'], text: '접근하기 어려운 시설 때문에 계획을 바꾸어야 했습니다.' },
];
```

Use this exact stage inventory so every stage has at least four distinct condition-aware events:

```js
const CONDITION_EVENT_IDS = {
  childhood: ['academy-offer', 'after-school-gap', 'appearance-ranking', 'access-support'],
  youth: ['school-status', 'regional-field-trip', 'fitness-routine', 'appearance-pressure', 'entrance-coaching'],
  youngAdult: ['capital-move', 'interview-bias', 'first-studio', 'military-gap', 'campus-network'],
  adult: ['workplace-hierarchy', 'housing-rate-shock', 'care-burden', 'style-investment', 'discrimination-response'],
  midlife: ['retraining-access', 'parent-care', 'business-network', 'appearance-aging', 'regional-return'],
  senior: ['pension-gap', 'accessible-housing', 'community-support', 'health-routine', 'inheritance-conflict'],
};
```

Implement each id as an event object with its named theme, a stage-appropriate `ageRange`, a Korean `text`, and either `when`, `weightFor`, `effects`, `economyEffects`, or `appearanceEffects`. Avoid any event that defines success directly from region, race, sex, or disability.

- [ ] **Step 4: Apply conditional weights and yearly appearance aging**

```js
export function eventWeight(life, event) {
  if (typeof event.when === 'function' && !event.when(life)) return 0;
  const multiplier = typeof event.weightFor === 'function' ? event.weightFor(life) : 1;
  return Math.max(0, Number(event.weight) * Number(multiplier));
}
```

Use `eventWeight` inside `selectAnnualEvents`, apply `appearanceEffects` in `applyEvent`, and call `advanceAppearance` exactly once after every successful yearly tick.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit condition-linked life events**

```bash
git add dist/data/life-events.js dist/engine/events.js dist/engine/life.js dist/ui/controls.js tests/profile-events.test.mjs tests/events-relationships.test.mjs
git commit -m "feat: connect birth conditions to Korean life events"
```

### Task 7: Investments, Gambling, Lottery, and Entrepreneurship

**Files:**
- Create: `dist/data/financial-paths.js`
- Create: `dist/data/decisions-finance.js`
- Create: `dist/engine/finance.js`
- Create: `dist/engine/business.js`
- Modify: `dist/data/decisions.js`
- Modify: `dist/engine/economy.js`
- Modify: `dist/engine/decisions.js`
- Modify: `dist/ui/controls.js`
- Create: `tests/finance-paths.test.mjs`
- Create: `tests/business.test.mjs`
- Modify: `tests/career-economy.test.mjs`

**Interfaces:**
- Consumes: v4 `economy.assets`, yearly state, personality, and decision effects.
- Produces: `applyFinancialAction(life, action)`, `advancePortfolio(life)`, `startBusiness(life, plan)`, and `advanceBusiness(life)`.

- [ ] **Step 1: Write failing asset, lottery, and business outcome tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePortfolio, resolveLottery } from '../dist/engine/finance.js';
import { resolveBusinessYear } from '../dist/engine/business.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const investedLife = makeLifeAtAge(35, {
  economy: { assets: { deposits: 10000000, bonds: 10000000, stocks: 10000000, crypto: 10000000, businessEquity: 0 } },
});
const business = { status: 'operating', sector: 'food', capital: 50000000, debt: 10000000, equity: 50000000, years: 3 };

test('채권은 주식과 가상자산보다 변동폭이 작다', () => {
  const calm = advancePortfolio(investedLife, { marketRoll: 0.01 });
  assert.ok(Math.abs(calm.economy.lastReturns.bonds) < Math.abs(calm.economy.lastReturns.crypto));
});

test('복권은 희귀한 대박과 대부분의 손실을 모두 재현한다', () => {
  assert.ok(resolveLottery(0.9999999, 10000).payout >= 1000000000);
  assert.equal(resolveLottery(0.5, 10000).payout, 0);
});

test('창업은 폐업과 큰 사업 매각 경로를 모두 가진다', () => {
  assert.equal(resolveBusinessYear(business, { demand: 0, execution: 0 }).status, 'closed');
  assert.ok(resolveBusinessYear(business, { demand: 1, execution: 1 }).equity > 1000000000);
});
```

- [ ] **Step 2: Run finance tests and verify missing modules**

Run: `node --test tests/finance-paths.test.mjs tests/business.test.mjs`

Expected: FAIL because finance and business modules do not exist.

- [ ] **Step 3: Implement separated asset buckets and deterministic market regimes**

```js
export const ASSET_MODELS = {
  deposits: { annualMean: 0.025, volatility: 0.005 },
  bonds: { annualMean: 0.035, volatility: 0.035 },
  stocks: { annualMean: 0.075, volatility: 0.24 },
  crypto: { annualMean: 0.16, volatility: 0.75, availableFromYear: 2010 },
};

export function compoundAsset(value, model, marketRoll) {
  const centered = (Math.max(0, Math.min(1, marketRoll)) * 2) - 1;
  return Math.max(0, Math.round(value * (1 + model.annualMean + centered * model.volatility)));
}

export function resolveLottery(roll, stake) {
  if (roll >= 0.999999) return { payout: Math.max(1_000_000_000, stake * 100_000), tier: 'jackpot' };
  if (roll >= 0.995) return { payout: stake * 50, tier: 'minor' };
  return { payout: 0, tier: 'none' };
}
```

Make crypto unavailable before 2010, reject stakes above available cash, and record every action in `economy.transactions`.

- [ ] **Step 4: Add financial decisions and yearly business progression**

```js
export function startBusiness(life, plan) {
  if (plan.capital > life.economy.cash) throw new RangeError('창업 자금이 부족합니다.');
  return normalizeLife({
    ...life,
    economy: { ...life.economy, cash: life.economy.cash - plan.capital },
    business: { status: 'operating', sector: plan.sector, capital: plan.capital, debt: plan.debt ?? 0, equity: plan.capital, years: 0 },
  });
}
```

Add adult decisions for savings/bonds, domestic or overseas stocks, crypto, lottery, gambling temptation, property, and startup. Choices must include personality tags and display the fictional-investment notice. Run `advancePortfolio` and `advanceBusiness` exactly once per controller year before `calculateAnnualEconomy` recomputes net worth.

Run: `npm test`

Expected: all tests PASS and seeded simulations contain reachable jackpot, billion-won business sale, gambling debt, market crash, and stable bond outcomes.

- [ ] **Step 5: Commit expanded economy paths**

```bash
git add dist/data/financial-paths.js dist/data/decisions-finance.js dist/data/decisions.js dist/engine/finance.js dist/engine/business.js dist/engine/economy.js dist/engine/decisions.js dist/ui/controls.js tests/finance-paths.test.mjs tests/business.test.mjs tests/career-economy.test.mjs
git commit -m "feat: add investing gambling lottery and startup paths"
```

### Task 8: Rendering, Summary, Accessibility, and End-to-End Verification

**Files:**
- Modify: `dist/ui/render.js`
- Modify: `dist/engine/summary.js`
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Modify: `dist/app.js`
- Modify: `tests/render.test.mjs`
- Modify: `tests/full-life.test.mjs`
- Modify: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: complete v4 life, agency history entries, expanded economy, and evolving appearance.
- Produces: profile/appearance/asset view models, causal life summary, and deployable static UI.

- [ ] **Step 1: Write failing view-model and full-life assertions**

```js
import { createLifeViewModel } from '../dist/ui/render.js';
import { createLifeSummary } from '../dist/engine/summary.js';
import { makeLifeAtAge } from './support/life-fixtures.mjs';

const v4Life = makeLifeAtAge(38, {
  economy: { assets: { deposits: 10000000, bonds: 5000000, stocks: 18000000, crypto: 3000000, businessEquity: 0 } },
});
const completedV4Life = makeLifeAtAge(90, {
  status: 'review',
  history: [{ id: 'sale', age: 44, year: 2070, type: 'event', text: '창업한 회사를 매각했습니다.', label: '창업 회사 매각' }],
});

test('삶 화면은 외모 성격 자산 사업을 표시한다', () => {
  const view = createLifeViewModel(v4Life);
  assert.match(view.appearance, /상|체형|스타일/);
  assert.ok(view.personality.length > 0);
  assert.ok(view.assets.some((asset) => asset.label === '주식'));
});

test('요약은 출생 조건과 주요 경제 전환점을 설명한다', () => {
  const summary = createLifeSummary(completedV4Life);
  assert.ok(summary.influences.length >= 3);
  assert.ok(summary.turningPoints.some((item) => /창업|주식|복권|가상자산/.test(item.label)));
});
```

- [ ] **Step 2: Run render and full-life tests and verify failure**

Run: `node --test tests/render.test.mjs tests/full-life.test.mjs tests/markup.test.mjs`

Expected: FAIL because new view-model and summary fields are absent.

- [ ] **Step 3: Render new state without exposing raw object values**

```js
export function createLifeViewModel(life) {
  return {
    // preserve existing fields
    appearance: life.profile.appearance?.description ?? '외모 정보 없음',
    personality: life.profile.personality?.label ?? '혼합 성향',
    assets: [
      ['예금', life.economy.assets.deposits], ['채권', life.economy.assets.bonds],
      ['주식', life.economy.assets.stocks], ['가상자산', life.economy.assets.crypto],
      ['사업 지분', life.economy.assets.businessEquity],
    ].map(([label, value]) => ({ label, value: formatWon(value) })),
  };
}
```

Add compact profile chips and expandable asset details to the life sidebars. Show the fictional-data and fictional-investment notices near the relevant controls.

- [ ] **Step 4: Add causal summary and run full verification**

```js
const influenceLabels = {
  'education-access': '가정과 지역의 교육 접근성',
  'financial-buffer': '출생 가정의 경제적 안전망',
  'housing-pressure': '거주 지역의 주거 부담',
  'first-impression': '외모지상주의가 만든 첫인상 효과',
};

summary.influences = Object.entries(life.profileInfluence.modifiers)
  .filter(([, value]) => Math.abs(value) >= 5)
  .map(([id, value]) => ({ id, label: influenceLabels[id], direction: value > 0 ? '유리' : '불리' }));
```

Run: `npm test`

Expected: all tests PASS.

Run a local static server from `dist`, then verify at 1440×900, 390×844, and 360×740:

```bash
python3 -m http.server 4173 --directory dist
```

Expected: slot and primary actions fit without page-level scroll; keyboard can spin, reroll, accept, choose, acknowledge an override, and resume; reduced motion removes reel animation; one complete life reaches the result screen; browser console has no errors.

- [ ] **Step 5: Commit the completed experience**

```bash
git add dist/ui/render.js dist/engine/summary.js dist/index.html dist/styles.css dist/app.js tests/render.test.mjs tests/full-life.test.mjs tests/markup.test.mjs
git commit -m "feat: finish condition-driven life simulation experience"
```

### Task 9: Deployment Verification

**Files:**
- Modify only if required by a verified failure: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: committed `dist` output on `main`.
- Produces: a green GitHub Pages workflow and a publicly accessible updated site.

- [ ] **Step 1: Verify repository cleanliness and test suite**

```bash
git status --short
npm test
```

Expected: clean status and all tests PASS.

- [ ] **Step 2: Push the completed commits**

```bash
git push origin main
```

Expected: push succeeds without force.

- [ ] **Step 3: Verify GitHub Pages deployment**

```bash
gh run list --workflow pages.yml --limit 1
gh run watch --exit-status
```

Expected: latest Pages run completes with `success`.

- [ ] **Step 4: Verify the public artifact**

Open `https://kev208dev.github.io/1in50M/` and confirm the served HTML contains `slot-spin-button`, then complete one spin and start a life.

Expected: the public page shows the new slot UI and begins a v4 life without console errors.

- [ ] **Step 5: Record the deployed revision**

```bash
git rev-parse HEAD
git status --short
```

Expected: a concrete deployed commit SHA and an empty status.
