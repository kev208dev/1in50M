import { defineDilemma, dilemmaChoice as choice } from './define-dilemma.js';
import * as c from './context.js';

// 부탁과 관계 — 누가 부탁하느냐에 따라 같은 선택도 무게가 달라집니다.
export const FAVOR_DILEMMAS = [
  defineDilemma({
    id: 'lend-money',
    ageRange: [22, 80],
    years: [1988, 9999],
    when: c.canSpend(1000000),
    title: '{who}의 돈 부탁',
    who: [
      { id: 'old-friend', label: '오랜 친구' },
      { id: 'cousin', label: '사촌' },
      { id: 'coworker', label: '같은 팀 동료', when: c.isEmployee },
      { id: 'neighbor', label: '친하게 지내던 이웃' },
      { id: 'classmate', label: '고등학교 동창' },
      { id: 'sibling', label: '형제자매', when: c.hasSiblings },
    ],
    details: [
      { id: 'hospital', text: '{who:이/가} 갑작스러운 병원비 때문에 100만 원만 빌려 달라고 연락했습니다.' },
      { id: 'rent', text: '{who:이/가} 이번 달 월세가 밀렸다며 100만 원을 부탁했습니다.' },
      { id: 'business', text: '{who:이/가} 가게 자금이 잠깐 모자란다며 100만 원을 빌려 줄 수 있느냐고 물었습니다.' },
      { id: 'tuition', text: '{who:이/가} 아이 학원비가 급하다며 조심스럽게 100만 원을 부탁했습니다.' },
      { id: 'debt', text: '{who:이/가} 다른 빚을 막아야 한다며 100만 원을 빌려 달라고 했습니다.' },
      { id: 'move', text: '{who:이/가} 이사 보증금이 조금 모자란다며 100만 원을 부탁했습니다.' },
    ],
    choices: [
      choice('lend', '빌려준다', '돌려받지 못할 수도 있다는 걸 알고 빌려줍니다.', { relationships: 2, happiness: -1 }, ['신뢰', '비용'], { cost: 1000000 }),
      choice('give-part', '일부만 보탠다', '갚지 않아도 되는 30만 원만 건넵니다.', { relationships: 1 }, ['조율'], { cost: 300000 }),
      choice('decline', '정중히 거절한다', '지금 내 형편을 솔직하게 설명합니다.', { relationships: -1, happiness: 1 }, ['경계', '유지']),
      choice('advise', '다른 방법을 알려 준다', '지원 제도나 상담 창구를 함께 찾아 줍니다.', { relationships: 1, knowledge: 1 }, ['관리']),
    ],
  }),
  defineDilemma({
    id: 'weekend-help',
    ageRange: [16, 75],
    title: '{who}의 주말 부탁',
    who: [
      { id: 'friend', label: '친구' },
      { id: 'neighbor', label: '옆집 이웃' },
      { id: 'relative', label: '친척 어른' },
      { id: 'coworker', label: '직장 동료', when: c.isEmployee },
      { id: 'classmate', label: '같은 반 친구', when: c.isSchoolStudent },
      { id: 'parent', label: '부모님', when: c.hasLivingParents },
    ],
    details: [
      { id: 'moving', text: '{who:이/가} 이번 주말 이사를 도와줄 수 있느냐고 물었습니다.' },
      { id: 'kimjang', text: '{who:이/가} 김장하는 날 일손이 모자란다며 와 달라고 했습니다.' },
      { id: 'shop', text: '{who:이/가} 가게를 하루만 봐 달라고 부탁했습니다.' },
      { id: 'pet', text: '{who:이/가} 여행 가는 동안 강아지를 맡아 달라고 했습니다.' },
      { id: 'hospital', text: '{who:이/가} 병원에 같이 가 줄 사람이 없다며 연락했습니다.' },
      { id: 'farm', text: '{who:이/가} 수확 철이라 하루만 일을 거들어 달라고 했습니다.' },
    ],
    choices: [
      choice('go', '기꺼이 돕는다', '쉬려던 주말을 내어 하루를 함께 보냅니다.', { relationships: 2, health: -1 }, ['관계']),
      choice('half-day', '반나절만 돕는다', '사정을 말하고 오전만 함께합니다.', { relationships: 1 }, ['조율']),
      choice('rest', '이번에는 쉰다', '미안하다고 말하고 밀린 피로를 풉니다.', { health: 1, happiness: 1, relationships: -1 }, ['휴식', '유지']),
    ],
  }),
];
