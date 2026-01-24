#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

LOCKFILE="$ROOT_DIR/pnpm-lock.yaml"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed. Run: corepack enable && corepack prepare pnpm@10.4.1 --activate"
  exit 1
fi

should_install() {
  local node_modules_path="$1"
  local package_json_path="$2"
  local lockfile_path="$3"

  if [[ ! -d "$node_modules_path" ]]; then
    return 0
  fi
  if [[ -f "$lockfile_path" && "$lockfile_path" -nt "$node_modules_path" ]]; then
    return 0
  fi
  if [[ -f "$package_json_path" && "$package_json_path" -nt "$node_modules_path" ]]; then
    return 0
  fi
  return 1
}

if should_install "$ROOT_DIR/node_modules" "$ROOT_DIR/package.json" "$LOCKFILE"; then
  echo "Installing frontend dependencies..."
  pnpm install
fi

if should_install "$ROOT_DIR/server/node_modules" "$ROOT_DIR/server/package.json" "$LOCKFILE"; then
  echo "Installing backend dependencies..."
  pnpm --dir server install
fi

if [[ ! -f "server/.env" ]]; then
  echo "Warning: server/.env not found. Copy from server/.env.nosqljson.example and update JWT_SECRET."
fi

echo "Starting backend dev server..."
pnpm --dir server dev &
BACKEND_PID=$!

cleanup() {
  if ps -p "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID"
  fi
}

trap cleanup EXIT

echo "Starting frontend dev server..."
pnpm dev
