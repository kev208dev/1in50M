import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityClient, filterPublicLives, toPublicLife } from '../dist/community.js';
import { renderPublicLives } from '../dist/ui/render.js';
import { createLifeSummary } from '../dist/engine/summary.js';
import { makeLifeAtAge, memoryStorage } from './support/life-fixtures.mjs';

test('설정과 로컬 기록이 없으면 공개 삶은 빈 배열이다', async () => {
  const client = createCommunityClient({}, { storage: memoryStorage() });
  assert.deepEqual(await client.listPublicLives(), []);
  assert.deepEqual(await client.connectPresence(), { mode: 'offline', count: 1 });
  client.destroy();
});

test('추모관은 90세 이전에 종료된 공개 기록만 보여준다', () => {
  const lives = [{ id: 'early', age: 54 }, { id: 'complete', age: 90 }];
  assert.deepEqual(filterPublicLives(lives, { memorial: true }).map((life) => life.id), ['early']);
});

test('공개 기록이 없으면 빈 상태가 렌더링된다', () => {
  const documentRef = {
    createElement(tagName) {
      return {
        tagName,
        className: '',
        children: [],
        textContent: '',
        dataset: {},
        append(...children) {
          this.children.push(...children);
          this.textContent += children.map((child) => child.textContent ?? '').join('');
        },
        replaceChildren(...children) {
          this.children = children;
          this.textContent = children.map((child) => child.textContent ?? '').join('');
        },
      };
    },
  };
  const root = documentRef.createElement('div');
  root.ownerDocument = documentRef;
  renderPublicLives(root, []);
  assert.match(root.textContent, /아직 공개된 삶이 없습니다/);
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

test('설정된 클라이언트는 익명 세션으로 presence 인원을 센다', async () => {
  let sync = () => {};
  const channel = {
    on(type, options, callback) {
      if (type === 'presence' && options.event === 'sync') sync = callback;
      return this;
    },
    subscribe(callback) {
      queueMicrotask(() => callback('SUBSCRIBED'));
      return this;
    },
    async track() { sync(); },
    presenceState() { return { first: [{}], second: [{}] }; },
  };
  const supabaseClient = {
    auth: {
      async getSession() { return { data: { session: { user: { id: 'anon-user' } } } }; },
      async signInAnonymously() { throw new Error('existing session should be reused'); },
    },
    channel() { return channel; },
    removeChannel() {},
  };
  const client = createCommunityClient({ supabaseClient }, { storage: memoryStorage() });
  assert.deepEqual(await client.connectPresence(), { mode: 'online', count: 2 });
  client.destroy();
});
