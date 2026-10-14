export const BIRTH_WEIGHT_NOTICE =
  '실제 인구통계와 창작용 가중치를 함께 사용한 가상 시뮬레이션입니다.';

export const SEX_OPTIONS = [
  { id: 'female', label: '여성', weight: 49.8 },
  { id: 'male', label: '남성', weight: 50.2 },
];

export const PERSONALITY_OPTIONS = [
  ['impulsive', '충동적'],
  ['confrontational', '호전적'],
  ['calm', '차분한'],
  ['optimistic', '낙관적'],
  ['pessimistic', '부정적'],
  ['avoidant', '회피적'],
].map(([id, label]) => ({ id, label, weight: 1 }));

export const DISABILITY_OPTIONS = [
  { id: 'none', label: '비장애', type: null, supportLevel: 0, weight: 94.5 },
  { id: 'physical', label: '지체장애', type: 'mobility', supportLevel: 2, weight: 1.3 },
  { id: 'brain-lesion', label: '뇌병변장애', type: 'mobility', supportLevel: 3, weight: 0.6 },
  { id: 'visual', label: '시각장애', type: 'visual', supportLevel: 2, weight: 0.5 },
  { id: 'hearing', label: '청각장애', type: 'hearing', supportLevel: 2, weight: 0.7 },
  { id: 'developmental', label: '발달장애', type: 'developmental', supportLevel: 3, weight: 0.7 },
  { id: 'internal', label: '내부기관 장애', type: 'medical', supportLevel: 2, weight: 0.7 },
  { id: 'other', label: '그 밖의 장애', type: 'other', supportLevel: 2, weight: 1.0 },
];

export const ANCESTRY_OPTIONS = [
  { id: 'korean', label: '한국계', weight: 96.4 },
  { id: 'east-asian', label: '동아시아계', weight: 1.3 },
  { id: 'southeast-asian', label: '동남아시아계', weight: 0.9 },
  { id: 'white', label: '백인계', weight: 0.5 },
  { id: 'black', label: '흑인계', weight: 0.4 },
  { id: 'central-south-asian', label: '중앙·남아시아계', weight: 0.3 },
  { id: 'mixed-other', label: '다인종·기타 배경', weight: 0.2 },
];

export const KOREAN_SURNAMES = [
  ['김', 21], ['이', 15], ['박', 8.5], ['최', 4.7], ['정', 4.4], ['강', 2.4],
  ['조', 2.1], ['윤', 2.1], ['장', 2], ['임', 1.7], ['한', 1.5], ['오', 1.5],
  ['서', 1.5], ['신', 1.4], ['권', 1.4], ['황', 1.4], ['안', 1.3], ['송', 1.3],
].map(([value, weight]) => ({ value, weight }));

export const GIVEN_NAME_SYLLABLES = [
  '서', '하', '민', '준', '윤', '지', '아', '도', '현', '우', '예', '은', '수', '진', '연', '재',
  '시', '원', '태', '율', '채', '린', '건', '혁', '영', '나', '빈', '호', '주', '성', '온', '솔',
];
