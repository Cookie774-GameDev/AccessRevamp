param(
  [string]$DestinationRoot = ""
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Documents = [Environment]::GetFolderPath('MyDocuments')
if ([string]::IsNullOrWhiteSpace($DestinationRoot)) {
  $DestinationRoot = Join-Path $Documents 'Claude\AccessRevamp'
}
$DestinationRoot = [IO.Path]::GetFullPath($DestinationRoot)
$ClaudeParent = Split-Path -Parent $DestinationRoot
New-Item -ItemType Directory -Force -Path $ClaudeParent | Out-Null

if (Test-Path -LiteralPath $DestinationRoot) {
  $Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $BackupRoot = Join-Path $ClaudeParent '_backups'
  New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
  $Backup = Join-Path $BackupRoot "AccessRevamp-$Stamp"
  Copy-Item -LiteralPath $DestinationRoot -Destination $Backup -Recurse -Force
  Write-Host "Backed up the previous installation to $Backup"
}

New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DestinationRoot 'docs') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DestinationRoot 'scripts') | Out-Null

Copy-Item -LiteralPath (Join-Path $RepoRoot 'CLAUDE.md') -Destination (Join-Path $DestinationRoot 'CLAUDE.md') -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot '.claude') -Destination (Join-Path $DestinationRoot '.claude') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot 'docs\agent-system') -Destination (Join-Path $DestinationRoot 'docs\agent-system') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\install-agent-system-to-claude.ps1') -Destination (Join-Path $DestinationRoot 'scripts\install-agent-system-to-claude.ps1') -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts\verify-agent-system-to-claude.ps1') -Destination (Join-Path $DestinationRoot 'scripts\verify-agent-system-to-claude.ps1') -Force

& (Join-Path $DestinationRoot 'scripts\verify-agent-system-to-claude.ps1') -Root $DestinationRoot
if ($LASTEXITCODE -ne 0) { throw 'Claude operations installation verification failed.' }

$Receipt = [ordered]@{
  installedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
  destination = $DestinationRoot
  sourceRepository = 'Cookie774-GameDev/AccessRevamp'
  verified = $true
  claudeMemory = (Join-Path $DestinationRoot 'CLAUDE.md')
  claudeSettings = (Join-Path $DestinationRoot '.claude\settings.json')
}
$Receipt | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $DestinationRoot 'INSTALLATION_RECEIPT.json') -Encoding utf8
Write-Host "Installed and verified AccessRevamp Claude Operations at $DestinationRoot"
