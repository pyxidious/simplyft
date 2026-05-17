#!/usr/bin/env bash
set -euo pipefail

remove_volumes=false

for arg in "$@"; do
  case "$arg" in
    --volumes)
      remove_volumes=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./scripts/stop-environment.sh [--volumes]

Stops the full Simplyft Docker Compose environment.

Options:
  --volumes  Also remove Docker Compose volumes, deleting local database/model data.
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

compose_args=(compose down)

if [ "$remove_volumes" = true ]; then
  compose_args+=(--volumes)
fi

echo "Stopping Simplyft environment from $repo_root..."
docker "${compose_args[@]}"

echo "Environment stopped."
