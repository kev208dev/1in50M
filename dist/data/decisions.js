import { EDUCATION_PATHS, POST_SECONDARY_PATHS } from './education.js';

const choice = (id, label, description, effects = {}, tags = []) => ({ id, label, description, effects, tags });

export const DECISIONS = [
  {
    id: 'first-reflection', age: 5, title: '처음 기억하는 하루',
    prompt: '어린 시절의 당신은 무엇에 가장 마음이 갔나요?',
    choices: [
      choice('curious', '궁금한 것을 따라간다', '질문을 멈추지 않습니다.', { knowledge: 3 }, ['지식에 도움']),
      choice('together', '사람 곁에 머문다', '가까운 사람의 표정을 살핍니다.', { relationships: 3 }, ['관계에 도움']),
      choice('play', '마음껏 논다', '오늘의 즐거움을 오래 기억합니다.', { happiness: 3, health: 1 }, ['행복에 도움']),
    ],
  },
  {
    id: 'first-focus', age: 7, title: '나만의 리듬',
    prompt: '학교생활에서 무엇을 먼저 챙길까요?',
    choices: [
      { ...choice('growth', '공부와 성장', '새로운 것을 배우는 데 시간을 씁니다.', { knowledge: 3 }, ['성장']), focusId: 'growth' },
      { ...choice('health', '몸과 건강', '튼튼한 생활 습관을 만듭니다.', { health: 3 }, ['건강']), focusId: 'health' },
      { ...choice('relationships', '친구와 관계', '함께 지내는 법을 배웁니다.', { relationships: 3 }, ['관계']), focusId: 'relationships' },
      { ...choice('balance', '놀며 균형 찾기', '쉬는 시간도 소중히 여깁니다.', { happiness: 3 }, ['균형']), focusId: 'balance' },
    ],
  },
  {
    id: 'choose-high-school', age: 15, title: '어떤 고등학교로 갈까',
    prompt: '지금의 조건과 관심을 바탕으로 다음 배움의 장소를 고릅니다.',
    choices: EDUCATION_PATHS.map((path) => ({ ...path, educationPath: path.id })),
  },
  {
    id: 'after-graduation', age: 18, title: '졸업 뒤의 길',
    prompt: '정답 대신 지금의 당신에게 맞는 다음 단계를 고릅니다.',
    choices: POST_SECONDARY_PATHS.map((path) => ({ ...path, postSecondaryPath: path.id })),
  },
  {
    id: 'service-path', age: 20, title: '복무와 다음 시간',
    prompt: '이 시기의 의무와 생활 계획을 단순화한 가상 선택입니다. 실제 법률 판정이 아닙니다.',
    choices: [
      choice('active-service', '현역 복무', '일정 기간 새로운 환경에서 생활합니다.', { health: -2, relationships: -1, knowledge: 1 }, ['시간 필요']),
      choice('alternative-service', '대체·보충 복무', '생활과 복무를 조율합니다.', { happiness: -1, knowledge: 1 }, ['생활 조율']),
      choice('not-applicable', '면제·비대상', '현재의 학업이나 일을 이어 갑니다.', { happiness: 1 }, ['현재 경로 유지']),
    ],
  },
  {
    id: 'independence-path', age: 25, title: '일과 독립',
    prompt: '어디에 힘을 주며 성인기의 기반을 만들까요?',
    choices: [
      { ...choice('career-first', '경력부터 쌓는다', '일의 경험과 소득을 우선합니다.', { knowledge: 2, happiness: -1 }, ['경력에 도움']), focusId: 'career' },
      { ...choice('move-out', '독립 생활을 시작한다', '생활비가 늘지만 나만의 공간을 만듭니다.', { happiness: 2 }, ['주거 변화', '비용 발생']), housingType: 'monthly-rent', cost: 6000000 },
      { ...choice('prepare', '조금 더 준비한다', '가족과 머물며 기반을 다집니다.', { knowledge: 3, relationships: 1 }, ['성장', '비용 절약']), focusId: 'growth' },
    ],
  },
  {
    id: 'relationship-path', age: 30, title: '관계의 모양',
    prompt: '다른 사람의 기대가 아니라 지금 원하는 관계의 형태를 고릅니다.',
    choices: [
      choice('partnership', '동반자 관계를 만든다', '서로의 일상을 나눌 사람과 약속합니다.', { relationships: 5, happiness: 2 }, ['관계에 도움']),
      choice('single', '비혼으로 살아간다', '자신의 생활 방식과 관계망을 가꿉니다.', { happiness: 3, relationships: 1 }, ['자율', '관계 유지']),
      choice('open', '아직 정하지 않는다', '답을 서두르지 않고 현재를 지냅니다.', { happiness: 1 }, ['유보']),
    ],
  },
  {
    id: 'mid-career', age: 40, title: '일의 중간 지점',
    prompt: '지금까지의 경력을 어떻게 이어 갈까요?',
    choices: [
      { ...choice('deepen', '현재 분야를 깊게 판다', '숙련과 안정성을 키웁니다.', { knowledge: 4, happiness: -1 }, ['전문성']), focusId: 'career' },
      { ...choice('change', '다른 분야를 탐색한다', '불확실하지만 새로운 가능성을 봅니다.', { knowledge: 3, happiness: 2 }, ['직업 전환']), focusId: 'growth' },
      { ...choice('slow-down', '속도를 조절한다', '건강과 관계에 시간을 돌립니다.', { health: 3, relationships: 2 }, ['건강에 도움']), focusId: 'balance' },
    ],
  },
  {
    id: 'midlife-reflection', age: 50, title: '지나온 절반',
    prompt: '앞으로의 시간을 위해 무엇을 더 돌볼까요?',
    choices: [
      { ...choice('body', '몸을 돌본다', '작은 습관부터 다시 만듭니다.', { health: 5 }, ['건강에 도움']), focusId: 'health' },
      { ...choice('people', '사람을 돌본다', '곁의 관계를 다시 살핍니다.', { relationships: 5 }, ['관계에 도움']), focusId: 'relationships' },
      { ...choice('self', '나를 돌본다', '쉬고 좋아하는 일을 되찾습니다.', { happiness: 5 }, ['행복에 도움']), focusId: 'balance' },
    ],
  },
  {
    id: 'retirement-path', age: 60, title: '일 이후의 시간',
    prompt: '익숙했던 일의 속도를 어떻게 바꿀까요?',
    choices: [
      choice('retire', '은퇴한다', '일을 내려놓고 다른 일상을 엽니다.', { health: 2, happiness: 3 }, ['휴식']),
      choice('part-time', '시간제로 일한다', '소득과 생활 리듬을 함께 지킵니다.', { happiness: 1, relationships: 1 }, ['소득 유지']),
      choice('continue', '계속 일한다', '경험을 이어가지만 회복 시간을 챙깁니다.', { knowledge: 2, health: -1 }, ['경력 유지']),
      choice('community', '지역 활동을 시작한다', '새로운 관계와 역할을 만듭니다.', { relationships: 4, happiness: 2 }, ['관계에 도움']),
    ],
  },
  {
    id: 'late-reflection', age: 70, title: '남은 날의 방향',
    prompt: '앞으로 가장 자주 만들고 싶은 장면은 무엇인가요?',
    choices: [
      choice('healthy-days', '건강한 하루', '움직이고 쉬는 리듬을 지킵니다.', { health: 4 }, ['건강에 도움']),
      choice('shared-days', '함께하는 하루', '사람들과 기억을 나눕니다.', { relationships: 4, happiness: 2 }, ['관계에 도움']),
      choice('curious-days', '배우는 하루', '호기심을 계속 따라갑니다.', { knowledge: 4, happiness: 1 }, ['성장']),
    ],
  },
];

export const DECISION_BY_ID = Object.fromEntries(DECISIONS.map((decision) => [decision.id, decision]));
