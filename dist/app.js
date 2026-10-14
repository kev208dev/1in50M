import { validateProfile } from './simulator.js';
import { CAREER_GROUPS } from './data/careers.js';
import { createBirthSlotResult, profileFromSlotResult } from './engine/birth-slot.js';
import { createCompanionLives, advanceCompanionLives } from './engine/companions.js';
import { normalizeRuntimeSettings, resolveBirthYear } from './data/runtime-settings.js';
import { createLife } from './engine/life.js';
import { getDecision, getChoices } from './engine/decisions.js';
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
import {
  renderLife,
  renderDecision,
  renderIdentityDiscovery,
  renderResult,
  formatWon,
} from './ui/render.js';
import {
  renderBirthSlot,
  renderBirthCertificate,
  renderCompanionLives,
  slotDuration,
} from './ui/birth-slot.js';

const viewNames = ['intro', 'profile', 'future', 'life', 'result', 'past-lives'];
const views = Object.fromEntries(viewNames.map((name) => [name, document.querySelector(`#${name}-view`)]));
const storage = getSafeStorage(window);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const liveRegion = document.querySelector('#live-region');
const main = document.querySelector('main');

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
const agencyDialog = document.querySelector('#agency-dialog');
const careerDialog = document.querySelector('#career-dialog');
let candidateProfile = null;
let candidateResult = null;
let candidateCompanions = [];
let runtimeSettings = normalizeRuntimeSettings();
let controller = null;
let isDrawing = false;
let lastFocused = null;
let spinCounter = 0;
let pendingAgencyResolution = null;

function setText(field, value) {
  document.querySelectorAll(`[data-field="${field}"]`).forEach((node) => {
    node.textContent = String(value ?? '—');
  });
}

function renderProfileContext(profile) {
  if (!validateProfile(profile)) return;
  setText('future-location', `${profile.region.name} ${profile.district}`);
  setText('future-birth-summary', `${profile.birthYear}년 ${profile.region.short}, ${profile.familyType}`);
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
  candidateCompanions = createCompanionLives(candidateProfile, seed);
  renderBirthSlot(document.querySelector('#birth-slot'), candidateResult, { spinning: !reduceMotion.matches });
  renderBirthCertificate(document.querySelector('#birth-certificate-details'), candidateResult);
  renderCompanionLives(document.querySelector('#companion-preview'), candidateCompanions);
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

function updateMoment(life) {
  document.querySelector('#moment-age').textContent = String(life.age);
  const latest = life.history.at(-1);
  document.querySelector('#moment-copy').textContent = latest?.text ?? '새로운 삶이 시작되었습니다.';
  controls.career.hidden = life.age < 19 || Boolean(life.career.careerId) || life.status !== 'living';
}

function renderCurrentLife(life) {
  renderLife(views.life, life);
  renderCompanionLives(document.querySelector('#companion-lives'), advanceCompanionLives(life.companions ?? [], life.age));
  updateMoment(life);
  updatePlayback();
  saveCurrentLife(storage, life);
  controls.continue.hidden = false;
}

function unlockBackground(dialog, focus = true) {
  main.inert = false;
  if (dialog.open) dialog.close();
  if (focus && lastFocused?.isConnected) lastFocused.focus();
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
  renderResult(views.result, createLifeSummary(life));
  showView('result');
  liveRegion.textContent = `${life.age}세의 생애가 회고 단계에 도착했습니다.`;
}

function startLife(life) {
  controller?.destroy();
  controller = createSimulationController({
    initialLife: life,
    onState: renderCurrentLife,
    onDecision: openDecision,
    onIdentityDiscovery: openIdentityDiscovery,
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
  life.companions = structuredClone(candidateCompanions);
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
  showView('intro');
});
document.querySelector('#past-lives-button').addEventListener('click', showPastLives);
document.querySelector('#intro-past-lives-button').addEventListener('click', showPastLives);
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
  document.querySelector('#moment-age').textContent = String(age);
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
window.addEventListener('beforeunload', () => {
  if (controller) saveCurrentLife(storage, controller.getState());
});

const savedLife = loadCurrentLife(storage);
controls.continue.hidden = !savedLife;
showView('intro');
