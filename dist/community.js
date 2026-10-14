import { COMMUNITY_SAMPLES } from './data/community-samples.js';
import { getSafeStorage, listLocalPublicLives, saveLocalPublicLife, hideLocalPublicLife } from './storage.js';

function regionOnly(value) {
  return String(value ?? '대한민국').trim().split(/\s+/)[0] || '대한민국';
}

function netWorthBand(value) {
  const amount = Number(value) || 0;
  if (amount < 0) return '순부채';
  if (amount < 10000000) return '1천만원 미만';
  if (amount < 50000000) return '1천만~5천만원';
  if (amount < 100000000) return '5천만~1억원';
  if (amount < 500000000) return '1억~5억원';
  return '5억원 이상';
}

function aliasFor(summary) {
  const words = ['새벽', '파도', '소나무', '별빛', '들꽃', '한강', '돌담', '바람'];
  const text = String(summary?.id ?? summary?.completedAt ?? 'life');
  let hash = 0;
  for (const char of text) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return `${words[hash % words.length]} ${String(hash % 100).padStart(2, '0')}`;
}

export function toPublicLife(summary) {
  const point = summary?.turningPoints?.at(-1)?.label;
  return {
    id: String(summary?.id ?? `life-${Date.now()}`),
    alias: aliasFor(summary),
    age: Math.max(0, Math.min(120, Math.round(Number(summary?.age) || 0))),
    birthRegion: regionOnly(summary?.birth),
    finalRegion: regionOnly(summary?.finalResidence),
    career: String(summary?.longestCareer ?? '직업 기록 없음').slice(0, 60),
    netWorthBand: netWorthBand(summary?.netWorth),
    reflection: String(point ?? summary?.narrative ?? '한 사람의 삶이 기록되었습니다.').slice(0, 180),
    completedAt: summary?.completedAt ?? new Date().toISOString(),
  };
}

export function createCommunityClient(config = {}, { storage = getSafeStorage(), samples = COMMUNITY_SAMPLES } = {}) {
  const listeners = new Set();
  let destroyed = false;
  const mode = config?.supabaseUrl && config?.supabasePublishableKey ? 'configured' : 'offline';

  const notify = async () => {
    if (destroyed) return;
    const lives = await api.listPublicLives();
    for (const listener of listeners) listener(lives);
  };

  const api = {
    async connectPresence() {
      return { mode: mode === 'configured' ? 'offline' : mode, count: 1 };
    },
    async listPublicLives() {
      const local = listLocalPublicLives(storage);
      return [...local, ...samples].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
    },
    async publishLife(summary) {
      const safeLife = toPublicLife(summary);
      const publicLife = { ...safeLife, id: `local-${safeLife.id}` };
      saveLocalPublicLife(storage, publicLife);
      await notify();
      return publicLife;
    },
    async hideLife(id) {
      const hidden = hideLocalPublicLife(storage, id);
      if (hidden) await notify();
      return hidden;
    },
    subscribe(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
  return api;
}
