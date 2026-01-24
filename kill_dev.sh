#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Stopping dev servers..."

pkill -f "pnpm --dir server dev" || true
pkill -f "tsx watch src/index.ts" || true
pkill -f "pnpm dev" || true
pkill -f "vite" || true

echo "Done."
