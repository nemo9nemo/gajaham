# 결제 연결 없는 웹앱 · 실사용 조사

기준일 2026-11-09. 사용자 요구는 저렴한 종량제가 아니라 **결제수단·유료 요금제 연결 없이 운영**하는 것이다. 무료 초과분을 자동 결제하지 않고 기능 제한/중단을 받아들인다. 도메인을 구매하지 않으며 이메일/비밀번호와 계정별 서버 기록을 유지한다.

## 실제 사용 통계

Stack Overflow Developer Survey 2026의 선택 문항 응답자10,889명 기준, 지난1년 실제 개발에 많이 사용한 플랫폼의 복수 응답이다. 전체 시장 점유율·무료 사용자 수·가자함과 같은 서비스의 비중이 아니다. 출처: [Stack Exchange Inc. 2026 · Cloud development, ODbL1.0](https://survey.stackoverflow.co/2026/technology/data/cloud-plat).

| 서비스 | 응답 비율 | 가자함 적용 판단 |
|---|---:|---|
| Cloudflare | 24.6% | Workers/D1 Free API·개인 데이터 저장을 선택 |
| Firebase | 11.1% | Spark 이메일 인증·정적 Hosting 유지 |
| Vercel | 10.7% | Hobby는 개인 비상업용 조건이 있어 광고 목표와 함께 검토해야 함 |
| Supabase | 6.9% | DB/Auth 통합은 편하지만 이메일 발송·저활동 프로젝트 중지 조건 확인 필요 |
| Netlify | 5.6% | 널리 쓰는 대안이지만 이번 변경에서는 추가하지 않음 |

Cloudflare 응답에는 CDN·보안 제품 사용도 포함된다. 24.6%가 Workers/D1 사용자라는 뜻은 아니며, 선택한 Firebase+Cloudflare 조합이 가장 많이 쓰인다는 통계도 아니다. 선택은 현재 요구와 공식 무료 제한을 대조한 개발 판단이다.

## 개발자의 실제 운영 보고

[r/SaaS의 URL 메타데이터 API 개발자](https://www.reddit.com/r/SaaS/comments/1k9h8cl/turned_a_2hour_experiment_into_a_small_income/)는 Bun/Hono/Cloudflare Workers로 공개 API를 운영하며 유료 구독자와 무료 사용자가 있고 무료 인프라로 운영 중이라고 설명했다. 본인 경험을 직접 쓴 자료이며 청구서·트래픽을 독립 검증한 자료는 아니다. 계정 원본·삭제·D1을 사용하는 가자함의 비용/가용성을 입증하지 않는다. 비슷한 규모라는 이유만으로 무료 수용 인원을 약속하지 않는다.

일반적인 소규모 웹앱은 정적 화면을 Hosting/CDN에, 인증과 개인 원본을 관리형 서비스에 둔다. 개인별 데이터는 브라우저 설치 여부가 아니라 검증한 계정 UID와 서버 접근 권한으로 구분한다. 이번 구현에서는 브라우저가 D1에 직접 접속하지 않고, 검증된 토큰의 UID로 Worker가 접근한다.

## 무료 조건 비교

| 구성 | 결제 없이 시작 | 중요한 조건 | 결정 |
|---|---|---|---|
| Firebase Spark만 사용 | 가능 | 기존 서버 API/탈퇴 트리거인 Cloud Functions는 Blaze가 필요함 | 인증·Hosting만 유지 |
| Cloudflare Workers/D1 Free | 가능, 카드 없이 시작 | 요청·CPU·DB 행 처리·저장 한도 초과 시 실패/제한 | API·원본·정리 작업으로 사용 |
| Supabase Free | 가능 | DB500MB, 저활동7일 중지 가능. 기본 SMTP는 팀 주소만, 시간당2건·운영용 아님 | 이메일 요구·빠른 이전에 불리하여 미선택 |
| Vercel Hobby | 가능 | 개인 비상업용. 향후 광고 서비스에는 조건 재확인 필요 | 미선택 |

근거: [Firebase 요금제](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [D1 시작](https://www.cloudflare.com/products/d1/), [Workers 가격](https://developers.cloudflare.com/workers/platform/pricing/), [D1 가격](https://developers.cloudflare.com/d1/platform/pricing/), [Supabase 가격](https://supabase.com/pricing), [프로젝트 중지](https://supabase.com/docs/guides/platform/free-project-pausing), [기본 SMTP 제한](https://supabase.com/docs/guides/auth/auth-smtp), [Vercel Hobby](https://vercel.com/docs/plans/hobby). 기술 조건은 공식 자료를 우선했다.

## 선택 구성의 한도와 실패 방식

Workers Free는 계정당 하루10만 요청·호출 CPU10ms 제한이다. 외부 통신 대기 시간과 CPU는 다르며 RSA 토큰2종 검증·관리 토큰 서명·큰 목록/삭제의 **운영 CPU 적합성은 공개 전 실제 Free 런타임에서 측정해야 한다**. 로컬 검사 속도로 통과를 주장하지 않는다. [Workers 제한](https://developers.cloudflare.com/workers/platform/limits/)

D1 Free는 계정 전체 하루 읽기500만 행/쓰기10만 행·전체5GB이며, DB 하나는500MB다. 이번 구성은 DB 하나로 시작하므로 실제 저장 상한은500MB다. 읽기/쓰기 초과 시 쿼리 오류, 저장 한도에서는 새 쓰기 오류가 난다. 인덱스·수정·삭제·중복 방지와 호출 제한 메타도 사용량이다. API 한 번과 SQL 한 행을 같게 계산하지 않는다. [D1 가격](https://developers.cloudflare.com/d1/platform/pricing/), [D1 제한](https://developers.cloudflare.com/d1/platform/limits/)

Firebase Auth 이메일·Hosting·App Check에도 개별 한도가 있다. Spark를 유지하며 Cloud Billing, 전화/SMS, 유료 Google API, R2 등 결제 연결이 필요한 제품을 추가하지 않는다. reCAPTCHA Enterprise App Check는 Spark에서도 사용 가능하나 위험 점수와 무료 평가 한도가 있으며, 한도 초과를 이유로 결제를 연결하지 않는다. [App Check Spark 조건](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)

초과 시 코드가 유료 전환하지 않는다. 저장은 서버 성공 전 완료로 표시하지 않으며 탈퇴는 `deleting` 상태로 재시도한다. 운영자가 나중에 계정 요금제를 바꾸면 플랫폼 청구 조건도 바뀌므로 코드만으로 외부 계정의 결제를 영구 차단할 수는 없다. 운영 전 Spark/Workers Free·결제수단 미연결을 실제 계정에서 확인한다.

## 보안·운영 영향

서명·발급자·대상 프로젝트·만료·App ID를 검증하고 Auth 최신 정지/회수 상태를 조회한다. 권한은 클라이언트가 보낸 UID를 쓰지 않는다. SQL은 바인딩하고 버전 검사+수정을 원자적 batch로 처리한다. 계정 삭제 관리 자격증명은 Worker secret에만 둔다. Functions/Firestore 배포는 기본 설정에서 제거하고 이전 Functions 배포에는 중단 hook을 둔다.

D1 Time Travel은 자동으로 켜져 있고 Free는7일 이력이다. 현재 DB에서 삭제한 원문이 공급자 복구 이력에 남을 수 있으므로 이를 개인정보 안내에 명시한다. 복구 작업은 서비스 중지·삭제 요청 재적용 후 재개를 포함하는 별도 승인/검사 대상이며 이번에 실행하지 않았다. 사용자 파일 백업/가져오기 기능을 추가하지 않는다. [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [Free 보존 기간](https://developers.cloudflare.com/d1/platform/limits/)

## 출시까지 남은 항목

2026-11-10 후속으로 계정 없이 가능한 출시 준비를 구현/검증했다. 아래2026-11-09 당시 표를 현재 완료 상태로 오해하지 않도록 [WEB-03 최신 상태표](../release/WEB-03-readiness.md)를 우선한다. 공개 계정/실메일/Galaxy/배포가 미실행이라는 경계는 유지한다.

| 항목 | 담당 | 현재 상태 |
|---|---|---|
| 비용 정책·코드·로컬 보안 검사 | Codex | WEB-02 검사 기록 참조 |
| Google·Cloudflare 소유 계정 로그인/생성, Spark·Workers Free·결제 미연결 확인 | 사용자 계정 조작 필요 | 미실행 |
| 인증·D1 생성·Worker secret·App Check·기본 주소 연결 | Codex가 설정 지원, 사용자 계정 접근 필요 | 미실행 |
| 공개 문의 이메일/URL 마련 | 사용자 | 준비 전에는 안내만 표시 |
| 운영 CPU·무료 한도·메일·삭제 재시도·보안 헤더 확인 | Codex | 실제 무료 환경 연결 후 |
| Galaxy Samsung Internet/Chrome 실사용 확인 | 사용자 실기기 협조, Codex 검사 지원 | 미실행 |
| 개인정보 처리방침·국외 처리/보존 고지·실제 연락처 확정 | 운영자 확인과 Codex 반영 | 미실행 |
| 기본 URL 공개 배포 및 두 브라우저 검증 | Codex | 위 조건 통과 후 |

신용카드 등록·Blaze 활성화·도메인 구매·서버 구매는 사용자 할 일에서 제외한다. 현재 실제 운영 계정·결제·공개 배포가 없어 청구 요금제를 변경/해지한 상태라고 보고하지 않는다.
