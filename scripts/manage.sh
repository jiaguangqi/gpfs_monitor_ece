#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="${PROJECT_ROOT}/.pids"
LOG_DIR="${PROJECT_ROOT}/logs"

API_PORT="${API_PORT:-3001}"
API_HOST="${API_HOST:-0.0.0.0}"
FRONT_PORT="${FRONT_PORT:-4173}"

API_PID_FILE="${PID_DIR}/backend.pid"
FRONT_PID_FILE="${PID_DIR}/frontend.pid"
API_LOG_FILE="${LOG_DIR}/backend.log"
FRONT_LOG_FILE="${LOG_DIR}/frontend.log"

mkdir -p "${PID_DIR}" "${LOG_DIR}"

function ensure_node_modules() {
  if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
    echo "node_modules missing, installing dependencies..."
    (cd "$PROJECT_ROOT" && npm install >/dev/null 2>&1)
  fi
}

function usage() {
  cat <<EOF
Usage: $(basename "$0") <start|stop|restart|status|logs|preview>

Environment:
  API_PORT    API server port (default: ${API_PORT})
  API_HOST    API bind host   (default: ${API_HOST})
  FRONT_PORT  Frontend port   (default: ${FRONT_PORT})
EOF
}

function is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

function start_api() {
  ensure_node_modules
  if is_running "$API_PID_FILE"; then
    echo "API already running (pid $(cat "$API_PID_FILE"))."
    return
  fi
  (
    cd "$PROJECT_ROOT"
    HOST="$API_HOST" PORT="$API_PORT" NODE_ENV=production npm run start:api \
      >"$API_LOG_FILE" 2>&1 &
    echo $! >"$API_PID_FILE"
  )
  sleep 1
  if is_running "$API_PID_FILE"; then
    echo "API started on http://${API_HOST}:${API_PORT} (pid $(cat "$API_PID_FILE"))."
  else
    echo "API failed to start; see $API_LOG_FILE:"
    tail -n 20 "$API_LOG_FILE" || true
  fi
}

function start_frontend() {
  ensure_node_modules
  if [[ ! -d "${PROJECT_ROOT}/dist" ]]; then
    echo "Frontend build not found (dist missing). Run scripts/deploy.sh first." >&2
    exit 1
  fi
  if is_running "$FRONT_PID_FILE"; then
    echo "Frontend already running (pid $(cat "$FRONT_PID_FILE"))."
    return
  fi
  (
    cd "$PROJECT_ROOT"
    npm run preview -- --host 0.0.0.0 --port "$FRONT_PORT" \
      >"$FRONT_LOG_FILE" 2>&1 &
    echo $! >"$FRONT_PID_FILE"
  )
  echo "Frontend started on http://0.0.0.0:${FRONT_PORT} (pid $(cat "$FRONT_PID_FILE"))."
}

function stop_service() {
  local name="$1" pid_file="$2"
  if is_running "$pid_file"; then
    local pid
    pid="$(cat "$pid_file")"
    kill "$pid" >/dev/null 2>&1 || true
    rm -f "$pid_file"
    echo "Stopped ${name} (pid ${pid})."
  else
    echo "${name} not running."
    rm -f "$pid_file"
  fi
}

function status() {
  if is_running "$API_PID_FILE"; then
    echo "API: running (pid $(cat "$API_PID_FILE")) on ${API_HOST}:${API_PORT}"
  else
    echo "API: stopped"
  fi
  if is_running "$FRONT_PID_FILE"; then
    echo "Frontend: running (pid $(cat "$FRONT_PID_FILE")) on 0.0.0.0:${FRONT_PORT}"
  else
    echo "Frontend: stopped"
  fi
}

function show_logs() {
  echo "==> API log: $API_LOG_FILE"
  tail -n 40 "$API_LOG_FILE" || echo "No API logs yet."
  echo "==> Frontend log: $FRONT_LOG_FILE"
  tail -n 40 "$FRONT_LOG_FILE" || echo "No frontend logs yet."
}

case "${1:-}" in
  start)
    start_api
    start_frontend
    ;;
  stop)
    stop_service "API" "$API_PID_FILE"
    stop_service "Frontend" "$FRONT_PID_FILE"
    ;;
  restart)
    stop_service "API" "$API_PID_FILE"
    stop_service "Frontend" "$FRONT_PID_FILE"
    start_api
    start_frontend
    ;;
  preview)
    start_frontend
    ;;
  status)
    status
    ;;
  logs)
    show_logs
    ;;
  *)
    usage
    exit 1
    ;;
esac
