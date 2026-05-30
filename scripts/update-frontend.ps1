param(
    [switch]$FollowLogs
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Set-Location $repoRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not available. Install Docker Desktop or Docker Engine with Docker Compose v2."
}

if (-not (Test-Path ".env")) {
    if (-not (Test-Path ".env.example")) {
        Write-Error "Missing .env and .env.example in $repoRoot."
    }

    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Review secrets and ports if needed."
}

Write-Host "Building Docker Compose service: frontend"
docker compose build frontend
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose build failed with exit code $LASTEXITCODE."
}

Write-Host "Recreating only Docker Compose service: frontend"
docker compose up -d --no-deps frontend
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose up failed with exit code $LASTEXITCODE."
}

Write-Host ""
Write-Host "Frontend updated."
Write-Host "Frontend: http://localhost:4200"

if ($FollowLogs) {
    docker compose logs -f frontend
}
