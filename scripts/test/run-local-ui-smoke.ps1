$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$OutputDir = Join-Path $RepoRoot 'output'
$Timestamp = Get-Date -Format 'yyyyMMddTHHmmss'
$SmokeDataRoot = Join-Path $RepoRoot ".tmp\local-ui-smoke-data-$Timestamp"
$BaseUrl = 'http://127.0.0.1:3210'
$Secret = 'local-dev-only-secret'
$StdoutLog = Join-Path $OutputDir 'local-ui-smoke-server.out.log'
$StderrLog = Join-Path $OutputDir 'local-ui-smoke-server.err.log'
$ServerProcess = $null

$EnvNames = @(
  'PORT',
  'HOSTNAME',
  'BLOG_DATA_ROOT',
  'EDITOR_ACCESS_TOKEN',
  'COOKIE_SECURE',
  'TRUSTED_PROXY_IPS',
  'BASE_URL',
  'EDITOR_LOGIN_SECRET'
)

$OriginalEnv = @{}
foreach ($Name in $EnvNames) {
  $OriginalEnv[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
}

function Restore-Environment {
  foreach ($Name in $EnvNames) {
    [Environment]::SetEnvironmentVariable($Name, $OriginalEnv[$Name], 'Process')
  }
}

function Write-Utf8NoBomJson {
  param (
    [Parameter(Mandatory = $true)]
    [string] $Path,
    [Parameter(Mandatory = $true)]
    [object] $Value
  )

  $Json = ($Value | ConvertTo-Json -Depth 8) + "`n"
  $Encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Json, $Encoding)
}

function Stop-ServerProcess {
  if ($null -eq $ServerProcess -or $ServerProcess.HasExited) {
    return
  }

  & taskkill.exe /PID $ServerProcess.Id /T /F | Out-Null
}

function Show-ServerLogs {
  foreach ($Path in @($StdoutLog, $StderrLog)) {
    if (Test-Path -LiteralPath $Path) {
      Write-Host "===== $Path ====="
      Get-Content -LiteralPath $Path -Tail 120
    }
  }
}

try {
  Set-Location -LiteralPath $RepoRoot
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $SmokeDataRoot 'articles') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $SmokeDataRoot 'navigation') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $SmokeDataRoot 'settings') | Out-Null

  $Now = (Get-Date).ToUniversalTime().ToString('o')
  Write-Utf8NoBomJson -Path (Join-Path $SmokeDataRoot 'settings\app-runtime.json') -Value ([ordered]@{
    version = 1
    setupCompletedAt = $Now
    publicSiteUrl = $BaseUrl
    cookieSecure = $false
    trustedProxyIps = @('*')
    dataRoot = [ordered]@{
      path = $SmokeDataRoot
      pendingPath = $null
      requiresRestart = $false
    }
    updatedAt = $Now
  })

  $Npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
  if ($null -eq $Npm) {
    $Npm = Get-Command npm
  }

  Write-Host 'Building standalone application...'
  & $Npm.Source run build

  [Environment]::SetEnvironmentVariable('PORT', '3210', 'Process')
  [Environment]::SetEnvironmentVariable('HOSTNAME', '127.0.0.1', 'Process')
  [Environment]::SetEnvironmentVariable('BLOG_DATA_ROOT', $SmokeDataRoot, 'Process')
  [Environment]::SetEnvironmentVariable('EDITOR_ACCESS_TOKEN', $Secret, 'Process')
  [Environment]::SetEnvironmentVariable('COOKIE_SECURE', 'false', 'Process')
  [Environment]::SetEnvironmentVariable('TRUSTED_PROXY_IPS', '*', 'Process')
  [Environment]::SetEnvironmentVariable('BASE_URL', $BaseUrl, 'Process')
  [Environment]::SetEnvironmentVariable('EDITOR_LOGIN_SECRET', $Secret, 'Process')

  Remove-Item -LiteralPath $StdoutLog, $StderrLog -Force -ErrorAction SilentlyContinue

  Write-Host "Starting standalone server at $BaseUrl..."
  $ServerProcess = Start-Process `
    -FilePath $Npm.Source `
    -ArgumentList @('run', 'start') `
    -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $StdoutLog `
    -RedirectStandardError $StderrLog

  $Ready = $false
  for ($Attempt = 1; $Attempt -le 45; $Attempt++) {
    if ($ServerProcess.HasExited) {
      Show-ServerLogs
      throw "Application server exited before becoming ready with code $($ServerProcess.ExitCode)."
    }

    try {
      Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
      Write-Host "Application responded after $Attempt attempts."
      $Ready = $true
      break
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $Ready) {
    Show-ServerLogs
    throw 'Application did not become ready.'
  }

  Write-Host 'Running UI smoke scripts...'
  & $Npm.Source run smoke:ui
} finally {
  Stop-ServerProcess
  Restore-Environment

  if (Test-Path -LiteralPath $SmokeDataRoot) {
    Remove-Item -LiteralPath $SmokeDataRoot -Recurse -Force
  }
}
