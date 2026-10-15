export const ERA_EVENT_SOURCES = {
  'archives-film': ['국가기록원 문화영화로 보는 대한민국', 'https://theme.archives.go.kr/next/movie/index.do'],
  'archives-population': ['국가기록원 시기별 인구정책', 'https://theme.archives.go.kr/next/populationPolicy/policy1980.do'],
  'archives-saemaul': ['국가기록원 새마을운동', 'https://theme.archives.go.kr/next/koreaOfRecord/saemaeul.do'],
  'history-timeline': ['우리역사넷 연표', 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_h52_0060'],
  'social-trends': ['통계청 한국의 사회동향 2025', 'https://sri.kostat.go.kr/boardDownload.es?bid=246&list_no=438233&seq=7'],
  'kdca-covid': ['질병관리청 코로나19', 'https://ncov.kdca.go.kr/'],
  'future-households': ['통계청 장래가구추계', 'https://kostat.go.kr/board.es?act=view&bid=207&list_no=418919&mid=a10301020100'],
  'future-climate': ['기후정보포털 한국 기후위기 평가보고서', 'https://www.climate.go.kr/home/cc_data/2025/report_2025_2.pdf'],
  'future-ai': ['과학기술정보통신부 국가 인공지능 실행계획', 'https://www.msit.go.kr/eng/bbs/view.do?bbsSeqNo=42&mId=4&mPid=2&nttSeqNo=1040&sCode=eng'],
};

function event(id, startYear, endYear, title, sourceKey, details = {}) {
  const [sourceLabel, sourceUrl] = ERA_EVENT_SOURCES[sourceKey];
  return {
    id,
    startYear,
    endYear,
    title,
    sourceKey,
    sourceLabel,
    sourceUrl,
    projection: false,
    ageRange: [0, 90],
    effects: {},
    economyEffects: {},
    weight: 1,
    ...details,
  };
}

export const HISTORY_EVENTS = [
  event('korean-war-displacement', 1950, 1953, '전쟁과 피란', 'archives-film', {
    text: '전쟁과 피란이 일상을 뒤흔들었습니다. 가족은 익숙한 터전을 떠나 생존을 먼저 생각했습니다.',
    effects: { health: -8, happiness: -12, relationships: -3 },
    economyEffects: { cash: -800000 },
  }),
  event('postwar-reconstruction', 1954, 1960, '전후 복구의 일상', 'archives-film', {
    text: '전후 복구가 이어지는 거리에서 부족한 자원을 나누며 일상을 다시 세웠습니다.',
    effects: { happiness: -2, relationships: 2, knowledge: 1 },
    economyEffects: { cash: -250000 },
  }),
  event('industrialization-move', 1962, 1969, '공업화와 도시 이주', 'archives-population', {
    ageRange: [15, 65],
    text: '일자리를 찾아 도시로 향하는 사람이 늘었습니다. 생활 리듬과 가족의 거리가 달라졌습니다.',
    effects: { knowledge: 2, relationships: -2 },
    economyEffects: { cash: 350000 },
  }),
  event('saemaul-movement', 1970, 1979, '농촌과 산업현장의 변화', 'archives-saemaul', {
    text: '농촌과 산업현장이 빠르게 변하면서 주변의 도로와 집, 일자리 풍경도 달라졌습니다.',
    effects: { knowledge: 2, relationships: 1 },
  }),
  event('democratization-1987', 1987, 1987, '1987년의 거리와 일상', 'history-timeline', {
    ageRange: [13, 90],
    text: '민주화를 요구하는 목소리가 거리와 학교, 직장에 퍼졌습니다.',
    effects: { knowledge: 3, relationships: 1 },
  }),
  event('seoul-olympics', 1988, 1988, '서울올림픽의 해', 'archives-film', {
    text: '서울올림픽 열기가 텔레비전과 거리, 학교와 직장을 가득 채웠습니다.',
    effects: { happiness: 4, relationships: 2 },
  }),
  event('pc-communication', 1990, 1996, 'PC통신과 대중문화', 'social-trends', {
    ageRange: [6, 45],
    text: 'PC통신과 새로운 대중문화가 또래 관계와 정보를 얻는 방식을 바꾸기 시작했습니다.',
    effects: { knowledge: 3, relationships: 1 },
  }),
  event('imf-crisis', 1997, 2001, '외환위기와 가계 재편', 'social-trends', {
    ageRange: [18, 90],
    text: '외환위기의 여파로 일자리와 가계 지출이 흔들렸습니다. 계획을 다시 세워야 했습니다.',
    effects: { happiness: -7, relationships: -2 },
    economyEffects: { cash: -2500000 },
    weightFor: (life) => ['employed', 'part-time', 'self-employed'].includes(life.career?.status) ? 2 : 1,
  }),
  event('world-cup-internet', 2002, 2007, '월드컵과 초고속 인터넷', 'social-trends', {
    text: '월드컵의 거리 응원과 초고속 인터넷이 새로운 공동체 경험을 만들었습니다.',
    effects: { happiness: 4, relationships: 3, knowledge: 2 },
  }),
  event('global-financial-crisis', 2008, 2009, '세계 금융위기의 여파', 'social-trends', {
    ageRange: [18, 90],
    text: '세계 금융위기의 여파가 취업과 자산시장, 가계의 소비 계획에 번졌습니다.',
    effects: { happiness: -4 },
    economyEffects: { cash: -1200000 },
  }),
  event('smartphone-platforms', 2010, 2019, '스마트폰과 플랫폼 일상', 'social-trends', {
    ageRange: [6, 90],
    text: '스마트폰과 플랫폼 서비스가 일하고 만나고 소비하는 방식을 빠르게 바꾸었습니다.',
    effects: { knowledge: 3, relationships: 1 },
  }),
  event('pandemic-life', 2020, 2022, '감염병과 비대면 일상', 'kdca-covid', {
    text: '감염병 유행으로 학교와 직장, 만남이 비대면 중심으로 바뀌었습니다.',
    effects: { health: -3, happiness: -5, relationships: -4, knowledge: 1 },
  }),
  event('cost-of-living', 2023, 2026, '금리와 생활비의 압박', 'social-trends', {
    ageRange: [18, 90],
    text: '금리와 생활비 부담이 커져 소비와 주거 계획을 더 조심스럽게 세웠습니다.',
    effects: { happiness: -3 },
    economyEffects: { cash: -600000 },
  }),
];
