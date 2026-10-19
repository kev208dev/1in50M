import { LIFE_EVENTS, LIFE_EVENT_BY_ID } from '../data/life-events.js';
import { SCENE_EVENT_BY_ID } from '../data/scenes/index.js';
import { createRng } from './random.js';
import { normalizeLife } from './life.js';
import { attractivenessLabel, describeAppearance } from './appearance.js';
import { appendTimeline } from './timeline.js';
import { applyDiminishingEffects } from './stat-effects.js';
import { pickScene } from './scenes.js';

const clamp = (value, min = 0, max = 100) => (
  Math.min(max, Math.max(min, Math.round(Number(value) || 0)))
);

// 한 해의 사건 중 장면 계열이 차지하는 비율. 나머지는 출생 조건과 연결된 기존 사건이다.
const SCENE_SHARE = 0.78;
const SECOND_EVENT_CHANCE = 0.3;

export function eventWeight(life, event) {
  if (!event || (typeof event.when === 'function' && !event.when(life))) return 0;
  const multiplier = typeof event.weightFor === 'function' ? event.weightFor(life) : 1;
  const value = Number(event.weight ?? 1) * Number(multiplier);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function eligibleLegacyEvents(current) {
  return LIFE_EVENTS.filter((event) => (
    current.age >= event.ageRange[0]
    && current.age <= event.ageRange[1]
    && (() => {
      // 같은 문장이 한 삶에서 다시 나오지 않도록, 기존 사건은 한 번씩만 일어난다.
      const previous = [...current.history].reverse().find((entry) => entry.eventId === event.id);
      if (previous) return Boolean(event.repeatable) && current.age - previous.age >= event.cooldownYears;
      return !current.recentEventIds.includes(event.id);
    })()
  )).map((event) => ({ ...event, weight: eventWeight(current, event) }))
    .filter((event) => event.weight > 0);
}

export function selectAnnualEvents(life) {
  const current = normalizeLife(life);
  const rng = createRng(`${current.seed}:events:${current.age}:${current.rngState}`);
  const legacy = eligibleLegacyEvents(current);
  const picked = [];
  const usedFamilies = new Set();
  const draw = () => {
    const preferScene = rng.next() < SCENE_SHARE;
    if (preferScene) {
      const scene = pickScene(current, rng, usedFamilies);
      if (scene) {
        usedFamilies.add(scene.family);
        return scene;
      }
    }
    const remaining = legacy.filter((event) => !picked.some((item) => item.id === event.id));
    if (remaining.length) return rng.weighted(remaining);
    const scene = pickScene(current, rng, usedFamilies);
    if (scene) usedFamilies.add(scene.family);
    return scene;
  };
  const first = draw();
  if (!first) return [];
  picked.push(first);
  if (rng.next() < SECOND_EVENT_CHANCE) {
    const second = draw();
    if (second && second.id !== first.id) picked.push(second);
  }
  return picked;
}

function applyMoney(economy, age, amount) {
  if (!amount) return economy;
  const next = { ...economy };
  if (age < 19) next.householdSupport = (Number(next.householdSupport) || 0) + amount;
  else next.cash = (Number(next.cash) || 0) + amount;
  return next;
}

function applySceneEvent(current, event) {
  const stats = applyDiminishingEffects(current, event.effects).stats;
  const economy = applyMoney(current.economy, current.age, event.cash);
  return normalizeLife(appendTimeline({
    ...current,
    stats,
    economy,
    recentEventIds: [...current.recentEventIds, event.id].slice(-10),
  }, [{
    id: `event-${current.age}-${event.id}`,
    age: current.age,
    year: current.year,
    priority: 40,
    type: 'event',
    eventId: event.id,
    sceneFamily: event.family,
    sceneDomain: event.domain,
    situationIndex: event.situationIndex,
    outcomeIndex: event.outcomeIndex,
    tone: event.tone,
    text: event.text,
  }]));
}

export function applyEvent(life, eventId) {
  const current = normalizeLife(life);
  const scene = SCENE_EVENT_BY_ID[eventId];
  if (scene) return applySceneEvent(current, scene);
  const event = LIFE_EVENT_BY_ID[eventId];
  if (!event) return current;
  const stats = applyDiminishingEffects(current, event.effects ?? {}).stats;
  let economy = { ...current.economy };
  for (const [key, amount] of Object.entries(event.economyEffects ?? {})) {
    if (key === 'cash') economy = applyMoney(economy, current.age, Number(amount) || 0);
    else if (key in economy) economy[key] += Number(amount) || 0;
  }
  let profile = current.profile;
  if (event.appearanceEffects && current.profile?.appearance) {
    const appearance = { ...current.profile.appearance };
    for (const [key, amount] of Object.entries(event.appearanceEffects)) {
      if (typeof appearance[key] === 'number') appearance[key] = clamp(appearance[key] + Number(amount));
    }
    appearance.attractivenessLabel = attractivenessLabel(appearance.socialRating);
    if (appearance.faceShape) appearance.description = describeAppearance(appearance);
    profile = { ...current.profile, appearance };
  }
  const conditions = structuredClone(current.conditions);
  for (const key of ['chronic', 'losses', 'care']) {
    if (event.conditionEffects?.[key]) {
      conditions[key] = [...new Set([...conditions[key], ...event.conditionEffects[key].map(String)])];
    }
  }
  const next = {
    ...current,
    profile,
    stats,
    economy,
    conditions,
    recentEventIds: [...current.recentEventIds, event.id].slice(-10),
    milestones: event.milestone
      ? [...current.milestones, { age: current.age, type: 'event', label: event.text }]
      : current.milestones,
  };
  return normalizeLife(appendTimeline(next, [{
      id: `event-${current.age}-${event.id}`,
      age: current.age,
      year: current.year,
      priority: 40,
      type: 'event',
      eventId: event.id,
      text: event.text,
  }]));
}
