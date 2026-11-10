# 작업 규칙

## 프로젝트와 현재 범위

한국어로 소통한다. 가자함은 인스타그램 DM·링크로 받은 장소를 개인 맵과 두 사람의 공유 맵에 모으는 서비스다. 개발의 기준 경로는 C:\Users\love0\nemo9Dev\gajaham이다.

현재 출시 방향은 **URL로 접속하는 모바일 웹앱**이며 설치는 필요하지 않다(2026-11-03 사용자 요구). PWA 홈 화면 추가는 선택이다. **로그인하면 어느 지원 기기·브라우저에서든 같은 계정의 개인 기록을 볼 수 있어야 한다.** 결정0008/0009/0010과 docs/contracts/web-account-data.md가 최신 기준이며 docs/plans/WEB-02-no-billing.md와 docs/plans/WEB-03-release-preparation.md가 현재 구현/출시 준비 기준이다. 도메인·운영 서버 보유는 가정하지 않고 결제수단 미연결·초과 자동과금 없는 운영을 우선한다(2026-11-09). app-web/·worker/에 실제 웹/서버 코드를 구현하고 공식 Auth Emulator·workerd/D1과 독립 Chromium에서 검증한다. functions/는 이전 구현 이력과 공통 순수 도메인 모듈을 보존한다. 운영 계정·실메일·Galaxy 실기기·공개 배포는 아직 미실행이다. Android/AAB·Play·AdMob은 현 웹 출시 선행 조건에서 제외하고 기존 구현은 보존한다.

구현 자산은 정적 목업·Android 개인 저장 앱·WEB-01 실제 개인 웹앱이다. `android/`는 Room v3와 선택적 이메일 로그인 SDK·계정별 로컬 영역을 구현했다. 웹의 공식 Emulator 통합·브라우저 검사를 운영 인증 활성화·실기기 검사와 구분한다. 실제 지도·상대 연결·공유 서버·DM은 아직 없다. 기획 기준은 docs의 기획 문서(docs/personal-shared-map-plan-2026-10-12.md, docs/planning-review-2026-10-12.md)와 .planning-staging의 제품 기획·로드맵·시장 조사다. 구현되지 않은 기능과 실행하지 않은 검사를 완료로 표시하지 않는다.

이메일·비밀번호 기본 로그인, 로그인 없는 개인 이용·게스트의 상대 연결 불가, 2차 소셜 로그인은 유지한다. 2026-11-03 후속 요구로 결정0005/0006/0007의 **로그인 계정 원본 로컬 전용·서버 저장/동기화 금지·다른 기기 조회 불가 정책을 대체**한다. 로그인 계정은 UID별 서버 원본을 보관하고 같은 계정으로 재조회/변경을 반영한다. 게스트만 브라우저/프로필/origin별 IndexedDB 원본이며 명시적으로 계정 저장을 선택하기 전에는 업로드하지 않는다. 사이트 데이터 삭제·로그아웃은 서버 원본 삭제가 아니다. 사용자용 JSON 백업/가져오기는 복원하지 않는다. 개인 맵 비공개·선택 공유·맵별 사본 독립·Galaxy 브라우저 우선·광고 목표는 유지한다. 운영 백업/보존/삭제는 별도 정책·비용을 정하며 실제 구현/검증 완료와 구분한다.

기술 스택·검증 명령·구현 경계가 정해지면 이 파일의 '구현 경계'와 '산출물과 검증'에 추가한다. 정해지기 전에는 브리프마다 사용할 스택과 검증 명령을 명시한다.

## 기준 파일과 변경 순서

1. 사용자의 명시적인 요구를 우선한다.
2. 제품 범위는 위 기획 문서를 따른다.
3. 요구 → 정책 → 설계·계약 → 검증 시나리오 → 구현 → 검사 증거 순서로 관련 파일을 함께 갱신한다.

충돌을 발견하면 근거를 확인해 기준 파일을 일치시킨다. 중요한 선택은 docs/decisions에 기록한다.

## 구현 경계

기획 문서에서 확정된 제품 규칙:

- 사용자의 개인 맵은 본인만 본다. 공유 맵에는 사용자가 선택한 장소만 담긴다. 다른 참여자의 개인 맵은 복제 대상·목록에 보이지 않는다.
- 복제는 원본을 유지하고, 복제 결과는 맵별로 따로 편집한다. 메모·방문 상태·위치 보정·삭제를 다른 맵에 자동 반영하지 않는다.
- 복제·저장 직전에 대상 맵 접근 권한을 확인한다. 권한이 끝난 공유 맵에 새로 복제할 수 없다.
- 연결 코드는 만료·취소·사용 완료 상태를 갖고, 재발급 시 이전 코드를 무효화한다. 코드 입력만으로 기록을 열지 않고 로그인과 연결 확인을 거친다.
- 웹의 현재 맵 전환으로 DM 기본 저장 위치를 바꾸지 않는다.

2026-10-20 APP-01의 Kotlin·Compose·Room와 AUTH-02는 기존 Android 구현 이력이다. 공유 접수·로컬 저장·수동 확정·휴지통과 파일 백업 제거를 구현했으며 새 계정 서버 원본 정책은 아직 이식하지 않았다. `core`의 과거 백업 형식 순수 함수/검사는 이력 호환 자료이며 복구 진입점이 아니다. 실제 지도·자동 분석·광고·공유 서버·DM은 후속이다. `web/`의 패키지 금지는 목업에 계속 적용한다.

2026-10-27 AUTH-02는 Firebase BoM 34.9.0/Auth 24.0.1 공식 이메일 인증, Room v3 guest/UID 영역, 명시적 게스트 기록 이동, 탈퇴 pending·세션 정지, 백업 경로 제거와 `account/` 외부 탈퇴 페이지를 구현한다. 실제 운영 설정은 아직 없으며 미설정 시 게스트만 사용 가능하다. debug 명시적 demo Emulator와 release를 분리한다. 서버 인가·상대 연결은 미구현이다. 개인 원본·공유 사본·인증 계정 정보는 별도다. 브리프·검사 증거는 docs/plans/AUTH-02-email-local-mode.md와 docs/validation/AUTH-02-email-local-mode.md를 따른다.

2026-11-03 WEB-01(서버/비용은 결정0010으로 대체)은 app-web/의 Vite8.3.5·Firebase13.2.0, functions/의 Functions7.4.0·Admin14.5.0·배포 Node22를 사용한다. Firebase Auth Web + 서버 callable API + Firestore Standard UID별 원본 + Hosting이며 게스트만 IndexedDB다. 직접 DB 읽기/쓰기는 Rules로 전부 거절하고 API에서 최신 토큰/회수·UID·상태·스키마/한도·버전/중복을 검사한다. 운영 App Check는 강제다. 계정 기록은 메모리 캐시이고 영속 오프라인 큐는 없다. 서버 커밋 후 완료를 표시한다. 최근 재인증→지속되는 deleting→원본/출처/인증 삭제→완료의 재시도 가능한 서버 트리거를 사용한다. 임의256bit 삭제 영수증은 상태만 조회하며 sessionStorage에 확인 정보만 둔다. 완료 상태7일·호출 제한2일 후 TTL 정리 대상이다. 리전asia-northeast3·최대2/최소0 인스턴스이며 Blaze/예산·App Check·리전·실제 문의처·운영 배포는 아직 미설정이다. 사용자는 문의처를 추후 교체할 예정이므로 개발에는 준비 중으로 표시하며 실제 타인 이메일을 쓰지 않는다. 기존 account/의 인증 삭제 페이지만으로 서버 원본 삭제 완료를 주장하지 않는다.


2026-11-09 WEB-02는 Firebase Auth/Hosting Spark + Cloudflare Workers/D1 Free다. Blaze·Cloud Billing·결제수단·초과 자동과금·도메인 구매를 연결하지 않는다. worker/의 Wrangler4.158.0·Miniflare5.20261104.0-beta·jose6.2.16, compatibility_date2026-08-01을 사용한다. D1 atomic batch 안의 임의 버전 검사·쓰기와 UID별 서버 원본·최신 Auth/App Check 검증을 적용한다. 삭제 pending은 API 후속 작업과5분 Cron이 재시도하며 완료7일/호출 제한2일 뒤 제한된 Cron 정리 대상이다. Free 한도에서는 기능 실패/지연이 가능하며 운영 CPU10ms·DB500MB/계정전체5GB·실제 Free/결제 미연결·실메일·Galaxy·배포는 미검증이다. D1 자동 복구 이력 Free7일과 현재 DB 삭제를 구분한다. 기본 firebase.json은 유료 Functions/Firestore를 배포하지 않으며 firebase.web01.json은 이전 Emulator용으로 Functions 배포를 차단한다. 운영 키는 Worker secret에만 둔다. 실제 문의처 준비 전 개발에는 준비 중으로 표시한다.

2026-11-10 WEB-03은 기존 스택에 공개 설정 교차 검증/미배포 번들 생성, 무로그인 /privacy/ 안내·초안 표시, Cron 고정 실패/다른 작업 계속, 집계 전용 운영 SQL·절차를 추가한다. 공개 운영자/문의처/시행일/실제 처리 안내 확인 전 출시 번들을 생성하지 않는다. release.config.local.json은 Git 제외 공개 설정만 사용하며 비밀은 넣지 않는다. node app-web/scripts/prepare-release.mjs release.config.local.json은 tmp/release에 Hosting·Worker·D1 설정/번들과 SHA256 목록만 만들고 원격 리소스·배포·결제를 실행하지 않는다. 실제 Free/계정·운영 secret/CPU/메일/Galaxy는 여전히 미실행이며 docs/release/WEB-03-readiness.md가 최신 진행표다.

2026-11-10 WEB-04는 사용자 지금 확인(PR3 검토/병합·소유 계정 접근·공개 운영정보)과 연결 뒤 확인(실메일/Galaxy)을 구분한다. 기술 설정/JSON/실제 처리 안내 초안은 Codex가 준비하고 운영자는 사실/공개를 확인한다. 기존 PR #3을 유지하며 공개 저장소의 표준 ubuntu-24.04·읽기 권한·캐시/artifact 업로드/배포 없는 GitHub Actions를 사용한다. 비공개 저장소면 job을 건너뛴다. app-web/scripts/verify-release.mjs는 manifest/파일hash·경로/민감파일·Hosting/Worker 구성을 대조하며 출처 인증/무료 운영 확인을 대신하지 않는다. 로컬 검사는 docs/validation/WEB-04-launch-verification.md, 원격 결과는 실제 Actions/PR Checks를 따른다. 실제 계정/Free CPU/메일/Galaxy/서비스 배포는 계속 별도 검사다.
## 산출물과 검증

WEB-01 영구 삭제/휴지통 만료는 원문·출처와 함께 트랜잭션에서 최소 `removedRequests/{생성요청UUID}`와 중복 요청의 대상UUID만 남겨 다른 기기의 오래된 create 재시도로 기록을 되살리지 못하게 한다. 원문/내용지문 없이 계정 탈퇴까지 유지하고 worker가 함께 정리한다. 계정당 수명 누적 생성요청10만개 한도로 이 메타 비용도 제한한다(최초 중복 처리 포함, 이미 처리된 요청 재시도 제외). 게스트 IndexedDB는 v2이며 v1 원본을 보존하고 같은 최소 ID를 사이트 데이터 삭제 때까지 유지한다.

정적 목업 UI는 `web/`에 있고 P0 58개 화면 카탈로그와 목 데이터 상태 전이를 제공하는 의존성 없는 HTML·CSS·ES 모듈이다(docs/decisions/0001-static-mock-ui-stack.md). 패키지를 추가하지 않는다. Node는 Codex 런타임 v24 기준이다. 실제 로그인·DM·분석·DB 연동과 정적 목업의 동작을 구분한다.

- 단위·화면 테스트: `node --test --test-isolation=none "web/tests/*.test.mjs"`
- 카탈로그 정합: `node web/scripts/check-screens.mjs`
- 미리보기: `node web/scripts/serve.mjs` → http://localhost:5173/#/catalog (390×844 기준)

Android는 JDK 17·Gradle Wrapper 8.13·SDK/target 36·minSdk 29를 사용한다. 실행 환경은 android/README.md, 로컬 도구 선택은 android/scripts/check.ps1을 따른다.

웹 계정 서버 원본의 현재 요구/계약·시나리오는 결정0008·docs/plans/AUTH-03-account-cloud-policy.md·docs/validation/AUTH-03-account-cloud-policy.md를 우선한다. WEB-00의 이전 로컬 전용 시나리오는 이력이다. 위 목업/아래 Android 검사를 실제 웹앱·서버 원본·두 기기 조회·공유·운영 배포의 통과 증거로 재사용하지 않는다.

현재 웹 검사는 app-web/README.md·worker/README.md·docs/validation/WEB-03-release-preparation.md를 따른다. 의존성은 app-web/·worker/에 추가하며 functions/ 이력과 web/ 패키지 금지는 유지한다. Node22.12+가 필요하고 Java21+는 이전 Firestore 검사에만 필요하다.

- 통합: `node app-web/scripts/check.mjs` (기존 demo suite만 명시적으로 `--reuse-emulators`)
- 의존성: `npm --prefix app-web ci --ignore-scripts`, `npm --prefix worker ci --ignore-scripts`, `npm --prefix tools/auth-emulator ci --ignore-scripts`
- 웹: `npm --prefix app-web run dev:emulator` → http://127.0.0.1:5183/ (Emulator 서버 별도). 가상 이메일/데이터만 쓰며 운영 실사용 주소가 아니다.
- 취약점: `npm --prefix app-web audit`, `npm --prefix worker audit`. production 확인 번들은 가상 설정이므로 운영 빌드를 별도로 한다.
- 운영 전: `node app-web/scripts/preflight.mjs`·실제 Spark/Workers·D1 Free·결제 미연결·메일/비밀번호/열거 보호·App Check·D1/Cron·CPU·실메일/Galaxy/두 브라우저 검증. 실행 증거 전 배포 완료로 표시하지 않는다.

- Android 검사·빌드: `./android/scripts/check.ps1` 또는 `android/gradlew.bat -p android :core:test :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleRelease --no-daemon`
- JVM 도메인 검사와 Robolectric Android 로컬 검사를 실기기·에뮬레이터 검사와 구분한다. 실제 지도·공유 앱·파일 제공자·One UI 검사는 기기별 증거가 있어야 완료다.
- Android SDK·캐시·서명 키·로컬 경로와 빌드 산출물은 Git에 넣지 않는다. release 빌드는 실제 출시 서명·심사 완료를 뜻하지 않는다.

## 환경과 보안

.env.example에는 변수명과 가상 값만 둔다. 실제 .env·토큰·인증서·DB 덤프·사용자 기록은 Git과 문서에 넣지 않는다. 로그에 DM 본문·이메일·토큰·Cookie·Authorization을 출력하지 않는다. 외부 기획 도구에는 설계·가상 예시만 사용한다.

## 브랜치·커밋·PR

main에 직접 커밋하지 않고 작업 브랜치(`codex/<작업ID>-<slug>`)에서 커밋한 뒤 PR로 합친다. 커밋 후 push 전에 독립 Codex 코드 리뷰를 거친다. 커밋은 로컬에만 쌓고 push·PR 생성과 PR의 Codex 리뷰는 사용자가 요청할 때 모아서 한다. 커밋·PR에 도구 서명 줄을 넣지 않는다. 과거 `claude/*` 브랜치는 기존 이력으로만 유지한다. 절차는 docs/development/git-workflow.md다.

## Codex 작업·리뷰

사용자의 2026-10-19 요청으로 기획·설계·구현·검증·리뷰·로컬 커밋은 Codex가 끝까지 맡는다. Claude Code를 호출하거나 Claude 승인·계정 복구를 기다리지 않는다. 과거 브리프·스킬의 Claude 담당 지시는 이 규칙으로 대체하며 과거 실행 기록과 작성자는 보존한다. 절차는 docs/development/codex-workflow.md, 결정은 docs/decisions/0002-codex-only-workflow.md다.

구현 요청이 docs/plans의 브리프를 가리키면 그 브리프의 범위·하지 말 것·검증 명령을 따른다. 사용자가 명시적으로 범위를 바꾸면 관련 요구·설계·검증 문서를 함께 갱신하고 진행한다. 그 밖의 범위 밖 변경은 구현하지 않고 보고한다. 브리프 없이 직접 받은 요청은 필요한 계획을 작성하고 승인된 작업을 진행한다. 명확한 요청에 대한 통상적인 구현 선택·검증·로컬 커밋 때문에 다시 승인을 요청하지 않는다.

구현 후 브리프의 'Codex 구현 보고'에 변경 파일·실행 명령과 결과·미실행 검사와 이유를 적는다. 별도 읽기 전용 Codex 리뷰 세션의 지적을 실제 코드로 확인해 수정하고, 리뷰 기록이 APPROVED가 된 뒤 로컬 커밋한다. 커밋된 SHA는 별도 worktree에서 main 대비 재리뷰하고 통과한 SHA만 `tmp/codex/reviewed.txt`에 기록한다. 리뷰 후 추적 파일이 바뀌면 해당 변경을 커밋하고 새 SHA를 다시 리뷰한다. 브라우저 검증도 Codex가 수행하며 실행하지 못한 검사는 이유와 함께 남긴다.
