Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$testEnvPath = Join-Path $repoRoot ".env.test.local"

if (-not (Test-Path -LiteralPath $testEnvPath -PathType Leaf)) {
  throw ".env.test.local belum tersedia untuk E2E lokal."
}

foreach ($line in Get-Content -LiteralPath $testEnvPath) {
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

if ([string]::IsNullOrWhiteSpace($env:TEST_DATABASE_URL)) {
  throw "TEST_DATABASE_URL wajib tersedia di .env.test.local."
}

Push-Location $repoRoot
try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts/local-test-db.ps1") migrate
  if ($LASTEXITCODE -ne 0) {
    throw "Database test gagal dimigrasikan."
  }

  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  $env:DEMO_DATABASE_URL = $env:TEST_DATABASE_URL
  $env:NIUVA_RUNTIME_MODE = ""
  $env:NODE_ENV = "test"
  $env:GOOGLE_CLIENT_ID = "local-e2e-google-client"
  $env:GOOGLE_CLIENT_SECRET = "local-e2e-google-secret"
  $env:GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback"
  $env:NIUVA_CUSTOMER_AUTH_MOCK = "true"
  $env:NIUVA_NEXT_DIST_DIR = ".next-e2e"

  & corepack pnpm exec next dev -p 3000
  if ($LASTEXITCODE -ne 0) {
    throw "Next E2E server gagal berjalan."
  }
}
finally {
  Pop-Location
}
