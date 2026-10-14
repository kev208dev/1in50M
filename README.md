# 5000만 분의 1

대한민국의 지역, 가족 환경, 교육, 직업, 관계, 건강, 외모, 투자와 우연한 사건이 한 사람의 삶에 어떻게 누적되는지 체험하는 정적 웹 기반 가상 생애 시뮬레이션입니다.

## 실행

별도 빌드 없이 `dist/`를 정적 서버로 열면 됩니다.

```bash
python3 -m http.server 4173 -d dist
```

모든 수치와 결과는 체험용 가상 시뮬레이션이며 미래 예측, 의료 진단, 금융·도박 조언이 아닙니다.

## 테스트

```bash
npm test
```

## 실시간 공개 삶 연결

백엔드 설정이 없거나 연결에 실패하면 샘플 기록과 브라우저 로컬 저장을 사용하는 오프라인 모드로 자동 전환됩니다.

1. Supabase 프로젝트에서 익명 로그인을 활성화합니다.
2. `supabase/migrations/20261014000000_public_lives.sql`을 마이그레이션으로 적용합니다.
3. `dist/config.example.js`를 참고해 `dist/config.js`에 프로젝트 URL과 브라우저용 publishable key를 설정합니다.

```js
window.ONE_IN_50M_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_YOUR_KEY',
};
```

비밀 키나 서버용 키는 브라우저 파일에 넣지 마세요. 공개 테이블은 이름, 전체 프로필, 상세 타임라인, 정확한 순자산을 저장하지 않으며 RLS로 작성자 자신의 게시·숨김만 허용합니다.

## 배포

`.github/workflows/pages.yml`이 `dist/`를 GitHub Pages에 게시합니다.
