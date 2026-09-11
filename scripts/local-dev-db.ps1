param(
  [ValidateSet('start', 'status', 'stop', 'migrate')]
  [string]$Action = 'status'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeRoot = Join-Path $repoRoot '.local\postgres-dev'
$dataDirectory = Join-Path $runtimeRoot 'data'
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$port = 55433
# Local-only disposable credentials: trust authentication is restricted to loopback.
# This cluster must never listen on a network interface or be used for production.
$databaseUser = 'niuva_dev'
$databaseName = 'niuva_dev'

function Invoke-Pg([string]$Executable, [string[]]$Arguments) {
  & (Join-Path $pgBin "$Executable.exe") @Arguments
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL operation failed: $Executable" }
}
function Test-Ready {
  & (Join-Path $pgBin 'pg_isready.exe') -q -h 127.0.0.1 -p $port
  return $LASTEXITCODE -eq 0
}
function Assert-Cluster {
  $reported = Invoke-Pg 'psql' @('-h','127.0.0.1','-p',"$port",'-U',$databaseUser,'-d','postgres','-Atc','SHOW data_directory')
  if (-not [IO.Path]::GetFullPath(($reported | Select-Object -First 1)).Equals(
    [IO.Path]::GetFullPath($dataDirectory), [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Port belongs to another cluster; refusing to continue.'
  }
}
function Start-Cluster {
  if (Test-Ready) { Assert-Cluster }
  else {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
      throw 'Development port is already occupied.'
    }
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'PG_VERSION'))) {
      Invoke-Pg 'initdb' @('-D',$dataDirectory,'-U',$databaseUser,'--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale')
    }
    Invoke-Pg 'pg_ctl' @('start','-D',$dataDirectory,'-l',(Join-Path $runtimeRoot 'postgres.log'),'-o',"-p $port -h 127.0.0.1",'-w','-t','30')
    Assert-Cluster
  }
  $exists = Invoke-Pg 'psql' @('-h','127.0.0.1','-p',"$port",'-U',$databaseUser,'-d','postgres','-Atc',"SELECT 1 FROM pg_database WHERE datname = 'niuva_dev'")
  if (($exists | Select-Object -First 1) -ne '1') {
    Invoke-Pg 'createdb' @('-h','127.0.0.1','-p',"$port",'-U',$databaseUser,$databaseName)
  }
  Write-Output 'Development PostgreSQL ready on loopback port 55433.'
}
switch ($Action) {
  'start' { Start-Cluster }
  'status' {
    if (-not (Test-Ready)) { Write-Output 'Development PostgreSQL stopped.'; exit 1 }
    Assert-Cluster
    Write-Output 'Development PostgreSQL ready on loopback port 55433.'
  }
  'stop' {
    if (Test-Ready) {
      Assert-Cluster
      Invoke-Pg 'pg_ctl' @('stop','-D',$dataDirectory,'-m','fast','-w','-t','30')
    }
    Write-Output 'Development PostgreSQL stopped; data retained.'
  }
  'migrate' {
    Start-Cluster
    $previousUrl = $env:DATABASE_URL
    Push-Location $repoRoot
    try {
      # Exact local target; never use an inherited or production URL for migration.
      $env:DATABASE_URL = 'postgresql://niuva_dev@127.0.0.1:55433/niuva_dev'
      & corepack pnpm exec prisma migrate deploy
      if ($LASTEXITCODE -ne 0) { throw 'Development migration failed.' }
    }
    finally { $env:DATABASE_URL = $previousUrl; Pop-Location }
  }
}
