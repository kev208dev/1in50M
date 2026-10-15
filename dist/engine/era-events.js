import { HISTORY_EVENTS } from '../data/history-events.js';
import { FUTURE_EVENTS } from '../data/future-events.js';
import { createRng } from './random.js';

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

export function applyEraEvent(life, event) {
  if (!event || life.eraEventIds?.includes(event.id)) return structuredClone(life);
  const current = structuredClone(life);
  const stats = { ...current.stats };
  for (const [key, amount] of Object.entries(event.effects ?? {})) {
    if (key in stats) stats[key] = clamp(stats[key] + Number(amount));
  }
  const economy = { ...current.economy };
  for (const [key, amount] of Object.entries(event.economyEffects ?? {})) {
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
  return {
    ...current,
    stats,
    economy,
    eraEventIds: [...new Set([...(current.eraEventIds ?? []).map(String), event.id])],
    history: [...(current.history ?? []), {
      id: `era-${current.year}-${event.id}`,
      eraEventId: event.id,
      age: current.age,
      year: current.year,
      type: 'era-event',
      text: event.text,
      title: event.title,
      sourceLabel: event.sourceLabel,
      sourceUrl: event.sourceUrl,
      projection: Boolean(event.projection),
    }],
    milestones: [...(current.milestones ?? []), {
      age: current.age,
      type: 'era-event',
      label: event.title,
    }],
  };
}
