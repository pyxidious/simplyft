param(
    [switch]$NoBuild,
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

$composeArgs = @("compose", "up", "-d")

if (-not $NoBuild) {
    $composeArgs += "--build"
}

Write-Host "Starting Simplyft environment from $repoRoot..."
docker @composeArgs

if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed with exit code $LASTEXITCODE. Check the build output above."
}

Write-Host ""
Write-Host "Environment started."
Write-Host "Frontend:      http://localhost:4200"
Write-Host "Reverse proxy: http://localhost:8080"
Write-Host "Backend:       http://localhost:8081/api/health"
Write-Host "AI service:    http://localhost:8000/health"
Write-Host "Whisper:       http://localhost:8001/health"
Write-Host "Ollama:        http://localhost:11435"

if ($FollowLogs) {
    docker compose logs -f
}
