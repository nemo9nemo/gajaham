# APP-01 검증 시나리오

기준: 2026-10-20. [데이터 계약](../contracts/android-local-data.md), [구현 브리프](../plans/APP-01-android-local-core.md).

| ID | 검사 | 예상 결과 | 증거 |
| --- | --- | --- | --- |
| A01 | Instagram 트래킹 쿼리·호스트 변화, 다른 게시물 ID | 동일 출처만 중복, ID 대소문자 보존 | core PlacesTest |
| A02 | 일반 URL의 query/hash/encoded path | 서로 다른 리소스 보존 | core PlacesTest |
| A03 | 잘못된 scheme·자격 증명·큰 입력·11개 링크 | 전체 거절, 접수 완료 안내 없음 | core + RepositoryTest |
| A04 | DB 닫기·재생성 | 접수·사용자 기록 유지 | RepositoryTest |
| A05 | 같은 출처 반복·동시 수신 | 1개만 저장, 기존 메모 유지 | RepositoryTest |
| A06 | 휴지통 재수신·만료 후 재수신 | 기간 내 내용 복원, 만료 후 새 접수 | RepositoryTest |
| A07 | 직접 확정·편집·방문·복원·영구 삭제 | DB에 반영, 활성 기록 직접 영구 삭제 거절 | RepositoryTest |
| A08 | 잘못된 ID·시간·중복 백업·헤더·UTF-8 | 기존 데이터 변경 없음 | core + RepositoryTest |
| A09 | 미리보기 후 같은 출처가 새로 저장됨 | 실행 때 중복 재확인, 기존 기록 유지 | RepositoryTest |
| A10 | 정상 파일 둘을 합치면 백업 크기 초과 | 가져온 새 기록 전체 롤백 | RepositoryTest |
| A11 | JSON 백업·초기화·가져오기 | 출처·메모·상태 복구 | core + RepositoryTest |
| A12 | ACTION_SEND·화면 재생성·미지원 MIME | 커밋된 수신 유지, 중복/가짜 성공 없음 | ShareIntentTest |
| A13 | 실제 Compose 폼 입력·저장·처리함 확정 | 로그인 없이 상세에서 결과 확인 | AppUiTest (Robolectric) |
| A14 | API·권한·릴리스 빌드·정적 분석 | min29/target36, 네트워크/위치/광고 권한 없음 | APK·lint 결과 별도 기록 |
| A15 | 미확정 편집에서 돌아가기 | 처리함 복귀, 외부 지도 버튼 없음 | AppUiTest |
| A16 | 처리 완료 공유·전체 삭제·새 ViewModel·회전 | 삭제한 접수 재생성 없음 | ShareIntentTest |
| A17 | 편집 중 새 공유·이전 접수의 늦은 완료 | 편집 유지, 최신 공유만 완료 판정 | AppUiTest + ShareReceiptsTest |
| A18 | 기존 휴지통 만료 후 활성 백업 가져오기 | 만료 기록으로 정상 백업을 중복 처리하지 않음 | RepositoryTest |
| A19 | 대문자 scheme 출처 열기 | 원본은 보존하고 실행 URI만 소문자로 정규화 | AppUiTest |
| G01 | 실제 Galaxy Instagram 공유·재부팅·업데이트 | 유실·잘못된 완료 안내 없음 | 미실행 · 기기 필요 |
| G02 | 실제 파일 제공자별 생성·실패·가져오기 | 성공 시 파일 복구, 실패 시 원본 유지 | 미실행 · 기기/제공자 필요 |
| G03 | 지도 앱 미설치·잘못된 주소·원본 접근 불가 | 안전한 안내와 정상 복귀 | 미실행 · 기기 필요 |
| G04 | One UI 절전·기기 이전·TalkBack·큰 글꼴 | 기능·가시성·개인정보 경계 확인 | 미실행 · 기기 필요 |

## 실행 기록

`APP-01-tests-r6.log`와 최신 전체 `APP-01-build-final.log`에서 core 18개·Robolectric Android 17개, 총 35개 통과·실패/스킵 0을 확인했다. A01~A13/A15~A19의 자동화 범위가 해당하며 A14는 debug APK·R8 unsigned release APK 빌드·min29/target36·권한·lint 결과로 확인했다. 실제 외부 지도 앱·파일 제공자·실기기 상호작용 전체를 로컬 검사로 대신하지 않는다.

lint 오류 0·경고 7(새 의존성 버전 안내 6, URI KTX 스타일 1). `personal-place.png`를 Native Graphics로 렌더하고 직접 확인해 한국어·저장 내용·버튼 잘림이 없음을 확인했다. SDK 35의 Robolectric 검사이며 target36 Android 16·실제 Galaxy·에뮬레이터 검사는 미실행이다. Android 연결 기기는 0대였다.

초기 r1~r5 실패와 수정 근거는 [APP-01 구현 보고](../plans/APP-01-android-local-core.md)에 남겼다. 정적 목업의 과거 검사 결과를 Android 검사 결과로 재사용하지 않았다.
