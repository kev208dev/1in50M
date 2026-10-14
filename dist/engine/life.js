import { FOCUS_BY_ID } from '../data/focuses.js';
import { DECISION_BY_ID } from '../data/decisions.js';
import { createRng, hashSeed } from './random.js';
import { getDecision, chooseAutomatically } from './decisions.js';
import { getCareerOffers, acceptCareer, advanceCareer } from './career.js';
import { calculateAnnualEconomy } from './economy.js';
import { selectAnnualEvents, applyEvent } from './events.js';
import {
  createIdentityArc,
  revealIdentityIfDue,
  acknowledgeIdentityDiscovery,
} from './identity.js';
import { updateRelationships } from './relationships.js';

const STAT_KEYS = ['health', 'happiness', 'knowledge', 'relationships'];

const clamp = (value, min = 0, max = 100) => {
  const number = Number(value);
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(number) ? number : min)));
};

const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
};

const financeBase = (finance) => {
  if (finance?.includes('여유')) return 32000000;
  if (finance?.includes('안정')) return 16000000;
  if (finance?.includes('빠듯')) return 3500000;
  return 8000000;
};

export function createLife(profile, seed = profile?.id) {
  const initialSeed = String(seed ?? profile?.id ?? 'one-in-50m');
  const initialCash = financeBase(profile?.finance);
  const family = (profile?.guardians ?? []).map((guardian, index) => ({
    id: `guardian-${index + 1}`,
    name: guardian.label,
    relation: guardian.label,
    occupation: guardian.occupation,
  }));

  return normalizeLife({
    version: 3,
    seed: initialSeed,
    rngState: hashSeed(initialSeed),
    profile: structuredClone(profile),
    age: 0,
    year: finite(profile?.birthYear, new Date().getFullYear()),
    status: 'living',
    stats: {
      health: profile?.stats?.health ?? 64,
      happiness: profile?.stats?.stability ?? 58,
      knowledge: profile?.stats?.education ?? 55,
      relationships: profile?.stats?.relationships ?? 62,
    },
    economy: {
      cash: initialCash,
      income: 0,
      fixedCosts: 0,
      debt: 0,
      deposit: 0,
      homeValue: 0,
      netWorth: initialCash,
    },
    education: { level: 'childhood', status: 'not-started', schoolType: null, skills: [] },
    career: {
      groupId: null,
      careerId: null,
      title: null,
      status: 'none',
      years: 0,
      annualIncome: 0,
      history: [],
    },
    relationships: { family, friends: [], partner: null, children: [] },
    housing: {
      type: 'with-family',
      region: profile?.region?.name ?? '대한민국',
      district: profile?.district ?? '',
    },
    focusId: 'balance',
    pendingDecisionId: null,
    identity: createIdentityArc(initialSeed),
    pendingIdentityDiscovery: false,
    decisions: {},
    history: [{
      id: 'birth',
      age: 0,
      year: finite(profile?.birthYear, new Date().getFullYear()),
      type: 'birth',
      text: profile?.summary ?? '대한민국에서 새로운 삶이 시작되었습니다.',
    }],
    milestones: [{ age: 0, type: 'birth', label: '출생' }],
    statHistory: [],
    recentEventIds: [],
    processedTickIds: [],
  });
}

export function normalizeLife(life) {
  const copy = structuredClone(life ?? {});
  copy.version = 3;
  copy.seed = String(copy.seed ?? copy.profile?.id ?? 'one-in-50m');
  copy.rngState = finite(copy.rngState, hashSeed(copy.seed)) >>> 0;
  copy.age = clamp(copy.age, 0, 90);
  copy.year = finite(copy.year, finite(copy.profile?.birthYear, 2026) + copy.age);
  copy.status = copy.age >= 90 || copy.status === 'review' ? 'review' : 'living';
  copy.stats = Object.fromEntries(STAT_KEYS.map((key) => [key, clamp(copy.stats?.[key], 0, 100)]));

  const economy = copy.economy ?? {};
  copy.economy = {
    cash: finite(economy.cash),
    income: finite(economy.income),
    fixedCosts: Math.max(0, finite(economy.fixedCosts)),
    debt: Math.max(0, finite(economy.debt)),
    deposit: Math.max(0, finite(economy.deposit)),
    homeValue: Math.max(0, finite(economy.homeValue)),
    netWorth: finite(economy.netWorth),
  };
  copy.economy.netWorth = finite(
    copy.economy.cash + copy.economy.deposit + copy.economy.homeValue - copy.economy.debt,
  );

  copy.education = {
    level: copy.education?.level ?? 'childhood',
    status: copy.education?.status ?? 'not-started',
    schoolType: copy.education?.schoolType ?? null,
    skills: Array.isArray(copy.education?.skills) ? [...copy.education.skills] : [],
  };
  copy.career = {
    groupId: copy.career?.groupId ?? null,
    careerId: copy.career?.careerId ?? null,
    title: copy.career?.title ?? null,
    status: copy.career?.status ?? 'none',
    years: Math.max(0, finite(copy.career?.years)),
    annualIncome: Math.max(0, finite(copy.career?.annualIncome)),
    history: Array.isArray(copy.career?.history) ? [...copy.career.history] : [],
  };
  copy.relationships = {
    family: Array.isArray(copy.relationships?.family) ? [...copy.relationships.family] : [],
    friends: Array.isArray(copy.relationships?.friends) ? [...copy.relationships.friends] : [],
    partner: copy.relationships?.partner ?? null,
    children: Array.isArray(copy.relationships?.children) ? [...copy.relationships.children] : [],
  };
  copy.housing = {
    type: copy.housing?.type ?? 'with-family',
    region: copy.housing?.region ?? copy.profile?.region?.name ?? '대한민국',
    district: copy.housing?.district ?? copy.profile?.district ?? '',
  };
  copy.focusId = FOCUS_BY_ID[copy.focusId] ? copy.focusId : 'balance';
  copy.pendingDecisionId = DECISION_BY_ID[copy.pendingDecisionId] ? copy.pendingDecisionId : null;
  const identity = copy.identity && typeof copy.identity === 'object' ? copy.identity : {};
  copy.identity = {
    assigned: typeof identity.assigned === 'string' ? identity.assigned : null,
    label: typeof identity.label === 'string' ? identity.label : null,
    discoveryAge: Number.isFinite(Number(identity.discoveryAge))
      ? clamp(identity.discoveryAge, 16, 24)
      : null,
    discovered: Boolean(identity.discovered),
    acknowledged: Boolean(identity.acknowledged),
  };
  if (!copy.identity.assigned) {
    copy.identity = {
      assigned: null,
      label: null,
      discoveryAge: null,
      discovered: false,
      acknowledged: false,
    };
  }
  copy.pendingIdentityDiscovery = Boolean(copy.pendingIdentityDiscovery)
    && copy.identity.discovered
    && !copy.identity.acknowledged;
  copy.decisions = copy.decisions && typeof copy.decisions === 'object' ? { ...copy.decisions } : {};
  copy.history = Array.isArray(copy.history)
    ? copy.history.filter((item) => item && typeof item === 'object' && typeof item.text === 'string')
    : [];
  copy.milestones = Array.isArray(copy.milestones)
    ? copy.milestones.filter((item) => item && typeof item === 'object' && typeof item.label === 'string')
    : [];
  copy.statHistory = Array.isArray(copy.statHistory)
    ? copy.statHistory.filter((item) => item && typeof item === 'object' && Number.isFinite(Number(item.age)))
    : [];
  copy.recentEventIds = Array.isArray(copy.recentEventIds) ? [...copy.recentEventIds].slice(-10) : [];
  copy.processedTickIds = Array.isArray(copy.processedTickIds)
    ? [...new Set(copy.processedTickIds.map(String))].slice(-8)
    : [];
  return copy;
}

export function setFocus(life, focusId) {
  if (!FOCUS_BY_ID[focusId]) return normalizeLife(life);
  return normalizeLife({ ...structuredClone(life), focusId });
}

export function advanceYear(life, tickId = `age-${Number(life?.age ?? 0) + 1}`) {
  const current = normalizeLife(life);
  const normalizedTickId = String(tickId);
  if (current.status !== 'living' || current.pendingDecisionId) return current;
  if (current.processedTickIds.includes(normalizedTickId)) return current;

  const nextAge = current.age + 1;
  const rng = createRng(`${current.seed}:${current.rngState}:${nextAge}`);
  const focus = FOCUS_BY_ID[current.focusId];
  const stats = { ...current.stats };
  for (const key of STAT_KEYS) stats[key] += focus.effects?.[key] ?? 0;
  stats.health += nextAge > 55 ? -1 : 0;
  stats.happiness += rng.int(-1, 1);
  stats.knowledge += nextAge <= 24 ? 1 : 0;

  const education = { ...current.education };
  const completionAge = { university: 22, college: 20, training: 19 }[education.level];
  if (education.status === 'enrolled' && completionAge && nextAge >= completionAge) {
    education.status = 'completed';
  }
  const lifeEnded = nextAge >= 45 && stats.health <= 0;
  const reviewing = nextAge >= 90 || lifeEnded;

  const advanced = normalizeLife({
    ...current,
    age: nextAge,
    year: current.year + 1,
    status: reviewing ? 'review' : 'living',
    rngState: rng.snapshot(),
    stats,
    education,
    economy: current.economy,
    career: current.career,
    history: [...current.history, {
      id: `year-${nextAge}`,
      age: nextAge,
      year: current.year + 1,
      type: reviewing ? 'review' : 'year',
      text: reviewing ? '지나온 삶을 천천히 돌아봅니다.' : `${nextAge}세의 한 해가 흘렀습니다.`,
    }],
    statHistory: [...current.statHistory, { age: nextAge, ...stats }],
    processedTickIds: [...current.processedTickIds, normalizedTickId].slice(-8),
  });
  return normalizeLife(revealIdentityIfDue(advanced));
}

export function isLifeComplete(life) {
  const current = normalizeLife(life);
  return current.status === 'review' || current.age >= 90;
}

export function simulateAutomatically(profile, seed = profile?.id) {
  let life = createLife(profile, seed);
  let iterations = 0;
  while (life.status === 'living' && iterations < 120) {
    const decision = getDecision(life);
    if (decision) life = chooseAutomatically(life, decision.id);

    if (life.age >= 25 && !life.career.careerId) {
      const offer = getCareerOffers(life).find((item) => item.eligible);
      if (offer) life = acceptCareer(life, offer.career.id);
    }

    life = advanceYear(life, `automatic-${iterations}`);
    if (life.pendingIdentityDiscovery) {
      life = normalizeLife(acknowledgeIdentityDiscovery(life));
    }
    life = advanceCareer(life);
    life = calculateAnnualEconomy(life);
    for (const event of selectAnnualEvents(life)) life = applyEvent(life, event.id);
    life = updateRelationships(life);
    iterations += 1;
  }
  if (iterations >= 120 && life.status !== 'review') {
    throw new Error('자동 생애 시뮬레이션이 120회 안에 종료되지 않았습니다.');
  }
  return normalizeLife({ ...life, pendingDecisionId: null });
}
