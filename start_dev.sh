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

echo "Starting dev server..."
pnpm dev
