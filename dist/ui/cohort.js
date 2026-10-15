import { advanceCohort } from '../engine/cohort.js';

export function renderCohort(root, peers, age = 0) {
  if (!root) return [];
  const current = advanceCohort(peers, age);
  const documentRef = root.ownerDocument ?? document;
  root.replaceChildren(...current.map((peer) => {
    const card = documentRef.createElement('article');
    card.className = 'cohort-card';
    card.dataset.cohortId = peer.id;
    const heading = documentRef.createElement('div');
    const region = documentRef.createElement('strong');
    region.textContent = peer.region;
    const household = documentRef.createElement('small');
    household.textContent = peer.household;
    heading.append(region, household);
    const text = documentRef.createElement('p');
    text.textContent = peer.snapshot;
    const stage = documentRef.createElement('span');
    stage.textContent = `${peer.stage}세 시점`;
    card.append(heading, text, stage);
    return card;
  }));
  return current;
}
