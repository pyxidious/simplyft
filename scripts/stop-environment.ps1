param(
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Set-Location $repoRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not available. Install Docker Desktop or Docker Engine with Docker Compose v2."
}

$composeArgs = @("compose", "down")

if ($Volumes) {
    $composeArgs += "--volumes"
}

Write-Host "Stopping Simplyft environment from $repoRoot..."
docker @composeArgs

if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed with exit code $LASTEXITCODE. Check the output above."
}

Write-Host "Environment stopped."
