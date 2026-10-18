import { validateProfile } from './simulator.js';
import { CAREER_GROUPS } from './data/careers.js';
import { createBirthSlotResult, profileFromSlotResult } from './engine/birth-slot.js';
import { normalizeRuntimeSettings, resolveBirthYear } from './data/runtime-settings.js';
import { mapRegionState } from './data/korea-map.js';
import { createKoreaMap, regionLabel } from './ui/korea-map.js';
import { detectBigEvents, renderBigEvent } from './ui/big-event.js';
import { renderSystemFeed } from './ui/system-feed.js';
import { createCohortPeers, advanceCohort } from './engine/cohort.js';
import { renderCohort } from './ui/cohort.js';
import { createLife } from './engine/life.js';
import { getDecision, getChoices } from './engine/decisions.js';
import { REFLECTION_BY_ID } from './data/reflections.js';
import { createLifeSummary } from './engine/summary.js';
import {
  getSafeStorage,
  saveCurrentLife,
  loadCurrentLife,
  clearCurrentLife,
  archiveLife,
  saveSummaryEpitaph,
  listPastLives,
  deletePastLife,
  clearPastLives,
} from './storage.js';
import { createSimulationController, resumeAfterBlockingDialog } from './ui/controls.js';
import { createCommunityClient } from './community.js';
import {
  renderLife,
  renderDecision,
  renderIdentityDiscovery,
  renderReflection,
  renderResult,
  renderPublicLives,
  renderPublicLifeDetail,
  renderNetworkState,
  formatWon,
} from './ui/render.js';
import {
  renderBirthSlot,
  renderBirthCertificate,
  fitResponsiveFigmaStage,
  nextBirthMapMode,
  slotDuration,
} from './ui/birth-slot.js';

const viewNames = ['title', 'intro', 'profile', 'future', 'life', 'result', 'past-lives', 'community', 'memorial'];
const views = Object.fromEntries(viewNames.map((name) => [name, document.querySelector(`#${name}-view`)]));
const storage = getSafeStorage(window);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const liveRegion = document.querySelector('#live-region');
const main = document.querySelector('main');
const community = createCommunityClient(globalThis.ONE_IN_50M_CONFIG ?? {}, { storage });

const controls = {
  birth: document.querySelector('#birth-button'),
  continue: document.querySelector('#continue-button'),
  accept: document.querySelector('#slot-accept-button'),
  back: document.querySelector('#back-button'),
  play: document.querySelector('#play-button'),
  skip: document.querySelector('#skip-button'),
  auto: document.querySelector('#auto-button'),
  career: document.querySelector('#career-select-button'),
};

const decisionDialog = document.querySelector('#decision-dialog');
const identityDialog = document.querySelector('#identity-dialog');
const reflectionDialog = document.querySelector('#reflection-dialog');
const agencyDialog = document.querySelector('#agency-dialog');
const careerDialog = document.querySelector('#career-dialog');
const financeDialog = document.querySelector('#finance-dialog');
const eventDialog = document.querySelector('#event-dialog');
const sourceDialog = document.querySelector('#source-dialog');
const blockingDialogs = [decisionDialog, identityDialog, reflectionDialog, agencyDialog, careerDialog, financeDialog, eventDialog, sourceDialog];
let previousLifeSnapshot = null;
let bigEventQueue = [];
let resumeAfterBigEvents = false;
let candidateProfile = null;
let candidateResult = null;
let runtimeSettings = normalizeRuntimeSettings();
let controller = null;
let isDrawing = false;
let lastFocused = null;
let spinCounter = 0;
let pendingAgencyResolution = null;
let lastCompletedSummary = null;
let selectedPropertyRegion = null;
let resumeAfterFinance = false;
let resumeAfterSource = false;
let careerGroupPage = 0;
let decisionChoicePage = 0;
let pastLivesPage = 0;
let sourcePage = 0;
let lifeLogPage = 0;
const networkPages = { community: 0, memorial: 0 };

function collectionPageSize() {
  if (window.innerHeight < 520) return 1;
  if (window.innerHeight < 760 || window.innerWidth < 600) return 2;
  return 6;
}

function syncFigmaStageScale() {
  document.documentElement.style.setProperty('--figma-stage-scale', String(fitResponsiveFigmaStage(window.innerWidth, window.innerHeight)));
}

function setProfilePage(page = 'roulette') {
  const stage = document.querySelector('.profile-stage');
  stage.dataset.profilePage = page;
  stage.querySelectorAll('.profile-page-tabs button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.profilePage === page));
  });
  if (page === 'cohort') stage.querySelector('.cohort-preview-panel').open = true;
}

function updateLifeLogPage(page = lifeLogPage) {
  const log = document.querySelector('#life-log');
  const entries = [...log.querySelectorAll('.log-entry')];
  const pageSize = window.innerHeight <= 520 || (window.innerWidth >= 960 && window.innerHeight <= 900) ? 1 : window.innerWidth < 960 ? 2 : 3;
  const pages = Math.max(1, Math.ceil(entries.length / pageSize));
  lifeLogPage = Math.max(0, Math.min(page, pages - 1));
  entries.forEach((entry, index) => { entry.hidden = Math.floor(index / pageSize) !== lifeLogPage; });
  let pager = log.parentElement.querySelector('.log-pager');
  if (!pager) {
    pager = document.createElement('nav');
    pager.className = 'collection-pager log-pager';
    pager.setAttribute('aria-label', '인생 기록 페이지');
    log.after(pager);
  }
  pager.hidden = pages <= 1;
  pager.innerHTML = `<button type="button" data-log-page="previous" ${lifeLogPage === 0 ? 'disabled' : ''}>← 이전</button><span>${lifeLogPage + 1} / ${pages}</span><button type="button" data-log-page="next" ${lifeLogPage === pages - 1 ? 'disabled' : ''}>다음 →</button>`;
}

function setBirthMapMode(mode) {
  const stage = document.querySelector('.profile-stage');
  const mapButton = document.querySelector('#birth-map-button');
  if (!stage || !mapButton) return;
  stage.dataset.mapMode = mode;
  stage.dataset.figmaFrame = mode === 'detail' ? 'Desktop 2-3' : mode === 'region' ? 'Desktop 2-2' : 'Desktop 2-1';
  mapButton.setAttribute('aria-expanded', String(mode === 'detail'));
}

let publicLivesById = new Map();

function renderNetworkLists(lives) {
  const pageSize = collectionPageSize();
  networkPages.community = Math.min(networkPages.community, Math.max(0, Math.ceil(Math.min(lives.length, 12) / pageSize) - 1));
  networkPages.memorial = Math.min(networkPages.memorial, Math.max(0, Math.ceil(Math.min(lives.filter((life) => life.age < 90).length, 20) / pageSize) - 1));
  publicLivesById = new Map(lives.map((life) => [life.id, life]));
  renderPublicLives(document.querySelector('[data-community-list]'), lives, { page: networkPages.community, pageSize });
  renderPublicLives(document.querySelector('[data-memorial-list]'), lives, { memorial: true, page: networkPages.memorial, pageSize });
  document.querySelectorAll('[data-network-count="community"]').forEach((node) => { node.textContent = String(lives.length); });
  document.querySelectorAll('[data-network-count="memorial"]').forEach((node) => { node.textContent = String(lives.filter((life) => life.age < 90).length); });
  document.querySelectorAll('[data-network-detail]').forEach((panel) => renderPublicLifeDetail(panel, null));
}

async function refreshCommunity() {
  const communityList = document.querySelector('[data-community-list]');
  const memorialList = document.querySelector('[data-memorial-list]');
  if (!communityList.children.length) renderNetworkState(communityList, 'loading');
  if (!memorialList.children.length) renderNetworkState(memorialList, 'loading', { memorial: true });
  let lives;
  try {
    lives = await community.listPublicLives();
  } catch {
    renderNetworkState(communityList, 'error');
    renderNetworkState(memorialList, 'error', { memorial: true });
    return;
  }
  renderNetworkLists(lives);
  const presence = await community.connectPresence();
  document.querySelector('[data-live="online"]').textContent = presence.mode === 'online' ? String(presence.count) : '오프라인';
  document.querySelector('[data-live="births"]').textContent = String(lives.length);
  document.querySelector('[data-live="deaths"]').textContent = String(lives.filter((life) => life.age < 90).length);
}

function setText(field, value) {
  document.querySelectorAll(`[data-field="${field}"]`).forEach((node) => {
    node.textContent = String(value ?? '—');
  });
}

const koreaMaps = {
  intro: createKoreaMap(document.querySelector('#intro-korea-map')),
  slot: createKoreaMap(document.querySelector('#slot-korea-map'), { label: '출생 지역 지도' }),
  investment: createKoreaMap(document.querySelector('#investment-korea-map'), { label: '부동산 투자 지역 선택 지도' }),
};

document.querySelector('#investment-korea-map')?.addEventListener('kmap:zoom', (event) => {
  selectedPropertyRegion = event.detail.code;
  const label = document.querySelector('#property-region-label');
  const buy = document.querySelector('#property-buy-button');
  if (label) label.textContent = selectedPropertyRegion ? regionLabel(selectedPropertyRegion) : '지역을 선택하세요';
  if (buy) buy.disabled = !selectedPropertyRegion;
});

function renderKoreaMap(regionCode = null, label) {
  koreaMaps.slot?.resetZoom();
  koreaMaps.slot?.setBirth(regionCode, label);
  if (!regionCode) koreaMaps.intro?.resetZoom();
}

function renderProfileContext(profile) {
  if (!validateProfile(profile)) return;
  setText('future-location', `${profile.region.name} ${profile.district}`);
  setText('future-birth-summary', `${profile.birthYear}년 ${profile.region.short}, ${profile.familyType}`);
  document.querySelectorAll('[data-birth-map="region"]').forEach((node) => { node.textContent = profile.region.name; });
  document.querySelectorAll('[data-birth-map="district"]').forEach((node) => { node.textContent = profile.district; });
  const selected = mapRegionState(profile.region.code).find((point) => point.selected);
  const stage = document.querySelector('.profile-stage');
  if (stage && selected) {
    stage.style.setProperty('--birth-map-left', `${40 + (selected.x / 100) * 440}px`);
    stage.style.setProperty('--birth-map-top', `${30 + (selected.y / 120) * 550}px`);
    stage.style.setProperty('--birth-map-x', `${selected.x}%`);
    stage.style.setProperty('--birth-map-y', `${(selected.y / 120) * 100}%`);
  }
  const label = document.querySelector('[data-birth-map="label"]');
  if (label) label.textContent = `${profile.region.name} ${profile.district}`;
  setBirthMapMode('marker');
  renderKoreaMap(profile.region.code, `${profile.region.name} ${profile.district}`);
}

function showView(name) {
  for (const [key, view] of Object.entries(views)) {
    if (view) view.hidden = key !== name;
  }
  document.body.dataset.view = name;
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function setDrawDisabled(disabled) {
  isDrawing = disabled;
  controls.birth.disabled = disabled;
  controls.accept.disabled = disabled;
  document.body.classList.toggle('is-drawing', disabled);
}

function nextBirthSeed() {
  spinCounter += 1;
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${randomPart}-${spinCounter}`;
}

function readRuntimeSettings() {
  return normalizeRuntimeSettings({
    era: document.querySelector('#era-setting').value,
    durationMinutes: Number(document.querySelector('#duration-setting').value),
    comparison: document.querySelector('#comparison-setting').value,
    music: document.querySelector('#music-setting').checked,
    autoDecision: document.querySelector('#auto-setting').checked,
  });
}

async function spinBirthSlot() {
  if (isDrawing) return;
  setDrawDisabled(true);
  setProfilePage('roulette');
  showView('profile');
  runtimeSettings = readRuntimeSettings();
  const seed = nextBirthSeed();
  const birthYear = resolveBirthYear(runtimeSettings, seed, new Date().getFullYear());
  candidateResult = createBirthSlotResult(seed, birthYear);
  candidateProfile = profileFromSlotResult(candidateResult);
  renderBirthSlot(document.querySelector('#birth-slot'), candidateResult, { spinning: !reduceMotion.matches });
  renderBirthCertificate(document.querySelector('#birth-certificate-details'), candidateResult);
  renderCohort(document.querySelector('#cohort-preview'), createCohortPeers(candidateProfile, candidateProfile.id), 0);
  renderProfileContext(candidateProfile);
  await wait(slotDuration(reduceMotion.matches));
  renderBirthSlot(document.querySelector('#birth-slot'), candidateResult);
  setDrawDisabled(false);
  controls.accept.focus({ preventScroll: true });
  liveRegion.textContent = `${candidateProfile.name.full}, ${candidateProfile.region.name} ${candidateProfile.district} 출생 조건이 정해졌습니다.`;
}

function startBirthRoulette() {
  if (isDrawing) return;
  candidateProfile = null;
  candidateResult = null;
  renderKoreaMap();
  document.querySelector('#roulette-continue-button').hidden = !loadCurrentLife(storage);
  void spinBirthSlot();
}

function updatePlayback() {
  if (!controller) return;
  const playing = controller.isPlaying();
  controls.play.textContent = playing ? 'Ⅱ' : '▶';
  controls.play.setAttribute('aria-label', playing ? '삶 일시정지' : '삶 재생');
  document.querySelectorAll('[data-speed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === controller.getSpeed()));
  });
  controls.auto.setAttribute('aria-pressed', String(controller.isAutoDecision()));
  const focusId = controller.getState().focusId;
  document.querySelectorAll('[data-focus]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.focus === focusId));
  });
}

function momentHeadline(life) {
  const latest = life.history.at(-1);
  if (!latest || latest.age !== life.age) return null;
  const headline = latest.title ?? latest.label ?? null;
  if (headline) return headline;
  return latest.type === 'decision' || latest.type === 'event' || latest.type === 'career' ? latest.text?.split(/[:.]/)[0] : null;
}

function setMomentTitle(age, headline) {
  const title = document.querySelector('#moment-title');
  if (!title) return;
  if (headline) {
    title.textContent = headline;
    title.classList.add('is-event');
    return;
  }
  title.classList.remove('is-event');
  const ageNode = document.createElement('span');
  ageNode.id = 'moment-age';
  ageNode.textContent = String(age);
  const em = document.createElement('em');
  em.textContent = '흐르고 있습니다.';
  title.replaceChildren(ageNode, '번째 해가', document.createElement('br'), em);
}

function updateMoment(life) {
  setMomentTitle(life.age, momentHeadline(life));
  const latest = life.history.at(-1);
  document.querySelector('#moment-copy').textContent = latest?.text ?? '새로운 삶이 시작되었습니다.';
  controls.career.hidden = life.age < 19 || Boolean(life.career.careerId) || life.status !== 'living';
}

function anyDialogOpen() {
  return blockingDialogs.some((dialog) => dialog?.open);
}

function showNextBigEvent() {
  if (!controller || anyDialogOpen()) return;
  const next = bigEventQueue.shift();
  if (!next) {
    if (resumeAfterBlockingDialog(resumeAfterBigEvents, false) && controller.getState().status === 'living' && !controller.getState().pendingDecisionId) {
      controller.play();
    }
    resumeAfterBigEvents = false;
    updatePlayback();
    return;
  }
  if (controller.isPlaying()) {
    resumeAfterBigEvents = true;
    controller.pause();
  }
  updatePlayback();
  lastFocused = document.activeElement;
  renderBigEvent(eventDialog, next, controller.getState().profile?.name?.full ?? '');
  main.inert = true;
  eventDialog.showModal();
  document.querySelector('#event-title').focus();
  liveRegion.textContent = `${next.year}년, ${next.title}`;
}

function trackBigEvents(life) {
  const events = detectBigEvents(previousLifeSnapshot, life);
  previousLifeSnapshot = life;
  if (!events.length || controller?.isAutoDecision()) return;
  bigEventQueue.push(...events);
  if (controller?.isPlaying()) {
    resumeAfterBigEvents = true;
    controller.pause();
  }
  setTimeout(showNextBigEvent, 0);
}

function renderCurrentLife(life) {
  trackBigEvents(life);
  renderLife(views.life, life);
  updateLifeLogPage();
  renderSystemFeed(document.querySelector('#system-feed'), life);
  renderCohort(document.querySelector('#cohort-life'), advanceCohort(life.cohort, life.age), life.age);
  updateFinanceDialog(life);
  updateMoment(life);
  updatePlayback();
  saveCurrentLife(storage, life);
  controls.continue.hidden = false;
}

function updateFinanceDialog(life = controller?.getState()) {
  if (!life) return;
  financeDialog?.querySelectorAll('[data-life="dopamine"]').forEach((node) => { node.textContent = String(life.economy.dopamine ?? 0); });
  const pendingDraw = Boolean(life.economy.pendingLotteryDraw);
  const buyLottery = financeDialog?.querySelector('[data-finance-action="lottery-buy"]');
  const broadcast = document.querySelector('#lottery-broadcast-button');
  if (buyLottery) buyLottery.disabled = pendingDraw || life.economy.cash < 10000;
  if (broadcast) broadcast.disabled = !pendingDraw;
}

function setFinancePage(page = 'stock') {
  financeDialog.querySelectorAll('[data-finance-page]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.financePage === page));
  });
  financeDialog.querySelectorAll('[data-finance-section]').forEach((section) => {
    section.hidden = section.dataset.financeSection !== page;
  });
}

function setResultPage(page = 'summary') {
  views.result.dataset.resultPage = page;
  views.result.querySelectorAll('[data-result-page-target]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.resultPageTarget === page));
  });
}

function setMoneyPage(page = 'flow') {
  const panel = document.querySelector('#money-panel');
  panel.querySelectorAll('[data-money-page]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.moneyPage === page));
  });
  panel.querySelectorAll('[data-money-section]').forEach((section) => {
    section.hidden = section.dataset.moneySection !== page;
  });
}

function setDecisionChoicePage(page = 0) {
  const choices = [...decisionDialog.querySelectorAll('[data-choice-index]')];
  const pageSize = 2;
  const pageCount = Math.max(1, Math.ceil(choices.length / pageSize));
  decisionChoicePage = Math.max(0, Math.min(page, pageCount - 1));
  choices.forEach((choice, index) => { choice.hidden = Math.floor(index / pageSize) !== decisionChoicePage; });
  const pager = decisionDialog.querySelector('[data-decision="pager"]');
  pager.hidden = pageCount <= 1;
  pager.querySelector('[data-decision="page-status"]').textContent = `${decisionChoicePage + 1} / ${pageCount}`;
  pager.querySelector('[data-decision-page="previous"]').disabled = decisionChoicePage === 0;
  pager.querySelector('[data-decision-page="next"]').disabled = decisionChoicePage === pageCount - 1;
}

function setSourcePage(page = 0) {
  const items = [...sourceDialog.querySelectorAll('[data-source-item]')];
  const pageCount = Math.ceil(items.length / 2);
  sourcePage = Math.max(0, Math.min(page, pageCount - 1));
  items.forEach((item, index) => { item.hidden = Math.floor(index / 2) !== sourcePage; });
  sourceDialog.querySelector('[data-source-page-status]').textContent = `${sourcePage + 1} / ${pageCount}`;
  sourceDialog.querySelector('[data-source-page="previous"]').disabled = sourcePage === 0;
  sourceDialog.querySelector('[data-source-page="next"]').disabled = sourcePage === pageCount - 1;
}

function openFinanceMenu() {
  if (!controller || financeDialog.open) return;
  resumeAfterFinance = controller.isPlaying();
  controller.pause();
  updatePlayback();
  updateFinanceDialog();
  setFinancePage('stock');
  lastFocused = document.activeElement;
  main.inert = true;
  financeDialog.showModal();
  document.querySelector('#finance-title').focus();
}

function closeFinanceMenu() {
  unlockBackground(financeDialog);
  if (resumeAfterBlockingDialog(resumeAfterFinance, false) && controller?.getState().status === 'living' && !controller.getState().pendingDecisionId) controller.play();
  resumeAfterFinance = false;
  updatePlayback();
}

function financeAction(actionId) {
  if (!controller) return;
  const actions = {
    'stock-buy': { type: 'buy', asset: 'stocks', amount: 1000000 },
    'stock-sell': { type: 'sell', asset: 'stocks', amount: 1000000 },
    'crypto-buy': { type: 'buy', asset: 'crypto', amount: 2000000 },
    'crypto-sell': { type: 'sell', asset: 'crypto', amount: 2000000 },
    'lottery-buy': { type: 'lottery-ticket', amount: 10000 },
    'car-buy': { type: 'vehicle', amount: 8000000, vehicleValue: 16000000, debt: 8000000, monthlyCost: 300000 },
    'property-buy': { type: 'property', amount: 20000000, homeValue: 150000000, debt: 130000000, region: selectedPropertyRegion ? regionLabel(selectedPropertyRegion) : null },
  };
  const feedback = document.querySelector('#finance-feedback');
  try {
    const next = actionId === 'lottery-broadcast'
      ? controller.revealLotteryBroadcast()
      : controller.performFinancialAction(actions[actionId]);
    feedback.textContent = next.history.at(-1)?.text ?? '거래가 반영되었습니다.';
    feedback.dataset.tone = 'success';
    updateFinanceDialog(next);
  } catch (error) {
    feedback.textContent = error?.message ?? '이 거래를 진행할 수 없습니다.';
    feedback.dataset.tone = 'error';
  }
}

function unlockBackground(dialog, focus = true) {
  main.inert = false;
  if (dialog.open) dialog.close();
  if (focus && lastFocused?.isConnected) lastFocused.focus();
  if (dialog !== eventDialog && dialog !== sourceDialog && bigEventQueue.length) setTimeout(showNextBigEvent, 0);
}

function openDecision(decision, life) {
  if (!decision || decisionDialog.open) return;
  lastFocused = document.activeElement;
  renderDecision(decisionDialog, decision, getChoices(life, decision.id), life.age);
  setDecisionChoicePage(0);
  main.inert = true;
  decisionDialog.showModal();
  document.querySelector('#decision-title').focus();
}

function openIdentityDiscovery(life) {
  if (!life?.pendingIdentityDiscovery || identityDialog.open) return;
  lastFocused = document.activeElement;
  renderIdentityDiscovery(identityDialog, life);
  main.inert = true;
  identityDialog.showModal();
  document.querySelector('#identity-title').focus();
}

function openReflection(reflection) {
  if (!reflection || reflectionDialog.open) return;
  lastFocused = document.activeElement;
  renderReflection(reflectionDialog, reflection);
  main.inert = true;
  reflectionDialog.showModal();
  document.querySelector('#reflection-title').focus();
}

function openAgencyOverride(resolution) {
  if (!resolution || agencyDialog.open) return;
  document.querySelector('#agency-reason').textContent = resolution.reason;
  document.querySelector('#agency-requested').textContent = resolution.requestedLabel;
  document.querySelector('#agency-actual').textContent = resolution.actualLabel;
  main.inert = true;
  agencyDialog.showModal();
  document.querySelector('#agency-title').focus();
}

function finishLife(life) {
  controller?.pause();
  archiveLife(storage, life);
  clearCurrentLife(storage);
  controls.continue.hidden = true;
  lastCompletedSummary = createLifeSummary(life);
  const publishButton = document.querySelector('#publish-life-button');
  publishButton.disabled = false;
  publishButton.textContent = '이 삶을 익명 공개';
  renderResult(views.result, lastCompletedSummary, life);
  setResultPage('summary');
  renderCohort(document.querySelector('#cohort-result'), advanceCohort(life.cohort, life.age), life.age);
  showView('result');
  liveRegion.textContent = `${life.age}세의 생애가 회고 단계에 도착했습니다.`;
}

function startLife(life) {
  controller?.destroy();
  previousLifeSnapshot = null;
  bigEventQueue = [];
  resumeAfterBigEvents = false;
  controller = createSimulationController({
    initialLife: life,
    onState: renderCurrentLife,
    onDecision: openDecision,
    onIdentityDiscovery: openIdentityDiscovery,
    onReflection: openReflection,
    onAgencyOverride: (resolution) => { pendingAgencyResolution = resolution; },
    onComplete: finishLife,
  });
  let current = controller.getState();
  if (current.runtimeSettings?.autoDecision) {
    controller.setAutoDecision(true);
    current = controller.getState();
  }
  renderCurrentLife(current);
  showView('life');
  if (current.status === 'review') {
    finishLife(current);
    return;
  }
  if (current.pendingIdentityDiscovery) {
    openIdentityDiscovery(current);
  } else if (current.pendingReflectionId) {
    openReflection(REFLECTION_BY_ID[current.pendingReflectionId]);
  } else if (current.pendingDecisionId) {
    openDecision(getDecision(current), current);
  } else {
    controller.play();
    updatePlayback();
  }
}

function beginCandidateLife() {
  if (!candidateProfile || isDrawing) return;
  const life = createLife(candidateProfile, candidateProfile.id);
  life.runtimeSettings = structuredClone(runtimeSettings);
  startLife(life);
  liveRegion.textContent = '선택한 출생 조건으로 삶을 시작했습니다.';
}

function renderCareerPicker() {
  if (!controller) return;
  const offers = controller.getCareerOffers(100);
  const byId = new Map(offers.map((offer) => [offer.career.id, offer]));
  const container = document.querySelector('#career-groups');
  const index = Math.max(0, Math.min(careerGroupPage, CAREER_GROUPS.length - 1));
  careerGroupPage = index;
  const group = CAREER_GROUPS[index];
  const section = (() => {
    const section = document.createElement('section');
    section.className = 'career-group';
    const title = document.createElement('h3');
    title.textContent = group.label;
    const list = document.createElement('div');
    list.className = 'career-list';
    list.replaceChildren(...group.careers.map((career) => {
      const offer = byId.get(career.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'career-option';
      button.dataset.careerId = career.id;
      button.disabled = !offer?.eligible;
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = career.title;
      const note = document.createElement('small');
      note.textContent = offer?.eligible ? `안정 ${career.stability} · 스트레스 ${career.stress}` : offer?.reason ?? '현재 선택할 수 없습니다.';
      copy.append(name, note);
      const salary = document.createElement('b');
      salary.textContent = offer ? `연 ${formatWon(offer.estimatedSalary)}` : '준비 필요';
      button.append(copy, salary);
      return button;
    }));
    section.append(title, list);
    return section;
  })();
  const pager = document.createElement('nav');
  pager.className = 'career-pager';
  pager.setAttribute('aria-label', '직업군 페이지');
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.dataset.careerPage = 'previous';
  previous.textContent = '← 이전 직업군';
  previous.disabled = index === 0;
  const status = document.createElement('span');
  status.textContent = `${index + 1} / ${CAREER_GROUPS.length} · ${group.label}`;
  const next = document.createElement('button');
  next.type = 'button';
  next.dataset.careerPage = 'next';
  next.textContent = '다음 직업군 →';
  next.disabled = index === CAREER_GROUPS.length - 1;
  pager.append(previous, status, next);
  container.replaceChildren(section, pager);
}

function openCareerPicker() {
  if (!controller || careerDialog.open) return;
  controller.pause();
  updatePlayback();
  lastFocused = document.activeElement;
  careerGroupPage = 0;
  renderCareerPicker();
  main.inert = true;
  careerDialog.showModal();
  document.querySelector('#career-title').focus();
}

function showPastLives() {
  const lives = listPastLives(storage);
  const list = document.querySelector('#past-lives-list');
  if (lives.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = '아직 끝까지 살아본 삶이 없습니다.';
    list.replaceChildren(empty);
  } else {
    const pageSize = collectionPageSize();
    const pageCount = Math.max(1, Math.ceil(lives.length / pageSize));
    pastLivesPage = Math.max(0, Math.min(pastLivesPage, pageCount - 1));
    const cards = lives.slice(pastLivesPage * pageSize, (pastLivesPage + 1) * pageSize).map((life) => {
      const article = document.createElement('article');
      article.className = 'past-life-card';
      const kicker = document.createElement('p');
      kicker.className = 'eyebrow';
      kicker.textContent = `${life.age}세 · ${life.birth}`;
      const title = document.createElement('h2');
      title.textContent = life.longestCareer;
      const copy = document.createElement('p');
      copy.textContent = life.narrative;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-button past-life-delete';
      remove.dataset.pastLifeId = life.id;
      remove.textContent = '이 기록 삭제';
      article.append(kicker, title, copy, remove);
      return article;
    });
    if (pageCount > 1) {
      const pager = document.createElement('nav');
      pager.className = 'collection-pager';
      pager.setAttribute('aria-label', '전생 기록 페이지');
      pager.innerHTML = `<button type="button" data-past-page="previous" ${pastLivesPage === 0 ? 'disabled' : ''}>← 이전</button><span>${pastLivesPage + 1} / ${pageCount}</span><button type="button" data-past-page="next" ${pastLivesPage === pageCount - 1 ? 'disabled' : ''}>다음 →</button>`;
      cards.push(pager);
    }
    list.replaceChildren(...cards);
  }
  showView('past-lives');
}

controls.birth.addEventListener('click', spinBirthSlot);
controls.accept.addEventListener('click', beginCandidateLife);
const birthMapButton = document.querySelector('#birth-map-button');
const birthMapBack = document.querySelector('#birth-map-back');
birthMapButton.addEventListener('pointermove', () => {
  if (document.querySelector('.profile-stage')?.dataset.mapMode !== 'detail') setBirthMapMode(nextBirthMapMode('marker', 'preview'));
});
birthMapButton.addEventListener('focus', () => {
  if (document.querySelector('.profile-stage')?.dataset.mapMode !== 'detail') setBirthMapMode(nextBirthMapMode('marker', 'preview'));
});
birthMapButton.addEventListener('pointerleave', () => {
  const mode = document.querySelector('.profile-stage')?.dataset.mapMode;
  if (mode !== 'detail') setBirthMapMode(nextBirthMapMode(mode, 'leave'));
});
birthMapButton.addEventListener('blur', () => {
  const mode = document.querySelector('.profile-stage')?.dataset.mapMode;
  if (mode !== 'detail') setBirthMapMode(nextBirthMapMode(mode, 'leave'));
});
birthMapButton.addEventListener('click', () => {
  const mode = document.querySelector('.profile-stage')?.dataset.mapMode ?? 'marker';
  setBirthMapMode(nextBirthMapMode(mode, 'open'));
});
birthMapBack.addEventListener('click', () => setBirthMapMode(nextBirthMapMode('detail', 'back')));
controls.continue.addEventListener('click', () => {
  const saved = loadCurrentLife(storage);
  if (saved) startLife(saved);
});
document.querySelector('#roulette-continue-button').addEventListener('click', () => {
  const saved = loadCurrentLife(storage);
  if (saved) startLife(saved);
});
controls.back.addEventListener('click', () => showView('profile'));
controls.play.addEventListener('click', () => {
  if (!controller) return;
  if (controller.isPlaying()) controller.pause(); else controller.play();
  updatePlayback();
});
controls.skip.addEventListener('click', () => {
  controller?.skipToDecision();
  updatePlayback();
});
controls.auto.addEventListener('click', () => {
  if (!controller) return;
  const enabled = controller.setAutoDecision(!controller.isAutoDecision());
  if (enabled && decisionDialog.open) unlockBackground(decisionDialog, false);
  updatePlayback();
});
controls.career.addEventListener('click', openCareerPicker);
document.querySelector('#finance-menu-button').addEventListener('click', openFinanceMenu);

document.querySelector('#life-panel-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-life-panel-target]');
  if (!button) return;
  const mobilePanel = button.dataset.lifePanelTarget;
  views.life.dataset.mobilePanel = mobilePanel;
  document.querySelectorAll('[data-life-panel-target]').forEach((item) => {
    item.setAttribute('aria-pressed', String(item === button));
  });
});
document.querySelector('.profile-page-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-profile-page]');
  if (button) setProfilePage(button.dataset.profilePage);
});
views.life.addEventListener('click', (event) => {
  const button = event.target.closest('[data-log-page]');
  if (button) updateLifeLogPage(lifeLogPage + (button.dataset.logPage === 'next' ? 1 : -1));
});

document.querySelector('#speed-controls').addEventListener('click', (event) => {
  const button = event.target.closest('[data-speed]');
  if (!button || !controller) return;
  controller.setSpeed(Number(button.dataset.speed));
  updatePlayback();
});

document.querySelectorAll('[data-focus]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!controller) return;
    controller.setFocus(button.dataset.focus);
    document.querySelectorAll('[data-focus]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  });
});

decisionDialog.addEventListener('cancel', (event) => event.preventDefault());
decisionDialog.querySelector('[data-decision="choices"]').addEventListener('click', (event) => {
  const button = event.target.closest('[data-choice-id]');
  if (!button || button.disabled || !controller) return;
  controller.answerDecision(button.dataset.choiceId);
  const resolution = pendingAgencyResolution;
  pendingAgencyResolution = null;
  unlockBackground(decisionDialog, !resolution);
  if (resolution) openAgencyOverride(resolution);
  updatePlayback();
});
decisionDialog.querySelector('[data-decision="pager"]').addEventListener('click', (event) => {
  const button = event.target.closest('[data-decision-page]');
  if (!button || button.disabled) return;
  setDecisionChoicePage(decisionChoicePage + (button.dataset.decisionPage === 'next' ? 1 : -1));
});

agencyDialog.addEventListener('cancel', (event) => event.preventDefault());
document.querySelector('#agency-continue-button').addEventListener('click', () => {
  const actual = document.querySelector('#agency-actual').textContent;
  unlockBackground(agencyDialog);
  controller?.acknowledgeInterruption();
  updatePlayback();
  liveRegion.textContent = `인물의 성향에 따라 ${actual} 선택으로 삶이 이어집니다.`;
});

identityDialog.addEventListener('cancel', (event) => event.preventDefault());
document.querySelector('#identity-continue-button').addEventListener('click', () => {
  if (!controller) return;
  const label = controller.getState().identity.label ?? '정체성';
  const next = controller.acknowledgeIdentity();
  unlockBackground(identityDialog);
  if (next.pendingDecisionId) openDecision(getDecision(next), next);
  updatePlayback();
  liveRegion.textContent = `가상 인물이 자신의 ${label} 정체성을 발견한 삶을 계속합니다.`;
});

reflectionDialog.addEventListener('cancel', (event) => event.preventDefault());
reflectionDialog.querySelector('[data-reflection="choices"]').addEventListener('click', (event) => {
  const button = event.target.closest('[data-reflection-choice]');
  if (!button || !controller) return;
  const next = controller.answerReflection(button.dataset.reflectionChoice);
  unlockBackground(reflectionDialog);
  if (next.pendingIdentityDiscovery) openIdentityDiscovery(next);
  else if (next.pendingDecisionId) openDecision(getDecision(next), next);
  updatePlayback();
});

eventDialog.addEventListener('cancel', (event) => event.preventDefault());
document.querySelector('#event-continue-button').addEventListener('click', () => {
  unlockBackground(eventDialog);
  showNextBigEvent();
});

document.querySelector('#source-button').addEventListener('click', () => {
  if (sourceDialog.open) return;
  resumeAfterSource = Boolean(controller?.isPlaying());
  controller?.pause();
  updatePlayback();
  lastFocused = document.activeElement;
  setSourcePage(0);
  main.inert = true;
  sourceDialog.showModal();
  document.querySelector('#source-title').focus();
});
sourceDialog.querySelector('.source-pager').addEventListener('click', (event) => {
  const button = event.target.closest('[data-source-page]');
  if (!button || button.disabled) return;
  setSourcePage(sourcePage + (button.dataset.sourcePage === 'next' ? 1 : -1));
});
function closeSourceDialog() {
  unlockBackground(sourceDialog);
  if (resumeAfterBlockingDialog(resumeAfterSource, false) && controller?.getState().status === 'living' && !controller.getState().pendingDecisionId) controller.play();
  resumeAfterSource = false;
  updatePlayback();
}
['#source-close-button', '#source-ok-button'].forEach((selector) => {
  document.querySelector(selector).addEventListener('click', closeSourceDialog);
});
sourceDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeSourceDialog();
});

document.querySelector('#finance-close-button').addEventListener('click', closeFinanceMenu);
financeDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeFinanceMenu();
});
financeDialog.addEventListener('click', (event) => {
  const pageButton = event.target.closest('[data-finance-page]');
  if (pageButton) {
    setFinancePage(pageButton.dataset.financePage);
    return;
  }
  const button = event.target.closest('[data-finance-action]');
  if (!button || button.disabled) return;
  financeAction(button.dataset.financeAction);
});

document.querySelector('#career-close-button').addEventListener('click', () => unlockBackground(careerDialog));
careerDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  unlockBackground(careerDialog);
});
document.querySelector('#career-groups').addEventListener('click', (event) => {
  const pageButton = event.target.closest('[data-career-page]');
  if (pageButton && !pageButton.disabled) {
    careerGroupPage += pageButton.dataset.careerPage === 'next' ? 1 : -1;
    renderCareerPicker();
    return;
  }
  const button = event.target.closest('[data-career-id]');
  if (!button || button.disabled || !controller) return;
  controller.selectCareer(button.dataset.careerId);
  unlockBackground(careerDialog);
  liveRegion.textContent = `${button.querySelector('strong').textContent} 일을 시작했습니다.`;
});

document.querySelector('.result-page-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-result-page-target]');
  if (button) setResultPage(button.dataset.resultPageTarget);
});
document.querySelector('.result-timeline-link').addEventListener('click', (event) => {
  event.preventDefault();
  setResultPage('curve');
});

document.querySelector('#money-panel').addEventListener('click', (event) => {
  const button = event.target.closest('[data-money-page]');
  if (button) setMoneyPage(button.dataset.moneyPage);
});
setMoneyPage('flow');

document.querySelectorAll('.life-sidebar').forEach((sidebar, sidebarIndex) => {
  const panels = [...sidebar.querySelectorAll(':scope > details')];
  const picker = document.createElement('select');
  picker.className = 'life-sidebar-picker';
  picker.setAttribute('aria-label', sidebarIndex === 0 ? '상태와 자산 항목' : '사람과 생활 항목');
  panels.forEach((panel, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = panel.querySelector('summary').textContent.replace(/^\s*\d+\s*/, '').trim();
    picker.append(option);
    panel.classList.toggle('is-mobile-active', panel.open);
  });
  sidebar.prepend(picker);
  picker.addEventListener('change', () => {
    panels.forEach((panel, index) => {
      const active = index === Number(picker.value);
      panel.classList.toggle('is-mobile-active', active);
      panel.open = active;
    });
  });
  sidebar.addEventListener('toggle', (event) => {
    const opened = event.target;
    if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
    if (window.innerWidth < 960 || (sidebar.classList.contains('life-sidebar-right') && window.innerHeight <= 900)) return;
    picker.value = String(panels.indexOf(opened));
    panels.forEach((panel) => panel.classList.toggle('is-mobile-active', panel === opened));
    sidebar.querySelectorAll('details[open]').forEach((details) => {
      if (details !== opened) details.open = false;
    });
  }, true);
});

document.querySelector('#new-life-button').addEventListener('click', () => {
  startBirthRoulette();
});
document.querySelector('#past-lives-button').addEventListener('click', showPastLives);
document.querySelector('#share-life-button').addEventListener('click', async () => {
  if (!lastCompletedSummary) return;
  const text = `5000만 분의 1 — ${lastCompletedSummary.birth}에서 태어나 ${lastCompletedSummary.age}세까지, ${lastCompletedSummary.longestCareer}의 삶을 살았습니다.`;
  try {
    if (navigator.share) await navigator.share({ title: '5000만 분의 1', text, url: location.href });
    else {
      await navigator.clipboard.writeText(`${text} ${location.href}`);
      liveRegion.textContent = '공유 문구를 복사했습니다.';
    }
  } catch {
    liveRegion.textContent = '공유하지 못했습니다.';
  }
});
document.querySelector('#intro-past-lives-button').addEventListener('click', showPastLives);
document.querySelector('#community-button').addEventListener('click', async () => {
  await refreshCommunity();
  showView('community');
});
document.querySelector('#memorial-button').addEventListener('click', async () => {
  await refreshCommunity();
  showView('memorial');
});
document.querySelectorAll('[data-network-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.networkTab;
    document.querySelectorAll('[data-network-tab]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.networkTab === target)));
    showView(target);
  });
});
document.querySelectorAll('.network-view').forEach((view) => {
  view.addEventListener('click', async (event) => {
    const memorial = view.dataset.network === 'memorial';
    const pageButton = event.target.closest('[data-network-page]');
    if (pageButton && !pageButton.disabled) {
      const key = memorial ? 'memorial' : 'community';
      networkPages[key] += pageButton.dataset.networkPage === 'next' ? 1 : -1;
      renderNetworkLists([...publicLivesById.values()]);
      return;
    }
    const panel = view.querySelector('[data-network-detail]');
    const open = event.target.closest('[data-public-life-open]');
    if (open) {
      view.querySelectorAll('.public-life-card').forEach((card) => card.classList.toggle('is-selected', card.dataset.publicLife === open.dataset.publicLifeOpen));
      renderPublicLifeDetail(panel, publicLivesById.get(open.dataset.publicLifeOpen), { memorial });
      return;
    }
    if (event.target.closest('[data-network-close]')) {
      view.querySelectorAll('.public-life-card').forEach((card) => card.classList.remove('is-selected'));
      renderPublicLifeDetail(panel, null);
      return;
    }
    const action = event.target.closest('[data-network-action]');
    if (action?.dataset.networkAction === 'retry') await refreshCommunity();
    if (action?.dataset.networkAction === 'start') startBirthRoulette();
  });
});
document.querySelectorAll('[data-network-back]').forEach((button) => {
  button.addEventListener('click', startBirthRoulette);
});
document.querySelector('#publish-life-button').addEventListener('click', async (event) => {
  const publishButton = event.currentTarget;
  if (!lastCompletedSummary || publishButton.disabled) return;
  publishButton.disabled = true;
  try {
    await community.publishLife(lastCompletedSummary);
    publishButton.textContent = '익명 공개됨';
    await refreshCommunity();
  } catch {
    publishButton.disabled = false;
    publishButton.textContent = '다시 공개하기';
    liveRegion.textContent = '공개하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  }
});
document.querySelector('#result-epitaph')?.addEventListener('input', (event) => {
  if (!lastCompletedSummary) return;
  const value = String(event.currentTarget.value ?? '').trim().slice(0, 120);
  lastCompletedSummary.epitaph = value;
  saveSummaryEpitaph(storage, lastCompletedSummary.id, value);
});
document.querySelector('#result-memorial-button')?.addEventListener('click', async () => {
  await refreshCommunity();
  showView('memorial');
});
document.querySelectorAll('[data-community-list], [data-memorial-list]').forEach((list) => {
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-public-life-id]');
    if (!button || button.disabled) return;
    button.disabled = true;
    const hidden = await community.hideLife(button.dataset.publicLifeId);
    if (hidden) {
      await refreshCommunity();
      liveRegion.textContent = '내 공개 기록을 숨겼습니다.';
    } else {
      button.disabled = false;
      liveRegion.textContent = '기록을 숨기지 못했습니다.';
    }
  });
});
document.querySelector('#close-past-lives-button').addEventListener('click', () => showView(controller ? 'result' : 'intro'));
document.querySelector('#clear-past-lives-button').addEventListener('click', () => {
  clearPastLives(storage);
  showPastLives();
});
document.querySelector('#past-lives-list').addEventListener('click', (event) => {
  const pageButton = event.target.closest('[data-past-page]');
  if (pageButton && !pageButton.disabled) {
    pastLivesPage += pageButton.dataset.pastPage === 'next' ? 1 : -1;
    showPastLives();
    return;
  }
  const button = event.target.closest('[data-past-life-id]');
  if (!button) return;
  deletePastLife(storage, button.dataset.pastLifeId);
  showPastLives();
});

document.querySelector('#life-map').addEventListener('click', (event) => {
  const button = event.target.closest('[data-age]');
  if (!button || !controller) return;
  const age = Number(button.dataset.age);
  const life = controller.getState();
  if (age > life.age) return;
  const memories = life.history.filter((item) => item.age === age);
  setMomentTitle(age, memories.at(-1)?.title ?? null);
  document.querySelector('#moment-copy').textContent = memories.map((item) => item.text).join(' · ') || `${age}세의 기록은 아직 비어 있습니다.`;
  liveRegion.textContent = `${age}세의 기록을 보고 있습니다.`;
});

document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  controller?.pause();
  updatePlayback();
  startBirthRoulette();
});

document.addEventListener('visibilitychange', () => controller?.setVisible(!document.hidden));
window.addEventListener('resize', () => {
  syncFigmaStageScale();
  updateLifeLogPage();
  if (document.body.dataset.view === 'past-lives') showPastLives();
  if (document.body.dataset.view === 'community' || document.body.dataset.view === 'memorial') renderNetworkLists([...publicLivesById.values()]);
});
window.addEventListener('beforeunload', () => {
  if (controller) saveCurrentLife(storage, controller.getState());
  community.destroy();
});

const savedLife = loadCurrentLife(storage);
controls.continue.hidden = !savedLife;
community.subscribe((lives) => renderNetworkLists(lives));
void refreshCommunity();
renderKoreaMap();

function leaveTitle() {
  if (document.body.dataset.view !== 'title') return;
  startBirthRoulette();
}
document.addEventListener('keydown', (event) => {
  if (document.body.dataset.view !== 'title' || event.isComposing) return;
  if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key)) return;
  event.preventDefault();
  leaveTitle();
});
views.title?.addEventListener('click', leaveTitle);
syncFigmaStageScale();
showView('title');
