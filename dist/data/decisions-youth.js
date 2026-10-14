import { EDUCATION_PATHS, POST_SECONDARY_PATHS } from './education.js';

const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

export const YOUTH_DECISIONS = [
  {
    id: 'mental-health-support', ageRange: [13, 29], priority: 120, weight: 5,
    title: '혼자 버티기 어려운 날',
    prompt: '잠과 식사가 무너지고 마음의 위기가 깊어졌습니다. 지금은 성적보다 안전과 회복이 먼저입니다.',
    sourceKey: 'youthCaffeineMentalHealth2024',
    overridePolicy: 'forbidden',
    when: (life) => life.mentalHealthState === 'crisis',
    choices: [
      choice('trusted-help', '믿을 만한 어른과 전문가에게 알린다', '보호자·교사·상담 전문가와 현재 상태를 나누고 회복 계획을 만듭니다.', { happiness: 5, relationships: 4 }, ['도움', '상담'], { riskEffects: { academicStress: -32, sleepDebt: -12, caffeineLoad: -10, support: 45 }, habitEffects: { privateEducation: false, gradePressure: false, nighttimeStudy: null } }),
      choice('reduce-schedule', '일정을 줄이고 제대로 쉰다', '학원과 밤샘을 멈추고 잠과 식사를 회복의 기준으로 삼습니다.', { health: 5, happiness: 4 }, ['휴식', '회복'], { riskEffects: { academicStress: -25, sleepDebt: -35, caffeineLoad: -25, support: 12 }, habitEffects: { privateEducation: false, gradePressure: false, nighttimeStudy: null } }),
      choice('peer-support', '친구와 함께 도움을 청한다', '혼자 설명하기 어려운 마음을 친구와 나누고 어른에게 연결을 부탁합니다.', { happiness: 4, relationships: 5 }, ['친구', '도움'], { riskEffects: { academicStress: -18, sleepDebt: -10, caffeineLoad: -8, support: 35 } }),
    ],
  },
  {
    id: 'after-school-care', ageRange: [7, 9], weight: 2,
    title: '수업이 끝난 뒤의 시간',
    prompt: '보호자가 돌아오기 전까지 오후 시간을 어디에서 보낼까요?',
    sourceKey: 'socialTrends2025',
    choices: [
      choice('after-school', '학교 돌봄교실에 간다', '익숙한 공간에서 또래와 저녁까지 지냅니다.', { relationships: 2, knowledge: 1 }, ['돌봄', '또래']),
      choice('academy', '동네 학원으로 간다', '배움은 늘지만 이동과 숙제가 하루를 채웁니다.', { knowledge: 3, happiness: -1 }, ['사교육', '피로']),
      choice('relative', '가까운 가족에게 간다', '조부모나 친척과 일상을 나눕니다.', { relationships: 3, happiness: 1 }, ['가족 돌봄']),
      choice('home', '집에서 스스로 보낸다', '혼자만의 리듬을 익히지만 심심한 날도 생깁니다.', { knowledge: 1, relationships: -1 }, ['자율']),
    ],
  },
  {
    id: 'private-education', ageRange: [10, 12], weight: 2,
    title: '학원가의 저녁',
    prompt: '주변 친구들이 여러 학원을 다니기 시작했습니다. 우리 집의 시간과 비용은 한정되어 있습니다.',
    sourceKey: 'privateEducation2024',
    choices: [
      choice('core-subjects', '주요 과목 학원을 다닌다', '성적에 집중하는 대신 저녁 시간이 짧아집니다.', { knowledge: 4, happiness: -2 }, ['학업', '비용'], { riskEffects: { academicStress: 12, sleepDebt: 6 }, habitEffects: { privateEducation: true } }),
      choice('arts-sports', '예체능 하나를 오래 배운다', '좋아하는 분야에서 성취감과 친구를 얻습니다.', { happiness: 3, health: 1, relationships: 1 }, ['취미', '비용']),
      choice('public-program', '방과후학교를 활용한다', '비용을 아끼며 학교 안에서 배움을 이어갑니다.', { knowledge: 2, relationships: 1 }, ['비용 절약']),
      choice('rest', '학원 대신 쉬고 논다', '비교에서 잠시 벗어나 생활의 여유를 지킵니다.', { happiness: 4, health: 1 }, ['회복'], { riskEffects: { academicStress: -12, sleepDebt: -8, support: 3 } }),
    ],
  },
  {
    id: 'family-relocation', ageRange: [11, 14],
    title: '가족의 이사 이야기',
    prompt: '보호자의 일과 주거비 때문에 다른 동네로 옮길 가능성이 생겼습니다.',
    choices: [
      choice('move-together', '가족과 함께 전학한다', '새 동네에서 다시 친구를 만들기로 합니다.', { relationships: -1, knowledge: 1 }, ['전학', '환경 변화']),
      choice('commute', '학교는 그대로 다닌다', '관계는 지키지만 통학 시간이 길어집니다.', { relationships: 2, health: -1 }, ['통학']),
      choice('stay-relative', '학기까지 친척 집에 머문다', '변화를 늦추는 대신 가족과 떨어져 지냅니다.', { knowledge: 1, happiness: -1 }, ['가족 분리']),
    ],
  },
  {
    id: 'middle-school-rhythm', ageRange: [13, 14],
    title: '중학교의 생활 리듬',
    prompt: '시험, 친구, 동아리와 휴대전화가 한꺼번에 일상으로 들어옵니다.',
    choices: [
      choice('grades', '내신 관리에 집중한다', '수행평가와 시험 계획을 꼼꼼히 챙깁니다.', { knowledge: 4, happiness: -1 }, ['내신'], { riskEffects: { academicStress: 10, sleepDebt: 7 }, habitEffects: { gradePressure: true } }),
      choice('club', '동아리에서 역할을 맡는다', '좋아하는 일을 함께할 친구를 만듭니다.', { relationships: 3, happiness: 2 }, ['동아리']),
      choice('part-time-family', '집안일과 가족 일을 돕는다', '내 시간은 줄지만 가족의 부담을 나눕니다.', { relationships: 3, knowledge: -1 }, ['가족']),
      choice('steady', '성적과 휴식을 균형 있게 챙긴다', '큰 변화보다 오래 갈 수 있는 생활을 만듭니다.', { health: 2, happiness: 2, knowledge: 1 }, ['균형'], { riskEffects: { academicStress: -8, sleepDebt: -8, support: 2 }, habitEffects: { gradePressure: false } }),
    ],
  },
  {
    id: 'choose-high-school', ageRange: [15, 15], weight: 4, priority: 100,
    title: '어떤 고등학교로 갈까',
    prompt: '통학 거리, 성적, 관심 분야와 졸업 뒤의 계획을 함께 놓고 학교를 고릅니다.',
    sourceKey: 'privateEducation2024',
    choices: EDUCATION_PATHS.map((path) => ({ ...path, educationPath: path.id })),
  },
  {
    id: 'high-school-evening', ageRange: [16, 17],
    title: '고등학생의 저녁',
    prompt: '수업이 끝난 뒤 남은 시간을 성적, 경험, 돈, 회복 중 어디에 쓸까요?',
    sourceKey: 'privateEducation2024',
    when: (life) => life.education.level === 'high-school' || Boolean(life.education.schoolType),
    choices: [
      choice('study-room', '야간 자율학습을 한다', '학교에 남아 내신과 시험을 준비합니다.', { knowledge: 4, happiness: -2 }, ['내신', '긴 하루'], { riskEffects: { academicStress: 16, sleepDebt: 12, caffeineLoad: 5, support: -3 }, habitEffects: { nighttimeStudy: 'study-room' } }),
      choice('all-night-energy', '고카페인 음료로 밤을 새운다', '당장의 공부 시간은 늘지만 잠과 몸의 부담이 크게 쌓입니다.', { knowledge: 5, happiness: -3, health: -2 }, ['내신', '밤샘', '위험'], { riskEffects: { academicStress: 15, sleepDebt: 22, caffeineLoad: 28, support: -10 }, habitEffects: { nighttimeStudy: 'all-night-energy' } }),
      choice('part-time', '주말 아르바이트를 한다', '용돈과 경험을 얻지만 회복 시간이 줄어듭니다.', { knowledge: 1, health: -1 }, ['아르바이트'], { economyEffects: { cash: 1800000 } }),
      choice('portfolio', '동아리·실기·자격증을 준비한다', '관심 분야의 결과물을 쌓습니다.', { knowledge: 3, happiness: 1 }, ['진로 준비']),
      choice('rest', '집에서 충분히 쉰다', '수면과 마음의 여유를 먼저 지킵니다.', { health: 3, happiness: 2 }, ['회복'], { riskEffects: { academicStress: -15, sleepDebt: -18, caffeineLoad: -10, support: 2 }, habitEffects: { nighttimeStudy: null } }),
    ],
  },
  {
    id: 'after-graduation', ageRange: [18, 18], weight: 4, priority: 100,
    title: '졸업 뒤의 길',
    prompt: '간판보다 비용, 적성, 준비 기간과 취업 가능성을 함께 살펴봅니다.',
    sourceKey: 'socialTrends2025',
    choices: POST_SECONDARY_PATHS.map((path) => ({ ...path, postSecondaryPath: path.id })),
  },
  {
    id: 'tuition-and-work', ageRange: [19, 23],
    title: '등록금과 생활비',
    prompt: '수업을 이어가면서 교통비와 생활비를 마련해야 합니다.',
    sourceKey: 'socialTrends2025',
    when: (life) => life.education.status === 'enrolled' && life.education.level !== 'high-school',
    choices: [
      choice('loan', '학자금 대출을 이용한다', '수업 시간은 지키지만 졸업 뒤 갚을 돈이 생깁니다.', { knowledge: 3, happiness: -1 }, ['학자금'], { economyEffects: { debt: 8000000, cash: 8000000 } }),
      choice('part-time', '학기 중 아르바이트를 한다', '생활비를 직접 벌지만 공부 시간이 줄어듭니다.', { knowledge: -1, health: -1 }, ['아르바이트'], { economyEffects: { cash: 6000000 } }),
      choice('scholarship', '장학금과 교내근로에 도전한다', '신청과 성적 관리가 필요하지만 부담을 덜 수 있습니다.', { knowledge: 2, happiness: 1 }, ['장학금'], { economyEffects: { cash: 3500000 } }),
      choice('leave', '휴학하고 돈을 모은다', '졸업은 늦어지지만 당장의 숨통을 틉니다.', { knowledge: 1, happiness: 1 }, ['휴학'], { economyEffects: { cash: 9000000 } }),
    ],
  },
  {
    id: 'service-path', ageRange: [20, 22],
    title: '복무와 다음 시간',
    prompt: '이 시기의 의무와 생활 계획을 단순화한 가상 선택입니다. 실제 법률 판정이 아닙니다.',
    choices: [
      choice('active-service', '현역 복무', '일정 기간 새로운 환경에서 생활합니다.', { health: -2, relationships: -1, knowledge: 1 }, ['시간 필요']),
      choice('alternative-service', '대체·보충 복무', '생활과 복무를 조율합니다.', { happiness: -1, knowledge: 1 }, ['생활 조율']),
      choice('not-applicable', '면제·비대상', '현재의 학업이나 일을 이어 갑니다.', { happiness: 1 }, ['현재 경로 유지']),
    ],
  },
];
