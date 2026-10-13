import { FOCUS_BY_ID } from '../data/focuses.js';
import { EDUCATION_BY_ID } from '../data/education.js';
import { HOUSING_BY_ID } from '../data/housing.js';
import { normalizeLife } from '../engine/life.js';

const STAT_LABELS = {
  health: '건강',
  happiness: '행복',
  knowledge: '지식',
  relationships: '관계',
};

export function formatAge(age) {
  return `${Math.max(0, Math.round(Number(age) || 0))}세`;
}

export function formatWon(value) {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '-' : '';
  const absolute = Math.abs(number);
  if (absolute < 10000) return `${sign}${absolute.toLocaleString('ko-KR')}원`;
  const eok = Math.floor(absolute / 100000000);
  const man = Math.round((absolute % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${sign}${eok.toLocaleString('ko-KR')}억 ${man.toLocaleString('ko-KR')}만원`;
  if (eok > 0) return `${sign}${eok.toLocaleString('ko-KR')}억원`;
  return `${sign}${man.toLocaleString('ko-KR')}만원`;
}

export function getVisibleLifeLog(history, limit = 8) {
  return [...(Array.isArray(history) ? history : [])]
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0))
    .slice(0, Math.max(0, limit));
}

export function createLifeViewModel(life) {
  const current = normalizeLife(life);
  const milestones = new Map(current.milestones.map((item) => [item.age, item]));
  return {
    age: formatAge(current.age),
    ageNumber: current.age,
    year: String(current.year),
    location: `${current.housing.region} ${current.housing.district}`.trim(),
    status: current.status,
    stats: Object.entries(STAT_LABELS).map(([id, label]) => ({ id, label, value: current.stats[id] })),
    cash: formatWon(current.economy.cash),
    monthlyIncome: formatWon(current.economy.income),
    fixedCosts: formatWon(current.economy.fixedCosts),
    debt: formatWon(current.economy.debt),
    netWorth: formatWon(current.economy.netWorth),
    education: EDUCATION_BY_ID[current.education.schoolType]?.label ?? (current.education.level === 'childhood' ? '미취학' : '일반 경로'),
    career: current.career.title ?? (current.career.status === 'retired' ? '은퇴' : '아직 정하지 않음'),
    housing: HOUSING_BY_ID[current.housing.type]?.label ?? '가족과 동거',
    focus: FOCUS_BY_ID[current.focusId]?.label ?? '휴식과 균형',
    family: current.relationships.family,
    friends: current.relationships.friends,
    partner: current.relationships.partner,
    children: current.relationships.children,
    log: getVisibleLifeLog(current.history),
    lifeMap: Array.from({ length: 91 }, (_, age) => ({
      age,
      state: age < current.age ? 'past' : age === current.age ? 'current' : 'future',
      milestone: milestones.get(age) ?? null,
    })),
  };
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) node.textContent = String(value ?? '—');
}

function makeNode(root, tag, className, text) {
  const node = root.ownerDocument.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

export function renderLife(root, life) {
  const model = createLifeViewModel(life);
  setText(root, '#age-display', model.age);
  setText(root, '#year-display', model.year);
  setText(root, '[data-life="location"]', model.location);
  setText(root, '[data-life="cash"]', model.cash);
  setText(root, '[data-life="income"]', model.monthlyIncome);
  setText(root, '[data-life="costs"]', model.fixedCosts);
  setText(root, '[data-life="debt"]', model.debt);
  setText(root, '[data-life="net-worth"]', model.netWorth);
  setText(root, '[data-life="education"]', model.education);
  setText(root, '[data-life="career"]', model.career);
  setText(root, '[data-life="housing"]', model.housing);
  setText(root, '[data-life="focus"]', model.focus);

  const stats = root.querySelector('[data-life-list="stats"]');
  if (stats) {
    stats.replaceChildren(...model.stats.map((stat) => {
      const row = makeNode(root, 'div', 'life-stat');
      const heading = makeNode(root, 'div', 'life-stat-heading');
      heading.append(makeNode(root, 'span', '', stat.label), makeNode(root, 'strong', '', String(stat.value).padStart(2, '0')));
      const meter = makeNode(root, 'div', 'life-meter');
      const fill = makeNode(root, 'span', 'life-meter-fill');
      fill.style.setProperty('--value', `${stat.value}%`);
      meter.append(fill);
      row.append(heading, meter);
      return row;
    }));
  }

  const log = root.querySelector('#life-log');
  if (log) {
    log.replaceChildren(...model.log.map((entry) => {
      const item = makeNode(root, 'article', 'log-entry');
      item.append(makeNode(root, 'span', 'log-age', formatAge(entry.age)), makeNode(root, 'p', '', entry.text));
      return item;
    }));
  }

  const map = root.querySelector('#life-map');
  if (map) {
    map.replaceChildren(...model.lifeMap.map((year) => {
      const cell = makeNode(root, 'button', `life-year life-year-${year.state}`);
      cell.type = 'button';
      cell.dataset.age = year.age;
      cell.title = year.milestone?.label ?? formatAge(year.age);
      cell.setAttribute('aria-label', `${formatAge(year.age)}${year.milestone ? `, ${year.milestone.label}` : ''}`);
      cell.textContent = year.age % 10 === 0 ? String(year.age) : '';
      if (year.milestone) cell.classList.add('has-milestone');
      return cell;
    }));
  }

  const family = root.querySelector('[data-life-list="family"]');
  if (family) {
    const people = [
      ...model.family.map((person) => person.name ?? person.relation),
      ...(model.partner ? [model.partner.name ?? '동반자'] : []),
      ...model.children.map((person, index) => person.name ?? `자녀 ${index + 1}`),
    ];
    family.replaceChildren(...(people.length ? people : ['아직 기록 없음']).map((name) => makeNode(root, 'li', '', name)));
  }
  return model;
}

export function renderDecision(dialog, decision, choices) {
  setText(dialog, '[data-decision="kicker"]', `${decision.age}세의 결정`);
  setText(dialog, '[data-decision="title"]', decision.title);
  setText(dialog, '[data-decision="prompt"]', decision.prompt);
  const list = dialog.querySelector('[data-decision="choices"]');
  if (!list) return;
  list.replaceChildren(...choices.map((choice, index) => {
    const button = makeNode(dialog, 'button', 'decision-choice');
    button.type = 'button';
    button.dataset.choiceId = choice.id;
    button.disabled = !choice.enabled;
    const number = makeNode(dialog, 'span', 'decision-number', String(index + 1).padStart(2, '0'));
    const copy = makeNode(dialog, 'span', 'decision-copy');
    copy.append(makeNode(dialog, 'strong', '', choice.label), makeNode(dialog, 'small', '', choice.enabled ? choice.description : choice.reason));
    const tags = makeNode(dialog, 'span', 'decision-tags');
    for (const tag of choice.tags ?? []) tags.append(makeNode(dialog, 'i', '', tag));
    button.append(number, copy, tags);
    return button;
  }));
}

export function renderResult(root, summary) {
  setText(root, '[data-result="age"]', formatAge(summary.age));
  setText(root, '[data-result="birth"]', summary.birth);
  setText(root, '[data-result="residence"]', summary.finalResidence);
  setText(root, '[data-result="career"]', summary.longestCareer);
  setText(root, '[data-result="net-worth"]', formatWon(summary.netWorth));
  setText(root, '[data-result="narrative"]', summary.narrative);
  const points = root.querySelector('[data-result="turning-points"]');
  if (points) {
    points.replaceChildren(...summary.turningPoints.map((point) => {
      const item = makeNode(root, 'li', 'result-point');
      item.append(makeNode(root, 'span', '', formatAge(point.age)), makeNode(root, 'strong', '', point.label));
      return item;
    }));
  }
}
