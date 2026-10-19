// 사용법: node tools/scene-check.mjs dist/data/scenes/families-xxx.js [더 많은 파일]
// 구조 검사(정의 시 오류), 조합 수, 길이, 조사·자리표시 오류, 중복 문장을 점검하고 표본을 보여 준다.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { sceneText } from '../dist/data/scenes/define.js';
import { expandDilemma } from '../dist/data/scenes/define-dilemma.js';
import { PARTICLE_ARTIFACTS, particleMismatch } from '../dist/data/scenes/josa.js';

const showAll = process.argv.includes('--all');
const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
let scenes = 0; let dilemmas = 0; const problems = []; const seen = new Map();
for (const file of files) {
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  for (const [name, list] of Object.entries(mod)) {
    if (!Array.isArray(list)) continue;
    for (const family of list) {
      if (family.situations) {
        family.situations.forEach((situation, si) => {
          if (situation.text.length > 48) problems.push(`[${family.id}] 상황 ${si} 길이 ${situation.text.length} > 48: ${situation.text}`);
        });
        family.outcomes.forEach((outcome, oi) => {
          if (outcome.text.length > 42) problems.push(`[${family.id}] 결과 ${oi} 길이 ${outcome.text.length} > 42: ${outcome.text}`);
        });
        for (let si = 0; si < family.situations.length; si += 1) {
          for (let oi = 0; oi < family.outcomes.length; oi += 1) {
            const text = sceneText(family, si, oi);
            scenes += 1;
            if (PARTICLE_ARTIFACTS.test(text)) problems.push(`[${family.id}] 자리표시/오류: ${text}`);
            for (const issue of particleMismatch(text)) problems.push(`[${family.id}] 조사 의심 ${issue}: ${text}`);
            if (seen.has(text)) problems.push(`중복 문장: ${text}`);
            seen.set(text, family.id);
          }
        }
        const sample = showAll
          ? family.situations.flatMap((_, si) => family.outcomes.map((__, oi) => sceneText(family, si, oi)))
          : family.situations.slice(0, 2).flatMap((_, si) => family.outcomes.slice(0, 3).map((__, oi) => sceneText(family, si, oi)));
        console.log(`\n■ ${family.id} (${family.situations.length}×${family.outcomes.length}=${family.situations.length * family.outcomes.length})`);
        sample.forEach((text) => console.log('  ·', text));
      } else if (family.details) {
        const variants = expandDilemma(family);
        dilemmas += variants.length;
        for (const variant of variants) {
          for (const text of [variant.title, variant.prompt, ...variant.choices.flatMap((item) => [item.label, item.description])]) {
            if (PARTICLE_ARTIFACTS.test(text)) problems.push(`[${family.id}] 자리표시/오류: ${text}`);
            for (const issue of particleMismatch(text)) problems.push(`[${family.id}] 조사 의심 ${issue}: ${text}`);
          }
          if (variant.prompt.length > 80) problems.push(`[${family.id}] 질문 길이 ${variant.prompt.length} > 80: ${variant.prompt}`);
        }
        console.log(`\n◆ ${family.id} (${family.who.length}×${family.details.length}=${variants.length}) — ${variants[0].title}`);
        (showAll ? variants : [variants[0], variants.at(-1)]).forEach((variant) => console.log('  ·', variant.prompt));
        console.log('  ·', variants[0].choices.map((item) => item.label).join(' / '));
      }
    }
  }
}
console.log(`\n장면 사건 ${scenes}종, 딜레마 결정 ${dilemmas}종`);
if (problems.length) {
  console.log(`\n문제 ${problems.length}건:`);
  problems.slice(0, 80).forEach((item) => console.log(' ✗', item));
  process.exitCode = 1;
} else console.log('문제 없음');
