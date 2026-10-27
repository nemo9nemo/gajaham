# 0006 공식 이메일 인증과 기기 내 소유 영역

- 결정: 2026-10-27 / AUTH-02
- 상태: 구현·로컬 검증 완료, 운영 활성화·실기기는 미완료
- 근거: 사용자 자율 기획·개발 요청, 결정 0005

기본 인증은 Firebase Authentication 공식 Android SDK로 구현한다. 자체 비밀번호·토큰 암호화/저장 서버를 만들지 않는다. 인증 UID가 Room의 계정 영역을 식별하며 이메일 일치로 합치지 않는다. 게스트는 익명 인증 계정조차 생성하지 않는다. Firebase에 개인 장소 컬렉션·Firestore·분석 SDK를 추가하지 않는다.

기존 Kotlin 2.2.21 도구에 맞춰 BoM **34.9.0 / Auth 24.0.1**을 고정한다. 처음 시도한 BoM 35.1.0/Auth 25.0.0은 Kotlin metadata 2.4.0으로 컴파일이 거절됐다. 검사 우회 플래그를 사용하지 않고 호환되는 공식 SDK를 선택했다. [공식 배포 이력](https://firebase.google.com/support/release-notes/android)을 확인했다. 향후 도구와 SDK 업그레이드는 다시 검증한다.

Room v3의 `(ownerScope, canonicalSource)` UNIQUE와 모든 레코드 읽기/수정의 owner 조건으로 게스트·계정 A·계정 B를 분리한다. v1→v2 출처 보정 뒤 v2→v3에서 기존 레코드를 guest로 보존한다. 영역 선택·접근 정지·탈퇴 pending tombstone은 Room metadata에 둔다. 소유 영역 이동은 사용자 확인 후 기기 내 트랜잭션으로만 수행하며 중복은 게스트에 남긴다. 이동·로그인에 개인 원본 네트워크 전송은 없다.

화면이 연 owner/generation을 쓰기 시 전달한다. 이미 전환된 화면의 클릭은 거절하고, 전환 전에 시작한 작업은 원래 영역에 묶는다. 인증 네트워크는 로컬 저장 mutex를 잡지 않는다. 수신 Intent의 owner·handled·committed를 구분하고 다른 영역/원래 영역 미확정 재생은 저장 성공으로 표시하지 않는다.

최근 비밀번호 재인증에 성공하면 해당 계정의 개인 원본 삭제와 pending 표시를 한 DB 트랜잭션으로 묶고 SDK의 계정 삭제를 요청한다. 통신 결과가 불명확하면 완료를 단정하지 않는다. pending 계정은 새 쓰기를 거절한다. SDK가 원격 삭제에 성공했지만 로컬 마무리 기록이 실패하면 원격 성공 사실을 따로 안내한다. 프로세스가 원격 성공/로컬 마무리 사이 종료되면 서버 완료 여부 미확인으로 남을 수 있으며, 기록은 이미 지워져 있고 재로그인을 개인 기록 복구로 취급하지 않는다. 분산 트랜잭션 완료를 약속하지 않는다.

명확한 세션 무효/정지/삭제 응답은 계정 로컬 접근을 정지하고 게스트로 전환한다. 네트워크 실패는 자체 계정의 기기 기록을 지우지 않고 재확인 상태로 안내한다. 앱 시작/다시 진입 시 SDK 세션을 재확인한다. 이후 성공한 동일 UID 로그인만 정지된 영역을 다시 연다.

운영 설정은 Git에서 제외한 `android/auth.local.properties`의 공개 클라이언트 설정으로 주입한다. 운영 키·메일·정책·실제 개발자 계정을 만들거나 발송하지 않는다. 설정이 없으면 게스트는 계속 작동하고 인증은 사용 불가로 안내한다. debug의 명시적인 공식 demo Auth Emulator는 루프백/Android 에뮬레이터 호스트에만 연결한다. release는 항상 emulator=false이고 평문 인증 예외를 포함하지 않는다. 서비스 계정 키를 앱/웹에 넣지 않는다. release R8은 SDK의 정보/디버그 로그 호출도 제거한다.

`account/`는 앱 외부의 이메일 인증 계정 삭제 페이지다. 브라우저 저장소·URL·로그에 비밀번호/토큰을 넣지 않고 공식 HTTPS REST의 로그인/최근 인증 후 삭제만 호출한다. 로컬 확인은 demo Emulator로 한다. 원격 웹은 기기 DB를 삭제할 수 없다는 차이를 안내한다. 실제 HTTPS 공개 호스팅과 Play 등록은 아직 수행하지 않는다.

상대 연결/공유 서버·소셜·실제 지도·광고·DM은 후속 구현이다. 로그인 성공이나 이메일 확인을 연결 성공으로 꾸미지 않는다. OS 복원 차단은 기존 XML을 유지하되 Galaxy/Smart Switch 실기기 검사는 별도다. 참고: [공식 SDK 계정 관리](https://firebase.google.com/docs/auth/android/manage-users), [공식 Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [공식 REST](https://firebase.google.com/docs/reference/rest/auth).
