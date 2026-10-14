export const FACE_SHAPES = [
  ['cat', '고양이상'],
  ['dog', '강아지상'],
  ['fox', '여우상'],
  ['rabbit', '토끼상'],
  ['bear', '곰상'],
  ['dinosaur', '공룡상'],
  ['gentle', '선한 인상'],
  ['cool', '차갑고 무표정한 인상'],
].map(([id, label]) => ({ id, label, weight: 1 }));

export const BODY_BUILDS = [
  ['petite', '왜소한 체형', 0.7],
  ['slender', '마른 체형', 1.2],
  ['average', '보통 체형', 2.4],
  ['curvy', '볼륨감 있는 체형', 0.8],
  ['toned', '탄탄한 체형', 1],
  ['muscular', '근육질 체격', 0.55],
  ['large', '큰 체격', 0.8],
].map(([id, label, weight]) => ({ id, label, weight }));

export const SKIN_TONES = [
  ['very-light', '매우 밝은 피부', 0.8],
  ['light', '밝은 피부', 2],
  ['medium-light', '밝은 갈색 피부', 1.6],
  ['medium', '중간 피부색', 1.4],
  ['tan', '구릿빛 피부', 0.9],
  ['deep', '짙은 피부', 0.6],
].map(([id, label, weight]) => ({ id, label, weight }));

export const HAIR_TEXTURES = [
  ['straight', '직모', 3],
  ['wavy', '웨이브 머리', 1.4],
  ['curly', '곱슬머리', 0.9],
  ['coily', '촘촘한 곱슬머리', 0.5],
].map(([id, label, weight]) => ({ id, label, weight }));

export const HAIR_STYLES = [
  ['buzz', '아주 짧은 머리', 0.6],
  ['short', '짧은 머리', 2],
  ['medium', '중간 길이 머리', 2],
  ['bob', '단발머리', 1.1],
  ['long', '긴 머리', 1.6],
  ['tied', '묶은 머리', 0.9],
].map(([id, label, weight]) => ({ id, label, weight }));

export const STYLE_OPTIONS = [
  ['plain', '수수한 옷차림', 1.7],
  ['neat', '단정한 스타일', 2.2],
  ['street', '스트리트 스타일', 1],
  ['luxury', '명품을 즐기는 스타일', 0.45],
  ['sporty', '스포츠 스타일', 1.1],
  ['genderless', '젠더리스 스타일', 0.6],
  ['glamorous', '화려한 메이크업과 스타일', 0.65],
  ['alternative', '문신과 피어싱이 돋보이는 스타일', 0.35],
].map(([id, label, weight]) => ({ id, label, weight }));

export const APPEARANCE_CONTEXT_SCALES = {
  'first-impression': 0.32,
  romance: 0.45,
  service: 0.28,
  social: 0.25,
  knowledge: 0,
};
