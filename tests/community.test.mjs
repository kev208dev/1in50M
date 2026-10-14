import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityClient, toPublicLife } from '../dist/community.js';
import { createLifeSummary } from '../dist/engine/summary.js';
import { makeLifeAtAge, memoryStorage } from './support/life-fixtures.mjs';

test('설정이 없으면 샘플 기록이 있는 오프라인 모드로 동작한다', async () => {
  const client = createCommunityClient({}, { storage: memoryStorage() });
  assert.equal((await client.listPublicLives()).length > 0, true);
  assert.deepEqual(await client.connectPresence(), { mode: 'offline', count: 1 });
  client.destroy();
});

test('공개 삶은 전체 프로필·seed·상세 기록을 포함하지 않는다', () => {
  const summary = createLifeSummary(makeLifeAtAge(90));
  const publicLife = toPublicLife({ ...summary, profile: { name: '비공개' }, history: ['비공개'] });
  for (const key of ['profile', 'history', 'seed', 'finalStats', 'statChanges']) {
    assert.equal(key in publicLife, false, key);
  }
  assert.ok(publicLife.age >= 0);
  assert.ok(publicLife.career);
});

test('오프라인에서 공개한 삶은 같은 브라우저 기록에 추가하고 숨길 수 있다', async () => {
  const storage = memoryStorage();
  const client = createCommunityClient({}, { storage });
  const published = await client.publishLife(createLifeSummary(makeLifeAtAge(64, { seed: 'public-local' })));
  assert.ok((await client.listPublicLives()).some((item) => item.id === published.id));
  assert.equal(await client.hideLife(published.id), true);
  assert.equal((await client.listPublicLives()).some((item) => item.id === published.id), false);
});

test('구독자는 오프라인 기록 변경도 알 수 있다', async () => {
  const client = createCommunityClient({}, { storage: memoryStorage() });
  let updates = 0;
  const unsubscribe = client.subscribe(() => { updates += 1; });
  await client.publishLife(createLifeSummary(makeLifeAtAge(77, { seed: 'subscriber' })));
  assert.equal(updates, 1);
  unsubscribe();
});
