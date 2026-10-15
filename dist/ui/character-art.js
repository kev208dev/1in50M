// 성장 단계 캐릭터 — Figma 컴포넌트 시트의 「Character」 6단계를 옮긴 선화입니다.
// 흰 선은 몸, 초록 선은 단계를 상징하는 소품(딸랑이·공·가방·헤드폰·서류가방·지팡이)입니다.

export const STAGE_LABELS = {
  infant: '영아',
  child: '아동',
  teen: '청소년',
  'young-adult': '청년',
  adult: '성인',
  senior: '노년',
};

const BODY = 'class="figure-body"';
const PROP = 'class="figure-prop"';

const FIGURES = {
  infant: `<circle ${BODY} cx="60" cy="100" r="15"/><ellipse ${BODY} cx="60" cy="134" rx="20" ry="15"/><path ${BODY} d="M43 128 Q35 134 39 142 M77 128 Q85 134 81 142"/><circle ${PROP} cx="94" cy="118" r="5"/><path ${PROP} d="M90 122 L84 132"/>`,
  child: `<circle ${BODY} cx="60" cy="70" r="13"/><path ${BODY} d="M60 84 L60 116 M60 93 L45 107 M60 93 L75 107 M60 116 L49 146 M60 116 L71 146"/><circle ${PROP} cx="92" cy="140" r="7"/>`,
  teen: `<circle ${BODY} cx="60" cy="50" r="12"/><path ${BODY} d="M60 63 L60 104 M60 73 L47 96 M60 73 L73 96 M60 104 L51 146 M60 104 L69 146"/><rect ${PROP} x="64" y="67" width="11" height="22" rx="4"/>`,
  'young-adult': `<circle ${BODY} cx="60" cy="38" r="12"/><path ${BODY} d="M60 51 L60 96 M60 61 L44 48 M60 61 L78 74 M60 96 L46 146 M60 96 L77 140"/><path ${PROP} d="M47 37 A13 13 0 0 1 73 37"/>`,
  adult: `<circle ${BODY} cx="60" cy="38" r="12"/><path ${BODY} d="M60 51 L60 98 M60 61 L48 92 M60 61 L74 87 M60 98 L52 146 M60 98 L68 146"/><rect ${PROP} x="71" y="88" width="19" height="14" rx="2"/><path ${PROP} d="M77 88 V85 H84 V88"/>`,
  senior: `<circle ${BODY} cx="54" cy="48" r="12"/><path ${BODY} d="M57 61 Q62 80 61 101 M59 70 L80 92 M61 101 L53 146 M61 101 L69 146"/><path ${PROP} d="M84 92 L88 146 M79 93 Q82 87 87 91"/>`,
};

export function characterSvg(stage, { ground = true } = {}) {
  const figure = FIGURES[stage] ?? FIGURES.adult;
  const line = ground ? '<line class="figure-ground" x1="28" y1="152" x2="92" y2="152"/>' : '';
  return `<svg class="figure" viewBox="0 0 120 160" aria-hidden="true">${line}${figure}</svg>`;
}
