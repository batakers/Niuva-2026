# Prompts for the staging pricing activation inputs without echoing secrets or
# writing them to history or files, then runs scripts/activate-staging-pricing.ts.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$names = @("NIUVA_DEPLOYMENT_TIER", "NIUVA_PROVIDER_MODE", "DATABASE_URL", "NIUVA_DATABASE_BINDING_ID", "PRICING_QUANTITY_SEMANTICS", "PRICING_ACTIVATION_CONFIRMATION")
try {
  $env:NIUVA_DEPLOYMENT_TIER = "staging"
  $env:NIUVA_PROVIDER_MODE = "sandbox"
  $env:DATABASE_URL = Read-Secret "DATABASE_URL staging (runtime, sslmode=verify-full)"
  $env:NIUVA_DATABASE_BINDING_ID = Read-Host "NIUVA_DATABASE_BINDING_ID staging"
  $env:PRICING_QUANTITY_SEMANTICS = Read-Host "Quantity semantics keputusan Owner: ketik PER_UNIT atau AGGREGATE"
  $env:PRICING_ACTIVATION_CONFIRMATION = Read-Host "Ketik I_UNDERSTAND_STAGING_PRICING_ACTIVATION untuk melanjutkan"
  Push-Location $repoRoot
  try { & corepack pnpm exec jiti scripts/activate-staging-pricing.ts }
  finally { Pop-Location }
} finally {
  foreach ($name in $names) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
}
