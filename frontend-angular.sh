#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./frontend-angular.sh <start|reload|stop|status|watch> [--force] [--follow-logs] [--interval SECONDS]

Manages the Angular frontend container with content-change aware rebuilds.

Commands:
  start        Start the frontend container; rebuild only when Angular content changed.
  reload       Rebuild/recreate only when Angular content changed, unless --force is used.
  stop         Stop only the frontend container.
  status       Show frontend container status and current content hash.
  watch        Watch Angular content and reload the frontend when it changes.

Options:
  --force             Rebuild/recreate even when content hash did not change.
  --follow-logs       Follow frontend logs after start/reload.
  --interval SECONDS  Poll interval for watch mode. Default: 2.
USAGE
}

command="${1:-}"
if [ -z "$command" ] || [ "$command" = "-h" ] || [ "$command" = "--help" ]; then
  usage
  exit 0
fi
shift || true

force=false
follow_logs=false
interval=2

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)
      force=true
      ;;
    --follow-logs)
      follow_logs=true
      ;;
    --interval)
      shift
      interval="${1:-}"
      if ! [[ "$interval" =~ ^[1-9][0-9]*$ ]]; then
        echo "--interval must be a positive integer." >&2
        exit 1
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift || true
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$script_dir"
frontend_dir="$repo_root/frontend/simplyft"
state_dir="$repo_root/.frontend-angular"
hash_file="$state_dir/content.hash"

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

current_hash() {
  (
    cd "$frontend_dir"
    find . -type f \
      ! -path './node_modules/*' \
      ! -path './dist/*' \
      ! -path './.angular/*' \
      ! -path './coverage/*' \
      ! -path './tmp/*' \
      -print0 \
      | sort -z \
      | xargs -0 sha256sum \
      | sha256sum \
      | awk '{print $1}'
  )
}

stored_hash() {
  if [ -f "$hash_file" ]; then
    cat "$hash_file"
  fi
}

save_hash() {
  mkdir -p "$state_dir"
  printf '%s\n' "$1" > "$hash_file"
}

container_running() {
  [ "$(docker compose ps -q frontend 2>/dev/null | wc -l)" -gt 0 ] &&
    [ "$(docker inspect -f '{{.State.Running}}' "$(docker compose ps -q frontend)" 2>/dev/null || true)" = "true" ]
}

reload_if_needed() {
  local next_hash previous_hash
  next_hash="$(current_hash)"
  previous_hash="$(stored_hash)"

  if [ "$force" = false ] && [ "$next_hash" = "$previous_hash" ] && container_running; then
    echo "Frontend content unchanged. Container already running."
    echo "Frontend: http://localhost:4200"
    return 0
  fi

  if [ "$force" = false ] && [ "$next_hash" = "$previous_hash" ]; then
    echo "Frontend content unchanged. Starting existing image..."
    docker compose up -d frontend
  else
    echo "Frontend content changed. Rebuilding image..."
    docker compose build frontend
    echo "Recreating frontend container..."
    docker compose up -d frontend
    save_hash "$next_hash"
  fi

  echo "Frontend ready: http://localhost:4200"

  if [ "$follow_logs" = true ]; then
    docker compose logs -f frontend
  fi
}

case "$command" in
  start|reload)
    reload_if_needed
    ;;
  stop)
    docker compose stop frontend
    echo "Frontend container stopped."
    ;;
  status)
    docker compose ps frontend
    echo "Current content hash: $(current_hash)"
    echo "Stored content hash:  $(stored_hash)"
    ;;
  watch)
    echo "Watching Angular frontend content every ${interval}s. Press Ctrl+C to stop."
    reload_if_needed
    while true; do
      sleep "$interval"
      if [ "$(current_hash)" != "$(stored_hash)" ]; then
        echo
        echo "Change detected at $(date '+%H:%M:%S')."
        reload_if_needed
      fi
    done
    ;;
  *)
    echo "Unknown command: $command" >&2
    usage >&2
    exit 1
    ;;
esac
