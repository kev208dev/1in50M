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

export function calculateAnnualEconomy(life) {
  const current = normalizeLife(life);
  const employed = ['employed', 'part-time', 'self-employed'].includes(current.career.status);
  const grossIncome = employed ? Math.max(current.career.annualIncome, current.economy.income * 12) : 0;
  const isDependent = current.age < 19;
  const monthlyHousing = isDependent ? 0 : HOUSING_MONTHLY_COST[current.housing.type] ?? 750000;
  const monthlyLiving = isDependent ? 0 : current.age >= 65 ? 700000 : 1050000;
  const fixedCosts = isDependent ? 0 : Math.max(current.economy.fixedCosts, monthlyHousing + monthlyLiving);
  const annualCosts = fixedCosts * 12;
  const debtInterest = Math.round(current.economy.debt * 0.025);
  const cash = finite(current.economy.cash + grossIncome - annualCosts - debtInterest);
  const debt = Math.max(0, finite(current.economy.debt));
  const deposit = Math.max(0, finite(current.economy.deposit));
  const homeValue = Math.max(0, finite(current.economy.homeValue));
  const economy = {
    cash,
    income: finite(grossIncome / 12),
    fixedCosts: finite(fixedCosts),
    debt,
    housingDebt: current.economy.housingDebt,
    otherDebt: current.economy.otherDebt,
    deposit,
    homeValue,
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
      - debt
    ),
  };
  return normalizeLife({ ...current, economy });
}
