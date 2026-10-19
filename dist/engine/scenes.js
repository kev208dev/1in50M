import { SCENE_FAMILIES, SCENE_FAMILY_BY_ID, SCENE_EVENT_BY_ID } from '../data/scenes/index.js';
import { sceneId } from '../data/scenes/define.js';

const inYears = (range, year) => !range || (year >= range[0] && year <= (range[1] ?? 9999));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const statOf = (life, key) => (Number.isFinite(Number(life?.stats?.[key])) ? Number(life.stats[key]) : 50);

function sceneHistory(life) {
  return (life?.history ?? []).filter((entry) => entry?.sceneFamily);
}

function lastAgeOf(life, familyId) {
  let last = null;
  for (const entry of sceneHistory(life)) if (entry.sceneFamily === familyId) last = entry.age;
  return last;
}

function usedSituations(life, familyId) {
  return new Set(sceneHistory(life).filter((entry) => entry.sceneFamily === familyId).map((entry) => entry.situationIndex));
}

function usedOutcomes(life, familyId) {
  return new Set(sceneHistory(life).filter((entry) => entry.sceneFamily === familyId).map((entry) => entry.outcomeIndex));
}

function openSituations(life, family) {
  const used = usedSituations(life, family.id);
  return family.situations
    .map((situation, index) => ({ situation, index }))
    .filter(({ situation, index }) => !used.has(index)
      && inYears(situation.years, life.year)
      && (!situation.when || situation.when(life)));
}

export function familyEligible(life, family, exclude = new Set()) {
  if (exclude.has(family.id)) return false;
  if (life.age < family.ageRange[0] || life.age > family.ageRange[1]) return false;
  if (!inYears(family.years, life.year)) return false;
  if (family.when && !family.when(life)) return false;
  const last = lastAgeOf(life, family.id);
  if (last !== null && life.age - last < family.cooldown) return false;
  return openSituations(life, family).length > 0;
}

export function eligibleSceneFamilies(life, exclude = new Set()) {
  return SCENE_FAMILIES.filter((family) => familyEligible(life, family, exclude));
}

/** 능력치가 높을수록 좋은 결과가, 몸과 마음이 지쳐 있을수록 나쁜 결과가 나오기 쉽다. */
export function toneWeights(life, family) {
  const primary = statOf(life, family.primary);
  const strain = (statOf(life, 'health') < 40 ? 0.25 : 0) + (statOf(life, 'happiness') < 35 ? 0.2 : 0);
  return {
    good: clamp(0.85 + (primary - 55) / 70, 0.25, 1.5),
    mixed: 0.75,
    bad: clamp(0.5 - (primary - 55) / 110 + strain, 0.12, 1.1),
  };
}

function weightedPick(rng, items, weightOf) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return items[0] ?? null;
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= Math.max(0, weightOf(item));
    if (roll < 0) return item;
  }
  return items.at(-1) ?? null;
}

/** 계열 하나를 골라 아직 겪지 않은 상황과, 지금 상태에 맞는 결과를 묶어 사건 하나를 만든다. */
export function pickScene(life, rng, exclude = new Set()) {
  const families = eligibleSceneFamilies(life, exclude);
  if (families.length === 0) return null;
  const family = weightedPick(rng, families, (item) => item.weight);
  const situations = openSituations(life, family);
  const { index: situationIndex } = situations[Math.floor(rng.next() * situations.length)];
  const weights = toneWeights(life, family);
  const used = usedOutcomes(life, family.id);
  const outcomes = family.outcomes.map((outcome, index) => ({ outcome, index }));
  const fresh = outcomes.filter(({ index }) => !used.has(index));
  const pool = fresh.length >= 2 ? fresh : outcomes;
  const { index: outcomeIndex } = weightedPick(rng, pool, ({ outcome }) => weights[outcome.tone]);
  return SCENE_EVENT_BY_ID[sceneId(family.id, situationIndex, outcomeIndex)] ?? null;
}

export function sceneFamilyOf(eventId) {
  const event = SCENE_EVENT_BY_ID[eventId];
  return event ? SCENE_FAMILY_BY_ID[event.family] : null;
}
