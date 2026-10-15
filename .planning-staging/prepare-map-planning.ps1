$ErrorActionPreference = 'Stop'
$workspacePath = 'C:\Users\love0\nemo9Dev\gajaham'
$sourceDirectory = 'C:\Users\love0\Documents\Codex\2026-10-10\dm'
$stagingDirectory = Join-Path $workspacePath '.planning-staging'
$backupDirectory = Join-Path $stagingDirectory 'originals'
[System.IO.Directory]::CreateDirectory($backupDirectory) | Out-Null
$utf8Encoding = [System.Text.UTF8Encoding]::new($false)
$documentNames = @('product-plan-2026-10-11.md','version-roadmap-2026-10-10.md','market-research-2026-10-10.md')
$documentTexts = @{}
$documentManifest = @()
foreach ($documentName in $documentNames) {
    $sourcePath = Join-Path $sourceDirectory $documentName
    $originalHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
    Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $backupDirectory $documentName)
    $documentTexts[$documentName] = [System.IO.File]::ReadAllText($sourcePath).Replace("`r`n","`n")
    $documentManifest += [pscustomobject]@{Name=$documentName;SourcePath=$sourcePath;OriginalHash=$originalHash;StagedPath=(Join-Path $stagingDirectory $documentName)}
}
function Replace-ExactlyOnce([string]$documentText,[string]$oldText,[string]$newText) {
    $matchCount = [regex]::Matches($documentText,[regex]::Escape($oldText)).Count
    if ($matchCount -ne 1) { throw "Expected one match, found $matchCount for: $oldText" }
    return $documentText.Replace($oldText,$newText)
}
function Replace-Section([string]$documentText,[string]$startHeading,[string]$endHeading,[string]$replacement) {
    $startIndex = $documentText.IndexOf($startHeading,[StringComparison]::Ordinal)
    $endIndex = $documentText.IndexOf($endHeading,$startIndex + $startHeading.Length,[StringComparison]::Ordinal)
    if ($startIndex -lt 0 -or $endIndex -lt 0) { throw "Section not found: $startHeading" }
    return $documentText.Substring(0,$startIndex) + $replacement.TrimEnd() + "`n`n" + $documentText.Substring($endIndex)
}

$productText = $documentTexts['product-plan-2026-10-11.md']
$productText = Replace-ExactlyOnce $productText '# 가자함 (Gajaham) — 커플 장소 보관·선택 서비스 기획서' '# 가자함 (Gajaham) — 개인·공유 장소 보관·선택 서비스 기획서'
$productText = Replace-ExactlyOnce $productText '> **서비스 계정에 DM으로 보내면, 둘이 가자고 했던 곳과 추천 메뉴가 지도에 모인다.**' '> **서비스 계정에 DM으로 보내면, 가고 싶은 곳과 추천 메뉴가 내가 선택한 개인·공유 지도에 모인다.**'
$productText = Replace-ExactlyOnce $productText '| 문서 버전 | 0.2 — 서비스명·영문 표기 반영 |' '| 문서 버전 | 0.3 — 개인 맵·코드 연결·맵 간 복제·저장 위치 선택 반영 |'
$productText = Replace-ExactlyOnce $productText '| 초기 고객 | 인스타그램으로 맛집·카페·놀거리 게시물을 자주 주고받는 커플 |' '| 초기 고객 | 인스타그램 장소를 모으는 개인과 이를 함께 고르는 커플. 초기 외부 베타는 커플 중심 |'
$productText = Replace-ExactlyOnce $productText '| 첫 제공 형태 | 인스타그램 서비스 계정으로 DM 수집 + 모바일 웹 |' '| 첫 제공 형태 | 인스타그램 DM 수집 + 모바일 웹, 개인 맵과 코드로 연결한 2인 공유 맵 |'
$productText = Replace-ExactlyOnce $productText '## 1. 제품 방향과 요구사항' @'
**2026-10-12 추가 요구:** 개인 맵을 유지하면서 코드로 두 사람을 연결해 공유 맵을 만든다. 연결할 때 개인 장소를 복제하지 않거나 선택·전체 복제를 고를 수 있고, 이후에도 개인↔공유 맵 사이에 복제할 수 있다. 신규 등록 위치도 선택한다. 이 요구는 기존의 사용자당 활성 공간 1개 제안을 대체한다. 초기 맵 개수·기본값·복제 상세 정책은 아래의 기획 제안으로 구분한다.

## 1. 제품 방향과 요구사항
'@
$productText = Replace-ExactlyOnce $productText '| 사용자 요구 | 연인과 공유한 장소를 함께 관리한다. |' @'
| 사용자 요구 | 개인 맵을 독립적으로 사용하고 연인과 공유한 장소를 함께 관리한다. |
| 사용자 요구 | 코드로 두 사람을 연결해 공유 맵을 만들고, 연결 때 개인 장소의 복제 여부·범위를 선택한다. |
| 사용자 요구 | 연결 이후에도 개인 맵과 공유 맵 사이에 장소를 복제할 수 있다. |
| 사용자 요구 | 신규 장소를 등록할 맵을 선택할 수 있다. |
'@
$productText = Replace-ExactlyOnce $productText '| 기획 제안 | 초기에는 국내 장소와 2인 비공개 공간에 집중한다. |' '| 기획 제안 | 초기에는 국내 장소, 사용자당 개인 맵 1개와 활성 공유 맵 1개, 공유 맵 최대 2명으로 시작한다. |'
$productText = Replace-ExactlyOnce $productText '주로 한 사람이 장소를 발견해 보내는 커플도 포함한다. 한 명이 먼저 저장해도 바로 가치가 있어야 하며, 상대방의 가입과 DM 연결을 첫 저장의 필수 조건으로 두지 않는다.' '개인 사용만으로도 장소 보관·재조회가 가능해야 한다. 주로 한 사람이 장소를 발견해 보내는 커플도 포함하고 상대방 가입을 첫 저장의 필수 조건으로 두지 않는다. 두 사람이 이미 각각 개인 맵을 사용하고 있어도 코드로 연결할 수 있으며, 연결 후 개인 맵과 공유 맵을 함께 유지한다. 초기 커플 베타에서는 개인 이용과 공동 이용 지표를 구분한다.'
$productText = Replace-ExactlyOnce $productText '3. 사용자는 자신의 연결 요청을 확인하고 비공개 공간을 만든다. 연결 전 입력은 다른 사람에게 보이지 않는 임시 접수 상태로 둔다.' '3. 사용자는 자신의 DM 계정 연결을 확인하고 개인 맵을 만든다. 계정 연결 전 입력은 본인 확인 전까지 비공개 임시 접수 상태로 둔다. 최초 저장 대상은 개인 맵을 기본으로 제안한다.'
$productText = Replace-Section $productText '### 3.2 두 사람이 같은 공간 사용' '### 3.3 주말에 장소 고르기' @'
### 3.2 코드 연결과 개인·공유 맵

1. 먼저 이용한 사람이 `함께 쓰기`에서 연결 코드를 만들고 상대방에게 전달한다.
2. 상대방은 로그인 후 코드를 입력하고 연결할 사용자를 확인한다. 개인 맵이 이미 있어도 그대로 연결할 수 있다.
3. 연결 완료 시 두 사람의 공유 맵을 만들고 각자의 개인 맵을 유지한다.
4. 각자는 자신의 개인 장소를 `지금 복제 안 함 / 선택한 장소 복제 / 전체 장소 복제` 중에서 고른다. 상대방의 개인 장소는 공개되지 않는다.
5. 복제 미리보기에서 대상 맵과 포함할 메모·사진을 확인한 뒤 실행한다. 선택하지 않은 개인 기록은 개인 맵에 남고, 원래 장소는 복제 후에도 유지한다.
6. 이후 개인 맵과 공유 맵을 전환하며 각각 저장·조회한다. 상대방도 DM으로 등록하려면 서비스 계정에 직접 메시지를 보내 본인 계정을 별도로 연결한다.

연결 코드는 만료·취소·사용 완료 상태를 갖고 재발급 시 이전 코드를 무효화한다. 로그인과 연결 대상 확인을 거친다. 이미 활성 공유 맵이 있으면 기존 연결을 안내하고 새 연결로 자동 교체하지 않는다. 코드 연결은 공유 맵 참여를 위한 기능이며 인스타그램 DM 발신자 확인은 만료되는 일회용 토큰 등 별도 수단으로 검증한다. 타인의 인스타그램 아이디 입력만으로 연결하지 않는다.

**기존 연인 간 개인 DM 전체 읽기, 과거 대화 자동 가져오기, 커플 그룹 DM에 봇을 넣는 방식은 초기 범위에 포함하지 않는다.** 서비스 계정에 각자가 개별 전달하는 흐름을 검증한다. Meta의 공식 메시징 문서는 프로 계정 중심이며, 공유 게시물 URL 수신과 그 콘텐츠 전체 접근은 별도 문제다. [S7]
'@
$productText = Replace-ExactlyOnce $productText '1. 두 사람이 저장한 장소를 지도나 목록에서 다시 연다.' '1. 공유 맵에 저장한 장소를 지도나 목록에서 다시 연다. 개인 장소를 후보에 넣으려면 공유할 내용을 확인하고 공유 맵에 복제한다.'
$productText = Replace-ExactlyOnce $productText 'V0.8부터 지원하는 블로그 URL을 같은 서비스 계정의 DM으로 보내거나 웹에 붙여넣는다. 기존 장소와 같은 지점이면 새 핀을 만드는 대신 참고 글을 추가한다. 장소를 특정할 수 없거나 읽을 수 없는 글은 링크를 남기고 보완 입력을 요청한다.' 'V0.8부터 지원하는 블로그 URL을 같은 서비스 계정의 DM으로 보내거나 웹에 붙여넣고 등록할 맵을 선택한다. 선택한 맵 안에서 기존 장소와 같은 지점이면 참고 글을 추가한다. 읽을 수 없는 글도 선택한 맵에 링크를 남기고 보완 입력을 요청한다. 다른 맵에 같은 장소가 있다고 자동 공유하지 않는다.'
$productText = Replace-ExactlyOnce $productText '## 4. 첫 베타의 범위' @'
### 3.5 등록 위치 선택과 이후 복제

- 신규 저장은 `개인 맵 / 공유 맵 / 둘 다` 중에서 선택하는 안을 제안한다. 연결 전에는 개인 맵에 저장한다.
- 웹 URL 입력은 현재 맵을 기본으로 표시하고 등록 전에 변경할 수 있다. DM은 사용자별 기본 저장 위치를 사용하며 최초 기본값은 개인 맵이다. 설정에서 공유 맵 또는 둘 다로 바꿀 때 이후 전달 장소의 공개 범위를 안내한다.
- 개별 DM 항목의 대상은 접수 안내의 웹 처리 화면에서 등록 전에 변경할 수 있다. 이미 완료된 항목은 다른 맵에 복제한다. 기본값 변경은 이후 접수 건에 적용하고, 처리 중 항목은 그 항목에서 명시적으로 대상을 바꾼다. 웹의 현재 맵 변경이 DM 기본값을 바꾸지는 않는다.
- 연결 시점 이후에도 개인→공유, 공유→내 개인 맵으로 카드 1개·선택한 장소·전체 장소를 복제할 수 있다. 원래 항목은 유지하며 복제 후 수정·삭제·메모·방문 상태는 각 맵에 별도로 적용한다.
- 장소·요약·메뉴·원본·근거를 복제하고 개인 메모·업로드 사진·개인 방문 기록은 포함 여부를 선택한다. 개인 기록을 공유 맵에 복제할 때 해당 추가 항목은 기본 선택 해제한다. 전체 장소 복제에도 같은 확인을 적용한다.
- 대상 맵에 같은 지점이 있으면 출처를 추가하고 기존 사용자 수정·메모를 보존한다. 다른 지점은 분리하고 미확정 장소는 미확정 상태로 복제한다. 이미 분석한 결과의 복제에는 재분석을 요구하지 않는다.
- `둘 다` 저장과 대량 복제는 맵별 완료·실패를 안내한다. 저장 전 권한을 다시 확인하며 공유 맵 권한이 종료된 진행 작업은 개인 처리함에서 대상 변경을 요청한다.

## 4. 첫 베타의 범위
'@
$productText = Replace-ExactlyOnce $productText '| P0 | DM 수신·계정 연결 | 허용된 입력을 해당 사용자의 공간에 연결하고 접수 상태를 확인할 수 있다. |' '| P0 | DM 수신·계정 연결 | DM 발신자를 본인 계정에 연결하고 선택한 저장 대상과 접수 상태를 확인할 수 있다. |'
$productText = Replace-ExactlyOnce $productText '| P0 | 2인 비공개 공간 | 초대·수락·취소·나가기와 접근 권한 검증이 동작한다. |' @'
| P0 | 개인 맵·코드 연결 공유 맵 | 각자의 개인 맵을 유지하면서 코드 생성·입력·확인·취소·나가기와 맵별 권한 검증이 동작한다. |
| P0 | 초기 및 이후 맵 간 복제 | 연결 시 안 함·선택·전체 복제를 고르고, 이후에도 개인↔공유 맵 복제가 가능하다. 원본·사용자 수정·비공개 범위가 보존된다. |
| P0 | 등록 위치·DM 기본값 | 개인·공유·둘 다 중에서 선택하고, DM 기본값과 항목별 대상을 관리하며 실제 등록한 맵을 확인할 수 있다. |
'@
$productText = Replace-ExactlyOnce $productText '| 시작·공간 연결 | 서비스 설명, DM 연결, 공간 만들기·초대 수락 | 첫 링크 저장, 인스타 연결. 상대방이 없어도 개인 저장 시작 |' @'
| 시작·연결 | 서비스 설명, 개인 맵 시작, DM 연결, 공유 연결 코드 생성·입력 | 첫 링크 저장, 본인 확인, 연결 대상 확인 |
| 초기 복제·다른 맵에 복제 | 복제 안 함·선택·전체, 대상 맵, 포함할 메모·사진, 결과 | 초기 선택, 나중에 다시 복제, 실패 항목 재처리 |
| 링크 등록 | 링크·저장 대상·공유 범위 | 개인·공유·둘 다 선택 후 등록 |
'@
$productText = Replace-ExactlyOnce $productText '| 우리 지도·목록 | 지도/목록 전환, 맛집·카페·놀거리, 지역·장소명 검색, 방문 여부, 보낸 사람 | 카드 열기, 필터. 저장 항목이 없으면 DM 보내기 안내 |' '| 개인·공유 지도와 목록 | 개인/공유 맵 및 지도/목록 전환, 카테고리·검색·방문·보낸 사람 | 카드 열기, 선택·전체 복제, 현재 맵에 저장 |'
$productText = Replace-ExactlyOnce $productText '| 처리함 | 분석 중·확인 필요·실패 항목과 원본 | 장소 선택, 본문·캡처 보완, 재시도, 삭제 |' '| 처리함 | 분석 중·확인 필요·실패 항목과 원본·저장 대상 | 등록 전 대상 변경, 장소 선택, 보완, 재시도, 삭제 |'
$productText = Replace-ExactlyOnce $productText '| 장소 상세 | 대표 이미지 또는 대체 카드, 장소·지점·주소, 요약, 메뉴, 출처, 메모, 관심·방문 상태 | 위치 수정, 후보 추가, 원본 열기, 길찾기 |' '| 장소 상세 | 현재 맵, 이미지 또는 대체 카드, 장소·주소·요약·메뉴·출처·메모·상태 | 다른 맵에 복제, 위치 수정, 공유 후보 추가, 원본·길찾기 |'
$productText = Replace-ExactlyOnce $productText '| 공간·설정 | 구성원, 초대 상태, DM 연결, 데이터 내보내기, 공유 종료·탈퇴 | 초대 취소, 연결 해제, 공간 나가기, 기록 삭제 |' '| 맵·설정 | 구성원, 연결 코드 상태, DM 연결·기본 저장 대상, 내보내기·공유 종료·탈퇴 | 코드 취소, 저장 기본값 변경, 맵 나가기, 기록 삭제 |'
$productText = Replace-ExactlyOnce $productText '> **우리 메모:** 서울숲 산책하고 가기  ' "> **등록 맵:** 우리 공유 맵  `n> **우리 메모:** 서울숲 산책하고 가기  "
$productText = Replace-ExactlyOnce $productText '> **행동:** 가고 싶어 / 이번 약속 후보 / 위치 수정 / 원본 / 길찾기' '> **행동:** 가고 싶어 / 이번 약속 후보 / 다른 맵에 복제 / 위치 수정 / 원본 / 길찾기'
$productText = Replace-ExactlyOnce $productText '| 링크를 받았지만 계정 연결 전 | 연결 안내 | 임시 접수로 유지하고 공간 연결 후 처리 |' '| 링크를 받았지만 계정 연결 전 | 연결 안내 | 비공개 임시 접수로 유지하고 본인 확인·저장 대상 확인 후 처리 |'
$productText = Replace-ExactlyOnce $productText '| 같은 링크 재전달 | 기존 카드로 이동 | 중복 카드 생성 없이 새 전달 기록만 연결 |' '| 같은 링크 재전달 | 선택한 맵의 기존 카드로 이동 | 동일 맵 안의 중복 생성 방지. 다른 맵에는 선택에 따라 별도 저장 |'
$productText = Replace-ExactlyOnce $productText '| 다른 글이 같은 지점을 소개 | 기존 장소에 새 출처 표시 | 출처 추가, 사용자 메모 보존 |' '| 다른 글이 같은 지점을 소개 | 선택한 맵의 기존 장소에 새 출처 표시 | 해당 맵에 출처 추가, 사용자 메모·수정 보존 |'
$productText = Replace-ExactlyOnce $productText '| 처리 지연 또는 회신 제한 | 웹 처리함에서 상태 확인 | 회신 가능한 범위에서만 DM 응답, 작업 중복 방지 |' @'
| 처리 지연 또는 회신 제한 | 웹 처리함에서 상태 확인 | 회신 가능한 범위에서만 DM 응답, 작업 중복 방지 |
| 분석 중 공유 맵 권한 종료 | 개인 처리함에서 저장 위치 확인 | 종료된 맵으로 저장하지 않고 대상 변경 요청 |
| 둘 다 저장·복제의 일부 실패 | 맵별 완료·실패 표시 | 완료된 대상은 유지하고 실패한 대상만 재처리 |
'@
$productText = Replace-ExactlyOnce $productText '    C --> D[링크 정규화·중복 확인·출처 판별]' "    C --> M[개인·공유 저장 대상과 권한 확인]`n    M --> D[링크 정규화·맵별 중복 확인·출처 판별]"
$productText = Replace-ExactlyOnce $productText '    I --> J[공동 공간의 장소·출처 저장]' '    I --> J[선택한 개인·공유 맵에 장소·출처 저장]'
$productText = Replace-ExactlyOnce $productText '    J --> L[지도·장소 카드·함께 고르기]' "    J --> L[맵 전환·장소 카드·공유 맵에서 고르기]`n    L --> N[권한·복제 범위 확인]`n    N --> J"
$productText = Replace-ExactlyOnce $productText '| 공간·참여자 | 비공개 공간, 최대 2명, 권한·초대 상태 | 커플 간 데이터 분리와 공유 종료 |' @'
| 맵·참여자 | 개인/공유 종류, 개인 소유자, 공유 참여자 최대 2명, 권한·연결 상태 | 개인 비공개와 공유 범위 분리 |
| 공유 연결 코드 | 발급 사용자, 만료·취소·사용 완료 상태, 연결 대상 | 두 사용자 연결과 잘못된 연결 방지 |
| 사용자 저장 설정 | 개인·공유·둘 다의 DM 기본 저장 대상 | 신규 DM의 등록 위치 결정 |
'@
$productText = Replace-ExactlyOnce $productText '| 수신·처리 작업 | 발신자, 수신 경로, 원본·정규화 URL, 처리 상태, 실패 이유 | 중복 방지·재시도·품질 측정 |' '| 수신·처리 작업 | 발신자, 경로, URL, 선택한 대상 맵, 대상별 상태·실패 이유 | 저장 위치 고정·권한 확인·부분 실패 처리 |'
$productText = Replace-ExactlyOnce $productText '| 공간의 저장 장소 | 공간, 장소, 저장자, 카테고리·메모·방문 상태 | 공용 장소 정보와 커플의 사적 기록 분리 |' '| 맵의 저장 장소 | 맵, 장소, 저장자, 출처 연결, 사용자 수정·카테고리·메모·방문 상태 | 공통 장소와 맵별 기록·독립 복제 분리 |'
$productText = Replace-ExactlyOnce $productText '| 관심·약속 | 각자의 관심, 후보, 최종 선택, 선택 시각 | 실제 공동 선택과 재사용 측정 |' @'
| 관심·약속 | 공유 맵, 각자의 관심, 후보, 최종 선택, 선택 시각 | 실제 공동 선택과 재사용 측정 |
| 맵 간 복제 기록 | 원 항목·대상 항목, 복제자·시각, 포함한 정보·결과 | 반복 복제 중복 방지와 복제 이력 |
'@
$productText = Replace-Section $productText '## 8. 공동 공간과 기록 관리' '## 9. 버전별 확장 계획' @'
## 8. 개인·공유 맵과 기록 관리

- 사용자당 개인 맵 1개와 활성 공유 맵 1개, 공유 맵 최대 2명을 초기안으로 한다. 개인 맵은 연결 후에도 유지하며 본인만 접근한다.
- 코드 연결이 완료되면 공유 맵을 만들고 각자가 초기 복제 여부·범위를 고른다. 상대의 개인 맵을 열거나 대신 복제할 수 없다.
- 개인 맵은 본인이 편집하고 공유 맵은 두 참여자가 추가·수정·삭제할 수 있다. 관심은 각자 관리하며 저장자·수정자·삭제자·복제자를 구분한다.
- 이후에도 개인→공유, 공유→내 개인 맵으로 1개·선택·전체 복제를 제공한다. 원 항목을 유지하고 복제 후 수정·삭제·상태는 각 맵에 별도로 적용한다.
- 장소·내용·원본·근거를 복제하며 개인 메모·사진·방문 기록은 선택한다. 공유 맵으로 개인 기록을 복제할 때 추가 항목은 기본 선택 해제한다. 대상의 기존 수정·메모는 보존한다.
- 같은 지점은 맵 안에서 중복 핀을 만들지 않고 출처를 보강한다. 위치 미확정 항목은 같은 상태로 복제하며 기존 분석 결과를 재사용한다.
- 웹 등록 대상과 DM 기본 저장 대상은 구분한다. 최초 DM 기본값은 개인 맵이며 개인·공유·둘 다를 설정할 수 있다. 기본값 변경은 이후 접수 건에 적용한다.
- 처리 중 저장·복제는 완료 직전 대상 권한을 다시 확인한다. 공유 권한이 종료되면 개인 처리함에서 대상 변경을 요청하고, 둘 다 중 일부 실패는 맵별 결과로 표시한다.
- 일반 삭제는 해당 맵 휴지통에서 복구한다. 다른 맵의 복제본은 유지한다. 영구 삭제·탈퇴·보관 기간은 일반 항목 삭제와 구분하여 베타 수집 전에 안내한다.
- 나가기는 본인의 공유 맵 접근을 종료한다. 개인 맵과 이미 개인 맵에 복제한 기록은 유지한다. 종료 전에 권한 있는 공유 장소를 개인 맵에 복제할 선택을 제공하고, 나간 뒤에는 옛 링크로 복제할 수 없다.
- 남은 참여자의 공유 기록은 기록 관리 정책에 따라 보존한다. 새 상대와 연결할 때는 새로운 공유 맵을 만들며 이전 기록을 자동 공개하지 않는다. 마지막 참여자의 나가기·탈퇴와 공유 맵 보관은 별도 정책으로 정한다.
- 공유 종료로 DM 기본 대상이 유효하지 않으면 개인 맵으로 바꾸고 안내한다. 본인의 공간 연결이 끝나도 다른 사람의 계정 연결은 변경하지 않는다.
- 연결 코드는 만료·취소·사용 완료 상태를 갖는다. 코드·DM 결과 링크 모두 본인과 대상 맵 권한을 확인하며 URL을 아는 것만으로 기록을 열 수 없다.
- 내보내기는 접근 가능한 맵의 장소명·주소·메모·원본 URL·상태 등부터 제공한다. 외부 원본 미디어의 다운로드·영구 보관을 약속하지 않는다.

실제 베타 데이터 수집 전에 기존 개인 맵이 있는 두 사람의 코드 연결, 초기 및 이후 복제, 저장 대상·기본값, 연결 종료와 진행 작업의 권한을 확인한다. 실패 진단에는 원문 전체를 불필요하게 장기 보관하지 않는다.
'@
$productText = Replace-ExactlyOnce $productText '| V0.1 — 기본 저장 | 보낸 장소를 다시 찾기 | DM·웹 접수, 지도·목록, 기본 카드, 2인 공간, 수정·실패 처리 | 두 사람이 자신의 링크를 저장하고 다시 조회 가능 |' '| V0.1 — 개인·공유 저장 | 선택한 맵에 저장하고 다시 찾기 | DM·웹, 개인 맵, 코드 연결 공유 맵, 초기·이후 복제, 저장 대상, 기본 카드·수정 | 개인 기록을 유지하며 권한에 맞게 등록·복제·조회 가능 |'
$productText = Replace-ExactlyOnce $productText '### 10.2 V0.5: 20커플, 4주 베타' @'
**맵 연결·복제의 베타 진입 확인:** 기존 개인 맵이 있는 두 사람이 코드로 연결하고 각자 안 함·선택·전체 복제를 고를 수 있어야 한다. 연결 후 양방향 복제, 신규 저장 대상 선택, 반복 복제 중복 방지, 개인 메모의 선택 공유, 복제 후 수정·삭제 분리, 연결 종료 중 진행 작업, 맵별 부분 실패를 확인한다. 상대방 개인 맵은 조회되지 않아야 한다.

### 10.2 V0.5: 20커플, 4주 베타
'@
$productText = Replace-ExactlyOnce $productText '- 최초 유입 경로, 초대 수락 여부, 중도 이탈 이유.' '- 최초 유입 경로, 코드 연결 완료, 초기·이후 복제와 등록 위치 선택, 개인 이용·공동 이용, 중도 이탈 이유.'
$productText = Replace-ExactlyOnce $productText '기록 조회·수정·내보내기는 과금 변경 후에도 사용자가 자신의 기록을 다룰 수 있도록 설계한다.' '개인 맵의 무료 범위와 커플 요금제의 공유 맵 혜택은 구분해 검증한다. 이미 분석한 결과의 맵 간 복제와 신규 콘텐츠 분석은 비용 단위도 구분한다. 기록 조회·수정·내보내기는 과금 변경 후에도 사용자가 자신의 기록을 다룰 수 있도록 설계한다.'
$productText = Replace-ExactlyOnce $productText '3. 저장 결과를 확인한 뒤 연인 초대를 제안한다. 첫 화면에서 두 사람의 동시 가입을 요구하지 않는다.' '3. 개인 맵의 저장 결과를 확인한 뒤 코드로 함께 쓰기를 제안한다. 연결 때 개인 장소의 복제 범위를 각자 선택하며 첫 화면에서 두 사람의 동시 가입을 요구하지 않는다.'
$productText = Replace-ExactlyOnce $productText '| 계정 인증·초대·보관 기간 | 간단한 가입, 일회용 초대, 데이터 관리 안내 | 실제 베타 데이터 수집 전 |' '| 계정·맵 연결·복제·저장 대상 | 개인 맵 유지, 일회용 연결 코드, 선택 복제·독립 기록·저장 기본값 | V0.1 구현 전 상세 결정, 실제 베타 수집 전 검증 |'
$documentTexts['product-plan-2026-10-11.md'] = $productText

$roadmapText = $documentTexts['version-roadmap-2026-10-10.md']
$roadmapText = Replace-ExactlyOnce $roadmapText '두 사람은 각각 서비스 계정에 최초 메시지를 보내 같은 비공개 공간에 연결한다. 이후 각자가 전달한 게시물이 같은 지도에 모인다.' '각자 서비스 계정에 최초 메시지를 보내 DM 발신자를 확인한다. 개인 맵을 유지하면서 코드로 두 사람을 연결해 별도 공유 맵을 만들고, 새 전달 항목은 사용자가 정한 개인·공유 맵에 저장한다.'
$inputSeparationPrefix = @'
**처음부터 ‘받는 경로’와 ‘읽는 콘텐츠’를 분리한다.**
'@
$roadmapText = Replace-ExactlyOnce $roadmapText $inputSeparationPrefix @'
**10월 12일 추가 요구: 개인 맵과 코드 연결 공유 맵을 함께 제공한다.** 연결할 때 각자 개인 장소를 복제 안 함·선택·전체 중에서 고르고, 이후에도 개인→공유 또는 공유→내 개인 맵으로 복제할 수 있다. 신규 장소의 등록 맵도 선택한다. 초기안은 개인 맵 1개와 활성 2인 공유 맵 1개다. 원래 장소는 유지하고 복제 후 수정·삭제·메모·상태는 맵별로 관리한다. 최초 DM 저장 기본값은 개인 맵으로 제안하며 설정에서 공유 맵 또는 둘 다로 바꿀 수 있다. 이 기능은 V0.1부터 첫 베타의 필수 범위에 포함한다.

**처음부터 ‘받는 경로’와 ‘읽는 콘텐츠’를 분리한다.**
'@
$roadmapText = Replace-ExactlyOnce $roadmapText '저장 정보에는 수신 경로, 콘텐츠 출처, 원본 URL, 보낸 사람, 공동 공간, 처리 상태를 구분해서 남긴다.' '저장 정보에는 수신 경로, 콘텐츠 출처, 원본 URL, 보낸 사람, 선택한 대상 맵, 대상별 처리 상태를 남긴다. 개인·공유 맵별 저장 항목과 복제 이력을 나눠 사용자 수정·메모·상태의 독립성을 유지한다.'
$roadmapText = Replace-ExactlyOnce $roadmapText '우선 국내 장소와 연인 두 명의 비공개 공간을 기준으로 한다.' '우선 국내 장소, 개인 맵, 코드로 연결한 두 사람의 비공개 공유 맵을 기준으로 한다.'
$roadmapText = Replace-ExactlyOnce $roadmapText '| V0.1 — 둘만의 지도 | DM으로 보낸 장소를 다시 찾을 수 있음 | 서비스 계정으로 전달, 접수 답장·결과 링크, 기본 요약·추천 메뉴, 웹 지도·목록, 2인 공유, 위치 수정 | 둘 다 직접 전달하고 지도에서 다시 찾아 실제 외출에 사용 |' '| V0.1 — 나의 지도와 우리 지도 | 보낸 장소를 선택한 맵에서 다시 찾음 | DM·웹, 개인 맵, 코드 연결 공유 맵, 초기·이후 복제, 저장 위치 선택, 기본 카드·위치 수정 | 개인 기록을 유지하며 등록·복제·조회하고 실제 외출에 사용 |'
$roadmapText = Replace-ExactlyOnce $roadmapText '| V0.5 — 기억나는 장소 카드 | 왜 저장했는지 원본을 다시 보지 않아도 알 수 있음 | 이미지·요약 카드, 복수 장소, 중복 정리, 추출 근거, 추가 입력 경로 | 저장과 정보 보정의 번거로움이 줄고 원본 재시청이 감소 |' '| V0.5 — 기억과 공동 선택 | 저장 이유를 기억하고 둘의 후보를 고름 | 카드·추출 근거·중복 정리, 개인 관심, 수동 후보 최대 3곳과 최종 선택 | 원본 재시청·선택 부담이 줄고 공동 사용이 반복됨 |'
$roadmapText = Replace-ExactlyOnce $roadmapText '| V1.0 — 오늘 어디 갈까 | 둘의 후보를 빠르게 좁힐 수 있음 | 각자 관심 표시, 공통 관심, 지역·예산·시간 조건, 후보 비교와 확정 | 장소 결정 시간이 줄고 주말마다 다시 사용 |' '| V1.0 — 오늘 어디 갈까 | 조건에 맞는 후보를 빠르게 좁힘 | 공통 관심과 지역·예산·시간 조건별 자동 추천, 후보 비교·확정 보강 | 장소 결정 시간이 줄고 주말마다 다시 사용 |'
$roadmapText = Replace-ExactlyOnce $roadmapText '- 초대 링크로 두 사람이 같은 공간을 사용한다. 추가·수정·삭제와 초대 취소·공유 종료의 동작을 정한다.' @'
- 개인 맵을 유지하며 코드로 두 사람의 공유 맵을 연결한다. 연결 시 개인 장소의 복제 안 함·선택·전체를 고르고 나중에도 양방향 복제한다. 장소·원본·근거는 보존하고 개인 메모·사진의 공유 여부는 별도로 고른다.
- 신규 등록의 개인·공유·둘 다 선택과 사용자별 DM 기본 저장 위치를 제공한다. 완료 결과는 실제 저장한 맵을 표시하고, 처리 중 권한 종료와 둘 다의 일부 실패는 대상별로 안내한다.
- 같은 지점의 반복 복제는 중복 핀을 만들지 않고 대상의 기존 수정·메모를 보존한다. 원 항목과 복제본의 수정·삭제·방문 상태는 맵별로 관리한다. 코드 취소·공유 종료 후 개인 맵과 개인 복제본을 유지한다.
'@
$roadmapText = Replace-ExactlyOnce $roadmapText '화면은 지도·목록, 장소 상세 카드, 링크 추가, 초대·설정으로 시작한다. 최초 DM에서 제공하는 연결 경로로 각자의 계정과 공동 공간을 확인하고, 이후에는 인스타에서 서비스 계정으로 전달해 저장한다.' '화면은 개인/공유 맵 전환, 지도·목록, 상세 카드, 등록 위치 선택, 연결 코드, 초기 및 이후 복제, 설정으로 시작한다. 최초 DM에서 본인 계정을 확인하고 저장 기본값을 정한다. 공유 맵 참여는 코드로 별도 연결하며 이후 전달 항목은 선택한 대상에 저장한다.'
$roadmapText = Replace-ExactlyOnce $roadmapText 'V1.0의 후보 선택은 클릭 가능한 화면으로 먼저 검증한다.' '관심·수동 후보·최종 선택은 V0.5에서 검증하고 조건별 자동 추천은 V1.0에서 확장한다.'
$roadmapText = Replace-ExactlyOnce $roadmapText 'DM으로 인스타 게시물 저장, 기본 메뉴·요약, 둘만의 지도, 이해하기 쉬운 카드와 위치 보정까지가 첫 묶음이다.' 'DM 저장과 등록 위치 선택, 개인·공유 맵과 코드 연결, 초기 및 이후 복제, 기본 카드·위치 보정과 수동 공동 선택까지가 첫 묶음이다.'
$documentTexts['version-roadmap-2026-10-10.md'] = $roadmapText

$marketText = $documentTexts['market-research-2026-10-10.md']
$marketText = Replace-ExactlyOnce $marketText '문서 수정: 2026-10-12(서비스명 반영).' '문서 수정: 2026-10-12(서비스명·개인/공유 맵 요구 반영).'
$marketText = Replace-ExactlyOnce $marketText '대상 서비스: **가자함 (Gajaham)** — 연인과 공유한 맛집·카페·놀거리 링크를 지도에 표시하고, 게시물 이미지·요약·추천 메뉴를 함께 저장하는 서비스.' '대상 서비스: **가자함 (Gajaham)** — 개인이 모은 맛집·카페·놀거리 링크를 개인 맵에 정리하고, 코드로 연결한 두 사람이 선택한 장소를 공유 맵에 담는 서비스. 게시물 이미지·요약·추천 메뉴와 개인↔공유 복제·등록 위치 선택을 제공하는 구상이다.'
$marketText = Replace-ExactlyOnce $marketText '**10월 11일 추가: DM 수집과 블로그 확장을 함께 비교했다.**' @'
**10월 12일 사용자 요구 추가:** 개인 맵을 유지하면서 코드로 공유 맵을 연결하고, 연결 시 개인 장소의 복제 여부·범위를 고르며 이후에도 양방향 복제와 신규 등록 맵 선택을 지원한다. 이는 사용자 요구의 변경이며 경쟁사에 없는 기능이라고 확인한 결과는 아니다. 다음 실사용 비교에는 개인 기록 유지, 연결 때 선택 공유, 이후 복제·저장 대상의 마찰과 비공개 범위를 추가한다. 기존 커플 중심 조사와 개인 사용 성과는 구분해서 검증한다.

**10월 11일 추가: DM 수집과 블로그 확장을 함께 비교했다.**
'@
$documentTexts['market-research-2026-10-10.md'] = $marketText

foreach ($documentEntry in $documentManifest) {
    [System.IO.File]::WriteAllText($documentEntry.StagedPath,$documentTexts[$documentEntry.Name],$utf8Encoding)
    $documentEntry | Add-Member -NotePropertyName StagedHash -NotePropertyValue (Get-FileHash -LiteralPath $documentEntry.StagedPath -Algorithm SHA256).Hash
}
[System.IO.File]::WriteAllText((Join-Path $stagingDirectory 'manifest.json'),($documentManifest | ConvertTo-Json -Depth 3),$utf8Encoding)
$documentManifest | Select-Object Name,@{Name='Lines';Expression={([System.IO.File]::ReadAllLines($_.StagedPath)).Length}},@{Name='Bytes';Expression={(Get-Item -LiteralPath $_.StagedPath).Length}} | ConvertTo-Json
