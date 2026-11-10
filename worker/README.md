# 개인 기록 API · Workers/D1 Free

WEB-03은 Cron 실패를 고정 ACCOUNT_CLEANUP_PENDING으로 식별하고 다른 작업을 계속 처리한다. pending은 지우지 않으며 재시도한다. operations/health.sql은 개인정보 없는 집계만 조회한다. 현재 배포/키/장애 점검 절차는 [운영 문서](../docs/release/WEB-03-operator-runbook.md), 사용자 확인 전 완료/남은 항목은 [상태표](../docs/release/WEB-03-readiness.md)를 따른다.

Firebase Auth/Hosting Spark와 함께 사용하는 WEB-02 서버다. 결제수단·Workers Paid·Cloud Billing을 연결하지 않는다. 계정별 원본은 D1에만 두고 브라우저가 DB를 직접 열지 않는다. [웹앱 실행](../app-web/README.md), [비용 조사](../docs/research/no-billing-stack-2026-11-09.md), [결정0010](../docs/decisions/0010-no-billing-web-backend.md)을 따른다.

## 운영 설정

wrangler.jsonc는 가상 값만 든 템플릿이다. 운영 프로젝트/DB가 아직 없으며 기본 build는 `wrangler deploy --dry-run`만 한다. 유료 요금제 활성화 명령·자동 업그레이드 코드는 없다. 코드가 원격 계정의 플랜 변경을 금지할 수는 없으므로 운영 전 실제 Spark/Workers Free/유료 구독·결제수단 미연결을 확인한다.

D1 Free DB 하나를 만들고 DB binding, FIREBASE_PROJECT_ID/NUMBER/APP_ID, WEB_ORIGIN을 실제 값으로 연결한다. Free는 DB당500MB다. 원격 read replication은 활성화하지 않는다. Schema는 migrations/0001_documents.sql을 적용한다. prepared statement만 쓰며 문서별 임의 버전 비교 트리거+쓰기+검사 행 정리를 단일 atomic batch로 수행한다. 읽은 뒤 다른 요청이 수정하면 전체 rollback 후 최대8번 재시도한다.

Firebase REST 사용자 조회/삭제용 전용 서비스 계정을 준비하고 Firebase Authentication 관리자에 필요한 권한으로 한정한다. Owner/Editor 키를 쓰지 않는다. FIREBASE_ADMIN_CREDENTIALS JSON은 **Cloudflare encrypted secret**으로만 등록하며 브라우저 공개 환경·Git·로그·문서에 실제 값을 쓰지 않는다. 운영 키를 이번에 만들지 않았다. 키 교체/회수와 Firebase Auth 관리 REST가 Spark에서 정상 동작하는지 실제 계정에서 검증한다. App Check JWKS/앱 ID와 ID token 서명·프로젝트·만료·최신 정지/회수 상태를 매 요청 검사한다. SDK의 UID 플래그나 클라이언트가 전달한 소유자를 신뢰하지 않는다.

App Check는 Spark의 reCAPTCHA Enterprise 허용 도메인·무료 평가 한도에 맞춘다. 한도 오류를 이유로 결제를 연결하거나 운영 검증을 끄지 않는다. CORS는 WEB_ORIGIN만 허용하고 Cookie를 쓰지 않는다. CORS 자체를 인증으로 간주하지 않는다. 요청 본문은32KiB, 스키마와 UUID·수정 버전·계정별 원본/요청/호출 한도를 서버에서 검사한다. 오류에는 사용자 본문·이메일·UID·토큰·상위 오류를 남기지 않는다.

## 삭제와 장애

최근5분 재인증→D1 deleting 지속→원본/출처/삭제 ID 정리→Auth 삭제→최소 완료 상태 순서다. API 후속 작업과5분 Cron이 재개하며, 큰 정리는 호출당 제한하여 다음 작업으로 넘긴다. 정지 상태부터 원본 접근을 막고 실패 때 완료를 표시하지 않는다. Cron은 오래 기다린 pending부터 최대2개 처리한다. 공급자/무료 한도 장애 시 처리와 정리가 지연될 수 있다. 운영자는 실패 지표와 D1 deleting 작업·사용량을 확인하고 원인을 해결해야 한다.

완료 상태/영수증7일·호출 제한2일 후 최대200개씩 정리 대상으로 삼는다. 진행 중 작업과 영구 삭제의 재생성 차단 ID는 이 시간 정리에 포함하지 않는다. 기록당 영구 삭제는 원문/출처를 지우고 최소 요청 ID만 탈퇴까지 남긴다. 목록은200건씩, 만료 휴지통은 숨기고 요청당 최대3건만 물리 정리하여 Free 호출 한도를 지킨다. 미정리 만료 원문은 이후 해당 페이지 접속에서 계속 정리된다.

D1 자동 Time Travel은 Free7일 이력이 남을 수 있다. 현재 DB의 삭제 완료와 공급자 복구 이력 소멸은 다르다. 사용자 파일 백업/가져오기는 제공하지 않는다. DB 복구는 서비스를 정지하고 삭제 요청을 재적용한 뒤 검사해야 하는 별도 운영 작업이며 이번에 구현/실행하지 않았다.

## 검증 경계

`npm test`, `npm audit`, `npm run build`와 저장소 루트의 `node app-web/scripts/check.mjs`를 사용한다. 로컬 workerd+D1·JWT 오프라인 서명·공식 Firebase Auth Emulator·독립 Chromium을 검사한다. local.mjs는 demo+localhost 전용이며 production graph에 포함하지 않는다. local config로 공개 배포하지 않는다.

운영 Free CPU10ms와 D1 호출50개·실제 REST/메일/App Check·Cron·보안 헤더는 실제 계정 연결 후 검사한다. local workerd에는 운영 CPU 제한이 없어 로컬 성공으로 CPU 적합성을 보장하지 않는다. 운영 배포/실기기 검사는 아직 없다. 무료 한도 초과 시 조회/저장/탈퇴가 제한되며 유료로 자동 복구하지 않는다.
