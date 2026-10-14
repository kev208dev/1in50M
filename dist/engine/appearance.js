import {
  APPEARANCE_CONTEXT_SCALES,
  BODY_BUILDS,
  FACE_SHAPES,
  HAIR_STYLES,
  HAIR_TEXTURES,
  SKIN_TONES,
  STYLE_OPTIONS,
} from '../data/appearance.js';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const labelFor = (items, id) => items.find((item) => item.id === id)?.label ?? id;

export function attractivenessLabel(rating) {
  const value = clamp(rating);
  if (value >= 85) return '어디서든 눈에 띄는 외모';
  if (value >= 70) return '호감을 얻기 쉬운 외모';
  if (value >= 50) return '평균적으로 받아들여지는 외모';
  if (value >= 35) return '수수하게 받아들여지는 외모';
  return '외모 평가에서 불리함을 겪기 쉬운 인상';
}

export function describeAppearance(appearance, context = {}) {
  const sexLabel = context.sexLabel ?? appearance.sexLabel ?? '인물';
  const ancestryLabel = context.ancestryLabel ?? appearance.ancestryLabel;
  const ancestry = ancestryLabel ? `${ancestryLabel} ` : '';
  const face = labelFor(FACE_SHAPES, appearance.faceShape);
  const build = labelFor(BODY_BUILDS, appearance.build);
  const skin = labelFor(SKIN_TONES, appearance.skinTone);
  const texture = labelFor(HAIR_TEXTURES, appearance.hairTexture);
  const hairStyle = labelFor(HAIR_STYLES, appearance.hairStyle);
  const style = labelFor(STYLE_OPTIONS, appearance.style);
  return `${appearance.heightCm}cm, ${face} 얼굴과 ${build}, ${skin}, ${texture}의 ${hairStyle}를 한 ${ancestry}${sexLabel}. ${style}.`;
}

export function createAppearance(rng, {
  sex = 'female',
  sexLabel = sex === 'male' ? '남성' : '여성',
  ancestry = 'korean',
  ancestryLabel = ancestry === 'korean' ? '한국계' : ancestry,
} = {}) {
  const appearance = {
    faceShape: rng.weighted(FACE_SHAPES).id,
    build: rng.weighted(BODY_BUILDS).id,
    heightCm: rng.int(sex === 'male' ? 158 : 148, sex === 'male' ? 195 : 185),
    skinTone: rng.weighted(SKIN_TONES).id,
    hairTexture: rng.weighted(HAIR_TEXTURES).id,
    hairStyle: rng.weighted(HAIR_STYLES).id,
    style: rng.weighted(STYLE_OPTIONS).id,
    grooming: rng.int(35, 85),
    socialRating: rng.int(25, 92),
    sexLabel,
    ancestry,
    ancestryLabel,
    agePresentation: 0,
  };
  return {
    ...appearance,
    attractivenessLabel: attractivenessLabel(appearance.socialRating),
    description: describeAppearance(appearance, { sexLabel, ancestryLabel }),
  };
}

export function appearanceInfluence(appearance, contextTag) {
  const scale = APPEARANCE_CONTEXT_SCALES[contextTag] ?? 0.1;
  return Math.round((clamp(appearance?.socialRating, 0, 100) - 50) * scale);
}

export function advanceAppearance(appearance, life) {
  const current = appearance ?? { grooming: 50, socialRating: 50 };
  const stressPenalty = Number(life?.stats?.happiness) < 35 ? 2 : 0;
  const healthBonus = life?.focusId === 'health' ? 2 : 0;
  const grooming = clamp((current.grooming ?? 50) + healthBonus - stressPenalty);
  const socialRating = clamp((current.socialRating ?? 50) + healthBonus - stressPenalty);
  const updated = {
    ...current,
    grooming,
    socialRating,
    agePresentation: Number(life?.age) || 0,
  };
  return {
    ...updated,
    attractivenessLabel: attractivenessLabel(socialRating),
    description: current.faceShape ? describeAppearance(updated) : current.description,
  };
}
