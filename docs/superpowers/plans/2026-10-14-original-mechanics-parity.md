# Original Mechanics Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the complete original-style life loop for the Korean simulator, including automatic continuation after choices, birth settings, companion lives, mortality/reflections, one-screen parity UI, and anonymous realtime community features.

**Architecture:** Preserve the existing deterministic life, education, career, finance, business, appearance, agency, and relationship modules. Add focused modules for runtime settings, mortality/reflection, companion lives, and an online adapter whose Supabase and offline implementations share one interface; keep the static GitHub Pages build functional without backend configuration.

**Tech Stack:** Native ES modules, semantic HTML, CSS, Node test runner, browser localStorage, optional Supabase JavaScript client and Realtime Presence, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-14-original-mechanics-parity-design.md`

## Global Constraints

- Do not copy the original site's source code, assets, long-form copy, or proprietary graphics.
- Keep all non-statistical values labelled as `체험용 가상 시뮬레이션`.
- Do not store real names, contact information, or exact addresses in the public backend.
- Keep the existing palette and font stack.
- Preserve deterministic results for the same seed and choices.
- The entire single-player loop must work when Supabase is unavailable or unconfigured.
- Every public database table must have RLS enabled with least-privilege grants.

## Review Focus

- A user who manually paused before a decision must remain paused after answering.
- An agency-override or reflection overlay must prevent time from advancing behind it and resume only after acknowledgement.
- A hidden tab must not catch up elapsed years when it becomes visible again.
- Invalid or absent Supabase configuration must fall back locally without an unhandled rejection.
- Public archive rows must exclude complete profile/state payloads and be writable only by their owner.

---

### Task 1: Automatic continuation and complete playback controls

**Files:**
- Modify: `dist/ui/controls.js`
- Modify: `dist/app.js`
- Modify: `dist/index.html`
- Test: `tests/controller.test.mjs`
- Test: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `createSimulationController({ clock, initialLife, onDecision, onAgencyOverride })`
- Produces: `answerDecision(choiceId): { life, awaitingAcknowledgement }`, `acknowledgeInterruption(): Life`, 12× playback support.

- [ ] **Step 1: Write failing controller tests**

```js
test('재생 중 결정에 답하면 기존 배속으로 자동 재생한다', () => {
  const clock = fakeClock();
  const controller = createSimulationController({ clock, initialLife: makeLifeAtAge(15) });
  controller.play();
  controller.answerDecision('vocational');
  assert.equal(controller.isPlaying(), true);
  clock.advance(8000);
  assert.equal(controller.getState().age, 16);
});

test('직접 정지한 상태의 결정은 답한 뒤에도 정지한다', () => {
  const controller = createSimulationController({ initialLife: makeLifeAtAge(15) });
  controller.answerDecision('vocational');
  assert.equal(controller.isPlaying(), false);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/controller.test.mjs`
Expected: FAIL because an answered decision never restores playback.

- [ ] **Step 3: Implement interruption state and 12×**

Track whether playback was active before `setPendingDecision()`, restore it after a normal answer, and defer restoration until `acknowledgeInterruption()` for agency/identity/reflection overlays. Add `12: 667` to playback intervals and a `12×` button.

- [ ] **Step 4: Run focused and markup tests**

Run: `node --test tests/controller.test.mjs tests/markup.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/ui/controls.js dist/app.js dist/index.html tests/controller.test.mjs tests/markup.test.mjs
git commit -m "fix: resume life after interrupted choices"
```

### Task 2: Runtime settings, detailed birth certificate, and companion lives

**Files:**
- Create: `dist/data/runtime-settings.js`
- Create: `dist/engine/companions.js`
- Modify: `dist/engine/birth-slot.js`
- Modify: `dist/ui/birth-slot.js`
- Modify: `dist/index.html`
- Modify: `dist/app.js`
- Test: `tests/runtime-settings.test.mjs`
- Test: `tests/companions.test.mjs`
- Test: `tests/birth-slot-ui.test.mjs`

**Interfaces:**
- Produces: `normalizeRuntimeSettings(input)`, `tickInterval(settings, speed)`, `createCompanionLives(profile, seed, count = 4)`, `advanceCompanionLives(companions, targetAge)`.
- Consumes: `createBirthSlotResult(seed, year)`, `profileFromSlotResult(result)`.

- [ ] **Step 1: Write deterministic settings and companion tests**

```js
assert.equal(normalizeRuntimeSettings({ durationMinutes: 60 }).durationMinutes, 60);
assert.equal(tickInterval({ durationMinutes: 30 }, 1), 20000);
assert.deepEqual(createCompanionLives(profile, 'peer-seed'), createCompanionLives(profile, 'peer-seed'));
assert.equal(createCompanionLives(profile, 'peer-seed').length, 4);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/runtime-settings.test.mjs tests/companions.test.mjs`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement modules and birth UI**

Add era, duration, comparison, music, and auto-decision settings; enrich the certificate with family/parent/home/appearance/personality/lifespan; render four clearly labelled fictional companion lives.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/runtime-settings.test.mjs tests/companions.test.mjs tests/birth-slot.test.mjs tests/birth-slot-ui.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/data/runtime-settings.js dist/engine/companions.js dist/engine/birth-slot.js dist/ui/birth-slot.js dist/index.html dist/app.js tests/runtime-settings.test.mjs tests/companions.test.mjs tests/birth-slot-ui.test.mjs
git commit -m "feat: add original-style birth setup and peer lives"
```

### Task 3: Mortality, survival curve, scenes, and reflections

**Files:**
- Create: `dist/engine/mortality.js`
- Create: `dist/data/reflections.js`
- Modify: `dist/engine/life.js`
- Modify: `dist/ui/controls.js`
- Modify: `dist/ui/render.js`
- Modify: `dist/index.html`
- Test: `tests/mortality.test.mjs`
- Test: `tests/reflections.test.mjs`
- Test: `tests/life-engine.test.mjs`

**Interfaces:**
- Produces: `annualMortalityRisk(life)`, `evaluateSurvival(life)`, `survivalCurve(life)`, `getReflection(life)`, `applyReflection(life, choiceId)`.
- Consumes: deterministic life seed, health and history.

- [ ] **Step 1: Write failing mortality and reflection tests**

```js
assert.ok(annualMortalityRisk(makeLifeAtAge(80)) > annualMortalityRisk(makeLifeAtAge(30)));
assert.deepEqual(evaluateSurvival(life), evaluateSurvival(life));
assert.equal(getReflection(makeLifeAtAge(30)).age, 30);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/mortality.test.mjs tests/reflections.test.mjs`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement deterministic survival and reflection interruptions**

Evaluate non-graphic annual mortality after yearly effects, end a life at its actual age, render the survival curve, and interrupt at ages 5, 15, 30, 50, and 70 without advancing behind the dialog.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/mortality.test.mjs tests/reflections.test.mjs tests/life-engine.test.mjs tests/controller.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/engine/mortality.js dist/data/reflections.js dist/engine/life.js dist/ui/controls.js dist/ui/render.js dist/index.html tests/mortality.test.mjs tests/reflections.test.mjs tests/life-engine.test.mjs
git commit -m "feat: add mortality and life reflections"
```

### Task 4: One-screen original-style simulation workspace

**Files:**
- Modify: `dist/index.html`
- Modify: `dist/styles.css`
- Modify: `dist/ui/render.js`
- Modify: `dist/app.js`
- Test: `tests/markup.test.mjs`
- Test: `tests/render.test.mjs`

**Interfaces:**
- Consumes: life, companions, survival curve, runtime settings.
- Produces: responsive panels for current scene, history, profile, economy, family, peer lives, survival, and sources.

- [ ] **Step 1: Add failing structural tests**

```js
for (const id of ['live-counters', 'birth-settings', 'companion-lives', 'survival-curve', 'community-view', 'memorial-view']) {
  assert.match(html, new RegExp(`id=["']${id}["']`));
}
assert.match(css, /height:\s*calc\(100(?:svh|dvh)/);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/markup.test.mjs tests/render.test.mjs`
Expected: FAIL because parity panels are missing.

- [ ] **Step 3: Implement viewport workspace and compact mobile panel switching**

Keep playback and the current moment visible, use an overflow-safe desktop grid, and replace the mobile vertical dashboard with labelled panel tabs while preserving keyboard access.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/markup.test.mjs tests/render.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/index.html dist/styles.css dist/ui/render.js dist/app.js tests/markup.test.mjs tests/render.test.mjs
git commit -m "feat: rebuild simulation as one-screen workspace"
```

### Task 5: Offline-first community adapter

**Files:**
- Create: `dist/community.js`
- Create: `dist/data/community-samples.js`
- Modify: `dist/storage.js`
- Modify: `dist/app.js`
- Modify: `dist/ui/render.js`
- Test: `tests/community.test.mjs`
- Test: `tests/life-storage-summary.test.mjs`

**Interfaces:**
- Produces: `createCommunityClient(config)`, with `connectPresence()`, `listPublicLives()`, `publishLife(summary)`, `hideLife(id)`, `subscribe(callback)`, and `destroy()`.
- Consumes: public-safe `createLifeSummary(life)` output reduced by `toPublicLife(summary)`.

- [ ] **Step 1: Write failing offline and privacy tests**

```js
const client = createCommunityClient({});
assert.equal((await client.listPublicLives()).length > 0, true);
assert.equal((await client.connectPresence()).mode, 'offline');
assert.equal('profile' in toPublicLife(summary), false);
assert.equal('history' in toPublicLife(summary), false);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/community.test.mjs tests/life-storage-summary.test.mjs`
Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement resilient local and Supabase adapters**

Load the Supabase client only when a URL and publishable key are present. Catch network/auth failures, report offline mode, keep sample community and local archives available, and never publish full state.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/community.test.mjs tests/life-storage-summary.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/community.js dist/data/community-samples.js dist/storage.js dist/app.js dist/ui/render.js tests/community.test.mjs tests/life-storage-summary.test.mjs
git commit -m "feat: add offline-first public life archive"
```

### Task 6: Supabase schema, RLS, and realtime presence

**Files:**
- Create: `supabase/migrations/20261014000000_public_lives.sql`
- Create: `dist/config.example.js`
- Modify: `dist/index.html`
- Modify: `dist/community.js`
- Test: `tests/community.test.mjs`
- Test: `tests/supabase-schema.test.mjs`

**Interfaces:**
- Produces: `public.public_lives` and `public.life_reactions` with owner-bound writes and public-safe reads; Presence channel `one-in-50m:visitors`.
- Consumes: anonymous Auth user ID and browser-safe publishable key only.

- [ ] **Step 1: Write failing schema assertions**

```js
assert.match(sql, /enable row level security/i);
assert.match(sql, /auth\.uid\(\)\s*=\s*owner_id/i);
assert.doesNotMatch(sql, /service_role/i);
assert.doesNotMatch(sql, /profile\s+jsonb|history\s+jsonb/i);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/supabase-schema.test.mjs tests/community.test.mjs`
Expected: FAIL because the migration and configured adapter do not exist.

- [ ] **Step 3: Implement and apply the least-privilege schema**

Create public-safe columns, timestamps, hidden flag, strict grants, RLS policies for public reads and owner insert/update, anonymous authentication, and low-frequency Presence. Apply it to the connected project only after inspecting current tables.

- [ ] **Step 4: Verify database and advisors**

Run: `node --test tests/supabase-schema.test.mjs tests/community.test.mjs`
Expected: PASS. Then query one inserted owner row, verify a different user cannot update it, and run Supabase security and performance advisors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261014000000_public_lives.sql dist/config.example.js dist/index.html dist/community.js tests/community.test.mjs tests/supabase-schema.test.mjs
git commit -m "feat: connect anonymous realtime community"
```

### Task 7: End-to-end regression, responsive verification, and publication

**Files:**
- Modify: `README.md` if deployment configuration needs documentation
- Modify: implementation files only when a failing verification identifies a concrete defect
- Test: all files under `tests/`

**Interfaces:**
- Consumes: all previous task interfaces.
- Produces: deployable `dist/` artifact and verified GitHub Pages release.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`
Expected: every test passes with no skipped tests and no unhandled rejection.

- [ ] **Step 2: Serve and verify desktop flow**

Run: `python3 -m http.server 4173 -d dist`
Expected: at 1440×900, draw a birth, accept, start playback, answer a decision, observe age continue automatically, reach a reflection, and finish a life without console errors.

- [ ] **Step 3: Verify responsive layouts**

Use viewports 360×800 and 768×1024.
Expected: playback and current moment remain visible, every panel is reachable, and no dialog is clipped or forces horizontal page scrolling.

- [ ] **Step 4: Verify offline and online modes**

Expected: without config the site shows offline/sample status and remains playable; with config two browser sessions synchronize the presence count and a newly published life appears in both archives.

- [ ] **Step 5: Commit and publish**

```bash
git add README.md dist tests supabase docs/superpowers
git commit -m "feat: complete original-style Korean life simulator"
git push origin HEAD:main
```

Expected: GitHub Pages deploys successfully and `https://kev208dev.github.io/1in50M/` loads the new build.
