export const EDUCATION_PATHS = [
  { id: 'general', label: '일반고', description: '폭넓은 교과를 배우며 진학과 취업을 함께 탐색합니다.', minimumKnowledge: 0, effects: { knowledge: 5, happiness: 0 }, tags: ['균형', '진학 탐색'] },
  { id: 'vocational', label: '특성화고', description: '현장 중심 기술과 직업 역량을 일찍 익힙니다.', minimumKnowledge: 0, effects: { knowledge: 2, happiness: 1 }, tags: ['기술', '취업 준비'] },
  { id: 'meister', label: '마이스터고', description: '산업 수요에 맞춘 전문 기술을 집중적으로 배웁니다.', minimumKnowledge: 48, effects: { knowledge: 6, happiness: -1 }, tags: ['전문 기술', '집중'] },
  { id: 'autonomous', label: '자율형 사립고', description: '다양한 심화 수업을 선택하는 대신 비용 부담이 큽니다.', minimumKnowledge: 62, minimumCash: 18000000, effects: { knowledge: 8, happiness: -2 }, cost: 12000000, tags: ['심화 학습', '비용이 큼'] },
  { id: 'special-purpose', label: '특수목적고', description: '특정 분야의 높은 학업 강도와 전문 과정을 경험합니다.', minimumKnowledge: 65, effects: { knowledge: 9, happiness: -3 }, tags: ['지식 필요', '전문 분야'] },
  { id: 'arts', label: '예술고', description: '창작과 표현을 중심으로 실기 역량을 키웁니다.', minimumKnowledge: 35, effects: { knowledge: 4, happiness: 4 }, tags: ['예술', '실기'] },
  { id: 'sports', label: '체육고', description: '훈련과 학업을 병행하며 신체 역량을 기릅니다.', minimumHealth: 55, effects: { health: 6, happiness: 2 }, tags: ['건강 필요', '훈련'] },
  { id: 'alternative', label: '대안학교·검정고시', description: '정해진 교실 밖에서 자신에게 맞는 학습 속도를 찾습니다.', minimumKnowledge: 0, effects: { knowledge: 3, happiness: 3 }, tags: ['다른 경로', '자율'] },
];

export const POST_SECONDARY_PATHS = [
  { id: 'university', label: '4년제 대학', level: 'university', minimumKnowledge: 58, cost: 28000000, effects: { knowledge: 12, happiness: -2 }, tags: ['지식 필요', '비용이 큼'] },
  { id: 'college', label: '전문대학', level: 'college', minimumKnowledge: 42, cost: 14000000, effects: { knowledge: 8, happiness: 0 }, tags: ['실무 학습', '비용 발생'] },
  { id: 'training', label: '직업훈련·자격증', level: 'training', minimumKnowledge: 0, cost: 3000000, effects: { knowledge: 7, happiness: 1 }, tags: ['기술', '빠른 준비'] },
  { id: 'employment', label: '바로 취업', level: 'high-school', minimumKnowledge: 0, cost: 0, effects: { knowledge: 2, happiness: 1 }, tags: ['소득 시작', '현장 경험'] },
  { id: 'startup-prep', label: '창업 준비', level: 'high-school', minimumKnowledge: 45, cost: 8000000, effects: { knowledge: 5, happiness: 0 }, tags: ['도전', '비용이 큼'] },
  { id: 'rest', label: '재도전·휴식', level: 'high-school', minimumKnowledge: 0, cost: 1000000, effects: { health: 3, happiness: 5 }, tags: ['회복', '다시 탐색'] },
];

export const EDUCATION_BY_ID = Object.fromEntries(EDUCATION_PATHS.map((path) => [path.id, path]));
export const POST_SECONDARY_BY_ID = Object.fromEntries(POST_SECONDARY_PATHS.map((path) => [path.id, path]));
