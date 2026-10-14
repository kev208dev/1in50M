import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20261014000000_public_lives.sql', import.meta.url), 'utf8');

test('공개 삶과 반응 테이블 모두 RLS를 사용한다', () => {
  assert.match(sql, /alter table public\.public_lives enable row level security/i);
  assert.match(sql, /alter table public\.life_reactions enable row level security/i);
  assert.match(sql, /auth\.uid\(\)\s*=\s*owner_id/i);
});

test('스키마는 공개에 필요한 최소 정보만 저장한다', () => {
  assert.doesNotMatch(sql, /profile\s+jsonb|history\s+jsonb/i);
  assert.doesNotMatch(sql, /service_role/i);
  for (const column of ['alias', 'age', 'birth_region', 'final_region', 'career', 'net_worth_band', 'reflection']) {
    assert.match(sql, new RegExp(`\\b${column}\\b`, 'i'));
  }
});

test('숨김 기록은 공개 조회되지 않고 작성자만 쓰고 숨길 수 있다', () => {
  assert.match(sql, /for select[\s\S]*hidden\s*=\s*false/i);
  assert.match(sql, /for insert[\s\S]*with check\s*\(auth\.uid\(\)\s*=\s*owner_id\)/i);
  assert.match(sql, /for update[\s\S]*using\s*\(auth\.uid\(\)\s*=\s*owner_id\)/i);
});

test('공개 삶 변경을 realtime publication에 추가한다', () => {
  assert.match(sql, /supabase_realtime/i);
  assert.match(sql, /public_lives/i);
});
