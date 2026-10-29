# Prompts for the staging catalog import inputs without echoing secrets or
# writing them to history or files, then runs scripts/import-staging-catalog.ts.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$names = @("NIUVA_DEPLOYMENT_TIER", "NIUVA_PROVIDER_MODE", "DATABASE_URL", "NIUVA_DATABASE_BINDING_ID", "CATALOG_IMPORT_CONFIRMATION")
try {
  $env:NIUVA_DEPLOYMENT_TIER = "staging"
  $env:NIUVA_PROVIDER_MODE = "sandbox"
  $env:DATABASE_URL = Read-Secret "DATABASE_URL staging (runtime, sslmode=verify-full)"
  $env:NIUVA_DATABASE_BINDING_ID = Read-Host "NIUVA_DATABASE_BINDING_ID staging"
  $env:CATALOG_IMPORT_CONFIRMATION = Read-Host "Ketik I_UNDERSTAND_STAGING_CATALOG_IMPORT untuk melanjutkan"
  Push-Location $repoRoot
  try { & corepack pnpm exec jiti scripts/import-staging-catalog.ts }
  finally { Pop-Location }
} finally {
  foreach ($name in $names) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
}
