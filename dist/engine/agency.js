import { createRng } from './random.js';

export const getOverrideRate = (personality = {}) => ({
  mixed: 0,
  strong: 0.12,
  extreme: 0.28,
}[personality.strength] ?? 0);

const keep = (requestedChoice) => ({
  requestedChoiceId: requestedChoice?.id ?? null,
  requestedLabel: requestedChoice?.label ?? '',
  actualChoiceId: requestedChoice?.id ?? null,
  actualLabel: requestedChoice?.label ?? '',
  overridden: false,
  reason: '',
});

export function resolveAgencyChoice(life, decision, requestedChoice, choices) {
  const personality = life?.profile?.personality ?? { strength: 'mixed', dominant: null };
  if (!requestedChoice || decision?.overridePolicy === 'forbidden' || !personality.dominant) {
    return keep(requestedChoice);
  }
  const alternatives = choices.filter((choice) => (
    choice.enabled
    && choice.id !== requestedChoice.id
    && choice.personalityTags?.includes(personality.dominant)
  ));
  if (alternatives.length === 0) return keep(requestedChoice);

  const rng = createRng(`${life.seed}:agency:${decision.id}:${life.age}`);
  if (rng.next() >= getOverrideRate(personality)) return keep(requestedChoice);
  const selected = alternatives[Math.floor(rng.next() * alternatives.length)];
  return {
    requestedChoiceId: requestedChoice.id,
    requestedLabel: requestedChoice.label,
    actualChoiceId: selected.id,
    actualLabel: selected.label,
    overridden: true,
    reason: `${personality.label ?? '강한'} 성향이 당신의 계획을 앞질렀습니다.`,
  };
}
