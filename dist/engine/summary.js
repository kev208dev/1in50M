import { normalizeLife } from './life.js';
import { EDUCATION_BY_ID } from '../data/education.js';

function turningPoints(life) {
  const financePoints = (life.economy.transactions ?? [])
    .filter((item) => item.type !== 'market')
    .map((item) => {
      const labels = {
        lottery: item.tier === 'jackpot' ? '복권 대박' : '복권 구매',
        gamble: item.tier === 'loss' ? '도박 손실과 부채' : '도박 결과',
        startup: '창업 시작',
        property: '부동산 매입',
        'business-sale': '창업 회사 매각',
        'business-close': '사업 폐업',
      };
      const assetLabels = { deposits: '예금', bonds: '채권', stocks: '주식', crypto: '가상자산' };
      const label = labels[item.type]
        ?? (item.type === 'buy' ? `${assetLabels[item.asset] ?? '금융 자산'} 투자` : null);
      return label ? { age: item.age, label, type: 'finance' } : null;
    })
    .filter(Boolean);
  const candidates = [
    ...life.milestones.map((item) => ({ age: item.age, label: item.label, type: item.type })),
    ...life.history.filter((item) => ['decision', 'career', 'housing', 'event'].includes(item.type)).map((item) => ({ age: item.age, label: item.label ?? item.text, type: item.type })),
    ...financePoints,
  ];
  if (life.business?.status === 'sold') candidates.push({ age: life.age, label: '창업 회사 매각', type: 'finance' });
  if (life.business?.status === 'closed') candidates.push({ age: life.age, label: '사업 폐업', type: 'finance' });
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
  const chronological = unique.sort((a, b) => a.age - b.age);
  if (chronological.length <= 5) return chronological;
  const selected = Array.from({ length: 5 }, (_, index) => (
    chronological[Math.round((index * (chronological.length - 1)) / 4)]
  ));
  const economic = chronological.find((item) => (
    item.type === 'finance' || /창업|사업|주식|채권|복권|가상자산|도박/.test(item.label)
  ));
  if (economic && !selected.includes(economic)) selected[2] = economic;
  return selected.sort((a, b) => a.age - b.age);
}

const INFLUENCE_LABELS = {
  'education-access': '가정과 지역의 교육 접근성',
  'financial-buffer': '출생 가정의 경제적 안전망',
  'housing-pressure': '거주 지역의 주거 부담',
  'career-network': '보호자 직업이 만든 경력 정보망',
  'first-impression': '외모지상주의가 만든 첫인상 효과',
  'romance-first-impression': '외모가 관계의 첫인상에 준 영향',
  'service-impression': '외모가 서비스 상황의 첫인상에 준 영향',
};

function causalInfluences(life) {
  const ranked = Object.entries(life.profileInfluence?.modifiers ?? {})
    .filter(([id, value]) => INFLUENCE_LABELS[id] && Number.isFinite(Number(value)) && Number(value) !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const visible = ranked.filter(([, value]) => Math.abs(value) >= 5);
  for (const item of ranked) {
    if (visible.length >= 3) break;
    if (!visible.includes(item)) visible.push(item);
  }
  return visible.map(([id, value]) => ({
    id,
    label: INFLUENCE_LABELS[id],
    direction: value > 0 ? '유리' : '불리',
    value,
  }));
}

function getLongestCareer(life) {
  const entries = life.career.history.filter((entry) => entry?.title && Number.isFinite(Number(entry.age)));
  const durations = new Map();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.action !== 'started') continue;
    const end = entries.slice(index + 1).find((candidate) => candidate.action === 'left' || candidate.action === 'started');
    const endAge = end?.age ?? life.age;
    durations.set(entry.title, (durations.get(entry.title) ?? 0) + Math.max(0, endAge - entry.age));
  }
  const longest = [...durations.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return longest ?? life.career.title ?? '아직 정하지 않음';
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
  const longestCareer = getLongestCareer(current);
  const schoolId = current.education.schoolType;
  const school = EDUCATION_BY_ID[schoolId]?.label ?? '일반';
  const region = current.profile?.region?.name ?? '대한민국';
  const district = current.profile?.district ?? '';
  const finalRegion = `${current.housing.region}${current.housing.district ? ` ${current.housing.district}` : ''}`;
  const relationshipCount = current.relationships.family.length
    + current.relationships.friends.length
    + current.relationships.children.length
    + (current.relationships.partner ? 1 : 0);
  const influences = causalInfluences(current);
  const influenceSentence = influences.length
    ? `${influences.slice(0, 2).map((item) => `${item.label}이 ${item.direction}하게`).join(', ')} 작용했습니다.`
    : '출생 조건의 영향은 한 방향으로 단정할 수 없었습니다.';

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
    influences,
    turningPoints: turningPoints(current),
    narrative: `${region}에서 시작한 삶은 ${finalRegion}에서 ${current.age}세의 시간을 맞았습니다. ${influenceSentence} ${school} 경로를 지나 ${longestCareer}의 시간을 보냈고, 숫자로 다 담을 수 없는 선택과 관계가 한 사람의 생애를 만들었습니다.`,
    completedAt: new Date().toISOString(),
  };
}
