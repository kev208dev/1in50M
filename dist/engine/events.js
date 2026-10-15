import { LIFE_EVENTS, LIFE_EVENT_BY_ID } from '../data/life-events.js';
import { createRng } from './random.js';
import { normalizeLife } from './life.js';
import { attractivenessLabel, describeAppearance } from './appearance.js';
import { appendTimeline } from './timeline.js';

const clamp = (value, min = 0, max = 100) => (
  Math.min(max, Math.max(min, Math.round(Number(value) || 0)))
);

export function eventWeight(life, event) {
  if (!event || (typeof event.when === 'function' && !event.when(life))) return 0;
  const multiplier = typeof event.weightFor === 'function' ? event.weightFor(life) : 1;
  const value = Number(event.weight ?? 1) * Number(multiplier);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function selectAnnualEvents(life) {
  const current = normalizeLife(life);
  const eligible = LIFE_EVENTS.filter((event) => (
    current.age >= event.ageRange[0]
    && current.age <= event.ageRange[1]
    && (() => {
      const previous = [...current.history].reverse().find((entry) => entry.eventId === event.id);
      if (previous) return current.age - previous.age >= event.cooldownYears;
      return !current.recentEventIds.includes(event.id);
    })()
  )).map((event) => ({ ...event, weight: eventWeight(current, event) }))
    .filter((event) => event.weight > 0);
  if (eligible.length === 0) return [];
  const rng = createRng(`${current.seed}:events:${current.age}:${current.rngState}`);
  const first = rng.weighted(eligible);
  const remaining = eligible.filter((event) => event.id !== first.id);
  const eventCount = rng.next() < 0.3 && remaining.length > 0 ? 2 : 1;
  return eventCount === 2 ? [first, rng.weighted(remaining)] : [first];
}

export function applyEvent(life, eventId) {
  const current = normalizeLife(life);
  const event = LIFE_EVENT_BY_ID[eventId];
  if (!event) return current;
  const stats = { ...current.stats };
  for (const [key, amount] of Object.entries(event.effects ?? {})) {
    if (key in stats) stats[key] += Number(amount) || 0;
  }
  const economy = { ...current.economy };
  for (const [key, amount] of Object.entries(event.economyEffects ?? {})) {
    if (key in economy) economy[key] += Number(amount) || 0;
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
  const next = {
    ...current,
    profile,
    stats,
    economy,
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
