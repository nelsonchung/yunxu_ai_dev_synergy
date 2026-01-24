#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
DATA_USERS_FILE="${DATA_USERS_FILE:-server/data/users.json}"
DATA_AUDIT_FILE="${DATA_AUDIT_FILE:-server/data/audit_logs.json}"
ADMIN_IDENTIFIER="${ADMIN_IDENTIFIER:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for JSON checks."
  exit 1
fi
if [ -z "$ADMIN_IDENTIFIER" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "Set ADMIN_IDENTIFIER and ADMIN_PASSWORD to run admin tests."
  exit 1
fi

tmp_dir="$(mktemp -d)"
admin_cookie="$tmp_dir/admin_cookie.txt"
user_cookie="$tmp_dir/user_cookie.txt"
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
username="admtest${timestamp}"
email="admtest${timestamp}@example.com"
password="Passw0rd123"
new_password="Newpass456"

register_payload="$(printf '{"username":"%s","email":"%s","password":"%s","confirmPassword":"%s"}' \
  "$username" "$email" "$password" "$password")"
response="$(request_json "POST" "/auth/register" "$register_payload" "" "$user_cookie")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "register test user"

test_user_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["user"]["id"])
PY
)"

admin_login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$admin_login_payload" "" "$admin_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "admin login"

response="$(request_json "GET" "/admin/users" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "list users"

RESPONSE_JSON="$RESPONSE_BODY" python3 - "$test_user_id" <<'PY'
import json,os,sys
data=json.loads(os.environ["RESPONSE_JSON"])
target=sys.argv[1]
if not any(u.get("id") == target for u in data.get("users", [])):
    raise SystemExit("FAIL: test user not found in admin list")
PY

role_payload='{"role":"developer"}'
response="$(request_json "PATCH" "/admin/users/$test_user_id/role" "$role_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "update role"
RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
if data.get("user", {}).get("role") != "developer":
    raise SystemExit("FAIL: role not updated")
PY

status_payload='{"status":"suspended"}'
response="$(request_json "PATCH" "/admin/users/$test_user_id/status" "$status_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "suspend user"
RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
if data.get("user", {}).get("status") != "suspended":
    raise SystemExit("FAIL: status not updated")
PY

login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$username" "$password")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "")"
parse_response "$response"
if [ "$RESPONSE_STATUS" != "403" ]; then
  echo "FAIL: suspended user login should return 403"
  exit 1
fi

status_payload='{"status":"active"}'
response="$(request_json "PATCH" "/admin/users/$test_user_id/status" "$status_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "activate user"

reset_payload="$(printf '{"password":"%s"}' "$new_password")"
response="$(request_json "PATCH" "/admin/users/$test_user_id/password" "$reset_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "reset password"

login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$username" "$new_password")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "$user_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "login with reset password"

python3 - "$DATA_AUDIT_FILE" "$test_user_id" <<'PY'
import json,sys
path=sys.argv[1]
target=sys.argv[2]
with open(path,"r",encoding="utf-8") as f:
    logs=json.load(f)
actions={log.get("action") for log in logs if log.get("targetUserId")==target}
required={"ROLE_CHANGED","STATUS_CHANGED","PASSWORD_RESET"}
missing=required-actions
if missing:
    raise SystemExit(f"FAIL: missing audit actions: {', '.join(sorted(missing))}")
print("OK: admin flow")
PY
