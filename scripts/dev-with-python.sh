#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY_DIR="$ROOT_DIR/python-api"
PY_VENV="$PY_DIR/.venv"
PY_BIN="$PY_VENV/bin/python"
PIP_BIN="$PY_VENV/bin/pip"
REQ_FILE="$PY_DIR/requirements.txt"
REQ_STAMP="$PY_VENV/.requirements.sha256"

if [ ! -d "$PY_DIR" ]; then
  echo "[dev] pasta python-api nao encontrada em $PY_DIR"
  exit 1
fi

if [ ! -x "$PY_BIN" ]; then
  echo "[dev] criando ambiente virtual python em $PY_VENV"
  python3 -m venv "$PY_VENV"
fi

REQ_HASH="$(sha256sum "$REQ_FILE" | awk '{print $1}')"
STAMP_HASH=""
if [ -f "$REQ_STAMP" ]; then
  STAMP_HASH="$(cat "$REQ_STAMP" || true)"
fi

NEEDS_INSTALL=0
if [ ! -f "$REQ_STAMP" ]; then
  NEEDS_INSTALL=1
elif [ "$REQ_HASH" != "$STAMP_HASH" ]; then
  NEEDS_INSTALL=1
fi

if [ "$NEEDS_INSTALL" -eq 1 ]; then
  echo "[dev] instalando dependencias Python (CPU-only, primeira vez ou requirements alterado)"
  "$PIP_BIN" install --upgrade pip
  "$PIP_BIN" install -r "$REQ_FILE"

  mapfile -t NVIDIA_PKGS < <("$PIP_BIN" freeze | awk -F'==' '/^nvidia-/{print $1}')
  if [ "${#NVIDIA_PKGS[@]}" -gt 0 ]; then
    echo "[dev] removendo pacotes NVIDIA da venv (CPU-only): ${NVIDIA_PKGS[*]}"
    "$PIP_BIN" uninstall -y "${NVIDIA_PKGS[@]}" >/dev/null || true
  fi

  echo "$REQ_HASH" > "$REQ_STAMP"
else
  echo "[dev] dependencias Python ja prontas; pulando pip install"
fi

# Se vazio, a API Python roda sem exigir chave (uso local).
export TRANSLATE_API_KEY="${TRANSLATE_API_KEY:-}"
export YOLO_MODEL_PATH="${YOLO_MODEL_PATH:-$PY_DIR/models/yolo.onnx}"
export OCR_DET_ONNX_PATH="${OCR_DET_ONNX_PATH:-$PY_DIR/models/paddleocr_det.onnx}"
export OCR_REC_ONNX_PATH="${OCR_REC_ONNX_PATH:-$PY_DIR/models/paddleocr_rec.onnx}"
export OCR_REC_DICT_PATH="${OCR_REC_DICT_PATH:-$PY_DIR/models/paddleocr_dict.txt}"
export HF_HOME="${HF_HOME:-$PY_DIR/models/.hf-cache}"
export HUGGINGFACE_HUB_CACHE="${HUGGINGFACE_HUB_CACHE:-$PY_DIR/models/.hf-cache/hub}"
export HF_HUB_OFFLINE="${HF_HUB_OFFLINE:-1}"
export OCR_USE_LOCAL_ONNX="${OCR_USE_LOCAL_ONNX:-true}"
export PYTHON_API_PORT="${PYTHON_API_PORT:-8023}"
export NEXT_PORT="${NEXT_PORT:-3080}"
export CHROME_EXTENSION_API_BASE_URL="${CHROME_EXTENSION_API_BASE_URL:-http://localhost:$NEXT_PORT}"
export AUTO_KILL_DEV_PORTS="${AUTO_KILL_DEV_PORTS:-true}"
export SECTION_IMAGE_PROCESSING_CONCURRENCY="${SECTION_IMAGE_PROCESSING_CONCURRENCY:-10}"

node "$ROOT_DIR/scripts/generate-extension-config.mjs"

pids_on_port() {
  fuser -n tcp "$1" 2>/dev/null || true
}

is_project_process() {
  local pid="$1"
  local cwd=""

  cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
  [ "$cwd" = "$ROOT_DIR" ] || [ "$cwd" = "$PY_DIR" ]
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
  local name="$1"
  local port="$2"
  local pids
  local pid
  local blocked=0

  pids="$(pids_on_port "$port")"
  if [ -z "$pids" ]; then
    return 0
  fi

  if [ "$AUTO_KILL_DEV_PORTS" != "true" ]; then
    echo "[dev] porta $port em uso para $name. Finalize o processo ou use outra porta."
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
    echo "[dev] defina ${name}_PORT com outra porta ou finalize o processo acima."
    return 1
  fi

  wait_for_port_release "$port"
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [ -n "${NEXT_PID:-}" ] && kill -0 "$NEXT_PID" >/dev/null 2>&1; then
    kill "$NEXT_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "${PY_PID:-}" ] && kill -0 "$PY_PID" >/dev/null 2>&1; then
    pkill -TERM -P "$PY_PID" >/dev/null 2>&1 || true
    kill "$PY_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "${NEXT_PID:-}" ]; then
    wait "$NEXT_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "${PY_PID:-}" ]; then
    wait "$PY_PID" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

ensure_port_available "PYTHON_API" "$PYTHON_API_PORT"
ensure_port_available "NEXT" "$NEXT_PORT"

echo "[dev] iniciando API Python em http://localhost:$PYTHON_API_PORT"
(
  cd "$PY_DIR"
  exec "$PY_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port "$PYTHON_API_PORT" --reload
) &
PY_PID=$!

echo "[dev] iniciando Next.js em http://localhost:$NEXT_PORT"
cd "$ROOT_DIR"
next dev -p "$NEXT_PORT" &
NEXT_PID=$!

wait -n "$PY_PID" "$NEXT_PID"
