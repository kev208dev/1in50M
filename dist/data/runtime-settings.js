import { createRng } from '../engine/random.js';
import { ERA_BY_ID, ERA_OPTIONS } from './eras.js';

export { ERA_OPTIONS } from './eras.js';

export const DURATION_OPTIONS = [30, 60, 90];

export const DEFAULT_RUNTIME_SETTINGS = Object.freeze({
  era: 'random',
  durationMinutes: 60,
  comparison: 'korea',
  music: true,
  autoDecision: false,
});

export function normalizeRuntimeSettings(input = {}) {
  const era = ERA_OPTIONS.some((item) => item.id === input.era) ? input.era : DEFAULT_RUNTIME_SETTINGS.era;
  const durationMinutes = DURATION_OPTIONS.includes(Number(input.durationMinutes))
    ? Number(input.durationMinutes)
    : DEFAULT_RUNTIME_SETTINGS.durationMinutes;
  return {
    era,
    durationMinutes,
    comparison: input.comparison === 'none' ? 'none' : 'korea',
    music: input.music === undefined ? DEFAULT_RUNTIME_SETTINGS.music : Boolean(input.music),
    autoDecision: Boolean(input.autoDecision),
  };
}

export function tickInterval(settings, speed = 1) {
  const normalized = normalizeRuntimeSettings(settings);
  const multiplier = [1, 2, 4, 8, 12, 16].includes(Number(speed)) ? Number(speed) : 1;
  return Math.max(125, Math.round((normalized.durationMinutes * 60 * 1000) / 90 / multiplier));
}

export function resolveBirthYear(settings, seed, currentYear = new Date().getFullYear()) {
  const { era } = normalizeRuntimeSettings(settings);
  const rng = createRng(`era:${seed}:${currentYear}`);
  if (era === 'future') return rng.int(currentYear + 5, currentYear + 35);
  if (ERA_BY_ID[era]?.startYear !== null) {
    const { startYear, endYear } = ERA_BY_ID[era];
    return rng.int(startYear, Math.min(endYear, currentYear));
  }

  const weightedBuckets = ERA_OPTIONS
    .filter((item) => item.id !== 'random')
    .filter((item) => item.id === 'future' || item.startYear <= currentYear)
    .map((item) => ({
      value: item,
      weight: item.id === 'future' ? 2 : Math.max(1, 6 - Math.floor((currentYear - item.startYear) / 20)),
    }));
  const picked = rng.weighted(weightedBuckets).value;
  if (picked.id === 'future') return rng.int(currentYear + 5, currentYear + 35);
  return rng.int(picked.startYear, Math.min(picked.endYear, currentYear));
}
