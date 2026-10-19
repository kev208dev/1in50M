// Authored consequential routes. Salaries are game balance values, not job offers or benefit entitlements.
import * as c from './scenes/context.js';
const choice = (id, label, description, effects, extra = {}) => ({ id, label, description, effects, tags: [], ...extra });
const job = (title, annualIncome, status = 'employed') => ({ careerTransition: { title, annualIncome, status } });
const after = (life, decisionId, choiceId) => life.decisions[decisionId] === choiceId
  && life.history.some((entry) => entry.decisionId === decisionId && entry.age < life.age);
const route = (spec) => ({ priority: 5, overridePolicy: 'forbidden', ...spec });

export const OPPORTUNITY_DECISIONS = [
  route({
    id: 'income-recovery', ageRange: [19, 64], priority: 95,
    title: '이번 달부터 들어올 돈',
    prompt: '목돈이 없어도 시작할 수 있는 일을 비교합니다. 표시된 급여는 게임 속 연간 소득을 월로 나눈 값입니다.',
    when: (life) => life.career.status === 'none' && life.economy.cash < 3000000,
    choices: [
      choice('local-job', '지역 일자리부터 시작', '월 220만원. 시간을 내어 배우지만 여가는 줄어듭니다.', { knowledge: 1, happiness: -1 }, job('지역 초급 일자리', 26400000)),
      choice('paid-training', '유급 현장훈련에 참여', '월 180만원. 당장 급여는 적지만 다음 해 숙련직 경로가 열립니다.', { knowledge: 4, health: -1 }, job('유급 현장훈련생', 21600000, 'part-time')),
      choice('short-hours', '학업·돌봄과 시간제 일', '월 90만원. 공부와 돌봄 시간을 남기되 독립 생활비에는 부족할 수 있습니다.', { knowledge: 1, health: -1 }, job('지역 시간제 근무', 10800000, 'part-time')),
      choice('keep-searching', '회복하며 구직을 이어간다', '소득은 아직 없습니다. 생활비는 계속 나가지만 몸을 회복합니다.', { health: 3, happiness: 1 }),
    ],
  }),
  route({
    id: 'training-next-step', ageRange: [20, 65],
    title: '현장에서 배운 기술의 다음 값',
    prompt: '유급 훈련을 마친 뒤, 익숙한 현장에 남을지 다른 곳에서 기술을 쓸지 제안이 들어왔습니다.',
    when: (life) => after(life, 'income-recovery', 'paid-training') && life.career.title === '유급 현장훈련생',
    choices: [
      choice('regular', '주간 숙련직으로 전환', '월 270만원. 규칙적인 생활과 경력을 함께 쌓습니다.', { knowledge: 2, happiness: 1 }, job('현장 숙련직', 32400000)),
      choice('shift', '교대조로 더 번다', '월 320만원. 수입 대신 불규칙한 수면을 감수합니다.', { knowledge: 1, health: -3 }, job('교대 현장직', 38400000)),
      choice('study-work', '시간제로 일하며 더 배운다', '월 150만원. 수입을 줄이고 배움에 시간을 씁니다.', { knowledge: 5, happiness: 1 }, job('기술 학습 병행 근무', 18000000, 'part-time')),
    ],
  }),
  route({
    id: 'shift-recovery', ageRange: [21, 66],
    title: '통장과 수면 사이',
    prompt: '교대근무로 수입은 늘었지만 쉬는 날에도 잠이 불규칙합니다. 계속할 수 있는 방식이 필요합니다.',
    when: (life) => after(life, 'training-next-step', 'shift') && life.career.title === '교대 현장직',
    choices: [
      choice('daytime', '주간조로 옮긴다', '월 270만원으로 줄지만 몸과 일상을 회복합니다.', { health: 4, happiness: 2 }, job('현장 숙련직', 32400000)),
      choice('routine', '교대조를 유지하며 회복 계획', '수입은 유지합니다. 약속을 줄이고 휴식에 집중합니다.', { health: 1, relationships: -2 }),
      choice('mentor', '신입 교육 역할을 맡는다', '월 290만원. 현장 경험을 가르치는 일로 전환합니다.', { knowledge: 3, relationships: 2 }, job('현장 교육 담당', 34800000)),
    ],
  }),
  route({
    id: 'student-work-balance', ageRange: [19, 25],
    title: '수업표 옆에 적은 근무표',
    prompt: '수업과 생활비 사이에서 이번 학기의 시간을 정합니다. 일은 다음 해에도 급여로 이어집니다.',
    when: (life) => c.isUniversityStudent(life) && !c.isWorking(life),
    choices: [
      choice('campus-work', '수업 사이 교내 보조근무', '월 60만원. 수입은 적지만 이동 시간을 아낍니다.', { knowledge: 1, health: -1 }, job('교내 보조근무', 7200000, 'part-time')),
      choice('weekend-work', '주말 매장 근무', '월 100만원. 평일 수업을 지키고 주말 휴식을 줄입니다.', { relationships: 1, health: -2 }, job('주말 매장 근무', 12000000, 'part-time')),
      choice('study', '이번 학기는 수업에 집중', '일을 시작하지 않습니다. 남은 생활비와 가정 지원을 사용합니다.', { knowledge: 4, happiness: -1 }),
    ],
  }),
  route({
    id: 'care-return', ageRange: [25, 60],
    title: '돌봄 뒤 다시 쓰는 이력서',
    prompt: '자녀를 돌보느라 일을 쉰 시간이 있습니다. 소득과 돌봄 시간을 함께 맞출 방법을 찾습니다.',
    when: (life) => c.hasChildren(life) && !c.isWorking(life),
    choices: [
      choice('daytime', '등하원 사이 시간제 근무', '월 120만원. 돌봄 시간을 지키며 경력을 다시 잇습니다.', { knowledge: 2, health: -1 }, job('돌봄 병행 시간제 근무', 14400000, 'part-time')),
      choice('fulltime', '돌봄을 나누고 전일제 복귀', '월 250만원, 월 돌봄비 50만원. 경력과 지출이 함께 늘어납니다.', { knowledge: 3, health: -2 }, { ...job('경력 복귀 실무자', 30000000), economyEffects: { fixedCosts: 500000 } }),
      choice('network', '가까운 사람과 돌봄망 만들기', '당장의 소득은 없지만 서로 시간을 나눌 관계를 만듭니다.', { relationships: 4, happiness: 1 }, { relationshipNote: '함께 돌봄을 나누는 이웃' }),
    ],
  }),
  route({
    id: 'accessible-work', ageRange: [20, 60],
    title: '일할 능력과 일터의 문턱',
    prompt: '업무 자체보다 이동 동선과 근무 환경이 걸립니다. 필요한 조정을 말할지, 다른 환경을 찾을지 고민합니다.',
    when: (life) => c.hasDisability(life) && c.isEmployee(life),
    choices: [
      choice('adjustment', '업무 동선 조정을 요청', '현재 급여를 유지하며 조율합니다. 설명과 협의에 힘이 듭니다.', { health: 2, relationships: -1 }),
      choice('different-role', '접근 가능한 사무 지원직으로', '월 230만원의 새 업무로 옮깁니다. 이전 경력과는 다른 적응이 필요합니다.', { knowledge: 2, happiness: 1 }, job('사무 지원 실무자', 27600000)),
      choice('peer', '동료와 개선안을 함께 만든다', '당장 환경이 모두 바뀌지는 않지만 협력할 사람을 찾습니다.', { relationships: 3, knowledge: 1 }, { relationshipNote: '일터 접근성을 함께 고민하는 동료' }),
    ],
  }),
  route({
    id: 'regional-livelihood', ageRange: [22, 45],
    title: '떠나지 않고 벌 수 있을까',
    prompt: '군·읍면의 일자리와 익숙한 관계 사이에서, 지역에 남을 수 있는 소득 경로를 비교합니다.',
    when: (life) => c.isRural(life) && life.housing.region === life.profile?.region?.name
      && Boolean(life.housing.district) && !c.isSelfEmployed(life),
    choices: [
      choice('local-skilled', '지역 가공·유통 현장에 취업', '월 240만원. 생활권을 지키지만 일손이 몰리는 시기가 있습니다.', { knowledge: 2, health: -1 }, job('지역 가공·유통 종사자', 28800000)),
      choice('commute', '인근 도시로 통근', '월 280만원, 월 교통비 20만원. 더 벌지만 이동 시간이 늘어납니다.', { knowledge: 2, health: -2 }, { ...job('거점도시 통근 근무', 33600000), economyEffects: { fixedCosts: 200000 } }),
      choice('stay', '현재 생업과 관계를 지킨다', '소득을 바꾸지 않고 지역의 연결망을 유지합니다.', { relationships: 3, happiness: 1 }),
    ],
  }),
  route({
    id: 'business-customer-terms', ageRange: [28, 60],
    title: '매출보다 먼저 나가는 돈',
    prompt: '가게를 운영하니 매출과 내 소득은 다릅니다. 자재비와 긴 영업시간 사이에서 운영 방식을 정합니다.',
    when: (life) => c.isSelfEmployed(life) && !life.business,
    choices: [
      choice('shorter', '영업시간을 줄인다', '소득이 20% 줄지만 건강과 일상을 돌봅니다.', { health: 3, happiness: 2 }, { incomeScale: 0.8 }),
      choice('regulars', '단골 주문에 집중', '소득을 유지하며 주문과 준비 시간을 정리합니다.', { knowledge: 3, relationships: 1 }),
      choice('close', '임금 일자리로 전환', '월 240만원으로 바꾸고 예측 가능한 시간을 택합니다.', { health: 1, happiness: -1 }, job('재취업 실무자', 28800000)),
    ],
  }),
];
