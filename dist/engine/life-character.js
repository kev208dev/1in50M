const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function stageAt(age) {
  if (age <= 5) return 'infant';
  if (age <= 12) return 'child';
  if (age <= 18) return 'teen';
  if (age <= 34) return 'young-adult';
  if (age <= 64) return 'adult';
  return 'senior';
}

export function characterViewModel(life) {
  const age = clamp(Math.round(Number(life?.age) || 0), 0, 90);
  const health = Number(life?.stats?.health) || 0;
  const happiness = Number(life?.stats?.happiness) || 0;
  const pose = health < 35 ? 'tired' : happiness > 70 ? 'bright' : 'neutral';
  return {
    age,
    stage: stageAt(age),
    progress: Math.round((age / 90) * 100),
    pose,
    tone: pose === 'tired' ? '#C8D0C2' : pose === 'bright' ? '#3DF08A' : '#EEF3EC',
  };
}
