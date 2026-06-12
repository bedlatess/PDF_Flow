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
OLD_TARGET_ACTION="${RECLONE_OLD_TARGET_ACTION:-backup}"
CONFIRM_DELETE="${RECLONE_CONFIRM_DELETE:-}"
PURGE_COMPOSE_VOLUMES="${RECLONE_PURGE_COMPOSE_VOLUMES:-0}"
CONFIRM_PURGE_VOLUMES="${RECLONE_CONFIRM_PURGE_VOLUMES:-}"
REMOVE_COMPOSE_IMAGES="${RECLONE_REMOVE_COMPOSE_IMAGES:-none}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
declare -a COMPOSE_CMD
declare -a COMPOSE_ENV_ARGS

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

  case "$OLD_TARGET_ACTION" in
    backup|delete)
      ;;
    *)
      fail "Unsupported RECLONE_OLD_TARGET_ACTION=$OLD_TARGET_ACTION. Use backup or delete."
      ;;
  esac

  case "$REMOVE_COMPOSE_IMAGES" in
    none|local|all)
      ;;
    *)
      fail "Unsupported RECLONE_REMOVE_COMPOSE_IMAGES=$REMOVE_COMPOSE_IMAGES. Use none, local, or all."
      ;;
  esac

  if [[ "$OLD_TARGET_ACTION" == "delete" && "$CONFIRM_DELETE" != "DELETE_OLD_PDF_FLOW" ]]; then
    fail "Deleting the old target requires RECLONE_CONFIRM_DELETE=DELETE_OLD_PDF_FLOW"
  fi

  if [[ "$PURGE_COMPOSE_VOLUMES" == "1" && "$CONFIRM_PURGE_VOLUMES" != "DELETE_PDF_FLOW_DATA" ]]; then
    fail "Deleting Compose volumes requires RECLONE_CONFIRM_PURGE_VOLUMES=DELETE_PDF_FLOW_DATA"
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
  local compose_project_dir compose_env_file

  compose_project_dir="$(dirname "$compose_file")"
  compose_env_file=""

  if [[ -f "$compose_project_dir/.env" ]]; then
    compose_env_file="$compose_project_dir/.env"
  elif [[ -f "$compose_project_dir/backend/.env" ]]; then
    compose_env_file="$compose_project_dir/backend/.env"
  fi

  COMPOSE_ENV_ARGS=()
  if [[ -n "$compose_env_file" ]]; then
    COMPOSE_ENV_ARGS=(--env-file "$compose_env_file")
    log "Using old Docker Compose env file: $compose_env_file"
  fi

  if ! command -v docker >/dev/null 2>&1; then
    log "Docker is not installed or not in PATH; skipping compose stop"
    COMPOSE_CMD=()
    return
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose --project-directory "$compose_project_dir" "${COMPOSE_ENV_ARGS[@]}" -f "$compose_file")
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose --project-directory "$compose_project_dir" "${COMPOSE_ENV_ARGS[@]}" -f "$compose_file")
  else
    log "No Docker Compose command found; skipping compose stop"
    COMPOSE_CMD=()
  fi
}

stop_old_services() {
  if [[ -f "$TARGET_DIR/docker-compose.yml" ]]; then
    local -a down_args

    detect_compose "$TARGET_DIR/docker-compose.yml"
    if [[ "${#COMPOSE_CMD[@]}" -gt 0 ]]; then
      down_args=(down --remove-orphans)

      if [[ "$PURGE_COMPOSE_VOLUMES" == "1" ]]; then
        down_args+=(--volumes)
      fi

      if [[ "$REMOVE_COMPOSE_IMAGES" != "none" ]]; then
        down_args+=(--rmi "$REMOVE_COMPOSE_IMAGES")
      fi

      run "${COMPOSE_CMD[@]}" "${down_args[@]}"
    elif [[ "$OLD_TARGET_ACTION" == "delete" && "$DRY_RUN" == "1" ]]; then
      log "Would refuse real delete if old Compose services cannot be stopped"
    elif [[ "$OLD_TARGET_ACTION" == "delete" ]]; then
      fail "Refusing to delete old Docker project because Compose services could not be stopped"
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

preserve_restore_files() {
  local restore_source="$1"
  local relative_path

  run mkdir -p "$restore_source"

  for relative_path in ".env" "backend/.env" "docker-compose.override.yml" "backend/docker-compose.override.yml"; do
    if [[ -f "$TARGET_DIR/$relative_path" ]]; then
      run mkdir -p "$(dirname "$restore_source/$relative_path")"
      run cp "$TARGET_DIR/$relative_path" "$restore_source/$relative_path"
      log "Preserved $relative_path before deleting old target"
    fi
  done
}

delete_old_target() {
  local restore_source="$1"

  if [[ ! -e "$TARGET_DIR" ]]; then
    log "Target does not exist yet; no old directory delete needed"
    return
  fi

  preserve_restore_files "$restore_source"
  run rm -rf -- "$TARGET_DIR"
  log "Old target deleted: $TARGET_DIR"
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
  local backup_dir old_target_backup preserved_config temp_dir restore_source

  validate_inputs
  validate_existing_target

  backup_dir="$BACKUP_ROOT/$(basename "$TARGET_DIR")-$TIMESTAMP"
  old_target_backup="$backup_dir/old-project"
  preserved_config="$backup_dir/preserved-config"
  temp_dir="$(dirname "$TARGET_DIR")/.reclone-$(basename "$TARGET_DIR")-$TIMESTAMP"
  restore_source="$old_target_backup"

  log "Server clean re-clone plan"
  log "Repository: $REPO_URL"
  log "Branch: $BRANCH"
  log "Target: $TARGET_DIR"
  log "Backup: $backup_dir"
  log "Old target action: $OLD_TARGET_ACTION"
  log "Purge Compose volumes: $PURGE_COMPOSE_VOLUMES"
  log "Remove Compose images: $REMOVE_COMPOSE_IMAGES"
  log "Dry run: $DRY_RUN"

  run mkdir -p "$backup_dir"
  if [[ -e "$TARGET_DIR" ]]; then
    run_custom_backup "$backup_dir"
  fi
  stop_old_services
  if [[ "$OLD_TARGET_ACTION" == "delete" ]]; then
    delete_old_target "$preserved_config"
    restore_source="$preserved_config"
  else
    move_old_target_to_backup "$old_target_backup"
    restore_source="$old_target_backup"
  fi
  clone_new_project "$temp_dir"
  restore_env_files "$restore_source"
  deploy_new_project

  if [[ "$DRY_RUN" == "1" ]]; then
    log "Dry run complete. Re-run with RECLONE_DRY_RUN=0 on the server to execute."
  else
    log "Fresh clone deployment complete."
    log "Keep the backup until the new production smoke and manual checks pass: $backup_dir"
  fi
}

main "$@"
