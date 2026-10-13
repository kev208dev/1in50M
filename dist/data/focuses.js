export const FOCUSES = [
  {
    id: 'growth',
    label: '공부·성장',
    description: '새로운 지식과 기술을 쌓습니다.',
    effects: { knowledge: 3, happiness: -1 },
  },
  {
    id: 'health',
    label: '건강 관리',
    description: '몸과 생활 리듬을 돌봅니다.',
    effects: { health: 3, happiness: 1 },
  },
  {
    id: 'relationships',
    label: '사람과 관계',
    description: '가족과 친구에게 시간을 씁니다.',
    effects: { relationships: 3, happiness: 1 },
  },
  {
    id: 'career',
    label: '돈과 경력',
    description: '일의 경험과 경제적 기반을 다집니다.',
    effects: { knowledge: 1, happiness: -1 },
    economyEffect: 0.02,
  },
  {
    id: 'balance',
    label: '휴식과 균형',
    description: '무리하지 않고 일상의 균형을 찾습니다.',
    effects: { health: 1, happiness: 2, relationships: 1 },
  },
];

export const FOCUS_BY_ID = Object.fromEntries(FOCUSES.map((focus) => [focus.id, focus]));
