# 가자함 Android 개인 저장 앱

**2026-11-03 출시/저장 방향:** 현재 대상은 설치 없는 웹앱이며 로그인 원본은 서버 보관·여러 기기 조회로 변경됐다([결정 0008](../docs/decisions/0008-account-cloud-records.md)). 아래는 기존 Android/Room 구현·검사 안내이며 서버 업로드/동기화 구현 완료가 아니다. Android 원본을 자동 이전하지 않는다.

이메일 로그인과 로그인 없는 개인 이용을 제공한다. 개인 기록은 어느 모드에서도 기기 안에만 저장한다. [AUTH-02 브리프](../docs/plans/AUTH-02-email-local-mode.md)와 [검사 증거](../docs/validation/AUTH-02-email-local-mode.md)를 함께 본다. 정적 화면 목업 `web/`와 실제 네이티브 앱은 별도다.

## 구성과 검사

- Kotlin 2.2.21 / Compose / Room v3, JDK17, Gradle8.13, min29 / compile·target36.
- 공식 Firebase BoM34.9.0 / Auth24.0.1. 앱은 Firebase 인증에만 연결하며 개인 기록용 서버 DB·분석 SDK를 사용하지 않는다.
- 개발 ID `kr.gajaham.app`, debug `.debug`. release는 실제 스토어 서명이 없는 검사 산출물이다.

```powershell
./android/scripts/check.ps1
# 기본: :core:test :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleRelease
# 기기 설치는 연결한 테스트 기기에서 별도 수행
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`check.ps1`은 환경 변수가 없을 때만 `tmp/android-tools/jdk17/*`, `sdk`, `android-user`, `gradle-home`을 선택한다. SDK·키·캐시·빌드 결과를 Git에 넣지 않는다. Robolectric API35 검사는 실제 Android OS/One UI 실행이 아니다.

## 로그인 설정

기본 저장소에는 운영 프로젝트 설정이 없다. 따라서 기본 APK는 게스트 기능을 사용할 수 있고 이메일 인증은 사용 불가로 안내한다. 가짜 로그인/익명 서버 계정으로 우회하지 않는다.

1. 실제 Firebase 프로젝트에 Android 앱을 등록하고 이메일/비밀번호 제공자를 활성화한다. 운영 설정·정책·메일 도메인·발송 테스트는 실제 프로젝트에서 별도로 검증한다.
2. `auth.local.properties.example`을 **android/auth.local.properties**로 복사하고 실제 공개 클라이언트 apiKey/appId/projectId를 로컬에만 넣는다. 서비스 계정 키·관리자 자격 증명은 넣지 않는다. Google Services Gradle 플러그인은 사용하지 않는다.
3. 운영 프로젝트에서 이메일 열거 보호, 비밀번호 최소 12자 정책·남용 제한·인증 메일 및 재설정 템플릿을 설정한다. 앱 가입 폼도 12자 이상과 재입력·기록 소실 확인을 요구한다. 앱 검증을 서버 정책으로 대신하지 않는다.
4. release 빌드는 emulator=false가 강제된다. 실제 운영 메일·세션/탈퇴 검증, 공개 외부 삭제 URL, 개인정보 고지·Play 데이터 보안 신고를 완료하기 전 출시 완료로 표시하지 않는다.

## 공식 로컬 인증 통합 검사

Node24 기준. 실제 계정·이메일·결제 프로젝트 없이 `demo-gajaham`의 가상 계정만 쓴다. 기존 인증 서비스를 띄운 포트에서는 실행하지 않는다.

```powershell
# 별도 터미널, tools/auth-emulator 안에서
npm ci --no-audit --no-fund
npm start

# 저장소 루트, 공식 SDK 통합 검사만 명시적으로 실행
./android/scripts/check.ps1 -Tasks @(':app:testDebugUnitTest', '--tests', 'kr.gajaham.app.AuthEmulatorTest', '-Pgajaham.auth.integration=true')
node --test account/delete-account.integration.mjs

# 실제 Android OS 에뮬레이터/USB reverse로 debug 앱을 연결할 때만
# auth.local.properties: gajaham.auth.emulator=true, emulatorHost=10.0.2.2
# USB 기기는 adb reverse tcp:9099 tcp:9099 뒤 emulatorHost=127.0.0.1
```

기본 검사에서 AuthEmulatorTest는 제외되며 별도 통합 명령은 서버가 없으면 실패한다. 실제 SDK와 공식 서버를 쓰는 JVM 통합 검사이며 메일함 수신·기기 검사를 대신하지 않는다. CLI의 메일/인증 링크 출력은 `quiet.cjs`로 막는다. 에뮬레이터 데이터를 파일로 export하지 않는다. release의 SDK 정보/디버그 로그는 R8으로 제거한다.

## 데이터와 사용

1. 기본은 게스트이며 설정에서 이메일 가입·로그인·재설정·계정 관리로 진입한다. 서비스 설정이 없어도 게스트는 사용 가능하다.
2. 공유 메뉴의 text/plain 링크 또는 붙여넣기를 처리함에 저장한다. 장소 이름과 주소는 사용자가 확인하며 외부 지도·원본은 버튼을 눌렀을 때만 연다.
3. 개인 장소 검색·분류·방문·메모·휴지통을 제공한다. 휴지통 30일 후 다음 정리 때 영구 삭제하며 현재 영역 전체 삭제는 확인 입력을 거친다.
4. Room v1/v2 기록은 v3 guest로 보존한다. 게스트·UID별 영역을 분리한다. 로그아웃 후 계정 기록은 숨겨지고 같은 설치의 같은 UID 로그인 때만 다시 연다. 설정의 게스트 기록 이동은 명시적으로 확인하며 중복은 덮어쓰지 않는다.
5. 파일 백업·가져오기·개인 원본 서버 동기화는 제공하지 않는다. 로그인해도 앱 삭제·데이터 초기화·기기 분실 뒤 복구하지 않는다. 과거 개발 앱에서 내보낸 외부 파일을 회수하지 않는다. 기기 전체 5,000건 / 약2MiB 안전 상한을 적용한다.
6. 탈퇴는 최근 비밀번호 재인증 후 현재 계정 기록을 삭제하고 인증 계정을 삭제한다. 네트워크 결과가 불명확하면 pending으로 표시하고 재시도한다. 게스트/다른 계정 기록은 지우지 않는다. 원격 삭제 성공과 로컬 마무리 실패를 구분한다.

INTERNET 권한은 이메일 인증에 사용한다. 위치·갤러리·광고 ID 권한을 직접 추가하지 않는다. OS 백업/기기 전송 제외 XML을 유지한다. 실제 Galaxy·Smart Switch·삭제/재설치 동작은 별도로 확인한다. 상대 계정 연결·공유 서버, 카카오/구글 로그인, 내장 지도·자동 검색/분석·광고·DM·스토어 공개는 아직 제공하지 않는다.

외부 계정 삭제 페이지는 [account/README.md](../account/README.md)를 따른다.
