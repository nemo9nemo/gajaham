# WEB-02 · 결제 미연결 서버 검사

기준일2026-11-09. [브리프](../plans/WEB-02-no-billing.md)·[결정0010](../decisions/0010-no-billing-web-backend.md)·[사용 조사](../research/no-billing-stack-2026-11-09.md)를 따른다. 로컬 성공과 실제 Free 플랜/운영 검사를 구분한다.

## 환경과 실행 증거

Windows, Node22.23.4, Vite8.3.5, Firebase Web13.2.0, Wrangler4.158.0, Miniflare5.20261104.0-beta, jose6.2.16. compatibility_date는 사용한 안정 호환 동작을 고정하려고2026-08-01이다. Miniflare4.20260730.0에서 high3 경고를 발견해 Wrangler가 쓰는5.20261104.0-beta로 맞추고 audit0을 확인했다. beta 개발 도구는 운영 의존성에서 제외되며 로컬/번들 검사를 수행한다.

`node app-web/scripts/check.mjs`: Auth Emulator9199 + Wrangler/workerd/D1 localhost8787 + Vite5183 + 독립 Chromium 컨텍스트. 가상 이메일/가상 장소만 사용한다. 자동 서버 종료, 가상 D1은 Git 제외 tmp/codex에 둔다. 실제 프로젝트·사용자 기록·공개 배포에 접속하지 않는다.

| 검사 | 확인 항목 | 결과 |
|---|---|---|
| 게스트/도메인 단위5 | IndexedDB v1→v2 원본 보존·삭제 ID·입력·출처·중복/버전·만료 | 최종 PASS |
| JWT/Auth 관리2 | RS256 실제 서명·변조/만료/issuer/aud·앱 ID/typ·회수·OAuth 캐시·비공개 오류 | 최종 PASS |
| D1/API5 | UID 격리·동시 중복/편집·트랜잭션 rollback·삭제 재생성 차단·탈퇴 실패/재시도·quota503/CORS/body·만료200건과 대량 정리/Cron | 최종5 PASS |
| 브라우저8 | 두 계정/브라우저·명시적 이동·텍스트 XSS·충돌·로그아웃·삭제·응답 유실/늦은 조회·부분 이동·원본/중복 재생성 차단 | 최종8 PASS |
| production 번들/Hosting 설정 | Emulator/옛 Functions 주소 제외·sourcemap 없음·보안 헤더·기본 유료 배포 없음 | PASS |
| Worker production dry-run | production graph 번들83.25KiB·배포 없이 종료 | PASS |
| 의존성 audit | app-web 전체0, worker 전체0 | PASS |
| 기존 Firebase Emulator CLI audit | tools/auth-emulator는 moderate14, high/critical0. runtime 번들에 미포함 | localhost·가상 입력·고정 명령·silent 로그로 노출 제한, 잔여 경고 보존 |
| preflight 기본 설정 | 실제 프로젝트/연락처 없음 상태에서 운영 통과하지 않음 | 기본 미설정/CSP 불일치에서 exit1 확인 · 정상 차단 |
| 독립 구현/고정SHA 리뷰 | diff 리뷰 후 별도 worktree에서 main 대비 정확한 SHA 확인 | 구현 APPROVED · 커밋 후 SHA 판정은 tmp/codex/reviewed.txt 별도 장부 |

SDK 서명 테스트는 로컬 임시 RSA키를 메모리에서 생성하며 production entry의 Google JWKS를 우회하는 설정을 추가하지 않는다. 로컬 entry의 unsigned Auth Emulator 경로는 별도 모듈이고 demo+localhost에 한정한다. production 운영 키/App Check를 사용했다는 의미가 아니다.

합계20개(단위5+서버7+브라우저8) PASS다. Miniflare5 옵션 변경으로 첫 재검사에 실패한 뒤 공식 convertV4MiniflareOptions로 수정해 전체를 재실행했다. Cron pending2개 제한/Hosting의 정확한 API origin 검사 추가 뒤 서버7개·production 확인도 다시 통과했다. 의도적으로 주입한 상위 TimeoutError는 개인정보 없는 unavailable로 처리되고 요청 AbortSignal이 설정됨을 확인했다. Functions의 이전 predeploy hook은 exit1로 중단됨을 직접 확인했다. 변경 문서12개 상대 링크58개·git diff --check PASS. 원격 변경/push/PR은 없다.

## 미실행과 출시 전 필수

운영 Google/Cloudflare 소유 계정·Spark/Workers Free/결제 미연결 확인·관리 secret·D1 실제 위치·REST 권한·공개 배포·실메일·운영 App Check/헤더·Galaxy·실제 CPU10ms/호출50개·대량/한도 상태·Cron 실행은 아직 미실행이다. 로컬에는 운영 CPU 제한이 없으므로 이 검사를 통과했다고 표시하지 않는다. quota503 검사는 장애를 주입한 안전 응답 검사이며 Cloudflare 계정의 실제 한도를 소진하지 않았다.

Workers CPU10ms 또는 무료 메일/DB 한도가 맞지 않으면 유료 업그레이드 없이 제한/구성을 다시 검토한다. D1 자동 Time Travel Free7일을 고지하지만 DB 복구·삭제 요청 재적용 절차를 실행/검증하지 않았다. 문의처/처리방침 확정 전 공개 출시 완료로 보고하지 않는다.

운영자는 Worker 오류/사용량·D1 deleting 잔여를 확인하고 실패 원인을 해소해야 한다. 큰 삭제는400행 단위의 반복 실행에서 진행하며 원본/출처/최소 ID/Auth 정리가 모두 끝나야 완료 상태다. 완료/호출 정보 정리도200개씩이라 기한 뒤 지연될 수 있다. 만료 휴지통은 페이지 접속당3개씩 원문 정리하며 진행 중 탈퇴는 자동 만료하지 않는다.
