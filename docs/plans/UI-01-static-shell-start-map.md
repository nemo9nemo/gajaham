# UI-01 정적 목업 UI 셸 + 시작·연결 + 지도·목록

- 상태: DONE (2026-10-15, 리뷰 2라운드 APPROVED 후 커밋)
- 작성: Claude / 날짜: 2026-10-15
- 구현 브랜치: codex/UI-01-static-shell-start-map
- 참조: [0001 정적 목업 UI 스택](../decisions/0001-static-mock-ui-stack.md), [개인·공유 맵 기획](../personal-shared-map-plan-2026-10-12.md) '코드로 연결하는 흐름'·'새 장소의 등록 위치', [목업 지시](../designer-mockup-prompt-2026-10-12.md) 4.1·4.4, `beta_mock-up.html` 보드 '4.1 시작·연결'·'4.4 개인·공유 지도와 목록'

## 목표

1. `web/`에 의존성 없는 정적 모바일 웹이 생기고, `node web/scripts/serve.mjs`로 띄워 `http://localhost:5173`에서 열 수 있다.
2. 목업 4.1의 1-1~1-9와 4.4의 4-1~4-8, 모두 17개 화면을 목 데이터로 보고 서로 이동할 수 있다. `#/catalog`에서 화면 ID마다 해당 화면을 바로 열 수 있다.
3. 연결 코드 상태, 맵 노출 범위, 검색·필터 규칙이 순수 함수로 구현되고 Node 테스트로 검증된다.

`beta_mock-up.html`은 JS로 풀리는 번들이라 직접 파싱하지 않는다. 화면 내용은 이 브리프의 '화면 명세'를 기준으로 한다.

## 범위

새로 만들 파일(이 목록 밖의 파일은 만들지 않는다. 화면 파일을 더 쪼개야 하면 `web/src/screens/` 안에서만 추가하고 보고에 적는다):

- `web/package.json`: `"type": "module"`, `"private": true`, `dependencies`·`devDependencies` 없음. scripts: `test`, `check`, `serve`(아래 '검증 명령'과 같은 명령).
- `web/index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1">`, `lang="ko"`, `<div id="app">`, `styles/tokens.css`·`styles/base.css` 링크, `<script type="module" src="src/main.js">`.
- `web/styles/tokens.css`, `web/styles/base.css`
- `web/src/main.js`: 라우터 연결, `#app`에 렌더, 이벤트 위임
- `web/src/router.js`: 해시 경로 파싱·라우트 표
- `web/src/store.js`: 현재 상태 보관, 시나리오 적용, 액션 처리
- `web/src/html.js`: `html` 태그 함수와 `escapeHtml`
- `web/src/data/mock.js`: 사용자·맵·장소 목 데이터
- `web/src/data/scenarios.js`: 시나리오 프리셋
- `web/src/logic/code.js`, `web/src/logic/maps.js`, `web/src/logic/places.js`: 순수 규칙 함수
- `web/src/components/`: `app-bar.js`, `tab-bar.js`, `map-badge.js`, `chip.js`, `bottom-sheet.js`, `button.js`, `notice.js`
- `web/src/screens/start/`: 1-1~1-9 화면 함수(파일당 1화면 또는 관련 화면 묶음)
- `web/src/screens/map/`: 4-1~4-8 화면 함수
- `web/src/screens/placeholder.js`: '준비 중' 화면
- `web/src/screens/catalog.js`: 화면 카탈로그
- `web/src/screens/demo-dm.js`: 1-2용 시연 DM 미리보기
- `web/scripts/serve.mjs`: `node:http`만 쓰는 정적 서버
- `web/scripts/check-screens.mjs`: 카탈로그·라우트 정합 검사
- `web/tests/code.test.mjs`, `web/tests/maps.test.mjs`, `web/tests/places.test.mjs`, `web/tests/screens.test.mjs`

수정할 기존 파일:

- `AGENTS.md`: '구현 경계' 아래에 '산출물과 검증' 절을 추가한다(단계 8).
- `docs/development/claude-codex-workflow.md`: '검사 분담' 문단 끝의 "스택이 정해지면 구체 명령을 여기에 적는다."를 실제 명령으로 바꾼다(단계 8).

## 하지 말 것

- npm·pnpm 패키지 설치, `node_modules`·lock 파일 생성, 프레임워크·번들러·CSS 프레임워크 도입. `package.json`에 의존성을 넣지 않는다.
- 웹 폰트·지도 SDK·CDN·이미지 URL 등 외부 리소스 로드, `fetch` 등 네트워크 요청. 서버 API·로그인·DM 연동 구현.
- 비밀번호·이메일·토큰 입력 필드. '로그인'은 목 상태만 바꾸는 버튼이다.
- 실제 인스타그램 계정명·지도 업체명·로고 표기. '서비스 계정', '지도', '외부 지도 앱'으로 쓴다.
- 연결 코드의 형식·길이·유효 시간, 처리 시간, 지역명 등 목업에서 미정인 수치·값 표기. 코드 자리는 `[연결 코드]`로 표시한다.
- 목업의 보라색 점선 주석(기획 제안·미정·검증 필요)을 제품 화면에 그리는 것. 카탈로그에도 넣지 않는다.
- 범위 밖 화면(4.2·4.3·4.5·4.6·4.7·4.8, P1·후속 버전) 구현. 해당 버튼은 '준비 중' 화면으로 보낸다.
- `beta_mock-up.html`, 기획 문서(`docs/*.md`, `.planning-staging/`), `.claude/` 수정.
- AGENTS.md 구현 경계 위반:
  - 다른 참여자의 개인 맵을 맵 전환·목록·카탈로그 어디에도 노출하지 않는다. `visibleMaps`는 본인 개인 맵과 본인이 참여한 공유 맵만 돌려준다.
  - 웹에서 현재 맵을 바꿔도 DM 기본 저장 위치(`dmDefaultTarget`)를 바꾸지 않는다.
  - 연결 코드 재발급 시 이전 코드를 무효로 만든다. 코드 입력만으로 상대 기록을 열지 않는다. 로그인 전 상태에서는 코드 입력 화면 대신 로그인 안내를 보인다.
  - 이미 활성 공유 맵이 있으면 새 코드로 자동 교체하지 않고 1-9를 보인다.
  - 연결 완료가 개인 맵을 공유 맵으로 바꾸거나 개인 장소를 공유 맵에 자동으로 넣지 않는다.
  - 위치 미확정 장소에 임의 좌표로 핀을 만들지 않는다.
- 커밋. 리뷰가 APPROVED가 된 뒤에 한다.

## 공통 설계

**디자인 토큰** (`tokens.css`의 `:root` 변수. 목업의 디자인 제안 값이며 확정 브랜드 아님)

| 변수 | 값 | 용도 |
| --- | --- | --- |
| `--color-personal` | `#0F5C4C` | 개인 맵 표기·주 버튼 |
| `--color-personal-strong` | `#0B5040` | 주 버튼 눌림 |
| `--color-personal-tint` | `#E2F0EA` | 개인 배지 배경 |
| `--color-shared` | `#C2571A` | 공유 맵 표기 |
| `--color-shared-tint` | `#FCE9DA` | 공유 배지 배경 |
| `--color-ink` | `#17201B` | 본문 |
| `--color-ink-muted` | `#4A554F` | 보조 문구 |
| `--color-ink-subtle` | `#5E6963` | 캡션 |
| `--color-line` | `#E4E8E4` | 구분선·테두리 |
| `--color-surface` | `#FFFFFF` | 카드 |
| `--color-bg` | `#F3F5F2` | 화면 배경 |
| `--color-warn-bg` / `--color-warn-ink` | `#FFF3D1` / `#6E4A00` | 위치 미확정·주의 |
| `--color-error-bg` / `--color-error-ink` | `#FBE4E0` / `#93271A` | 만료·실패 |

- 서체: `font-family: 'IBM Plex Sans KR', system-ui, -apple-system, 'Segoe UI', sans-serif;` 폰트 파일은 불러오지 않는다(설치된 경우만 적용).
- 글자 크기: 본문 15px, 보조 13~14px, 캡션 12px, 화면 제목 19~21px, 1-1 서비스명 34px.
- 모서리: 버튼·입력 10px, 카드 12~16px, 바텀시트 상단 16px, 칩·배지 999px.
- 레이아웃: `#app` 최대 폭 430px 가운데 정렬, 기준 뷰포트 390×844. 데스크톱에서도 모바일 폭으로 보인다. 가로 스크롤이 없어야 한다.

**맵 배지** (`map-badge.js`): 색과 문구를 함께 쓴다. 개인은 `개인` 배지(개인 tint 배경, personal 글자), 공유는 `공유` 배지(shared tint 배경, shared 글자). 맵 이름은 `내 개인 맵`, `우리 공유 맵`.

**공통 셸**

- `app-bar.js`: 뒤로(‹) 버튼 선택, 제목, 우측 동작 선택.
- `tab-bar.js`: 하단 탭 `지도 / 처리함 / 이번 약속 / 설정`. `지도`만 실제 라우트로 가고 나머지는 '준비 중'(처리함 UI-03, 이번 약속·설정 UI-04).
- 지도 화면 상단: 맵 배지 + 맵 이름(연결 후 `▾`, 시트 열림 `▴`), 연결 전에는 우측에 `함께 쓰기`. 그 아래 카테고리 칩 `전체 / 맛집 / 카페 / 놀거리`, 검색 입력(placeholder `장소명·지역 검색`), `지도 / 목록` 전환. 우하단에 `+ 링크 등록` 버튼('준비 중' UI-03).

**렌더링 방식**

- 화면 함수는 `(state) => string`이고 DOM·`window`에 접근하지 않는다. 사용자에게 보이는 데이터 값은 모두 `escapeHtml`을 거친다(`html` 태그 함수가 보간 값을 자동 이스케이프).
- 동작은 `data-action="<이름>"`(필요하면 `data-id`)으로 표시하고 `main.js`가 `#app`의 click·input·submit을 위임 처리해 `store`의 액션을 호출한 뒤 다시 렌더한다.
- 링크·버튼은 `<a href="#/...">` 또는 `<button type="button">`. 클릭 가능한 `div`를 만들지 않는다.

**라우트** (`router.js`)

| 경로 | 화면 |
| --- | --- |
| `#/start` (기본, 빈 해시) | 1-1 |
| `#/demo/dm` | 1-2 시연 DM 미리보기 |
| `#/intake` | 1-2 비공개 임시 접수 |
| `#/verify` | 1-3 |
| `#/save-target` | 1-4 |
| `#/together` | 1-5 |
| `#/code-status` | 1-6 |
| `#/code-enter` | 1-7 입력·대상 확인, 활성 공유 맵이 있으면 1-9 |
| `#/connected` | 1-8 |
| `#/map` | 4-1·4-2·4-5·4-6·4-8 (상태로 분기), `?view=list`이면 4-4 목록, 검색 결과 0건이면 4-7 |
| `#/catalog` | 화면 카탈로그 |
| `#/todo/<브리프ID>/<화면ID>` | '준비 중' (예: `#/todo/UI-03/5-1`) |

알 수 없는 경로는 `#/start`로 보낸다.

**목 데이터** (`mock.js`) — 실제 사람·계정·주소를 쓰지 않는다.

- 사용자: `user-a`(표시명 `사용자 A`), `user-b`(`사용자 B`).
- 맵: `personal-a`(user-a 개인), `personal-b`(user-b 개인), `shared-ab`(공유, 참여자 user-a·user-b).
- 장소 필드: `id, mapId, name, category('맛집'|'카페'|'놀거리'), region, locationStatus('confirmed'|'unconfirmed'), pin({x,y} 0~100 백분율, 미확정이면 null), summary, senderId(공유 맵만), visit('want'|'visited'|null), wantBy([userId]), hasImage, sourceUrl('instagram.com/reel/[시연용]')`.
- 현재 사용자 기준 목 데이터는 user-b로 한다(4-4의 보낸 사람 A·B, 1-7의 사용자 B와 일치). 1-5·1-6은 시나리오에서 user-a로 바꾼다.
- `personal-b`: `예시 카페 · 성수점`(카페, 서울 성동구, 확정), `예시 국밥집`(맛집, 서울 마포구, 확정), `예시 전시 공간`(놀거리, 서울 종로구, 확정), `예시 베이커리`(카페, 서울 성동구, 미확정). → 4-1의 '위치 미확정 1곳'.
- `personal-a`: 장소 2곳 이상(이름은 `예시 ...`). 테스트에서 user-b 화면에 이 이름이 나오지 않는지 확인한다.
- `shared-ab`: `예시 카페 · 성수점`(카페, 서울 성동구, 확정, summary `테라스 분위기와 피스타치오 음료를 소개한 게시물`, 보낸 사람 A, visit want, wantBy [A], hasImage false), `예시 와인바`(놀거리, 서울 용산구, 확정, 보낸 사람 A), `예시 국밥집`(맛집, 서울 마포구, 확정, 보낸 사람 B, visit visited), `예시 베이커리`(카페, 서울 성동구, 미확정, 보낸 사람 B).
- 사용자 설정: `dmDefaultTarget: 'personal'`, `dmAccountVerified`, `loggedIn`.

**시나리오** (`scenarios.js`) — 카탈로그와 테스트가 같은 프리셋을 쓴다. 각 프리셋은 전체 상태를 새로 만든다(이전 상태와 섞지 않음).

| 키 | 내용 |
| --- | --- |
| `new-visitor` | 로그인 전, 장소 없음, 공유 맵 없음 |
| `dm-intake` | 로그인 전, 임시 접수 링크 1개 |
| `dm-verify` | 로그인 완료, DM 계정 미확인, 임시 접수 1개 |
| `solo` | user-b 로그인, 개인 맵 장소 4곳, 공유 맵 없음 |
| `solo-empty` | user-b 로그인, 장소 없음, 공유 맵 없음 |
| `code-owner` | user-a 로그인, 공유 맵 없음, 사용 가능 코드 1개 |
| `code-entry` | user-b 로그인, 공유 맵 없음, 입력할 코드가 사용 가능 상태(발급자 user-a) |
| `connected` | user-b 로그인, `shared-ab` 활성, 현재 맵 shared |
| `connected-empty-shared` | `connected`와 같되 공유 맵 장소 없음 |
| `already-shared` | `connected`와 같은 상태에서 다른 코드 입력 |
| `map-error` | `connected`와 같되 지도 로딩 실패 |

## 순수 규칙 (`web/src/logic/`)

**`code.js`** — 연결 코드. 상태값: `available`(사용 가능), `expired`(만료됨), `cancelled`(취소됨), `used`(사용 완료), `superseded`(이전 코드 무효).

- `issueCode(codes, ownerId, now)`: 새 코드를 `available`로 추가한다. 같은 owner의 기존 `available` 코드는 `superseded`로 바꾼다. 새 배열을 돌려준다(입력을 변경하지 않음).
- `cancelCode(codes, codeId)`, `expireCode(codes, codeId)`: `available`만 바꾼다. 다른 상태면 그대로 둔다.
- `redeemCode(state, codeValue, userId)`: 결과 객체를 돌려준다.
  - 로그인 안 함 → `{ ok:false, reason:'login-required' }`
  - 코드 없음 → `{ ok:false, reason:'not-found' }`
  - 상태가 available이 아님 → `{ ok:false, reason:'unusable', status }`
  - 본인이 만든 코드 → `{ ok:false, reason:'own-code' }`
  - 입력자 또는 발급자가 이미 활성 공유 맵에 참여 중 → `{ ok:false, reason:'already-shared', sharedMapId }`
  - 통과 → `{ ok:true, owner }`. 이 단계는 확인용이며 상태를 바꾸지 않는다(1-7 '연결하기' 전).
- `confirmConnect(state, codeValue, userId)`: `redeemCode`를 다시 확인해 통과할 때만 새 공유 맵(참여자 2명, 장소 0곳)을 만들고 코드를 `used`로 바꾼다. 두 사람의 개인 맵과 개인 장소·`dmDefaultTarget`은 바꾸지 않는다.

**`maps.js`**

- `visibleMaps(state, userId)`: 본인 개인 맵 + 본인이 참여한 공유 맵만 돌려준다.
- `switchMap(state, mapId)`: `visibleMaps`에 있는 맵일 때만 `currentMapId`를 바꾼다. `dmDefaultTarget`은 바꾸지 않는다. 없는 맵이면 상태를 그대로 돌려준다.
- `hasActiveShared(state, userId)`

**`places.js`**

- `filterPlaces(places, { category, query, visit, senderId })`: `category`가 `전체`·미지정이면 전체. `visit`은 `want`·`visited`·미지정. `senderId`는 공유 맵 목록에서만 쓴다.
- `matchesQuery(place, query)`: 공백을 자른 검색어가 `name` 또는 `region`에 포함되면 true. `summary`·메모·메뉴는 검색하지 않는다. 빈 검색어는 true.
- `pinnable(places)`: `locationStatus === 'confirmed'`이고 `pin`이 있는 장소만. `unconfirmed(places)`: 미확정 장소.

## 화면 명세

각 화면의 문구는 아래 그대로 쓴다. `[ ]`는 목업의 자리표시 표기를 그대로 화면에 보인다.

**4.1 시작·연결**

| ID | 시나리오 | 핵심 요소와 동작 |
| --- | --- | --- |
| 1-1 | new-visitor | 서비스명 `가자함`, 소개 `인스타에서 본 맛집·카페·놀거리, 한곳에 모아 다시 찾기`, 설명 문단, 3단계(`DM으로 전달하거나 링크 입력` / `장소 확인, 필요하면 직접 보완` / `지도와 목록에서 다시 보기`), `혼자 써도 충분해요. 함께 쓰기는 나중에 언제든 연결할 수 있어요.`, 주 버튼 `첫 링크 저장하기` → `#/todo/UI-03/3-1`, 보조 버튼 `로그인` → 로그인 처리 후 `#/map`(solo-empty 상태), 하단 `모바일 웹에서 바로 이용 · 앱 설치 없음` |
| 1-2 | dm-intake | 제목 `비공개 임시 접수`, `보내 주신 링크 1개를 임시로 받아 두었어요`, 받은 링크 `instagram.com/reel/[시연용]`, `본인 확인 전에는 어느 맵에도 저장되지 않고, 다른 사람에게 보이지 않아요.`, 주 버튼 `로그인하고 본인 확인` → 로그인 처리 후 `#/verify`. `#/demo/dm`은 `시연용` 라벨을 단 DM 대화 미리보기(발신 `[공유한 릴스 · 시연용]`, 회신 `링크를 받았어요. 저장하려면 가자함 페이지에서 본인 확인과 저장할 맵을 확인해 주세요.`, 버튼 `가자함에서 확인하기` → `#/intake`). 인스타그램 UI·로고를 흉내 내지 않는다 |
| 1-3 | dm-verify | 앱바 `‹ 본인 확인`, 단계 표시 `1 로그인 완료` / `2 DM 계정 확인`(현재) / `3 저장 대상`, `DM을 보낸 계정이 본인 계정인가요?`, 계정 자리 `[보낸 계정 · 시연용 자리표시자]`, 안내 2문장(`확인하면 이 계정에서 보내는 게시물이 내 처리함으로 들어와요.` / `함께 쓰는 사람의 DM 계정은 각자 따로 확인해요. 공유 연결 코드와는 별개예요.`), `네, 제 계정이에요` → `dmAccountVerified=true` 후 `#/save-target`, `제 계정이 아니에요` → `#/todo/정책미정/1-3` |
| 1-4 | dm-verify 후 | 제목 `어디에 저장할까요?`, 선택지 2개: `개인 · 내 개인 맵 · 나만 볼 수 있어요`(선택됨), `공유 · 공유 맵 · 함께 쓰기 연결 후 고를 수 있어요`(비활성, `aria-disabled="true"`). `누구에게 보이나요 · 나만`, 이번 링크, `DM으로 보낼 때 기본 저장 위치: 개인 맵 · 설정에서 바꿀 수 있어요`, 주 버튼 `내 개인 맵에 저장 요청` → `#/todo/UI-03/5-1`, 버튼 아래 `요청 후 처리함에서 결과를 확인해요`. 저장 완료처럼 표시하지 않는다 |
| 1-5 | code-owner | 앱바 `‹ 함께 쓰기`, `함께 쓸 사람과 공유 맵을 만들어요`, 안내 4줄(목업 문구: `연결하면 ‘우리 공유 맵’이 새로 생겨요` / `내 개인 맵은 그대로 남고 자동으로 공개되지 않아요` / `공유 맵에 넣을 장소는 각자 골라 복제해요` / `인스타그램 DM 계정 확인은 각자 따로 해요`), 상태 배지 `사용 가능`, 코드 `[연결 코드]`, `상대방이 로그인한 뒤 ‘받은 코드 입력’에 넣으면 연결돼요.`, 버튼 `코드 복사`(목에서는 `복사했어요` 안내만), `코드 취소`(→ 취소됨으로 바뀜), `재발급`(→ 새 코드 사용 가능, 이전 코드 superseded). 아래에 `받은 코드 입력` 링크 → `#/code-enter`, `코드 상태 보기` → `#/code-status` |
| 1-6 | code-owner | 앱바 `‹ 연결 코드`. 상태 5개 카드를 모두 나열: `사용 가능 · 상대방이 입력할 수 있어요.` / `만료됨 · 이 코드는 더 이상 쓸 수 없어요.` + `새 코드 만들기` / `취소됨 · 직접 취소한 코드예요.` + `새 코드 만들기` / `사용 완료 · 이미 연결에 쓰인 코드예요. 공유 맵이 만들어졌어요.` / `이전 코드 무효 · 재발급해서 이전 코드는 쓸 수 없어요. 새 코드를 다시 전달해 주세요.` 아래 `입력하는 쪽 안내` 카드: `입력한 코드를 쓸 수 없어요(만료·취소·사용 완료). 상대방에게 새 코드를 요청해 주세요.` 상태 문구는 `code.js` 상태값→문구 표 하나에서 가져온다. 만료 시간 수치 없음 |
| 1-7 | code-entry | 앱바 `‹ 받은 코드 입력`, 입력 라벨 `연결 코드`. 입력 후 `redeemCode` 결과로 분기: ok면 상대 카드(`A` 아바타, `사용자 A`), `이 사람과 공유 맵을 만들까요?`, 안내 4줄(`새 ‘우리 공유 맵’이 생겨요` / `내 개인 맵의 기존 장소는 그대로, 비공개로 남아요` / `사용자 A는 내 개인 맵을 볼 수 없어요` / `인스타그램 DM 계정은 이 연결로 이어지지 않아요`), `연결하기` → `confirmConnect` 후 `#/connected`, `취소` → `#/map`. `unusable`·`not-found`면 1-6의 입력하는 쪽 안내 문구, `own-code`면 `내가 만든 코드는 입력할 수 없어요.`, `login-required`면 로그인 안내와 `로그인` 버튼, `already-shared`면 1-9. 목 코드 값은 시나리오에 있는 값만 유효하다 |
| 1-8 | connected 직후 | 제목 `연결됐어요`, 맵 2개 카드: `개인 · 내 개인 맵 · 그대로 유지 · 나만 볼 수 있어요`, `공유 · 우리 공유 맵 · 새로 생김 · 사용자 A, 사용자 B`, 안내 `이제 내 개인 장소 중 공유 맵에 넣을 장소를 골라요. 상대방은 내 선택을 기다리지 않고 바로 쓸 수 있어요.`, `DM 기본 저장 위치는 그대로 ‘개인 맵’이에요.`(값은 `dmDefaultTarget`에서), 주 버튼 `공유 맵에 넣을 장소 고르기` → `#/todo/UI-02/2-1`, `나중에 할게요` → 현재 맵을 공유 맵으로 바꾸고 `#/map` |
| 1-9 | already-shared | 앱바 `‹ 받은 코드 입력`, 배지 `이미 공유 맵에 참여 중`, `이미 함께 쓰는 공유 맵이 있어요`, 카드 `공유 · 우리 공유 맵 · 사용자 A와 함께 쓰는 중`, 안내 `공유 맵은 한 번에 하나만 쓸 수 있어요. 새 코드로 자동으로 바꾸지 않아요. 새 사람과 연결하려면 먼저 지금 공유 맵에서 나가야 해요.`, `지금 공유 맵 보기` → 공유 맵으로 전환 후 `#/map`, `공유 맵 나가기 안내` → `#/todo/UI-04/8-5` |

**4.4 개인·공유 지도와 목록**

| ID | 시나리오 | 핵심 요소와 동작 |
| --- | --- | --- |
| 4-1 | solo | 상단 `개인 · 내 개인 맵`, 우측 `함께 쓰기` → `#/together`. 맵 전환 버튼 없음. 가짜 지도에 확정 장소 핀 3개(장소명 라벨), 상단에 `위치 미확정 1곳 · 지도에 표시 안 됨 · 목록에서 보기`(누르면 목록 보기), `+ 링크 등록`, 하단 탭 |
| 4-2 | connected | 상단 `공유 · 우리 공유 맵 ▾`. 핀을 누르면 바텀시트 요약: 이미지 자리(`hasImage=false`면 `이미지 없음`), 이름, `카페 · 서울 성동구 · 위치 확인됨`, summary, `보낸 사람 A · 가고 싶어: A`, 버튼 `자세히` → `#/todo/UI-02/6-1`, `원본` → 외부로 이동하지 않고 `원본 링크: instagram.com/reel/[시연용]` 안내. 시트 닫기 버튼 |
| 4-3 | connected | 맵 이름 버튼을 누르면 `맵 전환` 바텀시트(이름 옆 `▴`): `개인 · 내 개인 맵 · 나만 · 장소 [N]곳`, `공유 · 우리 공유 맵 · 지금 보는 맵 · 사용자 A, 사용자 B · 장소 [N]곳`(`[N]`은 실제 장소 수로 채움, 현재 맵에 `지금 보는 맵`), 안내 `상대방의 개인 맵은 볼 수 없어요. 공유 맵에 넣으려면 각자 복제해요.`, `맵을 바꿔도 DM 기본 저장 위치는 바뀌지 않아요.` 목록은 `visibleMaps`로 만든다. 선택하면 `switchMap` 후 시트 닫힘 |
| 4-4 | connected, `?view=list` | 필터 칩 `방문 전체 / 가고 싶어 / 다녀왔어요`, 공유 맵에서만 `보낸 사람 전체 / 사용자 A / 사용자 B`. 행: 이미지 자리 `없음`, 이름, `카테고리 · 위치 확인됨 · 보낸 사람 X`, 방문 상태(`가고 싶어 · A` / `다녀왔어요`). 미확정 장소는 목록에 포함하고 `위치 미확정 · 지도에 표시 안 됨`. 우측 `선택` → 선택 모드(행 체크박스, 하단 `선택해서 복제` / `전체 복제` → `#/todo/UI-02/2-4`) |
| 4-5 | solo-empty | `개인 · 내 개인 맵`, `아직 저장한 장소가 없어요`, `인스타그램에서 본 게시물·릴스를 서비스 계정에 DM으로 보내거나, 링크를 붙여 넣어 저장해요.`, `링크 등록` → `#/todo/UI-03/3-1`, `DM으로 보내는 방법` → `#/todo/UI-03/3-1` |
| 4-6 | connected-empty-shared | `공유 맵에 아직 장소가 없어요`, `내 개인 맵에서 함께 볼 장소를 골라 복제하거나, 새 링크를 공유 맵에 등록해요.`, `내 개인 맵에서 복제` → `#/todo/UI-02/2-2`, `공유 맵에 링크 등록` → `#/todo/UI-03/3-2`, `공유 맵에 넣은 장소는 사용자 A, 사용자 B에게 보여요.`(참여자 이름은 데이터에서) |
| 4-7 | connected + 검색어 `연남 파스타` | `‘연남 파스타’와 맞는 장소가 없어요`(검색어는 이스케이프), `장소명이나 지역으로 검색해요. 메뉴·메모 내용은 검색되지 않아요.`, `검색어 지우기` → 검색어 초기화 |
| 4-8 | map-error | 지도 영역 대신 `지도를 불러오지 못했어요` / `목록과 원본 링크는 그대로 이용할 수 있어요.` / `다시 시도`(→ 지도 정상 표시). 그 아래 목록 행(이름, `카테고리 · 위치 확인됨`, `원본`) |

**가짜 지도**: 연한 배경과 CSS 격자·도로선 정도의 정적 그림. 핀은 `pin.x/pin.y` 백분율 위치의 `<button>`(접근 이름 = 장소명). 개인 맵 핀은 personal 색, 공유 맵 핀은 shared 색. 지도 업체 표기 없음.

**카탈로그** (`#/catalog`): 제목 `화면 카탈로그 (UI-01)`. 4.1·4.4 두 묶음으로 17개 화면 ID와 제목(목업 제목 그대로, 예: `1-6 코드 상태 · 만료·취소·사용 완료·재발급`)을 나열한다. 각 항목을 누르면 시나리오를 적용하고 해당 경로로 이동한다(필요하면 검색어·시트 열림·목록 보기 등 화면 상태도 함께). 카탈로그 정의는 `catalog.js`의 배열 `CATALOG = [{ id, title, scenario, route, ui }]` 하나로 둔다. `ui`는 시트 열림·검색어 같은 추가 화면 상태다.

**준비 중 화면**: `준비 중인 화면이에요`, `<화면ID> · <브리프ID>에서 만들어요`, 버튼 `지도로 돌아가기`. `정책미정`이면 `정책이 정해지지 않은 화면이에요`.

## 구현 단계

검증 명령의 `node`는 Codex 런타임 Node v24다. 앱 밖에서 실행할 때는 PATH 앞에 `$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`을 둔다.

1. `web/package.json`, `web/index.html`, `web/styles/tokens.css`, `web/styles/base.css`, `web/scripts/serve.mjs`: 위 '공통 설계' 기준으로 만든다. `serve.mjs`는 `web/`만 제공하고(경로를 정규화한 뒤 `web/` 밖이면 403), 포트는 `PORT` 환경 변수 또는 5173, `127.0.0.1`에만 바인딩, `.html/.js/.mjs/.css`에 맞는 Content-Type. 검증: `node --check web/scripts/serve.mjs`
2. `web/src/html.js`, `web/src/logic/code.js`, `web/src/logic/maps.js`, `web/src/logic/places.js`와 테스트 `web/tests/code.test.mjs`·`maps.test.mjs`·`places.test.mjs`: '순수 규칙' 기준으로 구현한다. 테스트에 반드시 넣을 경우:
   - 재발급하면 이전 available 코드가 superseded가 되고 available 코드는 owner당 1개다.
   - expired·cancelled·used·superseded 코드는 `redeemCode`에서 `unusable`, 로그인 전은 `login-required`, 본인 코드는 `own-code`, 활성 공유 맵이 있으면 `already-shared`.
   - `redeemCode`는 상태를 바꾸지 않고, `confirmConnect`는 공유 맵 1개를 만들고 코드를 used로 바꾸며 두 개인 맵의 장소 수와 `dmDefaultTarget`이 그대로다. 입력 객체가 변경되지 않는다.
   - `visibleMaps(state,'user-b')`에 `personal-a`가 없다.
   - `switchMap`이 `dmDefaultTarget`을 바꾸지 않고, 보이지 않는 맵 id(`personal-a`)로는 바뀌지 않는다.
   - `matchesQuery`: `성수`(이름)·`성동구`(지역)는 맞고, `피스타치오`(summary)·`연남 파스타`는 안 맞는다.
   - `pinnable`에 미확정 장소가 없다.
   - `escapeHtml`이 `<`, `>`, `&`, `"`, `'`를 바꾼다.
   검증: `node --test --test-isolation=none "web/tests/*.test.mjs"`
3. `web/src/data/mock.js`, `web/src/data/scenarios.js`, `web/src/store.js`: 목 데이터·시나리오·액션. 액션은 `logic/` 함수를 호출하고 화면 상태(검색어·필터·시트·목록 보기·선택 모드·지도 오류)를 함께 관리한다. 검증: `node --test --test-isolation=none "web/tests/*.test.mjs"`
4. `web/src/components/*.js`, `web/src/router.js`, `web/src/main.js`, `web/src/screens/placeholder.js`: 공통 셸과 라우팅. 검증: `node --check web/src/main.js`
5. `web/src/screens/start/*.js`, `web/src/screens/demo-dm.js`: 1-1~1-9. 검증: `node --test --test-isolation=none "web/tests/*.test.mjs"`
6. `web/src/screens/map/*.js`: 4-1~4-8과 가짜 지도. 검증: `node --test --test-isolation=none "web/tests/*.test.mjs"`
7. `web/src/screens/catalog.js`, `web/tests/screens.test.mjs`, `web/scripts/check-screens.mjs`:
   - `screens.test.mjs`: `CATALOG`의 17개 항목마다 시나리오를 적용해 화면 함수를 렌더하고, 예외가 없고 해당 화면의 대표 문구가 들어 있는지 확인한다(예: 1-6에 다섯 상태 문구 모두, 4-1에 `위치 미확정 1곳`, 4-7에 `연남 파스타`, 4-8에 `지도를 불러오지 못했어요`). user-b 시나리오의 모든 렌더 결과에 `personal-a` 장소 이름이 없는지 확인한다. 장소 이름에 `<script>`를 넣은 상태로 렌더하면 이스케이프되는지 확인한다.
   - `check-screens.mjs`: `CATALOG`의 id가 정확히 `1-1`~`1-9`, `4-1`~`4-8` 17개이고 중복이 없으며, 각 `route`가 `router.js`의 라우트 표에 있는지 확인한다. 실패하면 이유를 출력하고 exit code 1.
   검증: `node --test --test-isolation=none "web/tests/*.test.mjs"` 그리고 `node web/scripts/check-screens.mjs`
8. `AGENTS.md`: '구현 경계' 절 뒤에 다음 절을 추가한다.

   ```markdown
   ## 산출물과 검증

   정적 목업 UI는 `web/`에 있고 의존성 없는 HTML·CSS·ES 모듈이다(docs/decisions/0001-static-mock-ui-stack.md). 패키지를 추가하지 않는다. Node는 Codex 런타임 v24 기준이다.

   - 단위·화면 테스트: `node --test --test-isolation=none "web/tests/*.test.mjs"`
   - 카탈로그 정합: `node web/scripts/check-screens.mjs`
   - 미리보기: `node web/scripts/serve.mjs` → http://localhost:5173/#/catalog (390×844 기준)
   ```

   `docs/development/claude-codex-workflow.md`: "스택이 정해지면 구체 명령을 여기에 적는다."를 "정적 목업 UI의 검사 명령은 AGENTS.md '산출물과 검증'을 따른다. 브라우저 화면 확인은 리뷰 단계에서 Claude가 `node web/scripts/serve.mjs`로 띄워 한다."로 바꾼다. 검증: `git diff --stat -- AGENTS.md docs/development/claude-codex-workflow.md`

## 함께 갱신할 기준 파일

- `AGENTS.md` '산출물과 검증' 추가 (단계 8)
- `docs/development/claude-codex-workflow.md` 검사 분담 문단 (단계 8)
- `docs/decisions/0001-static-mock-ui-stack.md`는 Claude가 작성함. 리뷰 APPROVED 시 Claude가 상태를 '확정'으로 바꾼다. Codex는 수정하지 않는다.

## 완료 기준

- [ ] `node --test --test-isolation=none "web/tests/*.test.mjs"` 전부 통과
- [ ] `node web/scripts/check-screens.mjs` exit 0, 17개 화면 확인 출력
- [ ] `web/package.json`에 의존성이 없고 `node_modules`·lock 파일이 없다
- [ ] `web/` 안에 `http(s)://`로 시작하는 외부 리소스 참조가 없다(`grep -rnE "https?://" web/src web/styles web/index.html` 결과 없음)
- [ ] 카탈로그의 17개 화면이 390×844에서 가로 스크롤 없이 열리고 화면 명세의 문구·버튼이 있다 (리뷰 때 Claude가 브라우저로 확인)
- [ ] 1-1 → 로그인 → 4-5, 4-1 → 함께 쓰기 → 1-5, 1-7 → 연결하기 → 1-8 → 나중에 할게요 → 4-2, 4-2 핀 → 바텀시트, 맵 전환 시트에서 개인·공유 전환이 클릭으로 동작한다
- [ ] 실패 경로: 사용 불가 코드 입력 시 입력하는 쪽 안내, 활성 공유 맵이 있을 때 1-9, 로그인 전 코드 입력 시 로그인 안내, 지도 실패 시 목록·원본 이용 가능
- [ ] user-b로 보는 어떤 화면에도 사용자 A의 개인 맵·장소가 없다. 맵 전환 후에도 DM 기본 저장 위치 문구가 `개인 맵` 그대로다
- [ ] 범위 밖 버튼은 모두 '준비 중' 화면으로 가고 깨진 경로가 없다

## 검증 명령

```bash
R="$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies"
PATH="$R/node/bin:$PATH" node --test --test-isolation=none "web/tests/*.test.mjs"
PATH="$R/node/bin:$PATH" node web/scripts/check-screens.mjs
grep -rnE "https?://" web/src web/styles web/index.html
ls web/node_modules web/package-lock.json web/pnpm-lock.yaml 2>&1
```

리뷰 단계(Claude, 샌드박스 밖): `node web/scripts/serve.mjs`를 띄우고 `http://localhost:5173/#/catalog`에서 17개 화면을 390×844로 열어 목업과 대조한다.

## Codex 구현 보고

작성: Codex / 2026-10-15. 브리프 범위 안에서 구현했고 커밋·패키지 설치는 하지 않았다. Node 검증은 모두 workspace-write 샌드박스에서 Codex 런타임 Node v24.19.0으로 실행했다. 브라우저 리뷰는 아직 하지 않았다.

**변경 파일**

새 파일은 `web/` 아래 32개다.

- 진입점·스타일: `web/package.json`, `web/index.html`, `web/styles/tokens.css`, `web/styles/base.css`.
- 앱·상태·라우팅: `web/src/main.js`, `web/src/router.js`, `web/src/store.js`, `web/src/html.js`.
- 목 데이터·시나리오: `web/src/data/mock.js`, `web/src/data/scenarios.js`.
- 순수 규칙: `web/src/logic/code.js`, `web/src/logic/maps.js`, `web/src/logic/places.js`.
- 공통 컴포넌트: `web/src/components/app-bar.js`, `web/src/components/tab-bar.js`, `web/src/components/map-badge.js`, `web/src/components/chip.js`, `web/src/components/bottom-sheet.js`, `web/src/components/button.js`, `web/src/components/notice.js`.
- 화면: `web/src/screens/start/onboarding.js`(1-1~1-4), `web/src/screens/start/connection.js`(1-5~1-9), `web/src/screens/map/screen.js`(4-1~4-8), `web/src/screens/catalog.js`, `web/src/screens/demo-dm.js`, `web/src/screens/placeholder.js`. 관련 화면을 묶었으며 추가 화면 파일은 지정된 `screens/` 안에만 만들었다.
- 서버·정합 검사: `web/scripts/serve.mjs`, `web/scripts/check-screens.mjs`.
- 테스트: `web/tests/code.test.mjs`, `web/tests/maps.test.mjs`, `web/tests/places.test.mjs`, `web/tests/screens.test.mjs`.

기존 파일은 `AGENTS.md`에 지정된 '산출물과 검증' 절을 추가했고, 이 브리프의 'Codex 구현 보고'를 작성했다. `docs/development/claude-codex-workflow.md`의 검사 분담 문구도 단계 8대로 반영했다. 작업 도중 해당 파일을 포함한 별도 Git 변경이 반영되어, 최종 확인 시 이 검사 문구는 HEAD와 같아 해당 파일의 미커밋 diff는 없다. 다른 변경을 되돌리거나 추가로 수정하지 않았다. 결정 문서·목업·기타 기획 파일은 수정하지 않았다.

**실행 명령과 결과**

PowerShell의 `node`가 지정된 Codex 런타임 경로를 가리키는 것을 확인했으므로 Bash용 PATH 접두사 없이 같은 Node 명령을 실행했다.

| 명령 | 실제 결과 |
| --- | --- |
| `node --version` | exit 0, `v24.19.0` |
| `node --check web/scripts/serve.mjs` | exit 0, 구문 검사 통과 |
| `node --check web/src/main.js` | exit 0, 구문 검사 통과 |
| `node --test --test-isolation=none "web/tests/*.test.mjs"` | 최종 실행 exit 0, tests 42 / pass 42 / fail 0 / skipped 0 |
| `node web/scripts/check-screens.mjs` | exit 0, `17개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과` |
| `grep -rnE "https?://" web/src web/styles web/index.html` | exit 1, Git의 grep 실행 중 샌드박스 권한 오류로 검사 미실행. 오류 첫 줄은 아래에 기록 |
| `ls web/node_modules web/package-lock.json web/pnpm-lock.yaml 2>&1` | exit 1, PowerShell에서 `ls`가 `Get-ChildItem`으로 해석되어 인수 오류로 검사 미실행. 오류 첫 줄은 아래에 기록 |
| `rg -n "https?://" web/src web/styles web/index.html` | 출력 없음, exit 1은 일치 항목 없음이라는 rg의 정상 결과. 외부 리소스 URL 없음 |
| `@('web/node_modules', 'web/package-lock.json', 'web/pnpm-lock.yaml', 'web/yarn.lock', 'web/bun.lock', 'web/bun.lockb') \| ForEach-Object { [pscustomobject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ } }` | exit 0, 6개 경로 모두 `Exists=False` |
| `node --input-type=module -e`로 `web/package.json`과 위 경로들을 `node:fs`로 검사 | exit 0, `dependencies/devDependencies 없음`, `node_modules 및 lock 파일 없음` 출력 |
| `node web/scripts/serve.mjs` | `127.0.0.1:5173`에서 실행 성공. `node:http` 클라이언트로 `/`를 요청해 HTTP 200과 ES 모듈 진입점 확인 후 서버 종료 |
| `git diff --stat -- AGENTS.md docs/development/claude-codex-workflow.md` | exit 0, 최종 확인 시 AGENTS.md 8줄 추가. workflow 검사 문구는 HEAD와 동일 |
| `git diff --check` | exit 0, 공백 오류 없음 |

테스트에는 코드 재발급·취소·만료·사용 완료, 대상 확인과 확정 사이의 상태 변경 재검사, 입력 객체 불변성, 빈 공유 맵 생성, 개인 장소와 DM 기본 저장 위치 유지, 개인 맵 노출 제한, 검색·복합 필터·미확정 핀 제외, 17개 화면 렌더와 데이터 이스케이프, 맵 전환·선택 모드·오류 복구를 포함했다. 정적 서버는 실제 로컬 HTTP 요청으로 HTML/CSS/JS/MJS Content-Type, HEAD, 400/403/404/405 응답과 인코딩된 경로 이탈 차단도 검사했다.

**실행하지 못한 검사와 이유**

- 원래 `grep` 검사는 실행을 시도했으나 초기화 오류로 미실행이다. 오류 첫 줄(운영체제 사용자 SID는 마스킹):

  ```text
  0 [main] grep (25112) C:\Program Files\Git\usr\bin\grep.exe: *** fatal error - CreateFileMapping [사용자 SID 마스킹], Win32 error 5.  Terminating.
  ```

  같은 대상·정규식의 `rg` 검사로 외부 URL이 없음을 확인했다. 샌드박스 밖에서 재실행하지 않았다.

- 원래 `ls` 검사는 실행을 시도했으나 PowerShell 별칭의 인수 해석 차이로 미실행이다. 오류 첫 줄:

  ```text
  Get-ChildItem : 'web/pnpm-lock.yaml' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다.
  ```

  PowerShell `Test-Path`와 Node 파일 시스템 검사로 의존성 디렉터리·lock 파일이 없음을 확인했다.

- 390×844에서 17개 화면의 실제 배치·가로 스크롤 여부·목업 대조와 브라우저 클릭·키보드 동작 검사는 미실행이다. 브리프의 역할 분담에 따라 Claude 리뷰 단계에서 확인할 항목이다. 오류 첫 줄은 없다(실행 시도하지 않음). Node 화면 렌더·상태 전이 검사와 브라우저 검증 완료를 구분했으며, 위 '완료 기준'의 브라우저 항목을 완료로 표시하지 않았다.

**브리프와 다르게 한 부분·확인할 점**

- 완료 기준의 `1-7 → 연결하기 → 1-8 → 나중에 할게요 → 4-2`는 새 공유 맵을 장소 0곳으로 만든다는 순수 규칙과 충돌한다. 실제 연결 흐름에서는 개인 장소를 자동 복제하지 않고 **4-6 빈 공유 맵**으로 이동한다. 장소가 있는 4-2와 핀 요약은 `connected` 목 시나리오와 카탈로그로 확인할 수 있다. 이 차이를 검증하는 테스트도 포함했다.
- 검증 명령은 Windows PowerShell 환경에 맞게 위 대체 검사로 보완했다. 제품 범위 밖 기능이나 파일 변경은 추가하지 않았다.
- HTTP 제공에는 `node:http`, 파일 읽기·경로 경계 검사에는 Node 내장 `fs/promises`, `path`, `url`만 사용했다. 외부 서버 라이브러리는 사용하지 않았다.
- 리뷰 기록과 결정 문서 상태는 변경하지 않았다. 커밋·push·PR 생성도 하지 않았다.

### 2라운드

작성: Codex / 2026-10-15. 최신 리뷰인 **1라운드 WARNING 1·2·3**과 같은 절의 '수정 지시 (2라운드 입력, Codex용)'를 반영했다. 최신 리뷰에 BLOCKED 항목은 없다. 아래 내용은 구현·Node 검사 보고이며, Claude의 2라운드 시각 리뷰 판정을 대신하지 않는다. 1라운드 보고와 리뷰 기록·판정은 유지했다.

**변경 파일**

- `web/src/screens/start/onboarding.js`: 1-1 설명 원문 복원, 워드마크·단계 카드·회색 안내·하단 버튼, 1-2~1-4 구조 정리.
- `web/src/screens/start/connection.js`: 1-5~1-9 안내·코드·상태·대상 확인·완료 카드와 하단 동작 배치 정리.
- `web/src/screens/start/layout.js` **신규**: 시작·연결 화면의 상단·본문·하단 공통 셸. 추가 화면 파일을 허용한 `web/src/screens/` 안에 만들었다.
- `web/src/screens/map/screen.js`: 지도 도구 순서, 전체 폭 보기 전환, 미확정 칩, 비모달 요약 카드, 헤더 드롭다운, 목록 복제 버튼, 빈 상태·검색 없음·지도 실패 배치.
- `web/src/screens/catalog.js`: 지정된 목업 제목 17개, 4-7의 목록 보기 프리셋.
- `web/src/components/map-badge.js`, `web/src/components/tab-bar.js`: 맵 배지 모서리, 텍스트 탭과 활성 상단 선.
- `web/src/main.js`: 지도 화면의 `inert`·모달 포커스 이동·Tab 가두기 제거. 비모달 카드·드롭다운의 Esc 닫기와 열었던 버튼으로 포커스 복귀 유지.
- `web/src/store.js`: 맵 전환 버튼을 다시 누르면 드롭다운이 닫히도록 토글 처리.
- `web/styles/tokens.css`, `web/styles/base.css`: 목업의 색·테두리·그림자 토큰, 54px 상단 바, 간격·크기·모서리, 화면 셸·지도·요약·드롭다운·목록 스타일.
- `web/tests/screens.test.mjs`: 대표 문구와 비모달 기대값 갱신. 제목·구조·열기/닫기·복제 버튼 활성 조건·실제 `main.js` 이벤트 위임의 Esc/Tab/포커스 복귀 검사 7개 추가.
- 이 브리프: 'Codex 구현 보고'에 이 `### 2라운드` 소절 추가.

이번 수정은 위 **13개 파일(신규 1개 포함)**에 한정했다. `tmp/mockup/`은 읽기만 했고 복사·수정하지 않았다. 기존 `AGENTS.md`, `docs/development/claude-codex-workflow.md`, `.claude/` 등의 사용자 변경은 건드리지 않았다. 범위 밖 변경이 필요한 항목은 발견하지 못했다. 커밋·push·PR·브랜치 변경을 하지 않았다(작업 시작 시 체크아웃은 `claude/git-workflow`).

**화면별로 반영한 항목**

마크업과 CSS를 대조해 아래 구조를 반영했다. 실제 렌더링의 시각 일치 여부는 아직 검증하지 않았다.

| 화면 | 반영한 구조 |
| --- | --- |
| 1-1 | 작은 초록 워드마크를 상단 바로 이동. 24px 헤드라인, 설명 원문, 테두리 안의 `1 · …` 단계, 회색 안내, 화면 하단의 버튼 2개와 설치 안내. eyebrow·브랜드 마크 제거 |
| 1-2 | 서비스 계정의 시연 DM 대화 영역, 비공개 임시 접수 칩, 받은 링크 카드와 비공개 안내, 하단 본인 확인 버튼 |
| 1-3 | 단계 상태 칩, 계정 설명·자리표시자·확인 안내를 한 카드로 배치, 회색 공유 연결 안내, 하단 확인/아니에요 버튼 |
| 1-4 | 상단 저장 대상 확인·본문 질문 분리, 선택 원형 표시와 개인/공유 옵션, 공개 대상 회색 줄, 이번 링크 카드, 기본 저장 위치 안내, 하단 저장 요청 |
| 1-5 | 회색 안내 4줄, 가운데 코드·상태 카드, 카드 밖 전체 폭 코드 복사, 취소/재발급을 나란히 배치 |
| 1-6 | 상태별 칩·설명 카드 5개, 만료/취소의 새 코드 버튼, 이전 코드 무효의 오류 테두리, 회색 입력자 안내. 상태 문구는 기존 `CODE_STATUS` 사용 |
| 1-7 | 코드 입력 아래 초록 테두리 확인 카드, 작은 A 아바타와 상대 이름·질문, 안내 4줄, 하단 연결/취소 |
| 1-8 | 상단 연결 완료·본문 연결됐어요 분리, 개인/공유 카드와 안내·DM 기본 위치 문구, 하단 장소 선택/나중에 버튼. 큰 성공 아이콘 제거 |
| 1-9 | 경고 칩, 기존 공유 맵 카드, 본문 안내, 하단 현재 맵/나가기 안내 버튼 |
| 4-1 | 검색 → 카테고리 → 전체 폭 지도/목록 전환, 흰 배너 안 주황 미확정 칩과 설명, 격자 목 지도·개인 핀·텍스트 탭 |
| 4-2 | 지도 위 비모달 하단 요약, 58px 왼쪽 썸네일·오른쪽 이름/메타/요약, 보낸 사람/방문 정보, 나란한 자세히/원본. 선택 핀 확대. 배경 어둡게 하기·`aria-modal`·`inert`·포커스 가두기 없음 |
| 4-3 | 상단 맵 제목 바로 아래 드롭다운, 현재 맵 주황 테두리, 아래 화면만 어둡게 표시. `aria-expanded`·Esc 닫기·같은 버튼 재클릭 닫기·맵 선택 후 닫기 |
| 4-4 | 상단 선택 버튼, 방문/보낸 사람 조회 칩, 작은 썸네일·상태 칩 행, 목록 아래 복제 버튼 2개. 선택 모드 밖에도 보이며 선택 0개면 선택 복제 비활성 |
| 4-5 | 큰 장식 아이콘과 검색 도구 제거, 왼쪽 정렬 본문을 빈 영역 중앙에 배치, 전체 폭 등록/DM 안내 버튼 |
| 4-6 | 같은 빈 상태 구조, 개인 장소 복제/공유 맵 등록 버튼과 공개 대상 안내 |
| 4-7 | 검색 입력·전체 폭 보기 전환 아래 왼쪽 정렬 결과 없음·검색 범위 안내·검색어 지우기. 카탈로그 진입은 목업처럼 목록 보기 |
| 4-8 | 상단 맵 헤더 아래 200px 오류 영역·다시 시도, 썸네일 없는 간결한 목록과 원본 버튼 |

**실행 명령과 결과**

모두 workspace-write **샌드박스 안**에서 실행했다. PowerShell의 `node`가 브리프의 `$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`를 가리키는 것을 확인해 Bash PATH 접두사 대신 같은 실행 파일을 직접 사용했다.

| 명령 | 실제 결과 |
| --- | --- |
| `node --version` | exit 0, `v24.19.0` |
| `node --test --test-isolation=none "web/tests/*.test.mjs"` | 수정 후 tests 49 / pass 49 / fail 0 / skipped 0, exit 0. 초기 구조 수정 후 실행한 기존 42개 검사도 통과 |
| `node web/scripts/check-screens.mjs` | exit 0, `17개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과` |
| `grep -rnE "https?://" web/src web/styles web/index.html` | exit 1, Git grep 초기화 오류로 검사 미실행. 오류 첫 줄은 아래에 기록 |
| `ls web/node_modules web/package-lock.json web/pnpm-lock.yaml 2>&1` | exit 1, PowerShell `Get-ChildItem` 별칭의 인수 해석 오류로 검사 미실행. 오류 첫 줄은 아래에 기록 |
| `rg -n "https?://" web/src web/styles web/index.html` | 출력 없음, exit 1(일치 없음). 같은 대상에 외부 URL 없음 |
| `@('web/node_modules', 'web/package-lock.json', 'web/pnpm-lock.yaml', 'web/yarn.lock', 'web/bun.lock', 'web/bun.lockb') \| ForEach-Object { [pscustomobject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ } }` | exit 0, 6개 경로 모두 `Exists=False` |
| `node --input-type=module`에 Node 내장 `fs` 검사 스크립트를 표준 입력으로 전달 | exit 0. `web/package.json`에 dependencies/devDependencies 필드 없음, node_modules·lock 파일 없음, CSS가 참조하는 디자인 토큰 모두 정의됨 |
| `node --input-type=module`에 카탈로그 렌더·파일 검사 스크립트를 표준 입력으로 전달 | exit 0. 17개 렌더 HTML의 태그 열기/닫기 균형, 의존성·lock 부재, CSS 토큰, 변경 13개 파일의 줄 끝 공백 검사 통과 |
| `git diff --check` | exit 0. 추적 파일의 공백 오류 없음. `web/`과 브리프는 작업 시작부터 미추적 상태이므로 이 명령만으로 해당 파일 내용의 검증을 대신하지 않음 |

49개 테스트에는 기존 연결·권한·저장 위치·검색·미확정 핀·이스케이프·정적 서버 검사와 이번 구조 회귀 검사가 포함된다. 키보드 검사는 최소 DOM 어댑터에서 실제 `main.js` 이벤트 핸들러를 실행한 결과이며, 브라우저 검사와 구분한다.

**실행하지 못한 검사와 이유**

- 원래 `grep` 검사는 실행을 시도했으나 샌드박스의 Git 실행 파일 초기화 오류로 미실행이다. 오류 첫 줄(사용자 SID 마스킹):

  ```text
  0 [main] grep (19448) C:\Program Files\Git\usr\bin\grep.exe: *** fatal error - CreateFileMapping [사용자 SID 마스킹], Win32 error 5.  Terminating.
  ```

  같은 대상·정규식의 `rg` 검사로 보완했다. 샌드박스 밖에서 다시 실행하지 않았다.

- 원래 `ls` 검사는 실행을 시도했으나 PowerShell 별칭의 인수 해석 오류로 미실행이다. 오류 첫 줄:

  ```text
  Get-ChildItem : 'web/pnpm-lock.yaml' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다.
  ```

  `Test-Path`와 Node 파일 시스템 검사로 보완했다.

- `node web/scripts/serve.mjs`로 브라우저를 열어 17개 화면을 390×844에서 목업과 나란히 비교하는 검사, 실제 가로 스크롤·클릭·키보드 검사는 미실행이다. 수정 지시가 Claude의 2라운드 리뷰에 배정한 항목으로, 이번에는 시도하지 않았다(오류 첫 줄 없음). 기존 '완료 기준'의 브라우저 항목을 완료로 표시하지 않았다.

- 브리프 필수 검사 외에 시도한 수정 전후 해시 비교는 미실행이다. 수정 전 `$paths \| Get-FileHash -Algorithm SHA256`의 파이프라인 바인딩이 실패해 비교 기준 해시를 수집하지 못했다. 변경 파일 목록은 실제 편집한 경로를 기준으로 보고했고, 해시로 변경 전후를 대조했다고 표시하지 않았다. 오류 첫 줄:

  ```text
  Get-FileHash : 명령에서 파이프라인 입력을 사용하지 않거나 입력 및 해당 속성이 파이프라인 입력을 사용하는 매개 변수 중 하나와 일치하지 않으므로 입력 개체를 명령에 대한 매개 변수에 바인딩할 수 없습니다.
  ```

**브리프와 다르게 한 부분·맞추지 못한 항목과 이유**

- 제품 규칙·순수 로직·구현 범위의 변경은 없다. 1라운드에서 인정된 연결 직후 **4-6 빈 공유 맵** 진입을 유지했다.
- 일부 목업 화면이 생략한 검색·카테고리 도구(4-2·4-4)는 수정 지시의 공통 지도 헤더 요구에 따라 표시한다. 4-3 드롭다운이 열렸을 때와 4-5·4-6 빈 상태·4-8 오류 상태에서는 목업처럼 도구를 숨긴다.
- 목업에 없는 기존 `코드 확인` 버튼(1-7), 받은 코드 입력/코드 상태 링크(1-5), 화면 카탈로그 동선은 브리프의 상호작용을 유지하기 위해 남겼다. 요약 카드와 드롭다운에는 닫기 버튼을 두어 포인터로도 닫을 수 있게 했다.
- 표준 검증 명령은 위 PowerShell 실행 및 대체 검사로 보완했다. 추가 패키지는 설치하지 않았다.
- 목업의 360×740 폰 프레임·보라 점선·기획 주석은 옮기지 않았다. 앱 폭 430px 상한·390×844 기준을 유지했다. 화면별 최종 간격·줄바꿈·가로 스크롤·시각 일치는 브라우저 미검증으로 남아 있으며 Claude의 2라운드 대조가 필요하다.

## 리뷰 기록

(Claude가 작성) 라운드별 판정 APPROVED | WARNING | BLOCKED와 지적 항목.

### 1라운드 — WARNING (2026-10-15, Claude)

**직접 확인한 증거** (샌드박스 밖, Codex 런타임 Node v24.19.0)

- `node --test --test-isolation=none "web/tests/*.test.mjs"`: tests 42 / pass 42 / fail 0, exit 0. 보고와 같다.
- `node web/scripts/check-screens.mjs`: exit 0, `17개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과`.
- `grep -rnE "https?://" web/src web/styles web/index.html`: 출력 없음, exit 1(일치 없음). Codex가 샌드박스에서 못 돌린 원래 검사를 실행했다.
- `ls web/node_modules web/package-lock.json web/pnpm-lock.yaml`: 세 경로 모두 없음. `web/package.json`에 의존성 없음.
- 브라우저(`node web/scripts/serve.mjs`, 390×844): 카탈로그 17개 화면 모두 열림, 가로 스크롤 없음(`scrollWidth ≤ clientWidth`), 콘솔 오류 없음.
- 클릭 흐름: 1-1 로그인 → 4-5, 4-1 함께 쓰기 → 1-5(`[연결 코드]` 표시), 재발급 → 사용 가능, 코드 취소 → 취소됨, 1-7 연결하기 → 1-8 → 나중에 할게요 → 4-6, 4-3에서 개인 맵 전환 후 시트에 상대 개인 맵 없음(개인 4곳·공유 4곳 두 항목만), DM 기본 위치 안내 유지, 잘못된 코드 입력 → 입력하는 쪽 안내. 4-4 하단의 `+ 링크 등록`은 마지막 행을 가리지 않는다.

**구현 경계**: 위반 없음. `visibleMaps`가 본인 개인 맵과 참여 공유 맵만 돌려주고, 맵 액션(`open-place`·`source`·`select-place`)도 현재 맵 접근을 다시 확인한다. `switchMap`은 `dmDefaultTarget`을 바꾸지 않는다. 재발급 시 이전 코드는 superseded가 되고, `confirmConnect`는 재검사 후 빈 공유 맵만 만든다. 로그인 전 코드 입력·연결 화면은 로그인 안내로 막힌다. 미확정 장소는 핀이 없다. 데이터 보간은 `html` 태그 함수로 모두 이스케이프한다. `serve.mjs`는 127.0.0.1에만 바인딩하고 `web/` 밖 경로를 막는다.

**WARNING**

1. `web/src/screens/start/onboarding.js:7-10` — 1-1의 문구를 목업과 다르게 새로 썼다. eyebrow `다음에 가고 싶은 곳을 담아 두세요`와 `⌁` 브랜드 마크를 추가했고, 설명 문단을 `마음에 든 장소를 보내 주세요. 흩어진 링크를 모아 두면…`으로 바꿨다. 근거: 목업 1-1의 설명은 "게시물·릴스를 서비스 계정에 DM으로 보내거나 링크를 붙여 넣으면, 확인할 수 있는 내용에서 장소와 게시물 내용을 정리해 내 맵에 보관해요."이다. 새 문구는 서비스 계정·DM 경로와 '확인할 수 있는 내용에서'(자동 완료를 약속하지 않는 표현)를 빠뜨렸다. 로고는 미정이라 로고처럼 보이는 마크도 넣지 않는다. 브리프가 '설명 문단'이라고만 적은 모호함도 원인이다. 기대: eyebrow와 브랜드 마크를 빼고 설명 문단을 위 목업 문구 그대로 쓴다.
2. `web/src/screens/catalog.js:6-22` — 카탈로그 제목이 목업 제목과 다르다(예: 1-1 `첫 방문 · 서비스 소개` ↔ 목업 `서비스 소개 · 개인 맵 시작`, 1-2 `비공개 임시 접수` ↔ `최초 DM → 웹 연결 · 비공개 임시 접수`, 4-4 `개인·공유 장소 목록` ↔ `목록 · 방문 상태·보낸 사람 조회, 미확정 포함`). 브리프는 "목업 제목 그대로"를 요구했다. 기대: 17개 제목을 아래 목업 제목으로 바꾼다.
   - 1-1 서비스 소개 · 개인 맵 시작 / 1-2 최초 DM → 웹 연결 · 비공개 임시 접수 / 1-3 본인 계정 확인 / 1-4 저장 대상 확인 · 연결 전 / 1-5 함께 쓰기 → 연결 코드 만들기 · 사용자 A / 1-6 코드 상태 · 만료·취소·사용 완료·재발급 / 1-7 코드 입력 → 연결 대상 확인 · 사용자 B / 1-8 연결 완료 · 개인 맵 유지 → 초기 복제 / 1-9 이미 활성 공유 맵에 참여 중
   - 4-1 개인 맵 지도 · 연결 전 / 4-2 공유 맵 · 핀 → 하단 카드 요약 / 4-3 맵 전환 / 4-4 목록 · 방문 상태·보낸 사람 조회, 미확정 포함 / 4-5 개인 맵 빈 상태 / 4-6 공유 맵 빈 상태 / 4-7 검색 결과 없음 / 4-8 지도 로딩 실패 · 목록·원본은 이용 가능

3. **시각 배치가 목업과 다르다** (리뷰 추가, 목업을 로컬로 띄워 390폭 구현 화면과 나란히 비교). 브리프가 문구·동작만 정하고 배치를 정하지 않았고, Codex는 목업 이미지를 보지 못했다. 색·핀·하단 탭·`+ 링크 등록` 버튼의 인상은 비슷하지만 다음 화면 구조가 다르다.
   - 1-1: 목업은 상단 바에 작은 초록 워드마크 `가자함`, 헤드라인과 설명, 테두리 카드 안의 `1 · …` 단계 목록, 회색 안내 상자, 하단 고정 버튼 2개다. 구현은 큰 아이콘·eyebrow·대형 `가자함` 제목·원형 번호 단계·초록 안내 상자다.
   - 4-1·4-2·4-3·4-4 공통: 목업은 검색창이 카테고리 칩 위에 있고 `지도 / 목록`이 전체 폭 분할 버튼이다. 위치 미확정은 주황 칩 `위치 미확정 1곳` + 설명 문구다. 구현은 칩이 검색창 위에 있고, 전환 버튼이 왼쪽에 작게 있으며, 미확정이 전체 폭 띠다.
   - 4-2: 목업은 지도를 어둡게 하지 않는 하단 요약 카드(왼쪽 작은 썸네일 `이미지 없음`, 이름·메타·요약, `자세히` 채움 + `원본` 외곽선 버튼 나란히)다. 구현은 화면을 어둡게 덮는 모달 바텀시트와 큰 이미지 자리다.
   - 4-3: 목업은 헤더 아래로 펼쳐지는 드롭다운 패널(현재 맵 카드는 주황 테두리, 아래 지도는 어둡게)이다. 구현은 바텀시트다.
   - 4-4: 목업은 목록 하단에 `선택해서 복제`·`전체 복제`가 보인다. 구현은 선택 모드에서만 보인다.
   기대: 아래 '수정 지시'의 목업 마크업을 기준으로 위 구조를 맞춘다.

**참고** (수정 여부는 사용자 판단)

- 완료 기준의 `1-8 → 나중에 할게요 → 4-2`는 브리프 오류다. 새 공유 맵은 장소 0곳이므로 Codex가 구현한 4-6 진입이 맞다. 이 차이를 인정한다.
- `web/src/main.js:28` — 모든 화면 하단에 `화면 카탈로그` 링크를 붙였다. 브리프에 없던 개발용 동선이지만 정적 목업에서는 유용하다. 실제 화면에서는 뺀다.
- `web/src/screens/map/screen.js:125` — 시트 안 안내를 `sheet.replace('<div class="stack">', …)` 문자열 치환으로 넣는다. 지금은 동작하지만 시트 마크업이 바뀌면 조용히 깨질 수 있다. `bottomSheet`에 안내를 인자로 넘기는 편이 낫다.
- 브랜치: `codex/UI-01-static-shell-start-map`에 Codex와 무관한 git 절차 커밋 3개(0f7e97e·6b3cbf8·deea44b)가 있다. docs/development/git-workflow.md의 "작업마다 최신 main에서 새 브랜치, 다른 작업을 섞지 않음"에 따르면 이 커밋들은 `claude/<slug>` 브랜치로 분리해야 한다. 단계 8의 workflow 문구가 이 커밋에 들어가 있어 UI-01 diff에는 없다.

**수정 지시 (2라운드 입력, Codex용)**

- 목업 기준 마크업: `tmp/mockup/4.1-start-connect.html`, `tmp/mockup/4.4-map-list.html`. 목업 보드 '4.1 시작·연결'·'4.4 개인·공유 지도와 목록'의 정적 HTML·CSS다(웹 폰트 정의와 번들 스크립트만 제거, Git 제외 경로). 각 화면은 `.col` 열 하나이고, 그 안의 `.ph`(360×740 폰 프레임)가 실제 화면이다. 화면 ID는 `.lbl .n`에 있다.
- 읽기만 한다. `tmp/mockup/`을 수정하거나 `web/`으로 복사하지 않는다. 마크업을 그대로 붙여 넣지 말고, 배치·간격·크기·모서리·테두리·색을 기존 `web/` 구조(화면 함수, `components/`, `tokens.css`·`base.css`)로 옮긴다. 목업에서 쓰는 색 중 `tokens.css`에 없는 값이 필요하면 변수로 추가한다.
- 무시할 것: `.ann`(보라 점선 주석 상자)와 `.k` 라벨은 그리지 않는다. `.ph2`(보라 점선 자리표시 표기, 예: `[연결 코드]`)는 글자만 쓰고 보라 점선 스타일은 따르지 않는다. 폰 프레임 자체(`.ph`의 테두리·둥근 모서리)는 앱 화면에 넣지 않는다.
- WARNING 1: 1-1을 `.ph` 마크업대로 만든다(상단 바의 워드마크, 헤드라인, 설명 문단 원문, 단계 카드, 회색 안내, 하단 버튼). eyebrow·브랜드 마크를 지운다.
- WARNING 2: `catalog.js`의 17개 제목을 위 목록의 목업 제목으로 바꾼다.
- WARNING 3: 1-1~1-9와 4-1~4-8을 마크업과 대조해 구조를 맞춘다. 최소한 위 WARNING 3의 항목(지도 헤더 순서·전체 폭 지도/목록 전환·미확정 칩, 4-2 비모달 하단 요약 카드, 4-3 헤더 아래 드롭다운 패널, 4-4 하단 복제 버튼)은 반드시 맞춘다. 4-4의 하단 버튼은 선택 모드가 아닐 때도 보이며, `선택해서 복제`는 선택한 장소가 없으면 비활성이다.
- 접근성 유지: 4-2 요약 카드는 비모달이므로 `aria-modal`·`inert`·포커스 가두기를 쓰지 않는다. 4-3 드롭다운은 `aria-expanded`를 유지하고 Esc로 닫힌다.
- 기존 '하지 말 것'과 제품 규칙·테스트는 그대로다. 구조가 바뀐 화면은 `screens.test.mjs`의 대표 문구 검사를 갱신하고, 비모달 카드·드롭다운의 열기/닫기 테스트를 추가한다.
- 검증: 브리프 '검증 명령' 전체. 브라우저 대조는 Claude가 2라운드 리뷰에서 한다.
- 보고: 'Codex 구현 보고' 아래에 `### 2라운드` 소절을 추가해 변경 파일·명령 결과·화면별로 맞춘 항목·맞추지 못한 항목과 이유를 적는다. 1라운드 보고는 지우지 않는다.

### 2라운드 — APPROVED (2026-10-15, Claude)

**직접 확인한 증거** (샌드박스 밖, Codex 런타임 Node v24.19.0)

- `node --test --test-isolation=none "web/tests/*.test.mjs"`: tests 49 / pass 49 / fail 0. 보고와 같다.
- `node web/scripts/check-screens.mjs`: exit 0, 17개 화면 정합 통과.
- `grep -rnE "https?://" web/src web/styles web/index.html`: 출력 없음(exit 1, 일치 없음). `web/node_modules`·lock 파일 없음.
- 브라우저 390×844, DOM 측정: 17개 화면 모두 가로 스크롤 없음, 콘솔 오류 없음.
  - W1: 1-1에 상단 워드마크 `가자함`, 목업 설명 원문, `ol.steps.card`, 하단 버튼 2개가 있다. eyebrow·브랜드 마크 없음.
  - W2: 카탈로그 17개 제목이 목업 제목과 일치한다.
  - W3: 4-1 검색창(top 64)이 칩(top 114) 위, 지도/목록 전환 폭 366px(전체 폭), 미확정은 `status-chip warn` 칩 + 설명. 4-2 `place-summary` 카드는 `aria-modal`·`inert`·스크림 없이 하단에 있고 `자세히`·`원본`이 나란하다. 4-3 `map-dropdown`이 헤더 바로 아래(top 54), `aria-expanded="true"`. 4-4는 선택 모드 밖에서도 `선택해서 복제`(선택 0개면 비활성)·`전체 복제`가 보인다.
- 클릭 흐름: 1-1 로그인 → 4-5, 4-1 함께 쓰기 → 1-5 재발급·코드 취소, 1-7 연결하기 → 1-8 → 나중에 할게요 → 4-6, 4-1 핀 → 요약 카드 → Esc로 닫힘, 4-3 개인 맵 선택 → 드롭다운 닫힘·제목 전환, 4-4 선택 후 `선택해서 복제` 활성.

**미실행**: 목업과 구현 화면의 스크린샷 시각 대조. 앱 창이 가려져 브라우저 캡처가 계속 시간 초과됐다. 위 구조 항목은 DOM 측정으로 확인했고, 간격·크기 같은 픽셀 단위 인상은 확인하지 못했다. 사용자가 `#/catalog`에서 눈으로 확인하는 것을 권한다.

**구현 경계**: 순수 로직·제품 규칙 변경 없음. 49개 테스트에 1라운드의 경계 검사(상대 개인 맵 비노출, 맵 전환과 DM 기본 위치 분리, 코드 재발급 무효, 활성 공유 맵 자동 교체 금지, 미확정 핀 없음, 이스케이프)가 그대로 있다.

**참고**

- 새 파일 `web/src/screens/start/layout.js`는 브리프가 허용한 `web/src/screens/` 안이다.
- 1-7 `코드 확인`, 1-5 `받은 코드 입력`·`코드 상태 보기`, 요약 카드·드롭다운의 닫기 버튼은 목업에 없지만 상호작용 유지를 위해 둔 것으로 타당하다.
- 작업 공간: 수정 라운드 중 체크아웃이 `claude/git-workflow`로 바뀌었고, `codex/UI-01-static-shell-start-map`은 main과 같은 커밋이다. UI-01 변경(`web/`, 이 브리프, `docs/decisions/`, `AGENTS.md`·`docs/development/claude-codex-workflow.md` 수정)은 미커밋 상태로 공유 작업 공간에 있다. 커밋 전에 `codex/UI-01-static-shell-start-map`으로 옮겨야 한다.
