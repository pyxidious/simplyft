#!/usr/bin/env bash
set -euo pipefail

stop_environment=false
stop_args=()

usage() {
  cat <<'USAGE'
Usage: ./scripts/stop-ngrok.sh [--environment] [--volumes]

Stops the Simplyft ngrok tunnel started by scripts/start-ngrok.sh.

Options:
  --environment  Also stop the Docker Compose environment.
  --volumes      Also remove Docker Compose volumes when stopping the environment.
  -h, --help     Show this help.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --environment)
      stop_environment=true
      shift
      ;;
    --volumes)
      stop_environment=true
      stop_args+=(--volumes)
      shift
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
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
pid_file="$repo_root/.ngrok.pid"

cd "$repo_root"

stopped=false

if [ -f "$pid_file" ]; then
  pid="$(cat "$pid_file")"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping ngrok tunnel with PID $pid..."
    kill "$pid"
    stopped=true
  fi
  rm -f "$pid_file"
fi

if [ "$stopped" = false ]; then
  mapfile -t pids < <(pgrep -f "ngrok http" || true)
  if [ "${#pids[@]}" -gt 0 ]; then
    echo "Stopping ngrok tunnel process(es): ${pids[*]}..."
    kill "${pids[@]}"
    stopped=true
  fi
fi

if [ "$stopped" = true ]; then
  echo "ngrok tunnel stopped."
else
  echo "No ngrok tunnel was running."
fi

if [ "$stop_environment" = true ]; then
  "$script_dir/stop-environment.sh" "${stop_args[@]}"
fi
