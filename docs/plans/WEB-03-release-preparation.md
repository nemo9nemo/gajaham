# WEB-03 · 사용자 확인 전 출시 준비

- 상태: DONE · 2026-11-10 사용자 “내가 직접 확인해야 하는 항목 제외하고 너가 할 수 있는 것들은 전부 진행”
- 구현 브랜치: codex/WEB-03-release-preparation. main에서 생성 후 승인44983ff를 fast-forward 통합.
- 참조: 결정0010, WEB-02, docs/contracts/web-account-data.md. 결제 미연결·URL 웹앱·개인 기록/게스트 정책을 유지한다.

## 목표와 범위

사용자 계정 로그인·공개 운영자/문의처 확정·실메일·Galaxy 실기기 확인을 제외하고 출시 준비를 완료한다. 로그인/서버·D1/메일·App Check·실제 Free CPU·공개 배포는 현재 연결 정보가 없어 사용자 확인 후 실행할 후속으로 남긴다. 준비 완료와 공개 서비스 운영을 구분한다.

1. 공개 클라이언트/Worker/D1 설정을 한 번 입력해 교차 검증하고 정확한 Hosting CSP·Worker 설정·배포용 번들을 만드는 **배포 없는** 로컬 도구를 구현한다. 가상 확인 번들과 실제 배포 파일을 분리하고 비밀 키/토큰/상태를 산출물에 담지 않는다.
2. 독립 URL의 개인정보 안내/탈퇴 안내 페이지를 구현한다. 운영자/문의처 미설정 시 준비 중을 표시한다. 개인정보 처리방침 초안·국외 처리/삭제/복구 이력·운영자 확정 항목을 문서화하며 법률 검토/실제 운영자 확인 완료를 주장하지 않는다.
3. 탈퇴/Cron 실패를 개인정보 없는 고정 오류로 식별하고 pending을 보존해 재시도한다. 운영용 집계 점검 SQL·사용량/장애/삭제·키 회수/복구 절차와 실제 실행이 필요한 검사표를 준비한다.
4. 설정 불일치/기본 미설정의 공개 차단, production Worker의 Emulator/비밀 제외, 개인정보 페이지·두 브라우저/계정·삭제/실패 흐름을 로컬 공식 Auth Emulator+workerd/D1+Chromium에서 검증한다. 의존성 취약점 현황과 수정 가능한 개발 CLI 경고를 확인한다.

## 하지 말 것

계정/유료 서비스 생성·카드/Blaze/Cloud Billing 연결·도메인 구매·실제 운영 키 생성·개인정보 임의 기입·공개 배포·push/PR은 하지 않는다. 지도/공유/DM/광고·사용자 파일 복구를 추가하지 않는다. .claude/launch.json 사용자 파일과 이전 Android/목업을 보존한다. 실제 비밀/사용자 데이터·인증 링크를 출력하지 않는다.

## 스택과 검증

기존 app-web/ Vite8.3.5·Firebase13.2.0, worker/ Wrangler4.158.0·Miniflare5.20261104.0-beta·jose6.2.16, Node22.12+를 유지한다. 새 런타임 패키지를 추가하지 않는다. 스크립트는 Node 기본 모듈과 기존 빌드 도구만 사용한다.

- node app-web/scripts/check.mjs (단위·출시 설정·JWT/D1/API·브라우저·번들·dry-run)
- npm --prefix app-web audit / npm --prefix worker audit / npm --prefix tools/auth-emulator audit
- node app-web/scripts/preflight.mjs (실제 정보 부재 시 실패가 정상)
- main 대비 diff 공백·상대 링크 검사, 독립 읽기 전용 구현 리뷰→로컬 커밋→정확한 SHA의 별도 worktree 재리뷰

## Codex 구현 보고

- 공개 설정의 project/App ID·기본 URL/Worker명·D1 연결·개인정보 표시 정보를 교차 검사하는 release-config와 미배포 prepare-release를 구현했다. Hosting·D1 Worker만 allowlist로 생성하며 실제 비밀/토큰·개발 연결·소스맵을 제외하고 파일별 SHA256 목록을 남긴다. 실제 운영 정보 없이 가상 번들을 공개용으로 사용하지 않는다.
- /privacy/와 인앱 안내를 같은 privacy-content로 연결했다. 별도 페이지는 인증 SDK/DB/App Check 초기화 없이 동작한다. 운영자/문의처/시행일/실제 처리 조건 부재 시 초안 표시·공개 준비 차단, 외부 입력 escaping을 적용했다.
- Cron의 큐 조회/삭제/만료 정리 실패를 개인정보 없는 ACCOUNT_CLEANUP_PENDING으로 표시하고 다른 작업은 계속한다. 집계 전용 health.sql 및 배포/운영·키/삭제/복구·개인정보 초안/확정 항목과 최신 상태표를 작성했다. 실제 DB 복구는 미구현/미실행 경계로 남겼다.
- 실행: Node22.23.4 node app-web/scripts/check.mjs에서 단위/출시9+JWT/D1/API8+Chromium9=26 PASS, production 두 HTML·헤더·개발 연결 제외와 Worker dry-run PASS. 후속 health.sql1개를 더해 고유27개 검사. 최종 공개 설정/비밀 차단4개·서버/SQL7개를 관련 변경 뒤 재검사 PASS. 모바일 캡처 직접 확인·로컬 production /privacy/ HTTP200. 상세 증거는 docs/validation/WEB-03-release-preparation.md.
- 의존성: app-web/worker audit 각0. 기존 CLI15.34.2의 호환 audit fix는 lockfile 변화 없이14 moderate/high·critical0을 남겼다. 강제13.11.2 다운그레이드/임의 major override 대신 localhost·가상 입력·고정 명령·quiet 로그로 노출 제한을 유지했다. 새 런타임 패키지는 없다.
- 문서11개 상대 링크53개·main 대비 공백 검사 PASS. 미설정 preflight와 release.config.example.json 준비는 exit1 정상 차단. 제한 환경의 공식 도구 시작/소켓 확인은 허용 환경에서 가상/localhost로 검증했으며 원격 리소스·실제 키·계정·결제·공개 배포·push/PR은 실행하지 않았다.
- 사용자 확인/연결 의존으로 미실행: 소유 계정 로그인·실제 Free/결제 미연결·공개 운영 정보·secret/실제 D1/Auth/App Check·실메일·운영 CPU/한도/헤더/Cron·Galaxy·공개 배포. .claude/launch.json 사용자 파일 보존. 준비 가능한 로컬 작업과 계정 연결 뒤 Codex가 이어서 수행할 작업을 상태표에 구분했다.

## 리뷰 기록

2026-11-10 후속 “전부 push하고 최종 런칭을 위해 정리” 요청으로 저장소 README와 docs/release/FINAL-LAUNCH-CHECKLIST.md를 추가했다. 최신 통합 PR과 원격 보관 이력 브랜치를 구분하고 main 병합·실제 계정/무료 상태·운영정보·배포/실기기 검사 순서를 정리했다. 문서 상대 링크12개/공백 검사를 통과했다. 기능 코드 변경은 없으며 소스 push/PR 리뷰와 실제 공개 서비스 배포 결과를 구분한다. 문서 독립 리뷰는 APPROVED이며 결과는 tmp/codex/SHIP-launch-docs-review.md에 기록했다. 로컬 커밋 뒤 정확한 SHA를 재리뷰하고 전송한다.

독립 읽기 전용 Codex web00_implementation_review는 설정/번들·개인정보 페이지/모바일 캡처·Cron/SQL을 확인해 APPROVED를 반환했다. 마지막 staged32개 파일의 비밀/JWT/OAuth 차단·운영 SQL 검사·문서도 재확인해 최종 APPROVED를 받았다. 로컬 커밋 뒤 정확한 SHA 리뷰는 별도 장부에 남긴다. 최종 SHA는 별도 worktree에서 main 대비 재리뷰 후 tmp/codex/reviewed.txt에만 승인된 값을 남긴다.

전체 전송 단계에서는 승인된 브랜치11개를 atomic push했다. 통합 PR #3을 생성했으며, 과거10개 draft PR 추가 생성은 자동 승인 검토가 명시 요청 범위/외부 변경 노이즈를 이유로 거절했다. 같은 동작을 우회하지 않고 원격 브랜치 보관+최신 통합 PR 하나를 유지하는 대안을 적용했다. 기존 브랜치별 PR 절차의 이번 미실행과 사유를 이 기록에 남긴다. 원격 main/병합·운영 서비스 배포는 변경하지 않는다.
