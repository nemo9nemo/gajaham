# WEB-02 · 결제 연결 없는 웹앱과 사용 사례 조사

- 상태: DONE · 2026-11-09 사용자 “비용 청구 안되는 걸로 변경…실제 사용자…확인”에 따른 로컬 구현/검증/독립 구현 리뷰. 운영/공개 배포는 미실행, 정확한 커밋 SHA 리뷰는 별도 장부.
- 브랜치: codex/WEB-02-no-billing. main에서 생성 후 승인5512809를 fast-forward 통합. 사용자 .claude/launch.json 보존.

## 범위

실제 사용 통계·운영자 경험과 무료 제한을 조사한다. 운영 결제수단·유료구독·초과 자동과금을 사용하지 않는 정책으로 변경한다. Cloudflare Workers/D1 Free를 개인 API/서버 원본으로 사용하고 Firebase Auth/Hosting은 Spark로 유지하는 구성을 구현한다. 로그인/게스트·UID별 비공개·명시적 이동·버전/요청ID·서버 확인 후 완료·최근 재인증·지속되는 탈퇴 정리·기존 토큰 차단을 유지한다. 운영 계정 생성·결제·배포·도메인 구매·push/PR은 하지 않는다. 이전 Functions/Firestore 코드는 이력으로 보존한다.

무료 한도 도달 시 저장/조회/정리가 실패·지연될 수 있으며 자동 유료 전환으로 복구하지 않는다. Worker CPU10ms·하루10만 요청, D1 읽기500만/쓰기10만 행과 저장 한도는 계정 전체이며 운영 검증을 별도로 한다. 무제한/항상 가용·영구 무료를 약속하지 않는다. 운영자 계정이 실제 Free/Spark인지 확인하기 전 운영 완료로 표시하지 않는다.

## 스택·보안

기존 app-web/ Vite·Firebase Auth SDK와 게스트 IndexedDB를 유지한다. 새 worker/는 Wrangler4.158.0·Miniflare5.20261104.0-beta·jose6.2.16 정확 버전. Worker의 Firebase 토큰/App Check JWKS 검증과 Auth 최신 계정 조회·회수 확인을 사용한다. 운영 Auth 관리 자격증명은 Worker secret에만 두며 로컬/브라우저/문서에 실제 값을 쓰지 않는다.

D1 JSON 문서 저장 어댑터는 준비된 SQL·키 범위·버전 검사 트리거를 원자적 batch에 넣어 기존 도메인 트랜잭션의 경합/중복/삭제 fence를 유지한다. API 응답 및 무료 Cron이 지속된 삭제 작업을 재개한다. 오래된 삭제 상태·호출 한도 정보만 인덱스로 정리하며 원본 복구/파일 UI를 추가하지 않는다. 과거 Firebase 배포 경로의 Functions/TTL 과금 경로는 기본 배포에서 제거한다.

## 검증

- worker/: npm ci --ignore-scripts, npm test, npm audit, Wrangler production dry-run
- app-web/: 단위·브라우저 전체, production 번들/헤더/Emulator 분리
- 실제 Miniflare D1의 원자성·다른 UID·회수/정지·탈퇴·영수증/재시도·무료 한도 실패·타임아웃 검사
- docs 링크/diff, 독립 읽기 전용 구현 리뷰→로컬 커밋→고정SHA 별도 worktree main 대비 리뷰
- 운영 CPU/지역/메일/실제 무료 계정/모바일/공개 배포는 미실행으로 남긴다.

## Codex 구현 보고

- 변경: worker/src의 JWT/Auth REST/OAuth·App Check·CORS/본문 한도·D1 atomic batch·기존 도메인 규칙·탈퇴/Cron, app-web의 API origin과 개인정보 고지/검사, 기본 Firebase의 유료 배포 제거 및 옛 Functions 배포 중단 hook. AGENTS/계약/결정0010/실제 사용 조사와 출시 잔여 표/실행 안내를 함께 갱신했다.
- 검사: Node22.23.4의 node app-web/scripts/check.mjs에서 단위5+서버7+독립 Chromium8=20 PASS, production 번들/보안 헤더/Emulator 제외·Worker dry-run PASS. 최종 제한/헤더 검사 뒤 서버7개·production 재검사 PASS. npm audit app-web/worker 각각0. Miniflare4 high3은 Wrangler와 같은5.20261104.0-beta로 수정하고 옵션 API의 공식 호환 변환을 사용했다.
- preflight는 미설정 실제 프로젝트/문의처/CSP에서 exit1, 옛 Functions 배포 hook exit1로 정상 중단. 상대 링크58개/변경 문서12개·git diff --check PASS. 상세 시나리오/실패 이력은 docs/validation/WEB-02-no-billing.md다.
- 기존 tools/auth-emulator CLI는 현재 moderate14/high·critical0이다. 운영 번들에 포함하지 않고 localhost·demo 가상 입력·고정 명령·silent 로그로 노출을 제한한다. 이를 app-web/worker audit0과 구분한다.
- 미실행: 소유 계정 로그인/Free·Spark/결제 미연결 확인·운영 키/REST·실제 CPU10ms/DB50쿼리/무료 한도·리전/실메일/App Check·Galaxy·공개 배포. 현재 외부 요금제를 바꾸거나 해지했다고 주장하지 않는다. 원격 push/PR 없음, 사용자 .claude/launch.json 보존.

## 리뷰 기록

독립 읽기 전용 Codex web00_implementation_review가 D1 버전/원자성·인가·최신 회수/App Check·지속 삭제/재개·옛 배포 중단·실제 사용 통계/원문을 대조해 수정 필요 결함 없이 APPROVED로 판정했다. 최종 문서·CSP/추가 timeout 검사도 재확인해 APPROVED를 받았다. 결과는 tmp/codex/WEB-02-implementation-review.md에 기록했으며 정확한 SHA의 main 대비 worktree 리뷰는 tmp/codex 장부에 별도로 남긴다. 코드/파일 수정은 구현 세션만 수행했다.
