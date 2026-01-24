#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"

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

log_step "admin login"
login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "$admin_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "admin login"

log_step "create requirement"
payload="$(
  cat <<JSON
{"title":"媒合測試${timestamp}","companyName":"測試公司","projectType":"新系統建置","background":"需求背景","goals":"專案目標","scope":"功能範圍","constraints":"","budgetRange":"50 - 150 萬","timeline":"1-2 個月","specDoc":"尚未準備","attachments":[],"contact":{"name":"測試者","email":"tester${timestamp}@example.com","phone":""}}
JSON
)"
response="$(request_json "POST" "/api/requirements" "$payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create requirement"

requirement_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["id"])
PY
)"

log_step "evaluate matching"
evaluate_payload="$(printf '{"requirement_id":"%s","team_id":"team-a","budget_estimate":"150-300萬","timeline_estimate":"3-6個月","score":85}' "$requirement_id")"
response="$(request_json "POST" "/api/matching/evaluate" "$evaluate_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "evaluate matching"

matching_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["matching_id"])
PY
)"

log_step "assign matching team"
assign_payload='{"team_id":"team-b"}'
response="$(request_json "POST" "/api/matching/$matching_id/assign" "$assign_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "assign matching"

log_step "verify matching list"
response="$(request_json "GET" "/api/matching?requirement_id=$requirement_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "list matching"
RESPONSE_JSON="$RESPONSE_BODY" python3 - "$matching_id" <<'PY'
import json,os,sys
data=json.loads(os.environ["RESPONSE_JSON"])
mid=sys.argv[1]
items=data.get("results",[])
match=[item for item in items if item.get("id")==mid]
if not match:
    raise SystemExit("FAIL: matching result not found")
if match[0].get("status") != "assigned":
    raise SystemExit("FAIL: matching status not assigned")
PY

log_step "delete requirement"
response="$(request_json "DELETE" "/api/requirements/$requirement_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "delete requirement"

log_ok "matching flow"
