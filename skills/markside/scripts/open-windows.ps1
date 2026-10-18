[CmdletBinding(DefaultParameterSetName = "File")]
param(
    [Parameter(Mandatory = $true, Position = 0, ParameterSetName = "File")]
    [string]$Path,

    [Parameter(Mandatory = $true, ParameterSetName = "Setup")]
    [switch]$Setup,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$storeUrl = "https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj"

function Find-GoogleChrome {
    if (($DryRun -or $env:MARKSIDE_TEST_LAUNCH -eq "1") -and $env:MARKSIDE_TEST_CHROME_BIN) {
        if (Test-Path -LiteralPath $env:MARKSIDE_TEST_CHROME_BIN -PathType Leaf) {
            return (Resolve-Path -LiteralPath $env:MARKSIDE_TEST_CHROME_BIN).Path
        }
        throw "Google Chrome executable not found: $env:MARKSIDE_TEST_CHROME_BIN"
    }

    $command = Get-Command "chrome.exe" -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $registryKeys = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
    )
    foreach ($key in $registryKeys) {
        if (Test-Path -LiteralPath $key) {
            $registeredPath = (Get-Item -LiteralPath $key).GetValue("")
            if ($registeredPath -and (Test-Path -LiteralPath $registeredPath -PathType Leaf)) {
                return (Resolve-Path -LiteralPath $registeredPath).Path
            }
        }
    }

    $candidates = @(
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe" }),
        $(if ($env:ProgramFiles) { Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe" }),
        $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe" })
    ) | Where-Object { $_ }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "Google Chrome was not found. Install Chrome, then retry /markside."
}

$chrome = Find-GoogleChrome

if ($Setup) {
    $target = $storeUrl
}
else {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Markdown file not found: $Path"
    }
    $extension = [System.IO.Path]::GetExtension($Path)
    if ($extension -cnotin @(".md", ".mdx", ".markdown")) {
        throw "Markside opens only .md, .mdx, or .markdown files: $Path"
    }
    $target = (Resolve-Path -LiteralPath $Path).Path
}

if ($DryRun) {
    Write-Output "Would open in Google Chrome: $target"
}
else {
    $quotedTarget = '"' + $target + '"'
    Start-Process -FilePath $chrome -ArgumentList @("--new-tab", $quotedTarget)
}
