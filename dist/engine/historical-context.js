import { ADMINISTRATIVE_ALIASES, INSTITUTION_WINDOWS } from '../data/era-validity.js';
import { STATISTIC_SERIES } from '../data/public-statistics.js';

export function isAvailableInYear(item, year) {
  const value = Number(year);
  return Number.isFinite(value)
    && value >= (item?.availableFrom ?? -Infinity)
    && value <= (item?.availableUntil ?? Infinity);
}

export function historicalDistrictName(regionCode, district, year) {
  const rule = ADMINISTRATIVE_ALIASES.find((item) => (
    item.regionCode === regionCode && item.current === district
  ));
  return rule && Number(year) < rule.changedIn ? rule.before : district;
}

export function getStatistic(metric, query = {}) {
  const rows = (STATISTIC_SERIES[metric] ?? [])
    .filter((row) => !row.sex || row.sex === query.sex)
    .sort((a, b) => a.year - b.year);
  if (!rows.length) {
    return { value: null, year: null, sourceKey: null, kind: 'modeled' };
  }
  const requestedYear = Number(query.year);
  const eligible = rows.filter((row) => row.year <= requestedYear);
  const row = eligible.at(-1) ?? rows[0];
  return { ...row, kind: eligible.length ? 'statistic' : 'modeled' };
}

export { INSTITUTION_WINDOWS };
