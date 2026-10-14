import { createRng } from '../engine/random.js';

export const ERA_OPTIONS = [
  { id: 'random', label: '무작위 시대' },
  { id: 'past', label: '과거 대한민국' },
  { id: 'current', label: '현재 대한민국' },
  { id: 'future', label: '미래 대한민국' },
];

export const DURATION_OPTIONS = [30, 60, 90];

export const DEFAULT_RUNTIME_SETTINGS = Object.freeze({
  era: 'random',
  durationMinutes: 30,
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
  if (era === 'past') return rng.int(1950, 1999);
  if (era === 'current') return currentYear;
  if (era === 'future') return rng.int(currentYear + 5, currentYear + 35);
  return rng.weighted([
    { value: rng.int(1950, 1999), weight: 3 },
    { value: currentYear, weight: 5 },
    { value: rng.int(currentYear + 5, currentYear + 35), weight: 2 },
  ]).value;
}
