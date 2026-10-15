import { FOCUS_BY_ID } from '../data/focuses.js';
import { EDUCATION_BY_ID } from '../data/education.js';
import { HOUSING_BY_ID } from '../data/housing.js';
import { IDENTITY_NOTICE } from '../data/identity.js';
import { getResearchSource } from '../data/research.js';
import { normalizeLife } from '../engine/life.js';
import { survivalCurve } from '../engine/mortality.js';

const STAT_LABELS = {
  health: '건강',
  happiness: '행복',
  knowledge: '지식',
  relationships: '관계',
};

const MENTAL_HEALTH_LABELS = {
  stable: { label: '안정', tone: 'stable' },
  strained: { label: '지침', tone: 'strained' },
  crisis: { label: '위기 · 도움이 필요함', tone: 'crisis' },
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
    .reverse()
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0))
    .slice(0, Math.max(0, limit));
}

export function createLifeViewModel(life) {
  const current = normalizeLife(life);
  const milestones = new Map(current.milestones.map((item) => [item.age, item]));
  const appearance = current.profile?.appearance?.description ?? '외모 정보 없음';
  const personality = current.profile?.personality?.label ?? '혼합 성향';
  const assets = [
    ['예금', current.economy.assets.deposits],
    ['채권', current.economy.assets.bonds],
    ['주식', current.economy.assets.stocks],
    ['가상자산', current.economy.assets.crypto],
    ['사업 지분', current.economy.assets.businessEquity],
  ].map(([label, value]) => ({ label, value: formatWon(value), rawValue: value }));
  const businessLabels = { food: '식음료', online: '온라인', manufacturing: '제조업', other: '기타' };
  const businessStatus = { operating: '운영 중', closed: '폐업', sold: '매각 완료' };
  const business = current.business
    ? `${businessLabels[current.business.sector] ?? current.business.sector} 사업 · ${businessStatus[current.business.status] ?? current.business.status}`
    : '운영 중인 사업 없음';
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
    appearance,
    personality,
    profileChips: [
      { label: '외모', value: current.profile?.appearance?.attractivenessLabel ?? '외모 정보 없음' },
      { label: '성격', value: personality },
    ],
    assets,
    business,
    identity: current.identity.discovered ? current.identity.label : null,
    family: current.relationships.family,
    friends: current.relationships.friends,
    partner: current.relationships.partner,
    children: current.relationships.children,
    statHistory: current.statHistory,
    survival: survivalCurve(current),
    mentalHealth: MENTAL_HEALTH_LABELS[current.mentalHealthState] ?? MENTAL_HEALTH_LABELS.stable,
    wellbeing: [
      { id: 'academicStress', label: '학업 압박', value: current.riskFactors.academicStress },
      { id: 'sleepDebt', label: '수면 부족', value: current.riskFactors.sleepDebt },
      { id: 'caffeineLoad', label: '고카페인 부담', value: current.riskFactors.caffeineLoad },
      { id: 'support', label: '주변 지원', value: current.riskFactors.support },
    ],
    log: getVisibleLifeLog(current.history),
    lifeMap: Array.from({ length: 91 }, (_, age) => ({
      age,
      state: age < current.age ? 'past' : age === current.age ? 'current' : 'future',
      milestone: milestones.get(age) ?? null,
    })),
  };
}

export function renderTextFields(root, selector, value) {
  root.querySelectorAll(selector).forEach((node) => {
    node.textContent = String(value ?? '—');
  });
}

function makeNode(root, tag, className, text) {
  const node = root.ownerDocument.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

export function renderLife(root, life) {
  const model = createLifeViewModel(life);
  renderTextFields(root, '#age-display', model.age);
  renderTextFields(root, '#year-display', model.year);
  renderTextFields(root, '[data-life="location"]', model.location);
  renderTextFields(root, '[data-life="cash"]', model.cash);
  renderTextFields(root, '[data-life="income"]', model.monthlyIncome);
  renderTextFields(root, '[data-life="costs"]', model.fixedCosts);
  renderTextFields(root, '[data-life="debt"]', model.debt);
  renderTextFields(root, '[data-life="net-worth"]', model.netWorth);
  renderTextFields(root, '[data-life="education"]', model.education);
  renderTextFields(root, '[data-life="career"]', model.career);
  renderTextFields(root, '[data-life="housing"]', model.housing);
  renderTextFields(root, '[data-life="focus"]', model.focus);
  renderTextFields(root, '[data-life="appearance"]', model.appearance);
  renderTextFields(root, '[data-life="personality"]', model.personality);
  renderTextFields(root, '[data-life="business"]', model.business);
  renderTextFields(root, '[data-life="identity"]', model.identity);
  renderTextFields(root, '[data-life="mental-health"]', model.mentalHealth.label);
  const identityProfile = root.querySelector('[data-identity-profile]');
  if (identityProfile) identityProfile.hidden = !model.identity;

  const chips = root.querySelector('#profile-chips');
  if (chips) {
    chips.replaceChildren(...model.profileChips.map((chip) => {
      const item = makeNode(root, 'span', 'profile-chip');
      item.append(makeNode(root, 'small', '', chip.label), makeNode(root, 'strong', '', chip.value));
      return item;
    }));
  }

  const assetDetails = root.querySelector('#asset-details');
  if (assetDetails) {
    assetDetails.replaceChildren(...model.assets.map((asset) => {
      const row = makeNode(root, 'div', 'asset-row');
      row.append(makeNode(root, 'span', '', asset.label), makeNode(root, 'strong', '', asset.value));
      return row;
    }));
  }

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

  const wellbeing = root.querySelector('[data-life-list="wellbeing"]');
  if (wellbeing) {
    wellbeing.replaceChildren(...model.wellbeing.map((item) => {
      const row = makeNode(root, 'div', `wellbeing-row wellbeing-${item.id}`);
      const heading = makeNode(root, 'div', 'life-stat-heading');
      heading.append(makeNode(root, 'span', '', item.label), makeNode(root, 'strong', '', String(item.value)));
      const meter = makeNode(root, 'div', 'life-meter');
      const fill = makeNode(root, 'span', 'life-meter-fill');
      fill.style.setProperty('--value', `${item.value}%`);
      meter.append(fill);
      row.append(heading, meter);
      return row;
    }));
    wellbeing.parentElement?.setAttribute('data-state', model.mentalHealth.tone);
  }

  const log = root.querySelector('#life-log');
  if (log) {
    log.replaceChildren(...model.log.map((entry) => {
      const item = makeNode(root, 'article', 'log-entry');
      item.append(makeNode(root, 'span', 'log-age', formatAge(entry.age)), makeNode(root, 'p', '', entry.text));
      if (entry.sourceLabel) {
        const source = makeNode(root, entry.sourceUrl ? 'a' : 'span', 'log-source');
        source.textContent = `${entry.projection ? '전망 시나리오 · ' : ''}${entry.sourceLabel}`;
        if (entry.sourceUrl) {
          source.href = entry.sourceUrl;
          source.target = '_blank';
          source.rel = 'noreferrer';
        }
        item.append(source);
      }
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
  const chart = root.querySelector('.mini-chart');
  if (chart) {
    const points = model.statHistory.slice(-12);
    chart.replaceChildren(...points.map((point) => {
      const bar = makeNode(root, 'i');
      const average = Math.round((point.health + point.happiness + point.knowledge + point.relationships) / 4);
      bar.style.setProperty('--h', `${average}%`);
      bar.title = `${formatAge(point.age)} 평균 ${average}`;
      return bar;
    }));
    chart.setAttribute('aria-label', points.length
      ? `최근 ${points.length}년의 상태 평균 변화 그래프`
      : '아직 상태 변화 기록이 없습니다.');
  }
  const survival = root.querySelector('#survival-curve');
  if (survival) {
    const sampled = model.survival.filter((point) => point.age % 5 === 0);
    survival.replaceChildren(...sampled.map((point) => {
      const bar = makeNode(root, 'i', point.age <= model.ageNumber ? 'is-past' : '');
      bar.style.setProperty('--survival', `${Math.round(point.survival * 100)}%`);
      bar.title = `${formatAge(point.age)} 생존 ${Math.round(point.survival * 100)}%`;
      return bar;
    }));
    survival.setAttribute('aria-label', `현재 ${model.age}, 가상 생존 곡선`);
  }
  return model;
}

export function renderDecision(
  dialog,
  decision,
  choices,
  currentAge = decision.age ?? decision.ageRange?.[0],
) {
  renderTextFields(dialog, '[data-decision="kicker"]', `${currentAge}세의 결정`);
  renderTextFields(dialog, '[data-decision="title"]', decision.title);
  renderTextFields(dialog, '[data-decision="prompt"]', decision.prompt);
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

  const sourceLine = dialog.querySelector('[data-decision="source"]');
  if (sourceLine) {
    const source = getResearchSource(decision.sourceKey);
    sourceLine.hidden = !source;
    sourceLine.replaceChildren();
    if (source) {
      const label = makeNode(dialog, 'span', '', '근거 자료 · ');
      const link = makeNode(dialog, 'a', '', `${source.label} (${source.year})`);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      sourceLine.append(label, link);
    }
  }
}

export function renderIdentityDiscovery(dialog, life) {
  const current = normalizeLife(life);
  renderTextFields(dialog, '[data-identity="label"]', `${current.identity.label ?? '성'} 정체성`);
  renderTextFields(dialog, '[data-identity="notice"]', IDENTITY_NOTICE);
  const source = getResearchSource('lgbtq2024');
  const sourceLink = dialog.querySelector('[data-identity="source"]');
  if (source && sourceLink) {
    sourceLink.textContent = `확률 참고 · ${source.label} (${source.year})`;
    sourceLink.href = source.url;
  }
  return current.identity;
}

export function renderReflection(dialog, reflection) {
  renderTextFields(dialog, '[data-reflection="kicker"]', `${reflection.age}세의 회고`);
  renderTextFields(dialog, '[data-reflection="title"]', reflection.title);
  renderTextFields(dialog, '[data-reflection="prompt"]', reflection.prompt);
  const choices = dialog.querySelector('[data-reflection="choices"]');
  if (choices) {
    choices.replaceChildren(...reflection.choices.map((choice, index) => {
      const button = makeNode(dialog, 'button', 'decision-choice');
      button.type = 'button';
      button.dataset.reflectionChoice = choice.id;
      button.append(
        makeNode(dialog, 'span', 'decision-number', String(index + 1).padStart(2, '0')),
        makeNode(dialog, 'span', 'decision-copy', choice.label),
      );
      return button;
    }));
  }
}

export function renderPublicLives(root, lives = [], { memorial = false } = {}) {
  if (!root) return [];
  const visible = (Array.isArray(lives) ? lives : []).slice(0, memorial ? 20 : 12);
  root.replaceChildren(...visible.map((life) => {
    const article = makeNode(root, 'article', 'public-life-card');
    const heading = makeNode(root, 'div', 'public-life-heading');
    heading.append(
      makeNode(root, 'span', 'eyebrow', memorial ? `${life.age}세의 기록` : `${life.birthRegion}에서 시작`),
      makeNode(root, 'time', '', String(life.completedAt ?? '').slice(0, 10)),
    );
    article.append(
      heading,
      makeNode(root, 'h2', '', life.alias),
      makeNode(root, 'p', '', life.reflection),
      makeNode(root, 'small', '', `${life.finalRegion} · ${life.career} · ${life.netWorthBand}`),
    );
    if (life.localOwner) {
      const hideButton = makeNode(root, 'button', 'text-button public-life-hide', '이 기록 숨기기');
      hideButton.type = 'button';
      hideButton.dataset.publicLifeId = life.id;
      article.append(hideButton);
    }
    return article;
  }));
  return visible;
}

export function renderResult(root, summary) {
  renderTextFields(root, '[data-result="age"]', formatAge(summary.age));
  renderTextFields(root, '[data-result="birth"]', summary.birth);
  renderTextFields(root, '[data-result="residence"]', summary.finalResidence);
  renderTextFields(root, '[data-result="career"]', summary.longestCareer);
  renderTextFields(root, '[data-result="net-worth"]', formatWon(summary.netWorth));
  renderTextFields(root, '[data-result="narrative"]', summary.narrative);
  renderTextFields(root, '[data-result="family"]', `가까운 관계 ${summary.family.closeRelationships}명 · 동반자 ${summary.family.hasPartner ? '있음' : '없음'} · 자녀 ${summary.family.children}명`);
  const statChart = root.querySelector('[data-result="stats"]');
  if (statChart) {
    statChart.replaceChildren(...Object.entries(STAT_LABELS).map(([key, label]) => {
      const row = makeNode(root, 'div', 'result-stat-row');
      const track = makeNode(root, 'span', 'result-stat-track');
      const fill = makeNode(root, 'i', 'result-stat-fill');
      fill.style.setProperty('--value', `${summary.finalStats[key]}%`);
      track.append(fill);
      row.append(makeNode(root, 'span', '', label), track, makeNode(root, 'strong', '', summary.finalStats[key]));
      return row;
    }));
    statChart.setAttribute('aria-label', Object.entries(STAT_LABELS)
      .map(([key, label]) => `${label} ${summary.finalStats[key]}점`).join(', '));
  }
  const points = root.querySelector('[data-result="turning-points"]');
  if (points) {
    points.replaceChildren(...summary.turningPoints.map((point) => {
      const item = makeNode(root, 'li', 'result-point');
      item.append(makeNode(root, 'span', '', formatAge(point.age)), makeNode(root, 'strong', '', point.label));
      return item;
    }));
  }
  const influences = root.querySelector('[data-result="influences"]');
  if (influences) {
    influences.replaceChildren(...summary.influences.map((influence) => {
      const item = makeNode(root, 'li', `influence-item influence-${influence.direction === '유리' ? 'positive' : 'negative'}`);
      item.append(
        makeNode(root, 'span', '', influence.direction),
        makeNode(root, 'strong', '', influence.label),
      );
      return item;
    }));
  }
}
