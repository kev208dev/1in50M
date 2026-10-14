export const FICTIONAL_INVESTMENT_NOTICE = '가상 시뮬레이션이며 실제 투자·도박 조언이 아닙니다.';

export const ASSET_MODELS = {
  deposits: { id: 'deposits', label: '예금', annualMean: 0.025, volatility: 0.005 },
  bonds: { id: 'bonds', label: '채권', annualMean: 0.035, volatility: 0.035 },
  stocks: { id: 'stocks', label: '주식', annualMean: 0.075, volatility: 0.24 },
  crypto: {
    id: 'crypto', label: '가상자산', annualMean: 0.16, volatility: 0.75, availableFromYear: 2010,
  },
};

export const BUSINESS_PLANS = {
  food: { sector: 'food', label: '동네 식음료 가게', capital: 15000000, debt: 5000000 },
  online: { sector: 'online', label: '온라인 서비스', capital: 20000000, debt: 3000000 },
  manufacturing: { sector: 'manufacturing', label: '소규모 제조업', capital: 40000000, debt: 15000000 },
};
