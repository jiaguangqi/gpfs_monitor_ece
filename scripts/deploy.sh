#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

NODE_REQUIRED_MAJOR=18

function require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

function check_node_version() {
  local version
  version="$(node -v | sed 's/^v//')"
  local major="${version%%.*}"
  if (( major < NODE_REQUIRED_MAJOR )); then
    echo "Node.js ${NODE_REQUIRED_MAJOR}+ is required. Found v${version}." >&2
    exit 1
  fi
}

echo "==> Validating environment"
require_cmd node
require_cmd npm
check_node_version

echo "==> Installing dependencies"
npm install

echo "==> Building frontend"
npm run build

cat <<'EOF'
Deployment complete.
- API server start command: npm run start:api
- Frontend (built) start command: npm run preview -- --host 0.0.0.0 --port 4173
- To manage both together, use scripts/manage.sh after deployment.
EOF
