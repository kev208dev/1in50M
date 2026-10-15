import { KOREA_MAP_POINTS } from '../data/korea-map.js';
import { createRng } from './random.js';

const STAGES = [0, 7, 18, 30, 50, 70];
const HOUSEHOLDS = ['빠듯한 가정', '보통 가정', '안정된 가정', '여유 있는 가정'];
const SCHOOL = ['지역 학교', '일반계 학교', '직업 교육', '대학 진학'];
const WORK = ['서비스직', '기술직', '사무직', '자영업'];
const HOUSING = ['가족과 동거', '월세', '전세', '자가'];

function snapshot(peer, stage, rng) {
  if (stage === 0) return `${peer.household}에서 출생`;
  if (stage === 7) return `${rng.pick(SCHOOL)}에 다니기 시작함`;
  if (stage === 18) return `${rng.pick(SCHOOL)} 이후 진로를 정함`;
  if (stage === 30) return `${rng.pick(WORK)} · ${rng.pick(HOUSING)}`;
  if (stage === 50) return `${rng.pick(WORK)} · 가족과 생활을 조율함`;
  return `${rng.pick(HOUSING)}에서 노년을 준비함`;
}

export function createCohortPeers(profile, seed = profile?.id) {
  const rng = createRng(`${seed}:cohort`);
  const regions = KOREA_MAP_POINTS.filter((item) => item.code !== profile?.region?.code);
  const pool = [...regions];
  return Array.from({ length: 4 }, (_, index) => {
    const selectedIndex = rng.int(0, pool.length - 1);
    const region = pool.splice(selectedIndex, 1)[0];
    const peer = {
      id: `cohort-${index + 1}`,
      label: `${profile?.birthYear ?? ''}년생 ${index + 1}`,
      birthYear: Number(profile?.birthYear) || 2026,
      regionCode: region.code,
      region: region.label,
      household: HOUSEHOLDS[(index + rng.int(0, HOUSEHOLDS.length - 1)) % HOUSEHOLDS.length],
      snapshots: {},
    };
    for (const stage of STAGES) peer.snapshots[stage] = snapshot(peer, stage, rng);
    return peer;
  });
}

export function advanceCohort(peers, age) {
  const stage = STAGES.filter((value) => value <= Number(age)).at(-1) ?? 0;
  return (Array.isArray(peers) ? peers : []).map((peer) => ({
    ...structuredClone(peer),
    stage,
    snapshot: peer.snapshots?.[stage] ?? '',
  }));
}
