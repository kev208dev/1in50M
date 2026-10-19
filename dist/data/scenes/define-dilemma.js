// 작은 딜레마 계열 정의 도구.
// 한 계열 = 「누가(who)」 × 「무슨 일(detail)」 변형 × 공통 선택지.
// 선택지는 모든 변형에 똑같이 어울리도록 쓰고, 최소 두 개는 비용·조건 없이 언제나 고를 수 있어야 합니다.

import { fill } from './josa.js';

const STAT_KEYS = ['health', 'happiness', 'knowledge', 'relationships'];

export function dilemmaChoice(id, label, description, effects = {}, tags = [], extra = {}) {
  return { id, label, description, effects, tags, ...extra };
}

export function defineDilemma(spec) {
  const family = { weight: 1, cooldown: 6, when: null, years: null, ...spec };
  if (!/^[a-z0-9-]+$/.test(family.id ?? '')) throw new SyntaxError(`딜레마 id가 올바르지 않습니다: ${family.id}`);
  if (!Array.isArray(family.ageRange)) throw new SyntaxError(`[${family.id}] ageRange가 필요합니다.`);
  if (!family.title) throw new SyntaxError(`[${family.id}] title이 필요합니다.`);
  if (!Array.isArray(family.who) || family.who.length < 2) throw new SyntaxError(`[${family.id}] who는 2개 이상이어야 합니다.`);
  if (!Array.isArray(family.details) || family.details.length < 2) throw new SyntaxError(`[${family.id}] details는 2개 이상이어야 합니다.`);
  if (!Array.isArray(family.choices) || family.choices.length < 2 || family.choices.length > 4) {
    throw new SyntaxError(`[${family.id}] 선택지는 2~4개여야 합니다.`);
  }
  const free = family.choices.filter((item) => !item.cost && !item.minimumCash && !item.requiresPartner && !item.minimumKnowledge && !item.minimumHealth);
  if (free.length < 2) throw new SyntaxError(`[${family.id}] 조건 없는 선택지가 2개 이상 필요합니다.`);
  for (const item of family.choices) {
    for (const key of Object.keys(item.effects ?? {})) {
      if (!STAT_KEYS.includes(key)) throw new SyntaxError(`[${family.id}] 알 수 없는 능력치: ${key}`);
    }
  }
  for (const who of family.who) {
    if (!who.id || !who.label) throw new SyntaxError(`[${family.id}] who 항목에 id와 label이 필요합니다.`);
  }
  for (const detail of family.details) {
    if (!detail.id || !/\{who/.test(detail.text ?? '')) throw new SyntaxError(`[${family.id}] detail ${detail.id}은 {who}를 포함해야 합니다.`);
    if (!/[다요]\.$/.test(detail.text.trim()) && !/\?$/.test(detail.text.trim())) throw new SyntaxError(`[${family.id}] detail ${detail.id}은 문장으로 끝나야 합니다.`);
  }
  return Object.freeze(family);
}

export function dilemmaId(familyId, whoId, detailId) {
  return `dilemma:${familyId}:${whoId}:${detailId}`;
}

/** 계열 하나를 who × detail 변형 결정들로 펼친다. */
export function expandDilemma(family) {
  const decisions = [];
  for (const who of family.who) {
    for (const detail of family.details) {
      const values = { who: who.label, whoShort: who.short ?? who.label };
      decisions.push({
        id: dilemmaId(family.id, who.id, detail.id),
        dilemma: true,
        family: family.id,
        whoId: who.id,
        detailId: detail.id,
        title: fill(family.title, values),
        prompt: fill(detail.text, values),
        ageRange: family.ageRange,
        years: detail.years ?? who.years ?? family.years ?? null,
        whenWho: who.when ?? null,
        whenDetail: detail.when ?? null,
        when: family.when ?? null,
        weight: family.weight,
        cooldown: family.cooldown,
        overridePolicy: family.overridePolicy ?? 'allowed',
        choices: family.choices.map((item) => ({
          ...item,
          label: fill(item.label, values),
          description: fill(item.description, values),
        })),
      });
    }
  }
  return decisions;
}
