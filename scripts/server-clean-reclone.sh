#!/usr/bin/env bash

set -Eeuo pipefail

REPO_URL="${RECLONE_REPO_URL:-}"
TARGET_DIR="${RECLONE_TARGET_DIR:-}"
BRANCH="${RECLONE_BRANCH:-main}"
DRY_RUN="${RECLONE_DRY_RUN:-1}"
ALLOW_UNKNOWN_TARGET="${RECLONE_ALLOW_UNKNOWN_TARGET:-0}"
BACKUP_ROOT="${RECLONE_BACKUP_ROOT:-}"
RUN_DEPLOY="${RECLONE_RUN_DEPLOY:-1}"
RUN_MAIN_SMOKE="${RECLONE_RUN_MAIN_SMOKE:-}"
RESTORE_ENV="${RECLONE_RESTORE_ENV:-1}"
BACKUP_COMMAND="${RECLONE_BACKUP_COMMAND:-}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
declare -a COMPOSE_CMD

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

fail() {
  log "$*"
  exit 1
}

run() {
  log "+ $*"
  if [[ "$DRY_RUN" != "1" ]]; then
    "$@"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
  fi
}

abs_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s/%s\n' "$(pwd)" "$path"
  fi
}

validate_inputs() {
  require_cmd git

  if [[ -z "$REPO_URL" ]]; then
    fail "RECLONE_REPO_URL is required, for example: RECLONE_REPO_URL=git@github.com:owner/pdf-flow-v2.git"
  fi

  if [[ -z "$TARGET_DIR" ]]; then
    fail "RECLONE_TARGET_DIR is required. Use an explicit absolute server path such as /opt/pdf-flow."
  fi

  TARGET_DIR="$(abs_path "$TARGET_DIR")"

  case "$TARGET_DIR" in
    "/"|"/root"|"/home"|"/opt"|"/var"|"/srv"|"$HOME")
      fail "Refusing unsafe target directory: $TARGET_DIR"
      ;;
  esac

  if [[ "${#TARGET_DIR}" -lt 8 ]]; then
    fail "Refusing very short target directory: $TARGET_DIR"
  fi

  if [[ -z "$BACKUP_ROOT" ]]; then
    BACKUP_ROOT="$(dirname "$TARGET_DIR")/.pdf-flow-reclone-backups"
  else
    BACKUP_ROOT="$(abs_path "$BACKUP_ROOT")"
  fi

  if [[ -z "$RUN_MAIN_SMOKE" ]]; then
    if [[ "$BRANCH" == "main" ]]; then
      RUN_MAIN_SMOKE="1"
    else
      RUN_MAIN_SMOKE="0"
    fi
  fi
}

target_has_project_markers() {
  [[ -d "$TARGET_DIR/.git" ]] &&
    [[ -f "$TARGET_DIR/docker-compose.yml" ]] &&
    [[ -f "$TARGET_DIR/package.json" ]] &&
    [[ -f "$TARGET_DIR/backend/app/main.py" ]]
}

validate_existing_target() {
  if [[ ! -e "$TARGET_DIR" ]]; then
    return
  fi

  if [[ ! -d "$TARGET_DIR" ]]; then
    fail "Target exists but is not a directory: $TARGET_DIR"
  fi

  if target_has_project_markers; then
    log "Existing target looks like a PDF-Flow deployment"
    return
  fi

  if [[ -z "$(find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    log "Existing target directory is empty"
    return
  fi

  if [[ "$ALLOW_UNKNOWN_TARGET" != "1" ]]; then
    fail "Target is not empty and does not look like PDF-Flow. Set RECLONE_ALLOW_UNKNOWN_TARGET=1 only after manual review."
  fi

  log "Proceeding with unknown target because RECLONE_ALLOW_UNKNOWN_TARGET=1"
}

detect_compose() {
  local compose_file="$1"

  if ! command -v docker >/dev/null 2>&1; then
    log "Docker is not installed or not in PATH; skipping compose stop"
    COMPOSE_CMD=()
    return
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose -f "$compose_file")
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose -f "$compose_file")
  else
    log "No Docker Compose command found; skipping compose stop"
    COMPOSE_CMD=()
  fi
}

stop_old_services() {
  if [[ -f "$TARGET_DIR/docker-compose.yml" ]]; then
    detect_compose "$TARGET_DIR/docker-compose.yml"
    if [[ "${#COMPOSE_CMD[@]}" -gt 0 ]]; then
      run "${COMPOSE_CMD[@]}" down
    fi
  else
    log "No old docker-compose.yml found; skipping old service stop"
  fi
}

run_custom_backup() {
  local backup_dir="$1"

  if [[ -n "$BACKUP_COMMAND" ]]; then
    log "Running custom backup command"
    if [[ "$DRY_RUN" == "1" ]]; then
      log "+ BACKUP_DIR=$backup_dir TARGET_DIR=$TARGET_DIR bash -lc <RECLONE_BACKUP_COMMAND>"
    else
      BACKUP_DIR="$backup_dir" TARGET_DIR="$TARGET_DIR" bash -lc "$BACKUP_COMMAND"
    fi
  fi
}

move_old_target_to_backup() {
  local old_target_backup="$1"

  run mkdir -p "$(dirname "$old_target_backup")"

  if [[ -e "$TARGET_DIR" ]]; then
    run mv "$TARGET_DIR" "$old_target_backup"
    log "Old target moved to backup: $old_target_backup"
  else
    log "Target does not exist yet; no old directory backup needed"
  fi
}

clone_new_project() {
  local temp_dir="$1"
  local parent_dir

  parent_dir="$(dirname "$TARGET_DIR")"
  run mkdir -p "$parent_dir"
  run git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$temp_dir"
  run mv "$temp_dir" "$TARGET_DIR"
}

restore_env_files() {
  local backup_dir="$1"
  local relative_path

  if [[ "$RESTORE_ENV" != "1" || ! -d "$backup_dir" ]]; then
    return
  fi

  for relative_path in ".env" "backend/.env" "docker-compose.override.yml" "backend/docker-compose.override.yml"; do
    if [[ -f "$backup_dir/$relative_path" ]]; then
      run mkdir -p "$(dirname "$TARGET_DIR/$relative_path")"
      run cp "$backup_dir/$relative_path" "$TARGET_DIR/$relative_path"
      log "Restored $relative_path from backup"
    fi
  done
}

deploy_new_project() {
  if [[ "$RUN_DEPLOY" != "1" ]]; then
    log "Skipping deploy because RECLONE_RUN_DEPLOY=$RUN_DEPLOY"
    return
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    if [[ "$BRANCH" == "main" ]]; then
      log "+ bash $TARGET_DIR/scripts/deploy-main.sh"
    else
      log "+ DEPLOY_BRANCH=$BRANCH bash $TARGET_DIR/scripts/deploy-staging.sh"
    fi

    if [[ "$RUN_MAIN_SMOKE" == "1" ]]; then
      log "+ bash $TARGET_DIR/scripts/main-smoke-suite.sh"
    fi

    return
  fi

  if [[ "$BRANCH" == "main" && -f "$TARGET_DIR/scripts/deploy-main.sh" ]]; then
    run bash "$TARGET_DIR/scripts/deploy-main.sh"
  elif [[ -f "$TARGET_DIR/scripts/deploy-staging.sh" ]]; then
    run env DEPLOY_BRANCH="$BRANCH" bash "$TARGET_DIR/scripts/deploy-staging.sh"
  else
    fail "No deploy script found in fresh clone"
  fi

  if [[ "$RUN_MAIN_SMOKE" == "1" && -f "$TARGET_DIR/scripts/main-smoke-suite.sh" ]]; then
    run bash "$TARGET_DIR/scripts/main-smoke-suite.sh"
  fi
}

main() {
  local backup_dir old_target_backup temp_dir

  validate_inputs
  validate_existing_target

  backup_dir="$BACKUP_ROOT/$(basename "$TARGET_DIR")-$TIMESTAMP"
  old_target_backup="$backup_dir/old-project"
  temp_dir="$(dirname "$TARGET_DIR")/.reclone-$(basename "$TARGET_DIR")-$TIMESTAMP"

  log "Server clean re-clone plan"
  log "Repository: $REPO_URL"
  log "Branch: $BRANCH"
  log "Target: $TARGET_DIR"
  log "Backup: $backup_dir"
  log "Dry run: $DRY_RUN"

  run mkdir -p "$backup_dir"
  if [[ -e "$TARGET_DIR" ]]; then
    run_custom_backup "$backup_dir"
  fi
  stop_old_services
  move_old_target_to_backup "$old_target_backup"
  clone_new_project "$temp_dir"
  restore_env_files "$old_target_backup"
  deploy_new_project

  if [[ "$DRY_RUN" == "1" ]]; then
    log "Dry run complete. Re-run with RECLONE_DRY_RUN=0 on the server to execute."
  else
    log "Fresh clone deployment complete."
    log "Keep the backup until the new production smoke and manual checks pass: $backup_dir"
  fi
}

main "$@"
