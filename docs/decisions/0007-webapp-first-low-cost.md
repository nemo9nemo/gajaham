# 0007 웹앱 우선 전환과 최소 운영 비용

- 날짜: 2026-11-03
- 상태: 웹앱 전환은 사용자 요구 확정. 아래 기술·배포 구성은 실행 제안이며 미구현·미배포
- 근거: 사용자 요청 “남은진행사항확인. 변경사항: 앱 출시 -> 웹앱으로 진행. 도메인 등 가진거 없고, 최소한의 운영/서버 비용을 생각 중.”
- 대체 범위: 결정 0003의 Android/Play 우선 배포 경로. 결정 0005/0006의 이메일·게스트·개인 원본 로컬 전용 정책은 유지

## 확정한 변경

1. 다음 출시 대상은 모바일 웹앱이다. Android 출시·AAB·Play 심사·AdMob 준비는 현재 출시의 선행 조건에서 제외한다. 기존 Android 코드와 검사 기록은 보존한다.
2. 도메인·운영 서버를 보유했다고 가정하지 않는다. 유료 계약 없이 시작할 구성을 우선 검토한다. 계정 개설·도메인 구매·유료 서비스 활성화·공개 배포를 이번 점검에서 실행하지 않는다.
3. 이메일·비밀번호 기본 로그인과 로그인 없는 개인 이용을 유지한다. 간편 로그인은 2차다. 인증 계정과 개인 기록의 보관은 별개다.
4. 개인 원본은 브라우저 로컬에만 보관한다. 개인 기록 서버 백업·동기화·사용자용 파일 내보내기/가져오기를 추가하지 않는다. 두 사람 공유 맵은 선택한 사본만 서버에 보관하는 별도 후속 기능이다.
5. Galaxy의 모바일 브라우저 경험을 우선하고 광고 수익화 목표를 유지한다. 웹 광고 제공자·지면·심사·도메인 조건은 별도 검토한다. AdMob 계획을 웹 광고 구현으로 간주하지 않는다.

## 추천하는 시작 구성

**정적 웹앱 + IndexedDB + Firebase Authentication Web SDK + Firebase Hosting Spark**를 1차 기술 실증안으로 삼는다. 기존 Android의 인증 정책·검사 시나리오는 재사용하되 Kotlin/Room 코드는 웹에서 그대로 실행할 수 없다. `web/`는 패키지를 추가하지 않는 기존 목업으로 보존하고 실제 웹앱 경로·프레임워크·SDK 버전·명령은 WEB-01 착수 브리프에서 확정한다. 이번 문서는 의존성 설치 권한이나 새 스택 구현 완료 보고가 아니다.

Firebase Hosting은 무료 `web.app`/`firebaseapp.com` 주소와 HTTPS를 제공한다. 두 주소의 배포 내용이 같아도 브라우저 저장 영역은 다르므로 **하나를 정식 이용 주소로 고정**하고 다른 주소는 쓰기 전에 정식 주소로 안내/이동시켜야 한다. 운영 프로젝트·주소는 아직 없다. [공식 Hosting 설명](https://firebase.google.com/docs/hosting/)

Spark에서는 별도 상시 서버·Cloud Functions·Cloud Run·사진 업로드 저장소를 기본 구성에 넣지 않는다. 인증은 관리형 서비스를 사용하며 자체 비밀번호 서버를 만들지 않는다. 공유 기능의 서버 인가·초대 코드·정리 작업은 별도 설계가 필요하고 Spark만으로 전부 충족한다고 단정하지 않는다. [Spark 요금제와 제한](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

대안은 Cloudflare 정적 배포다. Workers Static Assets는 정적 요청·저장이 무료이고 동적 Worker 호출은 별도 한도를 적용한다. `workers.dev`로 시작할 수 있으나 공식 문서는 중요 운영 서비스에는 자체 도메인/route 사용을 권장한다. 무료 주소에서 자체 도메인으로 옮기면 로컬 기록 접근 경계도 바뀌므로 단순한 호스팅 교체로 취급하지 않는다. Firebase 한 곳으로 시작하면 초기 계정·설정 관리가 적다는 이유로 Firebase Hosting을 먼저 제안한다. [정적 자산 비용](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [기본 주소의 용도](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

Vercel Hobby는 비상업 개인 이용으로 제한돼 광고 수익화 서비스의 무료 운영 전제로 삼지 않는다. [공식 Hobby 조건](https://vercel.com/docs/plans/hobby)

## 웹에서 바뀌는 데이터 수명

브라우저·프로필·출처(origin)별 IndexedDB를 사용한다. 로그인만으로 다른 기기·브라우저·도메인에서 개인 원본이 복구되지 않는다. 사이트 데이터 삭제·브라우저 초기화·저장소 정리 등으로 소실될 수 있다. PWA 아이콘 제거만으로 사이트 데이터가 반드시 삭제된다고 약속하지 않는다. `navigator.storage.persist()` 허용 여부도 영구 보존이나 복구 보장은 아니다. 도메인 변경 시 자동 이전을 보장하지 않고 별도 승인된 이전 설계 없이 서버/파일 백업을 추가하지 않는다. 세부 기준은 [웹 로컬 계약](../contracts/web-local-data.md)을 따른다. [브라우저 저장 정책](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

Android Room 기록을 웹에 자동 이전하는 경로는 없다. 기존 사용자 기록을 삭제하거나 서버로 올려 이식하지 않는다. 공유 맵을 다시 내려받는 것과 개인 원본 복구는 구분한다.

## 남은 진행과 비용

[WEB-00 전환 점검](../plans/WEB-00-webapp-transition.md)이 현재 진행 기준이다. 기존 Android 완료와 웹 미구현을 구분하고 [검증 목록](../validation/WEB-00-webapp-transition.md)에 실제 실행 여부를 남긴다. 추천 검증 순서와 첫 공개 범위는 구분한다. 공유 맵·DM 요구를 폐기하거나 사용자 동의 없이 첫 출시에서 영구 제외한 결정이 아니다.
