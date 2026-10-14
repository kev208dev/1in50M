import { createBirthSlotResult, profileFromSlotResult } from './engine/birth-slot.js';

export function weightedPick(items, randomValue = Math.random()) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError('weightedPick requires at least one item');
  }

  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (total <= 0) return items[0];

  const unit = Math.min(Math.max(Number(randomValue) || 0, 0), 1 - Number.EPSILON);
  let cursor = unit * total;
  for (const item of items) {
    cursor -= Math.max(0, Number(item.weight) || 0);
    if (cursor < 0) return item;
  }
  return items.at(-1);
}

export function createBirthProfile(randomFn = Math.random, year = 2026) {
  const entropy = Array.from({ length: 4 }, () => (
    Math.floor(Math.min(Math.max(randomFn(), 0), 1 - Number.EPSILON) * 0xffffffff)
      .toString(16)
      .padStart(8, '0')
  )).join('-');
  return profileFromSlotResult(createBirthSlotResult(entropy, year));
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (typeof profile.id !== 'string' || profile.id.length === 0) return false;
  if (!Number.isInteger(profile.birthYear)) return false;
  if (!profile.region || ['name', 'short', 'code'].some((key) => typeof profile.region[key] !== 'string')) return false;
  if (['district', 'familyType', 'finance', 'housing', 'siblings', 'summary'].some((key) => typeof profile[key] !== 'string')) return false;
  if (!Array.isArray(profile.guardians) || profile.guardians.length === 0) return false;
  if (!profile.guardians.every((guardian) => (
    guardian
    && typeof guardian === 'object'
    && typeof guardian.label === 'string'
    && typeof guardian.occupation === 'string'
  ))) return false;
  if (
    !profile.appearance
    || typeof profile.appearance.description !== 'string'
    || !Number.isFinite(profile.appearance.socialRating)
    || profile.appearance.socialRating < 0
    || profile.appearance.socialRating > 100
  ) return false;
  if (
    !profile.personality
    || !['mixed', 'strong', 'extreme'].includes(profile.personality.strength)
    || !Array.isArray(profile.personality.rolls)
    || profile.personality.rolls.length !== 3
    || typeof profile.personality.label !== 'string'
    || (profile.personality.strength !== 'mixed' && typeof profile.personality.dominant !== 'string')
  ) return false;
  if (!profile.name || typeof profile.name.full !== 'string') return false;
  const stats = profile.stats;
  const statKeys = ['health', 'stability', 'education', 'relationships'];
  return Boolean(
    stats
    && typeof stats === 'object'
    && !Array.isArray(stats)
    && Object.keys(stats).length === statKeys.length
    && statKeys.every((key) => (
      Number.isFinite(stats[key]) && stats[key] >= 0 && stats[key] <= 100
    )),
  );
}
