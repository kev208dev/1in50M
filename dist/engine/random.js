export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed, sourceOverride) {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);

  const generated = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const next = () => {
    const value = sourceOverride ? sourceOverride() : generated();
    return Math.min(Math.max(Number(value) || 0, 0), 1 - Number.EPSILON);
  };

  return {
    next,
    int(min, max) {
      const low = Math.ceil(Math.min(min, max));
      const high = Math.floor(Math.max(min, max));
      return low + Math.floor(next() * ((high - low) + 1));
    },
    pick(items) {
      if (!Array.isArray(items) || items.length === 0) return undefined;
      return items[Math.floor(next() * items.length)];
    },
    weighted(items) {
      if (!Array.isArray(items) || items.length === 0) return undefined;
      const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
      if (total <= 0) return items[0];
      let cursor = next() * total;
      for (const item of items) {
        cursor -= Math.max(0, Number(item.weight) || 0);
        if (cursor < 0) return item;
      }
      return items.at(-1);
    },
    snapshot() {
      return state >>> 0;
    },
  };
}
