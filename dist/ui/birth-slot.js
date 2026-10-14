export const slotDuration = (reduceMotion) => reduceMotion ? 0 : 1500;

export function slotRows(result) {
  const guardians = result.household.guardians
    .map((guardian) => `${guardian.label} ${guardian.occupation}`)
    .join(' · ');
  return [
    { id: 'sex', label: '성별', value: result.sex.label, detail: result.appearance.ancestryLabel },
    {
      id: 'region',
      label: '출생지',
      value: `${result.region.name} ${result.region.district}`,
      detail: `${result.region.code} · 대한민국 17개 시도`,
    },
    {
      id: 'family',
      label: '태어난 집',
      value: result.household.summary,
      detail: `${guardians} · ${result.finance.value} · ${result.housing.value}`,
    },
    {
      id: 'disability',
      label: '장애',
      value: result.disability?.label ?? '비장애',
      detail: result.disability ? `지원 필요도 ${result.disability.supportLevel}` : '등록 장애 가중치와 창작 가중치 혼합',
    },
    {
      id: 'appearance',
      label: '외모',
      value: result.appearance.description,
      detail: `${result.appearance.attractivenessLabel} · 관리 ${result.appearance.grooming}`,
    },
    {
      id: 'personality',
      label: '성격',
      value: result.personality.label,
      detail: result.personality.rolls.map((trait) => trait.label).join(' / '),
    },
    { id: 'name', label: '이름', value: result.name.full, detail: '대한민국 이름 조합' },
  ];
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
  const cards = rows.map((row, index) => {
    const card = makeNode(documentRef, 'article', 'slot-reel');
    card.dataset.slot = row.id;
    card.style.setProperty('--slot-index', String(index));
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
    const detail = makeNode(documentRef, 'p', 'slot-detail', row.detail);
    card.append(heading, windowNode, detail);
    return card;
  });
  root.replaceChildren(...cards);
  root.classList.toggle('is-spinning', spinning);
  root.setAttribute('aria-busy', String(spinning));
}
