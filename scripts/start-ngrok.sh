#!/usr/bin/env bash
set -euo pipefail

port="${NGROK_PORT:-8080}"
start_environment=true
start_args=()

usage() {
  cat <<'USAGE'
Usage: ./scripts/start-ngrok.sh [--port PORT] [--no-start] [--no-build]

Starts the Simplyft environment and exposes the site through ngrok.

Options:
  --port PORT   Local port to expose with ngrok. Defaults to 8080.
  --no-start    Do not start Docker Compose before opening ngrok.
  --no-build    Pass --no-build to scripts/start-environment.sh.
  -h, --help    Show this help.

Examples:
  ./scripts/start-ngrok.sh
  ./scripts/start-ngrok.sh --no-build
  ./scripts/start-ngrok.sh --port 4200 --no-start
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --port)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --port." >&2
        exit 1
      fi
      port="$2"
      shift 2
      ;;
    --port=*)
      port="${1#*=}"
      shift
      ;;
    --no-start)
      start_environment=false
      shift
      ;;
    --no-build)
      start_args+=(--no-build)
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

if ! [[ "$port" =~ ^[0-9]+$ ]]; then
  echo "Port must be a number: $port" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
pid_file="$repo_root/.ngrok.pid"
log_file="$repo_root/.ngrok.log"

cd "$repo_root"

if ! command -v ngrok >/dev/null 2>&1; then
  cat >&2 <<'ERROR'
ngrok is not available.
Install it from https://ngrok.com/download and run `ngrok config add-authtoken ...` if your account requires it.
ERROR
  exit 1
fi

if [ "$start_environment" = true ]; then
  "$script_dir/start-environment.sh" "${start_args[@]}"
fi

if [ -f "$pid_file" ]; then
  existing_pid="$(cat "$pid_file")"
  if [[ "$existing_pid" =~ ^[0-9]+$ ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
    echo "ngrok tunnel is already running with PID $existing_pid."
    echo "Run ./scripts/stop-ngrok.sh before starting a new tunnel."
    exit 1
  fi
  rm -f "$pid_file"
fi

cat <<INFO

Opening Simplyft through ngrok...
Local site: http://localhost:$port

Starting ngrok in background...

INFO

: > "$log_file"
nohup ngrok http "$port" --log=stdout > "$log_file" 2>&1 &
ngrok_pid="$!"
echo "$ngrok_pid" > "$pid_file"

public_url=""
for _ in {1..30}; do
  if ! kill -0 "$ngrok_pid" >/dev/null 2>&1; then
    echo "ngrok exited before opening a tunnel. Log output:" >&2
    sed -n '1,120p' "$log_file" >&2
    rm -f "$pid_file"
    exit 1
  fi

  tunnels_json="$(curl -fsS http://127.0.0.1:4040/api/tunnels 2>/dev/null || true)"
  public_url="$(printf '%s\n' "$tunnels_json" | sed -n 's/.*"public_url":"\(https:\/\/[^"]*\)".*/\1/p' | head -n 1)"
  if [ -n "$public_url" ]; then
    break
  fi

  sleep 1
done

if [ -z "$public_url" ]; then
  echo "ngrok started in background with PID $ngrok_pid, but no public HTTPS URL was detected yet." >&2
  echo "Check the log with: tail -f $log_file" >&2
  exit 1
fi

echo "ngrok started in background with PID $ngrok_pid."
echo "Public URL: $public_url"
