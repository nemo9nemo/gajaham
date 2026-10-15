---
name: ship
description: push 전 Codex 리뷰를 마친 로컬 작업 브랜치를 모아 push하고 main 대상 PR을 만든(또는 기존 PR을 갱신한) 뒤, PR마다 Codex 코드 리뷰를 돌려 PR 코멘트로 남긴다. 사용자가 push·PR을 요청할 때만 사용한다.
argument-hint: "[브랜치 ...] (비우면 push 대기 브랜치 전체)"
disable-model-invocation: true
---

# push·PR 등록과 PR Codex 리뷰

대상: $ARGUMENTS

1. `git fetch origin` 후 대상 브랜치를 정한다. 인자가 없으면 원격에 없거나 원격보다 앞선 로컬 작업 브랜치(`codex/*`, `claude/*`)가 후보다.
   - 이미 `origin/main`에 들어간 브랜치(`git merge-base --is-ancestor <브랜치> origin/main`)와 병합된 PR이 있는 브랜치(`gh pr list --head <브랜치> --state merged`)는 제외한다.
   - 브랜치의 현재 HEAD가 `tmp/codex/reviewed.txt`에 있는 브랜치만 push한다. 없거나 리뷰 후 커밋이 더 생긴 브랜치는 제외하고 `/codex-review`가 먼저 필요하다고 알린다.
   - push할 브랜치마다 `reviewed.txt`의 통과 SHA를 확정한다. 이후 단계는 브랜치 이름이 아니라 이 SHA를 쓴다. push할 목록(브랜치·SHA)과 제외한 목록을 사용자에게 보여준다.
2. 원격 저장소가 비어 있으면 기준점 `main`을 먼저 `git push -u origin main`으로 올린다. 원격 main이 로컬 main보다 앞서 있으면 로컬 main을 fast-forward하고, 대상 브랜치가 그 위에 없으면 사용자에게 알린다. 강제 push는 하지 않는다.
3. 브랜치마다:
   1. `git push origin <SHA>:refs/heads/<브랜치>`로 통과한 커밋만 올린다(그 사이 브랜치에 생긴 새 커밋은 올라가지 않는다). 처음 올리는 브랜치는 `git branch --set-upstream-to=origin/<브랜치> <브랜치>`로 업스트림을 맞춘다.
   2. `gh pr view <브랜치> --json number,url,state`로 열린 PR이 있는지 본다. 있으면 그 번호를 쓰고, 없을 때만 `gh pr create --base main --head <브랜치> --title "<커밋 제목>" --body-file <본문 파일>`로 만든다. 본문은 작업·이유·검증·참조, 브리프 링크, push 전 Codex 리뷰 요약이다. Claude 서명 줄은 넣지 않는다.
   3. 체크아웃을 바꾸지 않도록 별도 worktree에서, push한 SHA로 Codex 리뷰를 실행한다(run_in_background).

      ```bash
      SHA=<SHA>; N=<PR 번호>; W="tmp/codex/wt-pr-$N"
      if git worktree add --detach "$W" "$SHA"; then
        R="$USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies"
        PATH="$R/node/bin:$R/bin/fallback:$PATH" codex exec -C "$W" review --base origin/main -c windows.sandbox='"unelevated"' -c mcp_servers.node_repl.enabled=false -o "tmp/codex/pr-$N-${SHA:0:7}-review.md"
        echo "exit=$?"; git worktree remove --force "$W"
      else
        echo "worktree 생성 실패: $W 가 이미 있으면 진행 중이거나 남은 리뷰인지 확인한다"
      fi
      ```

      셸 변수는 Bash 호출 사이에 남지 않으므로 위 블록은 하나의 Bash 호출로 실행한다.

   4. 결과를 확인해 타당한 지적만 정리하고 `gh pr comment <번호> --body-file <파일>`로 "Codex 리뷰 (<커밋 SHA 앞 7자>)" 코멘트를 남긴다.
4. PR 주소와 PR별 리뷰 결과를 사용자에게 보여준다. 수정이 필요하면 같은 브랜치에 커밋하고 `/codex-review`를 거쳐 다음 `/ship` 때 push한다(같은 PR에 반영된다). 병합은 사용자가 확인한 뒤 한다.
