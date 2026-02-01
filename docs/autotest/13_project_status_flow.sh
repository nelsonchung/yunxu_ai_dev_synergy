#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"

# Optional defaults for local testing (fill in if you want no env vars).
DEFAULT_CUSTOMER_IDENTIFIER=""
DEFAULT_CUSTOMER_PASSWORD=""
DEFAULT_DEVELOPER_IDENTIFIER=""
DEFAULT_DEVELOPER_PASSWORD=""
DEFAULT_ADMIN_IDENTIFIER=""
DEFAULT_ADMIN_PASSWORD=""

CUSTOMER_IDENTIFIER="${CUSTOMER_IDENTIFIER:-$DEFAULT_CUSTOMER_IDENTIFIER}"
CUSTOMER_PASSWORD="${CUSTOMER_PASSWORD:-$DEFAULT_CUSTOMER_PASSWORD}"
DEVELOPER_IDENTIFIER="${DEVELOPER_IDENTIFIER:-$DEFAULT_DEVELOPER_IDENTIFIER}"
DEVELOPER_PASSWORD="${DEVELOPER_PASSWORD:-$DEFAULT_DEVELOPER_PASSWORD}"
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
if [ -z "$CUSTOMER_IDENTIFIER" ] || [ -z "$CUSTOMER_PASSWORD" ]; then
  echo "Set CUSTOMER_IDENTIFIER and CUSTOMER_PASSWORD (or edit DEFAULT_CUSTOMER_* in this script)."
  exit 1
fi
if [ -z "$DEVELOPER_IDENTIFIER" ] || [ -z "$DEVELOPER_PASSWORD" ]; then
  echo "Set DEVELOPER_IDENTIFIER and DEVELOPER_PASSWORD (or edit DEFAULT_DEVELOPER_* in this script)."
  exit 1
fi

log_step() {
  echo "-- $1"
}

log_ok() {
  echo "OK: $1"
}

tmp_dir="$(mktemp -d)"
customer_cookie="$tmp_dir/customer_cookie.txt"
developer_cookie="$tmp_dir/developer_cookie.txt"
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

extract_field() {
  local field="$1"
  RESPONSE_JSON="$RESPONSE_BODY" python3 - "$field" <<'PY'
import json, os, sys
field = sys.argv[1]
data = json.loads(os.environ["RESPONSE_JSON"])
value = data.get(field)
if value is None:
    raise SystemExit(f"missing field: {field}")
print(value)
PY
}

assert_project_status() {
  local expected="$1"
  RESPONSE_JSON="$RESPONSE_BODY" python3 - "$expected" <<'PY'
import json, os, sys
expected = sys.argv[1]
data = json.loads(os.environ["RESPONSE_JSON"])
project = data.get("project") or {}
status = project.get("status")
if status != expected:
    raise SystemExit(f"expected status {expected}, got {status}")
PY
}

assert_project_status_from_list() {
  local expected="$1"
  RESPONSE_JSON="$RESPONSE_BODY" PROJECT_ID="$project_id" python3 - "$expected" <<'PY'
import json, os, sys
expected = sys.argv[1]
project_id = os.environ["PROJECT_ID"]
data = json.loads(os.environ["RESPONSE_JSON"])
projects = data.get("projects") or []
project = next((item for item in projects if item.get("id") == project_id), None)
if not project:
    raise SystemExit(f"project not found: {project_id}")
status = project.get("status")
if status != expected:
    raise SystemExit(f"expected status {expected}, got {status}")
PY
}

refresh_project_status() {
  response="$(request_json "GET" "/api/projects" "" "$developer_cookie" "")"
  parse_response "$response"
  assert_status "200" "$RESPONSE_STATUS" "list projects"
}

timestamp="$(date +%s)"

log_step "customer login"
customer_login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$CUSTOMER_IDENTIFIER" "$CUSTOMER_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$customer_login_payload" "" "$customer_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "customer login"

log_step "developer login"
developer_login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$DEVELOPER_IDENTIFIER" "$DEVELOPER_PASSWORD")"
response="$(request_json "POST" "/auth/login" "$developer_login_payload" "" "$developer_cookie")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "developer login"

log_step "customer creates requirement"
requirement_payload="$(
  cat <<JSON
{"title":"專案狀態測試${timestamp}","companyName":"測試公司","projectType":"新系統建置","background":"需求背景","goals":"專案目標","scope":"功能範圍","constraints":"","budgetRange":"50 - 150 萬","timeline":"1-2 個月","specDoc":"尚未準備","attachments":[],"contact":{"name":"測試者","email":"status${timestamp}@example.com","phone":""}}
JSON
)"
response="$(request_json "POST" "/api/requirements" "$requirement_payload" "$customer_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create requirement"
requirement_id="$(extract_field "id")"

log_step "developer creates project"
project_payload="$(printf '{"requirementId":"%s","name":"%s"}' "$requirement_id" "專案狀態測試專案")"
response="$(request_json "POST" "/api/projects" "$project_payload" "$developer_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create project"
project_id="$(extract_field "project_id")"

refresh_project_status
assert_project_status_from_list "intake"

log_step "invalid transition intake -> architecture_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"architecture_review"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "409" "$RESPONSE_STATUS" "invalid transition check"

log_step "guard check intake -> requirements_signed (should fail before requirement approval)"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"requirements_signed"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "409" "$RESPONSE_STATUS" "intake guard check"

log_step "customer approves requirement document (auto -> requirements_signed)"
approve_requirement_payload='{"approved":true,"comment":"autotest requirement approval"}'
response="$(request_json "POST" "/api/requirements/$requirement_id/approve" "$approve_requirement_payload" "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve requirement"

refresh_project_status
assert_project_status_from_list "requirements_signed"

log_step "developer transitions -> architecture_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"architecture_review"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "requirements_signed to architecture_review"
assert_project_status "architecture_review"

log_step "developer creates system document"
system_doc_payload='{"type":"system","title":"系統架構 v1","content":"# System\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$system_doc_payload" "$developer_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create system doc"
system_doc_id="$(extract_field "document_id")"

log_step "customer approves system document (auto -> system_architecture_signed)"
response="$(request_json "POST" "/api/projects/$project_id/documents/$system_doc_id/review" '{"approved":true,"comment":"autotest system approval"}' "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve system doc"

refresh_project_status
assert_project_status_from_list "system_architecture_signed"

log_step "developer transitions -> software_design_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"software_design_review"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "system_architecture_signed to software_design_review"
assert_project_status "software_design_review"

log_step "developer creates software document"
software_doc_payload='{"type":"software","title":"軟體設計 v1","content":"# Software\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$software_doc_payload" "$developer_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create software doc"
software_doc_id="$(extract_field "document_id")"

log_step "customer approves software document (auto -> software_design_signed)"
response="$(request_json "POST" "/api/projects/$project_id/documents/$software_doc_id/review" '{"approved":true,"comment":"autotest software approval"}' "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve software doc"

refresh_project_status
assert_project_status_from_list "software_design_signed"

log_step "developer creates quotation"
quotation_payload='{"currency":"TWD","items":[{"key":"Q1","path":"功能 / 基礎 / 登入","h1":"功能","h2":"基礎","h3":"登入","price":500}]}'
response="$(request_json "POST" "/api/projects/$project_id/documents/$software_doc_id/quotation" "$quotation_payload" "$developer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "create quotation"

log_step "developer submits quotation (auto -> quotation_review)"
response="$(request_json "POST" "/api/projects/$project_id/documents/$software_doc_id/quotation/submit" '{}' "$developer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "submit quotation"

refresh_project_status
assert_project_status_from_list "quotation_review"

log_step "customer approves quotation (auto -> implementation)"
response="$(request_json "POST" "/api/projects/$project_id/documents/$software_doc_id/quotation/review" '{"approved":true,"comment":"autotest quotation approval"}' "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve quotation"

refresh_project_status
assert_project_status_from_list "implementation"

log_step "developer transitions -> system_verification_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"system_verification_review"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "implementation to system_verification_review"
assert_project_status "system_verification_review"

log_step "developer creates test document"
test_doc_payload='{"type":"test","title":"測試計畫 v1","content":"# Test\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$test_doc_payload" "$developer_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create test doc"
test_doc_id="$(extract_field "document_id")"

log_step "customer approves test document (auto -> system_verification_signed)"
response="$(request_json "POST" "/api/projects/$project_id/documents/$test_doc_id/review" '{"approved":true,"comment":"autotest test approval"}' "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve test doc"

refresh_project_status
assert_project_status_from_list "system_verification_signed"

log_step "developer creates delivery document (draft)"
delivery_doc_payload='{"type":"delivery","title":"交付說明 v1","content":"# Delivery\n\n- autotest"}'
response="$(request_json "POST" "/api/projects/$project_id/documents" "$delivery_doc_payload" "$developer_cookie" "")"
parse_response "$response"
assert_status "201" "$RESPONSE_STATUS" "create delivery doc"
delivery_doc_id="$(extract_field "document_id")"

log_step "developer transitions -> delivery_review"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"delivery_review"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "system_verification_signed to delivery_review"
assert_project_status "delivery_review"

log_step "guard check delivery_review -> delivery_signed (should fail before delivery approval)"
response="$(request_json "PATCH" "/api/projects/$project_id/status" '{"status":"delivery_signed"}' "$developer_cookie" "")"
parse_response "$response"
assert_status "409" "$RESPONSE_STATUS" "delivery guard check"

log_step "customer approves delivery document (auto -> delivery_signed)"
response="$(request_json "POST" "/api/projects/$project_id/documents/$delivery_doc_id/review" '{"approved":true,"comment":"autotest delivery approval"}' "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "approve delivery doc"

refresh_project_status
assert_project_status_from_list "delivery_signed"

log_step "customer closes project"
response="$(request_json "POST" "/api/projects/$project_id/close" "" "$customer_cookie" "")"
parse_response "$response"
assert_status "200" "$RESPONSE_STATUS" "close project"

refresh_project_status
assert_project_status_from_list "closed"

if [ -n "$ADMIN_IDENTIFIER" ] && [ -n "$ADMIN_PASSWORD" ]; then
  log_step "admin login for cleanup"
  admin_login_payload="$(printf '{"identifier":"%s","password":"%s"}' "$ADMIN_IDENTIFIER" "$ADMIN_PASSWORD")"
  response="$(request_json "POST" "/auth/login" "$admin_login_payload" "" "$admin_cookie")"
  parse_response "$response"
  assert_status "200" "$RESPONSE_STATUS" "admin login"

  log_step "delete project (admin cleanup)"
  response="$(request_json "DELETE" "/api/projects/$project_id" "" "$admin_cookie" "")"
  parse_response "$response"
  assert_status "200" "$RESPONSE_STATUS" "delete project"

  log_step "delete requirement (admin cleanup)"
  response="$(request_json "DELETE" "/api/requirements/$requirement_id" "" "$admin_cookie" "")"
  parse_response "$response"
  assert_status "200" "$RESPONSE_STATUS" "delete requirement"
else
  echo "NOTE: cleanup skipped (admin credentials not provided)."
  echo "      requirement_id=$requirement_id"
  echo "      project_id=$project_id"
fi

log_ok "project status flow (customer + developer + auto transitions)"
