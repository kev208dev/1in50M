import { normalizeLife } from '../engine/life.js';

const reflection = (age, title, prompt, choices) => ({ id: `reflection-${age}`, age, title, prompt, choices });

export const REFLECTIONS = [
  reflection(5, '처음 기억나는 마음', '지금의 이 아이에게 가장 중요한 것은 무엇일까요?', [
    ['play', '마음껏 놀았던 시간', { happiness: 2 }],
    ['family', '돌봐 준 사람의 온기', { relationships: 2 }],
    ['curiosity', '처음 세상을 궁금해한 순간', { knowledge: 2 }],
  ]),
  reflection(15, '어른이 되기 전의 나', '요즘 나를 가장 오래 붙잡고 있는 것은 무엇인가요?', [
    ['achievement', '잘해내고 싶은 마음', { knowledge: 2, happiness: -1 }],
    ['people', '내 편이 되어 주는 사람들', { relationships: 2 }],
    ['rest', '숨을 고를 수 있는 시간', { health: 2, happiness: 1 }],
  ]),
  reflection(30, '서른의 좌표', '지금까지의 선택에서 가장 지키고 싶은 것은 무엇인가요?', [
    ['work', '내가 쌓아 온 일', { knowledge: 2 }],
    ['people', '함께 살아가는 사람들', { relationships: 3 }],
    ['freedom', '내 방식대로 사는 자유', { happiness: 2 }],
  ]),
  reflection(50, '중간에서 돌아보기', '남은 시간에 조금 더 가까이 두고 싶은 것은 무엇인가요?', [
    ['health', '몸과 마음의 건강', { health: 3 }],
    ['people', '가족과 친구', { relationships: 3 }],
    ['meaning', '의미 있는 일', { knowledge: 1, happiness: 2 }],
  ]),
  reflection(70, '오래 살아온 사람의 질문', '지나온 삶을 한 문장으로 남긴다면 무엇을 말하고 싶나요?', [
    ['gratitude', '함께해 준 사람들에게 고맙다', { relationships: 2, happiness: 2 }],
    ['adventure', '새로운 길을 선택한 것을 후회하지 않는다', { happiness: 2 }],
    ['ordinary', '평범한 하루들이 충분히 소중했다', { health: 1, happiness: 2 }],
  ]),
].map((item) => ({
  ...item,
  choices: item.choices.map(([id, label, effects]) => ({ id, label, effects })),
}));

export const REFLECTION_BY_ID = Object.fromEntries(REFLECTIONS.map((item) => [item.id, item]));

export function getReflection(life) {
  const current = normalizeLife(life);
  const item = REFLECTIONS.find((entry) => entry.age === current.age);
  if (!item || current.reflections?.[item.id]) return null;
  return item;
}

export function applyReflection(life, choiceId) {
  const current = normalizeLife(life);
  const item = REFLECTION_BY_ID[current.pendingReflectionId] ?? getReflection(current);
  const choice = item?.choices.find((entry) => entry.id === choiceId);
  if (!item || !choice) throw new RangeError('알 수 없는 회고 선택입니다.');
  const stats = { ...current.stats };
  for (const [key, value] of Object.entries(choice.effects ?? {})) stats[key] += value;
  return normalizeLife({
    ...current,
    stats,
    pendingReflectionId: null,
    reflections: { ...current.reflections, [item.id]: choice.id },
    history: [...current.history, {
      id: `${item.id}-${choice.id}`,
      age: current.age,
      year: current.year,
      type: 'reflection',
      text: `${item.title}: ${choice.label}`,
      label: choice.label,
    }],
    milestones: [...current.milestones, { age: current.age, type: 'reflection', label: item.title }],
  });
}
