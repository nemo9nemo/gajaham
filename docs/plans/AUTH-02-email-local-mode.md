# AUTH-02 이메일 인증과 기기 내 개인 이용 모드

**2026-11-03 후속:** 아래 Android/삭제 페이지 구현과 검사 기록은 보존한다. 새 웹앱은 [결정 0008](../decisions/0008-account-cloud-records.md)·[AUTH-03](AUTH-03-account-cloud-policy.md)에 따라 계정 서버 원본·여러 기기 조회로 바뀐다. 이 브리프의 로컬 전용 구현이 서버 동기화/서버 기록 탈퇴 정리까지 제공하는 것은 아니다.

- 상태: 구현·로컬 검증 완료 · 운영 활성화/실기기/스토어 출시는 미완료
- 작성: Codex / 2026-10-27
- 브랜치: `codex/AUTH-02-email-local-mode`
- 요구: [AUTH-01](AUTH-01-login-guest-analysis.md), [결정 0005](../decisions/0005-login-and-device-local-records.md)

## 목표와 범위

공식 Firebase Authentication의 이메일/비밀번호 가입·로그인·이메일 확인·재설정·재인증 후 탈퇴를 네이티브 앱에 연결한다. 게스트는 서비스 계정 없이 개인 기능을 쓴다. 게스트·계정별 기록을 분리하며 개인 원본은 로그인 후에도 로컬 전용이다. 앱의 JSON 파일 백업/가져오기 경로를 제거한다. 실제 운영 인증 설정이 없어도 게스트 기능은 동작하고, 로그인은 가짜 계정으로 우회하지 않고 사용 불가 상태를 안내한다.

Kotlin/Compose/Room·JDK17·SDK36·Gradle8.13 유지. Firebase BoM 34.9.0/Auth 24.0.1 공식 SDK를 사용하고 Google Services 플러그인 대신 비공개 로컬 설정으로 FirebaseOptions를 주입한다. 최신 35.1.0/25.0.0은 Kotlin metadata 2.4.0 불일치가 실제 컴파일로 확인돼 호환 버전을 선택했다. debug에서 명시적으로 활성화한 공식 Auth Emulator를 지원하며 release에는 에뮬레이터/평문 인증 통신을 넣지 않는다.

## 요구·정책·설계

- Room v2→v3: 기존 기록은 guest로 유지, 소유 영역+출처 UNIQUE, 계정별 읽기/수정/삭제 검증. 같은 기기의 게스트 기록을 사용자 선택으로 로그인 영역에 이동하며 중복은 덮어쓰지 않고 게스트에 남긴다.
- 영역/가입 상태·삭제 대기 등 로컬 상태는 Room에 보관한다. 삭제 요청의 로컬 정리/표시와 지연 작업 차단을 같은 트랜잭션으로 묶는다. UID는 실제 인증 결과에서 얻고 이메일로 계정을 병합하지 않는다.
- 인증 네트워크와 로컬 저장을 분리하고 모든 저장은 시작 시 소유 영역에 묶는다. 모드 전환 시 폼/조회 결과를 비우며 이전 영역의 지연 결과를 새 영역에 표시하지 않는다.
- 비밀번호는 저장 상태/로그/Bundle에 넣지 않는다. 인증 실패 메시지는 가입 여부를 노출하지 않는다. 계정 삭제는 재인증 후 현재 계정의 로컬 기록을 삭제하며, 통신 실패 시 계정 삭제 미완료와 재시도를 알린다.
- 기존 2MiB/5,000건 상한은 기기 전체의 초기 저장 안전 상한으로 유지한다. 백업 가능성 보장이라는 설명은 없앤다. 개인 원본을 인증 SDK/API에 전달하지 않는다.
- 개인 기록의 서버 저장/동기화·JSON 내보내기/가져오기·소셜 로그인·상대 연결/공유 서버·지도/광고/DM은 이번 구현 범위 밖이다. 로그인/이메일 확인을 상대 연결 완료로 표시하지 않는다.
- 실제 개발자 프로젝트 등록·유료 서비스 활성화·운영 메일 발송·배포·push/PR은 수행하지 않는다. 로컬 demo 프로젝트의 공식 Auth Emulator로 실제 SDK 경로를 검증한다. 운영 자격 증명을 요구하거나 만들어내지 않는다.

## 검증

- `./android/scripts/check.ps1`: core·Robolectric·lint·debug/R8 unsigned release.
- Room v1/v2→v3 보존·계정 간 접근 차단·중복/이동 롤백·삭제 대기 후 지연 쓰기 차단.
- Compose 게스트 시작·백업 경로 부재·로그인 폼·전환/탈퇴·공유 수신 경합. 테스트 대역 검사는 공식 Auth Emulator와 실제 SDK 검사를 구분한다.
- 공식 Auth Emulator: 가입/오류 로그인·확인 메일/재설정 코드·토큰 갱신·재인증·계정 삭제. 가상 데이터만 사용하고 이메일/비밀번호/토큰/링크 코드를 로그에 출력하지 않는다.
- 외부 계정 삭제 웹 페이지의 정적 산출물과 동작을 검증한다. 실제 공개 호스팅·Play 등록과 구분한다.
- Galaxy 설치·재부팅·삭제/재설치·OS/Smart Switch 복원 차단은 기기 증거가 없으면 미실행으로 남긴다.

## Codex 구현 보고

변경 파일: Android app의 AuthGateway/FirebaseAuthGateway·BuildConfig/Manifest(debug 전용 네트워크 설정 포함), GajahamApplication/MainActivity/PlacesViewModel, GajahamApp/AuthScreens, Room PlaceRecord/DAO/LocalState/DB·migration·schema3, core ShareReceipts와 관련 검사. `account/`에 외부 삭제 페이지·로컬 서버·실제 Emulator 통합 검사, `tools/auth-emulator/`에 고정 CLI/lock/비출력 실행기, `android/auth.local.properties.example`과 무시 규칙을 추가했다. README·AGENTS·결정0004/0005/0006·로컬/인증 계약·AUTH01 후속 표시·출시 점검·브리프 목록을 일치시켰다.

실행 결과:

- `./android/scripts/check.ps1`: core20+Robolectric33=53개, 실패/오류/스킵0. debug/R8 unsigned release 성공, lint 오류0·경고8. 최종 `tmp/codex/AUTH-02-android-verified.log`.
- 공식 SDK/공식 Auth Emulator 통합 명령(README): 최종 코드1개 통과. 가입·잘못된 암호·이메일 확인 코드/토큰 갱신·비밀번호 재설정·재로그인·재인증·계정 삭제. `AUTH-02-auth-sdk-verified.log`.
- `node --test account/delete-account.integration.mjs`: 실제 Emulator+실제 웹 스크립트1개 통과. 브라우저는 미설정 비활성·가상 계정 오류·암호 비움을 확인했다. 정상 삭제는 스크립트 통합 검사이며 브라우저에서 실제 사용자 계정을 삭제하지 않았다.
- 정적 목업164개·카탈로그58개 회귀 통과. 네이티브 이메일 로그인/개인 상세 렌더 확인. release의 emulator=false·debug 평문 예외 부재·SDK 정보 로그 문자열 제거를 확인했다. APK 해시·검사 매핑·실패/중단 이력·화면 증거는 [검증 기록](../validation/AUTH-02-email-local-mode.md)에 있다.

미실행: 실제 운영 Firebase 등록/설정·메일 수신/남용 방지/세션/탈퇴, HTTPS 공개 삭제 페이지 호스팅, 개인정보/Play 신고, Galaxy/OS 에뮬레이터의 공유·설치·삭제/재설치·Smart Switch·서명/AAB·스토어 심사. 기본 APK의 운영 설정은 비어 있어 게스트 가능/로그인 사용 불가가 정상이다. 상대 연결/공유 서버·소셜·지도·광고·DM은 이 증분의 완료 항목이 아니다. 실행하지 않은 것을 완료로 표시하지 않는다.

공식 자료: [이메일 인증](https://firebase.google.com/docs/auth/android/password-auth), [계정 관리](https://firebase.google.com/docs/auth/android/manage-users), [Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [공식 SDK 배포 이력](https://firebase.google.com/support/release-notes/android).

## 리뷰 기록

2026-10-27 별도 읽기 전용 Codex `auth_analysis_review`: **APPROVED**. 이전 화면의 계정 쓰기 경합, 탈퇴 대기 재시작, 원격 성공/로컬 실패 혼동, 인증 동작별 확정 세션 무효를 지적받아 수정하고 회귀 검사를 통과했다. 리뷰어가 문서·최종 검사/빌드·lint·화면·APK 해시를 대조했고 추가 지적은 없다. 리뷰어는 파일 수정·커밋·검사 재실행을 하지 않았다. 로컬 커밋한 SHA는 별도 worktree에서 main 대비 재검토하며 통과한 SHA만 Git 제외 `tmp/codex/reviewed.txt`에 기록한다. push/PR은 실행하지 않는다.
