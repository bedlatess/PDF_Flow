#!/usr/bin/env bash

set -Eeuo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-http://localhost:8000}}"
HEALTH_URL="${BASE_URL%/}/health"
DOCS_URL="${BASE_URL%/}/api/docs"
MAX_ATTEMPTS="${SMOKE_MAX_ATTEMPTS:-20}"
SLEEP_SECONDS="${SMOKE_SLEEP_SECONDS:-3}"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempt=1

  while (( attempt <= MAX_ATTEMPTS )); do
    if curl --fail --silent --show-error "$url" >/dev/null; then
      log "$label is reachable"
      return 0
    fi

    log "Waiting for $label ($attempt/$MAX_ATTEMPTS)"
    sleep "$SLEEP_SECONDS"
    ((attempt++))
  done

  log "$label did not become reachable in time"
  return 1
}

main() {
  require_cmd curl
  wait_for_url "$HEALTH_URL" "health endpoint"
  wait_for_url "$DOCS_URL" "API docs"
  log "Smoke tests passed"
}

main "$@"
