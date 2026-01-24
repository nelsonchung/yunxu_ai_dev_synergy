#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed. Run: corepack enable && corepack prepare pnpm@10.4.1 --activate"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "node_modules not found. Installing dependencies..."
  pnpm install
fi

if [[ ! -d "server/node_modules" ]]; then
  echo "server/node_modules not found. Installing backend dependencies..."
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
