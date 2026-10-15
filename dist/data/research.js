export const RESEARCH_SOURCES = {
  lifeTable2024: {
    label: '통계청 2024년 생명표',
    year: 2024,
    url: 'https://kostat.go.kr/board.es?act=view&bid=208&list_no=439533&mid=a10301060100',
  },
  birthsByDistrict: {
    label: '통계청 인구동향조사 · 시군구 출생아 수',
    year: 2025,
    url: 'https://kosis.kr/edu/visualStats/detail.do?ixId=1123&menuId=M_05',
  },
  causesOfDeath2024: {
    label: '통계청 사망원인통계 · 성·연령별 사망원인',
    year: 2024,
    url: 'https://kosis.kr/visual/nsportalStats/detailContents.do?listId=A&statJipyoId=3641&vStatJipyoId=4860',
  },
  educationStatistics: {
    label: '한국교육개발원 교육통계서비스',
    year: 2024,
    url: 'https://kess.kedi.re.kr/mobile/kessTheme/zipyo?itemCode=03&menuId=m_02_03_01&survCd=3394&survSeq=0000&uppCd1=030201',
  },
  hwaseongCity2001: {
    label: '화성시 시 승격 연혁 · 2001년 군에서 시로 승격',
    year: 2001,
    url: 'https://www.hscity.go.kr/www/intro/gnrlSttus/ctyhst/ctyhst01.jsp',
  },
  afterSchoolCare2004: {
    label: '교육부 초등돌봄교실 정책 · 2004년 시범 운영',
    year: 2004,
    url: 'https://www.moe.go.kr/',
  },
  meisterSchool2010: {
    label: '교육부 마이스터고 제도 · 2010년 개교',
    year: 2010,
    url: 'https://www.moe.go.kr/',
  },
  autonomousSchool2010: {
    label: '교육부 자율형 사립고 제도',
    year: 2010,
    url: 'https://www.moe.go.kr/',
  },
  bitcoinWhitepaper: {
    label: 'Bitcoin whitepaper and network history',
    year: 2008,
    url: 'https://bitcoin.org/bitcoin.pdf',
  },
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
