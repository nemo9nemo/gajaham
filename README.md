# 가자함

가고 싶은 장소의 링크와 이유를 담는 **모바일 웹앱**입니다. 설치 없이 URL로 접속하며, 로그인한 개인 기록은 같은 계정으로 다른 지원 기기·브라우저에서도 확인합니다.

현재는 개인 보관함 단계입니다. 실제 지도·상대 연결·공유 맵·Instagram DM 수신·자동 분석·광고는 아직 제공하지 않습니다. `web/`의 지도/공유 화면은 정적 목업이고, `android/`는 이전 개발 이력입니다.

## 현재 구현

- 이메일 가입/로그인, 게스트 IndexedDB, 명시적으로 선택한 계정 이동
- UID별 비공개 서버 원본, 링크·장소·메모·방문 상태·휴지통
- 버전 충돌/중복 요청/삭제 후 과거 재시도 차단, 재인증과 지속되는 계정 삭제
- 무로그인 `/privacy/` 안내, 공개 설정 교차 검사·배포하지 않는 출시 번들 생성

운영 구성은 Firebase Auth/Hosting **Spark** + Cloudflare Workers/D1 **Free**입니다. 결제수단·Blaze·Cloud Billing·유료 구독을 연결하지 않습니다. 별도 도메인 구매 없이 기본 주소를 쓰며, 무료 한도 초과 시 사용이 제한될 수 있습니다.

## 최종 런칭 준비

지금 사용자에게 필요한 확인은 [다음 단계 안내](docs/release/USER-NEXT-STEPS.md)를 따릅니다. 원격 자동검사는 [Web checks](https://github.com/nemo9nemo/gajaham/actions/workflows/web-checks.yml)에서 실제 결과를 확인합니다. 공개 저장소의 무료 표준 실행기·가상 데이터만 사용하며 배포/운영 계정에는 연결하지 않습니다.

**공개 서비스는 아직 배포하지 않았습니다.** 실제 소유 계정/무료 요금제·결제 미연결 확인, 공개 운영정보·문의처, 실메일·Galaxy 검사가 남아 있습니다. 가상 fixture/Emulator 주소를 실사용 주소로 사용하지 않습니다.

1. [최종 런칭 체크리스트](docs/release/FINAL-LAUNCH-CHECKLIST.md): 병합·계정 확인부터 실제 배포/검증까지의 순서와 담당
2. [현재 완료/잔여 상태표](docs/release/WEB-03-readiness.md), [배포·운영 절차](docs/release/WEB-03-operator-runbook.md)
3. [최신 검사 증거](docs/validation/WEB-03-release-preparation.md), [개인정보 확정 항목](docs/release/WEB-03-privacy-draft.md)

## 코드와 로컬 실행

| 경로 | 용도 |
|---|---|
| [app-web/](app-web/README.md) | 실제 웹앱·Firebase Auth 클라이언트·게스트 저장·개인정보 페이지 |
| [worker/](worker/README.md) | 실제 개인 API·D1 원본·서버 인가·삭제/Cron |
| functions/ | 이전 서버 구현 이력과 공통 순수 도메인 규칙. 현재 기본 배포에 포함하지 않음 |
| web/ | 의존성 없는 정적 화면 카탈로그. 실제 계정/공유 서버가 아님 |
| [android/](android/README.md) | 이전 Android 구현. 현재 웹 서버 정책을 적용한 출시 앱이 아님 |

개발 환경·가상 계정으로 검사하는 방법은 app-web/README.md를 따릅니다. 운영 설정·비밀·사용자 기록·빌드 결과는 Git에 넣지 않습니다. 작업 브랜치의 리뷰 통과 SHA만 push하고 main 병합은 PR 확인 후 진행합니다.
