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
  const employed = ['employed', 'part-time'].includes(current.career.status);
  const grossIncome = employed ? Math.max(current.career.annualIncome, current.economy.income * 12) : 0;
  const monthlyHousing = HOUSING_MONTHLY_COST[current.housing.type] ?? 750000;
  const monthlyLiving = current.age < 19 ? 100000 : current.age >= 65 ? 700000 : 1050000;
  const fixedCosts = Math.max(current.economy.fixedCosts, monthlyHousing + monthlyLiving);
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
    deposit,
    homeValue,
    netWorth: finite(cash + deposit + homeValue - debt),
  };
  return normalizeLife({ ...current, economy });
}
