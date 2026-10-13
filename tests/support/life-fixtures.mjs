import { createBirthProfile } from '../../dist/simulator.js';
import { createLife, normalizeLife } from '../../dist/engine/life.js';

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(base?.[key] ?? {}, value)
      : value;
  }
  return result;
}

export function makeLifeAtAge(age, overrides = {}) {
  const profile = createBirthProfile(() => 0.42, 2026);
  const life = createLife(profile, overrides.seed ?? `fixture-${age}`);
  return normalizeLife(deepMerge(life, {
    age,
    year: profile.birthYear + age,
    ...overrides,
  }));
}

export function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}
