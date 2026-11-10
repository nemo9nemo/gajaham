# WEB-04 · 사용자 확인 분리와 출시 검증 자동화

- 상태: IN_REVIEW · 2026-11-10 사용자 “남은 항목과 지금 반드시 확인할 항목 정리, 나머지는 전부 수행”
- 브랜치: 기존 codex/WEB-03-release-preparation에서 출시 준비를 이어간다. 승인24541a5 기준, 통합 PR #3을 유지하고 추가 이력 PR은 만들지 않는다.

## 목표·범위

1. 사용자 할 일을 **지금: PR 검토/병합·소유 계정 접근·공개 운영자/문의처 확정**, **연결 후: 실제 메일/실기기 확인**으로 분리한다. 프로젝트/DB/인증/secret/배포 설정과 검사는 Codex 담당으로 남긴다. 실제 처리방침은 Codex가 문안을 준비하고 운영자는 사실/공개 정보만 확인한다.
2. 공개 저장소의 무료 표준 ubuntu-24.04 runner에 read-only GitHub Actions 검사를 추가한다. production 계정/secret·배포·artifact/cache 업로드·유료 실행기는 사용하지 않는다. 비공개 전환 시 작업을 건너뛴다. 공식 action의 확인한 SHA를 고정한다.
3. 출시 번들의 파일 hash·누락/추가·중복/경로 탈출·symlink·비밀/개발 자료·Hosting/Worker 구성 일치를 읽기 전용으로 검사한다. 무결성 확인이 출처 인증/운영 승인/실제 무료 CPU 통과를 보장하지 않는다는 경계를 유지한다.

## 하지 말 것

main 병합·계정 로그인/약관 대행·운영정보 임의 기입·카드/유료 서비스·운영 리소스/키 생성·공개 배포를 하지 않는다. 지도/공유/DM/광고 범위를 늘리지 않는다. 사용자 .claude/launch.json은 보존한다. 비밀·이메일·토큰·개인 기록을 로그나 원격 검사에 사용하지 않는다.

## 검증

기존 Vite/Firebase·Wrangler/Miniflare/jose·Node22 스택과 lockfile 유지, 새 런타임 패키지 없음. node app-web/scripts/check.mjs(기존27개+무결성 실패 경로), npm audit app-web/worker 및 개발 CLI high 검사. Actions YAML 구문/권한과 실제 원격 실행을 확인한다. 원격 결과는 실제 실행 완료 후만 PASS로 기록한다. 문서 링크·staged 공백·독립 구현 리뷰→로컬 커밋→고정 SHA worktree 리뷰 후 기존 PR #3에만 push·원격 PR 리뷰한다.

## Codex 구현 보고

- 지금/연결 후 사용자 확인을 USER-NEXT-STEPS에 분리하고 README·체크리스트·운영 문서를 연결했다. 기술 설정/JSON/개인정보 초안은 Codex 담당이며 사용자는 계정 소유권·공개 정보·메일/기기 확인만 맡는다.
- Web checks workflow: 공개 저장소 조건·표준 ubuntu-24.04·contents:read·자격증명 비영속·고정 공식 action SHA·Node22·npm ci --ignore-scripts·캐시/업로드/배포 없음·시간상한/concurrency를 적용했다. 실제 공개 저장소/Actions 활성/기존 CLI workflow 범위를 읽기 전용 확인했으며 청구 설정을 바꾸지 않았다.
- verify-release는 원래 manifest hash 선택 대조·파일 전체 목록/hash·변조/누락/추가·중복·경로 탈출/symlink·PEM/개발자료·Hosting/Worker 구성 검사를 수행한다. prepare가 생성 직후 자동 검사하고 CLI는 보관할 manifest hash를 출력한다. 출처 인증·무료 운영/배포 승인을 보장하지 않는다.
- 로컬: 전체27개·production2HTML/보안 헤더 설정·Emulator 제외·Worker dry-run PASS. 변조/다른프로젝트/목록공격·추가/누락/원복 시나리오를 출시 검사에 추가했다. 실제 CLI에서13파일/hash 대조 PASS·operatingChecksPassed=false 유지. YAML 구문/권한/실행기·단계 파싱 PASS. 새 패키지 없음.
- 취약점: app-web/worker audit 각0. 개발 Emulator CLI high 이상 검사 exit0, moderate14는 기존 로컬/가상/고정명령 격리 유지. 문서10개 상대 링크60개·공백 검사 PASS.
- 연결 현황: 운영 공개 설정/연결 파일 없음. 이메일/토큰을 출력하지 않은 공식 Firebase CLI 계정수0, Cloudflare whoami 상태false 확인. 실제 소유 계정/무료·결제 미연결/운영정보·secret/CPU/실메일/Galaxy·공개 배포는 미실행이다.
- 원격 자동검사는 승인된 SHA push 뒤 실제 Actions 결과를 확인한다. 최종 실제 run URL/결과는 PR 리뷰/실행 보고에 기록하며 로컬 성공을 원격 PASS로 대신하지 않는다.

## 리뷰 기록

별도 읽기 전용 Codex web00_implementation_review가 workflow 권한/무료 조건·고정 SHA·무결성 검사·사용자 확인 분리를 대조해 APPROVED를 반환했다. 결과는 tmp/codex/WEB-04-implementation-review.md다. 커밋 뒤 별도 worktree에서 정확한 SHA를 main 대비 재리뷰하고 승인 장부를 따른다.
