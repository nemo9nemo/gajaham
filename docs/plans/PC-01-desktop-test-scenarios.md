# PC-01 PC 브라우저 테스트

- 상태: DONE · 2026-11-17 · 브랜치: codex/PC-01-desktop-test-scenarios
- 참조: [WEB-06](WEB-06-personal-beta-flow.md), [시나리오](../validation/PC-01-desktop-test-scenarios.md)

## 목표와 범위

현재 PC 로컬 웹앱의 핵심 사용자 흐름을 명시하고, 독립 브라우저 세션을 사용하는 재실행 가능한 테스트를 제공한다. Firebase Auth Emulator·로컬 Worker/D1과 가상 데이터만 사용한다. 기존 WEB-06 세부 회귀 테스트를 대체하지 않는다.

## 하지 말 것

실제 계정·실메일·운영 배포·모바일 실기기 검증, 제품 동작과 의존성 변경. 사용자의 기존 로컬 기록/계정을 삭제하지 않는다.

## 검증

로컬 미리보기 실행 중 app-web에서 Playwright로 pc-journey.spec.mjs를 실행한다. 기존 두 브라우저 시나리오도 실행하여 회귀를 확인한다. 문서와 실행 결과를 별도 리뷰한다.

Node 22.12 이상, 설치된 의존성과 Playwright Chromium이 필요하다. 로컬 Auth(9199)·Worker/D1(8787)·emulator 모드 웹(5183)을 먼저 실행한 뒤 저장소 루트에서 다음을 실행한다.

```powershell
node app-web/node_modules/@playwright/test/cli.js test --config app-web/playwright.config.mjs
```

## Codex 구현 보고

시나리오와 테스트 파일·실행 결과는 검증 문서에 기록한다. 자동 테스트는 임의 가상 계정과 브라우저 격리 컨텍스트를 생성하며 자신이 생성한 계정만 삭제한다. 로컬 Playwright 전체 브라우저 24개 통과: `tmp/codex/PC-01-browser.log`. 원격 운영·실메일·휴대폰 검사는 미실행이다.

## 리뷰 기록

독립 리뷰 1차: 재사용 서버의 로컬 환경 확인과 재실행 명령 누락을 지적했다. 테스트에 로컬 안내 확인을 추가하고 실행 조건과 명령을 기록했으며 신규 테스트 1개가 다시 통과했다. 수정본 재리뷰 **APPROVED**, 남은 지적 없음. 전체 24개 검사는 위 수정 전 결과로 구분한다.
