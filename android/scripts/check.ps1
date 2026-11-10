param([string[]]$Tasks = @(':core:test', ':app:testDebugUnitTest', ':app:lintDebug', ':app:assembleDebug', ':app:assembleRelease'))
$ErrorActionPreference = 'Stop'
$taskAndroidRoot = Split-Path -Parent $PSScriptRoot
$taskRepoRoot = Split-Path -Parent $taskAndroidRoot
$taskTools = Join-Path $taskRepoRoot 'tmp\android-tools'
if (-not $env:JAVA_HOME) {
    $taskJdk = Get-ChildItem (Join-Path $taskTools 'jdk17') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $taskTools 'sdk' }
if (-not $env:ANDROID_USER_HOME) { $env:ANDROID_USER_HOME = Join-Path $taskTools 'android-user' }
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME = Join-Path $taskTools 'gradle-home' }
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe') -PathType Leaf)) { throw 'JDK 17의 JAVA_HOME을 설정해 주세요. android/README.md 참고.' }
if (-not (Test-Path (Join-Path $env:ANDROID_HOME 'platforms\android-36\android.jar'))) { throw 'Android SDK 36과 ANDROID_HOME을 준비해 주세요. android/README.md 참고.' }
& (Join-Path $taskAndroidRoot 'gradlew.bat') -p $taskAndroidRoot @Tasks --no-daemon --continue
exit $LASTEXITCODE
