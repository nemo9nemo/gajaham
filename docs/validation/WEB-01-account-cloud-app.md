# WEB-01 · 실제 개인 웹앱 검사

2026-11-03 Codex. 범위는 [브리프](../plans/WEB-01-account-cloud-app.md)·[결정0009](../decisions/0009-web-personal-api.md)다. 실제 운영 Google 계정·데이터는 사용하지 않았다. 가상 이메일/장소만 demo-gajaham-web 공식 Emulator에 생성했다.

## 실행 결과

- Node22.23.4(공식 배포 SHA256 확인)·Java21.0.13·Firebase CLI15.34.2, 배포 runtime nodejs22. 초기 Node24 검사와 최종 Node22 검사를 구분한다.
- `node app-web/scripts/check.mjs`: PASS. 단위4·Rules1·서버/API3·독립 Chromium 브라우저5 모두13건 통과, production 번들/헤더 설정 검사 통과. 최종 Node22·CLI15.34.2에서 공식 suite 자동 시작/종료도 확인했다. 운영 프로비저닝/배포는 하지 않았다.
- 기존 목업 `node --test --test-isolation=none "web/tests/*.test.mjs"`:164/164, 화면 정합58/58. Android 검사 재사용/재실행으로 웹 동작을 주장하지 않는다.
- `npm --prefix app-web audit --json`·`npm --prefix functions audit --json`: 운영/브라우저 각각0건. @grpc/grpc-js1.14.7, glob14.0.3, minimatch11.0.4 패치 버전을 override/lock에 고정하고 실제 Emulator/브라우저 흐름에서 호환성을 검사했다.
- 개발 전용 Firebase CLI는15.34.2 최신 패치와 안전한 audit fix 후 moderate16건이 남는다(높음/치명0). glob/minimatch·uuid·OpenTelemetry 등의 간접 의존성이며 운영 번들/서버에 포함하지 않는다. localhost demo 고정 명령/경로만 실행하고 실제 사용자 입력 패턴·외부 공개 Emulator·인증 링크 로그를 허용하지 않는다. 감사 제안의 구형 CLI 강등과 minimatch의 함수API를 바꾸는 전역 major override는 적용하지 않는다. 개발 도구 경고까지0건이라고 주장하지 않는다.

## 확인한 동작

| 항목 | 실제 증거 |
|---|---|
| 계정 저장·어디서든 재조회 | 브라우저A UI 가입→저장, 독립 컨텍스트B 로그인→동일2건·메모 조회/수정 |
| 자동 업로드 없음 | 게스트1건 후 로그인 서버0건, 명시적 계정 담기 후 서버1건·게스트 정리 |
| 격리·직접 공격 | 다른 UID 목록0건·타인 ID 수정not-found, guest/owner/other/admin-claim 직접 DB read/write 전부 Rules 거절, owner필드·잘못된 URL/API 입력 거절 |
| 만료·정지·삭제 토큰 | 만료 claims·disabled 계정401, 삭제 후 기존 토큰으로 개인 목록401 |
| 중복·동시 수정 | 두 생성 경합 중 같은 링크 한 건만 생성, 동일 요청 재시도revision 유지, 오래된 수정aborted·UI 충돌 안내 |
| 늦은 조회 | 옛 목록 응답을 지연하고 새 저장을 먼저 완료시킨 뒤 응답을 풀어도 새 기록 유지 |
| 영속 게스트·부분 정리 | IndexedDB 커밋/재조회·중복·수정 충돌·서버 업로드 뒤 로컬revision이 달라지면 원본 유지·만료 휴지통 정리 |
| 탈퇴 | 최근 인증·persistent pending·pending 쓰기 거절·원본/인증 정리·중복 cleanup, 두 영수증 동시 재요청의 허용된 요청 모두 완료, 실제 서버 트리거→영수증 결과deleted→UI 게스트 복귀 |
| XSS/링크 | `<img ... onerror>` 메모를 텍스트로만 표시·실행되지 않음, javascript/data/file/URL 자격증명 거절, 외부 링크noopener/noreferrer |
| 화면 | 실제 Chromium390×844·1440×960 스크린샷 시각 확인, 모바일 가로 넘침 없음 |
| 배포 코드 | production 번들에 demo ID/Emulator 연결 목적지·connectAuthEmulator 없음·소스맵 없음, CSP/프레임/타입 헤더 설정 검사 |

스크린샷·검사/의존성 보고서는 Git 제외 `tmp/codex/WEB-01-*`에 둔다. 이메일·토큰·영수증·본문을 검사 로그로 출력하지 않는다. Firebase CLI 자체의 인증 링크 출력은 quiet preload로 끈다.

## 아직 실행하지 않은 검사·실사용 전 남은 일

- 운영 프로젝트/Google 로그인·Blaze/예산·리전/TTL 적용·실제 App Check·이메일 열거 보호/비밀번호 정책·메일 인증/재설정·공개 Hosting/보안 헤더·실제 HTTPS 두 기기 검사.
- Galaxy Samsung Internet/Chrome 실기기, 사이트 데이터 삭제 후 실제 재로그인, 오프라인→재연결·OS 프로세스 종료·삭제 worker 장기 실패 복구 등 모든 AC 시나리오의 실기기/운영 증거. 로컬 테스트가 해당 완료를 뜻하지 않는다.
- 문의처/개인정보 처리방침은 사용자 준비 후 교체. 개발 안내만 넣었으며 실제 타인 이메일은 쓰지 않았다. 공개 preflight는 준비되지 않은 설정을 거절한다.
- 실제 지도·자동 장소 검색·상대 연결/공유·DM/AI·광고·운영 백업/PITR는 미구현이다. PWA 설치는 이용 조건이 아니다.

## 독립 리뷰

1차 읽기 전용 리뷰의 P2 네 건: 오래된 조회 덮어쓰기, 정상 목록의 과도한 호출 단위, pending 재요청이 worker를 재시작하지 않음, 재인증/폴링 후 세대 확인 누락. 조회 세대·서버 확인 응답의 메모리 반영·요청당1단위·deletionRetryAt·세션/epoch 재검사로 수정했다. 2차에서 영수증 분실 뒤 새 확인 정보로 재개·최신 배열 완료 트랜잭션·이미deleted 응답 즉시 처리를 대조했고 최종 APPROVED. 리뷰는 읽기 전용이며 직접 검사 재실행/운영 호출은 하지 않았다. 최종 SHA 검사는 별도 worktree·장부를 따른다.
