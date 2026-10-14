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

export const BASIC_APPEARANCE = {
  faces: [
    ['cat', '고양이상'], ['dog', '강아지상'], ['fox', '여우상'], ['rabbit', '토끼상'],
    ['bear', '곰상'], ['dinosaur', '공룡상'], ['gentle', '선한 인상'], ['cool', '무표정한 인상'],
  ],
  builds: [
    ['slender', '마른 체형'], ['average', '보통 체형'], ['curvy', '볼륨감 있는 체형'],
    ['toned', '탄탄한 체형'], ['muscular', '근육질 체격'], ['large', '큰 체격'],
  ],
  hair: [
    ['straight-short', '짧은 직모'], ['straight-long', '긴 직모'], ['wavy', '웨이브 머리'],
    ['curly-short', '짧은 곱슬머리'], ['curly-long', '긴 곱슬머리'],
  ],
  styles: [
    ['plain', '수수한 스타일'], ['neat', '단정한 스타일'], ['street', '스트리트 스타일'],
    ['sporty', '스포츠 스타일'], ['genderless', '젠더리스 스타일'], ['glamorous', '화려한 스타일'],
  ],
  skinTones: [
    ['light', '밝은 피부'], ['medium-light', '밝은 갈색 피부'], ['medium', '중간 피부색'],
    ['tan', '구릿빛 피부'], ['deep', '짙은 피부'],
  ],
};

export const KOREAN_SURNAMES = [
  ['김', 21], ['이', 15], ['박', 8.5], ['최', 4.7], ['정', 4.4], ['강', 2.4],
  ['조', 2.1], ['윤', 2.1], ['장', 2], ['임', 1.7], ['한', 1.5], ['오', 1.5],
  ['서', 1.5], ['신', 1.4], ['권', 1.4], ['황', 1.4], ['안', 1.3], ['송', 1.3],
].map(([value, weight]) => ({ value, weight }));

export const GIVEN_NAME_SYLLABLES = [
  '서', '하', '민', '준', '윤', '지', '아', '도', '현', '우', '예', '은', '수', '진', '연', '재',
  '시', '원', '태', '율', '채', '린', '건', '혁', '영', '나', '빈', '호', '주', '성', '온', '솔',
];
