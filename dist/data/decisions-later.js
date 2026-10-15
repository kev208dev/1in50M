const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

const hasChild = (life) => life.relationships.children.length > 0;
const isWorking = (life) => ['employed', 'part-time', 'self-employed'].includes(life.career.status);

export const LATER_DECISIONS = [
  {
    id: 'midlife-health-screening', ageRange: [50, 57], weight: 2,
    title: '검진 결과를 받아 든 날',
    prompt: '정기검진에서 혈압과 심혈관 위험을 꾸준히 살펴야 한다는 설명을 들었습니다.',
    sourceKey: 'olderAdults2024',
    choices: [
      choice('treatment', '진료와 약 복용을 이어간다', '정기 진료를 생활 일정에 넣습니다.', { health: 3, happiness: -1 }, ['만성질환 관리'], { conditionEffects: { chronic: ['cardiovascular'], care: ['regular-treatment'] } }),
      choice('lifestyle', '식사와 운동부터 바꾼다', '매일 지킬 수 있는 작은 습관부터 시작합니다.', { health: 2, happiness: 1 }, ['생활 습관'], { conditionEffects: { chronic: ['cardiovascular'] } }),
      choice('second-opinion', '다른 병원에서 다시 확인한다', '진단과 관리 방법을 한 번 더 확인합니다.', { knowledge: 2 }, ['재확인']),
    ],
  },
  {
    id: 'restructure', ageRange: [50, 59], weight: 2,
    title: '회사의 구조조정 소식',
    prompt: '조직이 줄어들며 희망퇴직과 잔류, 재교육 가운데 결정을 요구받습니다.',
    sourceKey: 'socialTrends2025',
    when: isWorking,
    choices: [
      choice('remain', '남아 다음 역할을 맡는다', '익숙한 조직을 지키지만 업무 변화와 압박을 감수합니다.', { knowledge: 2, happiness: -2 }, ['잔류']),
      choice('severance', '퇴직금을 받고 나온다', '현금을 확보하고 다음 일을 찾습니다.', { happiness: 1 }, ['희망퇴직'], { careerStatus: 'none', economyEffects: { cash: 24000000, income: -1500000 } }),
      choice('retrain', '재교육을 받고 직무를 옮긴다', '시간을 들여 다음 경력을 준비합니다.', { knowledge: 4, happiness: 1 }, ['재교육'], { careerStatus: 'none' }),
      choice('small-business', '작은 자영업을 시작한다', '경험을 바탕으로 직접 수입원을 만듭니다.', { knowledge: 2, health: -1 }, ['자영업'], { careerTransition: { status: 'self-employed', title: '소규모 자영업', annualIncome: 30000000 }, economyEffects: { cash: -10000000 } }),
    ],
  },
  {
    id: 'family-support-vs-retirement', ageRange: [50, 65],
    title: '자녀의 시작과 나의 노후',
    prompt: '자녀의 주거·교육 지원 요청과 노후 자금 계획이 같은 통장을 바라봅니다.',
    sourceKey: 'olderAdults2024',
    when: hasChild,
    choices: [
      choice('large-support', '목돈을 지원한다', '자녀의 출발을 돕지만 노후 자산이 줄어듭니다.', { relationships: 4, happiness: 1 }, ['가족 지원'], { economyEffects: { cash: -20000000 } }),
      choice('limited-support', '감당할 범위를 정한다', '관계를 지키면서 내 노후의 경계도 설명합니다.', { relationships: 2, knowledge: 1 }, ['경계'], { economyEffects: { cash: -5000000 } }),
      choice('no-money', '돈 대신 생활을 돕는다', '현금은 지키고 시간과 경험을 나눕니다.', { relationships: 3, health: -1 }, ['생활 지원']),
    ],
  },
  {
    id: 'retirement-income-gap', ageRange: [58, 64], weight: 2,
    title: '연금 전의 소득 공백',
    prompt: '정규 소득은 줄었지만 연금 수령 전까지 생활비가 계속 필요합니다.',
    sourceKey: 'olderAdults2024',
    when: (life) => life.career.status !== 'retired',
    choices: [
      choice('continue', '현재 일을 조금 더 이어간다', '소득을 지키되 회복 시간을 확보합니다.', { health: -1, knowledge: 1 }, ['소득 유지']),
      choice('part-time', '시간제 일로 전환한다', '소득은 줄이고 생활 리듬을 되찾습니다.', { health: 2, happiness: 2 }, ['시간제'], { careerStatus: 'part-time', incomeScale: 0.6 }),
      choice('spend-savings', '저축으로 공백을 건넌다', '일을 쉬지만 모아둔 돈을 생활비로 사용합니다.', { health: 2, happiness: 1 }, ['자산 사용'], { economyEffects: { cash: -12000000 } }),
      choice('new-license', '새 자격과 일자리를 준비한다', '다시 배우며 짧은 경력의 문을 엽니다.', { knowledge: 4, happiness: 1 }, ['재취업']),
    ],
  },
  {
    id: 'retirement-path', ageRange: [60, 69], weight: 2,
    title: '일 이후의 시간',
    prompt: '익숙했던 일의 속도를 어떻게 바꿀까요?',
    sourceKey: 'olderAdults2024',
    choices: [
      choice('retire', '은퇴한다', '일을 내려놓고 다른 일상을 엽니다.', { health: 2, happiness: 3 }, ['휴식']),
      choice('part-time', '시간제로 일한다', '소득과 생활 리듬을 함께 지킵니다.', { happiness: 1, relationships: 1 }, ['소득 유지'], { careerStatus: 'part-time', incomeScale: 0.5 }),
      choice('continue', '계속 일한다', '경험을 이어가지만 회복 시간을 챙깁니다.', { knowledge: 2, health: -1 }, ['경력 유지']),
      choice('community', '지역 활동을 시작한다', '새로운 관계와 역할을 만듭니다.', { relationships: 4, happiness: 2 }, ['지역 관계']),
    ],
  },
  {
    id: 'solo-aging', ageRange: [70, 79],
    title: '혼자 사는 집의 안전망',
    prompt: '아플 때 연락할 사람과 집 안의 안전, 식사를 어떻게 준비할지 생각합니다.',
    sourceKey: 'olderAdults2024',
    when: (life) => !life.relationships.partner || life.housing.type === 'monthly-rent',
    choices: [
      choice('neighbor-network', '이웃과 연락망을 만든다', '서로 안부를 확인하고 작은 도움을 주고받습니다.', { relationships: 4, happiness: 2 }, ['이웃']),
      choice('public-care', '공공 돌봄을 신청한다', '정기적인 안전 확인과 생활 지원을 연결합니다.', { health: 2, knowledge: 1 }, ['돌봄 서비스']),
      choice('family-home', '가족과 가까이 산다', '사생활 일부를 조정하고 도움받을 거리를 줄입니다.', { relationships: 3, happiness: 1 }, ['가족 가까이']),
      choice('stay-independent', '현재 생활을 유지한다', '익숙한 집에서 자립을 이어가며 비상 계획을 세웁니다.', { happiness: 2, knowledge: 1 }, ['자립']),
    ],
  },
  {
    id: 'digital-healthcare-access', ageRange: [70, 85],
    title: '예약과 진료가 화면 안으로',
    prompt: '병원 예약, 모바일 신분증과 금융 업무가 디지털 중심으로 바뀌었습니다.',
    sourceKey: 'olderAdults2024',
    choices: [
      choice('learn', '디지털 교육을 받는다', '천천히 반복하며 스스로 처리할 수 있는 일을 늘립니다.', { knowledge: 4, happiness: 1 }, ['디지털 교육']),
      choice('family-help', '가족에게 도움을 청한다', '필요한 일을 해결하지만 일정을 맞춰야 합니다.', { relationships: 2, knowledge: 1 }, ['가족 도움']),
      choice('community-desk', '주민센터·은행 창구를 이용한다', '이동은 필요하지만 대면 도움을 받습니다.', { relationships: 1, health: -1 }, ['대면 지원']),
      choice('simplify', '꼭 필요한 서비스만 남긴다', '복잡함을 줄이고 익숙한 방식에 집중합니다.', { happiness: 2 }, ['단순화']),
    ],
  },
  {
    id: 'late-life-community', ageRange: [75, 89], weight: 2,
    title: '오래 이어갈 하루',
    prompt: '일과 돌봄이 줄어든 시간에 어떤 관계와 활동을 남길까요?',
    sourceKey: 'olderAdults2024',
    choices: [
      choice('senior-job', '지역의 단시간 일을 한다', '작은 소득과 규칙적인 만남을 함께 얻습니다.', { relationships: 2, health: 1, happiness: 1 }, ['노인 일자리'], { careerTransition: { status: 'part-time', title: '지역 단시간 일자리', annualIncome: 4200000 } }),
      choice('club', '취미 모임에 나간다', '좋아하는 일을 매개로 새로운 친구를 만듭니다.', { relationships: 4, happiness: 3 }, ['취미']),
      choice('volunteer', '경험을 나누는 봉사를 한다', '쌓아온 기술과 이야기를 다음 사람에게 건넵니다.', { relationships: 3, knowledge: 2 }, ['봉사']),
      choice('quiet-days', '조용한 일상을 지킨다', '무리하지 않고 산책과 휴식의 리듬을 만듭니다.', { health: 3, happiness: 2 }, ['회복']),
    ],
  },
  {
    id: 'smaller-home-later', ageRange: [80, 89],
    title: '집의 크기와 돌봄 거리',
    prompt: '계단과 관리비가 부담이 되면서 더 작은 집이나 돌봄이 가까운 곳을 생각합니다.',
    sourceKey: 'olderAdults2024',
    choices: [
      choice('downsize', '작고 관리하기 쉬운 집으로 옮긴다', '생활 반경을 줄이고 안전을 높입니다.', { health: 2, happiness: 1 }, ['주거 축소'], { housingType: 'monthly-rent', conditionEffects: { care: ['accessible-housing'] } }),
      choice('family-nearby', '가족 가까이로 옮긴다', '도움을 주고받을 거리를 줄입니다.', { relationships: 3 }, ['가족 돌봄'], { conditionEffects: { care: ['family-nearby'] } }),
      choice('age-in-place', '현재 집을 고쳐 계속 산다', '손잡이와 조명을 보강해 익숙한 곳을 지킵니다.', { happiness: 2, knowledge: 1 }, ['살던 곳'], { conditionEffects: { care: ['home-adaptation'] } }),
    ],
  },
];
