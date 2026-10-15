# 브랜치·커밋·PR 절차

기준일: 2026-10-15 / 출처: 사용자 요청

원격은 [nemo9nemo/gajaham](https://github.com/nemo9nemo/gajaham)(공개), 기본 브랜치는 `main`이다. `main`에 직접 커밋하지 않고 작업 브랜치에서 커밋한 뒤 PR로 합친다. 첫 커밋만 저장소 기준점으로 `main`에 있다.

## 전체 흐름

| 단계 | 담당 | 실행 |
| --- | --- | --- |
| 1. 작업 브랜치 생성 | Claude | 최신 `main`에서 작업 단위 브랜치 |
| 2. 작업·커밋 | Codex 또는 Claude | 브리프 작업은 `/codex-implement` → `/review-impl` 후 커밋 |
| 3. push 전 코드 리뷰 | Codex | `/codex-review` (`codex exec review --base main`) |
| 4. push·PR 등록 | Claude | 사용자 요청 시 `/ship`으로 모아서 |
| 5. PR 코드 리뷰 | Codex | `/ship`이 PR마다 `codex exec review` 실행 후 PR 코멘트 |
| 6. 병합 | 사용자 | 리뷰 확인 후 |

3·5단계의 지적은 Claude가 실제 코드로 타당성을 확인한 뒤 같은 브랜치에서 수정·커밋한다. 수정분은 다음 `/ship` 때 push된다.

## 브랜치

작업마다 최신 `main`에서 새 브랜치를 만든다. 이전 작업 브랜치에서 갈라지지 않는다.

| 작업 | 브랜치 이름 |
| --- | --- |
| Codex 구현(브리프) | `codex/<작업ID>-<slug>` |
| Claude 직접 수정·문서·설정 | `claude/<slug>` |

## 커밋

검증한 변경만 기능 단위로 커밋한다. 서로 다른 작업을 한 커밋에 섞지 않는다. 비밀·빌드 결과·`tmp/`·로컬 데이터는 제외한다. 브리프 작업은 리뷰 기록이 APPROVED가 된 뒤 커밋한다.

```text
<type>(<scope>): <목적이 드러나는 제목>

작업: 무엇을 바꿨는지
이유: 왜 바꿨는지
검증: 실제 실행한 검사와 결과(실행하지 않은 검사는 미실행으로)
참조: 브리프·기획 문서 절
```

type은 feat·fix·chore·docs·test·refactor 중 하나다. 커밋 메시지와 PR 본문에 `Co-Authored-By: Claude`, `Generated with Claude Code` 같은 서명 줄을 넣지 않는다(`.claude/settings.json`의 `attribution`을 빈 값으로 둠).

## 푸시와 PR

커밋은 로컬에만 쌓고, push는 사용자가 요청할 때 `/ship`으로 모아서 한다.

1. `git fetch origin`으로 원격 `main`을 확인한다. 원격에 다른 변경이 있으면 내용을 보고 브랜치를 최신 `main` 위로 맞춘다. 강제 push로 덮어쓰지 않는다.
2. push 대기 작업 브랜치를 `git push -u origin <브랜치>`로 올린다.
3. 브랜치마다 `main` 대상 PR을 `gh pr create`로 만든다. 본문에 작업·이유·검증·참조, 브리프 링크, push 전 Codex 리뷰 요약을 적는다.
4. PR마다 Codex 리뷰를 실행해 타당한 지적을 PR 코멘트로 남긴다.
5. PR 주소와 리뷰 결과를 사용자에게 보여준다. 병합은 사용자가 확인한 뒤 한다.

원격 저장소가 비어 있는 첫 push에서는 기준점인 `main`을 먼저 올린 뒤(`git push -u origin main`) 작업 브랜치와 PR을 올린다.
