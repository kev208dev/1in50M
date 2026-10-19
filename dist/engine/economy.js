import { normalizeLife } from './life.js';

const HOUSING_MONTHLY_COST = {
  'with-family': 450000,
  dormitory: 550000,
  'monthly-rent': 950000,
  jeonse: 650000,
  'public-rental': 600000,
  'owned-home': 800000,
};

const finite = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;

// 개인 부담을 계산하는 게임용 예산 모델. 가구 전체 지출이나 공식 통계가 아니다.
export function annualBudget(life) {
  const current = normalizeLife(life);
  const employed = ['employed', 'part-time', 'self-employed'].includes(current.career.status);
  const grossIncome = employed ? Math.max(current.career.annualIncome, current.economy.income * 12) : 0;
  const isDependent = current.age < 19;
  const withFamily = current.housing.type === 'with-family';
  const student = current.education.status === 'enrolled' && ['university', 'college', 'training'].includes(current.education.level);
  const preparing = withFamily && current.age <= 24 && (!employed || student);
  const monthlyHousing = isDependent ? 0 : withFamily ? (preparing ? 150000 : 250000) : HOUSING_MONTHLY_COST[current.housing.type] ?? 750000;
  const monthlyLiving = isDependent ? 0 : withFamily ? (preparing ? 300000 : 550000) : current.age >= 65 ? 700000 : 1050000;
  const recurringCosts = isDependent ? 0 : Math.max(0, finite(current.economy.recurringCosts));
  const fixedCosts = isDependent ? 0 : monthlyHousing + monthlyLiving + recurringCosts;
  const annualCosts = fixedCosts * 12;
  const debtInterest = Math.round(current.economy.debt * 0.025);
  const familySupport = preparing ? Math.min(current.economy.householdSupport, Math.max(0, annualCosts - grossIncome - Math.max(0, current.economy.cash))) : 0;
  return { grossIncome, fixedCosts, recurringCosts, annualCosts, debtInterest, familySupport, net: finite(grossIncome + familySupport - annualCosts - debtInterest) };
}

export function calculateAnnualEconomy(life) {
  const current = normalizeLife(life);
  const { grossIncome, fixedCosts, recurringCosts, annualCosts, debtInterest, familySupport, net } = annualBudget(current);
  const cash = finite(current.economy.cash + net);
  const debt = Math.max(0, finite(current.economy.debt));
  const deposit = Math.max(0, finite(current.economy.deposit));
  const homeValue = Math.max(0, finite(current.economy.homeValue));
  const vehicleValue = Math.max(0, finite(current.economy.vehicleValue));
  const economy = {
    ...current.economy,
    cash,
    householdSupport: current.economy.householdSupport - familySupport,
    income: finite(grossIncome / 12),
    fixedCosts: finite(fixedCosts),
    recurringCosts,
    debt,
    housingDebt: current.economy.housingDebt,
    otherDebt: current.economy.otherDebt,
    deposit,
    homeValue,
    vehicleValue,
    assets: {
      ...current.economy.assets,
      deposits: deposit,
    },
    transactions: current.economy.transactions,
    lastReturns: current.economy.lastReturns,
    netWorth: finite(
      cash
      + deposit
      + current.economy.assets.bonds
      + current.economy.assets.stocks
      + current.economy.assets.crypto
      + current.economy.assets.businessEquity
      + homeValue
      + vehicleValue
      - debt
    ),
  };
  const won = (value) => `${Math.round(value).toLocaleString('ko-KR')}원`;
  const history = current.age >= 19 ? [...current.history, {
    id: `budget-${current.year}`, age: current.age, year: current.year, type: 'economy', label: '올해의 가계부',
    text: `연간 소득 ${won(grossIncome)} · 생활비 ${won(annualCosts)} · 이자 ${won(debtInterest)}${familySupport ? ` · 가정 지원 ${won(familySupport)}` : ''} → 현금 ${net >= 0 ? '+' : ''}${won(net)}.`,
  }] : current.history;
  return normalizeLife({ ...current, economy, history });
}
