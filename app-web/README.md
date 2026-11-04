# 가자함 실제 웹앱 · WEB-01

설치 없이 URL로 여는 개인 장소 보관함이다. 기존 `web/` 카탈로그와 별도다. 이메일 가입/로그인, 게스트 보관, 명시적 계정 이동, 링크·장소·메모·방문·휴지통, 서버 개인 기록과 계정 삭제를 구현했다. 지도 SDK·자동 분석·공유·DM·광고는 아직 없다.

## 로컬 실행

Node22.12 이상(서버 배포 Node22), Java21 이상이 필요하다. 의존성 설치 시 스크립트는 실행하지 않는다.

```powershell
npm --prefix app-web ci --ignore-scripts
npm --prefix functions ci --ignore-scripts
npm --prefix tools/auth-emulator ci --ignore-scripts
node app-web/node_modules/@playwright/test/cli.js install chromium
```

서로 다른 터미널에서 저장소 루트를 기준으로 실행한다. demo 프로젝트는 운영 계정/실제 이메일 없이 동작하며 메모리의 가상 데이터만 사용한다. `quiet.cjs`는 인증 링크가 로그에 남지 않도록 공식 CLI 출력을 끈다.

```powershell
node -r ./tools/auth-emulator/quiet.cjs ./tools/auth-emulator/node_modules/firebase-tools/lib/bin/firebase.js emulators:start --only auth,firestore,functions --project demo-gajaham-web
npm --prefix app-web run dev:emulator
```

[로컬 웹앱](http://127.0.0.1:5183/)을 연다. 가상 이메일로 가입한 뒤 다른 브라우저에서도 같은 계정으로 로그인할 수 있다. Emulator를 종료하면 가상 서버 기록은 사라진다. 이 주소는 다른 휴대전화의 실사용 주소가 아니다. 서버 없이 `npm --prefix app-web run dev`로 실행하면 게스트 보관만 가능하다.

## 검사

```powershell
node app-web/scripts/check.mjs
# 이미 위 demo Emulator를 실행한 경우만:
node app-web/scripts/check.mjs --reuse-emulators
npm --prefix app-web audit
npm --prefix functions audit
```

검사는 단위5 + Rules1 + 서버/API3 + 브라우저8, production 번들·헤더 설정을 확인한다. v1 게스트 원본 보존, 삭제 뒤 과거 저장 재시도의 재생성 차단, 명시적으로 다시 확인한 게스트 재이동도 포함한다. `check-production.mjs`가 만든 번들은 가상 공개 설정을 쓰므로 배포용으로 재사용하지 않는다. 브라우저 검사 스크린샷과 보고서는 Git에서 제외한다. 개발 CLI의 남은 중간 위험도 의존성 경고는 운영 의존성과 구분하며 Emulator를 외부로 공개하거나 사용자 입력 패턴을 CLI에 넘기지 않는다.

## 실제 운영 준비

Firebase Hosting 기본 `프로젝트.web.app` 주소를 사용할 수 있어 별도 도메인 구매는 필수가 아니다. 현재 운영 Google 계정/프로젝트·실제 인증·App Check·배포는 미설정이다.

1. Firebase 프로젝트 연결과 Firestore Standard 리전 `asia-northeast3`를 확인한다. 배포 전 Functions의 Blaze 결제 연결·예산 알림·무료 할당량을 확인한다. 함수 최대2 인스턴스/최소0으로 시작하지만 월 과금 상한을 보장하지 않는다.
2. 이메일/비밀번호 인증과 이메일 열거 보호, 비밀번호 정책(영문·숫자12자 이상), 허용 정식 도메인만 설정한다. 이메일 템플릿의 발신/확인/재설정 링크를 실제 브라우저에서 검사한다. 초기 계정당5000건/UTF-8 2MiB·수명 누적 생성요청10만개(최초 중복 포함, 재시도 제외) 제한이며 이미지 업로드는 없다. 영구 삭제의 최소 요청 UUID는 원문 없이 계정 탈퇴까지 유지해 과거 재시도에 의한 재생성을 차단한다.
3. reCAPTCHA Enterprise 키의 허용 도메인과 App Check 등록을 확인한다. 운영 API는 App Check를 강제한다. debug 토큰/Emulator 옵션으로 이를 우회하지 않는다.
4. `.env.example`을 Git에서 제외된 `.env.production.local`로 복사한 뒤 Firebase의 공개 웹 설정·정식 origin·실제 문의처를 입력한다. 관리자 키를 넣지 않는다. 문의처가 없으면 개발 안내만 제공하며 임의의 실제 이메일 주소를 쓰지 않는다.
5. `node app-web/scripts/preflight.mjs`를 통과시키고 `npm --prefix app-web run build`로 실제 설정을 다시 빌드한다. 개인정보 처리방침·보존/삭제·국외 처리 안내, 비용·운영 연락처를 확인한다.
6. 구체적인 프로젝트·예산·배포 내용을 검토한 뒤 Auth/Rules/인덱스/TTL/Functions/Hosting을 배포한다. 이 저장소에서 계정 생성·유료 활성화·배포는 실행하지 않았다. TTL은 지연 정리 대상이며7일/2일의 정확한 물리 삭제 시각을 보장하지 않는다.
7. 운영 URL에서 두 독립 브라우저, Galaxy Samsung Internet/Chrome, 실메일·재설정·App Check·탈퇴·기존 토큰 거절·보안 헤더를 확인한다. 초기에는 사용자 파일 백업/시점 복구·영속 오프라인 계정 저장을 제공하지 않는다.

현재 `account/`의 옛 Android 인증 삭제 페이지만으로 웹 서버 기록 삭제를 완료 처리하면 안 된다. 웹앱의 설정→계정 탈퇴 경로를 사용한다. 운영에서 개인 기록 삭제 실패/지연을 감시하고, 재시도가 소진되면 서버의 `deleting` 작업을 확인·재개해야 한다. 문의처/처리방침과 실제 운영 검사 전 공개 출시 완료로 표시하지 않는다.
