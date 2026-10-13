import { normalizeLife } from './life.js';

function turningPoints(life) {
  const candidates = [
    ...life.milestones.map((item) => ({ age: item.age, label: item.label, type: item.type })),
    ...life.history.filter((item) => ['decision', 'career', 'housing', 'event'].includes(item.type)).map((item) => ({ age: item.age, label: item.label ?? item.text, type: item.type })),
  ];
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = `${item.age}:${item.label}`;
    if (!item.label || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  const fallbacks = [
    { age: 0, type: 'birth', label: '삶의 시작' },
    { age: 7, type: 'school', label: '배움의 시작' },
    { age: 18, type: 'education', label: '첫 진로의 갈림길' },
    { age: 30, type: 'life', label: '삶의 기반을 만든 시간' },
    { age: life.age, type: 'review', label: '지나온 삶을 돌아본 날' },
  ];
  for (const item of fallbacks) {
    if (unique.length >= 5) break;
    if (!unique.some((entry) => entry.label === item.label)) unique.push(item);
  }
  return unique.slice(0, 5);
}

export function createLifeSummary(life) {
  const current = normalizeLife(life);
  const initial = current.profile?.stats ?? {};
  const statChanges = {
    health: current.stats.health - (initial.health ?? current.stats.health),
    happiness: current.stats.happiness - (initial.stability ?? current.stats.happiness),
    knowledge: current.stats.knowledge - (initial.education ?? current.stats.knowledge),
    relationships: current.stats.relationships - (initial.relationships ?? current.stats.relationships),
  };
  const longestCareer = [...current.career.history]
    .reverse()
    .find((entry) => entry.title)?.title ?? current.career.title ?? '아직 정하지 않음';
  const school = current.education.schoolType ?? '일반';
  const region = current.profile?.region?.name ?? '대한민국';
  const district = current.profile?.district ?? '';
  const finalRegion = `${current.housing.region}${current.housing.district ? ` ${current.housing.district}` : ''}`;
  const relationshipCount = current.relationships.family.length
    + current.relationships.friends.length
    + current.relationships.children.length
    + (current.relationships.partner ? 1 : 0);

  return {
    id: `${current.seed}-${current.year}`,
    seed: current.seed,
    age: current.age,
    birth: `${region} ${district}`.trim(),
    finalResidence: finalRegion.trim(),
    education: { level: current.education.level, schoolType: school },
    longestCareer,
    family: {
      guardians: current.relationships.family.length,
      hasPartner: Boolean(current.relationships.partner),
      children: current.relationships.children.length,
      closeRelationships: relationshipCount,
    },
    netWorth: current.economy.netWorth,
    finalStats: { ...current.stats },
    statChanges,
    turningPoints: turningPoints(current),
    narrative: `${region}에서 시작한 삶은 ${finalRegion}에서 ${current.age}세의 시간을 맞았습니다. ${school} 경로를 지나 ${longestCareer}의 시간을 보냈고, 숫자로 다 담을 수 없는 선택과 관계가 한 사람의 생애를 만들었습니다.`,
    completedAt: new Date().toISOString(),
  };
}
