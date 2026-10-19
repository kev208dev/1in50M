import { HOUSING_OPTIONS } from './housing.js';

const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

const hasDiscoveredIdentity = (life) => Boolean(life.identity?.discovered);
const hasChild = (life) => life.relationships.children.length > 0;
const isWorking = (life) => ['employed', 'part-time', 'self-employed'].includes(life.career.status);

export const ADULT_DECISIONS = [
  {
    id: 'first-job-route', ageRange: [21, 26], weight: 2,
    title: '첫 일자리의 조건',
    prompt: '공고 속 연봉뿐 아니라 계약 기간, 통근, 배울 수 있는 일을 함께 비교합니다.',
    sourceKey: 'socialTrends2025',
    when: (life) => !life.career.careerId,
    choices: [
      choice('small-company', '중소기업에서 경력을 시작한다', '빠르게 실무를 배우며 다음 기회를 준비합니다.', { knowledge: 3, happiness: -1 }, ['빠른 취업'], { focusId: 'career' }),
      choice('contract', '계약직으로 경험을 만든다', '고용은 불안정하지만 이력에 남을 경험을 쌓습니다.', { knowledge: 2, happiness: -2 }, ['계약직'], { careerTransition: { status: 'part-time', title: '계약직 일자리', annualIncome: 24000000 } }),
      choice('train', '직업훈련을 더 받는다', '소득 시작을 늦추고 필요한 기술을 익힙니다.', { knowledge: 4, happiness: 1 }, ['훈련'], { focusId: 'growth' }),
      choice('family-work', '가족의 일을 돕는다', '익숙한 환경에서 일하지만 역할 경계가 흐려질 수 있습니다.', { relationships: 2, knowledge: 1 }, ['가족 일'], { careerTransition: { status: 'self-employed', title: '가족 사업 종사', annualIncome: 28000000 } }),
    ],
  },
  {
    id: 'exam-or-experience', ageRange: [21, 27],
    title: '시험 준비와 현장 경험',
    prompt: '안정적인 채용을 기다릴지, 지금 가능한 일을 시작할지 결정할 때입니다.',
    sourceKey: 'socialTrends2025',
    when: (life) => !life.career.careerId,
    choices: [
      choice('public-exam', '공무원·공공기관 시험을 준비한다', '생활비를 줄이며 긴 준비 기간을 감수합니다.', { knowledge: 4, happiness: -2 }, ['시험 준비'], { economyEffects: { cash: -2400000 } }),
      choice('internship', '인턴과 프로젝트를 찾는다', '불확실하지만 일하는 사람과 결과물을 만듭니다.', { knowledge: 3, relationships: 2 }, ['경험']),
      choice('license', '현장 자격증을 취득한다', '분명한 기술로 채용 문을 넓힙니다.', { knowledge: 3, health: -1 }, ['자격증']),
      choice('available-job', '지금 가능한 일부터 시작한다', '소득을 먼저 만들고 다음 이동을 준비합니다.', { happiness: 1, knowledge: 1 }, ['소득 우선'], { careerTransition: { status: 'employed', title: '서비스·현장 일자리', annualIncome: 30000000 } }),
    ],
  },
  {
    id: 'regional-move', ageRange: [22, 30],
    title: '어디에서 기회를 찾을까',
    prompt: '일자리와 관계, 주거비를 놓고 수도권 이동과 지역 정착을 비교합니다.',
    sourceKey: 'socialTrends2025',
    choices: [
      choice('capital', '수도권으로 이동한다', '기회가 많은 곳으로 가지만 주거비와 거리는 늘어납니다.', { knowledge: 2, relationships: -1 }, ['이동', '주거비'], { housingRegion: '서울특별시', economyEffects: { cash: -3000000 } }),
      choice('local', '현재 지역에서 기회를 찾는다', '기존 관계와 익숙한 생활 기반을 지킵니다.', { relationships: 2, happiness: 1 }, ['지역 정착']),
      choice('nearby-city', '가까운 거점도시로 옮긴다', '가족과 왕래할 거리를 남기며 선택지를 넓힙니다.', { knowledge: 1, relationships: 1 }, ['거점도시'], { housingRegion: '가까운 거점도시' }),
      choice('remote', '원격·프로젝트 일을 탐색한다', '사는 곳을 유지하며 새로운 방식의 일을 시험합니다.', { knowledge: 3, happiness: 1 }, ['원격']),
    ],
  },
  {
    id: 'first-housing', ageRange: [23, 29],
    title: '첫 독립의 방',
    prompt: '보증금, 월세, 통근 거리와 사생활 중 무엇을 우선할까요?',
    sourceKey: 'onePerson2022',
    when: (life) => life.housing.type === 'with-family',
    choices: [
      choice('stay-family', '가족과 더 지낸다', '주거비를 아끼며 독립 자금을 모읍니다.', { relationships: 1, happiness: -1 }, ['비용 절약']),
      choice('monthly-rent', '작은 월세방을 구한다', '고정비는 늘지만 내 공간을 만듭니다.', { happiness: 3 }, ['월세', '독립'], { housingType: 'monthly-rent', minimumCash: 6000000 }),
      choice('shared', '친구와 집을 나눈다', '비용과 집안일을 나누며 생활 규칙을 맞춥니다.', { relationships: 2, happiness: 1 }, ['공동 주거'], { economyEffects: { fixedCosts: 450000 } }),
      choice('dormitory', '기숙사·사택을 알아본다', '선택지는 제한되지만 통근과 비용을 줄입니다.', { health: 1, happiness: 1 }, ['기숙사'], { economyEffects: { fixedCosts: 250000 } }),
    ],
  },
  {
    id: 'commute-balance', ageRange: [25, 35], weight: 2,
    title: '왕복 74분의 하루',
    prompt: '출퇴근 시간이 길어지면서 돈과 시간을 다시 계산하게 됩니다.',
    sourceKey: 'commute2024',
    when: isWorking,
    choices: [
      choice('stay', '통근을 유지한다', '주거비를 아끼고 이동 시간을 감수합니다.', { health: -1, happiness: -1 }, ['주거비 절약']),
      choice('move', '직장 가까이 옮긴다', '월 고정비가 늘지만 하루의 시간을 되찾습니다.', { health: 1, happiness: 2 }, ['시간 확보'], { economyEffects: { cash: -4000000, fixedCosts: 250000 } }),
      choice('negotiate', '근무 방식을 조율한다', '재택·시차출근 가능성을 알아봅니다.', { knowledge: 1, happiness: 1 }, ['협상']),
    ],
  },
  {
    id: 'queer-trusted-friend', ageRange: [18, 29], weight: 3, audience: 'lgbtq',
    title: '처음으로 말할 사람',
    prompt: '가상 인물은 자신의 정체성을 알게 된 뒤, 누구에게 어디까지 이야기할지 생각합니다.',
    sourceKey: 'lgbtq2024',
    when: hasDiscoveredIdentity,
    choices: [
      choice('trusted-friend', '믿을 수 있는 친구에게 말한다', '조심스럽게 말을 꺼내고 지지해 줄 한 사람을 찾습니다.', { relationships: 4, happiness: 3 }, ['신뢰'], { relationshipNote: '정체성을 존중하는 친구' }),
      choice('community', '안전한 온라인 공동체를 찾는다', '비슷한 경험을 한 사람들의 이야기를 들으며 혼자가 아님을 압니다.', { relationships: 3, knowledge: 2, happiness: 2 }, ['공동체'], { relationshipNote: '정체성을 나누는 공동체' }),
      choice('private', '아직은 나만 알고 지낸다', '안전을 우선하며 스스로 이해할 시간을 가집니다.', { knowledge: 2, happiness: -1 }, ['사생활 보호']),
    ],
  },
  {
    id: 'relationship-path', ageRange: [28, 34], weight: 2,
    title: '관계의 모양',
    prompt: '주변의 시간표보다 지금 원하는 친밀감과 생활 방식을 생각합니다.',
    when: (life) => !life.relationships.partner,
    choices: [
      choice('partnership', '동반자 관계를 만든다', '서로의 일상을 나눌 사람과 약속합니다.', { relationships: 5, happiness: 2 }, ['동반자']),
      choice('single', '비혼으로 살아간다', '친구와 가족, 나만의 생활을 중심에 둡니다.', { happiness: 3, relationships: 1 }, ['비혼']),
      choice('open', '아직 정하지 않는다', '답을 서두르지 않고 현재의 관계를 지냅니다.', { happiness: 1 }, ['유보']),
    ],
  },
  {
    id: 'housing-path', ageRange: [31, 38], weight: 2,
    title: '다음 집의 계약서',
    prompt: '대출 이자, 보증금 안전, 월 고정비와 생활권을 함께 검토합니다.',
    sourceKey: 'onePerson2022',
    choices: HOUSING_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      housingType: option.id,
      minimumCash: option.requiredCash,
      tags: option.requiredCash > 0 ? ['비용 발생', '주거 변화'] : ['비용 절약'],
    })),
  },
  {
    id: 'family-path', ageRange: [33, 39],
    title: '가족의 다음 모습',
    prompt: '자녀 유무는 성공의 기준이 아닙니다. 돌봄과 생활비, 원하는 삶의 모양을 함께 생각합니다.',
    choices: [
      choice('welcome-child', '자녀를 맞이한다', '동반자와 함께 새로운 가족을 돌봅니다.', { relationships: 4, happiness: 1 }, ['돌봄', '비용'], { requiresPartner: true }),
      choice('community-care', '다른 방식으로 돌본다', '조카나 가까운 아이, 공동체와 돌봄을 나눕니다.', { relationships: 3 }, ['공동체 돌봄']),
      choice('child-free', '자녀 없이 살아간다', '현재의 관계와 생활을 소중히 이어 갑니다.', { happiness: 2 }, ['자율']),
    ],
  },
  {
    id: 'childcare-career', ageRange: [33, 45],
    title: '돌봄과 경력의 시간표',
    prompt: '등하원과 야근 시간이 겹치면서 가족의 일정을 다시 나눠야 합니다.',
    sourceKey: 'socialTrends2025',
    when: hasChild,
    choices: [
      choice('leave', '육아휴직을 사용한다', '소득 일부를 포기하고 돌봄 시간을 확보합니다.', { relationships: 4, happiness: 1 }, ['육아휴직'], { incomeScale: 0.6 }),
      choice('shared-care', '동반자와 시간을 다시 나눈다', '서로의 근무와 돌봄표를 함께 바꿉니다.', { relationships: 3, health: -1 }, ['돌봄 분담']),
      choice('paid-care', '유료 돌봄을 이용한다', '경력은 이어가지만 매달 비용이 늘어납니다.', { knowledge: 2, happiness: 1 }, ['돌봄 비용'], { economyEffects: { fixedCosts: 700000 } }),
      choice('career-break', '한동안 일을 쉰다', '돌봄에 집중하지만 경력과 소득이 멈춥니다.', { relationships: 3, knowledge: -1 }, ['경력 중단'], { careerStatus: 'none', economyEffects: { income: -1200000 } }),
    ],
  },
  {
    id: 'queer-workplace', ageRange: [25, 45], audience: 'lgbtq',
    title: '직장에서 지킬 사생활',
    prompt: '회식과 가족 이야기가 오가는 자리에서 정체성을 어디까지 드러낼지 고민합니다.',
    sourceKey: 'lgbtq2024',
    when: (life) => hasDiscoveredIdentity(life) && isWorking(life),
    choices: [
      choice('ally', '신뢰하는 동료 한 명에게 말한다', '안전한 관계를 먼저 확인하며 일터의 지지 기반을 만듭니다.', { relationships: 3, happiness: 2 }, ['동료의 지지'], { relationshipNote: '일터에서 믿을 수 있는 동료' }),
      choice('boundary', '사생활의 경계를 분명히 한다', '설명하지 않을 권리를 지키며 질문을 돌려냅니다.', { knowledge: 1, happiness: 1 }, ['경계 설정']),
      choice('open', '자연스럽게 공개한다', '숨기는 부담은 줄지만 주변 반응을 감수합니다.', { happiness: 3, relationships: -1 }, ['공개']),
    ],
  },
  {
    id: 'self-employment', ageRange: [35, 55],
    title: '내 이름으로 시작하는 일',
    prompt: '독립적인 일을 시작할 기회가 생겼지만 임대료와 초기 자금이 필요합니다.',
    sourceKey: 'socialTrends2025',
    when: (life) => isWorking(life) || life.career.status === 'none',
    choices: [
      choice('open-shop', '작게 창업한다', '초기 자금을 쓰고 매출이 자리 잡을 시간을 버팁니다.', { knowledge: 3, happiness: 1 }, ['창업', '위험'], { careerTransition: { status: 'self-employed', title: '소규모 자영업', annualIncome: 36000000 }, economyEffects: { cash: -12000000, debt: 5000000 } }),
      choice('side-project', '부업으로 먼저 시험한다', '본업을 유지하며 수요와 체력을 확인합니다.', { knowledge: 2, health: -2 }, ['부업']),
      choice('stay-employed', '현재 일을 유지한다', '안정적인 소득을 지키고 기회를 다음으로 미룹니다.', { happiness: 1 }, ['안정']),
    ],
  },
  {
    id: 'parent-care', ageRange: [42, 57],
    title: '부모님의 병원 일정',
    prompt: '부모님의 진료와 생활 지원이 잦아지며 시간과 비용을 나눌 방법이 필요합니다.',
    sourceKey: 'socialTrends2025',
    choices: [
      choice('direct-care', '내가 자주 찾아간다', '직접 곁을 지키지만 내 생활의 여유가 줄어듭니다.', { relationships: 4, health: -2, happiness: -1 }, ['가족 돌봄']),
      choice('share-siblings', '가족과 역할을 나눈다', '일정과 비용을 투명하게 정리해 부담을 분담합니다.', { relationships: 2, knowledge: 1 }, ['분담']),
      choice('public-service', '공공 돌봄 서비스를 알아본다', '신청 절차를 거쳐 전문적인 도움을 연결합니다.', { knowledge: 3, relationships: 1 }, ['돌봄 서비스']),
      choice('financial-help', '비용을 지원한다', '시간 대신 생활비와 의료비를 보탭니다.', { relationships: 2 }, ['경제 지원'], { economyEffects: { cash: -5000000 } }),
    ],
  },
  {
    id: 'mid-career', ageRange: [40, 49], weight: 2,
    title: '일의 중간 지점',
    prompt: '숙련을 깊게 할지, 직무를 바꿀지, 속도를 낮출지 판단할 때입니다.',
    sourceKey: 'socialTrends2025',
    when: isWorking,
    choices: [
      choice('deepen', '현재 분야를 깊게 판다', '숙련과 안정성을 키웁니다.', { knowledge: 4, happiness: -1 }, ['전문성'], { focusId: 'career' }),
      choice('change', '다른 분야를 탐색한다', '불확실하지만 새로운 가능성을 봅니다.', { knowledge: 3, happiness: 2 }, ['직업 전환'], { focusId: 'growth' }),
      choice('slow-down', '속도를 조절한다', '건강과 관계에 시간을 돌립니다.', { health: 3, relationships: 2 }, ['건강'], { focusId: 'balance' }),
    ],
  },
];
