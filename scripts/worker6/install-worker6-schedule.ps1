param([switch]$EnableAfterVerification)

$ErrorActionPreference = 'Stop'
$taskName = 'AccessRevamp-Worker6'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$interval = New-TimeSpan -Minutes 15
$runner = Join-Path $PSScriptRoot 'run-worker6.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval $interval
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'AccessRevamp Worker 6 Gmail router. Runs every 15 minutes; sending remains separately gated.' -Force | Out-Null
Disable-ScheduledTask -TaskName $taskName | Out-Null

$required = @(
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WORKER6_GMAIL_ADDRESS',
  'WORKER6_GMAIL_APP_PASSWORD',
  'WORKER6_SUPPORT_SMTP_USERNAME',
  'WORKER6_SUPPORT_SMTP_PASSWORD',
  'WORKER6_SUPPORT_FROM_ADDRESS',
  'WORKER6_REPLY_COMPOSER_COMMAND',
  'ICEMAIL_API_KEY'
)
$missing = @($required | Where-Object { -not [Environment]::GetEnvironmentVariable($_, 'User') -and -not [Environment]::GetEnvironmentVariable($_, 'Machine') })
if ($missing.Count -gt 0) {
  Write-Output "Installed disabled: missing $($missing -join ', ')."
  exit 2
}

if ($EnableAfterVerification) {
  Enable-ScheduledTask -TaskName $taskName | Out-Null
  Write-Output 'AccessRevamp-Worker6 installed and enabled after explicit verification.'
} else {
  Write-Output 'AccessRevamp-Worker6 installed disabled pending the controlled test.'
}
