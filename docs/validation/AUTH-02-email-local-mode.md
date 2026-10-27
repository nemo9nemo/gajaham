# AUTH-02 구현과 검사 증거

기준: 2026-10-27 / [브리프](../plans/AUTH-02-email-local-mode.md), [결정 0006](../decisions/0006-email-auth-local-scopes.md). 구현 검사와 운영/실기기 완료는 구분한다.

## 실제 구현

- 공식 Firebase 이메일 가입·로그인·이메일 확인·재전송·확인 상태/토큰 갱신·재설정·최근 암호 재인증·계정 삭제.
- 기본 게스트, 서비스 설정이 없을 때 인증 사용 불가 안내. 익명 서버 계정이나 가짜 로그인 없음.
- Room v3: v1/v2→guest 데이터 보존, UID별 영역·출처 UNIQUE, 계정별 읽기/수정/휴지통/삭제, 선택적 게스트 이동·중복 보존.
- 화면 owner/generation 검증, 인증 예상 UID 검증, 원래 영역에 묶인 로컬 작업, 공유 Intent 소유 영역·실제 저장/거절 완료 구분.
- 탈퇴 재인증 실패 시 기록 유지, 재인증 성공 후 계정 로컬 삭제/pending 트랜잭션, 지연 쓰기 차단, 실패 후 재시도·재시작 상태 복원, 원격 성공/로컬 마무리 실패 구분.
- 확정적 계정 무효 응답은 게스트 전환·계정 영역 접근 정지. 암호 오류·일시적 네트워크 오류와 구분. 재로그인 성공으로만 다시 활성화.
- 네이티브 파일 백업/가져오기 버튼·루트·Repository API·SAF callback 제거. 개인 기록의 인증 요청/서버 DB 업로드를 추가하지 않음. 과거 순수 core 백업 함수/검사는 사용 불가 형식 이력이며 앱 진입점이 아님.
- `account/`: 외부 인증 계정 삭제 페이지, 비밀번호/토큰 비영속, 실패 안내·중복 제출 차단. 운영 설정 없을 때 비활성. 실제 공개 호스팅 전 단계.

## 실행 기록

검사 로그·화면·APK는 Git 제외 경로에 둔다. 최종 명령/결과는 AUTH-02 브리프의 구현 보고와 함께 갱신한다.

| 검사 | 실행 결과/증거 | 한계 |
|---|---|---|
| Android 회귀·빌드 | `./android/scripts/check.ps1`: core20 + Robolectric33 = 53개, 실패/오류/스킵0. lint 오류0·경고8(의존성 알림7, UseKtx1). debug/R8 unsigned release 성공 3m47s. `tmp/codex/AUTH-02-android-verified.log`, 기본 결과 스냅샷 `AUTH-02-default-tests.json` | JDK17, Robolectric API35. 실제 One UI/OS 에뮬레이터 아님 |
| 공식 인증 SDK | `:app:testDebugUnitTest --tests kr.gajaham.app.AuthEmulatorTest -Pgajaham.auth.integration=true`, 최종 코드 1개 통과 27s. `AUTH-02-auth-sdk-verified.log` | Auth24.0.1 + 공식 CLI15.34.1의 demo Auth Emulator. 실제 메일함 수신/운영 프로젝트 아님 |
| 웹 삭제 스크립트 | `node --test account/delete-account.integration.mjs`, 1개 통과. `AUTH-02-web-delete-integration.log` | 실제 Emulator와 실제 페이지 스크립트 + 최소 DOM 환경. 브라우저 렌더링과 구분 |
| 외부 삭제 브라우저 | 미설정 서비스의 비활성 버튼, demo 모드의 잘못된 암호/존재하지 않는 가상 계정 오류와 비밀번호 비움 확인. `tmp/codex/AUTH-02-account-browser.png` | 실브라우저 정상 삭제 제출은 하지 않음. 정상 삭제는 스크립트+실제 Emulator로 확인 |
| 네이티브 화면 | Compose 실제 앱의 로그인·게스트 복귀·백업 버튼 부재, 로그인/개인 상세 View/Canvas NativeGraphics 렌더. `android/app/build/reports/ui/email-login.png`, `personal-place.png` | headless Robolectric 화면, 실기기 스크린샷 아님 |
| release 경계 | BuildConfig AUTH_EMULATOR=false/운영키 비어 있음, release Manifest에 debug 평문 예외 없음. 최적화 DEX에 SDK의 `Logging in as` 정보 로그 문자열 없음. `AUTH-02-release-log-audit.json` | 모든 vendor 내부 로그/모든 실제 설정 빌드를 검증했다는 뜻 아님 |
| 정적 목업 회귀 | `node --test --test-isolation=none "web/tests/*.test.mjs"`: 164개 통과, 0실패/스킵. 카탈로그58개 통과 | 목업의 로그인/공유/DM을 실제 기능 증거로 재사용하지 않음 |

첫 BoM35.1.0은 Kotlin metadata 불일치로 실패해 호환 버전으로 변경했다. 첫 SDK 통합 검사에서는 Android 메인 루프를 구동하지 않아 타임아웃했고, 실제 메인 루프를 구동한 재검사로 통과했다. 첫 전체 검사에서 debug 네트워크 XML의 lint includeSubdomains 누락과 테스트의 과도한 단일 SQLite 행을 수정했다. 장시간 인증 대기 검사는 Compose 무한 프레임 대기로 멈춰 해당 실행기를 종료하고 ViewModel 전용 수명주기로 재실행했다. 실패/중단 실행을 통과 증거로 합산하지 않는다.

최종 APK SHA-256: debug `E5A7439F5EDB9A6154AC76FED36239B80424050F1DD5FE929D994EB2BF1A3950`, unsigned release `66698F7881989094BB126913EFCE10599AC1E869EA1C3E1FCBD29706BEDA41F6`. 이 해시는 운영 인증 미설정 개발 산출물이며 출시 서명/설치 검사를 뜻하지 않는다.

## AUTH-01 시나리오와 남은 검사

- AU01/02/08/09/13/18: 로컬 저장·이전·분리·복구 진입점 제거·경합의 JVM/화면 검사를 수행했다. 실제 앱 업데이트/공유 앱/강제 종료는 추가 기기 검사다.
- AU03/04/15/16: 공식 SDK/Emulator의 가입·확인 코드·잘못된 암호·재설정·토큰 갱신·재인증/삭제와 테스트 대역의 상태/오류 경로를 구분했다. 운영 서비스의 실제 메일 도착·속도 제한·프로젝트 암호 정책·차단/회수는 미실행이다.
- AU05/06/07/10: 실제 상대 연결/공유 서버가 없어 직접 API 인가·초대/공유 검사 미실행. 미구현 UI를 성공 상태로 표시하지 않는다.
- AU11/12: Galaxy 앱 삭제/초기화/재설치·OS 복원·Smart Switch 미실행. XML 제외 규칙만으로 통과 처리하지 않는다.
- AU14: 현재 앱의 개인 원본 네트워크 경로 부재·인증만 사용하는 소스/의존성·최종 Manifest를 확인한다. 모든 SDK 내부 수집을 패킷 캡처로 검증했다고 주장하지 않는다. 운영 프로젝트·메일/서버 로그·Play 데이터 보안 신고는 출시 전 검사다.
- AU17: 소셜 로그인은 2차, 구현/검사하지 않았다.

## 출시 조건

운영 Firebase 프로젝트/공개 클라이언트 설정, 이메일 제공자·열거 보호·암호 정책·남용 제한·운영 메일, 외부 삭제 페이지의 HTTPS 공개 호스팅/서버 보안 헤더·Play URL, 실제 개인정보 고지/운영 주체, Galaxy 실기기 품질·백업 제외·서명/AAB·Play 심사가 남아 있다. 실제 지도/검색·광고·상대 연결/공유·DM의 구현 상태는 출시 점검표를 따른다. 기본 APK의 게스트 이용 가능을 실제 운영 로그인 활성화 또는 앱 출시 완료로 표시하지 않는다.
