#!/usr/bin/env bash

set -Eeuo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-http://localhost:8000}}"
WORK_DIR="${WORK_DIR:-/tmp/pdf-flow-office-smoke}"
EMAIL="${OFFICE_SMOKE_EMAIL:-office-smoke@example.com}"
PASSWORD="${OFFICE_SMOKE_PASSWORD:-SecurePass123!}"
FULL_NAME="${OFFICE_SMOKE_FULL_NAME:-Office Smoke User}"
POLL_ATTEMPTS="${OFFICE_SMOKE_POLL_ATTEMPTS:-60}"
POLL_SLEEP_SECONDS="${OFFICE_SMOKE_POLL_SLEEP_SECONDS:-2}"
READY_ATTEMPTS="${OFFICE_SMOKE_READY_ATTEMPTS:-20}"
READY_SLEEP_SECONDS="${OFFICE_SMOKE_READY_SLEEP_SECONDS:-3}"
HEALTH_URL="${BASE_URL%/}/health"
DOCS_URL="${BASE_URL%/}/api/docs"
OFFICE_SAMPLE_TEXT="${OFFICE_SAMPLE_TEXT:-Office smoke conversion passed.}"

HTTP_BODY=""
HTTP_STATUS=""
COMPOSE_CMD=()

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

  while (( attempt <= READY_ATTEMPTS )); do
    if curl --fail --silent --show-error \
      --retry 2 \
      --retry-connrefused \
      --retry-delay 1 \
      "$url" >/dev/null; then
      log "$label is reachable"
      return 0
    fi

    log "Waiting for $label ($attempt/$READY_ATTEMPTS)"
    sleep "$READY_SLEEP_SECONDS"
    ((attempt++))
  done

  log "$label did not become reachable in time"
  return 1
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    log "Neither 'docker compose' nor 'docker-compose' is available"
    exit 1
  fi
}

compose_run() {
  "${COMPOSE_CMD[@]}" "$@"
}

extract_json_value() {
  local json_input="$1"
  local key="$2"
  local value

  value="$(printf '%s' "$json_input" | sed -n "s/.*\"$key\":\"\\([^\"]*\\)\".*/\\1/p" | head -n 1)"
  if [[ -z "$value" ]]; then
    log "Could not extract '$key' from response: $json_input"
    exit 1
  fi
  printf '%s' "$value"
}

post_json() {
  local url="$1"
  local payload="$2"
  local auth_token="${3:-}"
  local body_file
  local -a curl_args

  body_file="$(mktemp)"
  curl_args=(
    --silent
    --show-error
    --retry 2
    --retry-connrefused
    --retry-delay 1
    -o "$body_file"
    -w "%{http_code}"
    -H "Content-Type: application/json"
    -d "$payload"
  )
  if [[ -n "$auth_token" ]]; then
    curl_args+=(-H "Authorization: Bearer $auth_token")
  fi

  HTTP_STATUS="$(curl "${curl_args[@]}" "$url")"
  HTTP_BODY="$(cat "$body_file")"
  rm -f "$body_file"
}

post_form_urlencoded() {
  local url="$1"
  shift
  local body_file

  body_file="$(mktemp)"
  HTTP_STATUS="$(curl --silent --show-error \
    --retry 2 \
    --retry-connrefused \
    --retry-delay 1 \
    -o "$body_file" \
    -w "%{http_code}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    "$@" \
    "$url")"
  HTTP_BODY="$(cat "$body_file")"
  rm -f "$body_file"
}

poll_job_completed() {
  local job_id="$1"
  local token="$2"
  local status_json
  local status_value

  for ((attempt=1; attempt<=POLL_ATTEMPTS; attempt++)); do
    status_json="$(curl --fail --silent --show-error \
      -H "Authorization: Bearer $token" \
      "${BASE_URL%/}/api/v1/files/jobs/$job_id")"
    status_value="$(extract_json_value "$status_json" "status")"

    if [[ "$status_value" == "completed" ]]; then
      log "Job $job_id completed"
      printf '%s' "$status_json"
      return 0
    fi

    if [[ "$status_value" == "failed" ]]; then
      log "Job $job_id failed: $status_json"
      return 1
    fi

    log "Waiting for job $job_id ($attempt/$POLL_ATTEMPTS), status=$status_value"
    sleep "$POLL_SLEEP_SECONDS"
  done

  log "Job $job_id did not complete in time"
  return 1
}

register_or_reuse_user() {
  local register_json

  log "Registering Office smoke-test user: $EMAIL"
  post_json \
    "${BASE_URL%/}/api/v1/auth/register" \
    "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"full_name\":\"$FULL_NAME\"}"
  register_json="$HTTP_BODY"

  if [[ "$HTTP_STATUS" == "400" ]] && printf '%s' "$register_json" | grep -q '"detail":"Email already registered"'; then
    log "Office smoke-test user already exists, reusing it"
  elif [[ "$HTTP_STATUS" == "201" ]]; then
    log "Register response received"
  else
    log "Register failed (HTTP $HTTP_STATUS): $register_json"
    exit 1
  fi
}

login_user() {
  local login_json

  log "Logging in"
  post_form_urlencoded \
    "${BASE_URL%/}/api/v1/auth/login" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "username=$EMAIL" \
    --data-urlencode "password=$PASSWORD"
  login_json="$HTTP_BODY"

  if [[ "$HTTP_STATUS" != "200" ]]; then
    log "Login failed (HTTP $HTTP_STATUS): $login_json"
    exit 1
  fi

  extract_json_value "$login_json" "access_token"
}

generate_office_sample_docx() {
  local target="$1"
  mkdir -p "$(dirname "$target")"

  log "Generating DOCX sample file"
  compose_run exec -T \
    -e OFFICE_SAMPLE_TEXT="$OFFICE_SAMPLE_TEXT" \
    backend python - <<'PY' > "$target"
import io
import os
import sys
import zipfile

text = os.environ["OFFICE_SAMPLE_TEXT"]
content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""
rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    <w:p>
      <w:r>
        <w:t>{text}</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""

buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    archive.writestr("[Content_Types].xml", content_types)
    archive.writestr("_rels/.rels", rels)
    archive.writestr("word/document.xml", document)

sys.stdout.buffer.write(buffer.getvalue())
PY

  if [[ ! -s "$target" ]]; then
    log "Failed to generate DOCX sample"
    exit 1
  fi
}

main() {
  local token
  local office_json
  local job_id
  local download_target
  local sample_docx

  require_cmd curl
  require_cmd docker
  detect_compose
  wait_for_url "$HEALTH_URL" "health endpoint"
  wait_for_url "$DOCS_URL" "API docs"

  mkdir -p "$WORK_DIR"
  sample_docx="$WORK_DIR/office-sample.docx"
  download_target="$WORK_DIR/office-result.pdf"

  register_or_reuse_user
  token="$(login_user)"
  generate_office_sample_docx "$sample_docx"

  log "Submitting Office to PDF job"
  office_json="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $token" \
    -F "file=@$sample_docx" \
    "${BASE_URL%/}/api/v1/files/office-to-pdf")"
  job_id="$(extract_json_value "$office_json" "job_id")"
  log "Office job created: $job_id"

  poll_job_completed "$job_id" "$token" >/dev/null

  log "Downloading Office conversion result"
  curl --fail --silent --show-error \
    -H "Authorization: Bearer $token" \
    -o "$download_target" \
    "${BASE_URL%/}/api/v1/files/download/$job_id"

  if [[ ! -s "$download_target" ]]; then
    log "Office conversion result is empty: $download_target"
    exit 1
  fi

  if [[ "$(head -c 4 "$download_target")" != "%PDF" ]]; then
    log "Office conversion result is not a PDF file"
    exit 1
  fi

  log "Office smoke test passed"
  log "Office result saved to $download_target"
}

main "$@"
