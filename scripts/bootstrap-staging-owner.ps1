# Prompts for the staging Owner bootstrap inputs without echoing secrets or
# writing them to history or files, then runs scripts/bootstrap-staging-owner.ts.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$names = @("NIUVA_DEPLOYMENT_TIER", "NIUVA_PROVIDER_MODE", "DATABASE_URL", "NIUVA_DATABASE_BINDING_ID", "ADMIN_AUTH_EMAIL", "ADMIN_AUTH_PASSWORD", "ADMIN_PROFILE_DISPLAY_NAME", "ADMIN_PROFILE_CONFIRMATION")
try {
  $env:NIUVA_DEPLOYMENT_TIER = "staging"
  $env:NIUVA_PROVIDER_MODE = "sandbox"
  $env:DATABASE_URL = Read-Secret "DATABASE_URL staging (runtime, sslmode=verify-full)"
  $env:NIUVA_DATABASE_BINDING_ID = Read-Secret "NIUVA_DATABASE_BINDING_ID staging"
  $env:ADMIN_AUTH_EMAIL = Read-Host "Email Owner"
  $env:ADMIN_PROFILE_DISPLAY_NAME = Read-Host "Nama tampilan Owner"
  $env:ADMIN_AUTH_PASSWORD = Read-Secret "Password Owner (8-15 karakter)"
  $env:ADMIN_PROFILE_CONFIRMATION = Read-Host "Ketik I_UNDERSTAND_STAGING_OWNER_BOOTSTRAP untuk melanjutkan"
  Push-Location $repoRoot
  try { & corepack pnpm exec jiti scripts/bootstrap-staging-owner.ts }
  finally { Pop-Location }
} finally {
  foreach ($name in $names) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
}
