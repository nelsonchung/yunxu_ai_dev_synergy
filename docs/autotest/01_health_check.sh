#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi

echo "-- check /health"
response="$(curl -sS -w $'\n__STATUS__%{http_code}' "$API_BASE_URL/health")"
body="${response%$'\n__STATUS__'*}"
status="${response##*__STATUS__}"

if [ "$status" != "200" ]; then
  echo "FAIL: /health returned $status"
  echo "$body"
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  BODY_JSON="$body" python3 - <<'PY'
import json,os
data=json.loads(os.environ["BODY_JSON"])
if data.get("status") != "ok":
    raise SystemExit("FAIL: status is not ok")
print("OK: /health")
PY
else
  echo "$body" | grep -q '"status":"ok"' || {
    echo "FAIL: status is not ok"
    echo "$body"
    exit 1
  }
  echo "OK: /health"
fi
