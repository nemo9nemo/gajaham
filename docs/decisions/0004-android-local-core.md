# 0004 로그인 없는 Android 개인 저장 기반

- 날짜: 2026-10-20
- 상태: 구현 결정 · 공개 출시 승인과 구분
- 출처: 사용자의 '로컬 내리고, 개발 진행해' 및 1차 로그인 제외·갤럭시 우선 요구

## 결정

`android/`에 Kotlin·Jetpack Compose 네이티브 앱을 둔다. 정적 목업 `web/`의 스택과 화면 시연은 유지한다. Android 10/API 29 이상·compile/target API 36을 기준으로 한다.

순수 Kotlin/JVM `core`는 입력·백업 계약을 담당하고 Android `app`은 공유 Intent·Room 영속 저장·Compose UI·파일 선택기와 외부 앱 연결을 담당한다. Room Java 선언과 annotationProcessor로 스키마를 생성해 Kotlin UI에 연결한다. 네트워크 작업이 없는 이번 범위에는 WorkManager를 도입하지 않는다.

초기 빌드 조합은 JDK 17·Gradle 8.13·AGP 8.13.2·Kotlin 2.2.21·Compose BOM 2025.10.01·Room 2.8.5다. 도구는 저장소 제외 임시 경로에 준비하고 Gradle Wrapper 배포 SHA-256을 고정한다. 버전 변경은 실제 빌드 결과와 함께 기록한다.

이 작업은 로그인 없는 개인 저장 기능의 기반이다. 실제 지도 SDK·자동 장소 검색·분석·광고·로그인·공유·DM·스토어 배포는 후속이다. 관련 키·정책·실기기 증거 없이 이들 기능을 완성한 것처럼 표시하지 않는다.

## 데이터 경계

서비스 계정을 자동으로 만들지 않는다. INTERNET·위치·광고 ID·사진 목록 권한과 분석 SDK를 도입하지 않는다. 링크·메모는 앱 전용 DB와 사용자가 선택해 내보낸 파일에만 저장한다. 외부 원본·지도 열기는 사용자의 명시적 버튼으로 수행하며 그 앱의 데이터 처리는 별개다.

앱 클라우드 자동 백업·기기 전송 제외 규칙을 설정한다. 제조사 실제 기기 이전은 미검증임을 문서화한다. 평문 백업을 외부에 보관한 경우 앱에서 해당 파일을 회수·삭제할 수 없다.

## 검증과 한계

도메인 JVM 검사와 Robolectric의 Android 로컬 검사를 분리한다. Robolectric 성공은 Galaxy 실기기·에뮬레이터 성공을 뜻하지 않는다. [APP-01 브리프](../plans/APP-01-android-local-core.md)에 APK·lint·검사·리뷰 결과를 기록한다.

근거: [Room](https://developer.android.com/jetpack/androidx/releases/room), [Compose BOM](https://developer.android.com/develop/ui/compose/bom/bom-mapping), [공유 수신](https://developer.android.com/develop/ui/compose/sharing/receive), [Android 백업](https://developer.android.com/identity/data/autobackup).
