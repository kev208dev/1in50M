export const ERA_OPTIONS = [
  { id: 'random', label: '완전 무작위', startYear: null, endYear: null },
  ...[1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((startYear) => ({
    id: `${startYear}s`,
    label: `${startYear}년대`,
    startYear,
    endYear: startYear + 9,
  })),
  { id: 'future', label: '미래 대한민국', startYear: null, endYear: null },
];

export const ERA_BY_ID = Object.fromEntries(ERA_OPTIONS.map((item) => [item.id, item]));

export function eraForYear(year, currentYear = new Date().getFullYear()) {
  if (year > currentYear) return ERA_BY_ID.future;
  return ERA_BY_ID[`${Math.floor(year / 10) * 10}s`] ?? ERA_BY_ID.random;
}
