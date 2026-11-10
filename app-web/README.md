# 가자함 실제 웹앱 · WEB-02

2026-11-10 현재 출시 준비는 [WEB-03 상태표](../docs/release/WEB-03-readiness.md)·[운영 절차](../docs/release/WEB-03-operator-runbook.md)·[검사 증거](../docs/validation/WEB-03-release-preparation.md)를 따른다. /privacy/는 무로그인 안내 URL이다. 공개 설정을 release.config.local.json에 한 번 입력한 뒤 `node app-web/scripts/prepare-release.mjs release.config.local.json`으로 미배포 번들을 생성한다. 실제 설정/운영자·문의처·시행일·국외 처리 안내 확인이 없으면 생성하지 않는다. 가상 fixture 산출물은 배포하지 않는다.

WEB-04는 생성 직후 출시 파일을 자동 대조하고 `node app-web/scripts/verify-release.mjs <생성폴더> <보관한manifestSHA256>`으로 다시 검사한다. [사용자 확인 안내](../docs/release/USER-NEXT-STEPS.md)에서 지금 할 일과 연결 뒤 할 일을 나눈다. GitHub [Web checks](https://github.com/nemo9nemo/gajaham/actions/workflows/web-checks.yml)는 가상 검사만 하며 서비스 배포를 하지 않는다.

설치 없이 URL로 여는 개인 장소 보관함이다. 이메일 가입/로그인, 게스트 보관, 명시적 계정 이동, 링크·장소·메모·방문·휴지통, 서버 개인 원본과 계정 삭제를 구현한다. 지도 SDK·자동 분석·상대 연결·공유·DM·광고는 아직 없다.

현재 비용 정책은 **Firebase Auth/Hosting Spark + Cloudflare Workers/D1 Free, 결제수단 미연결**이다. 한도 도달 시 사용이 제한될 수 있으며 자동 유료 전환하지 않는다. Functions/Firestore는 이력이다. [조사·출시까지 남은 항목](../docs/research/no-billing-stack-2026-11-09.md), [결정0010](../docs/decisions/0010-no-billing-web-backend.md), [검사 기록](../docs/validation/WEB-02-no-billing.md)을 따른다.

## 로컬 실행과 검사

Node22.12+를 사용한다. Firebase Auth 공식 Emulator와 Cloudflare 공식 Wrangler/workerd·D1을 localhost에만 실행한다. Miniflare는 Wrangler4.158.0이 쓰는5.20261104.0-beta와 맞췄다. 이전 안정판4의 high 취약점을 남기지 않았다. Java는 현재 Auth-only 검사에는 필요하지 않고 옛 Firestore 검사에만21+가 필요하다.

```powershell
npm --prefix app-web ci --ignore-scripts
npm --prefix worker ci --ignore-scripts
npm --prefix tools/auth-emulator ci --ignore-scripts
node app-web/node_modules/@playwright/test/cli.js install chromium
node app-web/scripts/check.mjs
npm --prefix app-web audit
npm --prefix worker audit
```

전체 검사는 가상 이메일/기록만 사용해 단위·JWT·D1·보안·독립 Chromium2개·production 번들·Worker dry-run을 실행한다. `--reuse-emulators`는 알고 있는 WEB-02 Auth9199+Worker8787에만 사용한다. 자신이 띄운 서버는 종료하고, 가상 D1은 Git 제외 tmp/codex/WEB-02-local-*에 둔다. 실제 운영 데이터·무료 CPU 검사를 대신하지 않는다. production 확인 번들은 가상 설정이므로 배포에 재사용하지 않는다.

수동 미리보기는 서로 다른 터미널에서 저장소 루트 기준으로 실행한다.

```powershell
node -r ./tools/auth-emulator/quiet.cjs ./tools/auth-emulator/node_modules/firebase-tools/lib/bin/firebase.js emulators:start --only auth --project demo-gajaham-web
node worker/node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config worker/wrangler.local.jsonc
node worker/node_modules/wrangler/bin/wrangler.js dev --local --config worker/wrangler.local.jsonc
npm --prefix app-web run dev:emulator
```

[로컬 웹앱](http://127.0.0.1:5183/)은 이 컴퓨터의 가상 미리보기다. local entry와 production entry를 섞지 않는다. 일반 dev 모드는 운영 설정이 없으면 게스트만 제공한다. quiet.cjs는 인증 링크의 로그 출력을 끈다. [서버 설정](../worker/README.md)을 함께 따른다.

## 운영 전 남은 검사

사용자는 Google·Cloudflare 소유 계정 로그인/생성, 실제 문의처 준비, Galaxy 검사 협조가 필요하다. 카드·Blaze·도메인·서버 구매는 필요 항목이 아니다. 계정 접근 후 설정과 검사는 Codex가 지원한다. 비밀번호·키는 대화나 문서에 붙이지 않는다.

Firebase Spark/Cloud Billing 미연결과 Cloudflare **Workers Free**/유료 구독·결제수단 미연결을 실제 콘솔에서 확인한다. 로컬 preflight는 원격 청구 상태를 증명하지 않는다. 이메일·열거 보호·12자 영문/숫자 정책·정식 도메인·App Check를 설정한다. SMS·유료 API를 켜지 않는다.

.env.example의 공개 웹 설정·API origin·실제 문의처를 Git 제외 .env.production.local에 넣고 `node app-web/scripts/preflight.mjs` 통과 후 실제 번들을 빌드한다. Hosting CSP의 가상 API 주소를 실제 API origin 하나로 바꾼다. preflight가 정확한 origin 일치를 검사한다. 개인정보 처리방침·국외 처리·문의·D1 자동 복구 이력 Free7일을 확정한다.

Free 운영 환경에서 JWT 검증/관리 토큰 갱신·큰 페이지·탈퇴/Cron의 CPU10ms·D1 호출50개 제한과 실제 메일·App Check·헤더·두 브라우저·Galaxy를 검증한다. 무료 CPU에 맞지 않으면 유료 업그레이드 없이 구현 축소/구성 재검토를 한다. 조건 통과 후 D1 migration·Worker·Cron·Hosting을 구체적인 대상으로 배포한다. 기본 web.app/workers.dev 주소를 쓴다.

기본 firebase.json에는 Functions/Firestore 배포가 없다. 옛 firebase.web01.json은 Emulator용이고 Functions 배포는 중단 hook이 막는다. Worker build는 dry-run만 수행한다. 현재 실제 운영 계정·Free 플랜 확인·키·실메일·운영 CPU·Galaxy·공개 배포는 미실행이다. 기존 account/의 인증 삭제만으로 웹 서버 원본 삭제 완료를 주장하지 않는다.
