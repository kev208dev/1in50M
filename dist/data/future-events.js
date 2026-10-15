import { ERA_EVENT_SOURCES } from './history-events.js';

function projection(id, startYear, endYear, title, sourceKey, details = {}) {
  const [sourceLabel, sourceUrl] = ERA_EVENT_SOURCES[sourceKey];
  return {
    id,
    startYear,
    endYear,
    title,
    sourceKey,
    sourceLabel,
    sourceUrl,
    projection: true,
    ageRange: [0, 90],
    effects: {},
    economyEffects: {},
    weight: 1,
    ...details,
  };
}

export const FUTURE_EVENTS = [
  projection('ai-coworker', 2027, 2050, 'AI 동료와 일하는 하루', 'future-ai', {
    ageRange: [18, 70],
    text: 'AI 업무 도구가 일상적인 동료가 되면서 반복 업무보다 판단과 협업이 중요해졌습니다.',
    effects: { knowledge: 4, happiness: 1 },
  }),
  projection('automation-retraining', 2028, 2055, '자동화 전환 교육', 'future-ai', {
    ageRange: [20, 65],
    text: '업무 자동화가 빨라져 새로운 기술을 배우는 전환 교육에 참여했습니다.',
    effects: { knowledge: 5, happiness: -1 },
    economyEffects: { cash: -300000 },
  }),
  projection('autonomous-mobility', 2030, 2060, '자율주행 이동 생활', 'future-ai', {
    text: '자율주행 대중교통이 보편화되면서 통근 시간과 생활 반경이 달라졌습니다.',
    effects: { happiness: 2, relationships: 1 },
  }),
  projection('synthetic-media-fraud', 2027, 2060, '합성 미디어 사기 경보', 'future-ai', {
    ageRange: [13, 90],
    text: '정교한 합성 미디어 사기가 퍼져 신원과 정보를 확인하는 일이 일상이 되었습니다.',
    effects: { happiness: -2, knowledge: 2 },
    economyEffects: { cash: -200000 },
  }),
  projection('care-robot', 2032, 2070, '돌봄 로봇과 함께하는 생활', 'future-households', {
    ageRange: [55, 90],
    text: '돌봄 로봇과 원격 의료 지원이 혼자 사는 노년의 일상을 보조했습니다.',
    effects: { health: 3, happiness: 2 },
  }),
  projection('climate-extremes', 2027, 2070, '극한 기후에 적응하는 도시', 'future-climate', {
    text: '길어진 폭염과 집중호우에 맞춰 주거와 이동, 건강 관리 방식을 바꾸었습니다.',
    effects: { health: -3, happiness: -2 },
    economyEffects: { cash: -400000 },
  }),
  projection('single-household-services', 2027, 2065, '1인 가구 중심 생활 서비스', 'future-households', {
    ageRange: [18, 90],
    text: '1인 가구를 위한 주거와 돌봄, 소형 생활 서비스가 주변의 기본 인프라가 되었습니다.',
    effects: { happiness: 2, relationships: 1 },
  }),
];
