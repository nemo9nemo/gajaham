# Codex 기획·구현·검증·리뷰 절차

기준일: 2026-10-19 / 출처: 사용자 요청 “앞으로 클로드 사용하지 않을거야. 스스로 전부 마무리 해.”

Codex가 기획·설계·구현·검증·리뷰·로컬 커밋을 맡는다. Claude 호출이나 승인은 작업 조건이 아니다. [AGENTS.md](../../AGENTS.md)와 [결정 0002](../decisions/0002-codex-only-workflow.md)를 따른다. 기존 브리프와 `.claude/skills/`의 Claude 담당 절차는 현재 절차로 대체하고, 과거 작성자·검사 결과·판정은 이력으로 보존한다.

## 작업 순서

1. 요청과 관련 기획·정책·설계·검증 시나리오, 현재 브랜치·변경을 확인한다. 관련 없는 사용자 변경은 보존한다.
2. 기능 작업은 [브리프 양식](../templates/implementation-brief.md)으로 범위·하지 말 것·검증 명령을 정한다. 명시적인 구현 요청은 그 범위의 작업 권한으로 취급한다. 새 제품 범위나 중대한 선택이 불명확할 때만 묻고, 승인된 작업의 통상적인 구현·검사·로컬 커밋은 계속 진행한다.
3. 최신 로컬 `main`에서 `codex/<작업ID>-<slug>` 브랜치를 만들거나 해당 작업 브랜치를 이어 쓴다. 다른 작업 브랜치에서 새 작업을 갈라 만들지 않는다. 사용자가 명시적으로 추가한 관련 절차 변경은 파일·커밋 단위로 구분한다.
4. 요구 → 정책 → 설계·계약 → 검증 시나리오 → 구현 → 검사 증거 순서로 관련 파일을 함께 갱신한다. 브리프 범위를 지키며 사용자가 바꾼 요구는 브리프에도 반영한다.
5. 관련 검사를 실행하고 브리프의 `Codex 구현 보고`에 변경 파일·명령·결과·미실행 검사와 이유를 쓴다. 샌드박스 때문에 검사가 막히면 허용된 대체 검사나 승인된 제한 밖 실행으로 보완하고 실제 결과를 구분한다.
6. 별도 읽기 전용 Codex 세션으로 구현 diff를 리뷰한다. 지적의 타당성을 코드·재현으로 확인하고 수정·검증한다. 지적이 없거나 모두 해소되면 근거를 브리프의 `리뷰 기록`에 남기고 APPROVED로 판정한다. 리뷰·수정은 한 주기에서 최대 3라운드로 하고, 남은 문제가 범위·설계 변경을 요구하면 이를 정리한다. 승인되지 않은 새 범위는 구현하지 않는다.
7. 검증된 변경을 로컬 작업 브랜치에 기능 단위로 커밋한다. 구현·검증·구현 리뷰가 완료된 브리프는 DONE으로 표시하고, 아직 실행하지 않은 검사나 원격 전달 상태는 별도로 적는다. 커밋된 SHA를 고정해 별도 worktree에서 `main` 대비 전체 브랜치 리뷰를 실행한다.
8. 리뷰 결과를 확인해 통과한 정확한 SHA만 `tmp/codex/reviewed.txt`에 `<브랜치> <SHA>` 형식으로 기록한다. 지적을 수정해 새 커밋이 생기면 새 SHA를 다시 리뷰한다. 통과 뒤 추적 파일은 수정하지 않는다. 결과·장부는 Git에서 제외된 `tmp/codex/`에 남긴다.
9. 사용자에게 변경·실행한 검사·리뷰·로컬 커밋·남은 제한을 보고한다. push·PR은 사용자가 요청할 때 [Git 절차](git-workflow.md)에 따라 진행한다. 병합은 사용자가 확인한 뒤 한다.

## 검사와 리뷰 실행

정적 목업은 의존성 없는 HTML·CSS·ES 모듈, Codex 런타임 Node v24를 사용한다. 새 서비스 스택은 별도 결정 전까지 도입하지 않는다.

- 전체 검사: `node --test --test-isolation=none "web/tests/*.test.mjs"`
- 화면 정합: `node web/scripts/check-screens.mjs`
- 미리보기: `node web/scripts/serve.mjs` → `http://localhost:5173/#/catalog` (390×844)

앱 밖에서 Node를 실행할 때는 `C:/Users/love0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`를 쓰거나 그 디렉터리를 해당 프로세스의 PATH 앞에 둔다. 화면·스타일 수정은 브라우저에서 확인하고, Node 렌더 검사와 실제 브라우저 검사를 구분한다.

미커밋 구현 리뷰 예시:

```text
codex exec -s read-only --ephemeral -c windows.sandbox=unelevated -c mcp_servers.node_repl.enabled=false -o tmp/codex/<작업ID>-implementation-review.md review --uncommitted
```

리뷰 세션은 구현·커밋·다른 리뷰어 호출을 하지 않고 근거와 지적을 반환한다. 실제 실행한 검사만 보고하며, 별도 세션이 같은 Codex 모델을 쓰더라도 구현 세션과 리뷰 결과를 구분한다.

커밋 후에는 `git worktree add --detach tmp/codex/wt-<작업ID>-<SHA7> <SHA>`로 해당 커밋만 체크아웃한 뒤 다음 명령을 실행한다. 출력 경로는 원래 작업 폴더의 `tmp/codex/` 절대 경로를 사용한다.

```text
codex exec -C <worktree의 절대 경로> -s read-only --ephemeral -c windows.sandbox=unelevated -c mcp_servers.node_repl.enabled=false -o <리뷰 결과 절대 경로> review --base main
```

리뷰 후 worktree에 추적 파일 변경이 없는지 확인하고 자신이 만든 정확한 경로만 정리한다. 다른 작업 공간의 변경을 강제 삭제하지 않는다. 저장소 외부에 대한 `danger-full-access`나 권한 우회 옵션은 사용하지 않는다.

## 완료의 의미

브리프의 상태와 리뷰 APPROVED는 실제 기능·검사의 근거와 함께 해석한다. 정적 목업 완성을 실제 로그인·DM·DB 연동 완료로 표시하지 않는다. 브라우저 미실행, 원격 미반영, 리뷰 대기 등 남은 상태를 숨기지 않는다. 커밋 후 리뷰 결과는 장부와 결과 파일로 관리하므로 이를 브리프에 덧붙이려고 통과한 커밋을 변경하지 않는다.
