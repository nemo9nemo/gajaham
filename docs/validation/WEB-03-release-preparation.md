# WEB-03 · 사용자 확인 전 준비 검사

2026-11-10. 기준 [브리프](../plans/WEB-03-release-preparation.md)·[운영 절차](../release/WEB-03-operator-runbook.md)·[최신 상태표](../release/WEB-03-readiness.md). Windows·Node22.23.4/검사 일부22.14.0·Vite8.3.5·Firebase13.2.0·Wrangler4.158.0·Miniflare5.20261104.0-beta·jose6.2.16, 기존 패키지 유지. 새 런타임 의존성 없음.

## 실제 검사 결과

| 검사 | 실제 실행/증거 | 결과 |
|---|---|---|
| 전체 통합 | node app-web/scripts/check.mjs: 단위/출시9 + JWT/D1/API8 + Chromium9 | 26 PASS |
| 최종 출시 설정/번들 | node --test app-web/tests/release.test.mjs: 금지 서비스 allowlist·비밀/JWT/OAuth 오입력·미설정 거절·일치한 CSP/ID/DB·별도 bundle/hash/소스맵 제외 | 4 PASS 재검사 |
| 최종 D1/삭제/운영 SQL | node --test worker/tests/service.test.mjs: Cron 큐 조회/한 작업 실패 고정 오류·다른 작업 계속·재시도·health SQL 필드 | 7 PASS(전체 검사 뒤 추가한 SQL1개 포함) |
| JWT/Auth 관리 | 실제 임시 RSA 서명·위조/만료/대상 프로젝트/앱 ID·회수·관리 OAuth·타임아웃 | 전체 통합에서2 PASS |
| 브라우저 | 독립 Chromium·390/1440px·기존 계정/기기 기록8개 + /privacy/ 무로그인·외부 요청0·가로 넘침 없음 | 전체9 PASS |
| 개인정보 화면 | tmp/codex/WEB-03-privacy-mobile.png를 직접 시각 확인 | 초안/준비 중·본문·보존/국외 처리 내용 잘림/겹침 없음 |
| production | /privacy/index.html과 앱 빌드·개발 연결/소스맵 제외·Hosting 보안 헤더·Worker dry-run 83.50KiB | PASS. 운영 헤더/CPU 증거 아님 |
| 로컬 production HTTP | Vite preview의 /privacy/ GET, 127.0.0.1:5183 | 200·안내 제목 확인. 공개 배포 아님 |
| 잘못된 실제 설정 차단 | preflight.mjs·prepare-release.mjs release.config.example.json | 미설정 실제 정보/미확정 개인정보에서 exit1 정상 차단 |
| 취약점 | npm audit app-web/worker | 각각0 |
| 기존 Emulator CLI | npm audit fix --package-lock-only --ignore-scripts, 고정15.34.2와 lockfile 변화 없음 | moderate14/high·critical0 잔여. 강제13.11.2 다운그레이드 안 함 |

고유 검사27개를 확인했다(최초 전체26+후속 집계 SQL1). 최종 코드 변경에 관련된 출시4개·D1/SQL7개를 재검사했으며 UI 흐름을 바꾸지 않은 후속 검사 때문에 전체 브라우저 검사를 반복하지 않았다. CLI는 운영 번들에 미포함이며 localhost·demo 가상 데이터/고정 명령·silent 인증 링크 로그로 노출을 제한한다. 최신 CLI 메타데이터15.35.0도 glob^10.5.0 의존을 사용해 경고0을 위해 임의 major override를 넣지 않았다.

미배포 fixture는 가상 공개 설정만 사용한다. manifest는 status=BUILT_NOT_DEPLOYED, billingVerified=false, operatingChecksPassed=false다. 설정의 형식/확인 flag는 실제 계정/청구/개인정보 적정성을 자동 인증하지 않는다. API key 형식·JWT/OAuth/PEM/알 수 없는 필드 거절은 오입력 방지이며 모든 비밀 형태를 탐지하는 도구라고 주장하지 않는다.

## 수정/환경 이력

제한 환경의 첫 Wrangler 실행은 시작 네트워크 확인이 막혔다. 승인된 실행 환경에서 같은 --local/가상 프로젝트 검사로 통과했다. 로컬 HTTP 조회도 샌드박스 소켓 제한 뒤 허용 환경에서200을 확인했다. 이 실패는 원격 리소스/결제를 실행한 것이 아니며 자동 승인 심사의 거절도 아니다.

번들 검사 초기에는 jose PEM 파서의 정상 헤더 문자열을 키로 오인했다. 실제 base64 본문을 동반한 PEM 패턴으로 수정하고, raw/escaped newline의 가상 PEM 탐지와 정상 파서 상수 통과를 검사했다. 원본 데이터/인증 자료를 로그로 출력하지 않았다.

## 실행하지 않은 검사

소유 계정 로그인·실제 Spark/Workers Free·결제 미연결·실제 D1 위치·운영 secret/REST/Auth/App Check·실메일·실제 Free CPU10ms/DB50쿼리·사용량 한도·원격 Cron/보안 헤더·Galaxy·공개 배포는 연결 정보/실기기 부재로 미실행이다. 개인정보 처리방침의 실제 운영자/계약/국외 처리와 권리 행사 문구 확정도 남아 있다. 로컬 Chromium을 Galaxy 통과 증거로 사용하지 않는다. 실제 DB Time Travel 복구·삭제 재적용은 실행하지 않았다.

## 리뷰/커밋

독립 읽기 전용 Codex 리뷰 결과는 tmp/codex/WEB-03-implementation-review.md에 기록한다. 커밋 후 별도 worktree에서 main 대비 정확한 SHA를 재리뷰하고, 승인된 값만 tmp/codex/reviewed.txt에 기록한다. 원격 push/PR은 하지 않는다. 사용자 .claude/launch.json은 보존한다.
