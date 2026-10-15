import { EDUCATION_BY_ID, POST_SECONDARY_BY_ID } from './data/education.js';
import { CAREER_BY_ID } from './data/careers.js';
import { normalizeLife } from './engine/life.js';
import { createLifeSummary } from './engine/summary.js';

const CURRENT_KEY = 'oneIn50mLifeV2';
const PAST_KEY = 'oneIn50mPastLivesV2';
const LEGACY_KEY = 'oneIn50mState';
const PUBLIC_KEY = 'oneIn50mPublicLivesV1';
const EMPTY_STATE = Object.freeze({ current: null, previous: null });
const EDUCATION_LEVELS = new Set(['childhood', 'infant', 'preschool', 'elementary', 'middle-school', 'high-school', 'university', 'college', 'training', 'completed']);

export function getSafeStorage(scope = globalThis) {
  try {
    return scope?.localStorage ?? null;
  } catch {
    return null;
  }
}

function repairLife(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (![2, 3, 4, 5].includes(value.version) || !value.profile || !Number.isFinite(Number(value.age))) return null;
  const life = normalizeLife(value);
  if (life.education.schoolType && !EDUCATION_BY_ID[life.education.schoolType]) life.education.schoolType = 'general';
  if (!EDUCATION_LEVELS.has(life.education.level) && !POST_SECONDARY_BY_ID[life.education.level]) life.education.level = 'high-school';
  if (life.career.careerId && !CAREER_BY_ID[life.career.careerId]) {
    life.career.careerId = null;
    life.career.groupId = null;
    life.career.title = null;
    life.career.status = 'none';
    life.career.annualIncome = 0;
  }
  return normalizeLife(life);
}

export function saveCurrentLife(storage = getSafeStorage(), life) {
  try {
    const current = normalizeLife(life);
    if (current.status === 'review') {
      storage?.removeItem(CURRENT_KEY);
      return false;
    }
    storage?.setItem(CURRENT_KEY, JSON.stringify(current));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function loadCurrentLife(storage = getSafeStorage()) {
  try {
    const raw = storage?.getItem(CURRENT_KEY);
    if (!raw) return null;
    return repairLife(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearCurrentLife(storage = getSafeStorage()) {
  try {
    storage?.removeItem(CURRENT_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function listPastLives(storage = getSafeStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(PAST_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object').slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function archiveLife(storage = getSafeStorage(), life) {
  try {
    if (!storage) return false;
    const summary = createLifeSummary(life);
    const previous = listPastLives(storage).filter((item) => item.id !== summary.id);
    storage.setItem(PAST_KEY, JSON.stringify([summary, ...previous].slice(0, 10)));
    return true;
  } catch {
    return false;
  }
}

export function deletePastLife(storage = getSafeStorage(), summaryId) {
  try {
    if (!storage) return false;
    const next = listPastLives(storage).filter((item) => item.id !== summaryId);
    storage.setItem(PAST_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function clearPastLives(storage = getSafeStorage()) {
  try {
    storage?.removeItem(PAST_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function listLocalPublicLives(storage = getSafeStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(PUBLIC_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === 'string' && !item.hidden).slice(0, 30)
      : [];
  } catch {
    return [];
  }
}

export function saveLocalPublicLife(storage = getSafeStorage(), publicLife) {
  try {
    if (!storage || !publicLife?.id) return false;
    const previous = listLocalPublicLives(storage).filter((item) => item.id !== publicLife.id);
    storage.setItem(PUBLIC_KEY, JSON.stringify([{ ...publicLife, localOwner: true }, ...previous].slice(0, 30)));
    return true;
  } catch {
    return false;
  }
}

export function hideLocalPublicLife(storage = getSafeStorage(), id) {
  try {
    if (!storage) return false;
    const parsed = JSON.parse(storage.getItem(PUBLIC_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return false;
    const target = parsed.find((item) => item?.id === id && item.localOwner);
    if (!target) return false;
    storage.setItem(PUBLIC_KEY, JSON.stringify(parsed.map((item) => (
      item?.id === id ? { ...item, hidden: true } : item
    ))));
    return true;
  } catch {
    return false;
  }
}

// Transitional helpers keep the existing birth-draw screen usable until Task 8 assembles the full app.
export function createHistoryState(current = null, previous = null) {
  return { current: current ?? null, previous: previous ?? null };
}

export function readSavedState(storage = getSafeStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(LEGACY_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY_STATE };
    return createHistoryState(parsed.current, parsed.previous);
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function writeSavedState(storage = getSafeStorage(), state) {
  try {
    storage?.setItem(LEGACY_KEY, JSON.stringify(createHistoryState(state?.current, state?.previous)));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function canStartDraw(isDrawing) {
  return !isDrawing;
}
