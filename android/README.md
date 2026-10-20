# 가자함 Android 개인 저장 앱

로그인 없는 1차의 개인 저장 기반을 개발한다. [APP-01 브리프](../docs/plans/APP-01-android-local-core.md)의 구현·검증 상태를 확인한다. 정적 웹 목업은 별도 `web/`에 유지한다.

## 구성과 실행

- Kotlin/JVM core: URL·장소 확정·JSON 백업 계약.
- Compose app: Android 공유 수신, Room DB, 개인 장소·처리함·편집·휴지통, 파일 백업/가져오기, 외부 앱 연결.
- JDK 17, Gradle Wrapper 8.13(SHA-256 고정), Android SDK platform 36 / build-tools 36.0.0. Windows에서 JDK의 `JAVA_HOME`, SDK의 `ANDROID_HOME`을 지정하거나 프로젝트 임시 도구 경로를 사용한다.
- 앱 ID는 개발용 `kr.gajaham.app`, debug는 `.debug` 접미사다. 실제 스토어 ID·서명·개발자 계정은 출시 전에 확정한다. release는 서명하지 않은 검증 산출물이며 업로드 가능한 출시본이 아니다.

```powershell
# 저장소 루트에서 실행. SDK·JDK가 필요하며 첫 실행에 공식 의존성을 내려받는다.
./android/scripts/check.ps1

# 기존 환경을 직접 사용하는 경우
./android/gradlew.bat -p android :core:test :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleRelease --no-daemon

# 연결한 Android 기기에 디버그 설치 (개발자 옵션·USB 디버깅 필요)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`check.ps1`은 환경 변수가 없을 때만 `tmp/android-tools/jdk17/*`, `sdk`, `android-user`, `gradle-home`을 선택한다. SDK와 JDK·캐시는 Git에 넣지 않는다. 도구가 없으면 공식 [Android SDK](https://developer.android.com/studio), [JDK 17](https://adoptium.net/temurin/releases/?version=17)을 준비한다.

## 데이터와 사용

1. Android 공유 메뉴에서 가자함으로 text/plain 링크를 보낸다. 또는 앱의 링크 추가에 붙여 넣는다. DB 저장이 끝난 뒤 접수 건수를 안내한다.
2. 처리함에서 장소 이름과 주소를 확인해 저장한다. 자동 분석·내장 지도 검색을 제공하는 버전이 아니다. 직접 장소 입력도 가능하다.
3. 내 장소에서 검색·분류·방문 상태·메모를 수정한다. 원본·외부 지도는 사용자가 버튼을 눌렀을 때 해당 앱으로 연다.
4. 설정에서 평문 JSON 백업을 저장하고 가져온다. 출처·메모·휴지통 기록이 포함된다. 가져오기는 미리보기 뒤 실행하며 중복은 현재 기록을 우선한다. 최대 2MiB·5,000건이며 저장 작업도 전체 백업 가능 용량을 넘기지 않는다.
5. 삭제는 휴지통으로 이동하고 30일이 지난 항목은 다음 앱 실행·저장소 정리 시 제거한다. 전체 삭제에는 ‘삭제’ 입력이 필요하다. 내보낸 외부 파일은 앱 삭제로 회수되지 않는다.

앱은 서비스 계정·광고·분석 SDK·INTERNET/위치/갤러리 권한을 사용하지 않는다. 자동 클라우드 백업·기기 전송은 제외 규칙을 적용하지만 OEM 실제 동작은 실기기에서 별도로 확인한다. 앱 삭제·데이터 초기화 시 파일 백업 없이 기록을 되살릴 수 없다.

실제 지도 SDK·자동 검색/분석·광고·로그인·공유 맵·DM·스토어 공개는 후속이다. Robolectric은 JVM 기반 Android 검사이며 실기기·에뮬레이터 실행과 구분한다.
