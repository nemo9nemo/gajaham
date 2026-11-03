# 앱·웹 출시의 서버 운영과 개인별 데이터 저장 조사

조사일: 2026-11-03 / 작성: Codex / 작업: [RES-01](../plans/RES-01-server-personal-data-research.md)

사용자 요청: 앱·웹을 출시할 때 서버를 어떻게 운영하며, 가자함처럼 개인별 데이터를 저장할 때 어떤 방식을 쓰는지 조사한다. 실제 서비스의 공식 도움말·처리방침과 인프라 제공자의 공식 문서를 비교했다. 서비스 가입·직접 사용·부하 검사·청구서 확인은 하지 않았다. 아래 4개 사례는 표본이며 시장점유율이나 ‘대부분의 서비스’라는 통계적 결론의 근거가 아니다. 가격은 USD 표기, 세금·환율·도메인·개발/운영 인건비 별도이며 계약 전 다시 확인한다.

## 1. 조사 결과

**개인별 데이터를 저장하기 위해 사람마다 서버나 DB를 만들 필요는 없다.** 하나의 서비스 DB에 소유자 ID를 붙이고 서버/DB에서 접근을 검사하는 구성이 가능하다. Firebase와 Supabase는 이 구성을 위한 공식 접근 제어 기능을 제공한다. ‘본인만 열람’과 ‘기기에만 보관’은 다른 요구다. [Firebase 사용자별 규칙](https://firebase.google.com/docs/firestore/security/rules-conditions), [Supabase 행별 권한](https://supabase.com/docs/guides/database/postgres/row-level-security)

**서버에 개인 데이터를 보관해도 소규모 무료 한도로 시작할 수 있다.** 무료 범위·메일·사진·백업·운영 중단 조건을 함께 봐야 한다. 가자함의 개인 원본 로컬 전용은 기존 사용자 요구인 ‘삭제 후 복구 불가’를 지킨 선택이며, 무료 출시를 위한 기술적 필수 조건은 아니다. 현재 정책은 [결정 0005](../decisions/0005-login-and-device-local-records.md)/[0007](../decisions/0007-webapp-first-low-cost.md)대로 유지한다. 이번 조사는 서버 업로드나 정책 변경을 실행하지 않는다.

앱/웹의 선택만으로 서버 구성이 정해지지 않는다. Android·웹이 같은 인증/데이터 API를 함께 사용할 수 있고, 웹 화면을 배포하는 호스팅과 이용자 기록을 보관하는 DB도 별개다. 관리형 백엔드를 쓰면 제공자 서버가 실제 일을 하며 운영자가 별도의 상시 VM을 임대하지 않아도 된다. [Firebase Hosting](https://firebase.google.com/docs/hosting/), [Supabase 플랫폼](https://supabase.com/docs/guides/getting-started/architecture)

## 2. 실제 서비스 사례

| 사례 | 공식 자료에서 확인한 저장/운영 방식 | 가자함과 비교할 점·확인 한계 |
|---|---|---|
| Mapstr — 장소 저장 앱 | 개인 계정·장소·태그·친구/장소 공유를 처리하며 Google Frankfurt와 AWS Ireland를 데이터 호스팅으로 명시 | 개인 장소 서비스도 외부 클라우드 호스팅을 사용할 수 있는 사례. 정확한 DB 제품·스키마·사용료는 공개 자료로 확인하지 못함. 방침의 Firebase는 분석 솔루션 항목이므로 Firestore 사용 증거로 삼지 않음. [공식 처리방침](https://en.mapstr.com/politique-de-confidentialite) |
| Raindrop.io — 웹·모바일 북마크 | 공식 설명상 AWS Frankfurt에 클라우드 저장, 기본 비공개 컬렉션, 명시적 공개/공동 작업. 사용자 내보내기와 별도 자동 백업도 안내 | 서버 저장과 기본 비공개가 양립하는 사례. 운영자 백업/사용자 내보내기를 나누며, 내부 DB 종류·총 원가는 미확인. 가자함에 내보내기를 추가한다는 제안/결정은 아님. [보안·저장](https://help.raindrop.io/security), [내보내기/백업](https://help.raindrop.io/export) |
| Linkwarden — 링크 보관 서비스 | 운영사의 Cloud 또는 직접 설치를 선택. 직접 설치 공식 문서에 앱·PostgreSQL·선택적 Meilisearch 구성과 Docker 배포 안내 | 자체 서버형의 실제 구현 참고. 보존 파일/DB/검색의 관리와 자원이 필요. 공식 문서의 편안한 시작 기준은 RAM4GB·2core로 최저가512MB VM과 동일하지 않음. 운영사의 실제 Cloud 인프라/원가는 이 문서만으로 알 수 없음. [공식 설치](https://docs.linkwarden.app/self-hosting/setup), [업그레이드와 백업](https://docs.linkwarden.app/self-hosting/upgrading/how-to-upgrade) |
| Obsidian — 로컬 중심 데스크톱·모바일 앱 | 노트 원본은 기기의 Markdown 파일. 선택적 Sync의 원격 보관에는 기본 종단간 암호화 제공 | 로컬 중심 제품의 비교 사례이며 브라우저 전용 웹앱 사례가 아님. 로컬 중심도 원격 동기화를 별도 제공할 수 있고, 파일 원본은 브라우저 IndexedDB와 보존 방식이 다름. [로컬 저장](https://obsidian.md/help/data-storage), [Sync 보안](https://obsidian.md/help/sync/security) |

Mapstr·Raindrop.io는 공개 문서상 클라우드 저장을 사용한다. Obsidian은 로컬 원본을 강조하면서 선택적 원격 동기화를 둔다. 이 사례에서 얻는 설계 시사점은 저장 위치·접근 범위·복구·동기화·백업을 따로 선택해야 한다는 것이다. 서비스마다 비공개·복구의 범위가 다르므로 ‘모두 같은 방식’으로 묶지 않는다.

기존 국내 경쟁사 조사와 별개로 쏙핀 홈페이지도 확인했으나 읽을 수 있는 서버/저장 아키텍처 자료를 확보하지 못했다. 이번 표에서 국내 경쟁사의 DB 제공자·복구 정책을 추정하지 않았다. 기존 국내 경쟁 기능·가격 조사를 갱신 완료한 의미도 아니다.

## 3. 서버가 하는 일을 나누면 선택이 쉬워진다

| 역할 | 하는 일 | 소규모 출시 선택지 |
|---|---|---|
| 화면 호스팅 | 웹 HTML/JS/CSS와 HTTPS 제공 | Firebase Hosting, Cloudflare Static Assets. 정적 파일만이면 상시 앱 서버 불필요 |
| 인증 | 가입·비밀번호 검증·메일·세션·UID 발급 | Firebase Auth 또는 Supabase Auth. 인증만 도입해도 장소 데이터가 자동 저장되지는 않음 |
| 기록 DB | 장소·메모·방문·공유 관계 보관 | 기기의 IndexedDB/Room 또는 서버의 Firestore/PostgreSQL |
| 비공개 파일 저장 | 이용자 사진·첨부·보존 이미지 | 객체 저장소와 파일별 권한. DB의 텍스트 저장량/백업과 별도 |
| 처리 API/작업 실행 | 초대 수락·비밀 키 API·탈퇴 정리·DM 수신·분석 | 서버리스 함수/관리형 API 또는 직접 운영 서버. 비밀 키와 신뢰 경계가 필요한 작업은 클라이언트에 넣지 않음 |

이는 역할 구분이며 서비스를 5개 계약하라는 뜻이 아니다. Firebase나 Supabase가 여러 역할을 묶어 제공한다. 앱과 웹이 같은 서버 DB를 쓰면 같은 UID의 데이터를 각 화면에서 조회할 수 있다. 사용자가 보낸 UID 문자열만 믿는 대신 인증 토큰과 권한을 검증해야 한다. [Firebase 인증·규칙](https://firebase.google.com/docs/firestore/security/rules-conditions), [Supabase 구조](https://supabase.com/docs/guides/getting-started/architecture)

### 개인별 저장의 구체적인 모양

아래는 **클라우드 개인 원본을 허용할 때의 가상 예**다. 현재 가자함에 이 테이블을 만들거나 개인 원본을 업로드하지 않았다.

| 장소 ID | 소유자 ID | 기록 |
|---|---|---|
| place-1 | uid-A | A가 저장한 장소·개인 메모 |
| place-2 | uid-B | B가 저장한 장소·개인 메모 |

1. 로그인 서비스가 검증된 UID를 제공한다.
2. DB/API는 읽기·추가·수정·삭제 모두 요청자 UID와 기록 소유자를 검사한다. 쓰기에서 소유자를 다른 사용자로 바꾸는 것도 막는다.
3. 공유는 별도 맵/참여자 관계로 검사한다. 개인 맵 전체를 공개하지 않고 선택한 사본을 공유 맵에 등록한다. 참여권 종료 후의 오래된 요청도 서버가 거절한다.

Firebase는 Security Rules, Supabase는 RLS로 이 원칙을 구현할 수 있다. 화면에서 A의 데이터만 필터링하는 것으로는 권한 제한을 충족하지 않는다. 관리자용 키는 두 제공자의 규칙을 우회할 수 있으므로 웹/앱에 넣지 않고, 관리자 API도 별도 인가가 필요하다. 공유·초대의 동시성·만료·단일 사용은 기본 로그인 기능만으로 완성되지 않는다. [Firebase 규칙과 서버 SDK 예외](https://firebase.google.com/docs/firestore/security/rules-conditions), [Supabase RLS와 우회 권한](https://supabase.com/docs/guides/database/postgres/row-level-security)

Firebase/Supabase의 사용자별 권한은 다른 이용자의 접근을 막는 장치다. 운영자도 원문을 볼 수 없게 하려면 종단간 암호화 같은 추가 설계가 필요하다. Obsidian Sync가 그런 선택의 공개 사례다. HTTPS·서버 디스크 암호화·사용자별 인가를 종단간 암호화와 혼동하지 않는다. 가자함에 이를 새 요구로 확정한 것은 아니다. [Obsidian 암호화 설명](https://obsidian.md/help/sync/security)

## 4. 저장 방식 4가지와 현재 가자함

| 방식 | 개인 원본·서버 역할 | 재설치/다른 기기 | 개발·운영 부담 | 가자함에 적용할 조건 |
|---|---|---|---|---|
| 로컬 전용 | Room/IndexedDB만 원본. 필요하면 인증만 서버 이용 | 개인 원본 복구 없음 | 서버 데이터 비용은 작음. 브라우저 정리·주소 변경·유실 대응 필요 | 현재 개인 기록 정책 |
| 클라우드 원본 + 로컬 캐시 | 사용자별 서버 DB가 원본, 캐시는 빠른 열람·오프라인 보조 | 계정·기록이 유효하면 서버에서 다시 조회하도록 구현 가능 | 서버 인가·삭제/보존·백업·오프라인 충돌 설계 필요 | 개인 원본 서버 보관 허용으로 정책 변경 필요 |
| 개인 로컬 + 공유 서버 | 개인은 로컬, 명시적으로 공유한 사본만 서버 DB | 개인 복구 없음. 공유 사본 재조회는 참여권에 따름 | 로컬/서버 두 저장 경계와 부분 실패 관리 필요 | 현재 기획의 목표 구조. 실제 공유 서버는 아직 미구현 |
| 로컬 우선 + 원격 동기화 | 로컬에서 편집하고 원격에 동기화 | 계정/키·동기화 범위에 따라 복구 가능 | 충돌·삭제 전파·중복·다중 기기 관리. 동기화 엔진 도입 범위에 따라 부담이 큼 | 현재 로컬 전용과 다르며 정책 변경 필요 |

브라우저 로컬은 origin·브라우저/프로필에 묶이고 사이트 데이터 삭제·저장소 회수 등으로 소실될 수 있다. 홈 화면 설치만으로 영구 보존을 보장하지 않는다. [MDN 저장 수명](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

Firestore 오프라인 캐시도 동기화되면 서버에 데이터가 남는 구성이므로 가자함의 개인 로컬 전용 정책을 대신하지 않는다. 공식 문서는 여러 변경이 같은 문서에 있으면 마지막 쓰기가 이기는 동작을 설명한다. 이를 사용해도 맵 간 사본 독립·공유 종료·계정 전환의 앱 정책은 따로 구현해야 한다. [Firestore 오프라인 동작](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

## 5. 서버 운영 방식과 현재 비용

| 선택 | 시작 비용·공식 무료 한도 | 유료 전환/운영 경계 | 적합성 판단 |
|---|---|---|---|
| Firebase 관리형 | Spark 월$0. Firestore1GiB·읽기50,000/일·쓰기20,000/일·삭제20,000/일·외부전송10GiB/월. 기본 이메일 인증·정적 Hosting은 각 한도 안에서 시작 가능 | Blaze는 사용량 과금. 함수·Cloud Run·사용자 이미지용 Cloud Storage·백업/PITR 등을 같은 무료 구성으로 묶지 않음. Hosting 전송 표기 차이는 아래 참고 | 기존 인증 정책·Android 구현 경험과 연결 가능. 현재 조건의 1차 실증 후보. [요금](https://firebase.google.com/pricing), [Firestore 과금](https://firebase.google.com/docs/firestore/pricing) |
| Supabase 관리형 | Free 월$0. PostgreSQL500MB·Auth50,000MAU·파일1GB·일반외부전송5GB 및 캐시전송5GB. 활성 무료 프로젝트 최대2개 | Pro 월$25부터, 기본 Micro1개를 충당하는 compute credit 포함. 추가 프로젝트·용량·외부전송·메일 등 별도. Free는 낮은 활동으로 약1주 후 정지될 수 있고 자동 백업 미포함 | 사용자·맵·참여자 관계를 SQL로 다루기 좋다는 설계상 평가. 메일/인증 이전과 운영 예산을 함께 검토. [공식 요금](https://supabase.com/pricing), [무료 정지](https://supabase.com/docs/guides/platform/free-project-pausing) |
| Cloudflare 정적 + 필요 시 함수/DB | Static Assets의 정적 요청/저장 무료. Worker Free 동적 요청100,000/일·호출당CPU10ms | Workers Paid 최소 월$5 + 초과 사용량. 인증·메일·DB·백업까지 월$5로 전부 제공한다는 뜻은 아님 | 프론트 배포/비밀 키 API 후보. Firebase/Supabase와 조합하면 제공자/설정 수 증가. [정적 비용](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Worker 요금](https://developers.cloudflare.com/workers/platform/pricing/) |
| 직접 운영 VPS | DigitalOcean 예: 512MiB 월$4, 1GiB 월$6, 2GiB 월$12의 기본 VM | 앱/DB 설치·OS/인증 보안·메일·백업·복구·장애 대응은 직접 관리. 최저 VM은 가자함 운영 적합성을 검증한 견적이 아님 | 자유도는 높으나 최소 ‘운영 부담’ 목표에는 우선순위가 낮다는 판단. DB·파일을 한 VM에 둬도 별도 복구 사본 필요. [공식 VM 가격](https://www.digitalocean.com/pricing/droplets), [실제 링크 앱의 자원/백업 사례](https://docs.linkwarden.app/self-hosting/setup) |

MAU는 월간 인증 활동 지표이며 DB 저장 사용자 수·장소 수·동시 접속 수와 다르다. Supabase 무료50,000MAU라는 숫자로5만 명의 데이터·트래픽까지 모두 무료라고 계산하지 않는다. Supabase의 유료 ‘Custom Domain’은 백엔드 API 주소의 브랜딩 옵션이며 웹앱용 도메인 구매와 별개다. 무료 `supabase.co` API 주소를 쓰면서 프론트의 기본 무료 주소를 사용할 수 있다. [Supabase 요금과 Custom Domain](https://supabase.com/pricing)

### 도메인·이메일에서 놓치기 쉬운 비용

Firebase Hosting의 `web.app`/`firebaseapp.com` 기본 주소와 HTTPS는 무료다. 가자함처럼 브라우저 로컬 원본이 있으면 한 정식 origin을 고정해야 한다. [공식 Hosting 설명](https://firebase.google.com/docs/hosting/)

Firebase 기본 인증 메일의 Spark 한도는 확인1,000건/일·암호 재설정150건/일이다. 기본 이메일·비밀번호와 매직링크/SMS/Identity Platform의 다른 한도를 구분해야 한다. [공식 인증 한도](https://firebase.google.com/docs/auth/limits)

Supabase의 기본 SMTP는 운영용이 아니며 프로젝트 팀의 허용 주소로만 발송하고 현재2건/시간 제한이다. 일반 이용자 가입 확인/재설정에는 별도 SMTP 설정이 필요하다. 따라서 DB 무료 플랜만 보고 이메일 로그인까지 바로 무료 운영 가능하다고 계산하지 않는다. 예를 들어 Resend는 무료3,000건/월·100건/일이지만 소유 도메인 검증이 필요하다. 다른 SMTP 제공자도 각 발신자·도메인·남용 제한과 비용을 확인해야 한다. ‘모든 SMTP가 도메인 구매를 강제한다’는 결론은 아니다. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend 요금](https://resend.com/pricing), [발신 도메인 조건](https://resend.com/docs/dashboard/domains/introduction)

**Firebase Hosting 공식 표기의 차이:** 확인일 현재 요금 페이지는 전송360MB/일, 세부 사용량 문서는10GB/월을 제시한다. 두 수치를 독립적으로 마음대로 쓸 수 있는 할당량으로 계산하지 않는다. 무료 한도 초과 시 중단될 수 있으므로 운영 프로젝트의 Usage/정책을 확인하기 전에는 월 전송량만으로 하루 유입 허용치를 보장하지 않는다. 기존 WEB-00도 이 제한을 추가했다. [공식 요금표](https://firebase.google.com/pricing), [세부 문서](https://firebase.google.com/docs/hosting/usage-quotas-pricing)

### 백업과 복구는 별도 기능

계정 재로그인으로 서버 원본을 다시 읽는 것, 여러 기기 변경을 동기화하는 것, 운영자가 사고 전 DB로 복구하는 것, 사용자가 파일로 내보내는 것은 서로 다르다. 서버 저장만으로 실수 삭제·장애에서의 복구까지 자동 완성되지 않는다.

Supabase의 일일 백업은 Pro 이상이며 Free는 운영자가 별도 외부 백업을 관리하도록 안내한다. DB 백업에는 Storage 객체 원본이 포함되지 않는다. Firestore도 TTL·백업·PITR 등은 기본 무료 할당량에 포함되지 않는다. 이것은 클라우드/공유 DB 도입 때 검토할 운영 기능이며, 가자함 개인 원본 서버 백업·사용자 파일 복구 금지를 이번에 해제하는 내용이 아니다. [Supabase 백업 범위](https://supabase.com/docs/guides/platform/backups), [Firestore 무료 제외 항목](https://firebase.google.com/docs/firestore/pricing)

계정 탈퇴도 인증 계정·DB 기록·파일·참여권·진행 중 작업을 함께 설계해야 한다. 예를 들어 Firestore는 부모 문서를 지워도 하위 컬렉션을 자동 삭제하지 않는다. 공유 사본/남은 참여자·보존기간을 정하고 삭제 결과와 재시도를 검증해야 한다. 현재 Android 인증 계정 삭제 구현을 미래 서버 기록 삭제 완료로 계산하지 않는다. [Firestore 삭제 동작](https://firebase.google.com/docs/firestore/manage-data/delete-data)

## 6. 가자함 데이터량으로 보는 가상 계산

다음은 비용 측정을 위한 가정이다. 실제 레코드/트래픽을 측정한 결과가 아니다. 장소1건의 텍스트·URL·메모를 평균2KB로 두며 1KB=1,000바이트, 사진·인덱스·DB 행/문서 오버헤드·복제·백업을 제외한다.

| 저장 사용자 수 | 1인 장소 | 총 장소 | 원본 텍스트 추정 |
|---|---|---|---|
| 100명 | 100개 | 10,000개 | 약20MB |
| 1,000명 | 100개 | 100,000개 | 약200MB |
| 10,000명 | 100개 | 1,000,000개 | 약2GB |

1,000명·10만 장소의 텍스트만이면 raw200MB다. 무료 DB와 비교할 수 있는 크기지만 실제로는 인덱스/메타데이터 등이 더해져500MB 또는1GiB 안에 반드시 들어간다고 보장하지 않는다. 같은10만 장소에 평균200KB 사진1장씩을 별도 보관하면 사진 원본만 약20GB다. 초기에는 URL·텍스트와 사진/게시물 아카이브의 저장 여부를 나눠 원가를 측정하는 것이 합리적이라는 판단이다.

Firestore 읽기의 가상 예: 하루 활성 이용자(DAU)1명이 하루4번, 화면마다50개 문서를 읽고 캐시 효과가 없다고 가정한다.

| DAU | 일일 문서 읽기 | 무료50,000읽기/일과의 관계 |
|---|---|---|
| 100명 | 20,000회 | 이 계산의 문서 읽기만 보면 한도 이내 |
| 500명 | 100,000회 | 한도 초과 |
| 1,000명 | 200,000회 | 한도 초과 |

실제 청구에는 쿼리/인덱스 읽기·인가용 추가 읽기·실시간 재접속·외부 전송·저장도 영향을 준다. 이 표의 숫자로 무료 이용자 정원이나 청구 금액을 확정하지 않는다. Supabase도 API 호출 무제한 표기가 CPU·DB 크기·전송·실시간 기능까지 무제한이라는 뜻은 아니다. [Firestore 과금 요소](https://firebase.google.com/docs/firestore/pricing), [Supabase 각 리소스 한도](https://supabase.com/pricing)

## 7. 현재 추천과 정책 선택

**운영 방식은 직접 VM 임대보다 관리형 백엔드를 먼저 검증하는 것이 적합하다.** 이는 기존 인증 자산·서버 운영 경험이 확인되지 않은 상황·최소 운영 비용 목표를 기준으로 한 설계 판단이다. 서비스 시장 전체의 정답이나 비용 우위를 실측한 결과는 아니다.

| 선택 기준 | 가자함에 대한 제안 | 현재 정책과 관계 |
|---|---|---|
| 기존의 ‘개인 기록은 기기 삭제/사이트 초기화 후 복구하지 않음’을 유지 | Firebase Auth/Hosting + 개인 IndexedDB, 공유를 구현할 때 선택 사본만 서버 DB | 기존 정책과 일치. 실제 웹 저장/공유는 아직 미구현 |
| 로그인한 개인 기록을 재설치·다른 기기·다른 브라우저에서도 유지하고 싶음 | 계정별 서버 DB + 최소 로컬 캐시. 기존 인증을 이어가는 Firebase/Firestore를 우선 실증 후보로 비교 | 개인 원본 서버 보관/동기화 허용으로 결정0005/0007·계약·삭제/검증 정책을 먼저 변경해야 함. 이번에는 변경하지 않음 |
| SQL의 관계 모델·데이터 이식성을 더 중시 | Supabase/PostgreSQL + RLS도 비교 후보. 사용자/맵/참여자 관계·초대 트랜잭션을 명시적으로 설계 | 인증 전환/유지 방안·SMTP·도메인·Free 중단/백업·Pro 월$25부터를 함께 산정. 비용만으로 즉시 교체할 근거는 부족 |

다음 설계에서 가장 먼저 확정할 문장은 **“로그인한 개인 기록을 다른 기기에서도 유지할 것인가”**다. ‘나만 보이게’만 원한다면 서버 저장과 사용자별 권한으로 구현할 수 있다. ‘서버에는 원본을 남기지 않기’까지 원하면 현재 로컬 전용 정책과 유실 안내를 유지해야 한다. 선택 전까지는 기존 정책대로 작업하고 서버 개인 원본 컬렉션을 만들지 않는다.

공유 맵은 어느 선택에서도 인증·서버 인가·사본 독립·코드 수명·공유 종료/탈퇴 처리가 필요하다. DM 수신/자동 분석·지도 제공자·사진/원문 보관은 별도 비용과 데이터 흐름 실증 항목이다. 이번 조사로 웹앱 기능·서버·운영 메일·공개 배포가 구현된 것은 아니다.
