import { DECISIONS, DECISION_BY_ID, DILEMMAS } from '../data/decisions.js';
import { DILEMMA_FAMILY_BY_ID } from '../data/scenes/index.js';
import { ASSET_MODELS } from '../data/financial-paths.js';
import { HOUSING_BY_ID } from '../data/housing.js';
import { normalizeLife } from './life.js';
import { createRng } from './random.js';
import { resolveAgencyChoice } from './agency.js';
import { applyFinancialAction, applyHousingTransition } from './finance.js';
import { startBusiness } from './business.js';
import { applyRiskEffects } from './wellbeing.js';
import { applyDiminishingEffects, describeAppliedChanges } from './stat-effects.js';
import { isAvailableInYear } from './historical-context.js';

function resolveChoice(life, choice) {
  if (choice.educationFunding) {
    const family = Math.min(choice.cost, life.economy.householdSupport);
    const cash = Math.min(choice.cost - family, Math.max(0, life.economy.cash));
    return { ...choice, educationFunding: { family, cash, loan: choice.cost - family - cash } };
  }
  if (!choice.flexibleInvestment) return choice;
  // Invest at most a tenth of liquid cash; never borrow or consume the whole buffer.
  const amount = Math.max(10000, Math.min(choice.financialAction.amount, Math.floor(Math.max(0, life.economy.cash) / 100000) * 10000));
  return { ...choice, minimumCash: amount * 10, financialAction: { ...choice.financialAction, amount } };
}

const visibleChoices = (life, decision) => decision.choices
  .filter((choice) => isAvailableInYear(choice, life.year))
  .map((choice) => resolveChoice(life, choice));

function availability(life, choice) {
  if (Number.isFinite(choice.maximumAge) && life.age > choice.maximumAge) {
    return { enabled: false, reason: '더 이상 복무 시기를 유예할 수 없습니다.' };
  }
  if (choice.serviceStatuses && !choice.serviceStatuses.includes(life.service?.status)) {
    return { enabled: false, reason: '현재 병역 판정에서 선택할 수 없는 경로입니다.' };
  }
  if (choice.requiresPartner && !life.relationships.partner) {
    return { enabled: false, reason: '함께 돌봄을 나눌 동반자 관계가 필요합니다.' };
  }
  if ((choice.minimumKnowledge ?? 0) > life.stats.knowledge) {
    return { enabled: false, reason: `지식 ${choice.minimumKnowledge} 이상이 필요합니다.` };
  }
  if ((choice.minimumHealth ?? 0) > life.stats.health) {
    return { enabled: false, reason: `건강 ${choice.minimumHealth} 이상이 필요합니다.` };
  }
  const financialModel = choice.financialAction?.type === 'buy'
    ? ASSET_MODELS[choice.financialAction.asset]
    : null;
  if (financialModel?.availableFromYear && life.year < financialModel.availableFromYear) {
    return { enabled: false, reason: `${financialModel.availableFromYear}년부터 선택할 수 있습니다.` };
  }
  const immediateSpend = Math.max(0, -(Number(choice.economyEffects?.cash) || 0));
  const requiredCash = Math.max(choice.minimumCash ?? 0, choice.educationFunding ? choice.educationFunding.cash : choice.cost ?? 0, immediateSpend);
  const availableMoney = choice.payer === 'household' && life.age < 18
    ? life.economy.householdSupport
    : life.economy.cash;
  if (requiredCash > 0 && requiredCash > availableMoney) {
    return { enabled: false, reason: choice.flexibleInvestment ? '생활비를 남기려면 현금 10만원 이상이 필요합니다.' : `${requiredCash.toLocaleString('ko-KR')}원의 여유 자금이 필요합니다.` };
  }
  return { enabled: true, reason: '' };
}

export function isDecisionEligible(life, decision) {
  const [minimumAge, maximumAge] = decision.ageRange ?? [decision.age, decision.age];
  return life.age >= minimumAge
    && life.age <= maximumAge
    && isAvailableInYear(decision, life.year)
    && !life.decisions[decision.id]
    && (typeof decision.when !== 'function' || decision.when(life));
}

function chooseWeightedDecision(life, candidates) {
  if (candidates.length <= 1) return candidates[0] ?? null;
  const highestPriority = Math.max(...candidates.map((item) => item.priority ?? 0));
  const prioritized = candidates.filter((item) => (item.priority ?? 0) === highestPriority);
  if (prioritized.length === 1) return prioritized[0];
  const rng = createRng(`${life.seed}:decision:${life.age}`);
  const total = prioritized.reduce((sum, item) => sum + Math.max(1, item.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const candidate of prioritized) {
    roll -= Math.max(1, candidate.weight ?? 1);
    if (roll < 0) return candidate;
  }
  return prioritized.at(-1) ?? null;
}

const DILEMMA_CHANCE = 0.24;
const inYears = (range, year) => !range || (year >= range[0] && year <= (range[1] ?? 9999));
const DILEMMAS_BY_FAMILY = DILEMMAS.reduce((groups, decision) => {
  (groups[decision.family] ??= []).push(decision);
  return groups;
}, {});

export function enabledChoiceCount(life, decision) {
  return visibleChoices(life, decision).filter((choiceItem) => availability(life, choiceItem).enabled).length;
}

function dilemmaVariantEligible(life, decision) {
  return life.age >= decision.ageRange[0]
    && life.age <= decision.ageRange[1]
    && !life.decisions[decision.id]
    && inYears(decision.years, life.year)
    && (!decision.when || decision.when(life))
    && (!decision.whenWho || decision.whenWho(life))
    && (!decision.whenDetail || decision.whenDetail(life))
    && enabledChoiceCount(life, decision) >= 2;
}

/** 핵심 결정이 없는 해에 가끔, 앞뒤 해와 겹치지 않게 작은 딜레마 하나를 고른다. */
export function pickDilemma(life) {
  if (life.age < 8) return null;
  const rng = createRng(`${life.seed}:dilemma:${life.age}`);
  if (rng.next() >= DILEMMA_CHANCE) return null;
  const crowded = (life.history ?? []).some((entry) => (
    (entry.type === 'decision' && entry.age >= life.age - 1)
    || (entry.type === 'era-event' && entry.age === life.age)
  ));
  if (crowded) return null;
  const lastAge = {};
  for (const entry of life.history ?? []) {
    const match = /^dilemma:([^:]+):/.exec(entry.decisionId ?? '');
    if (match) lastAge[match[1]] = entry.age;
  }
  const families = Object.entries(DILEMMAS_BY_FAMILY)
    .map(([familyId, variants]) => {
      const family = DILEMMA_FAMILY_BY_ID[familyId];
      if (lastAge[familyId] !== undefined && life.age - lastAge[familyId] < (family?.cooldown ?? 6)) return null;
      const open = variants.filter((decision) => dilemmaVariantEligible(life, decision));
      return open.length ? { familyId, weight: family?.weight ?? 1, open } : null;
    })
    .filter(Boolean);
  if (!families.length) return null;
  const total = families.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.next() * total;
  let chosen = families.at(-1);
  for (const item of families) {
    roll -= item.weight;
    if (roll < 0) { chosen = item; break; }
  }
  return chosen.open[Math.floor(rng.next() * chosen.open.length)];
}

export function getDecision(life, { dilemmas = false } = {}) {
  const current = normalizeLife(life);
  if (current.pendingDecisionId && DECISION_BY_ID[current.pendingDecisionId]) {
    const pending = DECISION_BY_ID[current.pendingDecisionId];
    return visibleChoices(current, pending).some((choiceItem) => availability(current, choiceItem).enabled) ? pending : null;
  }
  const core = chooseWeightedDecision(current, DECISIONS.filter((decision) => (
    isDecisionEligible(current, decision)
    && visibleChoices(current, decision).some((choiceItem) => availability(current, choiceItem).enabled)
  )));
  return core ?? (dilemmas ? pickDilemma(current) : null);
}

export function getChoices(life, decisionId) {
  const current = normalizeLife(life);
  const decision = DECISION_BY_ID[decisionId];
  if (!decision) return [];
  return visibleChoices(current, decision).map((item) => ({ ...item, ...availability(current, item) }));
}

function relationshipChoice(relationships, choiceId, year) {
  if (choiceId !== 'partnership') return relationships;
  return {
    ...relationships,
    partner: relationships.partner ?? { id: `partner-${year}`, name: '삶의 동반자', since: year },
  };
}

export function applyDecision(life, decisionId, choiceId) {
  const current = normalizeLife(life);
  const decision = DECISION_BY_ID[decisionId];
  const selected = getChoices(current, decisionId).find((item) => item.id === choiceId);
  if (!decision || !selected) throw new RangeError('알 수 없는 결정 또는 선택입니다.');
  if (!selected.enabled) throw new RangeError(selected.reason || '현재 선택할 수 없습니다.');

  const stats = applyDiminishingEffects(current, selected.effects).stats;
  const changes = Object.fromEntries(Object.keys(stats).map((key) => [key, stats[key] - current.stats[key]]));
  const economy = { ...current.economy };
  if (selected.educationFunding) {
    economy.householdSupport -= selected.educationFunding.family;
    economy.cash -= selected.educationFunding.cash;
    economy.otherDebt += selected.educationFunding.loan;
    economy.debt = economy.housingDebt + economy.otherDebt;
  } else if (selected.cost && !selected.housingType) {
    if (selected.payer === 'household' && current.age < 18) economy.householdSupport -= selected.cost;
    else economy.cash -= selected.cost;
  }
  for (const [key, value] of Object.entries(selected.economyEffects ?? {})) {
    if (key === 'debt') {
      economy.otherDebt = Math.max(0, economy.otherDebt + (Number(value) || 0));
      economy.debt = economy.housingDebt + economy.otherDebt;
    } else if (key === 'fixedCosts') {
      economy.recurringCosts = Math.max(0, economy.recurringCosts + (Number(value) || 0));
    } else if (key in economy) economy[key] += Number(value) || 0;
  }

  const education = { ...current.education };
  if (selected.educationPath) {
    education.schoolType = selected.educationPath;
    education.level = 'high-school';
    education.status = 'enrolled';
  }
  if (selected.postSecondaryPath) {
    education.level = selected.level;
    education.status = selected.id === 'employment' ? 'completed' : 'enrolled';
  }

  let career = { ...current.career };
  if (selected.careerTransition) {
    const annualIncome = Math.max(0, Math.round(selected.careerTransition.annualIncome ?? 0));
    career = {
      groupId: selected.careerTransition.groupId ?? null,
      careerId: selected.careerTransition.careerId ?? null,
      title: selected.careerTransition.title,
      status: selected.careerTransition.status,
      years: 0,
      annualIncome,
      history: [...current.career.history, {
        age: current.age,
        title: selected.careerTransition.title,
        action: 'started',
      }],
    };
    economy.income = Math.round(annualIncome / 12);
  }
  if (selected.careerStatus) {
    career.status = selected.careerStatus;
    if (selected.careerStatus === 'none') {
      career.groupId = null;
      career.careerId = null;
      career.title = null;
      career.years = 0;
      career.annualIncome = 0;
      economy.income = 0;
    }
  }
  if (selected.incomeScale && career.annualIncome > 0) {
    career.annualIncome = Math.round(career.annualIncome * selected.incomeScale);
    economy.income = Math.round(career.annualIncome / 12);
  }
  if (decisionId === 'retirement-path') {
    career.status = choiceId === 'retire' || choiceId === 'community' ? 'retired' : choiceId === 'part-time' ? 'part-time' : career.status;
  }

  if (decisionId === 'mid-career' && choiceId === 'change') {
    career.history = [...career.history, { age: current.age, title: career.title, action: 'left' }];
    career.groupId = null;
    career.careerId = null;
    career.title = null;
    career.status = 'none';
    career.years = 0;
    career.annualIncome = 0;
    economy.income = 0;
  }

  let housing = current.housing;
  if (selected.housingType) {
    const option = HOUSING_BY_ID[selected.housingType];
    Object.assign(economy, applyHousingTransition({ ...current, economy }, option).economy);
    housing = { ...current.housing, type: option.id };
  }
  if (selected.housingRegion) housing = { ...housing, region: selected.housingRegion, district: '' };
  let relationships = relationshipChoice(current.relationships, choiceId, current.year);
  if (selected.relationshipNote) {
    relationships = {
      ...relationships,
      friends: [...relationships.friends, {
        id: `friend-${decisionId}-${current.year}`,
        name: selected.relationshipNote,
        since: current.year,
      }],
    };
  }
  if (decisionId === 'family-path' && choiceId === 'welcome-child') {
    relationships = {
      ...relationships,
      children: [...relationships.children, { id: `child-${current.year}`, name: '자녀', since: current.year }],
    };
  }

  const conditions = structuredClone(current.conditions);
  for (const key of ['chronic', 'losses', 'care']) {
    if (selected.conditionEffects?.[key]) {
      conditions[key] = [...new Set([...conditions[key], ...selected.conditionEffects[key].map(String)])];
    }
  }

  let next = {
    ...current,
    stats,
    economy,
    education,
    career,
    housing,
    relationships,
    conditions,
    wellbeingHabits: { ...current.wellbeingHabits, ...(selected.habitEffects ?? {}) },
    focusId: selected.focusId ?? current.focusId,
    pendingDecisionId: null,
    decisions: { ...current.decisions, [decisionId]: choiceId },
    history: [...current.history, {
      id: `decision-${decisionId}`,
      age: current.age,
      year: current.year,
      type: 'decision',
      text: `${decision.title}: ${selected.label}.${describeAppliedChanges(changes) ? ` ${describeAppliedChanges(changes)}` : ''}`,
      decisionId,
      choiceId,
      label: selected.label,
      changes,
    }],
    milestones: [...current.milestones, { age: current.age, type: 'decision', label: selected.label }],
  };
  if (decisionId === 'service-path') {
    if (selected.serviceAction === 'complete') {
      next.service = { ...current.service, status: 'completed', completed: true, nextAssessmentAge: null };
    } else if (selected.serviceAction === 'defer') {
      next.service = { ...current.service, completed: false, nextAssessmentAge: current.age + 1 };
      delete next.decisions['service-path'];
    }
  }
  if (selected.financialAction) next = applyFinancialAction(next, selected.financialAction);
  if (selected.businessPlan) next = startBusiness(next, selected.businessPlan);
  if (selected.riskEffects) next = applyRiskEffects(next, selected.riskEffects);
  return normalizeLife(next);
}

export function applyUserDecision(life, decisionId, requestedChoiceId) {
  const current = normalizeLife(life);
  const decision = DECISION_BY_ID[decisionId];
  const choices = getChoices(current, decisionId);
  const requested = choices.find((choiceItem) => choiceItem.id === requestedChoiceId);
  if (!decision || !requested) throw new RangeError('알 수 없는 결정 또는 선택입니다.');
  if (!requested.enabled) throw new RangeError(requested.reason || '현재 선택할 수 없습니다.');
  const resolution = resolveAgencyChoice(current, decision, requested, choices);
  const next = applyDecision(current, decisionId, resolution.actualChoiceId);
  if (resolution.overridden) {
    const lastIndex = next.history.length - 1;
    next.history[lastIndex] = {
      ...next.history[lastIndex],
      requestedChoiceId: resolution.requestedChoiceId,
      agencyOverride: true,
      agencyReason: resolution.reason,
      text: `${decision.title}: ${resolution.actualLabel} — ${resolution.reason}`,
    };
  }
  return { ...resolution, life: normalizeLife(next) };
}

export function chooseAutomatically(life, decisionId) {
  const current = normalizeLife(life);
  const available = getChoices(current, decisionId).filter((item) => item.enabled);
  if (available.length === 0) return current;
  const lowestStat = Object.entries(current.stats).sort((a, b) => a[1] - b[1])[0][0];
  const selected = [...available].sort((a, b) => (
    (b.effects?.[lowestStat] ?? 0) - (a.effects?.[lowestStat] ?? 0)
  ))[0];
  return applyDecision(current, decisionId, selected.id);
}
