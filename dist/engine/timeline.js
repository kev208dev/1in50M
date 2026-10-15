const numberOr = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function orderTimeline(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry === 'object' && !entry.filler)
    .map((entry, index) => ({
      ...entry,
      sequence: numberOr(entry.sequence, index),
    }))
    .sort((a, b) => (
      numberOr(a.year) - numberOr(b.year)
      || numberOr(a.age) - numberOr(b.age)
      || numberOr(a.priority, 50) - numberOr(b.priority, 50)
      || numberOr(a.sequence) - numberOr(b.sequence)
    ));
}

export function appendTimeline(life, entries = []) {
  const current = structuredClone(life ?? {});
  return {
    ...current,
    history: orderTimeline([...(current.history ?? []), ...(Array.isArray(entries) ? entries : [])]),
  };
}
