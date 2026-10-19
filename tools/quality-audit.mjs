// 엄격한 품질 감사: 여러 삶을 실제 컨트롤러로 끝까지 돌려 보고, 기준을 넘는 문제를 모두 보고합니다.
// 사용법: node tools/quality-audit.mjs [삶 수=120]
// 기준을 하나라도 넘으면 종료 코드 1로 끝납니다.
import { createSimulationController } from '../dist/ui/controls.js';
import { createLife } from '../dist/engine/life.js';
import { getChoices, getDecision } from '../dist/engine/decisions.js';
import { createBirthSlotResult, profileFromSlotResult } from '../dist/engine/birth-slot.js';
import { createRng } from '../dist/engine/random.js';
import { createEventNotice } from '../dist/ui/big-event.js';
import * as c from '../dist/data/scenes/context.js';
import { PARTICLE_ARTIFACTS, particleMismatch } from '../dist/data/scenes/josa.js';
import { SCENE_EVENTS, DILEMMA_DECISIONS } from '../dist/data/scenes/index.js';

const N = Number(process.argv[2] || 120);
const YEARS = [1952, 1962, 1972, 1982, 1992, 2002, 2012, 2024, 2040, 2060];

// 문장에 나온 사람·장소·물건이 그 해 그 캐릭터의 현실과 맞는지 보는 규칙.
const CONTEXT_RULES = [
  { label: '일하지 않는데 직장 장면', test: /(출근|퇴근|팀장|사무실|회식|거래처|결재)/, ok: (l) => c.isWorking(l) || c.isRetired(l) },
  { label: '동반자가 없는데 동반자 장면', test: /(배우자|동반자|남편|(?<![가-힣])아내)/, ok: (l) => c.hasPartner(l) },
  { label: '자녀가 없는데 자녀 장면', test: /(?<!(친척|친구|이웃|조카|남의|옆집|동료) ?)(자녀|우리 아이|내 아이)/, ok: (l) => c.hasChildren(l) || l.age < 19 },
  { label: '형제자매가 없는데 형제 장면', test: /(형제|자매|남매|동생|언니|오빠|누나)/, ok: (l) => c.hasSiblings(l) || l.age >= 19 },
  { label: '부모가 없는데 부모 장면', test: /(?<!(조|친구의 |친구 |이웃 |동료의 |시|처|장인|장모))(부모님|어머니|아버지)/, ok: (l) => c.hasLivingParents(l) || l.age < 19 },
  { label: '시대보다 이른 스마트폰', test: /(스마트폰|앱으로|단체 대화방|카톡|영상통화)/, ok: (l) => l.year >= 2010 },
  { label: '시대보다 이른 휴대폰·인터넷', test: /(휴대폰|인터넷|이메일|PC방)/, ok: (l) => l.year >= 1995 },
  { label: '1996년 이후의 국민학교', test: /국민학교/, ok: (l) => l.year <= 1996 },
  { label: '1996년 이전의 초등학교', test: /초등학교/, ok: (l) => l.year >= 1996 },
  { label: '1994년 이전의 수능', test: /수능/, ok: (l) => l.year >= 1993 },
  { label: '이동 장애가 있는데 등산·달리기 장면', test: /(등산|산행|달리기|조깅|계주|이단 뛰기|줄넘기)/, ok: (l) => !c.hasMobilityDisability(l) },
  { label: '미성년의 돈벌이', test: /(월급|연봉|대출)/, ok: (l) => l.age >= 17 },
];

const THRESHOLDS = {
  dupTextsPerLife: 1.5,          // 같은 문장이 한 삶에서 다시 나오는 횟수(평균)
  contextViolationsPer100Lives: 15,
  particleArtifacts: 0,
  interruptionsPerYear: 0.62,    // 해마다 멈추는 팝업 수
  multiPopupYearsPerLife: 6,
  singleChoicePopupShare: 0.1,   // 고를 수 있는 선택지가 하나뿐인 팝업 비율
  statAt100Share: 0.35,          // 능력치 하나라도 100에 붙어 있는 해의 비율
  distinctEventShare: 0.9,       // 한 삶의 사건 문장 가운데 서로 다른 문장 비율
  medianQuietStretch: 9,         // 아무 팝업 없이 흘러가는 가장 긴 구간(중앙값, 년)
};

function run(seed, year) {
  const rng = createRng(`audit-pick:${seed}`);
  const profile = profileFromSlotResult(createBirthSlotResult(seed, year));
  const queue = [];
  const clock = { now: () => 0, schedule: (callback) => { queue.push(callback); return queue.length; }, cancel: () => {} };
  const interruptions = [];
  // Match the app: automatic notices update the feed; only an explicit open interrupts.
  const notices = createEventNotice((item) => interruptions.push({ age: item.age, kind: 'big', id: item.id ?? item.type }));
  const violations = [];
  let controller;
  let previous = null;
  let seenHistory = 0;
  const onDecision = (decision, life) => {
    const all = getChoices(life, decision.id);
    const enabled = all.filter((item) => item.enabled);
    if (!interruptions.some((item) => item.kind === 'decision' && item.age === life.age && item.id === decision.id)) interruptions.push({ age: life.age, kind: 'decision', id: decision.id, dilemma: Boolean(decision.dilemma), total: all.length, enabled: enabled.length });
    const pick = enabled[Math.floor(rng.next() * enabled.length)];
    queueMicrotask(() => { controller.answerDecision(pick.id); controller.acknowledgeInterruption?.(); controller.play(); });
  };
  const resume = (next) => {
    if (next.pendingIdentityDiscovery) {
      interruptions.push({ age: next.age, kind: 'identity' });
      const after = controller.acknowledgeIdentity();
      if (after.pendingDecisionId) onDecision(getDecision(after), after); else controller.play();
    } else if (next.pendingDecisionId) onDecision(getDecision(next), next);
    else controller.play();
  };
  controller = createSimulationController({
    clock,
    initialLife: createLife(profile, seed),
    onState: (state) => {
      notices.update(previous, state);
      previous = state;
      const fresh = state.history.slice(seenHistory);
      seenHistory = state.history.length;
      for (const entry of fresh) {
        if (entry.type !== 'event' || entry.age !== state.age) continue;
        for (const rule of CONTEXT_RULES) {
          if (rule.test.test(entry.text) && !rule.ok(state)) violations.push({ rule: rule.label, text: entry.text, age: state.age, year: state.year, id: entry.eventId });
        }
      }
    },
    onDecision,
    onIdentityDiscovery: (life) => {
      interruptions.push({ age: life?.age, kind: 'identity' });
      queueMicrotask(() => {
        const next = controller.acknowledgeIdentity();
        if (next.pendingDecisionId) onDecision(getDecision(next), next); else controller.play();
      });
    },
    onReflection: (reflection, life) => {
      interruptions.push({ age: life?.age ?? reflection.age, kind: 'reflection' });
      queueMicrotask(() => resume(controller.answerReflection(reflection.choices[0].id)));
    },
    onAgencyOverride: () => interruptions.push({ age: -1, kind: 'agency' }),
  });
  controller.play();
  let idle = 0;
  return new Promise((resolve) => {
    const step = () => {
      const state = controller.getState();
      if (state.status !== 'living') { resolve({ state, interruptions, violations }); return; }
      const callback = queue.shift();
      if (callback) { callback(); idle = 0; } else if (++idle > 2000) { resolve({ state, interruptions, violations, stuck: true }); return; }
      setImmediate(step);
    };
    step();
  });
}

const lives = [];
for (let index = 0; index < N; index += 1) {
  const year = YEARS[index % YEARS.length];
  lives.push({ year, ...(await run(`audit-${index}`, year)) });
}

const stats = ['health', 'happiness', 'knowledge', 'relationships'];
let duplicates = 0;
let distinctShareSum = 0;
let artifacts = [];
let popups = 0;
let livedYears = 0;
let multiYears = 0;
let decisionPopups = 0;
let singleChoice = 0;
let dilemmaPopups = 0;
const stretches = [];
const allViolations = [];
let statYears = 0;
let statAt100 = 0;
const toneCount = { good: 0, mixed: 0, bad: 0 };
const familySeen = new Set();
const textSeen = new Set();
const dupExamples = new Map();
const clusterKinds = new Map();
for (const life of lives) {
  const texts = life.state.history.filter((entry) => entry.type === 'event').map((entry) => entry.text);
  const unique = new Set(texts);
  duplicates += texts.length - unique.size;
  distinctShareSum += texts.length ? unique.size / texts.length : 1;
  const counts = {};
  for (const text of texts) counts[text] = (counts[text] ?? 0) + 1;
  for (const [text, count] of Object.entries(counts)) if (count > 1) dupExamples.set(text, (dupExamples.get(text) ?? 0) + 1);
  for (const entry of life.state.history) {
    const text = String(entry.text ?? '');
    if (PARTICLE_ARTIFACTS.test(text) || particleMismatch(text).length) artifacts.push(text);
    if (entry.tone) toneCount[entry.tone] += 1;
    if (entry.sceneFamily) familySeen.add(entry.sceneFamily);
    if (entry.type === 'event') textSeen.add(text);
  }
  const shown = life.interruptions.filter((item) => item.kind !== 'agency' && Number.isFinite(item.age));
  popups += shown.length;
  livedYears += Math.max(1, life.state.age);
  const byAge = {};
  for (const item of shown) byAge[item.age] = (byAge[item.age] ?? 0) + 1;
  multiYears += Object.values(byAge).filter((value) => value >= 2).length;
  const kindsByAge = {};
  for (const item of shown) (kindsByAge[item.age] ??= []).push(item.kind === 'decision' ? (item.dilemma ? 'dilemma' : item.id) : item.kind);
  for (const kinds of Object.values(kindsByAge)) if (kinds.length >= 2) {
    const key = kinds.sort().join('+');
    clusterKinds.set(key, (clusterKinds.get(key) ?? 0) + 1);
  }
  for (const item of shown.filter((entry) => entry.kind === 'decision')) {
    decisionPopups += 1;
    if (item.dilemma) dilemmaPopups += 1;
    if (item.enabled <= 1 && item.total >= 2) singleChoice += 1;
  }
  const ages = [...new Set(shown.map((item) => item.age))].sort((a, b) => a - b);
  let gap = 0;
  let last = 0;
  for (const age of [...ages, life.state.age]) { gap = Math.max(gap, age - last); last = age; }
  stretches.push(gap);
  allViolations.push(...life.violations);
  for (const point of life.state.statHistory ?? []) {
    statYears += 1;
    if (stats.some((key) => point[key] >= 100)) statAt100 += 1;
  }
}
stretches.sort((a, b) => a - b);

const metrics = {
  dupTextsPerLife: duplicates / N,
  contextViolationsPer100Lives: (allViolations.length / N) * 100,
  particleArtifacts: artifacts.length,
  interruptionsPerYear: popups / livedYears,
  multiPopupYearsPerLife: multiYears / N,
  singleChoicePopupShare: singleChoice / Math.max(1, decisionPopups),
  statAt100Share: statAt100 / Math.max(1, statYears),
  distinctEventShare: distinctShareSum / N,
  medianQuietStretch: stretches[N >> 1],
};

const ages = lives.map((life) => life.state.age).sort((a, b) => a - b);
const causes = {};
for (const life of lives) causes[life.state.endedReason ?? '?'] = (causes[life.state.endedReason ?? '?'] ?? 0) + 1;
console.log(`장면 사건 ${SCENE_EVENTS.length.toLocaleString()}종 · 딜레마 ${DILEMMA_DECISIONS.length.toLocaleString()}종`);
console.log(`삶 ${N}개 · 사망 나이 중앙값 ${ages[N >> 1]} · 사인 ${JSON.stringify(causes)}${lives.some((life) => life.stuck) ? ' · 멈춘 삶 있음!' : ''}`);
console.log(`실제로 등장한 장면 계열 ${familySeen.size}개 · 서로 다른 사건 문장 ${textSeen.size.toLocaleString()}개 · 결과 톤 ${JSON.stringify(toneCount)}`);
const diagnosed = { event: 0, screening: 0, any: 0 };
for (const life of lives) {
  if (life.state.history.some((entry) => entry.eventId === 'cardiovascular-diagnosis')) diagnosed.event += 1;
  if (life.state.decisions?.['midlife-health-screening']) diagnosed.screening += 1;
  if ((life.state.conditions?.chronic ?? []).includes('cardiovascular')) diagnosed.any += 1;
}
console.log(`심혈관 진단 경로 ${JSON.stringify(diagnosed)}`);
console.log(`결정 팝업/삶 ${(decisionPopups / N).toFixed(1)} (딜레마 ${(dilemmaPopups / N).toFixed(1)})`);
let failed = false;
for (const [key, limit] of Object.entries(THRESHOLDS)) {
  const value = metrics[key];
  const higherIsBetter = key === 'distinctEventShare';
  const bad = higherIsBetter ? value < limit : value > limit;
  if (bad) failed = true;
  console.log(`${bad ? '✗' : '✓'} ${key.padEnd(30)} ${Number(value).toFixed(3).padStart(8)}  (기준 ${higherIsBetter ? '≥' : '≤'} ${limit})`);
}
if (allViolations.length) {
  const grouped = {};
  for (const item of allViolations) (grouped[item.rule] ??= []).push(item);
  console.log('\n맥락 위반');
  for (const [rule, items] of Object.entries(grouped)) {
    console.log(`  ${rule} ${items.length}건`);
    for (const item of items.slice(0, 4)) console.log(`    ${item.year}년 ${item.age}세 [${item.id}] ${item.text}`);
  }
}
if (artifacts.length) console.log('\n조사 오류', [...new Set(artifacts)].slice(0, 10));
const topDup = [...dupExamples.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
if (topDup.length) console.log('\n자주 반복되는 문장', topDup.map(([text, count]) => `${count}× ${text}`));
const topClusters = [...clusterKinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
if (topClusters.length) console.log('\n한 해에 겹친 팝업', topClusters.map(([key, count]) => `${count}× ${key}`));
process.exit(failed ? 1 : 0);
