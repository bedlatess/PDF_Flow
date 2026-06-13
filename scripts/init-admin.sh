#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env}"

if [[ -z "${PDF_FLOW_ADMIN_EMAIL:-${ADMIN_EMAIL:-}}" ]]; then
  echo "Missing PDF_FLOW_ADMIN_EMAIL or ADMIN_EMAIL." >&2
  exit 2
fi

if [[ -z "${PDF_FLOW_ADMIN_PASSWORD:-${ADMIN_PASSWORD:-}}" ]]; then
  echo "Missing PDF_FLOW_ADMIN_PASSWORD or ADMIN_PASSWORD." >&2
  exit 2
fi

cd "$ROOT_DIR"

docker compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T \
  -e PDF_FLOW_ADMIN_EMAIL="${PDF_FLOW_ADMIN_EMAIL:-${ADMIN_EMAIL:-}}" \
  -e PDF_FLOW_ADMIN_PASSWORD="${PDF_FLOW_ADMIN_PASSWORD:-${ADMIN_PASSWORD:-}}" \
  -e PDF_FLOW_ADMIN_NAME="${PDF_FLOW_ADMIN_NAME:-${ADMIN_NAME:-PDF-Flow Admin}}" \
  backend \
  python -m app.cli.init_admin ${UPDATE_ADMIN_PASSWORD:+--update-password}
