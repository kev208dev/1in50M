const STAGE_CONFIG = {
  childhood: { ageRange: [0, 6], themes: [
    ['family-picnic', '가족과 가까운 공원에서 오래 걸었습니다.', { happiness: 2, relationships: 2 }],
    ['picture-book', '마음에 드는 그림책을 몇 번이고 다시 보았습니다.', { knowledge: 2, happiness: 1 }],
    ['new-neighbor', '동네에서 자주 마주치는 새로운 친구가 생겼습니다.', { relationships: 2 }],
    ['seasonal-cold', '계절이 바뀌며 며칠 푹 쉬었습니다.', { health: -1, happiness: 1 }],
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
    ['health-routine', '무리하지 않는 건강 관리 리듬을 만들었습니다.', { health: 3 }],
    ['neighbor-help', '이웃과 작은 도움을 주고받았습니다.', { relationships: 2 }],
    ['quiet-reading', '햇빛 드는 자리에서 한 권의 책을 읽었습니다.', { knowledge: 2, happiness: 1 }],
    ['seasonal-rest', '날씨에 맞춰 활동을 줄이고 충분히 쉬었습니다.', { health: 1, happiness: 2 }],
  ] },
};

export const LIFE_EVENTS = Object.entries(STAGE_CONFIG).flatMap(([stage, config]) => (
  config.themes.map(([id, text, effects, economyEffects = {}, milestone = false], index) => ({
    id,
    stage,
    ageRange: config.ageRange,
    conditions: {},
    weight: index < 2 ? 1.2 : 1,
    cooldownYears: 5,
    text,
    effects,
    economyEffects,
    milestone,
  }))
));

export const LIFE_EVENT_BY_ID = Object.fromEntries(LIFE_EVENTS.map((event) => [event.id, event]));
