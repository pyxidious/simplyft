#!/usr/bin/env bash
set -euo pipefail

follow_logs=false

for arg in "$@"; do
  case "$arg" in
    --follow-logs)
      follow_logs=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./scripts/update-frontend.sh [--follow-logs]

Rebuilds and recreates only the Docker Compose frontend service.
It does not restart backend, databases, AI services, nginx, or other containers.
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

echo "Building Docker Compose service: frontend"
docker compose build frontend

echo "Recreating only Docker Compose service: frontend"
docker compose up -d --no-deps frontend

cat <<'INFO'

Frontend updated.
Frontend: http://localhost:4200
INFO

if [ "$follow_logs" = true ]; then
  docker compose logs -f frontend
fi
