#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_NAME="${NEW_REPO_REMOTE:-new-origin}"
REPO_URL="${NEW_REPO_URL:-}"
BRANCH="${NEW_REPO_BRANCH:-main}"
DRY_RUN="${NEW_REPO_DRY_RUN:-1}"
PUSH_TAGS="${NEW_REPO_PUSH_TAGS:-0}"
ALLOW_DIRTY="${NEW_REPO_ALLOW_DIRTY:-0}"
ALLOW_ORIGIN_REWRITE="${NEW_REPO_ALLOW_ORIGIN_REWRITE:-0}"
ALLOW_NON_EMPTY_REMOTE="${NEW_REPO_ALLOW_NON_EMPTY_REMOTE:-0}"
FORCE_WITH_LEASE="${NEW_REPO_FORCE_WITH_LEASE:-0}"

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

ensure_repo_ready() {
  require_cmd git

  git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Not inside a Git worktree"

  if [[ -z "$REPO_URL" ]]; then
    fail "NEW_REPO_URL is required, for example: NEW_REPO_URL=git@github.com:owner/pdf-flow-v2.git"
  fi

  if [[ "$REMOTE_NAME" == "origin" && "$ALLOW_ORIGIN_REWRITE" != "1" ]]; then
    fail "Refusing to use remote name 'origin'. Use NEW_REPO_REMOTE=new-origin, or set NEW_REPO_ALLOW_ORIGIN_REWRITE=1 intentionally."
  fi

  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" && "$ALLOW_DIRTY" != "1" ]]; then
    git -C "$ROOT_DIR" status --short
    fail "Worktree has uncommitted changes. Commit the version you want to publish first, or set NEW_REPO_ALLOW_DIRTY=1 if you only want to push the current committed HEAD."
  fi
}

configure_remote() {
  local existing_url

  existing_url="$(git -C "$ROOT_DIR" remote get-url "$REMOTE_NAME" 2>/dev/null || true)"

  if [[ -n "$existing_url" ]]; then
    if [[ "$existing_url" != "$REPO_URL" ]]; then
      log "Remote '$REMOTE_NAME' already points to: $existing_url"
      run git -C "$ROOT_DIR" remote set-url "$REMOTE_NAME" "$REPO_URL"
    else
      log "Remote '$REMOTE_NAME' already points to the target repository"
    fi
  else
    run git -C "$ROOT_DIR" remote add "$REMOTE_NAME" "$REPO_URL"
  fi
}

ensure_remote_target_is_safe() {
  local ls_output

  if [[ "$DRY_RUN" == "1" ]]; then
    log "Dry run: skipping remote branch inspection"
    return
  fi

  ls_output="$(git -C "$ROOT_DIR" ls-remote --heads "$REMOTE_NAME" 2>/dev/null || true)"

  if [[ -n "$ls_output" && "$ALLOW_NON_EMPTY_REMOTE" != "1" ]]; then
    printf '%s\n' "$ls_output"
    fail "Target repository already has branches. Use a new empty repo, or set NEW_REPO_ALLOW_NON_EMPTY_REMOTE=1 after reviewing it."
  fi
}

push_branch() {
  local push_args

  if [[ "$FORCE_WITH_LEASE" == "1" ]]; then
    push_args=(--force-with-lease)
  else
    push_args=()
  fi

  run git -C "$ROOT_DIR" push "${push_args[@]}" "$REMOTE_NAME" "HEAD:refs/heads/$BRANCH"

  if [[ "$PUSH_TAGS" == "1" ]]; then
    run git -C "$ROOT_DIR" push "$REMOTE_NAME" --tags
  fi
}

main() {
  log "Preparing current committed project for a new GitHub repository"
  log "Remote: $REMOTE_NAME -> ${REPO_URL:-<missing>}"
  log "Branch: $BRANCH"
  log "Dry run: $DRY_RUN"

  ensure_repo_ready
  configure_remote
  ensure_remote_target_is_safe
  push_branch

  if [[ "$DRY_RUN" == "1" ]]; then
    log "Dry run complete. Re-run with NEW_REPO_DRY_RUN=0 to push."
  else
    log "Push complete. New server deployments should clone $REPO_URL branch $BRANCH."
  fi
}

main "$@"
