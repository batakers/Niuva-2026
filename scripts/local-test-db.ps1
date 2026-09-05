param(
  [Parameter(Position = 0)]
  [ValidateSet("start", "status", "stop", "migrate", "test")]
  [string]$Action = "status"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$runtimeRoot = Join-Path $repoRoot ".local\postgres-test"
$dataDirectory = Join-Path $runtimeRoot "data"
$logPath = Join-Path $runtimeRoot "postgres.log"
$envPath = Join-Path $repoRoot ".env.test.local"
$port = 55432
$databaseName = "niuva_test"
$databaseUser = "niuva_test"
$defaultPgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgBin = if ($env:NIUVA_PG_BIN) { $env:NIUVA_PG_BIN } else { $defaultPgBin }

function Get-PgExecutable([string]$name) {
  $candidate = Join-Path $pgBin "$name.exe"
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    throw "PostgreSQL 18 executable tidak ditemukan: $candidate"
  }
  return $candidate
}

function Import-TestEnvironment {
  if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
    throw ".env.test.local belum tersedia. Salin kontrak TEST_DATABASE_URL lokal terlebih dahulu."
  }

  foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*#' -or $line -notmatch '=') {
      continue
    }

    $parts = $line -split '=', 2
    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($name -match '^[A-Za-z_][A-Za-z0-9_]*$') {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

function Get-SafeTestDatabaseUrl {
  Import-TestEnvironment
  $candidate = $env:TEST_DATABASE_URL
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    throw "TEST_DATABASE_URL wajib disediakan."
  }

  $uri = [Uri]$candidate
  if ($uri.Scheme -notin @("postgres", "postgresql")) {
    throw "TEST_DATABASE_URL harus menggunakan PostgreSQL."
  }
  if ($uri.Host -notin @("127.0.0.1", "localhost")) {
    throw "Script lokal hanya menerima TEST_DATABASE_URL loopback."
  }

  $resolvedDatabase = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
  if ($resolvedDatabase -notmatch '(^|[_-])test([_-]|$)') {
    throw "Nama database test harus memuat marker test yang terpisah."
  }

  return $candidate
}

function Test-PostgresReady {
  $pgIsReady = Get-PgExecutable "pg_isready"
  & $pgIsReady -q -h "127.0.0.1" -p $port -d "postgres" -U $databaseUser
  return $LASTEXITCODE -eq 0
}

function Assert-ExpectedCluster {
  $psql = Get-PgExecutable "psql"
  $reportedDirectory = & $psql -h "127.0.0.1" -p $port -U $databaseUser -d "postgres" -Atc "SHOW data_directory"
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL pada port $port tidak dapat diverifikasi."
  }

  $expected = [IO.Path]::GetFullPath($dataDirectory).TrimEnd('\', '/')
  $reported = [IO.Path]::GetFullPath(($reportedDirectory | Select-Object -First 1)).TrimEnd('\', '/')
  if (-not $expected.Equals($reported, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Port $port dipakai cluster lain; test database tidak akan disentuh."
  }
}

function Start-TestDatabase {
  New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
  $initDb = Get-PgExecutable "initdb"
  $pgCtl = Get-PgExecutable "pg_ctl"
  $createdb = Get-PgExecutable "createdb"
  $psql = Get-PgExecutable "psql"

  if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
    & $initDb -D $dataDirectory -U $databaseUser --auth-local=trust --auth-host=trust --encoding=UTF8 --no-locale
    if ($LASTEXITCODE -ne 0) {
      throw "Inisialisasi cluster PostgreSQL test gagal."
    }
  }

  if (-not (Test-PostgresReady)) {
    & $pgCtl start -D $dataDirectory -l $logPath -o "-p $port -h 127.0.0.1" -w -t 30
    if ($LASTEXITCODE -ne 0) {
      throw "PostgreSQL test gagal dimulai."
    }
  }

  Assert-ExpectedCluster
  $exists = & $psql -h "127.0.0.1" -p $port -U $databaseUser -d "postgres" -Atc "SELECT 1 FROM pg_database WHERE datname = '$databaseName'"
  if ($LASTEXITCODE -ne 0) {
    throw "Pemeriksaan database test gagal."
  }
  if (($exists | Select-Object -First 1) -ne "1") {
    & $createdb -h "127.0.0.1" -p $port -U $databaseUser $databaseName
    if ($LASTEXITCODE -ne 0) {
      throw "Pembuatan database $databaseName gagal."
    }
  }

  Write-Output "PostgreSQL test siap pada loopback port $port."
}

function Stop-TestDatabase {
  $pgCtl = Get-PgExecutable "pg_ctl"
  if (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION")) {
    & $pgCtl status -D $dataDirectory *> $null
    if ($LASTEXITCODE -eq 0) {
      & $pgCtl stop -D $dataDirectory -m fast -w -t 30
      if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL test gagal dihentikan."
      }
    }
  }
  Write-Output "PostgreSQL test berhenti. Data test lokal dipertahankan."
}

function Invoke-InRepo([string[]]$arguments) {
  Push-Location $repoRoot
  try {
    & corepack @arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command gagal: corepack $($arguments -join ' ')"
    }
  }
  finally {
    Pop-Location
  }
}

switch ($Action) {
  "start" {
    Get-SafeTestDatabaseUrl | Out-Null
    Start-TestDatabase
  }
  "status" {
    Get-SafeTestDatabaseUrl | Out-Null
    if (Test-PostgresReady) {
      Assert-ExpectedCluster
      Write-Output "PostgreSQL test siap pada loopback port $port."
    }
    else {
      Write-Output "PostgreSQL test tidak berjalan."
      exit 1
    }
  }
  "stop" {
    Stop-TestDatabase
  }
  "migrate" {
    $testDatabaseUrl = Get-SafeTestDatabaseUrl
    Start-TestDatabase
    $env:DATABASE_URL = $testDatabaseUrl
    $env:NODE_ENV = "test"
    Invoke-InRepo @("pnpm", "exec", "prisma", "migrate", "deploy")
  }
  "test" {
    $testDatabaseUrl = Get-SafeTestDatabaseUrl
    Start-TestDatabase
    $originalDatabaseUrl = Get-Item -Path "Env:DATABASE_URL" -ErrorAction SilentlyContinue
    $env:DATABASE_URL = $testDatabaseUrl
    $env:NODE_ENV = "test"
    Invoke-InRepo @("pnpm", "exec", "prisma", "migrate", "deploy")
    if ($null -eq $originalDatabaseUrl) {
      Remove-Item -Path "Env:DATABASE_URL" -ErrorAction SilentlyContinue
    }
    else {
      $env:DATABASE_URL = $originalDatabaseUrl.Value
    }
    Invoke-InRepo @("pnpm", "exec", "vitest", "run", "--config", "vitest.integration.config.mts")
  }
}
