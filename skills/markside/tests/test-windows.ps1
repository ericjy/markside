$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$launcher = Join-Path (Split-Path $PSScriptRoot -Parent) "scripts/open-windows.ps1"
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("markside-skill-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $fixtureRoot | Out-Null

try {
    $fakeChrome = Join-Path $fixtureRoot "chrome.cmd"
    $fakeChromeLogger = Join-Path $fixtureRoot "chrome-logger.ps1"
    $launchLog = Join-Path $fixtureRoot "launch.log"
    # A batch file forwarding through cmd.exe's own echo/redirection mangles non-ASCII
    # arguments (cmd writes text output through the console's OEM code page). Forwarding
    # argv to a pwsh -File script instead keeps the original Unicode intact end to end.
    Set-Content -LiteralPath $fakeChromeLogger -Value 'Set-Content -LiteralPath $env:MARKSIDE_TEST_LOG -Value $args -Encoding utf8NoBOM'
    Set-Content -LiteralPath $fakeChrome -Value '@echo off', "pwsh -NoProfile -File `"$fakeChromeLogger`" %*"

    $markdownFile = Join-Path $fixtureRoot "Review plan β.mdx"
    New-Item -ItemType File -Path $markdownFile | Out-Null

    $env:MARKSIDE_TEST_CHROME_BIN = $fakeChrome
    $output = & $launcher -DryRun $markdownFile
    if ($output -notlike "*$markdownFile*") {
        throw "dry run did not preserve the Markdown path"
    }

    $env:MARKSIDE_TEST_LAUNCH = "1"
    $env:MARKSIDE_TEST_LOG = $launchLog
    & $launcher $markdownFile
    for ($attempt = 0; $attempt -lt 100 -and -not (Test-Path -LiteralPath $launchLog); $attempt++) {
        Start-Sleep -Milliseconds 100
    }
    $logExists = Test-Path -LiteralPath $launchLog
    $launchArgs = if ($logExists) { Get-Content -LiteralPath $launchLog -Raw } else { $null }
    if (-not $logExists -or $launchArgs -notlike "*--new-tab*" -or $launchArgs -notlike "*$markdownFile*") {
        throw "launcher did not pass the new-tab flag and Markdown path to Chrome (log exists: $logExists; log content: [$launchArgs]; expected path: [$markdownFile])"
    }

    $setupOutput = & $launcher -DryRun -Setup
    if ($setupOutput -notlike "*chromewebstore.google.com*") {
        throw "setup did not target the Chrome Web Store"
    }

    $unsupportedFile = Join-Path $fixtureRoot "notes.MD"
    New-Item -ItemType File -Path $unsupportedFile | Out-Null
    $failed = $false
    try { & $launcher -DryRun $unsupportedFile 2>$null } catch { $failed = $true }
    if (-not $failed) {
        throw "uppercase Markdown extension was accepted"
    }

    $failed = $false
    try { & $launcher -DryRun (Join-Path $fixtureRoot "missing.md") 2>$null } catch { $failed = $true }
    if (-not $failed) {
        throw "missing file was accepted"
    }

    $env:MARKSIDE_TEST_CHROME_BIN = Join-Path $fixtureRoot "missing-chrome.exe"
    $failed = $false
    try { & $launcher -DryRun $markdownFile 2>$null } catch { $failed = $true }
    if (-not $failed) {
        throw "missing Chrome executable was accepted"
    }
}
finally {
    Remove-Item Env:MARKSIDE_TEST_CHROME_BIN -ErrorAction SilentlyContinue
    Remove-Item Env:MARKSIDE_TEST_LAUNCH -ErrorAction SilentlyContinue
    Remove-Item Env:MARKSIDE_TEST_LOG -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $fixtureRoot
}
