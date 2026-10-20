# APP-01 로그인 없는 Android 개인 저장 기반

- 상태: DONE · 개인 저장 기반 구현·35개 로컬 검사·최신 APK/lint·독립 구현 리뷰 완료 · 실제 출시와 구분
- 작성: Codex / 2026-10-20
- 구현 브랜치: `codex/APP-01-android-local-core`
- 참조: [출시 기획](../release/galaxy-launch-plan-2026-10-19.md), [결정 0004](../decisions/0004-android-local-core.md)

## 목표

로그인 없이 Android 공유 메뉴와 직접 입력으로 링크를 접수하고 기기 내 DB에 보존한다. 장소를 직접 확정·수정·방문 표시하고, 삭제·복원·JSON 파일 백업·가져오기를 실행할 수 있는 네이티브 앱과 설치 가능한 디버그 APK를 만든다.

## 범위

- `android/`: Gradle Wrapper, Kotlin/JVM core, Compose Android app, Room DB, Android 공유 Intent, 파일 선택기, 외부 지도·원본 열기.
- `core`: URL 판정·중복 키, 입력 제한, 장소 확정 검증, 버전 1 JSON 백업과 가져오기 검증·병합 규칙.
- `app`: 처리함·내 장소·상세 편집·검색·휴지통·설정. 자동 분석과 지도 핀을 가짜 데이터로 제공하지 않는다.
- 요구·정책·설계·검증 계약, AGENTS의 실제 스택·명령, 진행표를 함께 갱신한다.

## 하지 말 것

- 기존 정적 목업 `web/` 변경·의존성 추가, 실제 로그인·공유 서버·DM·AI 연동, 사용자 비밀·콘텐츠 전송.
- 개발자 계정 생성, 유료 API 활성화, 광고·분석 SDK, 스토어 공개·push·PR 생성.
- 지도 SDK·검색 키가 준비되지 않은 상태를 실제 지도 구현 완료로 표시하기.
- 실기기·에뮬레이터 검사를 실행하지 않고 완료로 표시하기.

## 구현·계약

1. 요구: 접수 완료는 DB 커밋 후 표시한다. 저장 오류는 실패로 알리고 원문을 입력 화면에 남긴다. Intent 재전달·같은 출처 재접수는 사용자 편집을 덮어쓰지 않는다.
2. 정책: 이름과 주소를 사용자가 확정한 항목만 내 장소에 표시한다. 주소·메뉴를 추측하지 않는다. 출처 없는 직접 장소도 허용한다. 기본 저장에 위치·계정·광고 권한이 필요하지 않다.
3. 설계: nullable canonical source를 unique index로 보존한다. 트랜잭션 안에서 접수·재접수·복원·가져오기를 처리한다. DB 스키마 1을 내보내고 파괴적 마이그레이션은 사용하지 않는다.
4. 삭제: 휴지통 30일, 지난 항목은 다음 앱 실행·저장소 작업 때 정리한다. 정확히 30일째 백그라운드 삭제되는 것으로 보장하지 않는다. 전체 초기화와 영구 삭제는 확인을 거친다.
5. 백업: 파일은 평문 JSON이며 URL·메모·휴지통 기록을 포함한다. 파일 선택기로 사용자가 위치를 정한다. 앱 자동 클라우드 백업과 기기 전송은 제외 규칙을 적용한다. OEM 실제 동작은 실기기 검증 전까지 보장하지 않는다.
6. 가져오기: 파일 크기 2MiB·최대 5,000건, 포맷·버전·ID·URL·값·중복 검증을 모두 끝낸 후 변경한다. 현재 기록과 겹치면 현재 기록을 우선하고 건너뛴다. 오래된 휴지통 항목은 되살리지 않는다. 미리보기 후 실행 시에도 트랜잭션에서 중복을 다시 확인한다.
7. 검증: JVM의 도메인·백업 오류 검사, Robolectric의 Room 영속·트랜잭션·Activity 공유/화면 검사, Android debug/release 빌드와 lint. 실제 Galaxy 검사는 분리 기록한다.

## 완료 기준

- [x] 로그인 없이 빈 상태에서 시작하고, 공유/입력 접수를 재실행 후에도 읽는다. 파일 DB 재생성·Activity 검사 증거이며 실제 기기 재부팅 검사는 별도다.
- [x] 중복 링크와 휴지통 재접수에서 사용자 편집을 보존한다.
- [x] 직접 확정·검색·방문·편집·휴지통 복원·영구 삭제를 구현한다. DB 반영과 주요 폼 흐름을 로컬 검사로 확인했다.
- [x] 잘못된/큰 백업은 기존 기록을 바꾸지 않고, 정상 백업은 현재 기록을 보존하며 가져온다. 실제 파일 제공자 검사는 별도다.
- [x] 원본·길찾기에 외부 앱이 없으면 안전하게 안내하는 예외 처리를 구현한다. 실제 지도 앱 미설치·접근 불가 링크 검사는 별도다.
- [x] APK 빌드·JVM/Android 로컬 검사·lint·독립 구현 리뷰의 실제 결과를 기록했다. 커밋 SHA 재리뷰는 별도 장부로 관리한다.

## 검증 명령

프로젝트는 `android/`, JDK 17·Android SDK 36을 사용한다. 로컬 환경 선택은 `android/scripts/check.ps1`을 따른다.

- `android/gradlew.bat -p android :core:test :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleRelease --no-daemon`
- `git diff --check`
- 실기기 후속: APK 설치·재부팅·Instagram 실제 공유·파일 제공자별 복구·One UI 절전·기기 이전·접근성.

## Codex 구현 보고

변경: `android/` 네이티브 앱·core·Room 스키마·Gradle Wrapper·검사·환경 스크립트, 결정 0004·데이터 계약·검증 시나리오·AGENTS·진행표. `web/`과 기존 `.claude/launch.json`은 수정하지 않았다. 가자함 미리보기 5174를 종료했고 다른 프로젝트의 5173 프로세스는 변경하지 않았다.

검사: `APP-01-tests-r6.log`에서 core 18개·Robolectric Android 17개(저장소 10/화면 4/공유 Intent 3), 총 35개 통과·실패/스킵 0. 화면 캡처는 headless PixelCopy 대신 Native Graphics의 View/Canvas 렌더로 수정했다. `android/app/build/reports/ui/personal-place.png`를 직접 확인했으며 한국어·입력 결과·버튼에 잘림이 없었다.

초기 실패와 수정: r1 Android 직접 의존성 누락 수정; r2~r4의 AndroidViewModelFactory 전역 Application 혼입을 명시적 Activity factory·초기화와 테스트 DB 분리로 해결; r5는 기능 단언은 통과하고 PixelCopy 화면 캡처만 실패했으며 r6에서 해결. 실패 로그는 `tmp/codex/APP-01-*.log`에 보존한다. 검사를 약화하거나 실패를 통과로 표시하지 않는다.

최신 전체 `./android/scripts/check.ps1`은 `tmp/codex/APP-01-build-final.log`에서 **BUILD SUCCESSFUL**로 완료됐다. core 18개·Android 17개, debug APK·R8 release unsigned APK·lintDebug/lintVitalRelease를 확인했다. lint는 오류 0·경고 7(검증된 조합보다 새 버전이 있다는 의존성 안내 6, URI KTX 스타일 제안 1)이다. 검증한 조합을 고정했고 최신 버전을 사용한다고 표시하지 않는다.

APK: `android/app/build/outputs/apk/debug/app-debug.apk` (29,650,991 bytes), `android/app/build/outputs/apk/release/app-release-unsigned.apk`. 실제 파일 크기는 재빌드에 따라 바뀔 수 있다. 최종 debug SHA-256은 `A19640B4BAAC19DB25D75DDEBDB37D128F84D411BCAAAC386390D6C6553D381E`다. APK badging에서 minSdk 29/target 36, 권한은 앱 전용 DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION만 확인했다. 네트워크·위치·광고 ID 권한은 없다. 최종 미리보기 포트 5174는 비활성이며 연결된 Android 기기는 0대였다.

추가 산출물 검사: `apksigner verify --verbose`의 debug 서명과 `zipalign -c -P 16 4`의 ZIP 16KiB 정렬을 확인했다. 이는 실제 기기의 설치·실행·모든 네이티브 ELF 호환성 검사까지 수행했다는 의미는 아니다.

미실행: 실제 Galaxy/에뮬레이터 설치·재부팅·업데이트·Instagram 앱 공유·파일 제공자별 입출력·One UI 절전·기기 이전·TalkBack. JVM Android 검사는 API 35이며 target/compile 36의 실제 Android 16 동작을 검증한 것이 아니다. 지도 SDK·광고·인증·DM·스토어 제출은 이번 범위 밖이다. release APK는 출시 서명 없는 빌드이며 공개 출시본이 아니다.

## 리뷰 기록

1. r1 `APP-01-implementation-review-r1.md`: P1 1건·P2 4건. 미확정 복귀/지도 실행, 공유 완료 상태 복원, 편집 중 공유, 만료 휴지통의 가져오기, 대문자 URI 실행을 수정하고 회귀 검사를 추가했다.
2. r2 `APP-01-implementation-review-r2.md`: 앞선 5건 해소 확인, r5 캡처 검사 실패 1건. Native Graphics 캡처로 수정하여 r6 총 35개를 통과했다.
3. r3 `APP-01-implementation-review-r3.md`: **APPROVED**. 캡처 수정·35개 통과·debug/R8 unsigned release·lint·APK 크기/해시·실기기 미실행 표기가 일치하며 새 지적이 없음을 확인했다. 커밋 SHA 리뷰는 `tmp/codex/` 장부로 관리한다.
