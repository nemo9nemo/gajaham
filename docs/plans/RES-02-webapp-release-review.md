# RES-02 웹앱 출시 분석과 개선 방향 정리

- 상태: DONE
- 작성: Codex / 2026-11-17
- 작업 브랜치: `codex/RES-02-webapp-release-review`
- 기준 커밋: `f714893` (로컬 main)
- 요청: 프로젝트를 분석해 웹앱 출시 보완사항·기능 개선점·구체적인 수정 방향을 Markdown으로 작성한다.
- 참조: [AGENTS.md](../../AGENTS.md), [계정 계약](../contracts/web-account-data.md), [최신 운영 인증 증거](../validation/WEB-05-production-auth-readiness.md)

## 목표와 범위

실제 구현·기존 검사 증거·이번 재검사·개선 제안을 구분한 [분석 보고서](../research/webapp-release-review-2026-11-17.md)를 작성한다. 항목마다 우선순위, 문제/영향, 수정 방향, 관련 파일, 완료 기준을 제시한다. 개인 보관함 출시와 지도·두 사람 공유·DM 확장을 구분한다.

## 하지 말 것

애플리케이션 코드·정책·의존성 변경, 운영 계정/비밀 조회·설정, DB 생성·원격 배포·결제 연결, push·PR 생성은 하지 않는다. `.claude/launch.json` 등 기존 사용자 파일은 포함하지 않는다. 제안을 승인된 제품 범위나 구현 완료로 표시하지 않는다.

## 진행 순서

1. 기획·계약·출시/검사 문서와 `app-web/`, `worker/`, 공통 도메인·CI를 대조한다.
2. 기존 공식 Emulator·로컬 D1·독립 Chromium 검사를 재실행하고 화면과 의존성을 확인한다.
3. 공급자 제한/DM 연동 관련 공식 문서를 조회해 현재 제약과 확인할 조건을 정리한다.
4. 우선순위·수정 방향·검증 시나리오·개발 순서를 보고서로 작성한다.
5. 별도 읽기 전용 Codex 리뷰 후 로컬 커밋하고, 고정 SHA를 별도 worktree에서 main 대비 재리뷰한다.

## 검증 명령과 완료 기준

- `node app-web/scripts/check.mjs`: 가상 데이터의 단위/출시·JWT/D1/API·Chromium·production 검사·Worker dry-run. 운영 검사가 아님을 명시한다.
- `npm --prefix app-web audit --json`, `npm --prefix worker audit --json`: 현재 의존성의 보안 검사. 설치/갱신은 하지 않는다.
- 새 문서의 상대 링크 대상·코드 근거/함수명·공백 검사와 `git diff --check`.
- [x] 기존 기능과 미구현 기능을 구분한다.
- [x] 출시 차단 조건과 후속 개선을 나누고 수정 방향·완료 기준을 제시한다.
- [x] 새로 실행한 검사와 과거/미실행 검사를 구분한다.
- [x] 별도 구현 리뷰 r2 APPROVED. 로컬 커밋 뒤 고정 SHA 리뷰는 `tmp/codex/`에 기록한다.

## Codex 구현 보고

- 변경 파일: 이 브리프와 `docs/research/webapp-release-review-2026-11-17.md`. 기능 코드는 수정하지 않았다.
- 실행 환경: workspace의 Git 제외 Node `22.23.4`, 기존 전용 Playwright Chromium 캐시. 잘못 추정한 Node 경로는 실행되지 않았고 실제 경로로 바로잡았다.
- `node app-web/scripts/check.mjs`: 단위/출시 9 + JWT/D1/API 9 + Chromium 10 = 28 PASS, production 번들/헤더 설정/Emulator 제외·Worker dry-run PASS. 로그: `tmp/codex/RES-02-check.log`.
- 최초 샌드박스 실행은 Wrangler 네트워크 오류로 중단됐다. 승인된 제한 밖 재실행으로 통과했다. 원격 배포는 하지 않았다.
- 웹/Worker audit: 각각 취약점 0. 최초 샌드박스 npm DNS 실패 후 승인된 네트워크 재실행 결과다. 결과: `tmp/codex/RES-02-audit-web.json`, `tmp/codex/RES-02-audit-worker.json`.
- 브라우저: 기존 통합 검사로 독립 Chromium을 실행했고 생성된 390×844 모바일 화면을 시각 확인했다. Samsung Internet·Galaxy 실기기·운영 메일/CPU는 실행하지 않았다.
- 공식 문서: Workers/D1 제한·과금 기준, Firebase Auth/App Check, Meta 메시징 권한을 조회했다. 운영 콘솔 상태는 재확인하지 않았으며 11월13일 기록과 이번 확인을 구분했다.
- 문서 2개의 상대 링크 37개·대상 존재/끝 개행/후행 공백/문자 깨짐 검사 PASS. 신규 파일 대상 `git diff --no-index --check`에서 공백 오류 없음(파일 추가 차이와 CRLF 변환 안내는 검사 실패로 해석하지 않음). 스테이징 후 `git diff --cached --check`로 최종 확인한다.

## 리뷰 기록

- r1: WARNING. 별도 읽기 전용 Codex 리뷰가 F01의 필수 입력 설명 1건을 지적했다. `recordDialog`·`normalizeInput`에서 링크만 저장 가능함을 직접 확인하고, 여러 선택 필드의 노출에 대한 사용성 제안으로 고쳤다.
- r2: **APPROVED**. 독립 리뷰어가 수정본을 다시 읽어 지적 해소·추가 중대 지적 없음을 확인했다. 코드 근거·로컬/운영 검증 구분·상대 링크 37개·audit 0 결과를 확인했다.
- 구현 리뷰 결과: `tmp/codex/RES-02-implementation-review.md`. 커밋 후 정확한 SHA 리뷰 결과는 Git 제외 `tmp/codex/`에만 기록한다.
