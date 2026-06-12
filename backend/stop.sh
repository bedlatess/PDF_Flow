#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    log "Stopping ${label} (PID: ${pid})"
    kill "$pid" 2>/dev/null || true
  else
    log "${label} is already stopped"
  fi
  rm -f "$pid_file"
}

stop_docker_services() {
  if [[ "${1:-}" != "--docker" ]]; then
    return
  fi

  log "Stopping backend Docker services"
  if docker compose version >/dev/null 2>&1; then
    docker compose down
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
  else
    log "No Docker Compose command found; skipping Docker shutdown"
  fi
}

main() {
  log "Stopping PDF-Flow backend services"
  stop_pid_file ".fastapi.pid" "FastAPI"
  stop_pid_file ".celery.pid" "Celery worker"
  stop_pid_file ".beat.pid" "Celery beat"
  stop_docker_services "${1:-}"
  log "Backend services stopped"
}

main "$@"
