---
name: codex-review
description: 작업 브랜치의 커밋을 push 전에 Codex CLI(codex exec review)로 main 대비 코드 리뷰한다.
argument-hint: [브랜치, 기본 현재 브랜치]
---

# push 전 Codex 코드 리뷰

대상 브랜치: $ARGUMENTS (비어 있으면 현재 브랜치)

1. 대상이 main이 아닌 작업 브랜치인지 확인한다. 리뷰는 커밋된 변경만 대상으로 한다. 같은 폴더에서 다른 작업의 미커밋 변경이 섞이지 않도록 별도 worktree에서 실행한다.

   ```bash
   W="tmp/codex/wt-<브랜치의 /를 -로>"
   git worktree add --detach "$W" <브랜치>
   ```

2. Codex 리뷰를 백그라운드로 실행한다(run_in_background).

   ```bash
   R="$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies"
   PATH="$R/node/bin:$R/bin/fallback:$PATH" codex exec -C "$W" review --base main -c windows.sandbox='"unelevated"' -c mcp_servers.node_repl.enabled=false -o "tmp/codex/review-<브랜치의 /를 -로>-r<라운드>.md"
   ```

   끝나면 `git worktree remove "$W"`로 정리한다.
3. 결과 파일을 읽고 지적마다 실제 코드를 확인해 타당한지 판단한다. Codex 지적을 그대로 옮기지 않는다.
4. 사용자에게 지적(파일:줄, 문제, 판단)과 수정 제안을 보여준다.
   - 수정이 필요하면 브리프 작업은 `/codex-implement <브리프> fix`로, 작은 수정은 직접 고친다. 같은 브랜치에 커밋한 뒤 다시 리뷰한다(최대 3라운드).
   - 타당한 지적이 없거나 모두 해소되면 브랜치 마지막 커밋에 대해 리뷰를 통과한 것으로 보고 `tmp/codex/reviewed.txt`에 `<브랜치> <커밋 SHA>` 한 줄을 추가한다. 이 브랜치는 'push 대기'다. push는 사용자가 요청할 때 `/ship`으로 모아서 한다.
5. 브리프 작업이면 브리프 '리뷰 기록'에 Codex 리뷰 라운드와 결과 파일 경로를 적는다.
