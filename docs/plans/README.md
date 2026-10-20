# 구현 브리프

Codex가 기획·구현·검증·독립 리뷰를 진행하는 작업 단위 브리프를 `<작업ID>-<slug>.md`로 둔다. 양식은 [구현 브리프](../templates/implementation-brief.md), 절차는 [Codex 작업·리뷰](../development/codex-workflow.md)다. 2026-10-19 이전 Claude 작성자·리뷰 기록은 이력으로 보존하며 현재 작업의 대기 조건으로 사용하지 않는다. 브리프의 상태는 작업 순서를 나타내며 기능 완료의 증거가 아니다.

## 현재 정적 목업 진행

| 작업 | 범위 | 상태 |
| --- | --- | --- |
| [UI-01](UI-01-static-shell-start-map.md) | 시작·연결·지도·목록 17개 | DONE · main 병합 |
| [UI-02](UI-02-copy-place-detail.md) | 복제·상세 13개, 비공개 ID 지적 조치 | DONE · 로컬 커밋·독립 리뷰 완료 |
| [UI-ALL](UI-ALL-complete-static-mockup.md) | 나머지 28개 추가, 전체 58개 통합 | DONE · 163개 검사·58개 화면·26개 동작, 구현·SHA 리뷰 지적 조치 완료 · 최신 SHA 리뷰는 별도 장부 |

UI-ALL은 UI-03(링크 등록·처리함)과 UI-04(약속·설정)의 계획 범위를 함께 완성한다. 정적 목업 진행표이며 실제 서비스 연동 완료를 뜻하지 않는다.

## Android 개발

| 작업 | 범위 | 상태 |
| --- | --- | --- |
| [APP-01](APP-01-android-local-core.md) | 로그인 없는 공유 접수·Room 영속 저장·수동 확정·개인 기록·파일 백업·휴지통 | DONE · 36개 검사·debug/R8 unsigned release APK·lint·독립 구현 리뷰·미확정 삭제 지적 조치 완료 · 실제 지도/광고/로그인/DM/실기기/출시와 구분 |
