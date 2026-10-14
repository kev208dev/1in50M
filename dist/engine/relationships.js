import { HOUSING_BY_ID } from '../data/housing.js';
import { normalizeLife } from './life.js';
import { createRng } from './random.js';

export function updateRelationships(life) {
  const current = normalizeLife(life);
  const rng = createRng(`${current.seed}:relationships:${current.age}`);
  const friends = [...current.relationships.friends];
  if (current.age >= 7 && current.age <= 70 && friends.length < 6 && rng.next() < 0.45) {
    friends.push({ id: `friend-${current.age}`, name: `${current.age}세에 만난 친구`, since: current.year });
  }
  return normalizeLife({
    ...current,
    relationships: { ...current.relationships, friends },
  });
}

export function changeHousing(life, housingId) {
  const current = normalizeLife(life);
  const option = HOUSING_BY_ID[housingId];
  if (!option) return { ok: false, reason: '알 수 없는 주거 형태입니다.', life: current };
  if (current.economy.cash < option.requiredCash) {
    return { ok: false, reason: `${option.requiredCash.toLocaleString('ko-KR')}원의 여유 자금이 필요합니다.`, life: current };
  }

  const previousDeposit = current.economy.deposit;
  const economy = {
    ...current.economy,
    cash: current.economy.cash + previousDeposit - option.requiredCash,
    deposit: option.deposit ?? 0,
    assets: { ...current.economy.assets, deposits: option.deposit ?? 0 },
    homeValue: option.homeValue ?? 0,
    debt: option.debt ?? 0,
    fixedCosts: option.monthlyCost,
  };
  const next = normalizeLife({
    ...current,
    economy,
    housing: { ...current.housing, type: option.id },
    history: [...current.history, {
      id: `housing-${current.age}-${option.id}`,
      age: current.age,
      year: current.year,
      type: 'housing',
      text: `${option.label} 생활을 시작했습니다.`,
    }],
    milestones: [...current.milestones, { age: current.age, type: 'housing', label: option.label }],
  });
  return { ok: true, reason: '', life: next };
}
