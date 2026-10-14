import { LGBTQ_SIMULATION_RATE, IDENTITY_VARIANTS } from '../data/identity.js';
import { hashSeed } from './random.js';

const unit = (seed, salt) => hashSeed(`${seed}:${salt}`) / 0x100000000;

export function createIdentityArc(seed) {
  if (unit(seed, 'identity-eligible') >= LGBTQ_SIMULATION_RATE) {
    return { assigned: null, label: null, discoveryAge: null, discovered: false, acknowledged: false };
  }
  const total = IDENTITY_VARIANTS.reduce((sum, item) => sum + item.weight, 0);
  let roll = unit(seed, 'identity-variant') * total;
  const selected = IDENTITY_VARIANTS.find((item) => ((roll -= item.weight) < 0))
    ?? IDENTITY_VARIANTS.at(-1);
  return {
    assigned: selected.id,
    label: selected.label,
    discoveryAge: 16 + Math.floor(unit(seed, 'identity-age') * 9),
    discovered: false,
    acknowledged: false,
  };
}

export function revealIdentityIfDue(life) {
  const identity = life.identity;
  if (!identity?.assigned || identity.discovered || life.age < identity.discoveryAge) return life;
  return {
    ...life,
    identity: { ...identity, discovered: true },
    pendingIdentityDiscovery: true,
    history: [...life.history, {
      id: 'identity-discovery',
      age: life.age,
      year: life.year,
      type: 'identity-discovery',
      text: `가상 인물이 자신의 ${identity.label} 정체성을 더 분명히 알게 되었습니다.`,
    }],
    milestones: [...life.milestones, {
      age: life.age,
      type: 'identity-discovery',
      label: '정체성 발견',
    }],
  };
}

export function acknowledgeIdentityDiscovery(life) {
  if (!life.pendingIdentityDiscovery) return life;
  return {
    ...life,
    pendingIdentityDiscovery: false,
    identity: { ...life.identity, acknowledged: true },
  };
}
