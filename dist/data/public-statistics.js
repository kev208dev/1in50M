// Versioned, in-repository snapshots keep seeded lives reproducible.
// Values are rounded to one decimal from Statistics Korea life-table releases.
export const PUBLIC_DATA_VERSION = 'kr-public-v1-2024';

export const STATISTIC_SERIES = {
  lifeExpectancy: [
    { year: 1985, sex: 'male', value: 64.6, sourceKey: 'lifeTable2024' },
    { year: 1985, sex: 'female', value: 73.2, sourceKey: 'lifeTable2024' },
    { year: 2000, sex: 'male', value: 72.3, sourceKey: 'lifeTable2024' },
    { year: 2000, sex: 'female', value: 79.7, sourceKey: 'lifeTable2024' },
    { year: 2010, sex: 'male', value: 76.8, sourceKey: 'lifeTable2024' },
    { year: 2010, sex: 'female', value: 83.6, sourceKey: 'lifeTable2024' },
    { year: 2020, sex: 'male', value: 80.5, sourceKey: 'lifeTable2024' },
    { year: 2020, sex: 'female', value: 86.5, sourceKey: 'lifeTable2024' },
    { year: 2024, sex: 'male', value: 80.8, sourceKey: 'lifeTable2024' },
    { year: 2024, sex: 'female', value: 86.6, sourceKey: 'lifeTable2024' },
  ],
};
