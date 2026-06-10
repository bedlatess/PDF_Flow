#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_ID="${RUN_ID:-$(date +%s)}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_step() {
  local label="$1"
  shift

  log "Starting ${label}"
  "$@"
  log "Passed ${label}"
}

run_step "health smoke test" bash "$SCRIPT_DIR/smoke-test.sh"
run_step "business smoke test" env BUSINESS_SMOKE_EMAIL="smoke-${RUN_ID}@example.com" bash "$SCRIPT_DIR/business-smoke-test.sh"
run_step "OCR smoke test" env OCR_SMOKE_EMAIL="ocr-${RUN_ID}@example.com" bash "$SCRIPT_DIR/ocr-smoke-test.sh"
run_step "Office smoke test" env OFFICE_SMOKE_EMAIL="office-${RUN_ID}@example.com" bash "$SCRIPT_DIR/office-smoke-test.sh"

log "All main smoke checks passed"
