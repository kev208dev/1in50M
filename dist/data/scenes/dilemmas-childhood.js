import { defineDilemma, dilemmaChoice as choice } from './define-dilemma.js';
import * as c from './context.js';

// 유년기와 학교의 작은 갈림길 — 돈이 드는 선택지는 두지 않습니다.
const inSchool = c.isSchoolStudent;

export const CHILDHOOD_DILEMMAS = [
  defineDilemma({
    id: 'kid-copy-homework',
    ageRange: [9, 18],
    when: inSchool,
    title: '{who}의 숙제 부탁',
    who: [
      { id: 'deskmate', label: '짝꿍' },
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'transfer', label: '전학 온 친구' },
      { id: 'next-class', label: '옆 반 친구' },
      { id: 'team-player', label: '운동부 친구' },
      { id: 'group-mate', label: '같은 모둠 친구' },
    ],
    details: [
      { id: 'math', text: '{who:이/가} 수학 숙제를 못 했다며 공책을 잠깐만 보여 달라고 했습니다.' },
      { id: 'essay', text: '아침 조회 전에 {who:이/가} 독후감을 베끼게 해 달라고 졸랐습니다.' },
      { id: 'sick', text: '{who:이/가} 어젯밤 아파서 숙제를 못 했다며 도와 달라고 했습니다.' },
      { id: 'report', text: '{who:이/가} 내 조사 보고서를 참고만 하겠다며 빌려 달라고 했습니다.' },
      { id: 'promise', text: '{who:이/가} 이번 한 번만 보여 주면 다음엔 꼭 갚겠다고 사정했습니다.' },
      { id: 'notes', text: '{who:이/가} 시험 범위를 정리한 내 노트를 통째로 빌려 달라고 했습니다.' },
    ],
    choices: [
      choice('show', '보여 준다', '이번만이라며 그대로 내어 주지만 들킬까 조마조마합니다.', { relationships: 2, happiness: -1, knowledge: -1 }, ['관계', '위험']),
      choice('teach', '같이 풀어 준다', '쉬는 시간을 내어 푸는 법을 차근차근 알려 줍니다.', { relationships: 1, knowledge: 1, health: -1 }, ['배움', '시간']),
      choice('decline', '정중히 거절한다', '내 노력은 내 몫이라고 솔직하게 말합니다.', { happiness: 1, relationships: -2 }, ['경계']),
    ],
  }),

  defineDilemma({
    id: 'kid-keep-secret',
    ageRange: [8, 18],
    title: '{who}의 비밀 부탁',
    who: [
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'deskmate', label: '짝꿍', when: inSchool },
      { id: 'classmate', label: '같은 반 친구', when: inSchool },
      { id: 'sibling', label: '형제자매', when: c.hasSiblings },
      { id: 'cousin', label: '사촌' },
      { id: 'neighbor', label: '동네 친구' },
    ],
    details: [
      { id: 'window', text: '{who:이/가} 공놀이를 하다 이웃집 유리창을 깼다며 모른 척해 달라고 했습니다.' },
      { id: 'report-card', text: '{who:이/가} 성적표를 몰래 숨겨 두었다며 아무에게도 말하지 말라고 했습니다.' },
      { id: 'skip', text: '{who:이/가} 학원을 몰래 빠지고 있다며 비밀로 해 달라고 했습니다.', years: [1991, 9999] },
      { id: 'unwell', text: '{who:이/가} 며칠째 몸이 안 좋은데 어른들께는 말하지 말아 달라고 했습니다.' },
      { id: 'bike', text: '{who:이/가} 남의 자전거를 허락 없이 타다 긁었다며 입을 다물어 달라고 했습니다.', years: [1970, 9999] },
      { id: 'cat', text: '{who:이/가} 용돈을 털어 몰래 길고양이를 돌보고 있다며 비밀을 지켜 달라고 했습니다.' },
    ],
    choices: [
      choice('keep', '비밀을 지킨다', '약속대로 입을 다물지만 마음 한구석이 무겁습니다.', { relationships: 2, happiness: -2 }, ['신뢰']),
      choice('persuade', '함께 말하자고 한다', '같이 털어놓으러 가자고 설득하느라 진땀을 뺍니다.', { relationships: 1, knowledge: 1, happiness: -2 }, ['조율']),
      choice('tell', '어른께 알린다', '걱정되는 마음에 믿을 만한 어른께 전하고 원망을 삽니다.', { happiness: 1, knowledge: 1, relationships: -2 }, ['책임']),
    ],
  }),

  defineDilemma({
    id: 'kid-left-out',
    ageRange: [8, 18],
    when: inSchool,
    title: '혼자 있는 {who}',
    who: [
      { id: 'transfer', label: '전학 온 아이' },
      { id: 'quiet-deskmate', label: '말수 적은 짝꿍' },
      { id: 'seatmate', label: '옆자리 아이' },
      { id: 'bookworm', label: '책 읽기를 좋아하는 아이' },
      { id: 'abroad', label: '외국에서 온 친구', when: c.between(2000, 9999) },
      { id: 'new-group', label: '새 반에 아는 얼굴이 없는 아이' },
    ],
    details: [
      { id: 'lunch', text: '점심시간마다 {who:이/가} 혼자 밥을 먹는 모습이 자꾸 눈에 밟혔습니다.' },
      { id: 'pe', text: '체육 시간 짝을 정할 때 {who:이/가} 끝까지 혼자 서 있었습니다.' },
      { id: 'group', text: '모둠을 짤 때 아무도 {who:을/를} 부르지 않았습니다.' },
      { id: 'window', text: '쉬는 시간마다 {who:이/가} 창밖만 바라보고 있었습니다.' },
      { id: 'picnic', text: '소풍날 {who:이/가} 도시락을 들고 혼자 앉을 자리를 찾고 있었습니다.' },
      { id: 'walk', text: '하굣길에 {who:이/가} 늘 혼자 맨 뒤에서 걸어갔습니다.' },
    ],
    choices: [
      choice('approach', '먼저 말을 건다', '어색함을 무릅쓰고 옆에 가서 말을 붙여 봅니다.', { relationships: 1, knowledge: 1, happiness: -1 }, ['용기']),
      choice('include', '친구들과 끼워 준다', '내 무리에 함께하자고 데려가지만 눈치가 보입니다.', { relationships: 2, happiness: -2 }, ['관계']),
      choice('watch', '지켜만 본다', '괜히 나섰다 어색해질까 봐 그냥 지나칩니다.', { happiness: 1, relationships: -1, knowledge: -1 }, ['유지']),
    ],
  }),

  defineDilemma({
    id: 'kid-broke-thing',
    ageRange: [6, 16],
    title: '{who}의 물건을 망가뜨린 날',
    who: [
      { id: 'sibling', label: '형제자매', when: c.hasSiblings },
      { id: 'deskmate', label: '짝꿍', when: inSchool },
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'cousin', label: '사촌' },
      { id: 'neighbor', label: '동네 친구' },
      { id: 'next-door', label: '옆집 아이' },
    ],
    details: [
      { id: 'sharpener', text: '{who:이/가} 아끼던 연필깎이를 빌려 쓰다가 내가 손잡이를 부러뜨렸습니다.' },
      { id: 'comic', text: '{who:이/가} 빌려준 만화책에 그만 물을 쏟고 말았습니다.' },
      { id: 'robot', text: '{who:이/가} 소중히 여기던 장난감 로봇의 팔이 내 손에서 툭 부러졌습니다.' },
      { id: 'stickers', text: '{who:이/가} 모아 둔 스티커 앨범을 내가 실수로 구기고 말았습니다.', years: [1980, 9999] },
      { id: 'bike', text: '{who:이/가} 빌려준 자전거를 타다가 그만 바퀴에 펑크를 냈습니다.', years: [1970, 9999] },
      { id: 'crayons', text: '{who:이/가} 아끼는 색연필 세트를 빌렸다가 하나를 잃어버렸습니다.' },
    ],
    choices: [
      choice('confess', '솔직히 사과한다', '바로 찾아가 내가 그랬다고 말하고 싫은 소리를 듣습니다.', { relationships: 1, happiness: -2 }, ['정직']),
      choice('fix', '몰래 고쳐 둔다', '말없이 원래대로 되돌려 보지만 티가 날까 불안합니다.', { knowledge: 1, happiness: -1, relationships: -1 }, ['수습']),
      choice('replace', '내 물건을 건넨다', '아끼던 내 물건을 대신 주고 속으로 아쉬워합니다.', { relationships: 2, happiness: -2 }, ['보상']),
      choice('hide', '모른 척한다', '들키지 않기를 바라며 입을 다뭅니다.', { happiness: 1, relationships: -2 }, ['회피']),
    ],
  }),

  defineDilemma({
    id: 'kid-play-or-study',
    ageRange: [9, 18],
    when: inSchool,
    title: '{who}의 놀자는 말',
    who: [
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'neighbor', label: '동네 친구' },
      { id: 'classmate', label: '같은 반 친구' },
      { id: 'cousin', label: '놀러 온 사촌' },
      { id: 'sibling', label: '형제자매', when: c.hasSiblings },
      { id: 'club', label: '동아리 친구', when: c.ageBetween(13, 18) },
    ],
    details: [
      { id: 'exam-eve', text: '시험 전날 저녁 {who:이/가} 잠깐만 나와서 놀자고 불렀습니다.' },
      { id: 'homework', text: '숙제가 잔뜩 밀린 저녁에 {who:이/가} 같이 놀자고 졸랐습니다.' },
      { id: 'arcade', text: '공부하려던 참에 {who:이/가} 오락실에 새 게임이 들어왔다며 가자고 했습니다.', years: [1980, 2005] },
      { id: 'pcbang', text: '문제집을 펴 놓은 오후 {who:이/가} PC방에 딱 한 시간만 가자고 했습니다.', years: [1998, 9999], when: c.ageBetween(12, 18) },
      { id: 'soccer', text: '숙제를 펼쳐 놓은 오후 {who:이/가} 날이 좋다며 공 차러 나가자고 했습니다.' },
      { id: 'cartoon', text: '외울 것이 산더미인데 {who:이/가} 새로 나온 만화 영화를 같이 보자고 했습니다.', years: [1975, 9999] },
      { id: 'karaoke', text: '시험 기간 한복판에 {who:이/가} 노래방에서 스트레스나 풀자고 했습니다.', years: [1992, 9999], when: c.ageBetween(13, 18) },
    ],
    choices: [
      choice('go', '나가서 논다', '오늘은 실컷 놀고 할 일은 내일로 미룹니다.', { happiness: 2, relationships: 1, knowledge: -2 }, ['휴식', '미룸']),
      choice('hour', '한 시간만 논다', '시간을 정해 두고 놀다가 아쉽게 먼저 들어옵니다.', { relationships: 1, happiness: -1 }, ['조율']),
      choice('stay', '할 일을 한다', '미안하다고 거절하고 책상 앞에 앉습니다.', { knowledge: 2, relationships: -1, happiness: -1 }, ['공부']),
    ],
  }),

  defineDilemma({
    id: 'kid-teasing',
    ageRange: [8, 18],
    when: inSchool,
    title: '놀림받는 {who}',
    who: [
      { id: 'classmate', label: '같은 반 친구' },
      { id: 'deskmate', label: '짝꿍' },
      { id: 'transfer', label: '전학 온 아이' },
      { id: 'front-seat', label: '앞자리 친구' },
      { id: 'quiet', label: '말수가 적은 친구' },
      { id: 'group-mate', label: '같은 모둠 친구' },
    ],
    details: [
      { id: 'nickname', text: '쉬는 시간에 몇몇 아이들이 {who:을/를} 짓궂은 별명으로 부르며 키득거렸습니다.' },
      { id: 'speech', text: '{who:이/가} 발표하다 말이 꼬이자 몇몇이 흉내를 내며 웃었습니다.' },
      { id: 'lunchbox', text: '{who:이/가} 싸 온 도시락 반찬을 두고 몇몇이 짓궂게 놀렸습니다.', years: [1950, 1997] },
      { id: 'shoes', text: '{who:이/가} 새로 신고 온 운동화를 몇몇이 일부러 밟고 지나갔습니다.' },
      { id: 'chat', text: '반 단체 대화방에서 {who:을/를} 두고 놀리는 말이 오갔습니다.', years: [2011, 9999], when: c.ageBetween(11, 18) },
      { id: 'ball', text: '체육 시간에 {who:이/가} 공을 놓치자 몇몇이 큰 소리로 야유했습니다.' },
      { id: 'notebook', text: '{who:이/가} 떨어뜨린 공책을 누군가 주워 돌려 읽으며 웃었습니다.' },
    ],
    choices: [
      choice('stop', '그만하라고 말한다', '그 자리에서 그만하자고 말하지만 나도 표적이 될까 떨립니다.', { relationships: 2, happiness: -2 }, ['용기']),
      choice('comfort', '나중에 다가간다', '그 자리는 넘기고 따로 괜찮으냐고 묻습니다.', { relationships: 1, happiness: -1 }, ['위로']),
      choice('adult', '선생님께 알린다', '조용히 알렸지만 일이 커질까 한동안 마음을 졸입니다.', { relationships: 1, knowledge: 1, happiness: -2 }, ['책임', '도움']),
    ],
  }),

  defineDilemma({
    id: 'kid-birthday-gift',
    ageRange: [7, 18],
    title: '{who}의 생일 선물',
    who: [
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'deskmate', label: '짝꿍', when: inSchool },
      { id: 'sibling', label: '형제자매', when: c.hasSiblings },
      { id: 'guardian', label: '집안 어른', when: c.hasLivingParents },
      { id: 'cousin', label: '사촌' },
      { id: 'neighbor', label: '동네 친구' },
    ],
    details: [
      { id: 'no-money', text: '내일은 {who:이/가} 기다려 온 생일인데 용돈이 거의 남지 않았습니다.' },
      { id: 'pricey', text: '{who:이/가} 생일에 갖고 싶다고 했던 물건은 내 형편에 너무 비쌌습니다.' },
      { id: 'secret', text: '{who:이/가} 생일에 무엇을 받고 싶은지 끝내 말해 주지 않았습니다.' },
      { id: 'return', text: '{who:이/가} 지난 내 생일에 정성스러운 선물을 줬던 게 마음에 걸렸습니다.' },
      { id: 'exam', text: '{who:이/가} 생일인데 하필 그날 시험이 겹쳤습니다.' },
      { id: 'down', text: '{who:이/가} 생일을 앞두고 요즘 부쩍 기운이 없어 보였습니다.' },
    ],
    choices: [
      choice('letter', '손편지를 쓴다', '밤늦게까지 마음을 담아 쓰느라 잠이 모자랍니다.', { relationships: 1, happiness: 1, health: -1 }, ['정성']),
      choice('treasure', '아끼던 걸 준다', '내가 아끼던 물건을 정성껏 싸서 건네고 아쉬워합니다.', { relationships: 2, happiness: -1 }, ['나눔']),
      choice('together', '하루를 같이 보낸다', '선물 대신 함께 시간을 보내느라 할 일은 미뤄 둡니다.', { relationships: 1, happiness: 1, knowledge: -1 }, ['시간']),
    ],
  }),

  defineDilemma({
    id: 'kid-class-election',
    ageRange: [9, 18],
    when: inSchool,
    title: '{who}의 선거 권유',
    who: [
      { id: 'teacher', label: '담임 선생님' },
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'classmates', label: '같은 반 친구들' },
      { id: 'deskmate', label: '짝꿍' },
      { id: 'former-leader', label: '지난 학기 반장' },
      { id: 'group', label: '모둠 친구들' },
    ],
    details: [
      { id: 'push', text: '{who:이/가} 이번 반장 선거에 꼭 나가 보라며 등을 떠밀었습니다.' },
      { id: 'nominate', text: '{who:이/가} 학급 회장 후보로 나를 추천하겠다고 했습니다.' },
      { id: 'school-wide', text: '{who:이/가} 전교 부회장 선거에 나가 보면 어떻겠냐고 물었습니다.', years: [1990, 9999] },
      { id: 'three-days', text: '선거를 사흘 앞두고 {who:이/가} 출마를 권했습니다.' },
      { id: 'pledge', text: '{who:이/가} 네가 하면 잘할 거라며 공약을 같이 짜 주겠다고 했습니다.' },
      { id: 'nobody', text: '{who:이/가} 아무도 나서지 않는다며 한번 해 보라고 했습니다.' },
    ],
    choices: [
      choice('run', '나가 본다', '떨리지만 손을 들고 나서서 부담을 짊어집니다.', { relationships: 2, knowledge: 1, happiness: -2 }, ['도전']),
      choice('support', '다른 친구를 돕는다', '후보 대신 선거 운동을 거들며 기회는 넘깁니다.', { relationships: 1, happiness: -1 }, ['협력']),
      choice('decline', '사양한다', '아직 자신이 없다며 고사하고 마음 편히 지냅니다.', { happiness: 1, relationships: -1 }, ['유지']),
    ],
  }),

  defineDilemma({
    id: 'kid-career-advice',
    ageRange: [15, 18],
    when: inSchool,
    title: '{who}의 진로 조언',
    who: [
      { id: 'teacher', label: '담임 선생님' },
      { id: 'elder', label: '집안 어른', when: c.hasLivingParents },
      { id: 'counselor', label: '진로 상담 선생님', when: c.between(2011, 9999) },
      { id: 'senior', label: '존경하는 선배' },
      { id: 'academy-teacher', label: '학원 선생님', when: c.between(1991, 9999) },
      { id: 'relative', label: '친척 어른' },
    ],
    details: [
      { id: 'stable', text: '{who:이/가} 안정적인 길이라며 생각해 본 적 없는 학과를 권했습니다.' },
      { id: 'grades', text: '{who:이/가} 성적에 맞춰 원서를 쓰라고 했지만 가고 싶은 곳은 따로 있었습니다.' },
      { id: 'track', text: '{who:이/가} 문과보다 이과가 낫다며 계열을 바꿔 보라고 했습니다.', years: [1960, 2017] },
      { id: 'skill', text: '{who:이/가} 대학 대신 일찍 기술을 배우는 길도 있다고 했습니다.' },
      { id: 'hobby', text: '{who:이/가} 좋아하는 일은 취미로 두고 현실을 보라고 조언했습니다.' },
      { id: 'far', text: '{who:이/가} 멀리 떨어진 도시의 학교로 가 보라고 권했습니다.' },
    ],
    choices: [
      choice('follow', '조언을 따른다', '경험을 믿고 권한 길로 가지만 마음 한켠이 허전합니다.', { knowledge: 1, relationships: 1, happiness: -2 }, ['안정']),
      choice('own', '내 뜻대로 간다', '설득해 본 뒤 내가 원하는 길을 고집합니다.', { happiness: 2, relationships: -2 }, ['자기결정']),
      choice('explore', '더 알아본다', '결정을 미루고 두 길을 직접 알아보며 애를 태웁니다.', { knowledge: 1, happiness: -1 }, ['탐색']),
    ],
  }),

  defineDilemma({
    id: 'kid-share-supplies',
    ageRange: [7, 14],
    when: inSchool,
    title: '{who}의 준비물 부탁',
    who: [
      { id: 'deskmate', label: '짝꿍' },
      { id: 'front', label: '앞자리 친구' },
      { id: 'back', label: '뒷자리 친구' },
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'transfer', label: '전학 온 친구' },
      { id: 'group-mate', label: '같은 모둠 친구' },
    ],
    details: [
      { id: 'paint', text: '미술 시간 직전 {who:이/가} 물감을 깜빡했다며 같이 쓰자고 했습니다.' },
      { id: 'paper', text: '{who:이/가} 색종이를 안 가져왔다며 절반만 나눠 달라고 했습니다.' },
      { id: 'eraser', text: '시험 시간에 {who:이/가} 지우개가 없다며 반으로 잘라 달라고 했습니다.' },
      { id: 'notebook', text: '{who:이/가} 공책을 다 썼다며 내 공책 몇 장을 뜯어 달라고 했습니다.' },
      { id: 'glue', text: '만들기 시간에 {who:이/가} 풀이 다 떨어졌다며 내 것을 빌려 달라고 했습니다.' },
      { id: 'highlighter', text: '{who:이/가} 내가 아끼는 새 형광펜을 하루만 빌려 달라고 했습니다.', years: [1985, 9999] },
    ],
    choices: [
      choice('give', '선뜻 나눠 준다', '내 몫이 모자라질 걸 알면서도 넉넉히 나눠 줍니다.', { relationships: 2, knowledge: -1 }, ['나눔']),
      choice('little', '조금만 나눈다', '내가 쓸 만큼 남기고 건네자 조금 서운해합니다.', { relationships: 1, happiness: -1 }, ['조율']),
      choice('keep', '내 것을 지킨다', '나도 써야 한다며 미안하게 거절합니다.', { knowledge: 1, relationships: -1, happiness: -1 }, ['경계']),
    ],
  }),

  defineDilemma({
    id: 'kid-make-up',
    ageRange: [7, 18],
    title: '{who:과/와} 다툰 뒤',
    who: [
      { id: 'best-friend', label: '단짝 친구' },
      { id: 'deskmate', label: '짝꿍', when: inSchool },
      { id: 'sibling', label: '형제자매', when: c.hasSiblings },
      { id: 'cousin', label: '사촌' },
      { id: 'neighbor', label: '동네 친구' },
      { id: 'classmate', label: '같은 반 친구', when: inSchool },
    ],
    details: [
      { id: 'silent', text: '{who:과/와} 사소한 말다툼 끝에 사흘째 말을 하지 않고 있습니다.' },
      { id: 'rumor', text: '서로 험담을 했다는 오해가 생겨 {who:과/와} 냉랭하게 지내고 있습니다.' },
      { id: 'late', text: '약속 시간에 늦은 일로 {who:과/와} 크게 언성을 높였습니다.' },
      { id: 'waiting', text: '{who:과/와} 서로 상대가 먼저 사과하기를 기다린 지 일주일이 지났습니다.' },
      { id: 'rules', text: '놀이 규칙을 두고 {who:과/와} 다투다 서로 등을 돌렸습니다.' },
      { id: 'joke', text: '내가 한 농담에 {who:이/가} 상처를 받은 것 같았습니다.' },
    ],
    choices: [
      choice('apologize', '먼저 사과한다', '자존심을 접고 먼저 미안하다고 말합니다.', { relationships: 2, happiness: -1 }, ['화해']),
      choice('honest', '솔직히 이야기한다', '서로 속마음을 털어놓다 보면 다시 다툴 수도 있습니다.', { relationships: 1, knowledge: 1, happiness: -1 }, ['대화']),
      choice('wait', '시간을 둔다', '마음이 가라앉을 때까지 거리를 두고 지냅니다.', { happiness: 1, relationships: -1 }, ['휴식']),
    ],
  }),
];
