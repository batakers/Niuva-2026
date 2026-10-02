param([switch]$Inspect)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskName = 'Niuva-Customer-Privacy-Cleanup'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($Inspect) {
  Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State, Actions, Triggers, Settings
  exit
}
if ((Get-TimeZone).Id -ne 'SE Asia Standard Time') { throw 'Expected WIB Windows time zone.' }
$taskNode = (Get-Command node.exe -ErrorAction Stop).Source
$taskCli = Join-Path $taskRoot 'node_modules\jiti\lib\jiti-cli.mjs'
$taskScript = Join-Path $taskRoot 'scripts\cleanup-customer-privacy.ts'
if (-not (Test-Path -LiteralPath $taskCli) -or -not (Test-Path -LiteralPath $taskScript)) { throw 'Cleanup runtime is missing.' }
$taskAction = New-ScheduledTaskAction -Execute $taskNode -Argument ('"{0}" "{1}" --execute' -f $taskCli, $taskScript) -WorkingDirectory $taskRoot
$taskUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskTriggers = @(New-ScheduledTaskTrigger -Daily -At '03:15'; New-ScheduledTaskTrigger -AtLogOn -User $taskUser)
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Hours 1) -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTriggers -Settings $taskSettings -Principal $taskPrincipal -Description 'Local niuva_dev privacy retention only; preserves business records and active Customer accounts.' -Force | Select-Object TaskName, State
