import { appearanceInfluence } from './appearance.js';

const METRO_CODES = new Set(['SEL', 'GGD', 'ICN']);
const NETWORK_OCCUPATIONS = new Set(['전문직', '사무·관리직', '교육·공공 서비스']);

export function createProfileInfluence(profile = {}) {
  const finance = String(profile.finance ?? '');
  const affluent = finance.includes('여유') ? 18 : finance.includes('빠듯') ? -16 : 0;
  const metro = METRO_CODES.has(profile.region?.code) ? 8 : 0;
  const guardianNetwork = (profile.guardians ?? [])
    .filter((guardian) => NETWORK_OCCUPATIONS.has(guardian?.occupation)).length * 4;
  const disabilityType = profile.disability?.type ?? null;

  return {
    modifiers: {
      'education-access': affluent + metro + Math.min(8, guardianNetwork),
      'financial-buffer': affluent,
      'housing-pressure': metro ? 10 : -2,
      'career-network': guardianNetwork,
      'first-impression': appearanceInfluence(profile.appearance, 'first-impression'),
      'romance-first-impression': appearanceInfluence(profile.appearance, 'romance'),
      'service-impression': appearanceInfluence(profile.appearance, 'service'),
    },
    tags: [profile.finance, profile.region?.code, disabilityType].filter(Boolean),
  };
}

export function getInfluenceModifier(life, tag) {
  return Number(life?.profileInfluence?.modifiers?.[tag]) || 0;
}
