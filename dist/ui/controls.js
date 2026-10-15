import { advanceYear, normalizeLife, setFocus as applyFocus } from '../engine/life.js';
import { getDecision, applyUserDecision, chooseAutomatically } from '../engine/decisions.js';
import { getCareerOffers, acceptCareer, advanceCareer } from '../engine/career.js';
import { calculateAnnualEconomy } from '../engine/economy.js';
import { selectAnnualEvents, applyEvent } from '../engine/events.js';
import { acknowledgeIdentityDiscovery } from '../engine/identity.js';
import { updateRelationships } from '../engine/relationships.js';
import { advancePortfolio, applyFinancialAction, purchaseLotteryTicket, revealLotteryBroadcast } from '../engine/finance.js';
import { advanceBusiness } from '../engine/business.js';
import { tickInterval } from '../data/runtime-settings.js';
import { evaluateSurvival } from '../engine/mortality.js';
import { getReflection, applyReflection } from '../data/reflections.js';
import { advanceWellbeing } from '../engine/wellbeing.js';
import { selectEraEvent, applyEraEvent } from '../engine/era-events.js';
import { ensureServiceAssessment } from '../engine/service.js';

const INTERVALS = { 1: 8000, 2: 4000, 4: 2000, 8: 1000, 12: 667, 16: 500 };

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
  onReflection = () => {},
  onAgencyOverride = () => {},
  onComplete = () => {},
} = {}) {
  let life = normalizeLife(ensureServiceAssessment(normalizeLife(initialLife)));
  let speed = 1;
  let playing = false;
  let visible = true;
  let resumeWhenVisible = false;
  let resumeAfterInterruption = false;
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

  function resumeInterruptedPlayback() {
    if (!resumeAfterInterruption || !visible || life.pendingDecisionId || life.pendingIdentityDiscovery || life.pendingReflectionId || life.status !== 'living') {
      return false;
    }
    resumeAfterInterruption = false;
    playing = true;
    scheduleNext();
    return true;
  }

  function setPendingDecision() {
    life = normalizeLife(ensureServiceAssessment(life));
    const decision = getDecision(life);
    if (!decision) return false;
    life = normalizeLife({ ...life, pendingDecisionId: decision.id });
    if (autoDecision) {
      life = chooseAutomatically(life, decision.id);
      publish();
      return false;
    }
    resumeAfterInterruption ||= playing;
    playing = false;
    cancelTimer();
    publish();
    onDecision(decision, structuredClone(life));
    return true;
  }

  function setPendingIdentityDiscovery() {
    if (!life.pendingIdentityDiscovery) return false;
    resumeAfterInterruption ||= playing;
    playing = false;
    cancelTimer();
    publish();
    onIdentityDiscovery(structuredClone(life));
    return true;
  }

  function setPendingReflection() {
    const item = getReflection(life);
    if (!item) return false;
    life = normalizeLife({ ...life, pendingReflectionId: item.id });
    resumeAfterInterruption ||= playing;
    playing = false;
    cancelTimer();
    publish();
    onReflection(item, structuredClone(life));
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
    life = advancePortfolio(life);
    life = advanceBusiness(life);
    life = calculateAnnualEconomy(life);
    life = normalizeLife(applyEraEvent(life, selectEraEvent(life)));
    for (const event of selectAnnualEvents(life)) life = applyEvent(life, event.id);
    life = updateRelationships(life);
    life = normalizeLife(advanceWellbeing(life));
    life = normalizeLife(ensureServiceAssessment(life));
    if (life.status === 'living') {
      const survival = evaluateSurvival(life);
      if (!survival.survived) {
        life = normalizeLife({
          ...life,
          status: 'review',
          endedReason: survival.cause ?? 'mortality',
          history: [...life.history, {
            id: `life-end-${life.age}`,
            age: life.age,
            year: life.year,
            type: 'review',
            text: survival.cause === 'self-harm'
              ? '오랜 정신건강 위기 끝에 이 삶이 너무 일찍 멈췄습니다.'
              : survival.cause === 'caffeine-cardiac'
                ? '수면 부족과 고카페인 부담이 겹친 건강 위기 뒤 이 삶이 멈췄습니다.'
                : '이 삶의 시간이 여기에서 조용히 멈췄습니다.',
          }],
          milestones: [...life.milestones, { age: life.age, type: 'review', label: '삶의 마지막 해' }],
        });
      }
    }
    publish();
    if (life.status === 'review') {
      playing = false;
      cancelTimer();
      onComplete(structuredClone(life));
      return;
    }
    if (setPendingReflection()) return;
    if (setPendingIdentityDiscovery()) return;
    setPendingDecision();
  }

  function scheduleNext() {
    cancelTimer();
    if (!playing || !visible || life.pendingDecisionId || life.pendingIdentityDiscovery || life.pendingReflectionId || life.status !== 'living') return;
    timerId = clock.schedule(() => {
      timerId = null;
      processYear();
      scheduleNext();
    }, life.runtimeSettings ? tickInterval(life.runtimeSettings, speed) : INTERVALS[speed]);
  }

  const initialReflection = life.pendingIdentityDiscovery ? null : getReflection(life);
  if (initialReflection) life = normalizeLife({ ...life, pendingReflectionId: initialReflection.id });
  const initialDecision = life.pendingIdentityDiscovery || life.pendingReflectionId ? null : getDecision(life);
  if (initialDecision) life = normalizeLife({ ...life, pendingDecisionId: initialDecision.id });
  else if (life.pendingDecisionId) life = normalizeLife({ ...life, pendingDecisionId: null });

  return {
    getState: () => structuredClone(life),
    isPlaying: () => playing,
    getSpeed: () => speed,
    isAutoDecision: () => autoDecision,
    play() {
      if (life.status !== 'living' || life.pendingDecisionId || life.pendingIdentityDiscovery || life.pendingReflectionId) return false;
      playing = true;
      scheduleNext();
      return true;
    },
    pause() {
      playing = false;
      resumeWhenVisible = false;
      resumeAfterInterruption = false;
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
      resumeAfterInterruption = true;
      cancelTimer();
      let guard = 0;
      while (life.status === 'living' && !life.pendingDecisionId && !life.pendingIdentityDiscovery && !life.pendingReflectionId && guard < 91) {
        processYear();
        guard += 1;
      }
      return structuredClone(life);
    },
    answerReflection(choiceId) {
      if (!life.pendingReflectionId) return structuredClone(life);
      life = applyReflection(life, choiceId);
      publish();
      if (setPendingIdentityDiscovery()) return structuredClone(life);
      const decision = getDecision(life);
      if (decision) {
        life = normalizeLife({ ...life, pendingDecisionId: decision.id });
        publish();
        onDecision(decision, structuredClone(life));
        return structuredClone(life);
      }
      resumeInterruptedPlayback();
      return structuredClone(life);
    },
    acknowledgeIdentity() {
      if (!life.pendingIdentityDiscovery) return structuredClone(life);
      life = normalizeLife(acknowledgeIdentityDiscovery(life));
      const decision = getDecision(life);
      if (decision) life = normalizeLife({ ...life, pendingDecisionId: decision.id });
      publish();
      resumeInterruptedPlayback();
      return structuredClone(life);
    },
    setAutoDecision(value) {
      autoDecision = Boolean(value);
      if (autoDecision && life.pendingDecisionId) {
        life = chooseAutomatically(life, life.pendingDecisionId);
        publish();
        resumeInterruptedPlayback();
      }
      return autoDecision;
    },
    setFocus(focusId) {
      life = applyFocus(life, focusId);
      publish();
      return structuredClone(life);
    },
    performFinancialAction(action) {
      if (life.status !== 'living') return structuredClone(life);
      const before = life;
      life = action.type === 'lottery-ticket'
        ? purchaseLotteryTicket(life, action)
        : applyFinancialAction(life, action);
      const labels = {
        buy: action.asset === 'stocks' ? '주식을 매수했습니다.' : action.asset === 'crypto' ? '비트코인을 매수했습니다. 도파민이 올라갑니다.' : '금융 자산을 매수했습니다.',
        sell: action.asset === 'stocks' ? '주식을 매도했습니다.' : action.asset === 'crypto' ? '비트코인을 매도했습니다.' : '금융 자산을 매도했습니다.',
        property: `${action.region ?? '선택한 지역'}의 부동산을 매입했습니다.`,
        vehicle: '자동차를 구매했습니다. 차량 가치와 매달 유지비가 반영됩니다.',
        'lottery-ticket': '복권을 샀습니다. 결과는 로또 방송을 확인할 때 공개됩니다.',
      };
      life = normalizeLife({
        ...life,
        history: [...before.history, {
          id: `finance-${life.year}-${life.economy.transactions.length}`,
          age: life.age,
          year: life.year,
          type: 'finance',
          text: labels[action.type] ?? '금융 거래를 완료했습니다.',
        }],
      });
      publish();
      return structuredClone(life);
    },
    revealLotteryBroadcast() {
      if (!life.economy.pendingLotteryDraw) return structuredClone(life);
      const next = revealLotteryBroadcast(life);
      const transactionItem = next.economy.transactions.at(-1);
      const resultText = transactionItem.payout > 0
        ? `로또 방송 결과 ${transactionItem.tier === 'jackpot' ? '1등에 당첨되었습니다' : `${transactionItem.payout.toLocaleString('ko-KR')}원을 받았습니다`}.`
        : '로또 방송 결과, 이번에는 당첨되지 않았습니다.';
      life = normalizeLife({
        ...next,
        history: [...life.history, {
          id: `lottery-broadcast-${life.year}-${next.economy.transactions.length}`,
          age: life.age,
          year: life.year,
          type: 'finance',
          text: resultText,
        }],
      });
      publish();
      return structuredClone(life);
    },
    answerDecision(choiceId) {
      if (!life.pendingDecisionId) return structuredClone(life);
      const resolution = applyUserDecision(life, life.pendingDecisionId, choiceId);
      life = resolution.life;
      publish();
      if (resolution.overridden) onAgencyOverride({ ...resolution, life: structuredClone(life) });
      else resumeInterruptedPlayback();
      return structuredClone(life);
    },
    acknowledgeInterruption() {
      resumeInterruptedPlayback();
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
        if (resumeWhenVisible && !life.pendingDecisionId && !life.pendingIdentityDiscovery && !life.pendingReflectionId && life.status === 'living') {
          playing = true;
          resumeWhenVisible = false;
          scheduleNext();
        }
      }
    },
    destroy() {
      playing = false;
      resumeWhenVisible = false;
      resumeAfterInterruption = false;
      cancelTimer();
    },
  };
}
