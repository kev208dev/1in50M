// 장면·딜레마 등록부. 계열 파일을 추가하면 여기에 한 줄씩 등록합니다.
import { sceneId, sceneText } from './define.js';
import { expandDilemma } from './define-dilemma.js';
import { WORK_FAMILIES } from './families-work.js';
import { FAVOR_DILEMMAS } from './dilemmas-favors.js';
import { FAMILY_FAMILIES } from './families-family.js';
import { FAMILY_DILEMMAS } from './dilemmas-family.js';
import { WELLBEING_FAMILIES } from './families-wellbeing.js';
import { WELLBEING_DILEMMAS } from './dilemmas-wellbeing.js';
import { LIVELIHOOD_FAMILIES } from './families-livelihood.js';
import { LIVELIHOOD_DILEMMAS } from './dilemmas-livelihood.js';
import { YOUTH_FAMILIES } from './families-youth.js';
import { YOUTH_DILEMMAS } from './dilemmas-youth.js';
import { CHILDHOOD_FAMILIES } from './families-childhood.js';
import { CHILDHOOD_DILEMMAS } from './dilemmas-childhood.js';
import { ERA_FAMILIES } from './families-era.js';
import { ERA_DILEMMAS } from './dilemmas-era.js';

export const SCENE_FAMILIES = [
  ...WORK_FAMILIES,
  ...FAMILY_FAMILIES,
  ...WELLBEING_FAMILIES,
  ...LIVELIHOOD_FAMILIES,
  ...YOUTH_FAMILIES,
  ...CHILDHOOD_FAMILIES,
  ...ERA_FAMILIES,
];

export const DILEMMA_FAMILIES = [
  ...FAVOR_DILEMMAS,
  ...FAMILY_DILEMMAS,
  ...WELLBEING_DILEMMAS,
  ...LIVELIHOOD_DILEMMAS,
  ...YOUTH_DILEMMAS,
  ...CHILDHOOD_DILEMMAS,
  ...ERA_DILEMMAS,
];

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) throw new SyntaxError(`${label} id가 중복됩니다: ${item.id}`);
    seen.add(item.id);
  }
}
assertUnique(SCENE_FAMILIES, '장면 계열');
assertUnique(DILEMMA_FAMILIES, '딜레마 계열');

export const SCENE_FAMILY_BY_ID = Object.fromEntries(SCENE_FAMILIES.map((family) => [family.id, family]));

/** 모든 상황 × 결과 조합을 개별 사건으로 펼친 목록(감사·조회용). */
export const SCENE_EVENTS = SCENE_FAMILIES.flatMap((family) => family.situations.flatMap((situation, situationIndex) => (
  family.outcomes.map((outcome, outcomeIndex) => ({
    id: sceneId(family.id, situationIndex, outcomeIndex),
    scene: true,
    family: family.id,
    domain: family.domain,
    situationIndex,
    outcomeIndex,
    tone: outcome.tone,
    ageRange: family.ageRange,
    effects: outcome.effects,
    cash: situation.cash + outcome.cash,
    text: sceneText(family, situationIndex, outcomeIndex),
  }))
)));

export const SCENE_EVENT_BY_ID = Object.fromEntries(SCENE_EVENTS.map((event) => [event.id, event]));

export const DILEMMA_DECISIONS = DILEMMA_FAMILIES.flatMap(expandDilemma);
assertUnique(DILEMMA_DECISIONS, '딜레마 결정');
export const DILEMMA_FAMILY_BY_ID = Object.fromEntries(DILEMMA_FAMILIES.map((family) => [family.id, family]));
