export const HOUSING_OPTIONS = [
  { id: 'with-family', label: '가족과 동거', requiredCash: 0, deposit: 0, monthlyCost: 450000, description: '생활비를 나누며 가족과 함께 지냅니다.' },
  { id: 'dormitory', label: '기숙사', requiredCash: 1000000, deposit: 1000000, monthlyCost: 550000, description: '작은 공간에서 공동생활을 시작합니다.' },
  { id: 'monthly-rent', label: '월세', requiredCash: 6000000, deposit: 5000000, monthlyCost: 950000, description: '보증금과 매달 주거비를 부담합니다.' },
  { id: 'jeonse', label: '전세', requiredCash: 90000000, deposit: 85000000, monthlyCost: 650000, description: '큰 보증금을 맡기고 주거비를 낮춥니다.' },
  { id: 'public-rental', label: '공공임대', requiredCash: 12000000, deposit: 10000000, monthlyCost: 600000, description: '가상 자격 확인을 거친 안정적인 임대 경로입니다.' },
  { id: 'owned-home', label: '자가', requiredCash: 220000000, deposit: 0, homeValue: 300000000, debt: 100000000, monthlyCost: 800000, description: '자산과 부채를 함께 감당하며 집을 마련합니다.' },
];

export const HOUSING_BY_ID = Object.fromEntries(HOUSING_OPTIONS.map((housing) => [housing.id, housing]));
