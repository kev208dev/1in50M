const RISK_KEYS = ['academicStress', 'sleepDebt', 'caffeineLoad', 'support'];

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));

export function normalizeRiskFactors(input = {}) {
  return Object.fromEntries(RISK_KEYS.map((key) => [key, clamp(input[key])]));
}

export function applyRiskEffects(life, effects = {}) {
  const current = normalizeRiskFactors(life?.riskFactors);
  const riskFactors = Object.fromEntries(RISK_KEYS.map((key) => [
    key,
    clamp(current[key] + (Number(effects[key]) || 0)),
  ]));
  return { ...structuredClone(life), riskFactors };
}

export function wellbeingBurden(life) {
  const risk = normalizeRiskFactors(life?.riskFactors);
  return Math.max(0, Number((
    risk.academicStress * 0.4
    + risk.sleepDebt * 0.35
    + risk.caffeineLoad * 0.15
    - risk.support * 0.25
  ).toFixed(2)));
}

function deriveMentalHealthState(life, burden) {
  const happiness = clamp(life?.stats?.happiness);
  const relationships = clamp(life?.stats?.relationships);
  if (burden >= 68 && happiness <= 30 && relationships <= 35) return 'crisis';
  if (burden >= 45 || happiness <= 35) return 'strained';
  return 'stable';
}

export function advanceWellbeing(life) {
  const current = structuredClone(life);
  const risk = normalizeRiskFactors(current.riskFactors);
  const recovered = normalizeRiskFactors({
    academicStress: risk.academicStress - 4,
    sleepDebt: risk.sleepDebt - 6,
    caffeineLoad: risk.caffeineLoad - 9,
    support: risk.support,
  });
  const burden = wellbeingBurden({ ...current, riskFactors: recovered });
  const previousState = ['stable', 'strained', 'crisis'].includes(current.mentalHealthState)
    ? current.mentalHealthState
    : 'stable';
  const mentalHealthState = deriveMentalHealthState(current, burden);
  const stats = { ...current.stats };
  if (burden >= 68) {
    stats.health = clamp(stats.health - 4);
    stats.happiness = clamp(stats.happiness - 6);
  } else if (burden >= 45) {
    stats.health = clamp(stats.health - 2);
    stats.happiness = clamp(stats.happiness - 3);
  }
  const history = [...(current.history ?? [])];
  if (mentalHealthState !== previousState) {
    history.push({
      id: `wellbeing-${current.age}-${mentalHealthState}`,
      age: current.age,
      year: current.year,
      type: 'health',
      text: mentalHealthState === 'crisis'
        ? '학업 압박과 수면 부족이 겹치며 마음의 위기가 깊어졌습니다. 도움과 회복이 필요한 때입니다.'
        : mentalHealthState === 'strained'
          ? '지친 마음과 부족한 잠이 일상에 영향을 주기 시작했습니다.'
          : '생활 리듬과 마음의 상태가 다시 안정되었습니다.',
    });
  }
  return {
    ...current,
    stats,
    riskFactors: recovered,
    mentalHealthState,
    history,
  };
}
