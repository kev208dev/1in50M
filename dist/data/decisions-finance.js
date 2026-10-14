import { BUSINESS_PLANS, FICTIONAL_INVESTMENT_NOTICE } from './financial-paths.js';

const choice = (id, label, description, effects = {}, tags = [], extra = {}) => ({
  id, label, description, effects, tags, ...extra,
});

const prompt = (text) => `${text} ${FICTIONAL_INVESTMENT_NOTICE}`;

export const FINANCE_DECISIONS = [
  {
    id: 'asset-allocation', ageRange: [24, 45], weight: 2,
    title: '처음 만드는 자산 바구니',
    prompt: prompt('월급과 여유 자금의 일부를 어디에 둘지 결정합니다.'),
    notice: FICTIONAL_INVESTMENT_NOTICE,
    choices: [
      choice('save-deposit', '예금으로 모은다', '원금 변동을 줄이고 비상 자금을 만듭니다.', { happiness: 1 }, ['안정', '계획'], { minimumCash: 3000000, financialAction: { type: 'buy', asset: 'deposits', amount: 3000000 } }),
      choice('buy-bonds', '채권을 산다', '낮은 변동성으로 이자를 기대합니다.', { knowledge: 1 }, ['안정', '관리'], { minimumCash: 5000000, financialAction: { type: 'buy', asset: 'bonds', amount: 5000000 } }),
      choice('domestic-stocks', '국내 주식에 투자한다', '기업의 성장과 시장 하락을 함께 감수합니다.', { knowledge: 1, happiness: -1 }, ['도전', '위험'], { minimumCash: 5000000, financialAction: { type: 'buy', asset: 'stocks', amount: 5000000, market: 'domestic' } }),
      choice('overseas-stocks', '해외 주식에 투자한다', '환율과 해외 시장의 변동까지 감수합니다.', { knowledge: 2, happiness: -1 }, ['도전', '위험'], { minimumCash: 5000000, financialAction: { type: 'buy', asset: 'stocks', amount: 5000000, market: 'overseas' } }),
      choice('defer-allocation', '지금은 투자하지 않는다', '생활비와 비상 자금을 먼저 지키며 결정을 미룹니다.', { happiness: 1 }, ['유보', '안정']),
    ],
  },
  {
    id: 'alternative-assets', ageRange: [26, 52],
    title: '집과 가상자산 사이',
    prompt: prompt('큰돈이 묶이는 선택과 큰 폭으로 흔들리는 선택을 비교합니다.'),
    notice: FICTIONAL_INVESTMENT_NOTICE,
    choices: [
      choice('buy-crypto', '가상자산을 산다', '가격이 급등하거나 크게 무너질 수 있습니다.', { happiness: -1 }, ['충동', '위험', '도전'], { minimumCash: 2000000, financialAction: { type: 'buy', asset: 'crypto', amount: 2000000 } }),
      choice('buy-property', '대출을 끼고 작은 집을 산다', '거주 기반을 얻지만 큰 빚과 이자를 감당합니다.', { happiness: 2 }, ['대출', '자산', '계획'], { minimumCash: 20000000, financialAction: { type: 'property', amount: 20000000, homeValue: 150000000, debt: 130000000 } }),
      choice('keep-liquid', '현금을 지킨다', '기회를 놓칠 수 있지만 갑작스러운 지출에 대비합니다.', { happiness: 1 }, ['유보', '안정']),
    ],
  },
  {
    id: 'chance-money', ageRange: [20, 70],
    title: '한 번에 바뀔지도 모른다는 유혹',
    prompt: prompt('복권과 도박은 대부분 손실이며 빚으로 이어질 수 있습니다.'),
    notice: FICTIONAL_INVESTMENT_NOTICE,
    choices: [
      choice('lottery-ticket', '복권 한 장을 산다', '거의 언제나 잃지만 아주 희귀한 대박 가능성이 있습니다.', { happiness: 1 }, ['충동', '낙관'], { minimumCash: 10000, financialAction: { type: 'lottery', amount: 10000 } }),
      choice('gambling-credit', '빚을 보태 도박한다', '내 돈과 빌린 돈을 함께 걸어 큰 손실 위험을 감수합니다.', { happiness: -3, health: -1 }, ['충동', '위험'], { minimumCash: 100000, financialAction: { type: 'gamble', amount: 100000, borrowed: 900000 } }),
      choice('walk-away', '유혹에서 벗어난다', '당장의 짜릿함보다 생활 자금을 지킵니다.', { happiness: 1, knowledge: 1 }, ['관리', '안정']),
    ],
  },
  {
    id: 'startup-capital', ageRange: [27, 55], weight: 2,
    title: '내 사업에 전 재산을 걸까',
    prompt: prompt('창업은 폐업과 부채, 드문 대규모 매각 가능성을 모두 가집니다.'),
    notice: FICTIONAL_INVESTMENT_NOTICE,
    when: (life) => !life.business || life.business.status !== 'operating',
    choices: [
      choice('food-startup', '작은 식음료 가게를 연다', '상권과 원가, 긴 노동시간을 직접 감당합니다.', { knowledge: 2, health: -2 }, ['창업', '위험'], { minimumCash: BUSINESS_PLANS.food.capital, businessPlan: BUSINESS_PLANS.food, careerTransition: { status: 'self-employed', title: BUSINESS_PLANS.food.label, annualIncome: 0 } }),
      choice('online-startup', '온라인 서비스를 시작한다', '작게 실험하지만 수요를 찾지 못하면 자본을 잃습니다.', { knowledge: 3, happiness: 1 }, ['창업', '도전'], { minimumCash: BUSINESS_PLANS.online.capital, businessPlan: BUSINESS_PLANS.online, careerTransition: { status: 'self-employed', title: BUSINESS_PLANS.online.label, annualIncome: 0 } }),
      choice('factory-startup', '소규모 제조업을 시작한다', '큰 설비 자금과 대출을 감수하는 선택입니다.', { knowledge: 3, health: -2 }, ['창업', '위험', '대출'], { minimumCash: BUSINESS_PLANS.manufacturing.capital, businessPlan: BUSINESS_PLANS.manufacturing, careerTransition: { status: 'self-employed', title: BUSINESS_PLANS.manufacturing.label, annualIncome: 0 } }),
      choice('keep-job', '현재 생업을 지킨다', '안정적인 현금 흐름을 유지합니다.', { happiness: 1 }, ['안정', '유지']),
    ],
  },
];
