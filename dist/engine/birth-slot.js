import {
  REGIONS,
  FAMILY_TYPES,
  OCCUPATIONS,
  FINANCES,
  HOUSING,
  SIBLINGS,
} from '../data.js';
import {
  ANCESTRY_OPTIONS,
  BIRTH_WEIGHT_NOTICE,
  DISABILITY_OPTIONS,
  GIVEN_NAME_SYLLABLES,
  KOREAN_SURNAMES,
  PERSONALITY_OPTIONS,
  SEX_OPTIONS,
} from '../data/birth-slot.js';
import { createRng, hashSeed } from './random.js';
import { createAppearance } from './appearance.js';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));
function createPersonality(rng) {
  const rolls = Array.from({ length: 3 }, () => rng.weighted(PERSONALITY_OPTIONS));
  const counts = Object.fromEntries(
    PERSONALITY_OPTIONS.map(({ id }) => [id, rolls.filter((item) => item.id === id).length]),
  );
  const dominant = Object.keys(counts).find((id) => counts[id] >= 2) ?? null;
  const strength = dominant ? (counts[dominant] === 3 ? 'extreme' : 'strong') : 'mixed';
  const dominantLabel = rolls.find((item) => item.id === dominant)?.label;
  const label = strength === 'extreme'
    ? `극도로 ${dominantLabel}`
    : strength === 'strong'
      ? `매우 ${dominantLabel}`
      : rolls.map((item) => item.label).join(' · ');
  return { rolls, counts, dominant, strength, label };
}

function createGuardians(rng, familyType) {
  const labels = familyType.value === '양부모 가정'
    ? ['어머니', '아버지']
    : familyType.value === '한부모 가정'
      ? [rng.pick(['어머니', '아버지'])]
      : familyType.value === '조부모와 함께 사는 가정'
        ? ['부모 보호자', '조부모 보호자']
        : Array.from({ length: familyType.guardianCount }, (_, index) => `보호자 ${index + 1}`);
  return labels.map((label) => ({
    label,
    age: rng.int(label.includes('조부모') ? 52 : 21, label.includes('조부모') ? 76 : 48),
    occupation: rng.weighted(OCCUPATIONS).value,
  }));
}

function createName(rng) {
  const surname = rng.weighted(KOREAN_SURNAMES).value;
  const first = rng.pick(GIVEN_NAME_SYLLABLES);
  let second = rng.pick(GIVEN_NAME_SYLLABLES);
  if (second === first) second = GIVEN_NAME_SYLLABLES[(GIVEN_NAME_SYLLABLES.indexOf(second) + 1) % GIVEN_NAME_SYLLABLES.length];
  return { surname, given: `${first}${second}`, full: `${surname}${first}${second}` };
}

export function createBirthSlotResult(seed, year = 2026) {
  const normalizedSeed = String(seed ?? 'one-in-50m');
  const rng = createRng(`birth:${normalizedSeed}:${year}`);
  const sex = rng.weighted(SEX_OPTIONS);
  const regionBase = rng.weighted(REGIONS);
  const region = {
    name: regionBase.name,
    short: regionBase.short,
    code: regionBase.code,
    district: rng.pick(regionBase.districts),
  };
  const familyType = rng.weighted(FAMILY_TYPES);
  const guardians = createGuardians(rng, familyType);
  const finance = rng.weighted(FINANCES);
  const housing = rng.weighted(HOUSING);
  const siblings = rng.weighted(SIBLINGS);
  const ancestry = rng.weighted(ANCESTRY_OPTIONS);
  const disability = rng.weighted(DISABILITY_OPTIONS);
  const appearance = createAppearance(rng, {
    sex: sex.id,
    sexLabel: sex.label,
    ancestry: ancestry.id,
    ancestryLabel: ancestry.label,
  });
  const personality = createPersonality(rng);
  const name = createName(rng);
  const religion = rng.weighted([
    { value: '무종교', weight: 51 },
    { value: '개신교', weight: 20 },
    { value: '불교', weight: 17 },
    { value: '천주교', weight: 11 },
    { value: '기타 종교', weight: 1 },
  ]).value;
  const urbanicity = /구$/.test(region.district) ? '대도시 생활권' : /시$/.test(region.district) ? '도시 생활권' : '군·읍면 생활권';
  const lifeExpectancy = Number((sex.id === 'female' ? rng.int(83, 89) : rng.int(77, 84)).toFixed(1));

  return {
    seed: normalizedSeed,
    year,
    sex,
    region,
    household: {
      familyType: familyType.value,
      guardians,
      siblings: siblings.value,
      grandparents: familyType.value === '조부모와 함께 사는 가정',
      summary: `${familyType.value} · ${siblings.value}`,
    },
    finance,
    housing,
    disability: disability.type ? disability : null,
    appearance,
    personality,
    name,
    religion,
    urbanicity,
    lifeExpectancy,
    childhoodSurvival: Number((99.4 + rng.next() * 0.5).toFixed(2)),
    simulationNotice: BIRTH_WEIGHT_NOTICE,
  };
}

export function profileFromSlotResult(result) {
  const finance = result.finance;
  const housing = result.housing;
  const rng = createRng(`profile:${result.seed}:${result.year}`);
  const stats = {
    health: clamp(64 + rng.int(-7, 7)),
    stability: clamp(57 + finance.stability + housing.stability + rng.int(-6, 6)),
    education: clamp(56 + finance.education + rng.int(-7, 7)),
    relationships: clamp(62 + rng.int(-8, 8)),
  };
  const idNumber = hashSeed(`${result.seed}:${result.year}:${result.name.full}`)
    .toString(16)
    .padStart(8, '0')
    .slice(0, 6)
    .toUpperCase();
  return {
    id: `KR-${result.year}-${result.region.code}-${idNumber}`,
    seed: result.seed,
    birthYear: result.year,
    sex: structuredClone(result.sex),
    region: { name: result.region.name, short: result.region.short, code: result.region.code },
    district: result.region.district,
    familyType: result.household.familyType,
    guardians: structuredClone(result.household.guardians),
    finance: finance.value,
    housing: housing.value,
    siblings: result.household.siblings,
    disability: result.disability ? structuredClone(result.disability) : null,
    appearance: structuredClone(result.appearance),
    personality: structuredClone(result.personality),
    name: structuredClone(result.name),
    religion: result.religion,
    urbanicity: result.urbanicity,
    lifeExpectancy: result.lifeExpectancy,
    childhoodSurvival: result.childhoodSurvival,
    stats,
    simulationNotice: result.simulationNotice,
    summary: `${result.year}년, ${result.region.name} ${result.region.district}에서 ${result.name.full}의 삶이 시작됩니다.`,
  };
}
