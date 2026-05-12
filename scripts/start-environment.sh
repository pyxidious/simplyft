#!/usr/bin/env bash
set -euo pipefail

no_build=false
follow_logs=false

for arg in "$@"; do
  case "$arg" in
    --no-build)
      no_build=true
      ;;
    --follow-logs)
      follow_logs=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./scripts/start-environment.sh [--no-build] [--follow-logs]

Starts the full Simplyft Docker Compose environment.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

cd "$repo_root"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not available. Install Docker Engine/Desktop with Docker Compose v2." >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  if [ ! -f ".env.example" ]; then
    echo "Missing .env and .env.example in $repo_root." >&2
    exit 1
  fi

  cp ".env.example" ".env"
  echo "Created .env from .env.example. Review secrets and ports if needed."
fi

compose_args=(compose up -d)

if [ "$no_build" = false ]; then
  compose_args+=(--build)
fi

echo "Starting Simplyft environment from $repo_root..."
docker "${compose_args[@]}"

cat <<'INFO'

Environment started.
Frontend:      http://localhost:4200
Reverse proxy: http://localhost:8080
Backend:       http://localhost:8081/api/health
AI service:    http://localhost:8000/health
Whisper:       http://localhost:8001/health
INFO

if [ "$follow_logs" = true ]; then
  docker compose logs -f
fi
