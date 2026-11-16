# WEB-05 · 실제 무료 인증 초기 설정 검사

2026-11-13 · [브리프](../plans/WEB-05-production-auth-readiness.md).

## 실제 콘솔에서 확인한 것

- 사용자에 의해 Firebase 약관 체크가 반영된 상태를 확인한 뒤 Spark 프로젝트를 생성했다. 콘솔 Spark·무료($0/월), 웹앱 등록·기본 Hosting 사이트 연결을 확인했다. 웹 코드는 배포하지 않았다. Gemini/Analytics 생성 옵션은 껐다.
- 이메일/비밀번호 제공자 설정을 저장했다. 비밀번호 정책은 필수 시행·소문자/숫자 포함·최소12/최대128로 저장 완료(저장 버튼 비활성)를 확인했다.
- 이메일 열거 보호는 켜져 있었다. 사용자 직접 인증 계정 삭제를 꺼서 서버 삭제 작업이 인증 삭제까지 담당하도록 저장 완료를 확인했다. 운영 인증 도메인에서 localhost를 제거한 뒤 기본 Hosting/Auth 도메인2개만 남은 목록을 확인했다.
- 실제 Firebase 공개 비밀번호 정책을 공식 SDK validatePassword로 읽었다. 최소 정상12자·소문자 없음·길이 부족·숫자 없음·숫자만·129자6경계의 결과가 설정과 일치했다. 이 조회는 계정/메일을 만들지 않으며 실제 가입/재설정·탈퇴 성공 검사는 아니다.
- App Check 초기화와 웹 제공자 등록 양식은 준비했다. 실제 사이트 키/API 설정은 Google Cloud 추가 약관의 명시 확인을 기다린다. API Marketplace의 사용 설정을 누르지 않았고, 서비스 계정/비밀도 만들지 않았다. [공식 제공자 안내](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)를 확인했으며 Spark 상태를 유료 사용 승인으로 해석하지 않는다.
- Cloudflare는 로그인 상태이나 이메일 미인증 안내가 남아 있었다. 새 확인 메일은 'Verification email sent'를 확인했다. 이전 확인의 Workers Free·결제수단 없음과 이번 이메일 인증 상태는 구분한다. D1/Worker는 생성하지 않았다.
- 실제 공개 웹 설정은 Git 제외 release.config.local.json에만 기록했다. 관리자 비밀/운영자 개인정보는 기록하지 않았다. 개인정보 확인 표시를 true로 바꾸지 않았다.

## 코드 검사

- 가입 검사·안내는 소문자/숫자 포함12~128자로 일치시켰다. 새 브라우저 회귀는 소문자/숫자가 없는 세 경우에 가입 HTTP 요청0개·오류 안내·비밀번호 제거, 최소 정상 입력의 가입 요청1개와 로그인 완료를 확인한다.
- 최초 검사는 환경의 Playwright Chromium 실행 파일 부재로 브라우저9개가 실행 실패했다(HTTP 검사1개만 통과). 공식 전용 Chromium을 workspace의 Git 제외 캐시에 설치한 뒤 재실행했다. 사용자 Chrome·운영 브라우저 세션과 분리했다.
- 개발 CLI의 현재 audit16 moderate에서 호환 패치 @hono/node-server2.1.5→2.1.8·hono4.13.14→4.13.18을 적용해14 moderate로 줄였다. firebase-tools15.34.2 및 운영 직접 의존성은 유지했다. --ignore-scripts만 사용했고 --force/CLI13.11.2 강제 다운그레이드는 하지 않았다. 잔여는 운영 번들 제외·localhost/합성 데이터·고정 명령/quiet 로그 경계로 관리하며 high/critical은0이다.
- 패치 뒤 Node22.23.4·node app-web/scripts/check.mjs: 단위/출시9·JWT/D1/API9·독립 Chromium10, 총28 PASS. production 두 HTML/보안 헤더 설정·Emulator 제외·Worker dry-run PASS. 실제 계정/운영 비밀은 테스트에 사용하지 않았다. 로컬 로그는 tmp/codex/WEB-05-check-final.log다.
- 웹앱/Worker audit 각0. 문서 링크/공백·독립 리뷰·원격 CI 결과는 최종 리뷰 기록과 실제 PR Checks를 따른다.

## 아직 실행하지 않은 것

Cloudflare 이메일 인증 완료·실제 D1/Worker·App Check 제공자 등록/관리 자격증명·Free CPU/DB·실제 가입/재설정 메일·Galaxy·공개 운영정보/개인정보 확정·최종 배포는 미완료다. Firebase 초기 설정만으로 다른 기기 서버 기록/탈퇴가 실제 운영에서 통과했다고 주장하지 않는다. PR #3과 병합 main의 이전27개 합성 검사는 이번 실제 운영 검사로 재사용하지 않는다.
