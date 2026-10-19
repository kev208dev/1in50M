// 한국어 조사 자동 선택. 「(으)로」「(이)가」 같은 자리표시가 화면에 노출되지 않게 합니다.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function lastSyllableInfo(word) {
  const text = String(word ?? '').trim().replace(/[\s.,!?'"”’)\]]+$/u, '');
  const last = text.at(-1);
  if (!last) return { batchim: false, rieul: false };
  const code = last.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END) {
    const final = (code - HANGUL_START) % 28;
    return { batchim: final !== 0, rieul: final === 8 };
  }
  // 숫자·영문은 한국어로 읽었을 때의 받침을 따른다.
  if (/[0-9]$/.test(last)) return { batchim: /[013678]$/.test(last), rieul: /[178]$/.test(last) };
  if (/[a-z]$/i.test(last)) return { batchim: /[lmnr]$/i.test(last), rieul: /[lr]$/i.test(last) };
  return { batchim: false, rieul: false };
}

const PAIRS = {
  '이/가': ['이', '가'],
  '을/를': ['을', '를'],
  '은/는': ['은', '는'],
  '과/와': ['과', '와'],
  '이나/나': ['이나', '나'],
  '이랑/랑': ['이랑', '랑'],
  '아/야': ['아', '야'],
  '이에요/예요': ['이에요', '예요'],
};

export function josa(word, pair) {
  const info = lastSyllableInfo(word);
  if (pair === '으로/로') return `${word}${info.batchim && !info.rieul ? '으로' : '로'}`;
  const forms = PAIRS[pair];
  if (!forms) throw new RangeError(`알 수 없는 조사 쌍: ${pair}`);
  return `${word}${info.batchim ? forms[0] : forms[1]}`;
}

/**
 * 「{who:이/가}」「{place:으로/로}」「{who}」 형식의 자리를 값과 올바른 조사로 채운다.
 */
export function fill(template, values) {
  return String(template).replace(/\{(\w+)(?::([^}]+))?\}/g, (whole, key, pair) => {
    if (!(key in values)) throw new RangeError(`채울 값이 없습니다: ${key}`);
    return pair ? josa(values[key], pair) : String(values[key]);
  });
}

/** 화면에 남으면 안 되는 자리표시·조사 오류 패턴. 감사와 테스트에서 함께 쓴다. */
export const PARTICLE_ARTIFACTS = /\((?:으|이|을|를|은|는|과|와)\)|[가-힣]\((?:으)?로\)|\{\w+(?::[^}]+)?\}|undefined|null|NaN|\[object Object\]/;

export function particleMismatch(text) {
  // 받침 없는 음절 뒤의 「으로」, 받침 있는 음절 뒤의 「가 」처럼 흔한 오류만 좁게 잡는다.
  const issues = [];
  for (const match = /([가-힣])으로(?=[\s,.]|$)/g; ;) {
    const found = match.exec(text);
    if (!found) break;
    const info = lastSyllableInfo(found[1]);
    if (!info.batchim || info.rieul) issues.push(`${found[1]}으로`);
  }
  return issues;
}
