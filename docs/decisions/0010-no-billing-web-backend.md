# 0010 · 결제 연결 없는 웹 서버

- 결정: 2026-11-09 · 사용자 “비용 청구 안되는 걸로 변경…실제 사용자…확인”
- 결정0008/0009의 계정 서버 원본·기기 간 접근 정책을 유지하고 WEB-01의 Blaze/Functions/Firestore 배포 선택을 대체한다.

Firebase Auth/Hosting Spark + Cloudflare Workers/D1 Free를 사용한다. 카드·Cloud Billing·유료 플랜·초과 자동결제는 연결하지 않는다. 한도에 도달하면 기능 실패/중단을 허용하며 유료 전환은 별도 사용자 요구 없이 하지 않는다. 도메인은 기본 web.app/workers.dev를 사용한다. 시장 통계·대안·한도 근거는 [조사](../research/no-billing-stack-2026-11-09.md)를 따른다.

개인 원본은 Worker가 검증한 UID별 D1 영역이며 게스트는 기존 IndexedDB v2다. 브라우저의 직접 DB 접근은 없다. Worker가 Firebase ID/App Check JWT, 최신 사용자 상태·회수 시각을 확인하고 한도·스키마·버전·중복·삭제 재시도 차단을 적용한다. 관리 자격증명은 Worker secret으로 한정한다. 영속 계정 오프라인 큐·사용자 파일 복구·다른 사용자 개인 맵 노출은 추가하지 않는다.

탈퇴 pending을 저장한 뒤 API 후속 작업과5분 Cron이 정리한다. 큰 작업은 나누고 다음 Cron에서 계속하며 무료 한도/상위 서비스 장애에서는 완료로 표시하지 않는다. 완료 상태7일·호출 제한2일 뒤 정리 대상으로 삼되 지연될 수 있다. D1 자동 Time Travel의 Free7일 이력과 현재 DB 삭제를 구분해 고지한다. 사고 복구는 삭제 요청 재적용을 포함한 별도 절차가 필요하다.

기존 functions/ 및 WEB-01 검사 증거는 이력으로 보존한다. 기본 firebase.json은 Hosting/Auth Emulator만 사용하고 Firebase 유료 배포를 포함하지 않는다. firebase.web01.json은 옛 Emulator용이며 Functions predeploy는 중단한다. 실제 운영 계정·자격증명·Free 플랜·CPU10ms·메일·Galaxy·배포는 미실행이다. 로컬 성공은 운영 무료 보장/공개 출시 완료가 아니다.

구현/검사: [WEB-02 브리프](../plans/WEB-02-no-billing.md), [검사 기록](../validation/WEB-02-no-billing.md).
