# UI-02 초기 복제·다른 맵에 복제 + 장소 상세

- 상태: DONE (2026-10-16, 리뷰 2라운드 APPROVED 후 커밋)
- 작성: Claude / 날짜: 2026-10-15
- 구현 브랜치: codex/UI-02-copy-place-detail
- 선행 조건: 충족. UI-01은 PR nemo9nemo/gajaham#2로 main에 병합됐다(2026-10-15, main = origin/main = f22d47c). 최신 main에서 브랜치를 만든다. 이 브리프 파일은 UI-02 브랜치로 옮겨 함께 커밋한다.
- 참조: [0001 정적 목업 UI 스택](../decisions/0001-static-mock-ui-stack.md), [UI-01 브리프](UI-01-static-shell-start-map.md)의 '공통 설계'·'순수 규칙', [개인·공유 맵 기획](../personal-shared-map-plan-2026-10-12.md) '연결 이후의 복제'·'복제할 정보와 중복 처리', [목업 지시](../designer-mockup-prompt-2026-10-12.md) 3절 3~7·10~12항, 4.2·4.6, 6절, `beta_mock-up.html` 보드 '4.2 초기 복제 · 다른 맵에 복제'(8번째)·'4.6 장소 상세'(12번째)

## 목표

1. 목업 4.2의 2-1~2-7과 4.6의 6-1~6-6, 모두 13개 화면을 UI-01의 `web/` 앱에서 목 데이터로 보고 서로 이동할 수 있다. `#/catalog`에 두 묶음이 추가되어 30개 화면을 바로 열 수 있다.
2. UI-01이 `#/todo/UI-02/...`로 보내던 버튼(1-8 장소 고르기, 4-2 자세히, 4-4 선택·전체 복제, 4-6 개인 맵에서 복제)이 실제 화면으로 이어진다. `web/src`에 `todo/UI-02` 문자열이 남지 않는다.
3. 복제 규칙(원본 유지, 맵별 별도 편집, 다른 참여자 개인 맵 비노출, 실행 직전 대상 맵 권한 재확인, 같은 지점이면 출처만 추가, 개인 메모·사진·방문 기록 기본 해제)과 상세 편집 규칙(수정·위치·방문·삭제가 해당 맵에만 적용)이 순수 함수로 구현되고 Node 테스트로 검증된다.

## 목업 마크업

UI-01 교훈대로 배치는 목업 보드의 정적 HTML을 기준으로 한다. Claude가 번들에서 추출해 두었다(웹 폰트 정의와 번들 스크립트만 제거, Git 제외 경로).

- `C:\Users\love0\nemo9Dev\gajaham\tmp\mockup\4.2-copy.html` — 2-1~2-7
- `C:\Users\love0\nemo9Dev\gajaham\tmp\mockup\4.6-place-detail.html` — 6-1~6-6
- 기존 참고: 같은 폴더의 `4.1-start-connect.html`, `4.4-map-list.html`

읽는 법: 각 화면은 `.col` 열 하나이고 그 안의 `.ph`(360×740 폰 프레임)가 실제 화면이다. 화면 ID는 `.lbl .n`에 있다. `.top`=상단 바, `.bd`=본문, `.foot`=하단 고정 버튼 영역, `.sheetup`+`.dim`=바텀시트, `.dlg`+`.dim`=확인 대화상자, `.toast`=하단 알림.

- 읽기만 한다. `tmp/mockup/`을 수정하거나 `web/`으로 복사하지 않는다. 마크업을 붙여 넣지 말고 배치·간격·크기·모서리·테두리·색을 기존 `web/` 구조(화면 함수, `components/`, `tokens.css`·`base.css`)로 옮긴다.
- 무시할 것: `.ann`(보라 점선 주석)과 `.k` 라벨, `.ph2` 스타일, 폰 프레임의 테두리·둥근 모서리. 2-3 시트 안의 문장 `상세 화면의 ‘다른 맵에 복제’는 그 장소 1곳으로 바로 이 단계에 와요.`는 디자이너용 설명이라 그리지 않는다.
- 작업 공간에 위 파일이 없으면(새 worktree 등) 절대 경로로 읽는다. 그래도 없으면 구현을 멈추고 보고한다.

## 범위

새로 만들 파일:

- `web/src/logic/copy.js`: 복제 순수 규칙
- `web/src/logic/place-edit.js`: 상세 편집·방문·삭제 순수 규칙
- `web/src/screens/copy/initial.js`(2-1, 2-2), `web/src/screens/copy/sheet.js`(2-3 시트), `web/src/screens/copy/preview.js`(2-4, 2-5), `web/src/screens/copy/result.js`(2-6)
- `web/src/screens/place/detail.js`(6-1~6-3, 6-6 대화상자, 볼 수 없는 장소), `web/src/screens/place/edit.js`(6-4), `web/src/screens/place/location.js`(6-5), `web/src/screens/place/history.js`(2-7)
- `web/tests/copy.test.mjs`, `web/tests/place-edit.test.mjs`
- 필요하면 `web/src/components/` 안에 공용 부품(예: `source-tag.js`, `dialog.js`, `check-row.js`)을 추가하고 보고에 적는다. 화면 파일을 더 쪼개야 하면 `web/src/screens/copy/`·`web/src/screens/place/` 안에서만 추가한다.

수정할 기존 파일:

- `web/src/data/mock.js`, `web/src/data/scenarios.js`: 아래 '목 데이터'·'시나리오'
- `web/src/logic/places.js`: `activePlaces` 추가
- `web/src/store.js`: 아래 '액션'
- `web/src/router.js`: 새 경로·파라미터 경로, 로그인 필요 경로
- `web/src/main.js`: `ui.navigateTo`·`ui.scrollTarget`·되돌리기 토스트·`data-field` 입력·`textarea`·대화상자 첫 포커스
- `web/src/screens/catalog.js`, `web/scripts/check-screens.mjs`: 30개 화면
- `web/src/screens/map/screen.js`: 휴지통 장소 제외, `자세히`·복제 버튼·빈 공유 맵 버튼 연결, 2-3 시트 표시
- `web/src/screens/start/connection.js`: 1-8 `공유 맵에 넣을 장소 고르기` 링크
- `web/styles/tokens.css`, `web/styles/base.css`
- `web/tests/screens.test.mjs`, `web/tests/places.test.mjs`(activePlaces 경우 추가)
- 이 브리프의 'Codex 구현 보고'

## 하지 말 것

- npm 패키지·프레임워크·번들러 도입, `package.json` 의존성, `node_modules`·lock 파일. 외부 리소스·`fetch`·이미지 URL·지도 SDK. 실제 길찾기·원본 열기(외부 이동) 구현.
- 실제 인스타그램 계정명·지도 업체명·길찾기 제공자명·로고. 실제 가게 정보·주소·좌표·가격·영업시간·URL·날짜. 날짜 자리는 `[날짜]`·`[저장 날짜]`·`[확보한 경우]`·`[시각]`으로 둔다.
- 휴지통 복구 기간·영구 삭제 범위 수치 표기. 휴지통 목록 화면(8-4, UI-04) 구현.
- 공유 맵 작성자별 메모의 세부 공개 범위를 새로 정하는 것(작성자별 비공개 메모 기능 금지). 공유 맵의 `우리 메모`는 두 참여자가 함께 보는 메모 하나다.
- 목업의 `.ann` 주석·보라 점선을 화면이나 카탈로그에 그리는 것.
- 범위 밖 화면(4.3·4.5·4.7·4.8, P1·후속 버전) 구현. 해당 버튼은 '준비 중' 화면으로 보낸다(`이번 약속 후보` → `#/todo/UI-04/7-1`).
- UI-01의 기존 동작·문구·테스트를 이 브리프가 정한 변경 밖에서 바꾸는 것. `shared-cafe`의 `hasImage`(false)·4-2 `이미지 없음` 기대값을 바꾸지 않는다.
- `beta_mock-up.html`, `tmp/mockup/`, 기획 문서(`docs/*.md`, `.planning-staging/`), `docs/decisions/`, `AGENTS.md`, `.claude/` 수정.
- AGENTS.md 구현 경계 위반:
  - 다른 참여자의 개인 맵·장소를 복제 원본 목록, 복제 대상 목록, 상세, 이력, 카탈로그 어디에도 노출하지 않는다. user-b로 `#/place/pa-book`을 열면 '볼 수 없는 장소' 화면이다.
  - 복제는 원본 장소를 바꾸지 않는다. 복제 결과의 메모·방문 상태·위치 보정·정보 수정·삭제는 그 맵에만 적용되고 다른 맵의 같은 장소에 반영하지 않는다(이동·동기화처럼 표현하지 않는다).
  - 복제 실행(`executeCopy`)과 상세 편집·삭제 직전에 대상 맵 접근 권한을 다시 확인한다. 비활성 공유 맵·참여하지 않은 맵에는 복제·편집하지 않는다.
  - 공유 맵 화면·이력·결과에 비공개 원본 맵 이름(`내 개인 맵`)이나 원본 맵 id를 보이지 않는다. 원래 맵 이름은 복제하는 본인의 미리보기(2-4·2-5)에만 보인다.
  - 개인 메모·직접 올린 사진·개인 방문 기록은 기본 해제이며 `전체 장소 복제`도 이 확인(2-4)을 건너뛰지 않는다. 관심 표시(`wantBy`)·약속·평가는 어떤 경우에도 복제하지 않는다.
  - 위치 미확정 장소는 미확정 상태로 복제하고 핀을 만들지 않는다. 임의 좌표는 사용자가 6-5에서 `이 위치로 저장`을 누를 때만 생긴다.
  - 맵 전환·복제가 `dmDefaultTarget`을 바꾸지 않는다.
- 커밋. 리뷰가 APPROVED가 된 뒤에 한다.

## 공통 설계

UI-01의 렌더링 방식(화면 함수 `(state) => string`, `html` 태그 함수 자동 이스케이프, `data-action` 위임, 클릭 가능한 `div` 금지)과 토큰·맵 배지·`flowPage` 레이아웃(`screens/start/layout.js`)을 그대로 쓴다. 상단 바·본문·하단 고정 버튼은 `flowPage(header, body, footer)`로 만든다.

**토큰 추가** (`tokens.css`, 목업 값)

| 변수 | 값 | 용도 |
| --- | --- | --- |
| `--color-auto-bg` / `--color-auto-ink` | `#E6EEF8` / `#1D4E89` | `자동 추출` 표기 |
| `--color-user-bg` / `--color-user-ink` | `#F0EBDD` / `#6A4E12` | `사용자 입력`·`직접 수정됨` 표기 |
| `--color-memo-bg` | `#FFFCF4` | 메모 카드 배경 |
| `--color-warn-soft` | `#FFFBEF` | 원문 접근 불가 카드 배경 |
| `--color-danger-line` | `#C7493A` | 삭제 버튼 테두리(글자는 `--color-error-ink`) |
| `--color-dim-strong` | `#17201B66` | 6-6 대화상자 배경 |
| `--color-toast-action` | `#9FE3C9` | 토스트 `되돌리기` 글자 |

기존 변수로 되는 값(`--color-shared-ink`, `--color-input-line`, `--color-radio-line`, `--color-option-selected`, `--color-segment-bg`, `--color-map-bg`, `--color-thumb-*`, `--color-dim`)은 재사용한다.

**공용 표기**

- 출처 표기(`tg`): `자동 추출`(auto 색), `자동 추출 · 저장 당시`(원문 접근 불가일 때), `사용자 입력`(user 색, 메모), `직접 수정됨 · <수정한 사람>`(user 색, `edits`에 기록된 필드).
- 메뉴 제목: `menu.kind === 'recommended'` → `게시물 추천 메뉴` + 근거 문구, `'mentioned'` → `언급 메뉴` + `추천 근거 없음`, 메뉴 없음 → `메뉴 정보 없음`.
- 메모 카드: 공유 맵은 제목 `우리 메모`, 아래 `작성: <작성자 이름>`. 개인 맵은 `내 메모`, 아래 `나만 볼 수 있어요`. 메모가 없으면 `아직 메모가 없어요`(muted).
- 체크박스·라디오: 체크박스는 `<label><input type="checkbox" data-action=... data-id=...> 문구</label>`. 라디오형 선택지는 `role="radiogroup"` 안의 `<button type="button" role="radio" aria-checked>`이고 목업 `.opt`/`.opt.on` 모양(UI-01 `save-option` 스타일 재사용 가능)이다.

**라우트 추가** (`router.js`)

| 경로 | 화면 |
| --- | --- |
| `#/copy/initial` | 2-1 |
| `#/copy/select` | 2-2 |
| `#/copy/preview` | 2-4(개인→공유) 또는 2-5(공유→개인). `state.copy.draft.direction`으로 분기. 초안이 없으면 '복제할 장소를 먼저 골라 주세요' + `지도로 돌아가기` |
| `#/copy/result` | 2-6. 결과가 없으면 위와 같은 안내 |
| `#/place/:id` | 6-1~6-3 상세. `ui.sheet === 'delete'`이면 6-6 대화상자, `ui.sheet === 'copy'`이면 2-3 시트(1곳) |
| `#/place/:id/edit` | 6-4 |
| `#/place/:id/location` | 6-5 |
| `#/place/:id/history` | 2-7 |

- 2-3은 별도 경로가 없다. 지도 목록(`#/map?view=list`)과 상세에서 `ui.sheet === 'copy'`로 연다.
- `parseRoute`는 `/place/<id>`, `/place/<id>/edit|location|history`를 `{ path: '/place/:id' | '/place/:id/edit' | ..., params: { id } }`로 돌려준다. id는 `decodeURIComponent`하고 실패하면 UI-01과 같은 fallback이다. `ROUTES`에 위 4개 패턴 키를 등록해 `check-screens.mjs`의 `Object.hasOwn(ROUTES, route.path)` 검사가 통과하게 한다. 화면 함수는 `state.ui.params.id`로 받는다(`renderRoute`가 `todo`와 같은 방식으로 넣는다).
- `/copy/*`, `/place/*`는 로그인 전이면 UI-01과 같이 `loginRequiredScreen`.

**접근 확인**: 상세·편집·위치·이력 화면은 `findAccessiblePlace(state, id)`가 null이면 '볼 수 없는 장소' 화면(앱바 `‹ 장소`, `이 장소를 볼 수 없어요`, `삭제됐거나 이 맵에 접근할 수 없어요.`, `지도로 돌아가기`)을 보인다. 장소 이름·id를 화면에 넣지 않는다.

**`main.js` 변경**

- 리듀서가 `ui.navigateTo`를 설정하면 렌더 전에 값을 지우고(`store.dispatch('clear-navigate')` 또는 동등한 방식) 그 해시로 이동한다. 기존 `confirm-connect` 분기와 정적 `destinations`는 유지한다.
- `ui.scrollTarget`이 있으면 렌더 후 해당 id 요소를 `scrollIntoView()`하고 값을 지운다(6-2 카탈로그 진입용).
- 토스트: `ui.notice`와 함께 `ui.undo`(`{ action, id }`)가 있으면 토스트 안에 `<button type="button" data-action="<action>" data-id="<id>">되돌리기</button>`를 그린다. 목업 `.toast` 모양(어두운 배경, 흰 글자, 오른쪽 `되돌리기`).
- 입력 위임: `input[data-action]`과 함께 `textarea[data-action]`도 처리한다. 요소에 `data-field`가 있으면 `act(action, { field, value })`로 넘긴다. 한글 조합 처리(composition)는 기존 방식 그대로 적용한다.
- `ui.sheet`가 `'delete'`로 새로 열리면 대화상자의 `[data-autofocus]` 요소로 포커스를 옮긴다. Esc는 기존처럼 `close-sheet`로 닫는다.

## 목 데이터 (`mock.js`)

`place()`의 기본 필드에 아래를 추가한다(기존 필드·값은 유지).

| 필드 | 기본값 | 의미 |
| --- | --- | --- |
| `placeKey` | 확정 장소는 아래 값, 미확정은 `null` | 확인된 같은 지점 식별자. 중복 판단에만 쓴다 |
| `savedBy` | 개인 맵은 소유자, 공유 맵은 `senderId` | 원 저장자 |
| `menu` | `null` | `{ name, kind: 'recommended' \| 'mentioned', basis }` |
| `tip` | `null` | 방문 팁(게시물 작성자의 경험) |
| `memo` | `null` | `{ text, authorId }` — 이 맵의 메모 |
| `photos` | `0` | 직접 올린 사진 수 |
| `sources` | 출처 1개 | `[{ id, kind: '게시물' \| '릴스', senderId, savedAt: '[저장 날짜]', postedAt?, fetchedAt?, basis?, menuNote? }]` |
| `sourceAccess` | `'ok'` | `'unavailable'`이면 원문 접근 불가 |
| `edits` | `{}` | 직접 수정한 필드 → 수정한 사람 id (`name`·`category`·`menu`·`memo`·`location`) |
| `history` | `[{ type: 'saved', actorId: savedBy, at: '[날짜]' }]` | `saved`·`edited`(`field`)·`copied`(`originalSaverId`)·`source-added`·`deleted`·`restored` |
| `copyOf` | `null` | 복제 원 항목 id. 내부 판단용이며 화면에 그리지 않는다 |
| `trashed` / `deletedBy` | `false` / `null` | 휴지통 |

placeKey: `pb-cafe`·`shared-cafe` = `seongsu-cafe`, `pb-soup`·`shared-soup` = `mapo-gukbap`, `pb-art` = `jongno-art`, `shared-wine` = `yongsan-wine`, `pa-book` = `jongno-book`, `pa-tea` = `mapo-tea`. 베이커리(`pb-bakery`, `shared-bakery`)는 미확정이라 `null`.

장소별 값(목업 문구):

- `shared-cafe`: `menu { name: '피스타치오 라테', kind: 'recommended', basis: '원문 추천 표현 확인' }`, `tip '주말 대기 언급'`, `memo { text: '서울숲 산책하고 가기', authorId: 'user-a' }`, `photos 1`, `sources [src-cafe-post(게시물, 보낸 사람 user-a, postedAt '[확보한 경우]', fetchedAt '[시각]', basis '캡션의 추천 표현'), src-cafe-reel(릴스, 보낸 사람 user-b, menuNote '언급 메뉴: 바스크 치즈케이크 · 추천 근거 없음')]`, `edits { category: 'user-b' }`, `history [saved user-a, edited 카테고리 user-b, copied user-b(originalSaverId user-b)]`.
- `shared-soup`: `history [copied user-b(originalSaverId user-b), edited 카테고리 user-a]`, `edits { category: 'user-a' }`.
- `pb-cafe`: `memo { text: '테라스 자리 먼저 보기', authorId: 'user-b' }`, `photos 1`, `visit 'visited'`, `sources [src-cafe-reel]`.
- `pb-bakery`: `summary '크루아상을 소개한 게시물'`, `menu { name: '크루아상', kind: 'mentioned' }`, `memo { text: '오전에 가기', authorId: 'user-b' }`, `sourceAccess 'unavailable'`.
- 나머지 장소는 출처 1개(`src-<장소id>`, `게시물`, 보낸 사람 = savedBy)와 기본값. personal-a 장소의 출처 id에도 장소 id를 쓴다(테스트의 비노출 검사 대상).

목업 2-2의 `예시 팝업 스토어`는 추가하지 않는다. 4-1의 핀 수와 UI-01 테스트를 유지하기 위해서이며, 2-2는 사용자 B의 실제 개인 장소 4곳을 보인다.

## 시나리오 (`scenarios.js`)

기존 11개는 그대로 두고 아래를 추가한다. 각 프리셋은 전체 상태를 새로 만든다. 상태에 `copy: { draft: null, result: null }`, `mock: { copyFailIds: [] }`를 기본으로 넣고 `ui`에 `copyPick: []`, `copyChoice: 'selected'`, `copyScope: null`, `editDraft: null`, `undo: null`, `navigateTo: null`, `scrollTarget: null`, `params: null`을 추가한다.

| 키 | 내용 |
| --- | --- |
| `connected-personal` | `connected`와 같되 현재 맵 `personal-b` |
| `copy-initial` | `connected`와 같되 공유 맵에는 `shared-cafe`만 있다(사용자 A가 먼저 넣은 상태). 이 `shared-cafe`는 `sources [src-cafe-post]`, `history [saved user-a]`, `edits {}` |
| `copy-preview` | `copy-initial` + `buildCopyDraft`로 만든 초안(personal-b → shared-ab, `['pb-cafe','pb-soup','pb-bakery']`) |
| `copy-partial` | `copy-initial`에서 `mock.copyFailIds = ['pb-art']`로 `executeCopy`(personal-b → shared-ab, `['pb-soup','pb-cafe','pb-bakery','pb-art']`, 추가 정보 모두 해제)를 실제로 실행한 결과 상태. 실행 후 `mock.copyFailIds`는 `[]`로 되돌린다(재시도는 성공) |
| `copy-to-personal` | `connected` + 초안(shared-ab → personal-b, `['shared-cafe']`) |

시나리오는 `logic/copy.js`를 호출해 만든다(결과를 손으로 적지 않는다).

## 순수 규칙

모든 함수는 입력을 변경하지 않고 새 상태를 돌려준다. 실패하면 원래 상태 객체를 그대로 돌려준다.

**`places.js` 추가**

- `activePlaces(state, mapId)`: 그 맵의 `trashed`가 아닌 장소. 지도·목록·맵 전환 장소 수·2-2·2-3 전체 수가 모두 이것을 쓴다.

**`copy.js`**

- `copyTargets(state, sourceMapId, userId = state.currentUserId)`: `visibleMaps(state, userId)`에서 `sourceMapId`를 뺀 맵. 다른 참여자의 개인 맵·비활성 공유 맵은 나오지 않는다.
- `copySources(state, userId)`: 본인 개인 맵의 `activePlaces`.
- `defaultExtras(direction)`: `'personal-to-shared'` → `{ memo: false, photos: false, visits: false }`, `'shared-to-personal'` → `{ memo: false, photos: false }`.
- `readableExtras(state, placeIds, userId)`: 공유 → 개인 미리보기용. 대상 장소들의 `memo`(작성자 포함)와 `photos` 합계. 본인이 볼 수 있는 맵의 장소만 센다.
- `buildCopyDraft(state, { sourceMapId, targetMapId, placeIds, scope }, userId)`: `scope === 'all'`이면 `placeIds`를 원본 맵의 `activePlaces` 전체로 바꾼다. 결과:
  - 원본 맵이 `visibleMaps`에 없음 → `{ ok: false, reason: 'no-access' }`
  - 대상이 `copyTargets`에 없음 → `{ ok: false, reason: 'invalid-target' }`
  - 장소가 0개 → `{ ok: false, reason: 'empty' }`
  - 원본 맵의 활성 장소가 아닌 id 포함 → `{ ok: false, reason: 'invalid-place' }`
  - 통과 → `{ ok: true, draft: { sourceMapId, targetMapId, placeIds, direction, extras: defaultExtras(direction) } }`. `direction`은 원본·대상 맵 종류로 정한다.
- `executeCopy(state, draft, userId)`: 실행 직전에 `buildCopyDraft`와 같은 검사를 다시 한다(권한 재확인). 실패면 `{ ok: false, reason, state }`(state는 입력 그대로). 통과하면 `draft.placeIds` 순서대로 장소마다:
  1. `state.mock.copyFailIds`에 있으면 `failed`(상태 변경 없음).
  2. 대상 맵의 활성 장소 중 같은 장소를 찾는다: 원본이 확정이고 `placeKey`가 같은 확정 장소, 또는 `copyOf === 원본 id`인 장소. 찾으면 원본 `sources` 중 대상에 없는 출처(id 기준)만 더한다. 더한 것이 있으면 `source-added`(history에 `source-added` 추가), 없으면 `unchanged`. 기존 장소의 `name`·`category`·`menu`·`tip`·`memo`·`photos`·`visit`·`wantBy`·`pin`·`locationStatus`·`edits`는 바꾸지 않는다.
  3. 없으면 새 장소 `new`: 대상 맵에 겹치지 않는 id(`<targetMapId>--<원본 id>`, 겹치면 `-2`, `-3`…)로 만든다. 장소 기본 정보(`name, category, region, locationStatus, pin, placeKey, summary, menu, tip, sources, sourceUrl, sourceAccess, hasImage`)를 복사하고, `wantBy: []`, `edits: {}`, `trashed: false`, `copyOf: 원본 id`, `savedBy: 원본 savedBy`, 대상이 공유 맵이면 `senderId: userId`, `history: [{ type: 'copied', actorId: userId, originalSaverId: 원본 savedBy, at: '[날짜]' }]`. 원본 맵 id·이름은 넣지 않는다. 추가 정보: `extras.memo`면 `memo`(개인→공유는 `authorId: userId`, 공유→개인은 원래 작성자 유지) 아니면 `null`, `extras.photos`면 `photos` 아니면 `0`, `extras.visits`(개인→공유만)면 `visit === 'visited'`일 때만 `'visited'` 아니면 `null`. `visit: 'want'`과 `wantBy`는 복사하지 않는다. 미확정 원본은 `locationStatus 'unconfirmed'`, `pin null` 그대로다.
  - 원본 장소는 바뀌지 않는다. 반환: `{ ok: true, state, result: { targetMapId, items: [{ sourceId, name, outcome: 'new' | 'source-added' | 'unchanged' | 'failed', unconfirmed, targetPlaceId }], total, done } }`(`done` = failed가 아닌 수). `state.copy.result`에도 넣는다.
- `retryFailed(state, result, userId)`: `failed` 항목만 같은 원본·대상으로 다시 `executeCopy`하고, 성공 항목은 다시 처리하지 않는다. 이전 결과의 성공 항목과 새 결과를 합친 결과를 돌려준다.

**`place-edit.js`**

- `findAccessiblePlace(state, placeId, userId)`: 장소의 맵이 `visibleMaps`에 있고 `trashed`가 아니면 장소, 아니면 `null`.
- `updatePlaceInfo(state, placeId, patch, userId)`: 접근 재확인 후 `patch`의 `name`·`category`·`menuName`·`memoText` 중 바뀐 값만 그 장소에 반영한다. 바뀐 필드마다 `edits[field] = userId`, history에 `{ type: 'edited', field: '장소명'|'카테고리'|'메뉴'|'메모', actorId }`. `memoText`는 `memo = { text, authorId: userId }`(빈 문자열이면 `null`). 다른 맵의 장소(같은 `placeKey`나 `copyOf` 관계 포함)는 바꾸지 않는다.
- `updateLocation(state, placeId, pin, userId)`: 접근 재확인 후 그 장소만 `pin`, `locationStatus 'confirmed'`, `edits.location = userId`, history `위치` 수정.
- `toggleWant(state, placeId, userId)`: 그 장소의 `wantBy`에 본인을 넣거나 뺀다. `visit`이 `'visited'`가 아니면 `wantBy`가 비었을 때 `null`, 아니면 `'want'`.
- `toggleVisited(state, placeId, userId)`: `visit`을 `'visited'`로 하거나 되돌린다(되돌리면 `wantBy`가 있으면 `'want'`, 없으면 `null`).
- `trashPlace(state, placeId, userId)`: 접근 재확인 후 그 장소만 `trashed: true`, `deletedBy: userId`, history `deleted`. `restorePlace(state, placeId, userId)`: 같은 맵 접근 확인 후 되돌리고 history `restored`.

## 액션 (`store.js`)

액션은 위 함수를 호출하고 화면 상태를 관리한다. 이동이 필요하면 `ui.navigateTo`를 설정한다. 초안을 만드는 액션은 `state.copy.draft`에 미리보기 뒤로 갈 해시 `back`을 함께 저장한다(순수 함수 `buildCopyDraft`의 결과에는 넣지 않는다).

| 액션 | 동작 |
| --- | --- |
| `copy-choice` (id `none`·`selected`·`all`) | `ui.copyChoice` |
| `copy-initial-next` | `none` → 공유 맵으로 전환(`show-shared`와 같음), `navigateTo '#/map'`. `selected` → `ui.copyPick = []`, `navigateTo '#/copy/select'`. `all` → 본인 개인 맵 → 활성 공유 맵 `scope 'all'` 초안, `navigateTo '#/copy/preview'` |
| `copy-pick` (id 장소) | `copySources`에 있는 장소만 `ui.copyPick` 토글 |
| `copy-pick-preview` | `ui.copyPick`으로 초안, `navigateTo '#/copy/preview'` |
| `open-copy` (id `selected`·`all`·`one:<장소id>`) | `ui.sheet = 'copy'`, `ui.copyScope` 설정 |
| `copy-scope` (id `selected`·`all`) | `ui.copyScope` |
| `copy-sheet-preview` | 현재 맵(1곳이면 그 장소의 맵) → `copyTargets`의 첫 맵으로 초안(`selected`는 `ui.selectedIds`, `all`은 scope all, `one`은 그 장소). 성공하면 시트를 닫고 `navigateTo '#/copy/preview'`, 실패하면 `ui.notice` |
| `toggle-extra` (id `memo`·`photos`·`visits`) | `copy.draft.extras` 토글 |
| `copy-execute` | `executeCopy`. 성공 → `navigateTo '#/copy/result'`. 실패(`no-access` 등) → 미리보기에 머물고 `ui.notice = '대상 맵에 접근할 수 없어 복제하지 않았어요. 연결 상태를 확인해 주세요.'` |
| `copy-retry` | `retryFailed` |
| `copy-done` | 대상 맵으로 `switchMap`, `copy` 초기화, `navigateTo '#/map'` |
| `show-map` (id 맵) | `switchMap` 후 `navigateTo '#/map'`(상세의 뒤로) |
| `toggle-want`·`toggle-visited` (id 장소) | 위 함수 |
| `edit-field` (값 `{ field, value }`) | `ui.editDraft`에 반영(`placeId` 포함, 다른 장소의 초안이면 새로 시작) |
| `edit-category` (id 카테고리) | `ui.editDraft.category` |
| `save-edit` (id 장소) | `updatePlaceInfo`, `ui.editDraft = null`, `ui.notice = '저장했어요'`, `navigateTo '#/place/<id>'` |
| `save-location` (id 장소) | `updateLocation(..., { x: 50, y: 50 })`, `ui.notice = '위치를 저장했어요'`, `navigateTo '#/place/<id>'` |
| `open-delete` (id 장소) | `ui.sheet = 'delete'` |
| `confirm-delete` (id 장소) | `trashPlace` 성공 시 그 장소의 맵으로 전환, `ui.notice = '휴지통으로 이동했어요'`, `ui.undo = { action: 'restore-place', id }`, `navigateTo '#/map'` |
| `restore-place` (id 장소) | `restorePlace`, `ui.undo = null`, `ui.notice = '되돌렸어요'` |
| `directions` | `ui.notice = '외부 지도 앱 연결은 아직 준비 중이에요'` (외부 이동 없음) |
| `source` | UI-01 액션을 상세에서도 쓸 수 있게, 장소가 현재 맵이 아니어도 `findAccessiblePlace`로 확인한다 |

`switch-map`·`close-sheet`·시나리오 전환은 `copyPick`·`editDraft`·`undo`도 초기화한다. `ui.notice`는 다른 동작 때 기존처럼 사라진다.

## 화면 명세

문구는 아래 그대로 쓴다. `[ ]`는 화면에 그대로 보이는 자리표시다. `[N]`은 실제 수로 채운다. 배치는 목업 `.ph` 마크업을 따른다.

**4.2 초기 복제 · 다른 맵에 복제**

| ID | 카탈로그 | 핵심 요소와 동작 |
| --- | --- | --- |
| 2-1 | `copy-initial`, `#/copy/initial` | 상단 `초기 복제`(뒤로 없음). 제목 `공유 맵에 내 장소를 넣을까요?`, `내 개인 맵 장소만 고를 수 있어요. 상대방의 개인 장소는 보이지 않아요.` 라디오 3개: `지금 복제 안 함` / `나중에 ‘다른 맵에 복제’로 언제든 넣을 수 있어요`, `선택한 장소 복제` / `내 개인 맵에서 골라요`(기본 선택), `전체 장소 복제` / `장소 [N]곳 전체 · 메모·사진·방문 기록은 다음 단계에서 따로 골라요`. 아래 `상대방은 내 선택을 기다리지 않고 공유 맵을 쓸 수 있어요.` 하단 `다음` → `copy-initial-next`. 활성 공유 맵이 없으면 `공유 맵이 아직 없어요` + `함께 쓰기`(`#/together`) |
| 2-2 | `copy-initial` + `ui.copyPick ['pb-cafe','pb-soup','pb-bakery']`, `#/copy/select` | 상단 `‹ 복제할 장소 선택`(뒤로 `#/copy/initial`). 경로 줄 `[개인] 내 개인 맵에서 → [공유] 우리 공유 맵으로`. 행마다 체크박스(`copy-pick`), 이름(굵게), 캡션 `<카테고리> · 위치 확인됨` 또는 `<카테고리> · 위치 미확정 · 미확정 상태로 복제돼요`, 메모가 있으면 ` · 내 메모 있음`. 행은 `copySources`로만 만든다. 하단 `[N]곳 미리보기`(0곳이면 비활성) → `copy-pick-preview` |
| 2-3 | `connected-personal`, `#/map?view=list` + `ui { selectionMode: true, selectedIds: ['pb-cafe','pb-soup'], sheet: 'copy', copyScope: 'selected' }` | 지도 목록 위에 어두운 배경 + 하단 시트(모달, UI-01 `bottomSheet` 사용 가능): 손잡이, 제목 `다른 맵에 복제`, `대상 [공유] 우리 공유 맵`(`copyTargets`로 만든다). 라디오: `선택한 [N]곳`(선택 0곳이면 비활성), `이 맵의 전체 장소 [N]곳` / `개인 추가 정보는 다음 화면에서 따로 확인해요`. 1곳 진입(`one:`)이면 라디오 대신 `이 장소 1곳 · <장소명>`. 버튼 `미리보기` → `copy-sheet-preview`. 대상이 없으면(공유 맵 없음) `복제할 다른 맵이 없어요. 함께 쓰기로 공유 맵을 만들면 복제할 수 있어요.` + `함께 쓰기`. 4-4의 `선택해서 복제`·`전체 복제`는 이 시트를 `selected`·`all`로 연다 |
| 2-4 | `copy-preview`, `#/copy/preview` | 상단 `‹ 복제 미리보기`(뒤로: 초안을 만든 화면. 초안에 `back` 해시를 저장한다 — 2-1 `all`이면 `#/copy/initial`, 2-2면 `#/copy/select`, 2-3 시트면 `#/map?view=list` 또는 `#/place/<id>`. `history.back`은 쓰지 않는다). 카드: `원래 맵 [개인] 내 개인 맵`, `대상 [공유] 우리 공유 맵`, `원래 맵 이름은 나에게만 보여요. 사용자 A에게는 ‘사용자 B가 복제’로만 표시돼요.`(이름은 데이터에서). 회색 상자 `선택한 장소 [N]곳 · 항상 포함` / `장소명·지점·주소·카테고리·위치 상태·게시물 소개·메뉴·원본 링크·출처`. 소제목 `개인 추가 정보 · 기본 해제`, 체크박스 `내 메모`·`직접 올린 사진`·`내 방문 기록`(모두 해제, `toggle-extra`). `관심 표시·약속·평가는 복제되지 않아요. 원래 장소는 남고, 복제 후 각 맵에서 따로 관리돼요.` 공개 줄 `누구에게 보이나요 · 사용자 A, 사용자 B`. 하단 `[N]곳 복제하기` → `copy-execute`. 실패 안내는 `notice`로 버튼 위에 |
| 2-5 | `copy-to-personal`, `#/copy/preview` | 상단 `‹ 복제 미리보기`(뒤로: 초안의 `back`, 카탈로그 프리셋은 `#/place/shared-cafe`). 카드: `원래 맵 [공유] 우리 공유 맵`, `대상 [개인] 내 개인 맵`. 회색 상자: 1곳이면 `<장소명> · 기본 정보 포함`, 여러 곳이면 `선택한 장소 [N]곳 · 기본 정보 포함`. 소제목 `공유 맵 기록 중 가져올 항목 · 읽을 수 있는 항목만`. `readableExtras`로: 메모가 있으면 체크박스 `우리 메모 “<메모>”` + `<작성자> 작성`(여러 곳이면 `우리 메모 [N]개`), 사진이 있으면 `공유 맵 사진 [N]장`. 둘 다 없으면 `가져올 기록이 없어요`. 회색 상자 `가져오지 않음: 관심 표시 · 이번 약속 · 상대방 평가`. 공개 줄 `누구에게 보이나요 · 나만`. 하단 `내 개인 맵에 복제` |
| 2-6 | `copy-partial`, `#/copy/result` | 상단 `복제 결과 · <대상 맵 이름>`. 상태 칩: 전부 성공 `완료 · [N]곳`(ok), 일부 `일부 완료 · [전체]곳 중 [성공]곳`(warn), 전부 실패 `복제하지 못했어요`(err). 항목 카드(초안 순서): `new` 확정 → 칩 `새 장소`(ok); `new` 미확정 → 칩 `위치 미확정`(warn) + `미확정 상태로 복제. 지도 핀 없이 목록에 있어요.`; `source-added` → 칩 `출처 추가`(ok) + 공유 대상이면 `같은 지점이 이미 있어 출처만 더했어요. 기존 우리 메모·수정·방문 상태는 그대로예요.`(개인 대상이면 `우리 메모` 대신 `내 메모`); `unchanged` → 칩 `이미 있음`(wait) + `이미 같은 장소가 있어 바뀐 내용이 없어요.`; `failed` → 빨간 테두리 카드, 칩 `실패`(err) + `복제하지 못했어요.` 하단: 실패가 있으면 주 버튼 `실패한 [N]곳만 다시 복제`(`copy-retry`), 그리고 `<대상 맵 이름>에서 보기`(`copy-done`) |
| 2-7 | `connected`, `#/place/shared-soup/history` | 상단 `‹ [공유] 예시 국밥집 · 기록`(뒤로 `#/place/<id>`). 소제목 `이 맵의 기록`. history를 최신순 카드로: `copied` → `복제해서 추가` · `[날짜]` / `복제한 사람: <이름>` / `원 저장자: <이름> · 원래 맵 이름은 표시하지 않아요`; `edited` → `<필드> 수정` · `[날짜]` / `수정한 사람: <이름>`; `saved` → `저장` / `저장한 사람: <이름>`; `source-added` → `출처 추가` / `더한 사람: <이름>`; `deleted`·`restored` → `휴지통으로 이동`·`되돌림` / `<이름>`. 회색 상자: 공유 맵이면 `관심 표시·이번 약속·평가는 이 맵에서 새로 시작해요. 내 개인 맵의 원래 카드는 그대로 있고, 서로 자동으로 맞춰지지 않아요.`, 개인 맵이면 `이 맵의 수정은 다른 맵의 복제본에 자동으로 반영되지 않아요.` |

**4.6 장소 상세** (`#/place/:id`, 한 화면 함수. 6-1·6-2는 같은 화면의 위·아래)

| ID | 카탈로그 | 핵심 요소와 동작 |
| --- | --- | --- |
| 6-1 | `connected`, `#/place/shared-cafe` | 상단 `‹`(`show-map`, 장소의 맵) + 맵 배지 + 맵 이름. 이미지 영역(`hasImage`면 빗금 상자 `대표 이미지 · 원본에서 확보 가능한 경우`, 아니면 회색 텍스트 카드: 장소명 굵게 + `이미지를 가져오지 못해 텍스트 카드로 보여요`). 이름(h1), `<카테고리> · <지역> · 위치 확인됨`, `위치 확인은 지점 확인이에요. 영업 정보가 최신이라는 뜻은 아니에요.` 회색 상자 `게시물 소개 [자동 추출]` + summary. 메뉴 카드(공용 표기). `tip`이 있으면 카드 `방문 팁 · 게시물 작성자의 경험` + tip. 메모 카드(공용 표기, memo 배경). 방문 버튼 3칸 그리드(목업 `.acts`): `가고 싶어`(`toggle-want`, 본인이 `wantBy`에 있으면 `aria-pressed="true"`·공유 tint), 공유 맵만 `이번 약속 후보`(→ `#/todo/UI-04/7-1`), `다녀왔어요`(`toggle-visited`). 개인 맵은 2칸. 하단 고정: `길찾기 · 외부 지도 앱`(주 버튼, `directions`, 미확정이면 비활성) + `원본`(96px, `source`) |
| 6-2 | `connected`, `#/place/shared-cafe` + `ui.scrollTarget 'place-sources'` | 같은 화면 아래쪽(`id="place-sources"`부터): 소제목 `참고 글 [N]개`, 출처 카드 `출처 [i] · 인스타 <kind>` + 오른쪽 `원본`(텍스트 버튼, `source`), `보낸 사람 <이니셜> · 저장 [저장 날짜]` + 있으면 ` · 게시일 [확보한 경우] · 가져온 시각 [시각]`, 있으면 `근거: <basis>`, 있으면 `<menuNote>`. 회색 상자 `새 출처가 더해져도 <우리|내> 메모와 직접 수정한 내용은 바뀌지 않아요.` 소제목 `이 맵의 기록`, 한 줄 요약(`저장 사용자 A · 카테고리 수정 사용자 B · 복제해 추가 사용자 B` 형식, history 순서) + 링크 `기록 전체 보기`(→ 2-7). 소제목 `이 맵에서 관리`, 2열 그리드 버튼 `정보·메모 수정`(→ edit) / `위치 수정`(→ location) / `다른 맵에 복제`(`open-copy one:<id>`) / `이 맵에서 삭제`(danger, `open-delete`) |
| 6-3 | `connected-personal`, `#/place/pb-bakery` | 개인 맵 상세. 이미지 없음 텍스트 카드. `<카테고리> · 위치 미확정 · 지도에 핀 없음`(위치 확인 안내 문장은 없음). `sourceAccess 'unavailable'`이면 노란 카드(warn-soft 배경, warn 테두리): 칩 `원문에 접근할 수 없어요` + `원문이 삭제됐거나 비공개로 바뀐 것 같아요. 이미 저장한 정보와 내 메모는 그대로 볼 수 있어요.` 게시물 소개 표기는 `자동 추출 · 저장 당시`. 미확정이면 주 버튼 `위치 직접 정하기`(→ location)를 메모 카드 아래에 둔다. 나머지 영역(방문 2칸·출처·기록·관리·하단 버튼)은 6-1·6-2와 같은 규칙 |
| 6-4 | `connected`, `#/place/shared-cafe/edit` | 상단 `‹ 정보 수정` + 오른쪽 맵 배지. 라벨+표기: `장소명`(`edits.name`이면 `직접 수정됨 · <이름>`, 아니면 `자동 추출`) 입력, `카테고리`(같은 규칙, `shared-cafe`는 `직접 수정됨 · 사용자 B`) 세그먼트 `맛집 / 카페 / 놀거리`(radiogroup, `edit-category`), 메뉴 라벨(공용 메뉴 제목, 같은 표기 규칙) 입력, `<우리|내> 메모` textarea. 입력은 `data-action="edit-field" data-field="name|menuName|memoText"`. 회색 상자 `재분석하거나 새 출처가 더해져도 직접 수정한 내용과 메모는 덮어쓰지 않아요. 수정은 이 맵에만 적용돼요.` 하단 `저장`(`save-edit`) |
| 6-5 | `connected-personal`, `#/place/pb-bakery/location` | 상단 `‹ 위치 수정`. 검색 입력(접근 이름 `장소명·지역 검색`, 값은 장소명, 검색 결과는 목에서 없음). 가짜 지도(목업 `.map` 격자, UI-01 가짜 지도 스타일 재사용 가능) 가운데에 표시 핀 + 라벨 `여기로 옮기기`(장식, 버튼 아님). 하단 `검색 결과를 고르거나 지도를 움직여 위치를 정해요. 이 맵에만 적용돼요.` + `이 위치로 저장`(`save-location`) |
| 6-6 | `connected`, `#/place/shared-soup` + `ui.sheet 'delete'` | 상세 위 어두운 배경(dim-strong) + 가운데 대화상자(`role="alertdialog"`, `aria-modal="true"`, 제목 연결): 공유 맵 `우리 공유 맵에서 삭제할까요?` / `휴지통으로 이동해요. 사용자 A의 화면에서도 사라지고, 삭제한 사람은 ‘사용자 B’로 기록돼요.` / `내 개인 맵 등 다른 맵의 복제본은 지워지지 않아요.` 개인 맵 `내 개인 맵에서 삭제할까요?` / `휴지통으로 이동해요.` / `공유 맵 등 다른 맵의 복제본은 지워지지 않아요.` 버튼 `휴지통으로 이동`(danger, `data-autofocus`, `confirm-delete`), `취소`(ghost, `close-sheet`). 확인 후 지도에 토스트 `휴지통으로 이동했어요` + `되돌리기` |

**UI-01 화면 연결 변경**

- 1-8 `공유 맵에 넣을 장소 고르기` → `#/copy/initial`
- 4-2 요약 카드 `자세히` → `#/place/<장소 id>`
- 4-4 `선택해서 복제` → `open-copy selected`, `전체 복제` → `open-copy all`(링크가 아니라 버튼). 선택 0개면 `선택해서 복제` 비활성은 유지
- 4-6 `내 개인 맵에서 복제` → `#/copy/select`(`ui.copyPick` 초기화)
- 지도·목록·맵 전환 장소 수는 `activePlaces` 기준

**카탈로그**: 제목 `화면 카탈로그 (UI-01·UI-02)`. 묶음 순서 `4.1 시작·연결`, `4.2 초기 복제 · 다른 맵에 복제`, `4.4 개인·공유 지도와 목록`, `4.6 장소 상세`. 13개 제목은 목업 그대로:

- 2-1 초기 복제 선택 / 2-2 내 개인 장소에서 선택 / 2-3 연결 후 진입 · 상세 1개 / 선택 / 전체 / 2-4 미리보기 · 개인 → 공유 / 2-5 미리보기 · 공유 → 내 개인 / 2-6 결과 · 새 장소·출처 추가·일부 실패 / 2-7 복제 이력 · 원 저장자와 복제한 사람
- 6-1 공유 맵 상세 · 정보 카드 (상단) / 6-2 상세 (스크롤 하단) · 출처·기록·관리 / 6-3 이미지 없음 + 원문 접근 불가 · 개인 맵 / 6-4 정보·카테고리·메모 수정 / 6-5 위치 수정 / 6-6 이 맵에서 삭제 → 휴지통

**목업과 다르게 정한 것** (이유를 보고에 다시 쓰지 않아도 된다)

- 6-1의 `shared-cafe`는 `hasImage false`라 대표 이미지 상자 대신 텍스트 카드가 보인다. 같은 장소의 4-2 요약이 `이미지 없음`이어서 일관성을 지킨다.
- 2-2는 목업의 5곳 대신 사용자 B의 개인 장소 4곳을 보인다.
- 6-6은 대화상자와 토스트를 동시에 보이지 않는다. 확인 후 지도에서 토스트가 나온다.
- 6-5의 지도 이동·검색 결과 선택은 목에서 생략하고 저장 시 지도 가운데 좌표를 쓴다.

## 구현 단계

검증 명령의 `node`는 Codex 런타임 Node v24다. 앱 밖에서 실행할 때는 PATH 앞에 `$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`을 둔다.

1. `web/src/data/mock.js`, `web/src/logic/places.js`(`activePlaces`), `web/src/logic/copy.js`, `web/src/logic/place-edit.js`와 `web/tests/copy.test.mjs`·`place-edit.test.mjs`·`places.test.mjs` 추가 경우. 테스트에 반드시 넣을 경우:
   - `copyTargets(state,'personal-b','user-b')`에 `personal-a`가 없고, `copySources(state,'user-b')`에 personal-a 장소가 없다. `buildCopyDraft`에 원본 `personal-a` → `no-access`, 대상 `personal-a` → `invalid-target`, 다른 맵 장소 id → `invalid-place`, 0곳 → `empty`.
   - 개인→공유 초안의 `extras`가 모두 false이고, `scope 'all'` 초안도 같다.
   - `executeCopy` 후 원본 장소(`pb-*`)가 깊은 비교로 그대로이고, 입력 상태 객체가 변경되지 않는다. `dmDefaultTarget`도 그대로다.
   - 기본 추가 정보로 복제한 새 장소는 `memo null`, `photos 0`, `visit null`, `wantBy []`. 추가 정보를 켜면 메모·사진·`visited`가 복사되지만 `want`·`wantBy`는 복사되지 않는다.
   - 같은 지점(`placeKey`): `copy-initial`에서 `pb-cafe` 복제 → `source-added`, 대상 `shared-cafe`의 출처 2개, `name/category/menu/memo/visit/wantBy/edits/pin`은 그대로. 같은 복제를 다시 실행하면 `unchanged`이고 공유 맵 장소 수가 늘지 않는다.
   - 미확정 `pb-bakery` → 새 장소가 `unconfirmed`, `pin null`. 다시 복제하면 `copyOf`로 `unchanged`, 장소 수 그대로.
   - 실패 주입: `copy-partial`의 결과가 순서대로 `new`(국밥집), `source-added`(카페), `new` 미확정(베이커리), `failed`(전시 공간)이고 `total 4`, `done 3`. `retryFailed`는 전시 공간만 처리하고 다른 항목의 장소 수·출처가 늘지 않는다.
   - 권한 재확인: 초안을 만든 뒤 공유 맵을 `active: false`로 바꾸면 `executeCopy`가 `{ ok: false, reason: 'invalid-target' }`이고 상태가 그대로다. 사용자를 공유 맵 참여자에서 빼도 같다.
   - 새 공유 장소에 `personal-b`·`내 개인 맵` 문자열이 어떤 필드에도 없다(`JSON.stringify` 검사, `copyOf`는 장소 id라 맵 id가 아님을 확인).
   - 맵별 독립: 공유 맵 복제본에 `updatePlaceInfo`·`updateLocation`·`toggleWant`·`toggleVisited`·`trashPlace`를 해도 원본 개인 장소가 그대로이고, 반대도 같다.
   - `updatePlaceInfo`는 바뀐 필드만 `edits`·history에 남긴다. `findAccessiblePlace(state,'pa-book','user-b')`는 null이고, user-b가 `pa-book`에 편집·삭제를 시도하면 상태가 그대로다.
   - `trashPlace` 후 `activePlaces`에서 빠지고 `restorePlace`로 돌아온다.
   검증: `node --test --test-isolation=none "web/tests/*.test.mjs"`
2. `web/src/data/scenarios.js`, `web/src/store.js`: 시나리오 5개와 '액션'. 시나리오는 logic 함수로 만든다. 검증: 위 명령
3. `web/src/router.js`, `web/src/main.js`: 경로·파라미터·로그인 확인, `navigateTo`·`scrollTarget`·되돌리기 토스트·`data-field`·`textarea`·대화상자 포커스. 검증: `node --check web/src/main.js`
4. `web/src/screens/copy/*.js`, `web/src/screens/map/screen.js`, `web/src/screens/start/connection.js`: 2-1~2-6과 UI-01 연결 변경. 검증: 위 테스트 명령
5. `web/src/screens/place/*.js`, `web/styles/tokens.css`, `web/styles/base.css`: 6-1~6-6, 2-7, 볼 수 없는 장소. 검증: 위 테스트 명령
6. `web/src/screens/catalog.js`, `web/scripts/check-screens.mjs`, `web/tests/screens.test.mjs`:
   - `check-screens.mjs`: 기대 ID를 `1-1`~`1-9`, `2-1`~`2-7`, `4-1`~`4-8`, `6-1`~`6-6` 30개로 바꾸고 출력 문구를 `30개 화면 확인: ...`으로 한다.
   - `screens.test.mjs`: `EXPECTED`에 13개 화면의 대표 문구를 추가한다(예: 2-1 세 선택지, 2-2 `미확정 상태로 복제돼요`·`내 메모 있음`·`3곳 미리보기`, 2-3 `다른 맵에 복제`·`선택한 2곳`·`이 맵의 전체 장소 4곳`, 2-4 `개인 추가 정보 · 기본 해제`와 체크박스 3개가 모두 해제, 2-5 `가져오지 않음: 관심 표시 · 이번 약속 · 상대방 평가`·`나만`, 2-6 `일부 완료 · 4곳 중 3곳`·`출처 추가`·`실패한 1곳만 다시 복제`, 2-7 `복제한 사람: 사용자 B`·`원래 맵 이름은 표시하지 않아요`, 6-1 `게시물 추천 메뉴`·`자동 추출`·`우리 메모`·`작성: 사용자 A`, 6-2 `참고 글 2개`·`이 맵에서 삭제`, 6-3 `원문에 접근할 수 없어요`·`자동 추출 · 저장 당시`·`위치 직접 정하기`, 6-4 `직접 수정됨 · 사용자 B`, 6-5 `이 위치로 저장`, 6-6 `우리 공유 맵에서 삭제할까요?`·`role="alertdialog"`). '17개' 표현을 30개로 바꾸고, 기존 비노출·이스케이프 반복 검사가 새 13개에도 적용되게 한다.
   - 추가 검사: 공유 맵 쪽 화면(2-6, 2-7, `shared-*` 상세, 공유 복제본 상세)의 렌더 결과에 `내 개인 맵`·`personal-b`가 없다. 사용자 A(`currentUserId 'user-a'`)로 복제된 공유 장소 상세·이력을 렌더하면 `복제한 사람: 사용자 B`가 보이고 user-b의 개인 맵 이름·id가 없다. user-b로 `#/place/pa-book`, `#/place/pa-book/edit`을 렌더하면 '볼 수 없는 장소'이고 `예시 개인 서점`이 없다. `web/src` 전체에 `todo/UI-02` 문자열이 없다(`readFileSync`로 검사). 클릭 흐름(리듀서 수준): 1-8 → 2-1 `선택한 장소 복제` → 2-2 선택 → 2-4 → 실행 → 2-6 → 공유 맵에서 보기 → 4-2에 새 장소, 6-2 `이 맵에서 삭제` → 확인 → 토스트 → `되돌리기`로 복구, 6-4 저장 후 상세에 새 값과 `직접 수정됨`.
   검증: `node --test --test-isolation=none "web/tests/*.test.mjs"` 그리고 `node web/scripts/check-screens.mjs`

## 함께 갱신할 기준 파일

- 없음. 기획 문서·결정 문서·AGENTS.md는 바꾸지 않는다. 복제 중복 판단(`placeKey`·`copyOf`)과 실패 주입은 정적 목업용 결정이며 실제 서비스 설계는 서버 스택을 정할 때 따로 정한다.

## 완료 기준

- [ ] `node --test --test-isolation=none "web/tests/*.test.mjs"` 전부 통과(UI-01 기존 테스트 포함)
- [ ] `node web/scripts/check-screens.mjs` exit 0, `30개 화면 확인` 출력
- [ ] `web/package.json`에 의존성이 없고 `node_modules`·lock 파일이 없다. `web/` 안에 `http(s)://` 외부 리소스 참조가 없다
- [ ] `web/src`에 `todo/UI-02`가 없다
- [ ] 카탈로그의 30개 화면이 390×844에서 가로 스크롤 없이 열리고 13개 새 화면의 배치가 목업 `.ph`와 맞는다(리뷰 때 Claude가 브라우저로 확인)
- [ ] 클릭 흐름: 1-8 → 2-1 → 2-2 → 2-4 → 2-6 → 공유 맵, 4-4 선택 → 2-3 → 2-4, 4-2 자세히 → 6-1 → 다른 맵에 복제 → 2-5 → 결과, 6-2 → 6-4 저장, 6-3 → 6-5 저장 후 지도에 핀, 6-6 삭제 → 되돌리기
- [ ] 실패 경로: 일부 실패 후 실패 항목만 재복제, 비활성 공유 맵으로 복제 거부, 다른 참여자 개인 장소 접근 거부, 반복 복제로 장소 수가 늘지 않음
- [ ] user-b로 보는 어떤 화면에도 사용자 A의 개인 맵·장소가 없고, 공유 맵 쪽 화면에 원본 개인 맵 이름이 없다. 개인 추가 정보는 기본 해제이고 관심 표시는 복제되지 않는다

## 검증 명령

```bash
R="$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies"
PATH="$R/node/bin:$PATH" node --test --test-isolation=none "web/tests/*.test.mjs"
PATH="$R/node/bin:$PATH" node web/scripts/check-screens.mjs
grep -rnE "https?://" web/src web/styles web/index.html
grep -rn "todo/UI-02" web/src
ls web/node_modules web/package-lock.json web/pnpm-lock.yaml 2>&1
```

샌드박스에서 `grep`·`ls`가 실행되지 않으면 UI-01처럼 `rg`·`Test-Path`로 같은 검사를 하고 원래 명령의 오류 첫 줄을 보고에 적는다.

리뷰 단계(Claude, 샌드박스 밖): `node web/scripts/serve.mjs`를 띄우고 `http://localhost:5173/#/catalog`에서 13개 새 화면을 390×844로 열어 목업 마크업과 대조하고 위 클릭 흐름을 확인한다.

## Codex 구현 보고

작성: Codex / 2026-10-15 / 브랜치: `codex/UI-02-copy-place-detail` / 커밋 없음.

구현: 복제 2-1~2-7, 상세 6-1~6-6과 카탈로그 30개를 연결했다. 복제·출처 병합·실패 항목 재시도, 실행 직전 권한 확인, 맵별 정보·메모·위치·방문 편집, 휴지통 이동·되돌리기를 구현했다. 전체 테스트는 **84개 중 83개 통과, 1개 실패**이며 브라우저 시각 검증은 미실행이다. 완료 기준과 리뷰 기록은 변경하지 않았다.

### 변경 파일

| 구분 | 파일 |
| --- | --- |
| 신규 순수 규칙 | `web/src/logic/copy.js`, `web/src/logic/place-edit.js` |
| 신규 복제 화면 | `web/src/screens/copy/initial.js`, `web/src/screens/copy/sheet.js`, `web/src/screens/copy/preview.js`, `web/src/screens/copy/result.js` |
| 신규 상세 화면 | `web/src/screens/place/detail.js`, `web/src/screens/place/edit.js`, `web/src/screens/place/location.js`, `web/src/screens/place/history.js`, `web/src/screens/place/shared.js` |
| 신규 공용 부품 | `web/src/components/check-row.js`(체크 행·라디오 선택지), `web/src/components/source-tag.js`(출처·수정 표기·메뉴 제목), `web/src/components/dialog.js`(삭제 대화상자) |
| 신규 테스트 | `web/tests/copy.test.mjs`, `web/tests/place-edit.test.mjs` |
| 데이터·액션·라우팅 | `web/src/data/mock.js`, `web/src/data/scenarios.js`, `web/src/logic/places.js`, `web/src/store.js`, `web/src/router.js`, `web/src/main.js` |
| 기존 화면·카탈로그 연결 | `web/src/screens/map/screen.js`, `web/src/screens/start/connection.js`, `web/src/screens/catalog.js`, `web/scripts/check-screens.mjs` |
| 스타일·화면 검증 | `web/styles/tokens.css`, `web/styles/base.css`, `web/tests/screens.test.mjs` |
| 보고 | 이 파일의 `Codex 구현 보고` 절만 갱신 |

`place/shared.js`는 접근 불가 화면과 장소 해시를 공유하는 분리 파일이다. 공용 부품 3개와 이 분리 파일은 브리프가 허용한 추가 경로 안에 있다. 범위 밖 파일은 수정하지 않았다. 기존 미추적 파일 `.claude/launch.json`, `web/package.json`, `web/tests/main.test.mjs`도 수정하지 않았다.

### 실행 명령과 결과

모든 명령은 workspace-write 샌드박스에서 실행했다. Node는 `v24.19.0`이며 최초 실행 시 PowerShell에서 `$env:PATH = "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin;$env:PATH"`를 적용했다. 아래는 수정 후 최종 결과다.

| 명령 | 결과 |
| --- | --- |
| `node --test --test-isolation=none "web/tests/*.test.mjs"` | **exit 1**, 84개 실행, 83개 통과, 1개 실패, skipped 0. 실패 위치·오류 첫 줄은 아래에 기록 |
| `node --test --test-isolation=none web/tests/code.test.mjs web/tests/maps.test.mjs web/tests/places.test.mjs web/tests/copy.test.mjs web/tests/place-edit.test.mjs web/tests/screens.test.mjs` | **exit 0**, 80개 모두 통과. 이 보조 실행은 전체 테스트 실패를 대체하지 않음 |
| `node --check web/src/main.js` | **exit 0**, 구문 검사 통과 |
| `node web/scripts/check-screens.mjs` | **exit 0**, `30개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과` |
| `grep -rnE "https?://" web/src web/styles web/index.html` | 실행 시도 **exit 1**, grep 초기화 실패로 원본 명령의 검사는 미실행. `rg`로 대체 검사 |
| `grep -rn "todo/UI-02" web/src` | 실행 시도 **exit 1**, 같은 초기화 실패로 원본 명령의 검사는 미실행. `rg`로 대체 검사 |
| `rg -n "https?://" web/src web/styles web/index.html` | **exit 1**, 출력 없음(일치 없음). 외부 리소스 URL 없음 |
| `rg -n "todo/UI-02" web/src` | **exit 1**, 출력 없음(일치 없음). 기존 UI-02 준비 중 링크 없음 |
| `ls web/node_modules web/package-lock.json web/pnpm-lock.yaml 2>&1` | 실행 시도 **exit 1**, PowerShell 별칭의 인수 오류로 원본 명령의 검사는 미실행. `Test-Path`로 대체 검사 |
| `Test-Path web/node_modules,web/package-lock.json,web/pnpm-lock.yaml` | **exit 0**, 순서대로 `False`, `False`, `False` |
| `git diff --exit-code -- web/package.json web/tests/main.test.mjs` | **exit 0**, 두 파일 변경 없음 |
| `git diff --check` | **exit 0**, 공백 오류 없음 |

전체 테스트의 실패는 `web/tests/main.test.mjs:134`의 `일반 입력은 즉시 검색하고 체크박스는 장소 ID로 선택·해제한다` 검사다. 실제 실패 assertion은 149행으로, 브리프에서 제거하도록 지정한 이전 링크를 기대한다. 오류 첫 줄:

```text
AssertionError [ERR_ASSERTION]: The input did not match the regular expression /href="#\/todo\/UI-02\/2-4"[^>]*>선택해서 복제/. Input:
```

`grep` 오류 첫 줄(가변 프로세스 번호·Windows 사용자 SID는 생략):

```text
0 [main] grep (...) C:\Program Files\Git\usr\bin\grep.exe: *** fatal error - CreateFileMapping ..., Win32 error 5.  Terminating.
```

`ls` 오류 첫 줄:

```text
Get-ChildItem : 'web/pnpm-lock.yaml' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다.
```

새 테스트는 기본 추가 정보 해제, 원본·입력 불변성, 같은 지점의 출처만 병합, 미확정 핀 없음, 실패 항목만 재시도, 권한 회수 시 거부, 맵별 독립 편집·삭제·복구, 비공개 장소·원본 맵 이름 비노출, HTML 이스케이프를 확인한다. `screens.test.mjs`의 DOM 어댑터로 실제 `main.js` 이벤트를 실행해 복제 화면 이동, 입력의 `data-field`, textarea 한글 조합, 삭제 첫 포커스·Esc, 되돌리기 토스트, `scrollTarget` 1회 처리를 검증했다. 픽셀 배치를 확인하는 브라우저 검사는 아니다.

### 실행하지 못한 검사와 이유·후속 필요 사항

- **브라우저 시각·포인터 검증 미실행**: 브리프가 Claude의 샌드박스 밖 리뷰 단계로 지정한 검사다. `node web/scripts/serve.mjs` 실행과 390×844에서 13개 새 화면의 목업 대조·가로 스크롤·실제 클릭 흐름 확인은 남아 있다. DOM 어댑터 검사로 완료 처리하지 않았다.
- **원본 grep·ls 검사는 미실행**: 위 초기화·인수 오류로 검사를 수행하지 못했다. 브리프가 허용한 `rg`·`Test-Path` 대체 검사는 실제 실행했다. 샌드박스 밖 재실행이나 권한 승격은 하지 않았다.
- **전체 테스트 통과를 위한 범위 밖 변경 미구현**: `web/tests/main.test.mjs:149`의 이전 `href` 기대값을 `open-copy`/`selected` 버튼 기대값으로 갱신해야 한다. 이 파일은 브리프의 수정 대상에 없으므로 수정하지 않았다. 해당 버튼의 새 동작은 허용된 `web/tests/screens.test.mjs`에서 검증했다.

### 브리프와 다르게 한 부분

- 비공개 기준(공유 화면에 원본 개인 맵 이름을 표시하지 않음)과 예시 문구의 충돌을 피하려고 2-7 안내를 `원래 카드는 그대로 있고, 서로 자동으로 맞춰지지 않아요.`로, 공유 맵 6-6 안내를 `다른 맵의 복제본은 지워지지 않아요.`로 썼다. 예시에 포함된 실제 맵 이름 `내 개인 맵`을 공유 이력·삭제 화면에서 제거했다. 개인 맵 자체의 화면과 복제하는 본인의 미리보기에는 정상 표시한다.
- 전체 테스트 통과 기준은 범위 밖 테스트의 이전 기대값 때문에 미충족이다. 이외의 기능 범위·스택·의존성 변경은 없다.

### 2라운드

작성: Codex / 2026-10-16 / 브랜치: `codex/UI-02-copy-place-detail` / 커밋 없음.

최신 리뷰의 WARNING 1을 수정했다(BLOCKED 항목 없음). 1라운드 보고와 리뷰 기록은 보존하며, 이번 라운드의 검사 결과는 아래와 같다.

**변경 파일**

- `web/tests/main.test.mjs:149`: 이전 `href` 기대값을 `data-action="open-copy" data-id="selected"`인 `선택해서 복제` 버튼 기대값으로 변경했다. 이 파일의 다른 줄은 수정하지 않았다.
- `docs/plans/UI-02-copy-place-detail.md`: `Codex 구현 보고` 안에 이 `2라운드` 소절만 추가했다.

**실행 명령과 결과**

모두 workspace-write 샌드박스에서 실제 실행했다. 셸은 PowerShell이며, 브리프의 Bash용 `R`·`PATH` 설정 대신 이미 PATH에 등록된 Codex 런타임 Node `v24.19.0`을 사용했다(`node --version`: exit 0).

| 명령 | 결과 |
| --- | --- |
| `node --test --test-isolation=none "web/tests/*.test.mjs"` | **exit 0**, 84개 실행·84개 통과, 실패 0·skipped 0. WARNING 1의 테스트도 통과 |
| `node web/scripts/check-screens.mjs` | **exit 0**, `30개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과` |
| `grep -rnE "https?://" web/src web/styles web/index.html` | 실행 시도 **exit 1**, 초기화 오류로 원본 검사는 미실행. 아래 `rg`로 대체 |
| `grep -rn "todo/UI-02" web/src` | 실행 시도 **exit 1**, 같은 초기화 오류로 원본 검사는 미실행. 아래 `rg`로 대체 |
| `ls web/node_modules web/package-lock.json web/pnpm-lock.yaml 2>&1` | 실행 시도 **exit 1**, PowerShell 별칭의 인수 오류로 원본 검사는 미실행. 아래 `Test-Path`로 대체 |
| `rg -n "https?://" web/src web/styles web/index.html` | **exit 1**, 출력 없음(일치 없음). 외부 리소스 URL 없음 |
| `rg -n "todo/UI-02" web/src` | **exit 1**, 출력 없음(일치 없음). UI-02 준비 중 링크 없음 |
| `Test-Path web/node_modules,web/package-lock.json,web/pnpm-lock.yaml` | **exit 0**, 순서대로 `False`, `False`, `False` |
| `git diff -- web/tests/main.test.mjs` | **exit 0**, 지정한 기대값 한 줄만 변경됨 |
| `git diff --check` | **exit 0**, 공백 오류 없음 |

**실행하지 못한 검사와 이유**

- 원본 `grep` 두 명령은 샌드박스에서 초기화에 실패해 검사를 수행하지 못했다. 오류 첫 줄(가변 프로세스 번호·Windows 사용자 SID 생략):

  ```text
  [main] grep (...) C:\Program Files\Git\usr\bin\grep.exe: *** fatal error - CreateFileMapping ..., Win32 error 5.  Terminating.
  ```

- 원본 `ls` 명령은 PowerShell의 `Get-ChildItem` 별칭에서 인수를 처리하지 못했다. 오류 첫 줄:

  ```text
  Get-ChildItem : 'web/pnpm-lock.yaml' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다.
  ```

- 위 검사는 브리프가 허용한 `rg`·`Test-Path`로 대체 완료했다. 브라우저 시각·포인터 검증은 Claude의 리뷰 단계 검사이므로 이번 라운드에서 실행하지 않았다. 기존 1라운드 리뷰의 확인 기록은 그대로 보존했다.

**브리프와 다르게 한 부분**

- 없음. 허용된 PowerShell 환경 설정과 검사 대체만 적용했다. 참고 항목·범위 밖 파일·리뷰 판정·완료 기준은 변경하지 않았고 커밋하지 않았다.

## 리뷰 기록

(Claude가 작성) 라운드별 판정 APPROVED | WARNING | BLOCKED와 지적 항목.

### 1라운드 — WARNING (2026-10-15, Claude)

**직접 확인한 증거** (샌드박스 밖, Codex 런타임 Node v24.19.0, 브랜치 `codex/UI-02-copy-place-detail`, 미커밋 작업 공간)

- `node --test --test-isolation=none "web/tests/*.test.mjs"`: exit 1, tests 84 / pass 83 / fail 1. 실패는 `web/tests/main.test.mjs`의 `일반 입력은 즉시 검색하고 체크박스는 장소 ID로 선택·해제한다`. 보고와 같다.
- `node web/scripts/check-screens.mjs`: exit 0, `30개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과`.
- `grep -rnE "https?://" web/src web/styles web/index.html`: 출력 없음. `grep -rn "todo/UI-02" web/src`: 출력 없음. `web/node_modules`·lock 파일 없음. Codex가 샌드박스에서 못 돌린 원래 검사를 실행했다.
- 범위: 변경·새 파일이 모두 브리프 범위 안이다(`web/src/screens/place/shared.js`, `components/` 3개는 허용된 추가 경로). `beta_mock-up.html`·`tmp/mockup/`·기획 문서·`AGENTS.md` 변경 없음.
- 브라우저(`web/scripts/serve.mjs`, 390×844): 새 13개 화면 모두 가로 스크롤 없음, 대표 문구 확인. 2-3 시트·6-1 상세·6-6 대화상자(배경 rgba(23,32,27,.4), 첫 포커스 `휴지통으로 이동`)를 목업과 대조해 구조가 맞다.
- 클릭 흐름: 1-7 연결 → 1-8 → 2-1 → 2-2(국밥집·베이커리) → 2-4(추가 정보 체크박스 3개 모두 해제) → 2-6 `완료 · 2곳`(베이커리 `위치 미확정`) → 공유 맵에서 보기(핀은 국밥집만, `위치 미확정 1곳`). 4-4 선택 → 2-3 → 미리보기. 4-2 자세히 → 6-1 → 다른 맵에 복제 → 2-5 → 결과 `출처 추가`(기존 내 메모 유지 문구). 6-4 장소명·카테고리 저장 → 상세에 새 값과 `저장했어요`. 6-5 저장 → 상세 `위치 확인됨`, 개인 지도에 베이커리 핀 생김. 6-6 삭제 → 지도 토스트 `휴지통으로 이동했어요 / 되돌리기` → 되돌리기로 국밥집 핀 복구. 6-2 카탈로그 진입 시 `#place-sources`로 스크롤.

**구현 경계**: 위반 없음. `copyTargets`·`copySources`가 `visibleMaps` 기반이라 사용자 A의 개인 맵이 원본·대상에 나오지 않는다. `executeCopy`가 실행 직전에 `buildCopyDraft`로 권한을 다시 확인한다. 원본 장소와 입력 상태를 바꾸지 않는다. 같은 지점은 출처만 더하고 기존 메모·수정·방문 상태를 보존한다. 개인 추가 정보는 기본 해제이고 `wantBy`·`want`는 복사하지 않는다. 편집·위치·방문·삭제는 `findAccessiblePlace`로 확인한 해당 장소에만 적용된다. 화면에 `copyOf`·원본 맵 id를 그리지 않는다. 데이터 보간은 `html` 태그로 이스케이프된다.

**WARNING**

1. `web/tests/main.test.mjs:149` — 전체 테스트가 실패한다. UI-01 테스트가 4-4 `선택해서 복제`의 이전 링크 `href="#/todo/UI-02/2-4"`를 기대하는데, 이 브리프가 그 링크를 `open-copy` 버튼으로 바꾸게 했다. 원인은 브리프가 `main.test.mjs`를 수정 대상에서 빠뜨린 것이고, Codex가 범위 밖 수정을 하지 않고 보고한 것은 맞다. 근거: 위 테스트 실행 결과. 기대: 이 줄만 새 동작 기대값(`data-action="open-copy" data-id="selected"`인 `선택해서 복제` 버튼)으로 바꾼다. 이 리뷰로 `web/tests/main.test.mjs`를 수정 범위에 추가한다.

**참고** (수정 여부는 사용자 판단)

- 6-6 공유 맵 안내와 2-7 회색 안내에서 `내 개인 맵`을 빼고 `다른 맵의 복제본은 지워지지 않아요.`, `원래 카드는 그대로 있고, …`로 썼다. 브리프의 화면 문구와 '공유 맵 쪽 화면에 `내 개인 맵` 없음' 검사가 서로 충돌한 탓이며, Codex의 선택(비공개 기준 우선)을 인정한다.
- 메모가 없을 때도 메모 제목 옆에 `사용자 입력` 표기가 붙고, 메뉴가 없을 때 `메뉴 정보 없음` 옆에 `자동 추출` 표기가 붙는다(6-6의 국밥집). 값이 없을 때는 표기를 빼는 편이 자연스럽다.
- 상세의 `가고 싶어`는 현재 사용자 기준이라 사용자 A만 표시한 `shared-cafe`에서 사용자 B 화면은 꺼져 있다. 브리프대로이며 목업(켜짐)과 다르다.
- 보고의 "기존 미추적 파일 `web/package.json`, `web/tests/main.test.mjs`"는 사실과 다르다. 두 파일은 main에서 추적 중이다(`git ls-files`로 확인). 수정하지 않았다는 사실 자체는 맞다.

**수정 지시 (2라운드 입력, Codex용)**

- WARNING 1: `web/tests/main.test.mjs:149`의 기대값만 새 버튼 기대값으로 바꾼다. 그 밖의 줄과 다른 파일은 바꾸지 않는다(참고 항목은 사용자가 원할 때만).
- 검증: 브리프 '검증 명령' 전체. 전체 테스트가 exit 0이어야 한다.
- 보고: 'Codex 구현 보고' 아래에 `### 2라운드` 소절을 추가해 변경 파일·명령 결과를 적는다. 1라운드 보고는 지우지 않는다.

### 2라운드 — APPROVED (2026-10-16, Claude)

**직접 확인한 증거** (샌드박스 밖, Codex 런타임 Node v24.19.0)

- `git diff web/tests/main.test.mjs`: 149행 기대값 한 줄만 `<button … data-action="open-copy" data-id="selected" …>선택해서 복제`로 바뀌었다. 다른 파일의 추가 변경 없음(작업 공간 파일 목록이 1라운드와 같고 `main.test.mjs`만 추가).
- `node --test --test-isolation=none "web/tests/*.test.mjs"`: exit 0, tests 84 / pass 84 / fail 0.
- `node web/scripts/check-screens.mjs`: exit 0, `30개 화면 확인`.
- `grep -rnE "https?://" web/src web/styles web/index.html`: 출력 없음. `grep -rn "todo/UI-02" web/src`: 출력 없음.
- 브라우저 확인과 구현 경계 판단은 1라운드 결과를 유지한다(이번 라운드에 화면 코드 변경 없음).

**판정**: WARNING 1 해소. 1라운드 '참고' 항목은 사용자 판단으로 남긴다.
