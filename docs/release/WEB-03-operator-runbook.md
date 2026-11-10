# 결제 연결 없는 개인 웹앱 · 배포/운영 절차

2026-11-10. [WEB-03](../plans/WEB-03-release-preparation.md)·[결정0010](../decisions/0010-no-billing-web-backend.md) 기준이다. 아래 원격 명령은 실행하지 않았다. 도메인/서버 구매·카드·Blaze·Workers Paid를 사용하지 않는다. 사용자 파일 복구 기능을 추가하지 않는다.

## 사용자 확인과 이후 Codex 작업

| 항목 | 사용자 확인이 필요한 부분 | 이후 Codex가 진행할 부분 |
|---|---|---|
| 소유 계정 | Google/Cloudflare 로그인·본인 인증·약관, Spark/Workers Free·Cloud Billing/유료 구독/결제 미연결 확인 | 소유 프로젝트 연결·무료 D1 생성/설정·기본 URL 연결 |
| 운영 정보 | 실제 공개 운영자/문의 담당 표시명·문의 이메일/URL·시행일·실제 처리 안내 확정 | 개인정보 문안 반영·설정 교차 검사·출시 번들 생성 |
| 비밀 관리 | 운영자 계정의 비밀 등록/보관 접근 권한 | 최소권한 Auth 조회/삭제용 서비스 계정·secret 연결과 회수/교체 확인. 비밀을 채팅/파일로 받지 않음 |
| 메일 | 소유 테스트 메일함 확인/확인 링크 이용 | 가입·재설정·열거 보호·Auth/App Check·실제 REST 인가 확인 |
| Galaxy | Samsung Internet/Chrome에서 기기 조작·관찰 협조 | 같은 계정 기록·수정 충돌·삭제·화면/네트워크 검사 기록 |

실제 소유 계정/프로젝트/배포 주소/관리 자격증명이 현재 없다. 이를 대신 만들어 채우지 않았다. 준비한 공개 처리 안내가 실제 계정·제공자 처리와 일치하는지는 운영 전 확정한다. 계정 연결 후 가능한 설정·자동 검사는 Codex가 수행하며 표 전체를 사용자 수동 작업으로 넘기지 않는다.

## 공개 설정을 한 번 입력

이 절의 파일 입력과 명령은 Codex가 처리합니다. 사용자는 운영에 쓸 계정과 공개 운영자/문의처를 정하고 실제 처리 안내를 확인합니다. 계정 권한을 사용할 수 있게 된 뒤 Codex가 공개 설정과 제공자/국외 처리 문안을 준비하며 비밀을 채팅으로 받지 않습니다.

release.config.example.json을 Git 제외 release.config.local.json으로 복사한다. 이 파일에는 **공개 설정만** 입력한다. 비밀번호·서비스 계정 JSON·private key·OAuth/CLI 토큰·App Check debug token을 넣지 않는다.

Firebase의 공개 웹 설정(apiKey/projectId/authDomain/appId/appCheckKey), 프로젝트 번호(projectNumber), 기본 웹 주소(origin), 기본 Worker 주소(apiOrigin/workerName), D1 연결 정보(databaseName/databaseId), 공개 운영 정보(contact/operatorName/policyDate/processingNotice)를 사용한다. processingNotice에는 확정한 제공자별 처리 국가/수탁 업무·국외 이전 근거/시점/방법·보존/거부 방법을 실제 흐름에 맞춰 작성한다. privacyReviewed는 해당 안내를 운영자가 확인한 뒤에만 true로 바꾼다. 형식 검사는 법적 적정성·실제 플랜·계정 소유권 확인을 대신하지 않는다.

```powershell
node app-web/scripts/prepare-release.mjs release.config.local.json
```

검사 통과 시 tmp/release/고유폴더에 다음 **미배포** 자료를 만든다. 입력이 미완성이면 생성 전에 중단한다. 가상 fixture로 만든 검사 폴더는 운영에 사용하지 않는다.

- hosting/: 실제 공개 설정으로 만든 화면과 /privacy/ 안내. 원본 .env/캐시 없음.
- worker/index.js: production entry만 포함. Emulator·실제 PEM 비밀·소스맵 제외.
- migrations/: D1 schema, wrangler.jsonc: 같은 프로젝트/App ID/origin/DB를 사용.
- firebase.json/.firebaserc: Hosting만 포함. Functions/Firestore/Storage 같은 다른 서비스는 포함하지 않음.
- manifest.json: 배포 검토 파일별 SHA256, BUILT_NOT_DEPLOYED·billingVerified=false·operatingChecksPassed=false.

원본 파일을 바꾼 뒤에는 새 번들을 생성하고 검증한다. manifest의 hash와 파일이 다르면 사용하지 않는다. bundle 루트 전체를 정적 웹 루트로 업로드하지 않는다. Firebase public은 hosting/이며 Worker secret은 산출물에 없다. 직접 수동 빌드를 할 때는 기존 .env.example·preflight를 따르고 CSP의 API origin 하나를 일치시킨다.

생성 시 출력된 manifest SHA256을 별도로 보관하고 다음과 같이 대조한다. 생성 직후에도 같은 검사를 자동 실행한다.

```powershell
node app-web/scripts/verify-release.mjs tmp/release/생성폴더 보관한64자리manifestSHA256
```

이 검사는 파일 hash·누락/추가·중복·경로 탈출/symlink·민감/개발 파일·Hosting/Worker 프로젝트 구성을 확인한다. manifest와 파일을 함께 바꿀 수 있는 공격자에 대한 출처 인증은 아니며, 원래 보관한 hash 대조와 신뢰하는 코드 검토가 필요하다. 통과해도 무료 플랜/운영 CPU/개인정보 확정·공개 배포 승인 상태는 바뀌지 않는다.

## 원격 설정/배포 순서 · 미실행

1. 사용자 확인 뒤 Spark·Workers Free와 결제 미연결을 재확인한다. Cloudflare의 웹사이트 Free와 Workers 요금제를 구분한다. 사용자 소유 무료 D1 DB 하나를 연결하고 실제 데이터 위치·국외 처리 안내를 맞춘다. 새로운 유료 상품이나 read replication을 켜지 않는다.
2. Firebase 이메일/비밀번호·열거 보호·12자 영문/숫자·정식 auth 도메인을 설정한다. reCAPTCHA Enterprise/App Check는 Spark로 등록한다. debug/Emulator 우회는 운영에 등록하지 않는다.
3. Auth 최신 사용자 조회/삭제에 필요한 최소권한만 갖춘 전용 서비스 계정의 자격증명을 Worker secret FIREBASE_ADMIN_CREDENTIALS로 등록한다. 일반 Owner/Editor 키를 쓰지 않고 로그/대화/Git/프론트 설정/번들에 넣지 않는다. 운영 secret 생성·등록은 이번에 실행하지 않았다.
4. 검토한 번들의 D1 migration만 해당 **정확한 DB**에 적용하고 Worker/Cron을 연결한다. 계정·DB·region·secret 입력을 전부 로그로 덤프하지 않는다. CLI에 --remote를 쓰는 작업은 실제 원격 변경이므로 이름/ID를 확인한 뒤 수행한다.
5. Firebase Hosting에 올리기 전 production 번들/headers·/privacy/ 안내와 기본 URL·API origin을 확인한다. 프로젝트 루트의 가상 dist나 가상 fixture 산출물을 배포하지 않는다.
6. Free 운영 런타임에서 정상/잘못된 ID·App Check·정지/회수·재인증·타계정 접근·두 브라우저·메일·탈퇴·Cron을 확인한다. 냉시작/키 갱신·큰 목록·삭제에서 CPU10ms와 D1 호출50개 이내인지 **실제 지표**로 검사한다. 로컬 시간으로 CPU 통과를 판정하지 않는다. 초과하면 공개 전 최적화/작업 분할하고 유료 전환으로 해결하지 않는다.
7. Galaxy와 실제 메일 확인 후 공개 상태를 판단한다. 공개 배포 성공과 실제 사용자 기능/삭제 성공을 구분해 증거를 기록한다.

## 사용량·장애·삭제 지연 점검

Workers 대시보드의 CPU/오류/일일 요청, D1의 행 읽기/쓰기·DB 크기, Firebase Auth 메일/App Check·Hosting 전송량을 본다. 한도는 계정 전체/DB별 기준이 다르며 SQL 인덱스·메타·삭제도 쓰기다. 임계점 접근 시 페이지 재요청/작업량을 줄이고 장애를 안내한다. 자동 유료 전환·자동 재시도 폭주는 사용하지 않는다. [공식 Workers 제한](https://developers.cloudflare.com/workers/platform/limits/), [D1 제한](https://developers.cloudflare.com/d1/platform/limits/)

worker/operations/health.sql은 계정 상태별 수·오래된 deleting 작업 시각·만료 메타 수만 읽는다. UID·이메일·원문·영수증을 출력하지 않는다. 원격 진단에도 DB 사용량이 들므로 장애 때 수동으로 필요한 만큼만 실행한다. /health 공개 API나 운영자 비밀번호 경로는 추가하지 않는다.

Cron에서 ACCOUNT_CLEANUP_PENDING이 발생하면 실패로 집계되고 pending 상태를 유지한다. 한 작업이 실패해도 나머지 작업을 진행한다. 원인은 무료 한도·서비스 계정 권한/키 만료·Google/DB 장애·큰 삭제 분할 등을 확인한다. 본문/토큰/UID를 로그에 찍어 진단하지 않는다. 원인을 해결하면5분 Cron 또는 동일 계정의 최근 재인증 재시도가 작업을 재개한다. 모든 원본/출처/최소 ID/Auth 정리가 끝나기 전에는 수동으로 deleted를 만들지 않는다.

## 키 유출·복구·롤백

키 유출이 의심되면 인증 관리 키를 즉시 회수하고 교체한다. 계정 세션도 필요에 따라 회수한다. 공개 apiKey와 관리자 secret을 혼동하지 않는다. 오류를 피하려고 App Check/인가/삭제 fence를 끄지 않는다. 사용자 정보가 담긴 CLI 디버그 로그를 외부 도구에 올리지 않는다.

화면/API 코드 롤백은 같은 스키마/UID/삭제 정책을 보장한 버전으로 수행하며 개인 기록 DB를 과거로 되돌리는 것과 구분한다. D1 Time Travel 복구는 원본과 삭제 ID를 함께 과거로 되돌릴 수 있으므로 공개 중 자동 복구를 금지한다. 실제 복구를 하려면 서비스 정지·사고/삭제 요청의 안전한 보존·격리 복구본 검토·삭제 재적용·원본/인가 검사 절차를 별도 확정해야 한다. 이 복구 기능/운영 절차의 실증은 이번 범위에서 실행하지 않았으며 복구 성공을 보장하지 않는다. Free7일 자동 이력의 존재와 서비스의 복구 기능을 구분한다.
