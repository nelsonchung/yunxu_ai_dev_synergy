#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
DATA_USERS_FILE="${DATA_USERS_FILE:-$ROOT_DIR/server/data/users.json}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for JSON checks."
  exit 1
fi

tmp_dir="$(mktemp -d)"
cookie_jar="$tmp_dir/cookies.txt"
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
username="auto${timestamp}"
email="auto${timestamp}@example.com"
password="Passw0rd123"

register_payload="$(printf '{"username":"%s","email":"%s","password":"%s","confirmPassword":"%s"}' \
  "$username" "$email" "$password" "$password")"
response="$(request_json "POST" "/auth/register" "$register_payload" "" "$cookie_jar")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "register"

user_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["user"]["id"])
PY
)"

response="$(request_json "GET" "/auth/me" "" "$cookie_jar" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "me after register"

me_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["user"]["id"])
PY
)"
if [ "$me_id" != "$user_id" ]; then
  echo "FAIL: /auth/me user mismatch"
  exit 1
fi

response="$(request_json "POST" "/auth/logout" "" "$cookie_jar" "$cookie_jar")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "logout"

response="$(request_json "GET" "/auth/me" "" "$cookie_jar" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "me after logout"
RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
if data.get("user") is not None:
    raise SystemExit("FAIL: /auth/me should be null after logout")
PY

login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$username" "$password")"
response="$(request_json "POST" "/auth/login" "$login_payload" "" "$cookie_jar")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "login"

login_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["user"]["id"])
PY
)"
if [ "$login_id" != "$user_id" ]; then
  echo "FAIL: login user mismatch"
  exit 1
fi

python3 - "$DATA_USERS_FILE" "$user_id" <<'PY'
import json,sys
path=sys.argv[1]
user_id=sys.argv[2]
with open(path,"r",encoding="utf-8") as f:
    data=json.load(f)
if not any(u.get("id") == user_id for u in data):
    raise SystemExit("FAIL: user not found in users store")
print("OK: auth flow")
PY
