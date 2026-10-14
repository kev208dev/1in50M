import { YOUTH_DECISIONS } from './decisions-youth.js';
import { ADULT_DECISIONS } from './decisions-adult.js';
import { LATER_DECISIONS } from './decisions-later.js';

export const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

export const DECISIONS = [...YOUTH_DECISIONS, ...ADULT_DECISIONS, ...LATER_DECISIONS];

export const DECISION_BY_ID = Object.fromEntries(
  DECISIONS.map((decision) => [decision.id, decision]),
);
