import { createRng } from './random.js';

const money = (value) => Math.max(0, Math.round(Number(value) || 0));
const clampRoll = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function resolveBusinessYear(business, { demand, execution }) {
  const current = structuredClone(business);
  const score = clampRoll(demand) * 0.55 + clampRoll(execution) * 0.45;
  const years = money(current.years) + 1;
  if (score <= 0.08) return { ...current, status: 'closed', equity: 0, years, lastGrowth: -1 };
  if (score >= 0.99) {
    return {
      ...current,
      status: 'sold',
      equity: Math.max(1_250_000_000, money(current.equity) * 25, money(current.capital) * 25),
      years,
      lastGrowth: 24,
    };
  }
  const growth = -0.55 + score * 1.5;
  const equity = money(money(current.equity) * (1 + growth));
  return {
    ...current,
    status: equity <= 0 ? 'closed' : 'operating',
    equity,
    years,
    lastGrowth: growth,
  };
}

export function startBusiness(life, plan) {
  const current = structuredClone(life);
  const capital = money(plan.capital);
  const debt = money(plan.debt);
  if (capital > current.economy.cash) throw new RangeError('창업 자금이 부족합니다.');
  current.economy = {
    ...current.economy,
    cash: current.economy.cash - capital,
    debt: current.economy.debt + debt,
    assets: { ...current.economy.assets, businessEquity: capital },
    transactions: [...(current.economy.transactions ?? []), {
      id: `tx-${current.year}-startup`, age: current.age, year: current.year,
      type: 'startup', asset: 'businessEquity', amount: capital, borrowed: debt,
    }].slice(-100),
  };
  current.business = {
    status: 'operating', sector: plan.sector, capital, debt,
    equity: capital, years: 0, lastGrowth: 0,
  };
  return current;
}

export function advanceBusiness(life) {
  const current = structuredClone(life);
  if (!current.business || current.business.status !== 'operating') return current;
  const rng = createRng(`${current.seed}:business:${current.year}:${current.business.years}`);
  const outcome = resolveBusinessYear(current.business, { demand: rng.next(), execution: rng.next() });
  const assets = { ...current.economy.assets, businessEquity: outcome.status === 'sold' ? 0 : outcome.equity };
  let cash = current.economy.cash;
  let debt = current.economy.debt;
  if (outcome.status === 'sold') {
    cash += outcome.equity;
    debt = Math.max(0, debt - outcome.debt);
  }
  current.business = outcome;
  current.economy = { ...current.economy, cash, debt, assets };
  if (outcome.status !== 'operating') {
    const sold = outcome.status === 'sold';
    const label = sold ? '창업 회사 매각' : '사업 폐업';
    current.economy.transactions = [...(current.economy.transactions ?? []), {
      id: `tx-${current.year}-business-${outcome.status}`,
      age: current.age,
      year: current.year,
      type: sold ? 'business-sale' : 'business-close',
      amount: sold ? outcome.equity : 0,
    }].slice(-100);
    current.history = [...(current.history ?? []), {
      id: `business-${current.age}-${outcome.status}`,
      age: current.age,
      year: current.year,
      type: 'event',
      text: sold ? '성장한 회사를 매각해 큰 자산을 얻었습니다.' : '사업을 정리하고 남은 부채와 다음 생계를 살폈습니다.',
      label,
    }];
    current.milestones = [...(current.milestones ?? []), { age: current.age, type: 'business', label }];
  }
  return current;
}
