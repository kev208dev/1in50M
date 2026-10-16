import { ASSET_MODELS } from '../data/financial-paths.js';
import { createRng } from './random.js';

const clampRoll = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const money = (value) => Math.max(0, Math.round(Number(value) || 0));
const dopamine = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export function compoundAsset(value, model, marketRoll) {
  const centered = (clampRoll(marketRoll) * 2) - 1;
  return Math.max(0, Math.round(money(value) * (1 + model.annualMean + centered * model.volatility)));
}

export function resolveLottery(roll, stake) {
  const amount = money(stake);
  if (clampRoll(roll) >= 0.999999) {
    return { payout: Math.max(1_000_000_000, amount * 100_000), tier: 'jackpot' };
  }
  if (clampRoll(roll) >= 0.995) return { payout: amount * 50, tier: 'minor' };
  return { payout: 0, tier: 'none' };
}

export function purchaseLotteryTicket(life, { amount = 10000, roll } = {}) {
  const current = structuredClone(life);
  if (current.economy.pendingLotteryDraw) throw new RangeError('먼저 기다리는 복권 방송을 확인해 주세요.');
  const stake = money(amount);
  requireOwnCash(current, stake);
  const drawRoll = roll ?? createRng(`${current.seed}:lottery:${current.year}:${current.age}`).next();
  const result = resolveLottery(drawRoll, stake);
  current.economy.cash -= stake;
  current.economy.pendingLotteryDraw = {
    id: `lottery-${current.year}-${current.age}`,
    amount: stake,
    payout: result.payout,
    tier: result.tier,
    revealed: false,
  };
  current.economy.transactions = transaction(current, { type: 'lottery-ticket', amount: stake }, { resultHidden: true });
  return current;
}

export function revealLotteryBroadcast(life) {
  const current = structuredClone(life);
  const draw = current.economy.pendingLotteryDraw;
  if (!draw) return current;
  current.economy.cash = Math.round((Number(current.economy.cash) || 0) + money(draw.payout));
  current.economy.pendingLotteryDraw = null;
  current.economy.transactions = transaction(current, { type: 'lottery', amount: draw.amount }, {
    payout: money(draw.payout), tier: draw.tier,
  });
  return current;
}

function transaction(life, action, details = {}) {
  const previous = Array.isArray(life.economy.transactions) ? life.economy.transactions : [];
  return [...previous, {
    id: `tx-${life.year}-${previous.length + 1}`,
    age: life.age,
    year: life.year,
    type: action.type,
    asset: action.asset ?? null,
    amount: money(action.amount),
    ...details,
  }].slice(-100);
}

function requireOwnCash(life, amount) {
  if (amount > life.economy.cash) throw new RangeError('사용 가능한 자금이 부족합니다.');
}

export function applyFinancialAction(life, action = {}) {
  const current = structuredClone(life);
  const amount = money(action.amount);
  const assets = { ...current.economy.assets };
  let cash = Number(current.economy.cash) || 0;
  let housingDebt = Number(current.economy.housingDebt) || 0;
  let otherDebt = Number(current.economy.otherDebt) || 0;
  let details = {};

  if (action.type === 'buy') {
    const model = ASSET_MODELS[action.asset];
    if (!model) throw new RangeError('알 수 없는 금융 자산입니다.');
    if (model.availableFromYear && current.year < model.availableFromYear) {
      throw new RangeError(`${model.availableFromYear}년 전에는 가상자산을 살 수 없습니다.`);
    }
    requireOwnCash(current, amount);
    cash -= amount;
    assets[action.asset] = money(assets[action.asset]) + amount;
  } else if (action.type === 'sell') {
    if (!ASSET_MODELS[action.asset]) throw new RangeError('알 수 없는 금융 자산입니다.');
    if (amount > money(assets[action.asset])) throw new RangeError('매도할 자산이 부족합니다.');
    assets[action.asset] = money(assets[action.asset]) - amount;
    cash += amount;
  } else if (action.type === 'lottery') {
    requireOwnCash(current, amount);
    const roll = action.roll ?? createRng(`${current.seed}:lottery:${current.year}:${current.age}`).next();
    const result = resolveLottery(roll, amount);
    cash = cash - amount + result.payout;
    details = { payout: result.payout, tier: result.tier };
  } else if (action.type === 'gamble') {
    requireOwnCash(current, amount);
    const borrowed = money(action.borrowed);
    const stake = amount + borrowed;
    const roll = clampRoll(action.roll ?? createRng(`${current.seed}:gamble:${current.year}:${current.age}`).next());
    const payout = roll >= 0.995 ? stake * 20 : roll >= 0.55 ? Math.round(stake * 1.7) : 0;
    cash = cash - amount + payout;
    otherDebt += borrowed;
    details = { borrowed, payout, tier: payout >= stake * 20 ? 'big-win' : payout > 0 ? 'win' : 'loss' };
  } else if (action.type === 'property') {
    requireOwnCash(current, amount);
    cash -= amount;
    const addedHomeValue = money(action.homeValue);
    current.economy.homeValue = money(current.economy.homeValue) + addedHomeValue;
    housingDebt += money(action.debt);
    details = { homeValue: addedHomeValue, borrowed: money(action.debt), region: action.region ?? null };
  } else if (action.type === 'vehicle') {
    requireOwnCash(current, amount);
    cash -= amount;
    const addedVehicleValue = money(action.vehicleValue);
    current.economy.vehicleValue = money(current.economy.vehicleValue) + addedVehicleValue;
    otherDebt += money(action.debt);
    current.economy.recurringCosts = money(current.economy.recurringCosts) + money(action.monthlyCost);
    details = { vehicleValue: addedVehicleValue, borrowed: money(action.debt), monthlyCost: money(action.monthlyCost) };
  } else {
    throw new RangeError('알 수 없는 금융 행동입니다.');
  }

  current.economy = {
    ...current.economy,
    cash: Math.round(cash),
    debt: money(housingDebt + otherDebt),
    housingDebt: money(housingDebt),
    otherDebt: money(otherDebt),
    deposit: money(assets.deposits),
    assets,
    transactions: transaction(current, { ...action, amount }, details),
    dopamine: dopamine((current.economy.dopamine ?? 0) + (action.type === 'buy' && action.asset === 'crypto' ? 24 : 0)),
  };
  return current;
}

export function applyHousingTransition(life, option) {
  const current = structuredClone(life);
  const previousHousingDebt = money(current.economy.housingDebt);
  const previousHomeValue = money(current.economy.homeValue);
  const saleEquity = Math.max(0, previousHomeValue - previousHousingDebt);
  const saleShortfall = Math.max(0, previousHousingDebt - previousHomeValue);
  const otherDebt = money(current.economy.otherDebt) + saleShortfall;
  const housingDebt = money(option.debt);
  const deposit = money(option.deposit);
  current.economy = {
    ...current.economy,
    cash: Math.round((Number(current.economy.cash) || 0)
      + money(current.economy.deposit) + saleEquity - money(option.requiredCash)),
    deposit,
    assets: { ...current.economy.assets, deposits: deposit },
    homeValue: money(option.homeValue),
    housingDebt,
    otherDebt,
    debt: housingDebt + otherDebt,
    fixedCosts: money(option.monthlyCost),
  };
  return current;
}

export function advancePortfolio(life, { marketRoll } = {}) {
  const current = structuredClone(life);
  const rng = createRng(`${current.seed}:market:${current.year}:${current.age}`);
  const assets = { ...current.economy.assets };
  const lastReturns = {};
  const marketRegime = marketRoll === undefined ? rng.next() : clampRoll(marketRoll);

  for (const [assetId, model] of Object.entries(ASSET_MODELS)) {
    const before = money(assets[assetId]);
    if (model.availableFromYear && current.year < model.availableFromYear) {
      lastReturns[assetId] = 0;
      continue;
    }
    const after = compoundAsset(before, model, marketRegime);
    assets[assetId] = after;
    lastReturns[assetId] = before > 0 ? (after - before) / before : 0;
  }

  current.economy = {
    ...current.economy,
    assets,
    deposit: money(assets.deposits),
    lastReturns,
    dopamine: dopamine((current.economy.dopamine ?? 0) - 6 + Math.abs(lastReturns.crypto ?? 0) * 30),
    transactions: transaction(current, { type: 'market', amount: 0 }, { marketRegime }),
  };
  return current;
}
