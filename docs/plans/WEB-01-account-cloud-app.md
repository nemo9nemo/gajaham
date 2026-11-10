> 2026-11-09: 현재 서버/비용 정책은 결정0010·WEB-02-no-billing이다. 이 문서의 Blaze·Functions·Firestore·TTL 운영 경로는 이전 이력이며 새 출시 조건이 아니다. 실제 출시 잔여 항목은 docs/research/no-billing-stack-2026-11-09.md와 docs/validation/WEB-02-no-billing.md를 따른다.

# WEB-01 실제 개인 기록 웹앱

- 상태: DONE · 개인 웹/서버 구현·로컬 검사·독립 구현 리뷰 완료. 운영 연결/검사·공개 배포 미완료
- 작성: Codex / 2026-11-03
- 브랜치: codex/WEB-01-account-cloud-app. 로컬 main에서 생성 후 기존 독립 리뷰 통과 SHA716339a를 선행 기준으로 fast-forward 통합. main/원격은 변경하지 않음.
- 근거: 결정0008·AUTH-03, 사용자 “해당 내용으로 작업 진행…보안/취약점 확인·조치…빠른 실사용”

## 목표·범위

URL 접속 개인 기록 웹앱을 app-web/에 구현한다. 이메일 가입/로그인/확인/재설정·게스트 IndexedDB·명시적 계정 저장·서버 개인 기록·중복/검색/분류·직접 장소 확정·메모/메뉴·방문·휴지통·동시 편집·탈퇴를 제공한다. 같은 계정으로 독립 브라우저에서 조회/갱신을 검사한다. 지도/자동 장소 검색·상대 연결/공유·DM/AI·광고는 후속이며 목업 성공 화면으로 대신하지 않는다. 외부 지도 검색 링크만 제공한다.

실제 스택: app-web/의 JavaScript ES 모듈 + Vite8.3.5 + Firebase13.2.0. 서버 functions/는 Firebase Functions7.4.0·Admin14.5.0·Node22 배포 런타임, 초기 로컬 Node24.22.1·최종 Node22.23.4. 검사 @firebase/rules-unit-testing6.0.0·Playwright1.64.1·fake-indexeddb6.2.7. 정확 버전/lock 고정. 기존 web/·Android 기능과 사용자 파일은 수정하지 않는다. 보안 검사에 사용하는 기존 tools/auth-emulator의 CLI만15.34.2 최신 패치와 안전한 audit fix로 갱신한다.

## 서버·보안 설계

모든 계정 데이터는 callable 서버 API가 최신 인증/회수·UID·계정 상태를 검사한 뒤 Firestore Admin으로 처리한다. 클라이언트 직접 Firestore 읽기/쓰기는 Rules 전체 거절. 사용자 UID/소유자를 요청값으로 받지 않는다. 엄격한 스키마·UTF-8 용량/개수·URL 프로토콜/중복·요청 ID/버전·호출 제한을 검증한다. 관리자 키는 웹/저장소에 넣지 않고 배포 서버의 기본 자격증명을 사용한다.

운영 callable App Check 강제, demo Emulator에서만 비활성. 계정 원본은 메모리 캐시·명시적 갱신/재진입으로 서버 재조회한다. 서버 확인 전 완료 표시 금지·UID/세대별 비동기 결과 분리. production 번들은 Emulator 코드/목적지를 포함하지 않는다. 외부 연결·동적 입력은 HTTPS/CSP·안전 DOM·URL 검증으로 제한한다. 로그인 여부/이메일 정보를 오류·로그로 노출하지 않는다.

탈퇴는 최근 재인증 후 서버에 지속되는 deleting 상태를 기록하고 실제 원본/중복 인덱스·인증 정리를 실행한다. 서버 작업의 재시도와 미확인 결과를 구분하며 완료 시 최소 삭제 상태만7일 후 TTL 정리 대상으로 둔다. 임의256bit 영수증의 해시로 최소 처리 상태만 확인하고 Auth 삭제 후에도 결과를 확인한다. 다른 기기의 기존 토큰도 새 기록 접근을 차단한다. 운영 백업/PITR·이미지·파일 복구 UI는 추가하지 않는다.

## 운영 경계

현재 Firebase CLI 계정0개·운영 프로젝트 미설정. 실제 프로젝트/허용 주소·메일/비밀번호/열거 보호·App Check·리전asia-northeast3·개인정보/문의·운영 비용을 배포 전 확인한다. 서버 함수/TTL의 운영 배포는 Blaze/결제 연결이 필요하므로 무료 운영으로 주장하거나 자동 활성화하지 않는다. 연결 가능한 범위의 확인은 계속하되 유료 계약·push/PR은 실행하지 않는다. 기존 Sites 호스팅으로 인증을 바꾸지 않고 선택한 Firebase 배포 방향을 유지한다.

## 검증 명령

- app-web/: npm ci, npm run test:unit, npm run build, npm audit --json
- functions/: npm ci, npm test, npm audit --json
- node app-web/scripts/check.mjs: 공식 Auth/Firestore/Functions Emulator 통합·Rules 거절·서버 API 공격/경합·Playwright 두 컨텍스트·프로덕션 번들/헤더 검사
- 기존 목업: node --test --test-isolation=none "web/tests/*.test.mjs", node web/scripts/check-screens.mjs
- git diff --check·문서 링크, 별도 읽기 전용 보안/구현 리뷰→로컬 커밋→정확 SHA의 별도 worktree main 대비 리뷰

서버/API·두 브라우저·게스트/계정 분리·삭제/실패·XSS/URL·만료/다른 UID·권한 변조·의존성 취약점을 실제 코드/공식 Emulator로 확인한다. 운영 인증·실메일·실제 Galaxy·운영 배포는 해당 증거 없으면 미실행이다.

## Codex 구현 보고

변경: app-web/ 실제 반응형 개인 보관함·공식 웹 인증·메모리 계정 캐시/IndexedDB 게스트·명시 이동·충돌/실패/탈퇴, functions/ 검증된 UID API·트랜잭션/한도·삭제 트리거, 루트 Rules/인덱스/Hosting 보안 설정, 결정0009/계약·AGENTS/실행 안내·검사/상태 문서. 기존 Android·web/ 목업은 보존했다. 문의처는 사용자 추후 준비 요청에 따라 개발에 준비 중으로 표시한다.

Node22·Java21·공식 CLI의 demo Auth/Firestore/Functions 통합 및 Chromium 두 컨텍스트에서 검사했다. 상세와 미실행은 [검증 기록](../validation/WEB-01-account-cloud-app.md)이다. 초기 취약점 웹high5·서버moderate6은 패치 버전 override로 해소하고 두 audit0건을 확인했다. 개발 CLI는15.34.2·안전한 audit fix 후 moderate16이 남는다. 운영 의존성에 포함하지 않으며127.0.0.1 demo 전용·신뢰하는 고정 명령/경로·조용한 로그로 노출을 제한한다. CLI의 minimatch 구버전 함수API와 호환되지 않는 전역 major override/CLI 구형 강등으로 감사 수치만 낮추지 않는다. 남은 경고는 숨기지 않는다.

실행 결과: `node app-web/scripts/check.mjs`13/13·production검사PASS, `node --test --test-isolation=none "web/tests/*.test.mjs"`164/164·카탈로그58/58. 390×844/1440×960 Chromium 화면을 실제 이미지로 확인했다. `preflight.mjs`는 운영 설정이 없는 현재 환경에서 의도대로 실패한다. Git diff check·17 ES 모듈 parse·민감키 marker 검사·8문서 상대 링크33개를 통과했다. 로그와 이미지는 Git 제외 tmp/codex/WEB-01-*에 둔다.

커밋 후 리뷰의 삭제 재생성 지적을 수정해 최종 `node app-web/scripts/check.mjs --reuse-emulators`16/16·production PASS. 생성 응답 유실→다른 브라우저 영구 삭제→보존 폼 재시도 거절, v1 게스트 보존 이관, 최소 삭제 영수증과 계정 누적 생성요청10만개 제한(최초 중복 포함·재시도 제외)·탈퇴 정리를 추가했다. 원문 없이 요청UUID만 계정탈퇴/게스트사이트데이터삭제까지 남기는 정책도 UI/계약에 반영했다. 의존성 변경은 없다.

운영 Firebase 계정0개이고 프로젝트/Blaze·메일/App Check·실제 문의처·Galaxy·공개 배포는 미실행이다. preflight는 미설정/가짜 설정을 거절한다. 운영/유료 활성화·도메인 구매·push/PR은 실행하지 않았다. 로컬 검증의 완료와 공개 출시를 구분한다.

## 리뷰 기록

독립 읽기 전용 1차 리뷰 P2 네 건을 코드로 확인해 수정했다: 조회 세대 부재→조회 세대, 정상 목록 호출 과소 한도→요청당1단위와 저장 응답 직접 반영, pending 재요청 무효→실제 retryAt 갱신, 이전 탈퇴 폼 세션→await 뒤 UID/객체/epoch 재검사. 늦은 조회 회귀·부분 이동·응답 유실 검사도 추가했다. 2차에서 영수증 분실 뒤 동일 계정 재개와 완료 경합을 보강했다. 최신 hash 배열을 읽는 최종 트랜잭션·이미deleted 응답 즉시 완료까지 대조한 최종 판정은 APPROVED. 리뷰 세션은 파일 수정/운영 호출/직접 검사 재실행 없이 코드와 기존 증거를 검토했다. 커밋된 SHA의 별도 worktree main 대비 리뷰는 별도 장부에 기록한다.

첫 고정 SHA afd2345는 별도 리뷰에서 P2 영구 삭제 후 과거 생성 재시도 재생성을 발견해 WARNING. 승인 장부에 넣지 않는다. [FIX-WEB-01](FIX-WEB-01-create-receipts.md)에서 최소 영수증·요청 한도·게스트 v2 및 회귀 검사를 보강했고 2026-11-04 독립 구현 리뷰 APPROVED. 새 SHA 판정은 별도 장부에서 관리한다.
