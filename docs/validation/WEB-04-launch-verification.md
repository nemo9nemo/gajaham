# WEB-04 · 출시 검증 자동화 증거

2026-11-10. [브리프](../plans/WEB-04-launch-verification.md)·[사용자 지금/나중 확인](../release/USER-NEXT-STEPS.md). 같은 통합 PR #3을 유지하며 이전 브랜치 PR을 추가하지 않는다.

## 로컬 검사

- Node22.23.4의 node app-web/scripts/check.mjs: 단위/출시9·JWT/D1/API/운영 SQL9·독립 Chromium9, 합계27 PASS. production 두 HTML/보안 헤더 설정·Emulator 제외·Worker dry-run PASS.
- 출시 검사에는 정상 생성/파일 hash에 더해 Worker 변경·잘못된 manifest hash·경로 탈출·중복 목록·추가 파일·누락 HTML·hash를 다시 맞춘 다른 프로젝트 구성 거절과 원복 후 정상 통과가 포함된다. 운영 정보/비밀/실데이터는 사용하지 않았다.
- 기존 yaml 라이브러리로 Actions 구문 파싱: pull_request/push, contents:read, ubuntu-24.04, public-only 조건·7단계 확인. 새 패키지는 추가하지 않았다.
- GitHub 공식 API에서 public 저장소·Actions 사용 가능·CLI workflow 범위를 확인했다. 인증 토큰/이메일은 출력하지 않았다. release.config.local.json/.firebaserc/운영 .env/Worker dev secret 연결 파일은 부재 상태다. 계정명/이메일/토큰을 출력하지 않고 Firebase CLI 계정수0·Cloudflare CLI 미인증 상태를 확인했다. Cloudflare 디스크 로그도 비활성화했다.

## 원격 자동검사의 범위와 결과 판정

최초 실제 원격 검사 [run42770131814](https://github.com/nemo9nemo/gajaham/actions/runs/42770131814)는 head fffbf96bbdb2b13c29050f09d2939c6d0cc30921, pull_request 이벤트에서 **success**다. 2026-11-10 GitHub API로 전체27개를 실행하는 단계·웹/서버 audit·개발 CLI high 기준·모든 작업/post 단계 성공을 확인했다. 같은 SHA의 push run42770130612는 concurrency에 의해 cancelled됐으며 PASS로 세지 않았다. 문서 후속 커밋의 결과는 각 최종 PR Checks를 따른다.

[Web checks](https://github.com/nemo9nemo/gajaham/actions/workflows/web-checks.yml)는 현재 공개 저장소의 표준 ubuntu-24.04에서 합성 데이터로 위 흐름과 audit를 실행한다. production 계정/secret·배포·artifact/cache 업로드·유료 실행기는 사용하지 않는다. 비공개/내부 저장소는 job 조건으로 건너뛴다. PR/push 중복 이벤트는 같은 소스/브랜치 기준 concurrency로 이전 실행을 취소한다. 취소된 이전 실행을 성공으로 보고하지 않는다.

공식 action은 조회한 checkout v6 d23441a48e516b6c34aea4fa41551a30e30af803 및 setup-node v6 249970729cb0ef3589644e2896645e5dc5ba9c38로 고정했다. credentials 비영속·contents 읽기만 허용한다. 실행 시간20분 상한, npm lifecycle scripts 비활성화, Chromium 설치, 원격 서비스 변경 없는 Emulator/로컬D1/dry-run 검사를 사용한다.

원격 PASS는 **PR Checks/해당 Actions 실제 run의 완료 결과**로만 판정한다. 이 문서의 로컬 PASS나 YAML 구문 확인을 원격 실행 완료로 대신하지 않는다. 실제 run URL/정확한 head·결과는 PR 리뷰와 실행 보고에 기록한다. GitHub run은 에뮬레이션 검증이며 실제 Free Workers CPU10ms·운영 Auth/App Check·메일·Galaxy·공개 배포 통과 증거가 아니다.

웹앱/Worker audit는 경고 발생 시 실패하도록 설정했다. 기존 개발 Emulator CLI의 moderate14와 운영 번들 제외/localhost 격리는 WEB-03 기록을 유지하며 CI는 high 이상을 실패시킨다. 실제 registry 결과가 변하면 해당 run 결과를 확인한다.

근거: [공개 저장소 표준 runner의 무료 조건](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [표준 runner 목록](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job). artifact/cache 저장 과금과 표준 runner 사용을 혼동하지 않도록 업로드·캐시를 추가하지 않았다. 계정 청구/저장소 설정을 바꾸지 않았다.

## 배포 파일 검사 한계

verify-release는 읽기 전용이다. 생성 때 보관한 manifest SHA256과 대조할 수 있고 전체 파일 목록·hash·구성/경로/민감 자료를 확인한다. manifest와 파일을 함께 바꿀 수 있는 공격자를 인증하지 않으며, 원본 코드 검토·별도 보관 hash가 필요하다. 검사 후 파일이 바뀌면 다시 검사한다. 검사 성공은 BUILT_NOT_DEPLOYED·operatingChecksPassed=false를 유지한다.

사용자 소유 계정/공개 운영정보/실제 문의처가 없으므로 실제 운영 리소스·secret·실메일·Galaxy·공개 배포는 미실행이다. 사용자에게 JSON/법적 문안을 직접 작성하도록 넘기지 않는다. Codex가 실제 설정/제공자 자료에 맞게 문안을 준비하고 운영자는 사실과 공개 내용을 확인한다.
