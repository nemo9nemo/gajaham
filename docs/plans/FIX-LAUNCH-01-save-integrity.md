# FIX-LAUNCH-01 출시 점검의 저장 정확성 지적 조치

- 상태: DONE · 구현·웹 164개/Android 39개·빌드·독립 구현 리뷰 완료 · 실제 출시와 구분
- 작성: Codex / 2026-10-26
- 구현 브랜치: `codex/FIX-LAUNCH-save-integrity`
- 참조: [출시 점검](../release/launch-readiness-2026-10-26.md), [Android 데이터 계약](../contracts/android-local-data.md)

## 목표·범위

출시 잔여 작업 점검의 전체 브랜치 리뷰에서 발견한 기존 오류 두 건을 수정한다. 웹 목업은 현재 처리 항목에서 선택한 지점만 저장한다. Android는 Instagram 비기본 포트를 포함한 URL을 기본 포트 URL과 다른 출처로 보존한다. 지도·광고·인증 등 새 출시 기능은 추가하지 않는다.

## 요구 → 정책 → 설계

- 지점을 선택하지 않은 다른 항목에 이전 선택을 적용하지 않는다. 선택값과 선택한 처리 항목 ID를 함께 보관하고 화면·저장 양쪽에서 ID를 확인한다. 항목을 왕복해도 다른 항목의 선택으로 저장할 수 없다.
- Instagram의 알려진 게시물 특수 정규화는 scheme의 기본 포트 또는 포트 생략에만 적용한다. 비기본 포트는 일반 URL 규칙으로 포트·쿼리·해시를 보존한다. 원본은 그대로 유지한다. 테이블 형태·의존성·백업 버전은 유지하며 Room 버전 1→2 데이터 마이그레이션으로 기존 UNIQUE 출처 열을 재계산한다. 중복 여부를 먼저 검증하고 트랜잭션 안에서 갱신하며 payload·시간·메모는 바꾸지 않는다.
- 이미 중복으로 거절돼 저장되지 않은 과거 입력을 복원했다고 표시하지 않는다. 기존 UNIQUE 키에서 서로 다른 두 행이 새로 충돌하는 방향의 변경은 아니다.

## 검증 시나리오·명령

- 웹: 모호한 A에서 지점 선택→B 이동 시 미선택/저장 비활성, 직접 저장 action도 차단. B 선택·저장 후 A도 별도 재선택하여 서로 다른 지점 저장.
- Android: HTTPS 443·HTTP 80은 기존 중복 처리 유지, HTTPS 8443/80·HTTP 443은 포트/쿼리/해시 보존. 공유 추출과 백업 가져오기에서 기본/비기본 출처 둘 다 유지.
- 구버전 파일 DB: 스키마 1과 기존 identity hash·잘못된 출처 키를 생성해 버전 2로 열고, 기본 포트 URL 추가 접수/가져오기 모두 성공·기존 사용자 기록과 원본·방문 상태 보존·재열기/백업을 검사한다.
- `node --test --test-isolation=none "web/tests/*.test.mjs"`, `node web/scripts/check-screens.mjs`
- `./android/scripts/check.ps1`, `git diff --check`
- 화면 검증은 실제 브라우저와 Node 렌더 검사를 구분하고, 기기 검사는 미실행으로 남긴다.

## Codex 구현 보고

변경: 웹 action·처리 화면·시나리오 초기값·회귀 검사, Android URL 규칙·회귀 검사, 데이터 계약·APP-01 검증 기록·출시 점검·진행표. 화면과 저장 action 모두 선택한 항목 ID를 검증하며, 비기본 포트의 원본과 중복 키를 보존한다.

검사: 웹 전체 164개 통과·실패/스킵 0(`tmp/codex/FIX-LAUNCH-web-tests-full.log`), 카탈로그 58개 통과, `git diff --check` 통과. 최초 제한 환경의 웹 검사 1건은 localhost EACCES였으며 로컬 연결이 허용된 실행에서 동일 전체 검사를 통과했다. 실패 로그도 보존한다.

마이그레이션 추가 전 `./android/scripts/check.ps1`은 core 19개·Robolectric 18개 총 37개를 통과했다(`tmp/codex/FIX-LAUNCH-android-build.log`). 최종 마이그레이션 포함 전체 검사는 `FIX-LAUNCH-android-migration-build.log`에서 **BUILD SUCCESSFUL**, core 19개·Robolectric 20개 총 **39개 통과·실패/오류/스킵 0**이다. debug/R8 unsigned release APK·lintDebug/lintVitalRelease 성공, lint 오류 0·경고 7(기존 의존성 안내 6·URI 스타일 1). ABI/실기기/출시 서명 검증을 새로 수행한 의미는 아니다.

구버전 DB 검사의 SQL bind 배열은 `Any?`를 명시해 새 Kotlin 타입 추론 경고를 정리했다. `FIX-LAUNCH-android-migration-tests-final.log`에서 Kotlin 재컴파일·빌드 성공, 동일 검사 바이트코드의 `testDebugUnitTest UP-TO-DATE`를 확인했다. 39개의 실제 실행 증거는 앞선 마이그레이션 전체 빌드 로그/XML이며 이 후속 호출에서 새로 실행했다고 표시하지 않는다. 최종 debug APK SHA-256은 `164D31BA116AA5F9348956C3EC993D43C398C00A1D68656247B34637D4DB1BF4`다. 백업 포맷은 v1, Room DB는 v2이며 스키마 1·2 JSON을 모두 보존한다.

브라우저: 임시 5175에서 카탈로그의 지점 모호 화면→미선택 저장 비활성→합정점 선택·저장 활성→결과의 합정점 저장 완료를 확인했다. 캡처는 `tmp/codex/FIX-LAUNCH-browser-result.png`다. A/B 항목 분리는 Node 회귀 검사의 결과이며 두 항목의 실제 브라우저 재현으로 표시하지 않는다. QA 탭·임시 서버는 종료했다. 실제 Galaxy·에뮬레이터·스토어 제출은 미실행이다.

## 리뷰 기록

- `e95293a`의 `PLAN-LAUNCH-e95293a-sha-review.md`: 웹 지점 선택 누수 P2, Android 비기본 포트 소실 P2. 코드에서 두 지적을 확인했으며 해당 SHA를 리뷰 통과 장부에 기록하지 않는다.
- 수정 후 독립 구현 리뷰와 새 SHA의 worktree 재리뷰는 `tmp/codex/`에서 관리한다.
- 수정 구현 리뷰 r1: 기존 Room UNIQUE 열의 키가 과거 규칙에 남는 P2 지적을 확인했다. 버전 1→2 마이그레이션·구버전 DB 접수/가져오기 회귀 검사를 추가해 최종 39개를 통과했다. 앞선 37개 통과는 마이그레이션 추가 전 결과다.
- 수정 구현 리뷰 r2: **APPROVED**. 추가 지적 없음. 기존 키 마이그레이션·파일 DB 회귀 검사·웹 항목별 선택·URL/백업 계약·문서와 실제 검사/빌드/해시가 일치함을 별도 읽기 전용 Codex 세션에서 확인했다. 결과는 `tmp/codex/FIX-LAUNCH-implementation-r2.md`에 보존하며, 커밋 후 고정 SHA의 main 대비 worktree 리뷰는 별도 장부로 관리한다.
