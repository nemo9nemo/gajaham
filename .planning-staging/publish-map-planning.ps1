$ErrorActionPreference = 'Stop'
$sourceDirectory = 'C:\Users\love0\Documents\Codex\2026-10-10\dm'
$stagingDirectory = 'C:\Users\love0\nemo9Dev\gajaham\.planning-staging'
$allowedNames = @('product-plan-2026-10-11.md','version-roadmap-2026-10-10.md','market-research-2026-10-10.md')
$documentManifest = @(Get-Content -LiteralPath (Join-Path $stagingDirectory 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json)
if ($documentManifest.Count -ne $allowedNames.Count) { throw 'Unexpected manifest entries' }
foreach ($documentEntry in $documentManifest) {
    if ($documentEntry.Name -notin $allowedNames) { throw 'Unexpected document name' }
    $expectedSourcePath = Join-Path $sourceDirectory $documentEntry.Name
    $expectedStagedPath = Join-Path $stagingDirectory $documentEntry.Name
    if ($documentEntry.SourcePath -ne $expectedSourcePath -or $documentEntry.StagedPath -ne $expectedStagedPath) { throw 'Unexpected document path' }
    if ((Get-FileHash -LiteralPath $expectedSourcePath -Algorithm SHA256).Hash -ne $documentEntry.OriginalHash) { throw "Source changed after review: $($documentEntry.Name)" }
    if ((Get-FileHash -LiteralPath $expectedStagedPath -Algorithm SHA256).Hash -ne $documentEntry.StagedHash) { throw "Draft changed after review: $($documentEntry.Name)" }
}
foreach ($documentEntry in $documentManifest) {
    Copy-Item -LiteralPath $documentEntry.StagedPath -Destination $documentEntry.SourcePath
    if ((Get-FileHash -LiteralPath $documentEntry.SourcePath -Algorithm SHA256).Hash -ne $documentEntry.StagedHash) { throw "Published content mismatch: $($documentEntry.Name)" }
    Write-Output "Updated: $($documentEntry.Name)"
}
