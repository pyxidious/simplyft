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
Usage: ./scripts/reload-frontend.sh [--follow-logs]

Rebuilds the frontend Docker image and recreates only the frontend container.
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

echo "Rebuilding frontend image..."
docker compose build frontend

echo "Recreating frontend container..."
docker compose up -d frontend

cat <<'INFO'

Frontend reloaded.
Frontend: http://localhost:4200
INFO

if [ "$follow_logs" = true ]; then
  docker compose logs -f frontend
fi
