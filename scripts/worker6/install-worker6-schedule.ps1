param([switch]$EnableWithoutCredentialCheck)

$ErrorActionPreference = 'Stop'
$taskName = 'AccessRevamp-Worker6'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$interval = New-TimeSpan -Minutes 15
$command = "Set-Location -LiteralPath '$($repoRoot.Replace("'","''"))'; npm run email:worker6"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command `"$command`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval $interval
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Draft-only AccessRevamp Gmail routing worker. Runs every 15 minutes.' -Force | Out-Null

$required = @('SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','WORKER6_GMAIL_ADDRESS','WORKER6_GMAIL_APP_PASSWORD')
$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_, 'User') -and -not [Environment]::GetEnvironmentVariable($_, 'Machine') })
if ($missing.Count -gt 0 -and -not $EnableWithoutCredentialCheck) {
  Disable-ScheduledTask -TaskName $taskName | Out-Null
  Write-Output "Installed disabled: missing $($missing -join ', ')."
  exit 2
}

Enable-ScheduledTask -TaskName $taskName | Out-Null
Write-Output 'AccessRevamp-Worker6 installed and enabled.'
