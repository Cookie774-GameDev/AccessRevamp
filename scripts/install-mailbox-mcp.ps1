param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

$copies = @(
  @{
    Source = Join-Path $repoRoot '.codex\config.toml.example'
    Destination = Join-Path $repoRoot '.codex\config.toml'
  },
  @{
    Source = Join-Path $repoRoot '.mcp.json.example'
    Destination = Join-Path $repoRoot '.mcp.json'
  }
)

foreach ($copy in $copies) {
  if ((Test-Path -LiteralPath $copy.Destination) -and -not $Force) {
    Write-Host "Kept existing $($copy.Destination)"
    continue
  }
  Copy-Item -LiteralPath $copy.Source -Destination $copy.Destination -Force
  Write-Host "Installed $($copy.Destination)"
}

$required = @(
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ACCESSREVAMP_GRAPH_TENANT_ID',
  'ACCESSREVAMP_GRAPH_CLIENT_ID'
)
$missing = $required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
$hasCertificate = [Environment]::GetEnvironmentVariable('ACCESSREVAMP_GRAPH_CERTIFICATE_PATH')
$hasDevelopmentSecret = [Environment]::GetEnvironmentVariable('ACCESSREVAMP_GRAPH_CLIENT_SECRET')
if (-not $hasCertificate -and -not $hasDevelopmentSecret) {
  $missing += 'ACCESSREVAMP_GRAPH_CERTIFICATE_PATH (or development client secret)'
}

if ($missing.Count -gt 0) {
  Write-Warning "MCP configuration installed, but these local environment values are still missing: $($missing -join ', ')"
  Write-Host 'Set them locally, then run: npm run mailbox:mcp:doctor'
  exit 0
}

Push-Location $repoRoot
try {
  npm run mailbox:mcp:doctor
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
