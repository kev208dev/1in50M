export const RESEARCH_SOURCES = {
  privateEducation2024: {
    label: '교육부 2024년 초중고 사교육비 조사',
    year: 2024,
    url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=102822&lev=0&m=0204',
  },
  commute2024: {
    label: '통계청 2024년 근로자 이동행태',
    year: 2024,
    url: 'https://kostat.go.kr/board.es?act=view&bid=246&list_no=434303&mid=a10301010000',
  },
  onePerson2022: {
    label: '통계청 통계로 보는 1인 가구',
    year: 2022,
    url: 'https://kostat.go.kr/board.es?act=view&bid=10820&list_no=422143&mid=a10301060100',
  },
  socialTrends2025: {
    label: '통계청 한국의 사회동향 2025',
    year: 2025,
    url: 'https://mods.go.kr/board.es?act=view&bid=246&list_no=442587&mid=a10301150000',
  },
  olderAdults2024: {
    label: '통계청 2024 고령자 통계',
    year: 2024,
    url: 'https://mods.go.kr/board.es?act=view&bid=10820&list_no=432917&mid=a10301060100',
  },
  lgbtq2024: {
    label: 'Ipsos Pride Report 2024',
    year: 2024,
    url: 'https://www.ipsos.com/sites/default/files/ct/publication/documents/2024-06/Ipsos_Pride-Report-2024.pdf',
  },
  youthCaffeineMentalHealth2024: {
    label: '질병관리청 청소년건강패널조사·고카페인 음료 및 정신건강 지표',
    year: 2024,
    url: 'https://www.kdca.go.kr/bbs/kdca/42/310010/download.do',
  },
  caffeineGuidance2024: {
    label: '식품의약품안전처 청소년 고카페인 섭취 안내',
    year: 2024,
    url: 'https://www.mfds.go.kr/webzine/202406/202406.pdf',
  },
};

export const getResearchSource = (key) => RESEARCH_SOURCES[key] ?? null;
