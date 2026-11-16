# WEB-05 · 무료 인증 초기 설정과 가입 정책 일치

- 상태: DONE · 구현/검사2026-11-13·구현 리뷰2026-11-16 (외부 동의·실제 서버/배포는 별도)
- 사용자 범위: PR #3 병합 뒤 가능한 출시 준비를 계속하고, 계정/동의 상태를 다시 확인한다.
- 브랜치: 최신 main의 codex/WEB-05-production-auth-readiness.

## 목표·범위

사용자가 체크한 Firebase 약관 동의를 확인한 뒤 Spark 프로젝트·웹앱·기본 Hosting 연결·이메일/비밀번호 제공자를 설정한다. Gemini·Analytics는 제외한다. 운영 비밀번호는 소문자·숫자를 포함한12~128자, 필수 시행으로 맞추며 웹 가입 검사/안내도 같은 기준으로 정리한다. Firebase의 문자 종류 설정은 소문자/대문자를 각각 지정하므로 기존 '영문 중 하나' 안내와 서버 조건이 다르지 않게 한다. 로그인/재인증에는 가입용 새 검사를 적용하지 않는다.

이메일 열거 보호·인증 계정만 직접 삭제하는 사용자 작업 차단·운영 인증 도메인을 확인한다. Cloudflare 이메일 인증이 완료된 경우에만 무료 D1/Worker 설정을 이어간다. 실제 공개 설정은 Git 제외 파일에만 두며 공개 정보 확인 전 출시 번들은 생성하지 않는다.

## 하지 말 것

결제수단·Blaze/Cloud Billing·유료 구독·도메인 구매를 연결하지 않는다. 미완료 메일 인증을 우회하거나 관리 비밀을 대화/문서/Git에 남기지 않는다. 서비스 계정 키/권한 확대는 별도 명시 확인 없이 UI로 생성하지 않는다. 운영 정보·문의처를 임의로 채우지 않는다. 지도/공유/DM/광고 범위를 추가하지 않는다. 코드 push와 실제 배포/운영 검사 완료를 구분한다. .claude/launch.json을 보존한다.

## 스택·검증

기존 Vite/Firebase·Workers/D1·Node22와 직접 의존성 버전을 유지한다. 개발 Emulator CLI의 새 audit 지적은 --ignore-scripts의 호환 패치만 적용하고 --force/메이저 강제 변경을 하지 않는다. node app-web/scripts/check.mjs로 공식 Emulator/D1·독립 Chromium·production 번들/Worker dry-run을 검사한다. 가입 정책 위반이 Auth 가입 요청을 보내지 않고 안내/비밀번호 지우기로 끝나는지와 정상 가입을 브라우저에서 검증한다. 실제 Firebase 설정은 콘솔의 저장 결과로 확인하고, 실제 메일·App Check·D1/API·Free CPU·Galaxy·배포 성공은 별도로 검증한다. 문서 링크/공백·독립 구현 리뷰·고정 SHA worktree 리뷰를 거친다.

## Codex 구현 보고

- 실제 Spark 프로젝트·웹앱/기본 Hosting 연결·이메일 로그인 제공자, 필수 비밀번호 정책·열거 보호·직접 Auth 삭제 차단·localhost 제외를 확인했다. SDK의 실제 공개 정책 읽기로6경계를 확인했으며 실제 계정 생성/메일 검사는 하지 않았다.
- gateway/main의 가입 검사·안내와 서버 조건을 일치시켰다. 기존 로그인/재인증 동작을 유지하고 새 브라우저 검사로 Auth 요청 전 거절·비밀번호 제거·정상 최소 가입을 확인했다.
- AGENTS·계약·지금 할 일/최종 체크리스트·현재 상태/운영 절차를 실제 진행에 맞게 갱신했다. PR #3 병합과 아직 남은 사용자 이메일/운영정보를 구분한다. 실제 공개 설정은 Git 제외 파일에만 준비했다.
- 개발 CLI의 새 moderate2건을 호환 패치로 해소했다. 기존 CLI 직접 버전을 유지했으며 웹/Worker audit0·CLI moderate14/high 이상0을 구분한다. 전용 Chromium 부재를 해결한 뒤 의존성 패치를 포함한 최종28개·production/Worker dry-run을 통과했다.
- 실행 결과와 미실행 항목은 [검사 기록](../validation/WEB-05-production-auth-readiness.md)을 따른다. App Check 추가 약관·Cloudflare 이메일 인증·실제 D1/API/secret·CPU/메일/Galaxy·공개 배포는 미완료다.

## 리뷰 기록

2026-11-16 별도 읽기 전용 Codex web05_implementation_review가13파일의 요구/코드/호환 패치·증거와 운영 경계를 확인해 **APPROVED**를 반환했다. 수정 지적은 없고 git diff --check를 통과했다. 기존 테스트를 반복하지 않았다. 결과는 Git 제외 tmp/codex/WEB-05-implementation-review.md다. 커밋된 정확한 SHA는 별도 worktree에서 main 대비 재리뷰한다. 원격 CI는 실제 PR Checks의 완료 결과를 따른다.
