import { createBirthSlotResult, profileFromSlotResult } from './birth-slot.js';
import { createRng } from './random.js';

const CAREERS = [
  '사무·기획', '공공서비스', '돌봄·보건', '교육', 'IT·데이터', '생산·기술',
  '문화·콘텐츠', '운송·물류', '서비스·판매', '자영업', '연구·전문', '농림어업',
];

const RELATIONSHIPS = ['혼자 사는 중', '친구와 가까이 지냄', '동반자와 함께', '가족을 꾸림', '지역 공동체와 함께'];

function createCompanion(profile, seed, index) {
  const companionSeed = `${seed}:companion:${index}`;
  const result = createBirthSlotResult(companionSeed, profile.birthYear);
  const companionProfile = profileFromSlotResult(result);
  const rng = createRng(`companion-life:${companionSeed}`);
  return {
    id: `peer-${index + 1}-${companionProfile.id}`,
    seed: companionSeed,
    name: companionProfile.name.full,
    sex: companionProfile.sex.label,
    region: companionProfile.region.short,
    district: companionProfile.district,
    familyType: companionProfile.familyType,
    finance: companionProfile.finance,
    appearance: companionProfile.appearance.description,
    personality: companionProfile.personality.label,
    lifespan: rng.int(58, 94),
    careerPath: rng.pick(CAREERS),
    relationshipPath: rng.pick(RELATIONSHIPS),
    migrationRegion: rng.pick([companionProfile.region.short, '서울', '경기', '부산', '대전', '제주']),
    age: 0,
    status: 'living',
    career: null,
    relationship: '가족과 함께',
    currentRegion: companionProfile.region.short,
    simulationNotice: '실제 사용자가 아닌 자동 생성된 가상 비교 인생입니다.',
  };
}

export function createCompanionLives(profile, seed, count = 4) {
  const safeCount = Math.min(8, Math.max(1, Math.trunc(Number(count) || 4)));
  return Array.from({ length: safeCount }, (_, index) => createCompanion(profile, String(seed), index));
}

export function advanceCompanionLives(companions, targetAge) {
  const requestedAge = Math.max(0, Math.trunc(Number(targetAge) || 0));
  return companions.map((companion) => {
    const age = Math.min(requestedAge, companion.lifespan);
    const living = requestedAge < companion.lifespan;
    return {
      ...companion,
      age,
      status: living ? 'living' : 'remembered',
      career: age >= 23 ? companion.careerPath : age >= 16 ? '진로를 탐색하는 중' : null,
      relationship: age >= 28 ? companion.relationshipPath : age >= 13 ? '친구 관계가 넓어지는 중' : '가족과 함께',
      currentRegion: age >= 20 ? companion.migrationRegion : companion.region,
    };
  });
}
