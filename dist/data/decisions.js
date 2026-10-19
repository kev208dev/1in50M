import { YOUTH_DECISIONS } from './decisions-youth.js';
import { ADULT_DECISIONS } from './decisions-adult.js';
import { LATER_DECISIONS } from './decisions-later.js';
import { FINANCE_DECISIONS } from './decisions-finance.js';
import { DILEMMA_DECISIONS } from './scenes/index.js';

export const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

const PERSONALITY_RULES = {
  impulsive: ['바로', '도전', '위험', '창업', '이동', '독립', '다른 경로', '공개'],
  confrontational: ['협상', '경계', '조율', '잔류', '직접', '공개', '역할'],
  calm: ['균형', '학업', '관리', '준비', '안정', '유지', '공공', '계획', '전문'],
  optimistic: ['도전', '새로운', '경험', '공동체', '이동', '창업', '탐색', '재교육'],
  pessimistic: ['비용 절약', '유보', '사생활', '자산 사용', '경계'],
  avoidant: ['휴식', '회복', '유보', '조용', '사생활', '유지', '쉰다'],
};

const PERSONALITY_IDS = Object.keys(PERSONALITY_RULES);
const FORBIDDEN_OVERRIDE_IDS = new Set([
  'mental-health-support',
  'service-path',
  'queer-trusted-friend',
  'queer-workplace',
  'relationship-path',
  'family-path',
  'childcare-career',
  'digital-healthcare-access',
  // 돈·집·건강처럼 되돌리기 어려운 결정은 성향이 대신 고르지 않는다.
  'first-housing',
  'housing-path',
  'self-employment',
  'asset-allocation',
  'alternative-assets',
  'chance-money',
  'major-purchase',
  'startup-capital',
  'midlife-health-screening',
  'restructure',
  'family-support-vs-retirement',
  'retirement-income-gap',
  'retirement-path',
  'smaller-home-later',
]);

function inferPersonalityTags(choiceItem) {
  const text = [choiceItem.id, choiceItem.label, choiceItem.description, ...(choiceItem.tags ?? [])].join(' ');
  return PERSONALITY_IDS.filter((id) => PERSONALITY_RULES[id].some((term) => text.includes(term)));
}

function enrichDecision(decision) {
  return {
    ...decision,
    overridePolicy: decision.overridePolicy ?? (FORBIDDEN_OVERRIDE_IDS.has(decision.id) ? 'forbidden' : 'allowed'),
    choices: decision.choices.map((choiceItem) => ({
      ...choiceItem,
      personalityTags: choiceItem.personalityTags ?? inferPersonalityTags(choiceItem),
    })),
  };
}

export const DECISIONS = [
  ...YOUTH_DECISIONS,
  ...ADULT_DECISIONS,
  ...FINANCE_DECISIONS,
  ...LATER_DECISIONS,
].map(enrichDecision);

/** 누가 × 무슨 일로 펼쳐지는 작은 딜레마. 핵심 결정이 없는 해에만 가끔 등장한다. */
export const DILEMMAS = DILEMMA_DECISIONS.map(enrichDecision);

export const DECISION_BY_ID = Object.fromEntries(
  [...DECISIONS, ...DILEMMAS].map((decision) => [decision.id, decision]),
);
