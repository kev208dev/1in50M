// 체험용 가중치입니다. 실제 인구통계 비율이 아닙니다.
export const SIMULATION_DISCLAIMER =
  '현재 결과는 실제 인구통계가 아닌 체험용 가상 시뮬레이션입니다.';

export const REGIONS = [
  { name: '서울특별시', short: '서울', code: 'SEL', weight: 18, districts: ['종로구', '성동구', '마포구', '영등포구', '강남구', '송파구'] },
  { name: '부산광역시', short: '부산', code: 'BSN', weight: 7, districts: ['중구', '부산진구', '동래구', '해운대구', '사하구', '기장군'] },
  { name: '대구광역시', short: '대구', code: 'DGU', weight: 5, districts: ['중구', '수성구', '달서구', '북구', '동구', '달성군'] },
  { name: '인천광역시', short: '인천', code: 'ICN', weight: 6.5, districts: ['중구', '미추홀구', '연수구', '남동구', '부평구', '서구'] },
  { name: '광주광역시', short: '광주', code: 'GJU', weight: 3.2, districts: ['동구', '서구', '남구', '북구', '광산구'] },
  { name: '대전광역시', short: '대전', code: 'DJN', weight: 3.2, districts: ['동구', '중구', '서구', '유성구', '대덕구'] },
  { name: '울산광역시', short: '울산', code: 'USN', weight: 2.4, districts: ['중구', '남구', '동구', '북구', '울주군'] },
  { name: '세종특별자치시', short: '세종', code: 'SJN', weight: 1, districts: ['조치원읍', '한솔동', '도담동', '보람동'] },
  { name: '경기도', short: '경기', code: 'GGD', weight: 25, districts: ['수원시', '성남시', '고양시', '용인시', '부천시', '화성시'] },
  { name: '강원특별자치도', short: '강원', code: 'GWD', weight: 3.2, districts: ['춘천시', '원주시', '강릉시', '속초시', '홍천군'] },
  { name: '충청북도', short: '충북', code: 'CBK', weight: 3.4, districts: ['청주시', '충주시', '제천시', '진천군', '옥천군'] },
  { name: '충청남도', short: '충남', code: 'CNM', weight: 4.6, districts: ['천안시', '공주시', '아산시', '서산시', '홍성군'] },
  { name: '전북특별자치도', short: '전북', code: 'JBK', weight: 3.6, districts: ['전주시', '군산시', '익산시', '정읍시', '완주군'] },
  { name: '전라남도', short: '전남', code: 'JNM', weight: 3.7, districts: ['목포시', '여수시', '순천시', '나주시', '무안군'] },
  { name: '경상북도', short: '경북', code: 'GBK', weight: 5.2, districts: ['포항시', '경주시', '김천시', '안동시', '구미시'] },
  { name: '경상남도', short: '경남', code: 'GNM', weight: 6.8, districts: ['창원시', '진주시', '통영시', '김해시', '거제시'] },
  { name: '제주특별자치도', short: '제주', code: 'JJU', weight: 1.5, districts: ['제주시', '서귀포시', '애월읍', '조천읍'] },
];

export const FAMILY_TYPES = [
  { value: '양부모 가정', weight: 61, guardianCount: 2 },
  { value: '한부모 가정', weight: 16, guardianCount: 1 },
  { value: '조부모와 함께 사는 가정', weight: 10, guardianCount: 2 },
  { value: '재혼 가정', weight: 8, guardianCount: 2 },
  { value: '친족 보호자 가정', weight: 5, guardianCount: 1 },
];

export const OCCUPATIONS = [
  { value: '사무·관리직', weight: 20 },
  { value: '전문직', weight: 12 },
  { value: '교육·공공 서비스', weight: 10 },
  { value: '서비스·판매직', weight: 18 },
  { value: '생산·기술직', weight: 14 },
  { value: '운송·물류직', weight: 7 },
  { value: '농림어업', weight: 5 },
  { value: '자영업', weight: 9 },
  { value: '구직·휴직 중', weight: 5 },
];

export const FINANCES = [
  { value: '빠듯한 편', weight: 27, stability: -8, education: -4 },
  { value: '보통', weight: 58, stability: 1, education: 1 },
  { value: '여유 있는 편', weight: 15, stability: 9, education: 6 },
];

export const HOUSING = [
  { value: '자가 주택', weight: 42, stability: 4 },
  { value: '전세 주택', weight: 22, stability: 1 },
  { value: '월세 주택', weight: 24, stability: -3 },
  { value: '공공임대 주택', weight: 8, stability: 0 },
  { value: '가족 소유 주택', weight: 4, stability: 2 },
];

export const SIBLINGS = [
  { value: '외동', count: 0, weight: 34 },
  { value: '형제자매 1명', count: 1, weight: 48 },
  { value: '형제자매 2명', count: 2, weight: 14 },
  { value: '형제자매 3명 이상', count: 3, weight: 4 },
];
