# 작업 규칙

## 프로젝트와 현재 범위

한국어로 소통한다. 가자함은 인스타그램 DM·링크로 받은 장소를 개인 맵과 두 사람의 공유 맵에 모으는 서비스다. 개발의 기준 경로는 C:\Users\love0\nemo9Dev\gajaham이다.

현재는 정적 목업과 로그인 없는 Android 개인 저장 앱 개발 단계다. Git 저장소·`web/`·`android/` 소스가 있으며 Android 로컬 Room DB를 구현하고 실제 로그인·DM·서버 DB 연동은 아직 없다. 기획 기준은 docs의 기획 문서(docs/personal-shared-map-plan-2026-10-12.md, docs/planning-review-2026-10-12.md)와 .planning-staging의 제품 기획·로드맵·시장 조사다. 요구·설계 파일 작성과 기능 구현·검증 완료를 구분한다. 구현되지 않은 기능과 실행하지 않은 검사를 완료로 표시하지 않는다.

2026-10-26 최신 요구는 이메일·비밀번호 기본 로그인, 로그인 없는 개인 이용 허용·상대 계정 연결 불가, 카카오·구글 등의 간편 로그인은 2차 개발이다. 로그인 여부와 관계없이 개인 기록은 기기 내에만 보관하고 앱 삭제 시 복구하지 않는다. 개인 기록 서버 백업·동기화와 사용자용 파일 백업/가져오기는 출시 범위에서 제외하는 정책이며 아직 실제 코드에 반영하지 않았다. 기준은 docs/decisions/0005-login-and-device-local-records.md와 docs/plans/AUTH-01-login-guest-analysis.md다. 갤럭시 우선·광고 수익화는 유지한다. 10월 19일 출시 기획과 결정 0003의 로그인 단계·개인 기록 클라우드 복구 제안은 최신 요구로 대체하며, 그 밖의 예산·목표·단계 제안은 구현·출시 완료와 구분한다.

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

2026-10-20 APP-01부터 `android/`에 로그인 없는 개인 저장 앱을 구현한다. Kotlin·Compose·Room으로 공유 링크·기기 내 영속 저장·수동 장소 확정·파일 백업/복원·휴지통을 다룬다. 실제 지도·자동 검색/분석·광고·로그인·공유 서버·DM은 후속이며 목업으로 연동 완료를 대신하지 않는다. 결정·브리프는 docs/decisions/0004-android-local-core.md, docs/plans/APP-01-android-local-core.md다. `web/`의 패키지 금지는 정적 목업에 계속 적용한다.

2026-10-26 AUTH-01은 로그인·비로그인·개인 기록 삭제 정책의 기능 분석이다. 실제 인증·계정별 로컬 영역·서버 인가·상대 연결과 파일 백업 제거는 미구현이다. 현재 Room v2/JSON 백업 구현과 새 출시 정책의 차이를 구분한다. 개인 원본과 사용자가 선택한 공유 사본·인증 계정 정보는 별도 데이터다. 계약·검증 시나리오는 docs/contracts/auth-and-guest.md, docs/validation/AUTH-01-login-guest.md를 따른다.

## 산출물과 검증

정적 목업 UI는 `web/`에 있고 P0 58개 화면 카탈로그와 목 데이터 상태 전이를 제공하는 의존성 없는 HTML·CSS·ES 모듈이다(docs/decisions/0001-static-mock-ui-stack.md). 패키지를 추가하지 않는다. Node는 Codex 런타임 v24 기준이다. 실제 로그인·DM·분석·DB 연동과 정적 목업의 동작을 구분한다.

- 단위·화면 테스트: `node --test --test-isolation=none "web/tests/*.test.mjs"`
- 카탈로그 정합: `node web/scripts/check-screens.mjs`
- 미리보기: `node web/scripts/serve.mjs` → http://localhost:5173/#/catalog (390×844 기준)

Android는 JDK 17·Gradle Wrapper 8.13·SDK/target 36·minSdk 29를 사용한다. 실행 환경은 android/README.md, 로컬 도구 선택은 android/scripts/check.ps1을 따른다.

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
