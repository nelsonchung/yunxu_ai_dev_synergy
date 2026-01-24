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
{"title":"協作測試${timestamp}","companyName":"測試公司","projectType":"新系統建置","background":"需求背景","goals":"專案目標","scope":"功能範圍","constraints":"","budgetRange":"50 - 150 萬","timeline":"1-2 個月","specDoc":"尚未準備","attachments":[],"contact":{"name":"測試者","email":"tester${timestamp}@example.com","phone":""}}
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

log_step "create project"
project_payload="$(printf '{"requirementId":"%s","name":"%s"}' "$requirement_id" "協作測試專案")"
response="$(request_json "POST" "/api/projects" "$project_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create project"

project_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["project_id"])
PY
)"

log_step "create task"
task_payload='{"title":"建立需求清單","status":"todo"}'
response="$(request_json "POST" "/api/projects/$project_id/tasks" "$task_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create task"

task_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["task"]["id"])
PY
)"

log_step "update task status"
task_update='{"status":"in_progress"}'
response="$(request_json "PATCH" "/api/projects/$project_id/tasks/$task_id" "$task_update" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "update task"

log_step "create milestone"
milestone_payload='{"title":"需求文件完成","status":"planned"}'
response="$(request_json "POST" "/api/projects/$project_id/milestones" "$milestone_payload" "$admin_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create milestone"

milestone_id="$(
  RESPONSE_JSON="$RESPONSE_BODY" python3 - <<'PY'
import json,os
data=json.loads(os.environ["RESPONSE_JSON"])
print(data["milestone"]["id"])
PY
)"

log_step "update milestone status"
milestone_update='{"status":"active"}'
response="$(request_json "PATCH" "/api/projects/$project_id/milestones/$milestone_id" "$milestone_update" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "update milestone"

log_step "delete project"
response="$(request_json "DELETE" "/api/projects/$project_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "delete project"

log_step "delete requirement"
response="$(request_json "DELETE" "/api/requirements/$requirement_id" "" "$admin_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "delete requirement"

log_ok "collaboration flow"
