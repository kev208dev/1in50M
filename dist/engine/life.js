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
import { createProfileInfluence } from './profile-influence.js';
import { advanceAppearance } from './appearance.js';
import { advancePortfolio } from './finance.js';
import { advanceBusiness } from './business.js';
import { selectEraEvent, applyEraEvent } from './era-events.js';
import { normalizeRiskFactors, normalizeWellbeingHabits } from './wellbeing.js';
import { defaultServiceState, ensureServiceAssessment } from './service.js';
import { PUBLIC_DATA_VERSION } from '../data/public-statistics.js';
import { applyDiminishingEffects } from './stat-effects.js';
import { educationStateForAge } from '../data/education.js';
import { appendTimeline, orderTimeline } from './timeline.js';
import { createCohortPeers } from './cohort.js';

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
  if (finance?.includes('매우 여유')) return 60000000;
  if (finance?.includes('여유')) return 32000000;
  if (finance?.includes('안정')) return 16000000;
  if (finance?.includes('빠듯')) return 3500000;
  return 8000000;
};

export function createLife(profile, seed = profile?.id) {
  const initialSeed = String(seed ?? profile?.id ?? 'one-in-50m');
  const initialHouseholdSupport = financeBase(profile?.finance);
  const family = (profile?.guardians ?? []).map((guardian, index) => ({
    id: `guardian-${index + 1}`,
    name: guardian.label,
    relation: guardian.label,
    occupation: guardian.occupation,
  }));

  return normalizeLife({
    version: 5,
    dataVersion: PUBLIC_DATA_VERSION,
    seed: initialSeed,
    rngState: hashSeed(initialSeed),
    profile: structuredClone(profile),
    profileInfluence: createProfileInfluence(profile),
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
      cash: 0,
      householdSupport: initialHouseholdSupport,
      income: 0,
      fixedCosts: 0,
      recurringCosts: 0,
      debt: 0,
      housingDebt: 0,
      otherDebt: 0,
      deposit: 0,
      homeValue: 0,
      vehicleValue: 0,
      dopamine: 0,
      pendingLotteryDraw: null,
      assets: {
        deposits: 0,
        bonds: 0,
        stocks: 0,
        crypto: 0,
        businessEquity: 0,
      },
      transactions: [],
      lastReturns: { deposits: 0, bonds: 0, stocks: 0, crypto: 0 },
      netWorth: 0,
    },
    business: null,
    education: { level: 'infant', status: 'not-started', schoolType: null, skills: [] },
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
    pendingReflectionId: null,
    reflections: {},
    endedReason: null,
    epitaph: '',
    conditions: { chronic: [], losses: [], care: [] },
    cohort: createCohortPeers(profile, initialSeed),
    riskFactors: { academicStress: 0, sleepDebt: 0, caffeineLoad: 0, support: 45 },
    wellbeingHabits: { privateEducation: false, gradePressure: false, nighttimeStudy: null },
    mentalHealthState: 'stable',
    identity: createIdentityArc(initialSeed),
    pendingIdentityDiscovery: false,
    service: defaultServiceState(),
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
    eraEventIds: [],
    processedTickIds: [],
  });
}

export function normalizeLife(life) {
  const copy = structuredClone(life ?? {});
  copy.version = 5;
  copy.dataVersion = typeof copy.dataVersion === 'string' ? copy.dataVersion : PUBLIC_DATA_VERSION;
  copy.seed = String(copy.seed ?? copy.profile?.id ?? 'one-in-50m');
  copy.rngState = finite(copy.rngState, hashSeed(copy.seed)) >>> 0;
  copy.age = clamp(copy.age, 0, 90);
  copy.year = finite(copy.year, finite(copy.profile?.birthYear, 2026) + copy.age);
  copy.status = copy.age >= 90 || copy.status === 'review' ? 'review' : 'living';
  copy.stats = Object.fromEntries(STAT_KEYS.map((key) => [key, clamp(copy.stats?.[key], 0, 100)]));
  const calculatedInfluence = createProfileInfluence(copy.profile);
  copy.profileInfluence = copy.profileInfluence?.modifiers
    ? {
        ...structuredClone(copy.profileInfluence),
        modifiers: {
          ...copy.profileInfluence.modifiers,
          'first-impression': calculatedInfluence.modifiers['first-impression'],
          'romance-first-impression': calculatedInfluence.modifiers['romance-first-impression'],
          'service-impression': calculatedInfluence.modifiers['service-impression'],
        },
      }
    : calculatedInfluence;

  const economy = copy.economy ?? {};
  const assets = economy.assets ?? {};
  const normalizedAssets = {
    deposits: Math.max(0, finite(assets.deposits, economy.deposit)),
    bonds: Math.max(0, finite(assets.bonds)),
    stocks: Math.max(0, finite(assets.stocks)),
    crypto: Math.max(0, finite(assets.crypto)),
    businessEquity: Math.max(0, finite(assets.businessEquity)),
  };
  const rawDebt = Math.max(0, finite(economy.debt));
  let housingDebt = Math.max(0, finite(economy.housingDebt));
  let otherDebt = Math.max(0, finite(economy.otherDebt));
  const unclassifiedDebt = Math.max(0, rawDebt - housingDebt - otherDebt);
  if (unclassifiedDebt > 0) {
    const businessDebt = Math.min(unclassifiedDebt, Math.max(0, finite(copy.business?.debt)));
    otherDebt += businessDebt;
    const remainder = unclassifiedDebt - businessDebt;
    if (Math.max(0, finite(economy.homeValue)) > 0) housingDebt += remainder;
    else otherDebt += remainder;
  }
  copy.economy = {
    cash: finite(economy.cash),
    householdSupport: Math.max(0, finite(economy.householdSupport)),
    income: finite(economy.income),
    fixedCosts: Math.max(0, finite(economy.fixedCosts)),
    recurringCosts: Math.max(0, finite(economy.recurringCosts)),
    debt: housingDebt + otherDebt,
    housingDebt,
    otherDebt,
    deposit: normalizedAssets.deposits,
    homeValue: Math.max(0, finite(economy.homeValue)),
    vehicleValue: Math.max(0, finite(economy.vehicleValue)),
    dopamine: clamp(economy.dopamine, 0, 100),
    pendingLotteryDraw: economy.pendingLotteryDraw && typeof economy.pendingLotteryDraw === 'object'
      ? { ...economy.pendingLotteryDraw, revealed: false }
      : null,
    assets: normalizedAssets,
    transactions: Array.isArray(economy.transactions)
      ? economy.transactions.filter((item) => item && typeof item === 'object').slice(-100)
      : [],
    lastReturns: Object.fromEntries(['deposits', 'bonds', 'stocks', 'crypto'].map((key) => {
      const value = Number(economy.lastReturns?.[key]);
      return [key, Number.isFinite(value) ? value : 0];
    })),
    netWorth: finite(economy.netWorth),
  };
  copy.economy.netWorth = finite(
    copy.economy.cash
      + Object.values(copy.economy.assets).reduce((sum, value) => sum + value, 0)
      + copy.economy.homeValue
      + copy.economy.vehicleValue
      - copy.economy.debt,
  );
  if (copy.business && typeof copy.business === 'object') {
    copy.business = {
      status: ['operating', 'closed', 'sold'].includes(copy.business.status)
        ? copy.business.status
        : 'closed',
      sector: String(copy.business.sector ?? 'other'),
      capital: Math.max(0, finite(copy.business.capital)),
      debt: Math.max(0, finite(copy.business.debt)),
      equity: Math.max(0, finite(copy.business.equity)),
      years: Math.max(0, finite(copy.business.years)),
      lastGrowth: Number.isFinite(Number(copy.business.lastGrowth)) ? Number(copy.business.lastGrowth) : 0,
    };
  } else {
    copy.business = null;
  }

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
  copy.reflections = copy.reflections && typeof copy.reflections === 'object' ? { ...copy.reflections } : {};
  copy.pendingReflectionId = /^reflection-(5|15|30|50|70)$/.test(String(copy.pendingReflectionId ?? ''))
    ? String(copy.pendingReflectionId)
    : null;
  copy.endedReason = typeof copy.endedReason === 'string' ? copy.endedReason : null;
  copy.epitaph = String(copy.epitaph ?? '').trim().slice(0, 120);
  copy.conditions = {
    chronic: Array.isArray(copy.conditions?.chronic) ? [...new Set(copy.conditions.chronic.map(String))] : [],
    losses: Array.isArray(copy.conditions?.losses) ? [...new Set(copy.conditions.losses.map(String))] : [],
    care: Array.isArray(copy.conditions?.care) ? [...new Set(copy.conditions.care.map(String))] : [],
  };
  copy.cohort = Array.isArray(copy.cohort)
    ? copy.cohort.filter((item) => item && typeof item === 'object').slice(0, 4).map((item) => structuredClone(item))
    : [];
  copy.riskFactors = normalizeRiskFactors(copy.riskFactors ?? {
    academicStress: 0,
    sleepDebt: 0,
    caffeineLoad: 0,
    support: 45,
  });
  copy.wellbeingHabits = normalizeWellbeingHabits(copy.wellbeingHabits, copy.decisions);
  copy.mentalHealthState = ['stable', 'strained', 'crisis'].includes(copy.mentalHealthState)
    ? copy.mentalHealthState
    : 'stable';
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
  const service = copy.service && typeof copy.service === 'object' ? copy.service : defaultServiceState();
  const serviceStatuses = new Set(['unassessed', 'active', 'supplementary', 'wartime-labor', 'exempt', 'recheck', 'not-target', 'completed']);
  copy.service = {
    status: serviceStatuses.has(service.status) ? service.status : 'unassessed',
    grade: Number.isInteger(Number(service.grade)) && Number(service.grade) >= 1 && Number(service.grade) <= 7
      ? Number(service.grade)
      : null,
    assessedAge: Number.isFinite(Number(service.assessedAge)) ? clamp(service.assessedAge, 0, 90) : null,
    completed: Boolean(service.completed),
    nextAssessmentAge: Number.isFinite(Number(service.nextAssessmentAge))
      ? clamp(service.nextAssessmentAge, 0, 90)
      : null,
  };
  copy.decisions = copy.decisions && typeof copy.decisions === 'object' ? { ...copy.decisions } : {};
  copy.history = orderTimeline(Array.isArray(copy.history)
    ? copy.history.filter((item) => item && typeof item === 'object' && typeof item.text === 'string')
    : []);
  copy.milestones = Array.isArray(copy.milestones)
    ? copy.milestones.filter((item) => item && typeof item === 'object' && typeof item.label === 'string')
    : [];
  copy.statHistory = Array.isArray(copy.statHistory)
    ? copy.statHistory.filter((item) => item && typeof item === 'object' && Number.isFinite(Number(item.age)))
    : [];
  copy.recentEventIds = Array.isArray(copy.recentEventIds) ? [...copy.recentEventIds].slice(-10) : [];
  copy.eraEventIds = Array.isArray(copy.eraEventIds)
    ? [...new Set(copy.eraEventIds.filter((id) => id !== null && id !== undefined).map(String))]
    : [];
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
  const annualEffects = Object.fromEntries(STAT_KEYS.map((key) => [key, focus.effects?.[key] ?? 0]));
  annualEffects.health += nextAge > 55 ? -1 : 0;
  annualEffects.happiness += rng.int(-1, 1);
  annualEffects.knowledge += nextAge <= 24 ? 1 : 0;
  const stats = applyDiminishingEffects(current, annualEffects).stats;

  let education = educationStateForAge(nextAge, current.education);
  const completionAge = { university: 22, college: 20, training: 19 }[education.level];
  if (education.status === 'enrolled' && completionAge && nextAge >= completionAge) {
    education.status = 'completed';
  }
  const lifeEnded = nextAge >= 45 && stats.health <= 0;
  const reviewing = nextAge >= 90 || lifeEnded;
  const profile = current.profile
    ? {
        ...current.profile,
        appearance: advanceAppearance(current.profile.appearance, {
          ...current,
          age: nextAge,
          stats,
        }),
      }
    : current.profile;

  const next = {
    ...current,
    profile,
    age: nextAge,
    year: current.year + 1,
    status: reviewing ? 'review' : 'living',
    rngState: rng.snapshot(),
    stats,
    education,
    economy: current.economy,
    career: current.career,
    statHistory: [...current.statHistory, { age: nextAge, ...stats }],
    processedTickIds: [...current.processedTickIds, normalizedTickId].slice(-8),
  };
  const advanced = normalizeLife(reviewing
    ? appendTimeline(next, [{
        id: `review-${nextAge}`,
        age: nextAge,
        year: current.year + 1,
        priority: 90,
        type: 'review',
        text: '지나온 삶을 천천히 돌아봅니다.',
      }])
    : next);
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
    life = normalizeLife(ensureServiceAssessment(life));
    const decision = getDecision(life);
    if (decision) life = chooseAutomatically(life, decision.id);

    if (life.age >= 25 && life.age < 65 && life.career.status === 'none') {
      const offer = getCareerOffers(life).find((item) => item.eligible);
      if (offer) life = acceptCareer(life, offer.career.id);
    }

    life = advanceYear(life, `automatic-${iterations}`);
    if (life.pendingIdentityDiscovery) {
      life = normalizeLife(acknowledgeIdentityDiscovery(life));
    }
    life = advanceCareer(life);
    life = advancePortfolio(life);
    life = advanceBusiness(life);
    life = calculateAnnualEconomy(life);
    life = applyEraEvent(life, selectEraEvent(life));
    for (const event of selectAnnualEvents(life)) life = applyEvent(life, event.id);
    life = updateRelationships(life);
    iterations += 1;
  }
  if (iterations >= 120 && life.status !== 'review') {
    throw new Error('자동 생애 시뮬레이션이 120회 안에 종료되지 않았습니다.');
  }
  return normalizeLife({ ...life, pendingDecisionId: null });
}
