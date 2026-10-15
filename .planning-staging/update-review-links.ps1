$ErrorActionPreference = 'Stop'
$reviewPath = 'C:\Users\love0\nemo9Dev\gajaham\docs\planning-review-2026-10-12.md'
$stagingDirectory = 'C:\Users\love0\nemo9Dev\gajaham\.planning-staging'
$reviewText = [System.IO.File]::ReadAllText($reviewPath)
$anchorPattern = '\]\((C:/Users/love0/Documents/Codex/2026-10-10/dm/([^():]+\.md)):(\d+)\)'
$anchorMatches = [regex]::Matches($reviewText,$anchorPattern)
$fallbackPrefixes = @{
    'product-plan-2026-10-11.md:47' = '개인 사용만으로도 장소 보관'
    'product-plan-2026-10-11.md:102' = '연결 코드는 만료·취소·사용 완료 상태를 갖고 재발급'
    'product-plan-2026-10-11.md:260' = '## 8. 개인·공유 맵과 기록 관리'
    'product-plan-2026-10-11.md:263' = '- 개인 맵은 본인이 편집하고 공유 맵은 두 참여자가'
    'product-plan-2026-10-11.md:264' = '- 일반 삭제는 해당 맵 휴지통'
    'product-plan-2026-10-11.md:383' = '| 계정·맵 연결·복제·저장 대상 |'
}
$updatedAnchors = 0
foreach ($anchorMatch in $anchorMatches) {
    $documentName = $anchorMatch.Groups[2].Value
    $oldLineNumber = [int]$anchorMatch.Groups[3].Value
    $oldLines = [System.IO.File]::ReadAllLines((Join-Path (Join-Path $stagingDirectory 'originals') $documentName))
    $newLines = [System.IO.File]::ReadAllLines($anchorMatch.Groups[1].Value)
    $oldLineText = $oldLines[$oldLineNumber-1]
    $newLineNumber = 0
    for ($lineIndex=0; $lineIndex -lt $newLines.Count; $lineIndex++) {
        if ($newLines[$lineIndex] -eq $oldLineText) { $newLineNumber = $lineIndex+1; break }
    }
    if ($newLineNumber -eq 0) {
        $fallbackPrefix = $fallbackPrefixes["${documentName}:$oldLineNumber"]
        if (!$fallbackPrefix) { throw "Missing anchor mapping for ${documentName}:$oldLineNumber" }
        for ($lineIndex=0; $lineIndex -lt $newLines.Count; $lineIndex++) {
            if ($newLines[$lineIndex].StartsWith($fallbackPrefix,[StringComparison]::Ordinal)) { $newLineNumber = $lineIndex+1; break }
        }
    }
    if ($newLineNumber -eq 0) { throw 'Anchor target not found' }
    $reviewText = $reviewText.Replace($anchorMatch.Value,'](' + $anchorMatch.Groups[1].Value + ':' + $newLineNumber + ')')
    $updatedAnchors++
}
$reviewText = $reviewText.Replace('제품 기획서·로드맵·시장조사 대상 설명의 수정안을 작성했다.','제품 기획서·로드맵·시장조사 대상 설명에 반영했다.').Replace('이번 수정안에서','이번 수정에서').Replace('이번 수정안에','이번 수정에')
[System.IO.File]::WriteAllText($reviewPath,$reviewText,[System.Text.UTF8Encoding]::new($false))
Write-Output "Updated review source anchors: $updatedAnchors"
