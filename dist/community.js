import { getSafeStorage, listLocalPublicLives, saveLocalPublicLife, hideLocalPublicLife } from './storage.js';

export function filterPublicLives(lives, { memorial = false } = {}) {
  const safe = Array.isArray(lives) ? lives : [];
  return memorial ? safe.filter((life) => life.age < 90) : safe;
}

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

async function createConfiguredClient(config) {
  if (config?.supabaseClient) return config.supabaseClient;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}

function fromDatabase(row, ownerId) {
  return {
    id: row.id,
    alias: row.alias,
    age: row.age,
    birthRegion: row.birth_region,
    finalRegion: row.final_region,
    career: row.career,
    netWorthBand: row.net_worth_band,
    reflection: row.reflection,
    completedAt: row.completed_at,
    localOwner: Boolean(ownerId && row.owner_id === ownerId),
  };
}

function toDatabase(life, ownerId) {
  return {
    owner_id: ownerId,
    alias: life.alias,
    age: life.age,
    birth_region: life.birthRegion,
    final_region: life.finalRegion,
    career: life.career,
    net_worth_band: life.netWorthBand,
    reflection: life.reflection,
    completed_at: life.completedAt,
  };
}

export function createCommunityClient(config = {}, { storage = getSafeStorage() } = {}) {
  const listeners = new Set();
  let destroyed = false;
  let clientPromise = null;
  let userId = null;
  let presenceChannel = null;
  let changesChannel = null;
  let presenceCount = 1;

  const getClient = async () => {
    if (!config?.supabaseClient && (!config?.supabaseUrl || !config?.supabasePublishableKey)) return null;
    clientPromise ??= createConfiguredClient(config).catch(() => null);
    return clientPromise;
  };

  const authenticate = async (client) => {
    if (!client?.auth) return null;
    const existing = await client.auth.getSession();
    userId = existing?.data?.session?.user?.id ?? null;
    if (!userId) {
      const signedIn = await client.auth.signInAnonymously();
      if (signedIn?.error) return null;
      userId = signedIn?.data?.user?.id ?? signedIn?.data?.session?.user?.id ?? null;
    }
    return userId;
  };

  const notify = async () => {
    if (destroyed) return;
    const lives = await api.listPublicLives();
    for (const listener of listeners) listener(lives);
  };

  const api = {
    async connectPresence() {
      const client = await getClient();
      if (!client || !(await authenticate(client))) return { mode: 'offline', count: 1 };
      try {
        if (!presenceChannel) {
          presenceChannel = client.channel('one-in-50m:visitors', { config: { presence: { key: userId } } });
          presenceChannel.on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            presenceCount = Math.max(1, Object.values(state).reduce((sum, entries) => sum + entries.length, 0));
          });
          await new Promise((resolve, reject) => {
            const timeout = globalThis.setTimeout(() => reject(new Error('presence timeout')), 2500);
            presenceChannel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                globalThis.clearTimeout(timeout);
                await presenceChannel.track({ online_at: new Date().toISOString() });
                resolve();
              }
              if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                globalThis.clearTimeout(timeout);
                reject(new Error(status));
              }
            });
          });
        }
        return { mode: 'online', count: presenceCount };
      } catch {
        return { mode: 'offline', count: 1 };
      }
    },
    async listPublicLives() {
      const local = listLocalPublicLives(storage);
      const client = await getClient();
      if (client && await authenticate(client)) {
        try {
          const { data, error } = await client
            .from('public_lives')
            .select('id,owner_id,alias,age,birth_region,final_region,career,net_worth_band,reflection,completed_at')
            .eq('hidden', false)
            .order('completed_at', { ascending: false })
            .limit(50);
          if (!error && Array.isArray(data)) return [...local, ...data.map((row) => fromDatabase(row, userId))];
        } catch {
          // The complete local experience remains available when the backend is unreachable.
        }
      }
      return [...local].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
    },
    async publishLife(summary) {
      const safeLife = toPublicLife(summary);
      const client = await getClient();
      if (client && await authenticate(client)) {
        try {
          const { data, error } = await client
            .from('public_lives')
            .insert(toDatabase(safeLife, userId))
            .select('id,owner_id,alias,age,birth_region,final_region,career,net_worth_band,reflection,completed_at')
            .single();
          if (!error && data) {
            const published = fromDatabase(data, userId);
            await notify();
            return published;
          }
        } catch {
          // Fall through to the private browser archive.
        }
      }
      const publicLife = { ...safeLife, id: `local-${safeLife.id}` };
      saveLocalPublicLife(storage, publicLife);
      await notify();
      return publicLife;
    },
    async hideLife(id) {
      const client = await getClient();
      if (client && await authenticate(client) && !String(id).startsWith('local-')) {
        try {
          const { error } = await client.from('public_lives').update({ hidden: true }).eq('id', id).eq('owner_id', userId);
          if (!error) {
            await notify();
            return true;
          }
        } catch {
          // Try the local owner record below.
        }
      }
      const hidden = hideLocalPublicLife(storage, id);
      if (hidden) await notify();
      return hidden;
    },
    subscribe(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.add(callback);
      void getClient().then(async (client) => {
        if (!client || !(await authenticate(client)) || changesChannel || destroyed) return;
        changesChannel = client
          .channel('one-in-50m:public-lives')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'public_lives' }, notify)
          .subscribe();
      });
      return () => listeners.delete(callback);
    },
    destroy() {
      destroyed = true;
      listeners.clear();
      void getClient().then((client) => {
        if (client && presenceChannel) client.removeChannel(presenceChannel);
        if (client && changesChannel) client.removeChannel(changesChannel);
      });
    },
  };
  return api;
}
