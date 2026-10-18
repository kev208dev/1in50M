import { getStatistic, historicalDistrictName } from '../engine/historical-context.js';

const STOP_SCHEDULE = [400, 520, 640, 760, 880, 1080, 1200, 1320, 1520, 1640, 1760];

export const reelStopSchedule = (reduceMotion) => reduceMotion
  ? Array(STOP_SCHEDULE.length).fill(0)
  : [...STOP_SCHEDULE];

export const slotDuration = (reduceMotion) => Math.max(...reelStopSchedule(reduceMotion));

export function fitFigmaStage(viewportWidth, viewportHeight, frameWidth = 1440, frameHeight = 1024) {
  const width = Math.max(0, Number(viewportWidth) || 0);
  const height = Math.max(0, Number(viewportHeight) || 0);
  if (!width || !height) return 0;
  return Math.min(width / frameWidth, height / frameHeight);
}

export function fitResponsiveFigmaStage(viewportWidth, viewportHeight, frameWidth = 1440, frameHeight = 1024) {
  const width = Math.max(0, Number(viewportWidth) || 0);
  const height = Math.max(0, Number(viewportHeight) || 0);
  if (!width || !height) return 0;
  return fitFigmaStage(width, height, frameWidth, frameHeight);
}

export function nextBirthMapMode(mode, action) {
  if (action === 'back') return 'region';
  if (action === 'leave') return 'marker';
  if (action === 'open') return 'detail';
  if (action === 'preview') return 'region';
  return mode;
}

export function slotMachineModel(result) {
  const guardians = result.household.guardians
    .map((guardian) => `${guardian.label} ${guardian.occupation}`)
    .join(' · ');
  const personality = result.personality.rolls.slice(0, 3);
  const given = [...result.name.given];
  const reels = [
    { id: 'sex', group: 'birth', label: '성별', value: result.sex.label, detail: result.appearance.ancestryLabel, tone: 'blue' },
    {
      id: 'region',
      group: 'birth',
      label: '출생지',
      value: `${result.region.name} ${result.region.district}`,
      detail: `${result.region.code} · 대한민국 17개 시도`,
      tone: 'blue',
    },
    {
      id: 'household',
      group: 'birth',
      label: '태어난 집',
      value: result.household.summary,
      detail: `${guardians} · ${result.finance.value} · ${result.housing.value}`,
      tone: 'blue',
    },
    {
      id: 'disability',
      group: 'birth',
      label: '장애',
      value: result.disability?.label ?? '비장애',
      detail: result.disability ? `지원 필요도 ${result.disability.supportLevel}` : '등록 장애 가중치와 창작 가중치 혼합',
      tone: 'blue',
    },
    {
      id: 'appearance',
      group: 'birth',
      label: '외모',
      value: result.appearance.description,
      detail: `${result.appearance.attractivenessLabel} · 관리 ${result.appearance.grooming}`,
      tone: 'blue',
    },
    ...personality.map((trait, index) => ({
      id: `personality-${index + 1}`,
      group: 'personality',
      label: `성격 ${index + 1}`,
      value: trait.label,
      detail: result.personality.label,
      tone: 'green',
    })),
    { id: 'surname', group: 'name', label: '성', value: result.name.surname, detail: '대한민국 성씨 가중치', tone: 'white' },
    { id: 'given-1', group: 'name', label: '이름 1', value: given[0], detail: result.name.full, tone: 'white' },
    { id: 'given-2', group: 'name', label: '이름 2', value: given[1], detail: result.name.full, tone: 'white' },
  ];
  return {
    screen: 'desktop-2-1',
    map: {
      regionCode: result.region.code,
      regionName: result.region.name,
      district: result.region.district,
    },
    reels,
  };
}

export function slotRows(result) {
  return slotMachineModel(result).reels;
}
function makeNode(documentRef, tag, className, text) {
  const node = documentRef.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

export function renderBirthSlot(root, result, { spinning = false } = {}) {
  if (!root || !result) return;
  const documentRef = root.ownerDocument;
  const rows = slotRows(result);
  const schedule = reelStopSchedule(false);
  const cards = rows.map((row, index) => {
    const card = makeNode(documentRef, 'article', 'slot-reel');
    card.dataset.slot = row.id;
    card.dataset.group = row.group;
    card.dataset.tone = row.tone;
    card.style.setProperty('--slot-index', String(index));
    card.style.setProperty('--stop-delay', `${schedule[index]}ms`);
    const heading = makeNode(documentRef, 'div', 'slot-reel-heading');
    heading.append(
      makeNode(documentRef, 'span', 'slot-number', String(index + 1).padStart(2, '0')),
      makeNode(documentRef, 'span', 'slot-label', row.label),
    );
    const windowNode = makeNode(documentRef, 'div', 'slot-window');
    const strip = makeNode(documentRef, 'div', 'slot-strip');
    strip.append(
      makeNode(documentRef, 'span', 'slot-ghost', '???'),
      makeNode(documentRef, 'strong', 'slot-value', row.value),
      makeNode(documentRef, 'span', 'slot-ghost', row.value),
    );
    windowNode.append(strip);
    const disclosure = makeNode(documentRef, 'details', 'slot-detail-disclosure');
    const summary = makeNode(documentRef, 'summary', 'slot-detail-toggle', '상세 보기');
    summary.setAttribute('aria-label', `${row.label} 상세 보기`);
    disclosure.append(
      summary,
      makeNode(documentRef, 'p', 'slot-detail slot-detail-mobile', row.detail),
    );
    card.append(
      heading,
      windowNode,
      makeNode(documentRef, 'p', 'slot-detail slot-detail-desktop', row.detail),
      disclosure,
    );
    return card;
  });
  const groups = [
    ['birth', '출생 조건'],
    ['personality', '성격'],
    ['name', '이름'],
  ].map(([groupId, label]) => {
    const group = makeNode(documentRef, 'section', `slot-reel-group slot-reel-group-${groupId}`);
    group.dataset.reelGroup = groupId;
    group.setAttribute('aria-label', label);
    group.append(...cards.filter((card) => card.dataset.group === groupId));
    return group;
  });
  root.replaceChildren(...groups);
  root.classList.toggle('is-spinning', spinning);
  root.setAttribute('aria-busy', String(spinning));
}

export function birthCertificateModel(result) {
  const district = historicalDistrictName(result.region.code, result.region.district, result.year);
  const expectancy = getStatistic('lifeExpectancy', { year: result.year, sex: result.sex.id });
  return {
    narrative: `${result.year}년, ${result.region.name} ${district}의 ${result.household.familyType}에서 ${result.name.full}의 삶이 시작됩니다.`,
    facts: [
      { label: '이름', value: result.name.full, kind: 'narrative' },
      { label: '출생', value: `${result.year}년 · ${result.region.name} ${district}`, kind: 'narrative' },
      { label: '가족', value: result.household.summary, kind: 'narrative' },
      { label: '가정 형편', value: `${result.finance.value} · ${result.housing.value}`, kind: 'narrative' },
      { label: '기대수명', value: `약 ${expectancy.value}세`, sourceYear: expectancy.year, sourceKey: expectancy.sourceKey, kind: expectancy.kind },
    ],
  };
}

export function renderBirthCertificate(root, result) {
  if (!root || !result) return;
  const documentRef = root.ownerDocument;
  const model = birthCertificateModel(result);
  const narrative = makeNode(documentRef, 'p', 'birth-record-narrative', model.narrative);
  const facts = model.facts.map((fact) => {
    const item = makeNode(documentRef, 'div', 'birth-fact');
    const value = fact.sourceYear ? `${fact.value} · ${fact.sourceYear}년 기준` : fact.value;
    item.append(makeNode(documentRef, 'span', 'birth-fact-label', fact.label), makeNode(documentRef, 'strong', 'birth-fact-value', value));
    return item;
  });
  root.replaceChildren(narrative, ...facts);
}
