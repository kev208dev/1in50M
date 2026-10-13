import { DECISIONS, DECISION_BY_ID } from '../data/decisions.js';
import { normalizeLife } from './life.js';

function availability(life, choice) {
  if ((choice.minimumKnowledge ?? 0) > life.stats.knowledge) {
    return { enabled: false, reason: `지식 ${choice.minimumKnowledge} 이상이 필요합니다.` };
  }
  if ((choice.minimumHealth ?? 0) > life.stats.health) {
    return { enabled: false, reason: `건강 ${choice.minimumHealth} 이상이 필요합니다.` };
  }
  const requiredCash = Math.max(choice.minimumCash ?? 0, choice.cost ?? 0);
  if (requiredCash > life.economy.cash) {
    return { enabled: false, reason: `${requiredCash.toLocaleString('ko-KR')}원의 여유 자금이 필요합니다.` };
  }
  return { enabled: true, reason: '' };
}

export function getDecision(life) {
  const current = normalizeLife(life);
  if (current.pendingDecisionId && DECISION_BY_ID[current.pendingDecisionId]) {
    return DECISION_BY_ID[current.pendingDecisionId];
  }
  return DECISIONS.find((decision) => decision.age === current.age && !current.decisions[decision.id]) ?? null;
}

export function getChoices(life, decisionId) {
  const current = normalizeLife(life);
  const decision = DECISION_BY_ID[decisionId];
  if (!decision) return [];
  return decision.choices.map((item) => ({ ...item, ...availability(current, item) }));
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

  const stats = { ...current.stats };
  for (const [key, value] of Object.entries(selected.effects ?? {})) {
    if (key in stats) stats[key] += Number(value) || 0;
  }
  const economy = { ...current.economy };
  if (selected.cost) economy.cash -= selected.cost;

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

  const career = { ...current.career };
  if (decisionId === 'retirement-path') {
    career.status = choiceId === 'retire' || choiceId === 'community' ? 'retired' : choiceId === 'part-time' ? 'part-time' : career.status;
  }

  const housing = selected.housingType ? { ...current.housing, type: selected.housingType } : current.housing;
  const relationships = relationshipChoice(current.relationships, choiceId, current.year);

  return normalizeLife({
    ...current,
    stats,
    economy,
    education,
    career,
    housing,
    relationships,
    focusId: selected.focusId ?? current.focusId,
    pendingDecisionId: null,
    decisions: { ...current.decisions, [decisionId]: choiceId },
    history: [...current.history, {
      id: `decision-${decisionId}`,
      age: current.age,
      year: current.year,
      type: 'decision',
      text: `${decision.title}: ${selected.label}`,
      decisionId,
      choiceId,
      label: selected.label,
    }],
    milestones: [...current.milestones, { age: current.age, type: 'decision', label: selected.label }],
  });
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
