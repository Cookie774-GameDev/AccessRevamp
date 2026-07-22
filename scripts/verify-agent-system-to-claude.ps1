param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
$Errors = [System.Collections.Generic.List[string]]::new()
$Required = @(
  'CLAUDE.md',
  '.claude\settings.json',
  'docs\agent-system\README.md',
  'docs\agent-system\mainagent.md',
  'docs\agent-system\subagentforcustomer.md',
  'docs\agent-system\subagentforwebsite.md',
  'docs\agent-system\subagentfordesign.md',
  'docs\agent-system\subagentforsecurity.md',
  'docs\agent-system\subagentforintegrations.md'
)

foreach ($Relative in $Required) {
  if (-not (Test-Path -LiteralPath (Join-Path $Root $Relative) -PathType Leaf)) {
    $Errors.Add("Missing required file: $Relative")
  }
}

try {
  $Settings = Get-Content -Raw -LiteralPath (Join-Path $Root '.claude\settings.json') | ConvertFrom-Json
  if ($Settings.permissions.defaultMode -ne 'acceptEdits') {
    $Errors.Add('Claude defaultMode is not acceptEdits.')
  }
} catch {
  $Errors.Add('Invalid .claude/settings.json')
}

$ClaudeText = Get-Content -Raw -LiteralPath (Join-Path $Root 'CLAUDE.md') -ErrorAction SilentlyContinue
foreach ($RequiredText in @('100 inboxes','500 cold','Stripe remains sandbox-only','Completion requires')) {
  if ($ClaudeText -notmatch [regex]::Escape($RequiredText)) {
    $Errors.Add("CLAUDE.md is missing required task text: $RequiredText")
  }
}

$SkillFiles = @(Get-ChildItem -LiteralPath (Join-Path $Root 'docs\agent-system\skills') -Recurse -Filter 'SKILL.md' -File -ErrorAction SilentlyContinue)
if ($SkillFiles.Count -lt 11) {
  $Errors.Add("Expected at least 11 canonical SKILL.md files; found $($SkillFiles.Count).")
}

$AllFiles = @(Get-ChildItem -LiteralPath $Root -Recurse -Force -File)
foreach ($File in $AllFiles) {
  if ($File.Length -gt 9000000) {
    $Errors.Add("File exceeds 9,000,000 bytes: $($File.FullName)")
  }
}

$SecretPatterns = @(
  'sk_live_[A-Za-z0-9]+',
  'sk_test_[A-Za-z0-9]+',
  'sb_secret_[A-Za-z0-9]+',
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
)
$TextFiles = $AllFiles | Where-Object {
  $_.Length -le 9000000 -and $_.Extension -in @('.md','.json','.ps1','.cmd','.txt')
}
foreach ($File in $TextFiles) {
  $Text = Get-Content -Raw -LiteralPath $File.FullName -ErrorAction SilentlyContinue
  foreach ($Pattern in $SecretPatterns) {
    if ($Text -match $Pattern) { $Errors.Add("Possible secret in $($File.FullName)") }
  }
}

$Hashes = @($AllFiles | Where-Object { $_.Name -notin @('VERIFICATION_REPORT.json','INSTALLATION_RECEIPT.json') } | ForEach-Object {
  [ordered]@{
    path = $_.FullName.Substring($Root.Length).TrimStart('\')
    bytes = $_.Length
    sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
  }
})

$Report = [ordered]@{
  verifiedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
  root = $Root
  passed = ($Errors.Count -eq 0)
  requiredFiles = $Required.Count
  canonicalSkillFiles = $SkillFiles.Count
  checkedFiles = $AllFiles.Count
  errors = @($Errors)
  hashes = $Hashes
  externalActivation = [ordered]@{
    stripe = 'sandbox/test; real checkout still requires authenticated end-to-end verification'
    emailTransport = 'not activated by local file verification'
    canva = 'not activated by local file verification'
    higgsfield = 'not activated by local file verification'
  }
}
$Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Root 'VERIFICATION_REPORT.json') -Encoding utf8

if ($Errors.Count -gt 0) {
  $Errors | ForEach-Object { Write-Error $_ }
  exit 1
}
Write-Host "Claude operations verification passed: $($AllFiles.Count) files and $($SkillFiles.Count) canonical skills."
Write-Host 'External provider activation remains fail-closed until authenticated end-to-end tests pass.'
exit 0
