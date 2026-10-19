// 장면 계열(scene family) 정의 도구.
// 한 계열 = 「상황」 여러 개 × 「결과」 여러 개. 상황은 「…는데,」처럼 쉼표로 끝나는 배경 절,
// 결과는 「…습니다.」로 끝나는 독립 절이라 어떤 조합이든 자연스러운 한 문장이 됩니다.

const STAT_KEYS = ['health', 'happiness', 'knowledge', 'relationships'];
const TONES = ['good', 'mixed', 'bad'];

function defaultEffects(tone, primary, secondary) {
  if (tone === 'good') return secondary ? { [primary]: 2, [secondary]: 1 } : { [primary]: 2, happiness: primary === 'happiness' ? 2 : 1 };
  if (tone === 'mixed') return secondary && secondary !== 'happiness' ? { [primary]: 1, [secondary]: -1 } : { [primary]: 1, happiness: primary === 'happiness' ? 0 : -1 };
  return { [primary]: -2, ...(primary === 'happiness' ? {} : { happiness: -1 }) };
}

function normalizeSituation(item, familyId, index) {
  const entry = typeof item === 'string' ? { text: item } : { ...item };
  if (typeof entry.text !== 'string' || !entry.text.trim().endsWith(',')) {
    throw new SyntaxError(`[${familyId}] 상황 ${index}는 쉼표로 끝나야 합니다: ${entry.text}`);
  }
  return {
    text: entry.text.trim(),
    years: entry.years ?? null,
    when: typeof entry.when === 'function' ? entry.when : null,
    cash: Number(entry.cash) || 0,
  };
}

function normalizeOutcome(item, family, index) {
  if (!item || !TONES.includes(item.tone)) throw new SyntaxError(`[${family.id}] 결과 ${index}의 tone이 올바르지 않습니다.`);
  if (typeof item.text !== 'string' || !/[다요]\.$/.test(item.text.trim())) {
    throw new SyntaxError(`[${family.id}] 결과 ${index}는 「다.」로 끝나는 문장이어야 합니다: ${item.text}`);
  }
  const effects = item.effects ?? defaultEffects(item.tone, family.primary, family.secondary);
  for (const key of Object.keys(effects)) {
    if (!STAT_KEYS.includes(key)) throw new SyntaxError(`[${family.id}] 알 수 없는 능력치: ${key}`);
  }
  return { tone: item.tone, text: item.text.trim(), effects, cash: Number(item.cash) || 0 };
}

export function defineFamily(spec) {
  const family = {
    weight: 1,
    cooldown: 4,
    when: null,
    years: null,
    secondary: null,
    ...spec,
  };
  if (!family.id || !/^[a-z0-9-]+$/.test(family.id)) throw new SyntaxError(`계열 id가 올바르지 않습니다: ${family.id}`);
  if (!STAT_KEYS.includes(family.primary)) throw new SyntaxError(`[${family.id}] primary 능력치가 필요합니다.`);
  if (!Array.isArray(family.ageRange) || family.ageRange.length !== 2) throw new SyntaxError(`[${family.id}] ageRange가 필요합니다.`);
  family.situations = (family.situations ?? []).map((item, index) => normalizeSituation(item, family.id, index));
  family.outcomes = (family.outcomes ?? []).map((item, index) => normalizeOutcome(item, family, index));
  if (family.situations.length < 4) throw new SyntaxError(`[${family.id}] 상황은 최소 4개가 필요합니다.`);
  if (family.outcomes.length < 4) throw new SyntaxError(`[${family.id}] 결과는 최소 4개가 필요합니다.`);
  for (const tone of TONES) {
    if (!family.outcomes.some((outcome) => outcome.tone === tone)) {
      throw new SyntaxError(`[${family.id}] 결과에 ${tone} 톤이 하나 이상 있어야 합니다.`);
    }
  }
  return Object.freeze(family);
}

export function sceneId(familyId, situationIndex, outcomeIndex) {
  return `scene:${familyId}:${situationIndex}:${outcomeIndex}`;
}

export function sceneText(family, situationIndex, outcomeIndex) {
  return `${family.situations[situationIndex].text} ${family.outcomes[outcomeIndex].text}`;
}
