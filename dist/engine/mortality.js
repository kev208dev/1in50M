import { createRng } from './random.js';

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
  const age = Math.max(0, Math.trunc(Number(ageOverride ?? life?.age) || 0));
  const health = clamp(Number(life?.stats?.health ?? 60), 0, 100);
  const healthModifier = health < 50 ? 1 + ((50 - health) / 40) : 1 - ((health - 50) / 180);
  const causeRisks = causeSpecificRisks(life, age);
  const risk = baselineRisk(age) * healthModifier + causeRisks.selfHarm + causeRisks.caffeineCardiac;
  return clamp(Number(risk.toFixed(6)), 0.00001, 1);
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
  const severeCrisis = age >= 13
    && life?.mentalHealthState === 'crisis'
    && stress >= 75
    && sleep >= 65
    && support <= 20
    && happiness <= 20
    && relationships <= 25;
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
  const risk = annualMortalityRisk(life);
  const roll = createRng(`${life?.seed ?? 'life'}:mortality:${age}`).next();
  const survived = age < 90 && roll >= risk;
  const causes = causeSpecificRisks(life);
  const baseRisk = Math.max(0, risk - causes.selfHarm - causes.caffeineCardiac);
  let cause = null;
  if (!survived) {
    if (roll < causes.selfHarm) cause = 'self-harm';
    else if (roll < causes.selfHarm + causes.caffeineCardiac) cause = 'caffeine-cardiac';
    else if (roll < causes.selfHarm + causes.caffeineCardiac + baseRisk || age >= 90) cause = 'other';
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
