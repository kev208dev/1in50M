import { validateProfile } from './simulator.js';
import { CAREER_GROUPS } from './data/careers.js';
import { createBirthSlotResult, profileFromSlotResult } from './engine/birth-slot.js';
import { normalizeRuntimeSettings, resolveBirthYear } from './data/runtime-settings.js';
import { mapRegionState } from './data/korea-map.js';
import { createKoreaMap } from './ui/korea-map.js';
import { detectBigEvents, renderBigEvent } from './ui/big-event.js';
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
  listPastLives,
  deletePastLife,
  clearPastLives,
} from './storage.js';
import { createSimulationController } from './ui/controls.js';
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
  fitFigmaStage,
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
  reroll: document.querySelector('#slot-spin-button'),
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
const eventDialog = document.querySelector('#event-dialog');
const sourceDialog = document.querySelector('#source-dialog');
const blockingDialogs = [decisionDialog, identityDialog, reflectionDialog, agencyDialog, careerDialog, eventDialog, sourceDialog];
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

function syncFigmaStageScale() {
  document.documentElement.style.setProperty('--figma-stage-scale', String(fitFigmaStage(window.innerWidth, window.innerHeight)));
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
  publicLivesById = new Map(lives.map((life) => [life.id, life]));
  renderPublicLives(document.querySelector('[data-community-list]'), lives);
  renderPublicLives(document.querySelector('[data-memorial-list]'), lives, { memorial: true });
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
};

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
  controls.reroll.disabled = disabled;
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
  showView('profile');
  runtimeSettings = readRuntimeSettings();
  const seed = nextBirthSeed();
  const birthYear = resolveBirthYear(runtimeSettings, seed, new Date().getFullYear());
  candidateResult = createBirthSlotResult(seed, birthYear);
  candidateProfile = profileFromSlotResult(candidateResult);
  renderBirthSlot(document.querySelector('#birth-slot'), candidateResult, { spinning: !reduceMotion.matches });
  renderBirthCertificate(document.querySelector('#birth-certificate-details'), candidateResult);
  renderProfileContext(candidateProfile);
  await wait(slotDuration(reduceMotion.matches));
  renderBirthSlot(document.querySelector('#birth-slot'), candidateResult);
  setDrawDisabled(false);
  controls.accept.focus({ preventScroll: true });
  liveRegion.textContent = `${candidateProfile.name.full}, ${candidateProfile.region.name} ${candidateProfile.district} 출생 조건이 정해졌습니다.`;
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
    if (resumeAfterBigEvents && controller.getState().status === 'living' && !controller.getState().pendingDecisionId) {
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
  updateMoment(life);
  updatePlayback();
  saveCurrentLife(storage, life);
  controls.continue.hidden = false;
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
  container.replaceChildren(...CAREER_GROUPS.map((group) => {
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
  }));
}

function openCareerPicker() {
  if (!controller || careerDialog.open) return;
  controller.pause();
  updatePlayback();
  lastFocused = document.activeElement;
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
    list.replaceChildren(...lives.map((life) => {
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
    }));
  }
  showView('past-lives');
}

controls.birth.addEventListener('click', spinBirthSlot);
controls.reroll.addEventListener('click', spinBirthSlot);
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

document.querySelector('#life-panel-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-life-panel-target]');
  if (!button) return;
  const mobilePanel = button.dataset.lifePanelTarget;
  views.life.dataset.mobilePanel = mobilePanel;
  document.querySelectorAll('[data-life-panel-target]').forEach((item) => {
    item.setAttribute('aria-pressed', String(item === button));
  });
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
  lastFocused = document.activeElement;
  main.inert = true;
  sourceDialog.showModal();
  document.querySelector('#source-title').focus();
});
['#source-close-button', '#source-ok-button'].forEach((selector) => {
  document.querySelector(selector).addEventListener('click', () => unlockBackground(sourceDialog));
});
sourceDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  unlockBackground(sourceDialog);
});

document.querySelector('#career-close-button').addEventListener('click', () => unlockBackground(careerDialog));
careerDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  unlockBackground(careerDialog);
});
document.querySelector('#career-groups').addEventListener('click', (event) => {
  const button = event.target.closest('[data-career-id]');
  if (!button || button.disabled || !controller) return;
  controller.selectCareer(button.dataset.careerId);
  unlockBackground(careerDialog);
  liveRegion.textContent = `${button.querySelector('strong').textContent} 일을 시작했습니다.`;
});

document.querySelector('#same-life-button').addEventListener('click', () => {
  if (!controller) return;
  const previous = controller.getState();
  startLife(createLife(previous.profile, `${previous.profile.id}-again-${Date.now()}`));
});
document.querySelector('#new-life-button').addEventListener('click', () => {
  candidateProfile = null;
  candidateResult = null;
  renderKoreaMap();
  showView('intro');
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
    if (action?.dataset.networkAction === 'start') showView('intro');
  });
});
document.querySelectorAll('[data-network-back]').forEach((button) => {
  button.addEventListener('click', () => showView('intro'));
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
  controls.continue.hidden = !loadCurrentLife(storage);
  showView('intro');
});

document.addEventListener('visibilitychange', () => controller?.setVisible(!document.hidden));
window.addEventListener('resize', syncFigmaStageScale);
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
  showView('intro');
  document.querySelector('#birth-button')?.focus({ preventScroll: true });
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
