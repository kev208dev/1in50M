import { FOCUS_BY_ID } from '../data/focuses.js';
import { EDUCATION_BY_ID, educationStateForAge } from '../data/education.js';
import { HOUSING_BY_ID } from '../data/housing.js';
import { IDENTITY_NOTICE } from '../data/identity.js';
import { getResearchSource } from '../data/research.js';
import { normalizeLife } from '../engine/life.js';
import { survivalCurve } from '../engine/mortality.js';
import { describeEffectDirections } from '../engine/stat-effects.js';
import { filterPublicLives } from '../community.js';
import { characterViewModel } from '../engine/life-character.js';
import { characterSvg, STAGE_LABELS } from './character-art.js';
import { orderTimeline } from '../engine/timeline.js';

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

const SERVICE_LABELS = {
  unassessed: '미판정',
  active: '현역 판정',
  supplementary: '보충역 판정',
  'wartime-labor': '전시근로역 판정',
  exempt: '병역면제 판정',
  recheck: '재검사 예정',
  'not-target': '비대상',
  completed: '복무 완료',
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
  return orderTimeline(history)
    .reverse()
    .slice(0, Math.max(0, limit));
}

function relationshipLabel(relationships) {
  const children = relationships.children?.length ?? 0;
  if (relationships.partner) return children ? `동반자 · 자녀 ${children}명` : '동반자와 함께';
  if (children) return `자녀 ${children}명`;
  const friends = relationships.friends?.length ?? 0;
  return friends ? `가족 · 친구 ${friends}명` : '가족과 함께';
}

export function createLifeViewModel(life) {
  const current = normalizeLife(life);
  const character = characterViewModel(current);
  const milestones = new Map(current.milestones.map((item) => [item.age, item]));
  const appearance = current.profile?.appearance?.description ?? '외모 정보 없음';
  const personality = current.profile?.personality?.label ?? '혼합 성향';
  const assets = [
    ['예금', current.economy.assets.deposits],
    ['채권', current.economy.assets.bonds],
    ['주식', current.economy.assets.stocks],
    ['가상자산', current.economy.assets.crypto],
    ['사업 지분', current.economy.assets.businessEquity],
    ['자동차', current.economy.vehicleValue],
  ].map(([label, value]) => ({ label, value: formatWon(value), rawValue: value }));
  const businessLabels = { food: '식음료', online: '온라인', manufacturing: '제조업', other: '기타' };
  const businessStatus = { operating: '운영 중', closed: '폐업', sold: '매각 완료' };
  const business = current.business
    ? `${businessLabels[current.business.sector] ?? current.business.sector} 사업 · ${businessStatus[current.business.status] ?? current.business.status}`
    : '운영 중인 사업 없음';
  return {
    name: current.profile?.name?.full ?? '이름 없는 삶',
    birthplace: `${current.profile?.region?.name ?? '대한민국'} ${current.profile?.district ?? ''}`.trim(),
    stageLabel: STAGE_LABELS[character.stage] ?? '',
    relationship: relationshipLabel(current.relationships),
    yearAge: `${current.year}년 · ${formatAge(current.age)}`,
    age: formatAge(current.age),
    ageNumber: current.age,
    year: String(current.year),
    location: `${current.housing.region} ${current.housing.district}`.trim(),
    status: current.status,
    stats: Object.entries(STAT_LABELS).map(([id, label]) => ({ id, label, value: current.stats[id] })),
    cash: current.age < 18 ? '—' : formatWon(current.economy.cash),
    householdSupport: current.age < 18 ? formatWon(current.economy.householdSupport) : null,
    monthlyIncome: formatWon(current.economy.income),
    fixedCosts: formatWon(current.economy.fixedCosts),
    debt: formatWon(current.economy.debt),
    netWorth: formatWon(current.economy.netWorth),
    dopamine: current.economy.dopamine,
    canUseFinance: current.age >= 19 && current.status === 'living',
    education: educationStateForAge(current.age, current.education).label,
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
    service: SERVICE_LABELS[current.service.status] ?? SERVICE_LABELS.unassessed,
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
    character,
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
  renderTextFields(root, '#year-display', `${model.year}년`);
  renderTextFields(root, '[data-life="name"]', model.name);
  renderTextFields(root, '[data-life="birthplace"]', `${model.birthplace} 출생`);
  renderTextFields(root, '[data-life="stage"]', model.stageLabel);
  renderTextFields(root, '[data-life="relationship"]', model.relationship);
  renderTextFields(root, '[data-life="year-age"]', model.yearAge);
  const portrait = root.querySelector('#life-portrait');
  if (portrait && portrait.dataset.stage !== model.character.stage) {
    portrait.innerHTML = characterSvg(model.character.stage);
    portrait.dataset.stage = model.character.stage;
  }
  if (portrait) {
    portrait.dataset.pose = model.character.pose;
    portrait.setAttribute('aria-label', `${model.stageLabel} 단계 캐릭터 · ${model.age}`);
  }
  renderTextFields(root, '[data-life="location"]', model.location);
  renderTextFields(root, '[data-life="cash"]', model.cash);
  renderTextFields(root, '[data-life="household-support"]', model.householdSupport);
  const householdSupportRow = root.querySelector('[data-household-support-row]');
  if (householdSupportRow) householdSupportRow.hidden = model.householdSupport === null;
  renderTextFields(root, '[data-life="income"]', model.monthlyIncome);
  renderTextFields(root, '[data-life="costs"]', model.fixedCosts);
  renderTextFields(root, '[data-life="debt"]', model.debt);
  renderTextFields(root, '[data-life="net-worth"]', model.netWorth);
  renderTextFields(root, '[data-life="dopamine"]', model.dopamine);
  const financeButton = root.querySelector('#finance-menu-button');
  if (financeButton) financeButton.hidden = !model.canUseFinance;
  renderTextFields(root, '[data-life="education"]', model.education);
  renderTextFields(root, '[data-life="career"]', model.career);
  renderTextFields(root, '[data-life="housing"]', model.housing);
  renderTextFields(root, '[data-life="focus"]', model.focus);
  renderTextFields(root, '[data-life="appearance"]', model.appearance);
  renderTextFields(root, '[data-life="personality"]', model.personality);
  renderTextFields(root, '[data-life="business"]', model.business);
  renderTextFields(root, '[data-life="identity"]', model.identity);
  renderTextFields(root, '[data-life="mental-health"]', model.mentalHealth.label);
  renderTextFields(root, '[data-life="service"]', model.service);
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
        const source = makeNode(root, entry.sourceUrl ? 'a' : 'span', 'log-source source-readable');
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
    const character = makeNode(root, 'div', `life-character life-character-${model.character.stage}`);
    character.dataset.pose = model.character.pose;
    character.style.setProperty('--life-progress', `${model.character.progress}%`);
    character.style.setProperty('--character-tone', model.character.tone);
    character.setAttribute('role', 'img');
    character.setAttribute('aria-label', `${model.age} 생애 진행 ${model.character.progress}%`);
    character.innerHTML = characterSvg(model.character.stage, { ground: false });
    const track = makeNode(root, 'div', 'life-character-track');
    track.style.setProperty('--life-progress', `${model.character.progress}%`);
    const line = makeNode(root, 'span', 'life-character-line');
    track.append(line, character);
    const years = makeNode(root, 'div', 'life-years-grid');
    years.append(...model.lifeMap.map((year) => {
      const cell = makeNode(root, 'button', `life-year life-year-${year.state}`);
      cell.type = 'button';
      cell.dataset.age = year.age;
      cell.title = year.milestone?.label ?? formatAge(year.age);
      cell.setAttribute('aria-label', `${formatAge(year.age)}${year.milestone ? `, ${year.milestone.label}` : ''}`);
      cell.textContent = year.age % 10 === 0 ? String(year.age) : '';
      if (year.milestone) cell.classList.add('has-milestone');
      return cell;
    }));
    map.replaceChildren(track, years);
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

/** 선택지의 비용·위험·예상 영향을 사람이 읽을 수 있는 짧은 문구로 만든다. */
export function choiceMeta(choice) {
  const cashEffect = Number(choice.economyEffects?.cash) || 0;
  const cost = Math.max(
    Number(choice.cost ?? choice.financialAction?.amount ?? choice.businessPlan?.capital ?? 0) || 0,
    cashEffect < 0 ? -cashEffect : 0,
  );
  const effects = describeEffectDirections(choice.effects);
  const tags = choice.tags ?? [];
  const negative = Object.values(choice.effects ?? {}).reduce((sum, value) => sum + Math.min(0, Number(value) || 0), 0);
  const actionType = choice.financialAction?.type;
  let risk = '낮음';
  if (actionType === 'gamble' || tags.includes('대출') || negative <= -5 || (tags.includes('위험') && (tags.includes('충동') || tags.includes('창업')))) risk = '높음';
  else if (tags.includes('위험') || tags.includes('도전') || tags.includes('충동') || negative <= -2 || actionType === 'lottery') risk = '보통';
  return {
    cost: cost > 0 ? formatWon(cost) : cashEffect > 0 ? `없음 · ${formatWon(cashEffect)} 받음` : '없음',
    risk,
    effect: effects.slice(0, 3).join(' · ') || '방향을 알 수 없음',
  };
}

export function renderDecision(
  dialog,
  decision,
  choices,
  currentAge = decision.age ?? decision.ageRange?.[0],
) {
  renderTextFields(dialog, '[data-decision="kicker"]', `${currentAge}세 · ${decision.dilemma ? '그해의 선택' : '중요한 결정'}`);
  renderTextFields(dialog, '[data-decision="title"]', decision.title);
  renderTextFields(dialog, '[data-decision="prompt"]', decision.prompt);
  const list = dialog.querySelector('[data-decision="choices"]');
  if (!list) return;
  list.dataset.count = String(choices.length);
  list.replaceChildren(...choices.map((choice, index) => {
    const button = makeNode(dialog, 'button', 'decision-choice');
    button.type = 'button';
    button.dataset.choiceId = choice.id;
    button.dataset.choiceIndex = String(index);
    button.disabled = !choice.enabled;
    if (!choice.enabled) button.dataset.state = 'locked';
    const top = makeNode(dialog, 'span', 'choice-top');
    top.append(makeNode(dialog, 'span', 'decision-number', String.fromCharCode(65 + index)));
    if (!choice.enabled) top.append(makeNode(dialog, 'span', 'choice-lock', '잠김'));
    const copy = makeNode(dialog, 'span', 'decision-copy');
    copy.append(makeNode(dialog, 'strong', '', choice.label), makeNode(dialog, 'small', '', choice.description));
    const meta = choiceMeta(choice);
    const metaList = makeNode(dialog, 'span', 'choice-meta');
    for (const [label, value, className] of [['비용', meta.cost, ''], ['위험', meta.risk, `risk-${meta.risk}`], ['예상 영향', meta.effect, 'is-effect']]) {
      const row = makeNode(dialog, 'span', 'choice-meta-row');
      row.append(makeNode(dialog, 'i', '', label), makeNode(dialog, 'b', className, value));
      metaList.append(row);
    }
    const tags = makeNode(dialog, 'span', 'decision-tags');
    for (const tag of choice.tags ?? []) tags.append(makeNode(dialog, 'i', '', tag));
    button.append(top, copy, metaList, tags);
    if (!choice.enabled) button.append(makeNode(dialog, 'span', 'choice-note', `조건 부족 · ${choice.reason}`));
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

function stageForAge(age) {
  return characterViewModel({ age, stats: { health: 60, happiness: 60 } }).stage;
}

function publicYear(life) {
  const year = String(life.completedAt ?? '').slice(0, 4);
  return /^\d{4}$/.test(year) ? year : '';
}

export function renderNetworkState(root, state, { memorial = false } = {}) {
  if (!root) return;
  const copy = {
    loading: ['삶을 불러오고 있습니다', '공개된 기록을 정리하는 중입니다.', null],
    error: ['기록을 불러오지 못했습니다', '연결이 끊겼습니다. 이 브라우저에 저장된 기록만 표시합니다.', '다시 시도'],
    empty: memorial
      ? ['아직 이곳에 남겨진 기록이 없습니다', '90세 이전에 끝난 삶이 공개되면 이곳에서 기억합니다.', '삶을 시작하기']
      : ['아직 공개된 삶이 없습니다', '당신의 삶을 가장 먼저 공개해 보세요.', '삶을 시작하기'],
  }[state];
  const box = makeNode(root, 'div', `network-state network-state-${state}`);
  box.append(makeNode(root, 'span', 'network-state-icon'));
  box.append(makeNode(root, 'strong', '', copy[0]), makeNode(root, 'p', state === 'empty' ? 'public-life-empty' : '', copy[1]));
  if (copy[2]) {
    const action = makeNode(root, 'button', 'secondary-button network-state-action', copy[2]);
    action.type = 'button';
    action.dataset.networkAction = state === 'error' ? 'retry' : 'start';
    box.append(action);
  }
  root.replaceChildren(box);
}

export function renderPublicLives(root, lives = [], { memorial = false, page = 0, pageSize = 6 } = {}) {
  if (!root) return [];
  const all = filterPublicLives(lives, { memorial }).slice(0, memorial ? 20 : 12);
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const currentPage = Math.max(0, Math.min(page, pages - 1));
  const visible = all.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  if (visible.length === 0) {
    renderNetworkState(root, 'empty', { memorial });
    return visible;
  }
  const cards = visible.map((life) => {
    const article = makeNode(root, 'article', 'public-life-card');
    article.dataset.publicLife = life.id;
    const open = makeNode(root, 'button', 'public-life-open');
    open.type = 'button';
    open.dataset.publicLifeOpen = life.id;
    open.setAttribute('aria-label', `${life.alias} 인생 자세히 보기`);
    const heading = makeNode(root, 'div', 'public-life-heading');
    heading.append(
      makeNode(root, 'span', 'public-life-years', `${publicYear(life) ? `${publicYear(life)} · ` : ''}${life.age}세${memorial ? '의 기록' : ''}`),
      makeNode(root, 'span', 'public-life-anon', '익명'),
    );
    const identity = makeNode(root, 'div', 'public-life-identity');
    const avatar = makeNode(root, 'span', 'public-life-avatar');
    avatar.innerHTML = characterSvg(stageForAge(life.age), { ground: false });
    const names = makeNode(root, 'div', 'public-life-names');
    names.append(makeNode(root, 'h2', '', life.alias), makeNode(root, 'small', '', life.career));
    identity.append(avatar, names);
    const worth = makeNode(root, 'div', 'public-life-worth');
    worth.append(makeNode(root, 'span', '', '최종 자산'), makeNode(root, 'strong', '', life.netWorthBand));
    const moment = makeNode(root, 'p', 'public-life-moment');
    moment.append(makeNode(root, 'i'), makeNode(root, 'span', '', life.reflection));
    article.append(open, heading, identity, worth, moment, makeNode(root, 'small', 'public-life-route', `${life.birthRegion} → ${life.finalRegion}`));
    if (life.localOwner) {
      const hideButton = makeNode(root, 'button', 'text-button public-life-hide', '이 기록 숨기기');
      hideButton.type = 'button';
      hideButton.dataset.publicLifeId = life.id;
      article.append(hideButton);
    }
    return article;
  });
  if (pages > 1) {
    const pager = makeNode(root, 'nav', 'collection-pager');
    pager.setAttribute('aria-label', memorial ? '추모 기록 페이지' : '공개된 삶 페이지');
    const previous = makeNode(root, 'button', '', '← 이전');
    previous.type = 'button';
    previous.dataset.networkPage = 'previous';
    previous.disabled = currentPage === 0;
    const status = makeNode(root, 'span', '', `${currentPage + 1} / ${pages}`);
    const next = makeNode(root, 'button', '', '다음 →');
    next.type = 'button';
    next.dataset.networkPage = 'next';
    next.disabled = currentPage === pages - 1;
    pager.append(previous, status, next);
    cards.push(pager);
  }
  root.replaceChildren(...cards);
  return visible;
}

export function renderPublicLifeDetail(root, life, { memorial = false } = {}) {
  if (!root) return;
  if (!life) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }
  root.hidden = false;
  const top = makeNode(root, 'div', 'network-detail-top');
  const close = makeNode(root, 'button', 'icon-button network-detail-close');
  close.type = 'button';
  close.dataset.networkClose = '';
  close.setAttribute('aria-label', '상세 닫기');
  close.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>';
  top.append(makeNode(root, 'span', 'network-detail-kicker', memorial ? '먼저 끝난 삶' : '다른 사람의 인생'), close);
  const hero = makeNode(root, 'div', 'network-detail-hero');
  const avatar = makeNode(root, 'span', 'network-detail-avatar');
  avatar.innerHTML = characterSvg(stageForAge(life.age));
  const names = makeNode(root, 'div', '');
  names.append(
    makeNode(root, 'h2', '', life.alias),
    makeNode(root, 'p', 'network-detail-years', `${publicYear(life) ? `${publicYear(life)}년 기록 · ` : ''}${life.age}세`),
    makeNode(root, 'p', 'network-detail-route', `${life.birthRegion}에서 시작 · ${life.finalRegion}에서 마무리`),
  );
  hero.append(avatar, names);
  const stats = makeNode(root, 'div', 'network-detail-stats');
  for (const [label, value] of [['직업', life.career], ['자산', life.netWorthBand], ['나이', `${life.age}세`]]) {
    const tile = makeNode(root, 'div', '');
    tile.append(makeNode(root, 'span', '', label), makeNode(root, 'strong', '', value));
    stats.append(tile);
  }
  const moment = makeNode(root, 'article', 'network-detail-moment');
  moment.append(makeNode(root, 'span', '', '대표 사건'), makeNode(root, 'p', '', life.reflection));
  root.replaceChildren(top, hero, stats, moment);
}

const ENDING_LABELS = {
  'caffeine-cardiac': '건강 문제로 영면',
  'self-harm': '삶을 마쳤습니다',
  'cardiovascular-disease': '심혈관 질환으로 영면',
  cancer: '암으로 영면',
  'respiratory-disease': '호흡기 질환으로 영면',
  'age-related-disease': '노년의 질환으로 영면',
  other: '삶을 마쳤습니다',
};

export function resultEnding(summary, life = null) {
  if (summary.age >= 90) return '90세 완주';
  return ENDING_LABELS[life?.endedReason] ?? '노환과 질병으로 영면';
}

/** 가상 비교 — 실제 통계 분포가 아닌, 게임 안에서 쓰는 대략적인 상위 % 추정치입니다. */
export function koreaPosition(summary) {
  const worth = Number(summary.netWorth) || 0;
  const wealthTable = [[10000000000, 1], [3000000000, 3], [1000000000, 10], [500000000, 20], [300000000, 30], [100000000, 45], [50000000, 55], [10000000, 70], [0, 80]];
  const wealth = (wealthTable.find(([threshold]) => worth >= threshold) ?? [0, 95])[1];
  const age = Number(summary.age) || 0;
  const lifespan = Math.round(Math.min(98, Math.max(2, 100 - (age - 55) * 2.4)));
  const happiness = Math.round(Math.min(98, Math.max(2, 100 - (Number(summary.finalStats?.happiness) || 0))));
  // 어른이 되기 전에 멈춘 삶은 자산으로 줄 세우지 않는다.
  return [
    ...(age >= 19 ? [{ label: '자산', top: wealth }] : []),
    { label: '수명', top: lifespan },
    { label: '행복', top: happiness },
  ];
}

function highlightPoint(summary) {
  if (summary.representativeMoment) return summary.representativeMoment;
  const points = summary.turningPoints ?? [];
  const generic = new Set(['삶의 시작', '배움의 시작', '첫 진로의 갈림길', '삶의 기반을 만든 시간', '지나온 삶을 돌아본 날', '출생']);
  const meaningful = points.filter((point) => !generic.has(point.label));
  return meaningful.find((point) => point.type === 'era-event' || point.type === 'finance')
    ?? meaningful[Math.floor(meaningful.length / 2)]
    ?? points[Math.floor(points.length / 2)]
    ?? null;
}

function curveSvg(history, finalAge) {
  const points = (Array.isArray(history) ? history : []).filter((point) => Number.isFinite(point?.age));
  if (points.length < 2) return '';
  const maxAge = Math.max(finalAge, ...points.map((point) => point.age), 1);
  const toX = (age) => (age / maxAge) * 1000;
  const toY = (value) => 150 - (Math.max(0, Math.min(100, value)) / 100) * 140;
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${toX(point.age).toFixed(1)} ${toY(point.happiness ?? 50).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 1000 160" preserveAspectRatio="none" aria-hidden="true"><path class="curve-base" d="M0 150H1000"/><path class="curve-line" d="${path}"/></svg>`;
}

export function renderResult(root, summary, life = null) {
  const current = life ? normalizeLife(life) : null;
  const birthYear = current ? current.year - current.age : null;
  const ending = resultEnding(summary, current);
  renderTextFields(root, '[data-result="ending"]', ending);
  renderTextFields(root, '[data-result="death-reason"]', ending);
  root.querySelector('.result-badge')?.classList.toggle('is-complete', summary.age >= 90);
  renderTextFields(root, '[data-result="name"]', current?.profile?.name?.full ?? '한 사람');
  renderTextFields(root, '[data-result="years"]', birthYear ? `${birthYear} — ${current.year}` : '—');
  renderTextFields(root, '[data-result="health"]', String(summary.finalStats?.health ?? '—'));
  renderTextFields(root, '[data-result="family-short"]', summary.family.hasPartner
    ? `동반자${summary.family.children ? ` · 자녀 ${summary.family.children}` : ''}`
    : summary.family.children ? `자녀 ${summary.family.children}명` : '가족과 친구들');
  const portrait = root.querySelector('#result-portrait');
  if (portrait) portrait.innerHTML = characterSvg(characterViewModel(current ?? { age: summary.age, stats: summary.finalStats }).stage);
  const highlight = highlightPoint(summary);
  renderTextFields(root, '[data-result="highlight-title"]', highlight?.label ?? '평범하고도 특별했던 하루들');
  renderTextFields(root, '[data-result="highlight-age"]', highlight ? `${birthYear ? `${birthYear + highlight.age}년 · ` : ''}${formatAge(highlight.age)}` : '—');
  renderTextFields(root, '[data-result="highlight-badge"]', highlight?.type === 'era-event' ? '시대의 사건' : highlight?.type === 'finance' ? '돈과 선택' : '인생의 순간');
  const positionPanel = root.querySelector('[data-result="position-panel"]');
  if (positionPanel) positionPanel.hidden = current?.runtimeSettings?.comparison === 'none';
  const position = root.querySelector('[data-result="position"]');
  if (position) {
    position.replaceChildren(...koreaPosition(summary).map((item) => {
      const row = makeNode(root, 'div', 'position-row');
      const heading = makeNode(root, 'div', 'position-heading');
      heading.append(makeNode(root, 'span', '', item.label), makeNode(root, 'strong', '', `상위 ${item.top}%`));
      const track = makeNode(root, 'div', 'position-track');
      track.style.setProperty('--position', `${100 - item.top}%`);
      track.append(makeNode(root, 'i', 'position-fill'), makeNode(root, 'b', 'position-knob'));
      row.append(heading, track);
      return row;
    }));
  }
  const curve = root.querySelector('[data-result="curve"]');
  if (curve) curve.innerHTML = curveSvg(current?.statHistory, summary.age);
  renderTextFields(root, '[data-result="age"]', formatAge(summary.age));
  renderTextFields(root, '[data-result="birth"]', summary.birth);
  renderTextFields(root, '[data-result="residence"]', summary.finalResidence);
  renderTextFields(root, '[data-result="career"]', summary.longestCareer);
  renderTextFields(root, '[data-result="net-worth"]', formatWon(summary.netWorth));
  renderTextFields(root, '[data-result="narrative"]', summary.narrative);
  const epitaph = root.querySelector('#result-epitaph');
  if (epitaph) epitaph.value = summary.epitaph ?? '';
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
