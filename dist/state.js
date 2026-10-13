const STORAGE_KEY = 'oneIn50mState';
const EMPTY_STATE = Object.freeze({ current: null, previous: null });

export function createHistoryState(current = null, previous = null) {
  return { current: current ?? null, previous: previous ?? null };
}

export function getSafeStorage(scope = globalThis) {
  try {
    return scope?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readSavedState(storage = getSafeStorage()) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY_STATE };
    return createHistoryState(parsed.current, parsed.previous);
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function writeSavedState(storage = getSafeStorage(), state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(createHistoryState(state?.current, state?.previous)));
    return true;
  } catch {
    return false;
  }
}

export function canStartDraw(isDrawing) {
  return !isDrawing;
}
