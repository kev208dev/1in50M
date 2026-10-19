const RISK_KEYS = ['academicStress', 'sleepDebt', 'caffeineLoad', 'support'];
const STUDY_HABIT_KEYS = ['privateEducation', 'gradePressure', 'nighttimeStudy'];

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));

export function normalizeRiskFactors(input = {}) {
  return Object.fromEntries(RISK_KEYS.map((key) => [key, clamp(input[key])]));
}

export function normalizeWellbeingHabits(input = {}, decisions = {}) {
  const inferred = {
    privateEducation: decisions['private-education'] === 'core-subjects',
    gradePressure: decisions['middle-school-rhythm'] === 'grades',
    nighttimeStudy: ['study-room', 'all-night-energy'].includes(decisions['high-school-evening'])
      ? decisions['high-school-evening']
      : null,
  };
  if (['trusted-help', 'reduce-schedule'].includes(decisions['mental-health-support'])) {
    Object.assign(inferred, { privateEducation: false, gradePressure: false, nighttimeStudy: null });
  }
  const habits = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(STUDY_HABIT_KEYS.map((key) => {
    if (!Object.prototype.hasOwnProperty.call(habits, key)) return [key, inferred[key]];
    if (key === 'nighttimeStudy') {
      return [key, ['study-room', 'all-night-energy'].includes(habits[key]) ? habits[key] : null];
    }
    return [key, Boolean(habits[key])];
  }));
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
  if (burden >= 62 && happiness <= 40) return 'crisis';
  if (burden >= 45 || happiness <= 35) return 'strained';
  return 'stable';
}

function persistentExposure(life) {
  const exposure = { academicStress: 0, sleepDebt: 0, caffeineLoad: 0, support: 0 };
  const habits = normalizeWellbeingHabits(life?.wellbeingHabits, life?.decisions);
  if (habits.privateEducation && life.age <= 15) {
    Object.assign(exposure, { academicStress: 6, sleepDebt: 3, caffeineLoad: 0, support: -1 });
  }
  if (habits.gradePressure && life.age <= 17) {
    exposure.academicStress += 7;
    exposure.sleepDebt += 5;
    exposure.support -= 1;
  }
  if (habits.nighttimeStudy === 'study-room' && life.age <= 21) {
    exposure.academicStress += 9;
    exposure.sleepDebt += 8;
    exposure.caffeineLoad += 4;
    exposure.support -= 1;
  }
  if (habits.nighttimeStudy === 'all-night-energy' && life.age <= 23) {
    exposure.academicStress += 13;
    exposure.sleepDebt += 15;
    exposure.caffeineLoad += 18;
    exposure.support -= 3;
  }
  return exposure;
}

export function advanceWellbeing(life) {
  const current = structuredClone(life);
  const risk = normalizeRiskFactors(current.riskFactors);
  const exposure = persistentExposure(current);
  const recovered = normalizeRiskFactors({
    academicStress: risk.academicStress - 4 + exposure.academicStress,
    sleepDebt: risk.sleepDebt - 6 + exposure.sleepDebt,
    caffeineLoad: risk.caffeineLoad - 9 + exposure.caffeineLoad,
    support: risk.support + exposure.support,
  });
  const burden = wellbeingBurden({ ...current, riskFactors: recovered });
  const previousState = ['stable', 'strained', 'crisis'].includes(current.mentalHealthState)
    ? current.mentalHealthState
    : 'stable';
  const mentalHealthState = deriveMentalHealthState(current, burden);
  const stats = { ...current.stats };
  if (burden >= 62) {
    stats.health = clamp(stats.health - 4);
    stats.happiness = clamp(stats.happiness - 6);
    stats.relationships = clamp(stats.relationships - 3);
  } else if (burden >= 45) {
    stats.health = clamp(stats.health - 2);
    stats.happiness = clamp(stats.happiness - 3);
    stats.relationships = clamp(stats.relationships - 1);
  }
  const history = [...(current.history ?? [])];
  if (mentalHealthState !== previousState) {
    history.push({
      id: `wellbeing-${current.age}-${mentalHealthState}`,
      age: current.age,
      year: current.year,
      type: 'health',
      text: mentalHealthState === 'crisis'
        ? '압박과 수면 부족이 겹치며 마음의 위기가 깊어졌습니다. 도움과 회복이 필요한 때입니다.'
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
