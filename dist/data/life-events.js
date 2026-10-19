import * as c from './scenes/context.js';

const STAGE_CONFIG = {
  childhood: { ageRange: [0, 6], themes: [
    ['family-picnic', '가족과 가까운 공원에서 오래 걸었습니다.', { happiness: 2, relationships: 2 }],
    ['picture-book', '마음에 드는 그림책을 몇 번이고 다시 보았습니다.', { knowledge: 2, happiness: 1 }],
    ['new-neighbor', '동네에서 자주 마주치는 새로운 친구가 생겼습니다.', { relationships: 2 }],
    ['seasonal-cold', '열이 올라 이불 속에서 약을 먹고 하루를 쉬었습니다.', { health: -1, happiness: 1 }],
    ['care-day', '보호자와 느긋한 하루를 보냈습니다.', { relationships: 3 }],
    ['first-drawing', '종이 가득 좋아하는 장면을 그렸습니다.', { knowledge: 1, happiness: 2 }],
    ['playground', '놀이터에서 새로운 놀이를 배웠습니다.', { health: 2, relationships: 1 }],
    ['small-move', '가족과 함께 집 안의 공간을 새로 꾸몄습니다.', { happiness: 1 }],
  ] },
  school: { ageRange: [7, 18], themes: [
    ['class-friend', '교실에서 오래 이야기할 친구를 만났습니다.', { relationships: 3 }],
    ['reading-day', '도서관에서 예상보다 재미있는 책을 찾았습니다.', { knowledge: 3 }],
    ['school-festival', '학교 행사에서 맡은 역할을 끝까지 해냈습니다.', { happiness: 2, relationships: 2 }],
    ['exam-week', '시험 기간을 지나며 나만의 공부법을 찾았습니다.', { knowledge: 3, happiness: -1 }],
    ['sports-day', '몸을 움직이며 답답했던 마음을 풀었습니다.', { health: 2, happiness: 2 }],
    ['club-project', '동아리 친구들과 작은 결과물을 만들었습니다.', { knowledge: 2, relationships: 2 }],
    ['teacher-advice', '선생님의 한마디가 다음 선택을 생각하게 했습니다.', { knowledge: 2 }],
    ['quiet-break', '무리한 일정을 줄이고 잠시 쉬었습니다.', { health: 2, happiness: 2 }],
  ] },
  'young-adult': { ageRange: [19, 29], themes: [
    ['first-pay', '처음으로 스스로 번 돈의 쓰임을 고민했습니다.', { happiness: 2 }, { cash: 800000 }],
    ['new-city', '익숙하지 않은 동네의 생활 리듬을 배웠습니다.', { knowledge: 1, happiness: 1 }],
    ['mentor-talk', '먼저 길을 걸은 사람에게 현실적인 조언을 들었습니다.', { knowledge: 3 }],
    ['team-task', '여럿이 해야 끝나는 일을 맡아 완성했습니다.', { relationships: 2, knowledge: 2 }],
    ['certificate', '관심 분야의 짧은 교육 과정을 마쳤습니다.', { knowledge: 4 }],
    ['budget-reset', '지출 내역을 살펴보고 생활비 계획을 다시 세웠습니다.', { happiness: 1 }, { cash: 400000 }],
    ['friend-reunion', '오래 보지 못한 친구와 다시 연락했습니다.', { relationships: 3 }],
    ['weekend-trip', '짧은 여행으로 일상에서 한 걸음 떨어졌습니다.', { happiness: 3 }, { cash: -300000 }],
  ] },
  adult: { ageRange: [30, 39], themes: [
    ['work-project-success', '긴 프로젝트가 마무리되어 함께 안도했습니다.', { knowledge: 2, happiness: 3 }, { cash: 1000000 }, true],
    ['home-repair', '생활 공간의 불편한 부분을 직접 고쳤습니다.', { happiness: 1 }, { cash: -250000 }],
    ['family-call', '가족과 긴 통화를 하며 서로의 근황을 나눴습니다.', { relationships: 3 }],
    ['health-check', '정기검진을 받고 생활 습관을 점검했습니다.', { health: 2 }],
    ['career-course', '퇴근 후 새로운 기술을 배우기 시작했습니다.', { knowledge: 4, happiness: -1 }, { cash: -500000 }],
    ['community-meet', '동네 모임에서 새로운 사람들을 알게 되었습니다.', { relationships: 2, happiness: 1 }],
    ['unexpected-expense', '예상하지 못한 생활비가 들었습니다.', { happiness: -1 }, { cash: -700000 }],
    ['slow-weekend', '아무 일정도 잡지 않은 주말을 보냈습니다.', { health: 2, happiness: 2 }],
  ] },
  midlife: { ageRange: [40, 59], themes: [
    ['role-change', '일에서 맡는 역할이 달라져 새로운 방식을 익혔습니다.', { knowledge: 3, happiness: -1 }],
    ['family-care', '가족의 일상을 돕기 위해 시간을 나눴습니다.', { relationships: 3, health: -1 }],
    ['old-hobby', '한동안 잊었던 취미를 다시 시작했습니다.', { happiness: 3 }],
    ['walking-habit', '매일 조금씩 걷는 습관을 만들었습니다.', { health: 3 }],
    ['work-recognition', '오랜 경험이 필요한 문제를 차분히 해결했습니다.', { knowledge: 2, happiness: 2 }, { cash: 800000 }, true],
    ['friend-gathering', '오랜 친구들과 지나온 시간을 이야기했습니다.', { relationships: 3 }],
    ['home-plan', '앞으로 살고 싶은 집의 조건을 정리했습니다.', { happiness: 1 }],
    ['rest-needed', '피로가 쌓여 일정을 줄이고 회복했습니다.', { health: 2, happiness: 1 }],
  ] },
  senior: { ageRange: [60, 90], themes: [
    ['morning-walk', '아침 산책에서 계절의 변화를 느꼈습니다.', { health: 2, happiness: 2 }],
    ['community-class', '지역 수업에서 낯선 주제를 배웠습니다.', { knowledge: 2, relationships: 1 }],
    ['family-meal', '가족과 천천히 식사하는 시간을 가졌습니다.', { relationships: 3, happiness: 2 }],
    ['memory-box', '오래된 물건을 정리하며 지난 날을 떠올렸습니다.', { happiness: 2 }],
    ['gentle-health-routine', '무리하지 않는 건강 관리 리듬을 만들었습니다.', { health: 3 }],
    ['neighbor-help', '이웃과 작은 도움을 주고받았습니다.', { relationships: 2 }],
    ['quiet-reading', '햇빛 드는 자리에서 한 권의 책을 읽었습니다.', { knowledge: 2, happiness: 1 }],
    ['seasonal-rest', '날씨에 맞춰 활동을 줄이고 충분히 쉬었습니다.', { health: 1, happiness: 2 }],
  ] },
};

// 기본 사건이 캐릭터의 실제 상황과 어긋나지 않게 하는 조건.
const BASE_WHEN = {
  'first-pay': c.isWorking,
  'team-task': c.any(c.isWorking, c.isUniversityStudent),
  'work-project-success': c.isWorking,
  'career-course': c.isWorking,
  'role-change': c.isWorking,
  'work-recognition': c.isWorking,
  'family-call': c.any(c.hasLivingParents, c.hasSiblings, c.not(c.livesWithFamily)),
  'family-care': c.any(c.hasAgingParents, c.hasChildren, c.hasPartner),
  'family-meal': c.any(c.hasPartner, c.hasChildren, c.livesWithFamily),
};

const BASE_LIFE_EVENTS = Object.entries(STAGE_CONFIG).flatMap(([stage, config]) => (
  config.themes.map(([id, text, effects, economyEffects = {}, milestone = false], index) => ({
    id,
    stage,
    ageRange: config.ageRange,
    conditions: {},
    when: BASE_WHEN[id],
    weight: index < 2 ? 1.2 : 1,
    // 매년 고르는 사건의 대부분은 장면 계열이 맡으므로, 기본 사건은 한 시기에 한 번 정도만 나온다.
    cooldownYears: 12,
    text,
    effects,
    economyEffects,
    milestone,
  }))
));

const modifier = (life, key) => Number(life?.profileInfluence?.modifiers?.[key]) || 0;
const hasDisability = (life) => {
  const disability = life?.profile?.disability;
  return Boolean(disability && disability.type !== 'none' && disability.label !== '없음');
};
const outsideCapitalArea = (life) => !['SEL', 'GGD', 'ICN'].includes(life?.profile?.region?.code);
const householdPressure = (life) => modifier(life, 'financial-buffer') < 0;

export const PROFILE_EVENTS = [
  {
    id: 'academy-offer', stage: 'school', conditionStage: 'childhood', ageRange: [8, 17], weight: 1,
    cooldownYears: 5, tags: ['education'],
    weightFor: (life) => 1 + Math.max(0, modifier(life, 'education-access')) / 12,
    effects: { knowledge: 2, happiness: -1 },
    text: '주변 친구들이 다니는 학원을 권유받아 시간표와 비용을 함께 따져 보았습니다.',
  },
  {
    id: 'after-school-gap', stage: 'school', conditionStage: 'childhood', ageRange: [7, 13], weight: 0.8,
    cooldownYears: 5, tags: ['education', 'household'], when: householdPressure,
    effects: { knowledge: -1, relationships: 1 },
    text: '방과 후 돌봄과 사교육의 빈자리를 가족과 동네의 도움으로 메웠습니다.',
  },
  {
    id: 'appearance-ranking', stage: 'school', conditionStage: 'childhood', ageRange: [12, 17], weight: 0.8,
    cooldownYears: 5, tags: ['appearance'], effects: { happiness: -2, relationships: -1 },
    text: '외모를 순위처럼 말하는 교실 분위기에 놓였습니다.',
  },
  {
    id: 'access-support', stage: 'school', conditionStage: 'childhood', ageRange: [7, 17], weight: 0.7,
    cooldownYears: 4, tags: ['accessibility'], when: hasDisability,
    effects: { knowledge: 2, happiness: 1 },
    text: '학교와 보호자가 필요한 보조기기와 이동 지원을 함께 마련했습니다.',
  },
  {
    id: 'school-status', stage: 'school', conditionStage: 'youth', ageRange: [13, 18], weight: 0.8,
    cooldownYears: 5, tags: ['school', 'appearance'],
    weightFor: (life) => 1 + Math.abs(modifier(life, 'first-impression')) / 30,
    effects: { relationships: 1 },
    text: '학교 안의 인기와 성적, 집안 이야기가 보이지 않는 서열처럼 오갔습니다.',
  },
  {
    id: 'regional-field-trip', stage: 'school', conditionStage: 'youth', ageRange: [13, 18], weight: 0.7,
    cooldownYears: 5, tags: ['region'], weightFor: (life) => outsideCapitalArea(life) ? 1.4 : 0.8,
    effects: { knowledge: 2, happiness: 1 },
    text: '다른 지역의 학교와 진로 현장을 찾아가 익숙한 생활권 밖을 보았습니다.',
  },
  {
    id: 'fitness-routine', stage: 'school', conditionStage: 'youth', ageRange: [16, 60], weight: 0.7,
    cooldownYears: 6, tags: ['appearance', 'health'], effects: { health: 2, happiness: 1 },
    appearanceEffects: { grooming: 4, socialRating: 1 },
    text: '운동을 꾸준히 하며 체형과 자세가 달라졌습니다.',
  },
  {
    id: 'appearance-pressure', stage: 'school', conditionStage: 'youth', ageRange: [15, 25], weight: 0.7,
    cooldownYears: 5, tags: ['appearance'], effects: { happiness: -2 },
    appearanceEffects: { grooming: 2 },
    text: '사진과 교복 핏을 비교하는 분위기 속에서 외모 관리에 신경을 쓰게 되었습니다.',
  },
  {
    id: 'entrance-coaching', stage: 'school', conditionStage: 'youth', ageRange: [15, 18], weight: 0.9,
    cooldownYears: 4, tags: ['education'],
    weightFor: (life) => Math.max(0.35, 1 + modifier(life, 'education-access') / 30),
    effects: { knowledge: 3, happiness: -1 }, economyEffects: { cash: -600000 },
    text: '입시 상담에서 학교생활기록부와 지원 전략을 구체적으로 점검했습니다.',
  },
  {
    id: 'capital-move', stage: 'young-adult', conditionStage: 'youngAdult', ageRange: [19, 29], weight: 0.8,
    cooldownYears: 7, tags: ['region', 'housing'], when: outsideCapitalArea,
    effects: { knowledge: 2, happiness: -1 }, economyEffects: { cash: -1200000 },
    text: '진학이나 일자리를 위해 수도권으로 옮길지 현실적인 비용을 계산했습니다.',
  },
  {
    id: 'interview-bias', stage: 'young-adult', conditionStage: 'youngAdult', ageRange: [20, 34], weight: 0.8,
    cooldownYears: 5, tags: ['career', 'appearance'],
    weightFor: (life) => 1 + Math.abs(modifier(life, 'service-impression')) / 35,
    effects: { happiness: -1, knowledge: 1 },
    text: '면접에서 실력과 무관한 인상 평가를 체감하고 대응 방식을 익혔습니다.',
  },
  {
    id: 'first-studio', stage: 'young-adult', conditionStage: 'youngAdult', ageRange: [19, 32], weight: 0.9,
    cooldownYears: 8, tags: ['housing'],
    weightFor: (life) => 1 + Math.max(0, modifier(life, 'housing-pressure')) / 20,
    effects: { happiness: 1 }, economyEffects: { cash: -1800000 },
    text: '첫 독립방의 보증금, 관리비, 통근 시간을 놓고 오래 고민했습니다.',
  },
  {
    id: 'military-gap', stage: 'young-adult', conditionStage: 'youngAdult', ageRange: [19, 28], weight: 0.6,
    cooldownYears: 9, tags: ['career', 'service'],
    when: (life) => c.isMale(life) && ['active', 'completed', 'supplementary'].includes(life?.service?.status),
    effects: { knowledge: 1, relationships: -1 },
    text: '병역으로 생긴 학업과 경력의 공백을 어떻게 설명하고 회복할지 고민했습니다.',
  },
  {
    id: 'campus-network', stage: 'young-adult', conditionStage: 'youngAdult', ageRange: [19, 29], weight: 0.7,
    cooldownYears: 6, tags: ['education', 'network'],
    weightFor: (life) => Math.max(0.4, 1 + modifier(life, 'career-network') / 20),
    effects: { relationships: 2, knowledge: 1 },
    text: '학교와 교육 과정에서 만난 사람을 통해 새로운 기회와 정보를 접했습니다.',
  },
  {
    id: 'workplace-hierarchy', stage: 'adult', conditionStage: 'adult', ageRange: [30, 49], weight: 0.9,
    cooldownYears: 5, tags: ['career'], when: c.isEmployee, effects: { happiness: -1, knowledge: 1 },
    text: '직급과 연차가 강하게 작동하는 회의에서 의견을 꺼내는 방식을 배웠습니다.',
  },
  {
    id: 'housing-rate-shock', stage: 'adult', conditionStage: 'adult', ageRange: [30, 54], weight: 0.7,
    cooldownYears: 7, tags: ['housing', 'economy'],
    weightFor: (life) => 1 + Math.max(0, modifier(life, 'housing-pressure')) / 15,
    effects: { happiness: -2 }, economyEffects: { cash: -1500000 },
    text: '금리와 전월세 조건이 바뀌어 주거 계획과 지출을 다시 계산했습니다.',
  },
  {
    id: 'care-burden', stage: 'adult', conditionStage: 'adult', ageRange: [30, 54], weight: 0.7,
    cooldownYears: 6, tags: ['family', 'care'],
    weightFor: (life) => 1 + Math.max(0, -modifier(life, 'financial-buffer')) / 20,
    effects: { health: -1, relationships: 2 },
    text: '가족 돌봄과 생업 시간을 함께 감당하며 역할을 다시 나누었습니다.',
  },
  {
    id: 'style-investment', stage: 'adult', conditionStage: 'adult', ageRange: [30, 49], weight: 0.6,
    cooldownYears: 6, tags: ['appearance', 'career'], effects: { happiness: 1 },
    economyEffects: { cash: -500000 }, appearanceEffects: { grooming: 5, socialRating: 2 },
    text: '업무와 만남의 첫인상을 위해 옷차림과 관리 방식에 투자했습니다.',
  },
  {
    id: 'discrimination-response', stage: 'adult', conditionStage: 'adult', ageRange: [30, 59], weight: 0.5,
    cooldownYears: 7, tags: ['rights', 'accessibility'], when: hasDisability,
    effects: { knowledge: 2, relationships: 1 },
    text: '차별적인 상황을 겪고 기록과 상담, 주변의 연대를 통해 대응했습니다.',
  },
  {
    id: 'retraining-access', stage: 'midlife', conditionStage: 'midlife', ageRange: [45, 64], weight: 0.8,
    cooldownYears: 6, tags: ['career', 'education'],
    weightFor: (life) => Math.max(0.5, 1 + modifier(life, 'education-access') / 40),
    effects: { knowledge: 3, happiness: 1 }, economyEffects: { cash: -400000 },
    text: '직업 전환을 위한 재교육 과정의 시간과 비용을 비교해 보았습니다.',
  },
  {
    id: 'parent-care', stage: 'midlife', conditionStage: 'midlife', ageRange: [45, 69], weight: 0.9,
    cooldownYears: 6, tags: ['family', 'care'], when: c.hasAgingParents, effects: { health: -1, relationships: 3 },
    text: '부모의 병원 일정과 생활 돌봄을 가족들과 구체적으로 나누었습니다.',
  },
  {
    id: 'business-network', stage: 'midlife', conditionStage: 'midlife', ageRange: [45, 64], weight: 0.6,
    cooldownYears: 7, tags: ['career', 'business'], when: c.isWorking,
    weightFor: (life) => 1 + Math.max(0, modifier(life, 'career-network')) / 18,
    effects: { knowledge: 2, relationships: 2 },
    text: '오랫동안 쌓은 거래처와 동료 관계가 새로운 사업 기회를 연결했습니다.',
  },
  {
    id: 'appearance-aging', stage: 'midlife', conditionStage: 'midlife', ageRange: [45, 69], weight: 0.7,
    cooldownYears: 6, tags: ['appearance', 'aging'], effects: { happiness: -1 },
    appearanceEffects: { socialRating: -2 },
    text: '달라진 외모를 바라보는 사회의 시선과 나 자신의 기준을 다시 생각했습니다.',
  },
  {
    id: 'regional-return', stage: 'midlife', conditionStage: 'midlife', ageRange: [45, 64], weight: 0.6,
    cooldownYears: 8, tags: ['region', 'housing'],
    weightFor: (life) => outsideCapitalArea(life) ? 1.3 : 0.8,
    effects: { happiness: 2, relationships: 1 },
    text: '고향이나 더 작은 도시로 돌아가는 삶의 비용과 관계를 살펴보았습니다.',
  },
  {
    id: 'pension-gap', stage: 'senior', conditionStage: 'senior', ageRange: [65, 90], weight: 0.9,
    cooldownYears: 6, tags: ['economy', 'retirement'],
    weightFor: (life) => 1 + Math.max(0, -modifier(life, 'financial-buffer')) / 18,
    effects: { happiness: -1 }, economyEffects: { cash: -600000 },
    text: '연금과 생활비 사이의 간격을 확인하고 지출 우선순위를 다시 정했습니다.',
  },
  {
    id: 'accessible-housing', stage: 'senior', conditionStage: 'senior', ageRange: [65, 90], weight: 0.7,
    cooldownYears: 7, tags: ['housing', 'accessibility'], when: hasDisability,
    effects: { health: 2, happiness: 1 }, economyEffects: { cash: -800000 },
    text: '문턱과 욕실, 엘리베이터를 살피며 안전하게 오래 살 집을 손보았습니다.',
  },
  {
    id: 'community-support', stage: 'senior', conditionStage: 'senior', ageRange: [65, 90], weight: 0.8,
    cooldownYears: 5, tags: ['community'],
    weightFor: (life) => life?.stats?.relationships < 45 ? 1.5 : 1,
    effects: { relationships: 3, happiness: 2 },
    text: '복지관과 동네 모임에서 식사와 안부를 나눌 사람들을 만났습니다.',
  },
  {
    id: 'health-routine', stage: 'senior', conditionStage: 'senior', ageRange: [65, 90], weight: 0.9,
    cooldownYears: 5, tags: ['health', 'appearance'], effects: { health: 3, happiness: 1 },
    appearanceEffects: { grooming: 2, socialRating: 1 },
    text: '진료와 운동, 식사를 무리 없이 이어갈 건강 관리 리듬을 만들었습니다.',
  },
  {
    id: 'cardiovascular-diagnosis', stage: 'midlife', conditionStage: 'midlife', ageRange: [40, 80], weight: 0.3,
    cooldownYears: 40, tags: ['health', 'diagnosis'],
    when: (life) => !(life?.conditions?.chronic ?? []).includes('cardiovascular')
      && (life?.stats?.health ?? 100) <= 66,
    weightFor: (life) => 1 + Math.max(0, 62 - (life?.stats?.health ?? 62)) / 25,
    effects: { health: -2, happiness: -1 },
    conditionEffects: { chronic: ['cardiovascular'], care: ['regular-checkup'] },
    milestone: true,
    text: '정기검진에서 심혈관 질환을 진단받아 약과 생활 관리를 시작했습니다.',
  },
  {
    // 사망 원인 1위인 암도 진단 경로가 있어야 결과 화면의 사인과 삶의 기록이 이어진다.
    id: 'cancer-diagnosis', stage: 'midlife', conditionStage: 'midlife', ageRange: [45, 86], weight: 0.32,
    cooldownYears: 60, tags: ['health', 'diagnosis'],
    when: (life) => !(life?.conditions?.chronic ?? []).includes('cancer'),
    weightFor: (life) => 1 + Math.max(0, (life?.age ?? 45) - 45) / 20 + Math.max(0, 55 - (life?.stats?.health ?? 55)) / 40,
    effects: { health: -4, happiness: -2 },
    conditionEffects: { chronic: ['cancer'], care: ['cancer-treatment'] },
    milestone: true,
    text: '검진에서 암이 발견되어 수술과 항암 치료를 차례로 받기 시작했습니다.',
  },
  {
    id: 'respiratory-diagnosis', stage: 'senior', conditionStage: 'senior', ageRange: [60, 86], weight: 0.4,
    cooldownYears: 35, tags: ['health', 'diagnosis'],
    when: (life) => !(life?.conditions?.chronic ?? []).includes('respiratory')
      && (life?.stats?.health ?? 100) <= 60,
    effects: { health: -3, happiness: -1 },
    conditionEffects: { chronic: ['respiratory'], care: ['respiratory-treatment'] },
    milestone: true,
    text: '호흡기 질환 진단을 받고 정기 진료와 활동량 조절을 시작했습니다.',
  },
  {
    id: 'inheritance-conflict', stage: 'senior', conditionStage: 'senior', ageRange: [65, 90], weight: 0.5,
    cooldownYears: 9, tags: ['family', 'economy'],
    weightFor: (life) => (life?.relationships?.family?.length ?? 0) > 1 ? 1.3 : 0.5,
    effects: { relationships: -2, happiness: -1 },
    text: '상속과 부양 문제를 둘러싼 가족의 기대를 문서와 대화로 정리했습니다.',
  },
  {
    id: 'access-barrier', stage: 'adult', conditionStage: 'adult', ageRange: [7, 75], weight: 0.5,
    cooldownYears: 5, tags: ['accessibility'], when: hasDisability,
    effects: { happiness: -1, knowledge: 1 },
    text: '접근하기 어려운 시설 때문에 계획을 바꾸고 다른 경로를 찾아야 했습니다.',
  },
];

export const LIFE_EVENTS = [...BASE_LIFE_EVENTS, ...PROFILE_EVENTS];

export const LIFE_EVENT_BY_ID = Object.fromEntries(LIFE_EVENTS.map((event) => [event.id, event]));
