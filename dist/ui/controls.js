import { advanceYear, normalizeLife, setFocus as applyFocus } from '../engine/life.js';
import { getDecision, applyDecision, chooseAutomatically } from '../engine/decisions.js';
import { getCareerOffers, acceptCareer, advanceCareer } from '../engine/career.js';
import { calculateAnnualEconomy } from '../engine/economy.js';
import { selectAnnualEvents, applyEvent } from '../engine/events.js';
import { acknowledgeIdentityDiscovery } from '../engine/identity.js';
import { updateRelationships } from '../engine/relationships.js';

const INTERVALS = { 1: 8000, 2: 4000, 4: 2000, 8: 1000, 16: 500 };

function browserClock() {
  return {
    now: () => Date.now(),
    schedule: (callback, delay) => globalThis.setTimeout(callback, delay),
    cancel: (id) => globalThis.clearTimeout(id),
  };
}

export function createSimulationController({
  clock = browserClock(),
  initialLife,
  onState = () => {},
  onDecision = () => {},
  onIdentityDiscovery = () => {},
  onComplete = () => {},
} = {}) {
  let life = normalizeLife(initialLife);
  let speed = 1;
  let playing = false;
  let visible = true;
  let resumeWhenVisible = false;
  let autoDecision = false;
  let timerId = null;
  let tickCounter = 0;

  function cancelTimer() {
    if (timerId === null) return;
    clock.cancel(timerId);
    timerId = null;
  }

  function publish() {
    onState(structuredClone(life));
  }

  function setPendingDecision() {
    const decision = getDecision(life);
    if (!decision) return false;
    life = normalizeLife({ ...life, pendingDecisionId: decision.id });
    if (autoDecision) {
      life = chooseAutomatically(life, decision.id);
      publish();
      return false;
    }
    playing = false;
    cancelTimer();
    publish();
    onDecision(decision, structuredClone(life));
    return true;
  }

  function setPendingIdentityDiscovery() {
    if (!life.pendingIdentityDiscovery) return false;
    playing = false;
    cancelTimer();
    publish();
    onIdentityDiscovery(structuredClone(life));
    return true;
  }

  function processYear() {
    if (life.status !== 'living' || life.pendingDecisionId) return;
    if (autoDecision && life.age >= 25 && !life.career.careerId) {
      const offer = getCareerOffers(life, 100).find((item) => item.eligible);
      if (offer) life = acceptCareer(life, offer.career.id);
    }
    tickCounter += 1;
    life = advanceYear(life, `controller-${life.age}-${tickCounter}`);
    life = advanceCareer(life);
    life = calculateAnnualEconomy(life);
    for (const event of selectAnnualEvents(life)) life = applyEvent(life, event.id);
    life = updateRelationships(life);
    publish();
    if (life.status === 'review') {
      playing = false;
      cancelTimer();
      onComplete(structuredClone(life));
      return;
    }
    if (setPendingIdentityDiscovery()) return;
    setPendingDecision();
  }

  function scheduleNext() {
    cancelTimer();
    if (!playing || !visible || life.pendingDecisionId || life.pendingIdentityDiscovery || life.status !== 'living') return;
    timerId = clock.schedule(() => {
      timerId = null;
      processYear();
      scheduleNext();
    }, INTERVALS[speed]);
  }

  const initialDecision = life.pendingIdentityDiscovery ? null : getDecision(life);
  if (initialDecision) life = normalizeLife({ ...life, pendingDecisionId: initialDecision.id });

  return {
    getState: () => structuredClone(life),
    isPlaying: () => playing,
    getSpeed: () => speed,
    isAutoDecision: () => autoDecision,
    play() {
      if (life.status !== 'living' || life.pendingDecisionId || life.pendingIdentityDiscovery) return false;
      playing = true;
      scheduleNext();
      return true;
    },
    pause() {
      playing = false;
      resumeWhenVisible = false;
      cancelTimer();
    },
    setSpeed(nextSpeed) {
      const value = Number(nextSpeed);
      if (!INTERVALS[value]) return speed;
      speed = value;
      if (playing) scheduleNext();
      return speed;
    },
    skipToDecision() {
      playing = false;
      cancelTimer();
      let guard = 0;
      while (life.status === 'living' && !life.pendingDecisionId && !life.pendingIdentityDiscovery && guard < 91) {
        processYear();
        guard += 1;
      }
      return structuredClone(life);
    },
    acknowledgeIdentity() {
      if (!life.pendingIdentityDiscovery) return structuredClone(life);
      life = normalizeLife(acknowledgeIdentityDiscovery(life));
      const decision = getDecision(life);
      if (decision) life = normalizeLife({ ...life, pendingDecisionId: decision.id });
      publish();
      return structuredClone(life);
    },
    setAutoDecision(value) {
      autoDecision = Boolean(value);
      if (autoDecision && life.pendingDecisionId) {
        life = chooseAutomatically(life, life.pendingDecisionId);
        publish();
      }
      return autoDecision;
    },
    setFocus(focusId) {
      life = applyFocus(life, focusId);
      publish();
      return structuredClone(life);
    },
    answerDecision(choiceId) {
      if (!life.pendingDecisionId) return structuredClone(life);
      life = applyDecision(life, life.pendingDecisionId, choiceId);
      publish();
      return structuredClone(life);
    },
    getCareerOffers(limit = 6) {
      return getCareerOffers(life, limit);
    },
    selectCareer(careerId) {
      const offer = getCareerOffers(life, 100).find((item) => item.career.id === careerId);
      if (!offer?.eligible) throw new RangeError(offer?.reason || '현재 선택할 수 없는 직업입니다.');
      life = acceptCareer(life, careerId);
      publish();
      return structuredClone(life);
    },
    setVisible(value) {
      const nextVisible = Boolean(value);
      if (!nextVisible && visible) {
        resumeWhenVisible = playing;
        visible = false;
        playing = false;
        cancelTimer();
        return;
      }
      if (nextVisible && !visible) {
        visible = true;
        if (resumeWhenVisible && !life.pendingDecisionId && !life.pendingIdentityDiscovery && life.status === 'living') {
          playing = true;
          resumeWhenVisible = false;
          scheduleNext();
        }
      }
    },
    destroy() {
      playing = false;
      resumeWhenVisible = false;
      cancelTimer();
    },
  };
}
