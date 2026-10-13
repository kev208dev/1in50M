const makeCareers = (groupId, titles, baseSalary, options = {}) => titles.map((title, index) => ({
  id: `${groupId}-${index + 1}`,
  title,
  requirements: {
    knowledge: (options.knowledge ?? 35) + (index * 4),
    education: options.education ?? 'any',
  },
  salaryRange: [baseSalary + (index * 2400000), baseSalary + 14000000 + (index * 3600000)],
  stability: Math.max(1, Math.min(5, (options.stability ?? 3) + (index % 2))),
  stress: Math.max(1, Math.min(5, (options.stress ?? 3) + ((index + 1) % 2))),
  healthEffect: options.healthEffect ?? (index % 3 === 0 ? -1 : 0),
  relationshipEffect: options.relationshipEffect ?? (index % 2 === 0 ? 0 : -1),
}));

export const CAREER_GROUPS = [
  { id: 'management', label: '경영·사무', careers: makeCareers('management', ['사무원', '기획자', '인사 담당자', '회계 담당자', '프로젝트 매니저'], 30000000, { knowledge: 40, stability: 3 }) },
  { id: 'research', label: '연구·전문', careers: makeCareers('research', ['연구원', '법률 전문가', '분석가', '환경 전문가'], 38000000, { knowledge: 62, education: 'university', stability: 3 }) },
  { id: 'education-public', label: '교육·공공', careers: makeCareers('education-public', ['교사', '공무원', '교육 기획자', '도서관 사서'], 34000000, { knowledge: 55, education: 'university', stability: 4 }) },
  { id: 'health-welfare', label: '보건·복지', careers: makeCareers('health-welfare', ['간호 인력', '사회복지사', '재활 전문가', '보건 행정가'], 33000000, { knowledge: 52, stability: 4, stress: 4 }) },
  { id: 'culture-media', label: '문화·예술·미디어', careers: makeCareers('culture-media', ['디자이너', '영상 제작자', '작가', '공연 기획자', '콘텐츠 편집자'], 28000000, { knowledge: 40, stability: 2 }) },
  { id: 'service-sales', label: '서비스·판매', careers: makeCareers('service-sales', ['매장 관리자', '호텔 서비스원', '상담원', '판매 전문가', '조리사'], 27000000, { knowledge: 25, stress: 4 }) },
  { id: 'manufacturing-tech', label: '생산·기술', careers: makeCareers('manufacturing-tech', ['생산 기술자', '품질 관리자', '정비 기술자', '자동화 기술자'], 32000000, { knowledge: 35, stability: 4 }) },
  { id: 'construction', label: '건설·설비', careers: makeCareers('construction', ['건축 기술자', '전기 설비원', '현장 관리자', '인테리어 시공자'], 34000000, { knowledge: 32, healthEffect: -1 }) },
  { id: 'transport-logistics', label: '운송·물류', careers: makeCareers('transport-logistics', ['배송 기사', '물류 관리자', '철도 종사자', '운송 기획자'], 31000000, { knowledge: 28, stability: 3, healthEffect: -1 }) },
  { id: 'agriculture', label: '농림어업', careers: makeCareers('agriculture', ['농업인', '스마트팜 운영자', '산림 관리원', '수산업 종사자'], 26000000, { knowledge: 25, healthEffect: -1, relationshipEffect: 1 }) },
  { id: 'it-data', label: 'IT·데이터', careers: makeCareers('it-data', ['소프트웨어 개발자', '데이터 분석가', '보안 엔지니어', '서비스 기획자', 'AI 엔지니어'], 39000000, { knowledge: 55, stability: 3, stress: 4 }) },
  { id: 'self-employed', label: '자영업·창업', careers: makeCareers('self-employed', ['동네 가게 운영자', '온라인 판매자', '프리랜서', '스타트업 창업자'], 25000000, { knowledge: 30, stability: 1, stress: 4 }) },
];

export const ALL_CAREERS = CAREER_GROUPS.flatMap((group) => group.careers.map((career) => ({ ...career, groupId: group.id, groupLabel: group.label })));
export const CAREER_BY_ID = Object.fromEntries(ALL_CAREERS.map((career) => [career.id, career]));
