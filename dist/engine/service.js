import { josa } from '../data/scenes/josa.js';
import { createRng } from './random.js';

export const STATUS_BY_GRADE = {
  1: 'active',
  2: 'active',
  3: 'active',
  4: 'supplementary',
  5: 'wartime-labor',
  6: 'exempt',
  7: 'recheck',
};

export function defaultServiceState() {
  return {
    status: 'unassessed',
    grade: null,
    assessedAge: null,
    completed: false,
    nextAssessmentAge: null,
  };
}

export function isServiceTarget(profile) {
  return profile?.sex?.id === 'male' || profile?.sex === 'male';
}

function deterministicGrade(life) {
  const health = Math.max(0, Math.min(100, Number(life.stats?.health) || 0));
  const supportLevel = Math.max(0, Number(life.profile?.disability?.supportLevel) || 0);
  const rng = createRng(`${life.seed}:service:${life.age}:${life.profile?.birthYear ?? life.year - life.age}`);
  if (supportLevel >= 3 || health <= 20) return rng.pick([5, 6]);
  if (supportLevel >= 2 || health < 35) return rng.pick([4, 5]);
  if (health < 50) return rng.weighted([
    { value: 3, weight: 2 }, { value: 4, weight: 4 }, { value: 7, weight: 1 },
  ]).value;
  return rng.weighted([
    { value: 1, weight: 28 },
    { value: 2, weight: 32 },
    { value: 3, weight: 28 },
    { value: 4, weight: 12 },
  ]).value;
}

export function assessService(life) {
  if (!isServiceTarget(life.profile)) {
    return {
      status: 'not-target', grade: null, assessedAge: life.age, completed: true, nextAssessmentAge: null,
    };
  }
  const grade = deterministicGrade(life);
  return {
    status: STATUS_BY_GRADE[grade],
    grade,
    assessedAge: life.age,
    completed: [5, 6].includes(grade),
    nextAssessmentAge: grade === 7 ? life.age + 1 : null,
  };
}

export function serviceDecisionFor(life) {
  if (!['active', 'supplementary'].includes(life.service?.status)) return null;
  if (life.service.completed) return null;
  if (life.service.nextAssessmentAge && life.age < life.service.nextAssessmentAge) return null;
  return 'service-path';
}

const SERVICE_LABELS = {
  active: '현역',
  supplementary: '보충역',
  'wartime-labor': '전시근로역',
  exempt: '병역면제',
  recheck: '재검사',
  'not-target': '비대상',
};

export function ensureServiceAssessment(life) {
  const current = structuredClone(life);
  const state = current.service ?? defaultServiceState();
  const isDue = current.age >= 19 && (
    state.status === 'unassessed'
    || (state.status === 'recheck' && current.age >= (state.nextAssessmentAge ?? current.age + 1))
  );
  if (!isDue) return current;
  const service = assessService(current);
  return {
    ...current,
    service,
    history: [...(current.history ?? []), {
      id: `service-assessment-${current.age}`,
      age: current.age,
      year: current.year,
      type: 'service-assessment',
      text: service.status === 'recheck'
        ? '병역 판정에서 재검사가 결정되었습니다.'
        : `병역 상태가 ${SERVICE_LABELS[service.status]}${josa(SERVICE_LABELS[service.status], '으로/로')} 자동 판정되었습니다.`,
      serviceStatus: service.status,
      serviceGrade: service.grade,
    }],
  };
}
