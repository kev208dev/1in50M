import { createBirthProfile, validateProfile } from './simulator.js';
import { readSavedState, writeSavedState, createHistoryState, canStartDraw, getSafeStorage } from './state.js';

const views = {
  intro: document.querySelector('#intro-view'),
  profile: document.querySelector('#profile-view'),
  future: document.querySelector('#future-view'),
};

const controls = {
  birth: document.querySelector('#birth-button'),
  reroll: document.querySelector('#reroll-button'),
  previous: document.querySelector('#previous-button'),
  accept: document.querySelector('#accept-button'),
  back: document.querySelector('#back-button'),
};

const liveRegion = document.querySelector('#live-region');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const storage = getSafeStorage(window);
let state = readSavedState(storage);
let isDrawing = false;

if (!validateProfile(state.current)) state = createHistoryState(null, null);
if (state.previous && !validateProfile(state.previous)) state.previous = null;

function setText(field, value) {
  document.querySelectorAll(`[data-field="${field}"]`).forEach((node) => {
    node.textContent = String(value ?? '—');
  });
}

function renderGuardians(guardians) {
  const container = document.querySelector('[data-field="guardians"]');
  container.replaceChildren(...guardians.map((guardian) => {
    const item = document.createElement('span');
    item.textContent = `${guardian.label} · ${guardian.occupation}`;
    return item;
  }));
}

function renderStat(name, value) {
  setText(`stat-${name}`, String(value).padStart(2, '0'));
  const meter = document.querySelector(`[data-meter="${name}"]`);
  meter.style.setProperty('--value', `${value}%`);
  meter.parentElement.setAttribute('aria-label', `${value}점`);
}

function renderProfile(profile) {
  if (!validateProfile(profile)) return;
  const idShort = profile.id.split('-').at(-1);
  setText('id-short', idShort);
  setText('id', profile.id);
  setText('birth-year', profile.birthYear);
  setText('region-code', profile.region.code);
  setText('region', profile.region.name);
  setText('district', profile.district);
  setText('summary', profile.summary);
  setText('family-type', profile.familyType);
  setText('finance', profile.finance);
  setText('housing', profile.housing);
  setText('siblings', profile.siblings);
  setText('location-chip', `${profile.region.short} · ${profile.district}`);
  setText('future-location', `${profile.region.name} ${profile.district}`);
  setText('future-birth-summary', `${profile.birthYear}년 ${profile.region.short}, ${profile.familyType}`);
  renderGuardians(profile.guardians);
  ['health', 'stability', 'education', 'relationships'].forEach((name) => renderStat(name, profile.stats[name]));
}

function showView(name) {
  Object.entries(views).forEach(([key, view]) => {
    view.hidden = key !== name;
  });
  document.body.dataset.view = name;
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

function setControlsDisabled(disabled) {
  controls.birth.disabled = disabled;
  controls.reroll.disabled = disabled;
  controls.accept.disabled = disabled;
  controls.previous.disabled = disabled || !state.previous;
  document.body.classList.toggle('is-drawing', disabled);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function drawLife() {
  if (!canStartDraw(isDrawing)) return;
  isDrawing = true;
  showView('profile');
  setControlsDisabled(true);
  views.profile.classList.add('is-shuffling');

  const duration = reduceMotion.matches ? 0 : 900;
  const startedAt = performance.now();
  if (duration > 0) {
    while (performance.now() - startedAt < duration) {
      renderProfile(createBirthProfile());
      await wait(90);
    }
  }

  const nextProfile = createBirthProfile();
  state = createHistoryState(nextProfile, state.current);
  writeSavedState(storage, state);
  renderProfile(nextProfile);
  views.profile.classList.remove('is-shuffling');
  isDrawing = false;
  setControlsDisabled(false);
  liveRegion.textContent = `${nextProfile.region.name} ${nextProfile.district}에서 새로운 인생이 시작되었습니다.`;
}

function restorePrevious() {
  if (isDrawing || !state.previous) return;
  state = createHistoryState(state.previous, state.current);
  writeSavedState(storage, state);
  renderProfile(state.current);
  controls.previous.disabled = false;
  liveRegion.textContent = `이전 인생, ${state.current.region.name} ${state.current.district}을 다시 불러왔습니다.`;
}

controls.birth.addEventListener('click', drawLife);
controls.reroll.addEventListener('click', drawLife);
controls.previous.addEventListener('click', restorePrevious);
controls.accept.addEventListener('click', () => {
  if (!state.current || isDrawing) return;
  renderProfile(state.current);
  showView('future');
  liveRegion.textContent = '이 인생을 선택했습니다. 다음 성장 단계를 확인하세요.';
});
controls.back.addEventListener('click', () => {
  showView('profile');
  controls.reroll.focus();
});

document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  showView('intro');
  controls.birth.focus();
});

if (state.current) {
  renderProfile(state.current);
  showView('profile');
  controls.previous.disabled = !state.previous;
} else {
  showView('intro');
  controls.previous.disabled = true;
}
