# 0009 · 개인 기록 웹앱의 서버 API와 삭제 수명

- 상태: 채택 / 2026-11-03 / 사용자 WEB-01 구현·보안 확인 요청
- 선행: [0008](0008-account-cloud-records.md), [WEB-01](../plans/WEB-01-account-cloud-app.md)

## 결정

`app-web/`는 Vite8.3.5·Firebase Web13.2.0의 ES 모듈 앱이다. 기존 패키지 없는 `web/` 목업·Android는 보존한다. `functions/`는 Functions7.4.0·Admin14.5.0·Node22의 callable 개인 API와 삭제 트리거다. 순수 입력/URL 규칙만 두 환경에서 공유한다. 서버 개인 기록은 Firestore Standard 기본 DB의 `users/{검증UID}/records/{UUID}`에, 출처 중복 인덱스는 같은 UID의 sources 하위에 저장한다. 초기 리전은 서울asia-northeast3, Hosting의 기본web.app 주소로 별도 도메인 구매 없이 시작한다.

직접 클라이언트 Firestore 읽기/쓰기를 Rules에서 모두 거절한다. 서버가 Auth 토큰 서명/만료·회수·정지/삭제·UID와 계정 메타 상태를 검사하고 Admin 기본 자격증명으로 접근한다. 요청에 소유자/UID를 받지 않는다. 운영 callable은 App Check를 강제한다. 현재 공개 운영 프로젝트·결제·실제 App Check/메일 설정은 없으며 공식 demo Emulator 검사와 운영 완료를 구분한다.

입력 키/형식/길이·HTTP(S)·자격증명 없는 URL·분류/방문·요청UUID·기록revision을 서버에서 검사한다. 링크 원본과 중복 정규화 키는 분리한다. Instagram의 알려진 게시물 경로만 제한적으로 정규화하고 비기본 포트·다른 URL의 의미 있는 경로/쿼리는 보존한다. 출처 인덱스·레코드·계정 용량은 트랜잭션으로 갱신한다. 생성 재시도와 마지막 수정 재시도는 요청ID/내용지문으로 판별하고 충돌은 덮어쓰지 않는다. 계정당5000건·기록 직렬화 UTF-8 2MiB, 분당120 API 요청이며 실제 DB/인덱스 용량과 월 과금 상한을 뜻하지 않는다.

게스트만 IndexedDB 원본이다. 로그인은 업로드하지 않고 사용자가 계정 저장을 명시적으로 선택한다. 서버 확인·동일 로컬revision 확인 후 해당 원본만 정리하고 중복·부분 실패는 남긴다. 계정 기록은 메모리에만 캐시하고 SDK 영속 DB 캐시·오프라인 쓰기 큐를 사용하지 않는다. Auth의 공식 세션 저장은 기록 캐시와 별개다. 저장 응답을 확인한 뒤 메모리 목록에 반영하며, 명시적 갱신/재진입에서 서버 전체를 다시 조회한다. UID/세션·조회 세대가 오래된 응답을 버린다.

## 탈퇴

최근5분 비밀번호 재인증 뒤 임의256bit 삭제 확인 영수증을 포함해 startDeletion을 보낸다. 서버는 SHA256만 저장하고 deleting 상태와 deletionJobs를 원자적으로 생성한다. pending부터 새 기록 접근을 거절한다. Firestore 트리거가 records·sources·Auth·호출 제한을 정리하고 완료 상태를 커밋한다. 재시도는 안전하며 재요청은 deletionRetryAt을 갱신해 트리거를 다시 발생시킨다. 원래 탭의 영수증을 잃었어도 같은 유효 계정을 재인증하면 새 영수증으로 재개할 수 있다(최대8개). worker 완료 트랜잭션은 최신 영수증 배열을 다시 읽어 모두 완료 처리하고, 완료와 재요청이 경합해 이미deleted 응답이면 클라이언트는 즉시 완료 처리한다.

인증 계정이 사라진 뒤에도 결과를 확인해야 하므로 deletionStatus는 App Check와 영수증으로 최소 `deleting/deleted/unknown`만 반환한다. 사용자 식별/개인 기록 API와 분리하고 UID·이메일·원본을 반환하지 않는다. Auth Emulator의 verifyIdToken(false)도 계정 회수를 검사하는 실제 동작을 우회하지 않는다. 영수증/UID 확인 정보는 해당 탭sessionStorage에만 남기고 완료 확인 뒤 지운다. UID는 상태 조회 요청에 보내지 않는다.

완료된 users tombstone와 deletionJobs는7일, 호출 제한은2일 후 TTL 정리 대상이다. TTL은 지연될 수 있다. 진행 중 삭제 작업을 자동 만료시키지 않으며 운영 감시·재시도 재개가 필요하다. 현재 운영 백업/PITR·사용자 파일 복원·기존 Android 원본 이전은 제공하지 않는다. 오래된 `account/`의 인증 삭제만으로 WEB-01 기록 삭제를 완료 처리하지 않는다.

## 비용·운영

Functions/TTL 운영 배포에는 Blaze 결제 연결이 필요하다. 함수 최소0·최대2 인스턴스, 기록 상한과 호출 제한으로 초기 사용량을 줄이되 비용0원·월 강제 상한을 보장하지 않는다. 프로젝트/예산·Artifacts 정리·App Check·리전·실메일·문의처/처리방침·Galaxy 검사를 구체적으로 확인한 뒤 배포한다. 이 결정으로 유료 활성화나 공개 배포가 실행된 것은 아니다.

문의처는 사용자가 추후 마련하기로 했다. 개발 화면에는 준비 중을 표시하고 임의의 실제 타인 이메일을 넣지 않는다. 공개 preflight에서는 실제 문의처를 요구한다. 공개 자격증명 형식 검사는 실제 운영 권한·App Check·보안 헤더 검사를 대신하지 않는다.

## 근거

- [공식 callable 인증·App Check](https://firebase.google.com/docs/functions/callable), [App Check 강제](https://firebase.google.com/docs/app-check/cloud-functions)
- [토큰 회수 검사](https://firebase.google.com/docs/auth/admin/manage-sessions), [Firestore 서버 라이브러리의 Rules 우회](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Functions Node22·Blaze·인스턴스/배포 저장 비용](https://firebase.google.com/docs/functions/manage-functions), [Firestore TTL](https://firebase.google.com/docs/firestore/ttl)
- 실제 검사·제한: [WEB-01 검증](../validation/WEB-01-account-cloud-app.md)
