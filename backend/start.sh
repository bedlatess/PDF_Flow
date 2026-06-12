#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

require_file() {
  if [[ ! -f "$1" ]]; then
    log "Missing required file: $1"
    exit 1
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

cleanup_existing_pids() {
  rm -f .fastapi.pid .celery.pid .beat.pid
}

load_env() {
  require_file ".env"
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
  log "Loaded backend/.env"
}

start_docker_dependencies() {
  if [[ "${USE_DOCKER_DB:-false}" != "true" ]]; then
    return
  fi

  require_cmd docker
  log "Starting PostgreSQL and Redis through backend/docker-compose.yml"
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d db redis
  else
    require_cmd docker-compose
    docker-compose up -d db redis
  fi
}

run_migrations() {
  if [[ "${RUN_MIGRATIONS:-1}" != "1" ]]; then
    log "Skipping migrations because RUN_MIGRATIONS=${RUN_MIGRATIONS:-0}"
    return
  fi

  require_cmd alembic
  log "Running database migrations"
  alembic upgrade head
}

start_services() {
  require_cmd uvicorn
  require_cmd celery

  local host="${BACKEND_HOST:-0.0.0.0}"
  local port="${BACKEND_PORT:-8000}"
  local reload_flag=()

  if [[ "${DEBUG:-false}" == "true" || "${DEBUG:-false}" == "True" ]]; then
    reload_flag=(--reload)
  fi

  log "Starting FastAPI on ${host}:${port}"
  uvicorn app.main:app --host "$host" --port "$port" "${reload_flag[@]}" &
  echo $! > .fastapi.pid

  log "Starting Celery worker"
  celery -A app.celery_worker worker --loglevel="${CELERY_LOGLEVEL:-info}" --concurrency="${CELERY_CONCURRENCY:-4}" &
  echo $! > .celery.pid

  if [[ "${START_CELERY_BEAT:-0}" == "1" ]]; then
    log "Starting Celery beat"
    celery -A app.celery_worker beat --loglevel="${CELERY_LOGLEVEL:-info}" &
    echo $! > .beat.pid
  fi
}

print_status() {
  local port="${BACKEND_PORT:-8000}"
  log "Backend services started"
  log "FastAPI: http://localhost:${port}"
  log "API docs: http://localhost:${port}/api/docs"
  log "Health: http://localhost:${port}/health"
  log "PIDs: FastAPI=$(cat .fastapi.pid), Celery=$(cat .celery.pid)"
  log "Stop with: ./stop.sh"
}

main() {
  log "Starting PDF-Flow backend services"
  cleanup_existing_pids
  load_env
  start_docker_dependencies
  run_migrations
  start_services
  print_status
  wait
}

main "$@"
