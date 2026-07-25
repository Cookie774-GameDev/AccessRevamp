$ErrorActionPreference = 'Stop'

$names = @(
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WORKER6_GMAIL_ADDRESS',
  'WORKER6_GMAIL_APP_PASSWORD',
  'WORKER6_GMAIL_IMAP_HOST',
  'WORKER6_GMAIL_IMAP_PORT',
  'WORKER6_SUPPORT_SMTP_USERNAME',
  'WORKER6_SUPPORT_SMTP_PASSWORD',
  'WORKER6_SUPPORT_FROM_ADDRESS',
  'WORKER6_SUPPORT_SMTP_HOST',
  'WORKER6_SUPPORT_SMTP_PORT',
  'WORKER6_REPLY_COMPOSER_COMMAND',
  'WORKER6_AUTO_SEND_ENABLED',
  'ICEMAIL_API_KEY'
)

foreach ($name in $names) {
  if ([Environment]::GetEnvironmentVariable($name, 'Process')) { continue }
  $value = [Environment]::GetEnvironmentVariable($name, 'User')
  if (-not $value) { $value = [Environment]::GetEnvironmentVariable($name, 'Machine') }
  if ($value) { [Environment]::SetEnvironmentVariable($name, $value, 'Process') }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $repoRoot
npm run email:worker6
exit $LASTEXITCODE
