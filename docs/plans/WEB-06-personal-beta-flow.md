# WEB-06 개인 보관함 사용 흐름 보완

- 상태: DONE · 구현/로컬48개 검사/독립 수정본 리뷰 완료. 고정 SHA 판정은 별도 장부, 운영/실기기 검사는 별도
- 작성: Codex / 2026-11-17 (한국 시간)
- 구현 브랜치: `codex/WEB-06-personal-beta-flow`
- 요청: 관리 문서를 토대로 수정 진행. 사용자의 명시적 구현 요청으로 아래 범위를 진행한다.
- 기준: main `f714893`에서 새 브랜치를 만들고 기존 RES-02 문서 커밋을 반영한 `f536365`. 기능 코드 기준은 main과 같다.
- 참조: [관리 문서](../research/webapp-release-review-2026-11-17.md)의 U01~U08, [계정 계약](../contracts/web-account-data.md), [운영 절차](../release/WEB-03-operator-runbook.md).

## 목표

게스트 이동을 중단·재개할 수 있고 실패 원인에 맞게 다음 행동을 안내한다. 중복 저장·편집 충돌에서 입력을 보호하고 기존 기록을 찾는다. 휴대전화의 읽기/터치/대화상자 접근과 저장 위치 안내를 보완한다.

## 범위

- U01/U06: UID·세대·요청 ID를 유지한 순차/작은 묶음 이동, 진행/성공/중복/실패·중단·재개, 429 원인별 오류 계약과 반복 503 중단. 메일 한국어·재발송 대기·재설정 오류 처리.
- U02/U03: 중복 대상/휴지통 안내와 명시적 메모 반영, dirty 닫기/페이지 이탈 확인, 최신 값과 입력 비교·선택한 필드만 최신 revision에 재저장. UID/세션 메모리만 사용.
- U04/U07: 모바일 한 열·읽을 수 있는 보조 글자·44px 터치 목표, dialog 이름/오류/포커스, 짧은 높이/확대, 게스트 손실·명시 이동 안내와 로그인/연결 상태 분리.
- U05 P1: 최근 수정순 표시, 전체 조회/검색 범위를 유지하면서 카드 DOM을 50개부터 늘리기, 0/200/201 및 2MiB 내 큰 합성 목록 측정. 서버 정렬/필터/커서 확장은 후속 P2다.
- U08 P1: 만료 휴지통의 집계 전용 SQL과 지연/복원/현재 DB 삭제/복구 이력 구분을 운영 절차에 반영. 정기 전체 삭제 자동화는 후속 P2다.
- 관리 문서 6.2절: 기획/과거 로드맵의 이력 표시, 브리프 목록·최종 체크리스트의 로컬 main/PR 기준과 과거/새 검사 구분, 웹 README의 초기 설정/비밀번호 안내를 정리한다. 제품 범위는 바꾸지 않는다.
- 기존 Vite/Firebase Web·Workers/D1와 순수 ES 모듈을 사용한다. 의존성·DB migration은 추가하지 않는다.

## 하지 말 것

운영 계정/비밀·약관 동의·공개 정보 확정·원격 리소스/배포·결제 연결·push/PR 생성, 지도/공유/DM 등 F 항목 구현, 영속 계정 초안/오프라인 큐·JSON 복원, 최신 인가/삭제 재시도 차단 약화. 기존 `.claude/launch.json`은 보존한다.

## 구현 단계와 함께 갱신할 문서

1. [계정 계약](../contracts/web-account-data.md)과 [검증 시나리오](../validation/WEB-06-personal-beta-flow.md)에 오류·이동/초안 경계를 명시한다.
2. `worker/src/service.mjs`, `app-web/src/`에 오류·이동·편집·접근성/연결/목록 동작을 구현하고 실패 경로를 검사한다.
3. `worker/operations/health.sql`·운영 절차를 보완하고 합성 D1의 집계 결과만 확인한다.
4. 전체 통합·브라우저 검사 후 시각 확인과 규모 측정을 기록한다. 관리 문서·브리프 목록·README/AGENTS의 현재 상태를 증거에 맞게 갱신한다.
5. 독립 읽기 전용 구현 리뷰 APPROVED 뒤 로컬 커밋하고 별도 worktree에서 main 대비 고정 SHA를 재리뷰한다.

## 완료 기준과 검증 명령

- [x] 150건 이동·호출/저장/누적 한도·연속 503·중단·재접속·계정 전환에서 요청 폭주/다른 UID 저장/성공 전 원본 제거 없음.
- [x] 중복 일반/휴지통/삭제 대상, 충돌 비교/필드 선택·취소/계정 변경에 안전하고 입력이 자동 덮어써지지 않음.
- [x] 360/390/412px·가로/작은 높이·합성 폼 글자 확대에서 넘침/액션 가림 없음. 대화상자 이름·오류 연결·포커스 복귀 확인. Galaxy/TalkBack/실제 OS 확대·키보드/뒤로가기는 별도 미실행으로 구분.
- [x] Emulator 메일 요청은 한국어/대기 표시, 가입 여부는 같은 안내, 설정 오류는 성공으로 처리하지 않음. 실메일은 미실행.
- [x] 목록 전체 건수/검색·정렬·오래된 응답 회귀를 유지하고 합성 큰 목록의 크기/시간/DOM/API 수를 기록. 운영 CPU/DB 비용은 미실행.
- [x] 집계 SQL은 원문/UID/메일/영수증을 출력하지 않고 기존 삭제 무결성/정리 동작을 유지.
- 명령: `node app-web/scripts/check.mjs`, `npm --prefix app-web audit`, `npm --prefix worker audit`, `git diff --check`, 문서 상대 링크 검사. 개발용 Node22.12+·공식 Auth Emulator/workerd/D1·전용 Chromium만 사용한다.

## Codex 구현 보고

- 변경 파일: `app-web/src/main.mjs`·`gateway.mjs`·`guest.mjs`·`style.css`, 새 `feedback.mjs`·`transfer.mjs`, 웹 검사 명령/패키지 scripts와 단위·브라우저 회귀, `worker/src/service.mjs`·집계 SQL·D1/API 검사. 문서는 계정 계약·관리 문서·본 브리프/검증 기록·브리프 목록·README/AGENTS·기획/과거 로드맵/최종 체크리스트/운영 절차를 함께 갱신했다. 의존성 버전·lockfile·migration은 바꾸지 않았다.
- `node app-web/scripts/check.mjs`(전용 Node22.23.4·Chromium 캐시): **48 PASS**(단위/출시14·JWT/D1/API11·브라우저/HTTP23), production 번들 두 HTML·헤더 구성·Emulator 제외·Worker dry-run PASS. 최종 로그 `tmp/codex/WEB-06-check-sha-fixes.log`. 로컬 가상 데이터만 사용하고 자신이 실행한 Emulator/Worker는 종료했다. 이전46 PASS·문구 수정 뒤 production 확인 기록은 이력으로 유지한다.
- 웹/Worker audit 각각0. 로그 `tmp/codex/WEB-06-audit-web.json`·`WEB-06-audit-worker.json`.
- 모바일 목록/대화상자 화면을 시각 확인했다. 합성 목록 2500건의 직렬화 기록1769170bytes·목록13회·첫 카드 DOM50을 확인했다. 실제 로컬 D1 201건200+1 페이지도 통과했다. 시간 등 상세 수치와 합성/실제 로컬 경계는 검증 기록을 따른다.
- 문서13개·상대 링크147개·인코딩/개행/공백과 `git diff --check` PASS. 도구는 Git 제외 `tmp/codex/WEB-06-doc-check.mjs`다.
- 최초 검사에서 합성 create 반환 누락1건·새 브라우저 locator/대기 조건2건을 고쳤다. 독립 리뷰 r1의 중복 비교 초안 dirty 누락을 수정하고 닫기 경고·이탈 보호·명시 버리기 회귀를 추가한 뒤 전체45개를 재실행했다.
- 미실행: 운영 계정/Free/App Check·관리 키·운영 CPU/DB 비용·실메일/링크·Galaxy/TalkBack/실제 키보드·공개 정보·배포. L 운영 연결·F 확장·U05 서버/P2·U08 정기 정리는 후속이다. push/PR·결제 연결은 하지 않았다.
- 브리프 범위 차이: 6.2절 문서 정리는 기존 혼동 문구의 이력/현재 기준 안내만 고쳤으며 개인/공유 베타 범위를 결정하지 않았다. 구조 전면 개편이나 서버 페이지 설계는 하지 않았다.

## 리뷰 기록

- r1: **WARNING**, 중복 비교 화면의 미반영 입력이 폼 dirty 비교에서 빠져 닫기/이탈 때 경고 없이 사라질 수 있다는 P2 지적1건. 실제 코드에서 확인해 `duplicateDraftPending`을 dirty에 포함하고, 명시 메모 사용/버리기와 서버 저장·UID 변경 경계를 연결했다. 비교 중 닫기 취소/이탈 경고·명시 버리기 후 해제의 브라우저 회귀를 추가했다.
- r2: **WARNING**, r1은 해소됐고 복원 성공 뒤 후속 list 실패 시 비교 창/초안이 사라지는 P2 지적1건. 실제 경로를 확인해 커밋 응답의 기록/버전을 즉시 적용하고 비교 창을 유지하도록 고쳤다. 게스트 mutate도 트랜잭션 커밋 확인 후 같은 기록 응답을 돌려준다. 조회503 중에도 복원 초안 유지·명시 저장이 되는 회귀를 추가해 전체46개가 통과했다. 명시 버리기는 메모 폼도 기존 값으로 돌리고, 미저장 입력이 있는 영구 삭제는 입력 폐기도 함께 확인한다.
- r3: **APPROVED**. 독립 읽기 전용 리뷰가 두 지적 해소, UID/요청 ID·삭제 차단·충돌/메일/목록/집계 경계, 46개 검사·production/Worker dry-run·이후 문구 수정과 추가 production 확인을 검토했다. 문서13개·상대 링크147개·인코딩/공백도 리뷰어가 재실행해 PASS했다. 결과는 `tmp/codex/WEB-06-implementation-review.md`다.
- 구현 리뷰 APPROVED 후 로컬 커밋하고 고정 SHA를 별도 worktree에서 main 대비 재리뷰한다. 통과한 SHA만 `tmp/codex/reviewed.txt`에 기록하며 push/PR은 별도 사용자 요청 때 진행한다.
- 고정 SHA `aca7332` 리뷰 r1: **WARNING**. 숫자 code를 가진 DOMException AbortError의 연속 시간 초과 중단 누락과 이메일 확인 후 busy 중 설정 화면 재구성 차단2건을 확인했다. 이 SHA는 통과 장부에 넣지 않는다. 시간 초과/네트워크 예외 분류·중단 후 불필요한 목록 요청 제거·확인 완료 내부 갱신을 수정했다. DOMException3종의 순수 검사와 실제 fetch45초 타이머2회/후속 요청0개·Emulator 이메일 확인 완료 패널 갱신 회귀를 추가해 전체48개가 통과했다. 수정본 독립 리뷰 뒤 새 커밋/SHA로 다시 검토한다.
- SHA 지적 수정본 리뷰 r2: **APPROVED**. 독립 리뷰가 두 지적 해소·UID/세대/dirty/busy 경계와 최종48개·production/Worker dry-run·측정/문서 일치를 확인했다. 이동 단위5개·이번 수정 문서7개/상대 링크101개·공백 검사를 직접 실행해 PASS했다. 결과 `tmp/codex/WEB-06-sha-fixes-review.md`. 새 커밋의 고정 SHA는 별도 worktree에서 main 대비 다시 리뷰한다.
