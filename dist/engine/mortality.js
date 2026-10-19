import { createRng } from './random.js';
import { getStatistic } from './historical-context.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function baselineRisk(age) {
  if (age <= 0) return 0.0025;
  if (age <= 14) return 0.00015;
  if (age <= 24) return 0.00035;
  if (age <= 39) return 0.0008;
  if (age <= 54) return 0.0025 + (age - 40) * 0.00025;
  if (age <= 69) return 0.008 + (age - 55) * 0.0012;
  if (age <= 79) return 0.03 + (age - 70) * 0.006;
  if (age <= 89) return 0.1 + (age - 80) * 0.028;
  return 1;
}

export function annualMortalityRisk(life, ageOverride) {
  return mortalityProfile(life, ageOverride ?? life?.age).annualRisk;
}

export function mortalityProfile(life, age = life?.age) {
  const normalizedAge = Math.max(0, Math.trunc(Number(age) || 0));
  const birthYear = Number(life?.profile?.birthYear) || Number(life?.year) - Number(life?.age || 0);
  const sex = life?.profile?.sex?.id;
  const lifeTable = getStatistic('lifeExpectancy', {
    year: birthYear,
    sex,
  });
  const referenceTable = getStatistic('lifeExpectancy', { year: 9999, sex });
  const expectancyScale = lifeTable.value && referenceTable.value
    ? clamp((referenceTable.value / lifeTable.value) ** 2, 0.7, 1.8)
    : 1;
  const health = clamp(Number(life?.stats?.health ?? 60), 0, 100);
  const conditionCount = (life?.conditions?.chronic ?? []).length;
  const care = new Set(life?.conditions?.care ?? []);
  // 진단은 같아도 꾸준히 관리하는 쪽이 위험을 덜 키운다.
  const managed = care.has('regular-treatment') ? 0.12 : (care.has('lifestyle-care') || care.has('regular-checkup')) ? 0.07 : 0;
  const conditionLoad = Math.max(0, conditionCount * 0.18 - (conditionCount > 0 ? managed : 0));
  const healthScale = Math.max(0.35, 1 + ((50 - health) / 55) + conditionLoad);
  const specific = causeSpecificRisks(life, normalizedAge);
  const annualRisk = clamp(
    baselineRisk(normalizedAge) * healthScale * expectancyScale + specific.selfHarm + specific.caffeineCardiac,
    0.00001,
    1,
  );
  return {
    annualRisk: Number(annualRisk.toFixed(6)),
    sourceYear: lifeTable.year,
    sourceKey: lifeTable.sourceKey,
    kind: lifeTable.kind,
    lifeExpectancy: lifeTable.value,
    expectancyScale: Number(expectancyScale.toFixed(4)),
  };
}

const CAUSES = [
  { id: 'cardiovascular-disease', weight: 4, requiresCondition: 'cardiovascular' },
  { id: 'cancer', weight: 4, requiresCondition: 'cancer' },
  { id: 'respiratory-disease', weight: 3, requiresCondition: 'respiratory' },
  { id: 'age-related-disease', weight: 3, minimumAge: 75, maximumHealth: 65 },
  { id: 'other', weight: 2 },
];

export function selectDeathCause(life, roll = 0.5) {
  const chronic = new Set(life?.conditions?.chronic ?? []);
  const age = Number(life?.age) || 0;
  const health = Number(life?.stats?.health ?? 60);
  const eligible = CAUSES.filter((cause) => (
    (!cause.requiresCondition || chronic.has(cause.requiresCondition))
    && (!cause.minimumAge || age >= cause.minimumAge)
    && (!cause.maximumHealth || health <= cause.maximumHealth)
  ));
  const total = eligible.reduce((sum, cause) => sum + cause.weight, 0);
  let cursor = clamp(Number(roll) || 0, 0, 1 - Number.EPSILON) * total;
  for (const cause of eligible) {
    cursor -= cause.weight;
    if (cursor < 0) return cause.id;
  }
  return eligible.at(-1)?.id ?? 'other';
}

export function causeSpecificRisks(life, ageOverride) {
  const age = Math.max(0, Math.trunc(Number(ageOverride ?? life?.age) || 0));
  const factors = life?.riskFactors ?? {};
  const stress = clamp(Number(factors.academicStress ?? 0), 0, 100);
  const sleep = clamp(Number(factors.sleepDebt ?? 0), 0, 100);
  const caffeine = clamp(Number(factors.caffeineLoad ?? 0), 0, 100);
  const support = clamp(Number(factors.support ?? 0), 0, 100);
  const happiness = clamp(Number(life?.stats?.happiness ?? 60), 0, 100);
  const relationships = clamp(Number(life?.stats?.relationships ?? 60), 0, 100);

  const caffeineCardiac = age >= 13 && sleep >= 60 && caffeine >= 60
    ? clamp(((sleep - 55) * (caffeine - 55)) / 180000, 0, 0.008)
    : 0;
  // 위기가 처음 드러난 해에는 도움을 청할 선택지가 아직 주어지지 않았으므로 판정하지 않는다.
  const crisisSince = [...(life?.history ?? [])].reverse()
    .find((entry) => typeof entry?.id === 'string' && entry.id.startsWith('wellbeing-') && entry.id.endsWith('-crisis'))?.age;
  const severeCrisis = age >= 13
    && life?.mentalHealthState === 'crisis'
    && Number.isFinite(crisisSince) && crisisSince < age
    && stress >= 75
    && sleep >= 65
    && support <= 20
    && happiness <= 35
    && relationships <= 45;
  const selfHarm = severeCrisis
    ? clamp(0.001 + ((stress - 75) + (sleep - 65) + (20 - support)) / 30000, 0, 0.006)
    : 0;
  return {
    selfHarm: Number(selfHarm.toFixed(6)),
    caffeineCardiac: Number(caffeineCardiac.toFixed(6)),
  };
}

export function evaluateSurvival(life) {
  const age = Math.max(0, Math.trunc(Number(life?.age) || 0));
  const risk = mortalityProfile(life, age).annualRisk;
  const roll = createRng(`${life?.seed ?? 'life'}:mortality:${age}`).next();
  const survived = age < 90 && roll >= risk;
  const causes = causeSpecificRisks(life);
  const baseRisk = Math.max(0, risk - causes.selfHarm - causes.caffeineCardiac);
  let cause = null;
  if (!survived) {
    if (roll < causes.selfHarm) cause = 'self-harm';
    else if (roll < causes.selfHarm + causes.caffeineCardiac) cause = 'caffeine-cardiac';
    else if (roll < causes.selfHarm + causes.caffeineCardiac + baseRisk || age >= 90) {
      cause = selectDeathCause(life, createRng(`${life?.seed ?? 'life'}:death-cause:${age}`).next());
    }
  }
  return {
    survived,
    risk,
    roll: Number(roll.toFixed(6)),
    age,
    cause,
  };
}

export function survivalCurve(life) {
  let survival = 1;
  return Array.from({ length: 91 }, (_, age) => {
    if (age > 0) survival *= 1 - annualMortalityRisk(life, age);
    if (age === 90) survival = 0;
    return { age, survival: Number(clamp(survival, 0, 1).toFixed(5)) };
  });
}
