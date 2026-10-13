import { ALL_CAREERS, CAREER_BY_ID } from '../data/careers.js';
import { createRng } from './random.js';
import { normalizeLife } from './life.js';

function educationEligible(life, required) {
  if (required === 'any') return true;
  return life.education.level === required || life.education.level === 'university';
}

export function getCareerOffers(life, limit = 6) {
  const current = normalizeLife(life);
  const rng = createRng(`${current.seed}:career:${current.age}:${current.housing.region}`);
  const ranked = ALL_CAREERS.map((career) => {
    const knowledgeGap = Math.max(0, career.requirements.knowledge - current.stats.knowledge);
    const educationOk = educationEligible(current, career.requirements.education);
    return {
      career,
      eligible: educationOk && knowledgeGap === 0,
      reason: !educationOk ? '요구 학력 경로가 필요합니다.' : knowledgeGap > 0 ? `지식 ${career.requirements.knowledge} 이상이 필요합니다.` : '',
      estimatedSalary: rng.int(career.salaryRange[0], career.salaryRange[1]),
      sort: (educationOk ? 100 : 0) - knowledgeGap + rng.next(),
    };
  }).sort((a, b) => b.sort - a.sort);
  const eligible = ranked.filter((offer) => offer.eligible);
  const pool = eligible.length >= limit ? eligible : ranked;
  return pool.slice(0, limit).map(({ sort, ...offer }) => offer);
}

export function acceptCareer(life, careerId) {
  const current = normalizeLife(life);
  const career = CAREER_BY_ID[careerId];
  if (!career) throw new RangeError('알 수 없는 직업입니다.');
  const offer = getCareerOffers(current, ALL_CAREERS.length).find((item) => item.career.id === careerId);
  const annualIncome = offer?.estimatedSalary ?? career.salaryRange[0];
  return normalizeLife({
    ...current,
    career: {
      groupId: career.groupId,
      careerId: career.id,
      title: career.title,
      status: 'employed',
      years: 0,
      annualIncome,
      history: [...current.career.history, { age: current.age, title: career.title, action: 'started' }],
    },
    economy: { ...current.economy, income: Math.round(annualIncome / 12) },
    history: [...current.history, { id: `career-${current.age}-${career.id}`, age: current.age, year: current.year, type: 'career', text: `${career.title}(으)로 일을 시작했습니다.` }],
    milestones: [...current.milestones, { age: current.age, type: 'career', label: career.title }],
  });
}

export function advanceCareer(life) {
  const current = normalizeLife(life);
  if (!['employed', 'part-time'].includes(current.career.status) || !current.career.careerId) return current;
  const career = CAREER_BY_ID[current.career.careerId];
  if (!career) return current;
  const nextYears = current.career.years + 1;
  const growthRate = nextYears % 3 === 0 ? 1.05 : 1.02;
  const annualIncome = Math.round(current.career.annualIncome * growthRate);
  return normalizeLife({
    ...current,
    career: { ...current.career, years: nextYears, annualIncome },
    economy: { ...current.economy, income: Math.round(annualIncome / 12) },
    stats: {
      ...current.stats,
      health: current.stats.health + career.healthEffect,
      happiness: current.stats.happiness - Math.max(0, career.stress - 3),
      relationships: current.stats.relationships + career.relationshipEffect,
    },
  });
}
