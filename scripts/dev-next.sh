#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NEXT_PORT="${NEXT_PORT:-3080}"
export CHROME_EXTENSION_API_BASE_URL="${CHROME_EXTENSION_API_BASE_URL:-http://localhost:$NEXT_PORT}"
export AUTO_KILL_DEV_PORTS="${AUTO_KILL_DEV_PORTS:-true}"
export SECTION_IMAGE_PROCESSING_CONCURRENCY="${SECTION_IMAGE_PROCESSING_CONCURRENCY:-2}"

node "$ROOT_DIR/scripts/generate-extension-config.mjs"

pids_on_port() {
  fuser -n tcp "$1" 2>/dev/null || true
}

is_project_process() {
  local pid="$1"
  local cwd=""

  cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
  [ "$cwd" = "$ROOT_DIR" ]
}

wait_for_port_release() {
  local port="$1"

  for _ in {1..20}; do
    if [ -z "$(pids_on_port "$port")" ]; then
      return 0
    fi
    sleep 0.2
  done

  return 1
}

ensure_port_available() {
  local port="$1"
  local pids
  local pid
  local blocked=0

  pids="$(pids_on_port "$port")"
  if [ -z "$pids" ]; then
    return 0
  fi

  if [ "$AUTO_KILL_DEV_PORTS" != "true" ]; then
    echo "[dev] porta $port em uso. Finalize o processo ou use NEXT_PORT."
    return 1
  fi

  for pid in $pids; do
    if is_project_process "$pid"; then
      echo "[dev] encerrando processo antigo do projeto na porta $port (pid $pid)"
      pkill -TERM -P "$pid" >/dev/null 2>&1 || true
      kill "$pid" >/dev/null 2>&1 || true
    else
      echo "[dev] porta $port em uso por outro processo (pid $pid); nao vou encerrar automaticamente"
      blocked=1
    fi
  done

  if [ "$blocked" -eq 1 ]; then
    echo "[dev] defina NEXT_PORT com outra porta ou finalize o processo acima."
    return 1
  fi

  wait_for_port_release "$port"
}

ensure_port_available "$NEXT_PORT"

echo "[dev] iniciando Next.js em http://localhost:$NEXT_PORT"
cd "$ROOT_DIR"
exec next dev -p "$NEXT_PORT"
