import { HISTORY_EVENTS } from '../data/history-events.js';
import { FUTURE_EVENTS } from '../data/future-events.js';
import { createRng } from './random.js';
import { appendTimeline } from './timeline.js';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const finite = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;

export function eligibleEraEvents(life, currentYear = new Date().getFullYear()) {
  const events = life.year > currentYear ? FUTURE_EVENTS : HISTORY_EVENTS;
  const occurred = Array.isArray(life.eraEventIds) ? life.eraEventIds : [];
  return events.filter((event) => life.year >= event.startYear
    && life.year <= event.endYear
    && life.age >= event.ageRange[0]
    && life.age <= event.ageRange[1]
    && !occurred.includes(event.id)
    && (!event.when || event.when(life)));
}

export function selectEraEvent(life, currentYear = new Date().getFullYear()) {
  const candidates = eligibleEraEvents(life, currentYear).map((event) => ({
    ...event,
    weight: Math.max(0, Number(event.weight ?? 1) * Number(event.weightFor?.(life) ?? 1)),
  }));
  if (!candidates.length) return null;
  const rng = createRng(`${life.seed}:era-event:${life.year}:${life.rngState}`);
  return rng.weighted(candidates);
}

export function resolveEraNarrative(event, life) {
  if (!event) return null;
  const working = ['employed', 'part-time', 'self-employed'].includes(life?.career?.status);
  const sceneKey = Number(life?.age) < 18 ? 'child' : working ? 'worker' : 'adult';
  const scene = event.scenes?.[sceneKey] ?? event.scenes?.adult;
  if (!scene) return { ...event };
  if (typeof scene === 'string') return { ...event, text: scene };
  return {
    ...event,
    ...scene,
    effects: { ...(event.effects ?? {}), ...(scene.effects ?? {}) },
    economyEffects: { ...(event.economyEffects ?? {}), ...(scene.economyEffects ?? {}) },
    text: scene.text ?? event.text,
  };
}

export function applyEraEvent(life, event) {
  if (!event || life.eraEventIds?.includes(event.id)) return structuredClone(life);
  const current = structuredClone(life);
  const resolved = resolveEraNarrative(event, current);
  const stats = { ...current.stats };
  for (const [key, amount] of Object.entries(resolved.effects ?? {})) {
    if (key in stats) stats[key] = clamp(stats[key] + Number(amount));
  }
  const economy = { ...current.economy };
  for (const [key, amount] of Object.entries(resolved.economyEffects ?? {})) {
    if (key === 'cash' && current.age < 18) {
      economy.householdSupport = finite(economy.householdSupport + Number(amount));
    } else if (key in economy) economy[key] = finite(economy[key] + Number(amount));
  }
  economy.netWorth = finite(
    economy.cash
      + Object.values(economy.assets ?? {}).reduce((sum, value) => sum + finite(value), 0)
      + finite(economy.homeValue)
      - finite(economy.debt),
  );
  const next = {
    ...current,
    stats,
    economy,
    eraEventIds: [...new Set([...(current.eraEventIds ?? []).map(String), event.id])],
    milestones: [...(current.milestones ?? []), {
      age: current.age,
      type: 'era-event',
      label: event.title,
    }],
  };
  return appendTimeline(next, [{
    id: `era-${current.year}-${event.id}`,
    eraEventId: event.id,
    age: current.age,
    year: current.year,
    priority: 30,
    type: 'era-event',
    text: resolved.text,
    title: event.title,
    sourceLabel: event.sourceLabel,
    sourceUrl: event.sourceUrl,
    projection: Boolean(event.projection),
  }]);
}
