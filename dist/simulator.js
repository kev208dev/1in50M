import {
  REGIONS,
  FAMILY_TYPES,
  OCCUPATIONS,
  FINANCES,
  HOUSING,
  SIBLINGS,
} from './data.js';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

export function weightedPick(items, randomValue = Math.random()) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError('weightedPick requires at least one item');
  }

  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (total <= 0) return items[0];

  const unit = Math.min(Math.max(Number(randomValue) || 0, 0), 1 - Number.EPSILON);
  let cursor = unit * total;
  for (const item of items) {
    cursor -= Math.max(0, Number(item.weight) || 0);
    if (cursor < 0) return item;
  }
  return items.at(-1);
}

function randomIndex(length, randomFn) {
  return Math.min(length - 1, Math.floor(Math.min(Math.max(randomFn(), 0), 1 - Number.EPSILON) * length));
}

function variation(randomFn, size = 6) {
  return (randomFn() * size * 2) - size;
}

function createGuardians(familyType, randomFn) {
  return Array.from({ length: familyType.guardianCount }, (_, index) => ({
    label: familyType.value === '조부모와 함께 사는 가정' ? `주 보호자 ${index + 1}` : `보호자 ${index + 1}`,
    occupation: weightedPick(OCCUPATIONS, randomFn()).value,
  }));
}

export function createBirthProfile(randomFn = Math.random, year = 2026) {
  const region = weightedPick(REGIONS, randomFn());
  const district = region.districts[randomIndex(region.districts.length, randomFn)];
  const familyType = weightedPick(FAMILY_TYPES, randomFn());
  const finance = weightedPick(FINANCES, randomFn());
  const housing = weightedPick(HOUSING, randomFn());
  const siblings = weightedPick(SIBLINGS, randomFn());
  const guardians = createGuardians(familyType, randomFn);

  const stats = {
    health: clamp(64 + variation(randomFn, 7)),
    stability: clamp(57 + finance.stability + housing.stability + variation(randomFn, 6)),
    education: clamp(56 + finance.education + variation(randomFn, 7)),
    relationships: clamp(62 + variation(randomFn, 8)),
  };

  const idNumber = Math.floor(randomFn() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
  return {
    id: `KR-${year}-${region.code}-${idNumber}`,
    birthYear: year,
    region: { name: region.name, short: region.short, code: region.code },
    district,
    familyType: familyType.value,
    guardians,
    finance: finance.value,
    housing: housing.value,
    siblings: siblings.value,
    stats,
    summary: `${year}년, ${region.name} ${district}에서 새로운 삶이 시작됩니다.`,
  };
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (typeof profile.id !== 'string' || profile.id.length === 0) return false;
  if (!Number.isInteger(profile.birthYear)) return false;
  if (!profile.region || ['name', 'short', 'code'].some((key) => typeof profile.region[key] !== 'string')) return false;
  if (['district', 'familyType', 'finance', 'housing', 'siblings', 'summary'].some((key) => typeof profile[key] !== 'string')) return false;
  if (!Array.isArray(profile.guardians) || profile.guardians.length === 0) return false;
  if (!profile.guardians.every((guardian) => (
    guardian
    && typeof guardian === 'object'
    && typeof guardian.label === 'string'
    && typeof guardian.occupation === 'string'
  ))) return false;
  const stats = profile.stats;
  const statKeys = ['health', 'stability', 'education', 'relationships'];
  return Boolean(
    stats
    && typeof stats === 'object'
    && !Array.isArray(stats)
    && Object.keys(stats).length === statKeys.length
    && statKeys.every((key) => (
      Number.isFinite(stats[key]) && stats[key] >= 0 && stats[key] <= 100
    )),
  );
}
