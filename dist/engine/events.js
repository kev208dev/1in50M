import { LIFE_EVENTS, LIFE_EVENT_BY_ID } from '../data/life-events.js';
import { createRng } from './random.js';
import { normalizeLife } from './life.js';

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
  ));
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
  return normalizeLife({
    ...current,
    stats,
    economy,
    recentEventIds: [...current.recentEventIds, event.id].slice(-10),
    history: [...current.history, {
      id: `event-${current.age}-${event.id}`,
      age: current.age,
      year: current.year,
      type: 'event',
      eventId: event.id,
      text: event.text,
    }],
    milestones: event.milestone
      ? [...current.milestones, { age: current.age, type: 'event', label: event.text }]
      : current.milestones,
  });
}
