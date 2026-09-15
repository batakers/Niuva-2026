Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$demoDatabaseUrl = "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev?schema=public"

function Invoke-Step([string]$executable, [string[]]$arguments) {
  & $executable @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Local demo step failed: $executable"
  }
}

Push-Location $repoRoot
try {
  Invoke-Step "powershell.exe" @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    (Join-Path $repoRoot "scripts/local-dev-db.ps1"),
    "start"
  )

  $env:DATABASE_URL = $demoDatabaseUrl
  $env:DEMO_DATABASE_URL = $demoDatabaseUrl
  $env:NIUVA_RUNTIME_MODE = "demo"
  $env:NODE_ENV = "development"
  $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = ""
  $env:CLERK_SECRET_KEY = ""

  Invoke-Step "corepack" @("pnpm", "exec", "prisma", "migrate", "deploy")
  Invoke-Step "corepack" @("pnpm", "exec", "jiti", "scripts/seed-local-demo.ts")
  Invoke-Step "corepack" @("pnpm", "exec", "next", "dev", "-p", "3001")
}
finally {
  Pop-Location
}
