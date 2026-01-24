#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
DATA_REQUIREMENTS_FILE="${DATA_REQUIREMENTS_FILE:-$ROOT_DIR/server/data/requirements.json}"

# Optional defaults for local testing (fill in if you want no env vars).
DEFAULT_ADMIN_IDENTIFIER=""
DEFAULT_ADMIN_PASSWORD=""

ADMIN_IDENTIFIER="${ADMIN_IDENTIFIER:-$DEFAULT_ADMIN_IDENTIFIER}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$DEFAULT_ADMIN_PASSWORD}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for JSON checks."
  exit 1
fi
if [ -z "$ADMIN_IDENTIFIER" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "Set ADMIN_IDENTIFIER and ADMIN_PASSWORD (or edit DEFAULT_ADMIN_* in this script)."
  exit 1
fi

log_step() {
  echo "-- $1"
}

log_ok() {
  echo "OK: $1"
}

tmp_dir="$(mktemp -d)"
admin_cookie="$tmp_dir/admin_cookie.txt"
trap 'rm -rf "$tmp_dir"' EXIT

request_json() {
  local method="$1"
  local path="$2"
  local data="${3-}"
  local cookie_in="${4-}"
  local cookie_out="${5-}"
  local args=(-sS -w $'\n__STATUS__%{http_code}' -X "$method")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  if [ -n "$cookie_in" ]; then
    args+=(-b "$cookie_in")
  fi
  if [ -n "$cookie_out" ]; then
    args+=(-c "$cookie_out")
  fi
  curl "${args[@]}" "$API_BASE_URL$path"
}

parse_response() {
  local response="$1"
  RESPONSE_BODY="${response%$'\n__STATUS__'*}"
  RESPONSE_STATUS="${response##*__STATUS__}"
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local context="$3"
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: $context (expected $expected, got $actual)"
    echo "$RESPONSE_BODY"
    exit 1
  fi
}

timestamp="$(date +%s)"
title="M1需求測試${timestamp}"

log_step "create requirement"
payload="$(
  cat <<JSON
{"title":"$title","companyName":"測試公司","projectType":"新系統建置","background":"需求背景","goals":"專案目標","scope":"功能範圍","constraints":"限制","budgetRange":"50 - 150 萬","timeline":"1-2 個月","specDoc":"尚未準備","attachments":["spec-link"],"contact":{"name":"測試者","email":"tester${timestamp}@example.com","phone":"0900-000-000"}}
JSON
)"
response="$(request_json "POST" "/api/requirements" "$payload" "" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create requirement"

requirement_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["id"])
PY
)"
doc_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["document_id"])
PY
)"

log_step "list requirement documents"
response="$(request_json "GET" "/api/requirements/$requirement_id/documents" "" "" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "list requirement documents"
RESPONSE_JSON="$RESPONSE_BODY" python3 - "$doc_id" <<'PY'
import json,os,sys
data=json.loads(os.environ["RESPONSE_JSON"])
doc_id=sys.argv[1]
docs=data.get("documents",[])
if not any(d.get("id")==doc_id for d in docs):
    raise SystemExit("FAIL: requirement document not found")
PY

log_step "get requirement document content"
response="$(request_json "GET" "/api/requirements/$requirement_id/documents/$doc_id" "" "" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "get requirement document content"
RESPONSE_JSON="$RESPONSE_BODY" python3 - "$title" <<'PY'
import json,os,sys
data=json.loads(os.environ["RESPONSE_JSON"])
title=sys.argv[1]
content=data.get("content","")
if title not in content:
    raise SystemExit("FAIL: document content missing title")
PY

log_step "verify requirement stored"
python3 - "$DATA_REQUIREMENTS_FILE" "$requirement_id" <<'PY'
import json,sys
path=sys.argv[1]
rid=sys.argv[2]
with open(path,"r",encoding="utf-8") as f:
    data=json.load(f)
if not any(item.get("id")==rid for item in data):
    raise SystemExit("FAIL: requirement not found in store")
PY

log_step "admin login"
login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "$admin_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "admin login"

log_step "approve requirement"
approve_payload='{"approved":true,"comment":"自動測試核准"}'
response="$(request_json "POST" "/api/requirements/$requirement_id/approve" "$approve_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve requirement"

log_step "verify requirement status"
response="$(request_json "GET" "/api/requirements" "" "" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "list requirements"
RESPONSE_JSON="$RESPONSE_BODY" python3 - "$requirement_id" <<'PY'
import json,os,sys
data=json.loads(os.environ["RESPONSE_JSON"])
rid=sys.argv[1]
items=data.get("requirements",[])
match=[item for item in items if item.get("id")==rid]
if not match:
    raise SystemExit("FAIL: requirement not found in list")
if match[0].get("status") != "approved":
    raise SystemExit("FAIL: requirement status not approved")
PY

log_ok "requirement flow"
