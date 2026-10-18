import { ASSET_MODELS } from '../data/financial-paths.js';

const ACTIONS = {
  'stock-buy': { type: 'buy', asset: 'stocks', amount: 1000000 },
  'stock-sell': { type: 'sell', asset: 'stocks', amount: 1000000 },
  'crypto-buy': { type: 'buy', asset: 'crypto', amount: 2000000 },
  'crypto-sell': { type: 'sell', asset: 'crypto', amount: 2000000 },
  'lottery-buy': { type: 'lottery-ticket', amount: 10000 },
  'lottery-broadcast': { type: 'lottery-broadcast' },
  'car-buy': { type: 'vehicle', amount: 8000000, vehicleValue: 16000000, debt: 8000000, monthlyCost: 300000 },
  'property-buy': { type: 'property', amount: 20000000, homeValue: 150000000, debt: 130000000 },
};

export function financeMenuState(life, region = null) {
  return Object.fromEntries(Object.entries(ACTIONS).map(([id, definition]) => {
    const action = { ...definition, ...(id === 'property-buy' ? { region } : {}) };
    let reason = '';
    const availableYear = ASSET_MODELS[action.asset]?.availableFromYear;
    if (!life || life.status !== 'living') reason = '진행 중인 삶에서 이용 가능';
    else if (life.age < 19) reason = '19세부터 이용 가능';
    else if (id === 'lottery-broadcast') reason = life.economy.pendingLotteryDraw ? '' : '먼저 복권 구매';
    else if (id === 'lottery-buy' && life.economy.pendingLotteryDraw) reason = '기다리는 방송 먼저 확인';
    else if (action.type === 'buy' && availableYear && life.year < availableYear) reason = `${availableYear}년부터 거래 가능`;
    else if (id === 'property-buy' && !region) reason = '지도에서 지역 선택';
    else if (action.type === 'sell') {
      if ((life.economy.assets[action.asset] ?? 0) < action.amount) reason = '매도할 보유액 부족';
    } else if (life.economy.cash < action.amount) reason = `현금 ${action.amount / 10000}만원 필요`;
    return [id, { action, enabled: !reason, reason }];
  }));
}
